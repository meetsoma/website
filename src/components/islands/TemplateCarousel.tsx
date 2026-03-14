import { useRef, useEffect } from 'preact/hooks';
import '../../styles/carousel.css';

// SVG icons matching SomaIcons.astro
const icons: Record<string, string> = {
  sigma: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 4H6l6 8-6 8h12"/></svg>`,
  ruler: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></svg>`,
  layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22.54 12.43-10 4.56a2 2 0 0 1-1.66 0l-9.4-4.28"/><path d="m22.54 16.43-10 4.56a2 2 0 0 1-1.66 0l-9.4-4.28"/></svg>`,
  penLine: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>`,
  wrench: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  flask: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16.5h10"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>`,
};

interface Template {
  name: string;
  icon: string;
  title: string;
  voice: string;
  protocols: string[];
  muscles: string[];
  color: string;
}

const templates: Template[] = [
  {
    name: 'core', icon: 'sigma', title: 'The Foundation',
    voice: "I start simple. Breathe, remember, grow. Everything else builds on this.",
    protocols: ['breath-cycle', 'heat-tracking', 'pattern-evolution'], muscles: [],
    color: 'var(--accent-bright)',
  },
  {
    name: 'architect', icon: 'ruler', title: 'The Architect',
    voice: "I think in systems. Show me the whole before I touch a part.",
    protocols: ['quality-standards', 'pre-flight', 'pattern-evolution'],
    muscles: ['precision-edit', 'incremental-refactor'],
    color: 'var(--moon-bright)',
  },
  {
    name: 'fullstack', icon: 'layers', title: 'The Fullstack',
    voice: "Ship it, test it, document it. Every day. That's the job.",
    protocols: ['working-style', 'correction-capture', 'detection-triggers'],
    muscles: ['precision-edit', 'safe-file-ops', 'task-tooling'],
    color: 'var(--warm-bright)',
  },
  {
    name: 'writer', icon: 'penLine', title: 'The Writer',
    voice: "Every draft is a session. Every session teaches me your voice.",
    protocols: ['correction-capture', 'detection-triggers', 'frontmatter-standard'],
    muscles: ['precision-edit', 'doc-hygiene'],
    color: '#a8d4a0',
  },
  {
    name: 'devops', icon: 'wrench', title: 'The DevOps',
    voice: "If it can break in prod, it will. I verify before I ship.",
    protocols: ['tool-discipline', 'quality-standards', 'pre-flight'],
    muscles: ['safe-file-ops', 'task-tooling'],
    color: 'var(--warm-mid)',
  },
  {
    name: 'refactorer', icon: 'flask', title: 'The Refactorer',
    voice: "One file at a time. Backward-compatible. Verify at every step.",
    protocols: ['tool-discipline', 'quality-standards', 'pre-flight'],
    muscles: ['incremental-refactor', 'precision-edit', 'safe-file-ops'],
    color: '#b8a0d4',
  },
  {
    name: 'maintainer', icon: 'shield', title: 'The Maintainer',
    voice: "Code rots. Docs rot. Tests rot. I keep them alive.",
    protocols: ['quality-standards', 'frontmatter-standard', 'task-tracking'],
    muscles: ['test-hygiene', 'doc-hygiene', 'incremental-refactor'],
    color: 'var(--moon-bright)',
  },
];

// ── Physics constants ──
const IDLE_SPEED = 0.3;          // gentle drift when mouse is away
const MOUSE_ACCEL = 0.12;        // how fast velocity builds toward mouse target
const FRICTION = 0.94;           // velocity decay per frame when coasting
const SNAP_STIFFNESS = 0.06;     // spring pull toward nearest card center
const SNAP_DAMPING = 0.75;       // bounce damping (lower = more bounce)
const SNAP_THRESHOLD = 0.8;      // speed below which snap engages
const DEAD_ZONE = 0.08;          // fraction of track width considered "center" (no scroll)
const MAX_SPEED = 8;             // cap velocity

export default function TemplateCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    velocity: IDLE_SPEED,
    mouseIn: false,
    mouseX: 0.5,         // normalized 0-1 across track
    snapping: false,
    snapTarget: 0,
    lastTime: 0,
  });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let raf: number;

    // Get card centers relative to scroll position
    const getCardCenters = () => {
      const children = Array.from(track.children) as HTMLElement[];
      return children.map(c => c.offsetLeft + c.offsetWidth / 2);
    };

    // Find nearest card center to the viewport center
    const nearestSnapTarget = () => {
      const viewCenter = track.scrollLeft + track.offsetWidth / 2;
      const centers = getCardCenters();
      let nearest = centers[0];
      let minDist = Infinity;
      for (const c of centers) {
        const d = Math.abs(c - viewCenter);
        if (d < minDist) { minDist = d; nearest = c; }
      }
      return nearest - track.offsetWidth / 2;
    };

    const tick = () => {
      const s = stateRef.current;
      const now = performance.now();
      if (!s.lastTime) s.lastTime = now;
      const _dt = Math.min((now - s.lastTime) / 16.67, 2); // normalize to ~60fps, cap at 2x
      s.lastTime = now;

      const halfScroll = track.scrollWidth / 2;

      if (s.mouseIn) {
        // Mouse drives velocity based on offset from center
        const offset = (s.mouseX - 0.5) * 2; // -1 to 1
        const absOffset = Math.abs(offset);

        if (absOffset < DEAD_ZONE) {
          // In dead zone — snap to nearest card
          if (!s.snapping || Math.abs(s.velocity) > SNAP_THRESHOLD) {
            s.snapTarget = nearestSnapTarget();
            s.snapping = true;
          }
          const delta = s.snapTarget - track.scrollLeft;
          s.velocity = s.velocity * SNAP_DAMPING + delta * SNAP_STIFFNESS;
        } else {
          // Outside dead zone — accelerate in mouse direction
          s.snapping = false;
          // Cubic ramp — gentle near center, aggressive at edges
          const sign = offset > 0 ? 1 : -1;
          const curve = absOffset * absOffset; // quadratic ramp
          const targetSpeed = sign * curve * MAX_SPEED;
          s.velocity += (targetSpeed - s.velocity) * MOUSE_ACCEL * _dt;
        }
      } else {
        // Mouse away — coast with friction, then idle drift
        if (Math.abs(s.velocity) > IDLE_SPEED * 1.5) {
          s.velocity *= FRICTION;
          // Check for snap as we decelerate
          if (Math.abs(s.velocity) <= SNAP_THRESHOLD && !s.snapping) {
            s.snapTarget = nearestSnapTarget();
            s.snapping = true;
          }
        } else if (s.snapping) {
          // Snap spring
          const delta = s.snapTarget - track.scrollLeft;
          s.velocity = s.velocity * SNAP_DAMPING + delta * SNAP_STIFFNESS;
          if (Math.abs(delta) < 0.5 && Math.abs(s.velocity) < 0.1) {
            s.snapping = false;
            s.velocity = IDLE_SPEED;
          }
        } else {
          // Gentle idle drift
          s.velocity += (IDLE_SPEED - s.velocity) * 0.02;
        }
      }

      // Clamp velocity
      s.velocity = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, s.velocity));

      // Apply
      track.scrollLeft += s.velocity * _dt;

      // Infinite loop wrap
      if (track.scrollLeft >= halfScroll) {
        track.scrollLeft -= halfScroll;
        if (s.snapping) s.snapTarget -= halfScroll;
      } else if (track.scrollLeft < 0) {
        track.scrollLeft += halfScroll;
        if (s.snapping) s.snapTarget += halfScroll;
      }

      raf = requestAnimationFrame(tick);
    };

    // Mouse tracking
    const onMouseMove = (e: MouseEvent) => {
      const rect = track.getBoundingClientRect();
      stateRef.current.mouseX = (e.clientX - rect.left) / rect.width;
    };

    const onMouseEnter = (e: MouseEvent) => {
      stateRef.current.mouseIn = true;
      stateRef.current.snapping = false;
      const rect = track.getBoundingClientRect();
      stateRef.current.mouseX = (e.clientX - rect.left) / rect.width;
    };

    const onMouseLeave = () => {
      stateRef.current.mouseIn = false;
      stateRef.current.snapping = false;
    };

    track.addEventListener('mousemove', onMouseMove);
    track.addEventListener('mouseenter', onMouseEnter);
    track.addEventListener('mouseleave', onMouseLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      track.removeEventListener('mousemove', onMouseMove);
      track.removeEventListener('mouseenter', onMouseEnter);
      track.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  // Duplicate for infinite loop
  const allCards = [...templates, ...templates];

  return (
    <div class="carousel">
      <div class="carousel-track" ref={trackRef}>
        {allCards.map((t, i) => (
          <div
            class="template-card"
            style={{ '--card-accent': t.color } as any}
            key={`${t.name}-${i}`}
          >
            <div class="card-icon" dangerouslySetInnerHTML={{ __html: icons[t.icon] || '' }} />
            <h3 class="card-title">{t.title}</h3>
            <p class="card-voice">"{t.voice}"</p>
            <div class="card-stack">
              {t.protocols.map(p => (
                <span class="badge badge-protocol" key={p}>
                  <span class="badge-dot" />
                  {p}
                </span>
              ))}
              {t.muscles.map(m => (
                <span class="badge badge-muscle" key={m}>
                  <span class="badge-dot" />
                  {m}
                </span>
              ))}
            </div>
            <div class="card-install">
              <code>soma init --template {t.name}</code>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
