---
title: "CLI Tools: How Soma Surfaces Tools to the Agent"
description: "The three patterns for adding a tool. Pattern 1 (commands/.sh drop-in) is the answer most of the time. Decision flow ladder + reload semantics."
section: "Reference"
order: 12
---

# CLI Tools — How Soma Surfaces Tools to the Agent

<!-- tldr -->
Three patterns, ranked by ceremony. Pattern 1 (drop a `.sh` in `.soma/amps/scripts/commands/`) needs **zero reload**. Pattern 2 (cap under the existing `soma:*` / `dev:*` meta-tool) needs no Pi restart but the catalog visibility lags one session. Pattern 3 (`pi.registerTool` standalone) is cache-busting — last resort. The meta-tool is the answer for almost everything that isn't bootstrap-essential.
<!-- /tldr -->

When you want to give Soma a new tool, the question is **which surface** — not whether to restart. There are three patterns. Picking the wrong one means either cache bloat or a reload-required trap. Picking the right one means your tool is callable immediately.

## Pattern 1 — `.soma/amps/scripts/commands/<name>.sh` (zero ceremony)

Drop a `.sh` file in `.soma/amps/scripts/commands/`. The `/soma` slash command (registered in `extensions/soma-boot.ts`) reads this directory on every invocation. Type `/soma <name> [args]` and the handler shells out to your script.

**No reload. No cache impact. No Pi extension discovery. Filesystem is the registry.**

```bash
# Drop a script
echo '#!/usr/bin/env bash
echo "hello from $1"' > ~/.soma/amps/scripts/commands/greet.sh
chmod +x ~/.soma/amps/scripts/commands/greet.sh

# Use it immediately, no reload
/soma greet world
# → hello from world
```

The handler at `soma-boot.ts:3520-3531` reads the directory per call, so new files appear instantly in tab-complete and in the dispatcher.

**Use when:**

- The tool is a self-contained shell pipeline.
- You want it available right now, in this session, no questions asked.
- You don't need agent-API arg validation (positional args are fine).
- You want users to be able to install it via `/hub install script <name>`.

**Distribution paths:**

| Where it lives | Who gets it |
|---|---|
| `repos/agent/.soma/amps/scripts/commands/` (workspace template) → `~/.soma/amps/scripts/commands/` (per-user via `soma init`) | Every Soma install |
| `meetsoma/community/scripts/<name>/` → `/hub install script <name>` lands at `~/.soma/amps/scripts/` | Hub users |
| `<project>/.soma/amps/scripts/commands/` | Workspace-specific |

## Pattern 2 — Cap under an existing meta-tool (cache-safe)

Every namespaced cap (`soma:*`, `dev:*`, `somaverse:*`) lives behind exactly **one** Pi tool head per namespace, registered via `createMetaTool("name", ...)` in `extensions/_shared/meta-tool-factory.ts`. The factory:

1. Calls `pi.registerTool(...)` **once** per namespace — cache cost is constant.
2. Auto-discovers `<name>-addons/*.ts` at `session_start`.
3. Each addon calls `route.provide("name:family.cap", fn, { description })` to register caps into `globalThis.__somaRoute`.
4. At call time, `<name>(op='call', cap='name:family.cap', args={...})` dispatches through the router.

**Three meta-tool routers exist:**

| Router | Source | Addon dir | Tier |
|---|---|---|---|
| `soma:*` | `extensions/soma-tools.ts` | `soma-addons/` | Free — always-on |
| `dev:*` | `extensions/dev-tools.ts` | `dev-addons/` | Internal — dev tree only |
| `somaverse:*` | `somaverse/builds/*/extensions/somaverse-tools.ts` | `somaverse-addons/` | Somaverse builds only |

No `pro:*` router exists. PRO scripts (in `scripts/_pro/`) get wrapped by `soma:*` caps with graceful "PRO feature" degrade via [`extensions/_shared/script-resolver.ts`](#) when the underlying script isn't on disk. See `pro-tools.md`.

**Add a cap:**

```typescript
// extensions/soma-addons/foo.ts
import { resolveScript, runScript, capLines, devFeatureMessage } from "../_shared/script-resolver.js";

async function fooDoImpl(args: any = {}): Promise<string> {
  if (!args?.term) return "[soma:foo.do] requires {term}";
  const script = resolveScript("soma-foo.sh", "amps");
  if (!script) return devFeatureMessage("soma:foo.do", "soma-foo.sh");
  const out = await runScript(script, [String(args.term)]);
  return capLines(out, args.limit ?? 200, "Refine via more specific term.");
}

export function register(route: any): void {
  route.provide(
    "soma:foo.do",
    async (a: any = {}) => fooDoImpl(a),
    {
      provider: "soma-tools",
      description: "Do something with {term}. args: {term, limit?:200}.",
    },
  );
}
```

**Reload semantics:**

- The cap appears in `soma(op='list')` only after the next `session_start` (addon auto-discovery runs once per session).
- The **underlying script or function** is callable RIGHT NOW (via `Bash` or direct subprocess) if you know what you wrote.
- This is the trap: treating "not visible in `op='list'`" as "not callable." They're different things.

**Use when:**

- The tool has structured args + belongs in a named family.
- You want it discoverable by future sessions via `op='list'`.
- You want uniform argument validation + graceful error messages.

## Pattern 3 — Top-level Pi tool (cache-busting, last resort)

`extensions/soma-foo.ts` calling `pi.registerTool` or `somaRegisterTool` directly. Each registration adds a tool definition to the cached system prompt. Cache cost: one slot per tool.

**Only justified for:**

- Bootstrap-essential tools (`capabilities` — the tool registry introspector).
- Pre-meta-tool legacy (folded into namespaces over time).

New work should never land here. If you're tempted to add a standalone `pi.registerTool`, ask whether it could be a cap under `soma:*` instead. It almost always can.

## Decision flow

```
Is it a shell script with simple args?
  YES → Drop in .soma/amps/scripts/commands/<name>.sh   [Pattern 1]
  NO  ↓

Does it have structured args + belong in an existing family?
  YES → Add cap to extensions/soma-addons/<family>.ts   [Pattern 2]
  NO  ↓

Is it a new namespaced family?
  YES → Create extensions/soma-addons/<new-family>.ts   [Pattern 2 — new family]
  NO  ↓

Is it bootstrap-essential (like `capabilities`)?
  YES → extensions/soma-<name>.ts with somaRegisterTool [Pattern 3 — weighed against cache cost]
  NO  → STOP. Re-examine — 90% of cases fit Pattern 1 or 2.
```

## What's actually in each directory today

```
.soma/amps/scripts/commands/    Pattern 1 — drop-ins, /soma <name> finds them
  find.sh
  heat.sh
  hub.sh

extensions/soma-addons/         Pattern 2 — soma:* family addons
  agent.ts        (7 caps)
  body.ts         (3 caps)
  browser.ts      (17 caps)
  code.ts         (7 caps)
  docs.ts         (7 caps)
  focus.ts        (4 caps)
  github.ts       (21 caps)
  new.ts          (3 caps)
  seam.ts         (8 caps)
  terminals.ts    (5 caps)

extensions/dev-addons/          Pattern 2 — dev:* family addons (internal)
  audit.ts        (2 caps)
  hub.ts          (5 caps)
  issue.ts        (2 caps)
  kanban.ts       (3 caps)

extensions/                     Pattern 3 — standalone tools (last resort)
  soma-capabilities.ts    (capabilities — bootstrap discovery)
  soma-context.ts         (context_status — folding into soma:body soon)
  soma-search.ts          (search — folding into soma:search soon)
```

Regenerate the count: `python3 .soma/amps/scripts/soma-tools-audit.py`.

## Hub-installable extensions (current limitation)

`/hub install` today supports six content types: `protocol`, `muscle`, `skill`, `template`, **`script`**, `automation`. Scripts land at `~/.soma/amps/scripts/` immediately — they work without a restart (Pattern 1 if dropped in `commands/`, or shell-callable directly).

**Extensions (Pattern 2 addons) are NOT hub-installable today.** Adding extension side-loading would require a core change to `soma-hub.ts` and the addon auto-discovery loop. Documented gap. The workaround: ship the underlying shell script via the hub (Pattern 1) and have the cap surface ship in a Soma release (Pattern 2).

## Related docs

- `dev-tools.md` — what `dev:*` is for, families inventory
- `pro-tools.md` — `_pro/` tier model, distribution, graceful degrade
- `extending.md` — Pi extension API surface
- `body.md` — body file system + cache budget
- `body/soma-tools.md` (workspace-private) — extension topology + audit tables (regenerable)
- `core/body.ts` — body walker (non-recursive, flat-only)
