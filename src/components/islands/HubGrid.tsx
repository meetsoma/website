/**
 * HubGrid — Preact island that renders filtered hub cards.
 * Receives all items as props (static data from Astro build),
 * filters reactively based on nanostore state.
 */
import { useStore } from '@nanostores/preact';
import { $typeFilter, $tierFilter, $searchQuery, $tagFilter } from '../../stores/hub';
import { iconSvg } from '../../lib/icons';

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
  appliesTo?: string[];
}

interface Props {
  items: HubItem[];
}

const typeConfig: Record<string, { icon: string; color: string; label: string; sublabel: string }> = {
  protocol: {
    icon: 'protocols',
    color: 'rgba(168, 232, 168, 0.25)',
    label: 'Protocols',
    sublabel: 'Behavioral rules — how your agent acts. Skip them and things break.',
  },
  muscle: {
    icon: 'muscles',
    color: 'rgba(232, 168, 124, 0.25)',
    label: 'Muscles',
    sublabel: 'Learned patterns — reusable workflows that improve through use.',
  },
  skill: {
    icon: 'skills',
    color: 'rgba(124, 178, 212, 0.25)',
    label: 'Skills',
    sublabel: 'Domain knowledge — plug-and-play expertise from any agent framework.',
  },
  template: {
    icon: 'templates',
    color: 'rgba(190, 152, 232, 0.25)',
    label: 'Templates',
    sublabel: 'Agent bundles — identity, settings, and dependencies in one install.',
  },
  script: {
    icon: 'scripts',
    color: 'rgba(200, 200, 120, 0.25)',
    label: 'Scripts',
    sublabel: 'Automation — executable tools that enforce what protocols describe.',
  },
};

export default function HubGrid({ items }: Props) {
  const typeFilter = useStore($typeFilter);
  const tierFilter = useStore($tierFilter);
  const searchQuery = useStore($searchQuery);
  const tagFilter = useStore($tagFilter);

  // Filter items
  const filtered = items.filter(item => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (tierFilter !== 'all' && item.tier !== tierFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const searchable = [
        item.name,
        item.description,
        item.breadcrumb || '',
        ...(item.tags || []),
        ...(item.topic || []),
      ].join(' ').toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    if (tagFilter.length > 0) {
      const itemTags = [...(item.tags || []), ...(item.topic || [])];
      if (!tagFilter.some(t => itemTags.includes(t))) return false;
    }
    return true;
  });

  // Group by type
  const grouped: Record<string, HubItem[]> = {};
  for (const item of filtered) {
    if (!grouped[item.type]) grouped[item.type] = [];
    grouped[item.type].push(item);
  }

  const typeOrder = ['protocol', 'muscle', 'skill', 'template', 'script'];
  const sortedTypes = typeOrder.filter(t => grouped[t]?.length);

  if (filtered.length === 0) {
    return (
      <div class="hub-empty">
        <p>No items match your filters.</p>
      </div>
    );
  }

  return (
    <div class="hub-grid-container">
      {sortedTypes.map(type => {
        const config = typeConfig[type] || typeConfig.protocol;
        const typeItems = grouped[type];
        return (
          <section class="hub-section" key={type}>
            <div class="section-header">
              <span class="section-glyph" dangerouslySetInnerHTML={{ __html: iconSvg[config.icon] || '' }} />
              <div>
                <h2 class="section-title">{config.label}</h2>
                <p class="section-desc">{config.sublabel}</p>
              </div>
              <span class="section-count">{typeItems.length}</span>
            </div>
            <div class="card-grid">
              {typeItems.map(item => (
                <a
                  href={`/hub/${item.type}/${item.slug}`}
                  class="hub-card"
                  key={`${item.type}-${item.slug}`}
                  style={`--card-accent: ${config.color}`}
                >
                  <div class="card-top">
                    <h3 class="card-name">{item.name}</h3>
                    {item.version && <span class="card-version">v{item.version}</span>}
                  </div>
                  <p class="card-desc">{item.breadcrumb || item.description}</p>
                  <div class="card-meta">
                    {item.tier && <span class={`card-tier tier-${item.tier}`}>{item.tier}</span>}
                    {item.heatDefault && <span class="card-heat">{item.heatDefault}</span>}
                  </div>
                  {item.tags && item.tags.length > 0 && (
                    <div class="card-tags">
                      {item.tags.slice(0, 3).map(tag => (
                        <span class="card-tag" key={tag}>{tag}</span>
                      ))}
                    </div>
                  )}
                  <span class="card-author">{item.author}</span>
                </a>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
