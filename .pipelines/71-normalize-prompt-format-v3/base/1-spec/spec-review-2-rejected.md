# Spec review 2 — rejected

Re-review of the revised `spec.md` (commit `5f3fe7e`) against `spec-review-1-rejected.md`, `base/0-intent/intent.md`, `spec-research.md` (R1–R11, D1–D4), and the skill sources (`create-pipeline.md`, `intent-format.md`, `work-on-an-issue.md`, `review-pipeline.md`, `manage-issues.md`, `conventions/setup.md`). All file/line claims in the revised spec were re-verified against the skill sources and hold.

## Prior findings — all resolved

- **B1 (external URLs vs Issues convention)** — fixed. Requirement 4 now splits tracker-side reads (body, comments, in-tracker cross-references, through the **Issues** convention) from external URLs (orchestrator web-access binding, explicitly not part of the convention, "per requirement 7"). The Overview matches.
- **B2 (gate trigger vs passthrough complement)** — fixed as instructed: requirement 11 now defines the gate as "whenever passthrough (requirement 13) does not apply", states "the gate and passthrough are exact complements", and covers the `"thanks!"` verbatim edge case explicitly. (But the fix introduced a new defect — see B4 below.)
- **B3 (wrong requirement number)** — fixed: the Overview now says "see requirement 14".
- **N1 (provenance-header location and leakage)** — fixed. Both the Overview and requirement 14 commit to `intent-format.md`; requirement 14 scopes the header to intents created from an issue by the create-pipeline flow, excludes `manage-issues.md` issue bodies, and states review intents keep **Origin**.
- **N2 (binary attachments vs passthrough)** — fixed. Requirement 13 explicitly disqualifies embedded attachments with rationale; the third Synthesis AC asserts the path-rewrite routes through the full confirm path.
- **N3 (`work-on-an-issue.md` step 1 touch-point)** — fixed. The Overview now states the full-picture read may be anchored at step 1 and/or `create-pipeline.md` step 4, a design-phase choice, with requirement 4 location-neutral.

## Blocking finding

### B4. The new gate gloss and the confirmation AC omit the non-canonical-shape disqualifier — the free-form, reference-free issue has no confirmation coverage

Introduced by the B2 fix. Requirement 11 now reads: "Whenever passthrough (requirement 13) does **not** apply — **i.e., the issue carries any comment, any in-tracker cross-reference, or any external link** — …". That "i.e." asserts an equivalence that is false: per requirement 13, passthrough also fails when (a) the issue is **not in the canonical format** (or synthesis would otherwise not be a no-op), and (b) the issue carries a **binary attachment** (which requirement 13 itself lists as disqualifying). The gloss is a strict subset of "passthrough does not apply".

The same narrowing is repeated in the first Confirmation-gate acceptance criterion: "Given an issue for which passthrough does not apply **(it carries any comment, in-tracker cross-reference, external link, or binary attachment)** …" — attachments are included there, but the non-canonical-shape case is still missing. And no other AC covers it: the consequence is that a **free-form issue with no comments and no references** — the purest case of synthesis transforming the source, and the intent's motivating scenario of a non-canonical issue — is asserted nowhere to require confirmation. The Synthesis ACs cover its *format* ("canonical or free-form") but not its *gate*. An implementation that confirmed only on comments/references/links/attachments and silently wrote a restructured free-form intent would pass every acceptance criterion while violating the intent's first constraint ("When the synthesis transforms the source in any way, the owner confirms the result before `intent.md` is written").

The normative clauses are correct (req 11's primary clause and the "exact complements" sentence both give the right behavior); the defect is the false "i.e." equivalence and the AC coverage gap. Since the spec's preamble says the ACs drive the tests, the gap is a testability hole in the spec's central mechanism, not a wording nit.

**Fix (localized, no structural rework):**

1. In requirement 11, correct or drop the gloss — e.g. "— i.e., the issue is not already canonical, or it carries any comment, in-tracker cross-reference, external link, or binary attachment —", or simply defer to requirement 13 without enumerating.
2. In the first Confirmation-gate AC, make the parenthetical complete on the same terms (or drop it and let "passthrough does not apply" defer to requirement 13).
3. Add one acceptance criterion for the free-form case, e.g.: "Given a free-form (non-canonical) issue with no comments and no references, when a pipeline is created from it, then the issue is synthesized into the canonical format and the rendered draft is confirmed by the owner before `intent.md` is written."
4. While touching these lists: the second Passthrough AC's disqualifier enumeration ("at least one comment, one in-tracker cross-reference … or one external link") omits binary attachments; either complete it or defer to requirement 13 so there is a single authoritative disqualifier list.

## Non-blocking note (fix in the same pass if convenient)

### N4. Requirement 13's "body-content change" rationale for attachments proves too much

Requirement 13 argues an attachment disqualifies passthrough because the path rewrite "is a body-content change" — but the provenance header (requirement 14) is also a body-content change, and it is added in passthrough without confirmation ("unchanged apart from the standard provenance header"). The choice itself is fine and explicitly specified in both places; only the supporting argument is inconsistent. The bullet's primary classification — "an embedded attachment counts as an external reference" — is sufficient on its own; consider leaning on that (a per-issue, content-bearing transformation) rather than on "body-content change", which the header carve-out contradicts.

## Verdict

REJECTED — fix B4 (and ideally N4) and resubmit. The fix is small and localized: one gloss, two AC parentheticals, one added AC. Everything else, including all six prior findings, is in good shape; no other issues were found in the fresh pass.
