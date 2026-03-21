<div align="center">

### σ soma.gravicity.ai

**Website, docs, and blog for Soma.**

[**soma.gravicity.ai**](https://soma.gravicity.ai) · [Docs](https://soma.gravicity.ai/docs) · [Blog](https://soma.gravicity.ai/blog) · [Hub](https://soma.gravicity.ai/hub) · [Roadmap](https://soma.gravicity.ai/roadmap)

</div>

---

## Stack

- **Astro** — static site with islands
- **Vercel** — auto-deploys from `main` branch
- **Content** — Markdown collections (docs, blog, changelog)

## Development

```bash
pnpm install
pnpm dev          # localhost:4321
```

## Deployment

```bash
# Work on dev branch
git checkout dev
# ... make changes ...
git add -A && git commit -m "docs: ..."
git push

# Deploy: merge to main
git checkout main
git merge dev --ff-only
git push                    # Vercel auto-deploys
git checkout dev
```

## Content Sources

| Content | Source | Sync |
|---|---|---|
| **Docs** | `repos/agent/docs/*.md` | Manual copy → preserve Astro frontmatter |
| **Blog** | Written here in `src/content/blog/` | Native |
| **Changelog** | `repos/agent/CHANGELOG.md` | `soma-changelog-json.sh --sync` |
| **Roadmap** | `public/data/roadmap.json` | Curated (don't auto-overwrite) |
| **Hub** | `repos/community/hub-index.json` | `fetch-community.mjs` at build |

## Structure

```
src/
  content/
    docs/          27 documentation pages
    blog/          published posts
  pages/           Astro routes
  layouts/         DocsLayout, BlogLayout
  components/      islands (changelog, roadmap, hub)
public/
  data/            changelog.json, roadmap.json
```

<sub>BSL 1.1 © Curtis Mercier — open source 2027</sub>
