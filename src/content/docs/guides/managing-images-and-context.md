---
title: "Managing images and context"
description: "Screenshots are the fastest way to fill a context window — and the usual way a long session dies. What /reduce does, when reducing is worth it, and when to rotate instead."
section: "Guide"
order: 40
---

# Managing images and context

*Screenshots are the fastest way to fill a context window. This is how to keep a long, visual
session alive — and how to tell when reducing is a waste of money.*

## TL;DR

```bash
/reduce                  # copy of this transcript with older images + oversized tool-results reduced
/reduce images           # images only — leave tool-results alone
/reduce images --all     # strip EVERY image (you have to ask for this)
/reduce --keep 4         # keep the 4 newest images instead of the default 2
/resume-reduced          # reduce AND continue in the reduced session, keeping your work
```

**The two-line version:** `/reduce` always keeps your 2 most recent images, so a reduction never
costs you the screenshot you are looking at. Reducing is for *survival and headroom*, not for saving
money — past about 80% context, rotate instead.

---

## Two different ways a session dies

These look similar and are not:

| | what it means | the message |
|---|---|---|
| **Token overflow** | too much *context* | `prompt is too long: 213462 tokens > 200000 maximum` |
| **Payload overflow** | too many *bytes on the wire* | `413 request_too_large — Request exceeds the maximum size` |

Images cause the second one. An image costs a roughly fixed number of tokens but carries megabytes
of encoded data in every request, so **an image-heavy session can hit the payload ceiling while the
context percentage still looks comfortable.** If a session dies and the percentage looked fine,
this is why.

**It is a size limit, not an image-count limit.** Across 4043 real transcripts, the sessions that
died of payload overflow were all carrying **32–36 MB of image data** — a tight band — but their
image *counts* ranged from **15 to 52**. Fifteen full-page captures will kill a session that fifty
small crops would not touch. So don't reason about "how many screenshots"; reason about how big
they were.

## What `/reduce` actually does

It is mechanical, not a summary. No model is called, so nothing is paraphrased and nothing is lost
to a summariser's judgement:

1. **older images** → replaced with a text placeholder (the newest 2 are left untouched)
2. **oversized tool results** → head + tail kept, the middle replaced with a truncation marker
3. **thinking blocks** → kept, unless you pass `--drop-thinking`

It writes a **copy** and reports what it would save. Your original transcript and your live session
are never modified. `/resume-reduced` is the version that continues *into* the reduced copy — same
transforms, and it refuses to switch if the copy does not parse.

### The keep window is the safety mechanism

`/reduce` keeps the 2 newest images by default. The destructive form has to be typed:

```bash
/reduce images           # keeps the 2 newest
/reduce images --all     # strips every image
/reduce --keep 6         # keeps the 6 newest
```

On a real 22 MB session with 20 images: the default stripped 18 and kept 2, taking the transcript to
1.59 MB. `--all` got it to 1.17 MB. The 0.4 MB difference is the price of still being able to see
what you were just looking at.

## When it is worth reducing — and when it is not

Reducing images changes the earlier part of the conversation, which means the provider's prompt
cache has to be rebuilt from that point. A cache rebuild costs more than a cache read, once. The
saving is smaller but repeats on every later request. So there is a break-even, and it is further
away than people expect:

**You need roughly `11.5 × (context ÷ image-tokens − 1)` more requests in the session for an image
strip to pay for itself.**

| you strip | out of a small session | out of a large one |
|---|---|---|
| a couple of images | ~46 more requests | 200+ more requests |
| a third of your context | ~11 more requests | ~11 more requests |

⇒ **Clearing a few images to save money does not work.** It costs more than it saves unless the
session runs a long time afterwards.

⇒ **Reduce when images are a large share of your context and you have lots of work left**, or when
you are approaching the payload ceiling — there, the alternative is a dead conversation and the
arithmetic stops mattering.

⇒ **Past ~80% of your context window, don't reduce — rotate.** There are not enough requests left
to pay the rebuild back, and the rebuild is at its most expensive when the conversation is longest.
Write a preload and start a fresh session.

## Working habits that avoid the problem

- **Save then read, rather than accumulating.** A screenshot you need once can be written to a file
  and read when needed, instead of living in context for the rest of the session.
- **Crop.** A 200 KB region of a page costs a fraction of a 2 MB full-page capture and usually
  answers the same question.
- **Reduce early, not late.** The same strip is cheap at 20% context and pointless at 85%.
- **`--tool-max` truncation is the real token win.** Oversized tool results — a huge file read, a
  long log — are re-read on every request and are almost never worth their space. A plain `/reduce`
  recovers tens of thousands of tokens this way on an ordinary session, with no visual loss at all.

## Settings

Soma can also watch image accumulation for you and offer to compact
(see **Configuration → imageBudget**):

```json
{
  "imageBudget": {
    "softAt": 8,
    "hardAt": 12,
    "ceilingAt": 20
  }
}
```

It notices at `softAt`, offers a compact at `hardAt` (unanswered for 30s → it proceeds, so an
unattended session is still protected), and if you cancel, asks once more past `ceilingAt` and at
each multiple after that — so a single cancel cannot leave a session unprotected all the way to 40
images. `hardAt: 0` turns it off; `ceilingAt: 0` means a cancel silences it for the session.

⚠ These are **counts**, and counts are a noisy stand-in for the thing that actually kills a session
(payload size). If you work with large full-page captures, set `hardAt` lower than the default, and
prefer `/reduce images` to a compact — it is the cheaper direction, and it keeps your recent
screenshots.
