<div align="center">

### σ soma.gravicity.ai

**Website, docs, and blog for Soma.**

[**soma.gravicity.ai**](https://soma.gravicity.ai) · [Docs](https://soma.gravicity.ai/docs) · [Blog](https://soma.gravicity.ai/blog) · [Hub](https://soma.gravicity.ai/hub) · [Roadmap](https://soma.gravicity.ai/roadmap)

</div>

---

**Read this if:** you are changing anything that ships to soma.gravicity.ai — a page, a doc, a blog
post, the roadmap, or the build.
**Skip if:** you want the agent itself (`repos/agent`) or the hub content this site renders
(`repos/community` — `community/` here is a build-time COPY, never edit it).
**Below:** `src/` · `functions/` · `scripts/` · `logos/` · `api/` (dead) · `public/` + `community/`
(both served or generated — no doorway, see `.doorwayignore`)
**Update this file when:** the deploy target, the branch flow, or a Content Source row changes —
same commit.

## Stack

- **Astro** — static site with islands
- **Cloudflare Pages** — project `soma-site` (`wrangler.jsonc`). **Deploys are MANUAL** — see below
- **Content** — Markdown collections (docs, blog, changelog)

<!-- CORRECTED 2026-08-11 (s01-54fe75): this said "Vercel — auto-deploys from main branch", and
     the Deployment block below said `git push  # Vercel auto-deploys`. BOTH HALVES WERE FALSE.
     Verified at the artifact, not the config: `curl -sI https://soma.gravicity.ai` returns
     `server: cloudflare` + a `cf-ray` header and no Vercel header; `wrangler.jsonc` names the
     Pages project; `.github/workflows/` does not exist, so nothing auto-deploys anything.
     `vercel.json` is a fossil kept only because deleting it is a separate call.
     Cost of the lie: someone merges to main, pushes, and believes the site is live. It is not. -->

## Development

```bash
pnpm install
pnpm dev          # localhost:4321
```

## Deployment

⚠ **Nothing auto-deploys.** There is no CI workflow in this repo. Pushing `main` ships nothing;
the last step below is the only thing that puts bytes on the live site.

```bash
# 1 · work on dev
git checkout dev
git add -A && git commit -m "docs: ..." && git push

# 2 · fast-forward main (record only — this does NOT deploy)
git checkout main && git merge dev --ff-only && git push && git checkout dev

# 3 · DEPLOY — build from dev, publish to Cloudflare Pages
pnpm deploy                 # = pnpm build && pnpm dlx wrangler pages deploy dist --project-name soma-site
```

Add `--commit-dirty=true` when the workspace is dirty and you accept it. **Verify at the artifact,
not the command's exit code:** `curl -sI https://soma.gravicity.ai` — `server: cloudflare` plus a
fresh `cf-ray`, then load the page you changed.

## Content Sources

| Content | Source | Sync |
|---|---|---|
| **Docs** | `repos/agent/docs/*.md` | Manual copy → preserve Astro frontmatter |
| **Blog** | Written here in `src/content/blog/` | Native |
| **Changelog** | `repos/agent/CHANGELOG.md` | `soma-changelog-json.sh --sync` |
| **Roadmap** | `public/data/roadmap.json` | **Curated by hand.** 🔴 `soma-changelog-json.sh:158-163` writes it **only when missing** — so deleting it to "regenerate" is the one action that silently replaces curated copy with generated copy, and the script reports success either way. Its own `"generated"/"source"` fields record how it was FIRST created, not how it is maintained |
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
