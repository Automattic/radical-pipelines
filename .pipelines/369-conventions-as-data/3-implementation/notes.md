---
{
  "inputs": [
    "1-spec/spec.md@ace79dac9b11",
    "2-design-doc/design-doc.md@8d28487d46e9"
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
- A reviewer woken by an `INVALID` frontier with the repair request, on opencode, repaired its rejected review thread's status alone and kept its message; the approval landed at its last heading's commit (`notes/reviewer-repair-run.md`).
- A reviewer spawned on opencode as `tools/opencode.md` directs, on `claude-agent/sonnet`, the model `opencode.models` found by the name `rp assign` printed, `sonnet`, fixed its rejected review thread in place and resolved an unknown placeholder from the listed vocabulary; its approval landed and the pipeline read `complete` (`notes/reviewer-run.md`).
- Review answered: the `assign` tests assert the values `rp` fills against test-owned templates, not the delivered templates' structure (0009b0f5); a lane's branch and its review thread are each defined once (250e3652); a nested list's line ends without trailing whitespace (77193c04); `.rp.opencode.md` and `.rp.claude-code.md` say which models they map now that roles resolve their subagent models (27476405). The names each profile refers to in its assignment are all in its template (`notes/profile-names.txt`).
- Revised for the changed spec and design doc: a lane's brief is expanded like the other carried texts (f7f5dea8); the vocabulary's `base` is the Base of the role's turn commit, and the implementer's Base branch is the template value `base-branch` (ef161976); a reviewer woken by an `INVALID` frontier gets the repair request `templates/reviewer-repair.md`, the request off it is the later turn while the lane's review thread is open, and landing stamps an approval at the commit its reviewer's last heading names (1e29433a).
- `npm test`: 561 tests pass.

## Remaining

None.

## Decisions

- Template syntax (`templates/README.md`): `{{name}}` slots; line markers `{{#name}}`, `{{^name}}`, `{{/name}}` for parts kept when the value has something or nothing. Mode-specific material lines are parts on the mode flags `produce`, `respond`, `consolidate`, `implement`; a producer's Later inputs line is the part `{{^lane}}`. Every name a template uses must have a value, so a typo stops `rp assign`.
- A list slot alone on its line renders one item per line, blank-line separated when an item spans lines; after text, its one item inline, or a nested list. This reproduces the hand-filled assignments' layout.
- Guardrail and resource blocks are rendered by `rp` as `### <name>` over `- rule:` / `- resource:`, the layout the hand-filled assignments had, with later lines of a multi-line text indented under the first.
- A placeholder is `{name}` with no brace beside either brace, so `{{name}}` in a convention text is text and brings no vocabulary listing.
- A guardrail or resource entry requires `profiles`: an entry without one carries to no role, as an empty list, which the design rules malformed.
- The default commit format `An imperative subject line.` lives in `rp.mjs`, one place, rather than in the five templates.
- A review lane's review thread is its highest-numbered parsed review thread; `laneThreadOf` reads a lane's threads by file name only for `rp review`'s lane view, which reads the tree without parsing it.
- The repair request names the pipeline folder in the lane worktree (`pipeline-folder`), since its `INVALID` lines name paths relative to it, and carries only the commit format, so only that text's placeholders bring the vocabulary listing.
- The skill's examples outside `tools/` use generic model names (`large`, `small`), as AGENTS.md keeps tool-specific names out of the skill.
- Tests run `rp` from a copied skill folder beside test-owned templates that echo every value under its name, and assert those values; the renderer's syntax has its own fixture templates. One test fills every delivered template for every kind of turn from this repository's `.rp.md` and asserts only the values each carries. Whether the templates keep the names the profiles refer to is an inspection (`notes/profile-names.txt`).
- The review test that diffed a later turn by hand is removed: `rp assign` writes that diff, and its test proves it.

## Failed approaches

## Assumptions

- spec-assumption-1: not observable in this seat, which runs on opencode, not Claude Code; `tools/claude-code.md` § Models documents `sonnet` as an alias.
- spec-assumption-2: observed: from a `claude-agent` session on opencode, `opencode.models` finds `claude-agent/sonnet` by `sonnet` in the caller's own provider, beside `github-copilot/claude-sonnet-5.5` across providers, and `luna` and `astra` only in other providers (`notes/opencode-models-lookup.json`); subagents and a spawned reviewer started on that model ran (`notes/setup-migration.md`, `notes/setup-fresh.md`, `notes/reviewer-run.md`).
- design-doc-assumption-1: refuted: a reviewer given the first-turn request naming its rejected review thread opened no other, but replaced the whole file with a new first review, losing its earlier message (`notes/reviewer-run.md`); carried to the design doc's owner in `threads/3-implementer-design-doc-producer-design-doc.md`.
- design-doc-assumption-2: observed: the same reviewer read `config/42.json` for a guardrail's `config/{ticket}.json`, from the listed vocabulary (`notes/reviewer-run.md`).
- spec-assumption-3: observed: a reviewer on opencode woken with the repair request for its review thread rejected for `status: pending` changed only that line, to `approved`, and kept its message; landed and stamped at its last heading's commit, the lane read `approved` and the pipeline `complete` (`notes/reviewer-repair-run.md`).
