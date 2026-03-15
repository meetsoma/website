/**
 * SomaAudio v5 — Mantra-driven cluster channels.
 *
 * Each cluster is a channel. Its primary soma's mantra (generated
 * in SomaVerse from word pools + templates) IS the audio sequence.
 * Real English words → phoneme analysis → sound parameters:
 *
 *   "born of static, bound to drift"
 *    born → nasal onset, open vowel, medium = soft attack, open filter, medium note
 *    of   → vowel start, short = quick open breath
 *    static → fricative onset, bright vowel, long = breathy, bright, sustained
 *    ...
 *
 * Clusters share an incremental BPM tied to z-cell position.
 * Mouse proximity selects which cluster channel you hear.
 *
 * Previous versions: .v1.ts through .v4.ts
 */

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
const MAX_AUDIO_RANGE = 3500;
const MIN_GAIN = 0.0001;
const SCHEDULE_AHEAD = 0.25;
const SCHEDULE_INTERVAL = 80;

// ═══════════════════════════════════════════════════════════════
// WORD → SOUND — phoneme analysis of real English words
// ═══════════════════════════════════════════════════════════════

// Onset character sets
const PLOSIVES = new Set('bBdDgGkKpPtT'.split(''));
const NASALS = new Set('mMnN'.split(''));
const FRICATIVES = new Set('sSfFhHvVzZ'.split(''));
const LIQUIDS = new Set('lLrRwWyY'.split(''));

// Vowel quality (scan the word for dominant vowels)
const OPEN_V = new Set(['a']);        // "ah" — open filter
const ROUND_V = new Set(['o', 'u']); // "oo" — closed/round filter
const BRIGHT_V = new Set(['e', 'i']); // "ee" — bright, high Q

interface WordSound {
  word: string;
  attack: number;
  filterOpen: number;
  filterBright: number;
  duration: number;
  accent: number;
}

function wordToSound(word: string): WordSound {
  const w = word.toLowerCase();
  const len = w.length;

  // ── Attack from first letter ──
  const first = w[0] || 'a';
  let attack: number;
  if (PLOSIVES.has(first))       attack = 0.005 + len * 0.002;  // sharp click
  else if (FRICATIVES.has(first)) attack = 0.02 + len * 0.005;  // breathy hiss
  else if (NASALS.has(first))     attack = 0.05 + len * 0.008;  // soft hum
  else if (LIQUIDS.has(first))    attack = 0.08 + len * 0.01;   // smooth glide
  else                            attack = 0.03 + len * 0.004;  // vowel start

  // ── Filter from vowel content ──
  let openCount = 0, roundCount = 0, brightCount = 0, totalVowels = 0;
  for (const ch of w) {
    if (OPEN_V.has(ch))   { openCount++; totalVowels++; }
    if (ROUND_V.has(ch))  { roundCount++; totalVowels++; }
    if (BRIGHT_V.has(ch)) { brightCount++; totalVowels++; }
  }
  const tv = Math.max(totalVowels, 1);
  const filterOpen = 0.3 + (openCount / tv) * 0.6 - (roundCount / tv) * 0.2;
  const filterBright = 0.2 + (brightCount / tv) * 0.7;

  // ── Duration from syllable count (rough: count vowel groups) ──
  let syllables = 0;
  let inVowel = false;
  for (const ch of w) {
    const isV = 'aeiou'.includes(ch);
    if (isV && !inVowel) syllables++;
    inVowel = isV;
  }
  syllables = Math.max(syllables, 1);
  const duration = 0.25 + syllables * 0.35;

  // ── Accent: content words louder, function words quieter ──
  const FUNCTION_WORDS = new Set(['i','a','the','of','and','to','in','is','that','it','my','no','or','an','am','was']);
  const accent = FUNCTION_WORDS.has(w) ? 0.25 + Math.random() * 0.15 : 0.5 + Math.random() * 0.5;

  return { word, attack, filterOpen, filterBright, duration, accent };
}

// ═══════════════════════════════════════════════════════════════
// INCREMENTAL BPM
// ═══════════════════════════════════════════════════════════════
function clusterBPM(zCell: number, seed: number): number {
  const rand = mulberry32(seed);
  const zone = Math.floor(zCell / 4);
  const zonePhase = zone * 0.7;
  const zoneBPM = 82 + Math.sin(zonePhase) * 40 + Math.cos(zonePhase * PHI) * 18;
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
  wordSounds: WordSound[];
  bpm: number;
  gapBase: number;
  nextNoteTime: number;
  currentWord: number;
  schedulerTimer: number;
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

  private createVoice(seed: number, zCell: number, mantraWords: string[]): Voice {
    const ctx = this.ctx!;
    const rand = mulberry32(seed);

    // Oscillator setup
    const freqBase = 40 + rand() * 60;
    const baseFreq = freqBase * Math.pow(2, ~~(rand() * 2));
    const ratio2 = RATIOS[~~(rand() * RATIOS.length)] + (rand() - 0.5) * 0.05;
    const ratio3 = RATIOS[~~(rand() * RATIOS.length)] * (rand() > 0.5 ? 0.5 : 0.25);

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

    const mix1 = 0.3 + rand() * 0.3, mix2 = 0.15 + rand() * 0.25, mix3 = 0.1 + rand() * 0.15;
    const oscGain1 = ctx.createGain(); oscGain1.gain.value = mix1;
    const oscGain2 = ctx.createGain(); oscGain2.gain.value = mix2;
    const oscGain3 = ctx.createGain(); oscGain3.gain.value = mix3;

    const envGain = ctx.createGain(); envGain.gain.value = 0;

    const filterBaseOrig = 150 + rand() * 600;
    const filterQ = 0.5 + rand() * 6;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = filterBaseOrig; filter.Q.value = filterQ;

    const swellPeriod = 20 + rand() * 100;
    const swellLfo = ctx.createOscillator(); swellLfo.type = 'sine'; swellLfo.frequency.value = 1 / swellPeriod;
    const swellGain = ctx.createGain(); swellGain.gain.value = 0.15 + rand() * 0.3;
    const masterGain = ctx.createGain(); masterGain.gain.value = 0;

    // Routing
    osc1.connect(oscGain1); osc2.connect(oscGain2); osc3.connect(oscGain3);
    oscGain1.connect(envGain); oscGain2.connect(envGain); oscGain3.connect(envGain);
    envGain.connect(filter); filter.connect(masterGain); masterGain.connect(this.compressor!);
    swellLfo.connect(swellGain); swellGain.connect(masterGain.gain);

    const now = ctx.currentTime;
    osc1.start(now); osc2.start(now); osc3.start(now); swellLfo.start(now);

    // ── Convert mantra words to sound sequence ──
    const wordSounds = mantraWords.length > 0
      ? mantraWords.map(w => wordToSound(w))
      : [wordToSound('silence'), wordToSound('drift'), wordToSound('remain')]; // fallback

    const bpm = clusterBPM(zCell, seed);
    const gapBase = 0.08 + rand() * 0.2;

    const voice: Voice = {
      seed, osc1, osc2, osc3, oscGain1, oscGain2, oscGain3,
      envGain, masterGain, filter, swellLfo, swellGain,
      baseFreq, filterBaseOrig, filterBase: filterBaseOrig,
      wordSounds, bpm, gapBase,
      nextNoteTime: now + 0.05,
      currentWord: 0,
      schedulerTimer: 0,
      targetGain: 0, currentGain: 0, active: true,
    };

    this.startScheduler(voice);
    return voice;
  }

  private startScheduler(voice: Voice) {
    const ctx = this.ctx!;
    const beatDur = 60 / voice.bpm;

    const schedule = () => {
      if (!voice.active || !this.ctx) return;

      while (voice.nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD) {
        const ws = voice.wordSounds[voice.currentWord];
        const t = voice.nextNoteTime;
        const noteDur = ws.duration * beatDur;
        const release = Math.min(noteDur * 0.4, 0.3);

        // Gain envelope shaped by word's phoneme onset
        voice.envGain.gain.setValueAtTime(0, t);
        voice.envGain.gain.linearRampToValueAtTime(ws.accent, t + ws.attack);
        const sustainEnd = t + noteDur - release;
        if (sustainEnd > t + ws.attack) {
          voice.envGain.gain.setValueAtTime(ws.accent, sustainEnd);
        }
        voice.envGain.gain.linearRampToValueAtTime(0, t + noteDur);

        // Filter: vowel character
        const cutoff = voice.filterBase * (0.3 + ws.filterOpen * 1.7);
        const brightQ = voice.filter.Q.value + ws.filterBright * 4;
        voice.filter.frequency.setValueAtTime(cutoff, t);
        voice.filter.Q.setValueAtTime(brightQ, t);
        voice.filter.frequency.linearRampToValueAtTime(
          cutoff * (0.85 + ws.accent * 0.3), t + noteDur
        );

        // Pitch: slight movement per word position in sentence
        const posInSentence = voice.currentWord / voice.wordSounds.length;
        // Melodic arc: slight rise in first half, fall in second
        const arc = Math.sin(posInSentence * Math.PI) * 0.06;
        const pitchMult = 0.97 + arc + ws.filterOpen * 0.04;
        voice.osc1.frequency.setValueAtTime(voice.baseFreq * pitchMult, t);
        voice.osc2.frequency.setValueAtTime(
          voice.baseFreq * pitchMult * (voice.osc2.frequency.value / voice.baseFreq || PHI), t
        );

        // Advance
        voice.nextNoteTime += noteDur + voice.gapBase * beatDur;
        voice.currentWord = (voice.currentWord + 1) % voice.wordSounds.length;

        // Longer breath at end of sentence loop
        if (voice.currentWord === 0) {
          voice.nextNoteTime += beatDur * (0.8 + voice.gapBase * 2);
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
      } catch (_) {}
    }, 300);
  }

  update(nearby: { seed: number; distance: number; zCell: number; mantraWords: string[] }[]) {
    if (!this.ctx || !this._enabled) return;

    const wanted = nearby.slice(0, MAX_VOICES);
    const wantedSeeds = new Set(wanted.map(n => n.seed));

    for (const voice of this.voices)
      if (!wantedSeeds.has(voice.seed)) voice.targetGain = 0;

    const activeSeeds = new Set(this.voices.filter(v => v.active).map(v => v.seed));
    for (const w of wanted) {
      if (!activeSeeds.has(w.seed)) {
        const deadIdx = this.voices.findIndex(v => v.currentGain < MIN_GAIN && v.targetGain === 0);
        if (deadIdx >= 0) {
          this.destroyVoice(this.voices[deadIdx]);
          this.voices[deadIdx] = this.createVoice(w.seed, w.zCell, w.mantraWords);
        } else if (this.voices.length < MAX_VOICES + 2) {
          this.voices.push(this.createVoice(w.seed, w.zCell, w.mantraWords));
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
        voice.filterBase = voice.filterBaseOrig + proximity * proximity * 2000;
        const detune = (1 - proximity) * 15;
        voice.osc1.detune.setTargetAtTime(detune, now, 0.5);
        voice.osc2.detune.setTargetAtTime(-detune * PHI, now, 0.5);
      }
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
