---
title: "Themes"
description: "Customize Soma's appearance with built-in or custom themes."
section: "Reference"
order: 6.4
---

<!-- tldr -->
Built-in: `dark` and `light` (auto-detected). Custom: create JSON files in `~/.soma/agent/themes/` or `.soma/themes/`. Select via `/settings` or `settings.json`. Ask Soma to build one for you.
<!-- /tldr -->

## Selecting a Theme

Use `/settings` during a session, or add to `settings.json`:

```json
{
  "theme": "my-theme"
}
```

On first run, Soma detects your terminal background and defaults to `dark` or `light`.

## Built-in Themes

- **dark** — dark background terminals (default on dark terminals)
- **light** — light background terminals (default on light terminals)

## Creating a Custom Theme

1. Create the themes directory:

```bash
mkdir -p ~/.soma/agent/themes
```

2. Create a theme file (e.g., `~/.soma/agent/themes/ocean.json`):

```json
{
  "name": "ocean",
  "vars": {
    "primary": "#00aaff",
    "secondary": 242
  },
  "colors": {
    "accent": "primary",
    "border": "primary",
    "borderAccent": "#00ffff",
    "borderMuted": "secondary",
    "success": "#00ff00",
    "error": "#ff0000",
    "warning": "#ffff00",
    "muted": "secondary",
    "dim": 240,
    "text": "",
    "thinkingText": "secondary",
    "selectedBg": "#2d2d30",
    "userMessageBg": "#2d2d30",
    "userMessageText": "",
    "customMessageBg": "#2d2d30",
    "customMessageText": "",
    "customMessageLabel": "primary",
    "toolPendingBg": "#1e1e2e",
    "toolSuccessBg": "#1e2e1e",
    "toolErrorBg": "#2e1e1e"
  }
}
```

3. Select it: `"theme": "ocean"` in settings.json, or via `/settings`.

**Pro tip:** Ask Soma to create a theme for you — describe your preferred colors and she'll generate the JSON.

## Theme Locations

Themes are loaded from multiple locations (later sources override earlier):

| Location | Scope |
|----------|-------|
| Built-in (`dark`, `light`) | Default |
| `~/.soma/agent/themes/*.json` | Global custom |
| `.soma/themes/*.json` | Project-specific |

## Color Values

Colors can be specified as:
- **Hex:** `"#00aaff"`, `"#0af"`
- **ANSI 256:** `242` (integer, 0-255)
- **Variable reference:** `"primary"` (references a `vars` entry)
- **Empty string:** `""` (inherits terminal default)

## Tips

- Theme files reload when you open `/settings` — edit during a session without restarting
- Use `vars` for colors you repeat — change one variable, update everywhere
- Project themes in `.soma/themes/` let teams share a consistent look
- Start from the built-in dark theme and modify what you want
