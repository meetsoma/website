---
type: template
name: preload-template
status: active
version: 1.0.0
description: "Customize how Soma writes preloads. Drop this into .soma/prompts/ to override the default format with your own sections and guidance."
author: meetsoma
license: MIT
tier: official
tags: [preload, session, continuity, template, customization]
created: 2026-03-22
updated: 2026-03-22
---

# Preload Template

Override how Soma writes preloads during `/exhale` and `/breathe`. This template replaces the built-in default — add your own sections, remove what you don't need, change the guidance.

## How It Works

1. Install this template: `/hub install template preload-template`
2. The file lands at `.soma/prompts/preload-template.md`
3. Next time you exhale or breathe, Soma uses YOUR template instead of the default
4. Edit it freely — it's yours

## What's Included

This template mirrors the built-in default with all available sections. Customize by:
- **Adding sections** — "Who You Were", "Journal Reference", project-specific context
- **Removing sections** — delete what you don't need
- **Changing guidance** — edit the HTML comments to shape what Soma writes
- **Reordering** — put what matters most to you at the top

## Template Variables

These get replaced automatically when the template renders:

| Variable | Value |
|----------|-------|
| `{{today}}` | Current date (YYYY-MM-DD) |
| `{{sessionId}}` | Current session ID (e.g. s01-abc123) |
| `{{logPath}}` | Path to the session log file |
| `{{target}}` | Path to the preload file being written |
| `{{logVerb}}` | "Write" or "Append to" (based on whether log exists) |
| `{{preloadVerb}}` | "Write" or "Update" (based on whether preload exists) |

## Install

```bash
/hub install template preload-template
```

Then edit `.soma/prompts/preload-template.md` to make it yours.
