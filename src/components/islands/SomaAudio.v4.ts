/**
 * SomaAudio v4 — Cluster channels with word-based sequencing.
 *
 * Each CLUSTER is a channel. Mouse proximity selects which cluster
 * you're tuned into. Each cluster has a sentence — a sequence of
 * generated words. Each word maps to sound through its phonemes:
 *
 *   consonant onset → attack shape (plosive=sharp, nasal=soft, fricative=breathy)
 *   vowel body      → filter character (a=open, u=closed, i=bright)
 *   word length     → note duration
 *   spaces          → gaps/breath
 *
 * Clusters share an incremental BPM variable tied to their z-cell
 * position — as you fly forward through space, the tempo landscape
 * shifts. Nearby clusters at the same z-depth share a tempo family.
 *
 * Previous versions saved as .v1.ts, .v2.ts, .v3.ts
 */

// ═══════════════════════════════════════════════════════════════
// PRNG
// ═══════════════════════════════════════════════════════════════
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════
const PHI = (1 + Math.sqrt(5)) / 2;
const SQRT2 = Math.sqrt(2);
const RATIOS = [PHI, SQRT2, Math.PI / 2, Math.E / 2, Math.sqrt(3), 1 / PHI, SQRT2 / PHI];

const MAX_VOICES = 4;
const MAX_AUDIO_RANGE = 3500; // blended screen+z distance units
const MIN_GAIN = 0.0001;
const SCHEDULE_AHEAD = 0.25;
const SCHEDULE_INTERVAL = 80;

// ═══════════════════════════════════════════════════════════════
// PHONEME SYSTEM — words become sound
// ═══════════════════════════════════════════════════════════════

// Consonants grouped by sonic character
const PLOSIVES = ['b', 'd', 'g', 'k', 'p', 't'];       // sharp attack
const NASALS = ['m', 'n', 'ng'];                          // soft hum onset
const FRICATIVES = ['s', 'sh', 'f', 'h', 'z', 'v'];     // breathy/airy
const LIQUIDS = ['l', 'r', 'w', 'y'];                     // smooth glide
const ALL_ONSETS = [...PLOSIVES, ...NASALS, ...FRICATIVES, ...LIQUIDS, '']; // '' = vowel-start

// Vowels grouped by filter character
const OPEN_VOWELS = ['a', 'ah', 'aa'];     // wide open filter
const ROUND_VOWELS = ['oo', 'u', 'ou'];    // closed/round filter
const BRIGHT_VOWELS = ['ee', 'i', 'ei'];   // bright narrow filter
const MID_VOWELS = ['eh', 'o', 'uh'];      // medium
const ALL_VOWELS = [...OPEN_VOWELS, ...ROUND_VOWELS, ...BRIGHT_VOWELS, ...MID_VOWELS];

// Optional codas (endings)
const CODAS = ['', '', '', 'm', 'n', 'sh', 'l', 'r', 's', 'th', 'ng', ''];

interface Phoneme {
  onset: string;
  vowel: string;
  coda: string;
}

interface WordSound {
  word: string;
  syllables: Phoneme[];
  // Derived sonic params
  attack: number;      // onset sharpness (seconds)
  filterOpen: number;  // 0=closed, 1=open
  filterBright: number;// 0=dark, 1=bright
  duration: number;    // relative duration multiplier
  accent: number;      // volume 0.3-1.0
}

function generateWord(rand: () => number): WordSound {
  const syllableCount = 1 + ~~(rand() * 3); // 1-3 syllables
  const syllables: Phoneme[] = [];
  let word = '';

  for (let i = 0; i < syllableCount; i++) {
    const onset = ALL_ONSETS[~~(rand() * ALL_ONSETS.length)];
    const vowel = ALL_VOWELS[~~(rand() * ALL_VOWELS.length)];
    const coda = i === syllableCount - 1 ? CODAS[~~(rand() * CODAS.length)] : '';
    syllables.push({ onset, vowel, coda });
    word += onset + vowel + coda;
  }

  // Derive attack from first onset
  const firstOnset = syllables[0].onset;
  let attack: number;
  if (PLOSIVES.includes(firstOnset)) attack = 0.005 + rand() * 0.015;
  else if (FRICATIVES.includes(firstOnset)) attack = 0.02 + rand() * 0.04;
  else if (NASALS.includes(firstOnset)) attack = 0.04 + rand() * 0.08;
  else if (LIQUIDS.includes(firstOnset)) attack = 0.08 + rand() * 0.12;
  else attack = 0.03 + rand() * 0.06; // vowel start

  // Filter from dominant vowel
  const mainVowel = syllables[0].vowel;
  let filterOpen = 0.5, filterBright = 0.5;
  if (OPEN_VOWELS.includes(mainVowel)) { filterOpen = 0.8 + rand() * 0.2; filterBright = 0.3; }
  else if (ROUND_VOWELS.includes(mainVowel)) { filterOpen = 0.2 + rand() * 0.2; filterBright = 0.2; }
  else if (BRIGHT_VOWELS.includes(mainVowel)) { filterOpen = 0.5 + rand() * 0.2; filterBright = 0.8 + rand() * 0.2; }
  else { filterOpen = 0.4 + rand() * 0.3; filterBright = 0.4 + rand() * 0.3; }

  // Duration from word length
  const duration = 0.3 + syllableCount * 0.4 + rand() * 0.3;

  // Accent
  const accent = 0.35 + rand() * 0.65;

  return { word, syllables, attack, filterOpen, filterBright, duration, accent };
}

// ═══════════════════════════════════════════════════════════════
// SENTENCE — a cluster's voice pattern
// ═══════════════════════════════════════════════════════════════
interface Sentence {
  words: WordSound[];
  text: string;          // the readable sentence
  gapBetween: number;    // base gap between words (seconds)
}

function generateSentence(seed: number, rand: () => number): Sentence {
  const wordCount = 3 + ~~(rand() * 5); // 3-7 words
  const words: WordSound[] = [];

  for (let i = 0; i < wordCount; i++) {
    words.push(generateWord(rand));
  }

  const text = words.map(w => w.word).join(' ');
  const gapBetween = 0.08 + rand() * 0.25;

  return { words, text, gapBetween };
}

// ═══════════════════════════════════════════════════════════════
// INCREMENTAL BPM — clusters share tempo by z-depth
// ═══════════════════════════════════════════════════════════════
// z-cell index maps to a BPM offset. Every 4 z-cells, the base
// BPM shifts. This creates "tempo zones" as you fly forward.
// Within a zone, each cluster's seed adds personal variation.
function clusterBPM(zCell: number, seed: number): number {
  const rand = mulberry32(seed);
  // Base BPM from z-zone (groups of 4 cells)
  const zone = Math.floor(zCell / 4);
  // Use zone to walk through a BPM range: 25-140
  // Sine wave through zones so it's not monotonic
  const zonePhase = zone * 0.7; // arbitrary stride
  const zoneBPM = 82 + Math.sin(zonePhase) * 40 + Math.cos(zonePhase * PHI) * 18;
  // Per-cluster variation: ±15 BPM
  const personal = (rand() - 0.5) * 30;
  return Math.max(20, Math.min(160, zoneBPM + personal));
}

// ═══════════════════════════════════════════════════════════════
// VOICE
// ═══════════════════════════════════════════════════════════════
interface Voice {
  seed: number;
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  osc3: OscillatorNode;
  oscGain1: GainNode;
  oscGain2: GainNode;
  oscGain3: GainNode;
  envGain: GainNode;
  masterGain: GainNode;
  filter: BiquadFilterNode;
  swellLfo: OscillatorNode;
  swellGain: GainNode;
  baseFreq: number;
  filterBaseOrig: number;
  filterBase: number;
  sentence: Sentence;
  bpm: number;
  // Scheduler
  nextNoteTime: number;
  currentWord: number;
  schedulerTimer: number;
  // State
  targetGain: number;
  currentGain: number;
  active: boolean;
}

// ═══════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════
export class SomaAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private voices: Voice[] = [];
  private _enabled = false;
  private _volume = 0.35;

  get enabled() { return this._enabled; }

  async init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') await this.ctx.resume();

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -20;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.15;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this._volume;
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    this._enabled = true;
  }

  async toggle(): Promise<boolean> {
    if (!this.ctx) { await this.init(); return this._enabled; }
    this._enabled = !this._enabled;
    if (this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(this._enabled ? this._volume : 0, now + 0.5);
    }
    if (!this._enabled) for (const v of this.voices) v.targetGain = 0;
    return this._enabled;
  }

  setVolume(vol: number) {
    this._volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && this._enabled)
      this.masterGain.gain.setTargetAtTime(this._volume, this.ctx.currentTime, 0.1);
  }

  /**
   * Create a voice for a cluster.
   *
   * Signal: osc1+osc2+osc3 → envGain (word envelope) → filter → masterGain → compressor
   *         swellLfo → swellGain → masterGain.gain
   */
  private createVoice(seed: number, zCell: number): Voice {
    const ctx = this.ctx!;
    const rand = mulberry32(seed);

    // ── Oscillator params from seed ──
    const freqBase = 40 + rand() * 60;
    const baseFreq = freqBase * Math.pow(2, ~~(rand() * 2));
    const ratio2 = RATIOS[~~(rand() * RATIOS.length)] + (rand() - 0.5) * 0.05;
    const ratio3 = RATIOS[~~(rand() * RATIOS.length)] * (rand() > 0.5 ? 0.5 : 0.25);

    // Custom waveforms
    const hc = 12;
    const real1 = new Float32Array(hc + 1), imag1 = new Float32Array(hc + 1);
    const real2 = new Float32Array(hc + 1), imag2 = new Float32Array(hc + 1);
    for (let i = 1; i <= hc; i++) {
      const d = 1 / (i * i);
      real1[i] = d * (rand() - 0.5) * 2 * (rand() > 0.3 ? 1 : 0);
      imag1[i] = d * (rand() - 0.5) * 1.5;
      real2[i] = d * (rand() - 0.5) * 2 * (rand() > 0.4 ? 1 : 0);
      imag2[i] = d * (rand() - 0.5) * 1.2;
    }

    const wave1 = ctx.createPeriodicWave(real1, imag1, { disableNormalization: false });
    const wave2 = ctx.createPeriodicWave(real2, imag2, { disableNormalization: false });

    const osc1 = ctx.createOscillator(); osc1.setPeriodicWave(wave1); osc1.frequency.value = baseFreq;
    const osc2 = ctx.createOscillator(); osc2.setPeriodicWave(wave2); osc2.frequency.value = baseFreq * ratio2;
    const osc3 = ctx.createOscillator(); osc3.type = 'sine'; osc3.frequency.value = baseFreq * ratio3;

    const mix1 = 0.3 + rand() * 0.3;
    const mix2 = 0.15 + rand() * 0.25;
    const mix3 = 0.1 + rand() * 0.15;
    const oscGain1 = ctx.createGain(); oscGain1.gain.value = mix1;
    const oscGain2 = ctx.createGain(); oscGain2.gain.value = mix2;
    const oscGain3 = ctx.createGain(); oscGain3.gain.value = mix3;

    const envGain = ctx.createGain(); envGain.gain.value = 0;

    const filterBaseOrig = 150 + rand() * 600;
    const filterQ = 0.5 + rand() * 6;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterBaseOrig;
    filter.Q.value = filterQ;

    // Macro swell
    const swellPeriod = 20 + rand() * 100;
    const swellLfo = ctx.createOscillator(); swellLfo.type = 'sine'; swellLfo.frequency.value = 1 / swellPeriod;
    const swellGain = ctx.createGain(); swellGain.gain.value = 0.15 + rand() * 0.3;

    const masterGain = ctx.createGain(); masterGain.gain.value = 0;

    // Routing
    osc1.connect(oscGain1); osc2.connect(oscGain2); osc3.connect(oscGain3);
    oscGain1.connect(envGain); oscGain2.connect(envGain); oscGain3.connect(envGain);
    envGain.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(this.compressor!);
    swellLfo.connect(swellGain);
    swellGain.connect(masterGain.gain);

    const now = ctx.currentTime;
    osc1.start(now); osc2.start(now); osc3.start(now); swellLfo.start(now);

    // ── Generate this cluster's sentence ──
    const sentenceRand = mulberry32(seed * 7919);
    const sentence = generateSentence(seed, sentenceRand);

    // ── BPM from z-cell + seed (incremental) ──
    const bpm = clusterBPM(zCell, seed);

    const voice: Voice = {
      seed,
      osc1, osc2, osc3,
      oscGain1, oscGain2, oscGain3,
      envGain, masterGain, filter,
      swellLfo, swellGain,
      baseFreq,
      filterBaseOrig,
      filterBase: filterBaseOrig,
      sentence,
      bpm,
      nextNoteTime: now + 0.05,
      currentWord: 0,
      schedulerTimer: 0,
      targetGain: 0,
      currentGain: 0,
      active: true,
    };

    this.startScheduler(voice);
    return voice;
  }

  /**
   * Lookahead scheduler — plays the sentence as a looping sequence.
   * Each word becomes a note with phoneme-derived parameters.
   */
  private startScheduler(voice: Voice) {
    const ctx = this.ctx!;
    const beatDur = 60 / voice.bpm;

    const schedule = () => {
      if (!voice.active || !this.ctx) return;

      while (voice.nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD) {
        const word = voice.sentence.words[voice.currentWord];
        const t = voice.nextNoteTime;

        // Note duration scaled by BPM
        const noteDur = word.duration * beatDur;
        const release = Math.min(noteDur * 0.4, 0.3);

        // ── Gain envelope: attack shape from consonant onset ──
        voice.envGain.gain.setValueAtTime(0, t);
        voice.envGain.gain.linearRampToValueAtTime(word.accent, t + word.attack);
        // Sustain, then release
        const sustainEnd = t + noteDur - release;
        if (sustainEnd > t + word.attack) {
          voice.envGain.gain.setValueAtTime(word.accent, sustainEnd);
        }
        voice.envGain.gain.linearRampToValueAtTime(0, t + noteDur);

        // ── Filter: vowel character ──
        // filterOpen: 0.2=closed(oo/u) → 1.0=open(a/ah)
        // filterBright: adds Q resonance for bright vowels (ee/i)
        const cutoff = voice.filterBase * (0.3 + word.filterOpen * 1.7);
        const brightQ = voice.filter.Q.value + word.filterBright * 4;
        voice.filter.frequency.setValueAtTime(cutoff, t);
        voice.filter.Q.setValueAtTime(brightQ, t);
        // Slight sweep during note for life
        voice.filter.frequency.linearRampToValueAtTime(
          cutoff * (0.85 + word.accent * 0.3),
          t + noteDur
        );

        // ── Pitch: slight movement per word ──
        const pitchMult = 0.95 + word.syllables.length * 0.03 +
          (word.filterOpen - 0.5) * 0.06;
        voice.osc1.frequency.setValueAtTime(voice.baseFreq * pitchMult, t);
        voice.osc2.frequency.setValueAtTime(
          voice.baseFreq * pitchMult * (voice.osc2.frequency.value / voice.baseFreq || PHI),
          t
        );

        // Advance
        voice.nextNoteTime += noteDur + voice.sentence.gapBetween * beatDur;
        voice.currentWord = (voice.currentWord + 1) % voice.sentence.words.length;

        // Add a longer breath pause at end of sentence
        if (voice.currentWord === 0) {
          voice.nextNoteTime += beatDur * (0.5 + voice.sentence.gapBetween);
        }
      }
    };

    voice.schedulerTimer = window.setInterval(schedule, SCHEDULE_INTERVAL);
    schedule();
  }

  private destroyVoice(voice: Voice) {
    voice.active = false;
    clearInterval(voice.schedulerTimer);
    const now = this.ctx!.currentTime;
    voice.masterGain.gain.cancelScheduledValues(now);
    voice.masterGain.gain.setValueAtTime(voice.currentGain, now);
    voice.masterGain.gain.linearRampToValueAtTime(0, now + 0.15);
    voice.envGain.gain.cancelScheduledValues(now + 0.1);
    voice.envGain.gain.setTargetAtTime(0, now + 0.1, 0.05);

    setTimeout(() => {
      try {
        voice.osc1.stop(); voice.osc2.stop(); voice.osc3.stop(); voice.swellLfo.stop();
        voice.osc1.disconnect(); voice.osc2.disconnect(); voice.osc3.disconnect();
        voice.oscGain1.disconnect(); voice.oscGain2.disconnect(); voice.oscGain3.disconnect();
        voice.envGain.disconnect(); voice.filter.disconnect(); voice.masterGain.disconnect();
        voice.swellLfo.disconnect(); voice.swellGain.disconnect();
      } catch (_) { /* already stopped */ }
    }, 300);
  }

  /**
   * Called every frame with closest clusters sorted by blended distance.
   * Each entry: { seed, distance (blended screen+z), zCell }
   */
  update(nearby: { seed: number; distance: number; zCell: number }[]) {
    if (!this.ctx || !this._enabled) return;

    const wanted = nearby.slice(0, MAX_VOICES);
    const wantedSeeds = new Set(wanted.map(n => n.seed));

    for (const voice of this.voices) {
      if (!wantedSeeds.has(voice.seed)) voice.targetGain = 0;
    }

    const activeSeeds = new Set(this.voices.filter(v => v.active).map(v => v.seed));
    for (const w of wanted) {
      if (!activeSeeds.has(w.seed)) {
        const deadIdx = this.voices.findIndex(v => v.currentGain < MIN_GAIN && v.targetGain === 0);
        if (deadIdx >= 0) {
          this.destroyVoice(this.voices[deadIdx]);
          this.voices[deadIdx] = this.createVoice(w.seed, w.zCell);
        } else if (this.voices.length < MAX_VOICES + 2) {
          this.voices.push(this.createVoice(w.seed, w.zCell));
        }
      }
    }

    const now = this.ctx.currentTime;
    for (const voice of this.voices) {
      if (!voice.active) continue;
      const match = wanted.find(w => w.seed === voice.seed);
      if (match) {
        const proximity = Math.max(0, 1 - match.distance / MAX_AUDIO_RANGE);
        voice.targetGain = proximity * proximity * proximity;
        // Proximity opens filter (rides under per-word filter movement)
        voice.filterBase = voice.filterBaseOrig + proximity * proximity * 2000;
        // Distant detune
        const detune = (1 - proximity) * 15;
        voice.osc1.detune.setTargetAtTime(detune, now, 0.5);
        voice.osc2.detune.setTargetAtTime(-detune * PHI, now, 0.5);
      }
      // Crossfade
      const diff = voice.targetGain - voice.currentGain;
      voice.currentGain += diff * (voice.targetGain > voice.currentGain ? 0.03 : 0.05);
      if (voice.currentGain < MIN_GAIN && voice.targetGain === 0) voice.currentGain = 0;
      voice.masterGain.gain.setTargetAtTime(voice.currentGain, now, 0.05);
    }

    this.voices = this.voices.filter(v => {
      if (!v.active) return false;
      if (v.currentGain < MIN_GAIN && v.targetGain === 0) { this.destroyVoice(v); return false; }
      return true;
    });
  }

  destroy() {
    for (const v of this.voices) this.destroyVoice(v);
    this.voices = [];
    if (this.ctx) { this.ctx.close(); this.ctx = null; }
    this._enabled = false;
  }
}
