# State

Everything about a pipeline is computed from its tree at any commit. `rp` — `node <this skill's folder>/scripts/rp.mjs` — computes what this file defines, with these commands:

- `rp check <pipeline folder> [--ref <ref>] [--json]` reports each phase through the target, and with `--json` which are complete, and prints the frontier (§ The frontier). `--ref` reads the pipeline at that commit instead of the working tree.
- `rp pipelines <pipelines folder root> --base <artifact base branch> [--issue <canonical issue reference>]` lists the repository's pipelines, or only the issue's (§ Discovery). Pass the absolute path of the **Pipelines folder root** convention in the main checkout; the artifact base branch comes from the **Artifact storage** convention.
- `rp next <pipeline folder>` prints the plan of the loop's next step and changes nothing: the frontier, the turns to land first, the worktrees and lane branches to create, move, or remove, the roles to terminate, each role to wake with its seat, model, phase, resources, and **Assignment**, and the lifecycle hooks the step fires. With `--apply`, it carries the plan out and records each woken role's turn; applying again repeats nothing done. Each review lane's branch holds a **review base**, the merge-base's tree, on the merge-base, and a **review head** on it, the tip's tree; in both, the pipelines folder root is the tip's without its pipeline folders, plus the pipeline's `0-intent/` and the lane's own threads, so the diff between them is the net change and the lane sees no pipeline but its own view.
- `rp land <pipeline folder> --role <role>` lands a role's turn (§ Certification) and prints the phases its landing made complete.
- `rp thread open`, `reply`, `close`, and `escalate`, and `rp validate`, are the roles': a role writes its threads with the first four (§ Threads) and checks its own files with `rp validate` before it ends a turn, each run as its **Assignment** states.

Every command derives the repository from the path it is given; `check`, `next`, and `land` take the pipelines folder root to be the parent of the pipeline folder, which `next` and `land` take in the pipeline worktree.

`rp check` is the only source of the frontier, which `rp next` prints as `rp check` computes it. When what you see in the tree disagrees with what `rp check` reports, or the frontier names something this skill gives you no way to dispatch, stop and tell the owner the skill has a defect; never work around it.

## Files

Paths are relative to the pipeline folder.

| Path | Contents | Written by |
| --- | --- | --- |
| `config.json` | The pipeline configuration (§ Pipeline configuration) | You |
| `0-intent/intent.md` | The intent (`../entries/intent-format.md`) | You, on the owner's approval |
| `0-intent/constraint-<n>.md`, `0-intent/proposal-<n>.md`, `0-intent/failure-<n>.md` | Later input (`../entries/intent-format.md` § Later input) | You, on the owner's approval |
| `1-spec/spec.md` | The spec | `spec-producer` |
| `1-spec/lanes/<lane>/spec.md` | A production lane's candidate spec | `spec-producer-<lane>` |
| `2-design-doc/design-doc.md` | The design doc | `design-doc-producer` |
| `2-design-doc/lanes/<lane>/design-doc.md` | A production lane's candidate design doc | `design-doc-producer-<lane>` |
| `3-implementation/notes.md` | The implementer's resumption file; the code, tests, and documentation live outside the pipelines folder | `implementer` |
| `threads/<n>-<opener>-<recipient>-<about>.md` | A thread (§ Threads) | Its parties |
| `certification/<path>.json` | The certification of the file at `<path>` (§ Certification) | `rp land` |

The **artifacts** are `spec.md`, `design-doc.md`, and `notes.md`. Later inputs, threads, and the frontier name them `spec`, `design-doc`, and `implementation`, and the intent `intent`. A **candidate** is a production lane's version of the spec or the design doc. The files in this table are the pipeline state; `rp` ignores every other file in the pipeline folder.

## Terms

- **Identity** — the first 12 hexadecimal characters of the git blob id of the whole file: the id Git stores for it, so the working tree and a commit agree.
- **Pin** — `<path>@<identity>`.
- **Later input** — a constraint, proposal, or failure file. Its `target` names the artifacts it targets, each by name with an optional `#<id>`.
- **Required inputs** — what an artifact or an approval consumes:

  | File | Required inputs |
  | --- | --- |
  | `1-spec/spec.md` | `0-intent/intent.md`; every later input targeting it |
  | A spec candidate | `0-intent/intent.md` |
  | `2-design-doc/design-doc.md` | `1-spec/spec.md`; every later input targeting it |
  | A design doc candidate | `1-spec/spec.md` |
  | `3-implementation/notes.md` | `1-spec/spec.md`; `2-design-doc/design-doc.md`; every later input targeting it |
  | A review thread closed `approved` | `0-intent/intent.md`; every later input |

  Candidates are required only while their artifact is missing.

- **Turn commit** — the tip of a role's worktree when `rp next --apply` writes its assignment, before you wake it. The assignment names it, and the role reads its materials at it.
- **Stale** — an artifact or an approved review thread with a required input that its certification leaves unpinned, or pins at an identity that differs from the current one. An approved review thread is also stale when the tip's code differs from its approved commit's by anything other than clean merges of the base branch: `rp check` merges the merge-base into the approved commit with `git merge-tree` and compares the resulting tree with the tip's tree outside the pipelines folder; a conflict outside the pipelines folder or a difference makes it stale. An approval whose approved commit the clone lacks, as after a squash merge, is no approval.
- **Missing** — an artifact whose file is absent; `notes.md` is also missing until its `status` is `done`.
- **Base branch** — `config.json`'s `base-branch`: the branch the pipeline started from, which it takes updates from. **Merge-base** — the merge-base of the inspected tip with the base branch.
- **Net change** — `git diff <merge-base> <tip>` outside the pipelines folder: what the reviewer reads.
- **Owner territory** — what the intent means or demands: its Goal, its constraints, and `0-intent/constraint-<n>.md`. Proposals and reported failures are investigated and adopted or refuted with evidence. Everything after the intent is chosen by a role and settled between roles. An owner's answer is a constraint or a proposal, as the owner rules, whose `origin` names the thread it answers and whose `target` names the disputed artifact or clause.

## Frontmatter

The values `rp` reads from a file you or a role writes are its frontmatter: YAML between `---` lines at the top of the file, one `<key>: <value>` per line, each value text on one line. Quote a value that starts with `#` or another YAML indicator, or holds ` #` or `: `, as in `issue: "#368"`; `rp check` reports any other YAML as malformed.

- The intent: its origins (`../entries/intent-format.md` § Origins).
- A later input: `target` and `origin` (`../entries/intent-format.md` § Later input).
- `notes.md`: `status`.
- A thread: its header (§ Threads).

The pipeline configuration, the spec, the design doc, and the candidates carry no frontmatter.

## Certification

`rp land` alone writes `certification/<path>.json`, `rp`'s certification of the artifact or approved review thread at `<path>`: each required input pinned at its identity in the turn commit's tree, and on an approval its approved commit. **Landing** a role's turn is one command, `rp land <pipeline folder> --role <role>`. It verifies the turn's commits are on the role's branch, and validates the pipeline files they change as `rp check` will read them on the pipeline branch. It brings a production lane's commits onto the pipeline branch by merge, and a review lane's commits after its review head by cherry-pick. It certifies the role's artifact, when it exists, at its turn commit, whether or not the turn changed it, and every review thread the turn closed `approved` at the commit its reviewer's last heading names, the review head on a review turn. It commits everything. The approved commit is the pipeline commit that holds the approval; an approval whose code there is not the review head's lands uncertified, so its lane reviews again. A malformed file, a conflict, or a branch that lacks the turn commit stops it, and nothing lands.

## Threads

A thread is the conversation between two roles about one artifact, in one file: `threads/<n>-<opener>-<recipient>-<about>.md`. Roles write threads with `rp thread`, which numbers a new one past the highest number in the role's `threads/`; threads opened in parallel lanes may share a number. The file name matches the header.

Its header is its frontmatter; only a thread to `owner` has `cites`:

```yaml
---
status: open | approved | resolved | withdrawn | escalated | answered
opener: <role>
recipient: <role>
about: intent | spec | design-doc | implementation
cites: <thread path | evidence path>
---
```

- **Roles** — a role's name is `<profile>[-<lane>]`: `spec-producer`, `design-doc-producer`, `implementer`, `owner`, the person, and `reviewer-<lane>` for a review lane. Production lanes open no threads: a thread whose opener or recipient is `spec-producer-<lane>` or `design-doc-producer-<lane>` is malformed. Roles are validated by this grammar, never against the configuration, so a removed lane's threads stay readable. `about` and `recipient` pair as `intent`–`owner`, `spec`–`spec-producer`, `design-doc`–`design-doc-producer`, `implementation`–`implementer`. The opener is any role but `owner`.
- **Messages** — in the body, each headed `## <role> — <commit>`, written by the opener, the recipient, or, for an owner's answer, by you as `owner`.
- **Awaits** — an `open` thread awaits its opener when its recipient wrote the last message, and its recipient otherwise.
- **Status** — the opener closes a review thread `approved` and any other `resolved`, or either `withdrawn`. `escalated` is only the status of a thread to `owner` about `intent`, which a role opens for a disagreement on what the intent means or demands, citing the thread it comes from, or for evidence that every kind of approach fails an intent goal or constraint, citing that evidence; you close it `answered` once the owner's answer lands (`loop.md` § Owner escalation). A disagreement about a derived requirement or a design decision has no status: it resolves inside its thread by observation.
- **Review thread** — a thread a review lane opens to `implementer` about `implementation`. A review lane is **approved** when its highest-numbered review thread is `approved` and fresh.

## Pipeline configuration

The pipeline configuration is `config.json` at the pipeline folder root, one JSON object in the schema of `../../scripts/README.md` § `config.json`: the configuration the tree is produced under, and everything `rp` reads about the pipeline.

Record it at every run start from the conventions as they stand then, `.rp.local.md`'s overrides applied, and at no other moment from them:

- `worktree-folder-root`, `commit-format`, `guardrails`, `resources`, and `variables`: what the conventions state, replacing what an earlier run start recorded. A convention they do not set is absent.
- `landing-commit-format`: the template of the commits `rp land` makes, holding `{subject}` where each commit's subject goes, as the Commit format convention has your commits read; absent when it says nothing of them.
- `target-phase`: the phase the run continues through, 1 to 4.
- `base-branch`: the branch of the unmerged pipeline it started from, else the artifact base branch. Fetch and fast-forward it to its upstream before branching from it or merging it into the pipeline branch.
- `lanes` and `models`: the lanes, briefs, models, and subagent models the owner confirmed.
- Keep `target-phase`, `base-branch`, `lanes`, and `models` as they are unless the owner asks to change them, while confirming the run or during it.
- `owner-directions`: the owner's directions for the run, one entry per direction. Keep every earlier entry.

Copy each text and value character for character as the conventions write it, its placeholders unexpanded: a guardrail's rule, a resource's text, the commit format, a lane's brief, the worktree folder root, and each variable's template. Record every guardrail and resource under its name, with the profiles it binds. Never summarize or reword.

A profile's lanes are production lanes for `spec-producer` and `design-doc-producer`, review lanes for `reviewer`. A lane without a brief covers its profile's whole scope. Lane ids start with a lowercase letter or digit and continue with those or hyphens. Without a `reviewer` lane, the review runs one lane, `default`, with no brief. A configuration may also declare `default` itself, with or without a brief, alongside other review lanes.

`config.json` remains with a merged pipeline, holding the conventions of its last run start. It does not say whether a run is in progress; to know that, check which roles are running through your tool's mechanics. Write and commit every configuration change before acting on it. The commit that drops a lane also removes its candidate folder and closes a review lane's open threads `withdrawn`. Terminate the roles working under a changed lane.

## Names

- **Pipeline slug** — the pipeline's identifier, derived from its issue per the **Pipeline slug** convention: one path segment, a valid git ref, without `_`. A new pipeline's slug names no other pipeline of the issue and no folder in the pipelines folder root of the commit its branch starts from: while it names one, it appends `-2`, `-3`.
- **Pipeline folder** — `<pipelines folder root>/<pipeline slug>/`. A folder of the pipelines folder root is a pipeline folder when it holds `config.json`; anything else in the root, such as a project's pipeline tooling, is not a pipeline.
- **Pipeline branch** — where the pipeline's commits land: the **Pipeline branch format** convention applied to the slug; work on a merged pipeline appends `_<n>`.
- **Lane branches** — `<pipeline branch>-<artifact>-<lane>` for a production lane, `<artifact>` being `spec` or `design-doc`; `<pipeline branch>-review-<lane>` for a review lane, at the review head built from the pipeline tip. `rp next --apply` creates, moves, and removes them, each with its worktree at `<worktree folder root>/<lane branch>`.
- **Assignment folder** — the folder `git rev-parse --git-path rp/` resolves to in a worktree: inside its private git directory, outside the tree. It holds what is prepared for the roles seated there: their assignments, the diff `rp next --apply` writes for a reviewer's later turn, and your scratch about them.
- **Assignment** — `<profile>.md` in the assignment folder of the role's worktree: the role's template, filled by `rp next --apply`. No two instances of one profile share a worktree.
- **Turn record** — `rp`'s own record of each woken role's turn and of the step's phases, which `rp next --apply` writes and `rp land` reads: `turns.json` in the pipeline worktree's assignment folder.
- **Instance names** — `<pipeline slug> <profile>[ <lane>]`.
- **Supporting folders** — a role's evidence folder: `1-spec/spec/`, `2-design-doc/design-doc/`, and `3-implementation/notes/` beside their artifacts; `<phase folder>/lanes/<lane>/<artifact>/` for a candidate's producer.
- **Ids** — `<prefix>-<word>-<n>`: the prefix names the artifact — `intent`, `spec`, `design-doc` — and the word the concept. An item is declared by the line `<id>: <text>`; its content follows until the next declaration or heading. The intent originates `constraint`, `context`, and `proposal`, plus `intent-goal` for its Goal section; the spec `requirement`, `acceptance-criterion`, `exclusion`, and `assumption`; the design doc `decision` and `assumption`. An id is never renumbered or reused.

## The frontier

`rp check <pipeline folder>` reads `config.json` and prints the frontier: the first of these that holds, one line per action.

1. A malformed pipeline file → `malformed <path>: <reason>`. Nothing is computed from a malformed file.
2. A thread with `status: escalated` → `escalate <thread>`.
3. The lowest phase whose role has work — a thread awaiting the role, in any phase, or its artifact missing or stale, in a phase through the target. `<artifact>` is the artifact's name:
   - production lanes declared and the artifact missing → `produce <artifact> <lane>` for each candidate missing and `respond <artifact> <lane>` for each candidate stale, else `consolidate <artifact>`;
   - the artifact missing → `produce <artifact>`;
   - the artifact stale, or a thread awaiting its owner → `respond <artifact>`;
   - phase 4 → `review <lane>` for each lane not approved or with a thread awaiting its reviewer.
4. Otherwise → `complete`.

Below the frontier, `rp check` lists the threads awaiting each woken role and the changed inputs of each stale artifact. A missing or malformed configuration, a certification it cannot read, a base branch that does not resolve, or no merge-base stops the command.

## Discovery

Every live pipeline is a pipeline folder at some branch tip; every merged one is in the artifact base branch's tree. After `git fetch`, `rp pipelines --issue` finds the pipelines for an issue, reading only each pipeline's intent:

1. Collect the tree id of every pipeline folder at each branch tip.
2. Keep the pipelines whose tree id differs from every id that folder ever had in the artifact base branch's history: those are the live ones.
3. Read their `0-intent/intent.md` and the artifact base branch's. An intent that is missing, or that `rp check` would report malformed, stops the command, naming the intent and the reason.
4. Keep those whose intent's `issue` names the issue.

Branch and folder names are not used to find pipelines; only the intent's origins are. `rp check --ref` then reads each live pipeline at its tip.
