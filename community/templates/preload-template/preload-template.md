---
type: config
status: active
created: {{today}}
updated: {{today}}
description: >
  Custom preload template. Place at .soma/prompts/preload-template.md to override
  the built-in default. Edit freely — add sections, remove what you don't need,
  change the guidance. Template variables are replaced automatically.
---

<!-- ═══════════════════════════════════════════════════════════════════════
     PRELOAD TEMPLATE — Edit this to change how Soma writes preloads.
     
     This file overrides the built-in default when placed at:
       .soma/prompts/preload-template.md
     
     To revert to default: delete this file.
     To update from hub: /hub install template preload-template --force
     ═══════════════════════════════════════════════════════════════════════ -->

**Step 2:** {{logVerb}} session log `{{logPath}}` — one file per session (unique filename).
⚠️ **Never overwrite existing session logs or preloads** — the filename contains a unique session ID (`{{sessionId}}`).
Include frontmatter with `session-id: {{sessionId}}`.
Include: what shipped (commits), **Gaps & Recoveries** (tool errors, workarounds, false starts),
**Observations** (patterns noticed, tagged by domain: [bash], [testing], [api-design], [architecture], [workflow], [meta]).

**Step 3:** {{preloadVerb}} `{{target}}` — this is the LAST file you write.

This IS the continuation prompt for the next session. The next agent sees ONLY this file —
not the conversation history. Write it like a briefing for someone taking over your shift.

**Quality bar:** Could a new agent read this preload and immediately start working without
re-reading any files? If not, add more detail.

**Format:**
```markdown
---
type: preload
created: {{today}}
session: {{sessionId}}
commits: []        # list commit hashes from this session
projects: []       # project names touched
tags: []           # topics/themes
files-changed: 0   # total files modified
tests: ""          # test results summary
---

## Resume Point
<!-- 2-3 sentences: what was this session about, what state are things in. -->

## The Weather
<!-- One line. The emotional tone of this session.
     "Clear — flow state, shipped clean." / "Stormy — three bugs, breakthrough at end."
     Tells the next session what kind of mind they're inheriting. -->

## What Shipped
<!-- Numbered list. Each: description (`commit`), key files changed. Dense. -->

## Next Session: [Task Name]
<!-- THE AMNESIA-PROOF SECTION. Write as if next agent has zero context.
     Include:
     - Quick Start: exact bash commands to run first
     - Steps: numbered, with exact file:line refs
     - After each step: test + verify commands
     This section should be executable top-to-bottom without reading Orient From. -->

## Warnings
<!-- Traps discovered this session that the next session will fall into.
     "The router has 3 layers — don't audit only one and call the others broken."
     "settings.json doesn't hot-reload — restart required after changes."
     These are things you learned the hard way — save your next self the pain. -->

## In-Flight (not started)
<!-- Unfinished work NOT covered by Next Session. Brief. -->

## Key Decisions
<!-- Decisions with rationale. Only include if next session needs them. -->

## Orient From
<!-- Files to read ONLY IF the Next Session section isn't enough.
     Always include [line-ranges] for code files.
     Example: `core/utils.ts` [39-91] — canonical shared helpers -->

## Do NOT Re-Read
<!-- Files fully understood. Brief reason why. -->
```

⚠️ **Order matters:** session log (Step 2) FIRST, then preload (Step 3) LAST.
The preload write triggers the rotation watcher.

<!-- ═══════════════════════════════════════════════════════════════════════
     CUSTOMIZATION IDEAS — add any of these sections to make it yours:
     
     ## Who You Were
     One paragraph about the self that did the work. Not the tasks — the mindset.
     Were you careful or rushing? Corrected? Proud of something?
     
     ## Kanban & Release Context
     Which version is in progress, how many items remain, which tests passed.
     
     ## Plans (read when relevant)
     Tree of plan files with brief descriptions.
     
     ## Journal Reference
     Link to the most recent reflection or journal entry.
     
     Remove this comment block once you've customized.
     ═══════════════════════════════════════════════════════════════════════ -->
