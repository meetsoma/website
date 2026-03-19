---
type: muscle
name: icon-audit
breadcrumb: "Browse icon libraries, extract SVGs, build numbered comparison pages, and screenshot for visual AI review."
tier: official
scope: hub
topic: [design, icons, visual-audit, browser-tools]
keywords: [icon-audit, svg, lucide, phosphor, comparison, visual-review, icon-library]
status: active
heat: 0
heat-default: warm
loads: 0
author: meetsoma
license: MIT
version: 1.0.0
created: 2026-03-11
updated: 2026-03-15
---

# Icon Audit — Muscle

<!-- digest:start -->
> **Icon Audit** — browse icon libraries, extract SVGs, build numbered comparison pages, screenshot for visual AI review. Works with any SVG library (Lucide, Phosphor, etc).
<!-- digest:end -->

## Workflow

### 1. Inventory — What Icons Do You Have?

Scan the project for current icon usage:

```bash
# Find all icon references
rg 'Icon name=' src/ -g '*.astro' -o | sort | uniq -c | sort -rn

# Find emoji/glyph usage that should be icons
rg '(🧬|⟐|◈|◎|🔮|🧠)' src/ -g '*.astro' -n
```

Map each icon to its **concept** — what it represents, not just its visual shape.

### 2. Browse — Navigate Icon Libraries

Start the browser and navigate to icon libraries:

```bash
node browser-start.js
node browser-xray.js "https://lucide.dev/icons/" --quick
```

**Good libraries for developer/technical sites:**
| Library | Count | Style | URL |
|---------|-------|-------|-----|
| Lucide | 1700+ | Clean line, 2px stroke | lucide.dev/icons |
| Phosphor | 9000+ | Rounded, 6 weights | phosphoricons.com |
| Tabler | 5400+ | Consistent 1.5px | tabler.io/icons |
| Heroicons | 300+ | Tight, polished | heroicons.com |

### 3. Extract — Pull SVG Markup Programmatically

For Lucide, navigate to individual icon pages and extract:

```javascript
// Connect to browser, navigate to icon page
await page.goto('https://lucide.dev/icons/' + iconName);
const svg = await page.evaluate(() => {
  const el = document.querySelector('svg.lucide');
  if (!el) return null;
  const clone = el.cloneNode(true);
  // Clean framework attributes
  clone.removeAttribute('data-v-15b35c9e');
  clone.removeAttribute('class');
  clone.setAttribute('width', '24');
  clone.setAttribute('height', '24');
  return clone.outerHTML;
});
```

Loop over a list of candidate icon names. Store results as JSON.

### 4. Build Comparison Page — The Key Step

Generate a local HTML file that:
- Groups candidates by **concept** (e.g., "EXTENSIONS", "SKILLS", "PROTOCOLS")
- Shows current icon first (highlighted border), then candidates
- **Numbers every icon** with a visible badge (cyan `#1`, `#2`, etc.)
- Uses the project's dark theme background for realistic preview
- Includes a short description of what the concept needs

```javascript
// For each concept group:
html += `<div class="icon-box"><span class="icon-num">${counter++}</span>${svg}</div>`;
```

### 5. Screenshot — Visual AI Review

Open the comparison page in the browser and take a full-page screenshot:

```javascript
await page.goto('file:///tmp/icon-comparison.html');
await page.screenshot({ path: '/tmp/icon-comparison.png', fullPage: true });
```

Read the screenshot with the `read` tool — vision AI can now evaluate all candidates at once and reference by number.

### 6. Select & Modify

Pick winners by number. If needed:
- Modify SVG paths (adjust stroke-width, simplify, combine elements)
- Blend: take a Lucide base and add project-specific details
- Test at multiple sizes (16, 24, 34, 48px)

### 7. Integrate

Replace the icon component SVG blocks. Build and verify.

## Tool Dependency

This muscle requires `browser-tools` (puppeteer-based):
- `browser-start.js` — launches Chrome with remote debugging on `:9222`
- `browser-screenshot.js` — takes screenshots
- `browser-xray.js` — page diagnostics + labeled screenshots

Location: `<agent-skills>/pi-skills/browser-tools/`

If browser tools aren't available, fall back to:
1. Download SVGs from icon library CDN/GitHub directly
2. Build comparison HTML from raw SVG strings
3. Open with `open /tmp/icon-comparison.html` and screenshot manually

## Why This Works

- **Numbered grid** eliminates ambiguity — "use #14" is unambiguous
- **Side-by-side with current** reveals whether a candidate is an upgrade or lateral move
- **Concept grouping** prevents mixing up which icon goes where
- **Dark theme preview** catches contrast issues before they ship
- **Programmatic extraction** is faster than manual copy-paste and preserves exact SVG markup

## Anti-Patterns

- Don't screenshot individual icon pages — too slow, no comparison context
- Don't pick icons by name alone — "brain" might look wrong at 16px even if the concept fits
- Don't mix icon libraries within a project — pick one library as primary, customize from there
- Don't skip the numbering — without it, vision AI descriptions get ambiguous fast
