---
status: done
---

# Implementation notes

## Done

- `rp` reads `run-config.json`, and for `next` and `land` `run-config.local.json` over it by name; it reads neither `.rp.md` nor `.rp.local.md`, carries no pipeline format, marks a pipeline folder by `run-config.json` alone, and stops `check`, `next`, and `land` on a `run-config.local.json` Git tracks. The `rp` contract (`scripts/README.md`, `templates/README.md`) and the tests follow, with `scripts/test/rp/run-config.test.mjs` new (7b69f1e2, 10ad9963).
- The skill: conventions as prose entries (`load.md`, `guardrails.md`, `resources.md`, `agents.md`, `setup.md`), the run configuration recorded verbatim at every run start (`state.md` § Run configuration, triage steps 4 and 6, `loop.md`, `SKILL.md`), and no step naming a pipeline format (triage, report, changelog) (43724325, 38cfdf7e, 14deae6e).
- This repository's `.rp.md` as prose at version 7, each text and value equal to its frontmatter data at 1a43fc61 (8874be1a; `notes/rp-md-inspection.txt`, from `notes/rp-md-inspection.mjs`).
- Derived: changelog entry 7 migrates a version-6 `.rp.md` into the entry form (823cc4d1); `.gitignore` ignores `run-config.local.json` (a65c1681; `notes/check-ignore.txt`); a new pipeline's slug names no folder of its start commit's pipelines folder root (73c38a58); Agents may sit in a tool's section (a4da7fee).
- `README.md`, `docs/`, the website's file listing, and the unreleased changesets, `conventions-as-data.md` becoming `run-configuration.md` (635225d6, 6554527c).
- Review fixes:
  - `owner-directions` given as `null` is rejected (16fa2a2e).
  - A local model override for the implicit `default` review lane is accepted (01c4208b).
  - "Override", not "pin", for local models (24ebbe2d).
  - The run configuration records `.rp.md` and `.rp.local.md` apart, Agents included (9d476893).
  - The `profiles` field's form is defined (1505a32d).
  - The changeset states that review lanes keep folders without `run-config.json` (8dd88a6c).
  - A test covers the stop on a landing that would bring `run-config.local.json` (10f8379c).
  - Evidence: `notes/review-repro.txt` and `notes/owner-findings.txt` (cfa4cb4b).
- The revised design doc (3fcd2c50):
  - Discovery reads each listed pipeline's intent through the file grammar, and stops on one that is missing, not a regular file, or rejected (efb5f0ed, e574786b, 6bba36d0).
  - A model the owner asks for, while confirming or during the run, removes only that field's local override (30b94889). A test proves that an override of one field keeps the other committed (41588946).
  - The run confirmation shows each model with this clone's override beside it (34f67907).
  - A local file may override the lanes the run has (706fc428).

## Remaining

- When the review threads next await the implementer, give the reviewers the results of the findings carried to other owners:
  - astra 1 and 2, and default 3: the design doc changed in 3fcd2c50, implemented in the commits above.
  - default 1: spec-requirement-20 stands, because Git refuses a taken local branch name and rejects pushing a branch whose name only a remote branch takes (`1-spec/spec/taken-branch-probe.txt`).

## Decisions

- Prose entry form (`load.md` § Conventions): a value is one code span; a text is its own lines; an entry is a heading, its fields as `- <field>: <value>` list items, then a blank line and its text. Guardrails and resources have a `profiles` field, the profile names separated by commas; Agents profiles and lanes have `model` and `subagents`, a lane one heading level below its profile.
- `rp` messages: `cannot read <folder>/run-config.json: missing`; `<path>: <key>: missing`; `<path>: unexpected key: <key>`; `<path>: tracked by Git`; `<path>: agents.<profile>.lanes.<id>: a lane the run does not have`; `pipelines: cannot read <ref>:<folder>/0-intent/intent.md: missing | not a regular file`; `pipelines: <ref>:<folder>/0-intent/intent.md: <file grammar reason>`.
- A lane of `run-config.local.json` is declared when it is one of the run's roles (`rolesOf`), the criterion the frontier uses, so the implicit `default` review lane counts; `runViewOf` creates the entry of a lane it overrides that the agents do not list.
- The tracked check is `requireUntracked`, called first by `inspect` (working tree: the index or `HEAD`; `--ref`: that commit) and by `landingOf` (the commit a landing would leave).
- `objectAt` takes an empty `at` for a whole file, and `jsonObjectOf` parses a JSON file holding one object; the certification parser uses both, with its messages unchanged.
- Test fixture: `configure()` writes `run-config.json` with `worktree-folder-root: ".worktrees"` and the conventions `conventions(data)` sets; `useRepo` has Git ignore `.worktrees/` and `run-config.local.json`, as setup has a project ignore them; `ignore(pattern)` appends to the exclude file.
- The unreleased changesets describe what ships, as earlier unreleased reworks did: `conventions-as-data.md` is rewritten as `run-configuration.md`, and the others name `run-config.json`.
- Against the base's `rp.mjs`, the changed and new tests fail (180 of 192 in `run-config`, `assignments`, `pipelines`, `frontier`, and `review-lanes`; 357 of 496 across `scripts/test/rp`), most at their first `rp` call, since that `rp` reads no `run-config.json`.

## Failed approaches

## Assumptions

spec-assumption-1: observed: a subagent on `claude-agent/sonnet`, acting as the orchestrator with the changed skill, recorded a new pipeline's `run-config.json` from this repository's `.rp.md`; each value and text equals the conventions data at 1a43fc61 (`notes/orchestrator-exercise/compare.txt`, `run-config.json`).
spec-assumption-2: observed: that subagent's confirmation names `tests` and `documentation` under `implementer` and `reviewer`, and `test suite and scripts` under every profile (`notes/orchestrator-exercise/confirmation.md`).
design-doc-assumption-1: observed: with `.rp.local.md` overriding the implementer's model with `local-opus` and a request asking for `fable`, the recorded `run-config.local.json` left that pin out, and `rp next` named `wake implementer model fable`, while the lane pin gave `wake reviewer-astra model local-astra` (`notes/orchestrator-exercise/run-config.local.json`, `rp-run.txt`).
design-doc-assumption-2: observed: a subagent acting as the orchestrator chose the slug `371-rp-thread-and-validate-2` for new work on issue 371, because `v4`'s pipelines folder root holds `371-rp-thread-and-validate`; no ref holds the new folder (`notes/orchestrator-exercise/slug.md`).
