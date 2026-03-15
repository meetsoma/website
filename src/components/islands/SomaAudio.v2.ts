/**
 * SomaAudio v2 — Procedural audio engine for the SomaVerse.
 *
 * Each soma has a unique "radio" — a sound signature generated
 * deterministically from its genome seed. No samples, no presets.
 * Pure algorithmic synthesis from recursive seeded parameters.
 *
 * v2: Two additional rhythm arcs for wider beat variety:
 *   - LFO 3: "Tick" — fast percussive pulse (1-8 Hz range)
 *            shaped by a squared sine, creating rhythmic clicks/taps
 *            that range from slow heartbeat to rapid flutter
 *   - LFO 4: "Swell" — ultra-slow macro envelope (0.005-0.03 Hz)
 *            = 30-200 second cycles. Entire voice breathes in and out
 *            over long arcs. Some somas are inhaling when others exhale.
 *
 * The 4 LFOs multiply together:
 *   gain = lfo1(breathing) × lfo2(golden-polyrhythm) × lfo3(tick) × lfo4(swell)
 * This cross-product creates beat patterns that range from
 * ambient drones to syncopated pulses to rhythmic clicks —
 * all from the same engine, differentiated only by seed.
 *
 * v1 saved as SomaAudio.v1.ts
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
// IRRATIONAL CONSTANTS — the harmonic palette
// ═══════════════════════════════════════════════════════════════
const PHI = (1 + Math.sqrt(5)) / 2;
const SQRT2 = Math.sqrt(2);
const PI_HALF = Math.PI / 2;
const E_HALF = Math.E / 2;
const SQRT3 = Math.sqrt(3);
const RATIOS = [PHI, SQRT2, PI_HALF, E_HALF, SQRT3, 1 / PHI, SQRT2 / PHI, Math.PI / PHI];

// ═══════════════════════════════════════════════════════════════
// VOICE
// ═══════════════════════════════════════════════════════════════
const MAX_VOICES = 5;
const MAX_AUDIO_RANGE = 2500;
const MIN_GAIN = 0.0001;

interface Voice {
  seed: number;
  // Oscillators
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  osc3: OscillatorNode;
  // Gain staging
  oscGain1: GainNode;
  oscGain2: GainNode;
  oscGain3: GainNode;
  mixGain: GainNode;
  masterGain: GainNode;
  // Filter
  filter: BiquadFilterNode;
  // LFOs — 4 rhythm arcs
  lfo1: OscillatorNode;     // breathing (0.03-0.18 Hz)
  lfo1Gain: GainNode;
  lfo2: OscillatorNode;     // golden polyrhythm (lfo1 × φ)
  lfo2Gain: GainNode;
  lfo3: OscillatorNode;     // tick — fast percussive (1-8 Hz)
  lfo3Gain: GainNode;
  lfo3Shaper: WaveShaperNode; // squares the sine → sharper pulse
  lfo4: OscillatorNode;     // swell — ultra-slow macro (0.005-0.03 Hz)
  lfo4Gain: GainNode;
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
// WAVE SHAPER — turns sine into sharper pulse shapes
// ═══════════════════════════════════════════════════════════════
function makeTickCurve(sharpness: number): Float32Array {
  // sharpness 0-1: 0 = sine (smooth), 1 = near-square (percussive)
  const n = 256;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1; // -1 to 1
    // Power curve: raises the sine, making peaks sharper
    // At sharpness=0: linear passthrough. At sharpness=1: steep peaks
    const exp = 1 + sharpness * 4; // 1 to 5
    curve[i] = Math.sign(x) * Math.pow(Math.abs(x), exp);
  }
  return curve;
}

// ═══════════════════════════════════════════════════════════════
// SEED → SOUND
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

  // Custom waveforms — Fourier coefficients from seed
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

  // ── LFO 1: Breathing (original) ──
  const lfoRate1 = 0.03 + rand() * 0.15;
  const lfoDepth1 = 0.15 + rand() * 0.35;

  // ── LFO 2: Golden polyrhythm (original) ──
  const lfoRate2 = lfoRate1 * PHI;
  const lfoDepth2 = 0.10 + rand() * 0.25;

  // ── LFO 3: Tick — fast percussive arc ──
  // BPM range: 60-480 → Hz: 1-8
  // Some somas have a slow heartbeat (1 Hz), others a rapid flutter (8 Hz)
  // The depth controls how percussive vs continuous:
  //   low depth = gentle pulse, high depth = staccato clicks
  const tickBpmNorm = rand(); // 0-1 along the BPM arc
  const lfoRate3 = 1 + tickBpmNorm * 7; // 1-8 Hz
  const lfoDepth3 = 0.05 + rand() * 0.35; // 5-40% — subtle to punchy
  const tickSharpness = rand(); // 0=sine (smooth), 1=square (percussive)

  // ── LFO 4: Swell — ultra-slow macro envelope ──
  // 30-200 second full cycles → 0.005-0.033 Hz
  // This is the "inhale/exhale" of the whole voice over long time arcs
  // When two somas have different swell rates, one breathes in while
  // the other breathes out — natural variation in the soundscape
  const swellPeriod = 30 + rand() * 170; // 30-200 seconds
  const lfoRate4 = 1 / swellPeriod;
  const lfoDepth4 = 0.1 + rand() * 0.4; // 10-50% of total amplitude

  // Filter character
  const filterBase = 150 + rand() * 600;
  const filterQ = 0.5 + rand() * 6;

  // Oscillator mix levels
  const mix1 = 0.3 + rand() * 0.3;
  const mix2 = 0.15 + rand() * 0.25;
  const mix3 = 0.1 + rand() * 0.15;

  return {
    baseFreq, ratio2, ratio3,
    real1, imag1, real2, imag2,
    lfoRate1, lfoRate2, lfoDepth1, lfoDepth2,
    lfoRate3, lfoDepth3, tickSharpness,
    lfoRate4, lfoDepth4,
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
  private _volume = 0.35;

  get enabled() { return this._enabled; }
  get volume() { return this._volume; }

  async init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') await this.ctx.resume();

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
   * Create a voice for a specific soma seed.
   *
   * Signal chain:
   *   osc1 ─→ gain1 ─┐
   *   osc2 ─→ gain2 ─┼→ mixGain ─→ filter ─→ masterGain ─→ compressor
   *   osc3 ─→ gain3 ─┘      ↑
   *                     lfo1 ─→ lfo1Gain ─→ mixGain.gain
   *                     lfo2 ─→ lfo2Gain ─→ mixGain.gain
   *                     lfo3 ─→ shaper ─→ lfo3Gain ─→ mixGain.gain
   *                     lfo4 ─→ lfo4Gain ─→ masterGain.gain
   *
   * LFO 3 goes through a waveshaper to create percussive tick shapes.
   * LFO 4 modulates the master gain (macro swell) separately from
   * the mix, so the tick rhythm rides inside the swell envelope.
   */
  private createVoice(seed: number): Voice {
    const ctx = this.ctx!;
    const p = seedToParams(seed);

    // Custom periodic waves
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

    // Oscillator 3 — sub-harmonic
    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = p.baseFreq * p.ratio3;

    // Per-oscillator gains
    const oscGain1 = ctx.createGain(); oscGain1.gain.value = p.mix1;
    const oscGain2 = ctx.createGain(); oscGain2.gain.value = p.mix2;
    const oscGain3 = ctx.createGain(); oscGain3.gain.value = p.mix3;

    // Mix bus
    const mixGain = ctx.createGain();
    mixGain.gain.value = 1;

    // Filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = p.filterBase;
    filter.Q.value = p.filterQ;

    // ── LFO 1: Breathing ──
    const lfo1 = ctx.createOscillator();
    lfo1.type = 'sine';
    lfo1.frequency.value = p.lfoRate1;
    const lfo1Gain = ctx.createGain();
    lfo1Gain.gain.value = p.lfoDepth1;

    // ── LFO 2: Golden polyrhythm ──
    const lfo2 = ctx.createOscillator();
    lfo2.type = 'sine';
    lfo2.frequency.value = p.lfoRate2;
    const lfo2Gain = ctx.createGain();
    lfo2Gain.gain.value = p.lfoDepth2;

    // ── LFO 3: Tick — fast percussive ──
    const lfo3 = ctx.createOscillator();
    lfo3.type = 'sine';
    lfo3.frequency.value = p.lfoRate3;
    // Waveshaper turns smooth sine into sharper pulse
    const lfo3Shaper = ctx.createWaveShaper();
    lfo3Shaper.curve = makeTickCurve(p.tickSharpness);
    lfo3Shaper.oversample = 'none';
    const lfo3Gain = ctx.createGain();
    lfo3Gain.gain.value = p.lfoDepth3;

    // ── LFO 4: Swell — ultra-slow macro ──
    const lfo4 = ctx.createOscillator();
    lfo4.type = 'sine';
    lfo4.frequency.value = p.lfoRate4;
    const lfo4Gain = ctx.createGain();
    lfo4Gain.gain.value = p.lfoDepth4;

    // Master gain (proximity-controlled)
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;

    // ── Routing ──
    osc1.connect(oscGain1);
    osc2.connect(oscGain2);
    osc3.connect(oscGain3);
    oscGain1.connect(mixGain);
    oscGain2.connect(mixGain);
    oscGain3.connect(mixGain);

    mixGain.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(this.compressor!);

    // LFO 1 + 2 → mix gain (rhythm layer 1: breathing × polyrhythm)
    lfo1.connect(lfo1Gain);
    lfo1Gain.connect(mixGain.gain);
    lfo2.connect(lfo2Gain);
    lfo2Gain.connect(mixGain.gain);

    // LFO 3 → shaper → mix gain (rhythm layer 2: percussive tick)
    lfo3.connect(lfo3Shaper);
    lfo3Shaper.connect(lfo3Gain);
    lfo3Gain.connect(mixGain.gain);

    // LFO 4 → master gain (rhythm layer 3: macro swell)
    // This modulates the ENTIRE voice output, so the tick and
    // breathing patterns ride inside the swell envelope
    lfo4.connect(lfo4Gain);
    lfo4Gain.connect(masterGain.gain);

    // Start all oscillators
    const now = ctx.currentTime;
    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    lfo1.start(now);
    lfo2.start(now);
    lfo3.start(now);
    lfo4.start(now);

    return {
      seed,
      osc1, osc2, osc3,
      oscGain1, oscGain2, oscGain3,
      mixGain, masterGain, filter,
      lfo1, lfo1Gain,
      lfo2, lfo2Gain,
      lfo3, lfo3Gain, lfo3Shaper,
      lfo4, lfo4Gain,
      baseFreq: p.baseFreq,
      filterBase: p.filterBase,
      filterQ: p.filterQ,
      targetGain: 0,
      currentGain: 0,
      active: true,
    };
  }

  private destroyVoice(voice: Voice) {
    voice.active = false;
    const now = this.ctx!.currentTime;

    voice.masterGain.gain.cancelScheduledValues(now);
    voice.masterGain.gain.setValueAtTime(voice.currentGain, now);
    voice.masterGain.gain.linearRampToValueAtTime(0, now + 0.1);

    setTimeout(() => {
      try {
        voice.osc1.stop(); voice.osc2.stop(); voice.osc3.stop();
        voice.lfo1.stop(); voice.lfo2.stop(); voice.lfo3.stop(); voice.lfo4.stop();
        voice.osc1.disconnect(); voice.osc2.disconnect(); voice.osc3.disconnect();
        voice.lfo1.disconnect(); voice.lfo2.disconnect();
        voice.lfo3.disconnect(); voice.lfo4.disconnect();
        voice.oscGain1.disconnect(); voice.oscGain2.disconnect(); voice.oscGain3.disconnect();
        voice.mixGain.disconnect(); voice.filter.disconnect(); voice.masterGain.disconnect();
        voice.lfo1Gain.disconnect(); voice.lfo2Gain.disconnect();
        voice.lfo3Gain.disconnect(); voice.lfo3Shaper.disconnect();
        voice.lfo4Gain.disconnect();
      } catch (_) { /* already stopped */ }
    }, 200);
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

        // Filter opens with proximity
        const cutoff = voice.filterBase + proximity * proximity * 3000;
        voice.filter.frequency.setTargetAtTime(cutoff, now, 0.3);

        // Distant detune (radio dial effect)
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
