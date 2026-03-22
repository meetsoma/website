#!/usr/bin/env bash
# ---
# name: soma-scrape
# author: meetsoma
# version: 1.0.0
# license: MIT
# tags: [documentation, scraping, research, sdk, npm, github]
# requires: [bash 4+, curl, jq]
# description: Intelligent doc discovery and scraping for SDK research
# ---
#
# soma-scrape — intelligent doc discovery and scraping
#
# USE WHEN: You need documentation for a tool, library, or project.
# Give it a name, it finds the repo, scans for docs, pulls them locally.
#
# Related muscles: incremental-refactor, cmux-browser
# Related scripts: soma-query.sh, soma-find.sh
#
# Usage:
#   soma-scrape.sh resolve <name>          Find repo + doc sources
#   soma-scrape.sh pull <name> [--full]    Pull docs locally
#   soma-scrape.sh list                    Show all scraped sources
#   soma-scrape.sh update <name>           Re-pull latest docs
#   soma-scrape.sh show <name>             Show what we have locally
#   soma-scrape.sh search <name> <query>   Search within scraped docs
#   soma-scrape.sh discover <topic>        Broad search across providers
#   soma-scrape.sh pull-item <id>          Pull a specific item from discover results
#
# Examples:
#   soma-scrape.sh resolve cmux
#   soma-scrape.sh pull cmux
#   soma-scrape.sh pull niri --full
#   soma-scrape.sh search cmux "surface"
#   soma-scrape.sh discover "css container queries"
#   soma-scrape.sh discover "spring physics js" --provider npm
#   soma-scrape.sh pull-item 3             Pull item #3 from last discover

set -o pipefail

# ── Theme ──
source "$(dirname "$0")/soma-theme.sh" 2>/dev/null || {
  SOMA_BOLD='\033[1m'; SOMA_DIM='\033[2m'; SOMA_NC='\033[0m'; SOMA_CYAN='\033[0;36m'
}
# ── Configurable Variables ──────────────────────────────────────────────────

# Where scraped docs live
KNOWLEDGE_DIR="${SOMA_KNOWLEDGE_DIR:-.soma/knowledge}"

# GitHub search defaults
GH_SEARCH_LIMIT="${GH_SEARCH_LIMIT:-10}"

# File priority — checked in this order within a repo
# Higher = pulled first, always included
DOC_PRIORITY_FILES=(
  "CLAUDE.md"
  "AGENTS.md"
  "SKILL.md"
  "llms.txt"
  "llms-full.txt"
  "README.md"
  "CONTRIBUTING.md"
  "ARCHITECTURE.md"
  "CHANGELOG.md"
)

# Agent-authored files — the high-signal files that indicate a well-documented project
AGENT_FILES=("CLAUDE.md" "AGENTS.md" "SKILL.md" "llms.txt" "llms-full.txt")

# Directory patterns to scan for docs (in priority order)
DOC_PRIORITY_DIRS=(
  "docs"
  "doc"
  "documentation"
  "wiki"
  "guide"
  "guides"
  ".github"
)

# File extensions to include from doc directories
DOC_EXTENSIONS=("md" "mdx" "txt" "rst")

# Max files to pull in non-full mode (priority files + top N from dirs)
MAX_FILES_DEFAULT="${MAX_FILES_DEFAULT:-30}"

# Skip translated READMEs (README.xx.md, README.xx-XX.md) unless --full
SKIP_TRANSLATIONS="${SKIP_TRANSLATIONS:-true}"

# Website doc discovery paths (tried in order)
WEBSITE_DOC_PATHS=(
  "/llms.txt"
  "/llms-full.txt"
  "/docs"
  "/documentation"
)

# ── Colors & Logging ───────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
DIM='\033[0;90m'
BOLD='\033[1m'
NC='\033[0m'

log()   { echo -e "${BLUE}>>>${NC} $*" >&2; }
ok()    { echo -e "${GREEN} ✓${NC} $*" >&2; }
warn()  { echo -e "${YELLOW} ⚠${NC} $*" >&2; }
err()   { echo -e "${RED} ✗${NC} $*" >&2; }
debug() { ${VERBOSE:-false} && echo -e "${DIM}   $*${NC}" >&2 || true; }
info()  { echo -e "  $*" >&2; }

# ── Prerequisites ──────────────────────────────────────────────────────────

check_deps() {
  local missing=()
  command -v gh &>/dev/null   || missing+=("gh")
  command -v curl &>/dev/null || missing+=("curl")
  command -v jq &>/dev/null   || missing+=("jq")
  command -v git &>/dev/null  || missing+=("git")

  if [[ ${#missing[@]} -gt 0 ]]; then
    err "Missing dependencies: ${missing[*]}"
    err "Install with: brew install ${missing[*]}"
    exit 1
  fi

  # Check gh auth
  if ! gh auth status &>/dev/null 2>&1; then
    err "gh CLI not authenticated. Run: gh auth login"
    exit 1
  fi
}

# ── GitHub Provider ────────────────────────────────────────────────────────

# Search GitHub for a repo by name
# Sets: GH_RESULTS (JSON array)
gh_search() {
  local query="$1"
  local limit="${2:-$GH_SEARCH_LIMIT}"

  debug "Searching GitHub for: $query (limit: $limit)"

  GH_RESULTS=$(gh search repos "$query" \
    --limit "$limit" \
    --json fullName,description,homepage,stargazersCount,defaultBranch,language \
    --sort stars 2>/dev/null) || {
    err "GitHub search failed for: $query"
    return 1
  }

  local count
  count=$(echo "$GH_RESULTS" | jq length)
  debug "Found $count repos"
}

# Pick the best repo from search results
# Heuristic: exact name match > most stars > first result
# Sets: GH_REPO_FULL, GH_REPO_DESC, GH_REPO_HOME, GH_REPO_BRANCH
gh_pick_best() {
  local query="$1"

  # Try exact name match first (repo name = query)
  local exact
  exact=$(echo "$GH_RESULTS" | jq -r \
    --arg q "$query" \
    '[.[] | select(.fullName | split("/")[1] | ascii_downcase == ($q | ascii_downcase))][0] // empty')

  local pick
  if [[ -n "$exact" ]]; then
    pick="$exact"
    debug "Exact name match found"
  else
    # Fall back to first result (sorted by stars)
    pick=$(echo "$GH_RESULTS" | jq '.[0]')
    debug "Using top result by stars"
  fi

  if [[ -z "$pick" || "$pick" == "null" ]]; then
    err "No repos found for: $query"
    return 1
  fi

  GH_REPO_FULL=$(echo "$pick" | jq -r '.fullName')
  GH_REPO_DESC=$(echo "$pick" | jq -r '.description // ""')
  GH_REPO_HOME=$(echo "$pick" | jq -r '.homepage // ""')
  GH_REPO_BRANCH=$(echo "$pick" | jq -r '.defaultBranch // "main"')
  GH_REPO_STARS=$(echo "$pick" | jq -r '.stargazersCount // 0')
  GH_REPO_LANG=$(echo "$pick" | jq -r '.language // ""')
}

# Scan repo for doc files
# Sets: GH_DOC_FILES (array of paths), GH_DOC_DIRS (array of dirs found)
gh_scan_docs() {
  local repo="$1"
  local branch="${2:-main}"

  debug "Scanning $repo @ $branch for docs..."

  # Get full file tree
  local tree_json
  tree_json=$(gh api "repos/${repo}/git/trees/${branch}?recursive=1" 2>/dev/null) || {
    err "Failed to fetch file tree for $repo"
    return 1
  }

  # Extract all file paths
  local all_files
  all_files=$(echo "$tree_json" | jq -r '.tree[] | select(.type == "blob") | .path')

  GH_DOC_FILES=()
  GH_DOC_DIRS=()

  # Check priority files (root level)
  for pf in "${DOC_PRIORITY_FILES[@]}"; do
    if echo "$all_files" | grep -qx "$pf"; then
      GH_DOC_FILES+=("$pf")
      debug "  Priority file: $pf"
    fi
  done

  # Check priority directories
  for pd in "${DOC_PRIORITY_DIRS[@]}"; do
    local dir_files
    dir_files=$(echo "$all_files" | grep "^${pd}/" || true)
    if [[ -n "$dir_files" ]]; then
      GH_DOC_DIRS+=("$pd")
      # Filter to doc extensions
      for ext in "${DOC_EXTENSIONS[@]}"; do
        while IFS= read -r f; do
          [[ -n "$f" ]] && GH_DOC_FILES+=("$f")
        done < <(echo "$dir_files" | grep -i "\.${ext}$" || true)
      done
      debug "  Doc dir: $pd ($(echo "$dir_files" | wc -l | tr -d ' ') files)"
    fi
  done

  # Also grab any root-level .md files not already captured
  while IFS= read -r f; do
    [[ -n "$f" ]] || continue
    # Skip if already in the list
    local already=false
    for existing in "${GH_DOC_FILES[@]}"; do
      [[ "$existing" == "$f" ]] && { already=true; break; }
    done
    $already || GH_DOC_FILES+=("$f")
  done < <(echo "$all_files" | grep -E '^[^/]+\.md$' || true)

  debug "Total doc files found: ${#GH_DOC_FILES[@]}"
}

# Download a single file from GitHub
gh_download_file() {
  local repo="$1"
  local filepath="$2"
  local dest="$3"
  local ref="${4:-main}"

  mkdir -p "$(dirname "$dest")"

  # Use raw content endpoint (faster, no base64)
  local url="https://raw.githubusercontent.com/${repo}/${ref}/${filepath}"
  if curl -sfL "$url" -o "$dest" 2>/dev/null; then
    if [[ -s "$dest" ]]; then
      debug "  Downloaded: $filepath"
      return 0
    fi
  fi

  # Fallback: gh api with base64
  if gh api "repos/${repo}/contents/${filepath}?ref=${ref}" \
       --jq '.content' 2>/dev/null | base64 -d > "$dest" 2>/dev/null; then
    if [[ -s "$dest" ]]; then
      debug "  Downloaded (api): $filepath"
      return 0
    fi
  fi

  rm -f "$dest"
  warn "Failed to download: $filepath"
  return 1
}

# ── Website Provider ───────────────────────────────────────────────────────

# Check a website for doc sources
# Sets: WEBSITE_SOURCES (array of {type, url} strings)
website_scan() {
  local url="$1"

  # Normalize URL
  [[ "$url" != http* ]] && url="https://${url}"
  url="${url%/}"

  WEBSITE_SOURCES=()

  for path in "${WEBSITE_DOC_PATHS[@]}"; do
    local check_url="${url}${path}"
    local status
    status=$(curl -sfL -o /dev/null -w '%{http_code}' "$check_url" 2>/dev/null) || true

    if [[ "$status" == "200" ]]; then
      # Determine type
      if [[ "$path" == *"llms"* ]]; then
        WEBSITE_SOURCES+=("llms:${check_url}")
        ok "Found llms.txt at ${check_url}"
      else
        WEBSITE_SOURCES+=("page:${check_url}")
        debug "  Found docs page at ${check_url}"
      fi
    fi
  done
}

# Parse llms.txt and extract doc URLs
website_parse_llms() {
  local llms_url="$1"
  local dest_dir="$2"

  debug "Parsing llms.txt from: $llms_url"

  local llms_content
  llms_content=$(curl -sfL "$llms_url" 2>/dev/null) || {
    err "Failed to fetch: $llms_url"
    return 1
  }

  # Save llms.txt itself
  echo "$llms_content" > "${dest_dir}/llms.txt"

  # Extract markdown URLs from llms.txt
  local urls
  urls=$(echo "$llms_content" | grep -oE 'https?://[^ ]+\.md' || true)

  local count=0
  while IFS= read -r url; do
    [[ -z "$url" ]] && continue
    local filename
    filename=$(echo "$url" | sed 's|.*/||')
    if curl -sfL "$url" -o "${dest_dir}/${filename}" 2>/dev/null; then
      (( count++ ))
    fi
  done <<< "$urls"

  debug "Downloaded $count pages from llms.txt"
}

# ── Discovery Providers ─────────────────────────────────────────────────────
#
# Each provider searches a different source and returns results in a
# standard format. Add new providers by implementing:
#   provider_<name>_search(query) → appends to DISCOVER_RESULTS array
#
# Result format: "provider|id|title|url|description|meta"
# The discover results file persists between commands for pull-item.

DISCOVER_RESULTS=()
DISCOVER_CACHE="${KNOWLEDGE_DIR}/.discover-last.json"

# Provider: GitHub repos (code, docs, tools)
provider_github_search() {
  local query="$1"
  local limit="${2:-10}"

  debug "GitHub: searching repos for '$query'"

  local results
  results=$(gh search repos "$query" \
    --limit "$limit" \
    --json fullName,description,homepage,stargazersCount,language,updatedAt \
    --sort stars 2>/dev/null) || return 1

  local count
  count=$(echo "$results" | jq length)

  for (( i=0; i<count; i++ )); do
    local full desc home stars lang updated
    full=$(echo "$results" | jq -r ".[$i].fullName")
    desc=$(echo "$results" | jq -r ".[$i].description // \"\"" | cut -c1-80)
    home=$(echo "$results" | jq -r ".[$i].homepage // \"\"")
    stars=$(echo "$results" | jq -r ".[$i].stargazersCount // 0")
    lang=$(echo "$results" | jq -r ".[$i].language // \"\"")
    updated=$(echo "$results" | jq -r ".[$i].updatedAt // \"\"" | cut -c1-10)

    DISCOVER_RESULTS+=("github|${full}|${full}|https://github.com/${full}|${desc}|★${stars} ${lang} ${updated} ${home}")
  done

  debug "GitHub: found $count repos"
}

# Provider: GitHub code search (find files mentioning topic)
provider_github_code_search() {
  local query="$1"
  local limit="${2:-5}"

  debug "GitHub code: searching for '$query'"

  local results
  results=$(gh search code "$query" \
    --limit "$limit" \
    --json repository,path,textMatches \
    2>/dev/null) || return 1

  local count
  count=$(echo "$results" | jq length)

  for (( i=0; i<count; i++ )); do
    local repo path
    repo=$(echo "$results" | jq -r ".[$i].repository.fullName")
    path=$(echo "$results" | jq -r ".[$i].path")

    # Deduplicate — skip if this repo is already in results
    local already=false
    for r in "${DISCOVER_RESULTS[@]}"; do
      [[ "$r" == *"|${repo}|"* ]] && { already=true; break; }
    done
    $already && continue

    DISCOVER_RESULTS+=("gh-code|${repo}:${path}|${repo}|https://github.com/${repo}|Found in: ${path}|code match")
  done

  debug "GitHub code: found $count results"
}

# Provider: npm packages
provider_npm_search() {
  local query="$1"
  local limit="${2:-8}"

  debug "npm: searching for '$query'"

  local results
  results=$(curl -sf "https://registry.npmjs.org/-/v1/search?text=${query// /+}&size=${limit}" 2>/dev/null) || {
    debug "npm search failed"
    return 1
  }

  local count
  count=$(echo "$results" | jq '.objects | length')

  for (( i=0; i<count; i++ )); do
    local name desc version repo homepage
    name=$(echo "$results" | jq -r ".objects[$i].package.name")
    desc=$(echo "$results" | jq -r ".objects[$i].package.description // \"\"" | cut -c1-80)
    version=$(echo "$results" | jq -r ".objects[$i].package.version // \"\"")
    homepage=$(echo "$results" | jq -r ".objects[$i].package.links.homepage // \"\"")
    repo=$(echo "$results" | jq -r ".objects[$i].package.links.repository // \"\"")

    local url="${homepage:-$repo}"
    [[ -z "$url" ]] && url="https://npmjs.com/package/${name}"

    DISCOVER_RESULTS+=("npm|${name}|${name}@${version}|${url}|${desc}|npm ${repo}")
  done

  debug "npm: found $count packages"
}

# Provider: MDN Web Docs (CSS, JS, HTML, Web APIs)
provider_mdn_search() {
  local query="$1"
  local limit="${2:-8}"

  debug "MDN: searching for '$query'"

  local results
  results=$(curl -sf "https://developer.mozilla.org/api/v1/search?q=${query// /+}&size=${limit}" 2>/dev/null) || {
    debug "MDN search failed"
    return 1
  }

  local count
  count=$(echo "$results" | jq '.documents | length')

  for (( i=0; i<count; i++ )); do
    local title slug summary
    title=$(echo "$results" | jq -r ".documents[$i].title // \"\"")
    slug=$(echo "$results" | jq -r ".documents[$i].mdn_url // \"\"")
    summary=$(echo "$results" | jq -r ".documents[$i].summary // \"\"" | cut -c1-80)

    local url="https://developer.mozilla.org${slug}"

    DISCOVER_RESULTS+=("mdn|${slug}|${title}|${url}|${summary}|MDN Web Docs")
  done

  debug "MDN: found $count results"
}

# Provider: Skills — repos with CLAUDE.md, AGENTS.md, SKILL.md, llms.txt
# High signal: if a project has agent docs, it's well-maintained and architecturally clear
provider_skills_search() {
  local query="$1"
  local limit="${2:-15}"

  debug "Skills: searching for repos with agent docs about '$query'"

  # Strategy: search for the topic + each agent file type
  local seen_repos=()

  for agent_file in "${AGENT_FILES[@]}"; do
    # GitHub code search: find repos containing this file with topic relevance
    local results
    results=$(gh search code "filename:${agent_file} ${query}" \
      --limit 5 \
      --json repository,path \
      2>/dev/null) || continue

    local count
    count=$(echo "$results" | jq length)

    for (( i=0; i<count; i++ )); do
      local repo path
      repo=$(echo "$results" | jq -r ".[$i].repository.fullName")
      path=$(echo "$results" | jq -r ".[$i].path")

      # Deduplicate
      local already=false
      for s in "${seen_repos[@]:-}"; do
        [[ "$s" == "$repo" ]] && { already=true; break; }
      done
      $already && continue
      seen_repos+=("$repo")

      # Get repo metadata
      local meta
      meta=$(gh api "repos/${repo}" --jq '{description,stargazersCount,homepage,language}' 2>/dev/null) || continue

      local desc stars home lang
      desc=$(echo "$meta" | jq -r '.description // ""' | cut -c1-80)
      stars=$(echo "$meta" | jq -r '.stargazersCount // 0')
      home=$(echo "$meta" | jq -r '.homepage // ""')
      lang=$(echo "$meta" | jq -r '.language // ""')

      DISCOVER_RESULTS+=("skill|${repo}|${repo}|https://github.com/${repo}|${desc}|★${stars} ${lang} has:${agent_file} ${home}")
    done
  done

  # Also search repo descriptions/topics directly, then verify agent files exist
  local topic_results
  topic_results=$(gh search repos "$query" \
    --limit "$limit" \
    --json fullName,description,homepage,stargazersCount,language \
    --sort stars 2>/dev/null) || return 1

  local topic_count
  topic_count=$(echo "$topic_results" | jq length)

  for (( i=0; i<topic_count; i++ )); do
    local repo
    repo=$(echo "$topic_results" | jq -r ".[$i].fullName")

    # Skip if already found via code search
    local already=false
    for s in "${seen_repos[@]:-}"; do
      [[ "$s" == "$repo" ]] && { already=true; break; }
    done
    $already && continue

    # Check if repo has any agent files (quick: check root contents)
    local contents
    contents=$(gh api "repos/${repo}/contents/" --jq '.[].name' 2>/dev/null) || continue

    local found_files=()
    for af in "${AGENT_FILES[@]}"; do
      echo "$contents" | grep -qx "$af" && found_files+=("$af")
    done

    [[ ${#found_files[@]} -eq 0 ]] && continue  # Skip repos without agent docs

    seen_repos+=("$repo")

    local desc stars home lang
    desc=$(echo "$topic_results" | jq -r ".[$i].description // \"\"" | cut -c1-80)
    stars=$(echo "$topic_results" | jq -r ".[$i].stargazersCount // 0")
    home=$(echo "$topic_results" | jq -r ".[$i].homepage // \"\"")
    lang=$(echo "$topic_results" | jq -r ".[$i].language // \"\"")

    DISCOVER_RESULTS+=("skill|${repo}|${repo}|https://github.com/${repo}|${desc}|★${stars} ${lang} has:${found_files[*]} ${home}")
  done

  debug "Skills: found ${#seen_repos[@]} repos with agent docs"
}

# Provider: W3C/CSS specs (via GitHub csstools/cssdb or w3c repos)
provider_css_search() {
  local query="$1"

  debug "CSS: searching specs + resources for '$query'"

  # Search W3C spec repos
  local results
  results=$(gh search repos "$query" \
    --owner w3c --owner css-modules --owner csstools --owner postcss \
    --limit 5 \
    --json fullName,description,homepage,stargazersCount \
    --sort stars 2>/dev/null) || return 1

  local count
  count=$(echo "$results" | jq length)

  for (( i=0; i<count; i++ )); do
    local full desc home stars
    full=$(echo "$results" | jq -r ".[$i].fullName")
    desc=$(echo "$results" | jq -r ".[$i].description // \"\"" | cut -c1-80)
    home=$(echo "$results" | jq -r ".[$i].homepage // \"\"")
    stars=$(echo "$results" | jq -r ".[$i].stargazersCount // 0")

    DISCOVER_RESULTS+=("css-spec|${full}|${full}|https://github.com/${full}|${desc}|★${stars} spec ${home}")
  done

  debug "CSS specs: found $count results"
}

# Save discover results to cache (for pull-item)
discover_save_cache() {
  local query="$1"
  mkdir -p "$(dirname "$DISCOVER_CACHE")"

  local json="["
  local first=true
  local idx=0
  for r in "${DISCOVER_RESULTS[@]}"; do
    $first || json+=","
    first=false
    (( idx++ ))

    IFS='|' read -r provider id title url desc meta <<< "$r"
    json+=$(cat <<ITEM
{
  "index": ${idx},
  "provider": "${provider}",
  "id": $(echo "$id" | jq -R .),
  "title": $(echo "$title" | jq -R .),
  "url": $(echo "$url" | jq -R .),
  "description": $(echo "$desc" | jq -R .),
  "meta": $(echo "$meta" | jq -R .)
}
ITEM
)
  done
  json+="]"

  echo "$json" | jq --arg q "$query" '{query: $q, timestamp: now | todate, results: .}' > "$DISCOVER_CACHE"
}

# Display discover results as a numbered list
discover_display() {
  local query="$1"

  if [[ ${#DISCOVER_RESULTS[@]:-0} -eq 0 ]]; then
    warn "No results found for: $query"
    return 1
  fi

  echo ""
  info "${BOLD}Results for:${NC} ${query}"
  info "═══════════════════════════════════════════════════════════════"
  echo ""

  local idx=0
  local last_provider=""

  for r in "${DISCOVER_RESULTS[@]}"; do
    (( idx++ ))
    IFS='|' read -r provider id title url desc meta <<< "$r"

    # Section headers by provider
    if [[ "$provider" != "$last_provider" ]]; then
      [[ -n "$last_provider" ]] && echo ""
      case "$provider" in
        github)    info "${BOLD}${CYAN}── GitHub Repos ──${NC}" ;;
        gh-code)   info "${BOLD}${CYAN}── GitHub Code Matches ──${NC}" ;;
        npm)       info "${BOLD}${CYAN}── npm Packages ──${NC}" ;;
        mdn)       info "${BOLD}${CYAN}── MDN Web Docs ──${NC}" ;;
        css-spec)  info "${BOLD}${CYAN}── CSS Specs & Tools ──${NC}" ;;
        skill)     info "${BOLD}${CYAN}── Repos with Agent Docs (CLAUDE.md / SKILL.md / AGENTS.md) ──${NC}" ;;
        *)         info "${BOLD}${CYAN}── ${provider} ──${NC}" ;;
      esac
      last_provider="$provider"
    fi

    # Result line
    info "  ${BOLD}${idx})${NC} ${title}"
    [[ -n "$desc" ]] && info "     ${DIM}${desc}${NC}"
    info "     ${BLUE}${url}${NC}  ${DIM}${meta}${NC}"
  done

  echo ""
  info "─────────────────────────────────────────────────────────────"
  info "${BOLD}To pull:${NC}   soma-scrape.sh pull-item <number>"
  info "${BOLD}Multiple:${NC} soma-scrape.sh pull-item 1,3,5"
  info "Total: ${#DISCOVER_RESULTS[@]} results"
}

# ── Local Knowledge Store ──────────────────────────────────────────────────

# Get the local path for a source
knowledge_path() {
  local name="$1"
  echo "${KNOWLEDGE_DIR}/${name}"
}

# Write source metadata
knowledge_write_meta() {
  local name="$1"
  local dest
  dest=$(knowledge_path "$name")
  mkdir -p "$dest"

  cat > "${dest}/.source.json" << EOF
{
  "name": "${name}",
  "repo": "${GH_REPO_FULL:-}",
  "description": "${GH_REPO_DESC:-}",
  "homepage": "${GH_REPO_HOME:-}",
  "branch": "${GH_REPO_BRANCH:-main}",
  "stars": ${GH_REPO_STARS:-0},
  "language": "${GH_REPO_LANG:-}",
  "files_pulled": ${FILES_PULLED:-0},
  "pulled_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "doc_dirs": $(printf '%s\n' "${GH_DOC_DIRS[@]:-}" | jq -R . | jq -s .),
  "website_sources": $(printf '%s\n' "${WEBSITE_SOURCES[@]:-}" | jq -R . | jq -s .)
}
EOF
}

# Initialize git in knowledge dir
knowledge_git_init() {
  local dest="$1"
  if [[ ! -d "${dest}/.git" ]]; then
    git -C "$dest" init -q
    echo ".source.json" > "${dest}/.gitignore"
    git -C "$dest" add -A
    git -C "$dest" commit -q -m "initial scrape" 2>/dev/null || true
  fi
}

# Commit changes in knowledge dir
knowledge_git_commit() {
  local dest="$1"
  local msg="$2"
  git -C "$dest" add -A
  if ! git -C "$dest" diff --cached --quiet 2>/dev/null; then
    git -C "$dest" commit -q -m "$msg"
    return 0
  fi
  return 1  # no changes
}

# ── Commands ───────────────────────────────────────────────────────────────

# Resolve: find a project and report what docs are available
cmd_resolve() {
  local query="$1"

  log "Resolving: ${BOLD}${query}${NC}"

  # Step 1: GitHub search
  gh_search "$query" || return 1
  gh_pick_best "$query" || return 1

  echo ""
  info "${BOLD}Repo:${NC}        ${GH_REPO_FULL}"
  info "${BOLD}Description:${NC} ${GH_REPO_DESC}"
  info "${BOLD}Stars:${NC}       ${GH_REPO_STARS}"
  info "${BOLD}Language:${NC}    ${GH_REPO_LANG}"
  info "${BOLD}Branch:${NC}      ${GH_REPO_BRANCH}"
  [[ -n "$GH_REPO_HOME" ]] && info "${BOLD}Homepage:${NC}    ${GH_REPO_HOME}"
  echo ""

  # Step 2: Scan repo for docs
  gh_scan_docs "$GH_REPO_FULL" "$GH_REPO_BRANCH" || return 1

  # Report priority files
  info "${BOLD}Priority files:${NC}"
  for pf in "${DOC_PRIORITY_FILES[@]}"; do
    for f in "${GH_DOC_FILES[@]}"; do
      [[ "$f" == "$pf" ]] && info "  ${GREEN}✓${NC} $pf"
    done
  done

  # Report doc directories
  if [[ ${#GH_DOC_DIRS[@]} -gt 0 ]]; then
    info "${BOLD}Doc directories:${NC}"
    for d in "${GH_DOC_DIRS[@]}"; do
      local count
      count=$(printf '%s\n' "${GH_DOC_FILES[@]}" | grep -c "^${d}/" || true)
      info "  ${GREEN}✓${NC} ${d}/ (${count} files)"
    done
  fi

  info "${BOLD}Total doc files:${NC} ${#GH_DOC_FILES[@]}"
  echo ""

  # Step 3: Check website
  if [[ -n "$GH_REPO_HOME" ]]; then
    info "${BOLD}Checking website:${NC} ${GH_REPO_HOME}"
    website_scan "$GH_REPO_HOME"
    if [[ ${#WEBSITE_SOURCES[@]} -gt 0 ]]; then
      for src in "${WEBSITE_SOURCES[@]}"; do
        local type="${src%%:*}"
        local url="${src#*:}"
        info "  ${GREEN}✓${NC} ${type}: ${url}"
      done
    else
      info "  ${DIM}No llms.txt or doc paths found${NC}"
    fi
    echo ""
  fi

  # Step 4: Summary
  info "${BOLD}To pull:${NC} soma-scrape.sh pull ${query}"
  info "${BOLD}Full pull:${NC} soma-scrape.sh pull ${query} --full"

  # Check if already scraped
  local dest
  dest=$(knowledge_path "$query")
  if [[ -d "$dest" ]]; then
    local pulled_at
    pulled_at=$(jq -r '.pulled_at // "unknown"' "${dest}/.source.json" 2>/dev/null || echo "unknown")
    warn "Already scraped (${pulled_at}). Use 'update' to refresh."
  fi
}

# Pull: resolve + download docs
cmd_pull() {
  local query="$1"
  local full="${2:-false}"
  local max_files="$MAX_FILES_DEFAULT"
  $full && max_files=9999

  log "Pulling docs for: ${BOLD}${query}${NC}"

  # Resolve
  gh_search "$query" || return 1
  gh_pick_best "$query" || return 1

  ok "Repo: ${GH_REPO_FULL} (★${GH_REPO_STARS})"

  # Scan
  gh_scan_docs "$GH_REPO_FULL" "$GH_REPO_BRANCH" || return 1

  if [[ ${#GH_DOC_FILES[@]} -eq 0 ]]; then
    warn "No doc files found in repo"
    # Try website fallback
    if [[ -n "$GH_REPO_HOME" ]]; then
      log "Trying website: ${GH_REPO_HOME}"
      website_scan "$GH_REPO_HOME"
      # TODO: pull from website sources
    fi
    return 1
  fi

  # Prepare destination
  local dest
  dest=$(knowledge_path "$query")
  mkdir -p "$dest"

  # Filter out translations unless --full
  local filtered_files=()
  for f in "${GH_DOC_FILES[@]}"; do
    if $SKIP_TRANSLATIONS && ! $full; then
      # Skip README.xx.md / README.xx-XX.md patterns (translations)
      if [[ "$f" =~ README\.[a-z]{2}(-[A-Z]{2})?\.md$ ]]; then
        debug "  Skipping translation: $f"
        continue
      fi
    fi
    filtered_files+=("$f")
  done

  # Download files (respect max_files)
  FILES_PULLED=0
  local total=${#filtered_files[@]}
  local to_pull=$total
  (( to_pull > max_files )) && to_pull=$max_files

  info "Pulling ${to_pull}/${total} doc files..."

  for f in "${filtered_files[@]}"; do
    (( FILES_PULLED >= max_files )) && break
    gh_download_file "$GH_REPO_FULL" "$f" "${dest}/${f}" "$GH_REPO_BRANCH" && {
      (( FILES_PULLED++ ))
    }
  done

  ok "Downloaded ${FILES_PULLED} files to ${dest}"

  # Check website for additional sources
  WEBSITE_SOURCES=()
  if [[ -n "$GH_REPO_HOME" ]]; then
    website_scan "$GH_REPO_HOME"
    for src in "${WEBSITE_SOURCES[@]}"; do
      local type="${src%%:*}"
      local url="${src#*:}"
      if [[ "$type" == "llms" ]]; then
        log "Pulling llms.txt from website..."
        website_parse_llms "$url" "${dest}/_website" && {
          ok "Website docs added to ${dest}/_website/"
        }
      fi
    done
  fi

  # Write metadata
  knowledge_write_meta "$query"

  # Git init + commit
  knowledge_git_init "$dest"
  knowledge_git_commit "$dest" "pull: ${GH_REPO_FULL} @ $(date +%Y-%m-%d)" || true

  echo ""
  ok "${BOLD}Done.${NC} Docs at: ${dest}"
  info "Files: ${FILES_PULLED} from repo"
  [[ ${#WEBSITE_SOURCES[@]} -gt 0 ]] && info "Website: ${#WEBSITE_SOURCES[@]} additional sources"
  info ""
  info "Next: read the docs, or ask me to /learn ${query} to build a muscle"
}

# Update: re-pull latest docs for an existing source
cmd_update() {
  local name="$1"
  local dest
  dest=$(knowledge_path "$name")

  if [[ ! -d "$dest" ]]; then
    err "No knowledge for '${name}'. Run 'pull' first."
    return 1
  fi

  # Read existing metadata
  local repo branch
  repo=$(jq -r '.repo // ""' "${dest}/.source.json" 2>/dev/null)
  branch=$(jq -r '.branch // "main"' "${dest}/.source.json" 2>/dev/null)

  if [[ -z "$repo" ]]; then
    err "No repo info in .source.json — can't update"
    return 1
  fi

  log "Updating: ${BOLD}${name}${NC} from ${repo} @ ${branch}"

  # Re-use the stored repo info
  GH_REPO_FULL="$repo"
  GH_REPO_BRANCH="$branch"
  GH_REPO_DESC=$(jq -r '.description // ""' "${dest}/.source.json" 2>/dev/null)
  GH_REPO_HOME=$(jq -r '.homepage // ""' "${dest}/.source.json" 2>/dev/null)
  GH_REPO_STARS=$(jq -r '.stars // 0' "${dest}/.source.json" 2>/dev/null)
  GH_REPO_LANG=$(jq -r '.language // ""' "${dest}/.source.json" 2>/dev/null)

  # Scan + pull
  gh_scan_docs "$repo" "$branch" || return 1

  FILES_PULLED=0
  for f in "${GH_DOC_FILES[@]}"; do
    gh_download_file "$repo" "$f" "${dest}/${f}" "$branch" && {
      (( FILES_PULLED++ ))
    }
  done

  # Update metadata
  WEBSITE_SOURCES=()
  knowledge_write_meta "$name"

  # Commit if changed
  if knowledge_git_commit "$dest" "update: ${repo} @ $(date +%Y-%m-%d)"; then
    ok "Updated ${FILES_PULLED} files (changes committed)"
  else
    info "No changes detected"
  fi
}

# List: show all scraped sources
cmd_list() {
  if [[ ! -d "$KNOWLEDGE_DIR" ]]; then
    info "No knowledge directory yet. Run 'pull' to start."
    return 0
  fi

  local count=0
  info ""
  info "${BOLD}Scraped Sources${NC}"
  info "─────────────────────────────────────────"

  for dir in "${KNOWLEDGE_DIR}"/*/; do
    [[ -d "$dir" ]] || continue
    local name
    name=$(basename "$dir")
    [[ "$name" == ".git" ]] && continue

    local meta="${dir}/.source.json"
    if [[ -f "$meta" ]]; then
      local repo desc pulled files
      repo=$(jq -r '.repo // "—"' "$meta")
      desc=$(jq -r '.description // "—"' "$meta" | cut -c1-60)
      pulled=$(jq -r '.pulled_at // "—"' "$meta" | cut -c1-10)
      files=$(jq -r '.files_pulled // 0' "$meta")
      info "  ${BOLD}${name}${NC}"
      info "    ${repo} (${files} files, pulled ${pulled})"
      info "    ${DIM}${desc}${NC}"
    else
      local file_count
      file_count=$(find "$dir" -name "*.md" -o -name "*.mdx" | wc -l | tr -d ' ')
      info "  ${BOLD}${name}${NC} (${file_count} files, no metadata)"
    fi
    (( count++ ))
  done

  echo ""
  info "Total: ${count} sources in ${KNOWLEDGE_DIR}"
}

# Show: display what we have for a source
cmd_show() {
  local name="$1"
  local dest
  dest=$(knowledge_path "$name")

  if [[ ! -d "$dest" ]]; then
    err "No knowledge for '${name}'. Run 'pull' first."
    return 1
  fi

  local meta="${dest}/.source.json"
  if [[ -f "$meta" ]]; then
    info ""
    info "${BOLD}${name}${NC}"
    info "─────────────────────────────────────────"
    info "Repo:     $(jq -r '.repo // "—"' "$meta")"
    info "Pulled:   $(jq -r '.pulled_at // "—"' "$meta")"
    info "Homepage: $(jq -r '.homepage // "—"' "$meta")"
    info "Language: $(jq -r '.language // "—"' "$meta")"
    info "Stars:    $(jq -r '.stars // "—"' "$meta")"
    echo ""
  fi

  info "${BOLD}Files:${NC}"
  find "$dest" -type f \( -name "*.md" -o -name "*.mdx" -o -name "*.txt" \) \
    | sed "s|${dest}/||" \
    | sort \
    | while IFS= read -r f; do
        local size
        size=$(wc -c < "${dest}/${f}" | tr -d ' ')
        info "  ${f} (${size}b)"
      done

  echo ""
  local total
  total=$(find "$dest" -type f \( -name "*.md" -o -name "*.mdx" -o -name "*.txt" \) | wc -l | tr -d ' ')
  info "Total: ${total} doc files"
}

# Discover: broad search across multiple providers
cmd_discover() {
  local query="$1"
  local provider_filter="${2:-all}"

  log "Discovering: ${BOLD}${query}${NC}"
  DISCOVER_RESULTS=()

  case "$provider_filter" in
    all)
      provider_github_search "$query"
      provider_npm_search "$query"
      provider_mdn_search "$query"
      ;;
    github)  provider_github_search "$query" 15 ;;
    npm)     provider_npm_search "$query" 15 ;;
    mdn)     provider_mdn_search "$query" 15 ;;
    css)
      provider_css_search "$query"
      provider_mdn_search "CSS $query"
      provider_github_search "css $query" 5
      ;;
    code)
      provider_github_code_search "$query" 10
      provider_github_search "$query" 5
      ;;
    skills)
      provider_skills_search "$query"
      ;;
    *)
      err "Unknown provider: $provider_filter"
      info "Available: all, github, npm, mdn, css, code, skills"
      return 1
      ;;
  esac

  discover_save_cache "$query"
  discover_display "$query"
}

# Pull-item: pull a specific item from the last discover results
cmd_pull_item() {
  local selection="$1"

  if [[ ! -f "$DISCOVER_CACHE" ]]; then
    err "No discover results cached. Run 'discover' first."
    return 1
  fi

  local cache
  cache=$(cat "$DISCOVER_CACHE")
  local total
  total=$(echo "$cache" | jq '.results | length')

  # Parse comma-separated indices
  IFS=',' read -ra indices <<< "$selection"

  for idx in "${indices[@]}"; do
    idx=$(echo "$idx" | tr -d ' ')
    if ! [[ "$idx" =~ ^[0-9]+$ ]] || (( idx < 1 || idx > total )); then
      warn "Invalid index: $idx (1-${total})"
      continue
    fi

    local item
    item=$(echo "$cache" | jq ".results[$((idx-1))]")

    local provider id title url
    provider=$(echo "$item" | jq -r '.provider')
    id=$(echo "$item" | jq -r '.id')
    title=$(echo "$item" | jq -r '.title')
    url=$(echo "$item" | jq -r '.url')

    info ""
    log "Pulling #${idx}: ${BOLD}${title}${NC}"

    case "$provider" in
      github|gh-code|css-spec)
        # Extract owner/repo from id
        local repo_full="${id%%:*}"  # strip :path if from code search
        # Use the existing pull flow
        local name
        name=$(echo "$repo_full" | awk -F/ '{print $NF}')
        cmd_pull "$name" false
        ;;
      npm)
        # For npm packages, try to find GitHub repo
        local npm_name="${id}"
        local npm_meta
        npm_meta=$(curl -sf "https://registry.npmjs.org/${npm_name}" 2>/dev/null)
        local repo_url
        repo_url=$(echo "$npm_meta" | jq -r '.repository.url // ""' | sed 's|git+||;s|\.git$||;s|ssh://git@github.com/|https://github.com/|;s|git://github.com/|https://github.com/|')

        if [[ "$repo_url" == *"github.com"* ]]; then
          local repo_path
          repo_path=$(echo "$repo_url" | sed 's|https://github.com/||')
          local name
          name=$(echo "$repo_path" | awk -F/ '{print $NF}')
          info "  npm → GitHub: ${repo_path}"
          # Set up for pull
          GH_REPO_FULL="$repo_path"
          gh_search "$name" || { warn "Could not resolve npm package to GitHub"; continue; }
          gh_pick_best "$name" || continue
          cmd_pull "$name" false
        else
          warn "npm package '${npm_name}' has no GitHub repo — skipping"
          info "  Homepage: ${url}"
        fi
        ;;
      mdn)
        # For MDN, download the page as markdown
        local slug="${id}"
        local name
        name=$(echo "$slug" | sed 's|/|-|g;s|^-||' | tr '[:upper:]' '[:lower:]')
        local dest
        dest=$(knowledge_path "mdn/${name}")
        mkdir -p "$dest"

        # MDN content repo: slug /en-US/docs/Web/CSS/... → files/en-us/web/css/.../index.md
        local content_path
        content_path=$(echo "$slug" | sed 's|^/en-US/docs/||;s|/Reference/|/|g' | tr '[:upper:]' '[:lower:]')
        local md_url="https://raw.githubusercontent.com/mdn/content/main/files/en-us/${content_path}/index.md"
        debug "MDN raw URL: $md_url"
        if curl -sfL "$md_url" -o "${dest}/index.md" 2>/dev/null && [[ -s "${dest}/index.md" ]]; then
          ok "MDN page saved to ${dest}/index.md"
        else
          # Fallback: just save the URL for agent to read
          echo "# ${title}" > "${dest}/index.md"
          echo "" >> "${dest}/index.md"
          echo "Source: ${url}" >> "${dest}/index.md"
          echo "" >> "${dest}/index.md"
          echo "_(MDN raw content not available — visit URL directly)_" >> "${dest}/index.md"
          warn "MDN raw not available, saved reference to ${dest}/index.md"
        fi
        ;;
      *)
        warn "Don't know how to pull provider '${provider}' yet"
        info "  URL: ${url}"
        ;;
    esac
  done
}

# Search: grep within scraped docs
cmd_search() {
  local name="$1"
  local query="$2"
  local dest
  dest=$(knowledge_path "$name")

  if [[ ! -d "$dest" ]]; then
    err "No knowledge for '${name}'. Run 'pull' first."
    return 1
  fi

  log "Searching '${name}' for: ${query}"
  echo ""

  grep -rn --include="*.md" --include="*.mdx" --include="*.txt" \
    --color=always -i "$query" "$dest" \
    | sed "s|${dest}/||" \
    | head -50
}

# ── Usage ──────────────────────────────────────────────────────────────────

usage() {
  echo ""
  echo -e "  ${SOMA_CYAN}σ${SOMA_NC} ${SOMA_BOLD}soma-scrape${SOMA_NC} ${SOMA_DIM}— intelligent doc discovery and scraping${SOMA_NC}"
  echo -e "  ${SOMA_DIM}──────────────────────────────────────${SOMA_NC}"
  echo ""
  echo -e "  ${SOMA_GREEN}resolve${SOMA_NC} <name>            ${SOMA_DIM}Find repo + list available doc sources${SOMA_NC}"
  echo -e "  ${SOMA_GREEN}pull${SOMA_NC} <name> [--full]      ${SOMA_DIM}Download docs locally (--full = no limit)${SOMA_NC}"
  echo -e "  ${SOMA_GREEN}update${SOMA_NC} <name>             ${SOMA_DIM}Re-pull latest docs for existing source${SOMA_NC}"
  echo -e "  ${SOMA_GREEN}list${SOMA_NC}                      ${SOMA_DIM}Show all scraped sources${SOMA_NC}"
  echo -e "  ${SOMA_GREEN}show${SOMA_NC} <name>               ${SOMA_DIM}Show files we have for a source${SOMA_NC}"
  echo -e "  ${SOMA_GREEN}search${SOMA_NC} <name> <query>     ${SOMA_DIM}Search within scraped docs${SOMA_NC}"
  echo -e "  ${SOMA_GREEN}discover${SOMA_NC} <topic>          ${SOMA_DIM}Broad search: GitHub, npm, MDN, CSS specs${SOMA_NC}"
  echo -e "  ${SOMA_GREEN}pull-item${SOMA_NC} <n>[,n,n]       ${SOMA_DIM}Pull items from last discover results${SOMA_NC}"
  echo ""
  echo -e "  ${SOMA_DIM}Options:${SOMA_NC}"
  echo -e "    --full           ${SOMA_DIM}Pull all doc files (no limit)${SOMA_NC}"
  echo -e "    --provider <p>   ${SOMA_DIM}Filter: all, github, npm, mdn, css, code${SOMA_NC}"
  echo -e "    --verbose        ${SOMA_DIM}Show debug info${SOMA_NC}"
  echo -e "    --help           ${SOMA_DIM}This message${SOMA_NC}"
  echo ""
  echo -e "  ${SOMA_DIM}Examples:${SOMA_NC}"
  echo -e "    ${SOMA_BOLD}soma-scrape.sh resolve${SOMA_NC} cmux"
  echo -e "    ${SOMA_BOLD}soma-scrape.sh pull${SOMA_NC} niri --full"
  echo -e "    ${SOMA_BOLD}soma-scrape.sh search${SOMA_NC} cmux \"surface\""
  echo -e "    ${SOMA_BOLD}soma-scrape.sh discover${SOMA_NC} \"css container queries\""
  echo -e "    ${SOMA_BOLD}soma-scrape.sh pull-item${SOMA_NC} 1,3,5"
  echo -e "    ${SOMA_BOLD}soma-scrape.sh list${SOMA_NC}"
  echo ""
  echo -e "  ${SOMA_DIM}MIT © meetsoma${SOMA_NC}"
  echo ""
  exit 0
}

# ── Main ───────────────────────────────────────────────────────────────────

main() {
  local cmd="${1:-}"
  local name="${2:-}"

  [[ -z "$cmd" || "$cmd" == "--help" || "$cmd" == "-h" ]] && usage

  # Parse trailing flags
  VERBOSE=false
  local full=false
  local search_query=""
  local provider_filter="all"
  shift || true
  [[ -n "$name" ]] && shift || true

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --full)     full=true ;;
      --verbose)  VERBOSE=true ;;
      --provider) shift; provider_filter="${1:-all}" ;;
      --help)     usage ;;
      *)
        # Positional args after name — used by search and discover for multi-word queries
        if [[ "$cmd" == "search" ]]; then
          search_query="$1"
        elif [[ "$cmd" == "discover" ]]; then
          # Append to name to support multi-word topics
          name="${name} $1"
        else
          err "Unknown option: $1"
          usage
        fi
        ;;
    esac
    shift
  done

  check_deps

  case "$cmd" in
    resolve)   [[ -z "$name" ]] && { err "Name required"; usage; }; cmd_resolve "$name" ;;
    pull)      [[ -z "$name" ]] && { err "Name required"; usage; }; cmd_pull "$name" "$full" ;;
    update)    [[ -z "$name" ]] && { err "Name required"; usage; }; cmd_update "$name" ;;
    list)      cmd_list ;;
    show)      [[ -z "$name" ]] && { err "Name required"; usage; }; cmd_show "$name" ;;
    search)    [[ -z "$name" ]] && { err "Name required"; usage; }
               [[ -z "$search_query" ]] && { err "Query required"; usage; }
               cmd_search "$name" "$search_query" ;;
    discover)  [[ -z "$name" ]] && { err "Topic required"; usage; }; cmd_discover "$name" "$provider_filter" ;;
    pull-item) [[ -z "$name" ]] && { err "Item number(s) required"; usage; }; cmd_pull_item "$name" ;;
    *)         err "Unknown command: $cmd"; usage ;;
  esac
}

main "$@"
