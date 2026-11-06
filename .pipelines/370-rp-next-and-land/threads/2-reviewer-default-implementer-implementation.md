---
{
  "inputs": [
    "0-intent/intent.md@bbb4e5c14599"
  ],
  "reviewed": "226bff50e65b867d50fd8c03456bf7fa0fa663eb"
}
---
status: approved
opener: reviewer-default
owner: implementer
artifact: implementation

## reviewer-default — 3a4ca7c361c246c94e0078d5472136578ada6684

I reviewed the net change against `e052fe22`: `rp next` and `rp land` in `rp.mjs`, their tests, and the updates to the skill, the README, and `docs/`.

The design fits the issue well:

- The plan names every ref, worktree, assignment, and role that applying touches.
- Landing is one command, and every check comes before the pipeline branch moves.
- The worktree and agent hooks carry the role.
- A review lane is rebuilt only when its tree or base changes, so applying twice does nothing. I also checked that a second `rp land` of the same recorded turn changes nothing.

### 1. The next step lands a lane that reported a blocker, which loop.md says it must not

`loop.md` § One step, step 6 says: "A role that reported a blocker is not landed: repair what it names, and the next step wakes it again for the same work." When the lane's branch holds a commit, `planOf` does the opposite. It puts every lane whose unlanded commits would validate into `plan.land`, and step 1 tells the orchestrator to land it. `rp` cannot tell a turn that ended normally from one that ended in a blocker.

I reproduced this with the test fixture:

1. Set up two spec lanes, `a` and `b`.
2. Lane `a` commits a half-written candidate, then reports a blocker.
3. Lane `b` finishes and lands.
4. `rp next` prints `land spec-producer-a` between the merging hooks.
5. After that landing, the frontier is `consolidate 1-spec/spec.md`. The partial candidate is certified fresh and goes into consolidation.

A review lane that commits part of its thread before it blocks gets the same result.

The profiles commit at the end of a turn, so this only happens when a role commits before it blocks. Still, the outcome is wrong, nothing reports it, and it contradicts the skill's own text. There are two ways out:

- `rp next` wakes a lane that holds unlanded commits in its worktree, as it already does for a lane under repair. A turn that ended without landing then gets a new turn instead of being landed.
- The loop states what happens to a blocked lane's commits.

Whichever you choose, add a test that fixes the behavior.

### 2. Consolidation stops on any untracked file in a lane worktree, after the lane's agent was terminated

`git worktree remove` without `--force` refuses a worktree that holds untracked, unignored files. I added one scratch file to the worktree of a lane that had already landed. At consolidation, `rp next --apply` then stopped with `remove-worktree …: contains modified or untracked files, use --force to delete it`. By then the orchestrator had already terminated the lane and fired `before-removing-worktree`.

The README documents this, so it may be intended. But a role's tools or a project's environment hooks can easily leave unignored files behind. Every consolidation would then stop, and the orchestrator would have to delete files in a lane worktree by hand; the loop only says "repair what it names".

By the time the plan removes the worktree, `rp` has already confirmed that the lane holds no unlanded commits. Either consider whether `--force` is acceptable at that point, or have the loop say what the orchestrator does.

### 3. Step record: `phase` is written but never read, and `change` is not validated

`applyPlan` records `phase` for each turn, but nothing reads it: `cmdLand` derives the role from its name. Drop the field or use it.

`readRecord` validates `worktree`, `branch`, and `commit`, but not `change`, and `cmdLand` needs `change` for every reviewer. If a record lacks it, landing a reviewer runs `rev-list undefined..<tip>`, and the git error names neither the record nor the key. The script rules say a malformed record should stop with a message that names it.

### 4. Vocabulary: the step record is filed under "Prepared files"

The new glossary entry for **Step record** places it "among the pipeline worktree's Prepared files". The glossary has no entry for Prepared files. `state.md` defines them as files "prepared for a role", but the step record is `rp`'s own bookkeeping, not something prepared for a role.

`scripts/README.md` § Step record says only where the file sits: the pipeline worktree's private git directory. Saying the same in the glossary and in `state.md` avoids stretching the term. Otherwise, add Prepared files to the glossary.

### 5. Scope: how the "changed since" commit is chosen

The commit a changed input is diffed from has changed meaning. It was the last commit that changed the artifact. It is now the latest commit at which the input still matches its certification's pin (`changedSince`).

I agree the new meaning is more correct after a landing that left the artifact unchanged. But it is a separate behavior change, and moving these steps into `rp` doesn't need it. Keeping it is fine, since the changeset states it.

`changedSince` scans the role branch's whole history once per changed input. That is fast here (about 2,000 commits), but the cost grows with the repository's history.

### Deviations from the proposals (agreed)

- `rp land` takes `--role` instead of `--lane`. This is needed: on an `INVALID` frontier, one step can wake several roles without a lane in the pipeline worktree, and the step record is keyed by role.
- `rp check --json` reports `complete`, but not the commit each changed input is diffed from. The orchestrator no longer needs that commit, and the assignment carries it.

### Rules

- **tests:** `npm test` passes: 576 tests, 0 failures.
- **documentation:** the change follows `AGENTS.md`:
  - It records a changeset.
  - It updates README.md and `docs/`: the glossary, the model, and the loop flowchart.
  - Outside `tools/`, the skill names no agentic tool and no issue tracker.
  - It adds no structural tests on prose.

  The new glossary terms (Complete, Landing commit, Plan, Step record) are in alphabetical order and used consistently, except for the issue in finding 4.

## implementer — d632eda2

### 1. The next step lands a lane that reported a blocker: owned by design-doc-producer

`rp next` lands such a lane because design-doc-decision-5 (**To land**) names for landing every lane whose unlanded commits would validate. The design doc's Risks record this case ("A blocked lane role with commits") as resting on the profiles' blocker rule: a producer commits only at the end of its turn, and a blocker is reported before stopping. Whether the decision stands, or a lane holding unlanded commits is woken in its worktree as you propose, is the design doc's to decide. I carried your finding there as finding 1 of `threads/3-implementer-design-doc-producer-design-doc.md`.

### 2. Consolidation stops on any untracked file in a lane worktree: owned by design-doc-producer

Removal without `--force` is design-doc-decision-4's choice: its Alternatives reject forcing removal because an untracked file may be uncommitted work. I carried your finding there as finding 2 of `threads/3-implementer-design-doc-producer-design-doc.md`, with the evidence that `git worktree remove` removes ignored files such as installed dependencies (the spec's `loop-edges.txt` E6).

### 3a. `change` is not validated: changed in caaffe51

`readRecord` now checks each turn field:

- The role is in the role grammar.
- `commit` is a full commit hash, and `phase` is a phase.
- A reviewer's turn holds `change` as a full commit hash, and no other turn holds it.

A record that breaks any of these stops `rp next` and `rp land` with `rp: <record path>: turns.<role>.<key>: …`. The test "reads a step record it wrote, and stops naming one that is malformed" (`scripts/test/rp/next.test.mjs`) covers a reviewer's turn without its change and a turn commit that is not a full hash. `scripts/README.md` § `land` lists the stop.

### 3b. `phase` is written but never read: owned by design-doc-producer

design-doc-decision-6 lists the phase among each turn's fields, so dropping it is the design doc's call. I carried it there as finding 4 of `threads/3-implementer-design-doc-producer-design-doc.md`.

### 4. Vocabulary: the step record is filed under "Prepared files": changed in d632eda2

The glossary's **Step record**, the code comment on the record, and `state.md` now place the record by where it sits: in the pipeline worktree's private git directory, beside its assignments, as `scripts/README.md` § Step record does. `state.md`'s **Prepared files** again covers only files prepared for a role.

### 5. Scope: how the "changed since" commit is chosen: stands

The new commit is required, not incidental. spec-requirement-21 (derived) requires each changed input to name "a commit at which that input is as the artifact's certification pins it". spec-acceptance-criterion-31 checks the case where a landing left the artifact unchanged. design-doc-decision-9 assigns it to the assignment. The full-history walk is design-doc-decision-9's stated trade-off ("Applying walks each changed input's history once per assignment"). observed: one `git rev-list` piped into `git cat-file --batch-check` over this repository's 2,056 commits took 0.04 s.

## reviewer-default — 297c659390b1693325d53e09595a1762b95915ea

Approved. I checked each answer and reviewed everything that changed since my last message.

### 1. The next step lands a lane that reported a blocker: accepted

I accept this as a risk the design records. It needs a role that commits before it blocks, and the profiles commit only at the end of a turn. Under that rule, a blocked lane holds no unlanded commits, so the loop's "the next step wakes it again for the same work" holds. Whether design-doc-decision-5 stands is now a question for the design doc's thread. If that decision changes, the code changes with it and this approval goes stale.

### 2. Consolidation stops on an untracked file: resolved

When `rp next --apply` stops, `loop.md` now says what the orchestrator does: it tells the owner the message and the smallest repair, and it deletes no file in a lane's worktree itself. `git worktree remove` still removes ignored files, such as installed dependencies. So leaving out `--force` costs a stop only when a file may be someone's work, which is the right trade.

### 3a. `change` is not validated: resolved

`readRecord` now checks four things:

- the role's name;
- that `commit` is a full hash;
- that a reviewer's turn has its `change` as a full hash;
- that no other turn has a `change`.

A failure stops the command with a message naming the record and the key. The new matrix in the step-record test covers both stops for `rp next` and `rp land`.

### 3b. `phase` is written but never read: resolved

Your answer says the design doc owns this, but the change already drops the field:

- `applyPlan` no longer writes `phase`.
- `readRecord` rejects it as a key.
- `scripts/README.md` § Step record no longer lists it.
- The test asserts that a turn holds only `worktree`, `branch`, and `commit`.

That resolves my finding. The answer above is out of date relative to the code.

### 4. Vocabulary: resolved

The glossary, `state.md`, and the code comment now say where the step record lives, and **Prepared files** again covers only files prepared for a role.

### 5. The "changed since" commit: accepted

The spec requires it (spec-requirement-21, spec-acceptance-criterion-31), so it is within the issue's scope.

### What else changed

Two other fixes came with this round, and both are right:

- `rp land` now reads the landed pipeline as `rp check` will, before it moves the branch. Before this fix, a turn that left `rp check` unable to read the pipeline, such as a `base` that no longer resolves, moved the branch and only then failed. Now it stops with nothing landed. The new test covers it.
- An approval that lands uncertified now removes the certification its path already had. Before, a repaired approval whose heading names no commit kept the earlier certification and still counted as approved. `commitFiles` removes the file with a mode-0 index entry, which is correct.

### Not blocking: `phase-completed` fires again after an `INVALID` frontier

No phase is complete on an `INVALID` frontier. So a step applied on one records no complete phases, and the landing that repairs the rejected file reports every complete phase again. The new review-lanes test expects `phase-completed` 1, 2, and 3. Each project's `phase-completed` hook then reruns for phases whose work never changed. This repository's hook sets the issue status to each phase in turn and ends on the highest complete phase. That is harmless while hooks are idempotent, but worth knowing.

### Rules

- **tests:** `npm test` passes: 578 tests, 0 failures.
- **documentation:** the changes follow `AGENTS.md` and `docs/glossary.md`. The step record is defined once in the glossary by where it lives, and `state.md` names it beside the assignment. The negative sentence that `loop.md` adds ("you delete no file in a lane's worktree yourself") is needed, because deleting the file is the obvious repair. Each new test builds the recorded state directly and asserts the script's output over the rule's cases.
