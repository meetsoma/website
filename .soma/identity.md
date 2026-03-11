---
type: identity
project: soma-website
created: 2026-03-10
updated: 2026-03-11
---

# Soma Website

## What This Is

The public face of Soma — `soma.gravicity.ai`. Landing page, documentation, blog, community hub, ecosystem overview, and public roadmap.

## Stack

- **Astro 5.18** — static-first, islands architecture, ViewTransitions
- **Preact** — lightweight islands for interactive components (hub filters, grid)
- **Design tokens** — Fibonacci spacing, 8-step type scale, no Tailwind
- **SomaIcons** — Lucide-based SVGs (plug, book-open, zap, dna, atom) + custom utility
- **Pagefind** — client-side search index, built post-build
- **Vercel** — static hosting, deploy with `npx vercel --prod`

## Design Philosophy

- **Deep space palette** — dark by default, warm light mode
- **Fibonacci spacing** — 3, 5, 8, 13, 21, 34, 55, 89px mapped to `--space-xs` → `--space-4xl`
- **Golden ratio** — `1.618` line-height for body prose
- **Atmospheric depth** — canvas starfield, noise overlay, glow orbs, frosted glass nav
- **Zero JS by default** — every page ships static unless an island requires interactivity

## Conventions

- CSS lives in component `<style>` blocks, always uses `var(--token)` design tokens
- Icons use `<Icon name="...">` component, never raw emoji for Soma concepts
- Hub content fetched from `meetsoma/community` at build time — never hardcoded
- Docs and blog use Content Collections (MDX)
- No React. Preact islands only when interactivity is required.
- All colors defined as CSS custom properties with dark/light theme variants
- Deploy: `npx vercel --prod` from this directory

## Parent Workspace

This project lives under `products/soma/website/` in the Gravicity monorepo. The agent repo, CLI, and community hub are siblings.
