---
type: script
name: git-identity-hook
version: 1.0.0
status: active
author: meetsoma
license: MIT
language: bash
description: Pre-commit hook that validates git identity before allowing commits
tags: [git, hooks, identity, security, pre-commit]
requires: [bash 4+, git]
created: 2026-03-14
updated: 2026-03-21
---

# git-identity-hook

Git pre-commit hook that validates your `user.email` before allowing commits. Prevents accidental commits with the wrong identity — especially useful when working across multiple repos or organisations.

## Modes

| Mode | When | What it does |
|------|------|-------------|
| **Enforced** | `.soma/settings.json` has `guard.gitIdentity.email` | Requires exact email match |
| **Basic** | No settings configured | Just checks that `user.email` is set (not empty) |

## Usage

### Install as git hook

```bash
# Copy to hooks directory
cp git-identity-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Or symlink from .soma/
ln -sf ../../.soma/amps/scripts/git-identity-hook.sh .git/hooks/pre-commit
```

### Configure enforced email

In `.soma/settings.json`:
```json
{
  "guard": {
    "gitIdentity": {
      "email": "you@company.com"
    }
  }
}
```

Now commits will fail unless `git config user.email` matches exactly.

## Why

Multi-repo setups often have different git identities per project (personal vs. work). This hook catches the mistake before it becomes a commit you have to rebase away.

Pairs with the `git-identity` protocol for full identity management.

## Install

```bash
cp git-identity-hook.sh ~/.soma/amps/scripts/git-identity-hook.sh
chmod +x ~/.soma/amps/scripts/git-identity-hook.sh
```
