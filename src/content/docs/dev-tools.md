---
title: "Dev Tools — the dev:* Meta-Tool"
description: "The dev:* namespace: caps that ship with the Soma development tree, not with user installs. Audit, hub, issue, kanban families."
section: "Reference"
order: 13
since: v0.27.2
---

# Dev Tools — `dev:*`

<!-- tldr -->
`dev:*` is the internal-only meta-tool router. Caps live in `extensions/dev-addons/*.ts`, auto-discovered at `session_start` by `dev-tools.ts`. NOT shipped to user installs — the `dev-addons/` directory is excluded from the soma-beta tarball. Use when working from a Soma dev checkout. Four families today: `audit`, `hub`, `issue`, `kanban`.
<!-- /tldr -->

## Why `dev:*` exists separately from `soma:*`

The `dev:*` router was split out from `soma:*` because dev caps are meaningfully different on two axes:

| Axis | `soma:*` | `dev:*` |
|---|---|---|
| **Audience** | Every Soma user | Soma contributors / dev-team |
| **Shipping** | npm tarball (bundled with `meetsoma` package) | Dev tree only — excluded from user builds |
| **Stability promise** | Versioned, backward-compatible | Free to break; internal contract |
| **Cap descriptions** | Action-oriented for any agent | Workflow-specific to release / audit / triage |

The architectural pattern matches `soma:*` exactly: one `pi.registerTool("dev", ...)` head via `createMetaTool`, N caps registered through `route.provide`. Cache cost: one slot for the head, zero per cap.

## Current families

### `dev:audit.*`

Repo health audits beyond the hub.

| Cap | Wraps | Purpose |
|---|---|---|
| `dev:audit.ci` | GHA workflow status | Shows recent CI runs + their status, broken jobs first |
| `dev:audit.deps` | `npm outdated`, dependabot alerts | Outdated packages + security issues |

**Planned** (this cycle): `dev:audit.workspace` (wraps `_dev/soma-audit.sh` — workspace drift check).

### `dev:hub.*`

Inspect the meetsoma/community hub canonical sources.

| Cap | Purpose |
|---|---|
| `dev:hub.list` | List items by type (protocol, muscle, skill, template, script, automation) |
| `dev:hub.read` | Read raw markdown of a hub item |
| `dev:hub.diff` | Unified diff between hub canonical and local copy |
| `dev:hub.canonical` | Show all known paths for an item (community canonical, agent fallback, workspace dogfood) |
| `dev:hub.audit` | Drift report: fs vs hub-index counts, protocol drift, missing READMEs |

Use **BEFORE** editing a workspace muscle/protocol/script — `.canonical` shows which version wins; `.diff` previews what your workspace change would look like as a PR.

### `dev:issue.*`

File / list GitHub issues from inside a session.

| Cap | Purpose |
|---|---|
| `dev:issue.create` | File a structured issue (used by the autonomous CI loop on nightly failure) |
| `dev:issue.list` | List issues, optionally filtered by label (e.g., `nightly-failure`) |

Used by `soma-dev delegate ci-fix <url>` to fetch the issue body and dispatch the fix pipeline.

### `dev:kanban.*`

Triangulate ticket status across kanban + git + soma:code + sessions + cross-project.

| Cap | Purpose |
|---|---|
| `dev:kanban.audit` | Audit a single SX-N ticket. Returns SHIPPED / STALE / STALE-CROSS-PROJECT / STILL-VALID / NEEDS-REPRO / UNCLEAR with evidence |
| `dev:kanban.audit_open` | Audit every open ticket in 13s |
| `dev:kanban.audit_batch` | Parallel audit of a list of tickets |

Use **BEFORE** manually grepping through 3+ tickets. Closes the loop on stale items that should have been deleted weeks ago.

## How to add a new `dev:*` cap

1. Decide: does this fit an existing family (`audit`, `hub`, `issue`, `kanban`) or warrant a new family?
2. If existing family: add to `extensions/dev-addons/<family>.ts`. Register via `route.provide("dev:<family>.<cap>", fn, opts)`.
3. If new family: create `extensions/dev-addons/<new-family>.ts` with an `export function register(route)` function. Auto-discovery picks it up at next `session_start`.
4. Update `dev-tools.ts` `families:` block — add a row with `tldr` + `when` so it surfaces in the cheat sheet.
5. If wrapping a shell script, use `extensions/_shared/script-resolver.ts`:

```typescript
import { resolveScript, runScript, capLines, devFeatureMessage } from "../_shared/script-resolver.js";

async function myImpl(args: any = {}): Promise<string> {
  const script = resolveScript("soma-my-script.sh", "dev");
  if (!script) return devFeatureMessage("dev:family.cap", "_dev/soma-my-script.sh");
  const out = await runScript(script, [...]);
  return capLines(out, args.limit ?? 200, "Hint for refinement.");
}
```

## What does NOT belong in `dev:*`

- User-facing tools → `soma:*`
- Bootstrap discovery → standalone Pi tool (`capabilities`)
- Workspace-specific scripts that aren't part of the release/audit/triage workflow → `.soma/amps/scripts/commands/` (Pattern 1)

## Why some scripts in `_dev/` aren't cap'd

Many `_dev/` scripts are CI gates, deployment helpers, or sandbox infrastructure that humans run. Agent-cap surface adds discoverability and structured args — but those benefits don't justify the wrapping cost for scripts the agent doesn't routinely invoke. See `pro-tools.md` for the tier model.

The high-signal candidates that should be capped are tracked in [tools-architecture cycle](#) Phase 3.

## Distribution model

```
repos/agent/scripts/_dev/        Lives in the dev checkout
repos/agent/extensions/dev-addons/   Lives in the dev checkout
                                 ↓
                          Build excludes _dev/ + dev-addons/
                                 ↓
                          User tarball (soma-beta)
                                 ↓
                          Free-tier `dev:*` caps return:
                          "[dev:family.cap] Internal tool — script not found."
```

The graceful fallback message is generated by `devFeatureMessage()` in `script-resolver.ts`. Free-tier users invoking `dev:*` caps get a clear "not available on this install" rather than a subprocess error.

## Related

- `cli-tools.md` — the three patterns + decision flow
- `pro-tools.md` — `_pro/` tier model + PRO graceful degrade
- `extending.md` — Pi extension API + addon pattern
- `body/soma-tools.md` (workspace) — extension topology audit
