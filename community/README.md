<div align="center">

<br>

### σ Community

*Shared patterns from real workflows.*

<br>

Protocols, muscles, skills, and templates for [Soma](https://soma.gravicity.ai) agents.

</div>

---

## What's Here

| Directory | What | How it loads |
|---|---|---|
| `protocols/` | Behavioral rules | `/hub install protocol <name>` |
| `muscles/` | Learned patterns | `/hub install muscle <name>` |
| `skills/` | Domain expertise | `/hub install skill <name>` |
| `templates/` | Full agent configs | `soma init --template <name>` |

```bash
# From inside a Soma session:
/hub install protocol breath-cycle
/hub install muscle docker-deploy
/list remote                      # browse everything
```

## Contributing

1. Fork → add your protocol/muscle/skill → open a PR
2. Follow the format below — CI validates frontmatter automatically

### Format

**Protocols** need: `type: protocol`, `name`, `heat-default`, `breadcrumb`, `applies-to`, a `## TL;DR` section.

**Muscles** need: `type: muscle`, `status: active`, `triggers`, `tags`, `## TL;DR` section, `heat: 0`.

**Skills** need: a `SKILL.md` with `name`, `description`, `version`, `author`, `keywords`. Self-contained.

> `triggers` is the single activation list — merged from old `triggers` + `keywords` + `topic` as of v0.6.2.

## Specifications

Community protocols are operational derivatives of formal specs in [curtismercier/protocols](https://github.com/curtismercier/protocols). Each protocol's `spec-ref` links to its source.

## License

Protocols and concepts: **CC BY 4.0** — [Curtis Mercier](https://github.com/curtismercier).
<br>
Community contributions follow CC BY 4.0 unless specified otherwise in frontmatter.

---

<div align="center">

<sub>BSL 1.1 © Curtis Mercier — open source 2027</sub>

</div>
