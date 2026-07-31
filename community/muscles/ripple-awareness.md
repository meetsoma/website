---
name: ripple-awareness
type: muscle
status: active
description: "When X changes, what else must update? Map the blast radius before committing. Cross-reference checks prevent stale docs, broken imports, and drift."
heat-default: cold
tags: [quality, dependencies, cross-reference, blast-radius]
applies-to: [development, refactoring]
scope: bundled
tier: core
created: 2026-04-03
updated: 2026-04-04
version: 1.0.0
author: meetsoma
license: MIT
heat: 0
---

# Ripple Awareness

## TL;DR
When X changes, what else must update? Before committing: grep for references, check cross-file dependencies, update docs that mention the changed thing. The commit that changes code but not its docs is a debt bomb.

## The Instinct

Every change ripples. The question is how far.

Before committing, ask: **what references the thing I just changed?**

## Ripple Checklist

| You changed... | Also check... |
|----------------|--------------|
| A function name | All callers (`grep -rn "oldName"`), tests, docs that reference it |
| A file path | Imports, configs, READMEs, scripts that reference the old path |
| An API endpoint | Frontend calls, tests, docs, OpenAPI specs |
| A config key | Env files, docker-compose, CI configs, docs |
| A dependency version | Lock file, CI matrix, other packages that depend on it |
| A protocol or muscle | The digest line, any MAP that references it, the body if it's loaded |
| A template | Any docs that show the old template format |

## How to Check

```bash
# Before committing: grep for the old name/path
grep -rn "old_thing" . --include="*.md" --include="*.ts" --include="*.json"

# For renames: check nothing still references the old name
grep -rn "oldFunctionName" . | grep -v node_modules
```

## The Pattern

1. Make the change
2. Grep for references to the old version
3. Update every reference found
4. Grep again to confirm zero matches
5. Commit

Skip step 2-4 and you ship a drift bomb — something that works today and confuses someone tomorrow.

heat: 0
---
