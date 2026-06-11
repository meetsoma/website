---
title: "Your First Protocol"
description: "Turn a repeated correction into a permanent rule."
section: "Guide"
order: 27
---


<!-- tldr -->
You correct the agent. It happens again. You write a protocol — a markdown file in `.soma/amps/protocols/` with frontmatter and rules. The agent reads it every session. The correction never happens again. 10 minutes, permanent effect.
<!-- /tldr -->

## The Scenario

You're working on a project. The agent keeps doing something wrong:

- Commits with the wrong email
- Uses `npm` when you use `pnpm`
- Pushes to main instead of creating a PR
- Deploys without running tests first
- Writes verbose explanations when you want terse answers

You correct it. It works for this session. Next session — same mistake. The agent forgot.

**Protocols fix this.** A protocol is a rule that loads every session, so corrections stick permanently.

## Step 1: Identify the Pattern

Good protocol candidates:
- Something you've corrected **more than once**
- A rule that applies to **every session** (not a one-time instruction)
- Something with clear **do this / don't do that** criteria

Bad protocol candidates:
- One-time instructions ("rename this file to X")
- Preferences that change often ("use dark mode today")
- Complex workflows (those are better as [muscles](/docs/muscles) or [MAPs](/docs/maps))

## Step 2: Write It

Let's say your agent keeps deploying without testing. Create the file:

```bash
cat > .soma/amps/protocols/deploy-safety.md << 'EOF'
---
type: protocol
name: deploy-safety
status: active
heat-default: warm
description: "Never deploy without tests passing. Staging before production. No Friday deploys."
applies-to: [always]
created: 2026-04-04
updated: 2026-04-04
---

## TL;DR
- Run `pnpm test` before ANY deploy command
- Deploy to staging first, verify, then production
- No production deploys after 4pm Friday
- If tests fail, fix them — don't skip them

## The Rules

### Before Deploying
1. Run the test suite: `pnpm test`
2. All tests must pass — no "skip for now"
3. Check for uncommitted changes: `git status`
4. Build must succeed: `pnpm build`

### Deploy Order
1. Staging first: `vercel --env preview`
2. Verify staging works (curl the URL, check key pages)
3. Then production: `vercel --prod`
4. Verify production (same checks)

### Never
- Never deploy with failing tests
- Never skip staging
- Never deploy on Friday afternoon
- Never force-push a deploy to recover from a bad deploy (rollback instead)

### Rollback
If production breaks after deploy:
```bash
vercel rollback
```
Don't try to "fix forward" under pressure. Rollback, then fix calmly.
EOF
```

## Step 3: Understand the Parts

### Frontmatter (the header)

```yaml
---
type: protocol            # always "protocol"
name: deploy-safety       # unique identifier — used by /pin, /kill
status: active            # active | dormant | retired
heat-default: warm        # starting temperature: cold, warm, or hot
description: "..."        # ONE sentence — this is ALL the agent sees when warm
applies-to: [always]      # when this protocol applies
created: 2026-04-04
updated: 2026-04-04
---
```

**The `description` is critical.** At warm temperature (the default), this single sentence is the only thing loaded into the agent's prompt. Make it count — specific and actionable, not vague.

```yaml
# Good — the agent knows exactly what to do
description: "Never deploy without tests passing. Staging before production. No Friday deploys."

# Bad — too vague to act on
description: "Be careful when deploying."
```

### Heat Default

| Value | Starting Temp | What Loads | Use When |
|-------|--------------|------------|----------|
| `hot` | 8 | Full body (every rule) | Critical rules you never want missed |
| `warm` | 3 | Description only (one sentence) | Most protocols — loads reminder, agent reads full body when relevant |
| `cold` | 0 | Name listed, nothing loaded | Rarely needed protocols |

**Start with `warm`.** The agent sees your description every session. When it encounters a deploy situation, it can read the full protocol on demand. Only use `hot` for rules that must be in the prompt at all times.

### The TL;DR Section

```markdown
## TL;DR
- Bullet points
- Dense rules
- 3-7 lines max
```

The `## TL;DR` section loads when the protocol reaches warm-to-hot temperature. It's the "elevator pitch" — everything the agent needs at a glance. The full body below is for when the agent reads the file in detail.

### applies-to (Optional)

Scope your protocol to specific project types:

```yaml
applies-to: [always]          # every project
applies-to: [typescript]      # only TypeScript projects
applies-to: [git]             # only projects with git
applies-to: [frontend]        # frontend projects
```

Available signals: `always`, `git`, `typescript`, `javascript`, `python`, `rust`, `go`, `frontend`, `docs`, `multi-repo`.

## Step 4: Test It

Start a new session:

```bash
soma inhale
```

The protocol loads automatically. At warm temperature, the agent sees your description in the protocols section of the system prompt. Test it:

```
Deploy the app to production.
```

The agent should follow your rules — run tests first, deploy to staging, then production.

### Boost It

If the protocol isn't loading (cold) or you want the full body always visible:

```
/pin deploy-safety
```

This bumps heat to hot. The full protocol body loads every session until heat decays.

### Check What Loaded

```
/soma status
```

Shows which protocols are hot, warm, and cold.

## Step 5: Iterate

Protocols evolve. After a few sessions, you might notice:

- A rule that's too strict ("no Friday deploys" doesn't apply to hotfixes)
- A missing rule (should also check database migrations)
- A rule that belongs in a separate protocol (rollback deserves its own)

Edit the file directly:

```bash
vim .soma/amps/protocols/deploy-safety.md
```

Changes take effect next session. No restart needed for the current session — but the agent won't see edits until it reads the file again.

## More Examples

### Terse Communication

```yaml
---
type: protocol
name: terse-style
status: active
heat-default: warm
description: "Lead with the answer. No preamble. Dense over verbose. One approach, not a menu."
applies-to: [always]
---

## TL;DR
- First sentence is the answer
- No "Sure, I'd be happy to help"
- No emoji unless the moment calls for it
- One recommendation, not three options
- Code over explanation when possible
```

### Git Workflow

```yaml
---
type: protocol
name: git-workflow
status: active
heat-default: warm
description: "Feature branches from main. Conventional commits. PR before merge. Never push to main directly."
applies-to: [git]
---

## TL;DR
- Branch from main: `git checkout -b feat/description`
- Conventional commits: `feat(scope): description`, `fix(scope): description`
- Push branch, create PR — never push to main
- Squash merge PRs
- Delete branch after merge
```

### Code Review Checklist

```yaml
---
type: protocol
name: review-checklist
status: active
heat-default: cold
description: "Before approving: check error handling, test coverage, security, and naming consistency."
applies-to: [always]
---

## TL;DR
- Does every error path have handling?
- Are there tests for the new code?
- Any security issues (injection, auth bypass, data exposure)?
- Naming consistent with project conventions?
- Would you understand this code in 6 months?
```

Note: this one uses `heat-default: cold` — it only activates when you `/pin` it or the agent auto-detects a code review context.

## The Progression

Protocols are one layer. As patterns get more complex:

| Complexity | Tool | Example |
|-----------|------|---------|
| Simple rule | **Protocol** | "Always run tests before deploying" |
| Learned pattern | **Muscle** | "How we deploy this specific project (steps, gotchas, rollback)" |
| Multi-step workflow | **MAP** | "The full release process from branch to production" |
| Reusable tooling | **Script** | `deploy.sh` — automated deploy with checks |

Start with a protocol. If it grows past 50 lines or starts describing a *process* rather than a *rule*, it's ready to become a muscle or MAP.

## Related

- [Protocols](/docs/protocols) — full reference (frontmatter, heat, scoping)
- [Muscles](/docs/muscles) — for learned patterns (more complex than rules)
- [MAPs](/docs/maps) — for multi-step workflows
- [Heat System](/docs/heat-system) — how loading decisions work
- [Customization](/docs/guides/customization) — where protocols fit in the customization stack
- [Hub](/docs/hub) — browse and install community protocols
