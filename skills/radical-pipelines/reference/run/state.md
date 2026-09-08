# State

Everything about a pipeline is computed from the working tree at any commit. `rp` — `node <this skill's folder>/scripts/rp.mjs` — computes what this file defines; `rp check` is the only source of the frontier. When the tree contradicts it, or it names something you cannot dispatch, stop and report a defect in the skill; never work around it.

## Terms

- **Identity** — the first 12 hexadecimal characters of the git blob hash of every body byte: those below the frontmatter, or the whole file when it has none. The pipeline folder holds files and folders only: a symlink is a defect.
- **Pin** — `<path>@<identity>`, path relative to the pipeline folder. Only you write pins, through `rp stamp`.
- **Package** — a set of (member, identity) pairs recording what an artifact consumed or a review judged. Recorded members remain consumed until the producer records a replacement package. An artifact's package contains its required inputs with their approving waves, adjudicated triggers, and consumed lane packages. A review's package is the artifact package it judged, plus the artifact and record; plan reviews add tasks, phase reviews add reports. Historical material is supplied through the references in that package; its content joins the verdict only when the artifact pins it. A lane package is its artifact, record, and valid approving wave.
- **Stale** — a recorded package that differs from the required package by member or identity.
- **Lane** — one instance of a role on one artifact. Every reviewer has an implicit lane with no id; the project may declare named review lanes and named production lanes (`../conventions/agents.md`). A named lane's identity is its whole declaration — id, brief, materials, `after` — as one **fingerprint**: a lane artifact or review stamped with another is stale; a lane folder or review the declaration lacks is a defect, never a lane. A production lane's scope contains its artifact and record: declarations expand those paths into the lane; all other paths retain their identity. Prompts and pins use that expansion. A production lane closes when the root consumes the package of its valid wave. That package remains closed history outside the frontier. Root consolidation combines closed packages with packages whose valid wave is current.
- **Wave** — one review of an artifact by every declared lane; numbered per artifact. A wave is valid when every lane records `approved` and its `reviewed` equals the reference by equality as sets of (member, identity) pairs; a filtered lane uses its selected projection. Live state takes its reference from the artifact's recorded consumption, expanded to its review package. A closed lane uses the independent reference recorded by the root at consolidation, bound to the lane package it consumed. A wave is current when valid and its reference equals the package required now.
- **Verdict** — a review's conclusion: `approved`, `rejected`, or `unsatisfiable`. An `unsatisfiable` verdict names a `target`: `<path>#<id>`.
- **Outcome** — a task report's conclusion: `completed`; `failed` — the observed product contradicts the task, or the task is contradictory or incomplete, with reproducible evidence; `blocked` — the product was not observed, and the report names what prevented it.
- **Trigger** — a file asking for work on a target: an external amendment, an `unsatisfiable` verdict (a **claim**), or a fresh failed task report. A target is one of the four artifacts, addressed by an id that exists when the trigger lands (`build-plan.md#T3` for a task), or — for a claim — an existing intent Goal, Constraint, or Decision. After landing, resolution uses the recorded target regardless of its current textual presence. A trigger is **pending** until its target **adjudicates** it by pinning it — the disposition, adoption or refutation, lives in the record — and **resolved** when the target has a current valid wave that names the trigger, or when a closed wave of the target corroborates an `unsatisfiable` verdict citing it as `origin` (escalated one layer up). A claim is its lane's verdict: it persists until resolved, superseded (its target changed, or its lane reviewed again), or moot (the artifact it judged changed). A failed task report holds its task until adjudicated or until the task changes; a blocked one leaves it pending for you.
- **Done-set** — the tasks whose latest report has `outcome: completed` and fresh `reviewed` pins.
- **Base branch** — the artifact base branch of the **Artifact storage** convention: where pipelines start and merge. **Base** — the commit a pipeline's own commits follow: the merge-base of its branch with the branch its intent `starts-from`, else with the base branch, passed as `--base`.
- **Episode** — an artifact's waves since its last valid, current wave in its context; a counter `rp check` reports, never a gate.
- **Assumption** — every pending load-bearing claim, labeled `assumed` with stable `A<n>` and its verification condition. Questions and risks that depend on it cite that id. Accepting a consequence leaves its verification pending.

## Frontmatter

Frontmatter holds only pins, mirrors, and landing facts. Its syntax and field types must be valid. A mirror copies a declaration outside Markdown code fences in the body, in its fixed form (`Verdict:`, `Brief:`, `Target:`, `Prior finding:`, `Outcome:`, `Origin:`, `Depends on:`, a report's `## Commits`) — a fixed line holds exactly its value in the field's grammar and is mirrored whole or rejected as `INVALID`, never mined for tokens; `Verdict`, `Brief`, `Target`, and `Outcome` occur once. A landing fact records what the stamp observed (`head`, `target-identity`, `attempt`) or what you did (`lane`). A stamp with `--reviewed` validates and fixes the consumed package. Later stamps preserve that package and landing facts while updating what their options request. `--set` accepts only `lane`. `rp check` derives validity from the tree, reads frontmatter and identities, and recomputes every mirror from the body: a file whose mirrors differ is stamped again before anything reads them; a stamped review without `Verdict:`, or report without `Outcome:`, is invalid.

| Key         | Files                        | Value                                                                    |
| ----------- | ---------------------------- | ------------------------------------------------------------------------ |
| `pins`      | artifacts                    | list of `<path>@<identity>`                                              |
| `lane-packages` | consolidated roots | list of JSON strings `[artifact path, consumed lane pins, reference pins]`; stamp captures the candidate's complete review package independently of its reviews and preserves it while the root consumes the same lane pins |
| `reviewed`  | reviews, task reports        | list of `<path>@<identity>` — what the verdict is about; immutable       |
| `verdict`   | reviews                      | `approved` \| `rejected` \| `unsatisfiable`                              |
| `brief`     | reviews                      | the lane's brief, as the review declares it                              |
| `target`    | triggers                     | `<path>#<id>`                                                            |
| `target-identity` | `unsatisfiable` reviews | the target's identity when the verdict landed                           |
| `origin`    | anything born from something | `issue <canonical reference>`; an external source; the trigger a review responds to; a list when several |
| `recurs`    | reviews                      | mirror of `Prior finding: <review>#<issue>, resolution failed`           |
| `depends`   | tasks                        | mirror of `Depends on:` — the task ids it waits for                      |
| `commits`   | task reports                 | mirror of `## Commits` — every line that starts with a commit hash, after a bullet or a backtick; each commit exists and is stored as its full hash, whatever length the body wrote |
| `head`      | files with pins              | the commit a stamp with pins observed: the diff base for the next delta review or re-synthesis |
| `lane`      | a named lane's artifact and reviews | the fingerprint of the declaration the agent was dispatched under                 |
| `attempt`, `outcome` | task reports        | the attempt, from the filename; `completed` \| `failed` \| `blocked`     |

A stamp follows the commit of what it stamps and is committed on top of it, on the branch the work landed on. Every commit on the branch outside the pipelines folder is claimed by a task report, which lands in a commit of its own after the commits it names.

## Pins by file

A file records its package when first consumed and records a new package only after its producer reconfirms it. It never consumes its sibling record. A later phase never consumes an earlier phase's record.

| File                                   | Pins                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `0-intent/intent.md`                   | none; `origin`: `issue <canonical reference>`                                |
| `0-intent/<n>-amendment.md`            | none; `target`, `origin`                                                     |
| `1-spec/spec.md`                       | `intent.md`; every trigger it adjudicated; when consolidated, every lane's `spec.md`, record, and approving reviews |
| spec or design production-lane artifact | what its root artifact would, plus each `after` lane's artifact, record, and approving reviews |
| `2-design-doc/design-doc.md`           | `intent.md`, `spec.md`, an approving spec review; triggers; lanes when consolidated |
| `3-build/build-plan.md`                | `spec.md`, `design-doc.md`, their approving reviews; triggers                |
| `3-build/tasks/T<n>.md`                | none; `depends`                                                              |
| `3-build/tasks/T<n>-report-<k>.md`     | `reviewed`: the task it executed and the tasks it depends on; `outcome`; a failed one targets `build-plan.md` |
| `4-document/document-plan.md`          | `spec.md`, `design-doc.md`, `build-plan.md`, their approving reviews, every build task and report, the approving build review; triggers |
| document tasks and reports             | as in build                                                                  |

## Names

- Pipeline folder: `<pipelines folder root>/<slug>/`; the issue-derived slug is one path segment, a valid git ref, contains no `_`, and names the initial pipeline branch. A second pipeline for the same issue appends `-2`, `-3`. Work on a merged pipeline uses branch `<slug>_<n>`.
- Auxiliary branches: `<phase>` is the declaration artifact (`spec`, `design-doc`, `build-plan`, `build`, `document-plan`, `document`). After `<slug>-<phase>-`, production lanes occupy `<lane>`, root review lanes `review-<review lane>`, and production-lane reviews `<production lane>-review-<review lane>`. Expanded names are unique; `rp check` rejects a collision.
- Reviews: `<artifact>-review-<wave>.md` for the implicit lane, `<artifact>-review-<lane>-<wave>.md` for a named lane. `<artifact>` is `spec`, `design-doc`, `build-plan`, `build`, `document-plan`, `document`. You compute filenames and pass them in the prompt. A reviewer that adjudicates a trigger writes `Origin: <trigger path>` in its review.
- Production lanes: `<phase>/<lane>/` holds the lane's artifact, record, and reviews, named as at the root.
- Tasks: `<phase>/tasks/T<n>.md`, one file per task, self-contained — an e2e task carries its flows, a task naming `Verifies: A<n>` carries the assumption's condition; reports `<phase>/tasks/T<n>-report-<k>.md`, one per attempt, never overwritten. The next path is `k+1` of the last report with a valid landed package and metadata; landing validates it before publication, after which it stays stable. A plan is `<plan>.md` — overview, assumptions, order — plus its tasks folder.
- Ids inside artifacts are stable: requirements `R<n>`, decisions `D<n>`, assumptions `A<n>`, tasks `T<n>`; intent items `#goal`, `#constraint-<n>`, `#context-<n>`, `#assumption-<n>`, `#decision-<n>`. Nothing is renumbered or reused; new content gets the next id — a plan produced anew continues the numbering.

## Owner territory

`0-intent/intent.md` is the only file that carries the owner's words: the issue as written, and every later decision quoted under `## Decisions`. Owner territory is what the work must satisfy: its Goal, Constraints, and Decisions. Records cite the intent; they never hold owner words of their own.

## The frontier

`rp check <pipeline folder> --base <base branch> --lanes <declaration> --target-phase <n>` reports every phase up to the target and names the **frontier** — the first item of:

1. **A contradiction** — malformed frontmatter → you repair and re-stamp it; malformed fixed line → its author fixes it; mirror drift → stamp it; an undeclared lane or symlink → stop and tell the owner. Representation is validated first; facts that depend on an invalid representation remain uncomputed.
2. **A pending trigger** targeting a phase within the target → work on its target.
3. **A pending claim** — an `unsatisfiable` verdict that is its lane's latest, whose wave closed with no `rejected` lane, whose `reviewed` pins are fresh, whose target is unchanged and within the target phase. Target in owner territory → owner escalation. A pending claim made by the target's own lane reviews suspends claims against that target. A claim whose wave is still open, or whose wave has a rejection, waits for that wave.
4. **Per phase, in order** — open production lanes first, each a sub-pipeline of the root artifact (missing / stale / wave / adjudication; a lane waits until every `after` lane's valid wave is current, recursively; every open lane's valid wave current → consolidate); then the root artifact: missing → produce; no recorded package → stamp what its producer consumed; stale → produce with the package change; an unstamped review → stamp it; an invalid one → its reviewer finishes it; without a current valid wave → a review wave, or an adjudication when the wave closed with a rejection. In build and document, after the plan's valid wave is current: an unstamped report of any attempt → stamp it; an invalid one → its worker finishes it; the next task — the lowest-numbered task whose dependencies are done and which is neither done nor held by an unadjudicated failure — as `blocked <phase>/T<n>` when its latest report is fresh and `blocked`; all done → the phase review wave; its current valid wave completes the phase.
5. **Complete** — every trigger and claim targeting a phase within the target resolved, every phase through the target has a current valid wave over a fresh artifact, and every commit after the base outside the pipelines folder claimed by a task report (`## Commits`) → close-out. An unclaimed commit is the frontier: work that reached the branch outside a task. A base that does not resolve is an error, never completion.

The declaration: `--lanes "spec=security@<fingerprint>[materials=1-spec/spec.md+0-intent/intent.md]|event-driven@<fingerprint>,contrarian@<fingerprint><event-driven;build=fresh@<fingerprint>"` — per artifact, the named review lanes (the implicit lane always exists) and, after `|`, the production lanes with their `after` dependencies (`<`, joined by `+`), each with its fingerprint. A filtered lane adds `[materials=<path>+<path>]`; use the same comma-separated paths in `rp fingerprint <id> --materials <path>,<path>`. `rp check` rejects malformed components, duplicate artifacts, lane ids, or material paths, an unknown artifact, a reserved lane id (`tasks`), an undeclared or cyclic dependency, or production lanes outside the spec and design doc.

Counters, read from review frontmatter: **waves this episode** and **`recurs`** — a prior finding whose resolution failed, within the episode.

## Discovery

Every live pipeline is a `<pipelines folder root>/<slug>/` folder at some branch tip; every merged one is in the base branch's tree. To find pipelines for an issue: `git fetch`, collect the tree id of every `<pipelines folder root>/<slug>` at each branch tip with one `git cat-file --batch-check` pass, keep the pipelines whose tree id differs from every id that folder had in the base branch's history, read their `0-intent/intent.md` and the base branch's, match `origin`. Names carry no query semantics. `rp check --ref` then reads each pipeline at its tip.
