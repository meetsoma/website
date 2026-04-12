#!/usr/bin/env bash
# soma-query.sh — Search and explore across the Soma ecosystem
#
# Split from soma-verify.sh (2026-03-14) — verify handles health checks,
# query handles search and discovery.
#
# When to use: finding where something is defined, tracing how a term evolved,
#   checking what docs/protocols/muscles reference a file, searching session
#   history for past encounters with a problem.
#
# Related muscles: task-tooling (map tools before coding), plan-lifecycle (idea discovery)
# Related scripts: soma-verify.sh (health), soma-threads.sh (blog seeds),
#   soma-refactor.sh scan (code-level references), soma-reflect.sh (session pattern mining)
# Related protocols: workflow (session logging)
#
# Quick guide for new agents:
#   `topic X`     — broadest search. Hits docs, code, sessions, git history.
#   `sessions X`  — search past session logs + preloads. Good for "have we seen this before?"
#   `impact X`    — who references file X? Docs, muscles, protocols, imports.
#   `history X`   — git log + pickaxe trace. When was X introduced/changed?
#   `search --type muscle --stale` — find muscles with old `updated:` dates
#   `related X`   — frontmatter graph walk from file X
#
# Usage:
#   soma-query.sh topic <query>                    # search across all sources
#   soma-query.sh search [--type X] [--tags Y] [--stale] [--deep]
#                                                  # frontmatter-based query
#   soma-query.sh related <file>                   # find files linked via frontmatter
#   soma-query.sh sessions <query>                 # search session logs + preloads
#   soma-query.sh impact <file>                    # what docs/protocols reference this file
#   soma-query.sh history <setting-or-func>        # trace a value/function across git history
#   soma-query.sh streams                          # pro vs public stream check
#   soma-query.sh --help
#
# Designed for agent consumption. Pipe output into session for review.

set -uo pipefail

# ── Theme ──
_sd="$(dirname "$0")"
if [ -f "$_sd/soma-theme.sh" ]; then source "$_sd/soma-theme.sh"; fi
SOMA_BOLD="${SOMA_BOLD:-\033[1m}"; SOMA_DIM="${SOMA_DIM:-\033[2m}"; SOMA_NC="${SOMA_NC:-\033[0m}"; SOMA_CYAN="${SOMA_CYAN:-\033[0;36m}"
# ── Paths ────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOMA_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROJECT_ROOT="$(cd "$SOMA_DIR/.." && pwd)"

# Repos
AGENT_STABLE="$PROJECT_ROOT/repos/agent-stable"
AGENT_DEV="$PROJECT_ROOT/repos/agent"
CLI_REPO="$PROJECT_ROOT/repos/cli"
WEBSITE_REPO="$PROJECT_ROOT/repos/website"
COMMUNITY_REPO="$PROJECT_ROOT/repos/community"
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

# ── TOPIC: Search across all sources ─────────────────────────────────────

query_topic() {
  local query="$1"
  
  header "TOPIC: $query"
  
  # Search across all known locations
  local search_dirs=(
    "$SOMA_DIR"
    "$AGENT_STABLE/docs"
    "$AGENT_STABLE/core"
    "$AGENT_STABLE/extensions"
    "$COMMUNITY_REPO/protocols"
    "$COMMUNITY_REPO/muscles"
    "$WEBSITE_REPO/src"
  )
  
  local total_hits=0
  
  for dir in "${search_dirs[@]}"; do
    [ ! -d "$dir" ] && continue
    local hits=$(grep -rln "$query" "$dir" --include="*.md" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null)
    if [ -n "$hits" ]; then
      local dir_label=$(echo "$dir" | sed "s|$PROJECT_ROOT/||")
      echo ""
      echo "  📁 $dir_label:"
      echo "$hits" | while IFS= read -r f; do
        local type=$(grep -m1 "^type:" "$f" 2>/dev/null | sed 's/^type: *//')
        local updated=$(grep -m1 "^updated:" "$f" 2>/dev/null | sed 's/^updated: *//')
        local relpath=$(echo "$f" | sed "s|$PROJECT_ROOT/||")
        printf "    %-10s %-12s %s\n" "${type:-code}" "${updated:--}" "$relpath"
        total_hits=$((total_hits + 1))
      done
    fi
  done
  
  # Search git history
  echo ""
  echo "  📝 Git commits mentioning '$query':"
  for repo_name in agent-stable agent cli community website; do
    local repo="$PROJECT_ROOT/repos/$repo_name"
    [ ! -d "$repo/.git" ] && continue
    local commits=$(git -C "$repo" log --all --oneline --grep="$query" 2>/dev/null | head -5)
    if [ -n "$commits" ]; then
      echo "    [$repo_name]:"
      echo "$commits" | while read -r line; do echo "      $line"; done
    fi
  done
  
  # Search session logs
  echo ""
  echo "  📓 Session logs:"
  grep -rln "$query" "$SOMA_DIR/memory/sessions/" --include="*.md" 2>/dev/null | while IFS= read -r f; do
    echo "    $(basename "$f")"
    grep -n "$query" "$f" 2>/dev/null | head -3 | while read -r line; do
      echo "      $line"
    done
  done
  
  # Search preloads
  grep -rln "$query" "$SOMA_DIR/memory/preloads/" --include="*.md" 2>/dev/null | while IFS= read -r f; do
    echo "    preload: $(basename "$f")"
  done
  
  echo ""
  echo "  Total: $total_hits files found"
}

# ── SEARCH: Frontmatter-based query ─────────────────────────────────────

query_search() {
  local filter_type="" filter_status="" filter_tags="" filter_stale=false deep=false
  
  while [ $# -gt 0 ]; do
    case "$1" in
      --type)   filter_type="$2"; shift 2 ;;
      --status) filter_status="$2"; shift 2 ;;
      --tags)   filter_tags="$2"; shift 2 ;;
      --stale)  filter_stale=true; shift ;;
      --deep)   deep=true; shift ;;
      *) shift ;;
    esac
  done
  
  header "SEARCH: type=${filter_type:-any} status=${filter_status:-any} tags=${filter_tags:-any}"
  
  local scan_dirs=(
    "$SOMA_DIR/amps/protocols"
    "$SOMA_DIR/amps/muscles"
    "$SOMA_DIR/projects"
    "$SOMA_DIR/docs/ideas"
    "$AGENT_STABLE/docs"
    "$AGENT_STABLE/.soma/protocols"
    "$COMMUNITY_REPO/protocols"
    "$COMMUNITY_REPO/muscles"
  )
  
  for dir in "${scan_dirs[@]}"; do
    [ ! -d "$dir" ] && continue
    find "$dir" -name "*.md" -not -name "_template.md" -not -name "README.md" -not -path "*/.git/*" 2>/dev/null | while IFS= read -r f; do
      local ftype=$(grep -m1 "^type:" "$f" 2>/dev/null | sed 's/^type: *//')
      local fstatus=$(grep -m1 "^status:" "$f" 2>/dev/null | sed 's/^status: *//')
      local ftags=$(grep -m1 "^tags:" "$f" 2>/dev/null | sed 's/^tags: *//')
      local fupdated=$(grep -m1 "^updated:" "$f" 2>/dev/null | sed 's/^updated: *//')
      local fname=$(grep -m1 "^name:" "$f" 2>/dev/null | sed 's/^name: *//')
      local fbreadcrumb=$(grep -m1 "^breadcrumb:" "$f" 2>/dev/null | sed 's/^breadcrumb: *//' | sed 's/"//g' | cut -c1-100)
      
      # Apply filters
      [ -n "$filter_type" ] && [[ "$ftype" != *"$filter_type"* ]] && continue
      [ -n "$filter_status" ] && [[ "$fstatus" != *"$filter_status"* ]] && continue
      if [ -n "$filter_tags" ]; then
        local match=false
        IFS=',' read -ra search_tags <<< "$filter_tags"
        for st in "${search_tags[@]}"; do
          st=$(echo "$st" | tr -d '[:space:]')
          echo "$ftags" | grep -q "$st" && match=true
        done
        [ "$match" = false ] && continue
      fi
      if [ "$filter_stale" = true ]; then
        local today=$(date +%Y-%m-%d)
        [ "$fupdated" = "$today" ] && continue
      fi
      
      local relpath=$(echo "$f" | sed "s|$PROJECT_ROOT/||" | sed "s|$SOMA_DIR/||")
      printf "  %-10s %-8s %-12s %s\n" "${ftype:-?}" "${fstatus:-?}" "${fupdated:-?}" "$relpath"
      [ -n "$fbreadcrumb" ] && [[ "$COMPACT" == false ]] && dim "$fbreadcrumb"
      
      # Deep mode: show TL;DR
      if [ "$deep" = true ]; then
        local tldr=$(sed -n '/^## TL;DR/,/^## /p' "$f" 2>/dev/null | head -5 | tail -4)
        [ -n "$tldr" ] && echo "$tldr" | while read -r line; do dim "$line"; done
      fi
    done
  done
}

# ── RELATED: Find files linked via frontmatter ───────────────────────────

query_related() {
  local target="$1"
  [ ! -f "$target" ] && echo "File not found: $target" && exit 1
  
  local name=$(grep -m1 "^name:" "$target" 2>/dev/null | sed 's/^name: *//')
  local tags=$(grep -m1 "^tags:" "$target" 2>/dev/null | sed 's/^tags: *\[//;s/\]$//')
  local related=$(grep -m1 "^related:" "$target" 2>/dev/null | sed 's/^related: *\[//;s/\]$//')
  local parent=$(grep -m1 "^parent:" "$target" 2>/dev/null | sed 's/^parent: *//')
  
  header "RELATED: $(basename "$target")"
  echo "  Name: ${name:-$(basename "$target")}"
  [ -n "$tags" ] && echo "  Tags: $tags"
  [ -n "$related" ] && echo "  Related: $related"
  [ -n "$parent" ] && echo "  Parent: $parent"
  
  # Find files that reference this file's name
  local basename_noext=$(basename "$target" .md)
  echo ""
  echo "  Referenced by:"
  grep -rln "$basename_noext" "$SOMA_DIR" "$AGENT_STABLE/docs" --include="*.md" --exclude-dir=.git --exclude-dir=node_modules 2>/dev/null | grep -v "$target" | while IFS= read -r f; do
    local relpath=$(echo "$f" | sed "s|$PROJECT_ROOT/||" | sed "s|$SOMA_DIR/||")
    echo "    $relpath"
  done
  
  # Find files with overlapping tags
  if [ -n "$tags" ]; then
    echo ""
    echo "  Shared tags:"
    IFS=',' read -ra tag_list <<< "$tags"
    for tag in "${tag_list[@]}"; do
      tag=$(echo "$tag" | tr -d '[:space:]')
      local matches=$(grep -rln "tags:.*$tag" "$SOMA_DIR" "$AGENT_STABLE/docs" --include="*.md" --exclude-dir=.git 2>/dev/null | grep -v "$target" | head -5)
      if [ -n "$matches" ]; then
        echo "    $tag:"
        echo "$matches" | while read -r f; do
          echo "      $(echo "$f" | sed "s|$PROJECT_ROOT/||" | sed "s|$SOMA_DIR/||")"
        done
      fi
    done
  fi
}

# ── SESSIONS: Search session logs + preloads ─────────────────────────────

query_sessions() {
  local query="$1"
  
  header "SESSIONS: searching for '$query'"
  
  # Session logs
  echo "  📓 Session logs:"
  for f in "$SOMA_DIR/memory/sessions/"*.md; do
    [ ! -f "$f" ] && continue
    local hits=$(grep -c "$query" "$f" 2>/dev/null)
    if [ "$hits" -gt 0 ]; then
      echo "    $(basename "$f") ($hits mentions)"
      grep -n "$query" "$f" 2>/dev/null | head -3 | while read -r line; do
        dim "$(echo "$line" | cut -c1-120)"
      done
    fi
  done
  
  # Preloads
  echo ""
  echo "  📋 Preloads:"
  for f in "$SOMA_DIR/memory/preloads/"*.md; do
    [ ! -f "$f" ] && continue
    local hits=$(grep -c "$query" "$f" 2>/dev/null)
    if [ "$hits" -gt 0 ]; then
      echo "    $(basename "$f") ($hits mentions)"
      grep -n "$query" "$f" 2>/dev/null | head -3 | while read -r line; do
        dim "$(echo "$line" | cut -c1-120)"
      done
    fi
  done
  
  # Pi session transcripts (if accessible)
  local pi_sessions="$HOME/.pi/agent/sessions"
  if [ -d "$pi_sessions" ]; then
    echo ""
    echo "  🤖 Pi session transcripts:"
    local transcript_hits=$(grep -rln "$query" "$pi_sessions" --include="*.jsonl" 2>/dev/null | tail -5)
    if [ -n "$transcript_hits" ]; then
      echo "$transcript_hits" | while read -r f; do
        local ts=$(basename "$f" .jsonl)
        echo "    $ts"
      done
    else
      dim "no matches in recent transcripts"
    fi
  fi
}

# ── IMPACT: What references this file? ───────────────────────────────────

query_impact() {
  local target="$1"
  local basename=$(basename "$target")
  local relpath=$(echo "$target" | sed "s|$PROJECT_ROOT/||" | sed "s|$AGENT_STABLE/||")
  
  header "IMPACT: $relpath"
  
  echo "  Last modified: $(git -C "$AGENT_STABLE" log -1 --format='%ai %s' -- "$relpath" 2>/dev/null || echo 'unknown')"
  echo ""
  
  # Search docs for references
  echo "  Referenced in docs:"
  grep -rn "$basename\|$relpath" "$AGENT_STABLE/docs/" "$SOMA_DIR/plans/" "$SOMA_DIR/ideas/" 2>/dev/null | grep -v ".git" | while read -r line; do
    local loc=$(echo "$line" | cut -d: -f1-2 | sed "s|$PROJECT_ROOT/||")
    echo "    $loc"
  done
  
  echo ""
  echo "  Referenced in protocols/muscles:"
  grep -rn "$basename\|$relpath" "$SOMA_DIR/amps/protocols/" "$SOMA_DIR/amps/muscles/" "$AGENT_STABLE/.soma/protocols/" "$COMMUNITY_REPO/protocols/" 2>/dev/null | grep -v ".git" | while read -r line; do
    local loc=$(echo "$line" | cut -d: -f1-2 | sed "s|$PROJECT_ROOT/||")
    echo "    $loc"
  done
  
  echo ""
  echo "  Referenced in PRO extensions:"
  grep -rn "$basename\|$relpath" "$PRO_REPO/" 2>/dev/null | grep -v ".git" | while read -r line; do
    local loc=$(echo "$line" | cut -d: -f1-2 | sed "s|$PROJECT_ROOT/||")
    echo "    $loc"
  done
  
  echo ""
  echo "  Imported by (code):"
  grep -rn "from.*$basename\|require.*$basename" "$AGENT_STABLE/core/" "$AGENT_STABLE/extensions/" 2>/dev/null | grep -v ".git" | while read -r line; do
    local loc=$(echo "$line" | cut -d: -f1-2 | sed "s|$AGENT_STABLE/||")
    echo "    $loc"
  done
}

# ── HISTORY: Trace a value or function across git history ────────────────

query_history() {
  local query="$1"
  
  header "HISTORY: $query"
  
  # Check each repo
  for repo_name in agent-stable agent cli; do
    local repo="$PROJECT_ROOT/repos/$repo_name"
    [ ! -d "$repo/.git" ] && continue
    
    # Find commits that mention this term
    local commits=$(git -C "$repo" log --all --oneline --grep="$query" 2>/dev/null)
    if [ -n "$commits" ]; then
      echo ""
      echo "  [$repo_name] Commits mentioning '$query':"
      echo "$commits" | while read -r line; do
        echo "    $line"
      done
    fi
    
    # Find commits that changed lines containing this term
    local diff_commits=$(git -C "$repo" log --all --oneline -S "$query" 2>/dev/null | head -10)
    if [ -n "$diff_commits" ]; then
      echo ""
      echo "  [$repo_name] Commits that changed '$query' (code):"
      echo "$diff_commits" | while read -r line; do
        echo "    $line"
      done
    fi
  done
  
  # Trace value across time if it looks like a setting
  if grep -q "$query" "$AGENT_STABLE/core/settings.ts" 2>/dev/null; then
    echo ""
    echo "  Value trace in settings.ts:"
    for sha in $(git -C "$AGENT_STABLE" log --format=%h -- core/settings.ts 2>/dev/null | head -20); do
      local val=$(git -C "$AGENT_STABLE" show "$sha:core/settings.ts" 2>/dev/null | awk "/${query}:/{if(/[0-9]|true|false/){print; exit}}")
      if [ -n "$val" ]; then
        local date=$(git -C "$AGENT_STABLE" log -1 --format="%ai" "$sha" | cut -d' ' -f1)
        val=$(echo "$val" | sed "s/.*${query}:[[:space:]]*//" | tr -d ',[:space:]')
        echo "    $date  $sha  $query=$val"
      fi
    done
  fi
}

# ── Main ─────────────────────────────────────────────────────────────────

usage() {
  cat << 'EOF'
σ  soma-query — search and explore across the Soma ecosystem

  Search:
    topic <query>             search across all sources (docs, code, sessions, git)
    search [--type X] [--tags Y] [--stale] [--deep]
                              frontmatter-based query
    related <file>            find files linked via frontmatter
    sessions <query>          search session logs + preloads

  Tracing:
    impact <file>             what docs/protocols reference this file
    history <term>            trace a value/function across git history

  Options:
    --compact                 minimal output
    --help                    this help

  See also: soma-verify.sh (health checks), soma-threads.sh (blog seeds)
EOF
}

case "${1:-}" in
  topic)    shift; query_topic "$@" ;;
  search)   shift; query_search "$@" ;;
  related)  shift; query_related "$@" ;;
  sessions) shift; query_sessions "$@" ;;
  impact)   shift; query_impact "$@" ;;
  history)  shift; query_history "$@" ;;
  --help|-h) usage ;;
  *) usage; exit 1 ;;
esac
