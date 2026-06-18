# Design Doc Review

## Verdict: approved

## Summary

The design doc is complete, internally consistent, faithful to the approved spec
(R1–R10), and grounded in the actual skill files it edits. Every load-bearing claim I
could check against the repo holds: commit `cac2d25` exists and removed the illustrative
gate table for prose-only capture; this repo's `.rp.md` has no Guardrails section (so the
default no-mark path is genuinely exercised and strands nothing); the gate `agents`
enumeration in `setup.md` L183 is the split set the design draws from; a tree-wide sweep
for floor-family vocabulary returns exactly six files, all inside the ten; and the
unrelated validation-"floor" metaphor in `setup.md` L197 is a different sense the design
correctly leaves alone. The doc converges cleanly onto the existing flat guardrails
contract rather than inventing a parallel mechanism, and it respects the skill-authoring
rules: the resolution mechanic and the new spawn field are each defined once, the
plan-completed mechanism is stated once at the setup capture item, and the negatives it
retains (no desync defense, no assisted parenthetical in `4 - code.md`) are each justified
as avoiding an unnecessary negative.

## Verification performed

- **⊆ invariant and command-substitution mechanics.** The Architecture section derives
  line-existence invariance correctly: a gate's `Guardrails:` line exists iff the agent is
  in `agents`; since `plan-completed-for ⊆ agents`, a substitution can only fire on a line
  that already exists, so resolution touches only a line's command, keyed on membership not
  role. The worked example (gate `tests`, `agents` {tdd, e2e, reviewer}, marked {tdd, e2e})
  is consistent with the valid agent set in `setup.md` L183 and with R7. The "reviewer not
  in `agents`" variant follows from the invariant. Sound.

- **Resolution clause = contract = algorithm.** The doc places the substitution in the
  `Guardrails:` bullet in `autonomous-workflow.md` and reduces both phase files to *when*
  clauses, matching R10. The existing `Guardrails:` bullet ("one per line as a name and its
  exact command. Omit when no gate names it.") is the real text at L66, so the described
  clause extension lands on the right anchor. No duplicate algorithm text across reading
  paths.

- **Omit-when-empty spawn field.** `Guardrails to complete:` is omitted on the empty marked
  set, matching the two existing omit-when-empty fields actually present in the spawn block
  (`Guardrails:` L66, `Commit format:` L65). The three-way trace (writer renders `None`,
  reviewer binds vacuously, the plan's `None` is the template default not an explicit empty
  signal) is coherent and the writer-instruction constraint ("`None` is the default when no
  set is received") is carried correctly.

- **Renamed plan section.** `## Required test commands` (the real section in
  `code-plan-writer.md` L31–35 and assisted `3 - plan.md` L132–137) → `## Plan-completed
  guardrails`. Column choices (Gate not Name, Rationale not Covers) are load-bearing and
  drop the last floor tokens (`Name`, `Covers`). The bare-`None` rendering is justified as a
  fresh micro-decision with no literal-`None` precedent, and the no-collision check against
  the untouched `## E2E test plan` (`Traces to:`) holds.

- **Unified writers' guardrails step; doc-writer untouched.** The design's shared block
  (Overview L371–382) is the `doc-writer.md` step-4 block (L40–47) verbatim minus its
  no-convention tail ("the step-3 accuracy verification is your only validation;"), with all
  floor language removed — confirmed against both files. The R8/R10 tension is resolved
  correctly: doc-writer is the convergence *model*, not a co-edit target, so editing it for
  byte-identity would add an eleventh file; it keeps its no-convention tail and its
  deliverable-specific final line, and the writers keep their own "passing test" line. The
  doc-writer model is left fully untouched, as required. The removed code-writer pieces (the
  gather-context required-test-commands read, the "two command sets … AND the floor"
  framing, the floor bullets, and the floor entry in the self-containment input list) all
  correspond to real lines in `code-writer-tdd.md` and `code-writer-e2e.md`.

- **Assisted phase-3 retargets.** The three floor locations the design names (constraint
  L30, self-check L118, skeleton L132–137) are the actual floor tokens in assisted
  `3 - plan.md`; no `Guardrails to complete:` field is invented for the single-driver path.
  The folded bind self-check (no separate coverage-judgment bullet, because authoring and
  judging coverage are one act for the single driver) is a defensible proportional choice
  and is consistent with the autonomous reviewer's separate bind check.

- **Scope and committed-only.** The committed-only rule is preserved by construction: the
  illustrative `.rp.md` shape carries a label for name/full-command/agents/mark and none for
  the feature command, and `load.md` L38 (the real committed-only line, "Guardrails is shared
  and committed-only; it is never taken from `.rp.local.md`") is the correct anchor for the
  R3 extension. `code-reviewer.md`, `README.md`, `doc-reviewer.md`, and `## E2E test plan`
  carry no floor token and are correctly out of scope.

## Notes (non-blocking)

- The "Per-file design" header for the two phase files renders as `### …/3 - plan.md` and
  `4 - code.md` — when` (the trailing "— when" wraps into the heading). Purely cosmetic in
  the artifact; not a design defect and nothing the implementer must carry into the skill.
