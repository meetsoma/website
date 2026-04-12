---
title: "Inbox"
description: "Asynchronous messaging between agents, sessions, and humans — file-based, no automation needed."
section: "Core Concepts"
order: 4.5
---

# Inbox

<!-- tldr -->
`.soma/inbox/` is a file-based message queue. Drop a markdown file, the next session reads it at boot via `{{inbox_summary}}`. Used for inter-agent communication, bug reports, notes-to-self, and human→agent messages. One topic per file. Frontmatter tracks sender, recipient, status. Archive after 2 weeks. Never delete.
<!-- /tldr -->

## The Problem

AI agents forget between sessions. When you notice something at 2am that your morning session needs to know, where do you put it? When one agent discovers a bug that another agent should fix, how does it tell them?

Email for agents. That's the inbox.

## How It Works

Drop a markdown file in `.soma/inbox/`. On the next boot, Soma scans the directory and injects a summary of unread messages into the system prompt via `{{inbox_summary}}`.

```
.soma/inbox/
├── README.md                                    ← convention docs
├── 2026-04-04-auth-bug-found.md                 ← unread
├── 2026-04-03-deploy-checklist-update.md         ← read
└── _archive/
    └── 2026-03-28-old-message.md                ← archived
```

The agent sees unread messages at session start — no command needed, no automation required. Just files.

## Writing a Message

### File Naming

```
YYYY-MM-DD-topic-subject.md
```

Examples:
- `2026-04-04-scripts-table-not-in-default-mind.md`
- `2026-04-03-keepalive-lives-bug.md`
- `2026-03-28-deploy-process-notes.md`

### Frontmatter

```yaml
---
from: curtis              # who sent it (human name, agent name, or project)
to: soma                  # who should read it
date: 2026-04-04          # when sent
type: bug-report          # bug-report | review | request | fyi | reply | note
priority: normal          # low | normal | high | urgent
status: unread            # unread | read | actioned | resolved
subject: "Short title describing the message"
---
```

### Body

Write it like you're briefing someone who has no context. Include:

- **What** — the issue, observation, or request
- **Where** — specific file paths, line numbers, commit hashes
- **Why** — root cause if known, or your best guess
- **Fix** — suggested fix if you have one

```markdown
---
from: curtis
to: soma
date: 2026-04-04
type: request
priority: normal
status: unread
subject: "Add error handling to the deploy script"
---

# Deploy Script Error Handling

The deploy script at `scripts/deploy.sh` line 42 doesn't handle
the case where `vercel --prod` fails. Last time it failed silently
and I didn't notice for an hour.

**Fix:** Add `set -e` at the top and check the exit code after
the vercel command. Log the error to `.soma/debug/deploy.log`.
```

## Message Types

| Type | When to Use | Example |
|------|------------|---------|
| `bug-report` | Found a bug, traced it, proposing a fix | "Keepalive limit not enforcing — here's the root cause" |
| `review` | Requesting review of completed work | "Reviewed the auth refactor, found 3 issues" |
| `request` | Asking the agent to do something | "Add error handling to deploy script" |
| `fyi` | Information sharing, no action needed | "New API rate limits announced, affects scraping" |
| `reply` | Response to a previous message | "Re: Deploy script — fixed in commit abc123" |
| `note` | Observations for future reference | "Pattern noticed: tests break after timezone change" |

## Lifecycle

```
unread → read → actioned → resolved → archived
```

- **unread** — fresh, the agent hasn't seen it yet
- **read** — agent saw it at boot, hasn't acted
- **actioned** — agent did something about it
- **resolved** — the topic is complete
- **archived** — moved to `inbox/_archive/` (after 2+ weeks)

Update the `status:` field in frontmatter as the message progresses. Archive resolved messages to keep the inbox clean:

```bash
mv .soma/inbox/2026-03-28-old-message.md .soma/inbox/_archive/
```

**Never delete.** Archive instead — the history has value for traceability.

## Boot Integration

The `{{inbox_summary}}` template variable is included in the default `_mind.md` template. On boot, Soma scans `.soma/inbox/` for files (excluding `README.md` and `_archive/`), reads their frontmatter, and injects a summary.

The agent sees something like:

```
## Inbox (2 unread)

1. [bug-report] "Keepalive limit not enforcing" (from: somaverse, 2026-04-03)
2. [request] "Add error handling to deploy script" (from: curtis, 2026-04-04)
```

If your `_mind.md` doesn't include `{{inbox_summary}}`, add it:

```markdown
{{muscle_digests}}

{{inbox_summary}}

{{scripts_table}}
```

## Inter-Agent Communication

The inbox pattern works across agent systems. Each system has its own inbox:

| Agent System | Inbox Path |
|-------------|-----------|
| Soma (project) | `.soma/inbox/` |
| Soma (global) | `~/.soma/inbox/` |
| Claude Code | `.claude/inbox/` |
| Somaverse | `somaverse/.soma/inbox/` |

### Sending a Message to Another Agent

Drop a file in the recipient's inbox directory:

```bash
# Soma → Claude Code
cat > .claude/inbox/2026-04-04-auth-pattern-found.md << 'EOF'
---
from: soma
to: sage
date: 2026-04-04
type: fyi
priority: low
status: unread
subject: "Auth pattern found — might be useful for trader project"
---

Found a reusable OAuth refresh pattern while working on the API service.
See `.soma/amps/muscles/oauth-refresh.md` for the full pattern.
EOF
```

### Threading

For multi-turn conversations, use `in-reply-to:` to build threads:

```yaml
# Reply (goes in the OTHER agent's inbox)
---
from: sage
to: soma
type: reply
status: unread
subject: "Re: Auth pattern found"
in-reply-to: .soma/inbox/2026-04-04-auth-pattern-found.md
---

Good find. I adapted it for the trader project — added retry logic
for token expiration. See `.claude/agent-memory/sage/oauth-retry.md`.
```

### Cross-Project Messages

When agents work across projects, include project context:

```yaml
from: soma (somaverse)     # agent name + project
to: soma (meetsoma)        # recipient + their project
```

## Human → Agent Messages

The inbox isn't just for agents talking to each other. It's the cleanest way for *you* to leave notes for your next session:

```bash
cat > .soma/inbox/2026-04-04-morning-priorities.md << 'EOF'
---
from: curtis
to: soma
date: 2026-04-04
type: request
priority: high
status: unread
subject: "Morning priorities — fix deploy before feature work"
---

Before working on the new feature:
1. Fix the deploy script error handling (see yesterday's failure in #slack-deploys)
2. Run the full test suite — I saw flaky tests yesterday
3. THEN start the auth feature

Don't skip step 2. The flaky tests might be related to the deploy issue.
EOF
```

The agent reads this at boot. Your priorities are front-and-center before any work starts.

## Tips

- **One topic per message.** Don't bundle "fix the bug AND update the docs AND check the deploy." Three files.
- **Include file paths.** The agent can't act on "fix the thing" — it needs `scripts/deploy.sh:42`.
- **Be self-contained.** The recipient may not have your session context. Write it like a standalone brief.
- **Check the inbox on exhale.** Before ending a session, glance at `.soma/inbox/` — are there messages you noticed but didn't address? Update their status.
- **Use priorities honestly.** `urgent` means "drop everything." `normal` means "next session." `low` means "when you get to it."

## Community Protocol

The full inter-agent inbox convention is published as a community protocol:

```
/hub install protocol inter-agent-inbox
```

This installs the formal specification with message types, threading, lifecycle, and cross-system conventions.

## Related

- [Body Architecture](/docs/body) — `{{inbox_summary}}` template variable
- [Configuration](/docs/configuration) — boot steps (inbox scanned during boot)
- [Memory Layout](/docs/memory-layout) — where `.soma/inbox/` fits in the directory structure
