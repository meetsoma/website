---
title: "Troubleshooting"
description: "Common issues and fixes."
section: "Reference"
order: 22
---


<!-- tldr -->
Most issues: `soma init` (fixes broken install), `soma doctor` (fixes project version), restart the session (picks up changes). Below: organized by symptom. Check here before filing an issue.
<!-- /tldr -->

## Installation

### "Soma not installed" after npm install

`npm install -g meetsoma` only installs the thin CLI. The agent runtime downloads on first use:

```bash
soma          # triggers agent install if missing
# or explicitly:
soma init     # downloads agent runtime to ~/.soma/agent/
```

### Broken install / corrupted runtime

```bash
soma init     # auto-detects broken state, repairs or re-clones
```

The CLI never deletes — broken installs are moved to `~/.soma/agent-backup-{timestamp}/`.

### Permission errors on global install

```bash
# If npm global install fails with EACCES:
npm install -g meetsoma --unsafe-perm
# Or fix npm permissions:
mkdir ~/.npm-global && npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

### `soma` command not found after install

Check your PATH includes npm's global bin:

```bash
npm bin -g              # shows where npm installs globals
which soma              # should find it
```

If using nvm, make sure you're in the same Node version where you installed.

## Models & API Keys

### "No models available"

- Check that at least one API key is set: `echo $ANTHROPIC_API_KEY | head -c 10`
- Or complete OAuth login: run `soma`, then `/login`
- Try: `soma --list-models` to see what's detected
- Check `~/.soma/agent/auth.json` for stored keys

### Model not appearing in `/model`

- Verify `models.json` syntax: `python3 -c "import json; json.load(open('$HOME/.soma/agent/models.json'))"`
- Check `baseUrl` is reachable: `curl <baseUrl>/models`
- Ensure `apiKey` resolves (env var must be set)
- `models.json` reloads on `/model` — edit without restarting

### Authentication errors

- **Subscription providers:** `/logout` then `/login` (refreshes OAuth tokens)
- **API keys:** verify with `echo $ANTHROPIC_API_KEY | head -c 10`
- Auth file (`~/.soma/agent/auth.json`) overrides env vars — check both
- Check key hasn't expired or been rotated

### Ollama models not working

```json
// ~/.soma/agent/models.json — add compat settings
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "compat": {
        "supportsDeveloperRole": false,
        "supportsReasoningEffort": false
      },
      "models": [{ "id": "llama3.1:8b" }]
    }
  }
}
```

Make sure Ollama is running (`ollama serve`) and the model is pulled (`ollama list`).

See [Models & Providers](/docs/models) for the full setup guide.

## Sessions & Context

### Preload not loading

1. **Check it exists:** `ls .soma/memory/preloads/preload-next-*.md`
2. **Check auto-inject:** `grep autoInject .soma/settings.json` — `true` means preloads auto-load on `soma`. Default is `false` for new projects (use `soma inhale` instead).
3. **Check staleness:** preloads older than `staleAfterHours` (default: 48h) show a warning but still load
4. **Force it:** `soma inhale` always injects regardless of settings

### Session feels "stuck" or context is stale

Restart with a fresh session:

```bash
soma inhale     # fresh context + preload
```

If the agent is confused about project state, check the preload — it might have incorrect information. Edit it before inhaling.

### Auto-breathe not triggering

- Check it's enabled: `grep -A 3 '"breathe"' .soma/settings.json`
- Enable: add `"breathe": { "auto": true }` to settings
- Check thresholds: default triggers at 50% (notice) and 70% (rotate)
- The 85% emergency safety net fires regardless of auto-breathe setting

### Keepalive not working / unlimited pings

- Check `maxPings` setting: `grep -A 3 keepalive .soma/settings.json`
- Default is 5 pings. Set to 0 to disable entirely.
- If pings seem unlimited: update to latest agent version (v0.11.2+ fixed a counter reset bug)

### `/exhale` doesn't write a preload

- Check disk space and permissions on `.soma/memory/preloads/`
- Check if `_memory.md` template exists and is valid: `cat .soma/body/_memory.md`
- Check debug logs: `/soma debug on`, reproduce, check `.soma/debug/`

## Project & Version Issues

### "Project needs update" notification

This means your project's `.soma/` was created with an older version. Run:

```bash
soma doctor           # quick check from CLI
```

Or inside a session:

```
/soma doctor          # interactive migration with agent assistance
```

Tier 1 auto-fixes run silently on every boot. The notification means there are Tier 2+ changes that need attention. See [Doctor & Migration](/docs/doctor).

### Version mismatch

```bash
soma --version        # shows agent + CLI versions
cat .soma/settings.json | grep version    # project version
```

If the agent version is old:
```bash
soma init             # pulls latest from GitHub
```

If the CLI version is old:
```bash
npm install -g meetsoma
```

### `.soma/` not detected

Soma looks for marker files: `body/soul.md`, `SOMA.md`, `amps/`, `memory/`, or `settings.json`. If none exist, Soma treats the directory as having no `.soma/`.

```bash
ls -la .soma/         # check what exists
soma init             # recreate if needed
```

## Terminal & Display

### Colors look wrong

- Check terminal supports truecolor: `echo $TERM` should be `xterm-256color` or similar
- In tmux: add to `~/.tmux.conf`:
  ```
  set -g default-terminal "tmux-256color"
  set -ag terminal-overrides ",xterm-256color:RGB"
  ```
- Try a different theme: add `"theme": "light"` to `~/.soma/agent/settings.json`

### Keybindings not working

- Check for conflicts with your terminal's shortcuts
- In tmux: `set -s escape-time 0` (prevents Escape delay)
- Customize in `~/.soma/agent/keybindings.json` — see [Keybindings](/docs/keybindings)

### Images not showing

- Use a terminal with image protocol support (iTerm2, Kitty, WezTerm)
- In tmux: `set -g allow-passthrough on`
- Disable if not needed: `"terminal.showImages": false` in settings

## Git & Hooks

### "Git repo has issues" warning

Usually means uncommitted changes or detached HEAD in `.soma/` internal state:

```bash
cd .soma && git status    # if .soma/ is a git repo
```

In dev mode, this warning is suppressed.

### Git identity mismatch

If `guard.gitIdentity` is set and your git config doesn't match:

```bash
git config user.email       # check current
git config user.email "correct@example.com"    # fix
```

Or update the guard setting in `.soma/settings.json`.

## Hub

### `/hub install` fails

- Check internet connectivity
- Verify `hub-index.json` is accessible: `curl -s https://raw.githubusercontent.com/meetsoma/community/main/hub-index.json | head -5`
- Check the content name is correct: `/hub list --remote` to see available items
- Use `--force` to overwrite existing local copies

### `/hub share` fails

- Requires `gh` CLI: `brew install gh` then `gh auth login`
- Privacy scan blocks sharing if secrets are found — fix the flagged content first
- Check you're not sharing from `_archive/` or `_public/` directories

## Extensions

### "Restart required" notification

An extension's source file changed (usually after `git pull` or a commit that touches `extensions/*.ts` or `core/*.ts`). Restart the session:

```bash
soma          # or soma inhale
```

### Extension errors in debug log

```
/soma debug on        # enable debug logging
# reproduce the issue
# check .soma/debug/ for logs
/soma debug off
```

## Nuclear Options

When nothing else works:

### Reset project `.soma/`

```bash
mv .soma .soma-backup-$(date +%s)    # preserve, don't delete
soma init                             # fresh .soma/
```

Then manually copy back what you want from the backup (identity, muscles, protocols).

### Reset global runtime

```bash
mv ~/.soma/agent ~/.soma/agent-backup-$(date +%s)
soma init     # re-downloads from GitHub
```

Your project `.soma/` directories are untouched — only the global runtime resets.

### Check everything

```bash
soma doctor          # project health
soma --version       # versions
soma --list-models   # available models
ls -la .soma/        # project structure
ls -la ~/.soma/agent/  # global runtime
```

## Getting Help

- **GitHub Issues:** [github.com/meetsoma/soma-agent/issues](https://github.com/meetsoma/soma-agent/issues)
- **Community Hub:** [github.com/meetsoma/community/discussions](https://github.com/meetsoma/community/discussions)
- **Docs:** [soma.gravicity.ai/docs](https://soma.gravicity.ai/docs)

When reporting issues, include: `soma --version` output, your OS, terminal, and the exact error message.
