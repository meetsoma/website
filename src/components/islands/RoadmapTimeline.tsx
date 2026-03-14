/**
 * RoadmapTimeline — Preact island that fetches /data/roadmap.json
 * and renders the shipped versions timeline.
 * 
 * Replaces the hardcoded `timeline` array in roadmap/index.astro.
 * "What's Next" section stays manual/editorial in Astro.
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

// Editorial labels — not in the data, curated per release
const versionLabels: Record<string, string> = {
  '0.5.0': 'Stabilization & Prompt Intelligence',
  '0.4.0': 'AMPS & Distribution',
  '0.3.0': 'Session Intelligence',
  '0.2.0': 'The Engine',
  '0.1.0': 'First Breath',
};

function stripMarkdownBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1');
}

function renderItem(text: string): any {
  const clean = stripMarkdownBold(text);
  // Split on em dashes to show the title part more prominently
  const dashIdx = clean.indexOf(' — ');
  if (dashIdx > 0) {
    return clean; // Let CSS handle it — just render as text
  }
  return clean;
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

  // Filter out Unreleased — roadmap shows shipped only
  const shipped = data.timeline.filter(v => v.version !== 'Unreleased');

  return (
    <div class="timeline">
      {shipped.map((release, i) => {
        const label = versionLabels[release.version] || `Version ${release.version}`;
        // Combine added + changed into a single items list for display
        const items = [
          ...(release.features.added || []),
          ...(release.features.changed || []),
        ];

        return (
          <div class="timeline-entry" key={release.version} style={`animation-delay: ${i * 0.1}s`}>
            <div class="timeline-dot">◉</div>
            <div class="timeline-body">
              <div class="timeline-head">
                <span class="version">v{release.version}</span>
                <h3 class="label">{label}</h3>
                <span class="date">{release.date}</span>
              </div>
              <ul class="timeline-items">
                {items.map((item, j) => (
                  <li key={j}>{renderItem(item)}</li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}
