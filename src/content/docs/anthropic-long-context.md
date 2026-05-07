---
title: Anthropic Long-Context (1M) Billing
description: How Sonnet 4.6's 1M context tier works under OAuth, and what to enable on the account vs the client.
---

# Anthropic Long-Context (1M) Billing

Sonnet 4.6 supports up to 1M token context. Above ~200K, requests bill at the "extra usage" tier and require explicit account-side enrollment + client-side opt-in. Get either out of order and the API rejects every request.

## The two switches

| Where | What | Default | Required when |
|---|---|---|---|
| **Anthropic account** | Long-context billing enrollment ([claude.ai/settings/usage](https://claude.ai/settings/usage)) | OFF for most plans | Always — flip this FIRST |
| **Soma settings** | `anthropic.enableLongContext: true` in `.soma/settings.json` | `false` | After account enrollment is verified |

Both must be on. If only the client is on (account isn't enrolled): Anthropic returns `429 "Extra usage is required for long context requests"` on EVERY request — even at 0% context. There's no graceful degradation; it's a hard reject.

## Why the rejection looks weird

Anthropic packs billing-tier rejections into a `rate_limit_error` envelope:

```json
{
  "type": "error",
  "error": {
    "type": "rate_limit_error",
    "message": "Extra usage is required for long context requests."
  },
  "request_id": "req_..."
}
```

That triggers retry logic (Pi's `_isRetryableError` matches `rate_limit`), and Soma's keepalive pauses on rate-limit too. Three downstream behaviors fire from one billing-tier rejection:

1. Pi auto-retries (until `retry.enabled: false` or `retry.maxRetries` hits)
2. Soma's `error-sanitizer` rewrites the raw 429 → friendly "Anthropic billing check failed"
3. Soma's keepalive pauses with `⏸ Keepalive auto-paused — rate limited`

All three are technically correct responses to a 429 — but the underlying problem is billing tier, not transient rate limiting. Look at the error MESSAGE (not the type) to disambiguate.

## How Soma injects the beta header

The mechanism is `scripts/_dev/patches/apply-patches.sh` (build-time string injection into `node_modules/@mariozechner/pi-ai/dist/providers/anthropic.js`). It adds `context-1m-2025-08-07` to the OAuth `anthropic-beta` header.

The patch is **disabled by default** (s01-a54f21, SX-727 reversed). To enable:

1. Verify long-context billing is on at [claude.ai/settings/usage](https://claude.ai/settings/usage)
2. Set `anthropic.enableLongContext: true` in `~/.soma/settings.json` (or workspace)
3. Currently: re-apply the patch manually (auto-apply on settings flip = SX-741 follow-up)

## Per-model behavior under OAuth

| Model | Native context | 1M opt-in needed? |
|---|---|---|
| Sonnet 4.6 | 200K under OAuth | YES — `context-1m-2025-08-07` header + account billing |
| Opus 4.7 | 1M under OAuth | NO — Anthropic granted Claude Code OAuth clients native 1M |
| Sonnet/Opus via API key | Same model defaults; per-token billing instead of plan | Header + account billing still apply |

If you're routing long-context work to Opus, none of this applies. If you're on Sonnet and want past 200K, both switches.

## Practical patterns

**Don't flip the client setting until the account is enrolled.** Order of operations matters more than anything else here. Flipping the setting first will lock you out of every session.

**Watch the 200K mark on Sonnet.** Above that, even with both switches on, you're paying long-context rates. Many workflows are cleaner with two 150K Sonnet sessions chained via `/exhale` + `/inhale` than one 400K session.

**Use Opus for the actually-long stretches.** Native 1M, no opt-in dance, no billing-tier surprises.

## Diagnosing the wall

If you're seeing the error and not sure which switch is the problem:

```bash
# 1. Check Soma's setting
python3 -c "import json; print(json.load(open('/path/to/.soma/settings.json')).get('anthropic'))"

# 2. Check the Pi runtime — does it have the beta header injected?
grep "context-1m-2025-08-07" $(dirname $(readlink -f $(which soma)))/../node_modules/@mariozechner/pi-ai/dist/providers/anthropic.js
# Empty output = patch NOT applied (you should NOT see the error if account isn't enrolled)
# Output present = patch IS applied (account MUST be enrolled or every request fails)
```

If the patch is applied AND you're seeing the error: enable billing on your account, OR remove the patch (re-run `apply-patches.sh` after setting `anthropic.enableLongContext: false` and rebuilding).

## See also

- [docs/settings.md § Anthropic](settings.md#anthropic) — the setting reference
- [Blog: Sonnet 4.6's 1M Context — What the Billing Tier Actually Means](https://soma.gravicity.ai/blog/sonnet-1m-context-billing) — the practical narrative
- [Anthropic API docs — 1M Context Beta](https://docs.anthropic.com/en/api/messages) — upstream pricing + billing details
