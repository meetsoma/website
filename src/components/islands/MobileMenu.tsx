/**
 * MobileMenu — animated gold 3-dot hamburger for tablet/mobile nav.
 *
 * Matches the /verse/ VerseNav animation: dots merge upward into gold on open.
 * Rendered alongside the server Nav.astro; hidden on desktop via CSS.
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

export default function MobileMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={menuRef}
      class="mobile-menu-root"
    >
      {/* Animated 3-dot trigger — same animation as VerseNav */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Menu"
        aria-expanded={menuOpen}
        class="mobile-menu-trigger"
      >
        {[0, 1, 2].map(i => (
          <span
            key={i}
            class="mobile-menu-dot"
            style={{
              width: menuOpen && i === 0 ? '5px' : '3px',
              height: menuOpen && i === 0 ? '5px' : '3px',
              borderRadius: '50%',
              background: menuOpen ? 'var(--promo, #f0c866)' : 'var(--ink-soft, #9dafc4)',
              boxShadow: menuOpen && i === 0
                ? '0 0 6px var(--promo-glow, rgba(240,200,102,0.4))'
                : 'none',
              transform: menuOpen ? `translateY(${-6 * i}px)` : 'translateY(0)',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
        ))}
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <div class="mobile-menu-dropdown">
          {LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              class="mobile-menu-link"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
