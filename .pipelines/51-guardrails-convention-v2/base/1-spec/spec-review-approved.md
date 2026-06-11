# Spec Review — APPROVED

_Spec under review: `1-spec/spec.md` (pipeline `51-guardrails-convention-v2`, issue #51)._
_Reviewer: spec-reviewer. Iteration: N=2 (approval after one rejection)._

## Verdict

**APPROVED.** The single load-bearing defect from iteration 1 (requirement 24 / acceptance
criterion 11 mis-grounded against the shipped `load.md`) is fully and correctly resolved. The
writer applied fix (a) exactly as recommended, the edit is surgical (3 lines: req 24, OOS 7,
AC 11), every other part of the spec is byte-identical to the version I verified empirically in
iteration 1, and the revision introduces no new defects, contradictions, or scope creep.

---

## How the blocking defect was resolved

The revising commit (`d2b2369`, "Revise spec per review: make local overrides documentation-only")
changed exactly the three locations I flagged and nothing else (confirmed via `git show`):

- **Requirement 24** no longer asserts any false inheritance. The old wording claimed a guardrail
  in `.rp.local.md` "is **ignored, the committed value is used, and the run output warns** — the
  behavior the local-overrides mechanism (#91) **already provides**" and that "the loader's
  overridable-vs-shared guidance gains a one-line note." Both claims were false against the shipped
  surface. The new req 24 instead: (i) keeps guardrails non-overridable **by omission** — correctly
  noting the shipped `## Local overrides` is a generic stub with no enumerated overridable subset to
  add it to; (ii) explicitly disclaims authoring the "ignored / committed-value-used / warns"
  enforcement, stating that machinery "is not present in the shipped loader — it lives only in
  unshipped #91 pipeline artifacts"; (iii) scopes the only edit to "at most a short sentence noting
  guardrails is shared / committed-only, attached to the existing stub." Every factual claim now
  holds.
- **Acceptance Criterion 11** is reanchored to what the stub can exhibit: it asserts no enumerated
  subset is created, guardrails is not added to one, at most a short shared/committed-only sentence
  is added, and "no … 'ignored / committed-value-used / warn' enforcement text is authored (none
  exists in the shipped stub to extend)." Directly verifiable.
- **Out of Scope item 7** now explicitly excludes "Authoring the detailed overridable-vs-shared
  guidance and the 'ignored / committed-value-used / warn-on-override' enforcement into the shipped
  `load.md`," noting porting it would re-open #91 scope. This closes the scope-creep door (the #112
  lesson) and is internally consistent with req 24.

## Re-verification against the live codebase

- The shipped `load.md` `## Local overrides` section (lines 31–37) is still the generic
  three-sentence stub — no enumerated overridable subset, no ignore-and-warn enforcement — exactly
  as req 24 / AC 11 / OOS 7 now describe.
- A grep of the entire shipped `skills/` tree plus `README.md` for `overridable`,
  `ignored, the committed`, `not locally overridable`, `shared across collaborators`, `local
  runtime`, `warn-on-override`, `enumerated subset` returns **zero matches** — confirming the
  detailed machinery is absent from shipped product surface and lives only in `.pipelines/91-...`
  artifacts, precisely as the revised spec states.
- The rest of the spec is unchanged from iteration 1, where I reproduced every empirical claim live:
  grep-negative scope (the string `"verification convention"` is in exactly the four phase agents);
  the agent-rewrite line targets and leave-alone references; the loader/`.rp.md` structure (no
  `## Guardrails` sibling); the three-way validation outcome split (exit 127 unrunnable / 1
  runs-but-fails / 0 passes, reproduced); Node v20.19.4 local vs Node 22 CI and the `npm test` glob
  behavior; and `.changeset/config.json` requiring a changeset for the agents/skills edits. All of
  those approvals carry forward.

## Note carried forward (non-blocking, unchanged)

`claude-code.md` says "three" tool-forced conventions but documents four blocks (it includes Health
monitoring). This is a pre-existing inconsistency in a file this spec does not touch, has no bearing
on the tool-agnostic guardrails feature, and is correctly out of scope. Flagged only so it is not
later mistaken for a guardrails-introduced error. No spec change required.

---

## Summary

The spec is approved. The iteration-1 blocker — req 24 / AC 11 instructing an edit to a
"loader overridable-vs-shared guidance" that does not exist on the shipped surface, on a false
"#91 provides it for free / one-line note" premise — is now fully corrected: guardrails is kept
non-overridable **by omission**, the spec is honest that the shipped `load.md` is a generic stub
with no enumerated subset and no ignore-and-warn enforcement, the only loader edit is a short
shared/committed-only sentence, and OOS item 7 explicitly bars porting the #91 machinery in. The fix
is surgical (3 lines), introduces no new defects or contradictions, and the remainder of the spec —
which I verified empirically in iteration 1 — is unchanged. The spec is complete, internally
consistent, accurately grounded in the codebase, and ready to proceed to the design phase.
