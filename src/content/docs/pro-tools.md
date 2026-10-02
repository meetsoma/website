---
title: "Pro Tools — the _pro/ Tier"
description: "Scripts and capabilities that ship in the soma-beta tarball (PRO) but not the public npm package."
section: "Reference"
order: 14
draft: true
---

# Pro Tools — `_pro/`

<!-- tldr -->
meetsoma core is open source and free. The `_pro/` scripts are NOT part of it: they are excluded from the core export and are not compiled by `build-dist.mjs`, so they form an optional pack (delivery still being designed). The tier plumbing (`script-resolver.ts`, a graceful "PRO feature" degrade message, a provisioned session token) is still in the code, built for a metered Pro/enterprise tier later in the ladder (core → hub → Somaverse → pro/enterprise). No separate `pro:*` meta-tool router exists; PRO functionality rides the `soma:*` namespace with conditional script-presence checks.
<!-- /tldr -->

## Tier model

Soma ships in two trees, defined by which subdirectories ship in the install:

| Tier | What ships | Distribution |
|---|---|---|
| **Core (open source)** | `extensions/` (no `dev-addons/`), `core/`, `dist/`, bundled `amps/`, `templates/` | `meetsoma/core` (GitHub, public) + npm `meetsoma` launcher — free |
| **Pro pack (optional)** | `scripts/_pro/` | not in the core export; delivery being designed |
| **Dev** | All of Core + `scripts/_dev/`, `extensions/dev-addons/`, source `.ts` files | Dev tree only — internal contributors |

The split is enforced by the core export: `scripts/_dev/soma-core-excludes.txt` lists `scripts/_pro/`, so it never reaches `meetsoma/core`. A core cap that wraps a `_pro/` script finds nothing and returns the graceful "PRO feature" message below instead of failing.

## Why no `pro:*` meta-tool router (yet)

Today, PRO functionality is delivered via `_pro/` shell scripts + `soma:*` caps that wrap them. There is no separate `pro:*` meta-tool router (in contrast to `dev:*` which IS its own router).

**The decision:** mix PRO caps under `soma:*` with graceful degrade.

**Arguments for mixing (current state):**

- Fewer Pi tool heads = less cache impact (one slot per meta-tool family head)
- One namespace for the agent to learn (`soma:*` is the universal surface)
- Free-tier users don't see PRO caps as a teaser; they see a degrade message when they try
- Migration path: every cap that becomes PRO-required gets one wrapping change

**Arguments against (when this should change):**

- PRO cap count exceeds ~15 → browsing-by-namespace becomes useful
- A PRO cap shape exists that doesn't fit `soma:*` semantics (e.g., bridge-only, license-gated)
- PRO discoverability becomes a sales surface (`pro(op='list')` as the menu)

**When any of those become true, file a ticket for a `pro:*` router.** Until then, mixed-in-`soma:*`-with-degrade is the right shape.

## How the graceful degrade works

`extensions/_shared/script-resolver.ts` provides the path resolution + fallback messages. Any cap that wraps a `_pro/` script follows this pattern:

```typescript
import { resolveScript, runScript, capLines, proFeatureMessage } from "../_shared/script-resolver.js";

async function ancestorsImpl(args: any = {}): Promise<string> {
  if (!args?.term) return "[soma:seam.ancestors] requires {term}";
  const script = resolveScript("soma-seam.sh", "pro");
  if (!script) return proFeatureMessage("soma:seam.ancestors", "_pro/soma-seam.sh");
  const out = await runScript(script, ["ancestors", String(args.term)]);
  return capLines(out, args.limit ?? 200, "Refine via more specific term.");
}
```

If `resolveScript("soma-seam.sh", "pro")` doesn't find the script (the normal case on a meetsoma core install, which has no `_pro/` pack), `proFeatureMessage(...)` returns:

```
[soma:seam.ancestors] PRO feature — script not found.

This cap wraps `_pro/soma-seam.sh`. Run `soma doctor` to repair the install.
```

No crash, no confusing error — clear path forward.

## Current `_pro/` inventory

Seven scripts ship today:

| Script | Wrapped by cap? | Purpose |
|---|---|---|
| `soma-seam.sh` | ✅ `soma:seam.*` (5 caps: ancestors, timeline, seeds, gaps, web) | Concept archaeology across vault + Pi sessions + Claude sessions |
| `soma-github.sh` + `soma-github-cache.sh` | ✅ `soma:github.*` (21 caps) | GitHub API + local repo indexer |
| `soma-refactor.sh` | ⚠ CLI verb only (no cap surface yet) | Dependency graph + blast radius analysis |
| `soma-scrape.sh` | ⚠ No cap | Doc discovery + pull-to-local for new tools |
| `soma-browser.sh` | ⚠ CLI-only counterpart to `soma:browser.*` | Bridge-proxied browser ops (older, hardcoded Brave+bridge — see `browser-setup.md` for the configurable `soma:browser.*` system) |
| `soma-theme.sh` | ⚠ No cap | Theme switcher |

Three are currently capped (seam, github, github-cache via github family). The rest are CLI-only or only partially routed.

## How to add a new `_pro/` script

1. Write the script at `repos/agent/scripts/_pro/soma-<name>.sh`.
2. Add execute permission: `chmod +x repos/agent/scripts/_pro/soma-<name>.sh`.
3. (Optional) Wrap as a cap under `soma:*` for agent-facing structured access:

```typescript
// extensions/soma-addons/<family>.ts
async function myImpl(args: any = {}): Promise<string> {
  const script = resolveScript("soma-<name>.sh", "pro");
  if (!script) return proFeatureMessage("soma:<family>.<cap>", "_pro/soma-<name>.sh");
  // ... shell out, return result
}
```

4. Verify it builds into `repos/agent/dist/scripts/_pro/soma-<name>.js` (compiled) — `build-dist.mjs --clean`.
5. Verify the cap degrades gracefully when called from a free-tier install (no `_pro/` directory present).

## Distribution boundary checklist

Before shipping a `_pro/` script:

- [ ] Does the cap that wraps it use `script-resolver.ts` (graceful degrade)?
- [ ] Does `proFeatureMessage()` reference the right install URL?
- [ ] Is the underlying `.sh` file referenced in any agent doc that ships to free tier? (If yes, that doc needs to flag it as PRO.)
- [ ] Does `build-dist.mjs` compile the script correctly?
- [ ] Does the public `meetsoma/core` distribution include the compiled `_pro/*.js`?

## What does NOT belong in `_pro/`

- Tools every Soma user should have → `repos/agent/.soma/amps/scripts/` (free, ships in npm)
- Internal CI / sandbox / release scripts → `scripts/_dev/` (dev tree only)
- Workspace-specific drop-ins → `.soma/amps/scripts/commands/` (Pattern 1, instant `/soma <name>`)

## Related

- `cli-tools.md` — the three patterns + decision flow
- `dev-tools.md` — `dev:*` namespace + dev tree exclusions
- `extending.md` — Pi extension API + addon pattern
- `browser-setup.md` — the configurable `soma:browser.*` system (newer, supersedes `_pro/soma-browser.sh` for agent use)
- `extensions/_shared/script-resolver.ts` — the graceful-degrade helper
