---
name: community-safe
type: protocol
status: active
description: "Community/public content must never contain private data. ⚠ The channel guard blocks pro-keywords and credential FILE SHAPES only — nothing blocks emails, API keys or IPs at push time. This protocol covers the judgment and the check you must run yourself."
heat-default: cold
tags: [privacy, safety, self-awareness]
applies-to: [always]
# `scope:` corrected `hub` → `bundled` (s01-6c4763): this SHIPS in the npm bundle — build-dist.mjs:442
# copies repos/community/protocols/ wholesale — so `hub` described an install path it never took.
# `scope:` does not gate npm; nothing about the tarball changed. Keep the comment ABOVE the key:
# the release gate reads the REST OF THE LINE as the value, so a trailing `#` comment becomes part
# of it and the mismatch persists (measured here, first attempt).
scope: bundled
tier: core
created: 2026-03-10
updated: 2026-08-16
version: 2.1.0
author: Curtis Mercier
license: CC BY 4.0
---
# Community Safe

## TL;DR
Private data stays private. 🔴 **The channel guard does NOT block PII** — it blocks pro/private keywords and credential file shapes; emails, API keys and IP addresses pass straight through. **Run a PII check yourself before publishing.** Protocols and muscles must be generic (no emails, paths, project names). When sharing to the hub, strip absolute paths and private repo references. Private data belongs in `.soma/secrets/`, identity files, or env vars.

> How Soma keeps private data out of public content. The guard catches a NARROW mechanical class —
> this protocol covers the judgment, and names the check the guard will not run for you.

## What's Automated — and what isn't

🔴 **Nothing blocks PII at push time. Do not rely on a hook to catch a leaked email.**

> **Corrected 2026-08-10.** This protocol previously stated: *"If it finds PII in a public repo
> commit, it blocks the push"* — listing emails, IP addresses and API keys as blocked. **That was
> false**, and false in the reassuring direction, which is the dangerous one: it credited the
> pre-push guard with a job a different, non-blocking, on-demand script does, and credited
> **nobody** with IP addresses. Verified by reading the guard: it contains no email or API-key
> matching at all.

Two different mechanisms, and only one of them blocks:

| what | when | blocks? |
|---|---|---|
| Pro/private keywords (vault paths, private-tier names, absolute home paths) | pre-push hook | ✅ **yes** |
| Credential FILE SHAPES (`id_rsa`, `*.pem`, `credentials.json`, `.env.local`) | pre-push hook | ✅ **yes** |
| `_`-prefixed branch guard | pre-push hook | ✅ yes |
| **Email addresses, API keys** | on-demand PII audit only — **no hook wiring** | ❌ **no** |
| **IP addresses** | — | ❌ **detected by nothing** |

⇒ **Run a PII scan over your diff yourself before publishing.** The channel guard will not do it for
you, and **a clean push is not evidence your diff is PII-free.**

🔑 **The general lesson, worth more than this one file:** a control that is *documented* as blocking
and is *implemented* as advisory is worse than no control — it buys confidence it has not earned.
When a doc tells you something is enforced, read the enforcer.

## What Needs Judgment

The guard catches obvious shapes. These need your awareness:

**Private data belongs in:**
- `.soma/secrets/` (gitignored)
- `.soma/body/soul.md` (project-local, not pushed to public repos)
- Environment variables / `.env` files (gitignored)

**Protocols and muscles must be generic:**
- ✅ "Read before edit" — universal pattern
- ❌ "User prefers tabs over spaces" — personal preference in a public protocol
- ✅ "Check git config before committing" — universal
- ❌ "Set email to user@example.com" — private data

**When sharing to the hub:**
- Strip all absolute paths
- Remove references to private repos, internal tools, specific projects
- Keep patterns universal — if it only works for your setup, it's local, not community

## Source

- **Channel guard** — the pre-push hook: keyword and filename shapes only
- **Guard extension** — `soma-guard` (path/command gates)
- **PII audit** — on demand via `soma-audit pii`; never blocks, never runs itself
