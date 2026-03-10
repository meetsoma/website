---
type: muscle
status: active
topic: [github, pr, ci, release, merge, workflow]
keywords: [pr, pull-request, squash-merge, gh-cli, release, ci, tests, tag, npm]
heat: 0
loads: 0
author: Soma Team
license: MIT
version: 1.0.0
---

# PR & Release Workflow — Muscle

<!-- digest:start -->
> **PR/Release Workflow** — patterns for agent-driven PRs, CI, merging, and publishing.
> - Branch → PR → CI → review → staged merge test → squash merge to main → tag → publish.
> - Squash merge locally: `git checkout main && git merge --squash dev` — resolve conflicts with `git checkout --theirs`.
> - Tests must pass before AND after merge. Run on merged state before pushing.
> - Tag push triggers release automation. Use `--tag beta` for pre-release.
<!-- digest:end -->

## PR Creation

```bash
gh pr create \
  --base main \
  --head dev \
  --title "Release X.Y.Z — summary" \
  --body "## What\n\n## Changes\n\n## Tests\n\n## Checklist"
```

Structured body matters — reviewers (human or bot) read it.

## Squash Merge (Local)

```bash
git checkout main
git merge --squash dev
# Resolve conflicts — usually take dev (latest):
git checkout --theirs <conflicted-files>
git add -A
git commit -m "Release X.Y.Z — summary"
git tag vX.Y.Z
git push origin main && git push origin vX.Y.Z
```

## gh CLI vs GitHub API

| Operation | gh CLI | API (curl) | Notes |
|-----------|--------|-----------|-------|
| Create PR | `gh pr create` | POST /repos/.../pulls | gh is easier |
| Comment as bot | ❌ posts as you | POST with app token | API for bot identity |
| Approve PR | `gh pr review --approve` | POST .../reviews | Can't self-approve |
| Close PR | `gh pr close` | PATCH .../pulls/{n} | Works. PRs can't be deleted. |
| Merge PR | `gh pr merge --squash` | PUT .../pulls/{n}/merge | Both work |

**Rule:** Use `gh` for your own actions. Use API with app token for bot identity.

## CI Patterns

### Workflow triggers
- `on: pull_request` — runs on PR open/update
- `on: push: branches: [main]` — runs after merge
- `on: push: tags: ['v*']` — runs on tag push (release automation)

### Tests that need local-only tools
```bash
if [[ -n "$CI" || -n "$GITHUB_ACTIONS" ]]; then
  echo "SKIP: requires local tool (CI)"
else
  # run test
fi
```

## Release Checklist

1. All tests pass on dev branch
2. `git checkout main && git merge --squash dev`
3. Resolve conflicts (take dev)
4. Run tests on merged state — don't push until green
5. Commit with release message
6. `git tag vX.Y.Z && git push origin main && git push origin vX.Y.Z`
7. CI runs on push to main (validation)
8. CI runs on tag push (publish automation)
9. Verify published artifact (`npm info`, `cargo info`, etc.)

## Conflict Resolution

Squash merge conflicts are predictable — main has older content, dev has newer. Resolution:

```bash
git checkout --theirs <files>   # take dev's version
git add -A
```

**Watch for:** Ensure `.gitignore`, lockfiles, and generated files resolve cleanly.

## Anti-Patterns

- ❌ `declare -A` in shell scripts — fails on macOS bash 3 (use plain variables)
- ❌ Inline backticks in heredocs passed to curl — bash executes them
- ❌ Running `git merge --squash` with dirty working tree — clean first
- ❌ Pushing before running tests on merged state — breaks main
- ❌ Skipping the tag — release automation needs it
