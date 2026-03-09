#!/usr/bin/env bash
# sync-docs.sh — Convert agent/docs/*.md → website/src/content/docs/
#
# Reads markdown files from the agent repo, adds content collection frontmatter,
# and writes them to the website content directory.
#
# Usage:
#   bash scripts/sync-docs.sh              # sync all
#   bash scripts/sync-docs.sh --dry-run    # preview what would sync

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEBSITE_DIR="$(dirname "$SCRIPT_DIR")"
AGENT_DOCS="$WEBSITE_DIR/../agent/docs"
TARGET="$WEBSITE_DIR/src/content/docs"

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

# ---------------------------------------------------------------------------
# Doc manifest — maps agent docs to website content collection entries
# Format: source_file|title|description|section|order
# ---------------------------------------------------------------------------
MANIFEST=(
  "getting-started.md|Getting Started|Install Soma, run your first session, understand the basics.|First Steps|1"
  "how-it-works.md|How It Works|Breath cycle, identity, muscles, protocols, context management.|Core Concepts|2"
  "protocols.md|Protocols & Heat|Behavioral rules, heat system, domain scoping, writing your own.|Core Concepts|3"
  "memory-layout.md|Memory Layout|Project vs user level storage, git strategy, data flow.|Core Concepts|4"
  "extending.md|Extending Soma|Skills, extensions, events, APIs — build on top of Soma.|Extending|5"
  "configuration.md|Configuration|Settings, heat thresholds, muscle budgets — tune Soma's behavior.|Reference|6"
  "commands.md|Commands|Slash commands, CLI flags, context warnings, the breath cycle.|Reference|7"
)

mkdir -p "$TARGET"

synced=0
for entry in "${MANIFEST[@]}"; do
  IFS='|' read -r file title desc section order <<< "$entry"
  src="$AGENT_DOCS/$file"
  slug="${file%.md}"
  dest="$TARGET/$slug.md"

  if [[ ! -f "$src" ]]; then
    echo "⚠ Missing: $src"
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
    echo "Would sync: $file → $slug.md (section: $section, order: $order)"
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
    echo "✓ $file → $slug.md"
  fi
  ((synced++))
done

# Special: CHANGELOG from repo root
CHANGELOG_SRC="$WEBSITE_DIR/../agent/CHANGELOG.md"
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
    echo "Would sync: CHANGELOG.md → changelog.md (section: Reference, order: 8)"
  else
    cat > "$TARGET/changelog.md" << FRONTMATTER
---
title: "Changelog"
description: "What shipped, what changed, version history."
section: "Reference"
order: 8
---

$changelog_body
FRONTMATTER
    echo "✓ CHANGELOG.md → changelog.md"
  fi
  ((synced++))
fi

echo ""
echo "═══ $synced docs synced ═══"
