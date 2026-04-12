#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# soma-refactor.sh — Smart dependency mapper, validator, and refactor helper
#
# MLR breadcrumb (s01-7631fc):
# Use `routes` before touching extensions — it shows phantom signals (documented but never wired).
# Use `verify --file` after editing — it checks imports resolve.
# Use `risk` before renaming — it scores impact across the codebase.
# Curtis corrected you THREE TIMES to use this instead of manual checks. Trust it.
#
# When to use: before any code change, map what references the thing you're
#   changing. After changes, verify nothing broke. For large refactors, use
#   `scan` → `plan` → execute → `verify` loop.
#
# Fixed s01-414477: string references grep now excludes node_modules, .git, dist/
# Previously `scan` on broad terms returned 91 files (mostly deps) instead of 4 (our code).
#
# TODO: integrate scan results into test coverage check — "these 4 files reference
# the changed function, do tests/ also reference it?" Would catch the "tests pass on
# old assertions" problem automatically.
#
# Related muscles: incremental-refactor (the behavioral pattern this script mechanizes),
#   task-tooling (map tools before coding), precision-edit (read before write)
# Related scripts: soma-verify.sh (ecosystem health), soma-query.sh impact (doc-level refs)
# Related protocols: quality-standards (atomic commits)
#
# Quick guide for new agents:
#   `scan --target "X" --scope dir/` — find every reference to X (strings + imports)
#   `refs --symbol "fn" --scope .`   — find all callers of a function
#   `graph dir/`                     — import dependency graph (circular deps flagged)
#   `risk --target "X"`              — how risky is changing X? (LOW/MEDIUM/HIGH)
#   `duplicates --scope dir/`        — find copy-pasted code blocks
#
# Subcommands:
#   scan       — Map all references to a target (path, symbol, string)
#   refs       — Find all callers/importers of a function/type
#   graph      — Build import dependency graph for a directory
#   verify     — Validate imports, exports, and type compatibility
#   duplicates — Find duplicated patterns across files
#   tags       — Inject/list/clean REFACTOR: comment tags
#   plan       — Generate a refactor change plan from scan results
#   risk       — Score risk of changing a target
#
# Usage:
#   soma-refactor.sh scan --target "memory/muscles" --scope core/
#   soma-refactor.sh refs --symbol "discoverProtocols" --scope .
#   soma-refactor.sh graph core/
#   soma-refactor.sh verify --file core/protocols.ts
#   soma-refactor.sh verify --imports core/
#   soma-refactor.sh duplicates --scope core/ --min-lines 5
#   soma-refactor.sh tags --list
#   soma-refactor.sh tags --inject "REFACTOR: #12 — wire resolveSomaPath" core/muscles.ts:151
#   soma-refactor.sh plan --from scan-results.md
#   soma-refactor.sh risk --target "discoverProtocols"
#
# Language support: TypeScript (primary), JavaScript, Bash, Markdown
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Theme ──
source "$(dirname "$0")/soma-theme.sh" 2>/dev/null || {
  SOMA_BOLD='\033[1m'; SOMA_DIM='\033[2m'; SOMA_NC='\033[0m'; SOMA_CYAN='\033[0;36m'
}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOMA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
DIM='\033[2m'
BOLD='\033[1m'
RESET='\033[0m'

# ═══════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════

detect_language() {
  local file="$1"
  case "$file" in
    *.ts|*.tsx) echo "typescript" ;;
    *.js|*.jsx|*.mjs|*.cjs) echo "javascript" ;;
    *.sh) echo "bash" ;;
    *.py) echo "python" ;;
    *.md) echo "markdown" ;;
    *) echo "unknown" ;;
  esac
}

count_lines() {
  wc -l < "$1" | tr -d ' '
}

# Extract exports from a TS/JS file
extract_exports() {
  local file="$1"
  grep -nE "^export (function|const|class|interface|type|enum|async function|default function)" "$file" 2>/dev/null | \
    sed 's/export default function/export function __default__/' | \
    sed -E 's/^([0-9]+):export (function|const|class|interface|type|enum|async function) ([a-zA-Z_][a-zA-Z0-9_]*).*/\1:\2:\3/' || true
}

# Extract imports from a TS/JS file
extract_imports() {
  local file="$1"
  grep -nE "^import " "$file" 2>/dev/null | \
    sed -E 's/^([0-9]+):import \{([^}]+)\} from "([^"]+)".*/\1:named:\3:\2/' | \
    sed -E 's/^([0-9]+):import type \{([^}]+)\} from "([^"]+)".*/\1:type:\3:\2/' | \
    sed -E 's/^([0-9]+):import ([a-zA-Z_]+) from "([^"]+)".*/\1:default:\3:\2/' || true
}

# Find all function call sites for a symbol
find_call_sites() {
  local symbol="$1"
  local scope="${2:-.}"
  local ext="${3:-ts}"
  
  # Find calls (symbol followed by parenthesis)
  grep -rnE "\b${symbol}\s*\(" "$scope" --include="*.$ext" 2>/dev/null | \
    grep -v "^Binary" | \
    grep -v "export function $symbol" | \
    grep -v "export async function $symbol" || true
}

# ═══════════════════════════════════════════════════════════════════════════
# SCAN — Map all references to a target
# ═══════════════════════════════════════════════════════════════════════════

cmd_scan() {
  local target=""
  local scope="."
  local output=""
  
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --target) target="$2"; shift 2 ;;
      --scope) scope="$2"; shift 2 ;;
      --output) output="$2"; shift 2 ;;
      *) target="${target:-$1}"; shift ;;
    esac
  done
  
  [[ -z "$target" ]] && { echo "Usage: soma-refactor.sh scan --target <string> [--scope <dir>]"; exit 1; }
  
  echo -e "${BOLD}═══ Scanning for: ${CYAN}$target${RESET} ${DIM}in $scope${RESET}"
  echo ""
  
  # Category 1: String literals containing target
  echo -e "${BLUE}── String References ──${RESET}"
  local string_hits
  # Exclude node_modules, .git, dist/ from string search
  string_hits=$(grep -rnc "$target" "$scope" --include="*.ts" --include="*.js" --include="*.sh" --include="*.md" --include="*.json" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist 2>/dev/null | grep -v ":0$" | sort -t: -k2 -nr || true)
  local string_count
  string_count=$(echo "$string_hits" | grep -c ":" 2>/dev/null || true)
  [[ -z "$string_count" ]] && string_count=0
  echo -e "  ${string_count} files contain ${CYAN}\"$target\"${RESET}"
  if [[ -n "$string_hits" ]]; then
    echo "$string_hits" | head -20 | while IFS=: read -r file count; do
      echo -e "  ${DIM}$file${RESET} (${count} hits)"
    done
    [[ $(echo "$string_hits" | wc -l) -gt 20 ]] && echo -e "  ${DIM}... and more${RESET}"
  fi
  echo ""
  
  # Category 2: Import references (TS/JS)
  echo -e "${BLUE}── Import References ──${RESET}"
  local import_hits
  import_hits=$(grep -rn "from.*[\"'].*$target" "$scope" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist 2>/dev/null || true)
  local import_count=0
  [[ -n "$import_hits" ]] && import_count=$(echo "$import_hits" | wc -l | tr -d ' ')
  echo -e "  ${import_count} import statements"
  if [[ -n "$import_hits" && "$import_count" -gt 0 ]]; then
    echo "$import_hits" | head -10 | while read -r line; do
      echo -e "  ${DIM}$line${RESET}"
    done
  fi
  echo ""
  
  # Category 3: Function calls (if target looks like a symbol)
  if [[ "$target" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
    echo -e "${BLUE}── Call Sites ──${RESET}"
    local call_hits
    call_hits=$(find_call_sites "$target" "$scope")
    local call_count=0
    [[ -n "$call_hits" ]] && call_count=$(echo "$call_hits" | wc -l | tr -d ' ')
    echo -e "  ${call_count} call sites"
    if [[ -n "$call_hits" && "$call_count" -gt 0 ]]; then
      echo "$call_hits" | head -15 | while read -r line; do
        echo -e "  ${DIM}$line${RESET}"
      done
    fi
    echo ""
  fi
  
  # Category 4: Path references (if target contains /)
  if [[ "$target" == *"/"* ]]; then
    echo -e "${BLUE}── Path References ──${RESET}"
    local path_hits
    path_hits=$(grep -rn "join(.*\"$(echo "$target" | sed 's|/|", "|g')\"" "$scope" --include="*.ts" 2>/dev/null || true)
    local path_count=0
    [[ -n "$path_hits" ]] && path_count=$(echo "$path_hits" | wc -l | tr -d ' ')
    echo -e "  ${path_count} join() path constructions"
    if [[ -n "$path_hits" && "$path_count" -gt 0 ]]; then
      echo "$path_hits" | head -10 | while read -r line; do
        echo -e "  ${DIM}$line${RESET}"
      done
    fi
    echo ""
  fi
  
  # Risk score
  local total=$((string_count + import_count))
  local risk="LOW"
  [[ $total -gt 10 ]] && risk="MEDIUM"
  [[ $total -gt 30 ]] && risk="HIGH"
  [[ $total -gt 100 ]] && risk="CRITICAL"
  
  local risk_color=$GREEN
  [[ "$risk" == "MEDIUM" ]] && risk_color=$YELLOW
  [[ "$risk" == "HIGH" ]] && risk_color=$RED
  [[ "$risk" == "CRITICAL" ]] && risk_color=$RED
  
  echo -e "${BOLD}═══ Risk: ${risk_color}$risk${RESET} ${DIM}($total total references across scan)${RESET}"
  
  # Output to file if requested
  if [[ -n "$output" ]]; then
    {
      echo "# Scan Results: $target"
      echo "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
      echo "Scope: $scope"
      echo "Risk: $risk ($total references)"
      echo ""
      echo "## String References ($string_count files)"
      echo "$string_hits" | head -30
      echo ""
      echo "## Import References ($import_count)"
      echo "$import_hits" | head -20
    } > "$output"
    echo -e "${DIM}Results saved to $output${RESET}"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════
# REFS — Find all callers/importers of a function/type
# ═══════════════════════════════════════════════════════════════════════════

cmd_refs() {
  local symbol=""
  local scope="."
  
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --symbol) symbol="$2"; shift 2 ;;
      --scope) scope="$2"; shift 2 ;;
      *) symbol="${symbol:-$1}"; shift ;;
    esac
  done
  
  [[ -z "$symbol" ]] && { echo "Usage: soma-refactor.sh refs --symbol <name> [--scope <dir>]"; exit 1; }
  
  echo -e "${BOLD}═══ References for: ${CYAN}$symbol${RESET}"
  echo ""
  
  # Where is it defined?
  echo -e "${BLUE}── Definition ──${RESET}"
  grep -rn "export.*function $symbol\|export.*const $symbol\|export.*class $symbol\|export.*interface $symbol\|export.*type $symbol" \
    "$scope" --include="*.ts" --include="*.js" 2>/dev/null | while read -r line; do
    echo -e "  ${GREEN}DEF${RESET} $line"
  done
  echo ""
  
  # Who imports it?
  echo -e "${BLUE}── Importers ──${RESET}"
  grep -rn "import.*{[^}]*\b$symbol\b[^}]*}" "$scope" --include="*.ts" --include="*.js" 2>/dev/null | while read -r line; do
    echo -e "  ${CYAN}IMP${RESET} $line"
  done
  echo ""
  
  # Where is it called?
  echo -e "${BLUE}── Call Sites ──${RESET}"
  local calls
  calls=$(find_call_sites "$symbol" "$scope")
  if [[ -n "$calls" ]]; then
    echo "$calls" | while read -r line; do
      # Extract the arguments pattern
      local args=$(echo "$line" | grep -oE "$symbol\([^)]*\)" | head -1)
      echo -e "  ${YELLOW}CALL${RESET} $line"
    done
  else
    echo -e "  ${DIM}(no call sites found)${RESET}"
  fi
  echo ""
  
  # Where is it referenced as a type?
  echo -e "${BLUE}── Type References ──${RESET}"
  grep -rn ": $symbol\b\|<$symbol\b\|$symbol\[\]\|$symbol | \|$symbol & " \
    "$scope" --include="*.ts" 2>/dev/null | \
    grep -v "import" | \
    grep -v "export" | while read -r line; do
    echo -e "  ${DIM}TYPE${RESET} $line"
  done
  
  # Signature analysis
  echo ""
  echo -e "${BLUE}── Signature ──${RESET}"
  # Find the full function signature (may span multiple lines)
  local def_file=$(grep -rl "export.*function $symbol\|export.*async function $symbol" "$scope" --include="*.ts" 2>/dev/null | head -1)
  if [[ -n "$def_file" ]]; then
    local def_line=$(grep -n "export.*function $symbol\|export.*async function $symbol" "$def_file" 2>/dev/null | head -1 | cut -d: -f1)
    if [[ -n "$def_line" ]]; then
      # Show 10 lines from definition (captures multi-line signatures)
      echo -e "  ${DIM}$def_file:$def_line${RESET}"
      sed -n "${def_line},$((def_line + 10))p" "$def_file" | head -10 | while read -r line; do
        echo -e "  ${DIM}  $line${RESET}"
      done
    fi
  fi
}

# ═══════════════════════════════════════════════════════════════════════════
# GRAPH — Build import dependency graph
# ═══════════════════════════════════════════════════════════════════════════

cmd_graph() {
  local scope="${1:-.}"
  
  echo -e "${BOLD}═══ Import Graph: ${CYAN}$scope${RESET}"
  echo ""
  
  # Find all TS/JS files
  local files
  files=$(find "$scope" \( -name "*.ts" -o -name "*.js" \) ! -path "*/node_modules/*" ! -name "*.d.ts" | sort)
  
  # Build adjacency list
  local edges=0
  local all_imports_file=$(mktemp)
  
  for file in $files; do
    local basename_f=$(basename "$file")
    local imports
    imports=$(grep -E "^import.*from [\"']\./" "$file" 2>/dev/null | \
      sed -E "s/.*from [\"']([^\"']+)[\"'].*/\1/" | \
      sed 's/\.js$//' | \
      sed 's|^\./||' || true)
    
    if [[ -n "$imports" ]]; then
      echo -e "  ${CYAN}$basename_f${RESET}"
      while read -r imp; do
        [[ -z "$imp" ]] && continue
        echo -e "    → ${DIM}$imp${RESET}"
        echo "$imp" >> "$all_imports_file"
        edges=$((edges + 1))
      done <<< "$imports"
    fi
  done
  
  echo ""
  local file_count=$(echo "$files" | wc -w)
  echo -e "${DIM}$file_count files, $edges edges${RESET}"
  
  # Find circular dependencies
  echo ""
  echo -e "${BLUE}── Circular Dependency Check ──${RESET}"
  local circulars=0
  for file in $files; do
    local basename_f=$(basename "$file" .ts)
    local imports
    imports=$(grep -E "^import.*from [\"']\./" "$file" 2>/dev/null | \
      sed -E "s/.*from [\"']([^\"']+)[\"'].*/\1/" | \
      sed 's/\.js$//' | sed 's|^\./||' || true)
    
    while read -r imp; do
      [[ -z "$imp" ]] && continue
      local target_file="${scope}/${imp}.ts"
      [[ ! -f "$target_file" ]] && continue
      if grep -q "from.*[\"']\./${basename_f}" "$target_file" 2>/dev/null; then
        echo -e "  ${RED}CIRCULAR${RESET} $basename_f ⇄ $imp"
        circulars=$((circulars + 1))
      fi
    done <<< "$imports"
  done
  
  [[ $circulars -eq 0 ]] && echo -e "  ${GREEN}✓ No circular dependencies${RESET}"
  
  # Find hub files (most imported)
  echo ""
  echo -e "${BLUE}── Hub Files (most imported) ──${RESET}"
  if [[ -s "$all_imports_file" ]]; then
    sort "$all_imports_file" | uniq -c | sort -rn | head -10 | while read -r count name; do
      [[ -z "$name" ]] && continue
      echo -e "  ${YELLOW}$count${RESET} ← $name"
    done
  fi
  
  rm -f "$all_imports_file"
}

# ═══════════════════════════════════════════════════════════════════════════
# VERIFY — Validate imports, exports, and compatibility
# ═══════════════════════════════════════════════════════════════════════════

cmd_verify() {
  local file=""
  local scope=""
  local mode="all"
  
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --file) file="$2"; mode="file"; shift 2 ;;
      --imports) scope="$2"; mode="imports"; shift 2 ;;
      --exports) scope="$2"; mode="exports"; shift 2 ;;
      *) scope="${scope:-$1}"; shift ;;
    esac
  done
  
  local pass=0 fail=0 warn=0
  
  if [[ "$mode" == "file" || "$mode" == "all" ]]; then
    # Verify single file
    local target="${file:-$scope}"
    [[ -z "$target" ]] && { echo "Usage: soma-refactor.sh verify --file <path>"; exit 1; }
    
    echo -e "${BOLD}═══ Verifying: ${CYAN}$target${RESET}"
    echo ""
    
    # Check: file exists
    if [[ -f "$target" ]]; then
      echo -e "  ${GREEN}✓${RESET} File exists"
      pass=$((pass + 1))
    else
      echo -e "  ${RED}✗${RESET} File not found"
      fail=$((fail + 1))
      echo -e "\n${RED}$fail failures${RESET}"
      return 1
    fi
    
    local lang=$(detect_language "$target")
    
    if [[ "$lang" == "typescript" || "$lang" == "javascript" ]]; then
      # Check: all imports resolve to existing files
      echo -e "\n${BLUE}── Import Resolution ──${RESET}"
      local dir=$(dirname "$target")
      grep -E "^import.*from [\"']\./" "$target" 2>/dev/null | \
        sed -E "s/.*from [\"']([^\"']+)[\"'].*/\1/" | while read -r imp; do
        local resolved="${dir}/${imp}"
        resolved="${resolved%.js}.ts"  # .js → .ts for source
        if [[ -f "$resolved" ]]; then
          echo -e "  ${GREEN}✓${RESET} $imp → $(basename "$resolved")"
          pass=$((pass + 1))
        else
          # Try without extension swap
          if [[ -f "${dir}/${imp}" ]]; then
            echo -e "  ${GREEN}✓${RESET} $imp"
            pass=$((pass + 1))
          else
            echo -e "  ${RED}✗${RESET} $imp → NOT FOUND (expected $resolved)"
            fail=$((fail + 1))
          fi
        fi
      done
      
      # Check: imported symbols exist in target modules
      echo -e "\n${BLUE}── Symbol Resolution ──${RESET}"
      grep -E "^import \{" "$target" 2>/dev/null | while read -r line; do
        local symbols=$(echo "$line" | sed -E 's/import (type )?\{([^}]+)\}.*/\2/' | tr ',' '\n' | sed 's/^ *//' | sed 's/ *$//')
        local from=$(echo "$line" | sed -E "s/.*from [\"']([^\"']+)[\"'].*/\1/")
        local resolved="${dir}/${from}"
        resolved="${resolved%.js}.ts"
        
        if [[ -f "$resolved" ]]; then
          echo "$symbols" | while read -r sym; do
            [[ -z "$sym" ]] && continue
            # Strip "as Alias" syntax
            sym=$(echo "$sym" | sed 's/ as .*//')
            if grep -qE "export.*(function|const|class|interface|type|enum|async function) $sym\b" "$resolved" 2>/dev/null; then
              echo -e "  ${GREEN}✓${RESET} $sym ← $(basename "$resolved")"
            elif grep -qE "export \{.*\b$sym\b" "$resolved" 2>/dev/null; then
              echo -e "  ${GREEN}✓${RESET} $sym ← $(basename "$resolved") (re-export)"
            else
              echo -e "  ${YELLOW}⚠${RESET} $sym not found in $(basename "$resolved") (may be type-only or re-exported)"
              warn=$((warn + 1))
            fi
          done
        fi
      done
      
      # Check: no unused imports (basic)
      echo -e "\n${BLUE}── Unused Import Check ──${RESET}"
      grep -E "^import \{" "$target" 2>/dev/null | while read -r line; do
        local symbols=$(echo "$line" | sed -E 's/import (type )?\{([^}]+)\}.*/\2/' | tr ',' '\n' | sed 's/^ *//' | sed 's/ *$//')
        echo "$symbols" | while read -r sym; do
          [[ -z "$sym" ]] && continue
          sym=$(echo "$sym" | sed 's/ as .*//')
          # Count occurrences after the import section
          local body_count=$(tail -n +2 "$target" | grep -c "\b$sym\b" 2>/dev/null || echo 0)
          if [[ "$body_count" -le 1 ]]; then
            echo -e "  ${YELLOW}⚠${RESET} $sym may be unused (${body_count} body references)"
            warn=$((warn + 1))
          fi
        done
      done
    fi
    
    echo ""
    echo -e "${BOLD}Results: ${GREEN}$pass pass${RESET}, ${RED}$fail fail${RESET}, ${YELLOW}$warn warn${RESET}"
  fi
  
  if [[ "$mode" == "imports" ]]; then
    local target="${scope}"
    echo -e "${BOLD}═══ Import Verification: ${CYAN}$target${RESET}"
    echo ""
    
    local files
    files=$(find "$target" -name "*.ts" | grep -v node_modules | grep -v ".d.ts" | sort)
    
    while read -r f; do
      [[ -z "$f" ]] && continue
      local dir=$(dirname "$f")
      local errors=0
      
      grep -E "^import.*from [\"']\./" "$f" 2>/dev/null | \
        sed -E "s/.*from [\"']([^\"']+)[\"'].*/\1/" | while read -r imp; do
        local resolved="${dir}/${imp}"
        resolved="${resolved%.js}.ts"
        if [[ ! -f "$resolved" && ! -f "${dir}/${imp}" ]]; then
          echo -e "  ${RED}✗${RESET} $(basename "$f"): $imp → NOT FOUND"
          errors=$((errors + 1))
          fail=$((fail + 1))
        fi
      done
      
      [[ $errors -eq 0 ]] && pass=$((pass + 1))
    done <<< "$files"
    
    echo ""
    local total_files=$(echo "$files" | wc -l | tr -d ' ')
    echo -e "${BOLD}$total_files files checked. ${GREEN}$pass clean${RESET}, ${RED}$fail broken imports${RESET}"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════
# DUPLICATES — Find duplicated code patterns
# ═══════════════════════════════════════════════════════════════════════════

cmd_duplicates() {
  local scope="."
  local min_lines=5
  local pattern=""
  
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --scope) scope="$2"; shift 2 ;;
      --min-lines) min_lines="$2"; shift 2 ;;
      --pattern) pattern="$2"; shift 2 ;;
      *) scope="$1"; shift ;;
    esac
  done
  
  echo -e "${BOLD}═══ Duplicate Pattern Analysis: ${CYAN}$scope${RESET}"
  echo ""
  
  # Strategy 1: Find identical function signatures
  echo -e "${BLUE}── Duplicated Function Names ──${RESET}"
  local func_names
  func_names=$(grep -rhE "^(export )?(async )?function [a-zA-Z_]+" "$scope" --include="*.ts" 2>/dev/null | \
    sed -E 's/(export )?(async )?function //' | sed 's/(.*//' | sort | uniq -c | sort -rn | awk '$1 > 1' || true)
  
  if [[ -n "$func_names" ]]; then
    echo "$func_names" | while IFS= read -r line; do
      local count=$(echo "$line" | awk '{print $1}')
      local name=$(echo "$line" | awk '{print $2}')
      [[ -z "$name" ]] && continue
      echo -e "  ${YELLOW}${count}×${RESET} $name"
      grep -rn "function $name" "$scope" --include="*.ts" 2>/dev/null | while read -r loc; do
        echo -e "    ${DIM}$loc${RESET}"
      done
    done
  else
    echo -e "  ${GREEN}✓ No duplicated function names${RESET}"
  fi
  echo ""
  
  # Strategy 2: Find near-identical code blocks
  echo -e "${BLUE}── Similar Patterns ──${RESET}"
  
  # Common refactor candidates: identical multi-line patterns
  # Look for functions that start the same way
  local patterns_found=0
  
  # Pattern: existsSync + readdirSync + filter (discovery pattern)
  local discovery_pattern
  discovery_pattern=$(grep -rlE "existsSync.*readdirSync.*filter" "$scope" --include="*.ts" 2>/dev/null || true)
  if [[ -n "$discovery_pattern" ]]; then
    local count=$(echo "$discovery_pattern" | wc -l | tr -d ' ')
    if [[ $count -gt 1 ]]; then
      echo -e "  ${YELLOW}Discovery pattern${RESET} (existsSync→readdirSync→filter) in ${count} files:"
      echo "$discovery_pattern" | while read -r f; do
        echo -e "    ${DIM}$(basename "$f")${RESET}"
      done
      patterns_found=$((patterns_found + 1))
    fi
  fi
  
  # Pattern: frontmatter extraction
  local fm_pattern
  fm_pattern=$(grep -rlE "extractFrontmatter|match.*---.*---" "$scope" --include="*.ts" 2>/dev/null || true)
  if [[ -n "$fm_pattern" ]]; then
    local count=$(echo "$fm_pattern" | wc -l | tr -d ' ')
    if [[ $count -gt 1 ]]; then
      echo -e "  ${YELLOW}Frontmatter parsing${RESET} in ${count} files:"
      echo "$fm_pattern" | while read -r f; do
        echo -e "    ${DIM}$(basename "$f")${RESET}"
      done
      patterns_found=$((patterns_found + 1))
    fi
  fi
  
  # Pattern: heat bump/decay (read→parse→clamp→write)
  local heat_pattern
  heat_pattern=$(grep -rlE "heat.*Math\.(max|min).*writeFileSync" "$scope" --include="*.ts" 2>/dev/null || true)
  if [[ -n "$heat_pattern" ]]; then
    local count=$(echo "$heat_pattern" | wc -l | tr -d ' ')
    if [[ $count -gt 1 ]]; then
      echo -e "  ${YELLOW}Heat management${RESET} (read→parse→clamp→write) in ${count} files:"
      echo "$heat_pattern" | while read -r f; do
        echo -e "    ${DIM}$(basename "$f")${RESET}"
      done
      patterns_found=$((patterns_found + 1))
    fi
  fi
  
  # Pattern: cold-start boost
  local coldstart_pattern
  coldstart_pattern=$(grep -rlE "COLD_START_BOOST|COLD_START_WINDOW" "$scope" --include="*.ts" 2>/dev/null || true)
  if [[ -n "$coldstart_pattern" ]]; then
    local count=$(echo "$coldstart_pattern" | wc -l | tr -d ' ')
    if [[ $count -gt 1 ]]; then
      echo -e "  ${YELLOW}Cold-start boost${RESET} in ${count} files:"
      echo "$coldstart_pattern" | while read -r f; do
        echo -e "    ${DIM}$(basename "$f")${RESET}"
      done
      patterns_found=$((patterns_found + 1))
    fi
  fi
  
  # Pattern: deepMerge
  local merge_pattern
  merge_pattern=$(grep -rlE "function deepMerge" "$scope" --include="*.ts" 2>/dev/null || true)
  if [[ -n "$merge_pattern" ]]; then
    local count=$(echo "$merge_pattern" | wc -l | tr -d ' ')
    if [[ $count -gt 1 ]]; then
      echo -e "  ${YELLOW}deepMerge${RESET} duplicated in ${count} files:"
      echo "$merge_pattern" | while read -r f; do
        echo -e "    ${DIM}$(basename "$f")${RESET}"
      done
      patterns_found=$((patterns_found + 1))
    fi
  fi
  
  [[ $patterns_found -eq 0 ]] && echo -e "  ${GREEN}✓ No obvious duplicated patterns${RESET}"
  
  echo ""
  echo -e "${BOLD}$patterns_found duplicate patterns found${RESET}"
}

# ═══════════════════════════════════════════════════════════════════════════
# TAGS — Inject/list/clean REFACTOR comment tags
# ═══════════════════════════════════════════════════════════════════════════

cmd_tags() {
  local action="list"
  local scope="."
  local tag_text=""
  local target=""
  
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --list) action="list"; shift ;;
      --inject) action="inject"; tag_text="$2"; shift 2 ;;
      --clean) action="clean"; shift ;;
      --scope) scope="$2"; shift 2 ;;
      *) target="$1"; shift ;;
    esac
  done
  
  case "$action" in
    list)
      echo -e "${BOLD}═══ REFACTOR Tags ═══${RESET}"
      echo ""
      local tags
      tags=$(grep -rnE "// REFACTOR:|# REFACTOR:|<!-- REFACTOR:" "$scope" \
        --include="*.ts" --include="*.js" --include="*.sh" --include="*.md" 2>/dev/null || true)
      
      if [[ -n "$tags" ]]; then
        # Group by tag ID (e.g., #7, #12)
        echo "$tags" | while read -r line; do
          local id=$(echo "$line" | grep -oE "#[0-9]+" | head -1)
          echo -e "  ${YELLOW}${id:-?}${RESET} $line"
        done
        echo ""
        local count=$(echo "$tags" | wc -l | tr -d ' ')
        echo -e "${DIM}$count tags total${RESET}"
      else
        echo -e "  ${GREEN}✓ No REFACTOR tags${RESET}"
      fi
      ;;
      
    inject)
      [[ -z "$target" ]] && { echo "Usage: soma-refactor.sh tags --inject 'message' file:line"; exit 1; }
      local file=$(echo "$target" | cut -d: -f1)
      local line=$(echo "$target" | cut -d: -f2)
      
      if [[ -f "$file" && -n "$line" ]]; then
        local lang=$(detect_language "$file")
        local comment_prefix="//"
        [[ "$lang" == "bash" ]] && comment_prefix="#"
        [[ "$lang" == "markdown" ]] && comment_prefix="<!--"
        local comment_suffix=""
        [[ "$lang" == "markdown" ]] && comment_suffix=" -->"
        
        sed -i '' "${line}s|$| ${comment_prefix} REFACTOR: ${tag_text}${comment_suffix}|" "$file"
        echo -e "${GREEN}✓${RESET} Injected tag at $target"
      else
        echo -e "${RED}✗${RESET} Invalid target: $target"
      fi
      ;;
      
    clean)
      echo -e "${BOLD}Cleaning resolved REFACTOR tags...${RESET}"
      # Only clean tags that have been addressed (marked with ✓ or DONE)
      find "$scope" \( -name "*.ts" -o -name "*.js" -o -name "*.sh" \) | while read -r file; do
        if grep -q "REFACTOR:.*\(DONE\|✓\)" "$file" 2>/dev/null; then
          sed -i '' '/REFACTOR:.*\(DONE\|✓\)/s/ \/\/ REFACTOR:.*//' "$file"
          echo -e "  ${GREEN}✓${RESET} Cleaned $(basename "$file")"
        fi
      done
      ;;
  esac
}

# ═══════════════════════════════════════════════════════════════════════════
# RISK — Score risk of changing a target
# ═══════════════════════════════════════════════════════════════════════════

cmd_risk() {
  local target=""
  local scope="."
  
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --target) target="$2"; shift 2 ;;
      --scope) scope="$2"; shift 2 ;;
      *) target="${target:-$1}"; shift ;;
    esac
  done
  
  [[ -z "$target" ]] && { echo "Usage: soma-refactor.sh risk --target <symbol|path>"; exit 1; }
  
  echo -e "${BOLD}═══ Risk Assessment: ${CYAN}$target${RESET}"
  echo ""
  
  local score=0
  local factors=""
  
  # Factor 1: How many files reference it?
  local ref_count=$(grep -rl "$target" "$scope" --include="*.ts" --include="*.js" 2>/dev/null | wc -l | tr -d ' ')
  echo -e "  Files referencing: ${YELLOW}$ref_count${RESET}"
  score=$((score + ref_count * 2))
  
  # Factor 2: Is it exported? (public API surface)
  local exported=$(grep -rl "export.*$target" "$scope" --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')
  if [[ $exported -gt 0 ]]; then
    echo -e "  Exported from: ${YELLOW}$exported${RESET} files"
    score=$((score + exported * 5))
    factors+="exported API, "
  fi
  
  # Factor 3: Is it in index.ts? (barrel export = very public)
  if grep -q "$target" "$scope"/index.ts 2>/dev/null; then
    echo -e "  ${RED}In barrel export (index.ts)${RESET}"
    score=$((score + 15))
    factors+="barrel export, "
  fi
  
  # Factor 4: Is it used in tests?
  local test_refs=$(grep -rl "$target" "$scope"/../tests/ 2>/dev/null | wc -l | tr -d ' ')
  if [[ $test_refs -gt 0 ]]; then
    echo -e "  Test references: ${YELLOW}$test_refs${RESET}"
    score=$((score + test_refs * 3))
    factors+="test coverage, "
  fi
  
  # Factor 5: Is it used in extensions?
  local ext_refs=$(grep -rl "$target" "$scope"/../extensions/ 2>/dev/null | wc -l | tr -d ' ')
  if [[ $ext_refs -gt 0 ]]; then
    echo -e "  Extension references: ${YELLOW}$ext_refs${RESET}"
    score=$((score + ext_refs * 4))
    factors+="extension API, "
  fi
  
  echo ""
  
  # Risk level
  local risk="LOW"
  local color=$GREEN
  if [[ $score -gt 50 ]]; then risk="CRITICAL"; color=$RED
  elif [[ $score -gt 30 ]]; then risk="HIGH"; color=$RED
  elif [[ $score -gt 15 ]]; then risk="MEDIUM"; color=$YELLOW
  fi
  
  echo -e "  ${BOLD}Risk: ${color}$risk${RESET} (score: $score)"
  [[ -n "$factors" ]] && echo -e "  ${DIM}Factors: ${factors%, }${RESET}"
  
  echo ""
  echo -e "${DIM}Recommendations:${RESET}"
  if [[ $score -gt 30 ]]; then
    echo "  • Add optional params (don't break existing callers)"
    echo "  • Write migration tests before changing"
    echo "  • Update index.ts re-exports last"
  elif [[ $score -gt 15 ]]; then
    echo "  • Keep backward compatible (accept old + new)"
    echo "  • Run full test suite after each file change"
  else
    echo "  • Safe to change directly"
    echo "  • Run relevant tests after"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════
# MAIN DISPATCH
# ═══════════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════
# routes — audit router signals & capabilities vs actual usage
# Related muscles: incremental-refactor
# Related scripts: soma-code.sh
# ═══════════════════════════════════════════════════════════════
cmd_routes() {
  local ext_dir="${1:-extensions}"
  local route_file=""

  # Find soma-route.ts
  for candidate in "$ext_dir/soma-route.ts" "extensions/soma-route.ts" "repos/agent/extensions/soma-route.ts"; do
    [[ -f "$candidate" ]] && route_file="$candidate" && break
  done

  if [[ -z "$route_file" ]]; then
    echo -e "${RED}Cannot find soma-route.ts in $ext_dir${RESET}"
    return 1
  fi

  local search_dir
  search_dir=$(dirname "$route_file")

  echo -e "${BOLD}═══ Router Audit: ${CYAN}$search_dir${RESET}"
  echo ""

  # --- Signals ---
  echo -e "${BLUE}── Signals ──${RESET}"
  local sig_total=0 sig_phantom=0 sig_emitted_only=0 sig_listened_only=0 sig_wired=0

  local _sigs
  _sigs=$(grep "signal" "$route_file" | grep "|.*|.*|.*|" | awk -F'|' '{gsub(/^ *\** *| *$/, "", $2); if ($2 != "" && $2 !~ /type/) print $2}')

  while IFS= read -r sig; do
    [[ -z "$sig" ]] && continue
    local emitted listened
    emitted=$(grep -rc "emit(\"$sig\"" "$search_dir"/*.ts 2>/dev/null | grep -v "soma-route.ts" | grep -v ":0$" | wc -l | tr -d ' \n' || true)
    listened=$(grep -rc "\.on(\"$sig\"" "$search_dir"/*.ts 2>/dev/null | grep -v "soma-route.ts" | grep -v ":0$" | wc -l | tr -d ' \n' || true)
    [[ -z "$emitted" ]] && emitted=0
    [[ -z "$listened" ]] && listened=0

    if [[ "$emitted" -eq 0 && "$listened" -eq 0 ]]; then
      echo -e "  ${RED}❌${RESET} $sig ${DIM}— phantom (never wired)${RESET}"
    elif [[ "$emitted" -eq 0 ]]; then
      echo -e "  ${YELLOW}⚠️${RESET}  $sig ${DIM}— no emitter, $listened listener(s)${RESET}"
    elif [[ "$listened" -eq 0 ]]; then
      echo -e "  ${CYAN}📡${RESET} $sig ${DIM}— $emitted emitter(s), no listeners${RESET}"
    else
      echo -e "  ${GREEN}✅${RESET} $sig ${DIM}— $emitted emitter(s), $listened listener(s)${RESET}"
    fi
  done <<< "$_sigs"

  echo ""

  # --- Capabilities ---
  echo -e "${BLUE}── Capabilities ──${RESET}"
  local _caps
  _caps=$(grep "capability" "$route_file" | grep "|.*|.*|.*|" | awk -F'|' '{gsub(/^ *\** *| *$/, "", $2); if ($2 != "" && $2 !~ /type/) print $2}')

  while IFS= read -r cap; do
    [[ -z "$cap" ]] && continue
    local provided consumed
    provided=$(grep -rc "provide(\"$cap\"" "$search_dir"/*.ts 2>/dev/null | grep -v "soma-route.ts" | grep -v ":0$" | wc -l | tr -d ' \n' || true)
    consumed=$(grep -rc "get(\"$cap\"" "$search_dir"/*.ts 2>/dev/null | grep -v "soma-route.ts" | grep -v ":0$" | wc -l | tr -d ' \n' || true)
    [[ -z "$provided" ]] && provided=0
    [[ -z "$consumed" ]] && consumed=0

    if [[ "$provided" -eq 0 && "$consumed" -eq 0 ]]; then
      echo -e "  ${RED}❌${RESET} $cap ${DIM}— phantom${RESET}"
    elif [[ "$provided" -eq 0 ]]; then
      echo -e "  ${YELLOW}⚠️${RESET}  $cap ${DIM}— no provider, $consumed consumer(s) (BROKEN)${RESET}"
    elif [[ "$consumed" -eq 0 ]]; then
      echo -e "  ${CYAN}📦${RESET} $cap ${DIM}— provided, no consumers${RESET}"
    else
      echo -e "  ${GREEN}✅${RESET} $cap ${DIM}— $provided provider(s), $consumed consumer(s)${RESET}"
    fi
  done <<< "$_caps"

  echo ""

  # --- Undocumented (emitted/provided but not in catalog) ---
  echo -e "${BLUE}── Undocumented ──${RESET}"
  local undoc=0

  # Find emits not in the catalog
  local _emitted_sigs
  _emitted_sigs=$(grep -rn '\.emit("' "$search_dir"/*.ts 2>/dev/null | grep -v "soma-route.ts" | sed 's/.*emit("\([^"]*\)".*/\1/' | sort -u || true)
  local undoc_found=0

  while IFS= read -r sig; do
    [[ -z "$sig" ]] && continue
    if ! grep -q "$sig" "$route_file" 2>/dev/null; then
      echo -e "  ${YELLOW}📤${RESET} signal: $sig ${DIM}— emitted but not in catalog${RESET}"
      undoc_found=1
    fi
  done <<< "$_emitted_sigs"

  # Find provides not in the catalog
  local _provided_caps
  _provided_caps=$(grep -rn '\.provide("' "$search_dir"/*.ts 2>/dev/null | grep -v "soma-route.ts" | sed 's/.*provide("\([^"]*\)".*/\1/' | sort -u || true)

  while IFS= read -r cap; do
    [[ -z "$cap" ]] && continue
    if ! grep -q "$cap" "$route_file" 2>/dev/null; then
      echo -e "  ${YELLOW}📤${RESET} capability: $cap ${DIM}— provided but not in catalog${RESET}"
      undoc_found=1
    fi
  done <<< "$_provided_caps"

  [[ "$undoc_found" -eq 0 ]] && echo -e "  ${GREEN}✓${RESET} all routes documented"
  return 0
}

main() {
  local cmd="${1:-help}"
  shift 2>/dev/null || true
  
  case "$cmd" in
    scan)       cmd_scan "$@" ;;
    refs)       cmd_refs "$@" ;;
    graph)      cmd_graph "$@" ;;
    verify)     cmd_verify "$@" ;;
    duplicates) cmd_duplicates "$@" ;;
    tags)       cmd_tags "$@" ;;
    risk)       cmd_risk "$@" ;;
    routes)     cmd_routes "$@" ;;
    help|--help|-h)
      echo "soma-refactor.sh — Smart refactoring toolkit"
      echo ""
      echo "Commands:"
      echo "  scan       Map all references to a target (path, symbol, string)"
      echo "  refs       Find all callers/importers of a function/type"
      echo "  graph      Build import dependency graph for a directory"
      echo "  verify     Validate imports, exports, and type compatibility"
      echo "  duplicates Find duplicated patterns across files"
      echo "  tags       Inject/list/clean REFACTOR: comment tags"
      echo "  risk       Score risk of changing a target"
      echo "  routes     Audit router signals & capabilities (phantom/unused/wired)"
      echo ""
      echo "Examples:"
      echo "  soma-refactor.sh scan \"memory/muscles\" --scope core/"
      echo "  soma-refactor.sh refs discoverProtocols --scope core/"
      echo "  soma-refactor.sh graph core/"
      echo "  soma-refactor.sh verify --file core/protocols.ts"
      echo "  soma-refactor.sh verify --imports core/"
      echo "  soma-refactor.sh duplicates core/"
      echo "  soma-refactor.sh tags --list"
      echo "  soma-refactor.sh risk discoverProtocols --scope core/"
      echo "  soma-refactor.sh routes                            # audit all signals + capabilities"
      ;;
    *)
      echo "Unknown command: $cmd"
      echo "Run: soma-refactor.sh help"
      exit 1
      ;;
  esac
}

main "$@"
