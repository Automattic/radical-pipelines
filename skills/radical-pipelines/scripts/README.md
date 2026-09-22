# `rp`

`rp` reports and stamps body-identity state and renders review material for Radical Pipelines. The file or folder argument selects its repository and worktree, independent of the process directory. The [state specification](../reference/run/state.md) defines everything it computes.

## `stamp`

```text
node rp.mjs stamp <file> [--pin <path>]... [--reviewed <path>]... [--mirror] [--base <ref>]
```

- `--pin` records the inputs an artifact consumed; the set replaces the previous one. An artifact cannot pin its sibling record. Consolidation also captures `lane-packages` from the candidates; re-stamping the root preserves references bound to the same consumed lane pins.
- `--reviewed` fixes the package a review or task report names; later stamps preserve it. A task report's attempt follows the last report with a valid landed package and metadata.
- Phase-review stamps record the change checkpoint and add it and authored-change members automatically, including for filtered lanes. Supply `--base` as for `check`. Reports and phase reviews retain the immutable material they name under [Authored-change material](../reference/run/state.md#authored-change-material).
- A named lane's artifact or review receives the fingerprint derived from its path and `run-config.md`. The implicit lane receives none.
- A stamp with no pins, mirrors, or landing facts to record succeeds with `nothing to mirror` and leaves the file untouched.
- `--mirror` rewrites every mirror from the body's declarations outside Markdown code fences — `Verdict:`, `Brief:`, `Target:`, `Origin:`, `Outcome:` (`completed` | `failed` | `blocked`), `Prior finding:`, `Depends on:`, a report's `## Commits` — replacing the previous set. It may repair an already-pinned review or report without consuming its package again. New commit declarations must resolve unambiguously and are stored as full hashes; reports record their patch ids in `changes`, retained while the declaration matches. [Frontmatter](../reference/run/state.md#frontmatter) defines its format and field types. Every fixed line is accepted whole in its grammar or rejected as `INVALID <field>`; `Verdict`, `Brief`, `Target`, and `Outcome` occur once.
- `Target:` is comma-separated. Its mirrors follow [Frontmatter](../reference/run/state.md#frontmatter); retained targets keep their landing identities. `check` reports invalid existing frontmatter as `INVALID FRONTMATTER` before computing facts, while absent frontmatter leaves declarations pending stamp. Stamp validates new targets together under the [challenge definition](../reference/run/state.md#terms). A failed report's target is its own task, derived from the report path and supplied implicitly when `Target:` is absent.
- Every stamp of a file with declared ids projects `ids` and `retired-ids` from its body ([frontmatter](../reference/run/state.md#frontmatter)) and validates them: declared once, never reused, the ids it originates numbered without gaps from 1, a carried assumption declared by its upstream artifact, a plan's tasks by their files — a misnamed Markdown file in a plan's tasks folder is invalid. A review's findings are validated the same way without a mirror. A body-side violation is `INVALID IDS` in both `stamp` and `check`; a malformed recorded list is `INVALID FRONTMATTER`. A stored history that differs from its body-derived projection makes `stamp <file>` the frontier before downstream state is computed.
- A challenge's target is validated when first stamped: its id opens a bullet or heading outside code fences, `#intent-goal` names the Goal section, and a task by its file. A `Prior finding:` names an earlier review of the same kind that declares the finding. `check` then computes resolution over the recorded target even after its item is removed.
- `head` is recorded on artifact and artifact-review stamps carrying `--pin` or `--reviewed`, as the diff base for convergence or artifact delta review.
- Identity is the first 12 hexadecimal characters of the body's git blob hash, byte for byte, for every pinnable file. Stamping preserves it. Paths with a symlinked component are refused.

```sh
node skills/radical-pipelines/scripts/rp.mjs stamp .pipelines/demo/1-spec/spec.md --pin .pipelines/demo/0-intent/intent.md
```

## `check`

```text
node rp.mjs check <pipeline-folder> --base <ref> [--ref <ref>] [--json]
```

- `--base` names the artifact base branch used to select the base. The branch the intent `starts-from` prevails when it declares one; otherwise `--base` is required. A base that does not resolve is an error. [Authored-change material](../reference/run/state.md#authored-change-material) defines retained and live membership.
- `run-config.md` supplies the workflow, target phase, and named lanes. Its body is ignored. Missing or invalid configuration stops the command.
- `--ref` reads the pipeline's exact paths and identities from a commit instead of the working tree; the commit range is the same. One streamed `git cat-file --batch` process supplies cached object bytes without a subprocess output-size limit. Tree metadata and batch headers must match their complete grammars.
- `--json` emits machine-readable state, including `configuration` with lane fingerprints. `challenges` has one entry per (challenge, target), in each file's target order, with its state and `inScope`; entries for one target artifact share adjudication and resolution. `challengeResolved` is true when every target artifact is resolved.
- A pending claim on owner territory selects owner escalation; its answer follows [Owner territory](../reference/run/state.md#owner-territory). Constraints and proposals are challenges on their targets, pending until pinned and resolved by a current approving wave. Production follows phase order: `converge <artifact>` covers a missing or stale artifact, its pending challenges, and rejected closed waves. Consolidation remains `consolidate <artifact>`.
- Artifact and open-lane entries expose `materials`: `inputChanges` (`added`, `removed`, and `changed` paths, plus required-approval `ready`), `reviewLanes` (`lane`, `path` for every review of a rejected closed wave), `challenges` (pending constraint, proposal, and claim paths), and `taskReports` (pending failed-report paths). Their text lines use **Input changes**, **Review lanes**, **Challenges**, and **Task reports**. Each pending path occurs once.
- Each command accepts only its documented options and one positional argument. Any other value, missing value, duplicate single option, or unknown option is an error.

Both readers require a pipeline directory. Unlisted members may be unwritten; listed documents must be readable regular files. Read failures stop the check before facts, naming the ref or worktree and path.

Authored-change members use `authored-change:<patch-id>:<occurrence>@<patch-id>`. `authoredChanges` lists `{commit, patchId, occurrence, material}`; each phase-review lane's `diff` lists `added` changes and `removed` member names relative to its previous review. With no previous review, all changes are added. Package equality governs coverage.

The [authored-change rule](../reference/run/state.md#terms) defines the diff and identity. The computation requires Git with `merge-tree --write-tree`; multi-parent merges use Git's default merge in an isolated, hook-free worktree. An unavailable automatic result, unreadable history, or malformed material stops computation.

```sh
node skills/radical-pipelines/scripts/rp.mjs check .pipelines/demo --base main
```

The report lists contradictions first — malformed files, mirror drift, undeclared lanes, symlinks — and stops before facts whose representation is invalid. Otherwise it lists challenges, claims, and every phase up to the target: production lanes, artifacts, tasks with their latest reports, phase reviews — and names the frontier. Missing consolidation references require consolidation. Episodes count from the last current approval under the [wave validity and currency definition](../reference/run/state.md#terms).

## `diff`

```text
node rp.mjs diff <pipeline-folder> --base <ref> [--ref <ref>] [--review <file> | --live-net] [--output <folder>] [--json]
```

Render every current authored change for a Fresh review. `--review` selects additions and removals relative to that phase review; its file argument is absolute or repository-relative. Removed entries show the original patch with a `removed` label. `--json` includes the member, status, material path, and complete stored `content` with provenance.

`--output` creates a new directory outside the pipeline containing `diff.patch`, an `index.json` locating each material, and numbered folders with each `change.json`, `change.patch`, and `before`/`after` files. Symlinks are represented by files containing their target bytes; gitlinks by their object ids. Source commits are unnecessary for retained material.

`--live-net` emits the net diff from the selected base to the inspected tip, outside the pipelines folder, for upstream integration. It excludes the retained checkpoint's history. Apply this net change to the upstream branch and reconcile differences there; individual authored patches are review material.
