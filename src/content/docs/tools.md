---
title: Tools
description: Soma tools — registration, configuration via _tools.md, and the bundled set
status: active
updated: 2026-04-22
---

# Tools

Soma tools are capabilities the agent can call during a session. They're
registered through Pi's tool API (`pi.registerTool()`) but routed through
Soma's `somaRegisterTool()` wrapper so `_tools.md` can configure them and
the system prompt shows each tool's full guidance (`promptSnippet` +
`promptGuidelines`).

**Three routes** for a tool to enter Soma:

1. **Bundled** — ships with Soma, defined in `repos/agent/extensions/*.ts`
2. **Project extension** — dropped at `.soma/extensions/*.ts` (per workspace)
3. **Markdown (custom)** — declared in `.soma/body/_tools.md` (v0.20.3+ scope; parsed but not registered as of v0.20.2.1)

All three flow through the same pipeline and render identically in the prompt.

## `_tools.md` — the config

`_tools.md` is the man-in-the-middle between registration and the final
registry. It lives in `.soma/body/_tools.md` and follows the soma body
chain (project → parent → global; child wins). Three sections:

```markdown
## Disabled

- context_status   # opt out of this tool

## Overrides

### search
**promptSnippet:** Project convention: prefer search() over bash rg.
**promptGuidelines:**
- Default scope is 'os' (ripgrep).
- scope='api' for web (requires BRAVE_API_KEY).

## Custom

### weather
**description:** Get weather for a location.
**parameters:** ...
**execute:** `curl -s "wttr.in/{{location}}?format=3"`
```

### Disabled

Bullet list of tool names to skip. Unlisted tools default to **enabled**,
so bundled tools added in future Soma versions auto-register without
requiring edits to `_tools.md`.

**Hardwired tools** — currently `delegate` — cannot be disabled. Attempts
emit a warning and register the tool anyway. This prevents accidental
lobotomies of systems that depend on the tool (child-agent orchestration).

### Overrides

Per-tool tweaks to any of four fields: `description`, `promptSnippet`,
`promptGuidelines`, `executionMode`. Remove a block to revert the tool to
its extension-defined defaults. Overrides apply to **any** tool (bundled,
project extension, hardwired) — they change what the model sees, not the
tool's identity.

Field syntax inside each `### tool_name` block:

```markdown
**description:** one-line override
**promptSnippet:** short tagline that renders in "Available tools:"
**promptGuidelines:**
- first bullet
- second bullet
**executionMode:** parallel
```

### Custom

Markdown-defined tools with shell-backed execution. Parsed in v0.20.2.1
but not yet registered — the security model (parameter escaping, timeout
enforcement, opt-in via `allow: true`, sub-agent scope) lands in v0.20.3.

The format is identical to an Override block, plus:

```markdown
### weather
**description:** Get weather for a location.
**promptSnippet:** Use weather when the user asks about conditions.
**promptGuidelines:**
- Location accepts city, airport code, or lat/lon.
**parameters:**
- `location` (string, required) — city name or airport code
**execute:** `curl -s "wttr.in/{{location}}?format=3"`
**timeout:** 5s
```

## Sub-agent scoping

Each child role (under `body/children/<role>/`) inherits from the main
body chain but can override `_tools.md` with its own. A narrow `_tools.md`
at `body/children/verifier/_tools.md` scopes that role's toolset:

```markdown
## Disabled

- search
- delegate         # no nested delegation
- workspace_send   # read-only role
- workspace_add_pane
```

The child sees only the tools you didn't disable. Pure markdown — no new
TS needed.

## Bundled tools

Shipped in `repos/agent/extensions/` as of v0.20.2.1.

| Tool | Extension | Purpose |
|---|---|---|
| `delegate` | `soma-delegate.ts` | Spawn a focused child agent for a bounded task. Synchronous by default; set `background:true` for a detached terminal session. **Hardwired.** See [guides/background-delegation.md](guides/background-delegation.md). |
| `children` | `soma-delegate.ts` | Inspect/manage background children spawned via `delegate(background:true)`. Ops: `list` / `tail` / `steer` / `kill` / `harvest`. See [guides/background-delegation.md](guides/background-delegation.md). |
| `capabilities` | `soma-capabilities.ts` | Introspect the tool registry. `op:'list'` — all tools; `op:'detail', name:'<tool>'` — full guidance. |
| `code_find` | `soma-code-tools.ts` | Grep with `file:line` output. Respects `.gitignore`. |
| `code_map` | `soma-code-tools.ts` | Function/class/method index for one file (TS/JS/CSS/Bash). |
| `code_refs` | `soma-code-tools.ts` | Symbol references split into DEF (definition) vs USE (usage). |
| `code_structure` | `soma-code-tools.ts` | Directory tree with sizes. Respects `.gitignore`. |
| `code_blast` | `soma-code-tools.ts` | Every file touching a symbol with severity — pre-deletion check. |
| `file_outline` | `soma-code-tools.ts` | Markdown/text headings with line numbers — cheap orientation. |
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
`dist/extensions/*.js` for release installs). It does NOT apply `_tools.md`
overrides — it shows the authored definition.

**Inside a running Soma session, with overrides applied:**

```
capabilities(op: "list")
capabilities(op: "detail", name: "delegate")
```

The `capabilities` tool reads the runtime Soma registry (post-`_tools.md`
merge) and reflects active/inactive status for the current session.

## Writing a new tool

See [Extending Soma → Soma Tools](/docs/extending#soma-tools) for the full
pattern. The shortest version:

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
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

**Always use `somaRegisterTool`** over `pi.registerTool` directly — it's
the gate that makes `_tools.md` work, preserves `promptSnippet` and
`promptGuidelines` in the compiled prompt, and supports overrides.
Third-party tools that call `pi.registerTool` directly still work (Pi
registers them, they're invokable) but miss the rich prompt surface.

## How tools render in the system prompt

With `somaRegisterTool` + the Soma compiler:

```
Available tools:
- code_find: code_find: grep with file:line output across a codebase, respects .gitignore (cap 500)
- code_map: code_map: function/class/method index for a single file with line numbers
- ...

In addition to the tools above, you may have access to other custom tools depending on the project.

Guidelines:
- [code_find] code_find output is file:line:text — chain with read(path, offset=line) to pull surrounding context
- [code_find] If code_find returns 'capped at 500', narrow via path or ext params instead of raising limit
- [code_map] Run code_map BEFORE editing a file you haven't read recently — shows structure at a glance
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

If `_tools.md` disables a tool, it's excluded from **both** registries —
the tool isn't callable, isn't prompted. Overrides only affect the prompt
registry (the tool's behavior is unchanged; only the model's understanding
of it is tweaked).

## Related

- **[Extending Soma](/docs/extending)** — how to write extensions, the drop-in
  router (`soma-route.ts`), events, APIs
- **[System Prompt](/docs/system-prompt)** — how `_mind.md` renders with tools
- **[Body architecture](/docs/body)** — where `_tools.md` sits in the chain
