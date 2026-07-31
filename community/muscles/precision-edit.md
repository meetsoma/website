---
name: precision-edit
type: muscle
status: active
description: "the match must be verified by `read` first."
heat: 0
triggers: [edit, replace, sed, line, surgical, precise, oldtext, exact, match, whitespace, editing, precision, code]
tags: [editing, workflow, copy, website]
applies-to: [any]
created: 2026-03-14
updated: 2026-04-04
tools: []
scripts: [soma-verify.sh copy, soma-verify-styles.sh]
version: 1.0.0
author: meetsoma
license: MIT
heat-default: warm
tier: official
---

# Precision Edit

## TL;DR
**Precision Edit** — before editing any multi-line file, extract content with line numbers first. (1) Run relevant verify script (`soma-verify.sh copy`, `soma-verify-styles.sh`) to find issues. (2) `grep -n` the target patterns to get exact line numbers. (3) `read --offset --limit` the exact ranges to see surrounding whitespace. (4) Plan all edits as a line-numbered checklist before touching anything. (5) Edit with exact whitespace matches. Never `edit` blind — the match must be verified by `read` first.

## The Pattern

```
1. SCAN   — run verify script to find what's wrong
2. LOCATE — grep -n to get line numbers for each issue
3. READ   — read --offset --limit to see exact content + whitespace
4. PLAN   — list every edit: file:line, old text, new text
5. EDIT   — execute edits with exact whitespace from step 3
6. VERIFY — re-run verify script to confirm fixes
```

## Why

`edit` requires exact text matching including whitespace. Guessing whitespace from memory or grep output fails. The only reliable path:
- `grep -n` finds the line number
- `read --offset --limit` shows the exact content with all whitespace
- Copy the exact text from read output into the edit

## Anti-patterns

- ❌ Editing based on line numbers from a previous read (content shifts after edits)
- ❌ Guessing indentation from grep output (grep strips context)
- ❌ Multiple edits without re-reading between them (line numbers drift)
- ❌ Editing without running the verify script first (might fix the wrong thing)

## Related

- `soma-verify.sh copy` — finds stale copy, counts, framing issues
- `soma-verify-styles.sh` — finds raw CSS values, inconsistent typography
- `soma-verify.sh website` — docs sync verification
