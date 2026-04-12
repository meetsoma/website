---
type: automation
name: visual-gap-analysis
status: active
description: "Map any workflow as an ASCII sequence diagram. Find gaps at every handoff. Test the full path end-to-end. Diagrams find bugs — E2E tests prove fixes."
author: meetsoma
version: 1.0.0
license: MIT
tier: official
tags: [gap-analysis, flow, e2e, diagram, audit, edge-case, integration, testing]
triggers: [gap, analysis, flow, e2e, diagram, visual, audit, edge-case, delegation, integration]
estimated-turns: 5-15
requires: [a system or workflow to analyse]
produces: [ASCII flow diagram, gap list with severity, fix recommendations, E2E test results]
created: 2026-03-19
updated: 2026-04-02
---

# Visual Gap Analysis

## TL;DR

Draw the flow as an ASCII sequence diagram → label every arrow with what actually travels → mark each handoff with questions (auth? format? error handling?) → find gaps where assumptions replace tests → write E2E tests for the full path. The diagram finds bugs by forcing you to name every step. The tests prove the fixes.

Map any workflow end-to-end as an ASCII diagram. Identify every handoff, every external dependency, every place where things can fail. Then TEST it — diagrams find bugs, E2E tests prove fixes.

## When to Use

- Before launching a feature (signup, deploy pipeline, install flow)
- After building infrastructure that spans multiple services
- When something "should work" but you haven't tested the full path
- When explaining a system to someone (the diagram IS the documentation)
- After building delegation between processes (CLI → binary, API → service)
- When a flow touches env vars, auth tokens, or file permissions

## Steps

### 1. Identify the actors

Who/what participates? List them as columns:

```
USER          CLI              API              FILESYSTEM       RUNTIME
```

Include passive actors (filesystem, config files, env vars) — they're where the sneaky gaps live.

### 2. Enumerate ALL flows, not just the happy path

List every entry point. A CLI with 5 commands and 3 user states has 15+ flows:

```
Flow 1:  app (not installed, no auth)
Flow 2:  app (not installed, has auth)
Flow 3:  app (installed, verified)
Flow 4:  app init (fresh)
Flow 5:  app init (already exists)
Flow 6:  app --help
Flow 7:  app <unknown command>
```

**Don't skip flows.** The one you skip is where the bug lives.

### 3. Trace each flow as a sequence diagram

```
USER                    CLI                      API
 │  $ app init           │                        │
 │ ─────────────────────►│                        │
 │                       │  checkAuth()           │
 │                       │ ──────────────────────►│
 │                       │  200 or 401            │
 │                       │◄──────────────────────│
 │                       │  scaffold()            │
 │  ✓ Initialized        │                        │
 │◄─────────────────────│                        │
```

### 4. Mark every gap with ⚠️

At each handoff, ask:

| Question | Example gap |
|----------|-------------|
| What if this fails? | Network timeout, auth rejected, binary not found |
| What if the data is wrong? | Parse error, encoding issue |
| Who gets notified? | Silent failure with no user message |
| Is there a manual step? | Approval required, 2FA |
| What env var controls this? | Env var not set → wrong path |
| Does this work in a clean environment? | Symlinks, global installs mask failures |

### 5. Categorise gaps

| Severity | Meaning | Criterion |
|----------|---------|-----------|
| 🔴 Blocks launch | System doesn't function | User cannot complete the flow |
| 🟡 Degrades experience | Works but poorly | User frustrated or confused |
| 🟢 Nice to have | Polish | Better messaging, minor UX |

### 6. Output the summary

```
═══ GAPS SUMMARY ═══

1. [🔴] GAP_NAME — description
   Fix: specific action

2. [🟡] GAP_NAME — description
   Fix: specific action
```

### 7. Fix 🔴 first, then 🟡, then park 🟢

### 8. E2E test in isolation

**Don't skip this.** Your dev setup lies to you.

```bash
TEMP=$(mktemp -d)
# Simulate the user's path from scratch
# Verify every assertion from the diagram
rm -rf "$TEMP"
```

If the flow crosses process boundaries, test with the actual binary in the actual path with actual env vars. Mock nothing at this stage.

### 9. Update the summary with results

```
═══ GAPS RESOLVED ═══
✓ [was 🔴] GAP_NAME — fixed by commit abc123

═══ GAPS REMAINING ═══
1. [🟢] GAP_NAME — parked, not blocking
```

## Patterns

### Every flow, not just the happy path
The first analysis of a real CLI found 10 gaps. Enumerating ALL flows found 15. The difference: the first only traced the happy path.

### Env vars are invisible handoffs
A delegation bug was invisible in the diagram. It only appeared in isolation testing. **Every `exec` call is a potential env var gap.** Ask: what env vars does the called binary read?

### Config scope isn't always what you think
Some tools read config from the package that owns the binary, not from CWD. **When delegating to another tool's binary, understand their config resolution chain.**

### Diagram the resolved state too
After fixing gaps, re-draw the summary showing resolved vs remaining. The resolved list is proof of work. The remaining list is the honest backlog.
