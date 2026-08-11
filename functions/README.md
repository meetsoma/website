# functions/ — the LIVE serverless surface (Cloudflare Pages Functions)

**Read this if:** you are changing anything that runs on the server — the beta signup endpoint, or
a new `/api/*` route.

**Skip if:** you want a page or component (`src/`), or the deploy procedure (root `README.md`).

**Below:** `api/`

**Update this file when:** a function is added or removed, or a required Pages secret changes —
same commit.

## 🔴 There are TWO `beta-signup.js` files. This is the one that runs.

| file | shape | status |
|---|---|---|
| `functions/api/beta-signup.js` | `export async function onRequest({ request, env })` | **LIVE** — Cloudflare Pages Function, added in the CF migration (`7b0b0cf`, 2026-07-31) |
| `api/beta-signup.js` (repo root) | `export default async function handler(req, res)` | **DEAD** — Vercel serverless shape, last touched `6f28fc8`, 2026-03-19 |

Both declare the route `/api/beta-signup`, and the dead one looks entirely plausible. **Editing it
to fix a signup bug changes nothing on the live site.** See `api/README.md`.

## Secrets and the failure mode

Set as Pages environment variables, never in the repo: `GITHUB_APP_ID`, `GITHUB_INSTALL_ID`, and
`GITHUB_APP_PEM_B64` (preferred) or `GITHUB_APP_PEM`.

⚠ **Missing credentials do not surface as an error.** The handler logs the signup and still returns
success, so the form never looks broken — which means *a silent credential outage looks exactly like
a working form*. Verify a real signup produced a GitHub Issue; do not infer it from the response.

Requires the `nodejs_compat` flag (`wrangler.jsonc`) for `crypto.createSign` + `Buffer`.
