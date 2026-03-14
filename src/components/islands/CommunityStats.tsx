/**
 * CommunityStats — fetches hub-index.json for live counts.
 * Shows protocol/muscle/template counts with top slugs.
 * Styles are inline because Astro scoped CSS won't reach island DOM.
 */
import { useState, useEffect } from 'preact/hooks';

const HUB_INDEX_URL = 'https://raw.githubusercontent.com/meetsoma/community/main/hub-index.json';

interface HubItem {
  slug: string;
  type: string;
}

interface StatGroup {
  type: string;
  label: string;
  count: number;
  slugs: string[];
}

// Fallback data (build-time snapshot)
const FALLBACK: StatGroup[] = [
  { type: 'protocol', label: 'Protocols', count: 15, slugs: ['breath-cycle', 'workflow', 'correction-capture', 'detection-triggers', 'task-tracking'] },
  { type: 'muscle', label: 'Muscles', count: 8, slugs: ['doc-hygiene', 'icon-audit', 'micro-exhale', 'incremental-refactor'] },
  { type: 'template', label: 'Templates', count: 7, slugs: ['architect', 'core', 'devops', 'fullstack', 'writer'] },
];

export default function CommunityStats() {
  const [stats, setStats] = useState<StatGroup[]>(FALLBACK);

  useEffect(() => {
    fetch(HUB_INDEX_URL)
      .then(r => r.json())
      .then(data => {
        if (!data.items) return;
        const groups = new Map<string, { slugs: string[] }>();
        for (const item of data.items as HubItem[]) {
          const g = groups.get(item.type) || { slugs: [] };
          g.slugs.push(item.slug);
          groups.set(item.type, g);
        }

        const order = ['protocol', 'muscle', 'template'];
        const labels: Record<string, string> = { protocol: 'Protocols', muscle: 'Muscles', template: 'Templates' };

        const result: StatGroup[] = order
          .filter(t => groups.has(t))
          .map(t => ({
            type: t,
            label: labels[t] || t,
            count: groups.get(t)!.slugs.length,
            slugs: groups.get(t)!.slugs.slice(0, 5),
          }));

        if (result.length > 0) setStats(result);
      })
      .catch(() => { /* keep fallback */ });
  }, []);

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 'var(--space-lg, 20px)',
    marginBottom: 'var(--space-xl, 28px)',
  };

  const cardStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 'var(--space-sm, 6px)',
    padding: 'var(--space-xl, 28px) var(--space-lg, 20px)',
    borderRadius: 'var(--radius-lg, 12px)',
    border: '1px solid var(--border-subtle, rgba(132,148,170,0.12))',
    background: 'var(--surface-card, rgba(11,16,24,0.7))',
    textAlign: 'center' as const,
  };

  const numberStyle = {
    fontFamily: 'var(--font-display, system-ui)',
    fontSize: 'var(--text-3xl, 2rem)',
    fontWeight: 700,
    color: 'var(--accent-bright, #6898be)',
    lineHeight: 'var(--leading-none, 1)',
  };

  const labelStyle = {
    fontFamily: 'var(--font-display, system-ui)',
    fontSize: 'var(--body-text, 1rem)',
    fontWeight: 600,
    color: 'var(--text-primary, #e4eaf4)',
  };

  const detailStyle = {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 'var(--label-text, 0.75rem)',
    color: 'var(--text-muted, #566478)',
    lineHeight: 'var(--leading-normal, 1.5)',
  };

  return (
    <div style={gridStyle}>
      {stats.map(s => (
        <div key={s.type} style={cardStyle}>
          <span style={numberStyle}>{s.count}</span>
          <span style={labelStyle}>{s.label}</span>
          <span style={detailStyle}>
            {s.slugs.join(' · ')}
            {s.count > s.slugs.length && ` · and ${s.count - s.slugs.length} more`}
          </span>
        </div>
      ))}
    </div>
  );
}
