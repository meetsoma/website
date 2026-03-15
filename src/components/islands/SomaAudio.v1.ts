/**
 * SomaAudio — Procedural audio engine for the SomaVerse.
 *
 * Each soma has a unique "radio" — a sound signature generated
 * deterministically from its genome seed. No samples, no presets.
 * Pure algorithmic synthesis from recursive seeded parameters.
 *
 * Architecture:
 *   Seed → mulberry32 PRNG → waveform shape, frequency ratios,
 *   rhythm pattern, filter character → Web Audio graph
 *
 * Sound design principles:
 *   - Irrational harmonic ratios (φ, √2, π, e) — alien but consonant
 *   - Custom PeriodicWave per soma — Fourier coefficients from seed
 *   - Polyrhythmic AM — two LFOs at incommensurate rates = never-repeating pulse
 *   - Proximity controls filter + gain — far = muffled radio, close = warm presence
 *   - Parabolic gain envelopes — no sharp ADSR, everything breathes
 *
 * Voice pool: max 5 simultaneous somas. Crossfade on transition.
 */

// ═══════════════════════════════════════════════════════════════
// PRNG (same as SomaVerse — deterministic from seed)
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
// IRRATIONAL CONSTANTS — the harmonic palette
// ═══════════════════════════════════════════════════════════════
const PHI = (1 + Math.sqrt(5)) / 2;     // 1.618...
const SQRT2 = Math.sqrt(2);              // 1.414...
const PI_HALF = Math.PI / 2;             // 1.570...
const E_HALF = Math.E / 2;              // 1.359...
const SQRT3 = Math.sqrt(3);              // 1.732...
const LN2 = Math.LN2;                   // 0.693...
const RATIOS = [PHI, SQRT2, PI_HALF, E_HALF, SQRT3, 1 / PHI, SQRT2 / PHI, Math.PI / PHI];

// ═══════════════════════════════════════════════════════════════
// VOICE — one soma's audio signature
// ═══════════════════════════════════════════════════════════════
const MAX_VOICES = 5;
const CROSSFADE_DUR = 1.5;  // seconds
const MAX_AUDIO_RANGE = 2500; // world units — beyond this, silent
const MIN_GAIN = 0.0001;

interface Voice {
  seed: number;
  // Oscillators
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  osc3: OscillatorNode; // sub-bass or texture
  // Gain staging
  oscGain1: GainNode;
  oscGain2: GainNode;
  oscGain3: GainNode;
  mixGain: GainNode;     // pre-filter mix
  masterGain: GainNode;  // final output (proximity-controlled)
  // Filter
  filter: BiquadFilterNode;
  // LFOs for rhythm
  lfo1: OscillatorNode;
  lfo1Gain: GainNode;
  lfo2: OscillatorNode;
  lfo2Gain: GainNode;
  // Parameters from seed
  baseFreq: number;
  filterBase: number;
  filterQ: number;
  // State
  targetGain: number;
  currentGain: number;
  active: boolean;
}

// ═══════════════════════════════════════════════════════════════
// SEED → SOUND — the core algorithm
// ═══════════════════════════════════════════════════════════════
function seedToParams(seed: number) {
  const rand = mulberry32(seed);

  // Base frequency: pentatonic-ish range but shifted by irrational amounts
  // Low register: 40-180 Hz — warm, not piercing
  const freqBase = 40 + rand() * 60;  // 40-100 Hz root
  const freqOctave = Math.floor(rand() * 2); // 0 or 1 octave up
  const baseFreq = freqBase * Math.pow(2, freqOctave); // 40-200 Hz

  // Harmonic ratios — pick from irrational constants, shifted by seed
  const ratio2 = RATIOS[~~(rand() * RATIOS.length)] + (rand() - 0.5) * 0.05;
  const ratio3 = RATIOS[~~(rand() * RATIOS.length)] * (rand() > 0.5 ? 0.5 : 0.25); // sub-harmonic

  // Custom waveform — Fourier coefficients from seed
  // This is where each soma gets a literally unique timbre
  const harmonicCount = 12;
  const real1 = new Float32Array(harmonicCount + 1);
  const imag1 = new Float32Array(harmonicCount + 1);
  const real2 = new Float32Array(harmonicCount + 1);
  const imag2 = new Float32Array(harmonicCount + 1);

  real1[0] = 0; imag1[0] = 0;
  real2[0] = 0; imag2[0] = 0;

  for (let i = 1; i <= harmonicCount; i++) {
    // Decreasing amplitude with randomized phase/magnitude
    // Parabolic decay: 1/i² not 1/i — softer than sawtooth, fuller than sine
    const decay = 1 / (i * i);
    const jitter1 = (rand() - 0.5) * 2;
    const jitter2 = (rand() - 0.5) * 2;

    real1[i] = decay * jitter1 * (rand() > 0.3 ? 1 : 0); // some harmonics absent
    imag1[i] = decay * (rand() - 0.5) * 1.5;

    // Second oscillator: different character
    real2[i] = decay * jitter2 * (rand() > 0.4 ? 1 : 0);
    imag2[i] = decay * (rand() - 0.5) * 1.2;
  }

  // LFO rates — polyrhythmic breathing
  // Two LFOs at incommensurate rates → never-repeating amplitude pattern
  const lfoRate1 = 0.03 + rand() * 0.15;  // very slow: 0.03-0.18 Hz (breathing)
  const lfoRate2 = lfoRate1 * PHI;          // golden ratio apart — maximally incommensurate
  const lfoDepth1 = 0.15 + rand() * 0.35;  // 15-50% modulation
  const lfoDepth2 = 0.10 + rand() * 0.25;

  // Filter character
  const filterBase = 150 + rand() * 600;   // 150-750 Hz base cutoff
  const filterQ = 0.5 + rand() * 6;        // gentle to resonant

  // Oscillator mix levels
  const mix1 = 0.3 + rand() * 0.3;
  const mix2 = 0.15 + rand() * 0.25;
  const mix3 = 0.1 + rand() * 0.15; // sub is always quiet

  return {
    baseFreq, ratio2, ratio3,
    real1, imag1, real2, imag2,
    lfoRate1, lfoRate2, lfoDepth1, lfoDepth2,
    filterBase, filterQ,
    mix1, mix2, mix3,
  };
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
  private _volume = 0.35; // master volume (0-1)

  get enabled() { return this._enabled; }
  get volume() { return this._volume; }

  /**
   * Initialize audio context — MUST be called from a user gesture.
   */
  async init() {
    if (this.ctx) return;

    this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    // Master chain: compressor → gain → destination
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.01;
    this.compressor.release.value = 0.25;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this._volume;

    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this._enabled = true;
  }

  /**
   * Toggle audio on/off
   */
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
        this._enabled ? this._volume : 0,
        now + 0.5
      );
    }

    // Stop all voices when disabled
    if (!this._enabled) {
      for (const v of this.voices) {
        v.targetGain = 0;
      }
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
   * Create a voice for a specific soma seed.
   */
  private createVoice(seed: number): Voice {
    const ctx = this.ctx!;
    const p = seedToParams(seed);

    // Create custom periodic waves
    const wave1 = ctx.createPeriodicWave(p.real1, p.imag1, { disableNormalization: false });
    const wave2 = ctx.createPeriodicWave(p.real2, p.imag2, { disableNormalization: false });

    // Oscillator 1 — primary tone
    const osc1 = ctx.createOscillator();
    osc1.setPeriodicWave(wave1);
    osc1.frequency.value = p.baseFreq;

    // Oscillator 2 — irrational harmonic
    const osc2 = ctx.createOscillator();
    osc2.setPeriodicWave(wave2);
    osc2.frequency.value = p.baseFreq * p.ratio2;

    // Oscillator 3 — sub-harmonic (sine, grounding)
    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = p.baseFreq * p.ratio3;

    // Per-oscillator gains
    const oscGain1 = ctx.createGain();
    oscGain1.gain.value = p.mix1;
    const oscGain2 = ctx.createGain();
    oscGain2.gain.value = p.mix2;
    const oscGain3 = ctx.createGain();
    oscGain3.gain.value = p.mix3;

    // Mix bus
    const mixGain = ctx.createGain();
    mixGain.gain.value = 1;

    // Filter — the proximity "radio dial"
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = p.filterBase;
    filter.Q.value = p.filterQ;

    // LFO 1 — primary breathing rhythm
    const lfo1 = ctx.createOscillator();
    lfo1.type = 'sine';
    lfo1.frequency.value = p.lfoRate1;
    const lfo1Gain = ctx.createGain();
    lfo1Gain.gain.value = p.lfoDepth1;

    // LFO 2 — golden-ratio offset rhythm (polyrhythmic with LFO 1)
    const lfo2 = ctx.createOscillator();
    lfo2.type = 'sine';
    lfo2.frequency.value = p.lfoRate2;
    const lfo2Gain = ctx.createGain();
    lfo2Gain.gain.value = p.lfoDepth2;

    // Master gain for this voice (proximity-controlled)
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;

    // ── Routing ──
    // Oscillators → per-osc gain → mix
    osc1.connect(oscGain1);
    osc2.connect(oscGain2);
    osc3.connect(oscGain3);
    oscGain1.connect(mixGain);
    oscGain2.connect(mixGain);
    oscGain3.connect(mixGain);

    // Mix → filter → master gain → compressor
    mixGain.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(this.compressor!);

    // LFOs modulate the mix gain (AM — amplitude modulation)
    lfo1.connect(lfo1Gain);
    lfo1Gain.connect(mixGain.gain);
    lfo2.connect(lfo2Gain);
    lfo2Gain.connect(mixGain.gain);

    // Start everything
    const now = ctx.currentTime;
    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    lfo1.start(now);
    lfo2.start(now);

    return {
      seed,
      osc1, osc2, osc3,
      oscGain1, oscGain2, oscGain3,
      mixGain, masterGain,
      filter,
      lfo1, lfo1Gain, lfo2, lfo2Gain,
      baseFreq: p.baseFreq,
      filterBase: p.filterBase,
      filterQ: p.filterQ,
      targetGain: 0,
      currentGain: 0,
      active: true,
    };
  }

  /**
   * Destroy a voice — clean up all nodes.
   */
  private destroyVoice(voice: Voice) {
    voice.active = false;
    const now = this.ctx!.currentTime;

    // Quick fade out to avoid click
    voice.masterGain.gain.cancelScheduledValues(now);
    voice.masterGain.gain.setValueAtTime(voice.currentGain, now);
    voice.masterGain.gain.linearRampToValueAtTime(0, now + 0.1);

    // Schedule cleanup
    setTimeout(() => {
      try {
        voice.osc1.stop();
        voice.osc2.stop();
        voice.osc3.stop();
        voice.lfo1.stop();
        voice.lfo2.stop();
        voice.osc1.disconnect();
        voice.osc2.disconnect();
        voice.osc3.disconnect();
        voice.lfo1.disconnect();
        voice.lfo2.disconnect();
        voice.oscGain1.disconnect();
        voice.oscGain2.disconnect();
        voice.oscGain3.disconnect();
        voice.mixGain.disconnect();
        voice.filter.disconnect();
        voice.masterGain.disconnect();
        voice.lfo1Gain.disconnect();
        voice.lfo2Gain.disconnect();
      } catch (_) { /* already stopped */ }
    }, 200);
  }

  /**
   * Called every frame from SomaVerse with the closest somas and their distances.
   *
   * @param nearby - Array of { seed, distance } for the closest somas, sorted by distance.
   *                 Distance is in world units (0 = on top of you, MAX_AUDIO_RANGE = silence).
   */
  update(nearby: { seed: number; distance: number }[]) {
    if (!this.ctx || !this._enabled) return;

    // Take only the closest MAX_VOICES
    const wanted = nearby.slice(0, MAX_VOICES);
    const wantedSeeds = new Set(wanted.map(n => n.seed));

    // Find voices that should fade out (no longer in top-N)
    for (const voice of this.voices) {
      if (!wantedSeeds.has(voice.seed)) {
        voice.targetGain = 0;
      }
    }

    // Find seeds that need new voices
    const activeSeeds = new Set(this.voices.filter(v => v.active).map(v => v.seed));
    for (const w of wanted) {
      if (!activeSeeds.has(w.seed)) {
        // Need a new voice — recycle a dead one or create
        const deadIdx = this.voices.findIndex(v => v.currentGain < MIN_GAIN && v.targetGain === 0);
        if (deadIdx >= 0) {
          this.destroyVoice(this.voices[deadIdx]);
          this.voices[deadIdx] = this.createVoice(w.seed);
        } else if (this.voices.length < MAX_VOICES + 2) {
          // Allow slight overflow during crossfade
          this.voices.push(this.createVoice(w.seed));
        }
      }
    }

    // Update gains and filters based on proximity
    const now = this.ctx.currentTime;
    for (const voice of this.voices) {
      if (!voice.active) continue;

      const match = wanted.find(w => w.seed === voice.seed);
      if (match) {
        // Proximity → gain: parabolic curve (quadratic falloff)
        const proximity = Math.max(0, 1 - match.distance / MAX_AUDIO_RANGE);
        const gain = proximity * proximity * proximity; // cubic — gentle approach
        voice.targetGain = gain;

        // Proximity → filter: opens as you get closer
        // Far away: muffled (filterBase). Close: bright (filterBase + 3000)
        const cutoff = voice.filterBase + proximity * proximity * 3000;
        voice.filter.frequency.setTargetAtTime(cutoff, now, 0.3);

        // Proximity → slight detune for "radio dial" feel when distant
        const detune = (1 - proximity) * 15; // up to 15 cents off when far
        voice.osc1.detune.setTargetAtTime(detune, now, 0.5);
        voice.osc2.detune.setTargetAtTime(-detune * PHI, now, 0.5);
      }

      // Smooth gain transitions (crossfade)
      const gainDiff = voice.targetGain - voice.currentGain;
      const fadeSpeed = voice.targetGain > voice.currentGain ? 0.03 : 0.05; // fade in slower
      voice.currentGain += gainDiff * fadeSpeed;

      if (voice.currentGain < MIN_GAIN && voice.targetGain === 0) {
        voice.currentGain = 0;
      }

      voice.masterGain.gain.setTargetAtTime(voice.currentGain, now, 0.05);
    }

    // Garbage collect dead voices
    this.voices = this.voices.filter(v => {
      if (!v.active) return false;
      if (v.currentGain < MIN_GAIN && v.targetGain === 0) {
        this.destroyVoice(v);
        return false;
      }
      return true;
    });
  }

  /**
   * Clean up everything.
   */
  destroy() {
    for (const v of this.voices) {
      this.destroyVoice(v);
    }
    this.voices = [];
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this._enabled = false;
  }
}
