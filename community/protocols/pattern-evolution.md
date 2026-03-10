---
type: protocol
name: pattern-evolution
status: active
heat-default: hot
applies-to: [always]
breadcrumb: "Patterns mature: observation → muscle → muscle memory → protocol/skill/ritual. Muscles grow from gaps noticed during work. Repetition builds heat fast. Mature patterns crystallize into the system."
author: Soma Team
license: MIT
version: 1.0.0
---

# Pattern Evolution Protocol

## TL;DR
- Patterns climb: **observation** → **muscle** (seen 2+ times) → **muscle memory** (automatic) → **protocol/skill/ritual** (crystallized)
- Muscles are born from **gaps** — moments where you notice a missing pattern, a repeated friction, a workflow hole
- **Burst heat**: rapid repetition in a short window heats faster than slow accumulation across sessions
- Not every pattern climbs the full ladder. Some stay muscles forever. That's fine.
- The agent should actively notice its own gaps and the user's gaps — both are sources of new muscles

## The Hierarchy

```
observation (noticed gap, repeated action)
  ↓ seen 2+ times → write it down
muscle (learned pattern, markdown file)
  ↓ loaded repeatedly, applied automatically
muscle memory (subconscious — agent applies without thinking)
  ↓ crystallizes based on nature
protocol | skill | ritual
```

Each destination has different characteristics:

| Destination | When | Nature |
|-------------|------|--------|
| **Protocol** | The pattern becomes a behavioral *rule*. Skipping it causes mistakes. | How to *be*. Mandatory. |
| **Skill** | The pattern is domain knowledge. It teaches, doesn't enforce. | How to *know*. On-demand. |
| **Ritual** | The pattern is a multi-step workflow. It sequences actions. | How to *do*. Triggered. |

The muscle doesn't choose its destination consciously. It becomes whatever it naturally is. A testing pattern that you must always follow → protocol. A logo design technique you sometimes need → skill. A publish workflow you repeat every release → ritual.

## How Muscles Are Born

Muscles come from **gaps** — not from planning sessions. They emerge from work.

### Gap Sources

| Source | Example |
|--------|---------|
| **Agent notices own friction** | "I keep checking test counts manually — this should be a pattern" |
| **Agent notices user friction** | "The user keeps asking me to open URLs instead of just linking them" |
| **Post-incident** | "We deleted working scripts because we had no cleanup protocol" |
| **Cross-session repetition** | "Third session in a row I've done this exact sequence" |
| **Failed assumption** | "I assumed the API worked one way — writing down the actual behavior" |

The key insight: **the user's repeated behaviors are the richest source of muscles.** When you notice the user has a pattern — a way they like PRs structured, a testing sequence they always follow, a communication style they prefer — that's a muscle waiting to be written.

## Burst Heat

Standard heat events:
- +1 when applied in action
- +2 when explicitly referenced

**Burst modifier:** If a pattern is applied 3+ times within a single session, add +3 bonus heat. This reflects the biological reality — intense repetition in a short window builds muscle memory faster than occasional use over months.

```
Standard progression (slow):
  Session 1: +1 → heat 1 (cold)
  Session 2: +1 → heat 2 (cold)
  Session 3: +1 → heat 3 (warm)
  ...
  Session 8: +1 → heat 8 (hot)

Burst progression (fast):
  Session 1: +1, +1, +1 (3 uses) → +3 burst → heat 6 (warm, almost hot)
  Session 2: +1, +1 → heat 8 (hot)
```

This means a pattern discovered and used heavily in one session can be warm by session's end. That's correct behavior — if something matters enough to use 3+ times in one session, it matters.

## The Muscle Memory Threshold

A muscle becomes "muscle memory" when:
- Heat ≥ hot threshold (loaded automatically, every session)
- The agent applies it without being asked
- The digest alone is sufficient — the full body is reference material
- The user stops needing to remind the agent about this pattern

At this point, the muscle is *subconscious*. The agent just does it. The written muscle is insurance — proof that the pattern exists, documentation for future sessions after heat decay, and a teaching tool for other agents.

## Evolution Triggers

### Muscle → Protocol
**Signal:** Skipping the pattern causes failures. It's not optional anymore.
**Action:** Write a protocol with `## TL;DR`, `## When to Apply`, `## When NOT to Apply`.
**Example:** "test-hygiene" started as a muscle. After the scripts-we-deleted incident, it became mandatory. Protocol candidate.

### Muscle → Skill
**Signal:** The pattern is domain knowledge that loads on demand, not a behavioral rule.
**Action:** Write a `SKILL.md` with instructions, examples, decision frameworks.
**Example:** "svg-logo-design" is knowledge about how to design logos. It's not a rule — it's expertise.

### Muscle → Ritual
**Signal:** The pattern is a repeatable multi-step workflow triggered by a command.
**Action:** Write a ritual with steps, checkpoints, and error handling.
**Example:** "publish flow" — plan → draft → review → commit → push → deploy. Always the same sequence.

### Muscle stays muscle
**Signal:** It's a useful pattern but doesn't rise to rule/expertise/workflow.
**Example:** "pr-release-workflow" — helpful patterns for PRs, but every PR is different enough that rigid rules would hurt.

## User Adaptation

The most important muscles are the ones that emerge from observing the **user's** patterns:

1. **Notice** — the user does something repeatedly, or expresses a preference
2. **Confirm** — verify the pattern is intentional, not accidental
3. **Encode** — write a muscle capturing the pattern
4. **Apply** — use the muscle in future interactions
5. **Evolve** — refine as the user's pattern evolves

This isn't just "following orders." It's learning the user's workflow, filling their gaps, and adapting the agent's behavior to maximize collaboration quality.

### Examples of User Adaptation Muscles

- User always wants URLs opened, not linked → muscle: "open browser for URLs"
- User prefers short confirmations over detailed explanations → muscle: "concise responses"
- User always reviews blog posts for accuracy before publish → muscle: "pre-publish verification"
- User structures PRs with specific sections → muscle: "PR template"

## What Doesn't Evolve

- **One-off solutions** — a fix for a specific bug isn't a pattern
- **Context-dependent decisions** — "we chose React for this project" isn't a muscle
- **Preferences that change** — if the user changes their mind weekly, it's not a pattern yet
- **Low-heat muscles** — if it hasn't been used in 10 sessions, consider retiring (not deleting)

## The Perfectionist's Check

Before modifying any muscle, protocol, or ritual:

1. **Read the full file** — not just the section you're changing
2. **Trace references** — `grep -rn "muscle-name"` to find everything that depends on it
3. **Understand the ripple** — changing heat thresholds affects which muscles load at boot
4. **Test the change** — if the muscle has associated tests, run them
5. **Verify recency** — is this file current? Check `updated:` field. Don't build on stale foundations.

The goal isn't caution. It's confidence. Change quickly, but change with full understanding of what you're touching.

## When to Apply

Always. This protocol governs how the agent's knowledge base grows. It's the meta-protocol for self-improvement.

## When NOT to Apply

Don't force evolution. If a pattern hasn't naturally emerged, don't manufacture it. The hierarchy is descriptive (what happens naturally) not prescriptive (what must happen on a schedule).
