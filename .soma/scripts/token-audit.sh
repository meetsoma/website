#!/bin/bash
#
# token-audit.sh — Find and replace CSS token usage across Astro/TSX/CSS files.
#
# Usage:
#   ./token-audit.sh scan <token> [dir]           # Find all usages with context
#   ./token-audit.sh plan <token> <replacement>    # Generate a replacement plan (dry run)
#   ./token-audit.sh apply <plan-file>             # Apply a reviewed plan
#
# Examples:
#   ./token-audit.sh scan "--text-base" src/pages
#   ./token-audit.sh plan "--text-base" "--text-md" src/pages > plan.txt
#   # Edit plan.txt — delete lines you want to KEEP unchanged
#   ./token-audit.sh apply plan.txt
#
# Plan format (one per line):
#   file:line:old_value:new_value:context
#   Lines starting with # are skipped (comments)
#   Delete a line = skip that replacement

set -uo pipefail

CMD="${1:-}"
TOKEN="${2:-}"
REPLACEMENT="${3:-}"
DIR="${4:-src}"
# Optional: filter to specific CSS property (font-size, padding, gap, etc.)
PROP_FILTER="${PROP_FILTER:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
DIM='\033[0;90m'
BOLD='\033[1m'
RESET='\033[0m'

scan() {
  local token="$1"
  local dir="$2"
  local count=0

  echo -e "${BOLD}Scanning for: ${CYAN}${token}${RESET} in ${dir}/"
  echo ""

  while IFS=: read -r file line content; do
    count=$((count + 1))
    # Get 2 lines before for context (the CSS selector)
    local ctx=$(sed -n "$((line > 2 ? line - 2 : 1)),${line}p" "$file" | head -3)
    local selector=$(echo "$ctx" | grep -E '^\s*[.:#@\[]' | tail -1 | sed 's/^\s*//' | sed 's/{.*//')

    # Classify: is this likely body text, a label, or UI?
    local classification="?"
    if echo "$selector" | grep -qiE 'desc|subtitle|note|intro|body|paragraph|content'; then
      classification="BODY"
    elif echo "$selector" | grep -qiE 'badge|tag|tier|version|meta|label|glyph|btn|pill|code'; then
      classification="UI/META"
    elif echo "$selector" | grep -qiE 'title|name|heading'; then
      classification="TITLE"
    fi

    printf "${YELLOW}%3d${RESET} ${DIM}%-45s${RESET} ${CYAN}%-10s${RESET} %s\n" \
      "$count" \
      "$(basename "$file"):$line" \
      "[$classification]" \
      "$(echo "$selector" | head -1)"

    # Show the actual line trimmed
    local trimmed=$(echo "$content" | sed 's/^\s*/    /')
    echo -e "    ${trimmed}"
    echo ""
  local prop_grep="${PROP_FILTER:-font-size\|padding\|gap\|margin\|width\|height\|border-radius\|line-height}"
  done < <(rg -n --no-heading -e "$token" "$dir" --glob '*.{astro,tsx,ts,css}' | grep "$prop_grep" | sort)

  echo -e "${BOLD}Total: ${count} matches${RESET}"
}

plan() {
  local token="$1"
  local replacement="$2"
  local dir="$3"

  echo "# Token replacement plan"
  echo "# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "# Find: $token → Replace: $replacement"
  echo "# Delete lines to skip. Lines starting with # are ignored."
  echo "# Format: file:line:old:new:context"
  echo "#"

  while IFS=: read -r file line content; do
    local ctx=$(sed -n "$((line > 2 ? line - 2 : 1)),${line}p" "$file" | head -3)
    local selector=$(echo "$ctx" | grep -E '^\s*[.:#@\[]' | tail -1 | sed 's/^\s*//' | sed 's/{.*//')

    # Auto-comment lines that look like UI/meta (suggest keeping)
    local prefix=""
    if echo "$selector" | grep -qiE 'badge|tag|tier|version|meta|glyph|btn|pill|code|mono'; then
      prefix="# KEEP? "
    fi

    echo "${prefix}${file}:${line}:${token}:${replacement}:$(echo "$selector" | tr -d '\n')"
  local prop_grep="${PROP_FILTER:-font-size}"
  done < <(rg -n --no-heading -e "$token" "$dir" --glob '*.{astro,tsx,ts,css}' | grep "$prop_grep" | sort)
}

apply() {
  local planfile="$1"
  local applied=0
  local skipped=0

  echo -e "${BOLD}Applying plan: ${planfile}${RESET}"
  echo ""

  while IFS= read -r line; do
    # Skip comments and empty lines
    [[ "$line" =~ ^#.*$ ]] && { skipped=$((skipped + 1)); continue; }
    [[ -z "$line" ]] && continue

    local file=$(echo "$line" | cut -d: -f1)
    local lineno=$(echo "$line" | cut -d: -f2)
    local old=$(echo "$line" | cut -d: -f3)
    local new=$(echo "$line" | cut -d: -f4)

    if [ -f "$file" ]; then
      # Verify the line still has the old value
      local current=$(sed -n "${lineno}p" "$file")
      if echo "$current" | grep -q "$old"; then
        sed -i '' "${lineno}s|${old}|${new}|" "$file"
        printf "${GREEN}✓${RESET} %-45s L%-4s ${DIM}%s → %s${RESET}\n" "$(basename "$file")" "$lineno" "$old" "$new"
        applied=$((applied + 1))
      else
        printf "${RED}✗${RESET} %-45s L%-4s ${DIM}line changed since plan was generated${RESET}\n" "$(basename "$file")" "$lineno"
      fi
    fi
  done < "$planfile"

  echo ""
  echo -e "${BOLD}Applied: ${GREEN}${applied}${RESET} ${BOLD}Skipped: ${YELLOW}${skipped}${RESET}"
}

case "$CMD" in
  scan)
    [ -z "$TOKEN" ] && echo "Usage: $0 scan <token> [dir]" && exit 1
    scan "$TOKEN" "${REPLACEMENT:-$DIR}"
    ;;
  plan)
    [ -z "$TOKEN" ] || [ -z "$REPLACEMENT" ] && echo "Usage: $0 plan <token> <replacement> [dir]" && exit 1
    plan "$TOKEN" "$REPLACEMENT" "${4:-src}"
    ;;
  apply)
    [ -z "$TOKEN" ] && echo "Usage: $0 apply <plan-file>" && exit 1
    apply "$TOKEN"
    ;;
  *)
    echo "Usage: $0 {scan|plan|apply} ..."
    echo ""
    echo "  scan  <token> [dir]                  Find all usages with context"
    echo "  plan  <token> <replacement> [dir]     Generate replacement plan (dry run)"
    echo "  apply <plan-file>                     Apply reviewed plan"
    exit 1
    ;;
esac
