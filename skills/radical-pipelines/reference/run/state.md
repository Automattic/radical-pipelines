# State

How pipeline state is recorded and computed. The script under `../../scripts/` serves this spec — use `rp.mjs stamp` and `rp.mjs check` for the operations below; discovery, until `status` ships, is performed with bare git as described.

## The invariant

The working tree at any commit fully describes the pipeline's state. The tree records the past; policy is supplied in the present; nothing records the future. Git history may optimize a computation, never be required by one.

## Locations

A pipeline lives at `<pipelines folder root>/<branch base>/` with phase subfolders `0-intent` … `4-document`. Its branch is `<branch base>`. Throwaway lane branches append a suffix: `<branch base>_<phase>-lane-<k>` (production lanes), `<branch base>_<phase>-r<lane>` (review lanes — created only when a wave has more than one lane; a single-lane wave runs on the pipeline branch). A post-merge amendment works on `<branch base>_amend-<n>`, cut from main.

## Frontmatter

Frontmatter is the machine's lane: written only by orchestration stamps, read by computation. Prose bodies are the humans' and agents' lane. The subset is `key: value` and simple lists — nothing more.

| Key | On | Meaning |
| --- | --- | --- |
| `pins` | any derived artifact | One entry per consumed input file: `<repo-relative path>@<blob sha>` — the exact version the artifact was derived from |
| `lane`, `iteration` | review files | The reviewing lane's id; that lane's iteration counter for this artifact |
| `verdict` | review files | `approved` \| `rejected` \| `unsatisfiable` — mirrored from the body's declared verdict |
| `reviewed` | review files | One entry per reviewed file: `<path>@<blob sha>` |
| `target` | review files with `verdict: unsatisfiable` | `<path>@<blob sha>#<clause>` — the input clause that must change |
| `adjudicates` | review files | The amendment record this review resolves (same-blob re-approvals after a refutation) |
| `issue`, `stacked-on`, `forked-from`, `amends`, `origin` | intents and amendments | Provenance — see `../entries/intent-format.md` |
| `conventions` | `.rp.md` | Conventions schema version |

Blob SHAs come from `git hash-object <file>` (or `git ls-tree` on a committed tree). Short 12-character prefixes suffice.

## Stamps

- **Stamp on landing** — when an agent's commit lands, immediately write the artifact's frontmatter (pins; review keys) and commit the stamp. Only stamped versions are shown to consumers; approvals therefore reference stamped blobs.
- **Stamp propagation** — when an upstream change leaves an artifact's body byte-identical and only its pins need refreshing, update the pins and refresh the `reviewed` entries of that artifact's fresh approvals in the same stamp. Permitted only when the body is unchanged.

## Freshness

- An **artifact is stale** iff any of its pins names a blob that differs from the pinned path's current blob. Stale means re-look, not re-do.
- A **review is fresh** iff every `reviewed` entry matches the current blob of its path.
- An **artifact is approved** iff every review lane declared by the run policy has, as its latest iteration, a fresh review with `verdict: approved`.
- An **`unsatisfiable` verdict is pending** iff its `target` pin still matches the target's current blob and no later review of the target's artifact re-approves the same blobs citing the amendment via `adjudicates`. It resolves in exactly two ways: the target changes blob (the claim was accepted; staleness cascades), or the target's wave re-approves the same blobs with `adjudicates` (the claim was refuted; the refutation is recorded in the target's record, and the still-unconverged downstream loop re-dispatches with it as input).
- A **claim of impossibility stands** in a wave iff at least one lane's latest verdict is `unsatisfiable` and no lane's is `rejected`.

## Execution facts

The tree records artifact facts; branch commits record execution facts. In build and document phases, every worker commit carries a trailer naming its task (`Task: <id>`), and a task's final commit adds `Task-complete: <id>`. The done-set is derived from trailers, never stored in the plan.

## Per-phase completion

A phase is complete when its artifacts exist, are stamped, are approved (per the declared lanes), are fresh, and — in build and document — the plan's tasks are all complete and the batch review and summary exist, approved and fresh.

## Discovery

To find the pipelines related to an issue, without checkout:

1. `git fetch`, then enumerate main plus branch tips whose `<pipelines folder root>` tree OID is not among main's historical OIDs for that path (inherited trees are inactive; batch the lookups through `git cat-file --batch-check`).
2. Read `0-intent/*.md` frontmatter at each active tip and on main; match the canonical issue reference against `issue` entries; walk `stacked-on` / `forked-from` / `amends` edges for the graph.

A pipeline is **merged** when its folder is in main's tree; **live** when its branch tip carries it beyond main.
