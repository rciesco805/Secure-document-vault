# Python Dependencies

This is a JavaScript/TypeScript project, but includes `Pipfile` and `Pipfile.lock` for Python-based tooling.

## Why Pipfile Exists

The Pipfile is used for **Tinybird CLI** - a Python tool for managing Tinybird analytics pipelines.

```
# Pipfile contents
[packages]
tinybird-cli = "*"

[requires]
python_version = "3.11"
```

## Tinybird CLI Usage

Tinybird is used for real-time analytics and audit logging in the platform.

### Installation

```bash
# Using pipenv (if Python 3.11 is available)
pipenv install

# Or using pip directly
pip install tinybird-cli
```

### Common Commands

```bash
# Authenticate with Tinybird
tb auth

# Push data sources and pipes
tb push

# Run a query
tb sql "SELECT * FROM audit_events LIMIT 10"
```

### When to Use

- Managing Tinybird data sources and pipes
- Debugging analytics queries
- Deploying Tinybird configuration changes

## Can I Remove It?

The Pipfile is **optional** for running the application. It's only needed if you:
- Manage Tinybird pipelines locally
- Debug analytics queries
- Deploy Tinybird configuration

If you don't use Tinybird, you can safely ignore these files. They don't affect the Node.js application.
