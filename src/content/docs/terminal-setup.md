---
title: "Terminal Setup"
description: "Recommended terminal configuration for the best Soma experience."
section: "Reference"
order: 6.5
---

<!-- tldr -->
Any modern terminal works. For best results: use a terminal with image support, enable Unicode, and set a Nerd Font. Soma auto-detects dark/light theme from your terminal.
<!-- /tldr -->

## Recommended Terminals

| Terminal | Platform | Image Support | Notes |
|----------|----------|---------------|-------|
| **iTerm2** | macOS | ✅ | Best experience on Mac |
| **Kitty** | Linux/macOS | ✅ | Fast, GPU-accelerated |
| **WezTerm** | All | ✅ | Cross-platform, Lua config |
| **Ghostty** | macOS/Linux | ✅ | New, fast |
| **Windows Terminal** | Windows | ✅ (sixel) | Best on Windows |
| **VS Code terminal** | All | ⚠️ Limited | Works but no image support |
| **Alacritty** | All | ❌ | Fast but no image protocol |

## Font

Any monospace font works. For the best icon display, use a [Nerd Font](https://www.nerdfonts.com/):

Popular choices:
- **JetBrains Mono Nerd Font**
- **Fira Code Nerd Font**
- **Hack Nerd Font**

## tmux

Soma works in tmux. For image support and correct keybindings:

```bash
# ~/.tmux.conf
set -g default-terminal "tmux-256color"
set -ag terminal-overrides ",xterm-256color:RGB"
set -g allow-passthrough on    # required for image display
set -g mouse on
set -s escape-time 0           # no delay on Escape key
```

After editing: `tmux source-file ~/.tmux.conf`

## Shell Aliases

Add to `~/.zshrc` or `~/.bashrc`:

```bash
alias s="soma"
alias sc="soma -c"
alias sr="soma -r"
alias si="soma inhale"
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key (see [Models & Providers](/docs/models)) |
| `VISUAL` or `EDITOR` | External editor for Ctrl+G |

## Windows

Soma works on Windows via Windows Terminal + WSL2 or native Node.js:

```bash
# In WSL2
npm install -g meetsoma
soma
```

## Troubleshooting

### Colors look wrong
- Ensure your terminal supports 256 colors or truecolor
- Try: `echo $TERM` — should be `xterm-256color` or similar
- In tmux: check `terminal-overrides` setting above

### Keybindings not working
- Check for conflicts with your terminal's own shortcuts
- In tmux: `set -s escape-time 0` prevents Escape delay
- See [Keybindings](/docs/keybindings) for customization

### Images not showing
- Use a terminal with image protocol support (iTerm2, Kitty, WezTerm)
- In tmux: enable `allow-passthrough`
- Or disable: `"terminal.showImages": false` in settings
