# Spec Review

## Verdict: approved

This re-approves the amended spec at commit `8f95674` and **supersedes the prior
approval** (`7128dfc`). There is only ever one approved file per pipeline; this
file replaces the earlier one.

## Summary

The post-approval refinement (commit `8f95674`) is sound and introduces no
regressions. The owner-directed change — keep legacy pipelines lacking a `base/`
run folder entirely out of the skill — is applied consistently across all four
intended spots (R5, AC17, the Out-of-Scope bullet, and consolidated requirement 5
in `spec-research.md`), and it is internally coherent with the rest of the spec.
The 29 requirements (R1–R29) still map 1:1 onto the 29 consolidated requirements,
the 17 acceptance criteria remain in proper Given-When-Then form, AC17 correctly
cites R5, the WHAT-not-HOW discipline is preserved, and every load-bearing
codebase claim the spec rests on re-verifies true against the live skill. The
amendment is surgical (26 insertions / 19 deletions confined to the four named
locations); the strong remainder of the previously-approved spec is byte-unchanged.
The spec is re-approved for the design phase.

## Verification of the amendment

Each amended spot was checked against the actual revised text and the `8f95674`
commit diff, not merely trusted as correct.

1. **The four spots are mutually consistent.** R5 (spec.md:85–97), AC17
   (spec.md:453–460), the Out-of-Scope bullet (spec.md:324–329), and consolidated
   requirement 5 (`spec-research.md:216`) now state the same rule in consistent
   terms: an existing flat pipeline (no `base/` run folder) is **never migrated or
   rewritten**, AND the skill contains **no instruction, reference, or mention** of
   how to handle a pipeline that lacks `base/`; if the orchestrator meets one at
   runtime it improvises with its own judgment, and that handling is documented
   nowhere in the skill. All four use the same "no `base/`" / "legacy" / "improvises
   at runtime" vocabulary. The previously `[design]`-deferred
   dual-shape-reading-vs.-grandfathering question is uniformly declared **resolved**
   in all four (neither rule is written into the skill — it stays silent). No
   residue of the old "read a flat pipeline as an implicit single `base` run"
   phrasing survives anywhere in the spec; the milder Issue-5 concern from
   `spec-review-1-rejected.md` is now fully moot.

2. **R2 (eager `base/`) and R5 do not conflict — they reinforce each other.** R2
   guarantees every pipeline the skill creates has `base/` from the moment of
   creation, so the only no-`base/` pipelines that can exist are pre-existing
   legacy ones — exactly the set R5 keeps out of the skill. R5 cites R2 explicitly
   ("the run-folder model, in which `base/` is always present (R2)"), making the
   relationship between the two unambiguous rather than contradictory.

3. **No other requirement or AC still assumes the skill reads/handles flat
   pipelines.** A full scan for `flat | implicit | legacy | migrat | grandfather |
   no-`base/`` returns only R5, AC17, and the Out-of-Scope bullet. R20
   (`<pipeline-folder>/<latest-run>/<phase>`) and R22 (cross-fork lineage reading
   `<pipeline-folder>/base/<phase>`) describe the run-folder model and never
   reference the flat shape, so they are consistent with the amended R5. AC11
   (listing) and AC1/AC2 (layout) speak only in run-folder terms. There is no
   surviving site that requires the skill to tolerate the legacy shape, so R5's
   "silent skill" mandate is not contradicted elsewhere.

4. **Feasibility of "the skill never mentions the no-`base/` case."** The live
   skill's listing/reconstruction logic (`pipeline-versioning.md`,
   `work-on-an-issue.md`) currently operates on flat `<artifacts-folder>/<phase>`
   paths because every on-disk pipeline is flat today (all six in `.pipelines/`,
   including `95-pipeline-reviews` itself). The design phase will rewrite those
   references to the run-folder model; R5 is achievable because the rewritten
   guidance simply assumes `base/` exists and says nothing about its absence —
   runtime handling of the six legacy pipelines is, by design, outside the skill.
   No technical obstacle makes "silent on the legacy shape" infeasible.

5. **AC17 is observable and well-formed.** Its first clause (search the shipped
   skill's references/instructions, find no handling of a no-`base/` pipeline) is a
   directly testable negative. Its second clause (a flat pipeline on disk has its
   artifacts never moved or rewritten when the feature operates) is an observable
   byte-level invariant that holds independently of what the skill says. Both
   clauses cite R5 correctly and the criterion is in proper Given-When-Then form.

## No regressions introduced

- The amendment diff touches only R5, AC17, the Out-of-Scope bullet, and
  consolidated requirement 5. The Overview, R1–R4, R6–R29, AC1–AC16, and the rest
  of Out of Scope are byte-unchanged from the previously-approved spec.
- The requirement and acceptance-criteria counts are intact: 29 requirements
  (R1–R29) ↔ 29 consolidated requirements; 17 acceptance criteria. The amendment
  reframed AC17 in place without renumbering.
- No `[design]`-deferred decision was promoted into a requirement. The amendment
  *removes* a `[design]` tag (the dual-shape-vs-grandfather choice) by deciding the
  feature does neither in the skill — that is a narrowing of scope away from the
  skill, not the elevation of a HOW into a WHAT. R5/AC17 state only the observable
  outcomes (no mention in the skill; artifacts never moved); the runtime
  "improvises with its own judgment" is explicitly left unspecified, which is the
  correct altitude.
- Load-bearing codebase claims re-verify against the live skill: the diff base is
  already a `code-reviewer` launch parameter it reads and diffs base→HEAD
  (`agents/code-reviewer.md:14,19`) and is already passed by the orchestrator
  (`autonomous-phases/4 - code.md:35`) — R16 needs no agent change; phases 4 and 5
  "Can't be run in assisted workflow" (`assisted-workflow.md:21–22`) — R17's
  consequence is real; the prompt-format schema, omit-empty/no-N/A rule, and
  authoring discipline are inline prose in `manage-issues.md:14–22,24–31,40,58`
  — R13's de-duplication target is accurate; the per-phase completion predicate,
  the lineage/listing/reconstruction model, and the eager-`base/` path change all
  line up with `pipeline-versioning.md`.

## Notes (non-blocking, not grounds for rejection)

- The representative-not-exhaustive AC coverage carried over from the prior
  approval is unchanged by this amendment (R3, R6, R17's "assisted-only review
  cannot satisfy R7 until finished autonomously," and R25's decision-rule
  presentation still lack dedicated ACs). This was already examined and accepted in
  the prior round; the requirements themselves remain clearly and feasibly stated.
  Offered as a strengthening opportunity for design, not a defect in the spec's
  WHAT.
- R5/AC17 deliberately leave the orchestrator's runtime handling of a legacy
  pipeline unspecified. That is correct for this spec (it is explicitly out of
  scope and out of the skill), but it does mean the design and code phases must not
  accidentally reintroduce a no-`base/` branch into any skill reference they edit —
  worth a one-line reminder when those phases touch `pipeline-versioning.md` /
  `work-on-an-issue.md`. This is guidance for downstream phases, not a spec defect.
