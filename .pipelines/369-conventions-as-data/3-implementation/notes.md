---
{
  "inputs": [
    "1-spec/spec.md@e47d28947768",
    "2-design-doc/design-doc.md@cb79fb49b8df"
  ]
}
---
status: done

# Implementation notes

## Done

- `run-config.md` format 8 records the run's `agents` in the schema of `.rp.md`'s, validated by one function, `parseAgents`; production and review lanes derive from it (8e09dc9d).
- `rp assign`: conventions data read from the main checkout's `.rp.md` and `.rp.local.md` and validated whole, the turn mapped from the frontier, the seat, placeholder expansion, the machine-fillable templates, the reviewer's request and later-turn diff (f3e6382e, 2769ac7b, 9cc722b2).
- Skill prose: `loop.md`, `state.md`, `triage.md`, `load.md`, `setup.md`, `changelog.md` § 8, `agents.md`, `guardrails.md`, `resources.md`, `health-monitoring.md`, and the tools' § Models (3ce34f8a, 41a2d01f, b114fb7f). Profiles: the subagent-model rule and who writes the assignment (6152aa59).
- This repository's `.rp.md` migrated to version 8, with a test that it yields every role's assignment (5ad7b8f3). Its body differs from the version-6 one only by the four sections that moved (`notes/rp-md-migration.diff`). The `demands` lane's assignment written from it for this pipeline is the hand-filled one but for the Subagent model, now `sonnet` (`notes/assignment-demands.diff`).
- README, `docs/`, CONTRIBUTING, and the changeset (082abcee).
- Setup followed cold from the prose by subagents: a version-6 migration that declares `agent` from a lifecycle hook's definition (`notes/setup-migration.md`, input `notes/v6.rp.md`), and a Fresh setup (`notes/setup-fresh.md`); `rp assign` writes every role's assignment from both files. The defects they surfaced are fixed in b114fb7f.
- A reviewer spawned on opencode as `tools/opencode.md` directs, on `claude-agent/sonnet`, the model `opencode.models` found by the name `rp assign` printed, `sonnet`, fixed its rejected review thread in place and resolved an unknown placeholder from the listed vocabulary; its approval landed and the pipeline read `complete` (`notes/reviewer-run.md`).
- `npm test`: 553 tests pass.

## Remaining

None.

## Decisions

- Template syntax (`templates/README.md`): `{{name}}` slots; line markers `{{#name}}`, `{{^name}}`, `{{/name}}` for parts kept when the value has something or nothing. Mode-specific material lines are parts on the mode flags `produce`, `respond`, `consolidate`, `implement`; a producer's Later inputs line is the part `{{^lane}}`. Every name a template uses must have a value, so a typo stops `rp assign`.
- A list slot alone on its line renders one item per line, blank-line separated when an item spans lines; after text, its one item inline, or a nested list. This reproduces the hand-filled assignments' layout.
- Guardrail and resource blocks are rendered by `rp` as `### <name>` over `- rule:` / `- resource:`, the layout the hand-filled assignments had, with later lines of a multi-line text indented under the first.
- A placeholder is `{name}` with no brace beside either brace, so `{{name}}` in a convention text is text and brings no vocabulary listing.
- A guardrail or resource entry requires `profiles`: an entry without one carries to no role, as an empty list, which the design rules malformed.
- The default commit format `An imperative subject line.` lives in `rp.mjs`, one place, rather than in the five templates.
- A review lane's review thread is chosen by file name, so a rejected (unparseable) review thread is still the lane's thread and the reviewer is asked to fix it in place.
- The skill's examples outside `tools/` use generic model names (`large`, `small`), as AGENTS.md keeps tool-specific names out of the skill.
- Tests assert the values `rp` fills and the headings the profiles refer to, not template wording; where a test must recognize a template's part (the own-model wording, the default request), it reads that part from the delivered template.
- The review test that diffed a later turn by hand is removed: `rp assign` writes that diff, and its test proves it.

## Failed approaches

## Assumptions

- spec-assumption-1: not observable in this seat, which runs on opencode, not Claude Code; `tools/claude-code.md` § Models documents `sonnet` as an alias.
- spec-assumption-2: observed: from a `claude-agent` session on opencode, `opencode.models` finds `claude-agent/sonnet` by `sonnet` in the caller's own provider, beside `github-copilot/claude-sonnet-5.5` across providers, and `luna` and `astra` only in other providers (`notes/opencode-models-lookup.json`); subagents and a spawned reviewer started on that model ran (`notes/setup-migration.md`, `notes/setup-fresh.md`, `notes/reviewer-run.md`).
- design-doc-assumption-1: observed: a reviewer given the first-turn request naming its rejected review thread rewrote that thread in place and opened no other (`notes/reviewer-run.md`).
- design-doc-assumption-2: observed: the same reviewer read `config/42.json` for a guardrail's `config/{ticket}.json`, from the listed vocabulary (`notes/reviewer-run.md`).
