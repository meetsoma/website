---
title: "Skills"
description: "Install and create skills — self-contained capability packages loaded on demand."
section: "Extending"
updated: 2026-09-02
order: 5.3
---

<!-- tldr -->
Skills are on-demand capability packages. Drop a `SKILL.md` in `.soma/skills/my-skill/` or `~/.agents/skills/`. Only descriptions load at boot — full instructions load when the task matches. Use `/skill:name` to force-load. Compatible with the Agent Skills standard.
<!-- /tldr -->

## What Skills Are

A skill is a directory with a `SKILL.md` file that teaches Soma how to do something specific. Skills are **progressive**: only the name and description are always in context. The full instructions load on-demand when the agent detects a relevant task.

```
brave-search/
├── SKILL.md          ← instructions (required)
├── search.js         ← helper scripts
└── content.js
```

## Locations

Skills are loaded from these locations:

| Location | Scope | Walk-up |
|---|---|---|
| `<cwd>/.soma/skills/` | Project-local — loads only in this project | No (cwd only) |
| `~/.soma/skills/` | ⚠ **Not loaded today** — see the note below | No |
| `~/.soma/agent/skills/` | Runtime-bundled — ships with Soma; **do not write here** | No |
| `~/.agents/skills/` | Cross-agent standard — shared with Claude Code, Cursor, etc. | **Yes** (ancestors) |

Two controls over what reaches the catalog: paths with a `_` prefix (`skills/_archive/`,
`skills/_template/`) never load, and `skills.deny` in `.soma/settings.json` hides a named skill
without moving or deleting it — useful when a doorway skill already routes to the same content.
Duplicate skill names in the emitted catalog are detected and reported.

**Where to put YOUR skills:** `~/.agents/skills/` for personal/global, or `<project>/.soma/skills/` for project-scoped. The `~/.soma/agent/skills/` location is the runtime install and is gated by soma-guard — writes there are blocked by default because they'd be lost on the next Soma update.

> ⚠ **`~/.soma/skills/` does not reach the prompt right now.** Soma passes `--skill ~/.soma/skills`
> at startup, and the skills there are still not advertised — measured 2026-08-12: 26 of the 30 dirs
> in one such folder appeared nowhere in the compiled prompt, with no error. **Put personal skills in
> `~/.agents/skills/` instead** (the cross-agent directory, discovered natively and verified working),
> or symlink: `ln -s ~/.soma/skills/my-skill ~/.agents/skills/my-skill`.
> Tracking: `generated-body` QUEUE B17.

**Opt-out:** `--no-skills` (or `-ns`) skips skill discovery for one session.

**Migration tip:** if you have `~/.agents/skills/` symlinked to a single home (e.g. `ln -s ~/.soma/skills ~/.agents/skills`), that still works — **and it is currently the only way `~/.soma/skills/` content gets loaded.** An earlier version of this page said the symlink was no longer required; that was wrong, and it is the reason the note above exists.

## Using Skills

### Automatic

When a task matches a skill's description, Soma loads and follows it automatically.

### Manual

Force-load a skill with the `/skill:` command:

```
/skill:brave-search            # Load the skill
/skill:pdf-tools extract       # Load with arguments
```

## Creating a Skill

### 1. Create the directory

```bash
mkdir -p .soma/skills/my-skill
```

### 2. Write SKILL.md

```markdown
---
name: my-skill
description: What this skill does. Be specific — this determines when the agent loads it.
---

# My Skill

## Setup

Run once before first use:
\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
./scripts/process.sh <input>
\`\`\`
```

### 3. Add helper files

Scripts, references, templates — whatever the skill needs. Use **relative paths** from the skill directory:

```markdown
See [the API reference](references/api.md) for details.
Run `./scripts/build.sh` to compile.
```

## SKILL.md Format

### Required Frontmatter

| Field | Description |
|-------|-------------|
| `name` | Lowercase, hyphens, max 64 chars. Must match directory name. |
| `description` | What the skill does and when to use it. Max 1024 chars. Be specific. |

### Optional Frontmatter

| Field | Description |
|-------|-------------|
| `license` | License name or reference |
| `compatibility` | Environment requirements |
| `disable-model-invocation` | When `true`, only loadable via `/skill:name` |

### Name Rules

- Lowercase letters, numbers, hyphens only
- No leading/trailing hyphens, no consecutive hyphens
- Must match parent directory name

### Description Best Practices

The description is what the agent uses to decide when to load the skill. Be specific:

```yaml
# Good — agent knows exactly when to load this
description: Extracts text and tables from PDF files, fills PDF forms, and merges multiple PDFs. Use when working with PDF documents.

# Bad — too vague to match
description: Helps with PDFs.
```

## Cross-Agent Compatibility

Skills follow the [Agent Skills standard](https://agentskills.io/specification). Skills in `~/.agents/skills/` work across different coding agents. To use skills from other agents:

```json
{
  "skills": [
    "~/.claude/skills",
    "~/.codex/skills"
  ]
}
```

Add this to `~/.soma/agent/settings.json`.

## Skill Repositories

- [Anthropic Skills](https://github.com/anthropics/skills) — Document processing (docx, pdf, pptx, xlsx), web dev
- [Pi Skills](https://github.com/badlogic/pi-skills) — Web search, browser automation, Google APIs, transcription

Install via:
```json
{
  "packages": ["pi-skills"]
}
```
