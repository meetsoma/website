---
title: "Keybindings"
description: "Keyboard shortcuts and how to customize them."
section: "Reference"
order: 2
---

<!-- tldr -->
All keyboard shortcuts are customizable via `~/.soma/agent/keybindings.json`. Edit the file, then `/reload` to apply without restarting. Supports emacs and vim-style bindings.
<!-- /tldr -->

## Default Shortcuts

### Essential

| Shortcut | Action |
|----------|--------|
| **Enter** | Submit message |
| **Shift+Enter** | New line in editor |
| **Escape** | Cancel / interrupt |
| **Ctrl+C** | Clear editor (or copy selection) |
| **Ctrl+D** | Exit (when editor empty) |
| **Ctrl+Z** | Suspend to background |
| **Ctrl+G** | Open in external editor (`$VISUAL` or `$EDITOR`) |

### Models & Thinking

| Shortcut | Action |
|----------|--------|
| **Ctrl+P** | Cycle to next model |
| **Shift+Ctrl+P** | Cycle to previous model |
| **Ctrl+L** | Open model selector |
| **Shift+Tab** | Cycle thinking level (off → low → medium → high) |
| **Ctrl+T** | Toggle thinking block visibility |

### Navigation

| Shortcut | Action |
|----------|--------|
| **Ctrl+O** | Expand/collapse tool output |
| **Alt+Enter** | Queue follow-up message |
| **Alt+Up** | Restore queued messages |
| **Ctrl+V** | Paste image from clipboard |
| **PageUp/PageDown** | Scroll through output |

### Editor (Emacs-style defaults)

| Shortcut | Action |
|----------|--------|
| **Ctrl+A** | Beginning of line |
| **Ctrl+E** | End of line |
| **Ctrl+K** | Delete to end of line |
| **Ctrl+U** | Delete to beginning of line |
| **Ctrl+W** | Delete word backward |
| **Alt+D** | Delete word forward |
| **Ctrl+Y** | Yank (paste deleted text) |
| **Alt+Y** | Cycle through yank ring |

### Session Tree

| Shortcut | Action |
|----------|--------|
| **Ctrl+Left/Alt+Left** | Fold branch or jump to previous segment |
| **Ctrl+Right/Alt+Right** | Unfold branch or jump to next segment |

## Customizing Keybindings

Create `~/.soma/agent/keybindings.json`:

```json
{
  "tui.editor.cursorUp": ["up", "ctrl+p"],
  "tui.editor.cursorDown": ["down", "ctrl+n"],
  "app.model.select": "ctrl+m"
}
```

Each action accepts a single key string or an array of keys. Your config overrides defaults — unset actions keep their defaults.

After editing, run `/reload` in your session to apply changes without restarting.

### Key Format

`modifier+key` — modifiers: `ctrl`, `shift`, `alt` (combinable).

Keys: `a-z`, `0-9`, `escape`, `enter`, `tab`, `space`, `backspace`, `delete`, `home`, `end`, `pageUp`, `pageDown`, `up`, `down`, `left`, `right`, `f1-f12`, and common symbols.

### Emacs Preset

```json
{
  "tui.editor.cursorUp": ["up", "ctrl+p"],
  "tui.editor.cursorDown": ["down", "ctrl+n"],
  "tui.editor.cursorLeft": ["left", "ctrl+b"],
  "tui.editor.cursorRight": ["right", "ctrl+f"],
  "tui.editor.cursorWordLeft": ["alt+left", "alt+b"],
  "tui.editor.cursorWordRight": ["alt+right", "alt+f"],
  "tui.editor.deleteCharForward": ["delete", "ctrl+d"],
  "tui.editor.deleteCharBackward": ["backspace", "ctrl+h"],
  "tui.input.newLine": ["shift+enter", "ctrl+j"]
}
```

### Vim Preset

```json
{
  "tui.editor.cursorUp": ["up", "alt+k"],
  "tui.editor.cursorDown": ["down", "alt+j"],
  "tui.editor.cursorLeft": ["left", "alt+h"],
  "tui.editor.cursorRight": ["right", "alt+l"],
  "tui.editor.cursorWordLeft": ["alt+left", "alt+b"],
  "tui.editor.cursorWordRight": ["alt+right", "alt+w"]
}
```

## All Keybinding IDs

For the complete list of every keybinding ID with its default key, see the tables below. Use these IDs in your `keybindings.json`.

### Editor Movement
`tui.editor.cursorUp`, `tui.editor.cursorDown`, `tui.editor.cursorLeft`, `tui.editor.cursorRight`, `tui.editor.cursorWordLeft`, `tui.editor.cursorWordRight`, `tui.editor.cursorLineStart`, `tui.editor.cursorLineEnd`, `tui.editor.pageUp`, `tui.editor.pageDown`

### Editor Deletion
`tui.editor.deleteCharBackward`, `tui.editor.deleteCharForward`, `tui.editor.deleteWordBackward`, `tui.editor.deleteWordForward`, `tui.editor.deleteToLineStart`, `tui.editor.deleteToLineEnd`

### Editor Actions
`tui.editor.yank`, `tui.editor.yankPop`, `tui.editor.undo`, `tui.input.newLine`, `tui.input.submit`, `tui.input.tab`, `tui.input.copy`

### Application
`app.interrupt`, `app.clear`, `app.exit`, `app.suspend`, `app.editor.external`, `app.clipboard.pasteImage`, `app.tools.expand`, `app.message.followUp`, `app.message.dequeue`

### Models & Thinking
`app.model.select`, `app.model.cycleForward`, `app.model.cycleBackward`, `app.thinking.cycle`, `app.thinking.toggle`

### Sessions
`app.session.new`, `app.session.tree`, `app.session.fork`, `app.session.resume`, `app.session.rename`, `app.session.delete`

### Tree Navigation
`app.tree.foldOrUp`, `app.tree.unfoldOrDown`
