# Trace command

Trace your commands.

## Usage

### Setup

You need to have the [Datadog Agent](https://docs.datadoghq.com/agent/) running in your environment.

#### Commands

The available command is:

- `command`: trace your command

```bash
datadog-ci trace command ls -r
```

```bash
datadog-ci trace command touch README.md
```

Whatever comes after `datadog-ci trace command` will be executed as is. A span will be created corresponding to the executed command.

### Supported CI Systems

You may use `trace command` in any CI system, but the trace will only be continued in the following supported CIs:

- Jenkins
