# State

Everything about a pipeline is computed from its tree at any commit. `rp` — `node <this skill's folder>/scripts/rp.mjs` — computes what this file defines, with three commands:

- `rp check <pipeline folder> [--ref <ref>] [--json]` reports each phase through the target and prints the `frontier` line. `--ref` reads the pipeline at that commit instead of the working tree.
- `rp stamp <file>` writes the file's frontmatter (§ Frontmatter).
- `rp pipelines <pipelines folder root> <canonical issue reference>` lists the issue's pipelines (§ Discovery).

`rp check` is the only source of the frontier. When what you see in the tree disagrees with what `rp check` reports, or the frontier names something this skill gives you no way to dispatch, stop and tell the owner the skill has a defect; never work around it.

## Files

Paths are relative to the pipeline folder.

| Path | Contents | Written by |
| --- | --- | --- |
| `run-config.md` | The run configuration (§ Run configuration) | You |
| `0-intent/intent.md` | The intent (`../entries/intent-format.md`) | You, on the owner's approval |
| `0-intent/constraint-<n>.md`, `0-intent/proposal-<n>.md`, `0-intent/failure-<n>.md` | Later input (`../entries/intent-format.md` § Later input) | You, on the owner's approval |
| `1-spec/spec.md` | The spec | `spec-producer` |
| `1-spec/lanes/<lane>/spec.md` | A production lane's candidate spec | That lane's `spec-producer` |
| `2-design-doc/design-doc.md` | The design doc | `design-doc-producer` |
| `2-design-doc/lanes/<lane>/design-doc.md` | A production lane's candidate design doc | That lane's `design-doc-producer` |
| `3-implementation/notes.md` | The implementer's resumption file; the code, tests, and documentation live outside the pipelines folder | `implementer` |
| `threads/<n>-<opener>-<owner>-<artifact>.md` | A thread (§ Threads) | Its parties |

The **artifacts** are `spec.md`, `design-doc.md`, `notes.md`, and the candidates. These files are the pipeline state; `rp` ignores every other file in the pipeline folder.

## Terms

- **Identity** — the first 12 hexadecimal characters of the git blob hash of a file's body: everything below its frontmatter, or the whole file when it has none.
- **Pin** — `<path>@<identity>`.
- **Later input** — a constraint, proposal, or failure file. Its `target:` line names the artifacts it targets, each as an artifact path with an optional `#<id>`.
- **Required inputs** — what an artifact consumes:

  | Artifact | Required inputs |
  | --- | --- |
  | `1-spec/spec.md` | `0-intent/intent.md`; every later input targeting it; when the run configuration declares `spec-producer` lanes, every candidate |
  | A spec candidate | `0-intent/intent.md`; every later input targeting `1-spec/spec.md` |
  | `2-design-doc/design-doc.md` | `1-spec/spec.md`; every later input targeting it; when the run configuration declares `design-doc-producer` lanes, every candidate |
  | A design doc candidate | `1-spec/spec.md`; every later input targeting `2-design-doc/design-doc.md` |
  | `3-implementation/notes.md` | `1-spec/spec.md`; `2-design-doc/design-doc.md`; every later input targeting it |

- **Stale** — an artifact whose `inputs` differ from its required inputs at their current identities, by member or by identity.
- **Missing** — an artifact whose file is absent; `notes.md` is also missing while its first line is not `status: done`.
- **Consolidated** — an artifact with declared production lanes whose `inputs` pin every candidate at its current identity.
- **Base branch** — the artifact base branch of the **Artifact storage** convention: where pipelines start. **Base** — the merge-base of the inspected tip with `run-config.md`'s `base`.
- **Net change** — `git diff <base>...<tip>` outside the pipelines folder. Its **id** is its `git patch-id --stable`.
- **Owner territory** — what the intent means or demands: its Goal, its constraints, and `0-intent/constraint-<n>.md`. Proposals and reported failures are investigated and adopted or refuted with evidence. Everything after the intent is chosen by a role and settled between roles. An owner's answer is a constraint or a proposal, as the owner rules, whose `origin` names the thread it answers and whose `target` names the disputed artifact or clause.

## Frontmatter

Frontmatter is a JSON object between `---` lines at the top of a file. Only `rp stamp` writes it, and only these keys:

| Key | File | Value |
| --- | --- | --- |
| `inputs` | An artifact | List of pins: every required input at its current identity when stamped |
| `reviewed` | A review thread closed `approved` (§ Threads) | The net change's id at the commit its last message names |

No other file carries frontmatter. **Landing** a role's turn is verifying its commits are on its branch, running `rp stamp` on its artifact when it exists and on every review thread the turn closed `approved`, and committing the stamps on top.

## Threads

A thread is the conversation between two roles about one artifact, in one file: `threads/<n>-<opener>-<owner>-<artifact>.md`. `<n>` is one more than the highest number in `threads/` when the thread is opened; threads opened in parallel lanes may share a number. The file name matches the header.

The body starts with four header lines:

```text
status: open | closed: approved | closed: withdrawn | closed: answered | disagreement
opener: <role>
owner: <role>
artifact: intent | spec | design-doc | implementation
```

- **Roles** — `spec-producer`, `design-doc-producer`, `implementer`, `reviewer-<lane>` for each review lane, and `owner`, the person. `owner` and `artifact` pair as `owner`–`intent`, `spec-producer`–`spec`, `design-doc-producer`–`design-doc`, `implementer`–`implementation`. The opener is any role but `owner`.
- **Messages** — each headed `## <role> — <commit>`, written by the opener, the thread's owner, or, for an owner's answer, by you as `owner`.
- **Awaits** — an `open` thread awaits its opener when its last message is by the thread's owner, and the thread's owner otherwise.
- **Status** — the opener closes `closed: approved` or `closed: withdrawn`; either party marks `disagreement`; a thread addressed to `owner` opens as `disagreement`; you close a `disagreement` as `closed: answered` once the owner's answer lands (`loop.md` § Owner escalation).
- **Review thread** — a thread a review lane opens to `implementer` about `implementation`. A review lane is **approved** when its highest-numbered review thread is `closed: approved` and its `reviewed` equals the current net change's id.

## Run configuration

`run-config.md` at the pipeline folder root states the configuration the tree is produced under. Its frontmatter is a JSON object containing only:

- `target-phase`: an integer from 1 through 4.
- `base`: the branch of the unmerged pipeline it started from, else the base branch. Fetch and fast-forward it to its upstream before branching from it or merging it into the pipeline branch.
- `lanes`, optional, non-empty when present: lane objects, each containing only non-empty strings `profile`, `id`, and `brief`. `profile` is `spec-producer` or `design-doc-producer` for a production lane, `reviewer` for a review lane.

Lane ids start with a lowercase letter or digit and continue with those or hyphens; they are unique per profile. Without a `reviewer` lane, the review runs one lane, `default`, with no brief.

Its body is free prose — the model of each profile and lane, the owner's directions for the run; `rp` ignores it.

The file remains with a merged pipeline. It does not say whether a run is in progress; to know that, check which agents are running through your tool's mechanics. Write and commit every configuration change before acting on it. In that commit, remove a dropped production lane's folder. Terminate agents working under a changed lane.

## Names

- **Pipeline slug** — the pipeline's identifier, derived from its issue per the **Pipeline slug** convention: one path segment, a valid git ref, without `_`. A second pipeline for the same issue appends `-2`, `-3`.
- **Pipeline folder** — `<pipelines folder root>/<pipeline slug>/`.
- **Pipeline branch** — where the pipeline's commits land: the **Pipeline branch format** convention applied to the slug; work on a merged pipeline appends `_<n>`.
- **Lane branches** — `<pipeline branch>-<artifact>-<lane>` for a production lane, `<artifact>` being `spec` or `design-doc`; `<pipeline branch>-review-<lane>` for a review lane. Each branch has its worktree in the **Worktree folder root**.
- **Supporting folders** — a role's evidence folder: `1-spec/spec/`, `2-design-doc/design-doc/`, and `3-implementation/notes/` beside their artifacts; `<phase folder>/lanes/<lane>/<artifact>/` for a candidate's producer; `threads/reviewer-<lane>/` for a reviewer.
- **Ids** — `<prefix>-<word>-<n>`: the prefix names the artifact — `intent`, `spec`, `design-doc` — and the word the concept. An item is declared by the line `<id>: <text>`; its content follows until the next declaration or heading. The intent originates `constraint`, `context`, and `proposal`, plus `intent-goal` for its Goal section; the spec `requirement`, `acceptance-criterion`, `exclusion`, and `assumption`; the design doc `decision` and `assumption`. An id is never renumbered or reused.

## The frontier

`rp check <pipeline folder>` reads `run-config.md` and prints as the `frontier` line the first of these that holds, considering phases through the target only:

1. A malformed frontmatter, thread header, or `target:` line → `INVALID <path>: <reason>`. Nothing is computed from a malformed file.
2. A thread with `status: disagreement` → `escalate <thread>`.
3. Open threads awaiting a role → `reply <role>: <thread>, …`, naming every thread awaiting one role: the first awaited in the order `spec-producer`, `design-doc-producer`, `implementer`, then reviewers by their lowest awaiting thread number.
4. The lowest phase whose artifact is missing, stale, or, with declared production lanes, not consolidated:
   - not consolidated: candidates missing or stale → `lanes <artifact>: <lane>, …`, naming those lanes; otherwise → `consolidate <artifact>`;
   - missing → `produce <artifact>`;
   - stale → `respond <artifact>`.
5. Target phase 4, and review lanes not approved → `review: <lane>, …`, naming those lanes.
6. Otherwise → `complete`.

Below the frontier line, `rp check` lists the changed inputs of every artifact whose owner the line wakes: each required input whose pin is absent or differs, and each pin no longer required. A missing or invalid configuration, a base that does not resolve, or no merge-base stops the command.

## Discovery

Every live pipeline is a `<pipelines folder root>/<pipeline slug>/` folder at some branch tip; every merged one is in the base branch's tree. After `git fetch`, `rp pipelines` finds the pipelines for an issue:

1. Collect the tree id of every `<pipelines folder root>/<pipeline slug>` at each branch tip.
2. Keep the pipelines whose tree id differs from every id that folder ever had in the base branch's history: those are the live ones.
3. Read their `0-intent/intent.md` and the base branch's.
4. Keep those whose `origin: issue` line names the issue.

Branch and folder names are not used to find pipelines; only the `origin` line is. `rp check --ref` then reads each pipeline at its tip.
