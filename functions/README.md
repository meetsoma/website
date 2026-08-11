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

⚠ **THREE separate failure paths return `success: true`**, so a broken signup and a working one are
indistinguishable from the browser [read: `api/beta-signup.js`]:

| line | failure | what the user sees |
|---|---|---|
| `:43-48` | missing env vars | *"Request received — we'll follow up by email."* |
| `:56-58` | JWT creation failed | the same message |
| `:103-104` | **GitHub rejected the issue** | *"Request received"* |

Only an unexpected throw returns 500 (`:106-108`). The design is deliberate — the form must never
look broken — but it means **a silent outage is invisible from the outside for as long as it lasts.**

⇒ **Verify a signup by checking the GitHub Issue exists, never by the HTTP response.** If you are
changing this file, the tail of `wrangler pages deployment tail` is the only place the failure shows.

Requires the `nodejs_compat` flag (`wrangler.jsonc`) for `crypto.createSign` + `Buffer`.
