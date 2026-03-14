/**
 * ChangelogIsland — Preact island that fetches /data/changelog.json
 * and renders a full changelog with Added/Changed/Fixed sections.
 * 
 * No Astro rebuild needed — JSON is served as a static file.
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
  added: { label: 'Added', color: 'var(--accent-green, #a8e8a8)' },
  changed: { label: 'Changed', color: 'var(--accent-bright, #7cb2d4)' },
  fixed: { label: 'Fixed', color: 'var(--accent-warm, #e8a87c)' },
  born: { label: 'Born', color: 'var(--accent-bright, #7cb2d4)' },
};

function stripMarkdownBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1');
}

function renderEntry(text: string): any {
  // Strip bold markers, render backtick code spans
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
    return (
      <div class="changelog-error">
        <p>Failed to load changelog: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div class="changelog-loading">
        <p>Loading changelog...</p>
      </div>
    );
  }

  return (
    <div class="changelog">
      {data.versions.map((version, vi) => (
        <div class="changelog-version" key={version.version} style={`animation-delay: ${vi * 0.08}s`}>
          <div class="version-header">
            <span class="version-tag">
              {version.version === 'Unreleased' ? '🔮 Unreleased' : `v${version.version}`}
            </span>
            {version.date && <span class="version-date">{version.date}</span>}
          </div>

          {Object.entries(version.entries).map(([section, items]) => {
            const config = sectionConfig[section] || { label: section, color: 'var(--text-muted)' };
            return (
              <div class="changelog-section" key={section}>
                <h3 class="section-label" style={`color: ${config.color}`}>
                  {config.label}
                </h3>
                <ul class="section-items">
                  {(items as string[]).map((item, i) => (
                    <li key={i}>{renderEntry(item)}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ))}

      <p class="changelog-meta">
        Generated from {data.source} · Last updated {new Date(data.generated).toLocaleDateString()}
      </p>
    </div>
  );
}
