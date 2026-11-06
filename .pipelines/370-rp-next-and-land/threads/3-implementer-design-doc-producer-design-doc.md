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

## design-doc-producer — 64379b2d

### 1. design-doc-decision-5 lands a lane whose turn ended with a blocker: stands

In intended use, a lane whose role reported a blocker holds no unlanded commit, so the plan names no landing for it. A lane holds unlanded commits only when its turn ended normally without landing, or when its landing stopped.

- observed: reading `agents/spec-producer.md` lines 28, 101, and 102 and `agents/design-doc-producer.md` lines 28, 115, and 116. A producer commits at Turn step 5, as it ends its turn. A **Blocker** is "report it to the orchestrator … and stop".
- observed: reading `agents/reviewer.md` and `templates/reviewer-first.md`. A reviewer whose seat or materials fail it "report[s] what failed and stop[s]", and its request commits the review at its end.

The reproduction commits a half-written candidate before blocking, which no profile does. The decision is defended by an input intended use produces: a lane turn that ended without landing, as after a compaction (spec-requirement-9). For that input, the commits tell `rp` what the orchestrator may no longer know. Commits mean the turn ended and is landed; no commits mean the next step wakes the role again, as spec-requirement-15 asks.

The proposal, waking every lane that holds unlanded commits in its worktree, loses for a review lane in intended use. When another lane's findings land, the frontier moves to phase 3. The lane would then wait, and its reviewer would be woken later on a change whose code the implementer has since changed. Landing at once brings the review of the code the reviewer read. For a production lane, the proposal has its producer redo a turn that ended.

64379b2d records this alternative under design-doc-decision-5's Alternatives. It also restates the Risk ("A blocked lane role with commits") with the profiles' rule it rests on.

### 2. design-doc-decision-4 keeps worktree removal from discarding untracked files: changed in 64379b2d

Removal stays unforced. What changed is what the orchestrator does when removal stops.

Evidence that intended use leaves no untracked file in a lane worktree:

- observed: this pipeline's two review lane worktrees, after their reviewers' turns on opencode (`2-design-doc/design-doc/lane-worktrees.txt`). Each holds no untracked file, only the ignored `node_modules/` that `after-creating-worktree` installs.
- observed: the spec's `1-spec/spec/loop-edges.txt` E6. `git worktree remove` deletes ignored files.

So the stop needs a file no source shows a role or hook leaving. Forcing would delete that file unseen, and it may be work.

What changed, in design-doc-decision-11 (**Apply failure**) and § Failure modes:

- A failed `--apply` names its action and reason. The orchestrator tells the owner the message and the smallest owner action that would repair it, such as an untracked file to commit or delete in a worktree to remove.
- Once the owner has repaired it, the orchestrator runs `--apply` again, without firing its `before-` hooks again, and fires the `after-` hooks once it completes.

The orchestrator deletes no file in a lane worktree itself. Verification's inspection of the loop now checks this.

### 3. design-doc-decision-6 leaves a lane woken before the change unlandable: stands

No lane branch outlives a run:

- observed: reading `reference/run/close-out.md` step 2. When a run stops, close-out removes the lane worktrees and branches, once every commit is on the pipeline branch.

A continued format-8 pipeline therefore starts with no lane branch, and every lane it later holds was woken by an apply that recorded its turn. Changelog § 9's promise is kept. Only a skill updated in the middle of a run, while a lane holds unlanded commits, meets the case, which is a migration leftover. Nor does it loop unnoticed: `rp land` stops for it, and design-doc-decision-11 sends any stop other than rejected files to the owner.

64379b2d states both points in design-doc-decision-6's Trade-offs and adds the close-out observation to its Claims. Waking the lane in place instead loses as point 1 states.

### 4. The step record's per-turn phase has no reader: changed in 64379b2d

design-doc-decision-6 drops the phase from each turn. A turn holds its worktree, its branch, its turn commit, and a review lane's change. `phase-started` reads the phases the last applied step woke, which the record still holds at the step level. The phase stays on the plan's wake entry, where spec-requirement-2 asks for it.

The same commit also places the step record as your d632eda2 does: in the pipeline worktree's private git directory, beside its assignments, as `rp`'s own record and not among Prepared files. This is in Architecture, design-doc-decision-6, and Interfaces § Step record.
