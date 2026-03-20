---
title: "Engine Settings"
description: "All runtime settings — models, compaction, UI, retry, shell, and more."
section: "Reference"
order: 6.3
---

<!-- tldr -->
`~/.soma/agent/settings.json` (global) and `.soma/settings.json` (project-level, Soma-specific). Project overrides global. Use `/settings` to edit common options interactively. This page covers the engine settings that control the runtime — for Soma-specific settings (heat, boot, muscles), see [Configuration](/docs/configuration).
<!-- /tldr -->

## File Locations

| File | What It Controls |
|------|-----------------|
| `~/.soma/agent/settings.json` | Engine runtime — models, compaction, UI, retry, shell |
| `.soma/settings.json` | Soma behavior — heat, boot steps, muscles, context warnings |

This page documents the **engine settings**. For Soma settings, see [Configuration](/docs/configuration).

## Model & Thinking

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `defaultProvider` | string | — | Default provider (`"anthropic"`, `"openai"`, `"google"`, etc.) |
| `defaultModel` | string | — | Default model ID |
| `defaultThinkingLevel` | string | — | `"off"`, `"minimal"`, `"low"`, `"medium"`, `"high"`, `"xhigh"` |
| `hideThinkingBlock` | boolean | `false` | Hide thinking blocks in output |
| `enabledModels` | string[] | — | Models for Ctrl+P cycling (same format as `--models` flag) |

```json
{
  "defaultProvider": "anthropic",
  "defaultModel": "claude-sonnet-4-20250514",
  "defaultThinkingLevel": "medium",
  "enabledModels": ["claude-*", "gpt-4o"]
}
```

See [Models & Providers](/docs/models) for the full model configuration guide.

## Compaction

Controls how long conversations are summarized to stay within context limits.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `compaction.enabled` | boolean | `true` | Enable auto-compaction |
| `compaction.reserveTokens` | number | `16384` | Tokens reserved for response |
| `compaction.keepRecentTokens` | number | `20000` | Recent tokens to keep verbatim |

```json
{
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  }
}
```

**Note:** Soma's breath cycle (`/breathe`, `/exhale`) provides an alternative to compaction. Some users prefer disabling compaction and using breathe rotation instead, which preserves full conversation history across sessions via preloads.

## UI & Display

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `theme` | string | `"dark"` | Theme name. See [Themes](/docs/themes). |
| `quietStartup` | boolean | `false` | Hide startup header |
| `doubleEscapeAction` | string | `"tree"` | Double-escape: `"tree"`, `"fork"`, or `"none"` |
| `editorPaddingX` | number | `0` | Horizontal padding for input (0-3) |
| `showHardwareCursor` | boolean | `false` | Show terminal cursor |

## Retry

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `retry.enabled` | boolean | `true` | Auto-retry on transient errors |
| `retry.maxRetries` | number | `3` | Max retry attempts |
| `retry.baseDelayMs` | number | `2000` | Base delay for exponential backoff |
| `retry.maxDelayMs` | number | `60000` | Max server-requested delay before failing |

## Shell

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `shellPath` | string | — | Custom shell path |
| `shellCommandPrefix` | string | — | Prefix for every bash command (e.g., `"shopt -s expand_aliases"`) |
| `npmCommand` | string[] | — | Custom npm command (e.g., `["mise", "exec", "node@20", "--", "npm"]`) |

## Terminal & Images

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `terminal.showImages` | boolean | `true` | Show images in terminal |
| `images.autoResize` | boolean | `true` | Resize images to 2000x2000 max |
| `images.blockImages` | boolean | `false` | Block all images from being sent to LLM |

## Message Delivery

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `steeringMode` | string | `"one-at-a-time"` | How steering messages are sent: `"all"` or `"one-at-a-time"` |
| `followUpMode` | string | `"one-at-a-time"` | How follow-up messages are sent |

## Branch Summary

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `branchSummary.reserveTokens` | number | `16384` | Tokens reserved for branch summarization |
| `branchSummary.skipPrompt` | boolean | `false` | Skip "Summarize branch?" prompt on tree navigation |

## Example

```json
{
  "defaultProvider": "anthropic",
  "defaultModel": "claude-sonnet-4-20250514",
  "defaultThinkingLevel": "medium",
  "theme": "dark",
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  },
  "retry": {
    "enabled": true,
    "maxRetries": 3
  },
  "enabledModels": ["claude-*", "gpt-4o"],
  "editorPaddingX": 2
}
```

## Project Overrides

Project settings (`~/.soma/agent/settings.json` locally or `.pi/settings.json`) override global settings. Nested objects are merged — you only need to specify what changes:

```json
// Global: compaction enabled with 16K reserve
// Project override: reduce reserve for small-context models
{
  "compaction": { "reserveTokens": 8192 }
}
// Result: compaction still enabled, reserve now 8192
```
