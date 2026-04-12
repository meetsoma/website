#!/usr/bin/env bash
# soma-verify.sh — Health checks and truth-checking for the Soma ecosystem
#
# USE WHEN: after shipping (verify nothing broke), before releases (ecosystem health),
#   when docs feel stale (drift detection), periodic self-analysis.
#   After ANY code change — tools verify the SYSTEM, tests verify the CODE.
#   Run alongside npm test + regression suites for full coverage.
#
# Part of the dev-ship MAP Phase 1 verification stack:
#   1. npm test (unit)  →  2. test-*.sh (regression)  →  3. soma-verify.sh (ecosystem)
#   4. soma-hub-status.sh (drift)  →  5. soma-refactor.sh scan (blast radius)
#
# TODO: add a `tests` subcommand that runs all 3 test layers in sequence
# TODO: add a `blast` subcommand that wraps soma-refactor.sh scan for common patterns
#
# Related muscles: ship-cycle (post-ship verify), self-analysis (deep check),
#   context-hygiene (stale doc detection), protocol-management (protocol sync)
# Related scripts: soma-ship.sh (calls this), soma-query.sh (search/explore),
#   soma-gap-check.sh (knowledge gaps), soma-verify-styles.sh (CSS), soma-verify-islands.sh (Astro)
#
# Verify claims against code, detect drift, check ecosystem health,
# and delegate analysis to sub-agents.
# Token-efficient output designed for agent consumption.
#
# Search/explore commands moved to soma-query.sh (2026-03-14):
#   topic, search, related, sessions, impact, history
#
# Usage:
#   soma-verify.sh doc <file>                 # verify claims in a doc against code
#   soma-verify.sh sync                       # cross-ecosystem consistency check
#   soma-verify.sh streams                    # pro vs public stream protection
#   soma-verify.sh changelog [scope]          # verify changelog claims against commits
#   soma-verify.sh protocols                  # protocol versions across all 4 sources
#   soma-verify.sh website                    # docs sync + hub content + stale paths
#   soma-verify.sh copy                       # marketing copy vs source of truth
#   soma-verify.sh repos                      # multi-repo state check
#   soma-verify.sh agent <task> [files...]    # delegate analysis to Haiku sub-agent
#   soma-verify.sh hygiene                    # full workspace health sweep
#   soma-verify.sh self-analysis              # deep ecosystem health check
#   soma-verify.sh --compact                  # minimal output (errors only)
#   soma-verify.sh --help
#
# Designed for agent consumption. Pipe output into session for review.

set -uo pipefail

# ── Theme ──
source "$(dirname "$0")/soma-theme.sh" 2>/dev/null || true

# ── Paths ────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOMA_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROJECT_ROOT="$(cd "$SOMA_DIR/.." && pwd)"

# Repos
# Agent-stable repo — optional, for cross-source verification
AGENT_STABLE="$PROJECT_ROOT/repos/agent-stable"
[[ ! -d "$AGENT_STABLE" ]] && AGENT_STABLE=""
AGENT_DEV="$PROJECT_ROOT/repos/agent"
CLI_REPO="$PROJECT_ROOT/repos/cli"
WEBSITE_REPO="$PROJECT_ROOT/repos/website"
# Community repo — optional, enhances verification if present
COMMUNITY_REPO="$PROJECT_ROOT/repos/community"
[[ ! -d "$COMMUNITY_REPO" ]] && COMMUNITY_REPO=""
PRO_REPO="$PROJECT_ROOT/repos/soma-pro"

COMPACT=false
[[ "${*}" == *"--compact"* ]] && COMPACT=true

# ── Helpers ──────────────────────────────────────────────────────────────

σ() { echo "σ  $*"; }
pass() { echo "  ✅ $*"; }
fail() { echo "  ❌ $*"; }
warn() { echo "  ⚠️  $*"; }
dim() { [[ "$COMPACT" == false ]] && echo "     $*"; }
header() { echo ""; echo "━━━ $* ━━━"; }
score() {
  local p=$1 t=$2
  local pct=0
  [ "$t" -gt 0 ] && pct=$(( p * 100 / t ))
  echo ""
  echo "SCORE: $p/$t claims verified ($pct%)"
}

# ── DOC: Verify claims in a document ────────────────────────────────────

verify_doc() {
  local target="$1"
  [ ! -f "$target" ] && echo "File not found: $target" && exit 1
  
  header "VERIFY DOC: $(basename "$target")"
  
  local pass_count=0
  local fail_count=0
  local total=0
  
  # --- Settings values ---
  # Look for patterns like: settingName: value  or  "settingName": value
  # in code blocks (```json or ```jsonc sections)
  
  local settings_file="$AGENT_STABLE/core/settings.ts"
  if [ -f "$settings_file" ]; then
    # Extract claimed setting values from JSON-like blocks in the doc
    # Pattern: word followed by colon and a number/boolean/string
    local in_code_block=false
    local claims=""
    
    while IFS= read -r line; do
      # Track code blocks
      if [[ "$line" =~ ^\`\`\` ]]; then
        if [[ "$in_code_block" == true ]]; then
          in_code_block=false
        else
          in_code_block=true
        fi
        continue
      fi
      
      if [[ "$in_code_block" == true ]]; then
        # Extract setting: value pairs (skip comments)
        if [[ "$line" =~ ^[[:space:]]*\"?([a-zA-Z]+)\"?:[[:space:]]*([-0-9]+|true|false|\"[^\"]*\") ]]; then
          local key="${BASH_REMATCH[1]}"
          local val="${BASH_REMATCH[2]}"
          # Strip quotes and trailing comma
          val=$(echo "$val" | tr -d '",')
          
          # Skip generic words that aren't settings
          case "$key" in
            name|type|status|text|model|input|task|dimensions) continue ;;
          esac
          
          # Look up in settings.ts defaults
          local actual=$(grep "${key}:" "$settings_file" | grep -v "//" | grep -v "string\|number\|boolean" | grep "[0-9]\|true\|false" | head -1 | sed "s/.*${key}:[[:space:]]*//" | tr -d ',' | tr -d '[:space:]')
          
          if [ -n "$actual" ]; then
            total=$((total + 1))
            if [ "$val" = "$actual" ]; then
              [[ "$COMPACT" == false ]] && pass "$key = $val (settings.ts)"
              pass_count=$((pass_count + 1))
            else
              fail "$key = $val → ACTUAL: $actual (settings.ts)"
              fail_count=$((fail_count + 1))
            fi
          fi
        fi
      fi
    done < "$target"
  fi
  
  # --- File references ---
  # Look for file paths like core/settings.ts, extensions/soma-boot.ts
  header "FILE REFERENCES"
  
  local file_refs=$(grep -oE '[a-zA-Z_-]+/[a-zA-Z_-]+\.(ts|js|md|sh)' "$target" | sort -u)
  for ref in $file_refs; do
    total=$((total + 1))
    # Check in agent-stable
    if [ -f "$AGENT_STABLE/$ref" ]; then
      [[ "$COMPACT" == false ]] && pass "$ref exists"
      pass_count=$((pass_count + 1))
    elif find "$AGENT_STABLE" -path "*/$ref" -print -quit 2>/dev/null | grep -q .; then
      [[ "$COMPACT" == false ]] && pass "$ref exists (nested)"
      pass_count=$((pass_count + 1))
    else
      fail "$ref NOT FOUND in agent-stable"
      fail_count=$((fail_count + 1))
    fi
  done
  
  # --- Function references ---
  # Look for functionName() patterns
  header "FUNCTION REFERENCES"
  
  local func_refs=$(grep -oE '[a-zA-Z_]+\(\)' "$target" | sort -u | grep -v "^function\(\)")
  for func in $func_refs; do
    local fname="${func%()}"
    total=$((total + 1))
    
    local found=$(grep -rn "function ${fname}\|export.*${fname}\|const ${fname}" "$AGENT_STABLE/core/" "$AGENT_STABLE/extensions/" 2>/dev/null | head -1)
    if [ -n "$found" ]; then
      local loc=$(echo "$found" | cut -d: -f1-2 | sed "s|$AGENT_STABLE/||")
      [[ "$COMPACT" == false ]] && pass "$func found at $loc"
      pass_count=$((pass_count + 1))
    else
      fail "$func NOT FOUND in codebase"
      # Try fuzzy match
      local close=$(grep -rn "$fname" "$AGENT_STABLE/core/" "$AGENT_STABLE/extensions/" 2>/dev/null | head -1 | cut -d: -f1-2 | sed "s|$AGENT_STABLE/||")
      [ -n "$close" ] && dim "→ closest match: $close"
      fail_count=$((fail_count + 1))
    fi
  done
  
  # --- Command references ---
  header "COMMAND REFERENCES"
  
  local cmd_refs=$(grep -oE '/[a-z][-a-z]+' "$target" | sort -u | grep -v "^//" | grep -v "^/dev" | grep -v "^/tmp" | grep -v "^/Users" | grep -v "^\./")
  for cmd in $cmd_refs; do
    # Skip common non-commands
    case "$cmd" in
      /dev|/tmp|/Users|/usr|/etc|/var|/home|/bin|/opt) continue ;;
      /v1|/api|/v1beta) continue ;;
    esac
    total=$((total + 1))
    local cname="${cmd#/}"
    local found=$(grep -rn "registerCommand.*[\"']${cname}[\"']" "$AGENT_STABLE/extensions/" 2>/dev/null | head -1)
    if [ -n "$found" ]; then
      local loc=$(echo "$found" | cut -d: -f1-2 | sed "s|$AGENT_STABLE/||")
      [[ "$COMPACT" == false ]] && pass "$cmd registered at $loc"
      pass_count=$((pass_count + 1))
    else
      # Might be a subcommand or future command
      [[ "$COMPACT" == false ]] && warn "$cmd not found as registered command (may be planned/subcommand)"
    fi
  done
  
  score $pass_count $total
  [ $fail_count -gt 0 ] && echo "FAILURES: $fail_count" && return 1
  return 0
}

# ── SYNC: Cross-ecosystem consistency ────────────────────────────────────

verify_sync() {
  header "SYNC: Protocol Drift (community ↔ bundled)"
  
  if [[ -z "$COMMUNITY_REPO" ]]; then
    dim "Community repo not found — skipping sync checks"
    return 0
  fi

  local pass_count=0
  local fail_count=0
  local total=0
  
  for f in "$COMMUNITY_REPO/protocols/"*.md; do
    local name=$(basename "$f")
    local bundled="$AGENT_STABLE/.soma/protocols/$name"
    total=$((total + 1))
    
    if [ ! -f "$bundled" ]; then
      warn "$name — community only (not bundled)"
      continue
    fi
    
    if diff -q "$f" "$bundled" > /dev/null 2>&1; then
      [[ "$COMPACT" == false ]] && pass "$name — in sync"
      pass_count=$((pass_count + 1))
    else
      fail "$name — DRIFTED"
      if [[ "$COMPACT" == false ]]; then
        # Show what's different
        local c_ver=$(grep "^version:" "$f" 2>/dev/null | awk '{print $2}')
        local b_ver=$(grep "^version:" "$bundled" 2>/dev/null | awk '{print $2}')
        local c_tier=$(grep "^tier:" "$f" 2>/dev/null | awk '{print $2}')
        local b_tier=$(grep "^tier:" "$bundled" 2>/dev/null | awk '{print $2}')
        [ "$c_ver" != "$b_ver" ] && dim "version: community=$c_ver bundled=$b_ver"
        [ "$c_tier" != "$b_tier" ] && dim "tier: community=$c_tier bundled=$b_tier"
        local content_diff=$(diff "$f" "$bundled" | grep "^[<>]" | grep -v "^[<>].*version:\|^[<>].*tier:\|^[<>].*author:\|^[<>].*license:\|^[<>].*scope:" | wc -l | tr -d '[:space:]')
        [ "$content_diff" -gt 0 ] && dim "content lines changed: $content_diff"
      fi
      fail_count=$((fail_count + 1))
    fi
  done
  
  header "SYNC: Agent ↔ CLI"
  
  # Check if CLI is behind agent-stable
  local agent_head=$(git -C "$AGENT_STABLE" log -1 --format="%H %s" 2>/dev/null)
  local cli_last_sync=$(git -C "$CLI_REPO" log -1 --format="%s" 2>/dev/null)
  echo "  agent-stable HEAD: $(echo "$agent_head" | cut -c1-50)"
  echo "  CLI last sync: $cli_last_sync"
  
  # Count commits since last sync
  local last_sync_msg=$(git -C "$CLI_REPO" log -1 --format="%s" 2>/dev/null | sed 's/sync: //')
  echo ""
  
  header "SYNC: Agent main ↔ dev"
  
  local main_head=$(git -C "$AGENT_STABLE" log -1 --format="%h %s" 2>/dev/null)
  local dev_head=$(git -C "$AGENT_DEV" log -1 --format="%h %s" 2>/dev/null)
  echo "  main: $main_head"
  echo "  dev:  $dev_head"
  
  # Commits on main not on dev
  local ahead=$(git -C "$AGENT_STABLE" log --oneline "$(git -C "$AGENT_DEV" rev-parse HEAD 2>/dev/null)..HEAD" 2>/dev/null | wc -l | tr -d '[:space:]')
  [ "$ahead" -gt 0 ] && warn "main is $ahead commits ahead of dev"
  
  score $pass_count $total
}

# ── STREAMS: Pro vs Public protection ────────────────────────────────────

verify_streams() {
  header "STREAMS: Pro ↔ Public Protection"
  
  local issues=0
  
  # Check if any .soma/ files are in agent-stable (shouldn't be, except .soma/protocols and .soma/templates)
  echo "  Checking agent-stable for .soma/ content..."
  local soma_files=$(find "$AGENT_STABLE/.soma/" -name "*.ts" -o -name "*.sh" 2>/dev/null | grep -v "node_modules")
  if [ -n "$soma_files" ]; then
    warn "TypeScript/shell files in agent-stable/.soma/:"
    echo "$soma_files" | while read -r f; do
      echo "    $(echo "$f" | sed "s|$AGENT_STABLE/||")"
    done
    issues=$((issues + 1))
  fi
  
  # Check PRO extensions for imports from core/
  echo ""
  echo "  Checking PRO extensions for core/ imports..."
  if [ -d "$PRO_REPO/extensions" ]; then
    for ext in "$PRO_REPO/extensions/"*.ts; do
      local bad_imports=$(grep "from.*\.\./core\|from.*agent-stable\|require.*core/" "$ext" 2>/dev/null)
      if [ -n "$bad_imports" ]; then
        fail "$(basename "$ext") imports from core/ (must be self-contained)"
        echo "$bad_imports" | while read -r line; do
          dim "$line"
        done
        issues=$((issues + 1))
      else
        [[ "$COMPACT" == false ]] && pass "$(basename "$ext") — self-contained"
      fi
    done
  fi
  
  # Check for command name conflicts
  echo ""
  echo "  Checking command name conflicts..."
  local public_cmds=$(grep -oE "registerCommand\([\"'][^\"']+[\"']" "$AGENT_STABLE/extensions/"*.ts 2>/dev/null | sed "s/.*registerCommand([\"']//" | sed "s/[\"']//")
  local pro_cmds=""
  if [ -d "$PRO_REPO/extensions" ]; then
    pro_cmds=$(grep -oE "registerCommand\([\"'][^\"']+[\"']" "$PRO_REPO/extensions/"*.ts 2>/dev/null | sed "s/.*registerCommand([\"']//" | sed "s/[\"']//")
  fi
  
  for cmd in $pro_cmds; do
    if echo "$public_cmds" | grep -q "^${cmd}$"; then
      fail "Command conflict: /$cmd registered in both public and PRO"
      issues=$((issues + 1))
    fi
  done
  
  # Check symlinks
  echo ""
  echo "  Checking PRO symlinks..."
  for link in "$SOMA_DIR/extensions/"*; do
    if [ -L "$link" ]; then
      local target=$(readlink "$link")
      if [ -f "$link" ]; then
        [[ "$COMPACT" == false ]] && pass "$(basename "$link") → $(basename "$target")"
      else
        fail "$(basename "$link") → BROKEN: $target"
        issues=$((issues + 1))
      fi
    fi
  done
  
  echo ""
  [ $issues -eq 0 ] && echo "✅ No stream issues found" || echo "⚠️  $issues issue(s) found"
}

# ── CHANGELOG: Verify changelog claims against commits ───────────────────

verify_changelog() {
  local scope="${1:-}"
  
  header "CHANGELOG: Verify claims against commits"
  
  local changelog="$AGENT_STABLE/CHANGELOG.md"
  [ ! -f "$changelog" ] && echo "No CHANGELOG.md found" && exit 1
  
  local pass_count=0
  local fail_count=0
  local total=0
  
  # Extract claimed features from [Unreleased] section
  local in_unreleased=false
  while IFS= read -r line; do
    [[ "$line" == "## [Unreleased]"* ]] && in_unreleased=true && continue
    [[ "$line" == "## ["* ]] && [ "$in_unreleased" = true ] && break
    
    if [ "$in_unreleased" = true ] && [[ "$line" == "- "* ]]; then
      # Extract the feature description
      local desc=$(echo "$line" | sed 's/^- \*\*//' | sed 's/\*\*.*//')
      
      # Try to find a commit that matches
      if [ -n "$desc" ]; then
        total=$((total + 1))
        # Search for key words in commit messages
        local keywords=$(echo "$desc" | tr '[:upper:]' '[:lower:]' | grep -oE '[a-z-]{4,}' | head -3 | tr '\n' '|' | sed 's/|$//')
        if [ -n "$keywords" ]; then
          local found=$(git -C "$AGENT_STABLE" log --oneline --all | grep -iE "$keywords" | head -1)
          if [ -n "$found" ]; then
            [[ "$COMPACT" == false ]] && pass "$desc"
            dim "commit: $found"
            pass_count=$((pass_count + 1))
          else
            fail "$desc — no matching commit found"
            fail_count=$((fail_count + 1))
          fi
        fi
      fi
    fi
  done < "$changelog"
  
  # Check for commits not in changelog
  echo ""
  echo "  Recent feat() commits not in changelog:"
  git -C "$AGENT_STABLE" log --oneline -20 | grep "^.*feat" | while read -r line; do
    local msg=$(echo "$line" | sed 's/^[a-f0-9]* //')
    if ! grep -q "$(echo "$msg" | grep -oE '[a-z-]{6,}' | head -1)" "$changelog" 2>/dev/null; then
      warn "$line"
    fi
  done
  
  score $pass_count $total
}

# ── (topic, search, related, sessions, impact, history moved to soma-query.sh) ──

# ── PROTOCOLS: Cross-source protocol version check ───────────────────────

verify_protocols() {
  header "PROTOCOLS: Version check across sources"
  
  local pass_count=0
  local total=0
  local issues=0
  
  # Gather protocol names from community (canonical source)
  local community_dir="$COMMUNITY_REPO/protocols"
  local bundled_dir="$AGENT_STABLE/.soma/protocols"
  local workspace_dir="$SOMA_DIR/amps/protocols"
  
  printf "  %-25s %-10s %-10s %-10s %s\n" "PROTOCOL" "COMMUNITY" "BUNDLED" "WORKSPACE" "STATUS"
  printf "  %-25s %-10s %-10s %-10s %s\n" "─────────────────────────" "──────────" "──────────" "──────────" "──────"
  
  # All protocol names across all sources
  local all_names=""
  for dir in "$community_dir" "$bundled_dir" "$workspace_dir"; do
    [ -d "$dir" ] || continue
    for f in "$dir"/*.md; do
      [ -f "$f" ] || continue
      local name=$(basename "$f" .md)
      [[ "$name" == "_"* || "$name" == "README" ]] && continue
      all_names="$all_names $name"
    done
  done
  all_names=$(echo "$all_names" | tr ' ' '\n' | sort -u)
  
  for name in $all_names; do
    total=$((total + 1))
    
    local cv="" bv="" wv=""
    [ -f "$community_dir/$name.md" ] && cv=$(grep -m1 "^version:" "$community_dir/$name.md" 2>/dev/null | sed 's/version:\s*//')
    [ -f "$bundled_dir/$name.md" ] && bv=$(grep -m1 "^version:" "$bundled_dir/$name.md" 2>/dev/null | sed 's/version:\s*//')
    [ -f "$workspace_dir/$name.md" ] && wv=$(grep -m1 "^version:" "$workspace_dir/$name.md" 2>/dev/null | sed 's/version:\s*//')
    
    local status="✅"
    local note=""
    
    # Check sync between community and bundled
    if [ -n "$cv" ] && [ -n "$bv" ] && [ "$cv" != "$bv" ]; then
      status="❌"
      note="community≠bundled"
      issues=$((issues + 1))
    elif [ -n "$cv" ] && [ -z "$bv" ]; then
      status="ℹ️ "
      note="community only"
    elif [ -z "$cv" ] && [ -n "$bv" ]; then
      status="ℹ️ "
      note="bundled only"
    elif [ -z "$cv" ] && [ -z "$bv" ] && [ -n "$wv" ]; then
      status="ℹ️ "
      note="workspace only"
    else
      pass_count=$((pass_count + 1))
    fi
    
    # Check workspace divergence (informational, not an error)
    if [ -n "$wv" ] && [ -n "$cv" ] && [ "$wv" != "$cv" ]; then
      [ -n "$note" ] && note="$note, " 
      note="${note}workspace diverged"
    fi
    
    printf "  %-25s %-10s %-10s %-10s %s %s\n" \
      "$name" "${cv:-—}" "${bv:-—}" "${wv:-—}" "$status" "$note"
  done
  
  # Check for missing author/license in community
  echo ""
  echo "  Frontmatter completeness (community):"
  local fm_issues=0
  for f in "$community_dir"/*.md; do
    [ -f "$f" ] || continue
    local name=$(basename "$f" .md)
    [[ "$name" == "_"* || "$name" == "README" ]] && continue
    
    local has_author=$(grep -c "^author:" "$f")
    local has_license=$(grep -c "^license:" "$f")
    local has_version=$(grep -c "^version:" "$f")
    
    if [ "$has_author" -eq 0 ] || [ "$has_license" -eq 0 ] || [ "$has_version" -eq 0 ]; then
      local missing=""
      [ "$has_author" -eq 0 ] && missing="author"
      [ "$has_license" -eq 0 ] && missing="$missing license"
      [ "$has_version" -eq 0 ] && missing="$missing version"
      warn "$name — missing: $missing"
      fm_issues=$((fm_issues + 1))
    fi
  done
  [ "$fm_issues" -eq 0 ] && pass "All community protocols have author, license, version"
  
  # Check CC license footers
  echo ""
  echo "  License footers (community):"
  local footer_issues=0
  for f in "$community_dir"/*.md; do
    [ -f "$f" ] || continue
    local name=$(basename "$f" .md)
    [[ "$name" == "_"* || "$name" == "README" ]] && continue
    if ! grep -q "Licensed under" "$f"; then
      warn "$name — no CC license footer"
      footer_issues=$((footer_issues + 1))
    fi
  done
  [ "$footer_issues" -eq 0 ] && pass "All community protocols have license footers"
  
  echo ""
  [ "$issues" -eq 0 ] && echo "  ✅ All protocol versions in sync" || echo "  ⚠️  $issues version mismatch(es)"
  score $pass_count $total
}

# ── WEBSITE: Docs sync + content verification ────────────────────────────

verify_website() {
  header "WEBSITE: Docs sync + content check"
  
  local issues=0
  local pass_count=0
  local total=0
  
  # 1. Check agent-stable docs vs website docs
  echo "  Doc sync (agent-stable → website):"
  local agent_docs="$AGENT_STABLE/docs"
  local website_docs="$WEBSITE_REPO/src/content/docs"
  
  for doc in "$agent_docs"/*.md; do
    [ -f "$doc" ] || continue
    local name=$(basename "$doc")
    total=$((total + 1))
    
    if [ -f "$website_docs/$name" ]; then
      # Compare content after stripping frontmatter + H1 from both
      # (sync-docs.sh strips agent frontmatter + H1, writes Astro frontmatter)
      strip_for_compare() {
        awk '
          BEGIN { in_fm=0; past_fm=0; stripped_h1=0 }
          /^---$/ && !past_fm { in_fm=!in_fm; if(!in_fm) past_fm=1; next }
          in_fm { next }
          !stripped_h1 && /^# / { stripped_h1=1; next }
          !stripped_h1 && /^$/ { next }
          { past_fm=1; stripped_h1=1; print }
        ' "$1"
      }
      # Normalize: strip leading/trailing blank lines for comparison
      local agent_hash=$(strip_for_compare "$doc" | sed '/./,$!d' | sed -e :a -e '/^\n*$/{$d;N;ba' -e '}' | md5 -q 2>/dev/null || strip_for_compare "$doc" | sed '/./,$!d' | md5sum | cut -d' ' -f1)
      local website_hash=$(strip_for_compare "$website_docs/$name" | sed '/./,$!d' | sed -e :a -e '/^\n*$/{$d;N;ba' -e '}' | md5 -q 2>/dev/null || strip_for_compare "$website_docs/$name" | sed '/./,$!d' | md5sum | cut -d' ' -f1)
      
      if [ "$agent_hash" = "$website_hash" ]; then
        [[ "$COMPACT" == false ]] && pass "$name — in sync"
        pass_count=$((pass_count + 1))
      else
        fail "$name — DRIFTED"
        issues=$((issues + 1))
      fi
    else
      warn "$name — not on website"
    fi
  done
  
  # 2. Check hub-index.json item count vs community repo
  echo ""
  echo "  Hub content:"
  if [ -f "$COMMUNITY_REPO/hub-index.json" ]; then
    local index_count=$(python3 -c "import json; print(json.load(open('$COMMUNITY_REPO/hub-index.json'))['count'])" 2>/dev/null || echo "?")
    local actual_count=0
    for dir in protocols muscles skills automations; do
      if [ -d "$COMMUNITY_REPO/$dir" ]; then
        actual_count=$((actual_count + $(find "$COMMUNITY_REPO/$dir" -name "*.md" -not -name "README.md" | wc -l | tr -d ' ')))
      fi
    done
    # Count template dirs
    if [ -d "$COMMUNITY_REPO/templates" ]; then
      actual_count=$((actual_count + $(find "$COMMUNITY_REPO/templates" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')))
    fi
    
    total=$((total + 1))
    if [ "$index_count" = "$actual_count" ]; then
      pass "hub-index.json: $index_count items (matches repo)"
      pass_count=$((pass_count + 1))
    else
      fail "hub-index.json: $index_count items, repo has $actual_count"
      issues=$((issues + 1))
    fi
  fi
  
  # 3. Check for stale paths in docs
  echo ""
  # AMPS structure check: docs should use amps/ paths, not legacy flat paths.
  # Three generations of layout:
  #   OLD:     .soma/memory/muscles/, .soma/memory/protocols/
  #   MIDDLE:  .soma/protocols/, .soma/muscles/, .soma/scripts/  (flat, no amps/)
  #   CURRENT: .soma/amps/protocols/, .soma/amps/muscles/, .soma/amps/scripts/, .soma/amps/automations/
  # This check catches both OLD and MIDDLE references in docs.
  echo "  Stale path references in docs:"
  local stale_paths=0
  
  # OLD layout: memory/muscles, memory/protocols, memory/automations
  local stale_old=$(grep -rn "memory/muscles\|memory/protocols\|memory/automations" "$agent_docs"/ 2>/dev/null)
  if [ -n "$stale_old" ]; then
    echo "$stale_old" | while read -r line; do
      warn "OLD layout: $(echo "$line" | sed "s|$agent_docs/||")"
    done
    stale_paths=$((stale_paths + $(echo "$stale_old" | wc -l | tr -d ' ')))
  fi
  
  # MIDDLE layout: .soma/protocols/, .soma/muscles/, .soma/scripts/ without amps/ prefix
  # Match patterns like: .soma/protocols/ or ├── protocols/ (in tree diagrams)
  # Exclude: .soma/amps/protocols (correct), .protocol-state.json, "protocols exist in"
  local stale_mid=$(grep -rn '\.soma/protocols/\|\.soma/muscles/\|\.soma/scripts/' "$agent_docs"/ 2>/dev/null | grep -v 'amps/')
  if [ -n "$stale_mid" ]; then
    echo "$stale_mid" | while read -r line; do
      warn "FLAT layout (needs amps/): $(echo "$line" | sed "s|$agent_docs/||")"
    done
    stale_paths=$((stale_paths + $(echo "$stale_mid" | wc -l | tr -d ' ')))
  fi
  
  # Tree diagram check: ├── protocols/ or └── scripts/ at ROOT level (not under amps/)
  # These appear in directory tree examples that show the old flat structure.
  # We check each file individually so we can use awk to detect context:
  # if a protocols/muscles/scripts line appears within 5 lines of an amps/ line,
  # it's correctly nested and not stale.
  for doc in "$agent_docs"/*.md; do
    [ -f "$doc" ] || continue
    local docname=$(basename "$doc")
    # Find tree lines with protocols/muscles/scripts that are NOT under amps/
    # Strategy: awk tracks whether we're "inside" an amps/ tree block
    local stale_tree_hits=$(awk '
      /amps\// { amps_line = NR }
      /(├──|└──|│.*├──|│.*└──).*(protocols|muscles|scripts)\// {
        if (NR - amps_line <= 10 && amps_line > 0) next  # nested under amps/ — OK
        if (/amps\//) next                                # line itself mentions amps/ — OK
        if (/community\//) next                           # community repo paths — OK
        print NR": "$0
      }
    ' "$doc")
    if [ -n "$stale_tree_hits" ]; then
      echo "$stale_tree_hits" | while read -r line; do
        warn "TREE diagram (flat, needs amps/): $docname:$line"
      done
      stale_paths=$((stale_paths + $(echo "$stale_tree_hits" | wc -l | tr -d ' ')))
    fi
  done
  
  [ "$stale_paths" -eq 0 ] && pass "No stale layout paths in docs"
  
  echo ""
  [ "$issues" -eq 0 ] && echo "  ✅ Website content verified" || echo "  ⚠️  $issues issue(s)"
  score $pass_count $total
}

# ── REPOS: Multi-repo state check ────────────────────────────────────────

verify_repos() {
  header "REPOS: Multi-repo State"
  
  local repos=("agent-stable" "agent" "cli" "website" "community" "soma-pro")
  
  printf "  %-15s %-8s %-7s %-50s\n" "REPO" "BRANCH" "DIRTY?" "HEAD COMMIT"
  printf "  %-15s %-8s %-7s %-50s\n" "───────────────" "────────" "───────" "──────────────────────────────────────────────────"
  
  for repo_name in "${repos[@]}"; do
    local repo="$PROJECT_ROOT/repos/$repo_name"
    [ ! -d "$repo/.git" ] && continue
    
    local branch=$(git -C "$repo" branch --show-current 2>/dev/null || echo "?")
    local dirty=""
    git -C "$repo" diff --quiet 2>/dev/null || dirty="YES"
    git -C "$repo" diff --cached --quiet 2>/dev/null || dirty="STAGED"
    [ -z "$dirty" ] && dirty="clean"
    local head=$(git -C "$repo" log -1 --format="%h %s" 2>/dev/null | cut -c1-50)
    
    printf "  %-15s %-8s %-7s %s\n" "$repo_name" "$branch" "$dirty" "$head"
  done
  
  # Unpushed commits
  echo ""
  echo "  Unpushed:"
  for repo_name in "${repos[@]}"; do
    local repo="$PROJECT_ROOT/repos/$repo_name"
    [ ! -d "$repo/.git" ] && continue
    local unpushed=$(git -C "$repo" log --oneline @{u}..HEAD 2>/dev/null | wc -l | tr -d '[:space:]')
    [ "$unpushed" -gt 0 ] && warn "$repo_name: $unpushed unpushed commit(s)"
  done
}

# ── AGENT: Delegate analysis to Haiku sub-agent ─────────────────────────

verify_agent() {
  local task="$1"
  shift
  local files=("$@")
  
  header "AGENT: Delegating '$task' to Haiku"
  
  # Check if we can call Claude API
  local api_key="${ANTHROPIC_API_KEY:-}"
  if [ -z "$api_key" ]; then
    # Try to read from soma secrets
    local key_file="$SOMA_DIR/secrets/anthropic.key"
    [ -f "$key_file" ] && api_key=$(cat "$key_file")
  fi
  
  if [ -z "$api_key" ]; then
    fail "No ANTHROPIC_API_KEY found. Set env var or create .soma/secrets/anthropic.key"
    return 1
  fi
  
  # Build context from files
  local context=""
  for f in "${files[@]}"; do
    if [ -f "$f" ]; then
      local relpath=$(echo "$f" | sed "s|$PROJECT_ROOT/||")
      context+="--- FILE: $relpath ---\n"
      context+=$(head -100 "$f")
      context+="\n\n"
    fi
  done
  
  # If no files specified, gather based on task
  if [ ${#files[@]} -eq 0 ]; then
    case "$task" in
      drift)
        echo "  Gathering session logs + preloads for drift analysis..."
        for f in "$SOMA_DIR/memory/sessions/"*.md "$SOMA_DIR/memory/preloads/"*.md; do
          [ -f "$f" ] && context+="--- $(basename "$f") ---\n$(cat "$f")\n\n"
        done
        ;;
      missed)
        echo "  Gathering recent commits + session logs to find missed items..."
        for repo_name in agent-stable cli; do
          local repo="$PROJECT_ROOT/repos/$repo_name"
          context+="--- $repo_name commits (last 20) ---\n"
          context+="$(git -C "$repo" log --oneline -20 2>/dev/null)\n\n"
        done
        for f in "$SOMA_DIR/memory/sessions/"*.md; do
          [ -f "$f" ] && context+="--- $(basename "$f") ---\n$(cat "$f")\n\n"
        done
        ;;
      patterns)
        echo "  Gathering session history for pattern detection..."
        for f in "$SOMA_DIR/memory/sessions/"*.md "$SOMA_DIR/memory/preloads/"*.md; do
          [ -f "$f" ] && context+="--- $(basename "$f") ---\n$(cat "$f")\n\n"
        done
        ;;
      *)
        echo "  Available tasks: drift, missed, patterns"
        echo "  Or specify files: soma-verify.sh agent <task> file1 file2 ..."
        return 1
        ;;
    esac
  fi
  
  # Build the prompt based on task
  local system_prompt="You are a code analysis assistant. Be concise and specific. Output structured findings."
  local user_prompt=""
  
  case "$task" in
    drift)
      user_prompt="Analyze these session logs and preloads for drift — things mentioned as done or changed that might not actually be reflected in the codebase. Look for: settings values mentioned that may be wrong, features claimed as shipped but possibly incomplete, file paths referenced that may have moved. Output a bullet list of potential drift items with severity (high/medium/low)."
      ;;
    missed)
      user_prompt="Compare these git commit logs against session logs. Find: (1) commits that aren't logged in any session, (2) session log claims that don't match any commit, (3) features mentioned in sessions but missing from changelog. Output a structured report."
      ;;
    patterns)
      user_prompt="Analyze these session logs and preloads for recurring patterns: (1) things that keep coming up as issues, (2) workflow friction points, (3) decisions that were revisited, (4) features that were planned but never started. Suggest which patterns should become muscles or protocols."
      ;;
    *)
      user_prompt="$task"
      ;;
  esac
  
  user_prompt+="\n\nContext:\n$context"
  
  echo "  Calling Claude haiku..."
  
  local response=$(curl -s https://api.anthropic.com/v1/messages \
    -H "Content-Type: application/json" \
    -H "x-api-key: $api_key" \
    -H "anthropic-version: 2023-06-01" \
    -d "$(jq -n \
      --arg sys "$system_prompt" \
      --arg msg "$user_prompt" \
      '{
        model: "claude-3-5-haiku-latest",
        max_tokens: 2000,
        system: $sys,
        messages: [{role: "user", content: $msg}]
      }')" 2>/dev/null)
  
  if [ -z "$response" ]; then
    fail "API call failed"
    return 1
  fi
  
  # Extract the text content
  local text=$(echo "$response" | jq -r '.content[0].text // .error.message // "No response"' 2>/dev/null)
  
  echo ""
  echo "$text"
  
  # Save analysis to memory
  local outfile="$SOMA_DIR/memory/sessions/agent-analysis-$(date +%Y%m%d-%H%M).md"
  cat > "$outfile" << EOF
---
type: analysis
source: haiku-agent
task: $task
created: $(date +%Y-%m-%d)
---

# Agent Analysis: $task

$text
EOF
  echo ""
  dim "Saved to: $outfile"
}

# ── Main ─────────────────────────────────────────────────────────────────

usage() {
  echo ""
  echo -e "${SOMA_BOLD:-}σ soma-verify${SOMA_NC:-} ${SOMA_DIM:-}— health checks and truth-checking${SOMA_NC:-}"
  echo ""
  echo -e "  ${SOMA_BOLD:-}Verification${SOMA_NC:-}"
  echo -e "    doc <file>                ${SOMA_DIM:-}verify claims in a doc against code${SOMA_NC:-}"
  echo -e "    sync                      ${SOMA_DIM:-}cross-ecosystem consistency${SOMA_NC:-}"
  echo -e "    protocols                 ${SOMA_DIM:-}protocol versions across all sources${SOMA_NC:-}"
  echo -e "    website                   ${SOMA_DIM:-}docs sync + hub content + stale paths${SOMA_NC:-}"
  echo -e "    streams                   ${SOMA_DIM:-}pro vs public protection check${SOMA_NC:-}"
  echo -e "    changelog                 ${SOMA_DIM:-}verify changelog against commits${SOMA_NC:-}"
  echo -e "    repos                     ${SOMA_DIM:-}multi-repo state check${SOMA_NC:-}"
  echo ""
  echo -e "  ${SOMA_BOLD:-}Agent Delegation${SOMA_NC:-}"
  echo -e "    agent drift               ${SOMA_DIM:-}haiku analyzes session logs for drift${SOMA_NC:-}"
  echo -e "    agent missed              ${SOMA_DIM:-}haiku compares commits vs logs${SOMA_NC:-}"
  echo -e "    agent patterns            ${SOMA_DIM:-}haiku finds recurring patterns${SOMA_NC:-}"
  echo -e "    agent <prompt> [files...] ${SOMA_DIM:-}custom haiku analysis${SOMA_NC:-}"
  echo ""
  echo -e "  ${SOMA_BOLD:-}Hygiene${SOMA_NC:-}"
  echo -e "    drift                     ${SOMA_DIM:-}_public/ ↔ working ↔ community ↔ docs ↔ website${SOMA_NC:-}"
  echo -e "    hygiene                   ${SOMA_DIM:-}full sweep: plans + scripts + muscles${SOMA_NC:-}"
  echo -e "    self-analysis             ${SOMA_DIM:-}deep ecosystem health check${SOMA_NC:-}"
  echo ""
  echo -e "  ${SOMA_BOLD:-}See also${SOMA_NC:-}"
  echo -e "    tests/test-hub.sh         ${SOMA_DIM:-}regression: /hub install, fork, share, website${SOMA_NC:-}"
  echo -e "    tests/test-commands.sh    ${SOMA_DIM:-}regression: drop-in commands, init, docs${SOMA_NC:-}"
  echo -e "    npm test                  ${SOMA_DIM:-}unit tests (12 suites, 185+ assertions)${SOMA_NC:-}"
  echo ""
  echo -e "  ${SOMA_DIM:-}--compact  errors only  |  --help  this help${SOMA_NC:-}"
  echo -e "  ${SOMA_DIM:-}BSL 1.1 © Curtis Mercier — open source 2027${SOMA_NC:-}"
  echo ""
}

# ═══════════════════════════════════════════════════════════════════════════
# HYGIENE — unified consolidation sweep
# ═══════════════════════════════════════════════════════════════════════════

verify_hygiene() {
  echo ""
  echo "━━━ HYGIENE: Full Workspace Sweep ━━━"
  local issues=0

  # 1. Plans
  echo "  ── Plans ──"
  if command -v bash &>/dev/null && [[ -f "$SOMA_DIR/amps/scripts/soma-plans.sh" ]]; then
    # Budget check
    local active_plans=$(find "$SOMA_DIR/docs/plans" "$SOMA_DIR/releases" -name "*.md" \
      -not -path "*/_archive/*" -not -name "_kanban*" -not -name "README*" \
      -exec grep -l "^status: active" {} \; 2>/dev/null | wc -l | tr -d ' ')
    if [[ $active_plans -le 12 ]]; then
      pass "Plans: ${active_plans}/12 budget"
    else
      fail "Plans: ${active_plans}/12 budget (over!)"
      issues=$((issues + 1))
    fi

    # Complete plans that should be archived
    local complete_plans=$(find "$SOMA_DIR/docs/plans" "$SOMA_DIR/releases" -name "*.md" \
      -not -path "*/_archive/*" -not -name "_kanban*" \
      -exec grep -l "^status: complete" {} \; 2>/dev/null | wc -l | tr -d ' ')
    if [[ $complete_plans -gt 0 ]]; then
      warn "Plans: $complete_plans complete plan(s) should be archived"
      issues=$((issues + 1))
    else
      pass "Plans: no un-archived complete plans"
    fi
  else
    warn "soma-plans.sh not found — skipping plan checks"
  fi

  # 2. Scripts
  echo ""
  echo "  ── Scripts ──"
  local deprecated_scripts=0
  local orphan_scripts=0
  for f in "$SOMA_DIR/amps/scripts"/*.sh; do
    [[ -f "$f" ]] || continue
    local name=$(basename "$f")

    # Deprecated check
    if head -5 "$f" | grep -qi "DEPRECATED" 2>/dev/null; then
      deprecated_scripts=$((deprecated_scripts + 1))
      warn "Script deprecated: $name"
      issues=$((issues + 1))
    fi

    # Orphan check (zero references outside itself)
    local base=$(basename "$f" .sh)
    local refs=$(grep -rl "$base" "$SOMA_DIR/amps/muscles/" "$SOMA_DIR/amps/scripts/" "$SOMA_DIR/identity.md" 2>/dev/null \
      | grep -v "$f" | wc -l | tr -d ' ')
    if [[ $refs -eq 0 ]]; then
      orphan_scripts=$((orphan_scripts + 1))
      dim "Script unreferenced: $name ($refs refs)"
    fi
  done
  [[ $deprecated_scripts -eq 0 ]] && pass "Scripts: no deprecated scripts in active dir"

  # 3. Muscles
  echo ""
  echo "  ── Muscles ──"
  local stale_muscles=0
  local no_digest=0
  for f in "$SOMA_DIR/amps/muscles"/*.md; do
    [[ -f "$f" ]] || continue
    local name=$(basename "$f" .md)
    local status=$(grep -m1 "^status:" "$f" 2>/dev/null | sed 's/status: *//')
    [[ "$status" == "archived" ]] && continue

    # Check for digest
    if ! grep -q "<!-- digest:start -->" "$f" 2>/dev/null; then
      no_digest=$((no_digest + 1))
      dim "Muscle missing digest: $name"
    fi

    # Check for references to archived/missing scripts
    if grep -q "soma-audit\|soma-restart\|soma-self-switch" "$f" 2>/dev/null; then
      warn "Muscle references archived scripts: $name"
      issues=$((issues + 1))
      stale_muscles=$((stale_muscles + 1))
    fi
  done
  [[ $stale_muscles -eq 0 ]] && pass "Muscles: no stale script references"
  [[ $no_digest -eq 0 ]] && pass "Muscles: all have digests"

  # 4. Sessions & Preloads
  echo ""
  echo "  ── Sessions & Preloads ──"
  local session_dir="$SOMA_DIR/memory/sessions"
  local preload_dir="$SOMA_DIR/memory/preloads"
  local session_issues=0

  if [[ -d "$session_dir" ]]; then
    # Count session files
    local session_count=$(find "$session_dir" -name "*.md" -not -name "scratchpad*" -not -name "agent-analysis*" | wc -l | tr -d ' ')
    pass "Sessions: $session_count session log files"

    # Check for OLD daily-only format (YYYY-MM-DD.md without session number)
    local daily_only=0
    local old_id_format=0
    for f in "$session_dir"/*.md; do
      [[ -f "$f" ]] || continue
      local fname=$(basename "$f")
      [[ "$fname" == "scratchpad.md" || "$fname" == agent-analysis* ]] && continue
      # Match exactly YYYY-MM-DD.md (no session suffix at all)
      if [[ "$fname" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}\.md$ ]]; then
        daily_only=$((daily_only + 1))
      # Match old YYYY-MM-DD-XXXXXX.md (session ID, not iterating number)
      elif [[ "$fname" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-f0-9]{6}\.md$ ]]; then
        old_id_format=$((old_id_format + 1))
      fi
    done
    if [[ $daily_only -gt 0 ]]; then
      warn "Sessions: $daily_only file(s) using old daily format (YYYY-MM-DD.md) — may contain overwritten data"
      issues=$((issues + 1))
      session_issues=$((session_issues + 1))
    fi
    if [[ $old_id_format -gt 0 ]]; then
      warn "Sessions: $old_id_format file(s) using old session-ID format (YYYY-MM-DD-XXXXXX.md) — IDs can collide on restart"
      issues=$((issues + 1))
      session_issues=$((session_issues + 1))
    fi
    if [[ $daily_only -eq 0 && $old_id_format -eq 0 ]]; then
      pass "Sessions: all use per-session naming (YYYY-MM-DD-sNN.md)"
    fi

    # Check for empty session files
    local empty_sessions=0
    for f in "$session_dir"/*.md; do
      [[ -f "$f" ]] || continue
      local fname=$(basename "$f")
      [[ "$fname" == "scratchpad.md" ]] && continue
      local size=$(wc -c < "$f" | tr -d ' ')
      if [[ $size -lt 50 ]]; then
        empty_sessions=$((empty_sessions + 1))
        dim "Empty session: $fname ($size bytes)"
      fi
    done
    [[ $empty_sessions -eq 0 ]] && pass "Sessions: no empty files"
  fi

  if [[ -d "$preload_dir" ]]; then
    local preload_count=$(find "$preload_dir" -name "preload-*.md" | wc -l | tr -d ' ')
    pass "Preloads: $preload_count preload files"

    # Check for preload/session ratio (more preloads than sessions = possible data loss)
    if [[ -d "$session_dir" ]]; then
      local today=$(date +%Y-%m-%d)
      local today_preloads=$(find "$preload_dir" -name "preload-*${today}*" | wc -l | tr -d ' ')
      local today_sessions=$(find "$session_dir" -name "${today}*" -not -name "scratchpad*" -not -name "agent-analysis*" | wc -l | tr -d ' ')
      if [[ $today_preloads -gt 0 && $today_sessions -eq 0 ]]; then
        warn "Today: $today_preloads preloads but 0 session logs — possible data loss"
        issues=$((issues + 1))
        session_issues=$((session_issues + 1))
      elif [[ $today_preloads -gt $((today_sessions + 2)) ]]; then
        warn "Today: $today_preloads preloads vs $today_sessions sessions — ratio suggests missing logs"
        issues=$((issues + 1))
        session_issues=$((session_issues + 1))
      else
        pass "Today: $today_sessions sessions, $today_preloads preloads (ratio OK)"
      fi
    fi
  fi
  [[ $session_issues -eq 0 ]] && pass "Sessions: healthy"

  # 5. Protocols
  echo ""
  echo "  ── Protocols ──"
  local no_tldr=0
  for f in "$SOMA_DIR/amps/protocols"/*.md; do
    [[ -f "$f" ]] || continue
    local name=$(basename "$f" .md)
    [[ "$name" == "_template" || "$name" == "README" ]] && continue

    if ! grep -q "## TL;DR" "$f" 2>/dev/null; then
      local lines=$(wc -l < "$f" | tr -d ' ')
      if [[ $lines -gt 20 ]]; then
        no_tldr=$((no_tldr + 1))
        dim "Protocol missing TL;DR: $name ($lines lines)"
      fi
    fi
  done
  [[ $no_tldr -eq 0 ]] && pass "Protocols: all have TL;DRs"

  # 6. Stale Terms
  echo ""
  echo "  ── Stale Terms ──"
  local stale_script="$PROJECT_ROOT/repos/agent/scripts/_dev/audits/stale-terms.sh"
  if [[ -f "$stale_script" ]]; then
    # Run stale-terms against AMPS content (muscles, protocols, scripts headers)
    local stale_output
    stale_output=$(bash "$stale_script" "" "$SOMA_DIR/amps" 2>&1)
    if echo "$stale_output" | grep -q "⚠"; then
      local stale_count=$(echo "$stale_output" | grep -c "⚠  \"" || true)
      warn "Stale terms: $stale_count deprecated term(s) in AMPS content"
      echo "$stale_output" | grep "⚠\|     " | head -15 | while read -r line; do dim "  $line"; done
      issues=$((issues + $stale_count))
    else
      pass "Stale terms: no deprecated terminology in AMPS"
    fi
  else
    dim "stale-terms.sh not found — skipping"
  fi

  echo ""
  if [[ $issues -eq 0 ]]; then
    echo "  ✅ Workspace hygiene: clean"
  else
    echo "  ⚠️  $issues hygiene issue(s) found"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════
# SELF-ANALYSIS — deep ecosystem health check
# ═══════════════════════════════════════════════════════════════════════════

verify_self_analysis() {
  header "SELF-ANALYSIS: Deep Ecosystem Health"
  local issues=0

  # ── Muscle Health ──
  echo "  ── Muscles ──"
  local muscle_dir="$SOMA_DIR/amps/muscles"
  local archived_muscles=0
  local missing_fm=0
  local broken_refs=0

  for f in "$muscle_dir"/*.md; do
    [[ -f "$f" ]] || continue
    local name=$(basename "$f" .md)
    [[ "$name" == "_decisions" ]] && continue

    local status=$(grep '^status:' "$f" | head -1 | sed 's/status: *//')
    if [[ "$status" == "archived" || "$status" == "deprecated" ]]; then
      warn "Archived muscle in active dir: $name"
      archived_muscles=$((archived_muscles + 1))
    fi

    # Check required frontmatter — triggers is the canonical activation field (v0.6.2+)
    # keywords and topic were merged into triggers — no longer required
    if ! grep -q "^triggers:" "$f"; then
      dim "$name missing frontmatter: triggers"
      missing_fm=$((missing_fm + 1))
    fi

    # Check script references exist (search root + subdirectories, skip _ prefixed)
    local scripts=$(grep -oh 'soma-[a-z-]*\.sh' "$f" 2>/dev/null | sort -u)
    for s in $scripts; do
      local found=false
      # Search root level and all non-_ subdirectories (matches boot discovery)
      if [[ -f "$SOMA_DIR/amps/scripts/$s" ]]; then
        found=true
      else
        for subdir in "$SOMA_DIR/amps/scripts"/*/; do
          [[ "$(basename "$subdir")" == _* ]] && continue
          if [[ -f "${subdir}${s}" ]]; then
            found=true
            break
          fi
        done
      fi
      if [[ "$found" == "false" ]]; then
        warn "$name references non-existent script: $s"
        broken_refs=$((broken_refs + 1))
      fi
    done
  done

  [[ $archived_muscles -eq 0 ]] && pass "No archived muscles in active directory"
  [[ $missing_fm -eq 0 ]] && pass "All muscles have required frontmatter"
  [[ $broken_refs -eq 0 ]] && pass "All muscle script references valid"
  issues=$((issues + archived_muscles + broken_refs))

  local active_count=$(ls "$muscle_dir"/*.md 2>/dev/null | xargs grep -l '^status: active' 2>/dev/null | wc -l | tr -d ' ')
  dim "$active_count active muscles"

  # ── Cross-location Duplication ──
  echo "  ── Cross-location Duplication ──"
  local grav_soma="$HOME/Gravicity/.soma"
  # Skip if the other .soma/ is archived (has ARCHIVED.md)
  if [[ -d "$grav_soma" && ! -f "$grav_soma/ARCHIVED.md" ]]; then
    # Muscles
    local grav_muscles="$grav_soma/memory/muscles"
    if [[ -d "$grav_muscles" ]]; then
      local dupes=0
      for f in "$grav_muscles"/*.md; do
        [[ -f "$f" ]] || continue
        local name=$(basename "$f")
        if [[ -f "$muscle_dir/$name" ]]; then
          if ! diff -q "$f" "$muscle_dir/$name" >/dev/null 2>&1; then
            dim "Diverged muscle: $name (Gravicity vs meetsoma)"
            dupes=$((dupes + 1))
          fi
        fi
      done
      [[ $dupes -eq 0 ]] && pass "No diverged muscles between Gravicity and meetsoma"
      [[ $dupes -gt 0 ]] && warn "$dupes diverged muscle(s) between Gravicity and meetsoma"
      issues=$((issues + dupes))
    fi

    # Scripts
    local grav_scripts="$grav_soma/scripts"
    if [[ -d "$grav_scripts" ]]; then
      local script_dupes=0
      for f in "$grav_scripts"/*.sh; do
        [[ -f "$f" ]] || continue
        local name=$(basename "$f")
        if [[ -f "$SOMA_DIR/amps/scripts/$name" ]]; then
          if ! diff -q "$f" "$SOMA_DIR/amps/scripts/$name" >/dev/null 2>&1; then
            dim "Diverged script: $name"
            script_dupes=$((script_dupes + 1))
          fi
        fi
      done
      [[ $script_dupes -eq 0 ]] && pass "No diverged scripts between Gravicity and meetsoma"
      [[ $script_dupes -gt 0 ]] && warn "$script_dupes diverged script(s) — meetsoma is canonical"
      issues=$((issues + script_dupes))
    fi

    # Protocols
    local grav_protocols="$grav_soma/protocols"
    if [[ -d "$grav_protocols" ]]; then
      local proto_dupes=0
      for f in "$grav_protocols"/*.md; do
        [[ -f "$f" ]] || continue
        local name=$(basename "$f")
        if [[ -f "$SOMA_DIR/amps/protocols/$name" ]]; then
          if ! diff -q "$f" "$SOMA_DIR/amps/protocols/$name" >/dev/null 2>&1; then
            dim "Diverged protocol: $name"
            proto_dupes=$((proto_dupes + 1))
          fi
        fi
      done
      [[ $proto_dupes -eq 0 ]] && pass "No diverged protocols"
      [[ $proto_dupes -gt 0 ]] && warn "$proto_dupes diverged protocol(s) — meetsoma is canonical"
      issues=$((issues + proto_dupes))
    fi
  else
    dim "Gravicity/.soma not found — skipping cross-location check"
  fi

  # ── Muscle ↔ Muscle Linkage ──
  echo "  ── Muscle Linkage ──"
  local orphan_muscles=0
  for f in "$muscle_dir"/*.md; do
    [[ -f "$f" ]] || continue
    local name=$(basename "$f" .md)
    [[ "$name" == "_decisions" ]] && continue
    local status=$(grep '^status:' "$f" | head -1 | sed 's/status: *//')
    [[ "$status" != "active" ]] && continue

    # Check if this muscle is referenced by any other muscle, protocol, or script
    local refs
    refs=$(grep -rl "$name" "$SOMA_DIR/amps/" 2>/dev/null | grep -v "$f" | wc -l | tr -d ' ') || true
    refs=${refs:-0}
    if [[ "$refs" -eq 0 ]]; then
      # Also check identity.md
      local id_ref
      id_ref=$(grep -c "$name" "$SOMA_DIR/identity.md" 2>/dev/null) || true
      id_ref=${id_ref:-0}
      if [[ "$id_ref" -eq 0 ]]; then
        dim "Orphan muscle (unreferenced): $name"
        orphan_muscles=$((orphan_muscles + 1))
      fi
    fi
  done
  [[ $orphan_muscles -eq 0 ]] && pass "All active muscles are cross-referenced"
  [[ $orphan_muscles -gt 0 ]] && dim "$orphan_muscles muscle(s) not referenced by other AMPS content"

  # ── Session Naming Consistency ──
  echo "  ── Session Naming ──"
  local sess_dir="$SOMA_DIR/memory/sessions"
  local old_format=0
  local new_format=0
  for f in "$sess_dir"/*.md; do
    [[ -f "$f" ]] || continue
    local name=$(basename "$f")
    if [[ "$name" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}-s[0-9]+-[a-f0-9]+\.md$ ]]; then
      new_format=$((new_format + 1))
    elif [[ "$name" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}\.md$ ]]; then
      old_format=$((old_format + 1))
    fi
  done
  [[ $old_format -gt 0 ]] && dim "$old_format session(s) using old daily format (may have overwrites)"
  dim "$new_format session(s) using new sNN-hex format"
  local total_sessions=$(ls "$sess_dir"/*.md 2>/dev/null | wc -l | tr -d ' ')
  dim "$total_sessions total session files"

  # ── Summary ──
  echo ""
  if [[ $issues -eq 0 ]]; then
    pass "Self-analysis: clean"
  else
    warn "$issues issue(s) found — see report for details"
  fi
}

## ── COPY: Marketing copy vs source of truth ─────────────────────────────

verify_copy() {
  header "COPY: Website marketing vs source of truth"
  
  local issues=0
  local pass_count=0
  local total=0
  
  local WEBSITE="$PROJECT_ROOT/repos/website/src"
  local COMMUNITY="$PROJECT_ROOT/repos/community"
  local AGENT="$PROJECT_ROOT/repos/agent"
  
  # ── 1. Count verification ──
  echo "  Hub counts (ecosystem page vs community repo):"
  
  # Protocol count
  local page_protocols=$(grep 'stat-number' "$WEBSITE/pages/ecosystem/index.astro" | sed 's/.*stat-number">//;s/<.*//' | head -1)
  local actual_protocols=$(find "$COMMUNITY/protocols" -name "*.md" -not -name "README.md" 2>/dev/null | wc -l | tr -d ' ')
  total=$((total + 1))
  if [ "$page_protocols" = "$actual_protocols" ]; then
    pass "Protocols: $page_protocols (matches)"
    pass_count=$((pass_count + 1))
  else
    fail "Protocols: page says $page_protocols, hub has $actual_protocols"
    issues=$((issues + 1))
  fi
  
  # Muscle count
  local page_muscles=$(grep 'stat-number' "$WEBSITE/pages/ecosystem/index.astro" | sed 's/.*stat-number">//;s/<.*//' | sed -n '2p')
  local actual_muscles=$(find "$COMMUNITY/muscles" -name "*.md" -not -name "README.md" 2>/dev/null | wc -l | tr -d ' ')
  total=$((total + 1))
  if [ "$page_muscles" = "$actual_muscles" ]; then
    pass "Muscles: $page_muscles (matches)"
    pass_count=$((pass_count + 1))
  else
    fail "Muscles: page says $page_muscles, hub has $actual_muscles"
    issues=$((issues + 1))
  fi
  
  # Template count
  local page_templates=$(grep 'stat-number' "$WEBSITE/pages/ecosystem/index.astro" | sed 's/.*stat-number">//;s/<.*//' | sed -n '3p')
  local actual_templates=$(find "$COMMUNITY/templates" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
  total=$((total + 1))
  if [ "$page_templates" = "$actual_templates" ]; then
    pass "Templates: $page_templates (matches)"
    pass_count=$((pass_count + 1))
  else
    fail "Templates: page says $page_templates, hub has $actual_templates"
    issues=$((issues + 1))
  fi
  
  # ── 2. Named content verification ──
  echo ""
  echo "  Named content (do referenced items exist?):"
  
  # Check muscle names mentioned in ecosystem + homepage
  for page in "$WEBSITE/pages/index.astro" "$WEBSITE/pages/ecosystem/index.astro"; do
    local pagename=$(basename $(dirname "$page"))/$(basename "$page")
    # Extract code tags that look like content names (inside layer/muscle sections)
    local muscle_refs=$(grep -o '<code>[a-z][-a-z]*</code>' "$page" | sed 's/<code>//;s/<\/code>//' | grep -v "soma-\|\.ts\|\.md\|\.json\|/\|--\|npm\|git\|init\|install\|list\|fork\|template\|export\|vote" | sort -u)
    for name in $muscle_refs; do
      # Check if it exists in community or agent bundled
      local found=false
      [ -f "$COMMUNITY/muscles/$name.md" ] && found=true
      [ -f "$COMMUNITY/protocols/$name.md" ] && found=true
      [ -f "$AGENT/.soma/protocols/$name.md" ] && found=true
      [ -f "$AGENT/.soma/muscles/$name.md" ] && found=true
      # Known non-content names (extension names, commands, etc.)
      case "$name" in
        breath-cycle|frontmatter|heat-tracking|workflow|quality-standards) found=true ;; # abbreviations of real protocols
        exhale|breathe|rest|soma|pin|kill|scratch|auto-breathe|auto-commit|guard-status) found=true ;; # commands
        devops|writer|architect) found=true ;; # template names
        logo-creator|favicon-gen|remotion|remotion-best-practices) found=true ;; # Pi skills (inherited, work in Soma)
        session-start|post-commit|pre-deploy|post-ship-review|dev-session) found=true ;; # automation trigger examples (descriptive, not installable)
      esac
      total=$((total + 1))
      if $found; then
        pass_count=$((pass_count + 1))
      else
        warn "$pagename references '$name' — not found in hub or bundled"
        issues=$((issues + 1))
      fi
    done
  done
  
  # ── 3. Roadmap staleness ──
  echo ""
  echo "  Roadmap (shipped items still in 'upcoming'?):"
  local roadmap_page="$WEBSITE/pages/roadmap/index.astro"
  local shipped_in_upcoming=$(grep -B2 "'Shipped'" "$roadmap_page" | grep "name:" | sed "s/.*name: '//;s/'.*//")
  total=$((total + 1))
  if [ -z "$shipped_in_upcoming" ]; then
    pass "No shipped items in 'What's Next'"
    pass_count=$((pass_count + 1))
  else
    fail "Shipped items still in upcoming: $shipped_in_upcoming"
    issues=$((issues + 1))
  fi
  
  # ── 4. Layer framing check ──
  echo ""
  echo "  Layer framing:"
  total=$((total + 1))
  local four_refs=$(grep -c "four layers\|Four layers\|four types\|Four Types" "$WEBSITE/pages/index.astro" "$WEBSITE/pages/ecosystem/index.astro" 2>/dev/null | grep -v ":0$" | wc -l | tr -d ' ')
  if [ "$four_refs" -gt 0 ]; then
    warn "'Four layers' language found in $four_refs page(s) — Soma has AMPS (4) + Extensions + Skills"
    issues=$((issues + 1))
  else
    pass "No stale 'four layers' framing"
    pass_count=$((pass_count + 1))
  fi
  
  # ── 5. Enterprise/paywall language ──
  total=$((total + 1))
  local enterprise_refs=$(grep -rn "enterprise\|free tier\|Free tier" "$WEBSITE/pages/" --include="*.astro" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$enterprise_refs" -gt 0 ]; then
    warn "Enterprise/free-tier language found ($enterprise_refs references)"
    grep -rn "enterprise\|free tier\|Free tier" "$WEBSITE/pages/" --include="*.astro" 2>/dev/null | while read -r line; do
      echo "    $line"
    done
    issues=$((issues + 1))
  else
    pass "No stale enterprise/paywall language"
    pass_count=$((pass_count + 1))
  fi
  
  echo ""
  [ "$issues" -eq 0 ] && echo "  ✅ Copy verified" || echo "  ⚠️  $issues issue(s)"
  score $pass_count $total
}

# ═══════════════════════════════════════════════════════════════════════════
# DRIFT: _public/ ↔ working copy ↔ community repo sync check
# ═══════════════════════════════════════════════════════════════════════════

# Strip runtime fields that are always different per-project (heat, loads, etc.)
# Used before diffing to separate real content drift from expected divergence.
strip_runtime() {
  grep -v "^heat:\|^loads:\|^heat-default:\|^last-run:\|^runs:" "$1"
}

# Strip hub metadata fields (tier, license, author, version, breadcrumb)
# Community is source of truth for these — not a sync concern.
strip_hub_meta() {
  grep -v "^tier:\|^license:\|^author:\|^version:\|^breadcrumb:" "$1"
}

# Content-only diff: strip runtime + hub meta, compare what remains.
# Returns 0 if same content, 1 if different.
content_diff() {
  local a="$1" b="$2"
  diff -q <(strip_runtime "$a" | strip_hub_meta) <(strip_runtime "$b" | strip_hub_meta) > /dev/null 2>&1
}

# Direction detection: which copy is newer based on updated: frontmatter date.
# Returns: "a_ahead", "b_ahead", "same", or "unknown".
drift_direction() {
  local a="$1" b="$2"
  local date_a date_b
  date_a=$(grep "^updated:" "$a" 2>/dev/null | head -1 | sed 's/updated: *//')
  date_b=$(grep "^updated:" "$b" 2>/dev/null | head -1 | sed 's/updated: *//')
  if [[ -z "$date_a" || -z "$date_b" ]]; then
    echo "unknown"
  elif [[ "$date_a" > "$date_b" ]]; then
    echo "a_ahead"
  elif [[ "$date_b" > "$date_a" ]]; then
    echo "b_ahead"
  else
    echo "same"
  fi
}

verify_drift() {
  header "AMPS _public/ Drift Check"
  local drifted=0 synced=0 missing=0 extra=0

  # ── Protocols: working → _public ──
  echo ""
  echo "  Protocols (working → _public):"
  local proto_dir="$SOMA_DIR/amps/protocols"
  local proto_pub="$proto_dir/_public"
  if [[ -d "$proto_pub" ]]; then
    for f in "$proto_pub"/*.md; do
      [[ ! -f "$f" ]] && continue
      local name=$(basename "$f")
      [[ "$name" == "README.md" ]] && continue
      local working="$proto_dir/$name"
      if [[ -f "$working" ]]; then
        if content_diff "$f" "$working"; then
          ((synced++))
        else
          local dir=$(drift_direction "$working" "$f")
          local arrow=""
          [[ "$dir" == "a_ahead" ]] && arrow=" (working ahead)"
          [[ "$dir" == "b_ahead" ]] && arrow=" (_public ahead)"
          fail "$name — drifted$arrow"
          ((drifted++))
        fi
      else
        dim "$name — _public only (shipped default, no working override)"
        ((extra++))
      fi
    done
  fi

  # ── Muscles: working → _public ──
  echo ""
  echo "  Muscles (working → _public):"
  local muscle_dir="$SOMA_DIR/amps/muscles"
  local muscle_pub="$muscle_dir/_public"
  if [[ -d "$muscle_pub" ]]; then
    for f in "$muscle_pub"/*.md; do
      [[ ! -f "$f" ]] && continue
      local name=$(basename "$f")
      [[ "$name" == "README.md" ]] && continue
      local working="$muscle_dir/$name"
      if [[ -f "$working" ]]; then
        if content_diff "$f" "$working"; then
          ((synced++))
        else
          local dir=$(drift_direction "$working" "$f")
          local arrow=""
          [[ "$dir" == "a_ahead" ]] && arrow=" (working ahead)"
          [[ "$dir" == "b_ahead" ]] && arrow=" (_public ahead)"
          fail "$name — drifted$arrow"
          ((drifted++))
        fi
      else
        dim "$name — _public only (shipped default)"
        ((extra++))
      fi
    done
  fi

  # ── Community repo sync ──
  echo ""
  echo "  Community repo sync:"
  if [[ -d "$COMMUNITY_REPO" ]]; then
    # Protocols
    for f in "$proto_pub"/*.md; do
      [[ ! -f "$f" ]] && continue
      local name=$(basename "$f")
      [[ "$name" == "README.md" ]] && continue
      local community="$COMMUNITY_REPO/protocols/$name"
      if [[ -f "$community" ]]; then
        if content_diff "$f" "$community"; then
          ((synced++))
        else
          local dir=$(drift_direction "$f" "$community")
          local arrow=""
          [[ "$dir" == "a_ahead" ]] && arrow=" (_public ahead)"
          [[ "$dir" == "b_ahead" ]] && arrow=" (community ahead)"
          fail "protocols/$name — drifted$arrow"
          ((drifted++))
        fi
      else
        warn "protocols/$name — not in community repo"
        ((missing++))
      fi
    done
    # Muscles
    for f in "$muscle_pub"/*.md; do
      [[ ! -f "$f" ]] && continue
      local name=$(basename "$f")
      [[ "$name" == "README.md" ]] && continue
      local community="$COMMUNITY_REPO/muscles/$name"
      if [[ -f "$community" ]]; then
        if content_diff "$f" "$community"; then
          ((synced++))
        else
          local dir=$(drift_direction "$f" "$community")
          local arrow=""
          [[ "$dir" == "a_ahead" ]] && arrow=" (_public ahead)"
          [[ "$dir" == "b_ahead" ]] && arrow=" (community ahead)"
          fail "muscles/$name — drifted$arrow"
          ((drifted++))
        fi
      fi
    done
  else
    warn "Community repo not found at $COMMUNITY_REPO"
  fi

  # ── Body _public → agent repo ──
  echo ""
  echo "  Body files (body/_public → agent repo):"
  local body_pub="$SOMA_DIR/body/_public"
  local agent_body="$AGENT_DEV/body/_public"
  if [[ -d "$body_pub" && -d "$agent_body" ]]; then
    for f in "$body_pub"/*.md; do
      [[ ! -f "$f" ]] && continue
      local name=$(basename "$f")
      local agent="$agent_body/$name"
      if [[ -f "$agent" ]]; then
        if ! diff -q "$f" "$agent" > /dev/null 2>&1; then
          fail "body/$name — agent repo drifted"
          ((drifted++))
        else
          ((synced++))
        fi
      else
        warn "body/$name — not in agent repo"
        ((missing++))
      fi
    done
  fi

  # ── Docs: agent → website ──
  echo ""
  echo "  Docs (agent → website):"
  local agent_docs="$AGENT_DEV/docs"
  local website_docs="$WEBSITE_REPO/src/content/docs"
  if [[ -d "$agent_docs" && -d "$website_docs" ]]; then
    for f in "$agent_docs"/*.md; do
      [[ ! -f "$f" ]] && continue
      local name=$(basename "$f")
      local site="$website_docs/$name"
      if [[ -f "$site" ]]; then
        # Strip Astro frontmatter from website copy for content comparison
        local agent_body=$(awk 'BEGIN{fm=0;past=0} /^---$/ && !past{fm=!fm;if(!fm)past=1;next} fm{next} {past=1;print}' "$f")
        local site_body=$(awk 'BEGIN{fm=0;past=0} /^---$/ && !past{fm=!fm;if(!fm)past=1;next} fm{next} {past=1;print}' "$site")
        if [[ "$agent_body" != "$site_body" ]]; then
          fail "docs/$name — website stale"
          ((drifted++))
        else
          ((synced++))
        fi
      else
        warn "docs/$name — not on website"
        ((missing++))
      fi
    done
  else
    dim "Docs check skipped (agent or website docs dir not found)"
  fi

  # ── Scripts: agent repo → working → global ──
  echo ""
  echo "  Scripts (agent repo → working → global):"
  local agent_scripts="$AGENT_DEV/scripts"
  local working_scripts="$SOMA_DIR/amps/scripts"
  local global_scripts="$HOME/.soma/amps/scripts"
  if [[ -d "$agent_scripts" ]]; then
    for f in "$agent_scripts"/soma-*.sh; do
      [[ ! -f "$f" ]] && continue
      local name=$(basename "$f")
      # Check working copy
      local work="$working_scripts/$name"
      if [[ -f "$work" ]]; then
        if ! diff -q "$f" "$work" > /dev/null 2>&1; then
          local lines=$(diff "$f" "$work" | grep -c '^[<>]')
          fail "$name — working drifted ($lines lines)"
          ((drifted++))
        else
          ((synced++))
        fi
      fi
      # Check global copy
      local glob="$global_scripts/$name"
      if [[ -f "$glob" ]]; then
        if ! diff -q "$f" "$glob" > /dev/null 2>&1; then
          local lines=$(diff "$f" "$glob" | grep -c '^[<>]')
          fail "$name — global drifted ($lines lines)"
          ((drifted++))
        else
          ((synced++))
        fi
      fi
    done
  else
    dim "Script check skipped (agent scripts dir not found)"
  fi

  # ── Stale content check ──
  echo ""
  echo "  Stale references:"
  local stale_count=0
  # Check for identity.md refs (should be SOMA.md)
  local id_refs=$(grep -rn "identity\.md" "$agent_docs"/*.md 2>/dev/null | grep -v "git-identity\|SOMA\|body/\|legacy\|fallback\|replaces" | wc -l | tr -d ' ')
  if [[ "$id_refs" -gt 0 ]]; then
    fail "$id_refs stale identity.md refs in docs (should be SOMA.md)"
    ((stale_count++))
  fi
  # Check for gendered pronouns
  local pronoun_refs=$(grep -in " she \| her \| she's " "$agent_docs"/*.md 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$pronoun_refs" -gt 0 ]]; then
    fail "$pronoun_refs gendered pronoun refs in docs"
    ((stale_count++))
  fi
  # Check for breadcrumb: (should be description:)
  local bc_refs=$(grep -n "breadcrumb:" "$agent_docs"/*.md 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$bc_refs" -gt 0 ]]; then
    fail "$bc_refs stale breadcrumb: refs in docs (should be description:)"
    ((stale_count++))
  fi
  if [[ "$stale_count" -eq 0 ]]; then
    pass "No stale references"
  fi

  echo ""
  if [[ $drifted -eq 0 ]]; then
    pass "All synced ($synced files)"
  else
    fail "$drifted drifted, $synced synced, $missing missing, $extra _public-only"
    echo ""
    echo "  Fix: sync working → _public, then _public → community + agent repos"
    echo "  Docs: cd repos/website && bash scripts/sync-docs.sh"
  fi
}

case "${1:-}" in
  doc)       shift; verify_doc "$@" ;;
  sync)      verify_sync ;;
  streams)   verify_streams ;;
  changelog) shift; verify_changelog "$@" ;;
  protocols) verify_protocols ;;
  website)   verify_website ;;
  copy)      verify_copy ;;
  repos)     verify_repos ;;
  agent)     shift; verify_agent "$@" ;;
  hygiene)   verify_hygiene ;;
  self-analysis) verify_self_analysis ;;
  drift)     verify_drift ;;
  # Redirects to soma-query.sh
  topic|search|related|sessions|impact|history)
    echo "σ  Moved to soma-query.sh. Running: soma-query.sh $*"
    bash "$SCRIPT_DIR/soma-query.sh" "$@" ;;
  --help|-h) usage ;;
  *) usage; exit 1 ;;
esac
