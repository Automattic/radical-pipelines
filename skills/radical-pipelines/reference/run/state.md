# State

Everything about a pipeline is computed from the working tree at any commit. `rp` — `node <this skill's folder>/scripts/rp.mjs` — computes what this file defines.

## Terms

- **Identity** — the hash of a file's body: `git hash-object --stdin` of everything below the frontmatter, or of the whole file when it has none.
- **Pin** — a frontmatter line recording the identity of an input the file consumed: `<path>@<identity>`, path relative to the pipeline folder. Only you write pins, through `rp stamp`.
- **Stale** — a pin whose target's current identity differs from the pinned one.
- **Verdict** — a review's conclusion: `approved`, `rejected`, or `unsatisfiable`. An `unsatisfiable` verdict names a `target`: `<path>#<id>`.
- **Trigger** — a file asking for work on a target: an external amendment, an `unsatisfiable` verdict (a **claim**), or a failed task report. Its target **adjudicates** it by pinning it — the disposition, adoption or refutation, lives in the record. It is **resolved** when the target is approved at an identity carrying that pin, or when a review of the target cites it as `origin` with an `unsatisfiable` verdict (escalated one layer up). A failed task report is superseded by the task's next attempt.
- **Done-set** — the tasks whose latest report has `outcome: completed` and a fresh pin on the task.

## Frontmatter

Frontmatter holds only pins, mirrors, and landing facts. A mirror copies a declaration the agent made in the body, in its fixed form (`Verdict:`, `Charter:`, `Target:`, `Prior finding:`, `Outcome:`, `Origin:`, `Depends on:`); a landing fact records what the stamp observed (`head`, `target-identity`). `rp check` reads frontmatter and identities only.

| Key         | Files                        | Value                                                                    |
| ----------- | ---------------------------- | ------------------------------------------------------------------------ |
| `pins`      | artifacts                    | list of `<path>@<identity>`                                              |
| `reviewed`  | reviews                      | list of `<path>@<identity>` — the files the verdict is about; immutable  |
| `verdict`   | reviews                      | `approved` \| `rejected` \| `unsatisfiable`                              |
| `lane`      | reviews                      | the review lane: `r1`, `r2`, … or `owner`; always present                |
| `charter`   | reviews                      | the lane's charter, as the review declares it                            |
| `iteration` | reviews                      | per-lane counter, starting at 1, never reset                             |
| `target`    | triggers                     | `<path>#<id>`                                                            |
| `target-identity` | `unsatisfiable` reviews | the target's identity when the verdict landed                           |
| `origin`    | anything born from something | the issue reference; an external source; the trigger a review responds to; a list when several |
| `recurs`    | reviews                      | mirror of `Prior finding: <review>#<issue>, resolution failed`           |
| `depends`   | tasks                        | mirror of `Depends on:` — the task ids it waits for                        |
| `head`      | every stamped file           | the commit the stamp observed: the diff base for the next delta review or re-synthesis |
| `attempt`, `outcome` | task reports        | attempt number; `completed` \| `failed`                                  |

A stamp is committed together with what it stamps, on the branch the work landed on.

## Pins by file

A file pins exactly what it consumed, never its sibling record. Every trigger among its materials is pinned; so is every approving review it read.

| File                                   | Pins                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `0-intent/intent.md`                   | none; `origin`: the issue reference                                          |
| `0-intent/<n>-amendment.md`            | none; `target`, `origin`                                                     |
| `1-spec/spec.md`                       | `intent.md`; adjudicated triggers; when consolidated, every lane's `spec.md` and record |
| `1-spec/lane-<k>/spec.md`              | what the root artifact would                                                 |
| spec review                            | `reviewed`: `spec.md`, `spec-research.md`                                    |
| `2-design-doc/design-doc.md`           | `intent.md`, `spec.md`, the approving spec reviews; adjudicated triggers; lane artifacts and records when consolidated |
| design-doc review                      | `reviewed`: `design-doc.md`, `design-doc-research.md`                        |
| `3-build/build-plan.md`                | `spec.md`, `design-doc.md`, the approving design-doc reviews; adjudicated triggers |
| `3-build/tasks/T<n>.md`                | none; `depends`                                                              |
| plan review                            | `reviewed`: `build-plan.md`, `build-plan-research.md`, every task            |
| `3-build/tasks/T<n>-report-<k>.md`     | the task it executed; `attempt`, `outcome`; a failed one targets `build-plan.md` |
| build review                           | `reviewed`: `build-plan.md`, every task, every report                        |
| `4-document/document-plan.md`          | `spec.md`, `design-doc.md`, `3-build/build-summary.md`, the approving build review; adjudicated triggers |
| document plan review, task reports, document review | as in build                                                     |

Required pins — the artifact's inputs (`intent.md` for the spec; `intent.md` and `spec.md` for the design doc; `spec.md` and `design-doc.md` for the build plan; those and `build-summary.md` for the document plan) — make an artifact stamped; the rest make it faithful.

## Names

- Pipeline folder: `<pipelines folder root>/<slug>/`; slug from the **Branch naming** convention; a second pipeline for the same issue appends `-2`, `-3`.
- Branch: the slug. Work on a merged pipeline — an amendment, a later phase — runs on `<slug>_<n>` from the main branch. Production lanes `<slug>_<phase>-lane-<k>`; review lanes `<slug>_<phase>-review-<lane>`, or `<slug>_<phase>-lane-<k>-review-<lane>` inside a production lane.
- Reviews: `<artifact>-review-<iteration>.md` single-lane; `<artifact>-review-<lane>-<iteration>.md` multi-lane. `<artifact>` is `spec`, `design-doc`, `build-plan`, `build`, `document-plan`, `document`. You compute filenames and pass them in the prompt.
- Production lanes: `<phase>/lane-<k>/` holds the lane's artifact, record, and reviews, named as at the root.
- Tasks: `<phase>/tasks/T<n>.md`, one file per task; reports `<phase>/tasks/T<n>-report-<k>.md`, one per attempt, never overwritten. A plan is `<plan>.md` — overview, verification plan, assumptions, order — plus its tasks folder.
- Ids inside artifacts are stable: requirements `R<n>`, decisions `D<n>`, assumptions `A<n>`, tasks `T<n>`; intent items `#goal`, `#constraint-<n>`, `#context-<n>`, `#assumption-<n>`, `#decision-<n>`. Nothing is renumbered; new content gets a new id.

## Owner territory

`0-intent/intent.md` is the only file that carries the owner's words: the issue as written, and every later decision quoted under `## Decisions`. Owner territory is what the work must satisfy: its Goal, Constraints, and Decisions. Records cite the intent; they never hold owner words of their own.

## The frontier

`rp check <pipeline folder> --lanes <declaration> --target-phase <n>` (`--lanes r1,r2`, or per artifact `spec=owner;design-doc=r1,r2` — the run policy's lanes, `owner` being the assisted workflow's; `--ref <branch>` reads a branch without checking it out) reports every phase up to the target and names the **frontier** — the first item of:

1. **An unresolved trigger** → work on its target.
2. **A pending claim** — an `unsatisfiable` verdict whose wave closed with no `rejected` lane, whose `reviewed` pins are fresh, and whose target is unchanged. Target in owner territory → owner escalation. Target itself the subject of a pending claim → suspended, resolve that one first. A claim whose wave is still open, or whose wave has a rejection, waits for that wave.
3. **Per phase, in order** — production lanes first, each a sub-pipeline of the root artifact (missing / stale / wave / adjudication; every lane approved and fresh → consolidate; root present → lanes closed); then the root artifact: missing → produce; stale or incomplete pins → produce with the delta; not approved → a review wave, or an adjudication when the wave closed with a rejection; an artifact whose episode reaches the audit threshold → **audit**, the valve threshold → **valve**. Approved means every declared lane's latest verdict is `approved` with fresh `reviewed` pins. A plan is approved when its review names every current task. In build and document, with the plan approved and fresh: the next task — the lowest-numbered task whose dependencies are done and which is not done nor failed; all done → the phase review, fresh iff its `reviewed` pins are fresh and name exactly the phase's tasks and reports; approved → the summary.
4. **Complete** — no trigger unresolved, no claim pending, every phase through the target approved, fresh, and — for build and document — reviewed with its summary present → close-out.

Counters, read from review frontmatter: **waves this episode** — a lane's iterations since its last approval, the maximum over lanes; **`recurs`** — a prior finding whose resolution failed, within the episode.

## Discovery

Every live pipeline is a `<pipelines folder root>/<slug>/` folder at some branch tip; every merged one is in the main branch's tree. To find pipelines for an issue: `git fetch`, collect the `<pipelines folder root>` tree id of each branch tip with one `git cat-file --batch-check` pass, skip branches whose id appears in the main branch's history of that tree, read `0-intent/intent.md` from the rest and from main, match `origin`. Names carry no query semantics. `rp check --ref` then reads each pipeline at its tip.
