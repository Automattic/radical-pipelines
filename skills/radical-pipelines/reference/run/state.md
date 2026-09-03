# State

Everything about a pipeline is computed from the working tree at any commit. Git history is never required. `rp` — `node <this skill's folder>/scripts/rp.mjs` — computes what this file defines; every computation can be reproduced with bare git.

## Terms

- **Identity** — the hash of a file's body, everything below its frontmatter: `sed '1,/^---$/d' <file> | git hash-object --stdin`. A file without frontmatter is all body.
- **Pin** — a frontmatter line recording the identity of an input the file consumed: `<path>@<identity>`, path relative to the pipeline folder. Only you write pins, through `rp stamp`.
- **Stale** — a pin whose target's current identity differs from the pinned one.
- **Verdict** — a review's conclusion: `approved`, `rejected`, or `unsatisfiable`. An `unsatisfiable` verdict names a `target`: `<path>#<id>`.
- **Trigger** — a file asking for work on a target: an external amendment, an `unsatisfiable` verdict, or a failed task report. A trigger is **resolved** when its target pins it, or when a review of its target carries `origin: <trigger>` and `verdict: approved`.
- **Done-set** — the tasks whose latest task report has `outcome: completed`.

## Frontmatter

Frontmatter holds only pins and mirrors. A mirror copies a declaration the agent made in the body (`Verdict:`, `Target:`, `Prior finding:`, `Outcome:`, `Origin:`). Nothing meaningful exists only in frontmatter, so identity loses nothing by excluding it, and stamping never changes identity.

| Key         | Files                        | Value                                                                    |
| ----------- | ---------------------------- | ------------------------------------------------------------------------ |
| `pins`      | artifacts                    | list of `<path>@<identity>`                                              |
| `reviewed`  | reviews                      | list of `<path>@<identity>` — the files the verdict is about             |
| `verdict`   | reviews                      | `approved` \| `rejected` \| `unsatisfiable`                              |
| `lane`      | reviews                      | `r1`, `r2`, … or `owner`; always present                                 |
| `iteration` | reviews                      | per-lane counter, starting at 1, never reset                             |
| `target`    | triggers                     | `<path>#<id>`                                                            |
| `origin`    | anything born from something | the issue reference; an external source; the trigger a review responds to |
| `recurs`    | reviews                      | mirror of `Prior finding: <review>#<issue>, resolution failed`           |
| `head`      | build reviews                | the commit the code was reviewed at                                      |
| `task`, `attempt`, `outcome` | task reports | task id; attempt number; `completed` \| `failed`                       |

Review pins are immutable: a review is about one identity; a changed artifact gets a new review. Artifact pins are refreshed only after a producer pass concluded that the changed input requires no edit.

## Pins by file

| File                                   | Pins                                                              |
| -------------------------------------- | ----------------------------------------------------------------- |
| `0-intent/intent.md`                   | none; `origin`: the issue reference                               |
| `0-intent/<n>-amendment.md`            | none; `target`, `origin`                                          |
| `1-spec/spec.md`                       | `intent.md`; every amendment it absorbed                          |
| `1-spec/spec-research.md`              | none — sibling of `spec.md`, reviewed with it                     |
| spec review                            | `reviewed`: `spec.md`, `spec-research.md`                         |
| `2-design-doc/design-doc.md`           | `intent.md`, `spec.md`; absorbed amendments                       |
| design-doc review                      | `reviewed`: `design-doc.md`, `design-doc-research.md`             |
| `3-build/build-plan.md`                | `spec.md`, `design-doc.md`; absorbed amendments and failed task reports |
| plan review                            | `reviewed`: `build-plan.md`, `build-plan-research.md`             |
| `3-build/tasks/task-<id>-<attempt>.md` | none; `task`, `attempt`, `outcome`; a failed one targets `build-plan.md` |
| build review                           | `reviewed`: `build-plan.md`; `head`                               |

A file pins exactly what it consumed, never its sibling. Downstream pins artifacts, never records. Every review of an `unsatisfiable`-targeted artifact, and every artifact produced with a trigger among its materials, carries that trigger — as `origin` or as a pin.

## Names

- Pipeline folder: `<pipelines folder root>/<slug>/`; slug from the **Branch naming** convention; a second pipeline for the same issue appends `-2`, `-3`.
- Branch: the slug; lanes `<slug>_<phase>-lane-<k>`; a post-merge amendment `<slug>_amendment-<n>`.
- Reviews: `<artifact>-review-<iteration>.md` single-lane; `<artifact>-review-r<lane>-<iteration>.md` multi-lane. `<artifact>` is `spec`, `design-doc`, `build-plan`, `build`. You compute filenames and pass them in the prompt.
- Task reports: `3-build/tasks/task-<task id>-<attempt>.md`, one per attempt, never overwritten.
- Ids inside artifacts are stable: requirements `R<n>`, decisions `D<n>`, assumptions `A<n>`, tasks `T<n>`. Nothing is renumbered; new content gets a new id.

## Owner territory

An intent item outside its "Assumptions / directions to explore" section, or a record entry attributed `owner`. Only quoted owner words are attributed `owner`.

## The frontier

`rp check <pipeline folder>` reports, in this order:

1. **Unresolved triggers** → work on their target, before anything else.
2. **Claims** — a lane's latest verdict is `unsatisfiable` and its `reviewed` pins are fresh (a claim about a changed artifact is moot). Resolved by refutation (a review of the target approved citing it) → work on the claiming artifact with the refutation. Pending (target identity unchanged): target in owner territory → a pending owner escalation; target itself the subject of a pending claim → suspended; otherwise → work on the target. `rp check` flags intent targets; for a record entry, read its attribution.
3. **Phases 1 → 3**, per artifact: missing → produce; any pin stale → produce with the delta; not approved → review wave. Approved means every declared lane's latest verdict is `approved` with `reviewed` pins matching current identities. In build, with the plan approved and fresh: tasks outside the done-set → dispatch; all done → build review, fresh iff `git diff --quiet <head> HEAD -- . ':(exclude)<pipelines folder root>'` succeeds.
4. **Complete** through the target phase → close-out.

Counters, read from review frontmatter: **waves this episode** — reviews of an artifact since its last approval; **`recurs`** — a prior finding whose resolution failed.

## Discovery

Every live pipeline is a `<pipelines folder root>/<slug>/` folder at some branch tip; every merged one is in the main branch's tree. To find pipelines for an issue: `git fetch`, collect the `<pipelines folder root>` tree id of each branch tip with one `git cat-file --batch-check` pass, skip branches whose id appears in the main branch's history of that tree, read `0-intent/intent.md` from the rest and from main, match `origin`. Names carry no query semantics.
