import {Metadata} from './interfaces'
import {CI_ENV_PARENT_SPAN_ID, CI_ENV_TRACE_ID} from './tags'

export const CI_ENGINES = {
  CIRCLECI: 'circleci',
  GITHUB: 'github',
  GITLAB: 'gitlab',
  JENKINS: 'jenkins',
  TRAVIS: 'travis',
}

export const getCIMetadata = (): Metadata | undefined => {
  const env = process.env

  if (env.CIRCLECI) {
    return {
      ci: {
        pipeline: {
          url: env.CIRCLE_BUILD_URL,
        },
        provider: {
          name: CI_ENGINES.CIRCLECI,
        },
      },
      git: {
        branch: env.CIRCLE_BRANCH,
        commit_sha: env.CIRCLE_SHA1,
      },
    }
  }

  if (env.TRAVIS) {
    return {
      ci: {
        pipeline: {
          url: env.TRAVIS_JOB_WEB_URL,
        },
        provider: {
          name: CI_ENGINES.TRAVIS,
        },
      },
      git: {
        branch: env.TRAVIS_BRANCH,
        commit_sha: env.TRAVIS_COMMIT,
      },
    }
  }

  if (env.GITLAB_CI) {
    return {
      ci: {
        pipeline: {
          url: env.CI_JOB_URL,
        },
        provider: {
          name: CI_ENGINES.GITLAB,
        },
      },
      git: {
        branch: env.CI_COMMIT_BRANCH,
        commit_sha: env.CI_COMMIT_SHA,
      },
    }
  }

  if (env.GITHUB_ACTIONS) {
    const pipelineURL = `https://github.com/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`

    const {GITHUB_REF, GITHUB_SHA, GITHUB_REPOSITORY} = env

    return {
      ci: {
        pipeline: {
          url: pipelineURL,
        },
        provider: {
          name: CI_ENGINES.GITHUB,
        },
      },
      git: {
        branch: GITHUB_REF,
        commit_sha: GITHUB_SHA,
        repository: GITHUB_REPOSITORY,
      },
    }
  }

  if (env.JENKINS_URL) {
    const {
      BUILD_URL,
      GIT_COMMIT,
      GIT_BRANCH,
      GIT_URL,
      [CI_ENV_TRACE_ID]: traceId,
      [CI_ENV_PARENT_SPAN_ID]: parentSpanId,
    } = env

    const commonMetadata = {
      ci: {
        pipeline: {
          url: BUILD_URL,
        },
        provider: {
          name: CI_ENGINES.JENKINS,
        },
      },
      git: {
        branch: GIT_BRANCH,
        commit_sha: GIT_COMMIT,
        repository: GIT_URL,
      },
    }

    if (!traceId || !parentSpanId) {
      return commonMetadata
    }

    return {
      ...commonMetadata,
      trace: {
        parentSpanId,
        traceId,
      },
    }
  }
}
