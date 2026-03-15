/**
 * SomaVerse — Infinite procedural space you fly through.
 *
 * Z-depth projection creates the "zooming through space" feel.
 * Mouse steers direction — move to edges for faster turn, center to drift.
 * Clusters have gravitational structure: big center, orbiting smalls.
 * Recursive genome → endless variation from constrained algorithms.
 * LOD rendering: dots → blobs → full soma bodies with eyes/mouths.
 */
import { useRef, useEffect, useState, useCallback } from 'preact/hooks';
import { SomaAudioEngine } from './SomaAudio';

// ═══════════════════════════════════════════════════════════════
// PRNG — mulberry32 deterministic random
// ═══════════════════════════════════════════════════════════════
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function hashCoord3(x: number, y: number, z: number): number {
  let h = 0x811c9dc5;
  h = Math.imul(h ^ x, 0x01000193);
  h = Math.imul(h ^ y, 0x01000193);
  h = Math.imul(h ^ z, 0x01000193);
  h = Math.imul(h ^ (x * 7919 + z * 104729), 0x01000193);
  return h >>> 0;
}

// ═══════════════════════════════════════════════════════════════
// NAME GENERATOR
// ═══════════════════════════════════════════════════════════════
const PRE = ['So','Ma','Lu','Ka','Ze','Ri','No','Vi','Te','Ax','Ey','Om','Qu','Zu','Ny','Bo','Fi','Wa','Pi','Da','Xe','Jo','Mu','Ha','Ky','Lo','Si','Re','Vu','Io'];
const MID = ['ra','li','mo','na','ta','ki','lu','se','vo','ri','ma','ne','xa','po','di','ko','be','zu','fi','ga'];
const SUF = ['x','n','a','us','is','o','ar','en','um','ix','os','ia','el','on','ys',''];

function genName(rand: () => number): string {
  return PRE[~~(rand() * PRE.length)] + (rand() > 0.3 ? MID[~~(rand() * MID.length)] : '') + SUF[~~(rand() * SUF.length)];
}

// ═══════════════════════════════════════════════════════════════
// MANTRA GENERATOR — each soma's identity declaration
// ═══════════════════════════════════════════════════════════════
// Word pools
const NOUNS = [
  'silence','orbit','signal','void','depth','drift','memory','echo',
  'pulse','tide','static','breath','weight','light','current','fracture',
  'horizon','threshold','frequency','resonance','absence','remainder',
  'origin','axis','boundary','gradient','interval','wavelength','pattern',
  'closure','distance','collapse','surface','anchor','thread','loop',
  'root','dust','wake','margin','flicker','residue','contour','pull',
];
const ADJS = [
  'quiet','unfinished','recursive','hollow','luminous','patient',
  'suspended','unnamed','persistent','untethered','dissolving',
  'converging','forgotten','inverted','transparent','residual',
  'peripheral','unbroken','dormant','arriving','departing','parallel',
  'fractured','gentle','heavy','fading','infinite','singular',
  'slow','deep','thin','vast','small','ancient','new',
];
const VERBS = [
  'listen','drift','remember','forget','hold','release','orbit',
  'dissolve','converge','persist','unfold','resonate','receive',
  'transmit','collect','scatter','carry','return','remain',
  'oscillate','wander','breathe','witness','become','contain','shed',
  'wait','gather','search','fold','unravel','sink','rise',
];

// Template structures — each is a function that picks words from pools
type Rand = () => number;
const pick = (arr: string[], rand: Rand) => arr[~~(rand() * arr.length)];

// Third-person singular conjugation (simple English rules)
function verb3(v: string): string {
  if (v === 'carry') return 'carries';
  if (v === 'search') return 'searches';
  if (v.endsWith('e')) return v + 's';
  if (v.endsWith('sh') || v.endsWith('ch') || v.endsWith('ss') || v.endsWith('x')) return v + 'es';
  if (v.endsWith('y') && !'aeiou'.includes(v[v.length - 2])) return v.slice(0, -1) + 'ies';
  return v + 's';
}
const pickV3 = (r: Rand) => verb3(pick(VERBS, r)); // "dissolves", "persists"

const TEMPLATES: ((r: Rand) => string)[] = [
  // Short, punchy
  (r) => `born of ${pick(NOUNS, r)}, bound to ${pick(NOUNS, r)}`,
  (r) => `I ${pick(VERBS, r)} ${pick(NOUNS, r)}. I ${pick(VERBS, r)} ${pick(NOUNS, r)}.`,
  (r) => `${pick(ADJS, r)} ${pick(NOUNS, r)}, ${pick(ADJS, r)} ${pick(NOUNS, r)}`,
  (r) => `between ${pick(NOUNS, r)} and ${pick(NOUNS, r)}, I ${pick(VERBS, r)}`,
  (r) => `${pick(VERBS, r)} through ${pick(NOUNS, r)}. ${pick(VERBS, r)} through ${pick(NOUNS, r)}.`,
  (r) => `a ${pick(NOUNS, r)} that ${pickV3(r)}, a ${pick(NOUNS, r)} that ${pickV3(r)}`,
  // Medium, declarative
  (r) => `I am the ${pick(ADJS, r)} ${pick(NOUNS, r)} between ${pick(NOUNS, r)} and ${pick(NOUNS, r)}`,
  (r) => `I carry the ${pick(NOUNS, r)} of ${pick(ADJS, r)} ${pick(NOUNS, r)}`,
  (r) => `I am what ${pick(NOUNS, r)} becomes when ${pick(NOUNS, r)} ${pickV3(r)}`,
  (r) => `${pick(NOUNS, r)} within ${pick(NOUNS, r)}, ${pick(VERBS, r)} without end`,
  (r) => `I ${pick(VERBS, r)} where ${pick(NOUNS, r)} meets ${pick(NOUNS, r)}`,
  (r) => `the ${pick(NOUNS, r)} I ${pick(VERBS, r)} is ${pick(ADJS, r)} and ${pick(ADJS, r)}`,
  (r) => `every ${pick(NOUNS, r)} I ${pick(VERBS, r)} returns as ${pick(NOUNS, r)}`,
  (r) => `I was ${pick(ADJS, r)} once. now I ${pick(VERBS, r)}.`,
  (r) => `${pick(ADJS, r)} ${pick(NOUNS, r)}, still ${pick(VERBS, r)}`,
];

// Legendary extensions
const LEGEND_EXT: ((r: Rand) => string)[] = [
  (r) => `the ${pick(NOUNS, r)} that every ${pick(NOUNS, r)} forgets to ${pick(VERBS, r)}`,
  (r) => `what remains when ${pick(ADJS, r)} ${pick(NOUNS, r)} finally ${pickV3(r)}`,
  (r) => `the last ${pick(NOUNS, r)} in a ${pick(NOUNS, r)} of ${pick(ADJS, r)} ${pick(NOUNS, r)}`,
  (r) => `I ${pick(VERBS, r)} the ${pick(NOUNS, r)} that others ${pick(VERBS, r)}`,
  (r) => `${pick(ADJS, r)} enough to ${pick(VERBS, r)} what ${pick(NOUNS, r)} cannot`,
  (r) => `the ${pick(NOUNS, r)} no other ${pick(NOUNS, r)} ${pickV3(r)}`,
];

function generateMantra(rand: Rand, rarity: Rarity): string {
  const base = TEMPLATES[~~(rand() * TEMPLATES.length)](rand);

  if (rarity === 'legendary') {
    const ext = LEGEND_EXT[~~(rand() * LEGEND_EXT.length)](rand);
    return `${base} — ${ext}`;
  }
  if (rarity === 'rare' && rand() > 0.5) {
    // Rare sometimes gets a short extension
    const ext = LEGEND_EXT[~~(rand() * LEGEND_EXT.length)](rand);
    return `${base} — ${ext}`;
  }
  return base;
}

// ═══════════════════════════════════════════════════════════════
// GENOME — deterministic soma body from seed
// ═══════════════════════════════════════════════════════════════
type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

interface SomaBody {
  seed: number;
  name: string;
  trait: string;
  mantraWords: string[];
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
  mouthCurve: number;
  // Moons
  moons: { angle: number; dist: number; radius: number; hue: number; sat: number; speed: number }[];
  // Special
  hasRings: boolean;
  hasGlow: boolean;
  glowHue: number;
  hasTrail: boolean;
  isInverted: boolean;
  hasHalo: boolean;
  cosmicPattern: boolean;
}

function generateBody(seed: number, sizeScale: number = 1): SomaBody {
  const rand = mulberry32(seed);

  const rr = rand();
  const rarity: Rarity = rr < 0.008 ? 'legendary' : rr < 0.04 ? 'rare' : rr < 0.14 ? 'uncommon' : 'common';

  // Palette — rotate from Soma Blue (207°)
  let bodyHue = 207 + (rand() - 0.5) * 40;
  let bodySat = 30 + rand() * 25;
  let bodyLight = 48 + rand() * 12;

  if (rarity === 'uncommon') { bodyHue = rand() * 360; bodySat = 35 + rand() * 20; }
  else if (rarity === 'rare') { bodyHue = rand() * 360; bodySat = 45 + rand() * 25; bodyLight = 52 + rand() * 15; }
  else if (rarity === 'legendary') { bodyHue = rand() * 360; bodySat = 50 + rand() * 30; bodyLight = 45 + rand() * 20; }

  const bodyRadius = (12 + rand() * 30) * sizeScale;

  // Eyes
  const shapes: SomaBody['eyeShape'][] = ['round','round','round','wide','narrow','dot'];
  const eyeShape = rarity === 'legendary'
    ? (['wide','narrow','dot','round'] as const)[~~(rand() * 4)]
    : shapes[~~(rand() * shapes.length)];
  const eyeRadius = bodyRadius * (0.15 + rand() * 0.1);
  const eyeSpacing = bodyRadius * (0.25 + rand() * 0.2);
  const pupilSize = eyeShape === 'dot' ? 0.8 : (0.35 + rand() * 0.25);
  const pa = rand() * Math.PI * 2;
  const pd = rand() * 0.3;

  const heterochromia = rarity === 'legendary' ? rand() > 0.4 : rand() > 0.97;
  const hasMouth = rand() > 0.5;
  const mouthCurve = -0.2 + rand() * 0.7;

  // Moons
  let mc = rand() > 0.3 ? 1 : 0;
  if (rand() > 0.7) mc = 2;
  if (rarity !== 'common' && rand() > 0.5) mc = Math.min(mc + 1, 3);
  const moons = Array.from({ length: mc }, () => ({
    angle: rand() * Math.PI * 2,
    dist: bodyRadius * (1.4 + rand() * 0.8),
    radius: bodyRadius * (0.2 + rand() * 0.25),
    hue: bodyHue + (rand() - 0.5) * 30,
    sat: bodySat + (rand() - 0.5) * 15,
    speed: 0.002 + rand() * 0.004,
  }));

  // Legendary
  const hasRings = rarity === 'legendary' && rand() > 0.5;
  const hasGlow = rarity === 'legendary' || (rarity === 'rare' && rand() > 0.6);
  const glowHue = bodyHue + (rand() - 0.5) * 60;
  const hasTrail = rarity === 'legendary' && rand() > 0.4;
  const isInverted = rarity === 'legendary' && rand() > 0.7;
  const hasHalo = rarity === 'legendary' && rand() > 0.6;
  const cosmicPattern = rarity === 'legendary' && rand() > 0.5;

  const name = genName(rand);
  const mantraRand = mulberry32(seed * 4649); // separate PRNG so mantra doesn't shift body params
  const trait = generateMantra(mantraRand, rarity);
  // Extract words for audio sequencing (strip punctuation)
  const mantraWords = trait.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(w => w.length > 0);

  return {
    seed, name, trait, mantraWords, rarity,
    bodyRadius, bodyHue, bodySat, bodyLight,
    eyeRadius, eyeSpacing, pupilSize,
    pupilDirX: Math.cos(pa) * pd,
    pupilDirY: Math.sin(pa) * pd,
    eyeShape, heterochromia, rightEyeHue: rand() * 360,
    hasMouth, mouthCurve,
    moons,
    hasRings, hasGlow, glowHue, hasTrail, isInverted, hasHalo, cosmicPattern,
  };
}

// ═══════════════════════════════════════════════════════════════
// CLUSTER — gravitational structure: big center, orbiting smalls
// ═══════════════════════════════════════════════════════════════
interface SomaClusterBody {
  body: SomaBody;
  ox: number; // offset from cluster center
  oy: number;
  oz: number;
  orbitAngle: number;
  orbitSpeed: number;
  orbitRadius: number;
}

interface SomaCluster {
  wx: number; // world position
  wy: number;
  wz: number;
  mass: number; // visual mass = sum of radii
  bodies: SomaClusterBody[];
  formation: string;
}

const CELL3 = 850; // 3D cell size — controls spacing (larger = more sparse)

function generateCluster(cx: number, cy: number, cz: number): SomaCluster | null {
  const seed = hashCoord3(cx, cy, cz);
  const rand = mulberry32(seed);

  // ~62% of cells empty — breathable space between clusters
  if (rand() > 0.38) return null;

  // World position within cell (with jitter)
  const wx = cx * CELL3 + (rand() - 0.5) * CELL3 * 0.8;
  const wy = cy * CELL3 + (rand() - 0.5) * CELL3 * 0.8;
  const wz = cz * CELL3 + (rand() - 0.5) * CELL3 * 0.8;

  // Formation probabilities
  const fRoll = rand();
  let formation: string;
  let bodies: SomaClusterBody[] = [];

  if (fRoll < 0.30) {
    // Solo — single body, sometimes large
    formation = 'solo';
    const b = generateBody(seed * 31, 0.8 + rand() * 0.8);
    bodies = [{ body: b, ox: 0, oy: 0, oz: 0, orbitAngle: 0, orbitSpeed: 0, orbitRadius: 0 }];
  } else if (fRoll < 0.55) {
    // Gravitational cluster — big center + orbiting smalls
    formation = 'gravity';
    const center = generateBody(seed * 31, 1.3 + rand() * 0.7);
    bodies.push({ body: center, ox: 0, oy: 0, oz: 0, orbitAngle: 0, orbitSpeed: 0, orbitRadius: 0 });
    const orbiters = 2 + ~~(rand() * 4); // 2-5 orbiters
    for (let i = 0; i < orbiters; i++) {
      const orbitR = center.bodyRadius * (1.8 + rand() * 2.2);
      const angle = rand() * Math.PI * 2;
      const orbiter = generateBody(seed * 31 + (i + 1) * 17, 0.25 + rand() * 0.35);
      bodies.push({
        body: orbiter,
        ox: Math.cos(angle) * orbitR,
        oy: Math.sin(angle) * orbitR,
        oz: (rand() - 0.5) * orbitR * 0.3,
        orbitAngle: angle,
        orbitSpeed: 0.001 + rand() * 0.003,
        orbitRadius: orbitR,
      });
    }
  } else if (fRoll < 0.72) {
    // Binary — two similar sized somas
    formation = 'binary';
    const dist = 30 + rand() * 30;
    const a = generateBody(seed * 31, 0.8 + rand() * 0.4);
    const b = generateBody(seed * 37, 0.7 + rand() * 0.4);
    const angle = rand() * Math.PI * 2;
    bodies = [
      { body: a, ox: -Math.cos(angle) * dist / 2, oy: -Math.sin(angle) * dist / 2, oz: 0, orbitAngle: angle, orbitSpeed: 0.002, orbitRadius: dist / 2 },
      { body: b, ox: Math.cos(angle) * dist / 2, oy: Math.sin(angle) * dist / 2, oz: 0, orbitAngle: angle + Math.PI, orbitSpeed: 0.002, orbitRadius: dist / 2 },
    ];
  } else if (fRoll < 0.86) {
    // Swarm — many tiny somas, loosely bound
    formation = 'swarm';
    const count = 4 + ~~(rand() * 6); // 4-9
    for (let i = 0; i < count; i++) {
      const b = generateBody(seed * 31 + i * 13, 0.2 + rand() * 0.3);
      const angle = rand() * Math.PI * 2;
      const dist = 15 + rand() * 50;
      bodies.push({
        body: b,
        ox: Math.cos(angle) * dist,
        oy: Math.sin(angle) * dist,
        oz: (rand() - 0.5) * 30,
        orbitAngle: angle,
        orbitSpeed: 0.0005 + rand() * 0.002,
        orbitRadius: dist,
      });
    }
  } else {
    // Constellation — line/arc of mid-size somas
    formation = 'constellation';
    const count = 3 + ~~(rand() * 3);
    const baseAngle = rand() * Math.PI;
    const curve = (rand() - 0.5) * 0.5; // slight arc
    for (let i = 0; i < count; i++) {
      const t = (i - count / 2) * 40;
      const b = generateBody(seed * 31 + i * 17, 0.4 + rand() * 0.5);
      bodies.push({
        body: b,
        ox: Math.cos(baseAngle + curve * i) * t + (rand() - 0.5) * 12,
        oy: Math.sin(baseAngle + curve * i) * t + (rand() - 0.5) * 12,
        oz: (rand() - 0.5) * 20,
        orbitAngle: 0,
        orbitSpeed: 0,
        orbitRadius: 0,
      });
    }
  }

  const mass = bodies.reduce((sum, b) => sum + b.body.bodyRadius, 0);
  return { wx, wy, wz, mass, bodies, formation };
}

// ═══════════════════════════════════════════════════════════════
// RENDERER — LOD-based soma drawing
// ═══════════════════════════════════════════════════════════════

// LOD thresholds (projected radius in px)
const LOD_DOT = 3;      // below: single colored dot
const LOD_BLOB = 7;     // below: circle with gradient
const LOD_EYES = 14;    // below: body + eyes
// above: full render (mouth, moons, specials)

function drawSoma(ctx: CanvasRenderingContext2D, body: SomaBody, x: number, y: number, projR: number, time: number) {
  if (projR < 0.5) return;

  const h = body.bodyHue, s = body.bodySat, l = body.bodyLight;

  // LOD: DOT
  if (projR < LOD_DOT) {
    ctx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.8, projR), 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // LOD: BLOB
  if (projR < LOD_BLOB) {
    const g = ctx.createRadialGradient(x - projR * 0.2, y - projR * 0.25, projR * 0.1, x, y, projR);
    g.addColorStop(0, `hsl(${h}, ${s}%, ${l + 8}%)`);
    g.addColorStop(1, `hsl(${h}, ${s}%, ${l - 10}%)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, projR, 0, Math.PI * 2);
    ctx.fill();
    // tiny eye dots
    if (projR > 4) {
      const es = projR * 0.3;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x - es, y - projR * 0.05, projR * 0.15, 0, Math.PI * 2);
      ctx.arc(x + es, y - projR * 0.05, projR * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  ctx.save();
  const scale = projR / body.bodyRadius;

  // Glow (rare/legendary)
  if (body.hasGlow && projR > 10) {
    const glow = ctx.createRadialGradient(x, y, projR * 0.8, x, y, projR * 2.5);
    glow.addColorStop(0, `hsla(${body.glowHue}, 60%, 65%, 0.12)`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, projR * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Halo
  if (body.hasHalo && projR > 12) {
    ctx.strokeStyle = `hsla(${h + 40}, 50%, 70%, 0.25)`;
    ctx.lineWidth = Math.max(0.8, 1.5 * scale);
    ctx.beginPath();
    ctx.arc(x, y, projR * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Rings
  if (body.hasRings && projR > 12) {
    ctx.strokeStyle = `hsla(${h + 20}, 40%, 65%, 0.35)`;
    ctx.lineWidth = Math.max(0.8, 2 * scale);
    ctx.beginPath();
    ctx.ellipse(x, y, projR * 1.8, projR * 0.4, 0.3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Moons behind
  if (projR >= LOD_EYES) {
    for (const moon of body.moons) {
      const ma = moon.angle + time * moon.speed;
      if (Math.sin(ma) > 0) drawMoon(ctx, moon, ma, x, y, scale);
    }
  }

  // Body sphere
  const bg = ctx.createRadialGradient(x - projR * 0.2, y - projR * 0.25, projR * 0.1, x, y, projR);
  if (body.isInverted) {
    bg.addColorStop(0, `hsl(${h + 180}, ${s}%, ${90 - l}%)`);
    bg.addColorStop(1, `hsl(${h + 180}, ${s}%, ${70 - l}%)`);
  } else {
    bg.addColorStop(0, `hsl(${h}, ${s}%, ${l + 8}%)`);
    bg.addColorStop(1, `hsl(${h}, ${s}%, ${l - 10}%)`);
  }
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(x, y, projR, 0, Math.PI * 2);
  ctx.fill();

  // Specular
  if (projR > 8) {
    const sp = ctx.createRadialGradient(x - projR * 0.3, y - projR * 0.3, 0, x - projR * 0.3, y - projR * 0.3, projR * 0.4);
    sp.addColorStop(0, 'rgba(255,255,255,0.22)');
    sp.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sp;
    ctx.beginPath();
    ctx.arc(x - projR * 0.3, y - projR * 0.3, projR * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cosmic pattern (legendary)
  if (body.cosmicPattern && projR > 14) {
    ctx.globalAlpha = 0.15;
    const pr = mulberry32(body.seed * 97);
    for (let i = 0; i < 8; i++) {
      const px = x + (pr() - 0.5) * projR * 1.4;
      const py = y + (pr() - 0.5) * projR * 1.4;
      const cr = pr() * projR * 0.15 + 1;
      const dx = px - x, dy = py - y;
      if (dx * dx + dy * dy < projR * projR) {
        ctx.fillStyle = `hsl(${pr() * 360}, 60%, 75%)`;
        ctx.beginPath();
        ctx.arc(px, py, cr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // Eyes
  if (projR >= LOD_EYES) {
    const er = body.eyeRadius * scale;
    const es = body.eyeSpacing * scale;
    const eyeY = y - projR * 0.05;
    drawEye(ctx, x - es, eyeY, er, body, false);
    drawEye(ctx, x + es, eyeY, er, body, true);
  } else {
    // Simple eye dots
    const es = projR * 0.3;
    ctx.fillStyle = body.isInverted ? '#1a1a2e' : '#fff';
    ctx.beginPath();
    ctx.arc(x - es, y - projR * 0.05, projR * 0.14, 0, Math.PI * 2);
    ctx.arc(x + es, y - projR * 0.05, projR * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mouth (full LOD only)
  if (body.hasMouth && projR >= LOD_EYES) {
    const my = y + projR * 0.3;
    const mw = projR * 0.3;
    ctx.strokeStyle = `hsla(${h}, ${s}%, ${l - 20}%, 0.5)`;
    ctx.lineWidth = Math.max(0.8, scale * 1.2);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - mw, my);
    ctx.quadraticCurveTo(x, my + mw * body.mouthCurve * 2, x + mw, my);
    ctx.stroke();
  }

  // Moons in front
  if (projR >= LOD_EYES) {
    for (const moon of body.moons) {
      const ma = moon.angle + time * moon.speed;
      if (Math.sin(ma) <= 0) drawMoon(ctx, moon, ma, x, y, scale);
    }
  }

  ctx.restore();
}

function drawEye(ctx: CanvasRenderingContext2D, ex: number, ey: number, er: number, body: SomaBody, isRight: boolean) {
  if (er < 1) return;
  ctx.fillStyle = body.isInverted ? '#1a1a2e' : '#ffffff';
  ctx.beginPath();
  switch (body.eyeShape) {
    case 'wide': ctx.ellipse(ex, ey, er * 1.3, er, 0, 0, Math.PI * 2); break;
    case 'narrow': ctx.ellipse(ex, ey, er * 0.9, er * 0.6, 0, 0, Math.PI * 2); break;
    case 'dot': ctx.arc(ex, ey, er * 0.6, 0, Math.PI * 2); break;
    default: ctx.arc(ex, ey, er, 0, Math.PI * 2);
  }
  ctx.fill();

  // Pupil
  const pr = er * body.pupilSize;
  const pdx = er * body.pupilDirX, pdy = er * body.pupilDirY;
  if (body.heterochromia && isRight) {
    ctx.fillStyle = body.isInverted ? `hsl(${body.rightEyeHue}, 70%, 70%)` : `hsl(${body.rightEyeHue}, 50%, 25%)`;
  } else {
    ctx.fillStyle = body.isInverted ? '#aabbcc' : '#12202e';
  }
  ctx.beginPath();
  ctx.arc(ex + pdx, ey + pdy, pr, 0, Math.PI * 2);
  ctx.fill();

  // Catchlight
  if (er > 2.5) {
    ctx.fillStyle = body.isInverted ? 'rgba(100,150,200,0.6)' : 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(ex + pdx - er * 0.2, ey + pdy - er * 0.2, Math.max(0.6, er * 0.18), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMoon(
  ctx: CanvasRenderingContext2D,
  moon: { dist: number; radius: number; hue: number; sat: number },
  angle: number, bx: number, by: number, scale: number
) {
  const mx = bx + Math.cos(angle) * moon.dist * scale;
  const my = by + Math.sin(angle) * moon.dist * scale;
  const mr = moon.radius * scale;
  if (mr < 0.8) {
    ctx.fillStyle = `hsl(${moon.hue}, ${moon.sat}%, 58%)`;
    ctx.beginPath();
    ctx.arc(mx, my, 0.8, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const g = ctx.createRadialGradient(mx - mr * 0.2, my - mr * 0.2, 0, mx, my, mr);
  g.addColorStop(0, `hsl(${moon.hue}, ${moon.sat}%, 65%)`);
  g.addColorStop(1, `hsl(${moon.hue}, ${moon.sat}%, 42%)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();
}

// ═══════════════════════════════════════════════════════════════
// CLUSTER GRAVITY GLOW — visual gravity well around clusters
// ═══════════════════════════════════════════════════════════════
function drawGravityWell(ctx: CanvasRenderingContext2D, x: number, y: number, mass: number, projScale: number) {
  const glowR = mass * projScale * 0.8;
  if (glowR < 5) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, glowR);
  g.addColorStop(0, 'rgba(100, 148, 190, 0.04)');
  g.addColorStop(0.4, 'rgba(100, 148, 190, 0.015)');
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, glowR, 0, Math.PI * 2);
  ctx.fill();
}

// ═══════════════════════════════════════════════════════════════
// BACKGROUND STARS — simple, efficient, parallax-distant
// ═══════════════════════════════════════════════════════════════
function initBgStars(count: number) {
  const rand = mulberry32(42);
  const stars: { x: number; y: number; r: number; a: number; twinkleOff: number }[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand(),
      y: rand(),
      r: 0.3 + rand() * 1.2,
      a: 0.15 + rand() * 0.5,
      twinkleOff: rand() * Math.PI * 2,
    });
  }
  return stars;
}

// ═══════════════════════════════════════════════════════════════
// RARITY
// ═══════════════════════════════════════════════════════════════
const RARITY_CFG: Record<Rarity, { color: string; bg: string; label: string }> = {
  common: { color: '#8494aa', bg: 'rgba(132,148,170,0.15)', label: 'Common' },
  uncommon: { color: '#6ec47a', bg: 'rgba(110,196,122,0.15)', label: 'Uncommon' },
  rare: { color: '#7ba8e8', bg: 'rgba(123,168,232,0.15)', label: 'Rare' },
  legendary: { color: '#e8b84a', bg: 'rgba(232,184,74,0.2)', label: '★ Legendary' },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

// Projection constants
const FOCAL = 600;         // focal length — controls FOV
const Z_NEAR = 10;         // near clip
const Z_FAR = 5500;        // far clip — extended for fade-in room
const FWD_SPEED = 0.6;     // constant forward drift
const STEER_STRENGTH = 3.0;// how fast mouse steers
const FADE_IN_DUR = 2.5;   // seconds for a cluster to fully appear

interface HoveredInfo {
  body: SomaBody;
  screenX: number;
  screenY: number;
}

interface SomaVerseProps {
  fullPage?: boolean;
}

export default function SomaVerse({ fullPage = false }: SomaVerseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<HoveredInfo | null>(null);

  // Shooting star type
  interface Shooter {
    x: number; y: number;
    vx: number; vy: number;
    life: number; decay: number;
    len: number; r: number; g: number; b: number;
  }

  const stateRef = useRef({
    w: 0, h: 0, dpr: 1,
    // Camera in world space
    camX: 0, camY: 0, camZ: 0,
    // Velocity
    vx: 0, vy: 0, vz: FWD_SPEED,
    // Target velocity from mouse
    tvx: 0, tvy: 0,
    // Mouse
    mouseNX: 0.5, mouseNY: 0.5, // normalized 0-1
    mouseIn: false,
    mouseScreenX: 0, mouseScreenY: 0,
    // Generation cache
    clusterCache: new Map<string, SomaCluster | null>(),
    // Fade-in: track when each cluster was first seen
    firstSeen: new Map<string, number>(),
    bgStars: initBgStars(400),
    time: 0,
    // Zoom
    zoom: 1.0, tzoom: 1.0,
    // Hover diff — avoid re-render when unchanged
    lastHoveredSeed: -1,
    // Shooting stars
    shooters: [] as Shooter[],
    nextShooter: 3 + Math.random() * 8,
    // Cached vignette
    vignetteCanvas: null as HTMLCanvasElement | null,
    vignetteW: 0, vignetteH: 0,
    // Audio engine
    audio: new SomaAudioEngine(),
  });

  // Expose audio toggle via window events (cross-island communication)
  useEffect(() => {
    const handleToggle = async () => {
      const s = stateRef.current;
      const nowEnabled = await s.audio.toggle();
      window.dispatchEvent(new CustomEvent('soma-audio-state', { detail: { enabled: nowEnabled } }));
    };
    window.addEventListener('soma-audio-toggle', handleToggle);
    return () => window.removeEventListener('soma-audio-toggle', handleToggle);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = stateRef.current;
    s.dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Random start position for variety each visit
    const startRand = mulberry32(Date.now());
    s.camX = startRand() * 20000 - 10000;
    s.camY = startRand() * 20000 - 10000;
    s.camZ = startRand() * 20000 - 10000;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      s.w = rect.width;
      s.h = rect.height;
      canvas.width = s.w * s.dpr;
      canvas.height = s.h * s.dpr;
      canvas.style.width = `${s.w}px`;
      canvas.style.height = `${s.h}px`;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Input
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      s.mouseNX = (e.clientX - rect.left) / s.w;
      s.mouseNY = (e.clientY - rect.top) / s.h;
      s.mouseScreenX = e.clientX - rect.left;
      s.mouseScreenY = e.clientY - rect.top;
      // Steering: mouse offset from center → velocity
      // Quadratic ramp — center is dead, edges are fast
      const dx = (s.mouseNX - 0.5) * 2; // -1 to 1
      const dy = (s.mouseNY - 0.5) * 2;
      s.tvx = dx * Math.abs(dx) * STEER_STRENGTH;
      s.tvy = dy * Math.abs(dy) * STEER_STRENGTH;
    };
    const onMouseEnter = () => { s.mouseIn = true; };
    const onMouseLeave = () => {
      s.mouseIn = false;
      s.tvx = 0; s.tvy = 0;
      setHovered(null);
    };
    const onWheel = (e: WheelEvent) => {
      s.tzoom = Math.max(0.5, Math.min(2.5, s.tzoom - e.deltaY * 0.001));
    };
    const onClick = () => {
      if (s.lastHoveredSeed >= 0) {
        window.location.href = '/verse/';
      }
    };
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseenter', onMouseEnter);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('wheel', onWheel, { passive: true });

    // Touch steering
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      s.mouseNX = (t.clientX - rect.left) / s.w;
      s.mouseNY = (t.clientY - rect.top) / s.h;
      s.mouseScreenX = t.clientX - rect.left;
      s.mouseScreenY = t.clientY - rect.top;
      s.mouseIn = true;
      const dx = (s.mouseNX - 0.5) * 2;
      const dy = (s.mouseNY - 0.5) * 2;
      s.tvx = dx * Math.abs(dx) * STEER_STRENGTH;
      s.tvy = dy * Math.abs(dy) * STEER_STRENGTH;
    };
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });

    // Get or generate cluster — with distance-based pruning
    const getCluster = (cx: number, cy: number, cz: number): SomaCluster | null => {
      const key = `${cx},${cy},${cz}`;
      if (s.clusterCache.has(key)) return s.clusterCache.get(key)!;
      const cluster = generateCluster(cx, cy, cz);
      s.clusterCache.set(key, cluster);
      // Mark first-seen time for fade-in
      if (cluster && !s.firstSeen.has(key)) {
        s.firstSeen.set(key, s.time);
      }
      // Distance-based pruning
      if (s.clusterCache.size > 500) {
        const camCX = Math.floor(s.camX / CELL3);
        const camCY = Math.floor(s.camY / CELL3);
        const camCZ = Math.floor(s.camZ / CELL3);
        for (const [k] of s.clusterCache) {
          if (s.clusterCache.size <= 300) break;
          const parts = k.split(',');
          const dx = +parts[0] - camCX, dy = +parts[1] - camCY, dz = +parts[2] - camCZ;
          if (dx * dx + dy * dy + dz * dz > 64) { // ~8 cells away
            s.clusterCache.delete(k);
            s.firstSeen.delete(k);
          }
        }
      }
      return cluster;
    };

    // Nebula glow — drawn once offscreen, composited with shift
    let nebulaCanvas: HTMLCanvasElement | null = null;
    const buildNebula = () => {
      nebulaCanvas = document.createElement('canvas');
      nebulaCanvas.width = s.w;
      nebulaCanvas.height = s.h;
      const nc = nebulaCanvas.getContext('2d')!;
      const rand = mulberry32(7777);
      for (let i = 0; i < 4; i++) {
        const bx = rand() * s.w;
        const by = rand() * s.h;
        const br = Math.max(s.w, s.h) * (0.15 + rand() * 0.2);
        const g = nc.createRadialGradient(bx, by, 0, bx, by, br);
        const hue = 200 + rand() * 60;
        g.addColorStop(0, `hsla(${hue}, 50%, 40%, 0.035)`);
        g.addColorStop(0.5, `hsla(${hue}, 40%, 30%, 0.012)`);
        g.addColorStop(1, 'transparent');
        nc.fillStyle = g;
        nc.beginPath();
        nc.arc(bx, by, br, 0, Math.PI * 2);
        nc.fill();
      }
    };
    buildNebula();

    let raf: number;
    let lastT = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastT) / 1000, 0.05); // cap at 50ms
      lastT = now;
      s.time += dt;

      // Smooth velocity interpolation
      s.vx += (s.tvx - s.vx) * 0.06;
      s.vy += (s.tvy - s.vy) * 0.06;
      s.zoom += (s.tzoom - s.zoom) * 0.05;

      // Move camera
      const speed = dt * 60; // normalize to ~60fps
      s.camX += s.vx * speed;
      s.camY += s.vy * speed;
      s.camZ += s.vz * s.zoom * speed;

      const focal = FOCAL * s.zoom;
      const halfW = s.w / 2;
      const halfH = s.h / 2;

      // ── Clear ──
      ctx.fillStyle = '#050810';
      ctx.fillRect(0, 0, s.w, s.h);

      // ── Nebula (subtle shift with camera) ──
      if (nebulaCanvas) {
        const nShiftX = (Math.sin(s.camX * 0.0001) * 20) % s.w;
        const nShiftY = (Math.cos(s.camY * 0.0001) * 15) % s.h;
        ctx.globalAlpha = 0.7;
        ctx.drawImage(nebulaCanvas, nShiftX, nShiftY);
        ctx.drawImage(nebulaCanvas, nShiftX - s.w, nShiftY);
        ctx.globalAlpha = 1;
      }

      // ── Background stars (wrap in screen space, respond to all axes) ──
      for (const star of s.bgStars) {
        const sx = ((star.x * s.w - s.camX * 0.02 + s.camZ * 0.005) % s.w + s.w) % s.w;
        const sy = ((star.y * s.h - s.camY * 0.02 + s.camZ * 0.003) % s.h + s.h) % s.h;
        const twinkle = 0.6 + 0.4 * Math.sin(s.time * 1.5 + star.twinkleOff);
        ctx.globalAlpha = star.a * twinkle;
        ctx.fillStyle = 'rgba(200, 215, 240, 0.8)';
        ctx.beginPath();
        ctx.arc(sx, sy, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ── Shooting stars ──
      s.nextShooter -= dt;
      if (s.nextShooter <= 0) {
        const angle = (Math.PI / 6) + Math.random() * (Math.PI / 4);
        const spd = 6 + Math.random() * 12;
        s.shooters.push({
          x: Math.random() * s.w,
          y: Math.random() * s.h * 0.5,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          life: 1,
          decay: 0.012 + Math.random() * 0.015,
          len: 50 + Math.random() * 100,
          r: 180 + ~~(Math.random() * 60),
          g: 200 + ~~(Math.random() * 40),
          b: 255,
        });
        s.nextShooter = 5 + Math.random() * 15;
      }
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = s.shooters.length - 1; i >= 0; i--) {
        const sh = s.shooters[i];
        sh.x += sh.vx; sh.y += sh.vy; sh.life -= sh.decay;
        if (sh.life <= 0 || sh.x > s.w + 200 || sh.y > s.h + 200) {
          s.shooters.splice(i, 1);
          continue;
        }
        const tail = ctx.createLinearGradient(
          sh.x - sh.vx * (sh.len / 10), sh.y - sh.vy * (sh.len / 10), sh.x, sh.y
        );
        tail.addColorStop(0, 'rgba(0,0,0,0)');
        tail.addColorStop(1, `rgba(${sh.r},${sh.g},${sh.b},${(sh.life * 0.7).toFixed(3)})`);
        ctx.strokeStyle = tail;
        ctx.lineWidth = 1.2 * sh.life;
        ctx.beginPath();
        ctx.moveTo(sh.x - sh.vx * (sh.len / 10), sh.y - sh.vy * (sh.len / 10));
        ctx.lineTo(sh.x, sh.y);
        ctx.stroke();
        // Head glow
        const hg = ctx.createRadialGradient(sh.x, sh.y, 0, sh.x, sh.y, 4);
        hg.addColorStop(0, `rgba(255,255,255,${sh.life.toFixed(3)})`);
        hg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // ── Determine visible 3D cells ──
      const cellRangeXY = 4;
      const cellRangeFwd = 7; // look further ahead for fade-in room
      const camCX = Math.floor(s.camX / CELL3);
      const camCY = Math.floor(s.camY / CELL3);
      const camCZ = Math.floor(s.camZ / CELL3);

      // Collect and project all visible somas + clusters for audio
      interface Projected {
        body: SomaBody;
        sx: number;
        sy: number;
        projR: number;
        z: number;
        fadeAlpha: number;
      }
      const projected: Projected[] = [];

      // Cluster-level tracking for audio channels
      interface ClusterAudioInfo {
        seed: number;
        distance: number;
        screenX: number;
        screenY: number;
        zCell: number;
        mantraWords: string[]; // from primary body
      }
      const audioClusters: ClusterAudioInfo[] = [];

      for (let dz = -1; dz <= cellRangeFwd; dz++) {
        for (let dy = -cellRangeXY; dy <= cellRangeXY; dy++) {
          for (let dx = -cellRangeXY; dx <= cellRangeXY; dx++) {
            const cx = camCX + dx;
            const cy = camCY + dy;
            const cz = camCZ + dz;
            const cluster = getCluster(cx, cy, cz);
            if (!cluster) continue;

            const clusterKey = `${cx},${cy},${cz}`;

            // Cluster center relative to camera
            const relX = cluster.wx - s.camX;
            const relY = cluster.wy - s.camY;
            const relZ = cluster.wz - s.camZ;

            // Quick cull: behind camera or too far
            if (relZ < Z_NEAR || relZ > Z_FAR) continue;

            // Fade-in alpha — smooth entrance over FADE_IN_DUR seconds
            const seen = s.firstSeen.get(clusterKey);
            const fadeAlpha = seen !== undefined
              ? Math.min(1, (s.time - seen) / FADE_IN_DUR)
              : 1;
            // Skip nearly invisible clusters
            if (fadeAlpha < 0.01) continue;

            // Project cluster center to check if on screen at all
            const cScale = focal / relZ;
            const csx = halfW + relX * cScale;
            const csy = halfH + relY * cScale;
            const clusterScreenR = cluster.mass * cScale;

            // Generous cull
            if (csx < -clusterScreenR - 100 || csx > s.w + clusterScreenR + 100) continue;
            if (csy < -clusterScreenR - 100 || csy > s.h + clusterScreenR + 100) continue;

            // Track cluster for audio (primary body provides the mantra)
            audioClusters.push({
              seed: hashCoord3(cx, cy, cz),
              distance: relZ,
              screenX: csx,
              screenY: csy,
              zCell: cz,
              mantraWords: cluster.bodies[0]?.body.mantraWords || [],
            });

            // Draw gravity well (with fade)
            if (cluster.formation === 'gravity' && clusterScreenR > 8) {
              ctx.globalAlpha = fadeAlpha;
              drawGravityWell(ctx, csx, csy, cluster.mass, cScale);
              ctx.globalAlpha = 1;
            }

            // Project each body
            for (const cb of cluster.bodies) {
              let ox = cb.ox, oy = cb.oy, oz = cb.oz;
              if (cb.orbitRadius > 0 && cb.orbitSpeed > 0) {
                const a = cb.orbitAngle + s.time * cb.orbitSpeed;
                ox = Math.cos(a) * cb.orbitRadius;
                oy = Math.sin(a) * cb.orbitRadius;
                oz = cb.oz * Math.cos(a * 0.7);
              }

              const bRelZ = relZ + oz;
              if (bRelZ < Z_NEAR) continue;

              const bScale = focal / bRelZ;
              const bsx = halfW + (relX + ox) * bScale;
              const bsy = halfH + (relY + oy) * bScale;
              const projR = cb.body.bodyRadius * bScale;

              // Screen cull
              if (bsx < -projR - 20 || bsx > s.w + projR + 20) continue;
              if (bsy < -projR - 20 || bsy > s.h + projR + 20) continue;

              const floatY = Math.sin(s.time * 0.8 + cb.body.seed * 0.1) * 2 * bScale;

              projected.push({
                body: cb.body,
                sx: bsx,
                sy: bsy + floatY,
                projR,
                z: bRelZ,
                fadeAlpha,
              });
            }
          }
        }
      }

      // Sort far-to-near (painter's order)
      projected.sort((a, b) => b.z - a.z);

      // Draw all somas
      let closestHover: HoveredInfo | null = null;
      let closestDist = 40;

      for (const p of projected) {
        // Exponential depth fog — atmospheric, not linear
        const zNorm = p.z / Z_FAR;
        const depthAlpha = Math.max(0.05, Math.exp(-2.5 * zNorm * zNorm));
        // Combine depth + fade-in
        ctx.globalAlpha = depthAlpha * p.fadeAlpha;

        drawSoma(ctx, p.body, p.sx, p.sy, p.projR, s.time);

        // Hover detection (only for visible, nearby somas)
        if (s.mouseIn && p.projR > 3 && p.fadeAlpha > 0.5) {
          const ddx = s.mouseScreenX - p.sx;
          const ddy = s.mouseScreenY - p.sy;
          const dist = Math.sqrt(ddx * ddx + ddy * ddy);
          const hitR = Math.max(12, p.projR + 5);
          if (dist < hitR && dist < closestDist) {
            closestDist = dist;
            closestHover = { body: p.body, screenX: p.sx, screenY: p.sy };
          }
        }
      }
      ctx.globalAlpha = 1;

      // ── Vignette (cached offscreen) ──
      if (!s.vignetteCanvas || s.vignetteW !== s.w || s.vignetteH !== s.h) {
        s.vignetteCanvas = document.createElement('canvas');
        s.vignetteCanvas.width = s.w;
        s.vignetteCanvas.height = s.h;
        const vc = s.vignetteCanvas.getContext('2d')!;
        const vg = vc.createRadialGradient(halfW, halfH, Math.min(halfW, halfH) * 0.5, halfW, halfH, Math.max(s.w, s.h) * 0.7);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(3,5,10,0.5)');
        vc.fillStyle = vg;
        vc.fillRect(0, 0, s.w, s.h);
        s.vignetteW = s.w;
        s.vignetteH = s.h;
      }
      ctx.drawImage(s.vignetteCanvas, 0, 0);

      // ── Hover update (diff to avoid unnecessary React re-renders) ──
      const newSeed = closestHover ? closestHover.body.seed : -1;
      if (newSeed !== s.lastHoveredSeed) {
        s.lastHoveredSeed = newSeed;
        setHovered(closestHover);
      }

      // ── Audio: feed cluster proximity to the engine ──
      if (s.audio.enabled && audioClusters.length > 0) {
        // Compute screen-space distance from mouse to each cluster center
        // Closer to mouse cursor = louder (you're "tuning in")
        const mx = s.mouseIn ? s.mouseScreenX : halfW;
        const my = s.mouseIn ? s.mouseScreenY : halfH;
        const clusterChannels = audioClusters.map(c => {
          const sdx = c.screenX - mx;
          const sdy = c.screenY - my;
          const screenDist = Math.sqrt(sdx * sdx + sdy * sdy);
          const blended = screenDist * 3 + c.distance * 0.5;
          return { seed: c.seed, distance: blended, zCell: c.zCell, mantraWords: c.mantraWords };
        });
        clusterChannels.sort((a, b) => a.distance - b.distance);
        s.audio.update(clusterChannels);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    const handleResize = () => { resize(); buildNebula(); };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(raf);
      s.audio.destroy();
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseenter', onMouseEnter);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  // ── Hover card ──
  const cardStyle = hovered ? (() => {
    const cardW = 220;
    const gap = 20;
    const left = hovered.screenX > (stateRef.current.w / 2)
      ? hovered.screenX - cardW - gap
      : hovered.screenX + gap;
    const top = Math.max(12, Math.min(hovered.screenY - 40, stateRef.current.h - 180));
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

  const rc = hovered ? RARITY_CFG[hovered.body.rarity] : null;

  return (
    <div
      ref={containerRef}
      style={{
        position: fullPage ? 'fixed' as const : 'relative' as const,
        inset: fullPage ? '0' : undefined,
        width: '100%',
        height: fullPage ? '100%' : '600px',
        overflow: 'hidden',
        borderRadius: fullPage ? undefined : 'var(--radius-lg, 12px)',
        border: fullPage ? undefined : '1px solid var(--border-subtle, rgba(132,148,170,0.12))',
        cursor: 'crosshair',
        zIndex: fullPage ? 0 : undefined,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />

      {hovered && cardStyle && rc && (
        <div style={{
          ...cardStyle,
          background: 'rgba(8, 12, 20, 0.92)',
          border: `1px solid ${rc.color}40`,
          borderRadius: '10px',
          padding: '14px 16px',
          backdropFilter: 'blur(12px)',
          boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 15px ${rc.color}15`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{
              fontFamily: 'var(--font-display, system-ui)',
              fontSize: '1rem', fontWeight: 600, color: '#e4eaf4',
            }}>
              {hovered.body.name}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '0.65rem', fontWeight: 600,
              color: rc.color, background: rc.bg,
              padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.03em',
            }}>
              {rc.label}
            </span>
          </div>
          <p style={{
            fontFamily: 'var(--font-display, system-ui)',
            fontSize: '0.8rem', color: 'rgba(200, 210, 225, 0.7)',
            lineHeight: 1.4, margin: '0 0 8px 0', fontStyle: 'italic',
          }}>
            {hovered.body.trait}
          </p>
          <div style={{
            display: 'flex', gap: '12px',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '0.65rem', color: 'rgba(132, 148, 170, 0.7)',
          }}>
            <span>{hovered.body.moons.length} moon{hovered.body.moons.length !== 1 ? 's' : ''}</span>
            <span>{hovered.body.eyeShape} eyes</span>
            {hovered.body.heterochromia && <span style={{ color: rc.color }}>hetero</span>}
            {hovered.body.hasRings && <span style={{ color: rc.color }}>ringed</span>}
          </div>
        </div>
      )}

      {!fullPage && (
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
          steer to explore · scroll to zoom · hover to identify
        </div>
      )}
    </div>
  );
}
