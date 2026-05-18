---
type: state
method: atlas
project: soma-website
updated: 2026-05-18
status: active
---

# Soma Website — Architecture State

## Current

- **Astro 5.18** static site on Vercel — `soma.gravicity.ai`
- **Design tokens** in `src/styles/tincture/_generated/foundation.css` — codegen'd from tincture registry. 30+ color tokens (dark + light surface), Fibonacci spacing, 8-step typography, radii, line-heights
- **`--font-display: 'Manrope'`** (display headlines), `--font-body: 'Satoshi'` (body), `--font-mono: 'SF Mono'` (code)
- **Tincture codegen**: `pnpm tincture:codegen` → regenerates `foundation.css` from `_registry/`
- **HeroTitle component** — centralized σ-for-o swap on every page hero h1. Uses `--promo-text` + `filter: drop-shadow` matching homepage sigma treatment
- **Nav.astro** — accepts optional `centeredTitle` prop + `nav-right-extra` slot. Used by `/verse/` with `centeredTitle="SomaVerse"`. MobileMenu Preact island for tablet/mobile nav
- **SomaIcons** — Lucide-based SVGs for core four + custom utility icons
- Hub reads from community repo at build time (GitHub API + raw fetch)
- Pagefind for client-side search
- ViewTransitions enabled, theme toggle in nav bar
- Preact islands: HubFilters, HubGrid, MobileMenu, RoadmapTimeline, SomaVerse, OrbitalPhysics, CommunityStats, TemplateCarousel, NovaPlayer, TableOfContents, ChangelogIsland

## Branches

| Branch | HEAD | Status |
|--------|------|--------|
| main | `5ffc37d` | Production |
| dev | `d0b14c0` | v0.27.3 roadmap entry |

## Headers (σ-for-o system)

All sub-page heroes use the same `HeroTitle` component:

| Page | Renders | Font |
|------|---------|------|
| /docs/ | Dσcumentation | Manrope |
| /blog/ | Blσg | Manrope |
| /ecosystem/ | The Sσmaverse | Manrope |
| /hub/ | SσmaHub | Manrope |
| /roadmap/ | Rσadmap | Manrope |
| /404/ | Lost in the void (no o) | Manrope |
| / (home) | Sσma (custom inline) | Manrope |
| /verse/ | "SomaVerse" in Nav centeredTitle | Clash Display (verse scope) |

HeroTitle sigma styling matches the homepage: `color: var(--promo-text)` + `filter: drop-shadow(0 0 12px var(--promo-glow))`, inheriting weight/size from parent.

## Design Tokens

### Nav.astro

```astro
<Nav centeredTitle="SomaVerse">
  <Fragment slot="nav-right-extra">
    <button class="verse-audio-btn">...</button>
  </Fragment>
</Nav>
```

- `centeredTitle` (optional) → replaces nav links → centered h1 with σ swap
- `nav-right-extra` slot for extra icons (audio, etc.)
- MobileMenu Preact island for <=768px

## Design Tokens (foundation.css)

Generated source: `src/styles/tincture/_generated/foundation.css`

| Category | Tokens | Scale |
|----------|--------|-------|
| Spacing | `--space-xs` → `--space-4xl` | Fibonacci: 3,5,8,13,21,34,55,89px |
| Typography | `--text-xs` → `--text-3xl` | 8 steps: 0.813→2.25rem |
| Radii | `--radius-sm/md/lg/xl/full` | 4,8,13,21,9999px |
| Line-heights | `--leading-none/tight/normal/relaxed/loose` | 1,1.2,1.4,1.618,1.8 |
| Colors | 30+ custom properties | Dark + light surface via `[data-surface]` |
| Fonts | `--font-display/body/mono` | Manrope, Satoshi, SF Mono |
| Weights | `--weight-regular/medium/semibold/bold/display` | 400,500,600,700,800 |

Design system evolution doc: `.soma/plans/design/design-system.md`

## Icons

`src/components/icons/SomaIcons.astro` — 25 icons (Lucide + custom). See code or `design-system.md` for full list.

## Pages

| Page | Path | Header |
|------|------|--------|
| Landing | `/` | Custom h1 with Sσma |
| Docs index | `/docs/` | HeroTitle "Documentation" |
| Docs detail | `/docs/[slug]` | h1 doc title (DocsLayout) |
| Blog index | `/blog/` | HeroTitle "Blog" |
| Blog detail | `/blog/[slug]` | h1 article title |
| Hub index | `/hub/` | HeroTitle "SomaHub" |
| Hub detail | `/hub/[type]/[slug]` | h1 item name |
| Roadmap | `/roadmap/` | HeroTitle "Roadmap" |
| Ecosystem | `/ecosystem/` | HeroTitle "The Somaverse" |
| Verse | `/verse/` | Nav centeredTitle (h1) "SomaVerse" |
| 404 | `/404/` | HeroTitle "Lost in the void" |
| Changelog | `/docs/changelog` | Redirect from `/changelog/` |
| Beta | `/beta/` | — |

## Key Files

| File | Purpose |
|------|---------|
| `src/styles/tincture/_generated/foundation.css` | Generated design tokens (tincture codegen) |
| `src/layouts/Layout.astro` | Root layout, theme system, global h1/h2/h3 typography |
| `src/layouts/DocsLayout.astro` | Docs sidebar, TOC, prose styles |
| `src/components/Nav.astro` | Global nav with optional centeredTitle + slot |
| `src/components/HeroTitle.astro` | Page hero h1 with centralized σ-for-o swap |
| `src/components/islands/MobileMenu.tsx` | Tablet/mobile hamburger menu |
| `src/components/icons/SomaIcons.astro` | Icon component (25 icons) |
| `src/lib/hub.ts` | Hub data loader |
| `src/lib/blog.ts` | Blog/docs helpers |
| `scripts/fetch-community.mjs` | Pre-build community repo sync |
