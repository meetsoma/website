---
type: muscle
name: precision-edit
status: active
heat-default: warm
heat: 0
loads: 0
breadcrumb: "Before editing: grep -n to locate, read --offset to see exact whitespace, plan edits as a checklist, then execute. Never edit blind."
author: meetsoma
license: MIT
version: 1.0.0
tier: official
scope: hub
topic: [editing, tools, reliability, workflow]
keywords: [edit, precision, whitespace, grep, line-numbers, read-before-write]
created: 2026-03-14
updated: 2026-03-15
---

# Precision Edit

<!-- digest:start -->
> **Precision Edit** — `grep -n` to locate → `read --offset --limit` to see context → plan edits → match exact whitespace → re-read to verify. Never edit blind.
<!-- digest:end -->

## The Pattern

```
1. LOCATE — grep -n to get line numbers for each target
2. READ   — read --offset --limit to see exact content + whitespace
3. PLAN   — list every edit: file:line, old text, new text
4. EDIT   — execute edits with exact whitespace from step 2
5. VERIFY — re-read the file to confirm changes landed correctly
```

## Why

The `edit` tool requires exact text matching including whitespace. Guessing whitespace from memory or grep output fails. The only reliable path:
- `grep -n` finds the line number
- `read --offset --limit` shows the exact content with all whitespace preserved
- Copy the exact text from read output into the edit

## Rules

1. **Never edit from memory.** Even if you just read the file 2 turns ago, whitespace drifts in your context. Re-read.
2. **After each edit, line numbers shift.** If making multiple edits, re-read between them or edit bottom-to-top (later lines first).
3. **For multi-line edits, include enough context.** Match 2-3 lines around the target to avoid ambiguous matches.
4. **If an edit fails, read the file again.** Don't retry with slightly different whitespace — look at what's actually there.

## Anti-patterns

| ❌ Don't | ✅ Do |
|----------|-------|
| Edit based on line numbers from a previous read | Re-read immediately before editing |
| Guess indentation from grep output | Read the exact range to see whitespace |
| Make multiple edits without re-reading | Re-read between edits or edit bottom-to-top |
| Retry a failed edit with "maybe this whitespace" | Read the file, see what's actually there |
| Use `write` to "fix" an edit failure | Use `read` → `edit` with correct content |
