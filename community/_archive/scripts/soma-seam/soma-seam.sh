#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# soma-seam.sh — Trace concepts through memory, code, and sessions
# ═══════════════════════════════════════════════════════════════════════════
#
# Graph query layer over .soma/ flat files. Follows seams, tags, seeds,
# and code references to build a connection matrix.
#
# MLR breadcrumb (s01-7631fc):
# This script was born from gap-wanting — the need existed before the tool did.
# It went from gap → idea → script in one session (fastest spiral possible).
# Currently at spiral level 2 (scripted). Next revolution: level 3 (persistent —
# auto-run on exhale, save webs, diff over time). Then level 4 (automated —
# the system traces its own evolution without being asked).
#
# Fixed: `seeds` now uses temp files instead of declare -A (works on macOS bash 3.2).
# `web` connection graph empty (trap cleans tmpdir before subshell reads it).
#
# The seam hash IS a timestamp of co-occurrence. Two documents sharing a seam
# means "these ideas were in the same mind at the same time." That's memory.
#
# Commands:
#   trace <term>              Follow a concept through everything
#   graph <seam-hash>         Map everything connected to a session
#   matrix <tag> [--depth N]  Build connection matrix (default depth: 1)
#   timeline [--tag TAG]      Chronological evolution of a concept
#   code <pattern>            Code + the ideas/plans that reference it
#   seeds [--unplanted]       Find seeds that haven't become plans
#   gaps                      Find orphan documents (no seams, no tags)
#
# Related muscles: self-analysis, chain-of-thought
# Related scripts: soma-reflect.sh, soma-query.sh, soma-code.sh

set -euo pipefail

# ── Theme ──
_sd="$(dirname "$0")"
if [ -f "$_sd/soma-theme.sh" ]; then source "$_sd/soma-theme.sh"; fi
SOMA_BOLD="${SOMA_BOLD:-\033[1m}"; SOMA_DIM="${SOMA_DIM:-\033[2m}"; SOMA_NC="${SOMA_NC:-\033[0m}"; SOMA_CYAN="${SOMA_CYAN:-\033[0;36m}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOMA_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROJECT_ROOT="$(cd "$SOMA_DIR/.." && pwd)"
AGENT_DIR="$PROJECT_ROOT/repos/agent"

# Colors
BOLD="\033[1m"
DIM="\033[2m"
CYAN="\033[0;36m"
YELLOW="\033[0;33m"
GREEN="\033[0;32m"
RED="\033[0;31m"
MAGENTA="\033[0;35m"
RESET="\033[0m"

CMD="${1:-help}"
shift 2>/dev/null || true

# ─── Helpers ──────────────────────────────────────────────────────────────

# Extract YAML frontmatter field (simple — single line values and arrays)
frontmatter_field() {
  local file="$1" field="$2"
  sed -n '/^---$/,/^---$/p' "$file" 2>/dev/null | grep "^${field}:" | sed "s/^${field}:\s*//"
}

# Extract tags from frontmatter (handles [a, b, c] format)
frontmatter_list() {
  local file="$1" field="$2"
  frontmatter_field "$file" "$field" | tr -d '[]' | tr ',' '\n' | sed 's/^ *//' | sed 's/ *$//' | grep -v '^$'
}

# Find all .md files in .soma (excluding archives and node_modules)
soma_docs() {
  find "$SOMA_DIR" -name "*.md" \
    -not -path "*/_archive/*" \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    2>/dev/null
}

# Find all .md files in repos/agent
agent_docs() {
  find "$AGENT_DIR" -name "*.md" \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    -not -path "*/_archive/*" \
    2>/dev/null
}

# Relative path from project root
relpath() {
  echo "$1" | sed "s|$PROJECT_ROOT/||"
}

# ─── TRACE ────────────────────────────────────────────────────────────────

trace() {
  local term="${1:?Usage: soma-seam.sh trace <term>}"
  local term_lower=$(echo "$term" | tr '[:upper:]' '[:lower:]')

  echo -e "${BOLD}═══ Trace: \"$term\" ═══${RESET}"
  echo ""

  # Documents that mention this term in content or frontmatter
  echo -e "${CYAN}── Documents ──${RESET}"
  local doc_count=0
  while IFS= read -r file; do
    # Check content + frontmatter
    if grep -qil "$term" "$file" 2>/dev/null; then
      local rel=$(relpath "$file")
      local type=$(frontmatter_field "$file" "type")
      local status=$(frontmatter_field "$file" "status")
      local seams=$(frontmatter_field "$file" "seams")
      echo -e "  ${BOLD}$(relpath "$file")${RESET}  ${DIM}(${type:-?}, ${status:-?})${RESET}"

      # Show matching lines with line numbers (max 3)
      grep -n -i "$term" "$file" 2>/dev/null | head -3 | while IFS= read -r match; do
        local linenum=$(echo "$match" | cut -d: -f1)
        local content=$(echo "$match" | cut -d: -f2- | sed 's/^[ ]*//' | cut -c1-80)
        echo -e "    ${DIM}→ L${linenum}: ${content}${RESET}"
      done

      if [[ -n "$seams" ]]; then
        echo -e "    ${DIM}seams: ${seams}${RESET}"
      fi
      doc_count=$((doc_count + 1))
    fi
  done < <(soma_docs)
  echo -e "  ${DIM}($doc_count documents)${RESET}"
  echo ""

  # Code references
  echo -e "${YELLOW}── Code ──${RESET}"
  local code_count=0
  if [[ -d "$AGENT_DIR" ]]; then
    while IFS= read -r match; do
      local file=$(echo "$match" | cut -d: -f1)
      local linenum=$(echo "$match" | cut -d: -f2)
      local content=$(echo "$match" | cut -d: -f3- | sed 's/^[ ]*//' | cut -c1-80)
      echo -e "  ${YELLOW}$(relpath "$file"):${linenum}${RESET}  ${DIM}${content}${RESET}"
      code_count=$((code_count + 1))
    done < <(grep -rn -i "$term" "$AGENT_DIR" \
      --include="*.ts" --include="*.js" --include="*.json" \
      2>/dev/null | grep -v node_modules | grep -v '.git/' | head -15)
  fi
  echo -e "  ${DIM}($code_count code references)${RESET}"
  echo ""

  # Sessions that mention this term
  echo -e "${GREEN}── Sessions ──${RESET}"
  local session_count=0
  for f in "$SOMA_DIR"/memory/sessions/*.md; do
    [[ -f "$f" ]] || continue
    if grep -qil "$term" "$f" 2>/dev/null; then
      local name=$(basename "$f" .md)
      local first_match=$(grep -n -i "$term" "$f" 2>/dev/null | head -1)
      local linenum=$(echo "$first_match" | cut -d: -f1)
      local content=$(echo "$first_match" | cut -d: -f2- | sed 's/^[ ]*//' | cut -c1-60)
      echo -e "  ${GREEN}${name}${RESET}  ${DIM}L${linenum}: ${content}${RESET}"
      session_count=$((session_count + 1))
    fi
  done
  echo -e "  ${DIM}($session_count sessions)${RESET}"
  echo ""

  # Seeds that reference this term
  echo -e "${MAGENTA}── Seeds (forward pointers) ──${RESET}"
  while IFS= read -r file; do
    local seeds=$(frontmatter_field "$file" "seeds")
    if echo "$seeds" | grep -qi "$term" 2>/dev/null; then
      echo -e "  ${MAGENTA}→ $(relpath "$file")${RESET}  ${DIM}seeds: ${seeds}${RESET}"
    fi
  done < <(soma_docs)
  echo ""
}

# ─── GRAPH ────────────────────────────────────────────────────────────────

graph() {
  local seam="${1:?Usage: soma-seam.sh graph <seam-hash>}"

  echo -e "${BOLD}═══ Seam Graph: ${seam} ═══${RESET}"
  echo ""

  # Find the session log
  local session_file=""
  for f in "$SOMA_DIR"/memory/sessions/*"${seam}"*.md; do
    [[ -f "$f" ]] && session_file="$f" && break
  done

  if [[ -n "$session_file" ]]; then
    echo -e "${GREEN}Session: $(relpath "$session_file")${RESET}"
    # Count sections
    local sections=$(grep -c '^## ' "$session_file" 2>/dev/null || echo 0)
    echo -e "  ${DIM}${sections} sections${RESET}"
  else
    echo -e "${DIM}No session log found for ${seam}${RESET}"
  fi
  echo ""

  # Documents that reference this seam
  echo -e "${CYAN}── Documents referencing this seam ──${RESET}"
  local ref_count=0
  while IFS= read -r file; do
    local seams=$(frontmatter_field "$file" "seams")
    local origin=$(frontmatter_field "$file" "origin")
    if echo "$seams $origin" | grep -q "$seam" 2>/dev/null; then
      local type=$(frontmatter_field "$file" "type")
      echo -e "  ${BOLD}$(relpath "$file")${RESET}  ${DIM}(${type:-?})${RESET}"
      ref_count=$((ref_count + 1))
    fi
  done < <(soma_docs)
  echo -e "  ${DIM}($ref_count documents)${RESET}"
  echo ""

  # Commits from this session (search session log for commit hashes)
  if [[ -n "$session_file" ]]; then
    echo -e "${YELLOW}── Commits ──${RESET}"
    grep -oE '[a-f0-9]{7,8}' "$session_file" 2>/dev/null | sort -u | while read -r hash; do
      # Verify it's a real commit
      local msg=$(cd "$AGENT_DIR" && git log --oneline -1 "$hash" 2>/dev/null)
      if [[ -n "$msg" ]]; then
        echo -e "  ${YELLOW}${msg}${RESET}"
      fi
    done
    echo ""
  fi

  # Seeds planted in documents from this session
  echo -e "${MAGENTA}── Seeds planted ──${RESET}"
  while IFS= read -r file; do
    local seams=$(frontmatter_field "$file" "seams")
    local origin=$(frontmatter_field "$file" "origin")
    if echo "$seams $origin" | grep -q "$seam" 2>/dev/null; then
      local seeds=$(frontmatter_field "$file" "seeds")
      if [[ -n "$seeds" && "$seeds" != "[]" ]]; then
        echo -e "  ${MAGENTA}$(relpath "$file")${RESET} → ${DIM}${seeds}${RESET}"
      fi
    fi
  done < <(soma_docs)
  echo ""
}

# ─── MATRIX ───────────────────────────────────────────────────────────────

matrix() {
  local tag="${1:?Usage: soma-seam.sh matrix <tag> [--depth N]}"
  shift
  local depth=1
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --depth) depth="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  echo -e "${BOLD}═══ Matrix: \"$tag\" (depth $depth) ═══${RESET}"
  echo ""

  # Level 0: direct tag matches
  echo -e "${CYAN}Level 0: direct matches${RESET}"
  local level0_files=()
  while IFS= read -r file; do
    local tags=$(frontmatter_field "$file" "tags")
    local triggers=$(frontmatter_field "$file" "triggers")
    if echo "$tags $triggers" | grep -qi "$tag" 2>/dev/null; then
      echo -e "  ${BOLD}$(relpath "$file")${RESET}"
      level0_files+=("$file")
    fi
  done < <(soma_docs)
  echo ""

  # Level 1+: follow seams, related, reads
  if [[ $depth -ge 1 && ${#level0_files[@]} -gt 0 ]]; then
    echo -e "${CYAN}Level 1: connected via seams/related/reads${RESET}"
    local seen=()
    for file in "${level0_files[@]}"; do
      local related=$(frontmatter_field "$file" "related")
      local seams=$(frontmatter_field "$file" "seams")
      local reads_muscles=$(frontmatter_list "$file" "reads" 2>/dev/null | head -5)

      # Follow related
      if [[ -n "$related" ]]; then
        echo "$related" | tr -d '[]' | tr ',' '\n' | sed 's/^ *//' | while read -r ref; do
          [[ -z "$ref" ]] && continue
          # Try to find the file
          local found=$(find "$SOMA_DIR" "$AGENT_DIR" -path "*${ref}*" -name "*.md" 2>/dev/null | head -1)
          if [[ -n "$found" ]]; then
            echo -e "  ${DIM}← $(relpath "$file")${RESET}"
            echo -e "    ${BOLD}$(relpath "$found")${RESET}"
          else
            echo -e "  ${DIM}← $(relpath "$file") → ${ref} (not resolved)${RESET}"
          fi
        done
      fi

      # Follow seam hashes to session logs
      if [[ -n "$seams" ]]; then
        echo "$seams" | tr -d '[]' | tr ',' '\n' | sed 's/^ *//' | while read -r seam; do
          [[ -z "$seam" ]] && continue
          local session=$(find "$SOMA_DIR/memory/sessions" -name "*${seam}*" 2>/dev/null | head -1)
          if [[ -n "$session" ]]; then
            echo -e "  ${GREEN}↔ $(basename "$session" .md)${RESET}"
          fi
        done
      fi
    done
    echo ""
  fi
}

# ─── CODE ─────────────────────────────────────────────────────────────────

code_trace() {
  local pattern="${1:?Usage: soma-seam.sh code <pattern>}"

  echo -e "${BOLD}═══ Code + Context: \"$pattern\" ═══${RESET}"
  echo ""

  # Code matches
  echo -e "${YELLOW}── Code ──${RESET}"
  if [[ -d "$AGENT_DIR" ]]; then
    grep -rn -i "$pattern" "$AGENT_DIR" \
      --include="*.ts" --include="*.js" \
      2>/dev/null | grep -v node_modules | grep -v '.git/' | head -20 | while IFS= read -r match; do
      local file=$(echo "$match" | cut -d: -f1)
      local linenum=$(echo "$match" | cut -d: -f2)
      local content=$(echo "$match" | cut -d: -f3- | sed 's/^[ ]*//' | cut -c1-80)
      echo -e "  ${YELLOW}$(relpath "$file"):${linenum}${RESET}  ${DIM}${content}${RESET}"
    done
  fi
  echo ""

  # Documents that reference this pattern (plans, ideas, MAPs)
  echo -e "${CYAN}── Plans/Ideas referencing this code ──${RESET}"
  while IFS= read -r file; do
    if grep -qil "$pattern" "$file" 2>/dev/null; then
      local type=$(frontmatter_field "$file" "type")
      [[ "$type" == "log" ]] && continue  # skip session logs
      local first=$(grep -n -i "$pattern" "$file" 2>/dev/null | head -1)
      local linenum=$(echo "$first" | cut -d: -f1)
      local content=$(echo "$first" | cut -d: -f2- | sed 's/^[ ]*//' | cut -c1-60)
      echo -e "  ${BOLD}$(relpath "$file")${RESET}  ${DIM}L${linenum}: ${content}${RESET}"
    fi
  done < <(soma_docs)
  echo ""

  # Sessions where this was worked on
  echo -e "${GREEN}── Sessions ──${RESET}"
  for f in "$SOMA_DIR"/memory/sessions/*.md; do
    [[ -f "$f" ]] || continue
    if grep -qil "$pattern" "$f" 2>/dev/null; then
      echo -e "  ${GREEN}$(basename "$f" .md)${RESET}"
    fi
  done
  echo ""
}

# ─── SEEDS ────────────────────────────────────────────────────────────────

seeds() {
  local unplanted_only=false
  [[ "${1:-}" == "--unplanted" ]] && unplanted_only=true

  echo -e "${BOLD}═══ Seeds ═══${RESET}"
  echo ""

  # Collect all seeds from all documents using temp files (macOS bash 3.2 compatible)
  local seed_dir=$(mktemp -d)
  trap "rm -rf '$seed_dir'" RETURN

  while IFS= read -r file; do
    local seeds_list=$(frontmatter_list "$file" "seeds")
    while IFS= read -r seed; do
      [[ -z "$seed" ]] && continue
      # Use sanitized seed name as filename, append source
      local safe_name=$(echo "$seed" | tr ' /.:' '____')
      echo "$seed" > "$seed_dir/${safe_name}.name"
      echo "$(relpath "$file")" >> "$seed_dir/${safe_name}.sources"
    done <<< "$seeds_list"
  done < <(soma_docs)

  # Process each seed
  for name_file in "$seed_dir"/*.name; do
    [[ -f "$name_file" ]] || continue
    local seed=$(cat "$name_file")
    local base="${name_file%.name}"
    local sources_file="${base}.sources"

    # Check if seed has become a plan/project
    local has_plan=$(find "$SOMA_DIR/docs" "$SOMA_DIR/amps" -name "*${seed}*" 2>/dev/null | head -1)

    if $unplanted_only && [[ -n "$has_plan" ]]; then
      continue
    fi

    if [[ -n "$has_plan" ]]; then
      echo -e "  ${GREEN}✓ ${seed}${RESET}  → $(relpath "$has_plan")"
    else
      echo -e "  ${MAGENTA}○ ${seed}${RESET}  ${DIM}(unplanted)${RESET}"
    fi

    if [[ -f "$sources_file" ]]; then
      sort -u "$sources_file" | while read -r src; do
        echo -e "    ${DIM}← ${src}${RESET}"
      done
    fi
  done
  echo ""
}

# ─── GAPS ─────────────────────────────────────────────────────────────────

gaps() {
  echo -e "${BOLD}═══ Orphan Documents (no seams, no tags) ═══${RESET}"
  echo ""

  local orphan_count=0
  while IFS= read -r file; do
    local tags=$(frontmatter_field "$file" "tags")
    local seams=$(frontmatter_field "$file" "seams")
    local type=$(frontmatter_field "$file" "type")

    # Skip if it has connections
    [[ -n "$tags" && "$tags" != "[]" ]] && continue
    [[ -n "$seams" && "$seams" != "[]" ]] && continue

    # Skip session logs (they connect via content, not frontmatter)
    [[ "$type" == "log" ]] && continue

    echo -e "  ${RED}$(relpath "$file")${RESET}  ${DIM}(${type:-?})${RESET}"
    orphan_count=$((orphan_count + 1))
  done < <(soma_docs)

  echo ""
  echo -e "  ${DIM}${orphan_count} orphan documents${RESET}"
}

# ─── TIMELINE ─────────────────────────────────────────────────────────────

timeline() {
  local filter_tag=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --tag) filter_tag="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  echo -e "${BOLD}═══ Timeline${filter_tag:+ ($filter_tag)} ═══${RESET}"
  echo ""

  # Collect all documents with dates, optionally filtered by tag
  while IFS= read -r file; do
    local created=$(frontmatter_field "$file" "created")
    [[ -z "$created" ]] && continue

    if [[ -n "$filter_tag" ]]; then
      local tags=$(frontmatter_field "$file" "tags")
      local triggers=$(frontmatter_field "$file" "triggers")
      echo "$tags $triggers" | grep -qi "$filter_tag" 2>/dev/null || continue
    fi

    local type=$(frontmatter_field "$file" "type")
    local seams=$(frontmatter_field "$file" "seams")
    local status=$(frontmatter_field "$file" "status")

    echo -e "${DIM}${created}${RESET}  ${BOLD}$(relpath "$file")${RESET}"
    echo -e "  ${DIM}type: ${type:-?} | status: ${status:-?}${RESET}"
    [[ -n "$seams" && "$seams" != "[]" ]] && echo -e "  ${DIM}seams: ${seams}${RESET}"
  done < <(soma_docs | sort) | sort
  echo ""
}

# ─── WEB ──────────────────────────────────────────────────────────────────

web() {
  local term="${1:?Usage: soma-seam.sh web <term> [--output FILE]}"
  shift
  local output=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --output|-o) output="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  if [[ -z "$output" ]]; then
    local safe_term=$(echo "$term" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
    output="$SOMA_DIR/memory/webs/web-${safe_term}-$(date +%Y-%m-%d).md"
  fi
  mkdir -p "$(dirname "$output")"

  local tmpdir=$(mktemp -d)
  trap "rm -rf $tmpdir" EXIT

  {
    echo "---"
    echo "type: note"
    echo "status: active"
    echo "created: $(date +%Y-%m-%d)"
    echo "tags: [web, seam-trace, auto-generated]"
    echo "generated-by: soma-seam.sh web"
    echo "term: \"$term\""
    echo "---"
    echo ""
    echo "# Memory Web: \"$term\""
    echo ""
    echo "> Auto-generated $(date '+%Y-%m-%d %H:%M'). Traces \`$term\` through all .soma/ documents, code, and sessions."
    echo ""

    # ── Documents ──
    echo "## Documents"
    echo ""

    local doc_count=0
    while IFS= read -r file; do
      if grep -qil "$term" "$file" 2>/dev/null; then
        local rel=$(relpath "$file")
        local type=$(frontmatter_field "$file" "type")
        local status=$(frontmatter_field "$file" "status")
        local created=$(frontmatter_field "$file" "created")
        local seams=$(frontmatter_field "$file" "seams")
        local seeds=$(frontmatter_field "$file" "seeds")

        # Skip session logs (covered in timeline), debug dumps, and archives
        case "$rel" in
          *debug/system-prompt*) continue ;;
        esac

        echo "### \`$rel\`"
        echo ""
        [[ -n "$created" ]] && echo "- **Created:** $created"
        [[ -n "$type" ]] && echo "- **Type:** $type"
        [[ -n "$status" ]] && echo "- **Status:** $status"
        [[ -n "$seams" && "$seams" != "[]" ]] && echo "- **Seams:** $seams"
        [[ -n "$seeds" && "$seeds" != "[]" ]] && echo "- **Seeds:** $seeds"

        echo "- **Matches:**"
        grep -n -i "$term" "$file" 2>/dev/null | head -3 | while IFS= read -r match; do
          local linenum=$(echo "$match" | cut -d: -f1)
          local content=$(echo "$match" | cut -d: -f2- | sed 's/^[ ]*//' | cut -c1-90)
          echo "  - L${linenum}: \`${content}\`"
        done
        echo ""
        doc_count=$((doc_count + 1))
      fi
    done < <(soma_docs | grep -v '/debug/' | sort)

    echo "**Total: $doc_count documents**"
    echo ""

    # ── Code ──
    echo "## Code References"
    echo ""
    echo "| File | Line | Content |"
    echo "|------|------|---------|"
    if [[ -d "$AGENT_DIR" ]]; then
      grep -rn -i "$term" "$AGENT_DIR" \
        --include="*.ts" --include="*.js" \
        2>/dev/null | grep -v node_modules | grep -v '.git/' | head -25 | while IFS= read -r match; do
        local file=$(echo "$match" | cut -d: -f1)
        local linenum=$(echo "$match" | cut -d: -f2)
        local content=$(echo "$match" | cut -d: -f3- | sed 's/^[ ]*//' | sed 's/|/∣/g' | cut -c1-80)
        echo "| \`$(relpath "$file")\` | $linenum | \`$content\` |"
      done
    fi
    echo ""

    # ── Session Timeline ──
    echo "## Session Timeline"
    echo ""
    echo "| Date | Session | Context |"
    echo "|------|---------|---------|"
    for f in "$SOMA_DIR"/memory/sessions/*.md; do
      [[ -f "$f" ]] || continue
      if grep -qil "$term" "$f" 2>/dev/null; then
        local name=$(basename "$f" .md)
        local date=$(echo "$name" | grep -o '2026-[0-9-]*' | head -1)
        local hits=$(grep -c -i "$term" "$f" 2>/dev/null)
        local first=$(grep -i "$term" "$f" 2>/dev/null | head -1 | sed 's/^[ ]*//' | sed 's/|/∣/g' | cut -c1-60)
        echo "| $date | \`$name\` | ${first} (${hits} hits) |"
      fi
    done
    echo ""

    # ── Connection Graph ──
    echo "## Connection Graph"
    echo ""
    echo "Documents sharing seam hashes (co-occurrence = related context):"
    echo ""
    echo "\`\`\`"

    # Collect seam → doc pairs into a temp file
    while IFS= read -r file; do
      if grep -qil "$term" "$file" 2>/dev/null; then
        local rel=$(relpath "$file")
        frontmatter_list "$file" "seams" | while IFS= read -r seam; do
          [[ -z "$seam" ]] && continue
          echo "${seam}|${rel}" >> "$tmpdir/seam-pairs.txt"
        done
      fi
    done < <(soma_docs)

    if [[ -f "$tmpdir/seam-pairs.txt" ]]; then
      # Group by seam, show only seams with 2+ docs
      cut -d'|' -f1 "$tmpdir/seam-pairs.txt" | sort | uniq -c | sort -rn | while read -r count seam; do
        [[ $count -lt 2 ]] && continue
        echo "[$seam] ($count docs)"
        grep "^${seam}|" "$tmpdir/seam-pairs.txt" | cut -d'|' -f2 | sort | while read -r doc; do
          echo "  ├── $doc"
        done
        echo ""
      done
    fi
    echo "\`\`\`"
    echo ""

    # ── Chronological Narrative ──
    echo "## Chronological Narrative"
    echo ""

    # Collect all dated mentions into a single stream
    {
      for f in "$SOMA_DIR"/memory/sessions/*.md; do
        [[ -f "$f" ]] || continue
        if grep -qil "$term" "$f" 2>/dev/null; then
          local date=$(basename "$f" .md | grep -o '2026-[0-9-]*' | head -1)
          [[ -z "$date" ]] && continue
          echo "${date}|📝|$(basename "$f" .md)"
        fi
      done
      for f in "$SOMA_DIR"/ideas/*.md; do
        [[ -f "$f" ]] || continue
        if grep -qil "$term" "$f" 2>/dev/null; then
          local date=$(frontmatter_field "$f" "created")
          [[ -z "$date" ]] && continue
          local title=$(head -20 "$f" | grep '^# ' | head -1 | sed 's/^# //')
          echo "${date}|💡|${title:-$(basename "$f" .md)}"
        fi
      done
      for f in "$SOMA_DIR"/amps/automations/maps/*.md; do
        [[ -f "$f" ]] || continue
        if grep -qil "$term" "$f" 2>/dev/null; then
          local date=$(frontmatter_field "$f" "created")
          [[ -z "$date" ]] && continue
          local name=$(frontmatter_field "$f" "name")
          echo "${date}|🗺️|MAP: ${name:-$(basename "$f" .md)}"
        fi
      done
      for f in "$SOMA_DIR"/archive/legacy/archive/*.md "$SOMA_DIR"/archive/dev/archive/*.md; do
        [[ -f "$f" ]] || continue
        if grep -qil "$term" "$f" 2>/dev/null; then
          local date=$(basename "$f" .md | grep -o '2026-[0-9-]*' | head -1)
          [[ -z "$date" ]] && continue
          local title=$(head -5 "$f" | grep '^# ' | head -1 | sed 's/^# //')
          echo "${date}|📦|${title:-$(basename "$f" .md)}"
        fi
      done
    } | sort | while IFS='|' read -r date icon desc; do
      echo "- **$date** $icon $desc"
    done

    echo ""
    echo "---"
    echo "*Generated by \`soma-seam.sh web \"$term\"\` on $(date '+%Y-%m-%d %H:%M')*"

  } > "$output"

  echo -e "${GREEN}✓ Web written to: $output${RESET}"
  echo -e "${DIM}$(wc -l < "$output") lines${RESET}"
}

# ─── AUDIT — Code health through context ──────────────────────────────────
# Combines seam tracing with code quality checks:
# - Cross-file default/fallback consistency (?? mismatches)
# - Test coverage for exported symbols
# - Commit-to-session traceability
# - Changed functions with no session log documentation
#
# This is the code-aware extension of MLR — instead of tracing concepts
# through memory, it traces code health through context.
# ──────────────────────────────────────────────────────────────────────────

audit() {
  local target="${1:-HEAD~5..HEAD}"

  cd "$AGENT_DIR" 2>/dev/null || cd "$PROJECT_ROOT" 2>/dev/null || true

  # Temporarily disable set -e for audit (many greps that return 1 on no match)
  set +e

  # Detect: upstream audit, file audit, or commit range audit?
  if [[ "$target" == "upstream" ]]; then
    shift 2>/dev/null || true
    audit_upstream "$@"
  elif [[ -f "$target" ]]; then
    audit_file "$target"
  else
    audit_range "$target"
  fi

  set -e
}

# ─── AUDIT UPSTREAM — Cross-reference upstream changes against our code ───
# Answers:
#   1. Did any API we import/use change? (breaking)
#   2. Were any exports renamed/removed? (deprecation)
#   3. What new exports appeared? (enhancement opportunities)
#   4. Are our tests still relevant given upstream changes?
#
# Usage:
#   soma-seam.sh audit upstream                          # auto-detect pi-mono, last tag
#   soma-seam.sh audit upstream v0.58.3..v0.61.0         # specific range
#   soma-seam.sh audit upstream --repo /path/to/pi-mono  # explicit repo
# ──────────────────────────────────────────────────────────────────────────

audit_upstream() {
  local range=""
  local upstream_repo=""

  # Parse args
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --repo) upstream_repo="$2"; shift 2 ;;
      *) range="$1"; shift ;;
    esac
  done

  # Auto-detect upstream repo
  if [[ -z "$upstream_repo" ]]; then
    # Check common locations
    for candidate in \
      "$PROJECT_ROOT/../lab/pi-mono" \
      "$PROJECT_ROOT/pi-mono"; do
      if [[ -d "$candidate/.git" ]]; then
        upstream_repo="$candidate"
        break
      fi
    done
  fi

  if [[ -z "$upstream_repo" || ! -d "$upstream_repo" ]]; then
    echo -e "${RED}✗ Cannot find upstream repo. Use --repo /path/to/pi-mono${RESET}"
    return 1
  fi

  # Auto-detect range if not given
  if [[ -z "$range" ]]; then
    # Get our installed version from package.json
    local our_version
    our_version=$(grep -o '"@mariozechner/pi-coding-agent": "[^"]*"' "$AGENT_DIR/package.json" 2>/dev/null | grep -o '[0-9][0-9.]*' | head -1)
    local latest_tag
    latest_tag=$(cd "$upstream_repo" && git tag --sort=-v:refname | head -1)

    if [[ -n "$our_version" && -n "$latest_tag" ]]; then
      # Find the tag matching our dep version
      local our_tag="v${our_version}"
      # Check if that tag exists
      if cd "$upstream_repo" && git rev-parse "$our_tag" >/dev/null 2>&1; then
        range="${our_tag}..${latest_tag}"
      else
        # Fall back: use the previous tag before latest
        local prev_tag
        prev_tag=$(cd "$upstream_repo" && git tag --sort=-v:refname | sed -n '2p')
        range="${prev_tag}..${latest_tag}"
      fi
    else
      range="HEAD~20..HEAD"
    fi
  fi

  echo -e "${BOLD}═══ Upstream Audit: ${range} ═══${RESET}"
  echo -e "${DIM}Repo: ${upstream_repo}${RESET}"
  echo -e "${DIM}Agent: ${AGENT_DIR}${RESET}"
  echo ""

  # ── 1. Collect what WE import from upstream ──
  echo -e "${CYAN}── Our imports from upstream ──${RESET}"

  local our_imports_file
  our_imports_file=$(mktemp)

  # Extract all imports from @mariozechner packages in our code
  grep -rh "from ['\"]@mariozechner" "$AGENT_DIR/extensions/" "$AGENT_DIR/core/" 2>/dev/null \
    | grep -v node_modules | grep -v '.git/' \
    | sort -u > "$our_imports_file"

  # Extract specific symbols we import
  local our_symbols_file
  our_symbols_file=$(mktemp)

  grep -rh "import.*from ['\"]@mariozechner" "$AGENT_DIR/extensions/" "$AGENT_DIR/core/" 2>/dev/null \
    | grep -v node_modules \
    | sed 's/import type //; s/import //' \
    | grep -oE '\{[^}]+\}' \
    | tr -d '{}' | tr ',' '\n' \
    | sed 's/^ *//; s/ *$//' \
    | grep -v '^$' \
    | sort -u > "$our_symbols_file"

  local sym_count
  sym_count=$(wc -l < "$our_symbols_file" | tr -d ' ')
  echo -e "  ${DIM}${sym_count} symbols imported across extensions/ and core/${RESET}"
  while IFS= read -r sym; do
    echo -e "  ${GREEN}•${RESET} ${sym}"
  done < "$our_symbols_file"
  echo ""

  # ── 2. Collect what UPSTREAM changed ──
  echo -e "${CYAN}── Upstream export changes (${range}) ──${RESET}"

  local upstream_diff
  upstream_diff=$(cd "$upstream_repo" && git diff "$range" \
    -- 'packages/coding-agent/src/core/extensions/types.ts' \
       'packages/coding-agent/src/core/extensions/index.ts' \
       'packages/coding-agent/src/core/extensions/loader.ts' \
       'packages/coding-agent/src/core/extensions/runner.ts' \
       'packages/coding-agent/src/index.ts' \
       'packages/ai/src/types.ts' \
       'packages/ai/src/index.ts' \
       'packages/tui/src/index.ts' \
    2>/dev/null)

  # Extract removed exports (lines starting with -)
  local removed_exports
  removed_exports=$(echo "$upstream_diff" | grep '^-' | grep -v '^---' \
    | grep -oE '(export |type |interface |function |const |class )[A-Za-z_]+' \
    | sed 's/^export //' | sed 's/^type //' | sed 's/^interface //' | sed 's/^function //' | sed 's/^const //' | sed 's/^class //' \
    | sort -u || true)

  # Extract added exports
  local added_exports
  added_exports=$(echo "$upstream_diff" | grep '^+' | grep -v '^+++' \
    | grep -oE '(export |type |interface |function |const |class )[A-Za-z_]+' \
    | sed 's/^export //' | sed 's/^type //' | sed 's/^interface //' | sed 's/^function //' | sed 's/^const //' | sed 's/^class //' \
    | sort -u || true)

  # Find renames: removed from one side, added on the other with similar name
  echo ""
  echo -e "  ${YELLOW}Removed/changed:${RESET}"
  local breaking_count=0
  local rename_count=0
  while IFS= read -r removed; do
    [[ -z "$removed" ]] && continue
    # Check if we use this symbol
    local we_use=""
    if grep -q "^${removed}$" "$our_symbols_file" 2>/dev/null; then
      we_use="yes"
    fi
    # Check if it was renamed (similar name added)
    local possible_rename
    possible_rename=$(echo "$added_exports" | grep -i "${removed}" | head -1 || true)

    if [[ -n "$we_use" ]]; then
      if [[ -n "$possible_rename" ]]; then
        echo -e "  ${RED}⚠ BREAKING RENAME:${RESET} ${YELLOW}${removed}${RESET} → ${GREEN}${possible_rename}${RESET}  ${RED}(WE USE THIS)${RESET}"
        breaking_count=$((breaking_count + 1))
        rename_count=$((rename_count + 1))
      else
        echo -e "  ${RED}⚠ BREAKING REMOVAL:${RESET} ${YELLOW}${removed}${RESET}  ${RED}(WE USE THIS)${RESET}"
        breaking_count=$((breaking_count + 1))
      fi
    else
      if [[ -n "$possible_rename" ]]; then
        echo -e "  ${DIM}↺ ${removed} → ${possible_rename} (we don't use)${RESET}"
        rename_count=$((rename_count + 1))
      else
        echo -e "  ${DIM}✕ ${removed} (we don't use)${RESET}"
      fi
    fi
  done <<< "$removed_exports"

  echo ""
  echo -e "  ${GREEN}Added (new capabilities):${RESET}"
  local new_count=0
  while IFS= read -r added; do
    [[ -z "$added" ]] && continue
    # Skip if it's just a rename of something removed
    if echo "$removed_exports" | grep -qi "$added" 2>/dev/null; then
      continue
    fi
    echo -e "  ${GREEN}+${RESET} ${added}"
    new_count=$((new_count + 1))
  done <<< "$added_exports"

  echo ""

  # ── 3. Signature changes on APIs we use ──
  echo -e "${CYAN}── Signature changes on APIs we use ──${RESET}"

  # Check each symbol we import against the upstream diff
  local sig_changes=0
  while IFS= read -r sym; do
    [[ -z "$sym" ]] && continue
    # Look for this symbol in the diff context (both + and - lines nearby)
    local sym_diff
    sym_diff=$(echo "$upstream_diff" | grep -A2 -B2 "$sym" | grep -E '^\+|^\-' | grep -v '^[+-]{3}' || true)
    if [[ -n "$sym_diff" ]]; then
      echo -e "  ${YELLOW}⚠ ${sym}${RESET} — signature context changed:"
      echo "$sym_diff" | head -6 | while IFS= read -r line; do
        if [[ "$line" == +* ]]; then
          echo -e "    ${GREEN}${line}${RESET}"
        else
          echo -e "    ${RED}${line}${RESET}"
        fi
      done
      sig_changes=$((sig_changes + 1))
    fi
  done < "$our_symbols_file"

  if [[ $sig_changes -eq 0 ]]; then
    echo -e "  ${GREEN}✓${RESET} No signature changes on imported symbols"
  fi
  echo ""

  # ── 4. Pi extension API usage in our code vs upstream patterns ──
  echo -e "${CYAN}── Our Pi API usage patterns ──${RESET}"

  # Extract pi.xxx and ctx.xxx calls from our extensions
  local api_calls
  api_calls=$(grep -rhoE '(pi|ctx)\.[a-zA-Z]+' "$AGENT_DIR/extensions/" 2>/dev/null \
    | grep -v node_modules | sort | uniq -c | sort -rn | head -20 || true)

  echo "$api_calls" | while read -r count call; do
    [[ -z "$count" ]] && continue
    # Check if this call appears in upstream's changed code
    local in_diff=""
    if echo "$upstream_diff" | grep -q "$call" 2>/dev/null; then
      in_diff=" ${YELLOW}← upstream changed this${RESET}"
    fi
    echo -e "  ${DIM}${count}x${RESET} ${call}${in_diff}"
  done
  echo ""

  # ── 5. Test relevance ──
  echo -e "${CYAN}── Test relevance ──${RESET}"

  local test_dir=""
  [[ -d "$AGENT_DIR/tests" ]] && test_dir="$AGENT_DIR/tests"
  [[ -d "$AGENT_DIR/test" ]] && test_dir="$AGENT_DIR/test"

  if [[ -n "$test_dir" ]]; then
    # Check if tests reference any changed upstream symbols
    local test_refs=0
    local test_gaps=0
    while IFS= read -r sym; do
      [[ -z "$sym" ]] && continue
      # Skip very short/common words that cause false positives
      [[ ${#sym} -lt 5 ]] && continue
      # Does this removed/changed symbol appear in our tests?
      if grep -rl "$sym" "$test_dir/" >/dev/null 2>&1; then
        echo -e "  ${RED}⚠ Test references changed symbol:${RESET} ${YELLOW}${sym}${RESET}"
        grep -rn "$sym" "$test_dir/" 2>/dev/null | head -3 | while IFS= read -r ref; do
          echo -e "    ${DIM}${ref}${RESET}"
        done
        test_refs=$((test_refs + 1))
      fi
    done <<< "$removed_exports"

    # Check if tests exercise any of the new APIs (opportunity)
    while IFS= read -r sym; do
      [[ -z "$sym" ]] && continue
      if echo "$removed_exports" | grep -qi "$sym" 2>/dev/null; then continue; fi
      if ! grep -rl "$sym" "$test_dir/" >/dev/null 2>&1; then
        test_gaps=$((test_gaps + 1))
      fi
    done <<< "$added_exports"

    if [[ $test_refs -eq 0 ]]; then
      echo -e "  ${GREEN}✓${RESET} No tests reference changed/removed symbols"
    fi
    if [[ $test_gaps -gt 0 ]]; then
      echo -e "  ${DIM}${test_gaps} new upstream exports not yet tested (expected — they're new)${RESET}"
    fi
  else
    echo -e "  ${DIM}No test directory found${RESET}"
  fi
  echo ""

  # ── 6. Enhancement opportunities ──
  echo -e "${CYAN}── Enhancement opportunities ──${RESET}"

  # Look at upstream's full changelog-style commits for feature keywords
  local feature_commits
  feature_commits=$(cd "$upstream_repo" && git log --oneline "$range" 2>/dev/null \
    | grep -iE '^[a-f0-9]+ feat|^[a-f0-9]+ fix.*extension|^[a-f0-9]+ fix.*tool|^[a-f0-9]+ fix.*session' || true)

  if [[ -n "$feature_commits" ]]; then
    echo -e "  ${GREEN}Upstream features/fixes relevant to extensions:${RESET}"
    echo "$feature_commits" | while IFS= read -r line; do
      echo -e "  ${GREEN}+${RESET} ${line}"
    done
  fi

  # Check for new extension examples
  local new_examples
  new_examples=$(cd "$upstream_repo" && git diff --name-only "$range" 2>/dev/null \
    | grep -i 'example.*extension\|extension.*example' || true)

  if [[ -n "$new_examples" ]]; then
    echo ""
    echo -e "  ${GREEN}New extension examples upstream:${RESET}"
    echo "$new_examples" | while IFS= read -r ex; do
      echo -e "  ${GREEN}+${RESET} ${ex}"
    done
  fi

  # Check for new docs
  local new_docs
  new_docs=$(cd "$upstream_repo" && git diff --name-only "$range" 2>/dev/null \
    | grep -i 'docs/\|\.md$' | grep -v CHANGELOG | head -10 || true)

  if [[ -n "$new_docs" ]]; then
    echo ""
    echo -e "  ${DIM}Changed docs:${RESET}"
    echo "$new_docs" | while IFS= read -r doc; do
      echo -e "  ${DIM}📄 ${doc}${RESET}"
    done
  fi
  echo ""

  # ── Summary ──
  echo -e "${BOLD}═══ Summary ═══${RESET}"
  echo -e "  Breaking changes:      ${breaking_count:-0}"
  echo -e "  Renames:               ${rename_count:-0}"
  echo -e "  New capabilities:      ${new_count:-0}"
  echo -e "  Signature changes:     ${sig_changes:-0}"
  echo -e "  Test concerns:         ${test_refs:-0}"
  echo ""

  if [[ ${breaking_count:-0} -eq 0 ]]; then
    echo -e "  ${GREEN}✓ Safe to upgrade — no breaking changes affect our imports${RESET}"
    if [[ ${sig_changes:-0} -gt 0 ]]; then
      echo -e "  ${YELLOW}ℹ ${sig_changes} signature context changes — review above but likely safe${RESET}"
    fi
  else
    echo -e "  ${RED}⚠ Review required — ${breaking_count} breaking changes affect our code${RESET}"
  fi

  # Cleanup
  rm -f "$our_imports_file" "$our_symbols_file"
}

audit_file() {
  local file="$1"

  echo -e "${BOLD}═══ Code Audit: $file ═══${RESET}"

  # 1. Recent changes + session context
  echo -e "\n${CYAN}── Recent changes ──${RESET}"
  git log --oneline -10 -- "$file" 2>/dev/null | while read -r hash msg; do
    local short="${hash:0:7}"
    local day
    day=$(git log -1 --format="%ai" "$hash" 2>/dev/null | cut -d' ' -f1)
    # Check if commit appears in a session log
    local session_ref=""
    for sf in "$SOMA_DIR"/memory/sessions/${day}*; do
      [[ ! -f "$sf" ]] && continue
      if grep -q "$short" "$sf" 2>/dev/null; then
        session_ref=" ${GREEN}↔ $(basename "$sf" .md)${RESET}"
        break
      fi
    done
    echo -e "  ${YELLOW}${short}${RESET} ${msg}${session_ref}"
  done

  # 2. Test coverage
  echo -e "\n${CYAN}── Test coverage ──${RESET}"
  local test_dir=""
  [[ -d "tests" ]] && test_dir="tests"
  [[ -d "test" ]] && test_dir="test"

  if [[ -n "$test_dir" ]]; then
    local _funcs _exports all_symbols
    _funcs=$(grep -E '(export )?(async )?function [a-zA-Z_]' "$file" 2>/dev/null | sed 's/.*function //' | sed 's/[(<].*//' | tr -d ' ' || true)
    _exports=$(grep -E '^export (const|interface|type|class|enum) [a-zA-Z_]' "$file" 2>/dev/null | sed 's/^export [a-z]* //' | sed 's/[<({: ].*//' | tr -d ' ' || true)
    all_symbols=$(printf '%s\n%s' "$_funcs" "$_exports" | sort -u | grep -v '^$' || true)

    local covered=0 uncovered=0 total=0
    while IFS= read -r sym; do
      [[ -z "$sym" ]] && continue
      total=$((total + 1))
      if grep -rl "$sym" "$test_dir/" >/dev/null 2>&1; then
        covered=$((covered + 1))
        echo -e "  ${GREEN}✓${RESET} ${sym}"
      else
        uncovered=$((uncovered + 1))
        echo -e "  ${RED}✗${RESET} ${sym} — ${RED}NO TESTS${RESET}"
      fi
    done <<< "$all_symbols"

    if [[ $total -gt 0 ]]; then
      local pct=$((covered * 100 / total))
      echo -e "\n  Coverage: ${covered}/${total} (${pct}%)"
    fi
  else
    echo -e "  ${DIM}No tests/ directory${RESET}"
  fi

  # 3. Default consistency — find all ?? fallbacks in this file
  # then cross-check against other files that use the same property names
  echo -e "\n${CYAN}── Default consistency ──${RESET}"
  local fallbacks
  fallbacks=$(grep -n '??' "$file" 2>/dev/null | grep -v '^\s*//' | grep -v '^\s*\*' || true)

  if [[ -n "$fallbacks" ]]; then
    # Extract property ?? value pairs
    echo "$fallbacks" | while read -r line; do
      # Get the property name before ??
      local prop
      prop=$(echo "$line" | grep -oE '[a-zA-Z_]+\s*\?\?' | sed 's/[[:space:]]*??//' | head -1)
      local val
      val=$(echo "$line" | sed 's/.*??[[:space:]]*//' | sed 's/[;,)].*//' | head -c 30)
      [[ -z "$prop" ]] && continue

      # Search for same property with different ?? value in other files
      local other_vals
      other_vals=$(grep -rn "${prop}.*??" core/ extensions/ 2>/dev/null | grep -v "$file" | grep -v node_modules | grep -v '^\s*//' || true)

      if [[ -n "$other_vals" ]]; then
        local mismatches
        mismatches=$(echo "$other_vals" | grep -v "?? ${val}" | head -3 || true)
        if [[ -n "$mismatches" ]]; then
          echo -e "  ${RED}⚠${RESET} ${YELLOW}${prop}${RESET} ?? ${val} — DIFFERS in:"
          echo "$mismatches" | while read -r m; do
            echo -e "    ${DIM}${m}${RESET}"
          done
        fi
      fi
    done
  else
    echo -e "  ${DIM}No fallback patterns${RESET}"
  fi

  # 4. Seam trace — what plans/ideas reference this file?
  echo -e "\n${CYAN}── Memory references ──${RESET}"
  local basename_f
  basename_f=$(basename "$file")
  local refs
  refs=$(grep -rl "$basename_f" "$SOMA_DIR/memory/" "$SOMA_DIR/docs/ideas/" "$SOMA_DIR/docs/plans/" "$SOMA_DIR/archive/" 2>/dev/null | head -10 || true)
  if [[ -n "$refs" ]]; then
    echo "$refs" | while read -r ref; do
      echo -e "  ${MAGENTA}→${RESET} ${ref#$SOMA_DIR/}"
    done
  else
    echo -e "  ${DIM}No references in .soma/ memory${RESET}"
  fi
}

audit_range() {
  local range="$1"

  echo -e "${BOLD}═══ Code Audit: $range ═══${RESET}"

  # 1. Commits with session traceability
  echo -e "\n${CYAN}── Commits + session context ──${RESET}"
  git log --oneline "$range" 2>/dev/null | while read -r hash msg; do
    local short="${hash:0:7}"
    local day
    day=$(git log -1 --format="%ai" "$hash" 2>/dev/null | cut -d' ' -f1)
    local session_ref=""
    local model_hint=""

    # Find session log referencing this commit (check day and adjacent days)
    local prev_day next_day
    prev_day=$(date -j -v-1d -f "%Y-%m-%d" "$day" "+%Y-%m-%d" 2>/dev/null || date -d "$day - 1 day" "+%Y-%m-%d" 2>/dev/null || echo "")
    next_day=$(date -j -v+1d -f "%Y-%m-%d" "$day" "+%Y-%m-%d" 2>/dev/null || date -d "$day + 1 day" "+%Y-%m-%d" 2>/dev/null || echo "")
    for sf in "$SOMA_DIR"/memory/sessions/${day}* "$SOMA_DIR"/memory/sessions/${prev_day}* "$SOMA_DIR"/memory/sessions/${next_day}*; do
      [[ ! -f "$sf" ]] && continue
      if grep -q "$short" "$sf" 2>/dev/null; then
        session_ref=" ${GREEN}↔ $(basename "$sf" .md)${RESET}"
        # Check for model indicators in that session
        if grep -qi "sonnet.*4\.5\|200k\|200,000" "$sf" 2>/dev/null; then
          model_hint=" ${RED}[Sonnet 4.5?]${RESET}"
        elif grep -qi "opus.*4.6\|1M\|1,000,000" "$sf" 2>/dev/null; then
          model_hint=" ${GREEN}[Opus 4-6]${RESET}"
        fi
        break
      fi
    done

    # Check if commit has NO session log
    if [[ -z "$session_ref" ]]; then
      # Check if any session log exists for that day at all
      local day_logs
      day_logs=$(ls "$SOMA_DIR"/memory/sessions/${day}* 2>/dev/null | wc -l | tr -d ' ')
      if [[ "$day_logs" == "0" ]]; then
        session_ref=" ${RED}⚠ NO SESSION LOG${RESET}"
      else
        session_ref=" ${YELLOW}⚠ not in any session log${RESET}"
      fi
    fi

    echo -e "  ${YELLOW}${short}${RESET} ${msg}${session_ref}${model_hint}"
  done

  # 2. Changed files — coverage summary
  echo -e "\n${CYAN}── Changed files: test coverage ──${RESET}"
  local changed_files
  changed_files=$(git diff --name-only "$range" 2>/dev/null | grep -E '\.(ts|js)$' | grep -v node_modules | grep -v dist/ | sort -u || true)

  local test_dir=""
  [[ -d "tests" ]] && test_dir="tests"
  [[ -d "test" ]] && test_dir="test"

  if [[ -n "$changed_files" && -n "$test_dir" ]]; then
    echo "$changed_files" | while read -r f; do
      [[ -z "$f" || ! -f "$f" ]] && continue

      # Count changed functions (added lines containing 'function')
      local changed_funcs
      changed_funcs=$(git diff "$range" -- "$f" 2>/dev/null | grep '^+' | grep -c 'function \|const \|interface ' 2>/dev/null || echo "0")

      # Count how many exported symbols are tested
      local _funcs _exports all_syms tested untested
      _funcs=$(grep -E '(export )?(async )?function [a-zA-Z_]' "$f" 2>/dev/null | sed 's/.*function //' | sed 's/[(<].*//' | tr -d ' ' || true)
      _exports=$(grep -E '^export (const|interface|type|class|enum) [a-zA-Z_]' "$f" 2>/dev/null | sed 's/^export [a-z]* //' | sed 's/[<({: ].*//' | tr -d ' ' || true)
      all_syms=$(printf '%s\n%s' "$_funcs" "$_exports" | sort -u | grep -v '^$' || true)

      tested=0; untested=0
      while IFS= read -r sym; do
        [[ -z "$sym" ]] && continue
        if grep -rl "$sym" "$test_dir/" >/dev/null 2>&1; then
          tested=$((tested + 1))
        else
          untested=$((untested + 1))
        fi
      done <<< "$all_syms"

      local total=$((tested + untested))
      if [[ $total -gt 0 ]]; then
        local pct=$((tested * 100 / total))
        local color="$GREEN"
        [[ $pct -lt 50 ]] && color="$RED"
        [[ $pct -ge 50 && $pct -lt 80 ]] && color="$YELLOW"
        echo -e "  ${color}${pct}%${RESET} ${f} (${tested}/${total} symbols, ${changed_funcs} lines changed)"
      else
        echo -e "  ${DIM}-- ${f} (no exports)${RESET}"
      fi
    done
  fi

  # 3. Cross-file default consistency for changed files
  echo -e "\n${CYAN}── Default consistency (changed files) ──${RESET}"
  local mismatch_output=""
  if [[ -n "$changed_files" ]]; then
    while IFS= read -r f; do
      [[ -z "$f" || ! -f "$f" ]] && continue
      # Find all prop ?? value patterns
      while IFS= read -r match; do
        [[ -z "$match" ]] && continue
        local prop val
        prop=$(echo "$match" | sed 's/[[:space:]]*??.*//')
        val=$(echo "$match" | sed 's/.*??[[:space:]]*//')

        # Check same property in other files
        local others
        others=$(grep -rn "${prop}.*??.*[0-9]" core/ extensions/ 2>/dev/null | grep -v "$f" | grep -v node_modules | grep -v dist/ | grep -v '^\s*//' || true)
        if [[ -n "$others" ]]; then
          while IFS= read -r other_line; do
            local other_val
            other_val=$(echo "$other_line" | grep -oE "${prop}[[:space:]]*\?\?[[:space:]]*[0-9]+" | sed 's/.*??[[:space:]]*//' | head -1)
            if [[ -n "$other_val" && "$other_val" != "$val" ]]; then
              echo -e "  ${RED}⚠ MISMATCH:${RESET} ${YELLOW}${prop}${RESET} ?? ${val} (${f}) vs ?? ${other_val} ($(echo "$other_line" | cut -d: -f1))"
              mismatch_output="found"
            fi
          done <<< "$others"
        fi
      done < <(grep -oE '[a-zA-Z_]+\s*\?\?\s*[0-9]+' "$f" 2>/dev/null || true)
    done <<< "$changed_files"
  fi
  if [[ -z "$mismatch_output" ]]; then
    echo -e "  ${GREEN}✓${RESET} No fallback mismatches detected"
  fi
}
# ─── HELP ─────────────────────────────────────────────────────────────────

case "$CMD" in
  trace) trace "$@" ;;
  graph) graph "$@" ;;
  matrix) matrix "$@" ;;
  code) code_trace "$@" ;;
  seeds) seeds "$@" ;;
  gaps) gaps ;;
  timeline) timeline "$@" ;;
  web) web "$@" ;;
  audit) audit "$@" ;;
  help|--help|-h)
    echo ""
    echo -e "${SOMA_BOLD}σ soma-seam${SOMA_NC} ${SOMA_DIM}— trace concepts through memory, code, and sessions${SOMA_NC}"
    echo ""
    echo -e "  ${SOMA_BOLD}trace${SOMA_NC} <term>              ${SOMA_DIM}follow a concept through everything${SOMA_NC}"
    echo -e "  ${SOMA_BOLD}graph${SOMA_NC} <seam-hash>         ${SOMA_DIM}map everything connected to a session${SOMA_NC}"
    echo -e "  ${SOMA_BOLD}matrix${SOMA_NC} <tag> [--depth N]  ${SOMA_DIM}build connection matrix${SOMA_NC}"
    echo -e "  ${SOMA_BOLD}timeline${SOMA_NC} [--tag TAG]      ${SOMA_DIM}chronological evolution${SOMA_NC}"
    echo -e "  ${SOMA_BOLD}code${SOMA_NC} <pattern>            ${SOMA_DIM}code + context together${SOMA_NC}"
    echo -e "  ${SOMA_BOLD}seeds${SOMA_NC} [--unplanted]       ${SOMA_DIM}find seeds (forward pointers)${SOMA_NC}"
    echo -e "  ${SOMA_BOLD}gaps${SOMA_NC}                      ${SOMA_DIM}find orphan documents${SOMA_NC}"
    echo -e "  ${SOMA_BOLD}web${SOMA_NC} <term> [-o FILE]      ${SOMA_DIM}generate markdown web${SOMA_NC}"
    echo -e "  ${SOMA_BOLD}audit${SOMA_NC} [range|file]        ${SOMA_DIM}code health + commit context${SOMA_NC}"
    echo -e "  ${SOMA_BOLD}audit upstream${SOMA_NC} [range]    ${SOMA_DIM}cross-reference upstream vs our imports${SOMA_NC}"
    echo ""
    echo -e "  ${SOMA_DIM}BSL 1.1 © Curtis Mercier — open source 2027${SOMA_NC}"
    echo ""
    ;;
  *) echo -e "${SOMA_CYAN}σ${SOMA_NC} Unknown command: ${SOMA_BOLD}$CMD${SOMA_NC}. Run ${SOMA_BOLD}soma-seam.sh --help${SOMA_NC}"; exit 0 ;;
esac

