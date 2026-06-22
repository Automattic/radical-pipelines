# Code Phase Summary

## What

Nine prose edits across ten files install two always-on output rules into the
Radical Pipelines tool itself:

- **New canonical statement** — `skills/radical-pipelines/reference/output-rules.md`
  states both rules (Rule 1: leave unchanged comments and prose untouched; Rule 2:
  the host-project product is transparent to the pipeline), their reach, carve-outs,
  the referent-based this-run discriminator, the commit-message clause, and the
  enforcement note.
- **Two commit-format reconciliations** — `skills/radical-pipelines/reference/conventions/setup.md`
  and the in-repo host config `.rp.md` now confine the agent-name provenance tag to
  artifact-only commits; product commits carry no tag.
- **Three writer-profile updates** — `agents/code-writer-tdd.md`,
  `agents/code-writer-e2e.md`, `agents/docs-writer.md` each gain an "Obey the output
  rules" obey-and-self-check obligation under the shared handle and a reworded
  no-provenance commit step; `code-writer-tdd` additionally drops its superseded
  narrower Rule 2 line.
- **Two reviewer-profile updates** — `agents/code-reviewer.md` and
  `agents/docs-reviewer.md` each gain a commit-messages gather-context input
  (base→HEAD `git log`) and an "Output rules" checklist entry.
- **Two phase-file edits** — `skills/radical-pipelines/reference/autonomous-phases/4 - code.md`
  and `5 - docs.md` pass the resolved content of `output-rules.md` to the reviewer at
  launch, alongside `summary-format.md`.

## Why

Two desirable properties of generated output were previously hand-passed by the
owner per run, and one had already leaked (generated code that narrated the
pipeline's own process). Promoting both into the tool gives every run the rules for
free — always-on, no owner action, no opt-out — and enforces them through the
reviewer that already gates Code/Docs phase completion.

## How

The rules follow the project's established pattern for cross-cutting tool defaults:
one canonical definition in a named skill reference file plus role-specific
restatements in the five Code/Docs profiles, tied by the shared name-handle "the
output rules" (the same device the blocker protocol uses). No profile references the
skill file; the orchestrator inlines `output-rules.md` content into each reviewer's
launch prompt, mirroring the existing `summary-format.md` delivery channel.
Enforcement reuses the existing reviewer → re-dispatch loop verbatim: a violation
becomes a must-fix issue tagged to the offending task, and the phase cannot reach its
approval file while a violation stands. No new gate, artifact, or completion
predicate was added.

## Key decisions

- **Confine the provenance tag to artifact-only commits.** R6 is treated as part of
  Rule 2's reach. Reconciliation landed in three coordinated places — the convention
  `setup.md`, the host `.rp.md`, and each writer profile's commit step — because an
  agent reads only its own profile; reconciling fewer than all three would leave a
  writer with conflicting commit-message guidance.
- **Referent-based discriminator, not a token scan.** Rule 2 flags only references
  whose referent is *this run's* pipeline process, artifacts, or agents. A token or
  path scan was rejected because it over-flags the self-hosting repository, whose
  README and website legitimately use the full pipeline vocabulary; the rule text
  carries that repository as the worked fixture.

## Known limitations

- Enforcement is judgment-based (a reviewer read), not a deterministic command gate —
  the accepted trade-off, since the rules are not command-decidable and the tool has
  no mechanism to ship a mandatory gate.
- The reconciliation only changes the tool's own convention and `.rp.md`; a host that
  has configured a tagging commit format must update its own `.rp.md`, or the
  reviewer's R6 check will (correctly) flag its product commits as a normal rejection.

## Notes on this run

Iteration 1 rejected the batch on a single self-application defect: every product
commit carried the `(code-writer-tdd)` agent-name tag, which the feature's own Rule 2
commit clause forbids on product commits. All nine tasks' file content was correct in
iteration 1 and was carried forward byte-identically; iteration 2 fixed the defect by
rewording the nine product commit subjects to drop the tag. The committed review files
`code-review-1-rejected.md` and `code-review-approved.md` record both iterations.
