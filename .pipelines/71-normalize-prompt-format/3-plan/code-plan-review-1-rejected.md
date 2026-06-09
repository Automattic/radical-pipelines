# Code Plan Review 1 — REJECTED

Source issue: [Automattic/radical-pipelines#71](https://github.com/Automattic/radical-pipelines/issues/71) — "Normalize issue content into the standard prompt format when creating a pipeline".

Reviewed: `3-plan/code-plan.md` against `2-design-doc/design-doc.md` (approved change surface) and `1-spec/spec.md` (R1–R12, AC1–AC15).

Verdict: **REJECTED** — one coherence defect must be fixed before the plan is a faithful, followable derivation of the approved design. Everything else (scope coverage, task ordering/sizing, checkable acceptance, file/anchor accuracy) is sound and verified against the repo.

---

## Blocking finding

### F1 — Task T4 cites design decision IDs that do not exist in the design doc (dangling references)

The design doc defines decisions **D1–D6** plus exactly one supporting-grant decision, **D-T1** (verified: the only `D-T#` tokens in `design-doc.md` are two `D-T1` mentions at `design-doc.md:132` and `:178`). There is no D-T2, D-T5, D-T6, or D-T7 anywhere in the design.

But the plan's T4 "Changes" list cites four nonexistent IDs:

- `code-plan.md:126` — item 2 "Gather inputs (D3, **D-T6**)."
- `code-plan.md:128` — item 3 "Download assets (D6, **D-T5**)."
- `code-plan.md:136` — item 6 "Confirmation gate + revise loop, in-place (D5, **D-T2, D-T7**)."

A code-writer following T4 will try to resolve D-T6/D-T5/D-T2/D-T7 in the design and find nothing — at best confusing, at worst a signal that scope was invented. The *substantive* content of each item is correctly traceable to the real decisions it also names (D3, D6, D5 respectively), so this is a citation-hygiene defect, not scope drift — but the plan's whole job is precise derivation, so the dangling IDs must be corrected.

**Fix (pick one, consistently):**
- Drop the bogus IDs and keep only the real decision references: item 2 → `(D3)`; item 3 → `(D6)`; item 6 → `(D5)`. (D-T1, the one real supporting-grant decision, is already correctly cited by T2/T3 — leave those as-is.)
- Or, if the intent was to reference the supporting grant, cite `D-T1` only where it actually applies (the comment-reading capability behind item 2's "read every comment"), and remove D-T5/D-T2/D-T7 entirely.

Either way, after the edit, every `D-`/`D#` token in `code-plan.md`'s T4 must resolve to a decision that exists in `design-doc.md`.

---

## What was checked and passed (for the record)

These were verified adversarially and are correct; no changes needed.

**Faithful realization of the approved change surface.** The plan covers all five file rows of the design's file-by-file table with no dropped, added, or weakened scope:
- `manage-issues.md` → T1 (link-target stability only; no taxonomy relocation/duplication).
- `setup.md` → T2 (comment-reading grant, generic, additive; external-URL fetch correctly excluded).
- `.rp.md` → T3 (dogfood "Reading an issue" note; `gh` allowed).
- `create-pipeline.md` → T4 (the step-4 rewrite covering all 7 sub-items of the design's "Full target shape of step 4" + the step-4/step-5 reconciliation).
- `.changeset/<slug>.md` → T5 (`minor` changeset; release hygiene).

**Spec coverage R1–R12 / AC1–AC15.** The coverage table (`code-plan.md:208-225`) maps every requirement and AC to an owning task. Out-of-scope items are explicitly excluded and several are actively guarded by T4 acceptance (no `Decisions` section, no approval artifact, no taxonomy duplication, no added requirements). Coverage is complete.

**Task ordering and sizing.** T1 → (T2, T3) → T4 → T5 is correct: T4 depends on T1's stable link target; T2/T3 are independent grants; T5 describes T4's shipped behavior. Each task carries Goal / Files / Changes / Depends on / Traces to / Acceptance, and each is sized for a single code-writer (T4 is the largest but is a single cohesive file rewrite).

**Acceptance is concrete and non-vacuous (verified against the real repo).** The grep targets the plan asserts actually exist and pin the intended behavior:
- `grep -n '^## The issue format$' manage-issues.md` → exactly one match (verified: `manage-issues.md:12`), a real, unique link target for T4's cross-link.
- `#### Reading an issue` in `.rp.md` matches the sibling heading level (verified: `#### Creating an issue` at `.rp.md:14`, `#### Modifying an issue` at `:22`).
- `grep -n '^## *Decisions' create-pipeline.md` returns nothing today (verified), so the "no `Decisions` section added" guard is meaningful, not vacuous.
- T2's comment-reading check is correctly framed as a *reading*-target distinction, not the pre-existing "comment on" verb (`code-plan.md:86`), so it cannot be satisfied vacuously by the existing wording at `setup.md:64`.

**Internal coherence of the core rewrite.** The step-4 rewrite (cross-link to `manage-issues.md` "The issue format"; D2 rendering wrapper with specimen; D3 access-split synthesis inputs; D4 normalize/surface-conflicts; D6 asset broadening; D5 confirmation gate before the *write* with revise loop) and the step-5 reconciliation (fold the commit into the approval branch; no separate silent commit) are consistent with each other and with the design. The plan correctly disambiguates the rendering specimen's `## ` headings (legitimate wrapper illustration) from a competing taxonomy *definition* (forbidden) at `code-plan.md:150,153-154`.

**Design anchors confirmed accurate.** `create-pipeline.md:25` ("Adapt the issue content"), `:26` (no-converge seed), `:27` (asset download scoped to "the issue"), `:28` (self-contained note), `:30-32` (standalone commit); `manage-issues.md:12-22` (taxonomy), `:60-62` (render→confirm→write idiom); `setup.md:64` capability sentence; `work-on-an-issue.md:39` (create pipeline) precedes `:41` (pick mode); `autonomous-workflow.md:25` (Decisions read per phase) and `:29` (revise-loop idiom) — all verified present at the cited locations. AGENTS.md R-min/R-dup-path/R-neg/R-generic/R-dup-cross abbreviations match `AGENTS.md:7-11`.

---

## Re-review criterion

Fix F1 (resolve or remove the dangling D-T2/D-T5/D-T6/D-T7 citations in T4 so every decision ID in the plan resolves to a decision defined in the design doc). No other changes are required for approval.
