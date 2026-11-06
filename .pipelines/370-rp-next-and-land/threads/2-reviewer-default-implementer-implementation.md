status: open
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
