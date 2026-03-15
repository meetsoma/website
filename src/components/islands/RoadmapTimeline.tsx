/**
 * RoadmapTimeline — Preact island that fetches /data/roadmap.json
 * and renders the shipped versions timeline.
 * 
 * Updated by soma-changelog-json.sh --sync during releases.
 */
import { useState, useEffect } from 'preact/hooks';

interface TimelineVersion {
  version: string;
  date: string;
  features: {
    added?: string[];
    changed?: string[];
  };
}

interface RoadmapData {
  generated: string;
  source: string;
  timeline: TimelineVersion[];
}

// Editorial labels — curated per release
const versionLabels: Record<string, string> = {
  '0.5.1': 'Router, Auto-Breathe & Dev Tools',
  '0.5.0': 'Stabilization & Prompt Intelligence',
  '0.4.0': 'AMPS & Distribution',
  '0.3.0': 'Session Intelligence',
  '0.2.0': 'The Engine',
  '0.1.0': 'First Breath',
};

// Easter eggs — secret items injected into specific versions
const easterEggs: Record<string, string[]> = {
  '0.5.1': ['SomaVerse — click any soma to find it'],
};

function stripMarkdownBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1');
}

export default function RoadmapTimeline() {
  const [data, setData] = useState<RoadmapData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/roadmap.json')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message));
  }, []);

  if (error) {
    return <div class="timeline-error"><p>Failed to load roadmap: {error}</p></div>;
  }

  if (!data) {
    return <div class="timeline-loading"><p>Loading roadmap...</p></div>;
  }

  const shipped = data.timeline.filter(v => v.version !== 'Unreleased');

  return (
    <div class="timeline">
      {shipped.map((release, i) => {
        const label = versionLabels[release.version] || `Version ${release.version}`;
        const eggs = easterEggs[release.version] || [];
        const items = [
          ...(release.features.added || []),
          ...(release.features.changed || []),
          ...eggs,
        ];
        const isLatest = i === 0;

        return (
          <div
            class={`timeline-entry ${isLatest ? 'latest' : ''}`}
            key={release.version}
            style={`animation-delay: ${i * 0.1}s`}
          >
            <div class="timeline-dot">{isLatest ? '◉' : '○'}</div>
            <div class="timeline-body">
              <div class="timeline-head">
                <span class="version">v{release.version}</span>
                {isLatest && <span class="latest-badge">latest</span>}
                <h3 class="label">{label}</h3>
                <span class="date">{release.date}</span>
              </div>
              <ul class="timeline-items">
                {items.map((item, j) => {
                  const isEgg = eggs.includes(item);
                  return (
                    <li key={j}
                      style={isEgg ? { cursor: 'pointer' } : undefined}
                      onClick={isEgg ? () => { window.location.href = '/verse/'; } : undefined}
                    >
                      {isEgg ? (
                        <>{item} <span style={{ opacity: 0.4, fontSize: '0.8em' }}>✦</span></>
                      ) : stripMarkdownBold(item)}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}
