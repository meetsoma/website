/**
 * SomaAudio v3 — Pattern sequencer + synthesis.
 *
 * v1-v2: continuous oscillators + LFO = everything hums.
 * v3: seed generates a RHYTHMIC PATTERN — a loop of discrete
 * note events with varying attack, duration, gap, pitch shift,
 * and filter openness. This creates syllable-like articulation:
 *
 *   "du de ah"  = sharp-short, sharp-shorter, soft-long-open
 *   "coo do da" = soft-medium, sharp-short, sharp-medium
 *   "hmmuuu"    = closed-filter-long, soft-attack-long
 *
 * Each soma gets its own BPM (30-120), pattern length (3-8 steps),
 * and step character. The oscillators run continuously but a
 * gain envelope gates them into discrete notes.
 *
 * v1 saved as SomaAudio.v1.ts, v2 as SomaAudio.v2.ts
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
const PI_HALF = Math.PI / 2;
const E_HALF = Math.E / 2;
const SQRT3 = Math.sqrt(3);
const RATIOS = [PHI, SQRT2, PI_HALF, E_HALF, SQRT3, 1 / PHI, SQRT2 / PHI, Math.PI / PHI];

const MAX_VOICES = 5;
const MAX_AUDIO_RANGE = 2500;
const MIN_GAIN = 0.0001;
const SCHEDULE_AHEAD = 0.2;  // schedule notes 200ms ahead
const SCHEDULE_INTERVAL = 100; // check every 100ms

// ═══════════════════════════════════════════════════════════════
// PATTERN STEP — one "syllable" in a soma's voice
// ═══════════════════════════════════════════════════════════════
interface Step {
  note: boolean;     // true = sound, false = rest
  dur: number;       // note duration in seconds
  gap: number;       // silence after note in seconds
  attack: number;    // rise time (sharp "d" vs soft "h")
  release: number;   // fall time (clipped "t" vs fading "ah")
  pitchMult: number; // frequency multiplier for this step (0.9-1.1)
  filterMult: number;// filter cutoff multiplier (0.5=closed "mm", 2.0=open "ah")
  accent: number;    // volume 0.4-1.0 (stressed vs unstressed)
}

// ═══════════════════════════════════════════════════════════════
// SEED → PARAMS + PATTERN
// ═══════════════════════════════════════════════════════════════
function seedToParams(seed: number) {
  const rand = mulberry32(seed);

  // Base frequency: 40-200 Hz
  const freqBase = 40 + rand() * 60;
  const freqOctave = Math.floor(rand() * 2);
  const baseFreq = freqBase * Math.pow(2, freqOctave);

  // Harmonic ratios
  const ratio2 = RATIOS[~~(rand() * RATIOS.length)] + (rand() - 0.5) * 0.05;
  const ratio3 = RATIOS[~~(rand() * RATIOS.length)] * (rand() > 0.5 ? 0.5 : 0.25);

  // Custom waveforms
  const hc = 12;
  const real1 = new Float32Array(hc + 1);
  const imag1 = new Float32Array(hc + 1);
  const real2 = new Float32Array(hc + 1);
  const imag2 = new Float32Array(hc + 1);
  real1[0] = 0; imag1[0] = 0;
  real2[0] = 0; imag2[0] = 0;
  for (let i = 1; i <= hc; i++) {
    const decay = 1 / (i * i);
    real1[i] = decay * (rand() - 0.5) * 2 * (rand() > 0.3 ? 1 : 0);
    imag1[i] = decay * (rand() - 0.5) * 1.5;
    real2[i] = decay * (rand() - 0.5) * 2 * (rand() > 0.4 ? 1 : 0);
    imag2[i] = decay * (rand() - 0.5) * 1.2;
  }

  // Filter base
  const filterBase = 150 + rand() * 600;
  const filterQ = 0.5 + rand() * 6;

  // Mix levels
  const mix1 = 0.3 + rand() * 0.3;
  const mix2 = 0.15 + rand() * 0.25;
  const mix3 = 0.1 + rand() * 0.15;

  // ── BPM: each soma has its own tempo ──
  // Range: 30-120 BPM. Some are slow meditative, some are quick
  const bpm = 30 + rand() * 90;
  const beatDur = 60 / bpm; // seconds per beat

  // ── Pattern: 3-8 steps that loop ──
  // This is where "du de ah" vs "hmmuuu" gets decided
  const patternLen = 3 + ~~(rand() * 6); // 3-8 steps

  // Decide a "character archetype" that biases the step generation
  // This prevents every soma sounding equally varied — some are
  // consistently staccato, some legato, some mixed
  const archetype = rand();
  // 0.0-0.3: staccato (short notes, sharp attacks) — "di di da"
  // 0.3-0.6: legato (long notes, soft attacks) — "hmmuuu aaah"
  // 0.6-1.0: mixed (varied durations) — "du de ah"

  const steps: Step[] = [];
  for (let i = 0; i < patternLen; i++) {
    const isRest = rand() < 0.15; // 15% chance of silence (breath)

    let dur: number, attack: number, release: number;

    if (archetype < 0.3) {
      // Staccato
      dur = (0.05 + rand() * 0.2) * beatDur;
      attack = 0.005 + rand() * 0.03;  // very sharp
      release = 0.02 + rand() * 0.08;
    } else if (archetype < 0.6) {
      // Legato
      dur = (0.4 + rand() * 0.8) * beatDur;
      attack = 0.05 + rand() * 0.2;    // soft
      release = 0.1 + rand() * 0.3;
    } else {
      // Mixed — each step rolls independently
      dur = (0.08 + rand() * 0.7) * beatDur;
      attack = 0.01 + rand() * 0.15;
      release = 0.03 + rand() * 0.2;
    }

    // Gap after note — at least a tiny breath, up to a full beat
    const gap = (0.05 + rand() * 0.4) * beatDur;

    // Pitch movement — subtle melody within a narrow range
    const pitchMult = 0.92 + rand() * 0.16; // 0.92-1.08

    // Filter openness — "mm" (closed) vs "ah" (open)
    const filterMult = 0.4 + rand() * 1.8; // 0.4-2.2

    // Accent pattern — stress on some syllables
    const accent = 0.4 + rand() * 0.6;

    steps.push({
      note: !isRest,
      dur,
      gap,
      attack,
      release,
      pitchMult,
      filterMult,
      accent,
    });
  }

  // Macro swell — slow breathing of the whole pattern (20-120 sec cycle)
  const swellPeriod = 20 + rand() * 100;
  const swellDepth = 0.15 + rand() * 0.35;

  return {
    baseFreq, ratio2, ratio3,
    real1, imag1, real2, imag2,
    filterBase, filterQ,
    mix1, mix2, mix3,
    bpm, beatDur,
    steps,
    swellPeriod, swellDepth,
  };
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
  envGain: GainNode;       // per-note envelope
  masterGain: GainNode;    // proximity control
  filter: BiquadFilterNode;
  // Macro swell LFO
  swellLfo: OscillatorNode;
  swellGain: GainNode;
  // Params
  baseFreq: number;
  filterBaseOrig: number;  // seed-derived, never mutated
  filterBase: number;      // current (proximity-adjusted)
  steps: Step[];
  cycleDur: number;        // total duration of one pattern loop
  // Scheduler state
  nextNoteTime: number;    // audioContext time of next scheduled note
  currentStep: number;     // which step in pattern
  schedulerTimer: number;  // setInterval id
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
  get volume() { return this._volume; }

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
    if (!this.ctx) {
      await this.init();
      return this._enabled;
    }
    this._enabled = !this._enabled;
    if (this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(
        this._enabled ? this._volume : 0, now + 0.5
      );
    }
    if (!this._enabled) {
      for (const v of this.voices) v.targetGain = 0;
    }
    return this._enabled;
  }

  setVolume(vol: number) {
    this._volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && this._enabled) {
      this.masterGain.gain.setTargetAtTime(this._volume, this.ctx.currentTime, 0.1);
    }
  }

  /**
   * Create a voice with pattern sequencer.
   *
   * Signal chain:
   *   osc1 → gain1 ─┐
   *   osc2 → gain2 ─┼→ envGain ─→ filter ─→ masterGain ─→ compressor
   *   osc3 → gain3 ─┘    ↑               ↑
   *             scheduled ramps      swellLfo ─→ swellGain ─→ masterGain.gain
   *             (attack/release)
   *
   * The envGain is where articulation happens: each pattern step
   * schedules attack/hold/release ramps on envGain.gain.
   * The filter cutoff also shifts per-step for "mm" vs "ah" quality.
   */
  private createVoice(seed: number): Voice {
    const ctx = this.ctx!;
    const p = seedToParams(seed);

    const wave1 = ctx.createPeriodicWave(p.real1, p.imag1, { disableNormalization: false });
    const wave2 = ctx.createPeriodicWave(p.real2, p.imag2, { disableNormalization: false });

    const osc1 = ctx.createOscillator();
    osc1.setPeriodicWave(wave1);
    osc1.frequency.value = p.baseFreq;

    const osc2 = ctx.createOscillator();
    osc2.setPeriodicWave(wave2);
    osc2.frequency.value = p.baseFreq * p.ratio2;

    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = p.baseFreq * p.ratio3;

    const oscGain1 = ctx.createGain(); oscGain1.gain.value = p.mix1;
    const oscGain2 = ctx.createGain(); oscGain2.gain.value = p.mix2;
    const oscGain3 = ctx.createGain(); oscGain3.gain.value = p.mix3;

    // Envelope gain — the sequencer drives this
    const envGain = ctx.createGain();
    envGain.gain.value = 0; // start silent

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = p.filterBase;
    filter.Q.value = p.filterQ;

    // Macro swell LFO
    const swellLfo = ctx.createOscillator();
    swellLfo.type = 'sine';
    swellLfo.frequency.value = 1 / p.swellPeriod;
    const swellGain = ctx.createGain();
    swellGain.gain.value = p.swellDepth;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;

    // Routing
    osc1.connect(oscGain1);
    osc2.connect(oscGain2);
    osc3.connect(oscGain3);
    oscGain1.connect(envGain);
    oscGain2.connect(envGain);
    oscGain3.connect(envGain);
    envGain.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(this.compressor!);

    swellLfo.connect(swellGain);
    swellGain.connect(masterGain.gain);

    const now = ctx.currentTime;
    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    swellLfo.start(now);

    // Calculate total cycle duration
    const cycleDur = p.steps.reduce((sum, s) => sum + s.dur + s.gap, 0);

    const voice: Voice = {
      seed,
      osc1, osc2, osc3,
      oscGain1, oscGain2, oscGain3,
      envGain, masterGain, filter,
      swellLfo, swellGain,
      baseFreq: p.baseFreq,
      filterBaseOrig: p.filterBase,
      filterBase: p.filterBase,
      steps: p.steps,
      cycleDur,
      nextNoteTime: now + 0.05, // start just ahead
      currentStep: 0,
      schedulerTimer: 0,
      targetGain: 0,
      currentGain: 0,
      active: true,
    };

    // Start the lookahead scheduler
    this.startScheduler(voice);

    return voice;
  }

  /**
   * Lookahead scheduler — schedules note envelopes ahead of time.
   * Runs via setInterval, checks if next note is within SCHEDULE_AHEAD
   * window and schedules the gain + filter ramps.
   */
  private startScheduler(voice: Voice) {
    const ctx = this.ctx!;

    const schedule = () => {
      if (!voice.active || !this.ctx) return;

      while (voice.nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD) {
        const step = voice.steps[voice.currentStep];
        const t = voice.nextNoteTime;

        if (step.note) {
          const peakGain = step.accent;

          // ── Envelope: attack → hold → release → silence ──
          // Ensure we start from silence
          voice.envGain.gain.setValueAtTime(0, t);
          // Attack
          voice.envGain.gain.linearRampToValueAtTime(peakGain, t + step.attack);
          // Hold at peak until release starts
          voice.envGain.gain.setValueAtTime(peakGain, t + step.dur - step.release);
          // Release to silence
          voice.envGain.gain.linearRampToValueAtTime(0, t + step.dur);

          // ── Pitch shift for this step ──
          const freq1 = voice.baseFreq * step.pitchMult;
          voice.osc1.frequency.setValueAtTime(freq1, t);
          voice.osc2.frequency.setValueAtTime(freq1 * (voice.osc2.frequency.value / voice.baseFreq), t);

          // ── Filter movement: "mm" (closed) vs "ah" (open) ──
          const cutoff = voice.filterBase * step.filterMult;
          voice.filter.frequency.setValueAtTime(cutoff, t);
          // Slight filter sweep during note for liveliness
          voice.filter.frequency.linearRampToValueAtTime(
            cutoff * (0.8 + step.accent * 0.4),
            t + step.dur
          );
        } else {
          // Rest — ensure silence
          voice.envGain.gain.setValueAtTime(0, t);
        }

        // Advance to next step
        voice.nextNoteTime += step.dur + step.gap;
        voice.currentStep = (voice.currentStep + 1) % voice.steps.length;
      }
    };

    voice.schedulerTimer = window.setInterval(schedule, SCHEDULE_INTERVAL);
    // Run once immediately to prime
    schedule();
  }

  private destroyVoice(voice: Voice) {
    voice.active = false;
    clearInterval(voice.schedulerTimer);

    const now = this.ctx!.currentTime;
    voice.masterGain.gain.cancelScheduledValues(now);
    voice.masterGain.gain.setValueAtTime(voice.currentGain, now);
    voice.masterGain.gain.linearRampToValueAtTime(0, now + 0.15);

    // Also fade the envelope to prevent lingering scheduled notes
    voice.envGain.gain.cancelScheduledValues(now + 0.1);
    voice.envGain.gain.setTargetAtTime(0, now + 0.1, 0.05);

    setTimeout(() => {
      try {
        voice.osc1.stop(); voice.osc2.stop(); voice.osc3.stop();
        voice.swellLfo.stop();
        voice.osc1.disconnect(); voice.osc2.disconnect(); voice.osc3.disconnect();
        voice.oscGain1.disconnect(); voice.oscGain2.disconnect(); voice.oscGain3.disconnect();
        voice.envGain.disconnect();
        voice.filter.disconnect(); voice.masterGain.disconnect();
        voice.swellLfo.disconnect(); voice.swellGain.disconnect();
      } catch (_) { /* already stopped */ }
    }, 300);
  }

  /**
   * Called every frame with closest somas sorted by distance.
   */
  update(nearby: { seed: number; distance: number }[]) {
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
          this.voices[deadIdx] = this.createVoice(w.seed);
        } else if (this.voices.length < MAX_VOICES + 2) {
          this.voices.push(this.createVoice(w.seed));
        }
      }
    }

    const now = this.ctx.currentTime;
    for (const voice of this.voices) {
      if (!voice.active) continue;

      const match = wanted.find(w => w.seed === voice.seed);
      if (match) {
        const proximity = Math.max(0, 1 - match.distance / MAX_AUDIO_RANGE);
        const gain = proximity * proximity * proximity;
        voice.targetGain = gain;

        // Proximity → filter opens (additive to per-note filter movement)
        // Derive from original, not cumulative
        voice.filterBase = voice.filterBaseOrig + proximity * proximity * 2000;

        // Distant detune
        const detune = (1 - proximity) * 15;
        voice.osc1.detune.setTargetAtTime(detune, now, 0.5);
        voice.osc2.detune.setTargetAtTime(-detune * PHI, now, 0.5);
      }

      // Smooth crossfade
      const gainDiff = voice.targetGain - voice.currentGain;
      const fadeSpeed = voice.targetGain > voice.currentGain ? 0.03 : 0.05;
      voice.currentGain += gainDiff * fadeSpeed;
      if (voice.currentGain < MIN_GAIN && voice.targetGain === 0) voice.currentGain = 0;

      voice.masterGain.gain.setTargetAtTime(voice.currentGain, now, 0.05);
    }

    // GC dead voices
    this.voices = this.voices.filter(v => {
      if (!v.active) return false;
      if (v.currentGain < MIN_GAIN && v.targetGain === 0) {
        this.destroyVoice(v);
        return false;
      }
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
