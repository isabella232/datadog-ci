/* tslint:disable */
import {spawn} from 'child_process'
import {Command} from 'clipanion'
import tracer from 'dd-trace'

import {getCIMetadata} from '../../helpers/ci'
import {
  CI_PIPELINE_URL,
  CI_PROVIDER_NAME,
  GIT_BRANCH,
  GIT_SHA,
  GIT_REPOSITORY_URL,
  PARENT_SPAN_ID,
  TRACE_ID,
} from '../../helpers/tags'

export class WrapInstructionCommand extends Command {
  public static usage = Command.Usage({
    description: 'Wrap commands to upload as spans.',
    details: `
            This command will allow you to wrap any command to see its status code.
        `,
    examples: [['Wrap command', 'datadog-ci trace command touch README.md']],
  })
  private instruction: string[] = []

  public async execute() {
    if (!this.instruction.length) {
      throw new Error('No instruction to wrap')
    }
    tracer.init()

    const ciMetadata = getCIMetadata()
    let parentSpan

    if (ciMetadata?.trace) {
      const {
        trace: {parentSpanId, traceId},
      } = ciMetadata
      parentSpan =
        tracer.extract('text_map', {
          [PARENT_SPAN_ID]: parentSpanId,
          [TRACE_ID]: traceId,
        }) || undefined
    }

    tracer.trace(
      'datadog-ci',
      {childOf: parentSpan},
      (span) =>
        new Promise<number>((resolve) => {
          const [command, ...rest] = this.instruction

          const commandToWrap = spawn(command, rest)
          process.stdin.pipe(commandToWrap.stdin)

          commandToWrap.stdout.pipe(this.context.stdout)
          commandToWrap.stderr.pipe(this.context.stderr)

          commandToWrap.on('exit', (exitCode: number) => {
            span?.addTags({
              error: exitCode === 0 ? 0 : 1,
              exit_code: exitCode,
              instruction: this.instruction.join(' '),
            })
            if (ciMetadata) {
              const {
                ci: {
                  pipeline: {url: pipelineUrl},
                  provider: {name: providerName},
                },
                git: {branch, commit_sha, repository},
              } = ciMetadata
              span?.addTags({
                [CI_PIPELINE_URL]: pipelineUrl,
                [CI_PROVIDER_NAME]: providerName,
                [GIT_BRANCH]: branch,
                [GIT_SHA]: commit_sha,
                [GIT_REPOSITORY_URL]: repository,
              })
            }

            resolve(exitCode)
          })
        })
    )
  }
}
WrapInstructionCommand.addPath('trace', 'command')
WrapInstructionCommand.addOption('instruction', Command.Proxy())
