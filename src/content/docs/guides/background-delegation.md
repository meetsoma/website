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
- **Headless** — `delegate(task, headless:true)`. The child runs as a `soma -p` subprocess (print mode): no interactive terminal, completion signalled by **exit code**, with auto-retry + model fallback; output returns inline. Chain sequential steps with `chain:[{role,task},...]`. **This is the reliable, unattended path** — use it for productive/batch work you don't need to watch (running a cycle queue, mechanical edits). Because it's print mode, a broken project extension is isolated, not fatal — **but that isolation is total: `--no-extensions` also unloads `soma-guard`, so protocol-declared gates (RELEASE-FLOW reminders, the `repos/agent` vs `~/.soma/agent` warning, any `paths:`/`command:` gate) never fire on this path.** A headless child editing a gated path gets no reminder at all. Use `background:true` for anything that touches a gated path.
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

You watch progress via `soma:agent.list` / `soma:agent.tail({id})` from inside Soma, or `soma children list` / `soma children tail <id>` from the shell.

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
Status: running. Task sent. Use soma:agent.list to monitor.
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

<!-- The footguns this role has hit, the traps that are locked in. Every section of a
     role file is injected into every spawn EXCEPT `## MLRX notes`. -->

## Success Criteria

The checklist the role verifies before reporting back.
```

**The one rule that makes roles compound:** the sub-compiler injects **every** section
of a role file into **every** spawn — the only exception is `## MLRX notes`, which is
held back. So when a child hits a footgun, refine the role afterward and the next
spawn starts already knowing it. Improve the role; pass only the **task** to
`delegate()`. Don't re-paste standing context per job.

⚠ **Everything you add to a role file is re-read on every future spawn, forever.**
Prefer sharpening a rule that is already there to appending a new one; put the run
log in `## MLRX notes`, where it costs nothing, and keep out of the role anything
that does not change what the *next* child does.

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

The `soma:agent.*` capability family is the surface:

```
soma:agent.list                                  // every child — deliverable size leads the row
soma:agent.tail({id: 'child-7f3a91'})            // live pane output
soma:agent.checkin({id: 'child-7f3a91'})         // PROGRESS, not liveness — is the deliverable growing?
soma:agent.transcript({id: 'child-7f3a91'})      // what the child actually said, reconstructed
soma:agent.activity({session: 's01-xxxxxx'})     // what a sibling session DID (tool-call census)
soma:agent.pane({id: 'child-7f3a91'})            // open/close a viewer split on its session
```

**The deliverable is the liveness signal, not cost.** Spawn with
`soma:agent.delegate({deliverable: '<path>'})` and every poll measures that file: growing means
working, flat-plus-climbing-cost means idle or stuck. `list` also prints the live pane count
beside its table and says so explicitly when the two disagree — a stale record can't answer
"is anything running?" unnoticed.

## Steer

`soma:agent.steer({id, message})` writes to the child's pane. Two things it does NOT promise:
delivery is confirmed at the *driver*, not the child — and **nothing interrupts a turn**; every
send queues to the child's next turn boundary. Verify consumption (its ¶ counter moving past
your message), never transmission. For a planned multi-phase sequence, put the phases in the
brief up front instead of dripping steers.

On a child spawned with `transport:'rpc'` (below), a steer is different: it comes back
**acknowledged** — `✓ ACKED — response frame steer success=true in 41ms` — and lands after the
child's current tool calls, before its next model call. Semicolons, newlines and unusual
unicode arrive exactly as typed.

## Kill vs harvest vs grade

- **Harvest** (`soma:agent.harvest`) hands you the result and the child's own reflection. It
  keys on the **deliverable**, so a finished-but-idle child — whose pane still reads `running`
  because it's sitting at its prompt — harvests fine. Harvesting is free and repeatable.
- **Grade** (`soma:agent.grade({id, grade: 'pass'|'fail'|'partial', note})`) records that you
  actually checked the artifact — so "is anything I delegated still unchecked?" is a question
  the tool can answer. `kill` warns if you end a child whose work you never graded.
- **Kill** closes the pane and marks the entry `aborted`. **An idle child still bills** — there
  is no keepalive on children, so a finished child sitting at its prompt costs money for
  nothing. Decide at spawn: one task → kill at delivery; more tasks queued → reuse the warm
  context, then kill.

Typical lifecycle: spawn → work your own next lane → poll the deliverable → harvest → grade → kill.

## What harvest returns (MLR)

Children write their own reflection. Background and tmux children are asked for a structured
reflection block as part of finishing, write invocation records to their role's
`invocations.jsonl`, and `harvest` returns the reflection alongside the registry summary
(id, role, model, runtime, cost). A child killed before finishing usually has no reflection —
the deliverable and `tail` output are what's left, which is one more reason to harvest before
you kill.

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

### RPC delivery (opt-in)

```
delegate(task: "...", transport: "rpc")
```

Instead of a terminal pane, the child runs as a subprocess speaking pi's RPC protocol. What you
gain: the task and every steer are **acknowledged** by a typed response (`delivery ACKED`), so
"did it get the brief?" stops being a guess; and the message is delivered verbatim — no
keystroke mangling. What you give up: there is no pane to attach to. Watch it with
`soma:agent.tail` / `soma:agent.transcript`, which read the child's event log
(`~/.soma/state/rpc/<child>.jsonl`), and know that the child **ends with the session that
spawned it** — only that session can steer it. Fits scouts and builders that run to completion
while you work; for a child you want to sit with, keep the default pane.

RPC children run raw pi with your models and keys and no Soma extensions, so the role file is
prepended to the task the same way the pane route does it. `claude-cli/*` models are not
available on this route.

### Discoverability helpers

- `soma terminals list` — which drivers are available on this machine
- `soma terminals detect [--json]` — which terminal app you are in (it sees through tmux), then the list + a recommendation. Detection wrong? Set `terminal.app` in `settings.json` ([configuration](../configuration.md#terminal))
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
