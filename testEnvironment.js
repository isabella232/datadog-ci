const {promisify} = require('util')
const {exec} = require('child_process')

const NodeEnvironment = require('jest-environment-node')

const asyncExec = promisify(exec)
const sanitizeStdout = (stdout) => stdout.replace(/(\r\n|\n|\r)/gm, '')

const GIT_COMMIT_SHA = 'git.commit_sha'
const GIT_BRANCH = 'git.branch'
const GIT_REPOSITORY_URL = 'git.repository_url'
const BUILD_SOURCE_ROOT = 'build.source_root'
const TEST_FRAMEWORK = 'test.framework'
const TEST_TYPE = 'test.type'
const TEST_NAME = 'test.name'
const TEST_SUITE = 'test.suite'
const TEST_STATUS = 'test.status'
const CI_PIPELINE_URL = 'ci.pipeline.url'
const CI_PIPELINE_ID = 'ci.pipeline.id'
const CI_PIPELINE_NUMBER = 'ci.pipeline.number'
const CI_WORKSPACE_PATH = 'ci.workspace_path'
const CI_PROVIDER_NAME = 'ci.provider.name'

function getCIMetadata() {
  const {env} = process
  if (env.GITHUB_ACTIONS) {
    const {GITHUB_REF, GITHUB_SHA, GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_RUN_NUMBER, GITHUB_WORKSPACE} = env

    const pipelineURL = `https://github.com/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`

    return {
      [CI_PIPELINE_URL]: pipelineURL,
      [CI_PIPELINE_ID]: GITHUB_RUN_ID,
      [CI_PROVIDER_NAME]: 'github',
      [CI_PIPELINE_NUMBER]: GITHUB_RUN_NUMBER,
      [CI_WORKSPACE_PATH]: GITHUB_WORKSPACE,
      [GIT_BRANCH]: GITHUB_REF,
      [GIT_COMMIT_SHA]: GITHUB_SHA,
    }
  }
  return {}
}

async function getGitInformation() {
  try {
    const [{stdout: readRepository}, {stdout: readBranch}, {stdout: readCommit}] = await Promise.all([
      asyncExec('git ls-remote --get-url'),
      asyncExec('git rev-parse --abbrev-ref HEAD'),
      asyncExec('git rev-parse HEAD'),
    ])
    return {
      repository: sanitizeStdout(readRepository),
      branch: sanitizeStdout(readBranch),
      commit: sanitizeStdout(readCommit),
    }
  } catch (e) {}
  return {
    repository: '',
    branch: '',
    commit: '',
  }
}

module.exports = class DatadogJestEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context)
    this.filePath = context.testPath.replace(`${config.rootDir}/`, '')
    this.rootDir = config.rootDir
  }
  async setup() {
    const ciMetadata = getCIMetadata()
    const {repository, branch, commit} = await getGitInformation()
    this.global.tracer = require('dd-trace').init({
      sampleRate: 1,
      flushInterval: 1,
      // startupLogs: false,
      ingestion: {
        sampleRate: 1,
        rateLimit: 100000,
      },
      plugins: false,
      tags: {
        [GIT_COMMIT_SHA]: commit,
        [GIT_BRANCH]: branch,
        [GIT_REPOSITORY_URL]: repository,
        [BUILD_SOURCE_ROOT]: this.rootDir,
        [TEST_FRAMEWORK]: 'jest',
        ...ciMetadata,
      },
    })
    await super.setup()
  }
  async teardown() {
    this.global.tracer._tracer._exporter._writer.flush()
    super.teardown()
  }

  async handleTestEvent(event) {
    if (event.name === 'test_skip' || event.name === 'test_todo') {
      this.global.tracer.trace(
        'jest.test',
        {type: 'test', resource: `${event.test.parent.name}.${event.test.name}`},
        (span) => {
          span.addTags({
            [TEST_TYPE]: 'test',
            [TEST_NAME]: event.test.name,
            [TEST_SUITE]: this.filePath,
            [TEST_STATUS]: 'skip',
          })
        }
      )
    }
    if (event.name === 'test_start') {
      const originalSpecFunction = event.test.fn
      if (originalSpecFunction.length) {
        event.test.fn = this.global.tracer.wrap(
          'jest.test',
          {type: 'test', resource: `${event.test.parent.name}.${event.test.name}`},
          () => {
            this.global.tracer
              .scope()
              .active()
              .addTags({
                [TEST_TYPE]: 'test',
                [TEST_NAME]: event.test.name,
                [TEST_SUITE]: this.filePath,
              })
            return new Promise((resolve, reject) => {
              originalSpecFunction((err) => {
                if (err) {
                  this.global.tracer.scope().active().setTag(TEST_STATUS, 'fail')
                  this.global.tracer
                    .scope()
                    .active()
                    ._spanContext._trace.started.forEach((span) => {
                      span.finish()
                    })
                  reject(err)
                } else {
                  this.global.tracer.scope().active().setTag(TEST_STATUS, 'pass')
                  this.global.tracer
                    .scope()
                    .active()
                    ._spanContext._trace.started.forEach((span) => {
                      span.finish()
                    })
                  resolve()
                }
              })
            })
          }
        )
      } else {
        event.test.fn = this.global.tracer.wrap(
          'jest.test',
          {type: 'test', resource: `${event.test.parent.name}.${event.test.name}`},
          () => {
            let result
            this.global.tracer
              .scope()
              .active()
              .addTags({
                [TEST_TYPE]: 'test',
                [TEST_NAME]: event.test.name,
                [TEST_SUITE]: this.filePath,
              })
            try {
              result = originalSpecFunction()
              this.global.tracer.scope().active().setTag(TEST_STATUS, 'pass')
              this.global.tracer
                .scope()
                .active()
                ._spanContext._trace.started.forEach((span) => {
                  span.finish()
                })
            } catch (error) {
              this.global.tracer.scope().active().setTag(TEST_STATUS, 'fail')
              throw error
            }

            if (result && result.then) {
              return result
                .then(() => {
                  this.global.tracer.scope().active().setTag(TEST_STATUS, 'pass')
                })
                .catch((err) => {
                  this.global.tracer.scope().active().setTag(TEST_STATUS, 'fail')
                  throw err
                })
                .finally(() => {
                  this.global.tracer
                    .scope()
                    .active()
                    ._spanContext._trace.started.forEach((span) => {
                      span.finish()
                    })
                })
            }
            this.global.tracer
              .scope()
              .active()
              ._spanContext._trace.started.forEach((span) => {
                span.finish()
              })
            return result
          }
        )
      }
    }
  }
}
