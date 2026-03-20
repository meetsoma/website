---
title: "Extending Soma"
description: "Skills, extensions, events, APIs — build on top of Soma."
section: "Extending"
order: 5
---


<!-- tldr -->
Extend Soma with skills, extensions, and custom tools. Skills: markdown instructions in `.soma/skills/`. Extensions: TypeScript hooks into agent lifecycle (session_start, tool_result, turn_end, etc.). Built-in extensions handle identity loading, session management, context safety, and the branded σῶμα interface.
<!-- /tldr -->

Soma is extensible at every layer. You can add skills, write TypeScript extensions, and build custom tools — all without modifying the core runtime.

## Skills

Skills are specialized instructions that load when a task matches their description. They're **framework-agnostic** — a skill from Claude Code, Cursor, or any agent system works in Soma without modification.

What makes Soma different: **muscles and protocols refine skills over time**. A logo design skill teaches the technique. A muscle learns your specific preferences. A protocol enforces your brand standards. The skill provides raw expertise; Soma's behavioral layers personalize and improve it through repeated use — without you ever asking.

### Installing Skills

Install from the hub or place manually:

```bash
/install skill my-skill        # from Soma Hub
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

### Writing an Extension

```typescript
export default function myExtension(soma: any) {
  // Register a command
  soma.registerCommand("hello", {
    description: "Say hello",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Hello from my extension!", "info");
    },
  });

  // Hook into session lifecycle
  soma.on("session_start", async (_event, ctx) => {
    // Do something on session start
  });

  soma.on("turn_end", async (_event, ctx) => {
    // Do something after each agent turn
  });
}
```

Extensions are TypeScript files that export a default function. Soma passes the runtime API as the first argument — use it to register commands, listen to events, and interact with the session.

### Available Events

| Event | When |
|-------|------|
| `session_start` | Session loads |
| `session_switch` | User starts a new session or resumes |
| `turn_start` | Agent begins processing |
| `turn_end` | Agent finishes processing |
| `message_end` | Message fully rendered |
| `tool_result` | Tool call completes |
| `before_agent_start` | Before each agent turn (can modify system prompt) |
| `session_shutdown` | Session closing |

### Available APIs

| API | What it does |
|-----|-------------|
| `soma.registerCommand(name, opts)` | Add a `/command` |
| `soma.sendUserMessage(text, opts)` | Inject a message |
| `soma.appendEntry(type, data)` | Persist state in session |
| `soma.on(event, handler)` | Listen to lifecycle events |
| `soma.getThinkingLevel()` | Current thinking level |
| `ctx.ui.notify(msg, level)` | Show notification |
| `ctx.ui.setHeader(factory)` | Custom header component |
| `ctx.ui.setFooter(factory)` | Custom footer component |
| `ctx.getContextUsage()` | Token usage stats |
| `ctx.newSession(opts)` | Create new session |

## Soma's Built-in Extensions

Soma ships with these extensions:

| Extension | Purpose |
|-----------|---------|
| `soma-boot` | Identity loading, preload, session commands (/exhale, /breathe, /soma) |
| `soma-header` | Branded σῶμα header with memory status indicators |
| `soma-statusline` | Footer with model, context %, cost, git status |
| `soma-guard` | Safe file operation enforcement — intercepts writes to unread/critical files |
| `soma-breathe` | Auto-breathe context management and session rotation |
| `soma-route` | Inter-extension capability router |
| `soma-scratch` | Quick notes that persist across sessions |

Core extensions are compiled and ship with the runtime. Your custom extensions in `.soma/extensions/` load alongside them.

### soma-route.ts

Capability router for inter-extension communication. Extensions can't import from each other — the router provides a clean API for sharing functions and broadcasting events.

**Two patterns:**

```typescript
// Capabilities — one provider, many consumers (service registry)
const route = soma.getRoute();
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
| `session:breathe` | soma-boot | Trigger breath cycle |
| `session:reload` | soma-boot | Reload extensions |
| `keepalive:toggle` | soma-statusline | Enable/disable cache keepalive |
| `keepalive:status` | soma-statusline | Get keepalive state |
| `context:usage` | soma-boot | Get token usage |

**Commands:** `/route` shows all registered capabilities and signal listeners.

**Why it exists:** `sendUserMessage()` can't trigger slash commands (by design). The router bridges the gap — command handlers capture capabilities (like `newSession`) and share them with event handlers (like `turn_end`) that need them for features like auto-breathe rotation.

### soma-guard.ts

Graduated from the `safe-file-ops` muscle — the muscle teaches the pattern, this extension enforces it.

**What it guards:**
- **Write to unread file** — confirms before overwriting files the agent hasn't read this session
- **Critical paths** — always confirms writes to identity files, settings, protocols, `.env`
- **Dangerous bash** — confirms `rm -rf`, force push, `git reset --hard`, etc.
- **Safe paths exempt** — preloads, session logs, review directories skip guards

**Commands:** `/guard-status` shows reads tracked, dirs listed, and intervention count.
