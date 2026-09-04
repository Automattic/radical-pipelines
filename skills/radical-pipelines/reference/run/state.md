# State

Everything about a pipeline is computed from the working tree at any commit. `rp` — `node <this skill's folder>/scripts/rp.mjs` — computes what this file defines; `rp check` is the only source of the frontier. When the tree contradicts it, or it names something you cannot dispatch, stop and report a defect in the skill; never work around it.

## Terms

- **Identity** — the hash of a file's body: `git hash-object --stdin` of every byte below the frontmatter, or of the whole file when it has none. The pipeline folder holds files and folders only: a symlink is a defect.
- **Pin** — a frontmatter line recording the identity of an input the file consumed: `<path>@<identity>`, path relative to the pipeline folder. Only you write pins, through `rp stamp`.
- **Stale** — a pin whose target's current identity differs from the pinned one.
- **Lane** — one instance of a role on one artifact. Every reviewer has an implicit lane with no id; the project may declare named review lanes and named production lanes (`../conventions/agents.md`). A named lane's identity is its whole declaration — id, brief, materials, `after` — as one **fingerprint**: a lane artifact or review stamped with another is stale; a lane folder or review the declaration lacks is a defect, never a lane.
- **Wave** — one review of an artifact by every one of its lanes; numbered per artifact, shared by its lanes. A wave is closed when every lane's review of it is stamped and fresh.
- **Verdict** — a review's conclusion: `approved`, `rejected`, or `unsatisfiable`. An `unsatisfiable` verdict names a `target`: `<path>#<id>`.
- **Outcome** — a task report's conclusion: `completed`; `failed` — the product was observed and contradicts the task, with reproducible evidence; `blocked` — the product was not observed, and the report names what prevented it.
- **Trigger** — a file asking for work on a target: an external amendment, an `unsatisfiable` verdict (a **claim**), or a fresh failed task report. A target is one of the four artifacts, addressed by an id (`build-plan.md#T3` for a task), or — for a claim — an intent Goal, Constraint, or Decision. A trigger is **pending** until its target **adjudicates** it by pinning it — the disposition, adoption or refutation, lives in the record — and **resolved** when the target is approved by a wave that names the trigger, or when a closed wave of the target corroborates an `unsatisfiable` verdict citing it as `origin` (escalated one layer up). A claim is its lane's verdict: it persists until resolved, superseded (its target changed, or its lane reviewed again), or moot (the artifact it judged changed). A failed task report holds its task until adjudicated or until the task changes; a blocked one leaves it pending for you.
- **Done-set** — the tasks whose latest report has `outcome: completed` and fresh `reviewed` pins.
- **Base branch** — the artifact base branch of the **Artifact storage** convention: where pipelines start and merge. **Base** — the commit a pipeline's own commits follow: the merge-base of its branch with the branch its intent `starts-from`, else with the base branch, passed as `--base`.
- **Episode** — an artifact's waves since the last wave every lane approved, or since its `episode-start-<series>`.

## Frontmatter

Frontmatter holds only pins, mirrors, and landing facts. A mirror copies a declaration the agent made in the body, in its fixed form (`Verdict:`, `Brief:`, `Target:`, `Prior finding:`, `Outcome:`, `Origin:`, `Depends on:`, a report's `## Commits`); a landing fact records what the stamp observed (`head`, `target-identity`, `attempt`) or what you did (`audited-<series>`, `episode-start-<series>`, `lane`). `--mirror` rewrites every mirror from the body — a declaration the body lost leaves the frontmatter — and may run again on a stamped file. Mirrors and pins are never written by `--set`; `reviewed` is never rewritten — a changed review is a new file. `rp check` reads frontmatter and identities, and recomputes every mirror from the body: a file whose mirrors differ is stamped again before anything reads them; a stamped review without `Verdict:`, or report without `Outcome:`, is invalid.

| Key         | Files                        | Value                                                                    |
| ----------- | ---------------------------- | ------------------------------------------------------------------------ |
| `pins`      | artifacts                    | list of `<path>@<identity>`                                              |
| `reviewed`  | reviews, task reports        | list of `<path>@<identity>` — what the verdict is about; immutable       |
| `verdict`   | reviews                      | `approved` \| `rejected` \| `unsatisfiable`                              |
| `brief`     | reviews                      | the lane's brief, as the review declares it                              |
| `target`    | triggers                     | `<path>#<id>`                                                            |
| `target-identity` | `unsatisfiable` reviews | the target's identity when the verdict landed                           |
| `origin`    | anything born from something | the issue reference; an external source; the trigger a review responds to; a list when several |
| `recurs`    | reviews                      | mirror of `Prior finding: <review>#<issue>, resolution failed`           |
| `depends`   | tasks                        | mirror of `Depends on:` — the task ids it waits for                      |
| `commits`   | task reports                 | mirror of `## Commits` — every line that starts with a commit hash, after a bullet or a backtick; each commit exists |
| `head`      | files with pins              | the commit a stamp with pins observed: the diff base for the next delta review or re-synthesis |
| `lane`      | a named lane's artifact and reviews | the fingerprint of the declaration the agent was dispatched under                 |
| `attempt`, `outcome` | task reports        | the attempt, from the filename; `completed` \| `failed` \| `blocked`     |
| `audited-<series>` | artifacts             | the wave an audit covered, per review series (`spec`, `build-plan`, `build`, …) |
| `episode-start-<series>` | artifacts       | the wave a new episode starts at, after the valve or new input           |

A stamp follows the commit of what it stamps and is committed on top of it, on the branch the work landed on. Every commit on the branch outside the pipelines folder is claimed by a task report, which lands in a commit of its own after the commits it names.

## Pins by file

A file pins exactly what it consumed, never its sibling record.

| File                                   | Pins                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `0-intent/intent.md`                   | none; `origin`: the issue reference                                          |
| `0-intent/<n>-amendment.md`            | none; `target`, `origin`                                                     |
| `1-spec/spec.md`                       | `intent.md`; every trigger it adjudicated; when consolidated, every lane's `spec.md`, record, and approving reviews |
| `1-spec/<lane>/spec.md`                | what the root artifact would, plus the artifacts of the lanes it comes `after` |
| `2-design-doc/design-doc.md`           | `intent.md`, `spec.md`, an approving spec review; triggers; lanes when consolidated |
| `3-build/build-plan.md`                | `spec.md`, `design-doc.md`, their approving reviews; triggers                |
| `3-build/tasks/T<n>.md`                | none; `depends`                                                              |
| `3-build/tasks/T<n>-report-<k>.md`     | `reviewed`: the task it executed and the tasks it depends on; `outcome`; a failed one targets `build-plan.md` |
| `4-document/document-plan.md`          | `spec.md`, `design-doc.md`, `build-plan.md`, their approving reviews, the approving build review; triggers |
| document tasks and reports             | as in build                                                                  |

**What a review names** (`reviewed`): its artifact, its record, and everything the artifact pins — its inputs, their approving reviews, the triggers it adjudicated, its lane inputs; a plan review, every task too; a build or document review, the plan's package, every task, and every report. A review whose pins are stale, that names less or more, or whose `lane` differs from the declared fingerprint, is stale. An artifact consumes an input with its **current approval**: every lane's review of the wave that approved it.

## Names

- Pipeline folder: `<pipelines folder root>/<slug>/`; slug from the **Branch naming** convention; a second pipeline for the same issue appends `-2`, `-3`.
- Branch: the slug. Work on a merged pipeline — an amendment, a later phase — runs on `<slug>_<n>` from the base branch. Production lanes `<slug>_<phase>-<lane>`; review lanes `<slug>_<phase>-review-<lane>`, or `<slug>_<phase>-<lane>-review-<review lane>` inside a production lane.
- Reviews: `<artifact>-review-<wave>.md` for the implicit lane, `<artifact>-review-<lane>-<wave>.md` for a named lane. `<artifact>` is `spec`, `design-doc`, `build-plan`, `build`, `document-plan`, `document`. You compute filenames and pass them in the prompt. A reviewer that adjudicates a trigger writes `Origin: <trigger path>` in its review.
- Production lanes: `<phase>/<lane>/` holds the lane's artifact, record, and reviews, named as at the root.
- Tasks: `<phase>/tasks/T<n>.md`, one file per task, self-contained — an e2e task carries its flows, a task naming `Verifies: A<n>` carries the assumption's condition; reports `<phase>/tasks/T<n>-report-<k>.md`, one per attempt, never overwritten. A plan is `<plan>.md` — overview, assumptions, order — plus its tasks folder.
- Ids inside artifacts are stable: requirements `R<n>`, decisions `D<n>`, assumptions `A<n>`, tasks `T<n>`; intent items `#goal`, `#constraint-<n>`, `#context-<n>`, `#assumption-<n>`, `#decision-<n>`. Nothing is renumbered; new content gets a new id.

## Owner territory

`0-intent/intent.md` is the only file that carries the owner's words: the issue as written, and every later decision quoted under `## Decisions`. Owner territory is what the work must satisfy: its Goal, Constraints, and Decisions. Records cite the intent; they never hold owner words of their own.

## The frontier

`rp check <pipeline folder> --base <base branch> --lanes <declaration> --target-phase <n>` reports every phase up to the target and names the **frontier** — the first item of:

1. **A contradiction** — a file whose mirrors differ from its body → stamp it; a lane the declaration lacks, or a symlink → stop and tell the owner.
2. **A pending trigger** targeting a phase within the target → work on its target. A trigger with an invalid target → re-dispatch what wrote it.
3. **A pending claim** — an `unsatisfiable` verdict that is its lane's latest, whose wave closed with no `rejected` lane, whose `reviewed` pins are fresh, whose target is unchanged and within the target phase. Target in owner territory → owner escalation. Target itself the subject of a pending claim → suspended, resolve that one first. A claim whose wave is still open, or whose wave has a rejection, waits for that wave.
4. **Per phase, in order** — declared production lanes first, each a sub-pipeline of the root artifact (missing / stale / wave / adjudication; a lane waits while a lane it comes `after` is unapproved; every lane approved and fresh → consolidate; lanes are closed once the root pins every lane's artifact, record, and approving reviews); then the root artifact: missing → produce; stale → produce with the delta; unstamped or incomplete pins → stamp what its producer consumed; an unstamped review → stamp it; an invalid one → its reviewer finishes it; not approved → a review wave, or an adjudication when the wave closed with a rejection — annotated **AUDIT** when the episode reaches the audit threshold and no audit covered this wave, **VALVE** at the valve threshold. Approved means every lane approved the current wave with fresh pins. In build and document, with the plan approved and fresh: an unstamped report of any attempt → stamp it; an invalid one → its worker finishes it; the next task — the lowest-numbered task whose dependencies are done and which is neither done nor held by an unadjudicated failure — as `blocked <phase>/T<n>` when its latest report is fresh and `blocked`; all done → the phase review; approved → the phase is complete.
5. **Complete** — every trigger and claim targeting a phase within the target resolved, every phase through the target approved and fresh, and every commit after the base outside the pipelines folder claimed by a task report (`## Commits`) → close-out. An unclaimed commit is the frontier: work that reached the branch outside a task. A base that does not resolve is an error, never completion.

The declaration: `--lanes "spec=security@<fingerprint>|event-driven@<fingerprint>,contrarian@<fingerprint><event-driven;build=fresh@<fingerprint>"` — per artifact, the named review lanes (the implicit lane always exists) and, after `|`, the production lanes with their `after` dependencies (`<`, joined by `+`), each with its fingerprint: `rp fingerprint <id> --brief <text> [--materials <list>] [--after <lane+lane>]`. `rp check` rejects an unknown artifact, a reserved lane id (`tasks`), an undeclared or cyclic dependency, or production lanes outside the spec and design doc. Thresholds: `--audit`, `--valve` (defaults 3 and 6).

Counters, read from review frontmatter: **waves this episode** and **`recurs`** — a prior finding whose resolution failed, within the episode.

## Discovery

Every live pipeline is a `<pipelines folder root>/<slug>/` folder at some branch tip; every merged one is in the base branch's tree. To find pipelines for an issue: `git fetch`, collect the tree id of every `<pipelines folder root>/<slug>` at each branch tip with one `git cat-file --batch-check` pass, keep the pipelines whose tree id differs from every id that folder had in the base branch's history, read their `0-intent/intent.md` and the base branch's, match `origin`. Names carry no query semantics. `rp check --ref` then reads each pipeline at its tip.
