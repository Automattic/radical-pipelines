# State

Everything about a pipeline is computed from the working tree at any commit. `rp` — `node <this skill's folder>/scripts/rp.mjs` — computes what this file defines; `rp check` is the only source of the frontier. When what you see in the working tree disagrees with what `rp check` reports, or the frontier names something this skill gives you no way to dispatch, stop and tell the owner the skill has a defect; never work around it.

## Terms

- **Identity** — the first 12 hexadecimal characters of the git blob hash of a file's body: everything below the frontmatter, or the whole file when it has none; for the intent, the leading `origin` lines are excluded too. Pipeline state holds files and folders only: a symlink there is a defect.
- **Pin** — `<path>@<identity>`, path of a pipeline state file relative to the pipeline folder. Only you write pins, through `rp stamp`.
- **Package** — a set of (member, identity) pairs recording what an artifact consumed or a review judged. A recorded package stays in force until the producer records a replacement.
  - An artifact's package: its required inputs with their approving waves, the challenges it adjudicated, and the lane packages it consumed.
  - A review's package: the artifact's package, plus the artifact and its record; a plan review adds the tasks; a phase review adds the task reports.
  - A lane package: the lane's artifact, record, and valid approving wave.
  - Older material — earlier reviews, earlier records — is reachable through references inside the package's files; a verdict covers it only when the artifact pins it directly.
- **Stale** — a recorded package that differs from the required package by member or identity.
- **Lane** — one instance of a role on one artifact. Every reviewer has an implicit lane with no id; the run configuration may declare named review and production lanes.
  - A named lane's **fingerprint** derives from its `id`, `brief`, `materials`, and `after`. A lane artifact or review stamped with a different fingerprint is stale. A lane folder or review the configuration does not declare is a defect, never a lane.
  - Inside a production lane, a rule that names the artifact or record means the lane's copy (`<phase>/lanes/<lane>/<file>`); every other path — intent, challenges, upstream artifacts — is the same file as at the root. Prompts and pins use the lane's paths.
  - A production lane is **closed** once the root artifact pins the lane's artifact, record, and approving wave; a closed lane is history and never returns to the frontier. At consolidation the root pins every lane's package, closed or current.
- **Wave** — one review of an artifact by every declared lane; numbered per artifact.
  - The **reference** is the set of (member, identity) pairs a wave is expected to have reviewed: for a live artifact, what the artifact pins, expanded to its review package; for a closed lane, the `lane-packages` entry the root recorded at consolidation.
  - A wave is **valid** when every lane records `approved`, each lane's `reviewed` equals the reference as a set (for a lane with `materials`, its selection of the reference), and, for a phase review, the code delta is empty.
  - A wave is **current** when it is valid and its reference equals the package required now. For a live artifact, the required package can only be satisfied when every input approval it requires is itself valid and current, recursively.
- **Verdict** — a review's conclusion: `approved`, `rejected`, or `unsatisfiable`. An `unsatisfiable` verdict names a `target`: an artifact clause `<path>#<id>` or a constraint file.
- **Outcome** — a task report's conclusion: `completed`; `failed` — the worker observed the result and it contradicts the task, or the task is contradictory or incomplete, with reproducible evidence; `blocked` — something the worker was given failed it (malformed materials, an unreadable input, or a broken seat or its environment), and the report names what failed with the evidence locating it.
- **Challenge** — a file asking for work on its targets: a constraint, a proposal, an `unsatisfiable` verdict (a **claim**), or a failed task report.
  - Targets: a constraint or proposal targets one or more phase artifacts, whole or by clause; a claim targets one existing artifact clause or constraint file; a failed report targets its task (`build-plan.md#build-task-3`). Once landed, the recorded targets are what count, even when the targeted text has since been removed.
  - State is per target artifact; several clauses of one artifact are adjudicated together, each with its own disposition in the record. On a target, a challenge is **pending** until the target **adjudicates** it by pinning it (the disposition lives in the record), and **resolved** when the target has a current valid wave that names the challenge, or when a closed wave of the target corroborates an `unsatisfiable` verdict citing the challenge as `origin` — the target has raised its own claim one layer up. The challenge is resolved when every target is. A claim on owner territory is resolved by the owner's answer.
  - A claim is its lane's verdict: it persists until resolved, superseded (its target changed, or its lane reviewed again), or moot (the artifact it judged changed); once its target has adjudicated it, it stays unresolved there until resolved.
  - A failed task report stops being a challenge when its task changes before adjudication. A blocked report is not a challenge: its task stays pending, and you repair what the report names and re-dispatch (`loop.md` § Dispatch).
- **Under experiment** — an artifact while a challenge unresolved on it is a failed task report or has one in its `origin` chain. `rp check` ends its `converge` and `review wave` lines with ` (experiment)`; their agents run under `Execution: experiment`.
- **Done-set** — the tasks whose latest report's `outcome` is `completed` and whose `reviewed` pins are fresh.
- **Base branch** — the artifact base branch of the **Artifact storage** convention: where pipelines start and merge. **Base** — the merge-base of the inspected tip with `run-config.md`'s `base`.
- **Net change** — `git diff <base>...<tip>` outside the pipelines folder.
- **Code delta** — the code a phase review has not seen: the diff outside the pipelines folder from the state the review is credited with to the inspected tip. That state is built in three steps:
  1. start from the first parent of the commit that added the review;
  2. merge the base into it with `git merge-tree`, keeping any conflict markers;
  3. replay, in order, each later commit outside the base whose patch id a later phase's task report records, skipping any that conflicts.
- **Episode** — the waves an artifact has been through since its last valid, current wave; a counter `rp check` reports, never a condition it acts on.
- **Assumption** — every pending load-bearing claim, labeled `assumed` with a stable id — `spec-assumption-<n>` in the spec, the artifact's own prefix downstream — and its verification condition. Questions and risks that depend on it cite that id. Recording a risk as accepted leaves the assumption it depends on open.

## Run configuration

`run-config.md` at the pipeline folder root states the configuration under which the tree is produced. Its JSON-object frontmatter contains only:

- `workflow`: `autonomous` or `assisted`.
- `target-phase`: an integer from 1 through 4.
- `base`: the branch the pipeline merges into — the branch of the unmerged pipeline it started from, else the base branch. Fetch and fast-forward it to its upstream before branching from it or merging it into the pipeline branch.
- `lanes`, optional: a list of lane objects. Each contains only non-empty strings `profile`, `id`, and `brief`; a review lane may add `materials` — unique pipeline-relative paths from the artifact's review package — and a production lane may add `after` — unique ids of lanes declared by the same profile. Omitted `lanes` means no named lanes; omitted `materials` selects the full review package; omitted `after` means no dependencies. Every list is non-empty when present.

Lane ids start with a lowercase letter or digit and continue with those or hyphens; they are unique per profile. `after` dependencies form no cycle. Assisted configurations have no lanes. The profiles map as follows:

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

The file remains with a merged pipeline. It does not say whether a run is in progress; to know that, check which agents are running through your tool's mechanics. Write and commit every configuration change before acting on it. In that commit, remove a dropped lane's folder and reviews. Terminate agents working under a changed lane; `rp check` dispatches it again.

## Frontmatter

Frontmatter is a JSON object between `---` lines; the last value of a repeated key applies, and stamps omit empty lists. Every file other than `run-config.md` holds only pins, mirrors, and landing facts in its frontmatter, with valid syntax and field types.

- A **mirror** copies a declaration from the body (outside Markdown code fences) into the frontmatter. A declaration is a fixed line: `<key>: <value>` at the start of a line with no marks, where the key is a mirrored field (`verdict`, `brief`, `target`, `prior-finding`, `outcome`, `origin`, `depends-on`, `commit`) or a declared id. The value is taken as-is: either it matches the key's grammar and is copied whole, or the line is `INVALID`; the script never extracts parts of it. `verdict`, `brief`, `target`, and `outcome` occur once.
- A **landing fact** records what the stamp observed (`head`, `target-identity`, `attempt`, `patch-ids`) or the lane derived from the path.
- A stamp with `--reviewed` fixes the consumed package and validates its completeness for implicit reviews and task reports; `rp check` validates every review lane against its declared reference. Later stamps preserve that package and the landing facts while updating what their options request.
- `rp check` derives validity from the tree: it reads frontmatter and identities and recomputes the body-derived fields. A file whose frontmatter no longer matches its body is re-stamped before anything else is computed; a stamped review without `verdict:`, or a report without `outcome:`, is invalid.

| Key         | Files                        | Value                                                                    |
| ----------- | ---------------------------- | ------------------------------------------------------------------------ |
| `pins`      | artifacts                    | list of `<path>@<identity>`                                              |
| `lane-packages` | consolidated roots | list of `[artifact path, consumed lane pins, reference pins]`, one per lane candidate. The stamp records each candidate's complete review package, computed from the candidate itself rather than read from its reviews, and keeps it while the root still consumes the same lane pins |
| `reviewed`  | reviews, task reports        | list of `<path>@<identity>` — what the verdict is about; immutable       |
| `verdict`   | reviews                      | `approved` \| `rejected` \| `unsatisfiable`                              |
| `brief`     | reviews                      | the lane's brief, as the review declares it                              |
| `target`    | challenges                   | non-empty list of `<path>[#<id>]`, according to the challenge's kind. Only challenges carry `target`. |
| `target-identity` | claims, failed task reports | non-empty list of each target file's identity when the challenge landed, aligned with `target` |
| `ids`, `retired-ids` | intent, spec, design doc, plans, records | every id the file has declared at any stamp — a plan's tasks by their files — and the subset it no longer declares. The conditions that make a file `INVALID IDS` are listed below the table; its author fixes it. A review's findings are validated the same way, but a review records no `ids`: every wave is a new file |
| `origin`    | anything born from something | `issue <canonical reference>`; an external source; the challenge a review responds to; a list when several |
| `prior-finding` | reviews                  | `<review>#<finding id>` — an earlier review of the same kind that declares the finding this one continues; a list |
| `depends-on` | tasks                       | `none` or the comma-separated task ids it waits for                      |
| `commit`    | task reports                 | a hash per line, one per commit the task made; resolve new declarations to full hashes |
| `patch-ids` | task reports                 | `git patch-id --stable` of each commit in `commit`, in order, omitting merges and empty commits; retained while the declaration matches |
| `head`      | artifacts and artifact reviews | the commit a stamp with pins observed: the diff base for the next artifact delta review or convergence |
| `lane`      | a production lane's artifact; a named review lane's review | the fingerprint derived from `run-config.md` and the file's path                     |
| `attempt`, `outcome` | task reports        | the attempt, from the filename; `completed` \| `failed` \| `blocked`     |

A file is `INVALID IDS` when any of these holds:

- a declaration `<prefix>-<word>-<n>` uses a word its artifact class does not originate;
- a line opens with an id the file declares elsewhere in another form;
- an id the file originates occurs without ever being declared;
- an id is declared twice, or declared again after being retired;
- the file's own numbering has a gap;
- a carried id does not exist in the upstream artifact;
- a Markdown file in a plan's tasks folder is misnamed.

**Landing** a file is committing it, stamping it, and committing the stamp on top, on the branch the work landed on. A task report names the commits its task made and lands in a commit of its own after them.

## Pins by file

A file records its package when it is first consumed, and records a new package only after its producer reconfirms it. An artifact never pins its own record, and a later phase never pins an earlier phase's record. The required package is derived from this table using the inputs' current identities; a required approval includes every review lane of the input's current wave.

Each open production lane adjudicates its root's pending challenges before consolidation: the lane's own pins record the adjudication, and the root's wave resolves the targets.

| File                                   | Pins                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `run-config.md`                        | none                                                                         |
| `0-intent/intent.md`                   | none; `origin`: `issue <canonical reference>`                                |
| `0-intent/constraint-<n>.md`, `0-intent/proposal-<n>.md` | none; `target`, `origin`                                          |
| `1-spec/spec.md`                       | `intent.md`; every challenge it adjudicated; when consolidated, every lane's `spec.md`, record, and approving reviews |
| spec or design production-lane artifact | what its root artifact would, plus each `after` lane's artifact, record, and approving reviews |
| `2-design-doc/design-doc.md`           | `intent.md`, `spec.md`, approving spec wave; challenges; lanes when consolidated |
| `3-build/build-plan.md`                | `spec.md`, `design-doc.md`, their approving reviews; challenges              |
| `3-build/tasks/build-task-<n>.md`      | none; `depends-on`                                                           |
| `3-build/tasks/build-task-<n>-report-<k>.md` | `reviewed`: the task it executed and the tasks it depends on; `outcome`; a failed one targets `build-plan.md` |
| `4-document/document-plan.md`          | `spec.md`, `design-doc.md`, `build-plan.md`, their approving reviews, every build task and report, the approving build review when the build plan has tasks; challenges |
| document tasks and reports             | as in build                                                                  |

## Names

- Pipeline slug: the pipeline's identifier, derived from its issue per the **Pipeline slug** convention — one path segment, a valid git ref, without `_`. A second pipeline for the same issue appends `-2`, `-3`.
- Pipeline folder: `<pipelines folder root>/<pipeline slug>/`.
- Pipeline branch: where the pipeline's commits land — the **Pipeline branch format** convention applied to the slug; work on a merged pipeline appends `_<n>`.
- Auxiliary branches: all start with `<pipeline branch>-<phase>-`, where `<phase>` is the artifact name (`spec`, `design-doc`, `build-plan`, `build`, `document-plan`, `document`). A production lane's branch ends in `<lane>`; a root review lane's in `review-<review lane>`; a production lane's review lane's in `<production lane>-review-<review lane>`. The resulting names must be unique; `rp check` rejects a collision.
- Experiment seats: `<pipeline branch>-experiment-<n>`, `<n>` the next unused in the pipeline, each with its worktree in the **Worktree folder root**.
- Reviews: `<artifact>-review-<wave>.md` for the implicit lane, `<artifact>-review-<lane>-<wave>.md` for a named lane. `<artifact>` is `spec`, `design-doc`, `build-plan`, `build`, `document-plan`, `document`. You compute filenames and pass them in the prompt. A reviewer that adjudicates a challenge writes `origin: <challenge path>` in its review.
- Production lanes: `<phase>/lanes/<lane>/` holds the lane's artifact, record, and reviews, named as at the root.
- Pipeline state: the files at the pipeline folder root, directly in a phase folder, in its `tasks/`, and in each `lanes/<lane>/`; `rp` ignores every other folder.
- Supporting folders: an agent's, beside its artifact, review, or report, named after it without `.md`.
- Tasks: `3-build/tasks/build-task-<n>.md` and `4-document/tasks/document-task-<n>.md`, one file per task, its phase defining its contents; reports `<task id>-report-<k>.md` beside the task, one per attempt, never overwritten. The next report number is one more than the highest-numbered earlier report whose recorded package, attempt, outcome, and mirrors are valid. A plan is `<plan>.md` — overview and assumptions — plus its tasks folder.
- Ids are `<prefix>-<word>-<n>`: the prefix names the artifact class — `intent`, `spec`, `design-doc`, `build`, `document` — and the word the concept. An item is declared by the line `<id>: <text>`; its content follows until the next declaration or heading.
  - Each artifact class originates its own words: the intent `constraint`, `context`, and `proposal`, plus `intent-goal` for its Goal section; the spec `requirement`, `acceptance-criterion`, `exclusion`, and `assumption`; the design doc `decision` and `assumption`; a plan `assumption` and `task`, each task declared by its file; a review of a phase `finding`; a record `question`.
  - An artifact numbers each word it originates from 1, declares each id once, never renumbers or reuses one, and gives new content the next number. An id is cited together with its path.
  - An assumption keeps its id downstream: the design doc and the plans carry the upstream artifact's assumptions under the ids declared there.
  - An artifact binds the phases after it through its declared items, so a challenge targets an id the artifact originates — on the intent, only `intent-goal` or a constraint.

## Owner territory

Owner territory is what the work must satisfy: the intent's Goal and Constraints, and `0-intent/constraint-<n>.md`. Proposals, in the intent or in `0-intent/proposal-<n>.md`, are investigated and adopted or refuted with evidence; the owner approving a proposal means it must be investigated, not that it is decided. A requirement or mechanism an agent chose can be revised by its producer and reviewer; a Goal or constraint that cannot be satisfied is escalated to the owner. Records cite the phase-0 sources.

An owner answer is a constraint or a proposal, as the owner rules, whose `origin` names the claim and whose targets include the root artifact of the phase that raised it. It replaces the challenged obligation within those targets: a constraint binds them; a proposal they investigate and adopt or refute.

## The frontier

`rp check <pipeline folder>` reads `run-config.md`, reports every phase up to its target, and names the **frontier** — the first item of the following, printed as the `frontier` line that `loop.md` dispatches:

1. **A contradiction** — file format is checked first; nothing is computed from a malformed file:
   - malformed frontmatter → `INVALID FRONTMATTER <path>`;
   - a malformed fixed line or id declaration → `INVALID LINE <path>` or `INVALID IDS <path>`;
   - mirror drift → `stamp <path>`;
   - an undeclared lane or a symlink → `undeclared lane <path>` or `symlink <path>`.
2. **A pending claim targeting owner territory** → `claim <review> → <target> (owner escalation)`. A claim is pending when all of these hold: it is unanswered, it is its lane's latest verdict, its wave is closed with no `rejected` lane, its `reviewed` pins are fresh, and its target is unchanged. A claim whose wave is still open, or whose wave has a rejection, waits for that wave.
3. **Per phase, in order**:
   - Open production lanes first, each a sub-pipeline of the root artifact (missing / stale / wave / rejected wave / pending challenge). A lane waits until every `after` lane's valid wave is current, recursively. When every open lane's valid wave is current → `consolidate <artifact>`.
   - Then the root artifact, the first that holds:
     - missing → `converge <artifact>`;
     - no recorded package → `stamp <artifact>`;
     - stale, or with a pending challenge, or with a closed wave that rejected → `converge <artifact>`;
     - an unstamped review → `stamp <review>`;
     - an invalid review → `INVALID REVIEW <review>`;
     - no current valid wave → `review wave <artifact>`.
   - In build and document, once the plan's valid wave is current, the first that holds:
     - a task that depends on a cycle or a missing task → `invalid plan: …`;
     - an unstamped report of any attempt → `stamp <report>`;
     - an invalid report → `INVALID REPORT <report>`;
     - a task not done — the lowest-numbered whose dependencies are done → `task <phase>/<task id>`, or `blocked <phase>/<task id>` when its latest report is fresh and `blocked`;
     - no current valid phase-review wave → `build review` or `document review`, or `converge <plan>` when the closed wave rejected;
     - a current valid phase-review wave completes the phase — or the plan's own, when it has no tasks.
4. **Complete** → `complete` when every challenge and claim targeting a phase within the target is resolved, and every phase through the target has a current valid wave over a fresh artifact; `challenges or claims still adjudicated, awaiting approval` when the phases are complete and such a challenge is not. A base that does not resolve is an error, never completion.

`rp check` also reports, from review frontmatter, the number of **waves this episode** and, under **`recurs`**, every `prior-finding` reference in the episode's reviews.

## Discovery

Every live pipeline is a `<pipelines folder root>/<pipeline slug>/` folder at some branch tip; every merged one is in the base branch's tree. To find pipelines for an issue: fetch; collect the tree id of every `<pipelines folder root>/<pipeline slug>` at each branch tip; keep the pipelines whose tree id differs from every id that folder ever had in the base branch's history (those are the live ones); read their `0-intent/intent.md` and the base branch's; keep those whose `origin` names the issue. Branch and folder names are not used to find pipelines; only the `origin` line is. `rp check --ref` then reads each pipeline at its tip.
