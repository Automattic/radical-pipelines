## Generate a PR description artifact

Closes #66.

Makes the pipeline produce its pull-request description as a real, inspectable, self-contained artifact during the Docs phase (phase 5), so opening a PR draws from that artifact instead of re-deriving the description from scratch. Produced via the Radical Pipelines autonomous pipeline (spec → design → plan → code → docs); the per-phase artifacts are committed for inspection.

Before this change the only place the pipeline named a PR body was a single line in the `artifacts-in-fork` setup convention, telling the orchestrator to open the PR "using `pr-description.md` as the body." That reference was dangling: a bare filename with no path, no producer, and no content contract, and nothing in the pipeline ever created the file. Anyone opening a PR had to reconstruct the description by reading the full diff. This change makes the artifact real and keeps the pipeline's references to it honest.

There is no application code here. The change is a fixed set of edits to this repo's own pipeline reference docs, agent definitions, conventions, and `SKILL.md`. The artifact rides the phase-5 machinery that already exists: it is "just another doc task" that is always present, always last, and carries a few extra constraints, so the existing plan / dispatch / sequential-commit / review / task-ID re-dispatch / single-terminator / fork-resume mechanisms carry it for free.

### What changed

- **The artifact is produced as a mandatory, always-last doc task.** `agents/doc-plan-writer.md` now appends one standardized PR-description task to the end of every `doc-plan.md` it emits, depending on all prior tasks so it runs last and reads the committed docs. Its `Files` target is `<artifacts-folder>/5-docs/pr-description.md`, and its acceptance fixes the contract (follows host PR conventions, self-contained, links the issue, reflects the whole shipped change). A deliberate-new-shape note explains that this fixed task is an intentional carve-out from the agent's "cover every relevant surface" and "stay within spec and design" guidelines, so it is not mistaken for scope creep or removed by a future maintainer.

- **The plan reviewer accepts and asserts the task.** `agents/doc-plan-reviewer.md` gains a feasibility carve-out so it does not flag the task's non-host `Files` target or its whole-change summarizing goal, plus an assertion that every plan ends with the well-formed PR-description task (rejecting a plan where it is absent or malformed).

- **The producer follows a durable content contract.** `agents/doc-writer.md` gains a PR-description carve-out covering: (i) host-PR-convention discovery at produce-time (template if the host has one, otherwise observed conventions from recent merged PRs, otherwise a generic body, with no fixed section names); (ii) self-containment with R3-over-R5 precedence — no links into the artifact folder and no fork-relative paths, and where observed conventions include a provenance line citing such a path, keep the mention but strip the path; (iii) a tracker-agnostic issue link sourced from `0-prompt/prompt.md`, permitting but not hard-coding a GitHub-style auto-close keyword.

- **The artifact is reviewed under the existing single gate.** `agents/doc-reviewer.md` gains the originating-issue input and three checks scoped to a batch containing the PR-description task — whole-change accuracy, issue link, and self-containment (including the provenance-path case). Problems are reported as issues tagged to the PR-description task's ID in the normal rejection structure; there is no second approval and no second terminator file, and the artifact is not added to any reviewer-owned file list.

- **Re-dispatch keeps the description fresh.** The phase-5 reference gains an always-last re-dispatch rule: any non-empty re-dispatch batch always includes the PR-description task and runs it last, so the description is re-produced against the latest committed docs on every rejection iteration and is never stale at approval.

- **Phase 5 cannot complete without the artifact, and its outputs enumerate it.** The phase-5 completion predicate now requires both `docs-review-approved.md` and `pr-description.md`. The four surfaces that describe what phase 5 produces are updated to name the artifact as a descriptive output (no merge or PR-opening behavior added): the phase-5 Outputs list, the phase-5 step-6 completion self-check, the per-phase Produces table in `SKILL.md`, and the per-phase completion predicate in `pipeline-versioning.md`.

- **The orchestrator supplies the tracker.** `autonomous-workflow.md` adds the Issues convention (the host's issue tracker plus how to access it) to the conventions the orchestrator passes into each phase-5 agent's prompt, so the producer can discover host PR conventions from recent merged PRs and link the issue, and the reviewer can verify that link.

- **The dangling reference is reconciled.** The `artifacts-in-fork` setup convention now points at the artifact's canonical fork-side location ("the content of the phase-5 PR-description artifact ... in the fork") instead of a path-less, producer-less filename.

- **User-facing docs and changelog.** The README's phase list and its phase-5 walkthrough now describe the PR-description artifact and how it rides the existing doc machinery, and a `minor` changeset records the feature.

### Out of scope

Authoring the procedure that consumes this artifact to open a PR (the merge guide, issue #57) is intentionally not done here. No new PR-opening flow, `gh pr create` invocation, or PR-title composition is introduced, and the `artifacts-in-fork` upstream transformation steps are unchanged. This change owns only producing and standardizing the artifact and keeping the pipeline's existing references to it honest. This PR description is itself the first artifact produced by the mechanism it ships, generated against everything that landed on this branch.

### Verification

`npm test` passes. The change is documentation and agent-definition edits with no application code, so the existing test suite is unaffected; the strengthened phase-5 completion predicate and the enumeration edits were reviewed against each other so the orchestrator's step-6 self-check and the `pipeline-versioning.md` predicate agree.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
