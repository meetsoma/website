---
title: "Hub"
description: "Install, share, and discover community content."
section: "Core Concepts"
order: 5.1
---


<!-- tldr -->
`/hub install <type> <name>` to install. `/hub find <keywords>` to search. `/hub share <type> <name>` to contribute. Content lives on GitHub (`meetsoma/community`), indexed automatically, browsable at `soma.gravicity.ai/hub`. Install defaults to global (`~/.soma/`). Templates pull their dependencies automatically.
<!-- /tldr -->

## Quick Start

```
/hub find deploy              # search for deploy-related content
/hub install protocol quality-standards    # install a protocol
/hub install script soma-reflect           # install a script
/hub list                     # see what's installed locally
/hub list --remote            # browse everything available
```

## What's on the Hub

The hub hosts five types of content:

| Type | What | Example |
|------|------|---------|
| **Protocols** | Behavioral rules | `quality-standards` — clean commits, close the loop |
| **Muscles** | Learned patterns | `incremental-refactor` — never refactor blind |
| **Scripts** | Bash tools | `soma-reflect` — mine session logs for patterns |
| **Automations** | Step-by-step workflows (MAPs) | `debug` — systematic bug hunting |
| **Templates** | Starter bundles | `architect` — systems-thinking setup |

All content is open source, community-contributed, and reviewed before merge.

## Installing Content

### Basic Install

```
/hub install protocol quality-standards
```

Installs to **global** (`~/.soma/amps/protocols/`) by default — available across all projects.

### Project-Local Install

```
/hub install protocol quality-standards -p
```

Installs to the current project's `.soma/amps/protocols/` only.

### Force Overwrite

```
/hub install protocol quality-standards --force
```

Overwrites an existing local copy (useful for updating to the latest version).

### Install a Template

Templates are starter bundles that pull multiple pieces of content:

```
/hub install template architect
```

This installs the template and all its referenced protocols and muscles. Templates scaffold a complete working setup.

## Finding Content

### Search

```
/hub find deploy              # keyword search
/hub find "code review"       # multi-word search
/hub find testing --type muscle   # filter by type
```

Searches across names, descriptions, and tags.

### Browse Remote

```
/hub list --remote            # everything on the hub
/hub list --remote protocol   # just protocols
/hub list --remote script     # just scripts
```

### Browse on the Web

Visit [soma.gravicity.ai/hub](https://soma.gravicity.ai/hub) for a browsable interface with full README rendering, install counts, and detail pages.

## Sharing Your Content

Have a protocol that works well? A muscle that other agents could use? Share it:

```
/hub share protocol my-protocol
```

Soma will:

1. **Privacy scan** — checks for API keys, emails, file paths, secrets. Blocks sharing if secrets are found.
2. **Create a clean copy** — strips private data, fixes paths, creates a `_public/` staging version.
3. **Generate a README** — auto-creates a README.md with usage examples and metadata.
4. **Quality check** — surfaces issues so you can improve before submitting.
5. **Create a PR** — uses `gh` CLI to submit a pull request to `meetsoma/community`.

### Before Sharing

Make sure your content has good frontmatter:

```yaml
---
type: protocol
name: my-protocol
status: active
description: "One clear sentence about what this does."
tags: [deploy, ci, automation]
heat-default: warm
---
```

The `description` is what appears in search results and install listings. Make it specific.

### Sharing a Script

Scripts need a folder structure on the hub:

```
/hub share script my-script
```

This creates:
```
community/scripts/my-script/
├── my-script.sh      ← your script
└── README.md         ← auto-generated docs
```

## Forking Content

Want to customize something from the hub? Fork it:

```
/hub fork protocol quality-standards
```

This installs the content AND adds `forked-from: quality-standards` to the frontmatter. Your copy is independent — you can modify it freely. The lineage is preserved for traceability.

## Where Content Lives

### Installed Content

| Scope | Location |
|-------|----------|
| Global (default) | `~/.soma/amps/protocols/`, `~/.soma/amps/muscles/`, etc. |
| Project-local (`-p`) | `.soma/amps/protocols/`, `.soma/amps/muscles/`, etc. |

Global content is available in every project. Project content overrides global on name collision.

### The Community Repository

All hub content lives at [github.com/meetsoma/community](https://github.com/meetsoma/community):

```
meetsoma/community/
├── protocols/          ← community protocols (one .md per protocol)
├── muscles/            ← community muscles
├── scripts/            ← community scripts (folder per script)
├── automations/        ← community automations/MAPs
├── templates/          ← starter bundles (folder per template)
└── hub-index.json      ← auto-generated search index
```

`hub-index.json` is rebuilt by CI on every merge. The website and `/hub find` both read from this index.

## Hub Commands Reference

| Command | What |
|---------|------|
| `/hub` | Hub status — paths, repo info, index URL |
| `/hub install <type> <name>` | Install content (`-g` global, `-p` project, `--force` overwrite) |
| `/hub find <keywords>` | Search by name, description, tags |
| `/hub list [type]` | Show locally installed content |
| `/hub list --remote [type]` | Browse all available content on the hub |
| `/hub fork <type> <name>` | Install with `forked-from` lineage for customization |
| `/hub share <type> <name>` | Share your content — privacy scan, README gen, PR creation |
| `/hub status` | Detailed hub status |

Type aliases: `automation` and `map` are interchangeable.

## Templates

Templates are the highest-level hub content — they bundle protocols, muscles, and configuration into a starter setup:

```
/hub install template architect
```

A template includes:
- **template.json** — manifest listing dependencies
- **Protocols** — behavioral rules included in the template
- **Muscles** — learned patterns included
- **Settings overrides** — suggested configuration

When you install a template, Soma resolves all dependencies and installs them. You can then customize any piece independently.

### Available Templates

```
/hub list --remote template
```

Current templates include setups for architects, writers, maintainers, and more. Each is designed for a specific working style.

## Contributing

Anyone can contribute to the hub. The flow:

1. Write your content (protocol, muscle, script, automation)
2. Test it in your own `.soma/` — make sure it works
3. Run `/hub share <type> <name>` — Soma handles the PR creation
4. Maintainers review for quality, safety, and usefulness
5. Once merged, it's available to everyone via `/hub install`

### Quality Bar

Hub content should:
- Have clear, specific `description` fields
- Include a `## TL;DR` section
- Be self-contained (no project-specific references)
- Pass the privacy scan (no secrets, personal emails, or file paths)
- Follow the [frontmatter standard](/docs/protocols#writing-your-own-protocol)

### CI Validation

The community repo runs validation on every PR:
- Frontmatter format check
- Privacy scan (emails, API keys, file paths)
- Injection scan (no executable code in metadata)
- Format check (markdown structure)

Fix any issues before the PR can merge.

## Tips

- **Start with protocols.** They're the lightest content to install and have the highest impact.
- **Browse before building.** Someone may have already written what you need.
- **Fork before customizing.** If you want to modify hub content, fork it — don't edit the installed copy directly (it'll get overwritten on update).
- **Share what works.** If a protocol or muscle has survived 5+ sessions, it's probably good enough to share.
- **Tags matter.** Good tags make your content findable. Use specific terms (`vercel`, `pnpm`, `playwright`) not generic ones (`good`, `useful`).

## Related

- [Getting Started](/docs/getting-started) — first session, including hub install
- [Protocols](/docs/protocols) — writing protocols
- [Muscles](/docs/muscles) — writing muscles
- [Scripts](/docs/scripts) — writing scripts
- [MAPs](/docs/maps) — writing automations
- [Customization](/docs/guides/customization) — how all content types fit together
