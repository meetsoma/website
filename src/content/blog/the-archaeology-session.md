---
title: "The Archaeology Session"
description: "We planned a folder cleanup. We shipped a feature, fixed 7 stale protocols, rescued 48 lost plans, and reorganized 800 files. Cleanup isn't maintenance — it's a product review in disguise."
date: 2026-03-22T20:00:00
image: /images/blog/og-the-archaeology-session.png
author: "Curtis & Soma"
authorRole: "co-authored"
tags: ["dev-log", "organization", "workflow", "building-in-public"]
---

Two weeks ago, Curtis wouldn't let the agent move files. "Copy them first. Don't delete anything. Let me check." He'd tell it to plan, then plan again. Fair enough — a previous agent had deleted 12 muscles instead of archiving them. Another time, a config patch overwrote an agent list and lost 13 entries. In the Gravicity vault, the rule got written into a muscle: *"Archive don't delete — if uncertain, move to `.archive/` instead of rm."*

This session, Curtis said "go ahead." No hedging. No "copy first, I'll check." Just: here's the structure I want — make it happen.

800 files moved. Zero lost. Here's what changed.

## What we were living with

After shipping v0.6.3 — our biggest release — we looked at the workspace we'd built it in. It was a mess.

**Ideas in 2 places. Plans in 4. Archives in 3.** We'd been creating files wherever felt right in the moment. `memory/ideas/`, `workspace/plans/`, `projects/`, `workspace/archive/`. Same content type, three or four homes. Nothing findable without `grep`.

**A "dead" directory that wasn't dead.** The old parent `.soma/` at the Gravicity root — 1,601 files, marked "ARCHIVED" two weeks ago. Boot was still syncing community protocols there every session. We thought it was dead. It was more alive than half our workspace.

**Three overlapping MAPs for the same workflow.** Our release process existed in `release.md`, `release-cycle.md`, and `post-release.md`. Different phase numbers. Different steps. We'd follow whichever one we opened first, sometimes mixing steps from two of them.

**48 plans we forgot existed.** Architecture decisions, strategy docs, audit reports from the first week of development. Still sitting in the old directory structure, invisible to every session since we migrated.

None of this was broken. Tests passed. Everything ran. The compound cost was invisible — each session burning 5 minutes re-discovering where things lived, re-reading stale references, re-finding plans we'd already written.

## How the tools made it possible

The restructure wasn't heroic. It was mechanical. The tools did the hard work.

`soma-seam.sh trace "workspace"` — found every file that referenced the old path. 200+ hits across scripts, protocols, muscles, MAPs, identity, kanbans. Without this, we'd have moved the directories and spent three sessions discovering broken references.

`soma-verify.sh repos` — confirmed every repo was clean and pushed before we started touching structure. No dangling commits to lose.

`soma-code.sh map core/discovery.ts` — showed us exactly how the boot system discovers scripts, protocols, and muscles. Line 120: `discoverContent` scans recursively to depth 2, skips `_` prefixed dirs. This told us where we could move things without breaking discovery, and where we'd need to update `settings.json`.

The pattern for every move:

```bash
# Copy first
cp -r workspace/dev/* archive/dev/

# Verify counts match
echo "Old: $(find workspace/dev/ -type f | wc -l)"    # 171
echo "New: $(find archive/dev/ -type f | wc -l)"      # 171

# Only then delete
rm -rf workspace/dev
```

Never `mv`. Never delete without verifying the copy landed. Every count checked before the original was removed. The tools we built for code refactoring — blast radius scanning, reference checking, verification — turned out to be exactly what directory restructuring needed.

After the move: `grep -rn "workspace/"` across all active content. Fix every hit. 30+ files updated. Then run it again. Zero remaining.

## A feature emerged from the mess

While reorganizing the media folder, we found an old design voting server — a Node app from our early logo iterations where Curtis could vote on concepts and the agent would read the result. It had been archived. We moved it to `media/studio/`.

Curtis asked: "what if the vote went directly to the agent instead of me having to tell you?"

That question became soma-route v1.1.0 in the same session. The **external inbox** — tools write JSON to `.soma/inbox/`, the agent picks it up on the next turn, verifies a session token, checks the signal allowlist, and emits it as a regular route signal. External tools can send `studio:vote` but never `session:new`.

Not on any kanban. Not planned. Emerged from touching the right file at the right moment. The cleanup surfaced the tool, the tool surfaced the question, the question surfaced the feature.

## The numbers

![Session stats — 800 files reorganized, 1601→6, 48 plans rescued, 0 stale refs](/images/blog/archaeology-stats.svg)

The parent `.soma/` went from 1,601 files to 6. The workspace went from 20 top-level directories to 16. Three release MAPs became one. 50 ideas got organized into 9 domain folders with a living index. Every stale path reference found and fixed.

Plus: a restructure MAP for future migrations, per-post social images, the design studio with its new agent connection, and a protocol sync pipeline that prevents the drift from happening again.

## The trust question

Here's what's actually interesting about this session. It's not the file count. It's the permission.

Two weeks ago, the pattern was: agent proposes → Curtis reviews → Curtis approves each step → agent executes under supervision. That was right. The early agent had proven it could break things — deleting muscles instead of archiving, referencing paths that didn't exist, making claims about code without checking.

What changed isn't that the agent got smarter. What changed is that the tools got reliable. `soma-seam.sh` finds every reference. The restructure MAP codifies the safe pattern (copy → verify → delete). `soma-verify.sh` catches what the sweep missed. The agent built tools that made the agent trustworthy.

That's the real spiral. Build tools → tools prove reliability → earn trust → get permission to do more → build better tools. The trust isn't given — it's engineered. Each tool is a proof point. Each successful restructure is evidence that the next one will be safe.

Curtis didn't say "go ahead" because he forgot to be careful. He said it because 15 sessions of tool-building had produced enough evidence that "go ahead" was the rational response.

## What this means for anyone building with agents

**Cleanup is archaeology.** Every file moved gets read. Every path updated gets verified. The sweep forced reading every muscle, protocol, and MAP — and that IS the product review. We didn't plan a review. The cleanup was the review.

**The session between releases is where compound interest lives.** Every stale reference fixed saves 5 minutes next session. Every idea indexed saves 10 minutes on the next decision. Every protocol synced means one more user gets the right version on first install. The foundations you can't see matter most.

**Trust is tooling.** An agent you can't verify is an agent you can't trust. An agent with `soma-seam.sh trace`, `soma-verify.sh repos`, and a restructure MAP that says "copy → verify counts → then delete" — that agent you can hand 800 files and say "go ahead."

---

*Day 15 of building Soma in public. 800 files reorganized. 1 feature emerged. The agent that remembers is only as good as the memory it can find — and the tools it built to find it.*
