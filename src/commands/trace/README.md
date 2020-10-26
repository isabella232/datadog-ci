# Trace command

Trace your CI commands.

## Usage

### Setup

You need to have `DATADOG_CLIENT_TOKEN` in your environment:

```bash
# Environment setup
export DATADOG_CLIENT_TOKEN="<CLIENT TOKEN>"
```

#### Commands

The available command is:

- `command`: trace your CI command

```bash
datadog-ci trace command ls -r
```

```bash
datadog-ci trace command touch README.md
```

Whatever comes after `datadog-ci trace command` will be executed as is.
