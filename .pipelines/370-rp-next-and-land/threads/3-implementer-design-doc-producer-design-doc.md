status: open
opener: implementer
owner: design-doc-producer
artifact: design-doc

## implementer — d632eda2

The two review lanes raised findings that question what design decisions demand. The implementation follows each decision as written.

### Finding 1: design-doc-decision-5 lands a lane whose turn ended with a blocker

design-doc-decision-5 (**To land**) has `rp next` name for landing every lane whose unlanded commits would validate. `rp` cannot tell a turn that ended normally from one that ended with a blocker. A blocked lane role that committed before reporting is therefore landed on the next step, and its partial candidate is certified. That contradicts spec-requirement-15 ("A turn that ended with a blocker is not landed … the next step wakes that role again for the same work") and design-doc-decision-11, step 6.

reviewer-default reproduced it (`threads/2-reviewer-default-implementer-implementation.md`, finding 1):

1. Two spec lanes run.
2. Lane `a` commits a half-written candidate and reports a blocker.
3. Lane `b` lands.
4. `rp next` prints `land spec-producer-a`.
5. After that landing, the frontier is `consolidate 1-spec/spec.md`, with the partial candidate fresh.

The reviewer proposes that `rp next` wake a lane holding unlanded commits in its worktree, as it does for a lane under repair, instead of landing it.

Evidence on intended use:

- observed: reading `agents/spec-producer.md` (lines 28, 101, 102) and `agents/design-doc-producer.md` (lines 28, 115, 116). A producer commits at Turn step 5 and at **End of turn**. A **Blocker** is "report it to the orchestrator … and stop".
- observed: reading `templates/reviewer-first.md`. The reviewer's request commits the review at its end (line 46).
- The design doc's Risks record this case ("A blocked lane role with commits") as resting on that blocker rule.

### Finding 2: design-doc-decision-4 keeps worktree removal from discarding untracked files, so one stops a consolidation

design-doc-decision-4's Alternatives reject forcing worktree removal: "an untracked file in a lane worktree may be uncommitted work". reviewer-default (finding 2) added one scratch file to the worktree of a landed lane. At consolidation, `rp next --apply` then stopped with `remove-worktree …: contains modified or untracked files, use --force to delete it`, after the orchestrator had terminated the lane and fired `before-removing-worktree`. The reviewer asks either for `--force` at that point, since `rp` has confirmed the lane holds no unlanded commits, or for the loop to say what the orchestrator does.

Evidence on intended use:

- observed: the spec's `1-spec/spec/loop-edges.txt` E6. `git worktree remove` removes a worktree holding only ignored files, such as installed dependencies.
- observed: reading `.rp.md` § Lifecycle hooks. This repository's only worktree hook installs dependencies.
- The spec's Considered and not required records "A role ending its turn with uncommitted changes in its worktree — no source shows a role doing so".

### Finding 3: design-doc-decision-6 leaves a lane woken before the change unlandable, and rp next plans its landing on every step

design-doc-decision-6's Trade-offs accept that "A role the loop woke before this change has no recorded turn, and `rp land` stops for it". reviewer-astra (`threads/2-reviewer-astra-implementer-implementation.md`, finding 3) reproduced the consequence:

1. A spec lane is assigned with the base's `rp assign`, and its candidate is committed.
2. The conventions are migrated to version 9.
3. `rp next` and `rp next --apply` both print `land spec-producer-a`.
4. `rp land` stops with `no turn of spec-producer-a is recorded`.
5. Planning again gives the same plan, so neither command recovers.

changelog § 9 says format-8 pipelines are continued. The reviewer's rule is that a planned landing needs a recoverable turn commit.

Evidence on intended use:

- observed: reading `reference/run/close-out.md` step 2. A run that stops removes its lane worktrees and branches, once every commit is on the pipeline branch. A continued pipeline therefore starts with no lane branch. The case needs the skill updated mid-run while a lane holds unlanded commits.
- The pipeline worktree is recreated with an empty step record whenever triage creates it on another machine (`reference/entries/triage.md` § 5, Continue). Lane branches are gone by then, as above.

The proposal in finding 1, waking a lane that holds unlanded commits in its worktree, would also record that lane's turn, and its next landing would then succeed.

### Finding 4: the step record's per-turn phase has no reader

design-doc-decision-6 lists "its phase" among each turn's fields. `rp next --apply` writes it, and no code reads it:

- `rp land` derives the role and its artifact from the role's name.
- `phase-started` reads `woke`, the phases of the last applied step.

reviewer-default (finding 3) asks to drop the field or use it. Can design-doc-decision-6 drop it from the turn?
