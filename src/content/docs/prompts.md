---
title: "Prompt Templates"
description: "Create reusable prompt templates that expand with /name in the editor."
section: "Workflows"
order: 4
---

<!-- tldr -->
Drop a Markdown file in `.soma/prompts/` and it becomes a `/command`. Type `/review` and it expands into your full review prompt. Supports arguments (`$1`, `$@`). No code needed.
<!-- /tldr -->

## Quick Start

Create a file:

```bash
mkdir -p .soma/prompts
cat > .soma/prompts/review.md << 'EOF'
---
description: Review staged git changes
---
Review the staged changes (`git diff --cached`). Focus on:
- Bugs and logic errors
- Security issues
- Error handling gaps
EOF
```

Use it in a session: type `/review` in the editor. It expands into the full prompt.

## How It Works

1. Soma scans prompt directories at startup
2. Each `.md` file becomes a `/command` (filename minus `.md`)
3. Descriptions show in autocomplete when you type `/`
4. The file content replaces the command text when expanded

## Locations

| Location | Scope |
|----------|-------|
| `~/.soma/agent/prompts/*.md` | Global — available in all projects |
| `.soma/prompts/*.md` | Project — available in this project only |

**Pro tip:** Ask Soma to create a prompt template for you — describe the workflow and she'll generate the file.

## Format

```markdown
---
description: What this template does (shown in autocomplete)
---

Your prompt text here. Can include:
- Markdown formatting
- Code blocks
- Multi-paragraph instructions
```

- **Filename** = command name. `review.md` → `/review`
- **description** is optional. If missing, the first line is used in autocomplete.

## Arguments

Templates support positional arguments:

| Syntax | Meaning |
|--------|---------|
| `$1`, `$2`, ... | Individual positional arguments |
| `$@` | All arguments joined |
| `${@:N}` | Arguments from position N onward |
| `${@:N:L}` | L arguments starting at position N |

### Example: Component Generator

```markdown
---
description: Create a React component
---
Create a React component named `$1` with these features: ${@:2}

Use TypeScript, follow the project conventions, and add tests.
```

Usage:
```
/component Button "onClick handler" "loading state"
```

Expands to:
> Create a React component named `Button` with these features: onClick handler loading state

## Examples

### Code Review
```markdown
---
description: Thorough code review of recent changes
---
Review my recent changes. Check:
1. Logic errors and edge cases
2. Security issues (injection, auth, data exposure)
3. Performance (unnecessary loops, missing indexes)
4. Error handling (uncaught exceptions, missing fallbacks)
5. Style (naming, comments, consistency)

Use `git diff` to see what changed. Be specific about line numbers.
```

### Refactor Plan
```markdown
---
description: Plan a refactoring for a file or module
---
Analyze `$1` and create a refactoring plan:
1. Map the current structure (functions, dependencies, exports)
2. Identify code smells and improvement opportunities
3. Propose changes in order (smallest risk first)
4. For each change: what, why, and what could break
```

### Deploy Checklist
```markdown
---
description: Pre-deploy verification
---
Run through this deployment checklist:
- [ ] All tests pass (`npm test`)
- [ ] No TypeScript errors (`npm run check`)
- [ ] No uncommitted changes (`git status`)
- [ ] CHANGELOG updated
- [ ] Version bumped if needed
- [ ] Build succeeds (`npm run build`)
Report the results.
```

## Discovery

Prompt template discovery is **non-recursive** — only `.md` files directly in the prompts directory are loaded. Subdirectories are ignored unless explicitly added via settings.
