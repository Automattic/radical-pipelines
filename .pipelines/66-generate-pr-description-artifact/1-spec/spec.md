# Spec — Generate a PR description artifact

## Overview

When a Radical Pipelines run finishes and a pull request is opened, the PR body
has no documented source. The only place the pipeline names one today is a
single reference in the `artifacts-in-fork` setup convention
(`setup.md:122`), which tells the orchestrator to open the PR "using
`pr-description.md` as the body." That reference is a dangling one: it names a
bare filename with no path, no producer, and no content contract, and nothing in
the pipeline ever creates that file. The `artifacts-in-repo` PR path does not
mention it at all. As a result, anyone opening a PR for a finished pipeline must
re-derive the description from scratch by reading the full diff, which is exactly
the context burden this feature exists to remove.

This work makes the pipeline produce the PR description as a real, inspectable
artifact. The Docs phase (phase 5) is the natural home: it is the first and only
point where everything that shipped across the whole pipeline — spec intent,
design rationale, code, and documentation — coexists and has been reviewed
together, so the description can be written once, against real sources, instead
of being reconstructed later. The artifact is a single self-contained Markdown
file, named `pr-description.md`, that follows the host project's PR conventions
and can be used verbatim as the body of the pull request. It is a required,
reviewed-for-accuracy output of phase 5, gated by the same approval that already
governs the phase, and the pipeline's own descriptions of what phase 5 produces
are updated to enumerate it. The pre-existing `setup.md:122` reference is
reconciled so the pipeline does not contradict itself once the artifact is real.

Authoring the merge / open-a-PR procedure that consumes the artifact belongs to a
separate, not-yet-written guide (`merge-pipeline.md`, issue #57) and is out of
scope here. This work owns producing and standardizing the artifact and keeping
the pipeline's existing references to it honest; it does not own the procedure
that opens the PR.

## Requirements

### The artifact

- **R1 — A `pr-description.md` artifact exists after phase 5.** After the Docs
  phase (phase 5) completes for a pipeline, an inspectable artifact named
  `pr-description.md` exists and is committed on the pipeline branch, inside the
  phase-5 artifacts folder (`<artifacts-folder>/5-docs/pr-description.md`). The
  filename `pr-description.md` is fixed — it matches the pre-existing reference in
  the setup convention.

- **R2 — The artifact is a usable PR body.** The artifact is the content of a
  pull-request body: a single Markdown file that can be used verbatim as the PR
  body when a PR is opened, with no assembly, concatenation, or templating step
  required to use it.

- **R3 — The artifact is self-contained.** The artifact's meaning and usability do
  not depend on any other pipeline artifact or on any fork-only file. It contains
  no links or paths that the published PR viewer cannot resolve — specifically no
  references into the pipeline's artifact folder and no fork-relative paths.
  (In `artifacts-in-fork` mode the upstream PR never sees the fork's artifacts, so
  such links would be broken; in `artifacts-in-repo` mode they would needlessly
  re-couple the PR to internal artifacts.) The artifact MAY link to publicly
  resolvable targets, such as the originating issue.

- **R4 — The artifact links the originating issue, tracker-agnostically.** The
  artifact references the originating issue in a way appropriate to the host
  project's issue tracker — for example a GitHub `Closes #N` auto-close keyword
  where supported, or a plain issue link or identifier otherwise. The contract is
  tracker-agnostic: no GitHub-specific keyword is hard-coded into it.

- **R5 — The artifact follows the host project's PR conventions, drift-resistant.**
  The artifact's content and structure follow the host project's pull-request
  conventions: a PR template if the host provides one; otherwise the host's
  observed / de-facto PR conventions; otherwise a sensible generic PR body. The
  contract does not mandate fixed section names (it does not hard-code, for
  example, `## Summary` or `## Testing`). This mirrors how the pipeline's doc and
  code agents already follow the host project's documentation, verification, and
  commit conventions rather than baking in this-repo specifics.

- **R6 — The artifact reflects the whole shipped change, accurately.** The artifact
  summarizes the full set of changes that shipped in the pipeline — spec intent,
  design rationale, the code, and the phase-5 documentation — not only the
  documentation phase. Its claims reflect what actually shipped: nothing invented,
  nothing stale.

### Lifecycle and enforcement

- **R7 — The artifact is a required, completion-gating phase-5 output.** Phase 5
  cannot be considered complete unless `pr-description.md` is present and committed
  on the pipeline branch. The phase-5 completion condition — today, the
  `docs-review-approved.md` terminator being committed — additionally requires the
  artifact to be present. Because phase 5 is structurally a precondition of opening
  a PR, this guarantees the artifact is always present at the points where opening
  a PR is offered.

- **R8 — The artifact is reviewed for accuracy under the existing single gate.**
  The artifact is reviewed for accuracy before phase 5 completes, using the phase's
  existing single approve/reject gate — the same pass that produces the
  `docs-review-approved.md` approval. The review verifies that the PR description
  accurately reflects the shipped changes and links the originating issue. A
  missing or inaccurate PR description is a rejection that sends the work back
  alongside any other flagged phase-5 work, looping until one clean pass approves
  the whole batch including the PR description. There is no second, independent
  approval or terminator file for the PR description.

- **R9 — The artifact forks and resumes like any other phase-5 file.** The artifact
  participates in pipeline fork and lineage like any other file in `5-docs/`:
  forking a pipeline at phase 5 carries `pr-description.md` into the new pipeline
  verbatim, and resuming a phase-5-complete pipeline preserves it. It needs no
  special handling beyond living in the phase-5 folder.

### Consistency reconciliation

- **R10 — The pre-existing consumer reference is reconciled.** The single
  pre-existing reference to the artifact (the `artifacts-in-fork` setup convention,
  which names `pr-description.md` as the PR body) resolves to the artifact's
  canonical location and no longer misdescribes it as a path-less, producer-less
  file. This keeps the pipeline from contradicting itself once the artifact is
  real.

- **R11 — The pipeline's descriptions of phase-5 outputs enumerate the artifact.**
  The pipeline's own descriptions of what phase 5 produces are updated to list the
  new artifact so they are not left stale — at minimum the phase-5 reference's
  Outputs list, the per-phase "Produces" table in the skill overview, and the
  phase-5 completion condition. These updates describe what phase 5 now produces;
  they do not add any merge or PR-opening behavior.

## Out of Scope

- **The merge / open-a-PR procedure (`merge-pipeline.md`, issue #57).** Authoring
  the procedure that opens the PR is out of scope, including: any new
  `artifacts-in-repo` PR-opening flow; the actual `gh pr create` (or equivalent)
  invocation; composition of the PR TITLE; and the `artifacts-in-fork` upstream
  transformation (clean-branch naming, code-only cherry-pick, commit-message
  rewrite, push). This work only ensures that the body SOURCE that procedure draws
  from is the reconciled artifact.

- **The other missing post-phase-5 action guides.** `review-pipeline.md` and
  `close-pipeline.md` are not authored by this work.

- **Producing / reviewing AGENT mechanics.** Which agent writes the artifact, which
  reviews it, the exact ordering, and whether the host's PR conventions are
  discovered at produce-time or captured via a new optional setup convention are
  design-phase decisions. This spec fixes only the observable outcomes above.

- **Assisted-only runs.** The assisted workflow cannot run phase 5 (it caps at
  phase 3) and never opens a PR, so no documented consumer needs the artifact
  there. This work does not require the artifact to be produced for assisted-only
  runs.

## Acceptance Criteria

- **AC1 — The artifact exists at the canonical location after phase 5 (R1).**
  - **Given** a pipeline whose Docs phase has completed,
  - **When** a reviewer inspects the pipeline branch,
  - **Then** a committed file `<artifacts-folder>/5-docs/pr-description.md` exists.

- **AC2 — The artifact is usable verbatim as a self-contained PR body (R2, R3).**
  - **Given** the produced `pr-description.md`,
  - **When** it is used as the body of a pull request without any assembly,
    concatenation, or templating,
  - **Then** it renders as a complete, standalone PR body, and it contains no
    references into the pipeline's artifact folder and no fork-relative paths that
    the published PR viewer could not resolve.

- **AC3 — The artifact links the originating issue tracker-agnostically (R4).**
  - **Given** the produced `pr-description.md`,
  - **When** a reviewer reads it,
  - **Then** it references the originating issue in a form appropriate to the host
    project's tracker, and the generic contract that governs it does not hard-code a
    GitHub-specific keyword.

- **AC4 — The artifact follows host PR conventions without fixed sections (R5).**
  - **Given** a host project that does or does not provide a PR template,
  - **When** the artifact is produced,
  - **Then** its structure follows the host's PR template when one exists, otherwise
    the host's observed PR conventions, otherwise a sensible generic PR body — and
    no specific section names are mandated by the contract.

- **AC5 — The artifact reflects the whole shipped change accurately (R6).**
  - **Given** a completed pipeline,
  - **When** a reviewer compares `pr-description.md` against what shipped,
  - **Then** it summarizes the spec intent, design rationale, code, and phase-5
    documentation, and every claim it makes corresponds to an actual change (none
    invented, none stale).

- **AC6 — Phase 5 cannot complete without the artifact (R7).**
  - **Given** a phase-5 run in which `pr-description.md` is absent,
  - **When** the phase-5 completion condition is evaluated,
  - **Then** phase 5 is not considered complete, and any action gated on phase-5
    completion (such as opening a PR) is not offered.

- **AC7 — The artifact is gated by the existing single approval (R8).**
  - **Given** a phase-5 batch under review,
  - **When** the reviewer finds the PR description missing or inaccurate,
  - **Then** the batch is rejected and the PR-description work is re-dispatched
    alongside any other flagged work, the loop repeats until one clean pass, and
    only then is the single `docs-review-approved.md` approval written — with no
    separate approval or terminator file for the PR description.

- **AC8 — The artifact forks and resumes with phase 5 (R9).**
  - **Given** a pipeline whose phase 5 is complete and contains `pr-description.md`,
  - **When** that pipeline is forked at phase 5, or resumed,
  - **Then** the new or resumed pipeline carries `pr-description.md` verbatim, with
    no special handling beyond its presence in `5-docs/`.

- **AC9 — The pre-existing reference is reconciled (R10).**
  - **Given** the setup convention that names `pr-description.md` as the PR body,
  - **When** a reviewer reads it after this work,
  - **Then** it resolves to the artifact's canonical location and no longer
    describes a path-less, producer-less file.

- **AC10 — Phase-5 output descriptions enumerate the artifact (R11).**
  - **Given** the pipeline's descriptions of what phase 5 produces (the phase-5
    Outputs list, the per-phase "Produces" table, and the phase-5 completion
    condition),
  - **When** a reviewer reads them after this work,
  - **Then** each lists `pr-description.md` as a phase-5 output, and none of these
    updates introduces merge or PR-opening behavior.

- **AC11 — The merge procedure and sibling guides are not authored here.**
  - **Given** the repository after this work,
  - **When** a reviewer inspects it,
  - **Then** `merge-pipeline.md`, `review-pipeline.md`, and `close-pipeline.md` are
    not authored, no new `artifacts-in-repo` PR-opening flow is added, no
    `gh pr create` invocation or PR-title composition is introduced, and the
    `artifacts-in-fork` upstream transformation steps are unchanged.
