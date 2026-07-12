/**
 * NovaPlayer — "Narrated by Nova" audio island for blog posts.
 *
 * Custom player with Soma brand: σ mark as the play button, breathing
 * animation tied to Soma's breath-cycle motif, brand palette, speed
 * control (persisted), download link. Mobile-friendly.
 *
 * Renders into the <figure class="nova-player"> host element; the Astro
 * wrapper (ListenToPost.astro) provides the src + metadata as data attrs.
 *
 * s01-8c5230 — initial.
 */
import { useState, useEffect, useRef } from 'preact/hooks';

interface Props {
  src: string;
  title: string;
  sizeKB?: number;
  /**
   * Pre-computed duration (seconds). Edge TTS MP3s often lack Xing/Info
   * headers, so browsers can't determine total duration from metadata.
   * Passing this as a build-time prop makes "5:32" show immediately.
   * Falls back to client-side audio.duration if omitted.
   */
  durationSec?: number;
}

const SPEEDS = [1, 1.25, 1.5, 1.75, 2] as const;
const SPEED_KEY = 'nova-player.speed';

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) return '—:—';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function NovaPlayer({ src, title, sizeKB, durationSec }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(durationSec != null);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationSec ?? 0);
  const [speed, setSpeed] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  // Load persisted speed
  useEffect(() => {
    try {
      const s = parseFloat(localStorage.getItem(SPEED_KEY) || '1');
      if (SPEEDS.includes(s as (typeof SPEEDS)[number])) setSpeed(s);
    } catch {}
  }, []);

  // Apply speed to audio element
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play().catch((e) => setError(e.message));
    } else {
      a.pause();
    }
  };

  const cycleSpeed = () => {
    const i = SPEEDS.indexOf(speed as (typeof SPEEDS)[number]);
    const next = SPEEDS[(i + 1) % SPEEDS.length];
    setSpeed(next);
    try { localStorage.setItem(SPEED_KEY, String(next)); } catch {}
  };

  const onSeek = (e: MouseEvent | TouchEvent) => {
    const a = audioRef.current;
    const rail = railRef.current;
    if (!a || !rail || !duration) return;
    const rect = rail.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const pct = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    a.currentTime = pct * duration;
    setCurrent(a.currentTime);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle();
    } else if (e.key === 'ArrowRight') {
      if (audioRef.current) audioRef.current.currentTime += 10;
    } else if (e.key === 'ArrowLeft') {
      if (audioRef.current) audioRef.current.currentTime -= 10;
    }
  };

  const pct = duration ? (current / duration) * 100 : 0;

  return (
    <div
      class={`nova-player ${playing ? 'is-playing' : 'is-paused'} ${!ready ? 'is-loading' : ''}`}
      onKeyDown={onKeyDown}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onPlay={() => { setPlaying(true); setError(null); }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => {
          const a = e.currentTarget as HTMLAudioElement;
          // Only use client-side duration if we didn't receive a build-time one
          // OR the client value is finite (Edge TTS MP3s often report Infinity).
          if (durationSec == null && isFinite(a.duration) && a.duration > 0) {
            setDuration(a.duration);
          }
          setReady(true);
        }}
        onTimeUpdate={(e) => setCurrent((e.currentTarget as HTMLAudioElement).currentTime)}
        onError={() => setError('audio failed to load')}
      />

      <button
        class="nova-play-btn"
        aria-label={playing ? 'Pause narration' : 'Play narration'}
        aria-pressed={playing}
        onClick={toggle}
        disabled={!!error}
      >
        <svg class="nova-mark" viewBox="0 0 64 64" aria-hidden="true">
          <defs>
            <radialGradient id="nova-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#7cb2d4" stop-opacity="0.9" />
              <stop offset="60%" stop-color="#6494be" stop-opacity="0.6" />
              <stop offset="100%" stop-color="#6494be" stop-opacity="0" />
            </radialGradient>
          </defs>
          <circle class="nova-mark-halo" cx="32" cy="32" r="30" fill="url(#nova-glow)" />
          <circle class="nova-mark-ring" cx="32" cy="32" r="26" fill="none" stroke="#6494be" stroke-width="1.5" />
          {playing ? (
            <g class="nova-mark-bars" fill="#c9d1d9">
              <rect x="24" y="22" width="4" height="20" rx="1" />
              <rect x="36" y="22" width="4" height="20" rx="1" />
            </g>
          ) : (
            <path class="nova-mark-tri" d="M27 22 L27 42 L43 32 Z" fill="#c9d1d9" />
          )}
        </svg>
      </button>

      <div class="nova-body">
        <div class="nova-labels">
          <span class="nova-eyebrow">
            <span class="nova-dot" aria-hidden="true" />
            Narrated by Nova
          </span>
          <span class="nova-title">{title}</span>
        </div>

        <div
          ref={railRef}
          class="nova-rail"
          role="slider"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={current}
          aria-valuetext={`${fmtTime(current)} of ${fmtTime(duration)}`}
          tabIndex={0}
          onClick={onSeek as any}
          onTouchStart={onSeek as any}
        >
          <div class="nova-rail-fill" style={{ width: `${pct}%` }} />
          <div class="nova-rail-head" style={{ left: `${pct}%` }} />
        </div>

        <div class="nova-meta">
          <span class="nova-time">
            <span class="nova-time-current">{fmtTime(current)}</span>
            <span class="nova-time-sep"> / </span>
            <span class="nova-time-total">{fmtTime(duration)}</span>
          </span>
          <div class="nova-controls">
            <button
              class="nova-speed"
              onClick={cycleSpeed}
              aria-label={`Playback speed: ${speed} times. Click to cycle.`}
              title="Playback speed"
            >
              {speed}×
            </button>
            <a
              class="nova-download"
              href={src}
              download
              aria-label="Download narration as MP3"
              title={sizeKB != null ? `Download (${sizeKB < 1024 ? `${sizeKB} KB` : `${(sizeKB/1024).toFixed(1)} MB`})` : 'Download MP3'}
            >
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path d="M8 1v9m0 0l-3-3m3 3l3-3M2 13h12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </a>
          </div>
        </div>

        {error && <div class="nova-error">{error}</div>}
      </div>
    </div>
  );
}
