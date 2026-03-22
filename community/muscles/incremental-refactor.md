---
type: muscle
name: incremental-refactor
status: active
triggers: [refactor, incremental, dependencies, backward-compatible, scan, migration, refactoring, safety, workflow, code-quality]
heat-default: warm
heat: 0
loads: 0
breadcrumb: "Never refactor blind. Scan deps first, plan changes, execute one file at a time, keep old paths working during transition, verify after each step."
author: meetsoma
license: MIT
version: 1.0.0
tier: official
scope: hub
created: 2026-03-14
updated: 2026-03-21
---

# Incremental Refactor

<!-- digest:start -->
> **Incremental Refactor** — never refactor blind. Scan deps → plan changes → execute one file at a time → verify after each → atomic commits. Keep old paths alive until fully migrated.
<!-- digest:end -->

## The Phases

### 1. SCAN — Map the blast radius
```bash
# Find everything that references what you're changing
grep -rn "old_name" . --include="*.ts" --include="*.md"
grep -rn "old/path" . --include="*.ts" --include="*.sh"
```
Record every file and line. This is your change list.

### 2. PLAN — Write it down
Before any edit, list every change:
```
- file.ts:42 — rename import oldName → newName
- test.sh:15 — update path reference
- docs.md:8 — update example
```
Order matters: change the source first, then consumers, then docs.

### 3. EXECUTE — One at a time
- Change one file
- Keep backward compatibility during transition (accept both old and new names/paths)
- If renaming an export: keep the old name as an alias until all consumers are updated

### 4. VERIFY — After each change
```bash
# Don't wait until the end — verify incrementally
run tests after each file
grep for the old name — count should decrease by exactly the files you changed
```

### 5. COMMIT — Atomic units
One commit per logical change. "Rename X → Y in module A" is one commit. "Update all tests for new name" can be another.

### 6. CLEAN UP — Delete old only when done
Only after ALL consumers are migrated and tests pass:
- Remove old aliases, re-exports, and backward-compat shims
- Final grep to confirm zero references to old names
- One clean "remove deprecated X" commit

## Anti-patterns

| ❌ Don't | ✅ Do |
|----------|-------|
| Rename everywhere in one giant commit | One file at a time, verify between |
| Delete old name before updating consumers | Keep old name as alias during migration |
| Skip the scan — "I know what uses this" | Grep first. You're always wrong about scope. |
| Test only at the end | Test after each file change |
| Mix refactoring with feature work | Separate commits. Refactor first, then build. |
