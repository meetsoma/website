---
type: muscle
status: active
topic: [blog, writing, content, dev-log]
keywords: [blog, post, writing, content, accuracy, voice, co-authored]
heat: 0
loads: 0
author: Soma Team
license: MIT
version: 1.0.0
---

# Blog Writing — Muscle

<!-- digest:start -->
> **Blog Writing** — patterns for honest, accurate technical blog posts.
> - Cross-check EVERY command, flag, and technical claim against actual code before publishing.
> - Verify timelines against `git log --format="%ci"` — never dramatize durations.
> - Voice: honest about who wrote what. Never overstate capabilities.
> - If something is planned but not shipped, say "planned" not "available".
<!-- digest:end -->

## Pre-Publish Checklist

1. [ ] All CLI commands verified against actual code (not memory)
2. [ ] All URLs resolve to real pages
3. [ ] Technical claims cross-checked against codebase
4. [ ] Timeline claims verified against git timestamps
5. [ ] Author attribution correctly reflects who wrote what
6. [ ] Draft flag removed when ready to publish
7. [ ] Renders correctly in local dev environment

## Voice Guidelines

- **Agent sections:** Technical, precise, first-person-plural ("we") or third-person
- **Human sections:** Narrative, reflective, first-person
- **Co-authored:** Clearly state who wrote what (footer attribution)
- **Honesty:** Never claim shipped if planned. Never claim agent-written if human-written.
- **Tone:** Curious, not hype. "What happens when..." not "Revolutionary breakthrough"

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Writing commands from memory | Commands change, memory drifts | Verify against source |
| "Didn't notice for weeks" | Git says it was hours | Check `git log` timestamps |
| Claiming features that are planned | Destroys credibility when readers try it | Say "planned" explicitly |
| Test that passes on error text | Cited as "passing" in posts | Match expected format |

## Timeline Verification

Before writing ANY duration claim:
```bash
git log --format="%ci" <commit-hash>
```

If the real duration is less dramatic than the narrative, use the real one. Accuracy > drama.
