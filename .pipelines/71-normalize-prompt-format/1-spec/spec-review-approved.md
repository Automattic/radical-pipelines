# Spec Review — APPROVED

**Issue:** #71 — Normalize issue content into the standard prompt format when creating a pipeline
**Artifact reviewed:** `.pipelines/71-normalize-prompt-format/1-spec/spec.md`
**Reviewer:** spec-reviewer
**Verdict:** APPROVED
**Review iteration:** 1

## Summary

The spec is faithful to the prompt and to the consolidated requirements (R1–R12), standalone, testable, internally consistent, and free of design/implementation leakage. All twelve consolidated requirements map 1:1 onto the spec's twelve requirements with matching acceptance criteria; none is dropped, weakened, or invented. The two load-bearing contracts — the owner-confirmation contract and the normalize-don't-converge boundary — are correctly captured. No blocking issues found.

## Grounding verification (checked against the repo, not taken on faith)

- **Canonical format.** `manage-issues.md:12-22` defines the format exactly as the spec's requirement 2 states it: Title + Goal (outcome, not solution) + optional Constraints/Context/Assumptions (labeled open), omit-empty with no `N/A` placeholders, and "a vague idea yields just a Title and a Goal" (`:22`). Matches requirement 2 and AC2/AC3.
- **Single source / referenced-not-duplicated.** `manage-issues.md:14` already designates itself "both the issue template and the prompt format" and points one-directionally to `create-pipeline.md`; `create-pipeline.md` defines no competing format (step 4 does not name the format). Supports requirements 1 and 3.
- **Rendering by-example-only.** Confirmed: the prompt-file wrapper (`# Prompt` heading, `> Source:` line, self-contained note) is established only by example and is not written down in any reference. Supports requirement 4 / AC5 as a genuine codification.
- **Comments expansion.** `.rp.md` (Issues convention) does not mention "comment" anywhere; today's flow (`create-pipeline.md:25`, `work-on-an-issue.md:15`) reads body-level content only. Requirement 5 is a faithful expansion of the prompt's "all of its comments."
- **References expansion + one-hop boundary.** Web fetch is documented only in the later research agents (`spec-researcher.md:15`, `design-doc-researcher.md:15`), not the orchestrator or phase 0. The one-hop boundary correctly defers transitive/deep research to phases 1-2. Supports requirement 6 and the out-of-scope item.
- **No-converge doctrine.** `create-pipeline.md:26` and `manage-issues.md:28-31,:40,:58` ground requirement 7; "never silently substitute a different goal" (`:58`) grounds requirements 7-8.
- **Owner-confirmation precedent.** `manage-issues.md:32,:62` (render the draft, do not write until owner approves) and `autonomous-workflow.md:29` (revise and confirm again) ground requirements 9-11. The no-conflict argument holds: `work-on-an-issue.md` step 2 (creation) precedes step 3 (mode pick) and step 4 (dispatch); `autonomous-workflow.md:11` gates "no questions" on the run having started, and phase 0 is an input row ("Already in place"). Supports requirement 9.
- **Assets + self-containment.** `create-pipeline.md:27,:28` ground requirement 12.

## Requirement-to-spec-to-AC traceability

| Consolidated | Spec req | Acceptance | Faithful? |
|---|---|---|---|
| R1 | 1 | AC1 | yes |
| R2 | 2 | AC2, AC3 | yes |
| R11 | 3 | AC4 | yes |
| R12 | 4 | AC5 | yes |
| R6 | 5 | AC6 | yes |
| R7 | 6 | AC7, AC8 | yes |
| R8 | 7 | AC9 | yes |
| R9 | 8 | AC10 | yes |
| R3 | 9 | AC11, AC14 | yes |
| R4 | 10 | AC12 | yes |
| R5 | 11 | AC13 | yes |
| R10 | 12 | AC15 | yes |

Every requirement has at least one acceptance criterion; no AC is orphaned. Out-of-scope section captures all five consolidated non-requirements (no phase-0 approval file; no transitive/deep research; no PR review-thread ingestion; no requirements/design/etc. in `prompt.md`; no goal substitution) plus a "no new prompt format" clarification.

## Adversarial checks (all clear)

- **Standalone & faithful to the prompt.** Overview reproduces the prompt's goal, the single hard constraint, and the "in-format vs free-form third-party" framing. All three prompt assumptions are honored (orchestrator-driven confirmation in the creation flow; references fetched/read; change in the creation flow).
- **No invented requirements.** The only non-R additions are the "no new prompt format" out-of-scope clarification and the Overview glossary — both definitional, neither an added obligation.
- **Altitude (outcomes, not design).** Requirements state observable outcomes; requirement 4/AC5 explicitly flag exact heading text/wording as a design-phase decision; requirement 6 references "the project's tracker access mechanism"/"web fetch" rather than naming specific tools. No implementation leakage.
- **Owner-confirmation contract** (req 9-11, AC11-AC14): consistent — always-required, transient, no pass-through, no autonomous conflict, full render shown, revise loop, no approval file. Consistent with the out-of-scope "no phase-0 approval file."
- **Normalize-don't-converge boundary** (req 7-8, AC9-AC10, out-of-scope): consistent — synthesis is reorganization preserving intent, hypotheses labeled open, no requirements/design/impl, no goal substitution, conflicts surfaced.
- **Internal consistency.** No contradictions between requirements, ACs, and out-of-scope items.

## Non-blocking observations

None that affect approval. (Title presence is covered by AC3 and AC5 even though AC2 focuses on body sections.)
