/**
 * VerseNav — minimal overlay nav for the full-page SomaVerse.
 *
 * Left: σ logo + ⋮ vertical dots (menu trigger)
 * Center: "SomaVerse" wordmark
 * Right: theme toggle
 * Menu dropdown: site nav links
 */
import { useState, useRef, useEffect } from 'preact/hooks';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/docs', label: 'Docs' },
  { href: '/blog', label: 'Blog' },
  { href: '/ecosystem', label: 'Ecosystem' },
  { href: '/hub', label: 'Hub' },
  { href: '/roadmap', label: 'Roadmap' },
];

export default function VerseNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Listen for audio state changes from SomaVerse
  useEffect(() => {
    const handler = (e: Event) => {
      setAudioOn((e as CustomEvent).detail.enabled);
    };
    window.addEventListener('soma-audio-state', handler);
    return () => window.removeEventListener('soma-audio-state', handler);
  }, []);

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Close on escape
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [menuOpen]);

  const toggleTheme = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    root.style.colorScheme = next;
    localStorage.setItem('soma-theme', next);
  };

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      height: '55px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 20px',
      background: 'rgba(5, 8, 16, 0.4)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(132, 148, 170, 0.08)',
      pointerEvents: 'auto',
    }}>

      {/* Left: σ + ⋮ menu */}
      <div ref={menuRef} style={{ position: 'absolute', left: '20px', display: 'flex', alignItems: 'center', gap: '2px' }}>
        <a
          href="/"
          style={{
            fontFamily: "var(--font-display, 'Clash Display', system-ui)",
            fontSize: '1.5rem',
            fontWeight: 600,
            color: 'var(--accent-bright, #6898be)',
            textDecoration: 'none',
            lineHeight: 1,
            transition: 'color 0.2s, text-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--moon-bright, #7cb2d4)';
            (e.currentTarget as HTMLElement).style.textShadow = '0 0 20px var(--moon-glow, rgba(124,178,212,0.4))';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--accent-bright, #6898be)';
            (e.currentTarget as HTMLElement).style.textShadow = 'none';
          }}
        >
          σ
        </a>

        {/* Vertical 3-dot menu trigger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            width: '28px',
            height: '28px',
            background: menuOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            padding: 0,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = menuOpen ? 'rgba(255,255,255,0.08)' : 'transparent'; }}
        >
          <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--text-secondary, #8494aa)' }} />
          <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--text-secondary, #8494aa)' }} />
          <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--text-secondary, #8494aa)' }} />
        </button>

        {/* Dropdown menu */}
        {menuOpen && (
          <div style={{
            position: 'absolute',
            top: '42px',
            left: 0,
            background: 'rgba(8, 12, 22, 0.94)',
            border: '1px solid rgba(132, 148, 170, 0.12)',
            borderRadius: '10px',
            padding: '6px',
            minWidth: '160px',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            animation: 'verseMenuIn 0.15s ease-out',
          }}>
            {LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  display: 'block',
                  padding: '8px 14px',
                  fontFamily: "var(--font-body, 'Satoshi', system-ui)",
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'var(--text-secondary, #8494aa)',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  transition: 'color 0.12s, background 0.12s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-primary, #e4eaf4)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary, #8494aa)';
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Center: SomaVerse wordmark */}
      <span style={{
        fontFamily: "var(--font-display, 'Clash Display', system-ui)",
        fontSize: '1.1rem',
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase' as const,
        color: 'var(--text-primary, rgba(228, 234, 244, 0.7))',
        userSelect: 'none',
      }}>
        SomaVerse
      </span>

      {/* Right: audio + theme toggle + GitHub */}
      <div style={{ position: 'absolute', right: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* Soma Radio toggle */}
        <button
          onClick={() => window.dispatchEvent(new Event('soma-audio-toggle'))}
          aria-label={audioOn ? 'Mute Soma Radio' : 'Enable Soma Radio'}
          title={audioOn ? 'Soma Radio: On' : 'Soma Radio: Off'}
          style={{
            display: 'grid',
            placeItems: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: 'none',
            background: audioOn ? 'rgba(104, 152, 190, 0.15)' : 'transparent',
            cursor: 'pointer',
            color: audioOn ? 'var(--accent-bright, #6898be)' : 'var(--text-secondary, #8494aa)',
            transition: 'color 0.15s, background 0.15s',
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = audioOn ? 'var(--accent-bright, #6898be)' : 'var(--text-primary, #e4eaf4)';
            (e.currentTarget as HTMLElement).style.background = audioOn ? 'rgba(104, 152, 190, 0.2)' : 'rgba(255,255,255,0.06)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = audioOn ? 'var(--accent-bright, #6898be)' : 'var(--text-secondary, #8494aa)';
            (e.currentTarget as HTMLElement).style.background = audioOn ? 'rgba(104, 152, 190, 0.15)' : 'transparent';
          }}
        >
          {/* Speaker icon with wave lines */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            {audioOn ? (
              <>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </>
            ) : (
              <>
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </>
            )}
          </svg>
          {/* Subtle pulse indicator when active */}
          {audioOn && (
            <span style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: 'var(--accent-bright, #6898be)',
              animation: 'somaRadioPulse 2s ease-in-out infinite',
            }} />
          )}
        </button>

        <a
          href="https://github.com/meetsoma"
          target="_blank"
          rel="noopener"
          aria-label="GitHub"
          style={{
            display: 'grid',
            placeItems: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            color: 'var(--text-secondary, #8494aa)',
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--text-primary, #e4eaf4)';
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary, #8494aa)';
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
          </svg>
        </a>
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          style={{
            display: 'grid',
            placeItems: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--text-secondary, #8494aa)',
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--text-primary, #e4eaf4)';
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary, #8494aa)';
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          {/* Sun icon (shown in dark mode via CSS) */}
          <svg class="verse-theme-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v2"/><path d="M12 20v2"/>
            <path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/>
            <path d="M2 12h2"/><path d="M20 12h2"/>
            <path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
          </svg>
          {/* Moon icon (shown in light mode via CSS) */}
          <svg class="verse-theme-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
          </svg>
        </button>
      </div>
    </header>
  );
}
