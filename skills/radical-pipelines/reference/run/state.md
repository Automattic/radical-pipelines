# State

How pipeline state is recorded and computed. The script under `../../scripts/` serves this spec — `rp.mjs stamp` and `rp.mjs check` perform the operations below; discovery, until `status` ships, is performed with bare git as described.

## The invariant

The working tree at any commit fully describes the pipeline's state. The tree records the past; policy is supplied in the present; nothing records the future. Git history may optimize a computation, never be required by one. Nothing depends on commit messages.

## Locations and names

Every generated name, in one place:

| Thing | Name |
| --- | --- |
| Pipeline folder | `<pipelines folder root>/<branch base>/`, with phase subfolders `0-intent` … `4-document` |
| Pipeline branch | `<branch base>` (per the Branch naming convention, no `_`; collisions take a `-2`, `-3`, … suffix) |
| Post-merge amendment branch | `<branch base>_amend-<n>`, cut from main |
| Production lane branch | `<branch base>_<phase>-lane-<k>`; the lane produces into `<phase>/lane-<k>/` |
| Review lane branch | `<branch base>_<phase>-r<lane>` — only when a wave has more than one lane; a single-lane wave runs on the pipeline branch |
| Review file | `<artifact prefix>-review-<iteration>.md`; on a multi-lane wave `<artifact prefix>-review-r<lane>-<iteration>.md` (the lane marker keeps the files disjoint). Prefixes are the phase's artifact names (`spec`, `design-doc`, `build-plan`; the build review is `build`) |
| Amendment record | `0-intent/amendment-<n>.md` — one counter across all triggers |
| Task report | `<phase>/tasks/task-<id>-<attempt>.md` — one per attempt, never overwritten |

## Frontmatter

Frontmatter is the machine's lane: written only by orchestration stamps, read by computation. Prose bodies are the humans' and agents' lane. The subset is `key: value` and simple lists — nothing more. Paths in frontmatter are relative to the pipeline folder.

| Key | On | Meaning |
| --- | --- | --- |
| `pins` | derived artifacts | One entry per consumed file: `<path>@<blob sha>` — inputs, and the triggers the artifact has absorbed |
| `lane`, `iteration` | review files | The reviewing lane's id (`r1` even on a single-lane wave); that lane's iteration counter for this artifact |
| `verdict` | review files | `approved` \| `rejected` \| `unsatisfiable` — mirrored from the body's declared verdict |
| `reviewed` | review files | One entry per reviewed file: `<path>@<blob sha>` |
| `head` | build and document reviews | The commit whose code the review verified |
| `target` | reviews with `verdict: unsatisfiable`; triggers | `<path>@<blob sha>#<clause>` (claims) or `<path>` (triggers) — the input that must change |
| `recurs` | rejections | Prior findings the reviewer marked as unresolved: `<review file>#<issue>` |
| `adjudicates` | review files | The amendment record this review resolves (same-blob re-approvals after a refutation) |
| `task`, `attempt`, `outcome`, `commits` | task reports | Task id; attempt number; `completed` \| `failed`; the commit range of the work |
| `issue`, `stacked-on`, `forked-from`, `origin` | intents and amendments | Provenance — see `../entries/intent-format.md` |
| `conventions` | `.rp.md` | Conventions schema version |

Blob SHAs come from `git hash-object <file>` (or `git ls-tree` on a committed tree). Short 12-character prefixes suffice.

## Pins by phase

Downstream artifacts pin artifacts, never records; an artifact and its record are one unit, reviewed together.

| Artifact | Pins |
| --- | --- |
| `1-spec/spec.md` | `0-intent/intent.md`; absorbed amendments |
| `2-design-doc/design-doc.md` | `0-intent/intent.md`, `1-spec/spec.md`; absorbed amendments |
| `3-build/build-plan.md` | `1-spec/spec.md`, `2-design-doc/design-doc.md`; absorbed amendments and failed task reports |
| `4-document/document-plan.md` | `1-spec/spec.md`, `2-design-doc/design-doc.md`, `3-build/build-summary.md`; absorbed amendments and failed task reports |
| Same-phase review | `reviewed`: the artifact and its record |
| Build / document review | `reviewed`: the plan; `head`: the code commit |

Records carry no pins.

## Stamps

- **Stamp on landing** — when an agent's commit lands, immediately write the file's frontmatter and commit the stamp. Only stamped versions are shown to consumers; approvals therefore reference stamped blobs.
- **Stamp propagation** — when an upstream change leaves an artifact's body byte-identical and only its pins need refreshing, update the pins and refresh the `reviewed` entries of that artifact's fresh approvals in the same stamp. Permitted only when the body is unchanged.

## Triggers

A trigger is a file that calls for work at a target: an amendment record, or a failed task report. Each carries `target`. An artifact absorbs a trigger by pinning it. **A trigger no artifact pins is pending work at its target**, ahead of everything else at that artifact.

## Freshness

- An **artifact is stale** iff any of its pins names a blob that differs from the pinned path's current blob. Stale means re-look, not re-do.
- A **same-phase review is fresh** iff every `reviewed` entry matches the current blob of its path.
- A **build or document review is fresh** iff its `reviewed` entries match and the code is unchanged since `head`: `git diff --quiet <head> HEAD -- . ':(exclude)<pipelines folder root>'` is empty.
- An **artifact is approved** iff every review lane declared by the run policy has, as its latest iteration, a fresh review with `verdict: approved`.
- An **`unsatisfiable` claim is pending** iff it is the lane's latest verdict and its `target` pin still matches the target's current blob. It resolves in exactly two ways: the target changes blob (the claim was accepted; staleness cascades), or the target's wave re-approves the same blobs with `adjudicates` (the claim was refuted; the refutation lives in the target's record, and the claimant is re-dispatched to adjudicate with it). A claim whose target has a pending claim of its own is suspended until that one resolves.
- A **claim of impossibility stands** in a wave iff at least one lane's latest verdict is `unsatisfiable` and no lane's is `rejected`.
- A rejection carrying `recurs` is a **recurrence signal**: it opens the inspection in `loop.md`.

## Execution facts

A task's attempts are its task reports. The **done-set** is the set of tasks whose latest attempt has `outcome: completed`. A failed report is a trigger targeting the plan.

## Per-phase completion

A phase is complete when its artifacts exist, are stamped, are approved (per the declared lanes), are fresh, and — in build and document — the done-set covers the plan and the build (or document) review and summary exist, approved and fresh.

## Discovery

To find the pipelines related to an issue, without checkout:

1. `git fetch`, then enumerate main plus branch tips whose `<pipelines folder root>` tree OID is not among main's historical OIDs for that path (inherited trees are inactive; batch the lookups through `git cat-file --batch-check`).
2. Read `0-intent/*.md` frontmatter at each active tip and on main; match the canonical issue reference against `issue` entries; walk `stacked-on` / `forked-from` edges for the graph.

A pipeline is **merged** when its folder is in main's tree; **live** when its branch tip carries it beyond main.
