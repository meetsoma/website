/**
 * TableOfContents — Preact island for right-sidebar TOC.
 * Parses headings from the rendered article on mount,
 * highlights current section on scroll.
 */
import { useState, useEffect, useRef } from 'preact/hooks';

interface TocEntry {
  id: string;
  text: string;
  level: number;
}

export default function TableOfContents() {
  const [entries, setEntries] = useState<TocEntry[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Parse headings from the prose section
    const article = document.querySelector('.prose');
    if (!article) return;

    const headings = article.querySelectorAll('h2, h3');
    const parsed: TocEntry[] = [];

    headings.forEach((h) => {
      // Ensure heading has an id
      if (!h.id) {
        h.id = h.textContent
          ?.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || '';
      }
      if (h.id) {
        parsed.push({
          id: h.id,
          text: h.textContent || '',
          level: h.tagName === 'H2' ? 2 : 3,
        });
      }
    });

    setEntries(parsed);

    // Intersection observer for active tracking
    if (observerRef.current) observerRef.current.disconnect();

    const observer = new IntersectionObserver(
      (ents) => {
        // Find the first visible heading
        for (const entry of ents) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );

    headings.forEach((h) => observer.observe(h));
    observerRef.current = observer;

    return () => observer.disconnect();
  }, []);

  if (entries.length < 3) return null; // Don't show TOC for short pages

  return (
    <nav class="toc" aria-label="On this page">
      <h4 class="toc-title">On this page</h4>
      <ul class="toc-list">
        {entries.map((e) => (
          <li key={e.id} class={`toc-item ${e.level === 3 ? 'toc-sub' : ''}`}>
            <a
              href={`#${e.id}`}
              class={`toc-link ${activeId === e.id ? 'active' : ''}`}
              onClick={(ev) => {
                ev.preventDefault();
                document.getElementById(e.id)?.scrollIntoView({ behavior: 'smooth' });
                setActiveId(e.id);
              }}
            >
              {e.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
