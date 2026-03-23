---
title: "Skills"
description: "Installable capabilities — from the hub or hand-crafted. Lazy-loaded on demand."
section: "Customization"
order: 15
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

| Location | Scope |
|----------|-------|
| `.soma/skills/` | Project — available in this project |
| `~/.soma/agent/skills/` | Global Soma skills |
| `~/.agents/skills/` | Cross-agent skills (shared with other agents) |

Skills are also discovered from ancestor directories (up to git root), making monorepo setups work naturally.

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
