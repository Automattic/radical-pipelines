# Docs Phase Summary

## What

Three documentation changes that surface the new default output rules to Radical Pipelines consumers:

- **Release changeset** — `.changeset/default-output-rules.md`: a `minor` bump prefixed `BREAKING:` recording that two always-on output rules now govern every run's host-project product, that the Code and Docs reviewers enforce them, and that the agent-name provenance tag is now confined to artifact-only commits.
- **Website demo fix** — `website/demo.js`: the phase-4 product-commit example changed from `git commit -m "Add orchestrator (code-writer-tdd)"` to `git commit -m "Add orchestrator"`, so the demo no longer teaches an agent-name tag on a host-project product commit.
- **README behavior narrative** — `README.md`: a paragraph in the conventions/behavior section stating that two always-on, enforced output rules govern every run's product and that the provenance tag is confined to artifact-only commits.

## Why

The feature promotes two output rules into the tool itself. The internal canonical statement and agent obligations are authored by the Code phase; the Docs phase covers the consumer-facing surfaces that describe the tool's behavior — the changelog record, the public marketing demo (whose old commit example showed a pattern the tool now forbids), and the top-level README's narrative of always-on behaviors — so consumers learn what the tool now guarantees about the output a run ships.

## How

Each surface was changed at its own altitude and no further:

- The changeset bump type was chosen per `CONTRIBUTING.md`'s pre-1.0 policy (a breaking convention change → `minor` + `BREAKING:` prefix; `major` is forbidden pre-1.0 at version `0.4.0`).
- Only the commit *message* in the demo's product step changed; the legitimate agent-name step labels and artifact tree, which document the tool's concepts and artifact types, were preserved. The sibling `website/index.html` commit-log examples are artifact-folder commits and correctly keep their provenance tags.
- The README addition is brief and high-level, placed beside the existing conventions/summaries/commit-format discussion, and does not duplicate the canonical rule text that lives in the skill.

The three product commits each carry no agent-name provenance tag, consistent with the reconciled commit-format convention this feature ships.

## Key decisions

- **The canonical `output-rules.md`, the five agent profiles, the two phase files, and the `setup.md`/`.rp.md` commit-format conventions were deliberately not re-documented by the Docs phase.** These are authored by the Code phase; re-documenting them would duplicate content across reading paths, which the project's no-duplication rule forbids.
- **`CHANGELOG.md`, `CONTRIBUTING.md`, `AGENTS.md`/`CLAUDE.md`, and `.github/` were left untouched** — the changelog is generated from changesets, and the others document neither the output rules nor the provenance behavior, so none drifts.

## Known limitations

The output rules are enforced by judgment-based reviewer checks, not a deterministic gate; the docs describe enforcement at the level of "the reviewers enforce and block completion," matching the shipped mechanism, and do not over-promise guaranteed detection.
