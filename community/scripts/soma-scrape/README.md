---
type: script
name: soma-scrape
version: 1.0.0
status: active
author: meetsoma
license: MIT
language: bash
description: Intelligent doc discovery and scraping for SDK research
tags: [documentation, scraping, research, sdk, npm, github]
requires: [bash 4+, curl, jq]
created: 2026-03-17
updated: 2026-03-21
---

# soma-scrape

Intelligent documentation discovery and scraping. Finds, downloads, and organises SDK documentation for offline reference. Supports GitHub repos, npm packages, and MDN.

## Commands

| Command | What it does |
|---------|-------------|
| `resolve <name>` | Find a repo and list available doc sources |
| `pull <name> [--full]` | Download docs locally (`--full` = no file limit) |
| `update <name>` | Re-pull latest docs for an existing source |
| `list` | Show all scraped sources |
| `show <name>` | Show files for a source |
| `search <name> <query>` | Search within scraped docs |
| `discover <topic>` | Broad search across GitHub, npm, MDN, CSS specs |
| `pull-item <n>` | Pull items from last discover results |

## Usage

```bash
# Research an npm package
soma-scrape.sh resolve three.js
soma-scrape.sh pull three.js

# Discover everything about a topic
soma-scrape.sh discover "css custom properties"

# Search within downloaded docs
soma-scrape.sh search react "useEffect cleanup"
```

## How It Works

1. **Resolve** — finds the GitHub repo, detects doc directories (`docs/`, `README.md`, examples)
2. **Pull** — downloads markdown, types (`.d.ts`), and config files via GitHub API
3. **Store** — saves to `.soma/knowledge/<name>/` with metadata
4. **Search** — grep across downloaded docs with context

Designed for the SDK research pattern: types first (`.d.ts`), then docs, then examples. Types are more reliable than docs for understanding APIs.

## Install

```bash
cp soma-scrape.sh ~/.soma/amps/scripts/soma-scrape.sh
chmod +x ~/.soma/amps/scripts/soma-scrape.sh
```
