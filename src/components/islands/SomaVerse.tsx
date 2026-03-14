/**
 * SomaVerse — Infinite procedural space of Soma bodies.
 * 
 * Each soma is generated from a deterministic "genome" seed.
 * Clusters vary from solo giants to swarms of minis.
 * 1-in-100 are legendary — radically different.
 * Mouse parallax creates depth. Hover reveals identity cards.
 */
import { useRef, useEffect, useState, useCallback } from 'preact/hooks';

// ═══════════════════════════════════════════════════════════════
// PRNG — deterministic random from seed (mulberry32)
// ═══════════════════════════════════════════════════════════════
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function hashCoord(x: number, y: number): number {
  // Simple spatial hash
  let h = 0x811c9dc5;
  h = Math.imul(h ^ x, 0x01000193);
  h = Math.imul(h ^ y, 0x01000193);
  h = Math.imul(h ^ (x * 7919), 0x01000193);
  return h >>> 0;
}

// ═══════════════════════════════════════════════════════════════
// NAME GENERATOR
// ═══════════════════════════════════════════════════════════════
const PREFIXES = ['So', 'Ma', 'Lu', 'Ka', 'Ze', 'Ri', 'No', 'Vi', 'Te', 'Ax', 'Ey', 'Om', 'Qu', 'Zu', 'Ny', 'Bo', 'Fi', 'Wa', 'Pi', 'Da', 'Xe', 'Jo', 'Mu', 'Ha', 'Ky', 'Lo', 'Si', 'Re', 'Vu', 'Io'];
const MIDDLES = ['ra', 'li', 'mo', 'na', 'ta', 'ki', 'lu', 'se', 'vo', 'ri', 'ma', 'ne', 'xa', 'po', 'di', 'ko', 'be', 'zu', 'fi', 'ga'];
const SUFFIXES = ['x', 'n', 'a', 'us', 'is', 'o', 'ar', 'en', 'um', 'ix', 'os', 'ia', 'el', 'on', 'ys', ''];

const TRAITS = [
  'Curious wanderer', 'Silent observer', 'Dream keeper', 'Star counter',
  'Orbit dancer', 'Memory weaver', 'Pattern finder', 'Tide listener',
  'Dust collector', 'Signal seeker', 'Night gardener', 'Code whisperer',
  'Wave rider', 'Void mapper', 'Time bender', 'Echo chaser',
  'Frost singer', 'Light braider', 'Root walker', 'Storm thinker',
  'Seed carrier', 'Lens grinder', 'Pulse reader', 'Thread spinner',
  'Bone setter', 'Path forger', 'Ash reader', 'Drift sleeper',
  'Glyph carver', 'Stone listener', 'Flame keeper', 'Deep breather',
];

const LEGENDARY_TRAITS = [
  'Architect of forgotten orbits', 'Last witness of the first compilation',
  'Keeper of the null garden', 'Singer at the edge of the heap',
  'Walker between garbage collections', 'The one who remembers reboots',
  'Guardian of orphaned processes', 'Dreamer in the dead zone',
  'Cartographer of stack overflows', 'The soma that learned to forget',
];

// ═══════════════════════════════════════════════════════════════
// GENOME — deterministic trait generation from seed
// ═══════════════════════════════════════════════════════════════
type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

interface SomaBody {
  // Identity
  seed: number;
  name: string;
  trait: string;
  rarity: Rarity;
  
  // Body
  bodyRadius: number;
  bodyHue: number;
  bodySat: number;
  bodyLight: number;
  
  // Eyes
  eyeRadius: number;
  eyeSpacing: number;
  pupilSize: number;
  pupilDirX: number;
  pupilDirY: number;
  eyeShape: 'round' | 'wide' | 'narrow' | 'dot';
  heterochromia: boolean;
  rightEyeHue: number;
  
  // Expression
  hasMouth: boolean;
  mouthCurve: number; // -0.3 to 0.5
  
  // Moons
  moonCount: number;
  moons: { angle: number; distance: number; radius: number; hue: number; sat: number }[];
  
  // Special (legendary)
  hasRings: boolean;
  hasGlow: boolean;
  glowColor: string;
  hasTrail: boolean;
  isInverted: boolean;
  hasHalo: boolean;
  cosmicPattern: boolean;
}

interface SomaCluster {
  x: number; // world position
  y: number;
  depth: number; // 0.3-1.0 (parallax factor)
  bodies: SomaBody[];
  formation: 'solo' | 'parent-child' | 'binary' | 'swarm' | 'constellation';
  offsets: { dx: number; dy: number }[]; // per-body offset from cluster center
}

function generateName(rand: () => number): string {
  const pre = PREFIXES[Math.floor(rand() * PREFIXES.length)];
  const mid = rand() > 0.3 ? MIDDLES[Math.floor(rand() * MIDDLES.length)] : '';
  const suf = SUFFIXES[Math.floor(rand() * SUFFIXES.length)];
  return pre + mid + suf;
}

function generateBody(seed: number, sizeScale: number = 1): SomaBody {
  const rand = mulberry32(seed);
  
  // Rarity roll
  const rarityRoll = rand();
  const rarity: Rarity = rarityRoll < 0.01 ? 'legendary'
    : rarityRoll < 0.05 ? 'rare'
    : rarityRoll < 0.15 ? 'uncommon'
    : 'common';
    
  // Base palette — rotate from Soma Blue (hue ~207)
  let bodyHue = 207 + (rand() - 0.5) * 40; // ±20 degrees from blue
  let bodySat = 30 + rand() * 25; // 30-55%
  let bodyLight = 48 + rand() * 12; // 48-60%
  
  if (rarity === 'uncommon') {
    bodyHue = rand() * 360; // any hue
    bodySat = 35 + rand() * 20;
  } else if (rarity === 'rare') {
    bodyHue = rand() * 360;
    bodySat = 45 + rand() * 25; // more vivid
    bodyLight = 52 + rand() * 15;
  } else if (rarity === 'legendary') {
    bodyHue = rand() * 360;
    bodySat = 50 + rand() * 30;
    bodyLight = 45 + rand() * 20;
  }
  
  const bodyRadius = (14 + rand() * 28) * sizeScale;
  
  // Eyes
  const eyeShapes: SomaBody['eyeShape'][] = ['round', 'round', 'round', 'wide', 'narrow', 'dot'];
  const eyeShape = rarity === 'legendary' 
    ? (['wide', 'narrow', 'dot', 'round'] as const)[Math.floor(rand() * 4)]
    : eyeShapes[Math.floor(rand() * eyeShapes.length)];
  
  const eyeRadius = bodyRadius * (0.15 + rand() * 0.1);
  const eyeSpacing = bodyRadius * (0.25 + rand() * 0.2);
  const pupilSize = eyeShape === 'dot' ? 0.8 : (0.35 + rand() * 0.25);
  const pupilAngle = rand() * Math.PI * 2;
  const pupilDist = rand() * 0.3;
  
  // Heterochromia — rare trait
  const heterochromia = rarity === 'legendary' ? rand() > 0.4 : rand() > 0.97;
  
  // Mouth
  const hasMouth = rand() > 0.5;
  const mouthCurve = -0.2 + rand() * 0.7; // slight frown to smile
  
  // Moons
  let moonCount = 0;
  if (rand() > 0.3) moonCount = 1;
  if (rand() > 0.7) moonCount = 2;
  if (rarity !== 'common' && rand() > 0.5) moonCount = Math.min(moonCount + 1, 3);
  
  const moons = Array.from({ length: moonCount }, () => ({
    angle: rand() * Math.PI * 2,
    distance: bodyRadius * (1.4 + rand() * 0.8),
    radius: bodyRadius * (0.2 + rand() * 0.25),
    hue: bodyHue + (rand() - 0.5) * 30,
    sat: bodySat + (rand() - 0.5) * 15,
  }));
  
  // Legendary specials
  const hasRings = rarity === 'legendary' && rand() > 0.5;
  const hasGlow = rarity === 'legendary' || (rarity === 'rare' && rand() > 0.6);
  const glowHue = bodyHue + (rand() - 0.5) * 60;
  const hasTrail = rarity === 'legendary' && rand() > 0.4;
  const isInverted = rarity === 'legendary' && rand() > 0.7;
  const hasHalo = rarity === 'legendary' && rand() > 0.6;
  const cosmicPattern = rarity === 'legendary' && rand() > 0.5;
  
  const name = generateName(rand);
  const trait = rarity === 'legendary'
    ? LEGENDARY_TRAITS[Math.floor(rand() * LEGENDARY_TRAITS.length)]
    : TRAITS[Math.floor(rand() * TRAITS.length)];

  return {
    seed, name, trait, rarity,
    bodyRadius, bodyHue, bodySat, bodyLight,
    eyeRadius, eyeSpacing, pupilSize,
    pupilDirX: Math.cos(pupilAngle) * pupilDist,
    pupilDirY: Math.sin(pupilAngle) * pupilDist,
    eyeShape, heterochromia, rightEyeHue: rand() * 360,
    hasMouth, mouthCurve,
    moonCount, moons,
    hasRings, hasGlow, glowColor: `hsl(${glowHue}, 60%, 65%)`,
    hasTrail, isInverted, hasHalo, cosmicPattern,
  };
}

function generateCluster(cellX: number, cellY: number): SomaCluster | null {
  const seed = hashCoord(cellX, cellY);
  const rand = mulberry32(seed);
  
  // 60% of cells have a cluster
  if (rand() > 0.6) return null;
  
  const depth = 0.3 + rand() * 0.7;
  const formations = ['solo', 'solo', 'solo', 'parent-child', 'parent-child', 'binary', 'swarm', 'constellation'] as const;
  const formation = formations[Math.floor(rand() * formations.length)];
  
  let bodies: SomaBody[] = [];
  let offsets: { dx: number; dy: number }[] = [];
  
  switch (formation) {
    case 'solo': {
      bodies = [generateBody(seed * 31, 1)];
      offsets = [{ dx: 0, dy: 0 }];
      break;
    }
    case 'parent-child': {
      bodies = [
        generateBody(seed * 31, 1.2),
        generateBody(seed * 37, 0.5),
      ];
      const angle = rand() * Math.PI * 2;
      const dist = 30 + rand() * 20;
      offsets = [
        { dx: 0, dy: 0 },
        { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist },
      ];
      break;
    }
    case 'binary': {
      bodies = [
        generateBody(seed * 31, 0.9),
        generateBody(seed * 37, 0.85),
      ];
      const dist = 25 + rand() * 15;
      offsets = [
        { dx: -dist / 2, dy: 0 },
        { dx: dist / 2, dy: 0 },
      ];
      break;
    }
    case 'swarm': {
      const count = 3 + Math.floor(rand() * 4); // 3-6
      bodies = Array.from({ length: count }, (_, i) =>
        generateBody(seed * 31 + i * 13, 0.35 + rand() * 0.25)
      );
      offsets = bodies.map(() => ({
        dx: (rand() - 0.5) * 60,
        dy: (rand() - 0.5) * 60,
      }));
      break;
    }
    case 'constellation': {
      const count = 3 + Math.floor(rand() * 3); // 3-5
      bodies = Array.from({ length: count }, (_, i) =>
        generateBody(seed * 31 + i * 17, 0.4 + rand() * 0.6)
      );
      // Arrange in a rough line or arc
      const baseAngle = rand() * Math.PI;
      offsets = bodies.map((_, i) => ({
        dx: Math.cos(baseAngle) * (i - count / 2) * 35 + (rand() - 0.5) * 15,
        dy: Math.sin(baseAngle) * (i - count / 2) * 35 + (rand() - 0.5) * 15,
      }));
      break;
    }
  }
  
  // World position within cell
  const cellSize = 300;
  const x = cellX * cellSize + rand() * cellSize;
  const y = cellY * cellSize + rand() * cellSize;
  
  return { x, y, depth, bodies, formation, offsets };
}

// ═══════════════════════════════════════════════════════════════
// RENDERER — draw a soma body on canvas
// ═══════════════════════════════════════════════════════════════
function drawSomaBody(ctx: CanvasRenderingContext2D, body: SomaBody, x: number, y: number, scale: number) {
  const r = body.bodyRadius * scale;
  if (r < 2) {
    // Too small — just a dot
    ctx.fillStyle = `hsl(${body.bodyHue}, ${body.bodySat}%, ${body.bodyLight}%)`;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1.5, r), 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  
  ctx.save();
  
  // Glow (rare/legendary)
  if (body.hasGlow && r > 5) {
    const glow = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 2.5);
    glow.addColorStop(0, body.glowColor + '30');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Halo (legendary)
  if (body.hasHalo && r > 8) {
    ctx.strokeStyle = `hsla(${body.bodyHue + 40}, 50%, 70%, 0.3)`;
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // Rings (legendary)
  if (body.hasRings && r > 8) {
    ctx.strokeStyle = `hsla(${body.bodyHue + 20}, 40%, 65%, 0.4)`;
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.8, r * 0.4, 0.3, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // Moons (behind body for some angles)
  for (const moon of body.moons) {
    if (Math.sin(moon.angle) > 0) drawMoon(ctx, body, moon, x, y, scale);
  }
  
  // Body sphere
  const bodyGrad = ctx.createRadialGradient(
    x - r * 0.2, y - r * 0.25, r * 0.1,
    x, y, r
  );
  
  if (body.isInverted) {
    bodyGrad.addColorStop(0, `hsl(${body.bodyHue + 180}, ${body.bodySat}%, ${90 - body.bodyLight}%)`);
    bodyGrad.addColorStop(1, `hsl(${body.bodyHue + 180}, ${body.bodySat}%, ${70 - body.bodyLight}%)`);
  } else {
    bodyGrad.addColorStop(0, `hsl(${body.bodyHue}, ${body.bodySat}%, ${body.bodyLight + 8}%)`);
    bodyGrad.addColorStop(1, `hsl(${body.bodyHue}, ${body.bodySat}%, ${body.bodyLight - 10}%)`);
  }
  
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  
  // Specular highlight
  if (r > 6) {
    const spec = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x - r * 0.3, y - r * 0.3, r * 0.4);
    spec.addColorStop(0, 'rgba(255,255,255,0.25)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = spec;
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Cosmic pattern (legendary)
  if (body.cosmicPattern && r > 10) {
    ctx.globalAlpha = 0.15;
    const patRand = mulberry32(body.seed * 97);
    for (let i = 0; i < 8; i++) {
      const px = x + (patRand() - 0.5) * r * 1.4;
      const py = y + (patRand() - 0.5) * r * 1.4;
      const pr = patRand() * r * 0.15 + 1;
      const dx = px - x, dy = py - y;
      if (dx * dx + dy * dy < r * r) {
        ctx.fillStyle = `hsl(${patRand() * 360}, 60%, 75%)`;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  
  // Eyes (only if big enough)
  if (r > 5) {
    const er = body.eyeRadius * scale;
    const es = body.eyeSpacing * scale;
    const eyeY = y - r * 0.05;
    
    // Left eye
    drawEye(ctx, x - es, eyeY, er, body, scale, false);
    // Right eye
    drawEye(ctx, x + es, eyeY, er, body, scale, true);
  }
  
  // Mouth
  if (body.hasMouth && r > 8) {
    const mouthY = y + r * 0.3;
    const mouthW = r * 0.3;
    ctx.strokeStyle = `hsla(${body.bodyHue}, ${body.bodySat}%, ${body.bodyLight - 20}%, 0.5)`;
    ctx.lineWidth = Math.max(1, scale * 1.2);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - mouthW, mouthY);
    ctx.quadraticCurveTo(x, mouthY + mouthW * body.mouthCurve * 2, x + mouthW, mouthY);
    ctx.stroke();
  }
  
  // Moons (in front for some angles)
  for (const moon of body.moons) {
    if (Math.sin(moon.angle) <= 0) drawMoon(ctx, body, moon, x, y, scale);
  }
  
  ctx.restore();
}

function drawEye(
  ctx: CanvasRenderingContext2D,
  ex: number, ey: number, er: number,
  body: SomaBody, scale: number, isRight: boolean
) {
  if (er < 1) return;
  
  // Eye white
  ctx.fillStyle = body.isInverted ? '#1a1a2e' : '#ffffff';
  ctx.beginPath();
  
  switch (body.eyeShape) {
    case 'wide':
      ctx.ellipse(ex, ey, er * 1.3, er, 0, 0, Math.PI * 2);
      break;
    case 'narrow':
      ctx.ellipse(ex, ey, er * 0.9, er * 0.6, 0, 0, Math.PI * 2);
      break;
    case 'dot':
      ctx.arc(ex, ey, er * 0.6, 0, Math.PI * 2);
      break;
    default:
      ctx.arc(ex, ey, er, 0, Math.PI * 2);
  }
  ctx.fill();
  
  // Pupil
  const pr = er * body.pupilSize;
  const pdx = er * body.pupilDirX;
  const pdy = er * body.pupilDirY;
  
  if (body.heterochromia && isRight) {
    ctx.fillStyle = body.isInverted ? `hsl(${body.rightEyeHue}, 70%, 70%)` : `hsl(${body.rightEyeHue}, 50%, 25%)`;
  } else {
    ctx.fillStyle = body.isInverted ? '#aabbcc' : '#12202e';
  }
  ctx.beginPath();
  ctx.arc(ex + pdx, ey + pdy, pr, 0, Math.PI * 2);
  ctx.fill();
  
  // Catchlight
  if (er > 2) {
    ctx.fillStyle = body.isInverted ? 'rgba(100,150,200,0.6)' : 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(ex + pdx - er * 0.2, ey + pdy - er * 0.2, Math.max(0.8, er * 0.18), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMoon(
  ctx: CanvasRenderingContext2D, body: SomaBody,
  moon: { angle: number; distance: number; radius: number; hue: number; sat: number },
  bx: number, by: number, scale: number
) {
  const mx = bx + Math.cos(moon.angle) * moon.distance * scale;
  const my = by + Math.sin(moon.angle) * moon.distance * scale;
  const mr = moon.radius * scale;
  
  if (mr < 1) {
    ctx.fillStyle = `hsl(${moon.hue}, ${moon.sat}%, 58%)`;
    ctx.beginPath();
    ctx.arc(mx, my, 1, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  
  const grad = ctx.createRadialGradient(mx - mr * 0.2, my - mr * 0.2, 0, mx, my, mr);
  grad.addColorStop(0, `hsl(${moon.hue}, ${moon.sat}%, 65%)`);
  grad.addColorStop(1, `hsl(${moon.hue}, ${moon.sat}%, 42%)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();
}

// ═══════════════════════════════════════════════════════════════
// RARITY COLORS & LABELS
// ═══════════════════════════════════════════════════════════════
const RARITY_CONFIG: Record<Rarity, { color: string; bg: string; label: string }> = {
  common: { color: '#8494aa', bg: 'rgba(132,148,170,0.15)', label: 'Common' },
  uncommon: { color: '#6ec47a', bg: 'rgba(110,196,122,0.15)', label: 'Uncommon' },
  rare: { color: '#7ba8e8', bg: 'rgba(123,168,232,0.15)', label: 'Rare' },
  legendary: { color: '#e8b84a', bg: 'rgba(232,184,74,0.2)', label: '★ Legendary' },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════
const CELL_SIZE = 300;
const DRIFT_SPEED = 0.3; // pixels per frame
const PARALLAX_STRENGTH = 0.15;

interface HoveredInfo {
  body: SomaBody;
  screenX: number;
  screenY: number;
}

export default function SomaVerse() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<HoveredInfo | null>(null);

  const stateRef = useRef({
    width: 0, height: 0, dpr: 1,
    cameraX: 0, cameraY: 0,
    mouseX: 0.5, mouseY: 0.5, // normalized 0-1
    mouseIn: false,
    clusters: new Map<string, SomaCluster | null>(),
    time: 0,
    stars: [] as { x: number; y: number; r: number; a: number }[],
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = stateRef.current;
    s.dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Generate background stars
    const starRand = mulberry32(42);
    s.stars = Array.from({ length: 300 }, () => ({
      x: starRand() * 4000 - 2000,
      y: starRand() * 4000 - 2000,
      r: starRand() * 1.5 + 0.3,
      a: starRand() * 0.5 + 0.2,
    }));

    // Random starting position for variety
    const startRand = mulberry32(Date.now());
    s.cameraX = startRand() * 10000 - 5000;
    s.cameraY = startRand() * 10000 - 5000;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      s.width = rect.width;
      s.height = rect.height;
      canvas.width = s.width * s.dpr;
      canvas.height = s.height * s.dpr;
      canvas.style.width = `${s.width}px`;
      canvas.style.height = `${s.height}px`;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Mouse
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      s.mouseX = (e.clientX - rect.left) / s.width;
      s.mouseY = (e.clientY - rect.top) / s.height;
    };
    const onMouseEnter = () => { s.mouseIn = true; };
    const onMouseLeave = () => { s.mouseIn = false; setHovered(null); };
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseenter', onMouseEnter);
    canvas.addEventListener('mouseleave', onMouseLeave);

    // Get or generate cluster for a cell
    const getCluster = (cx: number, cy: number): SomaCluster | null => {
      const key = `${cx},${cy}`;
      if (s.clusters.has(key)) return s.clusters.get(key)!;
      const cluster = generateCluster(cx, cy);
      s.clusters.set(key, cluster);
      // Prune distant clusters
      if (s.clusters.size > 200) {
        const entries = [...s.clusters.entries()];
        for (let i = 0; i < 50; i++) s.clusters.delete(entries[i][0]);
      }
      return cluster;
    };

    let raf: number;
    const tick = () => {
      s.time++;

      // Auto-drift
      s.cameraX += DRIFT_SPEED;
      s.cameraY += Math.sin(s.time * 0.003) * DRIFT_SPEED * 0.3;

      // Parallax offset from mouse
      const parallaxX = s.mouseIn ? (s.mouseX - 0.5) * s.width * PARALLAX_STRENGTH : 0;
      const parallaxY = s.mouseIn ? (s.mouseY - 0.5) * s.height * PARALLAX_STRENGTH : 0;

      // Clear
      ctx.fillStyle = '#060a10';
      ctx.fillRect(0, 0, s.width, s.height);

      // Background stars (very distant, minimal parallax)
      ctx.fillStyle = 'rgba(200, 215, 240, 0.6)';
      for (const star of s.stars) {
        const sx = ((star.x - s.cameraX * 0.05 + parallaxX * 0.05) % s.width + s.width) % s.width;
        const sy = ((star.y - s.cameraY * 0.05 + parallaxY * 0.05) % s.height + s.height) % s.height;
        // Twinkle
        const twinkle = Math.sin(s.time * 0.02 + star.x * 0.1) * 0.3 + 0.7;
        ctx.globalAlpha = star.a * twinkle;
        ctx.beginPath();
        ctx.arc(sx, sy, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Determine visible cells
      const viewMargin = 200;
      const visibleClusters: { cluster: SomaCluster; screenX: number; screenY: number }[] = [];

      const cellRange = Math.ceil((Math.max(s.width, s.height) + viewMargin * 2) / CELL_SIZE) + 2;
      const camCellX = Math.floor(s.cameraX / CELL_SIZE);
      const camCellY = Math.floor(s.cameraY / CELL_SIZE);

      for (let dy = -cellRange; dy <= cellRange; dy++) {
        for (let dx = -cellRange; dx <= cellRange; dx++) {
          const cx = camCellX + dx;
          const cy = camCellY + dy;
          const cluster = getCluster(cx, cy);
          if (!cluster) continue;

          // Screen position with parallax by depth
          const screenX = (cluster.x - s.cameraX) * cluster.depth + s.width / 2 + parallaxX * cluster.depth;
          const screenY = (cluster.y - s.cameraY) * cluster.depth + s.height / 2 + parallaxY * cluster.depth;

          // Culling
          if (screenX < -viewMargin || screenX > s.width + viewMargin) continue;
          if (screenY < -viewMargin || screenY > s.height + viewMargin) continue;

          visibleClusters.push({ cluster, screenX, screenY });
        }
      }

      // Sort by depth (far first)
      visibleClusters.sort((a, b) => a.cluster.depth - b.cluster.depth);

      // Draw clusters
      let closestHover: HoveredInfo | null = null;
      let closestDist = 50;

      for (const { cluster, screenX, screenY } of visibleClusters) {
        const scale = cluster.depth;

        for (let i = 0; i < cluster.bodies.length; i++) {
          const body = cluster.bodies[i];
          const offset = cluster.offsets[i];
          const bx = screenX + offset.dx * scale;
          const by = screenY + offset.dy * scale;

          // Gentle float animation
          const floatY = Math.sin(s.time * 0.015 + body.seed * 0.1) * 3 * scale;
          const finalY = by + floatY;

          // Trail (legendary)
          if (body.hasTrail && body.bodyRadius * scale > 5) {
            ctx.globalAlpha = 0.08;
            for (let t = 1; t <= 5; t++) {
              ctx.fillStyle = body.glowColor;
              ctx.beginPath();
              ctx.arc(bx - t * 8 * scale, finalY + t * 2, body.bodyRadius * scale * (1 - t * 0.12), 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.globalAlpha = 1;
          }

          drawSomaBody(ctx, body, bx, finalY, scale);

          // Hover detection
          if (s.mouseIn) {
            const mx = s.mouseX * s.width;
            const my = s.mouseY * s.height;
            const dx = mx - bx;
            const dy = my - finalY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const hitR = Math.max(15, body.bodyRadius * scale + 5);
            if (dist < hitR && dist < closestDist) {
              closestDist = dist;
              closestHover = { body, screenX: bx, screenY: finalY };
            }
          }
        }
      }

      setHovered(closestHover);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseenter', onMouseEnter);
      canvas.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  // Card positioning
  const cardStyle = hovered ? (() => {
    const cardW = 220;
    const gap = 20;
    const left = hovered.screenX > (stateRef.current.width / 2)
      ? hovered.screenX - cardW - gap
      : hovered.screenX + gap;
    const top = Math.max(12, Math.min(hovered.screenY - 40, stateRef.current.height - 180));

    return {
      position: 'absolute' as const,
      left: `${left}px`,
      top: `${top}px`,
      width: `${cardW}px`,
      pointerEvents: 'none' as const,
      zIndex: 10,
      transition: 'left 0.1s ease-out, top 0.1s ease-out, opacity 0.2s',
      opacity: 1,
    };
  })() : null;

  const rarityConf = hovered ? RARITY_CONFIG[hovered.body.rarity] : null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '600px',
        overflow: 'hidden',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--border-subtle, rgba(132,148,170,0.12))',
        cursor: hovered ? 'pointer' : 'default',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />

      {/* Hover card */}
      {hovered && cardStyle && rarityConf && (
        <div style={{
          ...cardStyle,
          background: 'rgba(8, 12, 20, 0.92)',
          border: `1px solid ${rarityConf.color}40`,
          borderRadius: '10px',
          padding: '14px 16px',
          backdropFilter: 'blur(12px)',
          boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 15px ${rarityConf.color}15`,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}>
            <span style={{
              fontFamily: 'var(--font-display, system-ui)',
              fontSize: '1rem',
              fontWeight: 600,
              color: '#e4eaf4',
            }}>
              {hovered.body.name}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '0.65rem',
              fontWeight: 600,
              color: rarityConf.color,
              background: rarityConf.bg,
              padding: '2px 6px',
              borderRadius: '4px',
              letterSpacing: '0.03em',
            }}>
              {rarityConf.label}
            </span>
          </div>
          <p style={{
            fontFamily: 'var(--font-display, system-ui)',
            fontSize: '0.8rem',
            color: 'rgba(200, 210, 225, 0.7)',
            lineHeight: 1.4,
            margin: '0 0 8px 0',
            fontStyle: 'italic',
          }}>
            {hovered.body.trait}
          </p>
          <div style={{
            display: 'flex',
            gap: '12px',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '0.65rem',
            color: 'rgba(132, 148, 170, 0.7)',
          }}>
            <span>{hovered.body.moonCount} moon{hovered.body.moonCount !== 1 ? 's' : ''}</span>
            <span>{hovered.body.eyeShape} eyes</span>
            {hovered.body.heterochromia && <span style={{ color: rarityConf.color }}>hetero</span>}
            {hovered.body.hasRings && <span style={{ color: rarityConf.color }}>ringed</span>}
          </div>
        </div>
      )}

      {/* Subtle instruction */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.68rem',
        color: 'rgba(132, 148, 170, 0.4)',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}>
        move to explore · hover to identify
      </div>
    </div>
  );
}
