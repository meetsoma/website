---
name: pattern-evolution
type: protocol
status: active
description: "Maturation: Skills → Muscles → Protocols → Automations. Born from gaps and repeated friction. Not every pattern climbs the full ladder."
heat-default: cold
tags: [learning, patterns, growth]
applies-to: [always]
scope: bundled
tier: core
created: 2026-03-09
updated: 2026-08-10
version: 1.4.0
author: Curtis Mercier
license: CC BY 4.0
spec-ref: curtismercier/protocols/amp (v0.2, §3.2)
---

# Pattern Evolution Protocol

## TL;DR
Maturation: Skills → Muscles → Protocols → Automations. Born from gaps and repeated friction. Not every pattern climbs the full ladder.

## The Maturation Layers

```
observation (noticed gap, repeated action)
  ↓ write it down as reusable knowledge
skill (plug-and-play expertise — works across frameworks)
  ↓ applied repeatedly, patterns emerge
muscle (learned pattern — refines through use, tracked by heat)
  ↓ becomes mandatory, skipping causes failures
protocol (behavioral rule — universal, ships to all users)
  ↓ becomes executable, runs without thinking
automation (executable workflow — hooks, rituals, enforcement)
```

| Layer | When | Nature |
|-------|------|--------|
| **Skill** | Domain knowledge — teaches, doesn't enforce. Works across any agent. | On-demand. |
| **Muscle** | Repeated pattern — refines through use, builds heat. | Learned. |
| **Protocol** | Pattern becomes a behavioral *rule*. Skipping it causes mistakes. | Mandatory. |
| **Automation** | Protocol becomes executable — enforces without thinking. | Automatic. |

Automations are the final crystallization. The protocol explains *why*; the automation enforces *how*. An agent with the automation but without the protocol can't reason about edge cases.

## Promotion is by ENFORCEABILITY, and it moves a PART — not the whole thing

**A muscle cannot enforce itself.** It is a reflex: it fires if you happen to recall it, and a
reflex you did not recall is indistinguishable from a reflex you do not have. So the trigger for
muscle → protocol is not "it feels important now." It is:

> 🔑 **Does this muscle contain a gotcha that keeps costing you *precisely because* nothing can
> catch it at the moment it's violated?** That part — and only that part — belongs in a protocol,
> as a **`gates:` entry**.

**What moves, what stays:**

| stays in the muscle | moves to the protocol |
|---|---|
| the reflex — *when* to reach for this at all | the rule that must **fire at the violation** |
| judgement, tradeoffs, worked reasoning | a mechanical trigger: `paths:` / `command:` / `after:` |
| the pointer to the full procedure | the one-line correction the violator needs *right then* |

The muscle shrinks to a **trigger**; the protocol gains a **gate**. Neither duplicates the other,
and the procedure keeps one home (usually a skill). *That split is the crystallization — the muscle
becomes muscle memory precisely by giving up the part it could never enforce.*

### Why this rung only recently became real

The table above calls Protocol "Mandatory" and puts enforcement at **Automation**. Until protocols
could declare `gates:`, that was accurate but hollow: a protocol was the *same injected text* as a
muscle wearing a stronger word, and **text cannot stop you.** Anything genuinely enforceable had to
become a full automation — an expensive jump most patterns never justified.

`gates:` moved enforcement **down one rung**. A protocol can now fire at the violation without
becoming an automation, which makes muscle → protocol a real promotion instead of a relabelling.
→ `releases/cycles/protocol-gates/cycle.md`

### The gate on the gate — promotion is not free

Do **not** promote a gotcha that has no mechanical trigger. "Plausibly detectable" is not detectable;
if you cannot name the `paths:`/`command:`/`after:` expression, the honest outcome is **it stays
resident text**, and saying so beats forcing a bad matcher.

⚠ **Three costs, all measured 2026-08-07:**
1. **A gate is a narrowing of the rule, and the boundary is where the next incident lives.** A
   `command:` gate on `\b(timeout|...)\b` matched the *word*, blocking `grep 'timeout'` and
   `curl --timeout` — 5 false positives in 14 cases.
2. **A gate's premise rots, and nobody re-reads a rule they agree with.** Two gates enforced a cache
   claim that had been false for months — contradicting the TL;DR of the very file they lived in.
3. **Escalation on a gate that cannot observe compliance is unsound.** A `paths:` gate counts
   traffic, not violations; escalating on that count demanded a behaviour change from an agent that
   was already complying.

⇒ **A promoted gate inherits a falsifiability duty:** state what would make it fire wrongly, and
re-verify its premise on a live path — not from the session that wrote it (`getProtocolGates()`
caches at boot).

### Known blocker — the trigger kind that would unlock the next class

Today's triggers see **location and literal text**, never **edit shape**. So a whole class of
otherwise-ready gotchas cannot be promoted — e.g. *"don't change a role's `default-model` without
reading the calibration ledger"* (`amps/muscles/model-role-calibration.md`) is mechanical in spirit
but needs a **content-diff trigger** to fire on that field rather than on every edit under
`body/children/`. Same missing primitive blocks append-vs-correct detection
(`protocol-gates/cycle.md` #11). **One trigger kind, two blocked classes** — which is the argument
for building it.

## Identity: The Override Layer

Identity sits outside the maturation ladder. It doesn't replace protocols — it sharpens them for a specific project.

```
protocol: "Verify after you build"           ← universal rule
identity: "Verify using ./verify-paths.sh"   ← project-specific application
```

**Protocols should work without identity.** A user who never writes an identity file should still get useful behavior from protocols alone. If a protocol requires project-specific knowledge to be useful, it's too narrow.

**Identity overrides, never conflicts.** Identity can make protocols more specific ("always use X tool for verification") but shouldn't contradict them. If identity says "skip verification" and a protocol says "always verify," that's a design problem in the protocol (too rigid) or the identity (too reckless).

**The reverse check:** During mid-session reflections, scan identity for lines that aren't project-specific. If a principle would help any Soma user, extract it into a protocol. Identity accumulates fast — protocols should accumulate the universal parts.

```
identity insight: "After structural changes, verify scripts still produce correct output"
  ↓ is this project-specific? No — it's universal.
  ↓ extract to protocol (quality-standards or tool-discipline)
  ↓ identity keeps the project-specific version: "run ./verify-paths.sh after path changes"
```

## How Muscles Are Born

Muscles come from **gaps** — not from planning sessions.

| Source | Example |
|--------|---------|
| Agent notices own friction | "I keep checking test counts manually" |
| Agent notices user friction | "User keeps asking me to open URLs" |
| Post-incident | "We deleted working automations with no cleanup protocol" |
| Cross-session repetition | "Third session in a row doing this sequence" |
| Failed assumption | "API works differently than I assumed" |

**Key insight:** The user's repeated behaviors are the richest source. When you notice a pattern — how they like PRs structured, a testing sequence they always follow — that's a muscle waiting to be written.

## Burst Heat *(aspirational — not yet implemented)*

Standard: +1 applied in action, +2 explicitly referenced.

**Burst modifier:** 3+ uses in one session → +3 bonus heat. Intense repetition in a short window builds muscle memory faster than occasional use over months.

> **Implementation status:** Heat auto-detection exists but is limited to specific tool result patterns. Burst counting and the +2 "explicit reference" detection are not yet coded. See heat-tracking protocol for what's actually automated.

## Evolution Triggers

| From → To | Signal |
|-----------|--------|
| Skill → Muscle | You keep applying this knowledge — it's becoming a pattern. |
| Muscle → Protocol | Skipping it causes failures. It's not optional. AND it's universal — not project-specific. |
| Protocol → Automation | The rule is clear enough to enforce without thinking. |
| Identity → Protocol | The insight isn't project-specific. Extract the universal part. |
| Muscle stays muscle | Useful pattern but doesn't rise to rule/workflow. |

## When to Check for Evolution

**Mid-session reflections** are the best time. You've been doing real work, you have context, and the patterns are fresh. During session log writing:

1. **Check observations** — do any of these recur from previous sessions? If so → muscle.
2. **Check muscles** — are you following any muscle so consistently that skipping it would be a mistake? If so → protocol candidate.
3. **Check identity** — did you add anything this session? Is any of it universal? If so → extract to protocol.
4. **Check gaps** — did you hit an issue that a tool should have caught? If so → update the tool AND the muscle/protocol that references it.

The session log's Observations section is the raw material. The reflection is where you ask: *should this stay an observation, or has it earned promotion?*

## Parallel Maturation Gradients

Content isn't the only thing that matures. Three parallel gradients follow the same pattern:

| Gradient | Stages | What Matures |
|----------|--------|-------------|
| **Content** | Skill → Muscle → Protocol → Automation | Knowledge |
| **Product** | Internal → Power-user → Feature → Core | Features |
| **Trust** | Cold → Warm → Hot | Confidence |

All three follow the same principle: start small, prove useful, increase visibility, become default. Heat IS the maturation gradient — it just operates on content. Product maturation (should we ship this feature?) should follow the same pattern: build it internal, let usage decide, ship when hot.

**Naming drives maturation.** Calling something a "muscle" makes you treat it as something that strengthens with use. Calling it a "rule" makes you treat it as something to comply with. The name prescribes behavior. When naming AMPS content, choose names that imply the right relationship: develop (muscles), follow (protocols), trigger (automations), use (scripts).

## What Doesn't Evolve

- One-off solutions (specific bug fix, not a pattern)
- Context-dependent decisions ("we chose React for this project")
- Preferences that change weekly (not a pattern yet)
- Low-heat muscles after 10 unused sessions (consider retiring, not deleting)

## When to Apply

Always. This protocol governs how the agent's knowledge base grows.

## When NOT to Apply

Don't force evolution. If a pattern hasn't naturally emerged, don't manufacture it. The hierarchy is descriptive (what happens) not prescriptive (what must happen on schedule).

---

<!--
Licensed under CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Author: Curtis Mercier
-->
