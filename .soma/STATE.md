---
type: state
method: atlas
project: soma-website
updated: 2026-03-10
status: active
---

# Soma Website — Architecture State

## Current

- Astro 5.17 static site on Vercel
- Hub reads from community repo at build time (GitHub API + raw fetch)
- Tier badges (core/official/community/experimental) on hub cards
- Version history dropdown on detail pages (git commit history)
- Pagefind for client-side search
- No UI framework yet (vanilla JS for interactivity)

## Integrations

| Integration | Status | Purpose |
|-------------|--------|---------|
| @astrojs/sitemap | ✅ Active | SEO |
| @astrojs/rss | ✅ Active | Blog feed |
| @vercel/analytics | ✅ Active | Traffic |
| @astrojs/preact | ⬜ Planned | Interactive islands |
| View Transitions | ⬜ Planned | SPA-like navigation |
| Content Collections | ⬜ Planned | Replace hand-rolled hub.ts parsing |
| Nano Stores | ⬜ Planned | Cross-island state |
| Server Islands | ⬜ Future | Hybrid static + dynamic |

## Pages

| Page | Path | Notes |
|------|------|-------|
| Landing | `/` | Hero, features, CTA |
| Docs | `/docs/` | Getting started, concepts |
| Blog | `/blog/` | Dev blog, changelogs |
| Hub | `/hub/` | Community content browser |
| Hub detail | `/hub/[type]/[slug]` | Protocol/muscle/skill/template detail + version history |
| Roadmap | `/roadmap/` | Public roadmap |
| Ecosystem | `/ecosystem/` | Architecture overview |
