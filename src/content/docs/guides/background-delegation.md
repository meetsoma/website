---
title: "Background delegation"
description: "Spawn Soma child agents that work in the background while you (or the parent Soma) keep going."
section: "Guide"
order: 29
---

# Background delegation

*How to spawn Soma child agents that work in the background while you (or the parent Soma) keep going.*

Soma has **three** ways to delegate work to a child agent:

- **Synchronous** — `delegate(task)` from inside Soma. The parent blocks, the child runs in-process, you get back a summary + MLR. Single tool call. Good for small, bounded tasks where you want the answer right now.
- **Headless** — `delegate(task, headless:true)`. The child runs as a `soma -p` subprocess (print mode): no interactive terminal, completion signalled by **exit code**, with auto-retry + model fallback; output returns inline. Chain sequential steps with `chain:[{role,task},...]`. **This is the reliable, unattended path** — use it for productive/batch work you don't need to watch (running a cycle queue, mechanical edits). Because it's print mode, a broken project extension is isolated, not fatal.
- **Background** — `delegate(task, background:true)`, or `soma children spawn <role> "<task>"` from your shell. The child launches in a *detached interactive terminal* (tmux/cmux) and the parent returns immediately. Use it when you want to **watch the child live** or steer it mid-run.

> **Which one?** Answer now → synchronous. Done reliably without watching → **headless**. Watch/steer live → background. (Reaching for `background` for unattended batch work is a common miss — it spawns an *interactive* session, so an unattended task can land on the shell. `headless` is the right tool there.)

This doc covers the **background** path; `headless` is also documented in the `soma:agent.delegate` cap help under `## modes`.

## TL;DR

```
# From inside Soma (as a tool call)
delegate(task: "audit all plans for stale version refs", background: true)

# From your shell
soma children spawn librarian "audit all plans for stale version refs"
```

Both paths:

1. Pick a terminal driver (tmux if available, cmux if running).
2. Spawn a detached session with `soma --model <model>` running in it.
3. Send your task as the first chat message.
4. Register the child in `~/.soma/state/children.json`.
5. Return immediately. The child runs until it completes or you kill it.

You watch progress via `children(op:'list')` / `children(op:'tail', id:...)` from inside Soma, or `soma children list` / `soma children tail <id>` from the shell.

## Requirements

The shipping baseline is **tmux**. If you're on macOS:

```bash
brew install tmux
```

On Linux, use your distro's package manager (`apt install tmux`, `dnf install tmux`, etc.). Tmux is also preinstalled on most CI runners.

Soma also supports a **cmux** driver that's dev-only — it lives under `repos/agent/scripts/_dev/` and does not ship to npm users. If you're working on Soma itself and you already run cmux, you get that driver "for free."

If no driver is available, `delegate(background:true)` and `soma children spawn` both return an error that tells you what to install.

## The mental model

A background child is a full Soma session in a detached terminal. The terminal driver (tmux/cmux) is the container; Soma inside it runs the same way it runs for you. You're not talking to a special "worker" — you're talking to a regular Soma.

Detached means no window pops up. If you want to watch the child live, the spawn output tells you how:

```
[delegate:background] spawned child-7f3a91 via tmux
role: general | model: auto | handle: soma-child-7f3a91
Status: running. Task sent. Use children(op:"list") to monitor.
To watch live: tmux attach -t soma-child-7f3a91
```

Running `tmux attach -t soma-child-7f3a91` in any terminal attaches you to the child's TUI. You can watch it work, type in it, or just `Ctrl-b d` to detach and leave it running.

## Authoring roles (the children pattern)

A role is a **durable specialist**, not a one-off prompt. You author it once, in
`body/children/<role>.md`, and it gets smarter every time you use it. This is the
difference between delegating *well* and pasting a fresh wall of instructions into
every `task`.

A role file is plain Markdown with frontmatter:

```markdown
---
summary: One line — shows in the role list (delegate help).
default-model: mistral/mistral-large-2512   # Free-tier best quality. mistral/ministral-8b-2512 for speed.
                              # cohere/command-a-03-2025 for cheap alt (requires cohere-models.ts extension).
                              # Set delegate.defaultModel in settings.json for a global default.
max-tool-calls: 40
max-cost-usd: 0.60
inherits: []                       # protocols this role loads
success: What "done" looks like for this role.
---

# <Role name>

Who this specialist is, **where the relevant code/files live**, and the workflow
they follow (e.g. REVIEW → PROPOSE → IMPLEMENT → VERIFY — named phases beat a vague
"do the thing").

## Accumulated Knowledge

<!-- The footguns this role has hit, the traps that are locked in. The
     sub-compiler injects THIS section into every spawn of the role. -->

## Success Criteria

The checklist the role verifies before reporting back.
```

**The one rule that makes roles compound:** the sub-compiler injects each role's
`## Accumulated Knowledge` into *every* spawn. So when a child hits a footgun,
write it into that section afterward — the next spawn starts already knowing it.
Improve the role; pass only the **task** to `delegate()`. Don't re-paste standing
context per job.

Lean generic roles (`auditor`, `builder`, `verifier`, …) ship by default. Evolve
them into named domain personas with explicit phase workflows as the work demands
it. Scaffold a new one from `body/children/_child-template.md`. Run
`delegate(help: true)` to see the roles this install has and a quick recap of
this pattern.

## Picking a model

`background:true` defaults to the following precedence:
1. Explicit `model` arg
2. Role frontmatter `default-model`
3. `settings.json → delegate.defaultModel`
4. Built-in: `mistral/ministral-8b-2512` (free)

Override with the `model` param:

```
delegate(task: "...", background: true, model: "mistral/mistral-large-2512")
delegate(task: "...", background: true, model: "mistral/ministral-8b-2512")
delegate(task: "...", background: true, model: "cohere/command-a-03-2025")
```

**Premium models** (Claude, GPT-4o) require an active subscription or extra-usage billing.
When available, aliases work: `sonnet`, `haiku`, `opus`.
The `claude-cli/*` backend runs via the official `claude -p` CLI and draws from
your Claude plan (not extra usage). See `body/models.md`.

Aliases (`sonnet`, `haiku`, `opus`) are resolved before launch, so the child uses the same provider as the parent. Pass a fully-qualified id (`claude-sonnet-4-6`, `anthropic/claude-opus-4-7`, etc.) if you want explicit control.

## Monitoring

From inside Soma:

```
children(op: "list")                         // table of all children
children(op: "tail", id: "child-7f3a91")     // last 50 lines of the child's pane
children(op: "tail", id: "child-7f3a91", lines: 100)
children(op: "steer", id: "child-7f3a91", message: "skip that last step")
children(op: "kill", id: "child-7f3a91")     // SIGTERM + close container
children(op: "harvest", id: "child-7f3a91")  // read MLR + remove from registry
```

From your shell:

```
soma children list
soma children tail child-7f3a91 50
soma children watch            # flicker-free live dashboard, refresh every 2s
soma children kill child-7f3a91
```

Every `children list` call reconciles the registry with live driver state: if a child's container is gone but the registry says `running`, it flips to `completed`. So the table always reflects reality, not just the last write.

## Steer

`children(op:'steer', id, message)` sends your message as a chat message to the child. Works while the child is `running` or `spawning`; blocked when `completed`, `aborted`, or `error`. Typical uses:

- Nudge the child when it's looping: `children(op:'steer', id:'child-...', message: "move on to the next file")`
- Add context it didn't have: `children(op:'steer', id:'child-...', message: "also check files under lib/")`
- Gracefully exit: `children(op:'steer', id:'child-...', message: "/exit")`

## Kill vs harvest

- **Kill** closes the driver container (tmux session / cmux pane), marks the registry entry `aborted`, and sets `ended_at`. The entry stays in `children.json` so you can still inspect it.
- **Harvest** is the "clean end" path: it reads the child's MLR (Memory Lane Reflection), returns it in the summary, and removes the entry from the registry. It only works on children whose status is `completed`, `aborted`, or `error`.

So the typical life cycle is: spawn → run → child finishes on its own → harvest. If the child gets stuck, kill first, then harvest.

## The MLR gap (today)

Children don't write their own MLR yet — that lands in Phase E when child Soma sessions get `--child-id` / `--brief` / `--parent-pid` CLI flags. Today, `harvest` returns the registry-level summary (id, role, model, runtime, cost, task) plus a placeholder where the MLR would go. You can still `tail` the child to see what it did.

This is tracked in `.soma/releases/v0.20.x/plans/children-control-panel.md §Phase E`.

## Configuration

There's no config required for the default path — install tmux, run `delegate(background:true)`, done. Auto-pick prefers tmux over cmux.

If you want to override:

**Per-call** (highest precedence):

```
delegate(task: "...", background: true, terminal: "cmux")
```

**Persistent** (via `~/.soma/settings.json`):

```bash
soma terminals prefer tmux    # or: cmux
```

Writes `{"delegate": {"terminal": "tmux"}}` to settings.json. Subsequent spawns read this before falling back to auto-pick. Check current state:

```bash
soma terminals status
```

### Discoverability helpers

- `soma terminals list` — which drivers are available on this machine
- `soma terminals detect` — same as list + a recommendation
- `soma terminals setup [tmux|cmux]` — walkthrough to install + configure
- `soma terminals doctor [<driver>]` — diagnose why a driver isn't working

The agent itself can run these too: when `delegate(background:true)` fails with "no driver available," the agent can read `soma terminals setup`'s output and walk the user through the install.

## Troubleshooting

- **"background:true needs a terminal driver. None are available."** — install tmux (see Requirements above).
- **Child died with "No API key found for amazon-bedrock"** — you passed `model: "haiku"` and Pi's model registry resolved it to a bedrock id in the child's environment. Fixed as of v0.21.1 — bare aliases are now pre-resolved to Anthropic-direct ids. If you still see this, pass `model: "claude-haiku-4-5"` explicitly.
- **`children(op:'list')` shows status:"running" for a child whose window I closed** — `list` reconciles automatically; if the next `list` call still shows `running`, the driver's `alive()` check may be returning stale data. Kill it explicitly with `children(op:'kill')`.
- **I want to add a new terminal driver (ghostty, iTerm, Terminal.app, etc.)** — implement the `TerminalDriver` interface in `core/terminal-drivers/`, register it in `index.ts`'s preference array. See `core/terminal-drivers/tmux.ts` for a ~100-line reference implementation.

## See also

- `docs/commands.md §Script Commands` — shell CLI commands (`soma children ...`)
- `.soma/releases/v0.20.x/plans/children-control-panel.md` — full design doc for the delegation system, phase breakdown, and open work
- `core/terminal-drivers/types.ts` — the `TerminalDriver` interface
- `extensions/soma-delegate.ts` — the Pi-tool registration + driver dispatch
