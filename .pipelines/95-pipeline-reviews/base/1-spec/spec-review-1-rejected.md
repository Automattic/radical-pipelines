# Spec Review

## Verdict: rejected

## Summary

This is a strong, carefully-built spec. Its 29 requirements map cleanly onto the
29 consolidated requirements in `spec-research.md`, the run-folder model is
coherent, the WHAT-vs-HOW discipline is mostly respected, and the 16 acceptance
criteria are in proper Given-When-Then form. The author clearly understood the
orthogonal runs-vs-forks axes and the "almost nothing changes in the agents"
property, and the verification against the live skill (the diff-base ref is
already a launch parameter, the format prose is inline in `manage-issues.md`, the
menu hook is at `work-on-an-issue.md:34`, the assisted phase-4/5 limit is real)
all checks out. That said, three real issues keep it from approval: a genuine
completeness gap (R9 silently drops a pipeline state the research flagged as
open), a requirement that over-constrains the design phase by foreclosing a
deferred `[design]` option (R13's "exactly ONE place"), and an altitude slip
where a requirement prescribes the review procedure's internal step sequence
rather than its observable outcome (R29). Two minor coverage gaps are noted as
well. These are fixable with small edits; none requires re-research.

## Issues

### Issue 1: R9 silently drops the "merged but branch still alive" pipeline state

**What's wrong:** `spec-research.md` (consolidated requirement 8, and Q2 facet 2)
identifies THREE merged states and explicitly flags the third as an open case:
(a) complete + unmerged + branch/worktree live → review (canonical); (b) merged
AND branch deleted → no review, direct to fork; and (c) **merged but branch still
alive** → "a review is technically possible but unusual … offer it with a caveat
or steer to fork," tagged `[design]` ("exact handling of merged-but-branch-alive").
Spec R9 collapses this to only (a) and (b). The merged-but-branch-alive case is
neither addressed nor declared out of scope — it is simply omitted. An
implementer who encounters a complete pipeline whose branch was merged but not
deleted has no guidance: R9's two stated branches do not cover it, and "Out of
Scope" does not mention it either.

**Where in spec:** Section B, R9; and the "Out of Scope" list.

**Suggestion:** Either (i) state the observable outcome for the third state at
the WHAT level — e.g. "a complete pipeline that was merged but whose branch is
still live MAY be reviewed (the same-branch precondition is satisfiable), with
the owner advised it is unusual" — leaving the exact caveat wording to design; or
(ii) if it is genuinely deferred, add it to "Out of Scope" by name so the gap is
deliberate rather than silent. Add a matching acceptance criterion (or a note in
AC5) for whichever choice is made.

**Why it matters:** Completeness — the spec must cover every observable state of
the precondition it gates on. A reachable pipeline state with no defined behavior
forces the implementer to invent one, and two implementers would diverge on it
(one offers the review, another blocks it), which is exactly what the spec exists
to prevent.

### Issue 2: R13 "exactly ONE place" forecloses a deferred `[design]` factoring option

**What's wrong:** Consolidated requirement 13 leaves the factoring granularity as
an explicit `[design]` decision: "**one shared file vs. splitting** the
format-schema (all three sites) from the capture-discipline (issue + review only,
since base-prompt generation adapts an existing issue without a Q&A)." Spec R13
states the format is "defined in exactly ONE place" / "that single definition."
Taken literally, "exactly ONE place" / "one definition" rules out the two-file
split that the research deliberately left open for the design phase — the split
would put the schema in one file and the capture-discipline in a second (two
places). The true requirement is the observable no-duplication property ("no two
sites restate the same format prose"), not a file count. By fixing the count, R13
promotes a deferred HOW decision into a hard requirement and constrains phase 2.

**Where in spec:** Section D, R13 ("defined in exactly ONE place", "that single
definition"); and Acceptance Criterion 12 ("defined in exactly one place").

**Suggestion:** Restate the requirement as the de-duplication outcome without
prescribing file count — e.g. "the prompt-format definition is single-sourced:
each element of the schema, rendering rules, and authoring discipline appears in
exactly one location, and all three sites reference it rather than restating it"
(which a one-file OR a two-file split both satisfy). The already-present clause
"No two sites restate the same format prose" is the right test; the "exactly ONE
place"/"one definition" phrasing is what over-constrains. Adjust AC12 to match
(its check should be "no site restates the schema/discipline," not "located in
exactly one place").

**Why it matters:** Scope-of-the-spec — a `[design]`-tagged decision (one file vs.
split) was promoted into a requirement, which is precisely what the spec must not
do. It pre-empts the design phase and could later read as a contradiction if
design chooses the (legitimate) split.

### Issue 3: R29 prescribes the review procedure's internal step sequence (HOW, not WHAT)

**What's wrong:** R29 specifies the internal composition of the review procedure
as an ordered recipe: "a thin entry that authors the review prompt (using the
shared prompt format, R13), creates the run folder (R1, R2), wires the diff base
(R16), then dispatches to the SAME autonomous/assisted workflow references the
base run uses (now run-aware)." The "authors prompt → creates folder → wires diff
base → dispatches" sequence is an internal control-flow / decomposition decision —
design-doc territory — not an observable outcome. The legitimate WHAT here is the
two end-state constraints the prompt itself demands: (1) the Review menu line
points at a real, working target; and (2) the procedure is distributed, not
monolithic — it does NOT re-implement a full run in one self-contained file
(superseding #58). Those are observable. The step-by-step internal recipe is the
spec reaching into HOW.

**Where in spec:** Section J, R29; mirrored in Acceptance Criterion 15.

**Suggestion:** Trim R29 to the observable constraints: the dangling Review action
is wired to a real target; selecting it runs a real review procedure that
produces the required outcomes (an authored review prompt, a new run folder, a
diff base scoped to the prior run's tip, a run that proceeds in the chosen mode);
and the procedure is distributed rather than a single self-contained
re-implementation of a run (per the #58 supersession). Drop the prescribed
ordered internal steps ("thin entry that … then dispatches to") and let the
design phase decide the decomposition. Keep the Merge/Close non-breakage clause —
that is a real, testable WHAT. Apply the same trimming to AC15.

**Why it matters:** Scope-of-the-spec — the reviewer guidance is explicit that
architecture, components, and control flow do not belong in the spec. As written,
R29 partly designs the entry procedure, narrowing the design phase and blurring
the WHAT/HOW boundary the pipeline depends on.

### Issue 4 (minor): the abandoned/empty review run is an unacknowledged observable case

**What's wrong:** `spec-research.md` (Q4 facet 2 / Q8 facet 3e, under requirement
21) raises the case of an abandoned review whose only artifact is its own
`0-prompt/prompt.md` — i.e. a review started but not advanced past phase 0. The
exact handling (resume-from-prompt vs. delete the empty run folder) is correctly
`[design]`-deferred, but the spec does not acknowledge that this state is
reachable at all. R20 ("state follows the latest run") plus R7 (completeness
gates the NEXT review) interact here: a freshly-created review run is the latest
run and is incomplete, so the pipeline's active phase becomes that review's phase
0/1. The spec never says what "the latest run" means immediately after a review
folder is created but before phase 1 produces anything, and no acceptance
criterion exercises it.

**Where in spec:** Section G, R20/R21; Acceptance Criteria (none cover an
in-flight review at phase 0/1).

**Suggestion:** Add one WHAT-level sentence to R20 or R21 acknowledging that a
newly-created review run with only its prompt is the latest run and the pipeline's
active phase is that review's phase 1 (spec), leaving the resume-vs-delete
mechanism to design. Optionally add a short acceptance criterion for a review
at phase 0/1.

**Why it matters:** Completeness and acceptance-criteria coverage — this is a
directly reachable state of the new run layer (create the folder, then the owner
walks away), and the spec should at least pin its observable meaning even while
deferring the recovery mechanism.

### Issue 5 (minor): R5 wording leans on one of two deferred reading options

**What's wrong:** Consolidated requirement 5 leaves "dual-shape reading vs.
clean-break grandfathering" as an explicit `[design]` choice. Spec R5 states the
listing/reconstruction logic "read[s] a flat pipeline as if it were a single
implicit `base` run." That phrasing is close to the observable WHAT (a legacy
flat pipeline is listed and reviewable without migration), but "read … as a
single implicit base run" also reads as committing to the dual-shape-reading
mechanism over the grandfather option. This is far milder than Issues 2–3 (it is
arguably just describing the required outcome), but given the `[design]` tag it is
worth tightening so it cannot be read as pre-deciding the mechanism.

**Where in spec:** Section A, R5.

**Suggestion:** Phrase R5 purely as the outcome — "an existing flat-layout pipeline
is listed, tree-reconstructed, and reviewable without being migrated or
rewritten; a first review on it is added as a `review-1-<short-description>`
sibling while its existing flat artifacts stay in place" — and let design choose
how reading tolerates both shapes. If the team considers "as if it were a single
implicit base run" to be the observable contract (not a mechanism), say so
explicitly; otherwise soften it.

**Why it matters:** Scope-of-the-spec — keeps R5 from being read as picking one of
two deferred reading strategies, preserving the design phase's latitude.
