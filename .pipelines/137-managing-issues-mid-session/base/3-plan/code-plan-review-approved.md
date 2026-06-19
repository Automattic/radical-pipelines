# Code Plan Review — APPROVED (iteration 1)

Adversarial review of `…/base/3-plan/code-plan.md` against the spec
(`…/base/1-spec/spec.md`, ground truth) and the design doc
(`…/base/2-design-doc/design-doc.md`), with load-bearing claims verified against
the live skill under `skills/radical-pipelines/`.

**Verdict: APPROVED.**

## What was verified

### Completeness — every requirement and decision is covered by a task

| Source | Covered by |
| --- | --- |
| R1 (mid-session re-entry) | Task 1 |
| R2 (stated once; references rely on it) | Task 1 + Task 4 (AC2 trace) |
| R3 (rule reachable mid-run) | Task 1 (`## Rules` invariant) + Task 2 (de-exclusivize) |
| R4 (`manage-issues.md` safe mid-session, no hard-coded next step) | Task 3 |
| R5 (precedent route/return stay correct) | Task 4 (AC4 trace) + no-edit discipline |
| AC1–AC6 | All traced explicitly in Task 4 |
| D1 | Task 1 |
| D2 | Task 2 |
| D3 | Task 3 |
| D4 | Task 4 |

### Feasibility and correctness of each task's Files/Changes

Every cited location matches the live skill byte-for-position:

- `SKILL.md` — `## Rules` bullets at `:14`–`:15`; Entry-points preamble at `:50`;
  table at `:52`–`:55` ("Work on an issue" `:54`, "Manage issues" `:55`).
  Confirmed.
- `reference/manage-issues.md` — framing line `:3` (carries the three claims the
  design separates: scope boundary, the "upstream of `work-on-an-issue.md`"
  hard-coded next step, and the "front door" positional framing); close-out
  `## Close out` + sentence at `:52`–`:54`. The untouched set (`:1`, `:5`,
  `:7`–`:10`, `:12`–`:14`, `:17`–`:20`, `:30`, `:48`–`:50`) all map to real,
  situation-neutral content. Confirmed.
- `reference/review-pipeline.md:12` — the lone merged-pipeline pointer. Confirmed
  and correctly placed in Task 4's read-only set (no edit).

### Ordering and dependencies

- Task 2 → depends on Task 1 (same file; de-exclusivization is only coherent once
  the standing rule carries the mid-session truth, and sequencing avoids a
  `SKILL.md` edit conflict). Correct.
- Task 3 → independent (different file). Correct.
- Task 4 → depends on 1/2/3 (verifies the finished state). Correct.

### Behavioral verification, no structural tests over skill prose

Task 4 produces a reading-path trace recorded in the code-writer's task summary;
it writes and tests no file and explicitly restates the `CLAUDE.md`
prose-not-software prohibition. The "Nature of this change" section correctly
states there are no automated guardrail gates for this project. Compliant.

### Scope discipline

- The plan edits **only** `SKILL.md` and `reference/manage-issues.md`.
- `review-pipeline.md:12` is left byte-for-byte unchanged; AC4 verifies this with
  a diff/grep.
- All five Out-of-Scope items are each addressed under AC5 (run-time tracker
  metadata, new recognition triggers, spawned-agent behavior, the absent
  merge/close files, plus the unchanged moment-set).

### Independent corroboration against the live skill

- **AC2 site-set is exhaustive.** `grep -rn "manage-issues" skills/radical-pipelines/`
  returns exactly two routing sites: `SKILL.md:55` (Entry-points row) and
  `review-pipeline.md:12` (the lone pointer). A broader search for issue
  create/modify language surfaces only read/reference uses in `fork-pipeline.md`,
  `create-pipeline.md`, `intent-format.md`, and the phase files — none writes an
  issue. The plan's claim that the complete create/modify site set is
  `manage-issues.md` + `review-pipeline.md:12` is correct, so "the one general
  rule governs every site" holds.
- **Referent distinction is real.** `conventions/load.md:16` defines the
  **Issues** convention as "Where to find the project issues and how to
  create/modify them" — a tracker mechanism, a different referent from the
  Managing Issues workflow (the capture process). The plan correctly keeps the two
  apart (Task 1 references the workflow, never the convention) and forbids coining
  a new "Managing Issues workflow" proper noun, which indeed appears nowhere in the
  skill.
- **Out-of-scope metadata convention exists and is untouched.** `.rp.md` carries
  the "Orchestrator updates during a run" handling; no task touches it.

## Authoring-rule (AC6) and risk-trap compliance

The plan is notably disciplined on the two highest-risk authoring traps the design
flagged, both of which it converts into fixed acceptance checks:

- **No new proper noun.** Task 1's shared-terminology note and its acceptance
  pin the rule to the file reference and/or the existing "Managing Issues" handle.
- **Zero caller examples.** Task 3's changes and acceptance forbid both a
  session-start and a mid-run caller example, matching D3's reasoning that a
  mid-run-caller example would document a caller that does not concretely exist
  and that any example reintroduces a mini-enumeration against stated-once.

The one retained negative ("does not create or run pipelines") is correctly
identified as a necessary scope statement and explicitly protected from
over-eager negative-stripping.

## Defects found

None. No completeness gap, feasibility error, ordering problem, scope leak, or
verification-mode violation was found. Every load-bearing line reference and the
exhaustive site-set were confirmed against the live skill.
