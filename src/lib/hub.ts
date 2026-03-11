/**
 * Hub data loader — reads community repo at build time.
 * Parses YAML frontmatter from markdown files.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Look for community data in two places:
// 1. website/community/ (copied for Vercel deploy)
// 2. ../community/ (sibling repo for local dev)
const localCopy = path.resolve(__dirname, '../../community');
const siblingRepo = path.resolve(__dirname, '../../../community');
// Check for actual content files, not just empty dirs (fetch script creates empty dirs on rate-limit)
const localHasContent = fs.existsSync(path.join(localCopy, 'protocols'))
  && fs.readdirSync(path.join(localCopy, 'protocols')).some(f => f.endsWith('.md'));
const COMMUNITY_ROOT = localHasContent ? localCopy : siblingRepo;

interface HubItem {
  slug: string;
  name: string;
  type: 'protocol' | 'muscle' | 'skill' | 'template';
  description: string;
  author: string;
  version: string;
  breadcrumb?: string;
  heatDefault?: string;
  appliesTo?: string[];
  tier?: 'core' | 'official' | 'community' | 'pro';
  tags?: string[];
  topic?: string[];
  keywords?: string[];
  body: string;
  /** Version history from git commits (populated at build time) */
  versions?: VersionEntry[];
}

interface VersionEntry {
  version: string;
  sha: string;
  date: string;
  message: string;
  body: string;
}

function parseFrontmatter(content: string): { meta: Record<string, any>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const meta: Record<string, any> = {};
  const lines = match[1].split('\n');
  for (const line of lines) {
    const kv = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (kv) {
      let val = kv[2].trim();
      // Handle arrays
      if (val.startsWith('[') && val.endsWith(']')) {
        val = val.slice(1, -1).split(',').map((s: string) => s.trim().replace(/^["']|["']$/g, '')) as any;
      }
      // Handle quoted strings
      if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      meta[kv[1]] = val;
    }
  }
  return { meta, body: match[2] };
}

function loadDir(type: HubItem['type'], dir: string): HubItem[] {
  const fullDir = path.join(COMMUNITY_ROOT, dir);
  if (!fs.existsSync(fullDir)) return [];

  const items: HubItem[] = [];

  for (const entry of fs.readdirSync(fullDir)) {
    const fullPath = path.join(fullDir, entry);
    const stat = fs.statSync(fullPath);

    let content: string;
    let slug: string;
    let manifest: Record<string, any> | null = null;

    if (stat.isFile() && entry.endsWith('.md')) {
      content = fs.readFileSync(fullPath, 'utf-8');
      slug = entry.replace(/\.md$/, '');
    } else if (stat.isDirectory()) {
      const readme = path.join(fullPath, 'README.md');
      const skill = path.join(fullPath, 'SKILL.md');
      const target = fs.existsSync(skill) ? skill : fs.existsSync(readme) ? readme : null;
      if (!target) continue;
      content = fs.readFileSync(target, 'utf-8');
      slug = entry;

      // Load template.json manifest if present (enriches item later)
      const manifestPath = path.join(fullPath, 'template.json');
      if (fs.existsSync(manifestPath)) {
        try {
          manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        } catch {}
      }
    } else {
      continue;
    }

    const { meta, body } = parseFrontmatter(content);

    const item: HubItem = {
      slug,
      name: (meta.name || slug).replace(/-/g, ' '),
      type,
      description: meta.description || meta.breadcrumb || '',
      author: meta.author || 'Community',
      version: meta.version || '1.0.0',
      breadcrumb: meta.breadcrumb,
      heatDefault: meta['heat-default'],
      appliesTo: Array.isArray(meta['applies-to']) ? meta['applies-to'] : undefined,
      tier: meta.tier || undefined,
      tags: Array.isArray(meta.tags) ? meta.tags : undefined,
      topic: Array.isArray(meta.topic) ? meta.topic : undefined,
      keywords: Array.isArray(meta.keywords) ? meta.keywords : undefined,
      body,
    };

    // Enrich with template.json manifest data if available
    if (typeof manifest === 'object' && manifest !== null) {
      if (manifest.description) item.description = manifest.description;
      if (manifest.author) item.author = manifest.author;
      if (manifest.version) item.version = manifest.version;
      if (manifest.tier) item.tier = manifest.tier;
    }

    items.push(item);
  }

  return items.sort((a, b) => a.name.localeCompare(b.name));
}

export function getProtocols(): HubItem[] {
  return loadDir('protocol', 'protocols');
}

export function getMuscles(): HubItem[] {
  return loadDir('muscle', 'muscles');
}

export function getSkills(): HubItem[] {
  return loadDir('skill', 'skills');
}

export function getTemplates(): HubItem[] {
  return loadDir('template', 'templates');
}

export function getAllItems(): HubItem[] {
  return [
    ...getProtocols(),
    ...getMuscles(),
    ...getSkills(),
    ...getTemplates(),
  ];
}

/**
 * Fetch version history for an item from GitHub commit history.
 * Runs at build time. Returns previous versions (current version excluded).
 * Each version includes the full body at that commit.
 */
const REPO = 'meetsoma/community';

export async function getVersionHistory(item: HubItem): Promise<VersionEntry[]> {
  const typeDir = item.type === 'protocol' ? 'protocols'
    : item.type === 'muscle' ? 'muscles'
    : item.type === 'skill' ? 'skills'
    : 'templates';

  const filePath = item.type === 'template'
    ? `${typeDir}/${item.slug}/README.md`
    : `${typeDir}/${item.slug}.md`;

  try {
    // Get commits that touched this file
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/commits?path=${filePath}&per_page=20`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'soma-website-build',
        },
      }
    );
    if (!res.ok) return [];
    const commits = await res.json();
    if (!Array.isArray(commits) || commits.length < 2) return [];

    // Skip first commit (that's the current version)
    const previousCommits = commits.slice(1);
    const versions: VersionEntry[] = [];

    for (const commit of previousCommits) {
      try {
        // Fetch file content at this commit
        const rawRes = await fetch(
          `https://raw.githubusercontent.com/${REPO}/${commit.sha}/${filePath}`,
          { headers: { 'User-Agent': 'soma-website-build' } }
        );
        if (!rawRes.ok) continue;
        const content = await rawRes.text();
        const { meta, body } = parseFrontmatter(content);

        const version = meta.version || 'unknown';

        // Skip if same version as one we already have
        if (versions.some(v => v.version === version)) continue;
        if (version === item.version) continue;

        versions.push({
          version,
          sha: commit.sha.slice(0, 7),
          date: (commit.commit?.author?.date || '').split('T')[0],
          message: (commit.commit?.message || '').split('\n')[0],
          body,
        });
      } catch {
        continue;
      }
    }

    return versions;
  } catch {
    return [];
  }
}

/**
 * Simple markdown → HTML renderer. No dependencies.
 * Handles: headings, paragraphs, code blocks, inline code, bold, italic,
 * lists, blockquotes, tables, links, horizontal rules.
 */
export function renderMarkdown(md: string): string {
  // Strip digest markers and HTML comments
  let text = md
    .replace(/<!--\s*digest:start\s*-->/g, '')
    .replace(/<!--\s*digest:end\s*-->/g, '')
    .replace(/<!--.*?-->/gs, '');

  const lines = text.split('\n');
  const html: string[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let inList = false;
  let listType = '';
  let inTable = false;

  function inline(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  function closeList() {
    if (inList) {
      html.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
    }
  }

  function closeTable() {
    if (inTable) {
      html.push('</tbody></table>');
      inTable = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html.push(`<pre><code>${codeContent.join('\n')}</code></pre>`);
        codeContent = [];
        inCodeBlock = false;
      } else {
        closeList();
        closeTable();
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeContent.push(line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      closeList();
      closeTable();
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      closeTable();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${inline(headingMatch[2])}</h${level}>`);
      continue;
    }

    // Table
    if (line.includes('|') && line.trim().startsWith('|')) {
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      // Check if next line is separator
      const nextLine = lines[i + 1] || '';
      if (nextLine.match(/^\|[\s-:|]+\|$/)) {
        closeList();
        html.push('<table><thead><tr>');
        cells.forEach(c => html.push(`<th>${inline(c)}</th>`));
        html.push('</tr></thead><tbody>');
        inTable = true;
        i++; // skip separator
        continue;
      }
      if (inTable) {
        html.push('<tr>');
        cells.forEach(c => html.push(`<td>${inline(c)}</td>`));
        html.push('</tr>');
        continue;
      }
    }

    // Blockquote
    if (line.startsWith('>')) {
      closeList();
      closeTable();
      html.push(`<blockquote>${inline(line.slice(1).trim())}</blockquote>`);
      continue;
    }

    // Horizontal rule
    if (line.match(/^---+$/)) {
      closeList();
      closeTable();
      html.push('<hr>');
      continue;
    }

    // Unordered list
    if (line.match(/^\s*[-*]\s+/)) {
      closeTable();
      if (!inList || listType !== 'ul') {
        closeList();
        html.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      html.push(`<li>${inline(line.replace(/^\s*[-*]\s+/, ''))}</li>`);
      continue;
    }

    // Ordered list
    if (line.match(/^\s*\d+\.\s+/)) {
      closeTable();
      if (!inList || listType !== 'ol') {
        closeList();
        html.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      html.push(`<li>${inline(line.replace(/^\s*\d+\.\s+/, ''))}</li>`);
      continue;
    }

    // Paragraph
    closeList();
    closeTable();
    html.push(`<p>${inline(line)}</p>`);
  }

  closeList();
  closeTable();
  return html.join('\n');
}

export type { HubItem, VersionEntry };
