# api/ — DEAD. Nothing here runs.

**Read this if:** you landed on `api/beta-signup.js` looking for the signup endpoint. You are in the
wrong directory — the live one is `functions/api/beta-signup.js`.

**Skip if:** always, for every purpose except deleting this folder.

**Below:** `beta-signup.js` — a Vercel serverless handler, kept only as the pre-migration record.

**Update this file when:** this folder is deleted — delete this file with it.

## Why it is still here

`api/` is the **Vercel** convention. The site moved to Cloudflare Pages on 2026-07-31 (`7b0b0cf`),
where the serverless convention is `functions/`. The handler was converted, the original was never
removed, and `vercel.json` is a fossil for the same reason.

**Verified at the artifact, not the config:** `curl -sI https://soma.gravicity.ai` returns
`server: cloudflare` with a `cf-ray` header and no Vercel header. There is no `.github/workflows/`.
Nothing deploys this file anywhere.

⚠ **The two files are not copies** — different content, different signatures, same route name. The
dead one is 4 months older and reads as current. That is the whole hazard: a plausible file at an
obvious path that has no effect.

**Deleting this folder is the real fix**; this doorway is the cheap one.
