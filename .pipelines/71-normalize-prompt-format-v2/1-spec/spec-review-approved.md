# Spec Review

## Verdict: approved

## Reviewer

spec-reviewer (adversarial spec review for phase 1 of pipeline `71-normalize-prompt-format-v2`).

## Scope of review

Reviewed `1-spec/spec.md` against:

- `1-spec/spec-research.md` (Q&A, Research, the 10 Out-of-Scope items, and the 15 Consolidated Requirements).
- `0-intent/intent.md` (the originating intent for issue #71).
- The skill codebase, to confirm feasibility and factual accuracy: `skills/radical-pipelines/reference/create-pipeline.md`, `manage-issues.md`, `fork-pipeline.md`, `resume-pipeline.md`, `pipeline-versioning.md`, `work-on-an-issue.md`, `autonomous-workflow.md`, `assisted-workflow.md`, `assisted-phases/1 - spec.md`, `autonomous-phases/1 - spec.md`, and `.rp.md`.
- The live GitHub issue #71 (body + comments) as a coherence sanity check.

Meta-note honored: the feature under spec is a change to the radical-pipelines skill itself; the skill files are the codebase, and the feature's own "phase 0 / intent / owner confirmation / autonomous-vs-assisted" concepts are subject matter, not my runtime.

## Findings

### Completeness — all 15 consolidated requirements covered

Each Consolidated Requirement maps cleanly onto the spec:

| Consolidated req | Spec requirement | Notes |
| --- | --- | --- |
| CR1 canonical format always | R1 | Required `## Goal`, optional `## Constraints` / `## Context` / `## Assumptions / directions to explore` in order, empty omitted, no `N/A`, title→H1, source attribution, Goal-alone valid. Matches `manage-issues.md:14–22`. |
| CR2 full picture (body, all comments, references) | R2 | Includes reading the referenced content, not the bare link. |
| CR3 section-mapping taxonomy | R3 | Matches `manage-issues.md:52–54`; includes the "comments not more authoritative for appearing later" rule. |
| CR4 no added reqs/design, no goal substitution | R4 | Goal stays outcome; hypotheses stay open. Matches `create-pipeline.md:26` and `manage-issues.md:58`. |
| CR5 one gate; "transforms in any way" not separate | R5 | Explicitly states all-three-holding *is the definition* of no-transformation. Faithful to the hard-won Q5 resolution. |
| CR6 skip clause A (canonical body, structural) | R6 | Title excluded; Goal-only passes; explicitly not a semantic check. |
| CR7 skip clause B (no comments) | R7 | Strict zero-count, any author/reason, GitHub source-of-truth, Linear excluded. |
| CR8 skip clause C (no references in body) | R8 | URLs + GitHub cross-refs (short/long/URL); @-mentions, embedded assets, repo-file links excluded; body-only. |
| CR9 all hold → map verbatim, skip, commit | R9 | Incidental formatting differences enumerated and explicitly excluded from "transformation." |
| CR10 any fails → synthesize + confirm; no escape hatch | R10 | "No escape hatch for a synthesized result that resembles the original." |
| CR11 show full proposed intent.md | R11 | Full artifact is primary review surface; "what changed" summary optional. |
| CR12 iterate-until-approved | R12 | Not single yes/no; commit only on explicit approval. Matches `assisted-phases/1 - spec.md:118`. |
| CR13 no persisted artifact; predicate unchanged | R13 | Completion predicate stays `0-intent/intent.md` committed (`pipeline-versioning.md:27`). |
| CR14 placement; screenshots preserved both paths | R14 | Phase-0 step before the existing commit; screenshot/asset download preserved on both paths. Matches `create-pipeline.md:27`. |
| CR15 only the create-from-issue path; others unchanged; autonomous coexistence | R15 | Fork (copy), resume (no phase-0 re-run), issue-authoring, phases 1–5 unchanged; owner always present so no "no questions" handling needed. Matches `fork-pipeline.md:38–42`, `resume-pipeline.md`, `work-on-an-issue.md:39`, `autonomous-workflow.md:11,39`. |

All 10 Out-of-Scope items are present (research OOS1 and OOS9 are consolidated into spec OOS1, with the "writing the synthesized intent back to the issue body" exclusion preserved in its final sentence; research OOS10 appears as spec OOS9). No requirement or exclusion was dropped.

### Feasibility — verified against the codebase

- `create-pipeline.md` step 4 ("Generate the initial intent") and step 5 ("Commit") exist exactly as the spec places the new behavior; the spec inserts the skip-evaluate / synthesize-and-confirm logic between them without restructuring the flow.
- The canonical format the spec references is the real, already-documented format (`manage-issues.md:14–22`), and the section-mapping taxonomy is verbatim from `manage-issues.md:52–54`.
- The "owner always present" claim is sound: the only caller of `create-pipeline.md` is `work-on-an-issue.md:39` (the "no matches" branch), reached before the mode is chosen (`work-on-an-issue.md` step 3) and before the autonomous run begins (`autonomous-workflow.md` step 5); both workflows list phase 0 as "Already in place."
- The "no new artifact / predicate unchanged" decision is consistent with the phase-0 predicate (`pipeline-versioning.md:27`) and the shared-root invariant (`pipeline-versioning.md:66`) that fork relies on via `cp -r` (`fork-pipeline.md:42`).
- The iterate-until-approved gate mirrors an idiom already in the skill (`assisted-phases/1 - spec.md:118`; `assisted-workflow.md:3`).
- Coherence check on issue #71 itself: 0 comments, body has only `## Goal` + `## Assumptions / directions to explore` (recognized sections, in order, nothing outside), and no URLs/cross-refs — so it satisfies all three skip conditions, while its `intent.md` legitimately differs (4 sections) because the *author* performed the synthesis by hand. This is exactly the distinction the spec draws and confirms the rules are internally coherent.

### Clarity, consistency, scope, and acceptance criteria

- **One-gate framing is unambiguous.** R5 + R9 + R10 close the door on the "ended up identical" escape hatch and define no-transformation as the conjunction of the three clauses — the single most error-prone area, handled precisely.
- **Skip-clause definitions are testable.** R6 (structural), R7 (mechanical zero-count, GitHub-only), R8 (body-only text scan with an explicit rule-in / rule-out list) are each checkable without judgment, and the spec states each clause's boundary (title excluded, Linear excluded, body-only).
- **Stays WHAT-not-HOW.** No architecture, no `gh`/regex implementation details, no algorithm. R8 describes *what* counts as a reference (URL, cross-reference forms) as the externally observable contract, not how to detect it — this is requirement-level, not design bleed. Out of Scope is explicit and exhaustive.
- **Acceptance criteria are Given-When-Then, testable, and cover the edge cases:** the pure skip path; each skip clause failing in isolation (comment-only, reference-only, non-canonical-only); the Goal-only canonical body; the @-mention / embedded-asset / repo-file-link non-references case (with screenshot download asserted); the iterate-until-approved loop; the "resembles original" no-escape-hatch case; the "only intent.md committed, source unmodified" invariant; the content-faithfulness assertion; and the fork/resume bypass. The permutation matrix of the three skip clauses is well covered for the decision boundary.

### Minor observations (non-blocking — recorded, not defects)

These do not impair an implementer or designer and do not change behavior; noting them only for downstream awareness.

1. **"Assumptions" shorthand vs. the literal heading.** The Overview, R3, and several acceptance criteria refer to the section as "Assumptions" (e.g. "Goal / Constraints / Context / Assumptions format"), while R1 and R6 give the literal heading `## Assumptions / directions to explore`. The one place that *defines* the canonical section name (R1) is exact and matches `manage-issues.md:20`; the rest is clearly informal prose using the same shorthand the intent and research use throughout. No ambiguity for an implementer.
2. **R8's "by construction comments are empty when it runs" rationale is intentionally omitted from the spec.** The research (Q4c) notes the references-clause is only reachable on the empty-comments branch. The spec correctly states R8 as an independent, body-only condition rather than baking in evaluation order — appropriate for a WHAT-level spec, since the three clauses are a conjunction and order is an implementation concern. Not a gap.

Neither observation rises to a real defect; both are accurate as written.

## Conclusion

The spec is complete against all 15 consolidated requirements and all 10 out-of-scope items, faithful to the intent and to the research's resolutions (notably the single-gate decision and the no-escape-hatch rule), feasible against the actual skill files, internally consistent, and equipped with testable Given-When-Then acceptance criteria that exercise the decision boundaries and edge cases. It stays at the WHAT altitude and makes scope explicit. No blocking issues found.

Approved.
