---
title: Tools
description: Soma tools — registration, configuration via _tools.md, and the bundled set
status: active
updated: 2026-06-21
---

# Tools

Soma tools are capabilities the agent can call during a session. They're
registered through Pi's tool API (`pi.registerTool()`) but routed through
Soma's `somaRegisterTool()` wrapper so the system prompt shows each tool's
full guidance (`promptSnippet` + `promptGuidelines`). Disable any tool via
`settings.json` → `tools.disabled`.

**Two routes** for a tool to enter Soma:

1. **Bundled** — ships with Soma, defined in `repos/agent/extensions/*.ts`
2. **Project extension** — dropped at `.soma/extensions/*.ts` (per workspace)

Both flow through the same pipeline and render identically in the prompt.

## Disabling tools — `settings.json`

Disable tools by name in `.soma/settings.json` under `tools.disabled`:

```json
{
  "tools": {
    "disabled": ["context_status"]
  }
}
```

It follows the body chain (project → parent → global) and the disabled sets
are unioned. Unlisted tools default to **enabled**, so bundled tools added in
future versions auto-register. The disable applies to **every** tool — bundled,
project extension, or raw `pi.registerTool` — because the active set is filtered
at session start, not only at registration.

**Hardwired tools** — currently `delegate` — cannot be disabled. Attempts are
ignored with a warning, preventing accidental lobotomies of systems that depend
on the tool (child-agent orchestration).

> **Retired:** `.soma/body/_tools.md` (with its `## Disabled` / `## Overrides` /
> `## Custom` sections) is gone. Disable moved to `settings.json`; per-tool
> overrides and the never-shipped markdown-custom-tools were dropped. Existing
> `_tools.md` files auto-migrate on next boot (disabled entries ported to
> settings, the file archived to `body/_archive/`).

## Sub-agent scoping

Child roles narrow their toolset with a role-scoped `tools.disabled` in their
own settings — e.g. a read-only `verifier` disabling `delegate`, `write`, `edit`.

## Bundled tools

Shipped in `repos/agent/extensions/` as of v0.20.2.1.

| Tool | Extension | Purpose |
|---|---|---|
| `delegate` | `soma-delegate.ts` | Spawn a focused child agent for a bounded task. Synchronous by default; set `background:true` for a detached terminal session. **Hardwired.** See [guides/background-delegation.md](guides/background-delegation.md). |
| `children` | `soma-delegate.ts` | Inspect/manage background children spawned via `delegate(background:true)`. Ops: `list` / `tail` / `steer` / `kill` / `harvest`. See [guides/background-delegation.md](guides/background-delegation.md). |
| `capabilities` | `soma-capabilities.ts` | Introspect the tool registry. `op:'list'` — all tools; `op:'detail', name:'<tool>'` — full guidance. |
| `soma` (`cap='soma:code.find'`) | `soma-addons/code.ts` | Grep with `file:line` output. Respects `.gitignore`. |
| `soma` (`cap='soma:code.map'`) | `soma-addons/code.ts` | Function/class/method index for one file (TS/JS/CSS/Bash). |
| `soma` (`cap='soma:code.refs'`) | `soma-addons/code.ts` | Symbol references split into DEF (definition) vs USE (usage). |
| `soma` (`cap='soma:code.structure'`) | `soma-addons/code.ts` | Directory tree with sizes. Respects `.gitignore`. |
| `soma` (`cap='soma:code.blast'`) | `soma-addons/code.ts` | Every file touching a symbol with severity — pre-deletion check. |
| `soma` (`cap='soma:code.outline'`) | `soma-addons/code.ts` | Markdown/text headings with line numbers — cheap orientation. (Was `file_outline`.) |
| `soma` (`cap='soma:code.history'`) | `soma-addons/code.ts` | `git log` for a file as structured output (sha + date + author + subject). Replaces raw `git log --format` shell calls. (v0.23.0+, SX-700.) |
| `soma` (`cap='soma:github.meta|files|search|refs|blast|audit|releases|diff|compare|file_diff|local_path|local_map|local_find|local_refs|local_blast|local_structure|cache_list|cache_clean'`) | `scripts/soma-github.js` | GitHub repo tools. API-mode: metadata, file tree, search, symbol refs, releases, diffs. Local-mode: fetch repo tarball (~1–5s) to `~/.soma/cache/gh/`, then run `soma-code` against it — treats any public repo like a local codebase. (v0.24.0+, SX-720.) |
| `soma` (`cap='soma:body.slots'`) | `soma-addons/body.ts` | Slot map of `_mind.md` with per-slot cache-impact. Run before editing body templates. |
| `soma` (`cap='soma:body.cost'`) | `soma-addons/body.ts` | Cache-invalidation cost of editing a specific slot. args: `{slot}`. |
| `soma` (`cap='soma:body.audit'`) | `soma-addons/body.ts` | Heuristic audit of the body compile: duplicate slots, missing files, cache-unfriendly ordering. |
| `soma` (`cap='soma:docs.list|show|search|whats_new|guide'`) | `soma-addons/docs.ts` | Bundled docs: list, read by name, full-text search. `whats_new({version?})` reads the agent-facing changelog; `guide({name})` resolves guides + dev guides. (v0.24.0+, SX-720.) |
| `soma` (`cap='soma:browser.*'`) | `soma-addons/browser.ts` | Browser automation via CDP: 21 caps — status, tabs, version, new_tab, close_tab, activate_tab, setup, config (standalone) + navigate, screenshot, evaluate, console, accessibility, links, styles, emulate, performance + xray, click, fill, wait (bridge). Captures tabId; click uses Input.dispatchMouseEvent. |
| `soma` (`cap='soma:agent.delegate'`) | `soma-addons/agent.ts` | Spawn a child agent. args: `{task, role?, model?, background?, terminal?}`. Sync by default; `background:true` returns immediately + registers in children.json. |
| `soma` (`cap='soma:agent.list|tail|steer|kill|harvest|focus'`) | `soma-addons/agent.ts` | Manage background children. `focus` = cmux focus-pane / tmux attach hint. |
| `soma` (`cap='soma:focus.show|set|clear|dry_run'`) | `soma-addons/focus.ts` | Boot-focus primer. `set <keyword>` seam-traces + primes next session's MAP + muscles. |
| `soma` (`cap='soma:new.muscle|protocol'`) | `soma-addons/new.ts` | Crystallize a pattern. Scaffolds `.soma/amps/muscles/<name>.md` or `.../protocols/<name>.md` with frontmatter. args: `{name, description?, tags?, global?, force?}`. |
| `soma` (`cap='soma:terminals.list|detect|status|prefer|doctor'`) | `soma-addons/terminals.ts` | Terminal-driver management for `soma:agent.delegate(background:true)`. Detect + prefer a driver (tmux/cmux/ghostty/iterm/terminal). |
| `soma` (`cap='soma:inbox.list|read|actioned|archive'`) | `soma-addons/inbox.ts` | Markdown-inbox read-status. `.list {status?}` shows letters; `.read/.actioned {file}` mark a letter handled so it stops surfacing at boot; `.archive {file}` moves it to `inbox/_archive/`. `file` = filename, slug, or unique partial. Resolves the `.soma/` chain from cwd. |
| `somaverse` (`cap='somaverse:workspace.*'`) | `somaverse-addons/workspace.ts` | Panes / channels / seams (status, send, connect, snapshot, add_pane, remove_pane, list_plugins, …). Requires bridge + paired hub. |
| `somaverse` (`cap='somaverse:plugin.read|write'`) | `somaverse-addons/plugin.ts` | Plugin-state persistence (Somadian-backed). |
| `somaverse` (`cap='somaverse:ai.*'`) | `somaverse-addons/ai.ts` | Local semantic search: load model, index, search, embed. |
| `somaverse` (`cap='somaverse:bridge.status|config|setup|start|stop|restart|logs'`) | `somaverse-addons/bridge.ts` | Local bridge daemon lifecycle from within the agent. Wraps `soma bridge` CLI. |
| `somaverse` (`cap='somaverse:auth.status|start|logout'`) | `somaverse-addons/auth.ts` | Device pairing with the Somaverse hub. Long-running `start` opens browser + polls; `logout` removes `~/.soma/device-key`. |

> **Namespace migration (v0.22.0, SX-594):** flat `code_*` / `file_outline` / `workspace_*` / `plugin_state_*` / `browser_*` / `ai_*` / `dev:body.*` / `delegate` / `children` tools were folded into the `soma:*` + `somaverse:*` meta-tools. Call via `soma(op='call', cap='soma:code.find', args={...})` or `somaverse(op='call', cap='somaverse:workspace.status')`. Use `soma(op='list')` / `somaverse(op='list')` to discover the full catalog. Legacy flat names archived to `extensions/_archive/sx594-flat-wrappers/`.
>
> **Cache math:** 1 meta-tool registration costs 1 tool slot in the prompt; addons are free (discovered at runtime via the factory). Flat tools cost linear: N tools = N slots. Post-SX-594 + SX-609, the prompt registers `soma` / `somaverse` / `dev` / `capabilities`, plus Pi builtins (`bash` / `read` / `write` / `edit`), plus the 10 `office_*` still parked as flat (SX-606). Approximately 19 slots for 100+ reachable caps.
| `context_status` | `soma-context.ts` | Current context usage `{percent, tokens, contextWindow}`. |
| `search` | `soma-search.ts` | Unified search — local ripgrep (default), Brave API, semantic (v0.20.3.1). |

Each tool defines:

- `name` — identifier the model invokes
- `description` — full explanation (fallback in prompt)
- `promptSnippet` — snappy one-line tagline (primary prompt render)
- `promptGuidelines` — per-tool mechanics bullets (how/when to use it)
- `parameters` — TypeBox schema (validated by Pi)
- `execute` — the handler
- `executionMode` — `parallel` (read-only, safe concurrent) or `sequential`

**Read the source** — each extension file has the authoritative definition
and inline commentary on why each guideline exists.

### Discovering what's registered

Two surfaces (SX-558):

**From a shell, without starting the agent:**

```bash
soma tool                  # list all registered tools (one-liner each)
soma tool delegate         # full guidance for one tool
soma tool --extensions     # group by extension file
```

This runs an offline static parser over `extensions/*.ts` (or
`dist/extensions/*.js` for release installs). It shows the authored definition.

**Inside a running Soma session, with overrides applied:**

```
capabilities(op: "list")
capabilities(op: "detail", name: "delegate")
```

The `capabilities` tool reads the runtime Soma registry and reflects
active/inactive status for the current session.

## Writing a new tool

See [Extending Soma → Soma Tools](/docs/extending#soma-tools) for the full
pattern. The shortest version:

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { somaRegisterTool } from "../core/tool-registry.js";

export default function myExtension(pi: ExtensionAPI) {
  somaRegisterTool(pi, {
    name: "my_tool",
    label: "My Tool",
    description: "Full description the model reads.",
    promptSnippet: "my_tool: one-line tagline for the prompt header",
    promptGuidelines: [
      "Use my_tool when X",
      "Chain with Y for Z",
    ],
    parameters: Type.Object({
      input: Type.String({ description: "What to process" }),
    }),
    executionMode: "parallel",
    execute: async (_id, { input }, _signal, _onUpdate, _ctx) => {
      return {
        content: [{ type: "text" as const, text: `Processed: ${input}` }],
        details: undefined,
      };
    },
  });
}
```

**Always use `somaRegisterTool`** over `pi.registerTool` directly — it
preserves `promptSnippet` and `promptGuidelines` in the compiled prompt.
(Disable still works for raw `pi.registerTool` tools too, via the active-set
filter at session start.)
Third-party tools that call `pi.registerTool` directly still work (Pi
registers them, they're invokable) but miss the rich prompt surface.

**For NEW caps (not top-level tools), prefer `route.provide` via
`session_start`.** The cap lives in soma-route's runtime registry — zero
cache cost, surfaced via the existing `soma`/`dev`/`somaverse` meta-tools.
See [extending.md § When to add a new cap](extending.md#when-to-add-a-new-cap)
and [extending.md § Project-local caps](extending.md#project-local-caps-routeprovide-no-factory).
`somaRegisterTool` remains the right call for **rich top-level tools**
(legacy or genuinely tier-1) where you want `promptSnippet` /
`promptGuidelines` in the compiled prompt; `route.provide` is for
everything else.

## How tools render in the system prompt

With `somaRegisterTool` + the Soma compiler:

```
Available tools:
- soma:code.find: grep with file:line output across a codebase, respects .gitignore (cap 500)
- soma:code.map: function/class/method index for a single file with line numbers
- ...

In addition to the tools above, you may have access to other custom tools depending on the project.

Guidelines:
- [soma:code.find] output is file:line:text — chain with read(path, offset=line) to pull surrounding context
- [soma:code.find] If it returns 'capped at 500', narrow via path or ext params instead of raising limit
- [soma:code.map] Run before editing a file you haven't read recently — shows structure at a glance
- ...
- Use bash for file operations like ls, rg, find
- Be concise in your responses
```

Per-tool guidelines are prefixed `[tool_name]`. Generic guidelines
(activity-conditioned rules like "use read before edit") follow.

## Invocation vs prompt

Two registries exist:

- **Pi's invocation registry** — what makes the tool callable at runtime.
  `pi.registerTool` writes here.
- **Soma's prompt registry** — what drives `buildToolSection`. `somaRegisterTool`
  writes here (and also forwards to Pi).

If `tools.disabled` lists a tool, it's filtered from the active set —
the tool isn't callable and isn't prompted.

## Related

- **[Extending Soma](/docs/extending)** — how to write extensions, the drop-in
  router (`soma-route.ts`), events, APIs
- **[System Prompt](/docs/system-prompt)** — how `_mind.md` renders with tools
- **[Body architecture](/docs/body)** — where settings sits in the chain
