/**
 * OrbitalPhysics — Interactive orbital diagram with gravitational tethering.
 * 
 * Nodes orbit Soma at center. Drag a node away → it stretches a tether line,
 * a floating info card pops on the smart side. Release → springs back with bounce.
 * Mouse proximity causes subtle push (nodes feel alive).
 */
import { useRef, useEffect, useState, useCallback } from 'preact/hooks';
import '../../styles/orbital-physics.css';

// ── Icon SVG paths (matching SomaIcons.astro) ──
const ICON_SVGS: Record<string, string> = {
  automations: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  muscles: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  protocols: '<path d="m10 16 1.5 1.5"/><path d="m14 8-1.5-1.5"/><path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"/><path d="m16.5 10.5 1 1"/><path d="m17 6-2.891-2.891"/><path d="M2 15c6.667-6 13.333 0 20-6"/><path d="m20 9 .891.891"/><path d="M3.109 14.109 4 15"/><path d="m6.5 12.5 1 1"/><path d="m7 18 2.891 2.891"/><path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993"/>',
  scripts: '<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>',
  extensions: '<path d="M12 22v-5"/><path d="M15 8V2"/><path d="M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z"/><path d="M9 8V2"/>',
  skills: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  you: '<circle cx="12" cy="8" r="4" stroke-width="1.5"/><path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke-width="1.5" stroke-linecap="round"/>',
  pi: '<path d="M6 7h12" stroke-width="2" stroke-linecap="round"/><path d="M9 7v10" stroke-width="1.8" stroke-linecap="round"/><path d="M15 7v10" stroke-width="1.8" stroke-linecap="round"/><path d="M6 7c0-1.7 1.3-3 3-3h6c1.7 0 3 1.3 3 3" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>',
  memory: '<circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"/>',
};

// ── Node definitions ──
interface NodeDef {
  id: string;
  label: string;
  icon: string;
  ring: 'inner' | 'outer';
  homeAngle: number; // degrees
  orbitPct: number;   // % of half-size for orbit radius
  color: 'accent' | 'warm' | 'muted';
  sublabel?: string;
  description: string;
  details: string[];
  href: string;
}

const NODES: NodeDef[] = [
  // Inner ring
  { id: 'you', label: 'You', icon: 'you', ring: 'inner', homeAngle: 225, orbitPct: 0.39,
    color: 'accent', sublabel: 'the human',
    description: 'Soma learns from you. Your corrections become muscles, your preferences become protocols.',
    details: ['Corrections → muscles', 'Preferences → protocols', 'Context carries across sessions'],
    href: '#' },
  { id: 'pi', label: 'Pi', icon: 'pi', ring: 'inner', homeAngle: 315, orbitPct: 0.39,
    color: 'accent', sublabel: 'runtime',
    description: 'The engine underneath. Pi provides the extension system, tool access, and agent lifecycle.',
    details: ['27 extension events', 'TypeScript extensions', 'Tool & permission system'],
    href: '#extensions' },
  { id: 'memory', label: 'Memory', icon: 'memory', ring: 'inner', homeAngle: 90, orbitPct: 0.39,
    color: 'warm', sublabel: '.soma/',
    description: 'Everything Soma learns persists in .soma/ — sessions, preloads, identity, and state.',
    details: ['Session logs', 'Preload continuations', 'Identity & state.json'],
    href: '#' },

  // Outer ring — AMPS
  { id: 'automations', label: 'Automations', icon: 'automations', ring: 'outer', homeAngle: 0, orbitPct: 0.76,
    color: 'accent',
    description: 'Triggered action sequences — session start, post-commit, pre-deploy. Procedural flows that fire automatically.',
    details: ['Session start sequences', 'Post-commit verification', 'Pre-deploy checklists', 'Heat-tracked loading'],
    href: '#automations' },
  { id: 'muscles', label: 'Muscles', icon: 'muscles', ring: 'outer', homeAngle: 60, orbitPct: 0.76,
    color: 'accent',
    description: 'Learned patterns built from experience. Muscle memory that grows stronger with use.',
    details: ['Encode repeated workflows', 'Digest blocks for efficient loading', 'Heat up with use, fade when idle', 'Community-shareable'],
    href: '#muscles' },
  { id: 'protocols', label: 'Protocols', icon: 'protocols', ring: 'outer', homeAngle: 120, orbitPct: 0.76,
    color: 'accent',
    description: 'Behavioral rules — not how to do a task, but how to be. Drop one in and the agent adapts.',
    details: ['Adaptive behavioral rules', 'Heat-based loading priority', 'TL;DR for token efficiency', 'Fork & customize'],
    href: '#protocols' },
  { id: 'scripts', label: 'Scripts', icon: 'scripts', ring: 'outer', homeAngle: 180, orbitPct: 0.76,
    color: 'accent',
    description: 'Reusable bash tools the agent builds for itself and for you. Health checks, ship cycles, verification.',
    details: ['Health checks & verification', 'Ship cycles (test→commit→push)', 'Content auditing', 'Auto-discovered at boot'],
    href: '#scripts' },
  { id: 'extensions', label: 'Extensions', icon: 'extensions', ring: 'outer', homeAngle: 240, orbitPct: 0.76,
    color: 'muted',
    description: 'TypeScript hooks into Pi\'s lifecycle. Boot sequences, custom UI, slash commands, background processes.',
    details: ['Boot sequences & identity', 'Custom headers & statuslines', 'Slash commands', 'Context monitoring'],
    href: '#extensions' },
  { id: 'skills', label: 'Skills', icon: 'skills', ring: 'outer', homeAngle: 300, orbitPct: 0.76,
    color: 'muted',
    description: 'Markdown files that give the agent domain expertise. Task-matched instructions loaded on demand.',
    details: ['Domain-specific instructions', 'Tool usage patterns', 'Decision frameworks', 'Auto-matched to tasks'],
    href: '#skills' },
];

// ── Physics constants ──
const SPRING_K_BASE = 0.008;   // base spring (gentle near home)
const SPRING_K_QUAD = 0.00006; // quadratic spring — lower = further pull before snap
const DAMPING = 0.85;          // velocity decay (lower = less bounce)
const MOUSE_GRAVITY = 0.06;           // passive mouse pull on nearby nodes
const MOUSE_GRAVITY_GRABBED = 0.35;   // strong pull when grabbed
const MOUSE_GRAVITY_RADIUS = 60;      // px — tight attraction range for passive
const PULL_THRESHOLD = 35;    // px displacement before card shows
const TETHER_OPACITY_MAX = 0.4;
const SNAP_DISTANCE = 360;    // px — beyond this, soma wins the tug-of-war

// ── Component ──
export default function OrbitalPhysics() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [cardSide, setCardSide] = useState<{ x: number; y: number; side: 'left' | 'right'; vSide: 'top' | 'bottom' } | null>(null);

  // Physics state stored in refs to avoid re-renders
  const physicsRef = useRef<{
    nodes: Map<string, {
      x: number; y: number; vx: number; vy: number;
      homeX: number; homeY: number;
      displacement: number;
    }>;
    mouseX: number; mouseY: number; mouseIn: boolean;
    draggingId: string | null;
    containerRect: DOMRect | null;
    centerX: number; centerY: number;
    halfSize: number;
    raf: number;
  }>({
    nodes: new Map(),
    mouseX: -1000, mouseY: -1000, mouseIn: false,
    draggingId: null,
    containerRect: null,
    centerX: 0, centerY: 0,
    halfSize: 0,
    raf: 0,
  });

  const nodeElsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const tetherElsRef = useRef<Map<string, SVGLineElement>>(new Map());
  const cardElRef = useRef<HTMLDivElement>(null);

  // Calculate home positions from container size
  const calcHomePositions = useCallback(() => {
    const p = physicsRef.current;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    p.containerRect = rect;
    p.centerX = rect.width / 2;
    p.centerY = rect.height / 2;
    p.halfSize = Math.min(rect.width, rect.height) / 2;

    for (const def of NODES) {
      const angleRad = (def.homeAngle * Math.PI) / 180;
      const r = def.orbitPct * p.halfSize;
      const homeX = p.centerX + Math.cos(angleRad) * r;
      const homeY = p.centerY + Math.sin(angleRad) * r;

      const existing = p.nodes.get(def.id);
      if (existing) {
        existing.homeX = homeX;
        existing.homeY = homeY;
        // If not dragging, snap to new home
        if (!existing.dragging) {
          existing.x = homeX;
          existing.y = homeY;
        }
      } else {
        p.nodes.set(def.id, {
          x: homeX, y: homeY,
          vx: 0, vy: 0,
          homeX, homeY,
          displacement: 0,
        });
      }
    }
  }, []);

  // Physics tick
  useEffect(() => {
    calcHomePositions();
    window.addEventListener('resize', calcHomePositions);

    const p = physicsRef.current;

    const tick = () => {
      let showCardFor: string | null = null;

      for (const [id, node] of p.nodes) {
        const isGrabbed = id === p.draggingId;

        // ── 1. Spring force toward home (progressive — gets stronger with distance) ──
        const dx = node.homeX - node.x;
        const dy = node.homeY - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Linear + quadratic spring: gentle near home, overpowering at distance
        const springForce = SPRING_K_BASE + SPRING_K_QUAD * dist;
        node.vx += dx * springForce;
        node.vy += dy * springForce;

        // ── 2. Mouse gravity (attracts nodes toward cursor) ──
        if (p.mouseIn) {
          const mdx = p.mouseX - node.x;
          const mdy = p.mouseY - node.y;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);

          if (isGrabbed) {
            // Strong pull toward mouse when grabbed
            // But only if we haven't exceeded snap distance (soma wins)
            const grabStrength = dist < SNAP_DISTANCE ? MOUSE_GRAVITY_GRABBED : MOUSE_GRAVITY_GRABBED * 0.15;
            if (mDist > 1) {
              node.vx += mdx * grabStrength;
              node.vy += mdy * grabStrength;
            }
          } else if (!p.draggingId && mDist < MOUSE_GRAVITY_RADIUS && mDist > 1) {
            // Passive gravity — only when nothing is grabbed
            const proximity = 1 - mDist / MOUSE_GRAVITY_RADIUS;
            const pull = MOUSE_GRAVITY * proximity * proximity;
            node.vx += (mdx / mDist) * pull * mDist;
            node.vy += (mdy / mDist) * pull * mDist;
          }
        }

        // ── 3. Damping ──
        node.vx *= DAMPING;
        node.vy *= DAMPING;

        // ── 4. Apply velocity ──
        node.x += node.vx;
        node.y += node.vy;

        // ── 5. Calculate displacement from home ──
        const ddx = node.x - node.homeX;
        const ddy = node.y - node.homeY;
        node.displacement = Math.sqrt(ddx * ddx + ddy * ddy);

        // Track which grabbed node should show a card
        if (isGrabbed && node.displacement > PULL_THRESHOLD) {
          showCardFor = id;
        }

        // ── 6. Update DOM ──
        const el = nodeElsRef.current.get(id);
        if (el) {
          el.style.transform = `translate(${node.x}px, ${node.y}px) translate(-50%, -50%)`;
        }

        // Update tether line
        const tether = tetherElsRef.current.get(id);
        if (tether) {
          if (node.displacement > 8) {
            const alpha = Math.min(TETHER_OPACITY_MAX, node.displacement / 300 * TETHER_OPACITY_MAX);
            tether.setAttribute('x1', String(p.centerX));
            tether.setAttribute('y1', String(p.centerY));
            tether.setAttribute('x2', String(node.x));
            tether.setAttribute('y2', String(node.y));
            tether.style.opacity = String(alpha);
            tether.style.display = '';
          } else {
            tether.style.display = 'none';
          }
        }
      }

      // Update floating card position
      if (showCardFor) {
        const node = p.nodes.get(showCardFor);
        if (node) {
          const side: 'left' | 'right' = node.x > p.centerX ? 'right' : 'left';
          const vSide: 'top' | 'bottom' = node.y > p.centerY ? 'bottom' : 'top';
          setCardSide({ x: node.x, y: node.y, side, vSide });
        }
      } else if (p.draggingId) {
        // Still grabbed but not displaced enough — hide card
        setCardSide(null);
      }

      p.raf = requestAnimationFrame(tick);
    };

    p.raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(p.raf);
      window.removeEventListener('resize', calcHomePositions);
    };
  }, [calcHomePositions]);

  // Mouse handlers on container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const p = physicsRef.current;

    const getPos = (e: MouseEvent | Touch) => {
      const rect = container.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onMouseMove = (e: MouseEvent) => {
      const pos = getPos(e);
      p.mouseX = pos.x;
      p.mouseY = pos.y;

      // Hover detection for cursor (always, even while grabbing)
      if (!p.draggingId) {
        let found: string | null = null;
        for (const [id, node] of p.nodes) {
          const dx = pos.x - node.x;
          const dy = pos.y - node.y;
          if (dx * dx + dy * dy < 40 * 40) {
            found = id;
            break;
          }
        }
        setHoveredNode(found);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      const pos = getPos(e);
      // Find closest node within hit radius
      let closest: string | null = null;
      let closestDist = 40; // hit radius
      for (const [id, node] of p.nodes) {
        const dx = pos.x - node.x;
        const dy = pos.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
          closestDist = dist;
          closest = id;
        }
      }
      if (closest) {
        e.preventDefault();
        // Just mark as grabbed — physics handles the rest
        p.draggingId = closest;
        setActiveNode(closest);
        setHoveredNode(null);
      }
    };

    const onMouseUp = () => {
      if (p.draggingId) {
        p.draggingId = null;
        setActiveNode(null);
        setCardSide(null);
      }
    };

    const onMouseEnter = () => { p.mouseIn = true; };
    const onMouseLeave = () => {
      p.mouseIn = false;
      p.mouseX = -1000;
      p.mouseY = -1000;
      setHoveredNode(null);
      onMouseUp();
    };

    // Touch support
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const pos = getPos(touch);
      p.mouseX = pos.x;
      p.mouseY = pos.y;
      p.mouseIn = true;

      let closest: string | null = null;
      let closestDist = 50;
      for (const [id, node] of p.nodes) {
        const dx = pos.x - node.x;
        const dy = pos.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
          closestDist = dist;
          closest = id;
        }
      }
      if (closest) {
        e.preventDefault();
        p.draggingId = closest;
        setActiveNode(closest);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const pos = getPos(touch);
      p.mouseX = pos.x;
      p.mouseY = pos.y;
      if (p.draggingId) e.preventDefault();
    };

    const onTouchEnd = () => { onMouseUp(); p.mouseIn = false; };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('mouseenter', onMouseEnter);
    container.addEventListener('mouseleave', onMouseLeave);
    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);

    return () => {
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('mouseenter', onMouseEnter);
      container.removeEventListener('mouseleave', onMouseLeave);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  // Get active node def
  const activeDef = activeNode ? NODES.find(n => n.id === activeNode) : null;

  // Card positioning — smooth interpolation via CSS transition
  const cardWidth = 260;
  const cardGap = 18;

  const cardStyle = cardSide && activeDef ? (() => {
    const nodeSize = activeDef.ring === 'inner' ? 52 : 64;

    let left: number;
    let top: number;

    // Card appears on outside (away from Soma center)
    if (cardSide.side === 'right') {
      left = cardSide.x + nodeSize / 2 + cardGap;
    } else {
      left = cardSide.x - nodeSize / 2 - cardGap - cardWidth;
    }

    if (cardSide.vSide === 'bottom') {
      top = cardSide.y - 20;
    } else {
      top = cardSide.y - 100;
    }

    // Light clamp — only prevent going above container
    top = Math.max(8, top);

    return {
      position: 'absolute' as const,
      left: `${left}px`,
      top: `${top}px`,
      width: `${cardWidth}px`,
      opacity: 1,
      pointerEvents: 'none' as const,
      zIndex: 20,
      transition: 'left 0.15s ease-out, top 0.15s ease-out, opacity 0.2s ease-out',
    };
  })() : null;

  return (
    <div
      ref={containerRef}
      class="orbital-physics"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '710px',
        aspectRatio: '1',
        margin: '0 auto',
        cursor: activeNode ? 'grabbing' : hoveredNode ? 'grab' : 'default',
        touchAction: 'none',
        userSelect: 'none',
        overflow: 'visible',
      }}
    >
      {/* SVG layer for orbit rings + tether lines */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {/* Outer orbit ring */}
        <circle
          cx="50%" cy="50%"
          r="38%"
          fill="none"
          stroke="var(--border-subtle)"
          stroke-width="1"
        />
        {/* Inner orbit ring */}
        <circle
          cx="50%" cy="50%"
          r="19.5%"
          fill="none"
          stroke="rgba(104, 152, 190, 0.1)"
          stroke-width="1"
          stroke-dasharray="4 6"
        />
        {/* Pulse ring */}
        <circle
          cx="50%" cy="50%"
          r="29%"
          fill="none"
          stroke="rgba(104, 152, 190, 0.06)"
          stroke-width="1"
          class="orbital-pulse-ring"
        />
        {/* Tether lines (one per node) */}
        {NODES.map(def => (
          <line
            key={`tether-${def.id}`}
            ref={el => { if (el) tetherElsRef.current.set(def.id, el); }}
            stroke="var(--accent-bright)"
            stroke-width="1"
            stroke-dasharray="4 4"
            style={{ display: 'none', opacity: 0, transition: 'opacity 0.15s' }}
          />
        ))}
      </svg>

      {/* Center: Soma logo */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      >
        <img
          src="/media/soma-logo-animated.svg"
          alt=""
          width="86"
          height="86"
          style={{
            filter: 'drop-shadow(0 0 21px var(--logo-glow))',
          }}
          class="orbital-center-float"
        />
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '0.05em',
          }}
        >
          soma
        </span>
      </div>

      {/* Orbital nodes */}
      {NODES.map(def => {
        const isOuter = def.ring === 'outer';
        const size = isOuter ? 64 : 52;
        const isActive = activeNode === def.id;

        return (
          <div
            key={def.id}
            ref={el => { if (el) nodeElsRef.current.set(def.id, el); }}
            class={`orbital-node ${isActive ? 'orbital-node-active' : ''}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              cursor: 'grab',
              zIndex: isActive ? 15 : 3,
              willChange: 'transform',
            }}
          >
            {/* Icon circle */}
            <div
              class="orbital-node-icon"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                border: `1px solid ${isActive ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
                background: 'var(--surface-card-strong)',
                backdropFilter: 'blur(8px)',
                color: def.color === 'warm' ? 'var(--warm-bright)' :
                       def.color === 'muted' ? 'var(--text-muted)' : 'var(--accent-bright)',
                boxShadow: isActive ? '0 0 21px var(--shadow-accent-soft)' : 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            >
              <svg
                width={isOuter ? 30 : 27}
                height={isOuter ? 30 : 27}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                dangerouslySetInnerHTML={{ __html: ICON_SVGS[def.icon] || '' }}
              />
            </div>
            {/* Label */}
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: isOuter ? '0.9rem' : '0.84rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
              }}
            >
              {def.label.toLowerCase()}
            </span>
            {/* Sublabel for inner nodes */}
            {def.sublabel && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  marginTop: '-2px',
                }}
              >
                {def.sublabel}
              </span>
            )}
          </div>
        );
      })}

      {/* Floating info card */}
      {activeDef && cardStyle && (
        <div
          ref={cardElRef}
          class="orbital-info-card"
          style={cardStyle}
        >
          <div class="orbital-info-header">
            <svg
              width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"
              dangerouslySetInnerHTML={{ __html: ICON_SVGS[activeDef.icon] || '' }}
            />
            <span>{activeDef.label}</span>
          </div>
          <p class="orbital-info-desc">{activeDef.description}</p>
          <ul class="orbital-info-list">
            {activeDef.details.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Hint text */}
      <div
        class="orbital-hint"
        style={{
          position: 'absolute',
          bottom: '-28px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          opacity: activeNode ? 0 : 0.6,
          transition: 'opacity 0.3s',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        drag a node to explore
      </div>
    </div>
  );
}
