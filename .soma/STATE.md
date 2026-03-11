---
type: state
method: atlas
project: soma-website
updated: 2026-03-11
status: active
---

# Soma Website — Architecture State

## Current

- **Astro 5.18** static site on Vercel — `soma.gravicity.ai`
- **Design system tokens** in Layout.astro `:root` — spacing (Fibonacci), typography (8-step), radii, line-heights
- **SomaIcons** — Lucide-based SVGs for core four + custom utility icons
- Hub reads from community repo at build time (GitHub API + raw fetch)
- Pagefind for client-side search
- ViewTransitions enabled, theme toggle in nav bar
- Preact islands for hub filters/grid (HubFilters, HubGrid)

## Branches

| Branch | HEAD | Status |
|--------|------|--------|
| main | `5ffc37d` | Production — theme toggle, nav bar |
| dev | `aa1bc59` | +4 ahead — design tokens, Lucide icons |

## Design Tokens

Defined in `src/layouts/Layout.astro` `:root`:

| Category | Tokens | Scale |
|----------|--------|-------|
| Spacing | `--space-xs` → `--space-4xl` | Fibonacci: 3,5,8,13,21,34,55,89px |
| Typography | `--text-xs` → `--text-3xl` | 8 steps: 0.7→2.25rem |
| Radii | `--radius-sm/md/lg/xl/full` | 4,8,13,21,9999px |
| Line-heights | `--leading-none/tight/normal/relaxed/loose` | 1,1.2,1.4,1.618,1.8 |
| Colors | 30+ custom properties | Dark + light theme |
| Fonts | `--font-display/body/mono` | Clash Display, Satoshi, SF Mono |

## Icons

`src/components/icons/SomaIcons.astro` — 25 icons:

| Name | Source | Concept |
|------|--------|---------|
| extensions | Lucide/plug | System hooks, plugins |
| skills | Lucide/book-open | Knowledge, expertise |
| muscles | Lucide/zap | Learned patterns, reflex |
| protocols | Lucide/dna | Behavioral DNA, rules |
| memory | Lucide/atom | Persistent state, orbital |
| sigma | Custom | Soma brand mark |
| terminal | Custom | Command prompt |
| you | Custom | User/person |
| pi | Custom | Runtime framework |
| dna | Alias→protocols | Backward compat |
| wand | Lucide/wand-sparkles | Rituals, magic |
| brain | Lucide/brain | Dynamic prompts, intelligence |
| shield | Lucide/shield-check | Security, screening |
| upload | Lucide/upload | Publishing |
| link | Lucide/link | Vault sync, connections |
| mic | Lucide/mic | Voice extension |
| wrench | Lucide/wrench | DevOps, tools |
| pen-line | Lucide/pen-line | Writing, content |
| ruler | Lucide/ruler | Architecture, structure |
| flask | Lucide/flask-conical | Experiments |
| arrow-right | Lucide/arrow-right | Navigation, get started |
| settings | Lucide/settings | Config, scripts |
| layers | Lucide/layers | Templates, stacking |
| circle-dot | Lucide/circle-dot | Target, default |
| search | Lucide/search | Search |

### Preact Island Icons

`src/lib/icons.ts` — shared SVG string map for client-side islands (HubGrid, HubFilters).
Contains: protocols, muscles, skills, templates, scripts, all.

## Integrations

| Integration | Status |
|-------------|--------|
| @astrojs/sitemap | ✅ Active |
| @astrojs/rss | ✅ Active |
| @vercel/analytics | ✅ Active |
| @astrojs/preact | ✅ Active |
| View Transitions | ✅ Active |
| Pagefind | ✅ Active |
| Content Collections (docs, blog) | ✅ Active |
| Content Collections (hub) | ⬜ Planned |
| Nano Stores | ⬜ Planned |
| Server Islands | ⬜ Future |

## Pages

| Page | Path | Content |
|------|------|---------|
| Landing | `/` | Hero, four layers, features, ecosystem, CTA |
| Docs index | `/docs/` | Section cards, quick links |
| Docs detail | `/docs/[slug]` | MDX content, sidebar, TOC, breadcrumbs |
| Blog index | `/blog/` | Post listing |
| Blog detail | `/blog/[slug]` | Post content |
| Hub index | `/hub/` | Evolution banner, filters, content grid |
| Hub detail | `/hub/[type]/[slug]` | Content detail, version history, install |
| Roadmap | `/roadmap/` | Wave-based public roadmap |
| Ecosystem | `/ecosystem/` | Orbital diagram, four-layer deep dive |

## Key Files

| File | Purpose |
|------|---------|
| `src/layouts/Layout.astro` | Root layout, design tokens, theme system |
| `src/layouts/DocsLayout.astro` | Docs sidebar, TOC, prose styles |
| `src/components/icons/SomaIcons.astro` | Icon component |
| `src/components/Nav.astro` | Global nav bar + theme toggle |
| `src/lib/hub.ts` | Hub data loader |
| `src/lib/blog.ts` | Blog/docs helpers |
| `scripts/fetch-community.mjs` | Pre-build community repo sync |
