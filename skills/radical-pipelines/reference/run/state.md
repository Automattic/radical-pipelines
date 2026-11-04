# State

Everything about a pipeline is computed from its tree at any commit. `rp` — `node <this skill's folder>/scripts/rp.mjs` — computes what this file defines, with three commands:

- `rp check <pipeline folder> [--ref <ref>] [--json]` reports each phase through the target and prints the frontier (§ The frontier). `--ref` reads the pipeline at that commit instead of the working tree.
- `rp stamp <file> --at <turn commit> [--pin <path>]...` writes the file's frontmatter (§ Frontmatter).
- `rp pipelines <repo path> --base <artifact base branch> [--issue <canonical issue reference>]` lists the repository's pipelines, or only the issue's (§ Discovery). The base branch comes from the **Artifact storage** convention.

`check` and `stamp` derive the pipelines folder root from the path they are given; `pipelines` reads it from the project's conventions, `.rp.local.md` first.

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

The **artifacts** are `spec.md`, `design-doc.md`, `notes.md`, and the candidates. These files are the pipeline state; `rp` ignores every other file in the pipeline folder.

## Terms

- **Identity** — the first 12 hexadecimal characters of the git blob hash of a file's body: everything below its frontmatter, or the whole file when it has none.
- **Pin** — `<path>@<identity>`.
- **Later input** — a constraint, proposal, or failure file. Its `target:` line names the artifacts it targets, each as an artifact path with an optional `#<id>`.
- **Required inputs** — what an artifact or an approval consumes:

  | File | Required inputs |
  | --- | --- |
  | `1-spec/spec.md` | `0-intent/intent.md`; every later input targeting it |
  | A spec candidate | `0-intent/intent.md` |
  | `2-design-doc/design-doc.md` | `1-spec/spec.md`; every later input targeting it |
  | A design doc candidate | `1-spec/spec.md` |
  | `3-implementation/notes.md` | `1-spec/spec.md`; `2-design-doc/design-doc.md`; every later input targeting it |
  | A review thread closed `approved` | `0-intent/intent.md`; every later input |

  Candidates are required only while their root is missing. A consolidated root — one written from candidates — also pins the candidates it merged, as a record: land it with `rp stamp <root> --at <turn commit> --pin <each candidate>`.

- **Turn commit** — the tip of a role's worktree when you wake it. The assignment names it, and the role reads its materials at it.
- **Stale** — an artifact or an approved review thread with a required input unpinned in its `inputs`, or pinned at an identity that differs from the current one. An approved review thread is also stale when the tip's code differs from its `reviewed` commit's by anything other than clean merges of the base: `rp check` merges the current base into the `reviewed` commit with `git merge-tree` and compares the resulting tree with the tip's tree outside the pipelines folder; a conflict or a difference makes it stale.
- **Missing** — an artifact whose file is absent; `notes.md` is also missing until its first body line is `status: done`.
- **Base branch** — the artifact base branch of the **Artifact storage** convention: where pipelines start. **Base** — the merge-base of the inspected tip with `run-config.md`'s `base`.
- **Net change** — `git diff <base>...<tip>` outside the pipelines folder: what the reviewer reads.
- **Owner territory** — what the intent means or demands: its Goal, its constraints, and `0-intent/constraint-<n>.md`. Proposals and reported failures are investigated and adopted or refuted with evidence. Everything after the intent is chosen by a role and settled between roles. An owner's answer is a constraint or a proposal, as the owner rules, whose `origin` names the thread it answers and whose `target` names the disputed artifact or clause.

## Frontmatter

Frontmatter is a JSON object between `---` lines at the top of a file. Only `rp stamp` writes it, and only these keys:

| Key | File | Value |
| --- | --- | --- |
| `inputs` | An artifact, or a review thread closed `approved` | List of pins: every required input at its identity in the turn commit's tree; on a consolidated root, also each candidate passed with `--pin` |
| `reviewed` | A review thread closed `approved` (§ Threads) | The turn commit: the code it approved |

No other file carries frontmatter. `rp stamp <file> --at <turn commit>` derives the required inputs from the file's kind and pins them at their identities in that commit's tree, whether or not the turn changed the file. **Landing** a role's turn happens in the role's worktree, before anything is merged into it: verify its commits are on its branch, run `rp stamp --at <turn commit>` on its artifact when it exists and on every review thread the turn closed `approved`, and commit the stamps on top.

## Threads

A thread is the conversation between two roles about one artifact, in one file: `threads/<n>-<opener>-<owner>-<artifact>.md`. `<n>` is one more than the highest number in `threads/` when the thread is opened; threads opened in parallel lanes may share a number. The file name matches the header.

The body starts with its header lines; only a thread to `owner` has the `cites:` line:

```text
status: open | closed: approved | closed: withdrawn | closed: answered | disagreement
opener: <role>
owner: <role>
artifact: intent | spec | design-doc | implementation
cites: <thread path | evidence path>
```

- **Roles** — a role's name is `<profile>[-<lane>]`: `spec-producer`, `design-doc-producer`, `implementer`, `owner`, the person, and, for lane instances, `spec-producer-<lane>`, `design-doc-producer-<lane>`, and `reviewer-<lane>`. Roles are validated by this grammar, never against the configuration, so a removed lane's threads stay readable. `owner` and `artifact` pair as `owner`–`intent`, `spec-producer`–`spec`, `design-doc-producer`–`design-doc`, `implementer`–`implementation`, and a lane producer with its candidate's artifact. The opener is any role but `owner`.
- **Messages** — each headed `## <role> — <commit>`, written by the opener, the thread's owner, or, for an owner's answer, by you as `owner`.
- **Awaits** — an `open` thread awaits its opener when its owner wrote the last message, and its owner otherwise.
- **Status** — the opener closes `closed: approved` or `closed: withdrawn`. `disagreement` is only the status of a thread addressed to `owner` about `intent`, which a role opens for a disagreement on what the intent means or demands, citing the thread it comes from, or for evidence that every kind of approach fails an intent goal or constraint, citing that evidence; you close it `closed: answered` once the owner's answer lands (`loop.md` § Owner escalation). A disagreement about a derived requirement or a design decision has no status: it resolves inside its thread by observation.
- **Review thread** — a thread a review lane opens to `implementer` about `implementation`. A review lane is **approved** when its highest-numbered review thread is `closed: approved` and fresh.

## Run configuration

`run-config.md` at the pipeline folder root states the configuration the tree is produced under. Its frontmatter is a JSON object containing only:

- `format`: the conventions format it was written under, `6`. `rp check` and `rp stamp` stop on a pipeline of another format.
- `target-phase`: an integer from 1 through 4.
- `base`: the branch of the unmerged pipeline it started from, else the base branch. Fetch and fast-forward it to its upstream before branching from it or merging it into the pipeline branch.
- `lanes`, optional, non-empty when present: lane objects, each containing only non-empty strings `profile`, `id`, and `brief`. `profile` is `spec-producer` or `design-doc-producer` for a production lane, `reviewer` for a review lane.

Lane ids start with a lowercase letter or digit and continue with those or hyphens; they are unique per profile. Without a `reviewer` lane, the review runs one lane, `default`, with no brief.

Its body is free prose — the model of each profile and lane, the owner's directions for the run; `rp` ignores it.

The file remains with a merged pipeline. It does not say whether a run is in progress; to know that, check which agents are running through your tool's mechanics. Write and commit every configuration change before acting on it. The commit that drops a lane also removes its candidate folder and closes its open threads `closed: withdrawn`. Terminate agents working under a changed lane.

## Names

- **Pipeline slug** — the pipeline's identifier, derived from its issue per the **Pipeline slug** convention: one path segment, a valid git ref, without `_`. A second pipeline for the same issue appends `-2`, `-3`.
- **Pipeline folder** — `<pipelines folder root>/<pipeline slug>/`.
- **Pipeline branch** — where the pipeline's commits land: the **Pipeline branch format** convention applied to the slug; work on a merged pipeline appends `_<n>`.
- **Lane branches** — `<pipeline branch>-<artifact>-<lane>` for a production lane, `<artifact>` being `spec` or `design-doc`; `<pipeline branch>-review-<lane>` for a review lane. Each branch has its worktree in the **Worktree folder root**.
- **Assignment** — the file `git rev-parse --git-path rp/<profile>.md` resolves to in the role's worktree: the worktree's private git directory, outside the tree. It holds the role's filled template. No two instances of one profile share a worktree.
- **Instance names** — `<pipeline slug> <profile>[ <lane>]`.
- **Supporting folders** — a role's evidence folder: `1-spec/spec/`, `2-design-doc/design-doc/`, and `3-implementation/notes/` beside their artifacts; `<phase folder>/lanes/<lane>/<artifact>/` for a candidate's producer; `threads/reviewer-<lane>/` for a reviewer.
- **Ids** — `<prefix>-<word>-<n>`: the prefix names the artifact — `intent`, `spec`, `design-doc` — and the word the concept. An item is declared by the line `<id>: <text>`; its content follows until the next declaration or heading. The intent originates `constraint`, `context`, and `proposal`, plus `intent-goal` for its Goal section; the spec `requirement`, `acceptance-criterion`, `exclusion`, and `assumption`; the design doc `decision` and `assumption`. An id is never renumbered or reused.

## The frontier

`rp check <pipeline folder>` reads `run-config.md` and prints the frontier: the first of these that holds, one line per action.

1. A malformed frontmatter, thread header, or `target:` line → `INVALID <path>: <reason>`. Nothing is computed from a malformed file.
2. A thread with `status: disagreement` → `escalate <thread>`.
3. The lowest phase whose role has work — a thread awaiting the role, in any phase, or its artifact missing or stale, in a phase through the target:
   - production lanes declared and the root missing → `lane <artifact> <id>` for each candidate missing, stale, or awaited by a thread, else `consolidate <artifact>`;
   - the artifact missing → `produce <artifact>`;
   - the artifact stale, or a thread awaiting its owner → `respond <artifact>`;
   - phase 4 → `review <lane>` for each lane not approved or with a thread awaiting its reviewer.
4. Otherwise → `complete`.

Below the frontier, `rp check` lists the threads awaiting each woken role and the changed inputs of each stale artifact. A missing or invalid configuration, a base that does not resolve, or no merge-base stops the command.

## Discovery

Every live pipeline is a `<pipelines folder root>/<pipeline slug>/` folder at some branch tip; every merged one is in the base branch's tree. After `git fetch`, `rp pipelines --issue` finds the pipelines for an issue, reading only each pipeline's intent origins and `format`:

1. Collect the tree id of every `<pipelines folder root>/<pipeline slug>` at each branch tip.
2. Keep the pipelines whose tree id differs from every id that folder ever had in the base branch's history: those are the live ones.
3. Read their `0-intent/intent.md` and the base branch's.
4. Keep those whose `origin: issue` line names the issue.
5. List each with its `format`: the value, or `earlier` when its `run-config.md` has none.

Branch and folder names are not used to find pipelines; only the `origin` line is. `rp check --ref` then reads each live pipeline of the current format at its tip.
