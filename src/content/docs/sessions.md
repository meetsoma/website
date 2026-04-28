---
title: "Sessions"
description: "Session logs, preloads, the exhale cycle, and cross-session memory."
section: "Workflows"
order: 13
---

<!-- tldr -->
Sessions are trees, not linear histories. `/tree` navigates branches, `/fork` extracts a new session, `/compact` summarizes old context. Auto-compaction keeps you in-budget. Soma's breath cycle (`/breathe`) offers an alternative: rotate to a fresh session with a preload instead of compressing.
<!-- /tldr -->

## Session Tree

Every session is a tree structure. When you go back and try a different approach, you create a branch. The tree preserves all paths — nothing is lost.

### `/tree` — Navigate the Tree

Opens a visual tree navigator showing your full conversation history:

```
├─ user: "Help me refactor this..."
│  └─ assistant: "Here's my plan..."
│     ├─ user: "Let's try approach A..."     ← you went here first
│     │  └─ assistant: "For approach A..."
│     └─ user: "Actually, approach B..."     ← then branched here
│        └─ assistant: "For approach B..."   ← active
```

**Controls:**

| Key | Action |
|-----|--------|
| ↑/↓ | Navigate entries |
| ←/→ | Page up/down |
| Ctrl+←/Alt+← | Fold branch or jump to previous segment |
| Ctrl+→/Alt+→ | Unfold branch or jump to next segment |
| Enter | Select and navigate to that point |
| Ctrl+U | Toggle: user messages only |
| Ctrl+O | Toggle: show all entries |
| Escape | Cancel |

When you navigate to a different point, Soma optionally summarizes the branch you're leaving — preserving context without keeping the full token cost.

### `/fork` — Create a New Session from a Point

Select a message to fork from. Creates a new session file containing the path from root to that point. The original session is untouched.

| Feature | `/fork` | `/tree` |
|---------|---------|---------|
| Creates new session file | ✅ | No — stays in same session |
| Summarizes abandoned branch | No | Optional |
| Shows tree structure | No — flat list | Yes — full tree |

### Double-Escape

Double-tap Escape to quickly open the tree navigator (configurable):

```json
{
  "doubleEscapeAction": "tree"
}
```

Options: `"tree"` (default), `"fork"`, or `"none"`.

## Compaction

When conversations grow longer than the model's context window, compaction automatically summarizes older messages while keeping recent work intact.

### How It Works

1. Context exceeds threshold (`contextWindow - reserveTokens`)
2. Soma walks backward from the newest message, keeping `keepRecentTokens` worth of recent messages verbatim
3. Everything older gets summarized by the model
4. The summary replaces the old messages — the model sees: system prompt → summary → recent messages

### Settings

In `~/.soma/agent/settings.json`:

```json
{
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `compaction.enabled` | `true` | Enable auto-compaction |
| `compaction.reserveTokens` | `16384` | Tokens reserved for response |
| `compaction.keepRecentTokens` | `20000` | Recent tokens to keep verbatim |

### `/compact` — Manual Compaction

Force compaction at any time, optionally with focus instructions:

```
/compact
/compact Focus on the authentication refactoring decisions
```

### Compaction vs Breath Cycle

Soma offers **two strategies** for managing long conversations:

| Strategy | How | Preserves |
|----------|-----|-----------|
| **Compaction** | Summarizes old messages in-place | Single continuous session |
| **Breath cycle** (`/breathe`) | Saves state → rotates to fresh session with preload | Full history across session files |

Many Soma users disable compaction and rely on the breath cycle:

```json
{
  "compaction": { "enabled": false }
}
```

The preload written by `/breathe` captures what matters — the breath cycle is lossless across sessions even though each session is fresh.

## Branch Summarization

When using `/tree` to navigate to a different branch, you can optionally summarize the branch you're leaving:

- **No summary** — switch immediately
- **Summarize** — generate a summary of the abandoned branch
- **Summarize with instructions** — focus the summary on specific aspects

Summaries are stored as entries in the session tree, preserving the context without the token cost.

## Session Storage

Sessions are stored in `~/.soma/agent/sessions/` as JSONL files, one per project (identified by CWD path). Each entry in the file is a JSON object representing a message, tool call, compaction, or branch summary.

### CLI Session Commands

```bash
soma                    # Fresh session — clean slate
soma inhale             # Fresh session + preload from last /exhale
soma -c                 # Continue last session (full history)
soma -r                 # Pick from sessions to resume
```

See [Commands — CLI Commands](/docs/commands#cli-commands) for the full comparison.

### Export

Export a session as HTML:

```bash
soma --export           # Export current session
soma --export <file>    # Export specific session file
```

Exported files are named `soma-session-*.html` and are self-contained.
