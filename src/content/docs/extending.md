---
title: "Extending Soma"
description: "Skills, extensions, events, APIs — build on top of Soma."
section: "Extending"
order: 5
---


<!-- tldr -->
Built on Pi — inherits full extension system. Skills: markdown instructions in `.soma/skills/` or `~/.soma/agent/skills/`. Extensions: TypeScript hooks into agent lifecycle (before_agent_start, tool_result, session_shutdown). Built-in extensions: soma-boot (identity + protocols + muscles), soma-breathe (breath cycle + session rotation), soma-guard (safe file operations), soma-header (branded σῶμα header), soma-hub (community hub), soma-route (inter-extension communication), soma-scratch (scratch pad), soma-statusline (context/cost/git footer).
<!-- /tldr -->

Soma is built on [Pi](https://github.com/badlogic/pi-mono) and inherits its full extension system. You can add skills, extensions, and custom tools.

## Skills

Skills are specialized instructions that load when a task matches their description. They're **framework-agnostic** — a skill from Claude Code, Cursor, or any agent system works in Soma without modification.

What makes Soma different: **muscles and protocols refine skills over time**. A logo design skill teaches the technique. A muscle learns your specific preferences. A protocol enforces your brand standards. The skill provides raw expertise; Soma's behavioral layers personalize and improve it through repeated use — without you ever asking.

### Installing Skills

Install from the hub or place manually:

```bash
/hub install skill my-skill    # from Soma Hub
```

Or place skill directories in one of these locations:

| Location | Scope |
|----------|-------|
| `.soma/skills/` | Project-local (only loads in this project) |
| `~/.soma/agent/skills/` | Global (loads for all projects) |

### Creating Skills

Create a directory with a `SKILL.md` file:

```
my-skill/
└── SKILL.md
```

**SKILL.md** contains:
- A `description` that tells Soma when to load it
- Instructions for how to handle the task
- Optional file references for additional context

```markdown
# My Custom Skill

**Description:** Help with deploying to production servers.

## Instructions

When the user asks about deployment:
1. Check the deployment config at `deploy.yaml`
2. Verify all tests pass
3. ...
```

Place in `.soma/skills/` (project) or `~/.soma/agent/skills/` (global).

## Extensions

Extensions are TypeScript files that hook into Soma's lifecycle events.

### Extension Locations

| Location | Scope |
|----------|-------|
| `.soma/extensions/` | Project-local (loads when CWD is in this project) |
| `~/.soma/agent/extensions/` | Global (loads for all projects) |

### Extension Security

Extensions run with full system permissions. Configure an allowlist in `settings.json` to get warnings about unrecognized extensions:

```json
{
  "extensions": {
    "allowlist": ["soma-boot.ts", "soma-breathe.ts", "..."]
  }
}
```

See [Configuration → Extension Security](/docs/configuration#extension-security) for details.

### Writing an Extension

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function myExtension(pi: ExtensionAPI) {
  // Register a command
  pi.registerCommand("hello", {
    description: "Say hello",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Hello from my extension!", "info");
    },
  });

  // Hook into session lifecycle
  pi.on("session_start", async (_event, ctx) => {
    // Do something on session start
  });

  pi.on("turn_end", async (_event, ctx) => {
    // Do something after each agent turn
  });
}
```

### Available Events

| Event | When |
|-------|------|
| `session_start` | Session loads (check `event.reason`: startup, reload, new, resume, fork) |
| `turn_start` | Agent begins processing |
| `turn_end` | Agent finishes processing |
| `message_end` | Message fully rendered |
| `tool_result` | Tool call completes |
| `before_agent_start` | Before each agent turn — **can modify the system prompt** by returning `{ systemPrompt }` |
| `session_shutdown` | Session closing |

**Hot-reload:** Pi's `/reload` command re-loads extensions via `jiti.import`
(mtime-keyed cache). Extension file edits are picked up without restarting
the process. `core/*.ts` changes *may* hot-reload through the chain; `dist/`
changes require a full restart.

### Modifying the System Prompt

The `before_agent_start` event is the hook for prompt modification. Return
a `{ systemPrompt }` object to replace or augment what Pi compiled:

```typescript
pi.on("before_agent_start", async (event, _ctx) => {
  // event.systemPrompt is Pi's compiled prompt (may include customPrompt
  // from .soma/SYSTEM.md + context files + skills XML + date/cwd)
  const modified = event.systemPrompt + "\n\n<!-- my addition -->";
  return { systemPrompt: modified };
});
```

Pi resets the system prompt to base each turn, so the handler must return
the full prompt every time — not just the first turn.

Soma's `soma-boot.ts` owns the main path (template-driven compile via
`_mind.md` → full prompt). New extensions should generally **augment**
rather than replace, or use Soma's existing compile hooks instead of
fighting them.

### Available APIs

| API | What it does |
|-----|-------------|
| `pi.registerCommand(name, opts)` | Add a `/command` |
| `pi.registerTool(def)` | Register a tool (raw — prefer `somaRegisterTool` for Soma tools) |
| `pi.sendUserMessage(text, opts)` | Inject a message |
| `pi.appendEntry(type, data)` | Persist state in session |
| `pi.on(event, handler)` | Listen to lifecycle events |
| `pi.getActiveTools()` | Tool names enabled in this session |
| `pi.getAllTools()` | All registered tools (info only — strips `promptSnippet`) |
| `pi.getThinkingLevel()` | Current thinking level |
| `ctx.ui.notify(msg, level)` | Show notification |
| `ctx.ui.setHeader(factory)` | Custom header component |
| `ctx.ui.setFooter(factory)` | Custom footer component |
| `ctx.getContextUsage()` | Token usage stats |
| `ctx.newSession(opts)` | Create new session |

See the [Pi extension docs](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md) for the full API reference.

## Soma Tools

Soma tools are capabilities the agent can call. They're registered through
Pi's tool API but wrapped by Soma's `somaRegisterTool()` so `_tools.md`
configuration applies and the full guidance (`promptSnippet` + per-tool
`promptGuidelines`) reaches the system prompt.

**Write tools with `somaRegisterTool`** — not `pi.registerTool` — whenever
the tool should be user-configurable or should benefit from the rich
prompt rendering.

### Writing a Soma tool

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { somaRegisterTool } from "../core/tool-registry.js";

export default function myExt(pi: ExtensionAPI) {
  somaRegisterTool(pi, {
    name: "my_tool",
    label: "My Tool",
    description: "Long-form explanation the model reads.",
    promptSnippet: "my_tool: one-line tagline for the 'Available tools' header",
    promptGuidelines: [
      "When X, prefer my_tool over bash",
      "Chain my_tool → read for full context",
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

**Fields:**
- `name` — identifier the model invokes
- `description` — full explanation (used as fallback in prompt)
- `promptSnippet` — snappy tagline (primary prompt render)
- `promptGuidelines` — per-tool mechanics bullets prefixed `[tool_name]` in the prompt
- `parameters` — TypeBox schema, validated by Pi before `execute` runs
- `executionMode` — `"parallel"` for read-only (safe concurrent) or `"sequential"` for side-effects
- `execute` — `(toolCallId, params, signal, onUpdate, ctx) => Promise<AgentToolResult>`

### What `somaRegisterTool` does

1. Reads merged `_tools.md` config from the soma body chain.
2. If the tool's name is in `## Disabled` **and not hardwired** — skips Pi registration entirely.
3. Merges any `## Overrides` block onto the definition (`description`, `promptSnippet`, `promptGuidelines`, `executionMode`).
4. Stores the effective definition in Soma's prompt registry (for `buildToolSection`).
5. Forwards to `pi.registerTool()` so the tool is invocable.

See [Tools](/docs/tools) for the full `_tools.md` format and the bundled
Soma tool set.

### `pi.registerTool` vs `somaRegisterTool`

| | `pi.registerTool` | `somaRegisterTool` |
|---|---|---|
| Tool is invocable | ✓ | ✓ |
| Respects `_tools.md` disable | ✗ | ✓ |
| Applies `_tools.md` overrides | ✗ | ✓ |
| `promptSnippet` reaches system prompt | ✗ (Pi's `ToolInfo` strips it) | ✓ |
| `promptGuidelines` reach system prompt | ✗ | ✓ |
| Appears in `/soma prompt` diagnostics | degraded | full |

Use `pi.registerTool` directly only for experimental one-offs or when
integrating a third-party library that registers its own tools.

## Soma's Built-in Extensions

Soma ships with these extensions:

| Extension | Purpose |
|-----------|---------|
| `soma-boot.ts` | Identity loading, preload, /exhale, /soma commands, script discovery |
| `soma-breathe.ts` | Breath cycle — /inhale, /breathe, /rest, session rotation, preload management |
| `soma-guard.ts` | Safe file operation enforcement — intercepts writes to unread/critical files, blocks dangerous bash commands |
| `soma-header.ts` | Branded σῶμα header with memory status |
| `soma-hub.ts` | Community hub — /hub install, /hub find, /hub share, /hub fork |
| `soma-route.ts` | Capability router — inter-extension communication via capabilities and signals |
| `soma-scratch.ts` | Scratch pad — /scratch save, /scratch list, cross-session snippet storage |
| `soma-statusline.ts` | Footer with model, context %, cost, git status, auth type |
| `soma-tools.ts` | `soma:*` namespace meta-tool — user-facing capability surface |

These install to `~/.soma/agent/extensions/` and can be customized or replaced.

## Namespaces

Soma uses three top-level meta-tools to organize capabilities. Each is a single Pi tool registration with multiple addons routed through `soma-route`:

| Namespace | Audience | Distribution | Caps |
|-----------|----------|--------------|------|
| `soma:*` | Every Soma install | Ships in npm tarball | `soma:agent.*`, `soma:body.*`, `soma:browser.*`, `soma:code.*`, `soma:docs.*`, `soma:focus.*`, `soma:github.*`, `soma:new.*`, `soma:terminals.*` |
| `somaverse:*` | Somaverse-licensed | Proprietary, separate install | workspace ops, plugin builder, AI helpers |
| `dev:*` | **Agent contributors only** | Build-excluded from npm + soma-beta | `dev:hub.*` (hub introspection), `dev:audit.*` (deps + CI) |

### When to add a new cap

1. **Pick the namespace.** If end users would benefit → `soma:*`. If only people working ON the agent need it → `dev:*`. If it's part of the proprietary tier → `somaverse:*`.
2. **Pick the family.** Group by domain (`code`, `docs`, `hub`, etc.). New family = new file under the namespace's addon dir.
3. **Implement.** Mirror an existing addon (e.g. `soma-addons/docs.ts`). Each cap is an `*Impl` async function + a `route.provide` registration. The meta-tool factory auto-discovers files under `<namespace>-addons/` at session-start.
4. **No `pi.registerTool` for new top-level tools.** That cache-busts the prompt prefix (~$1-2/session). Always add as an addon under an existing meta-tool.
5. **Test with `<namespace>(op='list')` and `<namespace>(op='call', cap='<namespace>:<family>.<action>', args={...})`.**

### `dev:*` namespace (agent-contributor only)

The `dev:*` namespace is for tools that audit, lint, or inspect the agent itself — things only people working on Soma need. It's intentionally NOT shipped to end users:

- `extensions/dev-tools.ts` registers the meta-tool
- `extensions/dev-addons/*.ts` are the cap families
- `build-dist.mjs` builds them locally for dogfood
- `soma-release.sh § Step 3` strips them from the soma-beta copy
- `verify-bootstrap-clean.sh § Test 5` asserts the strip code is in place

Result: dev contributors can call `dev:hub.audit` to verify hub state; end users running `npm install meetsoma` never see the namespace.

For the full design + reasoning: `.soma/releases/plans/active/dev-meta-tool/README.md`.

### soma-route.ts

Capability router for inter-extension communication. Extensions can't import from each other — the router provides a clean API for sharing functions and broadcasting events.

**Two patterns:**

```typescript
// Capabilities — one provider, many consumers (service registry)
const route = (globalThis as any).__somaRoute;
route.provide("my:capability", myFunction, { provider: "my-ext" });
// In another extension:
const fn = route?.get("my:capability");
if (fn) await fn();

// Signals — many emitters, many listeners (pub/sub)
route.on("my:event", (data) => { /* react */ });
route.emit("my:event", { key: "value" });
```

**Built-in capabilities** (provided by soma-boot and soma-statusline):

| Capability | Provider | Description |
|-----------|----------|-------------|
| `session:new` | soma-boot | Start fresh session |
| `session:compact` | soma-boot | Trigger compaction |
| `session:reload` | soma-boot | Reload extensions |
| `keepalive:toggle` | soma-statusline | Enable/disable cache keepalive |
| `keepalive:status` | soma-statusline | Get keepalive state |
| `context:usage` | soma-boot | Get token usage |

**Commands:** `/route` shows all registered capabilities and signal listeners.

**Why it exists:** Pi's `sendUserMessage()` can't trigger slash commands (by design). The router bridges the gap — command handlers capture capabilities (like `newSession`) and share them with event handlers (like `turn_end`) that need them for features like auto-breathe rotation.

### External tool → Soma bridge (the inbox)

Soma's router includes a **drop-in inbox** for external tools (CLI
scripts, CI jobs, browser automation, file watchers) to inject signals
into a running Soma session.

**How it works:**

- On `session_start`, `soma-route.ts` generates an 8-char session token
  and writes it to `.soma/inbox/.token`. The inbox directory is
  gitignored automatically.
- External tools drop JSON files into `.soma/inbox/`:
  ```json
  {
    "signal": "ci:result",
    "token": "a1b2c3d4",
    "data": { "status": "passed", "tests": 45 },
    "ts": "2026-04-19T10:00:00Z",
    "source": "github-actions"
  }
  ```
- On every `turn_end`, `soma-route.ts` reads the inbox, verifies each
  file's token + signal allowlist, emits valid signals via the router,
  and deletes the consumed file.
- Any extension listening via `route.on(signal, handler)` receives the
  payload.

**Allowed signals** (hard allowlist — not configurable, enforced in
`soma-route.ts:INBOX_ALLOWED_SIGNALS`):

| Signal | Intended use |
|---|---|
| `studio:vote` | Design-review votes from a studio tool |
| `studio:feedback` | Design-review comments |
| `ci:result` | CI build/test outcomes |
| `deploy:status` | Deployment status updates |
| `fs:changed` | File watcher notifications |
| `browser:capture` | Browser automation screenshots |
| `scheduled:task` | Cron/scheduled job output |
| `external:notify` | Generic custom notification |

Internal signals (session management, guard, breathe) are never
injectable from outside — hard boundary.

**Commands:** `/route inbox` shows the current token, pending message
count, and allowed signals list.

**Use case:** let a VS Code extension, browser tool, or CI job poke a
running Soma without opening a socket or proxy.

### soma-guard.ts

Graduated from the `safe-file-ops` muscle — the muscle teaches the pattern, this extension enforces it.

**What it guards:**
- **Write to unread file** — confirms before overwriting files the agent hasn't read this session
- **Critical paths** — always confirms writes to identity files, settings, protocols, `.env`
- **Dangerous bash** — confirms `rm -rf`, force push, `git reset --hard`, etc.
- **Safe paths exempt** — preloads, session logs, review directories skip guards

**Commands:** `/guard-status` shows reads tracked, dirs listed, and intervention count.

## Custom Model Providers

Extensions can register custom model providers using `pi.registerProvider()`. This enables corporate proxies, self-hosted models, OAuth flows, and custom APIs.

### Override an Existing Provider

Route requests through a proxy without losing the provider's model list:

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerProvider("anthropic", {
    baseUrl: "https://proxy.corp.com/anthropic",
    headers: { "X-Corp-Auth": "CORP_TOKEN" }
  });
}
```

### Register a New Provider

Add a provider with custom models:

```typescript
export default function (pi: ExtensionAPI) {
  pi.registerProvider("my-llm", {
    baseUrl: "https://api.my-llm.com/v1",
    apiKey: "MY_LLM_API_KEY",
    api: "openai-completions",
    models: [
      {
        id: "my-model-large",
        name: "My Model Large",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 3.0, output: 15.0, cacheRead: 0.3, cacheWrite: 3.75 },
        contextWindow: 200000,
        maxTokens: 16384
      }
    ]
  });
}
```

### Supported APIs

| API | Use For |
|-----|---------|
| `openai-completions` | Most OpenAI-compatible servers |
| `openai-responses` | OpenAI Responses API |
| `anthropic-messages` | Anthropic or compatible proxies |
| `google-generative-ai` | Google Generative AI |

### Unregister

```typescript
pi.unregisterProvider("my-llm");
```

### Key Resolution

`apiKey` and `headers` values support:
- **Literal:** `"sk-..."` — used directly
- **Env var:** `"MY_API_KEY"` — reads the named variable
- **Shell command:** `"!op read 'op://vault/key'"` — executes and uses stdout

For a simpler approach without writing an extension, see [Custom Providers in models.json](/docs/models#custom-providers-ollama-lm-studio-etc).
