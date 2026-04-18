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

// Editorial labels — curated per release. Falls back to "Version X.Y.Z".
const versionLabels: Record<string, string> = {
  // v0.20.x — Team Soma
  '0.20.1.1': 'Role Expansion & Curator Polish',
  '0.20.1':   'Curator Loop & 3 Roles',
  '0.20.0.1': 'Delegation Hardening',
  '0.20.0':   'Delegation MVP & Sandbox',
  // v0.12.x — Somaverse Edition
  '0.12.4':   'Pi 0.67.68 & Release Parity',
  '0.12.3':   'Shipping Integrity',
  '0.12.2':   'Model Switching & Opus 4.7',
  '0.12.1':   'Patch',
  '0.12.0':   'Somaverse Edition',
  // v0.11.x — Foundations
  '0.11.4':   'Doctor & Migration',
  '0.11.3':   'Patch',
  '0.11.2':   'Audit & Hygiene',
  '0.11.1':   'Patch',
  '0.11.0':   'AMPS Spine',
  // v0.10.x
  '0.10.0':   'Map & Phase Cycle',
  // v0.9.x and earlier (already curated)
  '0.9.0':    'Skills & Discovery',
  '0.8.1':    'Patch',
  '0.8.0':    'Inbox & Status Cycle',
  '0.7.1':    'Patch',
  '0.7.0':    'Body Chain & Identity',
  '0.6.7':    'Polish',
  '0.6.6':    'Polish',
  '0.6.5':    'CLI UX & Subcommand Tree',
  '0.6.4':    'Migration & Settings',
  '0.6.3':    'Hub CLI, Drop-in Commands & Core Protocols',
  '0.6.2':    'Heat Detection, Migration & Community Sync',
  '0.6.1':    'npm Publish, Pi 0.61.1 & 27 Docs',
  '0.6.0':    'Open Install, Voice & 23 Docs',
  '0.5.2':    'Scratch, Scanning & Session Warnings',
  '0.5.1':    'Router, Auto-Breathe & Dev Tools',
  '0.5.0':    'Stabilization & Prompt Intelligence',
  '0.4.0':    'AMPS & Distribution',
  '0.3.0':    'Session Intelligence',
  '0.2.0':    'The Engine',
  '0.1.0':    'First Breath',
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

  const shipped = data.timeline.filter(v => v.version !== 'Unreleased' && v.version !== 'Next');

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
            <div class="timeline-dot" />
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
