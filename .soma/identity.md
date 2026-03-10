---
type: identity
project: soma-website
created: 2026-03-10
---

# Soma Website

## What This Is

The public face of Soma — `soma.gravicity.ai`. Landing page, docs, blog, and the community hub.

## Stack

- **Astro 5.x** — static-first, islands architecture
- **Preact** — lightweight islands for interactive components (hub filters, version selector)
- **CSS custom properties** — no Tailwind, hand-rolled design system
- **Pagefind** — client-side search
- **Vercel** — static hosting, `npx vercel --prod` to deploy

## Key Files

- `src/lib/hub.ts` — data loader, reads community repo content, GitHub API for versions
- `src/pages/hub/` — hub listing + detail pages
- `src/pages/docs/` — documentation
- `src/pages/blog/` — blog posts
- `scripts/fetch-community.mjs` — pre-build sync from community repo

## Conventions

- No React. Preact islands only when interactivity is needed.
- Static by default. Every page ships zero JS unless an island requires it.
- CSS lives in component `<style>` blocks, uses `var(--token)` design tokens.
- Hub content comes from `meetsoma/community` repo — never hardcode hub data.
- Deploy with `npx vercel --prod` from this directory.
