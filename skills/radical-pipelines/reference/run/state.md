# State

Everything about a pipeline is computed from its tree at any commit. `rp` — `node <this skill's folder>/scripts/rp.mjs` — computes what this file defines, with four commands:

- `rp check <pipeline folder> [--ref <ref>] [--json]` reports each phase through the target and prints the frontier (§ The frontier). `--ref` reads the pipeline at that commit instead of the working tree.
- `rp stamp <file> --at <turn commit>` certifies a landed file (§ Certification).
- `rp pipelines <pipelines folder root> --base <artifact base branch> [--issue <canonical issue reference>]` lists the repository's pipelines, or only the issue's (§ Discovery). Pass the absolute path of the **Pipelines folder root** convention in the main checkout; the base branch comes from the **Artifact storage** convention.
- `rp review <pipeline folder> --lane <lane> [--json]` builds a review lane's branch, `<pipeline branch>-review-<lane>`, from the tip of the pipeline branch checked out where the pipeline folder is: a **review base**, the base's tree, on the base, and a **change** on it, the tip's tree; in both, the pipelines folder root is the tip's without its pipeline folders, plus the pipeline's `0-intent/` and the lane's own threads, so the diff between them is the net change, the root's tooling stays, and the lane sees no pipeline but its own view. It builds them from commits alone, never from a worktree. It moves the branch, and its worktree when one has it checked out, to the change, and prints the `branch`, the review `base`, and the `change`. It stops while the lane branch holds commits the pipeline branch lacks.

Every command derives the repository from the path it is given; `check` and `stamp` take the pipelines folder root to be the parent of the pipeline folder.

`rp check` is the only source of the frontier. When what you see in the tree disagrees with what `rp check` reports, or the frontier names something this skill gives you no way to dispatch, stop and tell the owner the skill has a defect; never work around it.

## Files

Paths are relative to the pipeline folder.

| Path | Contents | Written by |
| --- | --- | --- |
| `run-config.md` | The run configuration (§ Run configuration) | You |
| `0-intent/intent.md` | The intent (`../entries/intent-format.md`) | You, on the owner's approval |
| `0-intent/constraint-<n>.md`, `0-intent/proposal-<n>.md`, `0-intent/failure-<n>.md` | Later input (`../entries/intent-format.md` § Later input) | You, on the owner's approval |
| `1-spec/spec.md` | The spec | `spec-producer` |
| `1-spec/lanes/<lane>/spec.md` | A production lane's candidate spec | `spec-producer-<lane>` |
| `2-design-doc/design-doc.md` | The design doc | `design-doc-producer` |
| `2-design-doc/lanes/<lane>/design-doc.md` | A production lane's candidate design doc | `design-doc-producer-<lane>` |
| `3-implementation/notes.md` | The implementer's resumption file; the code, tests, and documentation live outside the pipelines folder | `implementer` |
| `threads/<n>-<opener>-<owner>-<artifact>.md` | A thread (§ Threads) | Its parties |
| `certification/<path>.json` | The certification of the file at `<path>` (§ Certification) | `rp stamp` |

The **artifacts** are `spec.md`, `design-doc.md`, `notes.md`, and the candidates. These files are the pipeline state; `rp` ignores every other file in the pipeline folder.

## Terms

- **Identity** — the first 12 hexadecimal characters of the git blob id of the whole file: the id Git stores for it, so the working tree and a commit agree.
- **Pin** — `<path>@<identity>`.
- **Later input** — a constraint, proposal, or failure file. Its `target` names the artifacts it targets, each as an artifact path with an optional `#<id>`.
- **Required inputs** — what an artifact or an approval consumes:

  | File | Required inputs |
  | --- | --- |
  | `1-spec/spec.md` | `0-intent/intent.md`; every later input targeting it |
  | A spec candidate | `0-intent/intent.md` |
  | `2-design-doc/design-doc.md` | `1-spec/spec.md`; every later input targeting it |
  | A design doc candidate | `1-spec/spec.md` |
  | `3-implementation/notes.md` | `1-spec/spec.md`; `2-design-doc/design-doc.md`; every later input targeting it |
  | A review thread closed `approved` | `0-intent/intent.md`; every later input |

  Candidates are required only while their root is missing.

- **Turn commit** — the tip of a role's worktree when you wake it. The assignment names it, and the role reads its materials at it.
- **Stale** — an artifact or an approved review thread with a required input that its certification leaves unpinned, or pins at an identity that differs from the current one. An approved review thread is also stale when the tip's code differs from its approved commit's by anything other than clean merges of the base: `rp check` merges the current base into the approved commit with `git merge-tree` and compares the resulting tree with the tip's tree outside the pipelines folder; a conflict outside the pipelines folder or a difference makes it stale. An approval whose approved commit the clone lacks, as after a squash merge, is no approval.
- **Missing** — an artifact whose file is absent; `notes.md` is also missing until its `status` is `done`.
- **Base branch** — the artifact base branch of the **Artifact storage** convention: where pipelines start. **Base** — the merge-base of the inspected tip with `run-config.md`'s `base`.
- **Net change** — `git diff <base>...<tip>` outside the pipelines folder: what the reviewer reads.
- **Owner territory** — what the intent means or demands: its Goal, its constraints, and `0-intent/constraint-<n>.md`. Proposals and reported failures are investigated and adopted or refuted with evidence. Everything after the intent is chosen by a role and settled between roles. An owner's answer is a constraint or a proposal, as the owner rules, whose `origin` names the thread it answers and whose `target` names the disputed artifact or clause.

## Frontmatter

The values `rp` reads from a file you or a role writes are its frontmatter: YAML between `---` lines at the top of the file, one `<key>: <value>` per line, each value text on one line. Quote a value that starts with `#` or another YAML indicator, or holds ` #` or `: `, as in `issue: "#368"`; `rp check` reports any other YAML as `INVALID`.

- The intent: its origins (`../entries/intent-format.md` § Origins).
- A later input: `target` and `origin` (`../entries/intent-format.md` § Later input).
- `notes.md`: `status`.
- A thread: its header (§ Threads).

`run-config.md`'s frontmatter is JSON (§ Run configuration). The spec, the design doc, and the candidates carry none.

## Certification

`rp stamp` alone writes `certification/<path>.json`, `rp`'s certification of the artifact or approved review thread at `<path>`: each required input pinned at its identity in the turn commit's tree, and on an approval its approved commit. `rp stamp <file> --at <turn commit>` derives the required inputs from the file's kind and pins them, whether or not the turn changed the file; it never writes the file. **Landing** a role's turn happens in the role's worktree, before anything is merged into it: verify its commits are on its branch, run `rp stamp --at <turn commit>` on its artifact when it exists and on every review thread the turn closed `approved`, and commit the certifications on top. A review lane's turn commit is the change `rp review` built, which no pipeline branch holds: land it in the pipeline worktree by cherry-picking the lane's commits after it onto the pipeline branch, then stamping every review thread the turn closed `approved` `--at` the change. The approved commit is the pipeline worktree's `HEAD`; `rp stamp` stops unless its code outside the pipelines folder equals the change's.

## Threads

A thread is the conversation between two roles about one artifact, in one file: `threads/<n>-<opener>-<owner>-<artifact>.md`. `<n>` is one more than the highest number in `threads/` when the thread is opened; threads opened in parallel lanes may share a number. The file name matches the header.

Its header is its frontmatter; only a thread to `owner` has `cites`:

```yaml
---
status: open | approved | withdrawn | answered | disagreement
opener: <role>
owner: <role>
artifact: intent | spec | design-doc | implementation
cites: <thread path | evidence path>
---
```

- **Roles** — a role's name is `<profile>[-<lane>]`: `spec-producer`, `design-doc-producer`, `implementer`, `owner`, the person, and `reviewer-<lane>` for a review lane. Production lanes open no threads: the grammar accepts `spec-producer-<lane>` and `design-doc-producer-<lane>` only so earlier closed threads stay readable, and an `open` or `disagreement` thread with such a party is malformed. Roles are validated by this grammar, never against the configuration, so a removed lane's threads stay readable. `owner` and `artifact` pair as `owner`–`intent`, `spec-producer`–`spec`, `design-doc-producer`–`design-doc`, `implementer`–`implementation`. The opener is any role but `owner`.
- **Messages** — in the body, each headed `## <role> — <commit>`, written by the opener, the thread's owner, or, for an owner's answer, by you as `owner`.
- **Awaits** — an `open` thread awaits its opener when its owner wrote the last message, and its owner otherwise.
- **Status** — the opener closes `approved` or `withdrawn`. `disagreement` is only the status of a thread addressed to `owner` about `intent`, which a role opens for a disagreement on what the intent means or demands, citing the thread it comes from, or for evidence that every kind of approach fails an intent goal or constraint, citing that evidence; you close it `answered` once the owner's answer lands (`loop.md` § Owner escalation). A disagreement about a derived requirement or a design decision has no status: it resolves inside its thread by observation.
- **Review thread** — a thread a review lane opens to `implementer` about `implementation`. A review lane is **approved** when its highest-numbered review thread is `approved` and fresh.

## Run configuration

`run-config.md` at the pipeline folder root states the configuration the tree is produced under. Its frontmatter is a JSON object containing only:

- `format`: the conventions format it was written under, `7`. `rp check` and `rp stamp` stop on a pipeline of another format.
- `target-phase`: an integer from 1 through 4.
- `base`: the branch of the unmerged pipeline it started from, else the base branch. Fetch and fast-forward it to its upstream before branching from it or merging it into the pipeline branch.
- `lanes`, optional, non-empty when present: lane objects, each containing only non-empty strings `profile`, `id`, and, optionally, `brief`. A lane without a brief covers its profile's whole scope. `profile` is `spec-producer` or `design-doc-producer` for a production lane, `reviewer` for a review lane.

Lane ids start with a lowercase letter or digit and continue with those or hyphens; they are unique per profile. Without a `reviewer` lane, the review runs one lane, `default`, with no brief. A configuration may also declare `default` itself, with or without a brief, alongside other review lanes.

Its body is free prose — the model of each profile and lane, the owner's directions for the run; `rp` ignores it.

The file remains with a merged pipeline. It does not say whether a run is in progress; to know that, check which agents are running through your tool's mechanics. Write and commit every configuration change before acting on it. The commit that drops a lane also removes its candidate folder and closes a review lane's open threads `withdrawn`. Terminate agents working under a changed lane.

## Names

- **Pipeline slug** — the pipeline's identifier, derived from its issue per the **Pipeline slug** convention: one path segment, a valid git ref, without `_`. A second pipeline for the same issue appends `-2`, `-3`.
- **Pipeline folder** — `<pipelines folder root>/<pipeline slug>/`. A folder of the pipelines folder root is a pipeline folder when it holds a pipeline file of some format: a phase folder `<n>-<name>/`, directly or under `base/`, `run-config.md`, or `prompt.md`; anything else in the root, such as a project's pipeline tooling, is not a pipeline.
- **Pipeline branch** — where the pipeline's commits land: the **Pipeline branch format** convention applied to the slug; work on a merged pipeline appends `_<n>`.
- **Lane branches** — `<pipeline branch>-<artifact>-<lane>` for a production lane, `<artifact>` being `spec` or `design-doc`; `<pipeline branch>-review-<lane>` for a review lane, built anew by `rp review` each turn. Each branch has its worktree in the **Worktree folder root**.
- **Assignment** — the file `git rev-parse --git-path rp/<profile>.md` resolves to in the role's worktree: the worktree's private git directory, outside the tree. It holds the role's filled template. No two instances of one profile share a worktree.
- **Prepared files** — every other file you write for a role, such as a diff it reads or your scratch about it: in the folder `git rev-parse --git-path rp/` resolves to in the role's worktree, beside its assignment.
- **Instance names** — `<pipeline slug> <profile>[ <lane>]`.
- **Supporting folders** — a role's evidence folder: `1-spec/spec/`, `2-design-doc/design-doc/`, and `3-implementation/notes/` beside their artifacts; `<phase folder>/lanes/<lane>/<artifact>/` for a candidate's producer.
- **Ids** — `<prefix>-<word>-<n>`: the prefix names the artifact — `intent`, `spec`, `design-doc` — and the word the concept. An item is declared by the line `<id>: <text>`; its content follows until the next declaration or heading. The intent originates `constraint`, `context`, and `proposal`, plus `intent-goal` for its Goal section; the spec `requirement`, `acceptance-criterion`, `exclusion`, and `assumption`; the design doc `decision` and `assumption`. An id is never renumbered or reused.

## The frontier

`rp check <pipeline folder>` reads `run-config.md` and prints the frontier: the first of these that holds, one line per action.

1. A malformed frontmatter or message heading → `INVALID <path>: <reason>`. Nothing is computed from a malformed file.
2. A thread with `status: disagreement` → `escalate <thread>`.
3. The lowest phase whose role has work — a thread awaiting the role, in any phase, or its artifact missing or stale, in a phase through the target:
   - production lanes declared and the root missing → `lane <artifact> <id>` for each candidate missing or stale, else `consolidate <artifact>`;
   - the artifact missing → `produce <artifact>`;
   - the artifact stale, or a thread awaiting its owner → `respond <artifact>`;
   - phase 4 → `review <lane>` for each lane not approved or with a thread awaiting its reviewer.
4. Otherwise → `complete`.

Below the frontier, `rp check` lists the threads awaiting each woken role and the changed inputs of each stale artifact. A missing or invalid configuration, a certification it cannot read, a base that does not resolve, or no merge-base stops the command.

## Discovery

Every live pipeline is a `<pipelines folder root>/<pipeline slug>/` folder at some branch tip; every merged one is in the base branch's tree. After `git fetch`, `rp pipelines --issue` finds the pipelines for an issue, reading only each pipeline's intent origins and `format`:

1. Collect the tree id of every `<pipelines folder root>/<pipeline slug>` at each branch tip.
2. Keep the pipelines whose tree id differs from every id that folder ever had in the base branch's history: those are the live ones.
3. Read their `0-intent/intent.md` and the base branch's.
4. Keep those whose intent's origins name the issue: its `issue`, or in an earlier format its `origin: issue` line.
5. List each with its `format`: the value, or `earlier` when its `run-config.md` has none.

Branch and folder names are not used to find pipelines; only the intent's origins are. `rp check --ref` then reads each live pipeline of the current format at its tip.
