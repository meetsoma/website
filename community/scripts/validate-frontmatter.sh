#!/usr/bin/env bash
# validate-frontmatter.sh — Validate community hub content frontmatter
#
# Usage:
#   ./scripts/validate-frontmatter.sh              # validate all content
#   ./scripts/validate-frontmatter.sh protocols/    # validate specific dir
#   ./scripts/validate-frontmatter.sh --fix         # show suggested fixes
#
# Exit codes:
#   0 = all valid
#   1 = validation errors found

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMMUNITY_ROOT="$(dirname "$SCRIPT_DIR")"

FIX_MODE=""
TARGET_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --fix) FIX_MODE="true"; shift ;;
    *) TARGET_DIR="$1"; shift ;;
  esac
done

# Colors
RED='\033[0;31m'
YEL='\033[0;33m'
GRN='\033[0;32m'
DIM='\033[0;90m'
RST='\033[0m'

ERRORS=0
WARNINGS=0
CHECKED=0

# ---------------------------------------------------------------------------
# Field extraction (no YAML parser dependency)
# ---------------------------------------------------------------------------
get_field() {
  local file="$1" field="$2"
  awk -v f="$field" '/^---$/{c++;next} c==1 && $0 ~ "^"f":"{print; exit} c>=2{exit}' "$file" \
    | sed "s/^${field}:[[:space:]]*//"
}

has_field() {
  local file="$1" field="$2"
  awk -v f="$field" '/^---$/{c++;next} c==1 && $0 ~ "^"f":"{found=1; exit} c>=2{exit} END{exit !found}' "$file"
}

error() { echo -e "  ${RED}✗${RST} $1"; ERRORS=$((ERRORS + 1)); }
warn()  { echo -e "  ${YEL}⚠${RST} $1"; WARNINGS=$((WARNINGS + 1)); }
ok()    { echo -e "  ${GRN}✓${RST} $1"; }

# ---------------------------------------------------------------------------
# Shared required fields (all content types)
# ---------------------------------------------------------------------------
SHARED_REQUIRED=(type name status version author license created updated)

# Per-type required fields
# v0.8.1: description replaces breadcrumb, triggers replaces topic+keywords
# Both old and new accepted — warn on old-only
PROTOCOL_REQUIRED=(heat-default applies-to tier tags)
MUSCLE_REQUIRED=(heat-default tier heat)
AUTOMATION_REQUIRED=(tier tags)
# Templates use template.json for most metadata — identity.md has minimal frontmatter

# Per-type valid statuses
VALID_STATUSES="draft active stable dormant archived deprecated"

# Valid tiers
VALID_TIERS="core official community pro"

# Valid heat-defaults
VALID_HEAT_DEFAULTS="cold warm hot"

# ---------------------------------------------------------------------------
# Validate one file
# ---------------------------------------------------------------------------
validate_file() {
  local file="$1"
  local rel="${file#${COMMUNITY_ROOT}/}"
  local type
  type=$(get_field "$file" "type")
  
  # Skip non-content files and config/template files
  [[ -z "$type" ]] && return
  [[ "$type" == "config" || "$type" == "template" ]] && return

  echo -e "\n${DIM}── ${rel}${RST}"
  CHECKED=$((CHECKED + 1))

  # Identity files have a different schema — handle separately
  if [[ "$type" == "identity" ]]; then
    for field in agent template; do
      if ! has_field "$file" "$field"; then
        error "identity missing: ${field}"
      fi
    done
    return
  fi

  # Shared required fields (protocols, muscles, skills, scripts)
  for field in "${SHARED_REQUIRED[@]}"; do
    if ! has_field "$file" "$field"; then
      error "missing required field: ${field}"
      [[ -n "$FIX_MODE" ]] && echo -e "    ${DIM}add: ${field}: <value>${RST}"
    fi
  done

  # Validate status value
  local status
  status=$(get_field "$file" "status")
  if [[ -n "$status" ]] && ! echo "$VALID_STATUSES" | grep -qw "$status"; then
    error "invalid status: '${status}' (valid: ${VALID_STATUSES})"
  fi

  # Validate tier value
  local tier
  tier=$(get_field "$file" "tier")
  if [[ -n "$tier" ]] && ! echo "$VALID_TIERS" | grep -qw "$tier"; then
    error "invalid tier: '${tier}' (valid: ${VALID_TIERS})"
  fi

  # Validate heat-default value
  local hd
  hd=$(get_field "$file" "heat-default")
  if [[ -n "$hd" ]] && ! echo "$VALID_HEAT_DEFAULTS" | grep -qw "$hd"; then
    error "invalid heat-default: '${hd}' (valid: ${VALID_HEAT_DEFAULTS})"
  fi

  # Type-specific checks
  case "$type" in
    protocol)
      for field in "${PROTOCOL_REQUIRED[@]}"; do
        if ! has_field "$file" "$field"; then
          error "protocol missing: ${field}"
        fi
      done
      # Protocols should have ## TL;DR (preferred) or digest block (legacy)
      if grep -q '## TL;DR' "$file"; then
        ok "has ## TL;DR"
      elif grep -q '<!-- digest:start -->' "$file"; then
        warn "uses <!-- digest --> (migrate to ## TL;DR)"
      else
        warn "protocol has no ## TL;DR section"
      fi
      # description or breadcrumb required
      if ! has_field "$file" "description" && ! has_field "$file" "breadcrumb"; then
        warn "protocol has no description (or breadcrumb)"
      fi
      ;;
    muscle)
      for field in "${MUSCLE_REQUIRED[@]}"; do
        if ! has_field "$file" "$field"; then
          error "muscle missing: ${field}"
        fi
      done
      # Muscles should have TL;DR (preferred) or digest block (legacy)
      if grep -q '## TL;DR' "$file"; then
        ok "has ## TL;DR"
      elif grep -q '<!-- digest:start -->' "$file"; then
        warn "uses <!-- digest --> (migrate to ## TL;DR)"
      else
        warn "muscle has no ## TL;DR or digest block"
      fi
      # description or breadcrumb required
      if ! has_field "$file" "description" && ! has_field "$file" "breadcrumb"; then
        error "muscle missing: description (or breadcrumb)"
      fi
      # tags, keywords, or triggers required (any provides discoverability)
      if ! has_field "$file" "tags" && ! has_field "$file" "keywords" && ! has_field "$file" "triggers"; then
        warn "muscle has no tags, keywords, or triggers"
      fi
      # Heat should be numeric
      local heat_val
      heat_val=$(get_field "$file" "heat")
      if [[ -n "$heat_val" ]] && ! [[ "$heat_val" =~ ^[0-9]+$ ]]; then
        error "heat must be numeric, got: '${heat_val}'"
      fi
      ;;
    automation)
      for field in "${AUTOMATION_REQUIRED[@]}"; do
        if ! has_field "$file" "$field"; then
          error "automation missing: ${field}"
        fi
      done
      # description or breadcrumb required
      if ! has_field "$file" "description" && ! has_field "$file" "breadcrumb"; then
        error "automation missing: description (or breadcrumb)"
      fi
      # Automations should have ## TL;DR (preferred) or digest block (legacy)
      if grep -q '## TL;DR' "$file"; then
        ok "has ## TL;DR"
      elif grep -q '<!-- digest:start -->' "$file"; then
        warn "uses <!-- digest --> (migrate to ## TL;DR)"
      else
        warn "automation has no ## TL;DR (warm loading will use short description only)"
      fi
      ;;
    identity)
      # Template identity files are install-time placeholders — different schema
      # Only need: type, agent, template
      for field in agent template; do
        if ! has_field "$file" "$field"; then
          error "identity missing: ${field}"
        fi
      done
      return
      ;;
  esac

  # Field order check (convention: type first, then name)
  local first_field
  first_field=$(awk '/^---$/{c++;next} c==1{print $1; exit}' "$file" | tr -d ':')
  if [[ "$first_field" != "type" && "$first_field" != "name" ]]; then
    warn "convention: 'type' or 'name' should be first field (found: '${first_field}')"
  fi

  # Breadcrumb should be quoted
  if has_field "$file" "breadcrumb"; then
    local bc
    bc=$(get_field "$file" "breadcrumb")
    if [[ ! "$bc" =~ ^\" ]]; then
      warn "breadcrumb should be quoted string"
    fi
  fi
}

# ---------------------------------------------------------------------------
# Validate template.json files
# ---------------------------------------------------------------------------
validate_template_json() {
  local file="$1"
  local rel="${file#${COMMUNITY_ROOT}/}"
  
  echo -e "\n${DIM}── ${rel}${RST}"
  CHECKED=$((CHECKED + 1))

  # Check required JSON fields
  for field in name description author version tier; do
    if ! grep -q "\"${field}\"" "$file"; then
      error "template.json missing: ${field}"
    fi
  done

  # Validate tier
  local tier
  tier=$(grep '"tier"' "$file" | head -1 | sed 's/.*"tier"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
  if [[ -n "$tier" ]] && ! echo "$VALID_TIERS" | grep -qw "$tier"; then
    error "invalid tier: '${tier}'"
  fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
echo -e "\nσ  Community Frontmatter Validator"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ -n "$TARGET_DIR" ]]; then
  SCAN_DIR="${COMMUNITY_ROOT}/${TARGET_DIR}"
else
  SCAN_DIR="$COMMUNITY_ROOT"
fi

# Validate .md files
while IFS= read -r f; do
  [[ "$(basename "$f")" == "README.md" ]] && continue
  [[ "$(basename "$f")" == "CONTRIBUTING.md" ]] && continue
  [[ "$(basename "$f")" == "AGENTS.md" ]] && continue
  validate_file "$f"
done < <(find "$SCAN_DIR" -name '*.md' -not -path '*/.git/*' -not -path '*/node_modules/*' -not -name 'FRONTMATTER.md' -not -name 'CONTRIBUTING.md' -not -name 'README.md' -not -name 'CHANGELOG.md' 2>/dev/null | sort)

# Validate template.json files
while IFS= read -r f; do
  validate_template_json "$f"
done < <(find "$SCAN_DIR" -name 'template.json' -not -path '*/.git/*' 2>/dev/null | sort)

# Summary
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  Checked: ${CHECKED} files"
[[ $ERRORS -gt 0 ]] && echo -e "  ${RED}Errors: ${ERRORS}${RST}"
[[ $WARNINGS -gt 0 ]] && echo -e "  ${YEL}Warnings: ${WARNINGS}${RST}"
[[ $ERRORS -eq 0 ]] && [[ $WARNINGS -eq 0 ]] && echo -e "  ${GRN}All clean ✓${RST}"
echo ""

exit $([[ $ERRORS -gt 0 ]] && echo 1 || echo 0)
