---
title: "Meta-Workflow"
description: "The operating cadence — three nested loops, a self-amending workflow, and how to adopt it in an existing project."
section: "Workflows"
order: 10.5
---


<!-- tldr -->
The meta-workflow is the **cadence**: how an idea becomes shipped, verified, consolidated work — and how the way you work improves from its own incidents. `breath-cycle` governs one session; meta-workflow governs the arc above it (a feature, a cycle) and the loop above *that* (the workflow rewriting itself). It ships as a core protocol; you adopt it per-project by instantiating a living `META_WORKFLOW.md`. To turn it on in an existing project, just ask Soma: *"set up the meta-workflow cadence."*
<!-- /tldr -->

## The three nested loops

```
BREATH (a session)      inhale → hold → exhale            ← the breath-cycle protocol
  └─ ARC (a feature)    GROUND → … → REFLECT (7 stages)   ← this protocol
       └─ EVOLUTION     observations → ledger → amendment  ← the cadence improves itself
```

Each loop feeds the one outside it: a session's preload carries the arc's position; an arc's reflection feeds the evolution ledger. The inner loop is `breath-cycle`; meta-workflow owns the middle and outer loops.

## The body IS the project

Soma's frame: **a `.soma/` per project, and the project's body is its context.** Its services and infrastructure (a deploy target, an issue tracker, a CDN, a database) are **body parts** — lazy "organs," each a reference file loaded on demand. Shared identity and method live up at the parent/workspace scope; project specifics live local. A project can run its own `META_WORKFLOW.md` and its own cycles. This is how Soma organizes one project — and many.

## Two layers: the shape and the instance

| Layer | What it is | Where it comes from |
|---|---|---|
| **Shape** | the `meta-workflow` protocol (the generic cadence) | ships bundled; or `soma install protocol meta-workflow` |
| **Instance** | `META_WORKFLOW.md` — *this* project's ledger, register, cycles | **you create it** (the adoption step) |

Installing the protocol delivers the shape — but **the shape is inert until you instantiate it.** Adoption is the step that turns it on.

## Adoption — turning it on in an existing project

The simplest path: **ask Soma — *"set up the meta-workflow cadence."*** It reads the protocol's adoption checklist and runs the steps. The decision tree:

```
Want the cadence in a project?
├─ No .soma/ yet?            → soma init first
├─ Protocol present?        → if not: soma install protocol meta-workflow (or it's bundled)
└─ META_WORKFLOW.md exists?
     ├─ Yes → already adopted
     └─ No  → ADOPT:
          1. Scaffold META_WORKFLOW.md (from the protocol's starter skeleton)
          2. Wire a one-line breadcrumb in body.md pointing at it
          3. (optional) Lean the preload (_memory.md) to point at breath-cycle's checklist
          4. (optional) Add body parts (body/<service>.md) as index-to-source
```

The canonical, always-current steps + the starter skeleton live in the protocol itself — see `amps/protocols/meta-workflow.md` §"Instantiate it in your project". This doc is the overview; the protocol is the source of truth.

### Why the breadcrumb matters (the two-layer rule)

A procedure only *fires* if an **eager** surface points at it. `breath-cycle` already carries the rotation triggers eagerly, so half the binding ships in core. The per-project piece is one line in an eager body file (e.g. `body.md`) pointing at `META_WORKFLOW.md` — that's what makes Soma open and run the cadence at the right moments (boot, rotation, stage transition, before scoping new work). A cadence doc no one opens is inert.

### Where the instance lives (and why not in `amps/`)

Put `META_WORKFLOW.md` at the **`.soma/` root** (default) or in **`cycles/`** — **not** in `amps/protocols/` or `amps/muscles/`. Those AMPS directories are *compiled into the system prompt* at boot (warm protocols/muscles inject a breadcrumb every session). The instance is a living, multi-KB doc you read **on demand** via the breadcrumb — not a rule to inject every boot. Keeping it outside `amps/` is what keeps your prompt lean.

## The self-amending part

The cadence is **living** — it describes what you actually do that works, and amends itself from observations:

- **Observation Ledger** (append-only) — at REFLECT, log 1–3 honest notes (`worked` / `didn't` / `gap` / `infra`).
- **Amendment rule** — when an observation recurs (≥2×) or is high-impact, it amends the cadence (a new stage-rule, tool, or habit) and **cites the observation that drove it.** Process-by-evidence, not by vibe.

This is the *process* sibling of the [pattern-evolution](/docs/protocols) maturation (skill → muscle → protocol → automation): a recurring observation resolves into either a muscle (knowledge) or a cadence amendment (process).

## When to use it

Any project with work that spans more than one session — a feature, a cycle, an arc. **When not to:** one-off tasks that begin and end in a single session with nothing to carry forward — the breath cycle alone suffices. Don't manufacture cycles for work that isn't one.

## Related

- [Protocols](/docs/protocols) — how behavioral rules load and govern behavior
- [How It Works](/docs/how-it-works) — the breath cycle, identity, the compiled prompt
- [MAPs](/docs/maps) — workflow templates for specific tasks (the cadence is the layer above)
- [Memory Layout](/docs/memory-layout) — preloads, sessions, where continuity lives
- [Hub](/docs/hub) — installing the protocol from the community hub
