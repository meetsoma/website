---
title: "Login & Pairing"
description: "Connect your Soma agent to Somaverse — device pairing, checking status, and unpairing."
section: "Core Concepts"
updated: 2026-08-10
order: 5.2
---

# Login — pair this device with Somaverse

<!-- tldr -->
`soma login start` opens your browser, shows a pairing code, and waits. Enter the code in Somaverse and the pairing completes on its own, saving a device key to `~/.soma/device-key` (mode 600). `soma login status` tells you whether you're paired. Running `soma login` with no arguments only reports status — it never starts a pairing.
<!-- /tldr -->

> **Two different "hubs".** This page is about **Somaverse** — the workspace your agent connects to.
> The **content hub** (`/hub install`, community protocols and muscles) is unrelated and needs no
> login. See [hub.md](./hub.md) for that one.

## Quick start

```bash
soma login start        # opens the browser, prints a pairing code, waits
soma login status       # ✓ paired, or · not paired
```

That's the whole flow. You do not create an account from the terminal — you approve the device from
Somaverse in your browser.

## What actually happens

1. Soma asks the hub for a **pairing code** and a one-time secret.
2. Your browser opens to the hub with the code pre-filled, at the *"Connect your agent"* step.
   If it doesn't open, the terminal prints the URL — go there and type the code in.
3. Soma polls for up to **5 minutes** while you approve it.
4. On approval the hub returns a **device key**. Soma checks its shape, writes it to
   `~/.soma/device-key` with `umask 077`, and sets mode `600`.
5. Future sessions connect automatically — just run `soma`.

The device key is the credential. Anyone who can read that file can act as your paired device, which
is why it is written user-only and never printed.

## Commands

| command | what it does |
|---|---|
| `soma login start [hub-url]` | begin pairing — the only command that starts anything |
| `soma login status` | paired or not, and when the key was written |
| `soma login --help` | the same status plus this command list |
| `soma login` | **status only.** Deliberately does nothing else |

**Why bare `soma login` doesn't pair:** starting a browser flow is not something a command should do
because you typed it by reflex. You ask for pairing explicitly, with `start`.

## Choosing a different hub

By default Soma pairs with `https://somaverse.ai`. To point somewhere else — a self-hosted or staging
hub — use any one of these, in order of precedence:

```bash
soma login start https://hub.example.com     # 1. argument wins
export SOMA_HUB_URL=https://hub.example.com  # 2. environment
echo 'HUB_URL=https://hub.example.com' >> ~/.soma/secrets/hub.env   # 3. file
```

A `ws://` or `wss://` URL in `hub.env` is converted to `http(s)://` automatically, and a trailing
`/ws` is stripped — so you can reuse the same value your workspace client uses.

## Unpairing

Delete the device key:

```bash
rm ~/.soma/device-key
```

Your next connection will need a fresh `soma login start`. If you have the Somaverse extension
loaded, `somaverse:auth.logout` does the same thing.

## Troubleshooting

**`Failed to reach hub at …/api/pair/create`**
The hub URL is wrong or unreachable. Check it with `curl -sSI <hub-url>` and confirm you're not
behind a proxy that blocks it. The error line prints the first 200 characters of the underlying
failure — that text usually names the real cause (DNS, TLS, 404).

**`Pairing timed out after 5 minutes`**
Nobody approved the code in time. Run `soma login start` again for a fresh code — an expired code
cannot be resumed.

**`Hub returned malformed device_key. Refusing to save.`**
The hub answered with something that isn't a key. Soma refuses rather than writing it. This is a
hub-side problem, not a local one.

**Paired, but the agent doesn't connect**
`soma login status` only proves the key file exists — it does not test the connection. Check that
the key is non-empty and that your hub URL is the one you paired against; pairing with staging and
running against production leaves you with a key the production hub has never seen.

## See also

- [bridge-setup.md](./bridge-setup.md) — the local bridge daemon; a separate layer from pairing
- [hub.md](./hub.md) — the community content hub (no login required)
- [troubleshooting.md](./troubleshooting.md) — general diagnostics
