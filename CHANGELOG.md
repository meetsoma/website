# Changelog

All notable changes to the Soma website.

## [Unreleased]

### Added
- Blog post: "Eating Our Own Memory" — dogfooding narrative (`a5926b3`)
- `soma-verify.sh copy` — automated marketing copy verification against source of truth

### Fixed
- Ecosystem page: protocol count 15→14 (matched actual hub)
- Ecosystem page: muscle examples now match real hub content (was: blog-writing, pre-publish-cleanup, pr-release-workflow — none existed)
- Homepage: muscle examples now match real hub content (was: deployment, pr-workflow, logo-design — none existed)
- Roadmap: removed 5 shipped items from "What's Next" (belonged in timeline)
- Roadmap: "soma install Wiring" was "In Progress" but shipped 2026-03-12
- Removed "Heat system is enterprise" — heat ships free in npm package
- Template description referenced non-existent "blog-writing muscle"

### Changed
- Roadmap: added "AMPS Automations" as In Progress
- Doc sync from agent dev (13 pages updated)

## [2026-03-14] — Launch + First Release

### Added
- Blog posts: "Introducing Soma", "The Scripts We Deleted"
- Changelog page with Preact island (`ChangelogIsland.tsx`)
- Roadmap page with timeline island (`RoadmapTimeline.tsx`)
- Hub page with content grid, filters, template detail pages
- Ecosystem page with orbital diagram
- Docs: 13 pages synced from agent
- `changelog.json` and `roadmap.json` data files
- Copy button on code blocks
- Recent posts card on homepage
- Breadcrumb navigation
- Full responsive design
- Starfield + nebula background effects
- Custom icon set (`SomaIcons.astro`)

### Infrastructure
- Astro static site on Vercel
- Git integration: push main = deploy
- Dev branch workflow (work on dev, merge to main to ship)
