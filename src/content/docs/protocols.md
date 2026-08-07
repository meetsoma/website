---
title: "Protocols"
description: "Behavioral rules, heat system, domain scoping, writing your own."
section: "Core Concepts"
order: 3
---

# Protocols

<!-- tldr -->
Behavioral rules in `.soma/amps/protocols/` as markdown with YAML frontmatter. Loaded by heat: hot (≥8) = full body, warm (≥3) = TL;DR/description only, cold = name only. Heat rises on use (+1 auto-detect), decays per session if unused. Domain scoping via `applies-to` field. Write your own: add `name`, `heat-default`, `description`, `applies-to` frontmatter. Configure thresholds in `settings.json`.
<!-- /tldr -->

Protocols are behavioral rules that guide Soma's actions. They live in `.soma/amps/protocols/` as markdown files with YAML frontmatter.

## Built-in Protocols

Soma ships with 16 protocols, scaffolded on `soma init`:

| Protocol | Default Heat | What It Does |
|----------|-------------|-------------|
| `breath-cycle` | hot | Sessions have phases: inhale, hold, exhale. Never skip exhale. |
| `correction-capture` | warm | When corrected: acknowledge, don't justify. Second time → muscle. |
| `detection-triggers` | warm | When to capture patterns, preferences, and knowledge gaps. |
| `frontmatter-standard` | warm | All `.md` files get YAML frontmatter with type, status, dates. |
| `git-identity` | warm | Commits use the correct name/email for the repo context. |
| `heat-tracking` | hot | Protocols and muscles have temperature that rises on use and decays. |
| `maps` | warm | Check for MAPs before tasks. Build MAPs after repeated processes. |
| `pattern-evolution` | warm | Skills → Muscles → Protocols → Automations. Born from friction. |
| `plan-hygiene` | warm | Plans rot. Track status, remaining, budget ≤12 active. |
| `pre-flight` | warm | Check what exists before building. Prevent duplication. |
| `quality-standards` | warm | Clean commits, close the loop, tests match shipped code. |
| `response-style` | warm | Voice, length, emoji, format preferences. |
| `session-checkpoints` | warm | Session logs capture what happened AND what was noticed. |
| `task-tracking` | warm | One board. Move cards in real time. Verify on exhale. |
| `tool-discipline` | warm | Scripts first, then raw commands. Build tools for yourself. |
| `working-style` | warm | Read before write. Verify before claiming. |

## Heat

Every protocol has a temperature. Hot (8+) loads the full body. Warm (3-7) loads the `## TL;DR` (or the `description` breadcrumb if there's no TL;DR section). Cold (0-2) shows the name but nothing else.

Heat rises when a protocol gets used (auto-detected from tool results) and decays by 1 each session if unused. `/pin` locks something hot. `/kill` drops it to zero.

Protocol heat is stored in `.soma/state.json`. For the full deep-dive on how heat works across all AMPS layers, see the Heat System doc.

## Writing Your Own Protocol

### 1. Create the file

```bash
cp .soma/amps/protocols/_template.md .soma/amps/protocols/my-protocol.md
```

### 2. Edit the frontmatter

```yaml
---
type: protocol
name: my-protocol
status: active
updated: 2026-03-09
heat-default: warm
applies-to: [typescript]
description: "One sentence that captures what this protocol enforces — the warm-tier fallback if there's no ## TL;DR section."
---
```

**Required frontmatter fields:**

| Field | Purpose |
|-------|---------|
| `name` | Protocol identifier (used in heat state, `/pin`, `/kill`) |
| `heat-default` | Starting temperature: `cold`, `warm`, or `hot` |
| `description` | One sentence; the warm-tier fallback breadcrumb when the protocol has no `## TL;DR` |

**Optional fields:**

| Field | Default | Purpose |
|-------|---------|---------|
| `applies-to` | `[always]` | Domain signals this protocol applies to |
| `scope` | `local` | `local` = project only, `shared` = eligible for parent chain, `core` = built-in behavior documentation (never loads into prompt) |
| `tier` | `community` | `community` or `official` |
| `gates` | none | Enforcement hooks — see below |

### 2b. Gates — make a protocol enforce itself

> ⚠ **Not yet in a tagged release.** On `dev` now, listed under CHANGELOG `[Unreleased]`. The
> frontmatter shape below is settled and covered by tests — build on it.

A protocol can carry its own enforcement. Instead of a rule that loads into the prompt on every
turn, the rule sits dormant and **fires at the moment it is broken**:

```yaml
gates:
  - paths: ["src/migrations/"]          # before a write/edit under these paths
    mode: remind
    rule: "Migrations are append-only — never edit an applied one. Add a new migration instead."
    read-first: MIGRATIONS.md            # optional: offered, never required

  - command: "npm publish"               # before a matching bash command
    mode: block
    rule: "Run `npm run verify` first — publish is irreversible."

  - after: "git commit"                  # AFTER the command succeeds
    mode: remind
    rule: "Update CHANGELOG [Unreleased] before the next task."
```

**Triggers**

| key | fires | use for |
|---|---|---|
| `paths` | before `write`/`edit` on a matching path | "you're about to change X — know Y first" |
| `paths` + `tool: write` | only when a file is **created** or wholesale-replaced | "you're adding an Nth thing here — check what exists first" |
| `paths` + `tool: edit` | only when an **existing** file is modified | "you're changing something that already shipped" |
| `command` | before a matching `bash` command | "don't run this — run that instead" |
| `after` | after a matching `bash` command **succeeds** | the action was right but created an obligation |

`command` and `after` are **regular expressions**. `paths` is a substring match.

**Modes**

| mode | behaviour |
|---|---|
| `remind` (default) | Blocks **once**, shows `rule`, and the identical retry goes through. Repeats on a later independent break; at 5 it suggests writing a muscle. |
| `block` | Stays blocked until `read-first` has been read this session. For the rare thing that must not proceed unread. |
| `warn` | UI notice only. ⚠ The model does **not** see notifications — `warn` reminds a human, not the agent. |

**A gate can point at a muscle**

`read-first:` resolves muscles as readily as docs, which makes the two layers compose: the protocol
supplies the **trigger**, the muscle supplies the **knowledge**. A muscle behind a gate costs zero
prompt tokens *and* arrives exactly when it applies — no heat needed.

```yaml
gates:
  - paths: ["roadmap.json"]
    mode: block
    read-first: roadmap-tone-check.md     # a muscle
    rule: "The roadmap is not the CHANGELOG — read the muscle before writing an entry."
```

**The division of labour, in one line:** a muscle makes an action *better*; a protocol decides
whether the action *happens*. Full comparison table: [Muscles → Muscle or protocol?](muscles.md).

**When a rule earns a gate**

Most rules shouldn't be gated — they should just be written down. A rule earns a gate when it keeps
getting broken **precisely because nothing catches it at the moment it's broken.**

That gives a clean promotion path for anything you've written down as a habit or a note:

| keep as prose | promote to a gate |
|---|---|
| *when* to reach for something at all | the rule that must fire **at the violation** |
| judgement, tradeoffs, worked reasoning | a mechanical trigger: `paths` / `command` / `after` |
| the full procedure | the one-line correction needed *right then* |

The note keeps the reasoning; the protocol takes the enforcement. Don't move the whole thing — a
gate whose `rule` is a paragraph is a document with extra steps.

**Rules of thumb**

- Write `rule` as a correction — *"don't do X, do Y"* — not as a pointer to a document.
- A gate needs a **mechanical** trigger. If the rule requires noticing that you're in a situation,
  it cannot be gated and belongs in your always-loaded body files. *"Plausibly detectable" is not
  detectable* — if you can't write the expression, leaving it as prose is the correct outcome.
- **Anchor `command` patterns to the invocation, not the word.** `\b(timeout)\b` matches
  `grep 'timeout' notes.md` and `curl --timeout 5` as readily as `timeout 5 cmd`. Anchor to command
  position: `(^|[;|&(]\s*)\s*timeout\s`.
- **Test both directions before trusting a gate.** List what must fire *and* what must not, and
  check both. A gate that never false-fires on your own workflow is the only kind you'll keep.
- **Re-verify on a fresh session.** Protocol gates are read once at startup, so the session that
  adds a gate cannot see it. Start a new session to confirm it behaves.
- **Re-read the `rule` text when the code it describes changes.** A gate outlives the thing it was
  written about, and nobody re-reads a rule they already agree with. A gate enforcing a claim that
  stopped being true is worse than no gate — it's confidently wrong at exactly the moment someone
  is trying to work.
- Nothing deadlocks: an unresolvable `read-first` degrades to allow, a gate never blocks edits to
  its own protocol file, and malformed frontmatter is skipped rather than fatal.
- Reading via `cat`/`head` satisfies a `read-first` — the `read` tool is not required.
- **Don't gate paths that only exist in your project** if the protocol is shared or shipped.

Projects that prefer configuration over authoring can declare the same thing in
`settings.json` under `guard.pathGates`; explicit settings win over protocol-declared gates.

### 3. Write the body

```markdown
# My Protocol

## TL;DR
- Dense bullet points
- What the agent MUST do
- 3-7 bullets max

## Rule

The detailed behavioral rules go here. This is loaded when the protocol is hot.

## When to Apply

Contexts where this activates.

## When NOT to Apply

Explicit exclusions.
```

### 4. The three loading tiers

| Tier | What the Agent Sees | When |
|------|-------------------|------|
| **TL;DR** | `## TL;DR` section (or the `description` breadcrumb if absent) | Protocol is warm |
| **Full body** | Entire file (minus frontmatter) | Protocol is hot |

Write a `## TL;DR` — it's what loads at warm. Keep the `description` self-contained too, as the fallback when a protocol has no TL;DR.

## Protocol Resolution Chain

Protocols resolve from project → parent → global, with project protocols shadowing same-named parent/global ones:

```
CWD/.soma/amps/protocols/       ← project (highest priority)
  ↓
../.soma/amps/protocols/         ← parent (if exists)
  ↓
~/.soma/amps/protocols/          ← global (lowest priority)
```

If both project and global define `git-identity.md`, the project version wins.

## Files to Know

| File | Purpose |
|------|---------|
| `.soma/amps/protocols/*.md` | Protocol definitions |
| `.soma/amps/protocols/_template.md` | Template for new protocols |
| `.soma/state.json` | Heat state (auto-managed, don't edit) |
| `.soma/settings.json` | Override heat thresholds |
