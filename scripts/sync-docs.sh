#!/usr/bin/env bash
# sync-docs.sh — Convert agent-stable/docs/*.md → website/src/content/docs/
#
# Reads markdown files from the agent repo, adds content collection frontmatter,
# and writes them to the website content directory.
#
# Usage:
#   bash scripts/sync-docs.sh              # sync all
#   bash scripts/sync-docs.sh --dry-run    # preview what would sync
#
# Source of truth: agent-stable/docs/ → website/src/content/docs/
# Agent docs have their own frontmatter (or none). This script strips it
# and writes Astro content collection frontmatter with title/desc/section/order.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEBSITE_DIR="$(dirname "$SCRIPT_DIR")"

# Support both locations — prefer agent-stable (main branch worktree)
if [[ -d "$WEBSITE_DIR/../agent-stable/docs" ]]; then
  AGENT_DOCS="$WEBSITE_DIR/../agent-stable/docs"
  AGENT_ROOT="$WEBSITE_DIR/../agent-stable"
elif [[ -d "$WEBSITE_DIR/../agent/docs" ]]; then
  AGENT_DOCS="$WEBSITE_DIR/../agent/docs"
  AGENT_ROOT="$WEBSITE_DIR/../agent"
else
  echo "ERROR: Neither agent-stable/docs nor agent/docs found"
  exit 1
fi

TARGET="$WEBSITE_DIR/src/content/docs"

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

echo "Source: $AGENT_DOCS"
echo "Target: $TARGET"
echo ""

# ---------------------------------------------------------------------------
# Doc manifest — maps agent docs to website content collection entries
# Format: source_file|title|description|section|order
# ---------------------------------------------------------------------------
MANIFEST=(
  "getting-started.md|Getting Started|Install Soma, run your first session, understand the basics.|First Steps|1"
  "how-it-works.md|How It Works|Breath cycle, identity, muscles, protocols, context management.|Core Concepts|2"
  "identity.md|Identity|Discovery, layering, customization, project vs global.|Core Concepts|2.5"
  "protocols.md|Protocols & Heat|Behavioral rules, heat system, domain scoping, writing your own.|Core Concepts|3"
  "heat-system.md|Heat System|How Soma decides what to load — temperature-based relevance that adapts through use.|Core Concepts|3.5"
  "memory-layout.md|Memory Layout|Project vs user level storage, git strategy, data flow.|Core Concepts|4"
  "extending.md|Extending Soma|Skills, extensions, events, APIs — build on top of Soma.|Extending|5"
  "muscles.md|Muscles|Learned patterns, digest system, heat tiers, writing your own.|Core Concepts|5.5"
  "configuration.md|Configuration|Settings, heat thresholds, muscle budgets — tune Soma's behavior.|Reference|6"
  "commands.md|Commands|Slash commands, CLI flags, context warnings, the breath cycle.|Reference|7"
  "system-prompt.md|System Prompt|How Soma's compiled system prompt is assembled, configured, and previewed.|Core Concepts|7"
  "workspaces.md|Workspaces|Parent-child inheritance, monorepo patterns, solo body mode.|Core Concepts|8"
  "scripts.md|Scripts & Audits|Standalone tools for searching, auditing, scanning, and maintaining your .soma/ ecosystem.|Reference|9"
)

mkdir -p "$TARGET"

synced=0
skipped=0
for entry in "${MANIFEST[@]}"; do
  IFS='|' read -r file title desc section order <<< "$entry"
  src="$AGENT_DOCS/$file"
  slug="${file%.md}"
  dest="$TARGET/$slug.md"

  if [[ ! -f "$src" ]]; then
    echo "  ⚠ Missing: $file"
    ((skipped++))
    continue
  fi

  # Strip existing frontmatter and first H1 title from source
  body=$(awk '
    BEGIN { in_fm=0; past_fm=0; stripped_h1=0 }
    /^---$/ && !past_fm { in_fm=!in_fm; if(!in_fm) past_fm=1; next }
    in_fm { next }
    !stripped_h1 && /^# / { stripped_h1=1; next }
    !stripped_h1 && /^$/ { next }
    { past_fm=1; stripped_h1=1; print }
  ' "$src")

  if $DRY_RUN; then
    echo "  Would sync: $file → $slug.md (section: $section, order: $order)"
  else
    cat > "$dest" << FRONTMATTER
---
title: "$title"
description: "$desc"
section: "$section"
order: $order
---

$body
FRONTMATTER
    echo "  ✓ $file → $slug.md"
  fi
  ((synced++))
done

# Special: CHANGELOG from repo root
CHANGELOG_SRC="$AGENT_ROOT/CHANGELOG.md"
if [[ -f "$CHANGELOG_SRC" ]]; then
  changelog_body=$(awk '
    BEGIN { in_fm=0; past_fm=0; stripped_h1=0 }
    /^---$/ && !past_fm { in_fm=!in_fm; if(!in_fm) past_fm=1; next }
    in_fm { next }
    !stripped_h1 && /^# / { stripped_h1=1; next }
    !stripped_h1 && /^$/ { next }
    { past_fm=1; stripped_h1=1; print }
  ' "$CHANGELOG_SRC")

  if $DRY_RUN; then
    echo "  Would sync: CHANGELOG.md → changelog.md (section: Reference, order: 10)"
  else
    cat > "$TARGET/changelog.md" << FRONTMATTER
---
title: "Changelog"
description: "What shipped, what changed, version history."
section: "Reference"
order: 10
---

$changelog_body
FRONTMATTER
    echo "  ✓ CHANGELOG.md → changelog.md"
  fi
  ((synced++))
fi

echo ""
echo "═══ $synced synced, $skipped skipped ═══"

# Show what changed
cd "$WEBSITE_DIR"
changes=$(git diff --stat 2>/dev/null || true)
if [ -z "$changes" ]; then
  echo "✅ Already in sync — no changes"
else
  echo ""
  echo "Changes:"
  echo "$changes"
fi
