/**
 * RoadmapTimeline — Preact island that fetches /data/roadmap.json
 * and renders the shipped versions timeline.
 * 
 * Updated by soma-changelog-json.sh --sync during releases.
 */
import { useState, useEffect } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

interface TimelineVersion {
  version: string;
  date: string;
  title?: string;
  features: {
    added?: string[];
    changed?: string[];
    fixed?: string[];
  };
}

interface RoadmapData {
  generated: string;
  source: string;
  timeline: TimelineVersion[];
}

// Editorial labels — curated per release
const versionLabels: Record<string, string> = {
  '0.6.3': 'Hub CLI, Drop-in Commands & Core Protocols',
  '0.6.2': 'Heat Detection, Migration & Community Sync',
  '0.6.1': 'npm Publish, Pi 0.61.1 & 27 Docs',
  '0.6.0': 'Open Install, Voice & 23 Docs',
  '0.5.2': 'Scratch, Scanning & Session Warnings',
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

/**
 * Render a small markdown subset to JSX.
 *
 * Supported:
 *   **bold**         → <strong>
 *   `code`           → <code>
 *   *italic*         → <em>          (only when not adjacent to a non-space, e.g. NOT inside `a*b`)
 *   [text](url)      → <a href="url">text</a>  (relative or absolute URLs)
 *
 * One-pass tokenizer to avoid wrong nesting on overlapping patterns. Each
 * pattern's match advances `i` past the consumed text. Escaped fall-through
 * lets unmatched `*` / `` ` `` / `[` render as literal characters.
 */
function renderMarkdown(text: string): ComponentChildren {
  const out: ComponentChildren[] = [];
  let i = 0;
  let buf = '';
  const flush = () => { if (buf) { out.push(buf); buf = ''; } };

  while (i < text.length) {
    const ch = text[i];

    // **bold**
    if (ch === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        flush();
        out.push(<strong key={`b-${i}`}>{renderMarkdown(text.slice(i + 2, end))}</strong>);
        i = end + 2;
        continue;
      }
    }

    // [text](url)
    if (ch === '[') {
      const closeBracket = text.indexOf('](', i + 1);
      if (closeBracket !== -1) {
        const closeParen = text.indexOf(')', closeBracket + 2);
        if (closeParen !== -1) {
          const linkText = text.slice(i + 1, closeBracket);
          const url = text.slice(closeBracket + 2, closeParen);
          flush();
          out.push(
            <a key={`l-${i}`} href={url}>
              {renderMarkdown(linkText)}
            </a>
          );
          i = closeParen + 1;
          continue;
        }
      }
    }

    // `code`
    if (ch === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        flush();
        out.push(<code key={`c-${i}`}>{text.slice(i + 1, end)}</code>);
        i = end + 1;
        continue;
      }
    }

    // *italic* — only single asterisks (we already matched ** above), and
    // require word-boundary on each side to avoid matching `a*b` math-like text.
    if (ch === '*') {
      // Find the closing single * (not part of **)
      let end = -1;
      for (let j = i + 1; j < text.length; j++) {
        if (text[j] === '*' && text[j + 1] !== '*' && text[j - 1] !== '*') {
          end = j;
          break;
        }
      }
      if (end !== -1) {
        flush();
        out.push(<em key={`i-${i}`}>{renderMarkdown(text.slice(i + 1, end))}</em>);
        i = end + 1;
        continue;
      }
    }

    buf += ch;
    i++;
  }
  flush();
  return out.length === 1 ? out[0] : out;
}

// Legacy alias — kept for any other call sites.
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
        // Prefer JSON title (source of truth) → fall back to TS map (legacy) → generic
        const label = release.title || versionLabels[release.version] || `Version ${release.version}`;
        const eggs = easterEggs[release.version] || [];
        const items = [
          ...(release.features.added || []),
          ...(release.features.changed || []),
          ...(release.features.fixed || []),
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
                      ) : renderMarkdown(item)}
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
