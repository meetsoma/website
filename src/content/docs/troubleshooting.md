---
title: "Troubleshooting"
description: "Common issues, error messages, and fixes for Soma installation, sessions, and extensions."
section: "Reference"
order: 6.5
---

## Installation

### `soma` command not found

After `npm install -g meetsoma`, the binary might not be in your PATH.

```bash
# Check where npm installs global binaries
npm config get prefix
# Add the bin directory to your PATH
export PATH="$(npm config get prefix)/bin:$PATH"
```

### `soma init` fails with "git not found"

Soma needs git to download the runtime. Install git first:
- **macOS:** `xcode-select --install` or `brew install git`
- **Linux:** `sudo apt install git` / `sudo dnf install git`
- **Windows:** [git-scm.com/downloads](https://git-scm.com/downloads)

### `soma init` hangs on "Downloading runtime"

The runtime clones from GitHub. If you're behind a corporate proxy or firewall, git clone may fail silently. Try:

```bash
# Test git access
git clone --depth 1 https://github.com/meetsoma/soma-beta.git /tmp/soma-test
# If this fails, configure git proxy:
git config --global http.proxy http://your-proxy:port
```

### Dependencies fail to install

After `soma init`, the runtime installs Pi dependencies via npm. If this fails:

```bash
cd ~/.soma/agent
npm install --omit=dev
# If permission errors:
sudo chown -R $(whoami) ~/.soma/
```

## Sessions

### Agent doesn't load my identity

Soma looks for `.soma/identity.md` in the current directory, then parent directories, then `~/.soma/`. Make sure you're in a directory with a `.soma/` folder, or run `soma init` to create one.

```bash
# Check what Soma sees
ls -la .soma/identity.md
# Or check the global identity
ls -la ~/.soma/identity.md
```

### Protocols not loading

Protocols load based on [heat](/docs/heat-system). If a protocol's heat is 0, it won't load. Check the heat scores:

```bash
# Look at protocol frontmatter
head -10 .soma/amps/protocols/your-protocol.md
# The heat: field shows the current score
```

To force a protocol to load, use `/pin protocol-name` during a session.

### Extensions fail to load

Extension errors appear at the top of each session. Common causes:

- **TypeScript syntax errors** — extensions are loaded via jiti (just-in-time TypeScript). Syntax errors crash the load.
- **Conflicting commands** — two extensions registering the same `/command` name. The error message tells you which files conflict.
- **Missing dependencies** — extensions that import from packages not in your agent's node_modules.

### Auto-breathe rotates too early

The breath cycle triggers at configurable context thresholds. Adjust in `.soma/settings.json`:

```json
{
  "breathe": {
    "triggerAt": 70,
    "graceTurns": 8
  }
}
```

`graceTurns` controls how many turns the agent gets to finish up after the threshold is hit. Default is 6.

## Models & Providers

### "No API key" or "Authentication failed"

Soma inherits the underlying engine's authentication. Set your API key:

```bash
# For Anthropic (Claude)
export ANTHROPIC_API_KEY=sk-ant-...
# Or use the interactive login
soma   # then use /login
```

API keys are stored in `~/.soma/agent/auth.json` (encrypted at rest).

### Wrong model loading

Check your model configuration:

```bash
# List available models
soma --list-models
# Set default model in settings
```

See [Models & Providers](/docs/models) for full configuration.

## Health Check

When in doubt, run the built-in health check:

```bash
soma doctor
```

This verifies Node.js version, runtime installation, extensions, API keys, and git. Follow its suggestions for any issues found.

## Still stuck?

- Check [Getting Started](/docs/getting-started) for the full setup guide
- Check [Configuration](/docs/configuration) for settings reference
- File an issue at [github.com/meetsoma/soma-agent](https://github.com/meetsoma/soma-agent/issues)
