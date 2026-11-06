---
{
  "inputs": [
    "1-spec/spec.md@70b04a644623"
  ]
}
---
# Design Doc: Run each loop step with `rp next` and `rp land`

## Overview

Today the orchestrator does most of each step itself. It runs `rp check`, then creates, moves, and removes lane branches and worktrees with Git. It runs `rp review` and `rp assign` for each role. To land a turn, it reads the turn commit from the role's assignment, runs `rp stamp`, commits, and merges or cherry-picks the lane. Landing has gaps: a file `rp` rejects still lands, and repeating a step fails or builds a new review change. A changed input can also be diffed from a commit older than the artifact's last landing.

After the change, `rp` has two commands for a step:

- `rp next <pipeline folder>` computes the step's plan and prints it, changing nothing. It reads the pipeline, the repository's worktrees and lane branches, the run configuration, and the conventions data. The plan names the worktrees, branches, and assignments that applying changes, the roles to terminate, and the roles to wake with everything the tool needs. It also names every hook moment of the step.
- `rp next <pipeline folder> --apply` does exactly what the plan states and records each woken role's turn. Applying again repeats nothing already done.
- `rp land <pipeline folder> --role <role>` lands one turn from that record. It validates what the turn brings, merges or cherry-picks a lane, certifies at the turn commit, commits in the shape the conventions declare, and prints the phases it completed.

`rp check --json` also reports which phases are complete. The Worktree folder root and the template of landing commits become conventions data, at version 9. `assign`, `review`, and `stamp` leave the command line. The orchestrator's step is `rp next`, its hooks, `rp next --apply`, its tool, and `rp land`.

## Architecture

```
orchestrator
  ├── rp next <pipeline folder> ─────────────▶ plan (prints; writes nothing)
  │      reads: pipeline worktree (frontier, as rp check), run-config.md,
  │             main checkout's .rp.md and .rp.local.md (frontmatter only),
  │             worktrees and branches, each configured lane branch, the step record
  │   when the plan names turns to land: land each (below), then rp next again
  ├── terminate the roles the plan names (tool), terminating hooks around each
  ├── before- worktree hooks
  ├── rp next <pipeline folder> --apply ─────▶ lane branches and worktrees,
  │                                             assignments, the step record
  ├── after- worktree hooks, phase-started
  ├── spawn or wake each role (tool), spawning hooks around a spawn:
  │      "Read your assignment: <path the plan names>."
  │   ... the tool reports a role's turn ended ...
  └── [lane: before-merging-lanes] rp land <pipeline folder> --role <role>
         ──▶ commits on the pipeline branch; prints the phases it completed
      [lane: after-merging-lanes], phase-completed for each phase printed
```

New:

- `rp next`, a command of `rp.mjs` with two jobs:
  - Planning: it computes the frontier as `rp check` does and each lane's unlanded work. From these it computes the seats, the woken roles' turns, and the hook moments (design-doc-decision-2, design-doc-decision-5, design-doc-decision-10).
  - Applying: it carries out the plan's actions, converging, and records the step (design-doc-decision-4, design-doc-decision-6).
- `rp land`, a command of `rp.mjs`. It verifies, validates, brings, certifies, commits, and reports one turn (design-doc-decision-7, design-doc-decision-8).
- The step record, among the pipeline worktree's Prepared files (design-doc-decision-6).

Modified:

- `rp.mjs`:
  - `check --json` reports complete phases (design-doc-decision-8).
  - The conventions reader takes version 9, with `worktree-folder-root` and `landing-commit` (design-doc-decision-3). The version of `.rp.md` and the format of `run-config.md` become two numbers.
  - `assign`, `review`, and `stamp` leave the command line. What they compute becomes part of `next --apply` and `land` (design-doc-decision-1).
  - A changed input names its own commit (design-doc-decision-9).
- Skill prose:
  - `reference/run/loop.md`: One step, Waking a role, Production lanes, Review lanes, and the frontier table (design-doc-decision-11).
  - `reference/run/state.md`: the command list; § Certification's landing; and § Names' Lane branches, Assignment, Turn commit, and Prepared files.
  - `SKILL.md`: the compaction note.
  - `reference/conventions/lifecycle-hooks.md`: the creating-branch moments, and what a worktree's hooks know (design-doc-decision-10).
  - `reference/entries/triage.md` § 5: the sentence on a lane's branch and worktree hooks.
  - `reference/conventions/health-monitoring.md`: Each tick step 6.
  - `reference/conventions/load.md`, `setup.md`, and `changelog.md` (new § 9).
  - `templates/README.md`: who fills the templates, and the commit a changed input names.
  - `tools/claude-code.md` and `tools/opencode.md` § Models.
  - `scripts/README.md`: the grammar of every command, the plan, and the conventions data.
- `.rp.md`: migrated to version 9.
- `docs/glossary.md`, `docs/model.md`, and `docs/flowcharts/loop.md`.
- A changeset.
- `scripts/test/rp/`.

Untouched but relevant:

- These stay as they are (spec-exclusion-3): the frontier rules, the artifact and certification formats, the templates' wording, which role each frontier action wakes and in which mode, and the agent profiles.
- `run-config.md` and every pipeline file keep format 8.
- `rp pipelines`.
- Triage, owner escalation, close-out, and health monitoring keep their steps (spec-exclusion-2). Only their references to the step change.

## Decisions

design-doc-decision-1: `rp next` plans and applies a step, `rp land` lands a turn, and `assign`, `review`, and `stamp` leave the command line

**Serves:** spec-requirement-1, spec-requirement-5, spec-requirement-11, spec-requirement-20, spec-requirement-22, spec-acceptance-criterion-30, spec-acceptance-criterion-32

**Decision:**

- `rp` has four commands: `check`, `pipelines`, `next`, and `land` (Interfaces).
- `rp next <pipeline folder>` computes the step's plan (design-doc-decision-2) and prints it. It writes no ref, worktree, file in a worktree, assignment, or step record. Like `rp check`, it may add unreferenced objects to the object store.
- `rp next <pipeline folder> --apply` computes the same plan and applies it (design-doc-decision-4). It is the only writer of lane branches, lane worktrees, assignments, and the step record.
- `rp land <pipeline folder> --role <role>` lands that role's turn (design-doc-decision-7). It is the only writer of certifications and of the pipeline-branch commits `rp` makes.
- What `assign`, `review`, and `stamp` compute today becomes part of `next --apply` and `land`. That is a woken role's assignment, a review lane's change, and a landed file's certification. The three commands are removed, and with them `stamp --at`.
- Every command keeps today's argument rules: one positional argument and only its own options. An unknown option stops it, naming the option.

**Alternatives:**

- Keeping `assign`, `review`, and `stamp` beside the new commands loses. After the change nothing in the skill runs them. `stamp --at` takes a turn commit and `review --lane` a lane, which intent-constraint-6 says are never parameters. Each concept would also keep two entry points.
- `rp next` printing a plan while the orchestrator still runs `assign` and `review` per role loses: the orchestrator would keep composing roles and lanes for each command (intent-goal).
- One command that plans, applies, and lands loses. `before-` hooks fire between planning and applying, and landing waits for each turn's end, which only the tool reports.
- `rp land` without `--role`, landing every ended turn, loses as the spec records: merging-lanes brackets each lane, and turns end one at a time.
- Reading spec-acceptance-criterion-1's "every file" as covering the object store, so that `rp next` adds no object, is not taken. `rp check` already adds objects when it judges an approval's code, and an unreferenced object changes nothing any command reads.

**Trade-offs:** Removing commands is a breaking change. The tests that build certifications through `rp stamp` must build them directly. In exchange, each concept has one entry point, and the orchestrator has no per-role or per-file command left.

**Claims:**

- observed: reading `rp.mjs` `COMMANDS` and `parseArgs`. There are five commands, and each stops on an option outside its own, naming it.
- observed: `git grep` for the three commands outside `.pipelines/` (`2-design-doc/design-doc/command-consumers.txt`). They are named only in these places:
  - `loop.md`, `state.md`, `load.md`, `templates/README.md`, `tools/*.md` § Models, and `scripts/README.md`;
  - `docs/`;
  - the tests;
  - `rp.mjs`.
- observed: probe P3 (`2-design-doc/design-doc/probes.txt`): `git merge-tree --write-tree`, which `rp check` runs to judge an approval's code, adds an object to the object store.
- assumed: the `rp next`, `rp land`, and option tests in Verification.

design-doc-decision-2: The plan names everything the step does and everything the orchestrator acts on

**Serves:** spec-requirement-2, spec-requirement-4, spec-requirement-23, spec-acceptance-criterion-2, spec-acceptance-criterion-4, spec-acceptance-criterion-6, spec-acceptance-criterion-7, spec-acceptance-criterion-14

**Decision:** `rp next` reads:

- the pipeline worktree, as `rp check` reads it;
- the repository's worktrees and branches, and every configured lane's branch;
- the run configuration;
- the main checkout's conventions data (design-doc-decision-3);
- the step record (design-doc-decision-6).

From these it computes the plan's entries (Interfaces § The plan):

- **Frontier.** `rp check`'s frontier lines, unchanged.
- **Seats.** As `rp assign` seats roles today: a role without a lane sits in the pipeline worktree, and a lane's role in its lane's worktree, on its lane branch. A lane worktree that does not exist is created at `<worktree folder root>/<lane branch>`.
- **Dispatch.** For each frontier line:
  - `lane <artifact> <lane>`: the lane branch is created at the pipeline tip, or moved forward to it, and its worktree is created when missing. The lane's producer is woken there.
  - `consolidate <artifact>`: each production lane of the phase whose worktree or branch exists is terminated, and its worktree and branch are removed. The root producer is woken in the pipeline worktree, on a fresh instance.
  - `produce` and `respond`: the artifact's owner is woken in the pipeline worktree.
  - `review <lane>`: the lane branch is at the change built from the pipeline tip (design-doc-decision-4), with a worktree on it. The lane's reviewer is woken there.
  - `INVALID`: each role that writes a rejected file is woken, chosen as `rp assign` chooses them today. A producer or the implementer is woken in Respond with its lines among Malformed files, and a reviewer with its repair request. A lane's role is seated as under `lane` or `review`. The plan names each rejected file no role writes for the orchestrator.
  - `escalate` and `complete`: the frontier alone.
- **Unlanded work.** A lane holding unlanded commits is planned by design-doc-decision-5 before any of these.
- **Woken roles.** Each is named with:
  - its profile and lane;
  - its model name as the run gives it, or that the run gives none;
  - the names of the resources its assignment carries;
  - the absolute paths of its worktree and its assignment;
  - its phase;
  - whether its turn needs a fresh instance. Only a consolidation does; otherwise the orchestrator keeps the instance when its tool can wake it.

  The resources are those whose `profiles` hold the role's profile. A reviewer's repair request carries none.
- **Hooks.** The moments design-doc-decision-10 names.

Each woken role gets the assignment `rp assign` writes today, except where design-doc-decision-6 and design-doc-decision-9 say otherwise (spec-exclusion-3).

**Alternatives:**

- A plan in JSON loses as the spec records: no consumer is shown.
- A plan naming only the roles to wake, with `--apply` deriving the rest, loses intent-constraint-2. The orchestrator could neither fire a worktree's hooks nor terminate a lane first.
- Naming moments only for the hooks a project writes loses: those hooks are prose in `.rp.md`, which `rp` never reads. The plan names every moment of the step. The orchestrator follows whatever instructions the project wrote for it, as it does for every hook today.
- The orchestrator working out the fresh-instance need loses for consolidation, which `rp` knows. A tool that cannot wake, a gone instance, and a compacted orchestrator are the orchestrator's knowledge, so those cases stay in `loop.md`.

**Trade-offs:** The plan is long for a step with many lanes. `rp next` repeats `rp check`'s computation, approval code checks included.

**Claims:**

- observed: reading `rp.mjs` `cmdAssign`, `turnOf`, `writes`, `modelsOf`, and `carriedOf`:
  - the seat, and the turn each frontier action gives;
  - the roles an `INVALID` frontier wakes;
  - the lane-else-profile model;
  - resources by profile, and a repair request carrying the commit format alone.
- observed: the spec's `1-spec/spec/loop-edges.txt` E7 and `invalid-intent-today.txt`. A rejected thread between two producers wakes both in the pipeline worktree, and a rejected intent wakes no role.
- assumed: the `rp next` tests in Verification.

design-doc-decision-3: The Worktree folder root and the landing commit template are conventions data, at conventions version 9

**Serves:** spec-requirement-3, spec-requirement-16, spec-acceptance-criterion-2, spec-acceptance-criterion-18, spec-acceptance-criterion-27

**Decision:**

- **Keys.** `.rp.md`'s frontmatter gains two keys (Interfaces § Conventions data):
  - `worktree-folder-root`, required: the folder holding one worktree per branch, at `<folder>/<branch>`, relative to the main checkout's root.
  - `landing-commit`, optional: a template for the commits `rp land` makes, holding a `{subject}` placeholder.
- **Overrides.** `.rp.local.md` may hold either key, replacing the committed one, as it replaces `commit-format`.
- **Reading.** `rp next` and `rp land` read and validate the conventions data whole, as `rp assign` does today. `rp next` places each lane worktree at `<main checkout>/<worktree-folder-root>/<lane branch>`.
- **Subjects.** Each subject `rp land` makes is imperative and sentence case, has no final period, and names what it landed. With `landing-commit`, the message is the template with `{subject}` replaced. Without it, the message is the subject alone. `rp` never reads `commit-format`'s prose.
- **Version.** The conventions version becomes 9, and the Worktree folder root prose section leaves `.rp.md`'s body. Changelog § 9 moves the section's value, unchanged, into the data and offers `landing-commit`. The pipeline format stays 8 because no pipeline file changes. The version of `.rp.md` and the format of `run-config.md` become two numbers.
- **This repository.** Its `.rp.md` is migrated, with `worktree-folder-root` `.worktrees` and `landing-commit` `{subject} (orchestrator)`. Its hook blocks are unchanged.

**Alternatives:**

- Deriving the folder from the pipeline worktree's location loses spec-requirement-3, under which `rp` reads the convention as data.
- A fixed `(orchestrator)` suffix loses spec-requirement-16: without a template, the subject stands alone.
- Declaring the template as a variable loses. Variables expand placeholders in the texts an assignment carries for a role, and a landing commit is no such text.
- Keeping one number and bumping both to 9 loses: every format-8 pipeline would become history, never continued, though none of its files changes.

**Trade-offs:** Every project migrates its `.rp.md` once. The code and the docs keep two version numbers apart.

**Claims:**

- observed: probe P2 (`2-design-doc/design-doc/probes.txt`). A version-8 frontmatter holding a new key is rejected as `unexpected key`, so a new key needs a new version.
- observed: reading `.rp.md`:
  - The Worktree folder root is a prose section: `.worktrees/`, one worktree per branch at `.worktrees/<branch>`.
  - `commit-format` asks roles to end each subject with the profile name.
- observed: reading `rp.mjs`'s `FORMAT`, which is both `.rp.md`'s version and `run-config.md`'s format.
- assumed: the conventions tests and the migration inspection in Verification.

design-doc-decision-4: Applying does exactly what the plan states, and applying again completes it without repeating it

**Serves:** spec-requirement-5, spec-requirement-6, spec-requirement-7, spec-acceptance-criterion-3, spec-acceptance-criterion-5, spec-acceptance-criterion-8, spec-acceptance-criterion-9, spec-acceptance-criterion-10

**Decision:**

- **Same plan.** `--apply` computes the plan `rp next` would print and prints it. It then carries out the plan's actions:
  - it removes worktrees;
  - it deletes, creates, and moves branches;
  - it creates worktrees;
  - it writes the assignments and the step record.

  It touches no other worktree or branch. It leaves the pipeline branch where it is and changes no file in the pipeline worktree's tree. It starts, messages, and stops no agent.
- **Convergent.** An action is planned only while it is undone: a worktree that exists is not created, and a branch at its target is not moved. After a full application, while the pipeline tip stays, the next plan names no worktree to create or remove and no branch to move. An assignment written again while its turn is unchanged is byte-identical.
- **Production lane.** A lane branch only moves forward, fast-forwarding to the pipeline tip with its worktree. Every other case is design-doc-decision-5's.
- **Review lane change.** A review lane's review base and change are built from the pipeline tip, from commits alone, as `rp review` builds them today.
  - A lane branch at a change is **current** when the change and its review base hold what building them from the tip would give: the tip's code and the base's code, a review base on the current base, and the lane's pipelines folder root.
  - `rp next` decides this by comparing content, and builds nothing.
  - Applying rebuilds only a lane that is not current. It moves the lane branch to the new change, and the lane's worktree too when it has one.
- **Partial failure.** When an action fails, `--apply` stops with exit 1, naming the action and the reason, and keeps the actions it completed. Run again once the cause is repaired, it plans and applies only what remains.

**Alternatives:**

- `--apply` reading back the plan `rp next` printed loses. The plan is derivable, so it is no parameter (intent-constraint-6), and no intended use changes the repository between the two commands (spec, Considered).
- Deterministic review commits, built with fixed metadata so a rebuild reproduces their hashes, also make reapplying a no-op. They lose because `rp next` would then build commits to learn whether a lane is current.
- Recording the tip each change was built from loses. A lane would be rebuilt after another lane landed, though its view and code did not change, and the record could disagree with the branch.
- Forcing worktree removal loses: an untracked file in a lane worktree may be uncommitted work. The removal stops instead, naming the worktree.

**Trade-offs:** Deciding a review lane's currency reads several trees for each review lane on the frontier.

**Claims:**

- observed: the spec's `1-spec/spec/` evidence:
  - `review-twice.txt`: `rp review` run twice on one tip builds two changes.
  - `loop-edges.txt` E5: `git branch` and `git worktree add` stop on a branch or path that exists.
  - `loop-edges.txt` E6: `git worktree remove` stops on an untracked file, and removes ignored files.
- observed: reading `rp.mjs` `cmdReview`. The review base holds the base's tree and the change holds the tip's, each with the pipelines folder root replaced by the lane's root. The review base's parent is the base.
- assumed: the apply tests in Verification.

design-doc-decision-5: A lane's unlanded commits are never discarded: the plan lands them first, or wakes their author to repair them

**Serves:** spec-requirement-9, spec-requirement-13, spec-acceptance-criterion-12, spec-acceptance-criterion-24

**Decision:**

- **Unlanded commits.** A lane's unlanded commits are the commits of its branch the pipeline branch lacks, other than its review base and change, found as `rp review` finds them today.
- **Rejections.** A lane's rejections are the files its unlanded commits change that its landing would reject (design-doc-decision-7).
- **Planning.** `rp next` reads every configured lane's branch that exists, whatever the frontier:
  - **To land.** A lane with unlanded commits and no rejections holds a turn that ended without landing, as when the orchestrator's context was compacted while the lane worked (spec-requirement-9). The plan names its role to land, and names nothing else to do. Applying that plan changes nothing. The orchestrator lands each turn the plan names, then plans again.
  - **To repair.** A lane with rejections has its role woken in its worktree as it stands, to repair them: a producer with their lines among Malformed files, a reviewer with its repair request. Its branch does not move, and its turn commit is its worktree's tip. The plan lists each rejected line. The role's next landing brings both turns' commits.
  - A repair is planned beside the frontier's dispatch, on any frontier but `escalate`. A lane under repair is dispatched for nothing else.
- **Never removed.** A lane with unlanded commits is never moved back, rebuilt, or removed.

**Alternatives:**

- The spec's "keep" option is to merge the pipeline tip into a production lane with unlanded commits and wake it for its frontier work. It loses: the woken producer redoes a turn that already ended, and a review lane would need its commits replayed onto a rebuilt change.
- Stopping `rp next` with an error, as `rp review` does today, loses: the orchestrator would read the error's text for the role to land, which the plan can name.
- Rebuilding a review lane under repair from the tip and replaying its commits loses. The repaired thread's heading names the change its reviewer read, and after a replay that change is no longer the lane's, so the approval could not be certified (design-doc-decision-7).

**Trade-offs:** A plan can hold only landings, so the orchestrator plans twice in that step. A lane under repair waits a step for its frontier work.

**Claims:**

- observed: probe P1 (`2-design-doc/design-doc/probes.txt`, output of `probes.sh` beside it). `git cherry` lists a lane's commit `+` before the lane is merged, and lists nothing once the lane is merged or fast-forwarded.
- observed: the spec's `1-spec/spec/loop-edges.txt`:
  - E2: `rp review` stops on a lane holding commits the pipeline lacks, naming them.
  - E1a and E1b: a lane's rejected candidate and rejected review thread reach the pipeline branch today.
- observed: reading `agents/*.md` and `templates/reviewer-first.md`. A lane's producer commits as it ends its turn, and a reviewer is asked to commit its review. A role that meets a blocker reports it and stops.
- assumed: the tests in Verification.

design-doc-decision-6: Applying records each woken role's turn, and the step, in the pipeline worktree

**Serves:** spec-requirement-8, spec-requirement-10, spec-requirement-11, spec-requirement-17, spec-requirement-20

**Decision:**

- **Step record.** Applying writes a step record among the pipeline worktree's Prepared files. Its name and encoding are the implementer's. It holds:
  - for each role a step woke, its latest turn: its worktree, its branch, its turn commit, its phase, and for a review lane its change. A later step that wakes the role replaces its turn.
  - the phases the last applied step woke;
  - the phases complete when that step was applied;
  - the phases that step's landings have reported.
- **Turn commit.** A role's turn commit is the tip of its worktree when applying writes its assignment. It is also the assignment's Turn commit. On a reviewer's review turn, that tip is the change.
- **Readers.** `rp land` reads the role's turn (design-doc-decision-7) and adds the phases it reports (design-doc-decision-8). `rp next` reads the phases the last step woke, for `phase-started` (design-doc-decision-10).
- **Only applying.** Only applying writes a turn. A plan applied while a role it woke still runs would replace that role's turn, so the loop applies no plan before then (design-doc-decision-11).

**Alternatives:**

- Reading the turn commit from the assignment's text loses: an assignment is wording, and a reviewer's names its turn commit only in the heading it asks the reviewer to write.
- Deriving the turn from Git loses: two roles woken into the pipeline worktree in one step share its branch, so their commits cannot be told apart.
- A record per role beside each assignment loses: a lane's record goes with its worktree at consolidation, and with it what that step woke.

**Trade-offs:** Landing depends on a file outside the tree. A role the loop woke before this change has no recorded turn, and `rp land` stops for it.

**Claims:**

- observed: the spec's `1-spec/spec/loop-walk.txt`, Step 1 and Step 5 landings. The orchestrator reads each turn commit from the assignment, and takes a reviewer's from `rp review`'s output.
- observed: the spec's `1-spec/spec/loop-edges.txt` E7: one step writes `spec-producer`'s and `design-doc-producer`'s assignments in the same pipeline worktree.
- observed: reading `state.md` § Names. Prepared files sit beside a worktree's assignments, in the folder `git rev-parse --git-path rp/` resolves to there.
- assumed: the `rp land` and `rp next` tests in Verification.

design-doc-decision-7: `rp land` verifies, validates, brings, certifies, and commits a turn, or lands nothing

**Serves:** spec-requirement-11, spec-requirement-12, spec-requirement-14, spec-requirement-16, spec-acceptance-criterion-19, spec-acceptance-criterion-20, spec-acceptance-criterion-21, spec-acceptance-criterion-22, spec-acceptance-criterion-23, spec-acceptance-criterion-25, spec-acceptance-criterion-27

**Decision:** `rp land <pipeline folder> --role <role>` reads the role's recorded turn, then:

- **Verify.** It checks that the role's branch exists and descends from its turn commit. Otherwise it stops, naming the role's worktree and the reason.
- **Unlanded files.** A turn's unlanded files are the pipeline files its unlanded commits change:
  - for a role in the pipeline worktree, the commits after its turn commit;
  - for a lane, its unlanded commits (design-doc-decision-5), an earlier turn whose landing stopped included.
- **Validate.** It reads each unlanded file as the pipeline branch will hold it after the landing, under the pipeline's run configuration, and validates it as `rp check` does. A rejected file stops landing, naming each such file with `rp check`'s reason.
- **Bring.**
  - Production lane: its branch is merged into the pipeline branch.
  - Review lane: its commits after its change are cherry-picked onto the pipeline branch, and none of the commits that built the change.
  - Role in the pipeline worktree: its commits are on the pipeline branch already.
- **Certify.**
  - The role's artifact or candidate is certified at its turn commit when it exists, as `rp stamp` certifies one today.
  - Each approval among the unlanded files is certified at the commit its reviewer's last heading names, as `rp stamp` certifies one today. Its approved commit is the pipeline commit that holds it.
  - When that pipeline commit's code is not the named commit's, the approval lands uncertified. `rp check` reads it as stale, and the lane reviews again.
- **Commit.** It commits the certifications on the pipeline branch, shaped by design-doc-decision-3, and leaves nothing of the landing uncommitted. A landing that changes no certification and brings no commit makes no commit.
- **Report.** It prints the phases the landing made complete (design-doc-decision-8).
- **Nothing on a stop.** Every check comes before the first write. A stop, a conflict included, leaves the pipeline branch, the pipeline worktree, and every certification as they were.

**Alternatives:**

- Validating the whole pipeline after the landing loses: a rejected file the landing did not bring, such as an intent, would stop every role's landing. That file is the frontier's to dispatch (spec, Considered).
- Validating only the files a lane's last turn changed loses: an earlier turn's rejected file, if left unrepaired, would land unvalidated.
- Certifying in the lane's worktree before merging, as the loop does today, loses: a review lane's worktree holds no run configuration to certify against (`loop-edges.txt` E1b). The two kinds of lane would then certify in two places.
- Stopping on an approval whose code is no longer its change's, as `rp stamp` does, loses: that lane would stop at every landing. This happens when the lane's landing stops, the implementer then changes the code, and the lane's repair lands after it.

**Trade-offs:** A role in the shared pipeline worktree validates every commit after its turn commit, including another role's (Risks).

**Claims:**

- observed: reading `rp.mjs` `cmdStamp`:
  - A certification pins the required inputs at `--at`'s tree.
  - An approval's `--at` must be its reviewer's last heading's commit, and `HEAD`'s code must equal that commit's.
  - Stamping twice writes nothing.
- observed: the spec's `1-spec/spec/loop-edges.txt` E1a, E1b, and E5, and `loop-walk.txt`'s landings. Rejected files land today, a repeated stamp leaves nothing to commit, and landing takes the orchestrator several commands per lane.
- observed: reading `rp.mjs` `approvalOf` and `staleInputs`: an approval without a certification is stale on its required inputs, and its lane is not approved.
- assumed: the `rp land` tests in Verification.

design-doc-decision-8: One definition of a complete phase, reported by `rp check --json` and by `rp land`

**Serves:** spec-requirement-17, spec-requirement-18, spec-requirement-19, spec-acceptance-criterion-28, spec-acceptance-criterion-29

**Decision:**

- **Complete.** `rp` computes which phases from 1 through the target are complete, as spec-requirement-18 defines it, from the state `rp check` computes. On an `INVALID` frontier no phase is complete.
- **Check.** `rp check --json` adds the complete phases' numbers, in order, wherever it reports `phases` (Interfaces).
- **Land.** `rp land` reports each phase that is complete after the landing. It skips a phase that was complete when the step's turns began, which is when the step was applied, or that an earlier landing of the step reported. The step record holds both (design-doc-decision-6).

**Alternatives:**

- Comparing with the pipeline just before the landing loses spec-acceptance-criterion-28's last case. A role in the pipeline worktree commits its answer before its turn lands, so its phase is already complete before the landing.
- Comparing only with the step's start loses spec-requirement-17: two landings of one step that each leave a phase complete would both report it. One `INVALID` thread between two producers wakes both in one step (`loop-edges.txt` E7), and so does the implementer's answer landing beside a review lane's repair.
- Reporting completeness in `rp check`'s text output loses: spec-requirement-19 asks for it in `--json`, and no consumer reads the text for it.

**Trade-offs:** `rp land` writes to the step record. A phase that becomes incomplete and complete again within one step is reported once.

**Claims:**

- observed: the spec's `1-spec/spec/check-json-today.txt`: `rp check --json` reports each phase's state and no completeness.
- observed: reading `.rp.md`. `phase-completed` sets the issue's status to the phase that completed, and `run-ended` acts when the run completed through phase 4.
- assumed: the `rp check` and `rp land` tests in Verification.

design-doc-decision-9: Each changed input names the commit at which it was as its artifact last landed

**Serves:** spec-requirement-21, spec-acceptance-criterion-31

**Decision:**

- In a producer's or the implementer's assignment, each changed input is `<path> — changed since <commit>`, and each input names its own commit.
- That commit is the latest commit of the role's branch at which the input has the identity its artifact's certification pins. When the certification pins no identity for the input, it is the latest commit at which the input is absent.
- The diff from that commit to the turn commit shows only what changed since the artifact last landed, also after a landing that left the artifact unchanged.

**Alternatives:**

- Today's commit, the last one that changed the artifact, loses. A landing that left the artifact unchanged made no commit to it, so the diff shows changes the artifact already absorbed (`loop-edges.txt` E4).
- Recording the turn commit in the certification loses: it changes the certification format, which spec-exclusion-3 keeps.
- The turn commit of the artifact's last landing, from the step record, loses: the record keeps only each role's latest turn, and a turn can be woken again without landing.

**Trade-offs:** Applying walks each changed input's history once per assignment.

**Claims:**

- observed: reading `rp.mjs` `cmdAssign`: one commit serves every changed input, the last one in the role's worktree that changed the artifact.
- observed: the spec's `1-spec/spec/loop-edges.txt` E4. A design doc whose turn left it unchanged when the spec went from v1 to v2 is woken for v3 with the commit before v2, though its certification pins v2.
- assumed: the test of spec-acceptance-criterion-31 in Verification.

design-doc-decision-10: The plan names every hook moment of the step, and lane branches fire none

**Serves:** spec-requirement-10, spec-acceptance-criterion-13, spec-acceptance-criterion-14, spec-acceptance-criterion-15, spec-acceptance-criterion-17, spec-acceptance-criterion-18

**Decision:**

- **Hooks named.** The plan names these hooks, each with what its instructions need:
  - `before-creating-worktree` and `after-creating-worktree` for each worktree it creates, and `before-removing-worktree` and `after-removing-worktree` for each worktree it removes. Each names the worktree's path and the role it is for.
  - `before-terminating-agent` and `after-terminating-agent` for each role it terminates, naming the role.
  - `before-spawning-agent` and `after-spawning-agent` for each role it wakes, naming the role. The role's resource names are on its wake entry. These fire only when the orchestrator spawns the role.
  - `phase-started` for each phase of the roles it wakes that the last applied step woke no role of (design-doc-decision-6), naming the phase.
  - `before-merging-lanes` and `after-merging-lanes` for each lane role it wakes, naming the role. These fire around that role's `rp land`.
  - No branch hook.
- **Landing hooks.** `phase-completed` fires for each phase `rp land` prints. The firing order is design-doc-decision-11's.
- **Prose.** `lifecycle-hooks.md` states two facts:
  - A worktree's hooks know which role it is for, and the pipeline worktree is for every role without a lane.
  - `before-creating-branch` and `after-creating-branch` fire only for the branches triage creates.
- **No migration.** No hook is renamed or merged, so a project's hook blocks need no migration.

**Alternatives:**

- Branch hooks for lane branches lose as the spec records: intent-constraint-3 lets them go, and no project writes them.
- Firing the agent hooks before applying, the reading of intent-constraint-3's sentence on its own, loses as the spec records. A reset would run before `after-creating-worktree` starts the environment.
- The orchestrator judging `phase-started`, as today, loses: after a compaction it has no memory of the last step.
- `phase-started` on every step that wakes a phase loses spec-acceptance-criterion-17, which has it run once and again only on resumption.

**Trade-offs:** The plan names moments a project may not configure. `phase-started` depends on the step record, so a run that begins after another stopped mid-step may not fire it (Risks).

**Claims:**

- observed: reading `lifecycle-hooks.md`, `.rp.md` § Lifecycle hooks, and `triage.md` § 5:
  - every hook's moment;
  - of a step's hooks, this repository writes `after-creating-worktree`, blocking, and `phase-completed`, plus three hooks whose moments fall outside a step;
  - today every branch and worktree the orchestrator creates fires its creating hooks.
- assumed: the plan tests and the loop inspection in Verification.

design-doc-decision-11: The orchestrator's step is `rp next`, the hooks, `rp next --apply`, its tool, and `rp land`

**Serves:** spec-requirement-4, spec-requirement-8, spec-requirement-15, spec-requirement-22, spec-requirement-23, spec-acceptance-criterion-11, spec-acceptance-criterion-16, spec-acceptance-criterion-26, spec-acceptance-criterion-32

**Decision:** `loop.md` § One step holds these responsibilities, in this order:

1. **Plan.** Run `rp next`. When the plan names turns to land, land each as in step 6, then plan again.
2. **Terminate.** Terminate each role the plan names, firing `before-terminating-agent` and `after-terminating-agent` around each.
3. **Apply.** Fire the `before-` worktree hooks, then run `rp next --apply`. Then fire the `after-` worktree hooks and `phase-started`.
4. **Dispatch.** `escalate` and `complete` go to owner escalation and close-out, as today. Fix each rejected file no role writes, as phase 0 records it, outside the step (spec-exclusion-2).
5. **Wake.** Spawn or wake each woken role in the worktree the plan names, on its model name resolved for the tool, with `Read your assignment: <its assignment path>.`. Fire `before-spawning-agent` and `after-spawning-agent` around each spawn. A fresh instance is spawned when the plan says so, and as `loop.md` says today otherwise.
6. **Land.** When a role ends its turn, land it:
   - a lane's role: `before-merging-lanes`, `rp land`, then `after-merging-lanes`;
   - any other role: `rp land` alone.

   Then fire `phase-completed` for each phase `rp land` printed. When `rp land` stops, nothing landed, so `after-merging-lanes` does not fire. A stop on rejected files is repaired by the next step (design-doc-decision-5), and any other stop goes to the owner. A role that reports a blocker is not landed: repair what it names, and the next step wakes it for the same work.
7. **Repeat.** Once every role the step woke is landed or has reported a blocker, go to 1.

Further rules:

- **Blocking failure.** A blocking `before-` hook that fails keeps its action from happening and stops the run through close-out.
- **Apply failure.** A failed `--apply` is repaired and run again, without firing its `before-` hooks again. The `after-` hooks fire once it completes.
- **Commands.** In the step, the orchestrator runs no Git command, passes only paths `rp` printed, and opens no thread or assignment.
- **Compaction.** `SKILL.md`'s note for a compacted session: find the roles still running, land each when it ends, and only then run `rp next`.
- **References.** `health-monitoring.md`'s step for a step that never lands lands through `rp land`, and `tools/*.md` § Models resolve the model name the plan names.

**Alternatives:**

- `rp` refusing to apply while a role runs loses: only the tool knows whether a role still runs.
- Landing a blocked turn loses spec-requirement-15: it would certify work that did not happen.
- `rp` committing the orchestrator's fix of a rejected phase-0 file loses: spec-exclusion-2 keeps fixing a rejected intent or later input outside the step.

**Trade-offs:** spec-requirement-8 rests on the loop's procedure alone (Risks).

**Claims:**

- observed: reading `loop.md`, `SKILL.md`, `health-monitoring.md`, and `tools/*.md`:
  - today's step, the compaction note, and the tick step for a step that never lands;
  - the spawn, seat, wake, turn-end, termination, and model mechanics of each tool.
- assumed: the inspection of the skill and the end-to-end flow in Verification.

## Interfaces

### Commands

```text
node rp.mjs check <pipeline folder> [--ref <commit>] [--json]
node rp.mjs pipelines <pipelines folder root> --base <artifact base branch> [--issue <ref>] [--json]
node rp.mjs next <pipeline folder> [--apply]
node rp.mjs land <pipeline folder> --role <role>
```

- `<pipeline folder>` of `next` and `land` is in the pipeline worktree: the worktree that has the pipeline branch checked out.
- `<role>` is a role the step record holds: `spec-producer`, `design-doc-producer`, `implementer`, `spec-producer-<lane>`, `design-doc-producer-<lane>`, or `reviewer-<lane>`.
- Every stop prints `rp: <reason>` to stderr and exits 1. `rp next` and `rp land` write nothing when they stop. `rp next --apply` keeps the actions it completed before its stop.
- `rp next` writes no ref, worktree, file in a worktree, assignment, or step record. Like `rp check`, it may add unreferenced objects to the object store.
- `rp next --apply` prints the plan it applies.
- `rp land` prints one line per phase its landing made complete, in phase order, and nothing when it made none. When it stops on rejected files, it names each file with its reason, as `rp check` prints them.

### The plan

The plan is printed in a line grammar that `scripts/README.md` states. A value that may hold spaces, such as a resource name or a reason, ends its line.

| Entry | Holds | Present |
| --- | --- | --- |
| Frontier | Each frontier line, as `rp check` prints it | Always |
| Turn to land | A lane's role | For each lane holding unlanded commits and no rejections; the plan then holds only the frontier and these |
| Lane rejection | The lane's role and an `INVALID <path>: <reason>` line | For each rejection of a lane under repair |
| File to fix | An `INVALID <path>: <reason>` line | For each rejected pipeline file no role writes |
| Termination | A role | For each production lane whose worktree or branch the plan removes |
| Worktree removal | Its absolute path, its role | |
| Branch | The branch; created, moved, or deleted; where it is left: a commit, or the review change built from the pipeline tip | |
| Worktree creation | Its absolute path, its branch, its role | |
| Assignment | Its absolute path, its role | For each woken role |
| Wake | The role; its profile; its lane, or none; its model name, or none; its phase; its worktree's absolute path; its assignment's absolute path; each resource name; whether a fresh instance is required | For each woken role |
| Hook | The hook, and the worktree path and role, the role, or the phase it concerns | design-doc-decision-10 |

### `rp check --json`

- It gains `complete`: the numbers of the complete phases from 1 through the target, ascending. It is present whenever `phases` is.
- Everything else is unchanged.

### Conventions data, version 9

```json
{
  "conventions": 9,
  "worktree-folder-root": ".worktrees",
  "landing-commit": "{subject} (orchestrator)",
  "commit-format": "…", "guardrails": {}, "resources": {}, "agents": {}, "variables": {}
}
```

- `worktree-folder-root`, required: a non-empty string. Relative paths resolve against the main checkout's root, and a branch's worktree is `<folder>/<branch>`.
- `landing-commit`, optional: a non-empty string holding `{subject}` and no other placeholder.
- `.rp.local.md` may hold either key, replacing the committed one.
- Every other key is as in version 8. A malformed or missing entry stops `next` and `land`, naming the file and the entry.

### Assignment

- **Turn commit.** The tip of the role's worktree when applying writes the assignment.
- **Changed inputs.** Each is `<path> — changed since <commit>`, with `<commit>` as design-doc-decision-9 defines it, per input.
- **Writer.** `rp next --apply` writes the assignment at the path `git rev-parse --git-path rp/<profile>.md` gives in the role's worktree. A reviewer's later-turn diff sits beside it, as today.

### Step record

- **Location.** Among the pipeline worktree's Prepared files.
- **Contents.** It holds what design-doc-decision-6 lists.
- **Writers.** Applying writes it, and landing adds its reported phases.

### `run-config.md`

Format 8, unchanged.

### Post-change coherence

Narrowed:

- `rp`'s command line loses `assign`, `review`, and `stamp`, and with them `--at` and `review`'s output. Their consumers change with this design: `loop.md`, `state.md`, `load.md`, `templates/README.md`, `tools/*.md`, `docs/`, and the tests.
- A `.rp.md` at version 8 no longer loads. `load.md` sends it through migration (changelog § 9).
- Lane branches fire no branch hook.
- The loop step holds no Git command, path, or read of a thread or assignment.

Left without a purpose:

- `stamp`'s and `review`'s command-line handling, and `scripts/README.md` § `stamp`, § `review`, and § `assign`, are removed. Their checks are kept inside landing and applying.
- `state.md` § Certification's landing procedure for the orchestrator is replaced by `rp land`.
- The tests' certifications built through `rp stamp` are built directly.

Widened:

- `rp check --json` gains `complete`. Its consumers are the report entry, close-out's report of completed phases, and a resumed run. Each now reads complete phases where it reads phases; no consumer breaks on an added key.
- The conventions data admits two keys. `rp` validates them, setup and migration write them, and `load.md`'s completeness check reads `worktree-folder-root` as the required Worktree folder root.
- A changed input's commit is now one per input. The producers' and the implementer's Respond step ("Diff each of the Changed inputs since the commit named") reads it unchanged.
- A reviewer's turn commit can sit above its change, on a repair in place. The repair request names it as the worktree's tip, and the first-turn and later-turn requests are not used for such a turn.
- Landing now admits a lane whose earlier turn's landing stopped, and brings both turns' commits.

## Dependencies

- Node's built-in modules only. No package is added.
- Git 2.38 or later, as today, for `git merge-tree --write-tree`. Applying and landing also use Git's worktree, branch, merge, and cherry-pick operations.
- Internal:
  - `rp`'s state, frontier, and validation functions, shared with `check`;
  - the review lane construction and assignment writing that `review` and `assign` hold today;
  - the certification that `stamp` writes today;
  - the skill's `templates/`.
- The orchestrator's tool spawns, seats, wakes, terminates, and reports turn ends, as `tools/*.md` documents.

## Failure modes and observability

- **Unreadable inputs.** `next` and `land` stop on everything `rp check` stops on, on missing or malformed conventions data (naming the file and the entry), and on a detached pipeline worktree. The orchestrator reports the message to the owner, and the run stops through close-out.
- **An action of `--apply` fails.** Examples are a path where a worktree belongs, an untracked file in a worktree to remove, uncommitted changes blocking a lane's move, or a Git failure. `--apply` exits 1 naming the action and the reason, and the completed actions stay. Once the orchestrator repairs the cause, `--apply` completes the rest.
- **`rp land` stops.** It stops when:
  - there is no recorded turn for the role;
  - the branch is missing, or does not descend from the turn commit;
  - an unlanded file is rejected;
  - a merge or cherry-pick conflicts.

  It exits 1 naming the cause, and nothing changes. For a lane, the next plan wakes the author to repair the rejected files (design-doc-decision-5). For the pipeline worktree, the frontier's `INVALID` wakes it. On any other stop, the orchestrator reports the message to the owner, and the run stops through close-out.
- **An approval landed uncertified.** `rp check` reports its lane stale, and the next step reviews it again.
- **A blocking hook fails.** Its action does not happen, and the run stops through close-out.
- **Observability.** The plan `rp next` prints, the plan `--apply` prints, the phases `rp land` prints, and `rp check`.

## Verification

- new test at the `rp next` CLI — design-doc-decision-1, spec-acceptance-criterion-1 — Printing a plan changes no ref, worktree, file in a worktree, assignment, or step record.
- new test at the `rp next` CLI — design-doc-decision-2, design-doc-decision-3, design-doc-decision-10, spec-acceptance-criterion-2, spec-acceptance-criterion-4, spec-acceptance-criterion-7, spec-acceptance-criterion-13, spec-acceptance-criterion-14, spec-acceptance-criterion-15 — For each frontier line, the plan names, with every field, the frontier, the worktrees, the branches, the terminations, the assignments, and the woken roles that line dispatches. Lane worktrees sit under the conventions' worktree folder root. The hooks of each moment name their worktree and role. No branch hook is named. `escalate` and `complete` name nothing else.
- new test at the `rp next` CLI — design-doc-decision-2, spec-acceptance-criterion-6 — On an `INVALID` frontier, the plan wakes each role that writes a rejected file, seated in its lane's worktree or the pipeline worktree, and a reviewer with its repair request and no resource. It names each rejected file no role writes.
- new test at the `rp next --apply` CLI — design-doc-decision-4, spec-acceptance-criterion-3, spec-acceptance-criterion-5, spec-acceptance-criterion-8, spec-acceptance-criterion-9 — Applying changes exactly the worktrees, branches, and assignments the plan named, and leaves the pipeline branch and the pipeline worktree's tree as they were. A remaining lane moves forward without a new worktree, and each review lane's change is built from the tip. Applying again changes nothing, and the plan after it has nothing to create, remove, or move.
- new test at the `rp next --apply` CLI — design-doc-decision-4, spec-acceptance-criterion-10 — An application that fails on an action exits 1 naming it and keeps the completed actions. Once the cause is removed, it applies only the rest.
- new test at the `rp next` and `rp land` CLIs — design-doc-decision-5, spec-acceptance-criterion-12, spec-acceptance-criterion-24 — A lane holding unlanded commits is never moved back, rebuilt, or removed. With no rejection, the plan names its role to land, and applying changes nothing. With a rejection, the plan wakes its role in place with the rejected lines, and the later landing brings both turns' commits.
- new test at the `rp land` CLI — design-doc-decision-6, design-doc-decision-7, spec-acceptance-criterion-19, spec-acceptance-criterion-20, spec-acceptance-criterion-21 — Landing a production lane, a review lane, or roles in the pipeline worktree:
  - puts each turn's commits on the pipeline branch, and none that built a review change;
  - certifies at the recorded turn commit, and an approval with the pipeline commit that holds it;
  - commits everything;
  - leaves `rp check` reporting the file fresh or the lane approved.
- new test at the `rp land` CLI — design-doc-decision-7, spec-acceptance-criterion-22, spec-acceptance-criterion-23 — Landing a role whose branch lacks its turn commit, or whose unlanded files include a rejected one, exits 1. It names the worktree and the reason, or each file with `rp check`'s reason. The pipeline branch and every certification stay as they were.
- new test at the `rp land` CLI — design-doc-decision-7 — An approval whose pipeline commit's code differs from its change's lands uncertified, and `rp check` reports its lane not approved.
- new test at the `rp land` CLI — design-doc-decision-3, design-doc-decision-7, spec-acceptance-criterion-25, spec-acceptance-criterion-27 — A landing that changes no certification and brings no commit makes no commit. Every commit a landing makes has the template's shape, or the subject alone without a template.
- new test at the `rp land` CLI — design-doc-decision-8, spec-acceptance-criterion-28 — Each landing prints the phases spec-acceptance-criterion-28 lists.
- new test at the `rp check` CLI — design-doc-decision-8, spec-acceptance-criterion-29 — `--json` reports as complete exactly the phases spec-requirement-18 defines, through the target, and none on `INVALID`.
- new test at the `rp next --apply` CLI — design-doc-decision-9, spec-acceptance-criterion-31 — Each changed input names a commit at which it is as its artifact's certification pins it, or at which it is absent when unpinned. This holds after a landing that left the artifact unchanged too.
- new test at the `rp next` CLI — design-doc-decision-6, design-doc-decision-10, spec-acceptance-criterion-17 — The plan names `phase-started` for a phase on the first step that wakes it and on a step that resumes it, and never on a step applied again. It names the merging-lanes pair for each lane role.
- new test at the `rp next` CLI — design-doc-decision-11, spec-acceptance-criterion-26 — After a turn that was not landed, the plan wakes the same role for the same work, with the same changed inputs and commits.
- new test at the `rp next` and `rp land` CLIs — design-doc-decision-1, design-doc-decision-3, spec-acceptance-criterion-30 — Each command stops on an option outside its own, naming it. Each also stops on conventions data without `worktree-folder-root`, or with a `landing-commit` outside its grammar, naming the file and the entry.
- existing tests `scripts/test/rp/*.test.mjs` for `check`, `pipelines`, the frontier, staleness, threads, lanes, certification, continuation, and reading — design-doc-decision-1 — The computations the new commands share keep their behavior.
- inspection of the migrated `.rp.md` and `changelog.md` § 9 — design-doc-decision-3, design-doc-decision-10, spec-acceptance-criterion-18 — The file is at version 9. The worktree folder root is data with its value unchanged, the landing commit template is present, and every hook block is unchanged under its name.
- inspection of `loop.md`, `SKILL.md`, `state.md`, `lifecycle-hooks.md`, `health-monitoring.md`, and `tools/*.md` — design-doc-decision-10, design-doc-decision-11, spec-acceptance-criterion-10, spec-acceptance-criterion-11, spec-acceptance-criterion-13, spec-acceptance-criterion-14, spec-acceptance-criterion-16, spec-acceptance-criterion-17, spec-acceptance-criterion-26, spec-acceptance-criterion-32 — The step:
  - runs `rp next`, the hooks in spec-requirement-10's order, `rp next --apply`, the tool, and `rp land`;
  - fires each hook once per action, even across a failed apply;
  - stops an action and the run on a failed blocking `before-` hook;
  - lands no blocked turn;
  - in a resumed run, lands the running roles before planning;
  - holds no Git command, computed path, or read of a thread or assignment.
- end-to-end flow on opencode — design-doc-decision-11, spec-acceptance-criterion-32 — An orchestrator following the changed skill runs each kind of step from the plans and landings alone, firing the hooks each plan names.

## Risks

- **A shared pipeline worktree.** A landing validates every commit after its turn commit, including another role's in the same step. One role's rejected file therefore stops the other's landing. The consequence is that the stopped role's certification waits for a later turn of that role.
- **`phase-started` across runs.** A run that stopped mid-step, by cancellation or failure, leaves its step record. The next run's first step fires no `phase-started` for a phase that step woke.
- **Close-out and a lane under repair.** Close-out removes lane branches, including one whose landing stopped. Its commits are lost, and the next run redoes that lane's turn.
- **Applying while a role runs.** Only the loop's procedure keeps the orchestrator from applying a plan before every role the last step woke has ended. Applying earlier replaces that role's turn and assignment, and may move its branch.
- **A blocked lane role with commits.** The plan names its turn to land, and its partial work is certified. This depends on the profiles' blocker rule, under which a blocked role reports and stops.
- **A lane changing a file it does not write.** Landing validates that file and lands it when it is valid.
- **An approval landed uncertified.** It costs its lane one more review turn.
- **A phase completing twice in one step.** A phase that becomes incomplete and complete again within one step is reported once.

## Open assumptions

spec-assumption-1: The plan's entries are all an orchestrator needs to spawn, seat, wake, and terminate each role on opencode and on Claude Code. Read against `tools/opencode.md` and `tools/claude-code.md`, the plan carries every input they name: the worktree path, the profile, the lane, the model name, and the assignment path. The instance title's pipeline slug is the pipeline folder's name — assumed: a step run on each tool from the plan alone.

spec-assumption-2: The hooks intent-context-2 describes need nothing beyond the pipeline, the run, the phase, the role a worktree is for, and a woken role's resources — assumed: running each of them from the plan's entries.
