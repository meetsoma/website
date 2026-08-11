# scripts/ — build-time and sync tooling

**Read this if:** you are wiring content in from another repo, auditing styles, or debugging why
`pnpm build` produced something you did not author.

**Skip if:** you want the deploy (root `README.md` §Deployment) or runtime code (`functions/`).

**Below:** `fetch-community.mjs` · `scan-styles.mjs` · `sync-docs.sh`

**Update this file when:** a script is added, retired, or moves into/out of the `build` pipeline —
same commit.

## What each one does, and when it runs

| script | runs | effect |
|---|---|---|
| `fetch-community.mjs` | **automatically, first step of `pnpm build`** | re-syncs the whole `community/` tree from the `meetsoma/community` repo |
| `sync-docs.sh` | **manually** | converts the agent repo's `docs/*.md` into `src/content/docs/`, adding collection frontmatter |
| `scan-styles.mjs` | **manually** | audits CSS tokens and classes across `src/` |

⚠ **`fetch-community.mjs` overwrites `community/` on every build.** Any edit made there is lost
without a warning and without a diff — the hub content is authored in `repos/community`, not here.

⚠ **`sync-docs.sh` is one-directional and manual.** A doc fixed in `src/content/docs/` and not in
the agent repo is reverted the next time someone runs it; a doc fixed in the agent repo does not
appear on the site until someone runs it. Both directions fail silently.
