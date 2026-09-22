# State

Everything about a pipeline is computed from the working tree at any commit. `rp` — `node <this skill's folder>/scripts/rp.mjs` — computes what this file defines; `rp check` is the only source of the frontier. When the tree contradicts it, or it names something you cannot dispatch, stop and report a defect in the skill; never work around it.

## Terms

- **Identity** — the first 12 hexadecimal characters of the git blob hash of every body byte: those below the frontmatter, or the whole file when it has none. The pipeline folder holds files and folders only: a symlink is a defect.
- **Pin** — `<path>@<identity>`, path relative to the pipeline folder. Only you write pins, through `rp stamp`.
- **Package** — a set of (member, identity) pairs recording what an artifact consumed or a review judged. Recorded members remain consumed until the producer records a replacement package. An artifact's package contains its required inputs with their approving waves, adjudicated challenges, and consumed lane packages. A review's package is the artifact package it judged, plus the artifact and record; plan reviews add tasks; phase reviews add reports and every authored change after the base, each a member named by its patch id. Historical material is supplied through the references in that package; its content joins the verdict only when the artifact pins it. A lane package is its artifact, record, and valid approving wave.
- **Stale** — a recorded package that differs from the required package by member or identity.
- **Lane** — one instance of a role on one artifact. Every reviewer has an implicit lane with no id; the run configuration may declare named review and production lanes. A named lane's fingerprint derives from its `id`, `brief`, `materials`, and `after`: a lane artifact or review stamped with another is stale; a lane folder or review the configuration lacks is a defect, never a lane. A production lane's scope contains its artifact and record: declarations expand those paths into the lane; all other paths retain their identity. Prompts and pins use that expansion. A production lane closes when the root consumes the package of its valid wave. That package remains closed history outside the frontier. Root consolidation combines closed packages with packages whose valid wave is current.
- **Wave** — one review of an artifact by every declared lane; numbered per artifact. A wave is valid when every lane records `approved` and its `reviewed` equals the reference by equality as sets of (member, identity) pairs; a filtered lane uses its selected projection. Live state takes its reference from the artifact's recorded consumption, expanded to its review package. A closed lane uses the independent reference recorded by the root at consolidation, bound to the lane package it consumed. A wave is current when valid and its reference equals the package required now. A live required package is satisfiable only when every required input approval is recursively valid and current.
- **Verdict** — a review's conclusion: `approved`, `rejected`, or `unsatisfiable`. An `unsatisfiable` verdict names a `target`: an artifact clause `<path>#<id>` or a constraint file.
- **Outcome** — a task report's conclusion: `completed`; `failed` — the observed product contradicts the task, or the task is contradictory or incomplete, with reproducible evidence; `blocked` — the product was not observed, and the report names what prevented it.
- **Challenge** — a file asking for work on its targets: a constraint, a proposal, an `unsatisfiable` verdict (a **claim**), or a fresh failed task report. A constraint or proposal targets one or more phase artifacts, whole or by clause. A claim targets one existing artifact clause or constraint file. A failed report targets its task (`build-plan.md#build-task-3`). After landing, resolution uses the recorded targets regardless of their current textual presence. State is per target artifact: several clauses of one artifact are adjudicated together, each dispositioned in the record. A challenge is **pending** on a target until that target **adjudicates** it by pinning it — the disposition lives in the record — and **resolved** on it when the target has a current valid wave that names the challenge, or when a closed wave of the target corroborates an `unsatisfiable` verdict citing it as `origin` (escalated one layer up); the challenge is resolved when every target is. A claim on owner territory is resolved by its owner's answer. A claim is its lane's verdict: it persists until resolved, superseded (its target changed, or its lane reviewed again), or moot (the artifact it judged changed). A failed task report is pending until adjudicated or until its task changes; a blocked one leaves its task pending for you.
- **Done-set** — the tasks whose latest report's `outcome` is `completed` and whose `reviewed` pins are fresh.
- **Authored change** — what a commit introduces outside the pipelines folder: a single-parent commit's diff; a merge commit's difference from the automatic merge of its parents (`git merge-tree`). Its identity is its patch id (`git patch-id --stable`): a rebase or cherry-pick that preserves the change preserves the identity; a conflict resolution is a change of its own.
- **Base branch** — the artifact base branch of the **Artifact storage** convention: where pipelines start and merge. **Base** — the commit a pipeline's own commits follow: the merge-base of its branch with the branch its intent `starts-from`, else with the base branch, passed as `--base`.
- **Episode** — an artifact's waves since its last valid, current wave in its context; a counter `rp check` reports, never a gate.
- **Assumption** — every pending load-bearing claim, labeled `assumed` with a stable id — `spec-assumption-<n>` in the spec, the artifact's own prefix downstream — and its verification condition. Questions and risks that depend on it cite that id. Accepting a consequence leaves its verification pending.

## Run configuration

`run-config.md` at the pipeline folder root states the configuration under which the tree is produced. Its JSON-object frontmatter contains only:

- `workflow`: `autonomous` or `assisted`.
- `target-phase`: an integer from 1 through 4.
- `lanes`, optional: lane objects containing only non-empty string `profile`, `id`, and `brief`; review lanes may add unique pipeline-relative `materials` from the artifact's review package, and production lanes may add unique `after` ids declared by the same profile. A list is non-empty when present. Omitted `lanes` means no named lanes; omitted `materials` selects the full review package; omitted `after` means no dependencies.

Lane ids start with a lowercase letter or digit, continue with those or hyphens, and exclude `tasks`; they are unique per profile. `after` dependencies are acyclic. Assisted configurations have no lanes. The profiles map as follows:

| Profile | Artifact | Kind |
| --- | --- | --- |
| `spec-reviewer` | `spec` | review |
| `design-doc-reviewer` | `design-doc` | review |
| `build-plan-reviewer` | `build-plan` | review |
| `build-reviewer` | `build` | review |
| `document-plan-reviewer` | `document-plan` | review |
| `document-reviewer` | `document` | review |
| `spec-producer` | `spec` | production |
| `design-doc-producer` | `design-doc` | production |

Its body is free prose — models, the owner's directions for the run, anything else the run needs; `rp` ignores it.

The file remains with a merged pipeline. It records no fact about whether a run is under way; tool mechanics report working agents. Write and commit every configuration change before acting on it. In that commit, remove a dropped lane's folder and reviews. Terminate agents working under a changed lane; `rp check` dispatches it again.

## Frontmatter

Frontmatter is a JSON object between `---` lines; the last value of a repeated key applies, and stamps omit empty lists. Every other file's frontmatter holds only pins, mirrors, and landing facts. Its syntax and field types must be valid. A mirror copies a declaration outside Markdown code fences in the body, in its fixed form (`Verdict:`, `Brief:`, `Target:`, `Prior finding:`, `Outcome:`, `Origin:`, `Depends on:`, a report's `## Commits`, an artifact's declared ids) — a fixed line holds exactly its value in the field's grammar and is mirrored whole or rejected as `INVALID`, never mined for tokens; `Verdict`, `Brief`, `Target`, and `Outcome` occur once. Inline formatting marks around a declared value are not part of it. A landing fact records what the stamp observed (`head`, `target-identity`, `attempt`) or the lane derived from the path. A stamp with `--reviewed` fixes the consumed package, validating completeness for implicit reviews and task reports. `rp check` validates every review lane against its declared reference. Later stamps preserve that package and landing facts while updating what their options request. `rp check` derives validity from the tree, reads frontmatter and identities, and recomputes body-derived fields: a file whose projection differs is stamped again before anything reads it; a stamped review without `Verdict:`, or report without `Outcome:`, is invalid.

| Key         | Files                        | Value                                                                    |
| ----------- | ---------------------------- | ------------------------------------------------------------------------ |
| `pins`      | artifacts                    | list of `<path>@<identity>`                                              |
| `lane-packages` | consolidated roots | list of `[artifact path, consumed lane pins, reference pins]`; stamp captures the candidate's complete review package independently of its reviews and preserves it while the root consumes the same lane pins |
| `reviewed`  | reviews, task reports        | list of `<path>@<identity>` — what the verdict is about; immutable       |
| `verdict`   | reviews                      | `approved` \| `rejected` \| `unsatisfiable`                              |
| `brief`     | reviews                      | the lane's brief, as the review declares it                              |
| `target`    | challenges                   | non-empty list of `<path>[#<id>]`, according to the challenge's kind. Only challenges carry `Target:` or `target`. |
| `target-identity` | claims, failed task reports | non-empty list of each target file's identity when the challenge landed, aligned with `target` |
| `ids`, `retired-ids` | intent, spec, design doc, plans, records | every id the file has declared at any stamp — a plan's tasks by their files — and the subset it no longer declares. An id declared twice or again after retiring, a gap in the file's own numbering, a carried id its upstream lacks, or a misnamed Markdown file in a plan's tasks folder is `INVALID IDS`, which its author fixes. A review's findings are validated the same way; a wave is a new file, so it records none |
| `origin`    | anything born from something | `issue <canonical reference>`; an external source; the challenge a review responds to; a list when several |
| `recurs`    | reviews                      | mirror of `Prior finding: <review>#<finding id>, resolution failed` — an earlier review of the same kind that declares the finding |
| `depends`   | tasks                        | mirror of `Depends on:` — the task ids it waits for                      |
| `commits`   | task reports                 | mirror of `## Commits` — every line that starts with a commit hash, after a bullet or a backtick; each commit exists and is stored as its full hash, whatever length the body wrote |
| `changes`   | task reports                 | the patch id of each commit `commits` names                                |
| `head`      | artifacts and artifact reviews | the commit a stamp with pins observed: the diff base for the next artifact delta review or convergence |
| `lane`      | a production lane's artifact; a named review lane's review | the fingerprint derived from `run-config.md` and the file's path                     |
| `attempt`, `outcome` | task reports        | the attempt, from the filename; `completed` \| `failed` \| `blocked`     |

A stamp follows the commit of what it stamps and is committed on top of it, on the branch the work landed on. A task report names the commits its task made and lands in a commit of its own after them; the phase review's package covers every authored change on the branch.

## Pins by file

A file records its package when first consumed and records a new package only after its producer reconfirms it. It never consumes its sibling record. A later phase never consumes an earlier phase's record. Derive required packages from this table using current input identities; each required approval includes every review lane of its current wave.

Each open production lane adjudicates its root's pending challenges before consolidation. Its own pins record that adjudication; the root's wave resolves the targets.

| File                                   | Pins                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `run-config.md`                        | none                                                                         |
| `0-intent/intent.md`                   | none; `origin`: `issue <canonical reference>`                                |
| `0-intent/constraint-<n>.md`, `0-intent/proposal-<n>.md` | none; `target`, `origin`                                          |
| `1-spec/spec.md`                       | `intent.md`; every challenge it adjudicated; when consolidated, every lane's `spec.md`, record, and approving reviews |
| spec or design production-lane artifact | what its root artifact would, plus each `after` lane's artifact, record, and approving reviews |
| `2-design-doc/design-doc.md`           | `intent.md`, `spec.md`, approving spec wave; challenges; lanes when consolidated |
| `3-build/build-plan.md`                | `spec.md`, `design-doc.md`, their approving reviews; challenges              |
| `3-build/tasks/build-task-<n>.md`      | none; `depends`                                                              |
| `3-build/tasks/build-task-<n>-report-<k>.md` | `reviewed`: the task it executed and the tasks it depends on; `outcome`; a failed one targets `build-plan.md` |
| `4-document/document-plan.md`          | `spec.md`, `design-doc.md`, `build-plan.md`, their approving reviews, every build task and report, the approving build review; challenges |
| document tasks and reports             | as in build                                                                  |

## Names

- Pipeline slug: the pipeline's identifier, derived from its issue per the **Pipeline slug** convention — one path segment, a valid git ref, without `_`. A second pipeline for the same issue appends `-2`, `-3`.
- Pipeline folder: `<pipelines folder root>/<pipeline slug>/`.
- Pipeline branch: where the pipeline's commits land — the **Pipeline branch format** convention applied to the slug; work on a merged pipeline appends `_<n>`.
- Auxiliary branches: `<phase>` is the declaration artifact (`spec`, `design-doc`, `build-plan`, `build`, `document-plan`, `document`). After `<pipeline branch>-<phase>-`, production lanes occupy `<lane>`, root review lanes `review-<review lane>`, and production-lane reviews `<production lane>-review-<review lane>`. Expanded names are unique; `rp check` rejects a collision.
- Reviews: `<artifact>-review-<wave>.md` for the implicit lane, `<artifact>-review-<lane>-<wave>.md` for a named lane. `<artifact>` is `spec`, `design-doc`, `build-plan`, `build`, `document-plan`, `document`. You compute filenames and pass them in the prompt. A reviewer that adjudicates a challenge writes `Origin: <challenge path>` in its review.
- Production lanes: `<phase>/<lane>/` holds the lane's artifact, record, and reviews, named as at the root.
- Tasks: `3-build/tasks/build-task-<n>.md` and `4-document/tasks/document-task-<n>.md`, one file per task, self-contained — an e2e task carries its flows, a task naming `Verifies: <assumption id>` carries the assumption's condition; reports `<task id>-report-<k>.md` beside the task, one per attempt, never overwritten. The next path is `k+1` of the last report with a valid landed package and metadata; landing validates it before publication, after which it stays stable. A plan is `<plan>.md` — overview, assumptions, order — plus its tasks folder.
- Ids are `<prefix>-<word>-<n>`: the prefix names the artifact class — `intent`, `spec`, `design-doc`, `build`, `document` — and the word the concept. An item opens with its id, the first token after its list marker or heading marks. The intent originates `constraint`, `context`, and `proposal`, and `intent-goal` names its Goal section; the spec `requirement`, `acceptance-criterion`, and `assumption`; the design doc `decision` and `assumption`; a plan `assumption` and `task`, each task declared by its file; a review of a phase `finding`; a record `question`. An artifact numbers each word it originates from 1, declares each once, never renumbers or reuses an id, and gives new content the next one; an id is cited with its path. An assumption keeps its id downstream: the design doc and the plans carry the upstream artifact's assumptions as declared there. A challenge targets an id the artifact originates; on the intent, only `intent-goal` or a constraint.

## Owner territory

Owner territory is what the work must satisfy: the intent's Goal and Constraints, and `0-intent/constraint-<n>.md`. Proposals, in the intent or in `0-intent/proposal-<n>.md`, are investigated and adopted or refuted with evidence. Approval of a proposal approves investigating it. An agent-chosen requirement or mechanism remains revisable through its producer and reviewer; an unsatisfiable Goal or constraint reaches the owner. Records cite the phase-0 sources.

An owner answer is a constraint whose `origin` names the claim and whose targets include the root artifact of the phase that raised it. It replaces the challenged obligation within those targets.

## The frontier

`rp check <pipeline folder> --base <base branch>` reads `run-config.md`, reports every phase up to its target, and names the **frontier** — the first item of:

1. **A contradiction** — malformed frontmatter → you repair and re-stamp it; malformed fixed line or id declarations → its author fixes it; mirror drift → stamp it; an undeclared lane or symlink → stop and tell the owner. Representation is validated first; facts that depend on an invalid representation remain uncomputed.
2. **A pending claim targeting owner territory** → owner escalation. A claim is pending while unanswered, its lane's latest verdict, its wave closed with no `rejected` lane, its `reviewed` pins are fresh, and its target is unchanged; a claim whose wave is still open, or whose wave has a rejection, waits for that wave.
3. **Per phase, in order** — open production lanes first, each a sub-pipeline of the root artifact (missing / stale / wave / rejected wave / pending challenge; a lane waits until every `after` lane's valid wave is current, recursively; every open lane's valid wave current → consolidate); then the root artifact: missing → converge; no recorded package → stamp what its producer consumed; stale, with a pending challenge, or with a closed wave that rejected → converge with the package change, that wave's reviews, and every pending challenge on it; an unstamped review → stamp it; an invalid one → its reviewer finishes it; without a current valid wave → a review wave. In build and document, after the plan's valid wave is current: an unstamped report of any attempt → stamp it; an invalid one → its worker finishes it; the next task — the lowest-numbered task whose dependencies are done and which is not done — as `blocked <phase>/<task id>` when its latest report is fresh and `blocked`; all done → the phase review wave; its current valid wave completes the phase.
4. **Complete** — every challenge and claim targeting a phase within the target resolved, every phase through the target has a current valid wave over a fresh artifact → close-out. A base that does not resolve is an error, never completion.

Counters, read from review frontmatter: **waves this episode** and **`recurs`** — a prior finding whose resolution failed, within the episode.

## Discovery

Every live pipeline is a `<pipelines folder root>/<pipeline slug>/` folder at some branch tip; every merged one is in the base branch's tree. To find pipelines for an issue: `git fetch`, collect the tree id of every `<pipelines folder root>/<pipeline slug>` at each branch tip with one `git cat-file --batch-check` pass, keep the pipelines whose tree id differs from every id that folder had in the base branch's history, read their `0-intent/intent.md` and the base branch's, match `origin`. Names carry no query semantics. `rp check --ref` then reads each pipeline at its tip.
