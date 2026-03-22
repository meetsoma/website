#!/usr/bin/env bash
# ---
# name: soma-code
# author: meetsoma
# version: 1.0.0
# license: MIT
# tags: [navigation, search, code, grep, map, refactor]
# requires: [bash 4+, grep, sed, awk]
# description: Fast codebase navigator — find, map, refs, structure, and more
# ---
# ═══════════════════════════════════════════════════════════════════════════
# soma-code — fast codebase navigator for shell projects
# ═══════════════════════════════════════════════════════════════════════════
# Usage: soma-code <command> [args]
#
# Commands:
#   find <pattern> [path]       — grep with line numbers, context, file:line format
#   lines <file> <start> [end]  — show exact lines from a file
#   map <file>                  — function/class/method map with line numbers
#   refs <symbol> [path]        — find all references to a symbol
#   replace <file> <line> <old> <new> — replace text on exact line
#   structure [path]            — directory tree with file sizes
#   physics [path]              — (project-specific) find all physics/animation code
#   events [path]               — find all event listeners and dispatchers
#   css-vars [path]             — find all CSS custom property definitions and usages
#   config [path]               — find all config/options/settings objects
#
# Related muscles: code-navigator, window-manager, soma-os-arch, css-theme-engine
# Related scripts: soma-refactor.sh, soma-find.sh
#
# MLR breadcrumb (s01-7631fc):
# You built this. It has 17 uses logged. It works (verified 11/11).
# When you reach for `grep -rn`, STOP. Use `soma-code.sh find` instead.
# When you want to understand a file before editing, use `map` first.
# Heat = fluency. Use this tool to stay fluent. Trust past work.
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Theme ──
source "$(dirname "$0")/soma-theme.sh" 2>/dev/null || {
  SOMA_BOLD='\033[1m'; SOMA_DIM='\033[2m'; SOMA_NC='\033[0m'
  SOMA_GREEN='\033[0;32m'; SOMA_YELLOW='\033[0;33m'; SOMA_CYAN='\033[0;36m'
}

SHELL_DIR="${SOMA_SHELL_DIR:-$(pwd)}"
RED='\033[0;31m'
GREEN='\033[0;32m'
DIM='\033[0;90m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
NC='\033[0m'

# ── Helpers ──

header() { echo -e "\n${BOLD}$1${NC}"; }
dim() { echo -e "${DIM}$1${NC}"; }
hit() { echo -e "${CYAN}$1${NC}:${YELLOW}$2${NC}: $3"; }

# ── Commands ──

cmd_find() {
  local pattern="${1:?pattern required}"
  local path="${2:-$SHELL_DIR}"
  local ext="${3:-js,css,html}"

  header "🔍 find: '$pattern' in $path"
  # Build include args
  local includes=""
  IFS=',' read -ra EXTS <<< "$ext"
  for e in "${EXTS[@]}"; do
    includes="$includes --include=*.${e}"
  done

  grep -rn $includes --color=never "$pattern" "$path" 2>/dev/null | while IFS=: read -r file line content; do
    local rel="${file#$SHELL_DIR/}"
    hit "$rel" "$line" "$(echo "$content" | sed 's/^[[:space:]]*//')"
  done
  echo ""
  dim "$(grep -rn $includes --color=never "$pattern" "$path" 2>/dev/null | wc -l | tr -d ' ') matches"
}

cmd_lines() {
  local file="${1:?file required}"
  [[ ! "$file" = /* ]] && file="$SHELL_DIR/$file"
  local start="${2:?start line required}"
  local end="${3:-}"
  [[ -z "$end" ]] && end=$((start + 20))

  header "lines ${file#$SHELL_DIR/} $start-$end"
  awk -v s="$start" -v e="$end" 'NR>=s && NR<=e { printf "\033[0;33m%4d\033[0m │ %s\n", NR, $0 }' "$file"
}

cmd_map() {
  local file="${1:?file required}"
  [[ ! "$file" = /* ]] && file="$SHELL_DIR/$file"
  local ext="${file##*.}"

  header "🗺️  map: ${file#$SHELL_DIR/}"

  if [[ "$ext" == "js" || "$ext" == "ts" || "$ext" == "tsx" || "$ext" == "jsx" ]]; then
    # Functions, classes, methods, arrow functions, const assignments, interfaces, types
    awk '
      /^export (class|function|const|let|var|interface|type|enum|abstract) / { printf "\033[0;33m%4d\033[0m │ \033[1m%s\033[0m\n", NR, $0; next }
      /^(class|function|interface|type|enum|abstract) / { printf "\033[0;33m%4d\033[0m │ \033[1m%s\033[0m\n", NR, $0; next }
      /^const [A-Z]/ { printf "\033[0;33m%4d\033[0m │ \033[1m%s\033[0m\n", NR, $0; next }
      /^export default / { printf "\033[0;33m%4d\033[0m │ \033[1m%s\033[0m\n", NR, $0; next }
      /^  [a-zA-Z_]+\(/ { printf "\033[0;33m%4d\033[0m │   \033[0;36m%s\033[0m\n", NR, $0; next }
      /^  (get |set |async )[a-zA-Z]/ { printf "\033[0;33m%4d\033[0m │   \033[0;36m%s\033[0m\n", NR, $0; next }
      /^  _[a-zA-Z_]+\(/ { printf "\033[0;33m%4d\033[0m │   \033[0;90m%s\033[0m\n", NR, $0; next }
      /registerApp\(/ { printf "\033[0;33m%4d\033[0m │ \033[0;32m%s\033[0m\n", NR, $0; next }
      /^export function / { printf "\033[0;33m%4d\033[0m │ \033[1m%s\033[0m\n", NR, $0; next }
    ' "$file"
  elif [[ "$ext" == "sh" || "$ext" == "bash" ]]; then
    # Functions, case labels, section comments
    awk '
      /^[a-zA-Z_][a-zA-Z0-9_-]*\(\)/ { printf "\033[0;33m%4d\033[0m │ \033[1m%s\033[0m\n", NR, $0; next }
      /^  [a-zA-Z_][a-zA-Z0-9_|-]*\)/ { printf "\033[0;33m%4d\033[0m │   \033[0;36m%s\033[0m\n", NR, $0; next }
      /^# ──/ || /^# ══/ { printf "\033[0;33m%4d\033[0m │ \033[0;90m%s\033[0m\n", NR, $0; next }
      /^CMD=/ || /^case / { printf "\033[0;33m%4d\033[0m │ \033[1m%s\033[0m\n", NR, $0; next }
    ' "$file"
  elif [[ "$ext" == "css" ]]; then
    # Selectors and @-rules
    awk '
      /^[.#@:[]/ { printf "\033[0;33m%4d\033[0m │ %s\n", NR, $0 }
      /^\/\* ──/ || /^\/\* ══/ { printf "\033[0;33m%4d\033[0m │ \033[0;90m%s\033[0m\n", NR, $0 }
    ' "$file"
  fi

  dim "$(wc -l < "$file" | tr -d ' ') total lines"
}

cmd_refs() {
  local symbol="${1:?symbol required}"
  local path="${2:-$SHELL_DIR}"

  header "🔗 refs: '$symbol'"
  grep -rn --include='*.js' --include='*.css' --include='*.html' --color=never "$symbol" "$path" 2>/dev/null | while IFS=: read -r file line content; do
    local rel="${file#$SHELL_DIR/}"
    local trimmed="$(echo "$content" | sed 's/^[[:space:]]*//')"
    # Classify: definition vs usage
    if echo "$trimmed" | grep -qE "^(export |const |let |var |function |class |  ${symbol}\(|  _?${symbol}\()"; then
      echo -e "${GREEN}DEF${NC}  ${CYAN}$rel${NC}:${YELLOW}$line${NC}: $trimmed"
    else
      echo -e "${DIM}USE${NC}  ${CYAN}$rel${NC}:${YELLOW}$line${NC}: $trimmed"
    fi
  done
  echo ""
  dim "$(grep -rn --include='*.js' --include='*.css' --include='*.html' --color=never "$symbol" "$path" 2>/dev/null | wc -l | tr -d ' ') total refs"
}

cmd_replace() {
  local file="${1:?file required}"
  [[ ! "$file" = /* ]] && file="$SHELL_DIR/$file"
  local line="${2:?line number required}"
  local old="${3:?old text required}"
  local new="${4:?new text required}"

  # Show before
  echo -e "${RED}OLD${NC} line $line: $(awk -v n="$line" 'NR==n' "$file")"

  # Replace using sed (line-specific)
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' "${line}s|${old}|${new}|" "$file"
  else
    sed -i "${line}s|${old}|${new}|" "$file"
  fi

  echo -e "${GREEN}NEW${NC} line $line: $(awk -v n="$line" 'NR==n' "$file")"
}

cmd_structure() {
  local path="${1:-$SHELL_DIR}"
  header "📁 structure: $path"
  find "$path" -maxdepth 2 \( -name '*.js' -o -name '*.css' -o -name '*.html' \) -exec ls -lh {} \; 2>/dev/null | \
    awk '{ printf "\033[0;33m%6s\033[0m  %s\n", $5, $NF }' | sort -t/ -k2
}

cmd_physics() {
  local path="${1:-$SHELL_DIR}"
  header "⚡ physics/animation code"
  echo ""

  dim "── Spring / Damping / Velocity ──"
  grep -rn --include='*.js' --color=never \
    -E "(damping|springK|velocity|momentum|bounce|rubber|resistance|friction|settle|snap|physics|edgeDamping|edgeResistance)" \
    "$path" 2>/dev/null | while IFS=: read -r file line content; do
    local rel="${file#$SHELL_DIR/}"
    hit "$rel" "$line" "$(echo "$content" | sed 's/^[[:space:]]*//')"
  done

  echo ""
  dim "── requestAnimationFrame / transitions ──"
  grep -rn --include='*.js' --include='*.css' --color=never \
    -E "(requestAnimationFrame|cancelAnimationFrame|transition:|animation:|@keyframes|will-change)" \
    "$path" 2>/dev/null | while IFS=: read -r file line content; do
    local rel="${file#$SHELL_DIR/}"
    hit "$rel" "$line" "$(echo "$content" | sed 's/^[[:space:]]*//')"
  done

  echo ""
  dim "── Scroll / Transform ──"
  grep -rn --include='*.js' --include='*.css' --color=never \
    -E "(scrollX|scrollY|scrollVelocity|targetScroll|translateX|translateY|transform:)" \
    "$path" 2>/dev/null | while IFS=: read -r file line content; do
    local rel="${file#$SHELL_DIR/}"
    hit "$rel" "$line" "$(echo "$content" | sed 's/^[[:space:]]*//')"
  done
}

cmd_events() {
  local path="${1:-$SHELL_DIR}"
  header "📡 events"

  dim "── addEventListener ──"
  grep -rn --include='*.js' --color=never "addEventListener" "$path" 2>/dev/null | while IFS=: read -r file line content; do
    local rel="${file#$SHELL_DIR/}"
    local event="$(echo "$content" | grep -o "'[^']*'" | head -1)"
    hit "$rel" "$line" "on ${event:-?}"
  done

  echo ""
  dim "── dispatchEvent / CustomEvent / _emit ──"
  grep -rn --include='*.js' --color=never -E "(dispatchEvent|CustomEvent|_emit\()" "$path" 2>/dev/null | while IFS=: read -r file line content; do
    local rel="${file#$SHELL_DIR/}"
    hit "$rel" "$line" "$(echo "$content" | sed 's/^[[:space:]]*//')"
  done
}

cmd_css_vars() {
  local path="${1:-$SHELL_DIR}"
  header "🎨 CSS custom properties"

  dim "── Definitions (--var: value) ──"
  grep -rn --include='*.css' --color=never -E "^\s+--[a-z]" "$path" 2>/dev/null | while IFS=: read -r file line content; do
    local rel="${file#$SHELL_DIR/}"
    hit "$rel" "$line" "$(echo "$content" | sed 's/^[[:space:]]*//')"
  done

  echo ""
  dim "── Usages (var(--...)) ──"
  grep -rn --include='*.css' --include='*.js' --color=never -o "var(--[a-z][a-z0-9-]*" "$path" 2>/dev/null | \
    sed 's/var(//' | sort -u | while read -r var; do
    echo -e "  ${CYAN}$var${NC}"
  done
}

cmd_config() {
  local path="${1:-$SHELL_DIR}"
  header "⚙️  config/options objects"
  grep -rn --include='*.js' --color=never \
    -E "(CONFIG\.|this\.opts\.|\.opts\s*=|options\.|setOptions)" \
    "$path" 2>/dev/null | while IFS=: read -r file line content; do
    local rel="${file#$SHELL_DIR/}"
    hit "$rel" "$line" "$(echo "$content" | sed 's/^[[:space:]]*//')"
  done
}

# ── Main ──

cmd="${1:-help}"
shift 2>/dev/null || true


# ── tsc-errors: parse TypeScript errors with context ──
# Usage: soma-code.sh tsc-errors [path]
# Runs tsc --noEmit, parses errors, shows surrounding code for each
tsc_errors() {
  local dir="${1:-.}"
  cd "$dir" || return 1
  
  echo -e "\n\033[1m🔍 TypeScript Errors: $dir\033[0m"
  
  local errors
  errors=$(npx tsc --noEmit 2>&1 | grep "error TS" || true)
  
  if [ -z "$errors" ]; then
    echo "  ✅ No type errors"
    return 0
  fi
  
  local count
  count=$(echo "$errors" | wc -l | tr -d ' ')
  echo "  ❌ $count errors"
  echo ""
  
  # Parse each error and show context
  echo "$errors" | while IFS= read -r line; do
    # Extract file:line:col and message
    local file=$(echo "$line" | sed 's/(\([0-9]*\),.*//' )
    local lineno=$(echo "$line" | sed 's/.*(\([0-9]*\),.*/\1/')
    local msg=$(echo "$line" | sed 's/.*: error //')
    
    echo -e "  \033[0;31m$file:$lineno\033[0m"
    echo -e "  \033[0;33m$msg\033[0m"
    
    # Show 3 lines of context
    if [ -f "$file" ]; then
      local start=$((lineno - 1))
      [ "$start" -lt 1 ] && start=1
      local end=$((lineno + 1))
      sed -n "${start},${end}p" "$file" | while IFS= read -r codeline; do
        if [ "$start" -eq "$lineno" ]; then
          echo -e "  \033[0;31m→ $start │ $codeline\033[0m"
        else
          echo -e "    $start │ $codeline"
        fi
        start=$((start + 1))
      done
    fi
    echo ""
  done
}

case "$cmd" in
  find)      cmd_find "$@" ;;
  lines)     cmd_lines "$@" ;;
  map)       cmd_map "$@" ;;
  refs)      cmd_refs "$@" ;;
  replace)   cmd_replace "$@" ;;
  structure) cmd_structure "$@" ;;
  physics)   cmd_physics "$@" ;;
  events)    cmd_events "$@" ;;
  css-vars)  cmd_css_vars "$@" ;;
  config)    cmd_config "$@" ;;
  tsc-errors) tsc_errors "$@" ;;
  help|*)
    echo ""
    echo -e "  ${SOMA_CYAN}σ${SOMA_NC} ${SOMA_BOLD}soma-code${SOMA_NC} ${SOMA_DIM}— fast codebase navigator${SOMA_NC}"
    echo -e "  ${SOMA_DIM}──────────────────────────────────────${SOMA_NC}"
    echo ""
    echo -e "  ${SOMA_GREEN}find${SOMA_NC} <pattern> [path] [ext]     ${SOMA_DIM}grep with line:col format${SOMA_NC}"
    echo -e "  ${SOMA_GREEN}lines${SOMA_NC} <file> <start> [end]      ${SOMA_DIM}show exact lines${SOMA_NC}"
    echo -e "  ${SOMA_GREEN}map${SOMA_NC} <file>                      ${SOMA_DIM}function/class map${SOMA_NC}"
    echo -e "  ${SOMA_GREEN}refs${SOMA_NC} <symbol> [path]            ${SOMA_DIM}all references (def vs use)${SOMA_NC}"
    echo -e "  ${SOMA_GREEN}replace${SOMA_NC} <file> <ln> <old> <new> ${SOMA_DIM}line-specific replace${SOMA_NC}"
    echo -e "  ${SOMA_GREEN}structure${SOMA_NC} [path]                ${SOMA_DIM}file tree with sizes${SOMA_NC}"
    echo -e "  ${SOMA_GREEN}events${SOMA_NC} [path]                   ${SOMA_DIM}event listeners/dispatchers${SOMA_NC}"
    echo -e "  ${SOMA_GREEN}css-vars${SOMA_NC} [path]                 ${SOMA_DIM}CSS custom property audit${SOMA_NC}"
    echo -e "  ${SOMA_GREEN}config${SOMA_NC} [path]                   ${SOMA_DIM}config/options objects${SOMA_NC}"
    echo -e "  ${SOMA_GREEN}tsc-errors${SOMA_NC} [path]               ${SOMA_DIM}TypeScript errors with context${SOMA_NC}"
    echo ""
    echo -e "  ${SOMA_DIM}MIT © meetsoma${SOMA_NC}"
    echo ""
    ;;
esac
