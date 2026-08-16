---
title: "Domain Packages"
description: "Bundle a whole domain — protocols, muscles, scripts and body files — into one folder soma loads as if it were native."
section: "Extending"
updated: 2026-08-16
order: 5.4
---

<!-- tldr -->
A domain package is a mini `.soma` in one folder: its own `amps/protocols/`, `amps/muscles/`, `amps/scripts/` and `body/`. Declare it in `settings.json` and soma loads its contents **where soma already looks** — gates fire, muscles load, scripts appear in the catalog. Undeclare it and all of that withdraws in one move. A skill gives you a doorway; a package gives you the machinery behind it.
<!-- /tldr -->

## What a domain package is

A **skill** is a doorway: a `SKILL.md` whose description sits in the catalog, with the body loaded
on demand. That is the right shape for *instructions*.

It is the wrong shape for *machinery*. A skill cannot carry a path gate, a chain-discovered muscle,
or a script that shows up in your boot catalog — because soma resolves exactly one directory per
content kind per root, and a skill folder is not one of those roots.

A **domain package** is that missing root. It is a directory laid out like a small `.soma`:

```
my-domain/
├── SKILL.md              ← the doorway (see "One folder, two doors" below)
├── package.json          ← manifest: what this package provides
├── amps/
│   ├── protocols/        ← including gate-bearing ones
│   ├── muscles/
│   └── scripts/
├── body/                 ← body files, including lazy ones
└── cycles/               ← optional: the domain's own work record
```

Declare it and every one of those directories joins the search chain. Nothing else changes: the
loaders that already walk the chain find the content where they always look.

## Declaring one

```jsonc
// .soma/settings.json
{
  "packages": [".soma/skills/my-domain"]
}
```

> **⚠ Relative paths resolve against your PROJECT directory, not against `.soma/`.**
> `"skills/my-domain"` resolves to `<project>/skills/my-domain` — almost certainly not what you
> meant. Write `".soma/skills/my-domain"`, or use an absolute path. A declared package that cannot
> be found is reported on stderr and skipped; it never fails your boot silently.

Order matters: earlier entries win a name collision, because every loader dedupes first-wins.

## One folder, two doors

A package and a skill are not competing layouts — **the same folder can be both**, and that is the
recommended shape:

| you get | because |
|---|---|
| a catalog entry (name + description, body on demand) | the folder lives under `.soma/skills/` |
| gates, muscles, scripts and body files loaded natively | the folder is declared in `packages:` |

Put the folder under `.soma/skills/my-domain/`, give it a `SKILL.md`, and declare that same path in
`packages:`. Readers find it by description; the machinery loads because you declared it. Removing
the `packages:` entry leaves the doorway and withdraws the machinery — two independent switches.

## What it means for inheritance

A package is something your project **opted into**. A parent `.soma` is something your project
merely sits under. Soma keeps these distinct:

- Search order is **project → your packages → parent(s) → global**.
- Turning inheritance off (`inherit.protocols`, `inherit.muscles`, `inherit.identity`,
  `inherit.automations`) **keeps the packages you declared** and drops what you inherit.
- A package declared by a *parent* is inherited, so it goes with the parent under that same switch —
  one switch, not two.

## The manifest

`package.json` describes what the package carries:

```jsonc
{
  "name": "my-domain",
  "kind": "soma-domain-package",
  "state": "wired",
  "provides": {
    "protocols": ["my-gate.md"],
    "muscles": [],
    "scripts": [],
    "body": []
  },
  "doorway": "SKILL.md"
}
```

`provides` is a declaration, not a loader input — soma loads what is on disk regardless. It exists so
drift is visible. Check and repair it with:

```bash
python3 .soma/amps/scripts/soma-package.py check <path>   # reports drift between manifest and disk
python3 .soma/amps/scripts/soma-package.py sync  <path>   # rewrites `provides` from the tree
```

> **Note:** files under a `_`-prefixed directory (e.g. `amps/scripts/_lib/`) are deliberately not
> discovered — that is how you keep a shared import out of the runnable-script catalog. `check`
> excludes them too, so the manifest matches what actually loads.

## Gates live here, and only here

A gate — a rule that blocks or warns on a file path — is read from **protocol frontmatter**. Put a
gate-bearing file anywhere other than a discoverable `amps/protocols/` directory and it stops firing,
with no error. `soma-package.py check` fails a package that does this, precisely because the failure
is otherwise silent.

## When to reach for one

**Use a skill** when you are packaging instructions someone reads.

**Use a domain package** when the domain owns *machinery* — a gate that must fire, muscles that
should load like your own, scripts that belong in the catalog, or body files that should resolve as
`{{variables}}`. If one workspace carries several bodies of knowledge that should not be merged into
one folder, this is the shape that keeps them separate without keeping them out.
