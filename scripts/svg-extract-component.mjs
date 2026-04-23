#!/usr/bin/env node
/**
 * svg-extract-component.mjs
 *
 * Pull a single component (a top-level <g> group) out of an OG SVG and
 * emit a new SVG cropped tightly to that component's bounding box.
 *
 * Uses the agent browser via CDP to get real getBBox() measurements —
 * that's the only honest way to size groups with arbitrary path content.
 *
 * Usage:
 *   node scripts/svg-extract-component.mjs <input.svg> [--list]
 *   node scripts/svg-extract-component.mjs <input.svg> --pick <n> [--out <path>]
 *   node scripts/svg-extract-component.mjs <input.svg> --match <comment-substr> [--out <path>]
 *
 * Examples:
 *   # See what's inside
 *   node scripts/svg-extract-component.mjs public/images/blog/og-the-doctor-that-never-worked.svg --list
 *
 *   # Extract hero (the code-snippet card), write to a roadmap/ subdir
 *   node scripts/svg-extract-component.mjs og-the-doctor-that-never-worked.svg --match "CODE SNIPPET" \
 *       --out public/images/roadmap/doctor-hero.svg
 *
 * Notes:
 * - CDP endpoint defaults to http://localhost:9333 (soma agent browser).
 *   Override with CDP_URL env var.
 * - Preserves <defs> so gradients/patterns referenced by the component
 *   still render in the extracted SVG.
 */

import fs from 'node:fs';
import path from 'node:path';
// Node 22+ has WebSocket built-in; no undici import needed.

const CDP_HTTP = process.env.CDP_URL || 'http://localhost:9333';

async function findTab() {
  const res = await fetch(`${CDP_HTTP}/json`);
  const tabs = await res.json();
  const page = tabs.find((t) => t.type === 'page');
  if (!page) throw new Error('No page tab in the browser.');
  return page.webSocketDebuggerUrl;
}

function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const ready = new Promise((r) => ws.addEventListener('open', r, { once: true }));
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  });
  return {
    ready,
    send(method, params = {}) {
      const mid = ++id;
      return new Promise((resolve, reject) => {
        pending.set(mid, { resolve, reject });
        ws.send(JSON.stringify({ id: mid, method, params }));
      });
    },
    close() { ws.close(); },
  };
}

function parseArgs(argv) {
  const args = { input: null, list: false, pick: null, match: null, out: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--list') args.list = true;
    else if (a === '--pick') args.pick = Number(argv[++i]);
    else if (a === '--match') args.match = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (!args.input) args.input = a;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.input) {
    console.error('Usage: svg-extract-component.mjs <input.svg> [--list | --pick N | --match STR] [--out PATH]');
    process.exit(1);
  }

  const absIn = path.resolve(args.input);
  const svgText = fs.readFileSync(absIn, 'utf8');

  const wsUrl = await findTab();
  const c = cdp(wsUrl);
  await c.ready;
  await c.send('Page.enable');

  // Load the SVG into the tab via data: URL. It renders offscreen but
  // the layout engine still computes real bounding boxes.
  const dataUrl = 'data:text/html;charset=utf-8,' +
    encodeURIComponent(`<!doctype html><html><body style="margin:0;background:#0d1117">${svgText}</body></html>`);
  await c.send('Page.navigate', { url: dataUrl });
  await new Promise((r) => setTimeout(r, 400));

  // Measure each top-level <g>, collect its comment label + bbox.
  const probe = await c.send('Runtime.evaluate', {
    expression: `(() => {
      const svg = document.querySelector('svg');
      if (!svg) return { error: 'no svg' };
      // Walk svg's direct children in source order; each top-level <g>
      // is a candidate. The preceding comment text (if any) is the label.
      const out = [];
      let precedingComment = '';
      for (const node of svg.childNodes) {
        if (node.nodeType === Node.COMMENT_NODE) {
          precedingComment = node.nodeValue.trim();
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'g') {
          let bbox = null;
          try { bbox = node.getBBox(); } catch (_) {}
          out.push({
            label: precedingComment,
            transform: node.getAttribute('transform') || '',
            bbox: bbox ? { x: bbox.x, y: bbox.y, w: bbox.width, h: bbox.height } : null,
          });
          precedingComment = '';
        }
      }
      return { ok: true, groups: out, svgWidth: svg.viewBox.baseVal.width, svgHeight: svg.viewBox.baseVal.height };
    })()`,
    returnByValue: true,
  });

  const res = probe.result?.value;
  if (!res || res.error) {
    console.error('Measurement failed:', res?.error || probe);
    c.close();
    process.exit(2);
  }

  const groups = res.groups.map((g, i) => ({ index: i, ...g }));

  if (args.list || (!args.pick && args.pick !== 0 && !args.match)) {
    console.log(`\nFile: ${absIn}`);
    console.log(`ViewBox: 0 0 ${res.svgWidth} ${res.svgHeight}`);
    console.log(`Top-level <g> groups: ${groups.length}\n`);
    for (const g of groups) {
      const bb = g.bbox ? `bbox=${g.bbox.x.toFixed(0)},${g.bbox.y.toFixed(0)} ${g.bbox.w.toFixed(0)}x${g.bbox.h.toFixed(0)}` : 'bbox=(none)';
      const label = g.label ? ` "${g.label.replace(/\s+/g, ' ').slice(0, 60)}"` : '';
      console.log(`  [${g.index}] ${bb}${label}`);
    }
    console.log('');
    c.close();
    return;
  }

  // Resolve pick
  let picked = null;
  if (args.pick !== null) {
    picked = groups[args.pick];
  } else if (args.match) {
    const needle = args.match.toLowerCase();
    picked = groups.find((g) => g.label && g.label.toLowerCase().includes(needle));
  }
  if (!picked) {
    console.error('No group matched. Run with --list to see options.');
    c.close();
    process.exit(3);
  }
  if (!picked.bbox) {
    console.error(`Group [${picked.index}] has no measurable bbox (empty?).`);
    c.close();
    process.exit(4);
  }

  // Build the extracted SVG: preserve <defs>, include only the picked group,
  // compute tight viewBox with a small pad.
  const PAD = 4;
  const vb = {
    x: Math.max(0, picked.bbox.x - PAD),
    y: Math.max(0, picked.bbox.y - PAD),
    w: picked.bbox.w + PAD * 2,
    h: picked.bbox.h + PAD * 2,
  };

  // Rebuild via DOM serialization in the tab — honors the real element tree.
  // Strip the outer transform: getBBox() returns bounds in the group's LOCAL
  // coordinate space, so the new viewBox is already sized for that frame;
  // leaving the translate() in place would double-shift the content off-screen.
  const serialize = await c.send('Runtime.evaluate', {
    expression: `(() => {
      const svg = document.querySelector('svg');
      const target = Array.from(svg.children).filter(n => n.tagName.toLowerCase() === 'g')[${picked.index}];
      const clone = target.cloneNode(true);
      clone.removeAttribute('transform');
      const defs = svg.querySelector('defs');
      const defsHtml = defs ? defs.outerHTML : '';
      return { defs: defsHtml, group: clone.outerHTML };
    })()`,
    returnByValue: true,
  });
  const { defs, group } = serialize.result.value;

  const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x.toFixed(2)} ${vb.y.toFixed(2)} ${vb.w.toFixed(2)} ${vb.h.toFixed(2)}" role="img" aria-hidden="true">
${defs}
${group}
</svg>
`;

  const outPath = path.resolve(args.out || absIn.replace(/\.svg$/, '.extracted.svg'));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, out);
  console.log(`Extracted group [${picked.index}]${picked.label ? ` (${picked.label.replace(/\s+/g, ' ').slice(0, 50)})` : ''}`);
  console.log(`  bbox: ${picked.bbox.x.toFixed(0)},${picked.bbox.y.toFixed(0)} ${picked.bbox.w.toFixed(0)}x${picked.bbox.h.toFixed(0)}`);
  console.log(`  out:  ${path.relative(process.cwd(), outPath)}  (${fs.statSync(outPath).size} bytes)`);
  c.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
