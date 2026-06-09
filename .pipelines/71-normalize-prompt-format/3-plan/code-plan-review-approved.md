# Code Plan Review — APPROVED

Source issue: [Automattic/radical-pipelines#71](https://github.com/Automattic/radical-pipelines/issues/71) — "Normalize issue content into the standard prompt format when creating a pipeline".

Reviewed: `3-plan/code-plan.md` (revised after iteration-1 rejection) against `2-design-doc/design-doc.md` (approved change surface) and `1-spec/spec.md` (R1–R12, AC1–AC15). This is review iteration 2.

Verdict: **APPROVED** — the sole iteration-1 blocking finding (F1) is fully fixed, and an independent re-review confirms nothing regressed.

---

## F1 (iteration-1 blocking finding) — fixed and verified

Iteration 1 rejected on F1: T4 cited four design-decision IDs that do not exist in the design doc (`D-T6` at `:126`, `D-T5` at `:128`, `D-T2`/`D-T7` at `:136`). The design defines exactly `{D1, D2, D3, D4, D5, D6, D-T1}`.

Verified fixed:
- The distinct set of decision IDs **referenced** in `code-plan.md` is now `{D-T1, D1, D2, D3, D4, D5, D6}` — **exactly equal** to the set **defined** in `design-doc.md`. No dangling IDs remain anywhere in the plan.
- The previously-dangling tokens `D-T2`, `D-T5`, `D-T6`, `D-T7` return **zero** matches in `code-plan.md`.
- The fix matches the recommended remedy: T4 item 2 → `(D3)` (`:126`), item 3 → `(D6)` (`:128`), item 6 → `(D5)` (`:136`). `D-T1`, the one real supporting-grant decision, is cited only in T2/T3 (`:78, :83, :104, :106`), where it correctly applies.
- The substantive mapping is faithful: each item's ID now resolves to a real decision whose content matches the item (D3 = synthesis inputs; D6 = assets/self-containment; D5 = confirmation gate + revise loop). The fix removed only the bogus alias IDs while preserving the correct primary IDs.

---

## Independent re-verification — no regression

Re-checked against the repo (not rubber-stamped); all sound:

**Faithful realization of the approved change surface.** All five file rows of the design's file-by-file table are covered with no dropped, added, or weakened scope: `manage-issues.md`→T1 (link-target stability only), `setup.md`→T2 (comment-reading grant, generic, additive; external-URL fetch correctly excluded), `.rp.md`→T3 (dogfood "Reading an issue" note; `gh` allowed), `create-pipeline.md`→T4 (step-4 rewrite covering all 7 sub-items of the design's "Full target shape of step 4" + step-4/step-5 reconciliation), `.changeset/<slug>.md`→T5.

**Spec coverage R1–R12 / AC1–AC15.** The coverage table (`code-plan.md:208–225`) maps every requirement and AC to an owning task. Out-of-scope items are excluded and several are actively guarded by T4 acceptance.

**Task ordering and single-writer sizing.** T1 → (T2, T3) → T4 → T5 is correct: T4 depends on T1's stable link target; T2/T3 are independent additive grants; T5 describes T4's shipped behavior. Each task carries Goal / Files / Changes / Depends on / Traces to / Acceptance; T4 is the largest but is a single cohesive file rewrite — appropriately one writer.

**Acceptance is concrete and non-vacuous (verified against the real repo).**
- `grep -n '^## The issue format$' manage-issues.md` → exactly one match (`manage-issues.md:12`): a real, unique cross-link target.
- The `file.md ("Section")` cross-link idiom T4 instructs is a verified repo convention (`fork-pipeline.md:9,20,22`; `work-on-an-issue.md:19`).
- `grep -n '^## *Decisions' create-pipeline.md` returns nothing today, so the "no `Decisions` section added" guard is meaningful.
- `#### Reading an issue` for T3 matches the sibling heading level (`#### Creating an issue` at `.rp.md:14`, `#### Modifying an issue` at `:22`).
- T2's comment-reading check is framed as a *reading*-target distinction, not the pre-existing "comment on" verb, so it cannot be satisfied vacuously by `setup.md:64`.

**Named files / targets exist and edits are coherent.** All anchors confirmed present: `create-pipeline.md:21–28` (step 4) and `:30–32` (standalone commit to fold); `manage-issues.md:12` (taxonomy), `:60–62` (render→confirm→write idiom to mirror); `setup.md:64` (capability sentence); `.rp.md:14/22` (sibling subsections); `work-on-an-issue.md` (create-pipeline step precedes pick-mode step, confirming the gate is upstream of mode selection); `autonomous-workflow.md:25` (Decisions-per-phase) and `:29` (revise-loop idiom); existing `.changeset/per-agent-model-config.md` frontmatter shape for T5; AGENTS.md R-min/R-dup-path/R-neg/R-generic/R-dup-cross at `AGENTS.md:7–11`. The step-4 rewrite (cross-link + D2 wrapper specimen + D3 access-split inputs + D4 normalize/surface-conflicts + D6 asset broadening + D5 gate-before-write) and the step-5 reconciliation are internally consistent and consistent with the design; the plan correctly disambiguates the specimen's `## ` headings (legitimate wrapper illustration) from a forbidden competing taxonomy definition (`code-plan.md:150, 153–154`).

---

No remaining blocking findings. The plan is a faithful, followable derivation of the approved design and spec. Approved for the code phase.
