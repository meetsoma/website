---
title: "Extending Soma"
description: "Skills, extensions, events, APIs — build on top of Soma."
section: "Extending"
order: 5
---

# Extending Soma

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
| `before_agent_start` | Before each agent turn (can modify system prompt) |
| `session_shutdown` | Session closing |

### Available APIs

| API | What it does |
|-----|-------------|
| `pi.registerCommand(name, opts)` | Add a `/command` |
| `pi.sendUserMessage(text, opts)` | Inject a message |
| `pi.appendEntry(type, data)` | Persist state in session |
| `pi.on(event, handler)` | Listen to lifecycle events |
| `pi.getThinkingLevel()` | Current thinking level |
| `ctx.ui.notify(msg, level)` | Show notification |
| `ctx.ui.setHeader(factory)` | Custom header component |
| `ctx.ui.setFooter(factory)` | Custom footer component |
| `ctx.getContextUsage()` | Token usage stats |
| `ctx.newSession(opts)` | Create new session |

See the [Pi extension docs](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md) for the full API reference.

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

These install to `~/.soma/agent/extensions/` and can be customized or replaced.

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
