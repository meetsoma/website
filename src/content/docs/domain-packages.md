---
title: "Domain Packages"
description: "Bundle a whole domain — protocols, muscles, scripts and body files — into one folder soma loads as if it were native."
section: "Extending"
updated: 2026-09-20
order: 5.4
---

<!-- tldr -->
A domain package is a mini `.soma` in one folder: its own `amps/protocols/`, `amps/muscles/`, `amps/scripts/` and `body/`. Put it in `.soma/packages/<name>/`, declare it in `settings.json`, and soma loads its contents **where soma already looks** — gates fire, muscles load, scripts appear in the catalog. Undeclare it and all of that withdraws in one move. A skill is a doorway; a package is a doorway **plus** the machinery behind it.
<!-- /tldr -->

## Why they exist

Everything you teach soma — rules, tools, notes — lands in your `.soma/`. That works until you work
on more than one kind of thing, at which point every session pays for every rule you have ever
written, and removing a subject means finding its files by hand.

A package is one folder per subject, with a switch:

```
  BEFORE  — one pile                      AFTER — one folder per subject, each switchable

  .soma/                                  .soma/
  ├── protocols/  rules for everything     ├── protocols/   the rules you always want
  ├── muscles/    notes for everything      └── packages/
  └── scripts/    tools for everything          ├── api-work/    ← its own rules, notes, tools
                                                  └── data-pipeline/  ← its own, separate
  Adding a subject: dump more files in.
  Removing one:     find them all by hand.     Adding a subject:    drop the folder in.
                                               Removing one:        "deny": ["api-work"]
```

Nothing else changes. The loaders that already walk your `.soma/` find a package's contents in the
same places they always look — so a package's gates fire, its muscles load, and its scripts appear
in your boot catalog exactly as if you had written them yourself.

## What a domain package is

A **skill** is a doorway: a `SKILL.md` whose description sits in the catalog, with the body loaded
on demand. That is the right shape for *instructions*.

It is the wrong shape for *machinery*. A skill cannot carry a path gate, a chain-discovered muscle,
or a script that shows up in your boot catalog — because soma resolves exactly one directory per
content kind per root, and a skill folder is not one of those roots.

A **domain package** is that missing root. It is a directory laid out like a small `.soma`:

```
.soma/packages/my-domain/
├── SKILL.md              ← the doorway — what the domain is, and where to start
├── package.json          ← manifest: what this package provides
├── amps/
│   ├── protocols/        ← including gate-bearing ones
│   ├── muscles/
│   └── scripts/
├── body/                 ← body files, including lazy ones
└── cycles/               ← optional: the domain's own work record
```

**`packages/` and `skills/` are different things on purpose.** A folder under `skills/` is a
doorway and nothing more. A folder under `packages/` is a doorway **and** amps, body and rules. You
can tell which is which by where it lives, without opening it.

Declare it and every one of those directories joins the search chain. Nothing else changes: the
loaders that already walk the chain find the content where they always look.

## Declaring one

```jsonc
// .soma/settings.json — object form: presence in the folder IS the declaration
{
  "domainPackages": {
    "autoDir": "packages",                    // relative to .soma/ — every valid package inside mounts automatically (this is the default; omit it)
    "connect": ["../other-repo/their-pkg"],   // packages OUTSIDE autoDir — explicit paths, project-relative
    "deny": ["some-package"]                  // block by folder name — works on autoDir, connect, AND packages inherited from a parent .soma
  }
}
```

A valid package carries a `package.json` or a `SKILL.md`; anything else in `autoDir` is warned
about, never silently skipped. `"autoDir": false` turns auto-mounting off. Your nearest `.soma`'s
`deny` wins over anything a parent would hand down — the closer to your work, the more focused.

The array form still works and means connect-only, with no auto-mounting:

```jsonc
{
  "domainPackages": [".soma/packages/my-domain"]
}
```

> **Why `domainPackages` and not `packages`?** `packages` already belongs to Pi, in this very file —
> it lists skill repositories to install, and Pi rewrites that array when you manage them. Two
> meanings in one key would mean a package command could quietly drop your domains. `packages` is
> still read for one release so nothing already written breaks; entries there that are not
> directories are left alone, because they are Pi's.

> **⚠ Relative paths resolve against your PROJECT directory, not against `.soma/`.**
> `"packages/my-domain"` resolves to `<project>/packages/my-domain` — almost certainly not what you
> meant. Write `".soma/packages/my-domain"`, or use an absolute path. A `domainPackages` entry that
> cannot be found is reported on stderr and skipped; it never fails your boot silently.

Order matters: earlier entries win a name collision, because every loader dedupes first-wins.

## How its doorway is found

Declaring a package loads its **content** — protocols, muscles, scripts, body files — through the
search chain. That part is complete.

Its `SKILL.md` is also **offered**, not only pointed at: a mounted package's doorway is enumerated
into the on-demand skill catalog (`<available_skills>`) under its `name:`, beside the skills from
your skill directories. The same goes for **skills the package carries**: any
`<package>/skills/<name>/SKILL.md` is catalogued while the package is mounted, and leaves the catalog
with it — so a domain can ship its own skills and a session focused elsewhere never pays for them.
A directory whose name starts with `_` is a draft or archive and is skipped; a name your skill
directories already offer is left to that copy, so nothing appears twice.

Everything the package installs — the gates, the muscles, the scripts, the body variables, the
doorway and its skills — is live the moment you declare it.

## What it means for inheritance

A package is something your project **opted into**. A parent `.soma` is something your project
merely sits under. Soma keeps these distinct:

- Search order is **project → your packages → parent(s) → global**.
- Turning inheritance off (`inherit.protocols`, `inherit.muscles`, `inherit.identity`,
  `inherit.automations`) **keeps the packages you declared** and drops what you inherit.
- A package declared by a *parent* is inherited, so it goes with the parent under that same switch —
  one switch, not two.

## Focusing a session on some of them

Settings say what **can** mount. A session can mount a subset — the packages the work at hand
needs, and no others:

```yaml
# in the preload's frontmatter
focus: [somaverse]            # one or more package folder names
```

```bash
soma --package somaverse      # same thing from the command line; repeatable, wins over the preload
```

Every other package is left out of the chain for that session — its doorway, protocols, muscles,
body files and tools together. Your project's own `.soma`, its parents and the global `.soma` are
never affected; only package roots are. A focus that names no mountable package warns at boot and
names what *is* mountable, so a typo cannot quietly narrow the session. `deny` is applied first,
then `autoDir`/`connect`, then focus.

> A focused-out package's **gates go with it**. Focus is for a lane that genuinely does not touch
> that domain; if the work might, leave the package in.

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
