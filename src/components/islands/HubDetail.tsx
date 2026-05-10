/**
 * HubDetail — Preact island that renders a hub item detail page.
 * Fetches content from GitHub raw at runtime — no website rebuild needed.
 * Falls back to static props if available (from SSG build).
 *
 * Features:
 * - Fetches README/content from GitHub raw
 * - Fetches hub-index.json for cross-references
 * - Templates: shows "What's Included" with resolved protocol/muscle cards
 * - Fork lineage: shows upstream link if forked
 * - Tags, stats bar, install commands
 * - Related items: other AMPS that share tags
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
  license?: string;
  requires?: string[];
  body?: string;
}

interface TemplateManifest {
  name: string;
  description?: string;
  version?: string;
  requires?: {
    protocols?: string[];
    muscles?: string[];
    skills?: string[];
    automations?: string[];
  };
}

interface Props {
  type?: string;
  slug?: string;
  staticItem?: HubItem | null;
  staticBody?: string | null;
}

// ── Frontmatter parser ──

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

// ── Markdown renderer ──

function renderMarkdown(md: string): string {
  let text = md.replace(/<!--[\s\S]*?-->/g, '');
  const lines = text.split('\n');
  const html: string[] = [];
  let inCode = false, code: string[] = [], inList = false, listType = '', inTable = false, isHeaderRow = true;

  function inline(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  function closeList() { if (inList) { html.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; } }
  function closeTable() { if (inTable) { html.push('</tbody></table>'); inTable = false; isHeaderRow = true; } }

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) { html.push(`<pre><code>${code.join('\n')}</code></pre>`); code = []; inCode = false; }
      else { closeList(); inCode = true; }
      continue;
    }
    if (inCode) { code.push(line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')); continue; }
    if (line.trim() === '') { closeList(); closeTable(); continue; }
    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) { closeList(); closeTable(); html.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    if (line.match(/^[-*]\s/)) {
      if (!inList) { html.push('<ul>'); inList = true; listType = 'ul'; }
      html.push(`<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`); continue;
    }
    if (line.match(/^\d+\.\s/)) {
      if (!inList) { html.push('<ol>'); inList = true; listType = 'ol'; }
      html.push(`<li>${inline(line.replace(/^\d+\.\s+/, ''))}</li>`); continue;
    }
    if (line.startsWith('> ')) { closeList(); html.push(`<blockquote><p>${inline(line.slice(2))}</p></blockquote>`); continue; }
    if (line.match(/^[|]/)) {
      if (line.match(/^[|\s-:]+$/)) continue; // separator row
      closeList();
      const cells = line.split('|').filter(c => c.trim()).map(c => inline(c.trim()));
      if (!inTable) {
        html.push('<table><thead>');
        html.push(`<tr>${cells.map(c => `<th>${c}</th>`).join('')}</tr>`);
        html.push('</thead><tbody>');
        inTable = true;
        isHeaderRow = false;
      } else {
        html.push(`<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`);
      }
      continue;
    }
    closeTable();
    if (line.match(/^---$/)) { closeList(); html.push('<hr>'); continue; }
    closeList();
    html.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  closeTable();
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
  const [allItems, setAllItems] = useState<HubItem[]>([]);
  const [templateManifest, setTemplateManifest] = useState<TemplateManifest | null>(null);

  // Fetch content + hub index
  useEffect(() => {
    if (!type || !slug) { setNotFound(true); setLoading(false); return; }

    // Fetch the content file
    let contentUrl: string;
    if (type === 'script') contentUrl = `${RAW_BASE}/scripts/${slug}/README.md`;
    else if (type === 'template') contentUrl = `${RAW_BASE}/templates/${slug}/README.md`;
    else contentUrl = `${RAW_BASE}/${type}s/${slug}.md`;

    const contentPromise = fetch(contentUrl)
      .then(r => { if (!r.ok) throw new Error('not found'); return r.text(); })
      .then(text => {
        const { meta, body: mdBody } = parseFrontmatter(text);
        const parsed: HubItem = {
          slug, type,
          name: (meta.name || slug).replace(/-/g, ' '),
          description: meta.description || meta.breadcrumb || '',
          author: meta.author || 'Community',
          version: meta.version || '1.0.0',
          breadcrumb: meta.breadcrumb,
          heatDefault: meta['heat-default'],
          tier: meta.tier,
          tags: Array.isArray(meta.tags) ? meta.tags : undefined,
          topic: Array.isArray(meta.topic) ? meta.topic : undefined,
          language: meta.language,
          license: meta.license,
          requires: Array.isArray(meta.requires) ? meta.requires : undefined,
          body: mdBody,
        };
        setItem(parsed);
        setBody(mdBody);
      })
      .catch(() => { if (!staticItem) setNotFound(true); });

    // Fetch hub index for cross-references
    const indexPromise = fetch(HUB_INDEX_URL)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.items) setAllItems(data.items); })
      .catch(() => {});

    // Fetch template manifest if template
    const manifestPromise = type === 'template'
      ? fetch(`${RAW_BASE}/templates/${slug}/template.json`)
          .then(r => r.ok ? r.json() : null)
          .then(data => { if (data) setTemplateManifest(data); })
          .catch(() => {})
      : Promise.resolve();

    Promise.all([contentPromise, indexPromise, manifestPromise])
      .finally(() => setLoading(false));
  }, [type, slug]);

  // ── Resolve cross-references ──

  const resolveItems = (type: string, slugs: string[]): HubItem[] => {
    return slugs.map(s => allItems.find(i => i.slug === s && i.type === type)).filter(Boolean) as HubItem[];
  };

  const requiredProtocols = templateManifest?.requires?.protocols
    ? resolveItems('protocol', templateManifest.requires.protocols) : [];
  const requiredMuscles = templateManifest?.requires?.muscles
    ? resolveItems('muscle', templateManifest.requires.muscles) : [];
  const requiredSkills = templateManifest?.requires?.skills
    ? resolveItems('skill', templateManifest.requires.skills) : [];

  // Find related items (share tags)
  const relatedItems = item?.tags && allItems.length > 0
    ? allItems.filter(other =>
        other.slug !== slug &&
        other.type !== type &&
        other.tags?.some(t => item.tags!.includes(t))
      ).slice(0, 6)
    : [];

  // ── Render ──

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
  const isTemplate = type === 'template';
  const installCmd = isTemplate
    ? `soma init --template ${slug}`
    : isScript
    ? `/hub install script ${slug}`
    : `/hub install ${type} ${slug}`;

  const totalRequired = requiredProtocols.length + requiredMuscles.length + requiredSkills.length;

  return (
    <div class="hub-detail">
      {/* Header */}
      <header class="hd-header">
        <span class="hd-type-badge">{typeLabels[type] || type}</span>
        <h1 class="hd-title">{item.name}</h1>
        {(item.breadcrumb || item.description) && (
          <p class="hd-breadcrumb">{item.breadcrumb || item.description}</p>
        )}
        <div class="hd-meta-row">
          {item.tier && <span class={`hd-tier tier-${item.tier}`}>{item.tier}</span>}
          <span class="hd-meta">by {item.author}</span>
          {item.version && <span class="hd-meta">v{item.version}</span>}
          {item.heatDefault && <span class="hd-meta hd-heat">heat: {item.heatDefault}</span>}
        </div>
        {item.tags && item.tags.length > 0 && (
          <div class="hd-tag-row">
            {item.tags.map(t => <span class="hd-tag" key={t}>{t}</span>)}
          </div>
        )}
      </header>

      {/* Stats Bar */}
      <div class="hd-stats">
        {item.tier && <div class="hd-stat"><span class="hd-stat-label">Tier</span><span class={`hd-stat-value tier-${item.tier}`}>{item.tier}</span></div>}
        {item.version && <div class="hd-stat"><span class="hd-stat-label">Version</span><span class="hd-stat-value">{item.version}</span></div>}
        {item.heatDefault && <div class="hd-stat"><span class="hd-stat-label">Heat</span><span class="hd-stat-value hd-heat">{item.heatDefault}</span></div>}
        <div class="hd-stat"><span class="hd-stat-label">Author</span><span class="hd-stat-value">{item.author}</span></div>
        {item.license && <div class="hd-stat"><span class="hd-stat-label">License</span><span class="hd-stat-value">{item.license}</span></div>}
        {isScript && item.language && <div class="hd-stat"><span class="hd-stat-label">Language</span><span class="hd-stat-value">{item.language}</span></div>}
        {isScript && item.requires && <div class="hd-stat"><span class="hd-stat-label">Requires</span><span class="hd-stat-value">{item.requires.join(', ')}</span></div>}
        {isTemplate && totalRequired > 0 && <div class="hd-stat"><span class="hd-stat-label">Includes</span><span class="hd-stat-value">{totalRequired} items</span></div>}
      </div>

      {/* Install */}
      <div class="hd-install">
        <code class="hd-install-cmd">{installCmd}</code>
        <p class="hd-install-hint">
          {isTemplate ? 'New project — scaffolds .soma/ with this template.' : 'Run in a Soma session to add to your project.'}
        </p>
      </div>

      {/* Template: What's Included */}
      {isTemplate && totalRequired > 0 && (
        <div class="hd-includes">
          <h2>What's Included</h2>
          <div class="hd-card-grid">
            {requiredProtocols.map(p => (
              <a href={`/hub/view?type=protocol&slug=${p.slug}`} class="hd-inc-card" key={p.slug}
                 style={`--card-accent: ${typeAccentColors.protocol}`}>
                <div class="hd-inc-top">
                  <span class="hd-inc-type">Protocol</span>
                  <span class="hd-inc-version">v{p.version}</span>
                </div>
                <h3 class="hd-inc-name">{p.name}</h3>
                <p class="hd-inc-desc">{p.breadcrumb || p.description}</p>
                {p.heatDefault && <span class="hd-inc-heat">{p.heatDefault}</span>}
              </a>
            ))}
            {requiredMuscles.map(m => (
              <a href={`/hub/view?type=muscle&slug=${m.slug}`} class="hd-inc-card" key={m.slug}
                 style={`--card-accent: ${typeAccentColors.muscle}`}>
                <div class="hd-inc-top">
                  <span class="hd-inc-type">Muscle</span>
                  <span class="hd-inc-version">v{m.version}</span>
                </div>
                <h3 class="hd-inc-name">{m.name}</h3>
                <p class="hd-inc-desc">{m.breadcrumb || m.description}</p>
              </a>
            ))}
            {requiredSkills.map(s => (
              <a href={`/hub/view?type=skill&slug=${s.slug}`} class="hd-inc-card" key={s.slug}
                 style={`--card-accent: ${typeAccentColors.skill}`}>
                <div class="hd-inc-top">
                  <span class="hd-inc-type">Skill</span>
                  <span class="hd-inc-version">v{s.version}</span>
                </div>
                <h3 class="hd-inc-name">{s.name}</h3>
                <p class="hd-inc-desc">{s.breadcrumb || s.description}</p>
              </a>
            ))}
          </div>
          {templateManifest?.requires?.protocols && (
            (() => {
              const missing = (templateManifest.requires.protocols || [])
                .filter(s => !allItems.find(i => i.slug === s && i.type === 'protocol'));
              return missing.length > 0 ? (
                <p class="hd-missing">⚠ Not found in hub: {missing.join(', ')}</p>
              ) : null;
            })()
          )}
        </div>
      )}

      {/* Body */}
      <div class="hd-body">
        <h2>Details</h2>
        <div class="hd-markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
      </div>

      {/* Related Items */}
      {relatedItems.length > 0 && (
        <div class="hd-related">
          <h2>Related</h2>
          <div class="hd-related-list">
            {relatedItems.map(r => (
              <a href={`/hub/view?type=${r.type}&slug=${r.slug}`} class="hd-related-item" key={`${r.type}-${r.slug}`}>
                <span class="hd-related-type">{typeLabels[r.type] || r.type}</span>
                <span class="hd-related-name">{r.name}</span>
                <span class="hd-related-desc">{(r.breadcrumb || r.description || '').slice(0, 80)}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Source */}
      <div class="hd-source">
        <a href={`https://github.com/meetsoma/community/tree/main/${type === 'template' ? 'templates' : type + 's'}/${slug}`}
           target="_blank" rel="noopener" class="hd-source-link">
          View source on GitHub →
        </a>
      </div>

      <style>{`
        .hub-detail { max-width: 100%; }
        .hub-detail-loading { display: flex; flex-direction: column; align-items: center; padding: 4rem 1rem; color: var(--text-muted, var(--ink-muted)); }
        .loading-pulse { width: 40px; height: 40px; border-radius: 50%; background: var(--accent-bright, var(--accent)); animation: pulse 1.5s ease-in-out infinite; margin-bottom: 1rem; }
        @keyframes pulse { 0%,100% { opacity: 0.3; transform: scale(0.95); } 50% { opacity: 0.7; transform: scale(1.05); } }
        .hub-detail-empty { text-align: center; padding: 4rem 1rem; color: var(--text-secondary, var(--ink-soft)); }
        .hub-detail-empty a { color: var(--accent-bright, var(--accent)); }

        .hd-header { margin-bottom: 2rem; }
        .hd-type-badge { display: inline-block; font-size: 0.75rem; font-family: var(--font-mono, monospace); color: var(--accent-bright, var(--accent)); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.75rem; }
        .hd-title { font-size: clamp(1.8rem, 5vw, 2.4rem); font-weight: 700; text-transform: capitalize; margin-bottom: 1rem; color: var(--text-primary, var(--ink)); }
        .hd-breadcrumb { color: var(--text-secondary, var(--ink-soft)); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1rem; }
        .hd-meta-row { display: flex; gap: 1rem; flex-wrap: wrap; }
        .hd-meta { font-family: var(--font-mono, monospace); font-size: 0.75rem; color: var(--text-muted, var(--ink-muted)); }
        .hd-heat { color: var(--promo, #f0c866); }
        .hd-tier { font-family: var(--font-mono, monospace); font-size: 0.7rem; font-weight: 600; text-transform: uppercase; padding: 2px 0.5rem; border-radius: 4px; }
        .tier-core { background: rgba(124, 178, 212, 0.2); color: var(--accent); }
        .tier-official { background: rgba(168, 232, 168, 0.2); color: rgb(168, 232, 168); }
        .tier-community { background: rgba(168, 232, 168, 0.15); color: rgb(140, 200, 140); }
        .hd-tag-row { display: flex; gap: 0.3rem; flex-wrap: wrap; margin-top: 0.5rem; }
        .hd-tag { font-family: var(--font-mono, monospace); font-size: 0.7rem; padding: 2px 0.5rem; border-radius: 4px; background: var(--surface-accent-soft); color: var(--accent); }

        .hd-stats { display: flex; flex-wrap: wrap; gap: 0.5rem; padding: 1rem 1.5rem; border-radius: 12px; border: 1px solid var(--border); background: var(--surface-card); margin-bottom: 1.5rem; }
        .hd-stat { display: flex; flex-direction: column; gap: 0.2rem; padding-right: 1.5rem; border-right: 1px solid var(--border); }
        .hd-stat:last-child { border-right: none; padding-right: 0; }
        .hd-stat-label { font-family: var(--font-mono, monospace); font-size: 0.65rem; color: var(--text-muted, var(--ink-muted)); text-transform: uppercase; letter-spacing: 0.06em; }
        .hd-stat-value { font-size: 0.9rem; font-weight: 600; color: var(--text-primary, var(--ink)); }

        .hd-install { padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border); background: var(--surface-card); margin-bottom: 1.5rem; }
        .hd-install-cmd { display: block; font-family: var(--font-mono, monospace); font-size: 0.9rem; padding: 1rem; border-radius: 8px; background: var(--bg-elev); color: var(--accent); margin-bottom: 0.5rem; }
        .hd-install-hint { font-size: 0.8rem; color: var(--text-muted, var(--ink-muted)); }

        .hd-includes { margin-bottom: 2rem; }
        .hd-includes h2 { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; color: var(--text-primary, var(--ink)); }
        .hd-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
        .hd-inc-card { display: flex; flex-direction: column; padding: 1rem 1.25rem; border-radius: 12px; border: 1px solid var(--border); border-left: 3px solid var(--card-accent, var(--border)); background: var(--surface-card); text-decoration: none; color: var(--text-primary, var(--ink)); transition: all 0.2s ease; }
        .hd-inc-card:hover { border-color: var(--border-accent, rgba(104, 152, 190, 0.3)); transform: translateY(-2px); box-shadow: 0 8px 24px var(--surface-accent-soft); }
        .hd-inc-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem; }
        .hd-inc-type { font-family: var(--font-mono, monospace); font-size: 0.65rem; color: var(--accent-bright, var(--accent)); text-transform: uppercase; letter-spacing: 0.06em; }
        .hd-inc-version { font-family: var(--font-mono, monospace); font-size: 0.65rem; color: var(--text-muted, var(--ink-muted)); }
        .hd-inc-name { font-size: 0.95rem; font-weight: 600; text-transform: capitalize; margin-bottom: 0.5rem; }
        .hd-inc-desc { font-size: 0.8rem; color: var(--text-secondary, var(--ink-soft)); line-height: 1.5; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .hd-inc-heat { font-size: 0.7rem; color: var(--promo, #f0c866); font-style: italic; margin-top: 0.5rem; }
        .hd-missing { font-size: 0.8rem; color: var(--promo, #f0c866); }

        .hd-body { padding: 2rem; border-radius: 12px; border: 1px solid var(--border); background: var(--surface-card); margin-bottom: 1.5rem; }
        .hd-body h2 { font-size: 1.25rem; font-weight: 600; margin: 1.5rem 0 1rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--text-primary, var(--ink)); }
        .hd-body h2:first-child { margin-top: 0; padding-top: 0; border-top: none; }
        .hd-body h3 { font-size: 1rem; font-weight: 600; margin: 1rem 0 0.5rem; }
        .hd-body p { color: var(--text-secondary, var(--ink-soft)); line-height: 1.6; margin-bottom: 1rem; font-size: 0.9rem; }
        .hd-body ul, .hd-body ol { color: var(--text-secondary, var(--ink-soft)); padding-left: 1.5rem; margin-bottom: 1rem; font-size: 0.9rem; }
        .hd-body li { margin-bottom: 0.3rem; line-height: 1.6; }
        .hd-body code { font-family: var(--font-mono, monospace); font-size: 0.8rem; padding: 1px 0.3rem; border-radius: 4px; background: var(--surface-accent-soft); color: var(--accent); }
        .hd-body pre { background: var(--bg-elev); padding: 1rem; border-radius: 8px; overflow-x: auto; margin-bottom: 1rem; font-size: 0.8rem; line-height: 1.5; }
        .hd-body pre code { background: none; padding: 0; color: var(--text-secondary, var(--ink-soft)); }
        .hd-body table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; font-size: 0.8rem; }
        .hd-body th { padding: 0.5rem; border-bottom: 2px solid var(--border); color: var(--text-primary, var(--ink)); text-align: left; font-weight: 600; }
        .hd-body td { padding: 0.5rem; border-bottom: 1px solid var(--border); color: var(--text-secondary, var(--ink-soft)); }
        .hd-body strong { color: var(--text-primary, var(--ink)); }
        .hd-body blockquote { border-left: 3px solid var(--accent); padding-left: 1rem; margin: 1rem 0; color: var(--text-secondary, var(--ink-soft)); font-style: italic; }

        .hd-related { margin-bottom: 2rem; }
        .hd-related h2 { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; color: var(--text-primary, var(--ink)); }
        .hd-related-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .hd-related-item { display: flex; align-items: baseline; gap: 1rem; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-card); text-decoration: none; color: var(--text-primary, var(--ink)); transition: all 0.15s; }
        .hd-related-item:hover { border-color: var(--border-accent, rgba(104, 152, 190, 0.3)); transform: translateX(4px); }
        .hd-related-type { font-family: var(--font-mono, monospace); font-size: 0.65rem; color: var(--accent); text-transform: uppercase; min-width: 4.5rem; }
        .hd-related-name { font-weight: 600; font-size: 0.9rem; min-width: 8rem; }
        .hd-related-desc { font-size: 0.8rem; color: var(--text-muted, var(--ink-muted)); flex: 1; }

        .hd-source { text-align: center; margin-bottom: 3rem; }
        .hd-source-link { font-size: 0.9rem; color: var(--accent); text-decoration: none; }
        .hd-source-link:hover { text-decoration: underline; }

        @media (max-width: 480px) { .hd-stats { flex-direction: column; } .hd-stat { border-right: none; } .hd-card-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
