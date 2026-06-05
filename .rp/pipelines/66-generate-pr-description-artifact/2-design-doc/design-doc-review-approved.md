# Design Doc Review

## Verdict: approved

## Summary

The design fully and faithfully realizes the spec. It produces
`<artifacts-folder>/5-docs/pr-description.md` during phase 5 by appending a
mandatory, standardized always-last task to every doc plan, executed by an
ordinary `doc-writer`, reviewed by the existing `doc-reviewer` under the single
`docs-review-approved.md` gate via the existing task-ID reject/redispatch loop —
adding no parallel machinery and no second terminator. Every requirement (R1-R11)
and acceptance criterion (AC1-AC11) is covered with an explicit edit-site or a
by-construction argument, and the requirement→edit coverage matrix is complete and
correct. Key decisions each carry genuine alternatives and trade-offs that
faithfully reflect the research; no considered alternative or open risk from
`design-doc-research.md` was silently dropped (all five Risks and three Open
Questions carry through). Scope discipline is strong: the design stays at
architecture level (file + semantic anchor + intent), respects the #57/AC11
boundary throughout, and applies a noun-not-verb guardrail to the enumeration
edits so none imports PR-opening behavior. I verified every cited file, every
semantic anchor, and the empirical PR prior-art the design's sharpest tension
depends on. The R5-vs-R3 provenance-line collision — flagged by the orchestrator —
is real, empirically grounded, and correctly resolved (R3-over-R5: keep the
provenance mention, strip the fork-relative path), authored in both the producer
and the reviewer. Reviewed adversarially; only harmless wording imprecisions
remain, none rejection-worthy.

## Verification performed

All seven cited unique files exist and every semantic anchor was confirmed live
against the working tree (HEAD `f084361`):

- **M1 `agents/doc-plan-writer.md`** — "Cover every relevant surface" guideline at
  `:63`; task template at `:37-50`. Confirmed; the design's reasoning that `:63` is
  about host-repo drift-sweeping (so the new summarizing task must be mandatory, not
  discovered) is accurate.
- **M2 `agents/doc-plan-reviewer.md`** — Feasibility "Flag references that won't be
  findable in phase 5" at `:29`. Confirmed exactly. The non-host `Files` target
  carve-out is well-placed.
- **M3 `agents/doc-writer.md`** — doc-convention read at `:17`; "Cross-links
  resolve" at `:36`; doc-surface enumeration / "Do NOT touch source code" at `:60`.
  All confirmed. The host-doc-convention precedent for implicit produce-time
  discovery is real (`:17`).
- **M4 `agents/doc-reviewer.md`** — context reads `:14-21`; accuracy spot-check
  `:36-37`; rejection structure / dedup task IDs `:71-81,87`. All confirmed. (The
  design's M4 anchors are the live-accurate set; the research doc's older
  `:19,:29,:32` numbers had drifted — the design correctly re-keyed on text.)
- **M5 / E1 / E2 `5 - docs.md`** — sequential dispatch / re-dispatch loop at Steps
  3-5; Outputs list at `:12-16`; step-6 self-check "...and `docs-review-approved.md`
  are committed on the pipeline branch" at `:38`. All three confirmed and genuinely
  distinct edits in one file, as the design flags.
- **M6 `autonomous-workflow.md`** — "include the following project conventions in
  its initial prompt" at `:59` with the bullet list (Artifact folder, Commit format)
  at `:60-61`. Confirmed; adding the Issues convention bullet here is feasible.
- **E3 `SKILL.md`** — per-phase Produces table row 5 "Documentation (both internal
  and external)" at `:40`. Confirmed.
- **E4 `pipeline-versioning.md`** — predicate row "5 – Docs":
  "`5-docs/docs-review-approved.md`" at `:32`; phase-3 "X and Y" format at `:30`;
  en-dash present; "same predicate regardless of workflow mode" prose at `:23`. All
  confirmed; the mirror-format edit is feasible.
- **C1 `setup.md`** — step 5 BEFORE text "Opens the PR in `upstream` from that clean
  branch, using `pr-description.md` as the body." at `:122` matches the design's
  quoted BEFORE verbatim; line `:123` ("viewers of the PR never see the fork")
  present and unchanged. The cherry-pick-excludes-artifacts step (`:119`) confirms
  the "in the fork" / fork-side-pointer reasoning.

Structural by-construction claims (R9/AC8) verified against the real machinery:
`fork-pipeline.md:42` uses whole-folder `cp -r <phase>` copy and `:14` inherits only
**complete** phases; `resume-pipeline.md` rolls back only the active phase (a
complete phase 5 has none); lineage keys on the `5-docs/` tree SHA. The strengthened
predicate and fork rule reinforce each other exactly as the design states.

Empirical prior-art (the design's sharpest tension) verified by inspecting recent
merged PRs (#85, #84, #82, #79):

- **No PR template** — `.github/` holds only `workflows/`; no
  `*PULL_REQUEST_TEMPLATE*`. R5 correctly falls through to the observed-conventions
  branch for this host.
- **`Closes #N` uniform** across #85/#84/#82/#79 — grounds R4's "permit, don't
  mandate."
- **Fork-relative `.rp/pipelines/...` provenance line** present in #85 and #84
  (#82 uses the older `.pipelines/...`; #79 omits it entirely). The R5-vs-R3
  collision is genuine: a faithful copy of observed convention WILL reintroduce a
  fork-relative path. The R3-over-R5 precedence rule, authored in BOTH producer
  (M3.ii) and reviewer (M4.iii), is a sound and necessary mitigation.
- **"Generated with Claude Code"** trailer is an absolute
  `https://claude.com/claude-code` URL in all four — R3-clean, as the design states.

Precedents the "two-file predicate is mechanically inert" argument leans on are real:
phase 3's "X and Y" predicate (`pipeline-versioning.md:30`) and phase 0's
non-terminator required artifact `0-prompt/prompt.md` (`:27`). Assisted-mode safety is
grounded: the assisted phase table (`assisted-workflow.md:15-20`) stops at "3 - Plan"
and never creates `5-docs/`. The "do not add `pr-description.md` to the reviewer
terminator list" non-edit is correct: `doc-reviewer.md:43-44` names the files the
reviewer writes, and the doc-writer writes the artifact.

## Coverage assessment (every R/AC served)

- R1→M1+E4; R2→M3.i/ii; R3→M3.ii/M4.iii (+C1 non-conflict note); R4→M3.iii/M4.ii/M6;
  R5→M3.i/M4; R6→M1/M3/M4.i/M5; R7→E4/E2; R8→M4 + existing task-ID loop (no new
  terminator); R9→by construction; R10→C1; R11→E1/E2/E3/E4. Each trace was checked
  against the live edit site and holds.
- AC1-AC11 each map onto a covered requirement; AC11 (no #57 work) is actively
  defended by the noun-not-verb enumeration guardrail, the untouched Merge gate, and
  the explicit choice not to add a repo-mode consumer reference.

## Non-blocking observations (recorded, not grounds for rejection)

1. **"Source issue: ...#N" is not a uniform literal across pipelines.** This
   pipeline's `0-prompt/prompt.md` uses `Source issue: Automattic/radical-pipelines#66`,
   but another pipeline (`70-restructure...`) uses
   `> Source: GitHub issue [Automattic/radical-pipelines#66](...)`. The design's
   actual contract is "read the originating issue identifier from `0-prompt/prompt.md`,"
   and the `owner/repo#N` identifier is present in both forms; the producer reads its
   OWN pipeline's prompt at produce-time, so the parenthetical "Source issue: ...#N"
   is illustrative of this pipeline rather than a brittle parse anchor. Harmless; the
   contract is robust to the variation. No change required, but the plan/producer
   should treat the quoted form as an example, not a fixed pattern.

These do not affect feasibility, coverage, traceability, or scope, individually or
together.

## Why this passes the adversarial bar

The design names its single most fragile point (the provenance-path collision),
proves it from the host's own merged PRs, and pins the precedence in both the
surface that writes the artifact and the surface that checks it — exactly where a
naive copy of observed convention would otherwise break R3. The completion-predicate
strengthening is shown mechanically inert against the active/completed/lineage
machinery using real precedents, and the fork/resume guarantee falls out of the
real whole-folder-copy and active-phase-only-rollback mechanics. Every edit lands in
the file that semantically owns the behavior, with the easily-missed step-6
self-check (E2) flagged loudly. The architecture is complete and implementable
without further discovery.
