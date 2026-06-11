# Spec review 1 — rejected

Adversarial review of `spec.md` against `base/0-intent/intent.md`, `spec-research.md` (R1–R11, D1–D4), and the skill sources (`create-pipeline.md`, `intent-format.md`, `work-on-an-issue.md`, `review-pipeline.md`, `manage-issues.md`, `conventions/setup.md`).

Overall the spec is close: all four open decisions are settled with inline justification, the out-of-scope list matches the research (forks, review intents, write-back, recursion, precedence, sidecar snapshots), the owner-presence claim is verified against `work-on-an-issue.md` (creation in step 2 precedes mode selection in step 3), and every requirement has at least one acceptance criterion. Two internal inconsistencies and one objective cross-reference error block approval; three smaller items should be fixed in the same pass.

## Blocking findings

### B1. Requirement 4 contradicts requirement 7 on how external URLs are read

Requirement 4 states the orchestrator "reads the full picture of the issue **through the Issues convention**" and then lists, under that umbrella, "external URLs". But the Issues convention is the *tracker* abstraction (`conventions/setup.md`, "Issues (required)": a way to read, comment on, and update issues), and requirement 7 — correctly, per the research (A5.4) — extends the convention's required capabilities only with reading **comments** and following **cross-references**, not with fetching arbitrary web pages. As written, the spec simultaneously claims external URLs are read through the Issues convention (req 4) and that the convention need not cover them (req 7). A design phase following req 4 literally would wrongly push web-fetching into the Issues convention's required capabilities in `setup.md`.

**Fix:** scope the "through the Issues convention" phrasing in requirement 4 to the tracker-side reads (body, comments, in-tracker cross-references such as `#NN` and linked PRs/issues). For external URLs, either state that the orchestrator fetches them through its own web-access mechanism (a tool binding, not skill text — per research A5.4) or explicitly leave the fetch mechanism unspecified; do not attribute them to the Issues convention. The first Gathering acceptance criterion is already neutral on this and needs no change.

### B2. The confirmation-gate trigger (req 11) and the passthrough complement (req 13) disagree on the content-no-op edge case

Requirement 11 fires the gate "whenever the synthesis **transforms the source in any way**". Requirement 13 says "**any** comment, any in-tracker cross-reference, or any external link disqualifies passthrough and routes the issue through the full read → synthesize → **confirm** path", and the second passthrough acceptance criterion asserts confirmation for an otherwise-canonical issue with a single comment. Now take a canonical issue with one comment ("thanks!") whose synthesis output is content-identical to the body: req 13 and the AC require confirmation, but req 11's trigger — read literally as a diff condition on the output — does not fire, permitting an unconfirmed write. The Overview's framing ("the one case where no transformation is possible" = passthrough) suggests the intended reading is that evaluating comments/references is itself the transformation, but the spec never says so, and req 11 is the normative statement of the gate.

**Fix:** make the two conditions exact complements. Either define the gate as "confirmation is required whenever passthrough (requirement 13) does not apply", or state explicitly in req 11 that reading and weighing comments/references is itself a judgment-laden transformation, so the gate fires even when the resulting text happens to match the body. (Research A4.2b supports the strict complement: literally per the intent, any comment disqualifies regardless of content.)

### B3. Wrong requirement number in the Overview

Overview, third paragraph: "…and `intent-format.md` (to document the provenance header, see requirement 12)". The provenance header is requirement **14**; requirement 12 is the transient-gate decision (D3). The same paragraph's D-mapping sentence has it right ("D2 — … (requirement 14)"), so this is a typo — but it is an objective cross-reference error in the contract document.

**Fix:** change "see requirement 12" to "see requirement 14".

## Non-blocking notes (fix in the same pass)

### N1. Provenance-header location: Overview commits, requirement 14 hedges — and the shared-format leakage question is unaddressed

The Overview names `intent-format.md` as the place the provenance header is documented; requirement 14 says "`intent-format.md` **and/or** `create-pipeline.md`". Pick one statement of intent (leaving the exact file to the design phase is fine, but the spec should not commit in one section and hedge in another). More substantively: `intent-format.md` is shared by "a tracker issue body, a base intent, or a review intent" (its line 3), and the research flagged documenting the header there as "a real authoring decision" (A4.3) — if the header is documented in the shared format file without scoping, issue bodies authored via `manage-issues.md` and review intents (which carry **Origin** instead) could erroneously pick up a `> Source:` line. Requirement 14 should scope where the header applies: intents created **from an issue** by the create-pipeline flow (both passthrough and synthesis), not issue bodies, and review intents keep Origin as their provenance mechanism.

### N2. Binary attachments vs. passthrough is unstated

`create-pipeline.md` step 4 downloads screenshots/assets into `base/0-intent/` and rewrites references to **relative paths** — a body-content change. The spec keeps that behavior (req 9, third Synthesis AC) but never says how it composes with passthrough's "body content unchanged" (req 13/14). An embedded screenshot is presumably an external reference that disqualifies passthrough (consistent with req 13's "any external link"), but the spec should say so explicitly — otherwise "canonical issue + screenshot, no comments, no other links" is ambiguous between passthrough-with-rewritten-paths (contradicting "unchanged") and the full confirm path.

### N3. `work-on-an-issue.md` step 1 is named as a touch-point but no requirement constrains it

The Overview lists "what 'capture its content' means" in `work-on-an-issue.md` step 1 as a supporting touch-point (per research R1), but no requirement or acceptance criterion mentions that file again; requirement 4 states the read-the-full-picture behavior without anchoring where it happens. Either add a sentence to the scope requirements acknowledging that the full-picture read may be anchored at step 1 and/or step 4 (a design-phase choice), or drop the touch-point from the Overview — as written the Overview promises an edit the requirements never ask for.

## Verdict

REJECTED — fix B1–B3 (and ideally N1–N3) and resubmit. No structural rework is needed; all findings are localized wording/consistency fixes.
