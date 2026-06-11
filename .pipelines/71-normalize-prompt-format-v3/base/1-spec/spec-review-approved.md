# Spec review 3 — approved

Re-review of the revised `spec.md` (commit `8384424`) against `spec-review-2-rejected.md`, `spec-review-1-rejected.md`, `base/0-intent/intent.md`, `spec-research.md` (R1–R11, D1–D4), and the skill sources (`create-pipeline.md`, `review-pipeline.md`, `conventions/setup.md`, `intent-format.md`, `work-on-an-issue.md`, `manage-issues.md`). All cited skill passages were spot-checked and hold.

## B4 — resolved (verified in all four fix locations)

1. **Requirement 11 gloss corrected.** It now reads "— i.e., the issue is not already in the canonical format (synthesis would not be a no-op), or it carries any comment, any in-tracker cross-reference, any external link, or any embedded binary attachment —". This is the exact De Morgan complement of requirement 13's passthrough condition (canonical AND no comments AND no cross-refs, external links, or attachments). The false-subset equivalence is gone.
2. **First Confirmation-gate AC completed.** Its parenthetical now includes the non-canonical-shape disqualifier ("it is not already in the canonical format, or it carries any comment, in-tracker cross-reference, external link, or binary attachment") alongside the verbatim edge case.
3. **Free-form AC added.** A new acceptance criterion covers the motivating scenario: a free-form (non-canonical) issue with no comments and no references must be synthesized into the canonical format and explicitly approved by the owner before `intent.md` is written. The testability hole — an implementation confirming only on comments/references while silently writing a restructured free-form intent — is closed.
4. **Second Passthrough AC completed.** Its disqualifier enumeration now includes "one embedded binary attachment", matching requirement 13's authoritative list.

## N4 — resolved

Requirement 13's attachment rationale no longer leans on "body-content change" (which the passthrough provenance header contradicted). It now classifies the attachment as a per-issue, content-bearing external reference whose substance must be pulled in and whose pointer is rewritten — "the same content-bearing transformation any other reference triggers". Consistent with requirement 14's header carve-out.

## No regressions of B1–B3, N1–N3

- **B1** — requirement 4 still splits tracker-side reads (Issues convention) from external URLs (orchestrator web-access binding, "per requirement 7"); Overview matches.
- **B2** — requirement 11 retains the "exact complements" framing and the `"thanks!"` verbatim edge case.
- **B3** — Overview cites requirement 14 for the provenance header.
- **N1** — header documentation committed to `intent-format.md`, scoped to intents created from an issue by the create-pipeline flow; issue bodies and review intents (Origin) excluded.
- **N2** — attachments disqualify passthrough with rationale and a dedicated Synthesis AC.
- **N3** — the full-picture read's anchoring (work-on-an-issue step 1 and/or create-pipeline step 4) is stated as a design-phase choice; requirement 4 is location-neutral.

## Fresh pass

Cross-checked: D1–D4 settlements against requirements 13/14/12/Out-of-Scope (all match); every disqualifier enumeration (req 11, req 13 bullet, first Confirmation AC, second Passthrough AC) against the single authoritative list (all identical); the owner-presence claim against `work-on-an-issue.md` step ordering (creation precedes mode selection); the cited passages of `create-pipeline.md` step 4, `review-pipeline.md` step 5, and `setup.md`'s Issues convention. Requirements 1–14 each have AC coverage; the Out of Scope list matches the research. No contradictions, scope creep, or untestable criteria found.

## Non-blocking notes

- **N5.** Requirement 14 mandates that documenting the provenance header in the shared `intent-format.md` must state its scoping (no `> Source:` line on issue bodies authored via `manage-issues.md` or on review intents), but no acceptance criterion exercises that scoping directly — the Provenance ACs assert the header's presence on the create paths and that the review path is unchanged, not the negative case for issue bodies. Minor: the requirement is explicit and a test is derivable from it; recording so the design/test phases don't overlook the negative case.

## Verdict

APPROVED.
