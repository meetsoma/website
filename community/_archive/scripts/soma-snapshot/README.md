---
type: script
name: soma-snapshot
version: 1.0.0
status: active
author: meetsoma
license: MIT
language: bash
description: Rolling zip snapshots of project directories with automatic cleanup
tags: [backup, snapshot, archive, zip]
requires: [bash 4+, zip]
created: 2026-03-14
updated: 2026-03-21
---

# soma-snapshot

Rolling zip snapshots of project directories. Keeps the last 3 snapshots per project and automatically cleans older ones. Respects `.zipignore` (or falls back to `.gitignore`).

## Usage

```bash
# Snapshot current directory
soma-snapshot.sh .

# Snapshot with a label
soma-snapshot.sh /path/to/project "pre-refactor"

# Snapshot before a risky operation
soma-snapshot.sh . "before-migration"
```

## Features

- **Rolling window** — keeps last 3 snapshots per project, auto-deletes older ones
- **Smart excludes** — always skips `node_modules`, `.git`, `dist`, `build`, `.next`
- **`.zipignore` support** — project-specific exclusions (falls back to `.gitignore`)
- **External drive sync** — copies to mounted backup drive if available
- **Timestamped** — filenames include `YYYYMMDD-HHMMSS` for easy sorting

## Storage

Snapshots are saved to `~/.soma/snapshots/` by default. Override with `SOMA_SNAPSHOT_DIR` environment variable.

## Install

```bash
cp soma-snapshot.sh ~/.soma/amps/scripts/soma-snapshot.sh
chmod +x ~/.soma/amps/scripts/soma-snapshot.sh
```
