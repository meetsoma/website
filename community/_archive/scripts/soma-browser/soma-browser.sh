#!/usr/bin/env bash
# soma-browser.sh — Browser automation via CDP bridge
#
# Uses the Somaverse bridge server's CDP API for fast, structured browser control.
# Two browser targets:
#   DEFAULT (agent):  Brave Beta on port 9333 (via bridge at localhost:5311)
#   --personal:       Personal Chrome on port 9222 (direct CDP, your logins/cookies)
#
# Usage:
#   soma-browser xray [selector]         # structured DOM walk — THE go-to for understanding pages
#   soma-browser a11y [--roles btn,link]  # accessibility tree — interactive elements
#   soma-browser tabs                     # list open tabs
#   soma-browser open <url>               # open URL in active tab
#   soma-browser text [selector]          # get text content
#   soma-browser eval '<js>'              # run JavaScript
#   soma-browser shot [path]              # screenshot to file
#   soma-browser styles <selector>        # CSS inspection
#   soma-browser perf                     # performance metrics
#   soma-browser emulate <preset|WxH>     # device emulation (mobile, tablet, desktop)
#   soma-browser read [url]               # extract clean markdown content
#   soma-browser search <query>           # google search, return results
#   soma-browser click <selector>         # click an element
#   soma-browser fill <selector> <text>   # fill an input
#   soma-browser wait <selector> [timeout] # wait for element to appear
#   soma-browser console [--errors]       # read console output
#   soma-browser status                   # connection check
#
# Tab targeting (works with most commands):
#   --tab=<id>          target by tab ID
#   --url=<substring>   target by URL match
#   --title=<substring> target by title match
#
# Setup:
#   Agent browser: ./scripts/launch-browser.sh (Brave Beta, port 9333)
#   Bridge server: pnpm bridge (port 5311)
#   Personal:      Launch Chrome with --remote-debugging-port=9222
#
# BSL 1.1 © Curtis Mercier

set -euo pipefail

BRIDGE_URL="${BRIDGE_URL:-http://localhost:5311}"
CDP_DIRECT_PORT=9222
MODE="agent"

# ── Tab targeting ──
TAB_ID=""
TAB_URL=""
TAB_TITLE=""

# ── Parse global flags ──
ARGS=()
for arg in "$@"; do
  case "$arg" in
    --personal|--chrome) MODE="personal" ;;
    --tab=*) TAB_ID="${arg#--tab=}" ;;
    --url=*) TAB_URL="${arg#--url=}" ;;
    --title=*) TAB_TITLE="${arg#--title=}" ;;
    *) ARGS+=("$arg") ;;
  esac
done
set -- "${ARGS[@]+"${ARGS[@]}"}"

CMD="${1:-status}"
shift 2>/dev/null || true

# ── Colors ──
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'
CYAN='\033[0;36m'; DIM='\033[2m'; BOLD='\033[1m'; NC='\033[0m'

# ── JSON builder (safe, no shell interpolation into JS) ──
# Usage: build_json key1 val1 key2 val2 ...
build_json() {
  python3 -c "
import json, sys
d = {}
args = sys.argv[1:]
i = 0
while i < len(args):
    k, v = args[i], args[i+1]
    # Auto-detect types
    if v == 'true': d[k] = True
    elif v == 'false': d[k] = False
    elif v.isdigit(): d[k] = int(v)
    else:
        try: d[k] = float(v)
        except ValueError: d[k] = v
    i += 2
print(json.dumps(d))
" "$@"
}

# Build an evaluate request body with safe JS expression
build_eval() {
  python3 -c "import json,sys; print(json.dumps({'expression': sys.argv[1]}))" "$1"
}

# ── API helpers ──

# Add tab targeting to JSON body
tab_params() {
  local json="$1"
  if [[ -n "$TAB_ID" || -n "$TAB_URL" || -n "$TAB_TITLE" ]]; then
    json=$(python3 -c "
import json, sys
d = json.loads(sys.argv[1])
if sys.argv[2]: d['tabId'] = sys.argv[2]
if sys.argv[3]: d['url'] = sys.argv[3]
if sys.argv[4]: d['title'] = sys.argv[4]
print(json.dumps(d))
" "$json" "$TAB_ID" "$TAB_URL" "$TAB_TITLE")
  fi
  echo "$json"
}

# POST to bridge API
bridge_post() {
  local endpoint="$1"
  local body="$2"
  body=$(tab_params "$body")
  curl -s --max-time 15 -X POST "$BRIDGE_URL/api/browser/$endpoint" \
    -H "Content-Type: application/json" \
    -d "$body"
}

# GET from bridge API
bridge_get() {
  local endpoint="$1"
  curl -s --max-time 10 "$BRIDGE_URL/api/browser/$endpoint"
}

# Route to bridge (personal mode TODO)
api_post() {
  if [[ "$MODE" == "personal" ]]; then
    echo -e "${RED}✗ Direct CDP mode not yet implemented${NC}" >&2
    echo -e "${DIM}  Use bridge mode (default) or start the bridge server${NC}" >&2
    return 1
  fi
  bridge_post "$@"
}

# Check if bridge is up
bridge_up() {
  curl -s --max-time 2 "$BRIDGE_URL/api/browser/status" | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get('available') else 1)" 2>/dev/null
}

# Extract result from evaluate response
print_eval_result() {
  python3 -c "
import json, sys
d = json.load(sys.stdin)
if d.get('error'):
    print(f'\\033[0;31m✗ {d[\"error\"]}\\033[0m', file=sys.stderr)
    sys.exit(1)
r = d.get('result', '')
if isinstance(r, str):
    print(r)
elif r is not None:
    print(json.dumps(r, indent=2))
"
}

# ── Commands ──
case "$CMD" in

  status)
    echo -e "${BOLD}σ soma-browser${NC}"
    echo ""
    if bridge_up; then
      _tabs=$(bridge_get "tabs" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('tabs',[])))" 2>/dev/null || echo "?")
      echo -e "  agent browser: ${GREEN}✓ connected via bridge${NC} ${DIM}($_tabs tabs)${NC}"
    else
      echo -e "  agent browser: ${YELLOW}○ bridge not running${NC} ${DIM}(pnpm bridge)${NC}"
    fi
    if curl -s --max-time 2 "http://localhost:$CDP_DIRECT_PORT/json/version" >/dev/null 2>&1; then
      _ptabs=$(curl -s "http://localhost:$CDP_DIRECT_PORT/json" | python3 -c "import json,sys; print(len([t for t in json.load(sys.stdin) if t.get('type')=='page']))" 2>/dev/null || echo "?")
      echo -e "  personal:      ${GREEN}✓ Chrome on :$CDP_DIRECT_PORT${NC} ${DIM}($_ptabs tabs)${NC}"
    else
      echo -e "  personal:      ${DIM}○ not running${NC}"
    fi
    ;;

  # ── XRay: structured DOM walk ──────────────────────────────────────────
  xray|x)
    SELECTOR="${1:-body}"
    MAX_ELS="${2:-120}"
    BODY=$(build_json selector "$SELECTOR" maxElements "$MAX_ELS" maxDepth 6)
    RESULT=$(api_post "xray" "$BODY")
    echo "$RESULT" | python3 -c "
import json, sys
d = json.load(sys.stdin)
if d.get('ok'):
    print(d.get('rendered', ''))
    print(f'\\n\\033[2m{d.get(\"elementCount\", 0)} elements\\033[0m')
else:
    print(f'\\033[0;31m✗ {d.get(\"error\", \"unknown error\")}\\033[0m', file=sys.stderr)
    sys.exit(1)
"
    ;;

  # ── Accessibility tree ─────────────────────────────────────────────────
  a11y|accessibility)
    MAX_NODES=200
    ROLES=""
    for arg in "$@"; do
      case "$arg" in
        --roles=*) ROLES="${arg#--roles=}" ;;
        --max=*) MAX_NODES="${arg#--max=}" ;;
      esac
    done
    BODY=$(python3 -c "
import json, sys
d = {'maxNodes': int(sys.argv[1])}
roles = sys.argv[2]
if roles:
    d['roles'] = roles.split(',')
print(json.dumps(d))
" "$MAX_NODES" "$ROLES")
    RESULT=$(api_post "accessibility" "$BODY")
    echo "$RESULT" | python3 -c "
import json, sys
d = json.load(sys.stdin)
nodes = d.get('nodes', [])
for n in nodes:
    role = n.get('role', '')
    name = n.get('name', '')
    val = n.get('value', '')
    desc = n.get('description', '')
    line = f'  [{role}] {name}'
    if val: line += f' = {val}'
    if desc: line += f' ({desc})'
    print(line)
print(f'\\n\\033[2m{len(nodes)} nodes\\033[0m')
"
    ;;

  # ── Tabs ───────────────────────────────────────────────────────────────
  tabs)
    RESULT=$(bridge_get "tabs")
    echo "$RESULT" | python3 -c "
import json, sys
d = json.load(sys.stdin)
tabs = d.get('tabs', [])
for i, t in enumerate(tabs):
    title = t.get('title', '')[:50]
    url = t.get('url', '')[:80]
    tid = t.get('id', '')[:8]
    print(f'  {i+1}. [{tid}] {title}')
    print(f'     {url}')
print(f'\\n\\033[2m{len(tabs)} tabs\\033[0m')
"
    ;;

  # ── Navigate ───────────────────────────────────────────────────────────
  open|nav|goto|navigate)
    URL="${1:?Usage: soma-browser open <url>}"
    BODY=$(build_json targetUrl "$URL")
    api_post "navigate" "$BODY" >/dev/null
    sleep 1.5
    echo -e "${GREEN}✓${NC} Navigated to: $URL"
    XBODY=$(build_json selector body maxElements 60 maxDepth 4)
    api_post "xray" "$XBODY" | python3 -c "
import json, sys
d = json.load(sys.stdin)
if d.get('ok'):
    print(d.get('rendered', ''))
" 2>/dev/null
    ;;

  # ── Text extraction ────────────────────────────────────────────────────
  text)
    SELECTOR="${1:-body}"
    JS=$(python3 -c "import json,sys; s=sys.argv[1]; print('document.querySelector('+json.dumps(s)+')?.innerText?.substring(0,15000)')" "$SELECTOR")
    BODY=$(build_eval "$JS")
    api_post "evaluate" "$BODY" | print_eval_result
    ;;

  # ── JavaScript evaluation ──────────────────────────────────────────────
  eval|js)
    JS="${1:?Usage: soma-browser eval '<js>'}"
    BODY=$(build_eval "$JS")
    api_post "evaluate" "$BODY" | print_eval_result
    ;;

  # ── Screenshot ─────────────────────────────────────────────────────────
  shot|screenshot)
    OUT="${1:-/tmp/soma-screenshot.png}"
    FORMAT="png"
    [[ "$OUT" == *.jpg || "$OUT" == *.jpeg ]] && FORMAT="jpeg"
    [[ "$OUT" == *.webp ]] && FORMAT="webp"
    FULLPAGE="false"
    for arg in "$@"; do
      [[ "$arg" == "--full" ]] && FULLPAGE="true"
    done
    BODY=$(build_json format "$FORMAT" quality 80 fullPage "$FULLPAGE")
    RESULT=$(api_post "screenshot" "$BODY")
    echo "$RESULT" | python3 -c "
import json, sys, base64
d = json.load(sys.stdin)
data = d.get('data', '')
if data:
    out = sys.argv[1]
    with open(out, 'wb') as f:
        f.write(base64.b64decode(data))
    w, h = d.get('width', 0), d.get('height', 0)
    print(f'✓ Screenshot: {out} ({w}x{h})')
else:
    print(f'✗ {d.get(\"error\", \"no data\")}', file=sys.stderr)
    sys.exit(1)
" "$OUT"
    ;;

  # ── Click ──────────────────────────────────────────────────────────────
  click)
    SEL="${1:?Usage: soma-browser click <selector>}"
    JS=$(python3 -c "
import json, sys
s = sys.argv[1]
print('(()=>{const el=document.querySelector('+json.dumps(s)+');if(!el)return \"not found\";el.click();return \"clicked: \"+el.tagName+\" \"+el.textContent.trim().substring(0,40)})()')
" "$SEL")
    BODY=$(build_eval "$JS")
    api_post "evaluate" "$BODY" | print_eval_result
    ;;

  # ── Fill input ─────────────────────────────────────────────────────────
  fill)
    SEL="${1:?Usage: soma-browser fill <selector> <text>}"
    TEXT="${2:-}"
    JS=$(python3 -c "
import json, sys
s, v = sys.argv[1], sys.argv[2]
print('(()=>{const el=document.querySelector('+json.dumps(s)+');if(!el)return \"not found\";el.focus();el.value='+json.dumps(v)+';el.dispatchEvent(new Event(\"input\",{bubbles:true}));el.dispatchEvent(new Event(\"change\",{bubbles:true}));return \"filled: \"+el.tagName})()')
" "$SEL" "$TEXT")
    BODY=$(build_eval "$JS")
    api_post "evaluate" "$BODY" | print_eval_result
    ;;

  # ── Wait for element ───────────────────────────────────────────────────
  wait)
    SEL="${1:?Usage: soma-browser wait <selector> [timeout_ms]}"
    TIMEOUT="${2:-5000}"
    JS=$(python3 -c "
import json, sys
s, t = sys.argv[1], sys.argv[2]
print('new Promise((resolve)=>{const check=()=>{const el=document.querySelector('+json.dumps(s)+');if(el){resolve(\"found: \"+el.tagName+\" \"+el.textContent.trim().substring(0,40));return;}setTimeout(check,200);};setTimeout(()=>resolve(\"timeout after '+t+'ms\"),'+t+');check();})')
" "$SEL" "$TIMEOUT")
    BODY=$(python3 -c "import json,sys; print(json.dumps({'expression':sys.argv[1],'awaitPromise':True,'timeout':int(sys.argv[2])+2000}))" "$JS" "$TIMEOUT")
    api_post "evaluate" "$BODY" | print_eval_result
    ;;

  # ── CSS Styles ─────────────────────────────────────────────────────────
  styles)
    SEL="${1:?Usage: soma-browser styles <selector>}"
    BODY=$(build_json selector "$SEL")
    RESULT=$(api_post "styles" "$BODY")
    echo "$RESULT" | python3 -c "
import json, sys
d = json.load(sys.stdin)
matched = d.get('matched', [])
if matched:
    print('Matched Rules:')
    for rule in matched[:10]:
        sel = rule.get('selector', '?')
        props = rule.get('properties', [])
        if props:
            print(f'  {sel}')
            for p in props[:8]:
                print(f'    {p}')
computed = d.get('computed', {})
if computed:
    print('\\nComputed (key):')
    keys = ['display','position','width','height','margin','padding','color',
            'background-color','font-size','font-family','font-weight','border',
            'flex-direction','gap','grid-template-columns','z-index','opacity']
    for k in keys:
        if k in computed:
            print(f'  {k}: {computed[k]}')
"
    ;;

  # ── Performance ────────────────────────────────────────────────────────
  perf|performance)
    RESULT=$(api_post "performance" '{}')
    echo "$RESULT" | python3 -c "
import json, sys
d = json.load(sys.stdin)
metrics = d.get('metrics', {})
keys = [
    ('DomContentLoaded', 's'), ('NavigationStart', 's'),
    ('Nodes', ''), ('Documents', ''), ('Frames', ''),
    ('JSEventListeners', ''), ('LayoutCount', ''),
    ('ScriptDuration', 's'), ('TaskDuration', 's'),
    ('JSHeapUsedSize', 'MB'), ('JSHeapTotalSize', 'MB'),
]
print('Performance:')
for name, unit in keys:
    val = metrics.get(name)
    if val is not None:
        if unit == 'MB':    print(f'  {name}: {val/1024/1024:.1f} MB')
        elif unit == 's':   print(f'  {name}: {val:.2f}s')
        else:               print(f'  {name}: {int(val)}')
"
    ;;

  # ── Device Emulation ───────────────────────────────────────────────────
  emulate)
    PRESET="${1:-desktop}"
    case "$PRESET" in
      mobile|phone)   W=375;  H=667;  MOBILE="true";  DPR=2 ;;
      tablet|ipad)    W=768;  H=1024; MOBILE="true";  DPR=2 ;;
      desktop)        W=1920; H=1080; MOBILE="false"; DPR=1 ;;
      reset)          W=0;    H=0;    MOBILE="false"; DPR=0 ;;
      *x*)
        W=$(echo "$PRESET" | cut -dx -f1)
        H=$(echo "$PRESET" | cut -dx -f2)
        MOBILE="false"; DPR=1
        ;;
      *)
        echo -e "${RED}Unknown preset: $PRESET${NC}"
        echo -e "${DIM}  Presets: mobile, tablet, desktop, reset, WxH (e.g. 1440x900)${NC}"
        exit 1
        ;;
    esac
    if [[ "$PRESET" == "reset" ]]; then
      BODY=$(build_eval 'window.innerWidth+"x"+window.innerHeight')
      api_post "evaluate" "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Reset to native: {d.get(\"result\",\"\")}')"
    else
      BODY=$(build_json width "$W" height "$H" deviceScaleFactor "$DPR" mobile "$MOBILE")
      api_post "emulate" "$BODY" >/dev/null
      echo -e "${GREEN}✓${NC} Emulating: $PRESET (${W}x${H}, DPR=$DPR, mobile=$MOBILE)"
    fi
    ;;

  # ── Console ────────────────────────────────────────────────────────────
  console|log)
    LEVEL="all"
    DURATION=3000
    for arg in "$@"; do
      case "$arg" in
        --errors) LEVEL="error" ;;
        --warnings) LEVEL="warning" ;;
        --duration=*) DURATION="${arg#--duration=}" ;;
      esac
    done
    BODY=$(build_json level "$LEVEL" duration "$DURATION")
    echo -e "${DIM}Listening for ${DURATION}ms...${NC}"
    RESULT=$(api_post "console" "$BODY")
    echo "$RESULT" | python3 -c "
import json, sys
d = json.load(sys.stdin)
entries = d.get('entries', [])
colors = {'error': '\\033[0;31m', 'warning': '\\033[0;33m', 'log': '', 'info': '\\033[0;36m'}
for e in entries:
    level = e.get('level', 'log')
    text = e.get('text', '')
    c = colors.get(level, '')
    print(f'{c}[{level}] {text}\\033[0m')
if not entries:
    print('  (no console output)')
print(f'\\n\\033[2m{len(entries)} entries\\033[0m')
"
    ;;

  # ── Read: clean content extraction ─────────────────────────────────────
  read|content|markdown)
    URL="${1:-}"
    if [[ -n "$URL" ]]; then
      NAVBODY=$(build_json targetUrl "$URL")
      api_post "navigate" "$NAVBODY" >/dev/null
      sleep 2
    fi
    # JS stored in variable, passed via sys.argv to avoid quoting hell
    READ_JS='(()=>{
      const skip = new Set(["SCRIPT","STYLE","NOSCRIPT","SVG","NAV","FOOTER","HEADER","ASIDE","IFRAME"]);
      function getText(el, depth) {
        if (skip.has(el.tagName)) return "";
        if (el.tagName === "IMG") return "[image: " + (el.alt || el.src?.split("/").pop() || "") + "]\n";
        let lines = [];
        const tag = el.tagName;
        const text = el.childNodes.length === 1 && el.childNodes[0].nodeType === 3
          ? el.childNodes[0].textContent.trim() : null;
        if (tag === "H1" && text) lines.push("# " + text);
        else if (tag === "H2" && text) lines.push("## " + text);
        else if (tag === "H3" && text) lines.push("### " + text);
        else if (tag === "H4" && text) lines.push("#### " + text);
        else if (tag === "LI" && text) lines.push("- " + text);
        else if (tag === "A" && text) lines.push("[" + text + "](" + el.href + ")");
        else if (tag === "PRE" || tag === "CODE") lines.push("```\n" + el.textContent.trim() + "\n```");
        else if (tag === "BLOCKQUOTE") lines.push("> " + el.textContent.trim().substring(0, 200));
        else if (text && (tag === "P" || tag === "SPAN" || tag === "DIV" || tag === "TD" || tag === "TH"))
          lines.push(text);
        else {
          for (const child of el.children) {
            const sub = getText(child, depth + 1);
            if (sub) lines.push(sub);
          }
        }
        return lines.join("\n");
      }
      const main = document.querySelector("main, article, [role=main], .content, #content") || document.body;
      const title = document.title;
      const url = location.href;
      const content = getText(main, 0).replace(/\n{3,}/g, "\n\n").trim();
      return "# " + title + "\n" + url + "\n\n" + content.substring(0, 20000);
    })()'
    BODY=$(build_eval "$READ_JS")
    api_post "evaluate" "$BODY" | print_eval_result
    ;;

  # ── Search ─────────────────────────────────────────────────────────────
  search)
    QUERY="${*:?Usage: soma-browser search <query>}"
    ENCODED=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$QUERY")
    NAVBODY=$(build_json targetUrl "https://www.google.com/search?q=$ENCODED")
    api_post "navigate" "$NAVBODY" >/dev/null
    sleep 2
    SEARCH_JS='Array.from(document.querySelectorAll("h3")).map((h,i)=>{const a=h.closest("a");return(i+1)+". "+h.textContent+" | "+(a?a.href:"")}).slice(0,10).join("\n")'
    BODY=$(build_eval "$SEARCH_JS")
    api_post "evaluate" "$BODY" | print_eval_result
    ;;

  # ── Help ───────────────────────────────────────────────────────────────
  help|--help|-h)
    echo -e "${BOLD}σ soma-browser${NC} — Browser automation via CDP"
    echo ""
    echo -e "  ${CYAN}Inspect:${NC}"
    echo "    xray [selector] [max]     Structured DOM walk (fast page understanding)"
    echo "    a11y [--roles=btn,link]   Accessibility tree (interactive elements)"
    echo "    text [selector]           Raw text content"
    echo "    styles <selector>         CSS rules + computed styles"
    echo "    console [--errors]        Console output (listens 3s)"
    echo "    perf                      Performance metrics"
    echo ""
    echo -e "  ${CYAN}Navigate:${NC}"
    echo "    tabs                      List open tabs"
    echo "    open <url>                Navigate + xray result"
    echo "    search <query>            Google search results"
    echo "    read [url]                Extract as clean markdown"
    echo ""
    echo -e "  ${CYAN}Interact:${NC}"
    echo "    click <selector>          Click element"
    echo "    fill <selector> <text>    Fill input field"
    echo "    eval '<js>'               Run JavaScript"
    echo "    wait <selector> [ms]      Wait for element"
    echo ""
    echo -e "  ${CYAN}Capture:${NC}"
    echo "    shot [path] [--full]      Screenshot to file"
    echo "    emulate <preset|WxH>      Device emulation (mobile/tablet/desktop)"
    echo ""
    echo -e "  ${CYAN}Flags:${NC}"
    echo "    --personal                Use personal Chrome (port 9222)"
    echo "    --tab=<id>                Target tab by ID"
    echo "    --url=<match>             Target tab by URL substring"
    echo "    --title=<match>           Target tab by title"
    ;;

  *)
    echo -e "${RED}Unknown: $CMD${NC} — try ${DIM}soma-browser help${NC}"
    exit 1
    ;;
esac
