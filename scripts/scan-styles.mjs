#!/usr/bin/env node
/**
 * scan-styles.mjs — Astro/TSX/CSS style auditor.
 *
 * Scans the repo for:
 *   1. Token DEFINITIONS    : `--name: value` inside any selector
 *   2. Token USAGES         : `var(--name[, fallback])`
 *   3. HARDCODED colors     : #xxx, #xxxxxx, rgba(...), rgb(...), hsl[a](...)
 *   4. HARDCODED sizes      : Npx where N >= 1, when --strict (often a token exists)
 *   5. Selectors per file   : .class-name { ... } anchored to file:line
 *
 * Output modes:
 *   --report markdown   : human-readable report grouped by category
 *   --json              : machine-readable for downstream tools
 *   --hardcoded         : ONLY the hardcoded values report (most actionable)
 *   --token <name>      : trace one token — every define + every use
 *   --orphans           : tokens defined but never used
 *   --missing           : usages of tokens that are never defined
 *
 * Usage:
 *   node scripts/scan-styles.mjs --report > /tmp/style-audit.md
 *   node scripts/scan-styles.mjs --hardcoded
 *   node scripts/scan-styles.mjs --token --surface-card
 *   node scripts/scan-styles.mjs --orphans
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

// ─── Walk ────────────────────────────────────────────────────────────────
function walk(dir, exts = ['.astro', '.tsx', '.ts', '.css', '.mjs', '.js'], { skipGenerated = false } = {}) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    if (entry === 'node_modules' || entry === 'dist') continue;
    if (skipGenerated && entry === '_generated') continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p, exts, { skipGenerated }));
    else if (exts.includes(extname(p))) out.push(p);
  }
  return out;
}

// ─── Extract style blocks from .astro files ──────────────────────────────
function extractStyleBlocks(content, filepath) {
  const ext = extname(filepath);
  if (ext === '.css') return [{ start: 1, body: content }];

  const blocks = [];
  // Astro <style> blocks (including is:global, scoped)
  const re = /<style[^>]*>([\s\S]*?)<\/style>/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const startLine = content.slice(0, m.index).split('\n').length;
    blocks.push({ start: startLine, body: m[1] });
  }
  return blocks;
}

// ─── Patterns ────────────────────────────────────────────────────────────
const RE_TOKEN_DEF = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;\n}]+?)(?=[;\n}])/g;
const RE_TOKEN_USE = /var\((--[a-zA-Z0-9_-]+)(?:\s*,\s*([^)]+))?\)/g;
// Hardcoded colors. Skip when inside var() fallback (we count those as token-use).
const RE_HEX = /(?<!var\([^)]*?)(?<![\w-])(#[0-9a-fA-F]{3,8})(?![0-9a-fA-F])/g;
const RE_RGBA = /\brgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*[\d.]+)?\s*\)/g;
const RE_HSL = /\bhsla?\(\s*[\d.]+(?:deg)?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(?:,\s*[\d.]+)?\s*\)/g;
// Selector heads — informational, for grouping
const RE_SELECTOR = /^([^{}@/]+?)\s*\{/gm;

// ─── Scan one file ───────────────────────────────────────────────────────
function scanFile(filepath, content) {
  const result = {
    file: relative(ROOT, filepath),
    defs: [],
    uses: [],
    hardcoded: [],
    selectors: [],
  };

  const blocks = extractStyleBlocks(content, filepath);
  for (const block of blocks) {
    const lines = block.body.split('\n');
    lines.forEach((line, i) => {
      const lineNo = block.start + i;
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;

      // Token definitions
      let m;
      const defRe = new RegExp(RE_TOKEN_DEF.source, 'g');
      while ((m = defRe.exec(line)) !== null) {
        result.defs.push({ name: m[1], value: m[2].trim(), line: lineNo });
      }

      // Token usages
      const useRe = new RegExp(RE_TOKEN_USE.source, 'g');
      while ((m = useRe.exec(line)) !== null) {
        result.uses.push({ name: m[1], fallback: m[2]?.trim() || null, line: lineNo });
      }

      // Hardcoded — but only count the line if it ALSO contains a CSS property assignment
      // (avoid catching #ids in selectors, comments, etc.)
      const looksLikeValue = /:\s*[^;]*(#|rgba?\(|hsla?\()/.test(line);
      if (!looksLikeValue) return;

      const hexRe = new RegExp(RE_HEX.source, 'g');
      while ((m = hexRe.exec(line)) !== null) {
        // Skip if this hex is inside a var(--x, #xxx) fallback (acceptable)
        const before = line.slice(0, m.index);
        const openVars = (before.match(/var\(/g) || []).length;
        const closeVars = (before.match(/\)/g) || []).length;
        if (openVars > closeVars) continue; // inside a var() fallback
        result.hardcoded.push({ kind: 'hex', value: m[1], line: lineNo, context: trimmed.slice(0, 100) });
      }
      const rgbaRe = new RegExp(RE_RGBA.source, 'g');
      while ((m = rgbaRe.exec(line)) !== null) {
        const before = line.slice(0, m.index);
        const openVars = (before.match(/var\(/g) || []).length;
        const closeVars = (before.match(/\)/g) || []).length;
        if (openVars > closeVars) continue;
        result.hardcoded.push({ kind: 'rgba', value: m[0], line: lineNo, context: trimmed.slice(0, 100) });
      }
      const hslRe = new RegExp(RE_HSL.source, 'g');
      while ((m = hslRe.exec(line)) !== null) {
        result.hardcoded.push({ kind: 'hsl', value: m[0], line: lineNo, context: trimmed.slice(0, 100) });
      }
    });
  }

  return result;
}

// ─── Aggregate ───────────────────────────────────────────────────────────
function aggregate(results) {
  const tokenDefs = new Map();      // name → [{file, line, value}]
  const tokenUses = new Map();      // name → [{file, line}]
  const hardcoded = [];             // [{file, line, kind, value, context}]
  let totalDefs = 0;
  let totalUses = 0;

  for (const r of results) {
    for (const d of r.defs) {
      if (!tokenDefs.has(d.name)) tokenDefs.set(d.name, []);
      tokenDefs.get(d.name).push({ file: r.file, line: d.line, value: d.value });
      totalDefs++;
    }
    for (const u of r.uses) {
      if (!tokenUses.has(u.name)) tokenUses.set(u.name, []);
      tokenUses.get(u.name).push({ file: r.file, line: u.line, fallback: u.fallback });
      totalUses++;
    }
    for (const h of r.hardcoded) {
      hardcoded.push({ file: r.file, ...h });
    }
  }

  // Categorize tokens
  const orphans = [];           // defined, never used
  const missing = [];           // used, never defined
  for (const [name] of tokenDefs) {
    if (!tokenUses.has(name)) orphans.push(name);
  }
  for (const [name] of tokenUses) {
    if (!tokenDefs.has(name)) missing.push(name);
  }

  return { tokenDefs, tokenUses, hardcoded, orphans, missing, totalDefs, totalUses };
}

// ─── Report formatters ───────────────────────────────────────────────────
function fmtMarkdown(agg) {
  const out = [];
  out.push(`# Style Audit — Soma Website\n`);
  out.push(`Generated: ${new Date().toISOString()}\n`);
  out.push(`- **${agg.tokenDefs.size}** unique tokens defined`);
  out.push(`- **${agg.totalDefs}** total definitions (some tokens defined per-surface)`);
  out.push(`- **${agg.totalUses}** total usages`);
  out.push(`- **${agg.hardcoded.length}** hardcoded color values`);
  out.push(`- **${agg.orphans.length}** orphan tokens (defined, never used)`);
  out.push(`- **${agg.missing.length}** missing tokens (used, never defined — likely typo or external)\n`);

  out.push(`## Top hardcoded colors by file\n`);
  const byFile = new Map();
  for (const h of agg.hardcoded) {
    if (!byFile.has(h.file)) byFile.set(h.file, []);
    byFile.get(h.file).push(h);
  }
  const sorted = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [file, hits] of sorted.slice(0, 15)) {
    out.push(`### \`${file}\` (${hits.length})`);
    for (const h of hits.slice(0, 12)) {
      out.push(`- L${h.line}: \`${h.value}\` — \`${h.context}\``);
    }
    if (hits.length > 12) out.push(`- _… +${hits.length - 12} more_`);
    out.push('');
  }

  if (agg.orphans.length) {
    out.push(`## Orphan tokens (defined, never used)\n`);
    for (const name of agg.orphans.slice(0, 30)) {
      const defs = agg.tokenDefs.get(name);
      out.push(`- \`${name}\` — defined in ${defs.map(d => `\`${d.file}:${d.line}\``).join(', ')}`);
    }
    if (agg.orphans.length > 30) out.push(`- _… +${agg.orphans.length - 30} more_`);
    out.push('');
  }

  if (agg.missing.length) {
    out.push(`## Missing tokens (used, never defined)\n`);
    for (const name of agg.missing.slice(0, 30)) {
      const uses = agg.tokenUses.get(name);
      out.push(`- \`${name}\` — used in ${uses.length} place(s); first: \`${uses[0].file}:${uses[0].line}\` (fallback: ${uses[0].fallback || '_none_'})`);
    }
    out.push('');
  }

  return out.join('\n');
}

function fmtToken(agg, name) {
  const out = [];
  out.push(`# Token trace: \`${name}\`\n`);
  const defs = agg.tokenDefs.get(name) || [];
  const uses = agg.tokenUses.get(name) || [];
  out.push(`## Defined in ${defs.length} place(s)\n`);
  for (const d of defs) out.push(`- \`${d.file}:${d.line}\` → \`${d.value}\``);
  out.push(`\n## Used in ${uses.length} place(s)\n`);
  const byFile = new Map();
  for (const u of uses) {
    if (!byFile.has(u.file)) byFile.set(u.file, []);
    byFile.get(u.file).push(u);
  }
  for (const [file, list] of byFile) {
    out.push(`### \`${file}\` (${list.length})`);
    for (const u of list) out.push(`- L${u.line}${u.fallback ? ` (fallback: \`${u.fallback}\`)` : ''}`);
    out.push('');
  }
  return out.join('\n');
}

// ─── Main ────────────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const has = (flag) => args.includes(flag);
  const argv = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };

  // Walk EVERYTHING for both defs+uses by default. Pass --skip-generated to
  // exclude codegen output from hardcoded counts (codegen colors live in
  // registry.json, not here).
  const skipGenerated = has('--skip-generated');
  const files = walk(SRC, undefined, { skipGenerated });
  const results = files.map(f => scanFile(f, readFileSync(f, 'utf8')));
  const agg = aggregate(results);

  if (has('--json')) {
    console.log(JSON.stringify({
      summary: {
        tokens: agg.tokenDefs.size,
        totalDefs: agg.totalDefs,
        totalUses: agg.totalUses,
        hardcoded: agg.hardcoded.length,
        orphans: agg.orphans.length,
        missing: agg.missing.length,
      },
      hardcoded: agg.hardcoded,
      orphans: agg.orphans,
      missing: agg.missing,
    }, null, 2));
    return;
  }

  if (has('--token')) {
    const name = argv('--token');
    if (!name) { console.error('--token requires a name'); process.exit(2); }
    console.log(fmtToken(agg, name.startsWith('--') ? name : `--${name}`));
    return;
  }

  if (has('--orphans')) {
    console.log('# Orphan tokens (defined, never used)\n');
    for (const name of agg.orphans) {
      const defs = agg.tokenDefs.get(name);
      console.log(`- \`${name}\` — ${defs.map(d => `${d.file}:${d.line}`).join(', ')}`);
    }
    return;
  }

  if (has('--missing')) {
    console.log('# Missing tokens (used, never defined)\n');
    for (const name of agg.missing) {
      const uses = agg.tokenUses.get(name);
      console.log(`- \`${name}\` (${uses.length}x) — first: ${uses[0].file}:${uses[0].line}`);
    }
    return;
  }

  if (has('--hardcoded')) {
    console.log('# Hardcoded colors by file\n');
    const byFile = new Map();
    for (const h of agg.hardcoded) {
      if (!byFile.has(h.file)) byFile.set(h.file, []);
      byFile.get(h.file).push(h);
    }
    const sorted = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length);
    for (const [file, hits] of sorted) {
      console.log(`## ${file} (${hits.length})`);
      for (const h of hits) console.log(`  L${h.line}: ${h.value}  ←  ${h.context}`);
      console.log('');
    }
    return;
  }

  // Default: markdown report
  console.log(fmtMarkdown(agg));
}

main();
