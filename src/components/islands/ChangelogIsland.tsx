/**
 * ChangelogIsland — Preact island that fetches /data/changelog.json
 * and renders a full changelog with version cards.
 * 
 * Updated by soma-changelog-json.sh --sync during releases.
 */
import { useState, useEffect } from 'preact/hooks';

interface ChangelogVersion {
  version: string;
  date: string;
  entries: Record<string, string[]>;
}

interface ChangelogData {
  generated: string;
  source: string;
  versions: ChangelogVersion[];
}

const sectionConfig: Record<string, { label: string; color: string }> = {
  added: { label: 'Added', color: '#a8e8a8' },
  changed: { label: 'Changed', color: 'var(--accent-bright)' },
  fixed: { label: 'Fixed', color: 'var(--warm-bright)' },
  born: { label: 'Born', color: 'var(--accent-bright)' },
};

// Editorial labels per version
const versionLabels: Record<string, string> = {
  '0.5.1': 'AMPS Distribution & Templates',
  '0.5.0': 'Stabilization & Prompt Intelligence',
  '0.4.0': 'AMPS & Distribution',
  '0.3.0': 'Session Intelligence',
  '0.2.0': 'The Engine',
  '0.1.0': 'First Breath',
};

function stripMarkdownBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1');
}

function renderEntry(text: string): any {
  const clean = stripMarkdownBold(text);
  const parts = clean.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export default function ChangelogIsland() {
  const [data, setData] = useState<ChangelogData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/changelog.json')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message));
  }, []);

  if (error) {
    return <div class="changelog-error"><p>Failed to load changelog: {error}</p></div>;
  }

  if (!data) {
    return <div class="changelog-loading"><p>Loading changelog...</p></div>;
  }

  return (
    <div class="changelog">
      {data.versions.map((version, vi) => {
        const isLatest = vi === 0 && version.version !== 'Unreleased';
        const isUnreleased = version.version === 'Unreleased';
        const label = versionLabels[version.version] || '';
        const sections = Object.entries(version.entries);
        const totalEntries = sections.reduce((sum, [, items]) => sum + items.length, 0);

        return (
          <div class="changelog-version" key={version.version} style={`animation-delay: ${vi * 0.08}s`}>
            <div class="version-header">
              <span class="version-tag">
                {isUnreleased ? '🔮 Unreleased' : `v${version.version}`}
              </span>
              {label && <span class="version-label">{label}</span>}
              {isLatest && <span class="version-latest">latest</span>}
              {version.date && <span class="version-date">{version.date}</span>}
            </div>

            {/* Stats bar */}
            <div class="version-stats">
              {sections.map(([section, items]) => {
                const config = sectionConfig[section] || { label: section, color: 'var(--text-muted)' };
                return (
                  <div class="stat" key={section}>
                    <span class="stat-dot" style={`background: ${config.color}`} />
                    <span class="stat-count">{items.length}</span>
                    <span class="stat-label">{config.label.toLowerCase()}</span>
                  </div>
                );
              })}
            </div>

            {sections.map(([section, items]) => {
              const config = sectionConfig[section] || { label: section, color: 'var(--text-muted)' };
              return (
                <div class="changelog-section" key={section}>
                  <h3 class="section-label" style={`color: ${config.color}`}>
                    <span class="section-dot" style={`background: ${config.color}`} />
                    {config.label}
                  </h3>
                  <ul class={`section-items section-${section}`}>
                    {(items as string[]).map((item, i) => (
                      <li key={i}>{renderEntry(item)}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        );
      })}

      <p class="changelog-meta">
        Generated from {data.source} · {new Date(data.generated).toLocaleDateString()}
      </p>
    </div>
  );
}
