---
title: "Kanban Audit"
description: "dev:kanban.* — triangulate ticket status (SHIPPED / STALE / STILL-VALID / NEEDS-REPRO / UNCLEAR / STALE-CROSS-PROJECT) from kanban + git + code + sessions + cross-project trees in seconds. The dev tool that closes 'is SX-N actually still open?' as a question."
section: "Guide"
order: 29
---

# Kanban Audit

<!-- tldr -->
`dev:kanban.audit` and friends are the dev caps for **stop manually grepping kanban tickets one at a time**. Triangulate ticket status from four sources (kanban row + git log + code surface via `soma:code.*` + sessions/preloads + cross-project trees) and emit one of six verdicts: `SHIPPED`, `STALE`, `STALE-CROSS-PROJECT`, `STILL-VALID`, `NEEDS-REPRO`, `UNCLEAR`. Batch 10 tickets in ~13s; delegate verifiers in parallel for high-stakes verdicts. Built dev-only (build-excluded from npm tarball) — these caps live behind the existing `dev` meta-tool with zero cache cost.
<!-- /tldr -->

## Why it exists

Three failure modes any agent runs into when a release approaches:

1. **"Is SX-388 actually still open?"** — The ticket says open, the body cites a file, the body says "needs investigation." But maybe a sibling ticket already absorbed it. Maybe someone shipped the fix without closing. Maybe the file was deleted six months ago. Manual grep + read = three minutes per ticket × ten tickets = the next half hour.

2. **"Did this work actually ship to the right place?"** — A ticket might be tracked in your kanban but the work lives in a sibling project (somaverse, somadian, whatever). Closing it locally would be wrong; the work IS valid, just over there.

3. **"Pre-release ticket sweep" friction** — Before cutting a release you want a clean kanban. Without tooling, the path is grep + read + decide × N. With tooling, it's one command + a markdown table.

`dev:kanban.audit` collapses all three into a probe → verdict + evidence flow.

## How

Three caps under the existing `dev` meta-tool:

```
dev:kanban.audit         single ticket, JSON verdict + evidence
dev:kanban.audit_batch   N tickets parallel; default | md | json output
dev:kanban.audit_open    every non-✅ row in workspace kanban (one-shot)
```

Discovery is the same as every dev cap:

```ts
dev(op='list')                          // see all dev:* caps
dev(op='help', cap='dev:kanban.audit')  // usage + args
dev(op='call', cap='dev:kanban.audit', args={ticket: 'SX-708'})
```

Or shell-level (the underlying scripts at `.soma/amps/scripts/`):

```bash
soma-audit-ticket SX-708                  # human-readable
soma-audit-ticket SX-708 --json           # parse-friendly
soma-audit-tickets SX-708 SX-718 SX-589   # batch
soma-audit-tickets --all-open             # every open ticket
soma-audit-tickets --md --all-open        # markdown table
```

## What it actually does

The probe triangulates four sources, NEVER raw grep:

| Source | What it checks | Tool |
|---|---|---|
| **Kanban row** | `**SX-N**` row, `✅` markers in title/body cells, frontmatter, body refs | direct file read + regex |
| **Git log** | `--grep SX-N` commits + body-cited shas | `git log` |
| **Code surface** | Symbol/file mentions in body — do they exist? where? | `soma:code.refs` (DEF/IMP/USE), `soma:code.find`, `soma:code.stats` |
| **Topic-in-target** | For doc-work tickets: does the topic appear in cited docs? | `ripgrep -F` per file + tree-wide |
| **Sessions/preloads** | Cited session IDs — is there a log/preload? | filesystem scan |
| **Cross-project trees** | If symbol absent locally, check `somaverse/`, `somadian/`, `website/` | `soma:code.stats` per project |

## Verdict vocabulary

Each verdict maps to a different bookkeeping action:

| Verdict | What it means | Action |
|---|---|---|
| **SHIPPED** | Closed marker present, OR commits + close-words in body/title | Add ✅ to kanban + commit hash if missing |
| **STALE** | Cited file or symbol doesn't exist anywhere — work was never built or was removed | Remove from kanban |
| **STALE-CROSS-PROJECT** | Subject doesn't exist locally but lives in a sibling project | Move ticket pointer to right kanban; close locally |
| **STILL-VALID** | Cited code path exists, but the described change/feature is NOT yet in code | Real work — size and queue |
| **NEEDS-REPRO** | Investigation/audit ticket with no commits | Schedule a session to drive a repro |
| **UNCLEAR** | Mixed signals | Human read of body — don't auto-decide |

## Two-tier confidence pattern

For verdicts you're going to **act on** (close-as-shipped / mark-stale / move-pointer), delegate a verifier:

```ts
soma:agent.delegate({
  role: 'verifier',
  model: 'claude-haiku-4-5',
  background: true,
  task: '...VERIFY a script verdict INDEPENDENTLY...
         Recipe: read kanban row, run soma:code.* (not grep) to check claims,
         git log --grep, then return YOUR_VERDICT + AGREES_WITH_SCRIPT + EVIDENCE'
})
```

Cost: ~$0.10–0.15 per verification, ~3–5 min wall-clock. Cheap insurance against acting on a wrong verdict — and the verifier catches what the script's heuristics miss because it probes with fresh attention rather than pattern-matching.

**Real example (the cap's shipping session):** the script said `SX-642` was STALE because `office_connect` had zero hits in `repos/agent`. A verifier delegation independently found 18 references in `somaverse/builds/*/extensions/space-office.ts` plus active tracking in somaverse `STATE.md` — work is real, just wrong kanban. That feedback drove the cross-project probe heuristic and the new `STALE-CROSS-PROJECT` verdict. Closing the ticket without verification would have deleted live work-in-flight.

## Output formats

### Default (grouped table)

```
═══ batch audit: 10 tickets ═══

SHIPPED              ( 2)  SX-588 SX-589
STALE-CROSS-PROJECT  ( 1)  SX-642
STILL-VALID          ( 2)  SX-705 SX-708
NEEDS-REPRO          ( 1)  SX-707
UNCLEAR              ( 4)  SX-606 SX-641 SX-643 SX-709
```

### `--md` (markdown for cycle docs)

```markdown
| Ticket | Verdict | Title | Reason |
|---|---|---|---|
| SX-708 | STILL-VALID | Document cold-start boost ... | Cited files have ZERO hits for topic |
| SX-718 | SHIPPED | breathe.auto opt-in by default | Row has ✅ marker (closed) |
```

### `--json` (parent-agent / pipe consumption)

```json
{
  "ticket": "SX-708",
  "verdict": "STILL-VALID",
  "title": "Document cold-start boost ...",
  "files_cited": [...],
  "code_evidence": {...},
  "topic_hits_in_cited_files": {...},
  "cross_project_hits": {},
  "git_log_matches": [],
  "reason": [...]
}
```

## When NOT to reach for this

- **Short kanbans** (1–3 open tickets) — manual read is faster.
- **Single-shot decision** about a ticket you wrote yourself this session — you remember the state.
- **Greenfield tickets with no code or docs cited** — the script returns UNCLEAR; you'll be reading the body anyway.

## Anti-patterns

- ❌ Trusting `UNCLEAR` as a final answer — it's a "human-read needed" flag, not a decision.
- ❌ Closing `STALE` tickets without a cross-project probe — deletes work tracked elsewhere.
- ❌ Running `--all-open` then closing everything `SHIPPED` without spot-checking — heuristics aren't perfect; the verifier delegation pattern exists for a reason.
- ❌ Shell-level grep when the cap exists — you'll forget the cap exists by the next session, and the cap auto-discovers via `dev(op='list')`.

## Distribution & cache cost

- **Built into `dev:*` meta-tool** — addons are registered via `route.provide()` at session start; **zero new tool slots in the cached prompt**.
- **Build-excluded from npm tarball** — same dist-exclusion path as `dev:hub.*`. Production users don't see this cap; it lives only in dev installs of the agent runtime.
- **Backbone scripts at `.soma/amps/scripts/`** — workspace-local. Hardcoded paths today (assumes `repos/agent`, `somaverse`, `somadian`, `website` siblings); fine for internal dev tool. If promoted to a community-shipping `soma:kanban.*` cap, settings-driven config replaces the hardcodes.

## See also

- [Code Navigator](./code-navigator.md) — the `soma:code.*` toolkit this audit uses to triangulate
- [Background Delegation](./background-delegation.md) — the `soma:agent.delegate` workflow used for verifier-second-opinions
