---
title: "Background delegation"
description: "Spawn Soma child agents that work in the background while you (or the parent Soma) keep going."
section: "Guide"
order: 29
---

# Background delegation

*How to spawn Soma child agents that work in the background while you (or the parent Soma) keep going.*

Soma has two ways to delegate work to a child agent:

- **Synchronous** — `delegate(task)` from inside Soma. The parent blocks, the child runs in-process, you get back a summary + MLR. Single tool call. Good for small, bounded tasks where you want the answer right now.
- **Background** — `delegate(task, background:true)` from inside Soma, or `soma children spawn <role> "<task>"` from your shell. The child launches in a detached terminal session and the parent returns immediately. Good for longer tasks, or tasks you want to watch while you keep working.

This doc is about the background path.

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

## Picking a model

`background:true` defaults to `claude-haiku-4-5` (fast + cheap). Override with the `model` param:

```
delegate(task: "...", background: true, model: "sonnet")
delegate(task: "...", background: true, model: "opus")
delegate(task: "...", background: true, model: "claude-sonnet-4-5")
```

Aliases (`sonnet`, `haiku`, `opus`) are resolved before launch, so the child uses the same provider as the parent. Pass a fully-qualified id (`claude-sonnet-4-5`, `anthropic/claude-opus-4-5`, etc.) if you want explicit control.

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
