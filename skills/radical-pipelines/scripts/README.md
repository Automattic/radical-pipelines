# `rp`

`rp` reports and stamps body-identity state for Radical Pipelines. The file or folder argument selects its repository and worktree, independent of the process directory. The [state specification](../reference/run/state.md) defines everything it computes.

## `stamp`

```text
node rp.mjs stamp <file> [--pin <path>]... [--reviewed <path>]... [--mirror]
```

- `--pin` records the inputs an artifact consumed; the set replaces the previous one. An artifact cannot pin its sibling record. Consolidation also captures `lane-packages` from the candidates; re-stamping the root preserves references bound to the same consumed lane pins.
- `--reviewed` fixes the package a review or task report names; later stamps preserve it. A task report's attempt follows the last report with a valid landed package and metadata.
- A named lane's artifact or review receives the fingerprint derived from its path and `run-config.md`. The implicit lane receives none.
- A stamp with no pins, mirrors, or landing facts to record succeeds with `nothing to mirror` and leaves the file untouched.
- `--mirror` rewrites every mirror from the body's declarations outside Markdown code fences — `Verdict:`, `Brief:`, `Target:`, `Origin:`, `Outcome:` (`completed` | `failed` | `blocked`), `Prior finding:`, `Depends on:`, a report's `## Commits` — replacing the previous set. It may repair an already-pinned review or report without consuming its package again. Every commit `## Commits` names must exist and resolve unambiguously; it is stored as its full hash. [Frontmatter](../reference/run/state.md#frontmatter) defines its format and field types. Every fixed line is accepted whole in its grammar or rejected as `INVALID <field>`; `Verdict`, `Brief`, `Target`, and `Outcome` occur once.
- `Target:` is comma-separated. Its mirrors follow [Frontmatter](../reference/run/state.md#frontmatter); retained targets keep their landing identities. `check` reports invalid existing frontmatter as `INVALID FRONTMATTER` before computing facts, while absent frontmatter leaves declarations pending stamp. Stamp validates new targets together under the [challenge definition](../reference/run/state.md#terms). A failed report's target is its own task, derived from the report path and supplied implicitly when `Target:` is absent.
- A challenge's target is validated when first stamped: an id opens a bullet or heading outside code fences, `#goal` names the Goal section, and task ids are declared in their task file. `check` then computes resolution over the recorded target even after its item is removed.
- Every intent stamp preserves its cumulative id history as landing facts ([frontmatter](../reference/run/state.md#frontmatter)). Decisions remain active; issue-derived items may retire. Violating that lifecycle is `INVALID FRONTMATTER` in both `stamp` and `check`. A stored history that differs from its body-derived projection makes `stamp 0-intent/intent.md` the frontier before downstream state is computed.
- `head`, the commit the stamp observed, is recorded only when the stamp carries `--pin` or `--reviewed`.
- Identity is the first 12 hexadecimal characters of the body's git blob hash, byte for byte, for every pinnable file. Stamping preserves it. Paths with a symlinked component are refused.

```sh
node skills/radical-pipelines/scripts/rp.mjs stamp .pipelines/demo/1-spec/spec.md --pin .pipelines/demo/0-intent/intent.md
```

## `check`

```text
node rp.mjs check <pipeline-folder> --base <ref> [--ref <ref>] [--json]
```

- `--base` names the artifact base branch: the pipeline's own commits — those a task report must claim — follow its merge-base with the inspected ref. The branch the intent `starts-from` prevails when it declares one; otherwise `--base` is required. A base that does not resolve is an error.
- `run-config.md` supplies the workflow, target phase, and named lanes. Its body is ignored. Missing or invalid configuration stops the command.
- `--ref` reads the pipeline's exact paths and identities from a commit instead of the working tree; the commit range is the same. One streamed `git cat-file --batch` process supplies cached object bytes without a subprocess output-size limit. Tree metadata and batch headers must match their complete grammars.
- `--json` emits machine-readable state, including `configuration` with lane fingerprints. `challenges` has one entry per (challenge, target), in each file's target order, with its state and `inScope`; entries for one target artifact share adjudication and resolution. `challengeResolved` is true when every target artifact is resolved.
- A pending claim on the intent selects owner escalation. Production follows the phase walk: `converge <artifact>` covers a missing or stale artifact, its pending challenges, and rejected closed waves. Consolidation remains `consolidate <artifact>`.
- Artifact and open-lane entries expose `materials`: `inputChanges` (`added`, `removed`, and `changed` paths, plus required-approval `ready`), `reviewLanes` (`lane`, `path` for every review of a rejected closed wave), `corrections` (pending correction and claim paths), and `taskReports` (pending failed-report paths). Their text lines use **Input changes**, **Review lanes**, **Corrections**, and **Task reports**. Each pending path occurs once.
- Each command accepts only its documented options and one positional argument. Any other value, missing value, duplicate single option, or unknown option is an error.

Both readers require a pipeline directory. Unlisted members may be unwritten; listed documents must be readable regular files. Read failures stop the check before facts, naming the ref or worktree and path.

```sh
node skills/radical-pipelines/scripts/rp.mjs check .pipelines/demo --base main
```

The report lists contradictions first — malformed files, mirror drift, undeclared lanes, symlinks — and stops before facts whose representation is invalid. Otherwise it lists challenges, claims, and every phase up to the target: production lanes, artifacts, tasks with their latest reports, phase reviews, unclaimed commits — and names the frontier. Missing consolidation references require consolidation. Episodes count from the last current approval under the [wave validity and currency definition](../reference/run/state.md#terms).
