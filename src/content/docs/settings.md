---
title: "Engine Settings"
description: "All runtime settings — models, compaction, UI, retry, shell, and more."
section: "Reference"
updated: 2026-10-04
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

## Anthropic

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `anthropic.enableLongContext` | boolean | `false` | Opt into Anthropic's 1M context billing tier (Sonnet 4.6). See note below. |
| `warnings.anthropicExtraUsage` | boolean | `false` | Show Pi's preventive OAuth-billing warning at session start. Soma defaults to `false` (suppressed). |

> **⚠ Long-context billing prerequisite (Sonnet 4.6 only).** Setting `anthropic.enableLongContext: true` makes Soma add the `context-1m-2025-08-07` beta header to every Anthropic OAuth request. **Your Anthropic account MUST have long-context billing enabled FIRST** at [claude.ai/settings/usage](https://claude.ai/settings/usage). Without it, EVERY request fails with `429 "Extra usage is required for long context requests"` — even at 0% context. Anthropic interprets the header as "this client is willing to pay long-context rates" and rejects accounts that aren't enrolled.
>
> **Opus 4.7 has 1M natively under OAuth** (Anthropic granted Claude Code OAuth clients native 1M for Opus). Sonnet 4.6 does NOT — needs the beta opt-in + billing enrollment. The setting is informational; the actual header injection is via `scripts/patches/apply-patches.sh` at build time. Auto-apply on setting flip is a follow-up.

## Shell

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `shellPath` | string | — | Custom shell path |
| `shellCommandPrefix` | string | — | Prefix for every bash command (e.g., `"shopt -s expand_aliases"`) |
| `npmCommand` | string[] | — | Custom npm command (e.g., `["mise", "exec", "node@20", "--", "npm"]`) |

## Scripts

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `scripts.maxInPrompt` | number | `40` | Max scripts rendered in the boot scripts_table. Lower if the table crowds the prompt; higher if you want more discoverability at boot. |

## Guard

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `guard.trust.enabled` | boolean | `true` | Earned command trust on/off. |
| `guard.trust.threshold` | number | `3` | Same-command approvals before the guard stops asking (per project). |
| `guard.trust.ttlDays` | number | `30` | Days of disuse before an earned entry expires. |

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

## Delegation

Read from `~/.soma/agent/settings.json` when `soma:agent.delegate` spawns a child.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `delegate.defaultModel` | string | — | Model for any child whose call and role name none. Below an explicit `model:`, `delegate.override` and a role's `default-model`; above the first entry of `enabledModels`. |
| `delegate.tiers` | object | `{}` | Named model groups: `{"cheap": ["opencode-go/space-bunny-free", "opencode/space-bunny-free"], "judge": "opus"}`. A role (`default-model: cheap`), an explicit `model:` or `delegate.override` may name a tier. A list takes turns between its models and skips any that recently failed to start on this machine, so the same model on two accounts shares the load. A tier named like a built-in alias (`haiku`) replaces it. |
| `delegate.override` | string | — | Model or tier for **every** child without an explicit `model:`, ahead of each role's own `default-model`. For blanket switches ("all children on X this week"); remove it to return to role defaults. |
| `delegate.headlessChain` | string[] | built-in list | Models a **headless** child (`headless:true`, chains, or a non-`claude-cli` sync call) tries in order when none is named, as `"provider/model"`. Free tiers end and rate-limit without notice — when headless work starts failing with 4xx or "unavailable", edit this list. Four or five entries across providers lets a burst of children survive a per-minute limit. |
| `delegate.terminal` | string | auto | Terminal driver for `background:true` children (`"tmux"`). `soma terminals prefer <driver>` writes it. |

```json
{
  "delegate": {
    "defaultModel": "mistral/mistral-medium-latest",
    "headlessChain": [
      "opencode/big-pickle",
      "opencode/nemotron-3.5-lightning-free",
      "nvidia/nvidia/nemotron-3-super-120b-a12b"
    ]
  }
}
```

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
