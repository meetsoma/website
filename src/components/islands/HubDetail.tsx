/**
 * HubDetail — Preact island that renders a hub item detail page.
 * Fetches content from GitHub raw at runtime — no website rebuild needed.
 * Falls back to static props if available (from SSG build).
 */
import { useState, useEffect } from 'preact/hooks';

const RAW_BASE = 'https://raw.githubusercontent.com/meetsoma/community/main';
const HUB_INDEX_URL = `${RAW_BASE}/hub-index.json`;

// ── Types ──

interface HubItem {
  slug: string;
  name: string;
  type: string;
  description: string;
  author: string;
  version: string;
  breadcrumb?: string;
  heatDefault?: string;
  tier?: string;
  tags?: string[];
  topic?: string[];
  keywords?: string[];
  language?: string;
  requires?: string[];
  body?: string;
}

interface Props {
  /** If provided, use these. If empty, read from URL path /hub/{type}/{slug} */
  type?: string;
  slug?: string;
  /** Pre-rendered item from SSG (may be stale or absent for new content) */
  staticItem?: HubItem | null;
  staticBody?: string | null;
}

// ── Frontmatter parser (mirrors hub.ts) ──

function parseFrontmatter(content: string): { meta: Record<string, any>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const meta: Record<string, any> = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\S[\w-]*)\s*:\s*(.+)$/);
    if (!kv) continue;
    let val: any = kv[2].trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map((s: string) => s.trim().replace(/^["']|["']$/g, ''));
    } else if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    meta[kv[1]] = val;
  }
  return { meta, body: match[2].trim() };
}

// ── Markdown renderer (mirrors hub.ts renderMarkdown) ──

function renderMarkdown(md: string): string {
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

  function inline(s: string): string {
    return s
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  function closeList() {
    if (inList) { html.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
  }

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html.push(`<pre><code>${codeContent.join('\n')}</code></pre>`);
        codeContent = []; inCodeBlock = false;
      } else { closeList(); inCodeBlock = true; }
      continue;
    }
    if (inCodeBlock) {
      codeContent.push(line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      continue;
    }
    if (line.trim() === '') { closeList(); continue; }

    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) { closeList(); html.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }

    if (line.match(/^[-*]\s/)) {
      if (!inList) { html.push('<ul>'); inList = true; listType = 'ul'; }
      html.push(`<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`);
      continue;
    }
    if (line.match(/^\d+\.\s/)) {
      if (!inList) { html.push('<ol>'); inList = true; listType = 'ol'; }
      html.push(`<li>${inline(line.replace(/^\d+\.\s+/, ''))}</li>`);
      continue;
    }

    if (line.startsWith('> ')) {
      closeList();
      html.push(`<blockquote><p>${inline(line.slice(2))}</p></blockquote>`);
      continue;
    }
    if (line.match(/^[|]/)) {
      // Simple table support — skip separator rows
      if (line.match(/^[|\s-:]+$/)) continue;
      const cells = line.split('|').filter(c => c.trim()).map(c => inline(c.trim()));
      html.push(`<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`);
      continue;
    }
    if (line.match(/^---$/)) { closeList(); html.push('<hr>'); continue; }

    closeList();
    html.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return html.join('\n');
}

// ── Type config ──

const typeLabels: Record<string, string> = {
  protocol: 'Protocol', muscle: 'Muscle', skill: 'Skill',
  template: 'Template', automation: 'Automation', script: 'Script',
};

const typeAccentColors: Record<string, string> = {
  protocol: 'rgba(168, 232, 168, 0.25)', muscle: 'rgba(232, 168, 124, 0.25)',
  skill: 'rgba(124, 178, 212, 0.25)', template: 'rgba(190, 152, 232, 0.25)',
  automation: 'rgba(200, 200, 120, 0.25)', script: 'rgba(124, 212, 178, 0.25)',
};

// ── Component ──

export default function HubDetail({ type: propType, slug: propSlug, staticItem, staticBody }: Props) {
  // Resolve type/slug from props or URL
  // URL pattern: /hub/{type}/{slug} or /hub/view?type=x&slug=y
  const [resolvedType, resolvedSlug] = (() => {
    if (propType && propSlug) return [propType, propSlug];
    if (typeof window === 'undefined') return ['', ''];
    const path = window.location.pathname;
    const hubMatch = path.match(/^\/hub\/([^/]+)\/([^/]+)\/?$/);
    if (hubMatch) return [hubMatch[1], hubMatch[2]];
    const params = new URLSearchParams(window.location.search);
    return [params.get('type') || '', params.get('slug') || ''];
  })();

  const type = resolvedType;
  const slug = resolvedSlug;

  const [item, setItem] = useState<HubItem | null>(staticItem || null);
  const [body, setBody] = useState<string>(staticBody || '');
  const [loading, setLoading] = useState(!staticItem);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!type || !slug) { setNotFound(true); setLoading(false); return; }

    // Resolve the raw URL for the content file
    let contentUrl: string;
    if (type === 'script') {
      contentUrl = `${RAW_BASE}/scripts/${slug}/README.md`;
    } else if (type === 'template') {
      contentUrl = `${RAW_BASE}/templates/${slug}/README.md`;
    } else {
      // Protocols, muscles — try flat file first, then folder
      contentUrl = `${RAW_BASE}/${type}s/${slug}.md`;
    }

    fetch(contentUrl)
      .then(r => {
        if (!r.ok) throw new Error('not found');
        return r.text();
      })
      .then(text => {
        const { meta, body: mdBody } = parseFrontmatter(text);
        setItem({
          slug,
          name: (meta.name || slug).replace(/-/g, ' '),
          type,
          description: meta.description || meta.breadcrumb || '',
          author: meta.author || 'Community',
          version: meta.version || '1.0.0',
          breadcrumb: meta.breadcrumb,
          heatDefault: meta['heat-default'],
          tier: meta.tier,
          tags: Array.isArray(meta.tags) ? meta.tags : undefined,
          language: meta.language,
          requires: Array.isArray(meta.requires) ? meta.requires : undefined,
          body: mdBody,
        });
        setBody(mdBody);
        setLoading(false);
      })
      .catch(() => {
        if (!staticItem) setNotFound(true);
        setLoading(false);
      });
  }, [type, slug]);

  if (notFound) {
    return (
      <div class="hub-detail-empty">
        <h1>Not Found</h1>
        <p>No {typeLabels[type] || type} named "{slug}" found in the hub.</p>
        <a href="/hub">← Back to Hub</a>
      </div>
    );
  }

  if (loading || !item) {
    return (
      <div class="hub-detail-loading">
        <div class="loading-pulse" />
        <p>Loading {typeLabels[type] || type}...</p>
      </div>
    );
  }

  const isScript = type === 'script';
  const installCmd = type === 'template'
    ? `soma init --template ${slug}`
    : type === 'script'
    ? `soma install script ${slug}`
    : `/install ${type} ${slug}`;

  const accent = typeAccentColors[type] || typeAccentColors.protocol;

  return (
    <div class="hub-detail">
      {/* Header */}
      <header class="header">
        <span class="type-badge">{typeLabels[type] || type}</span>
        <h1 class="title">{item.name}</h1>
        {item.breadcrumb && <p class="breadcrumb">{item.breadcrumb}</p>}
        {item.description && !item.breadcrumb && <p class="breadcrumb">{item.description}</p>}
        <div class="meta-row">
          {item.tier && <span class={`tier-badge tier-${item.tier}`}>{item.tier}</span>}
          <span class="meta-item">by {item.author}</span>
          {item.version && <span class="meta-item">v{item.version}</span>}
          {item.heatDefault && <span class="meta-item heat">heat: {item.heatDefault}</span>}
        </div>
        {item.tags && item.tags.length > 0 && (
          <div class="tag-row">
            {item.tags.map(t => <span class="tag-pill">{t}</span>)}
          </div>
        )}
      </header>

      {/* Stats Bar */}
      <div class="stats-bar">
        {item.tier && <div class="stat"><span class="stat-label">Tier</span><span class={`stat-value tier-badge tier-${item.tier}`}>{item.tier}</span></div>}
        {item.version && <div class="stat"><span class="stat-label">Version</span><span class="stat-value">{item.version}</span></div>}
        {item.heatDefault && <div class="stat"><span class="stat-label">Heat</span><span class="stat-value">{item.heatDefault}</span></div>}
        <div class="stat"><span class="stat-label">Author</span><span class="stat-value">{item.author}</span></div>
        {isScript && item.language && <div class="stat"><span class="stat-label">Language</span><span class="stat-value">{item.language}</span></div>}
        {isScript && item.requires && item.requires.length > 0 && <div class="stat"><span class="stat-label">Requires</span><span class="stat-value">{item.requires.join(', ')}</span></div>}
      </div>

      {/* Install */}
      <div class="install-section">
        <code class="install-cmd">{installCmd}</code>
        <p class="install-hint">Run in a Soma session to add to your project.</p>
      </div>

      {/* Body */}
      <div class="body-section">
        <h2>Details</h2>
        <div class="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
      </div>

      {/* Source */}
      <div class="source-section">
        <a href={`https://github.com/meetsoma/community/tree/main/${type}s/${slug}`} target="_blank" rel="noopener" class="source-link">
          View source on GitHub →
        </a>
      </div>

      <style>{`
        .hub-detail { max-width: 100%; }
        .hub-detail-loading {
          display: flex; flex-direction: column; align-items: center;
          padding: 4rem 1rem; color: var(--text-muted, #6e7681);
        }
        .loading-pulse {
          width: 40px; height: 40px; border-radius: 50%;
          background: var(--accent-bright, #7cb2d4);
          animation: pulse 1.5s ease-in-out infinite;
          margin-bottom: 1rem;
        }
        @keyframes pulse { 0%,100% { opacity: 0.3; transform: scale(0.95); } 50% { opacity: 0.7; transform: scale(1.05); } }
        .hub-detail-empty {
          text-align: center; padding: 4rem 1rem;
          color: var(--text-secondary, #c9d1d9);
        }
        .hub-detail-empty a { color: var(--accent-bright, #7cb2d4); }
        .header { margin-bottom: 2rem; }
        .type-badge {
          display: inline-block; font-size: 0.75rem; font-family: var(--font-mono, monospace);
          color: var(--accent-bright, #7cb2d4); text-transform: uppercase;
          letter-spacing: 0.08em; margin-bottom: 0.75rem;
        }
        .title {
          font-family: var(--font-display, system-ui); font-size: clamp(1.8rem, 5vw, 2.4rem);
          font-weight: 700; text-transform: capitalize; margin-bottom: 1rem;
          color: var(--text-primary, #e4eaf4);
        }
        .breadcrumb { color: var(--text-secondary, #c9d1d9); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1rem; }
        .meta-row { display: flex; gap: 1rem; flex-wrap: wrap; }
        .meta-item { font-family: var(--font-mono, monospace); font-size: 0.75rem; color: var(--text-muted, #6e7681); }
        .meta-item.heat { color: var(--warm-bright, #e8a87c); }
        .tier-badge {
          font-family: var(--font-mono, monospace); font-size: 0.7rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.05em;
          padding: 2px 0.5rem; border-radius: 4px;
        }
        .tier-core { background: rgba(124, 178, 212, 0.2); color: var(--accent-bright, #7cb2d4); }
        .tier-official { background: rgba(168, 232, 168, 0.2); color: rgb(168, 232, 168); }
        .tier-community { background: rgba(168, 232, 168, 0.15); color: rgb(140, 200, 140); }
        .tag-row { display: flex; gap: 0.3rem; flex-wrap: wrap; margin-top: 0.5rem; }
        .tag-pill {
          font-family: var(--font-mono, monospace); font-size: 0.7rem;
          padding: 2px 0.5rem; border-radius: 4px;
          background: var(--surface-accent-soft, rgba(124, 178, 212, 0.1));
          color: var(--accent-bright, #7cb2d4);
        }
        .stats-bar {
          display: flex; flex-wrap: wrap; gap: 0.5rem;
          padding: 1rem 1.5rem; border-radius: 12px;
          border: 1px solid var(--border-subtle, rgba(228,234,244,0.08));
          background: var(--surface-card, rgba(22,27,34,0.6));
          margin-bottom: 1.5rem;
        }
        .stat {
          display: flex; flex-direction: column; gap: 0.2rem;
          padding-right: 1.5rem; border-right: 1px solid var(--border-subtle, rgba(228,234,244,0.08));
        }
        .stat:last-child { border-right: none; padding-right: 0; }
        .stat-label {
          font-family: var(--font-mono, monospace); font-size: 0.65rem;
          color: var(--text-muted, #6e7681); text-transform: uppercase; letter-spacing: 0.06em;
        }
        .stat-value {
          font-family: var(--font-display, system-ui); font-size: 0.9rem;
          font-weight: 600; color: var(--text-primary, #e4eaf4);
        }
        .install-section {
          padding: 1.5rem; border-radius: 12px;
          border: 1px solid var(--border-subtle, rgba(228,234,244,0.08));
          background: var(--surface-card, rgba(22,27,34,0.6));
          margin-bottom: 1.5rem;
        }
        .install-cmd {
          display: block; font-family: var(--font-mono, monospace); font-size: 0.9rem;
          padding: 1rem; border-radius: 8px;
          background: var(--bg-elevated, #0d1117);
          color: var(--accent-bright, #7cb2d4); margin-bottom: 0.5rem;
        }
        .install-hint { font-size: 0.8rem; color: var(--text-muted, #6e7681); }
        .body-section {
          padding: 2rem; border-radius: 12px;
          border: 1px solid var(--border-subtle, rgba(228,234,244,0.08));
          background: var(--surface-card, rgba(22,27,34,0.6));
          margin-bottom: 1.5rem;
        }
        .body-section h2 {
          font-family: var(--font-display, system-ui); font-size: 1.25rem;
          font-weight: 600; margin: 1.5rem 0 1rem;
          padding-top: 1rem; border-top: 1px solid var(--border-subtle, rgba(228,234,244,0.08));
        }
        .body-section h2:first-child { margin-top: 0; padding-top: 0; border-top: none; }
        .body-section h3 { font-size: 1rem; font-weight: 600; margin: 1rem 0 0.5rem; }
        .body-section p { color: var(--text-secondary, #c9d1d9); line-height: 1.6; margin-bottom: 1rem; font-size: 0.9rem; }
        .body-section ul, .body-section ol { color: var(--text-secondary, #c9d1d9); padding-left: 1.5rem; margin-bottom: 1rem; font-size: 0.9rem; }
        .body-section li { margin-bottom: 0.3rem; line-height: 1.6; }
        .body-section code {
          font-family: var(--font-mono, monospace); font-size: 0.8rem;
          padding: 1px 0.3rem; border-radius: 4px;
          background: var(--surface-accent-soft, rgba(124, 178, 212, 0.1));
          color: var(--accent-bright, #7cb2d4);
        }
        .body-section pre {
          background: var(--bg-elevated, #0d1117);
          padding: 1rem; border-radius: 8px; overflow-x: auto;
          margin-bottom: 1rem; font-size: 0.8rem; line-height: 1.5;
        }
        .body-section pre code { background: none; padding: 0; color: var(--text-secondary, #c9d1d9); }
        .body-section table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; font-size: 0.8rem; }
        .body-section td {
          padding: 0.5rem; border-bottom: 1px solid var(--border-subtle, rgba(228,234,244,0.08));
          color: var(--text-secondary, #c9d1d9);
        }
        .body-section strong { color: var(--text-primary, #e4eaf4); }
        .body-section blockquote {
          border-left: 3px solid var(--accent-bright, #7cb2d4);
          padding-left: 1rem; margin: 1rem 0;
          color: var(--text-secondary, #c9d1d9); font-style: italic;
        }
        .source-section { text-align: center; margin-bottom: 3rem; }
        .source-link { font-size: 0.9rem; color: var(--accent-bright, #7cb2d4); text-decoration: none; }
        .source-link:hover { text-decoration: underline; }
        @media (max-width: 480px) { .stats-bar { flex-direction: column; } .stat { border-right: none; padding-right: 0; } }
      `}</style>
    </div>
  );
}
