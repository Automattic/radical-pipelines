# `rp`

`rp` reports and stamps body-identity state and renders phase-review diffs for Radical Pipelines. The file or folder argument selects its repository and worktree, independent of the process directory. The [state specification](../reference/run/state.md) defines everything it computes.

## `stamp`

```text
node rp.mjs stamp <file> [--pin <path>]... [--reviewed <path>]... [--mirror]
```

Stamping writes frontmatter without changing the body's [identity](../reference/run/state.md#terms). A stamp with nothing to record succeeds with `nothing to mirror` and leaves the file untouched. Paths with a symlinked component are refused.

`--pin` records the inputs an artifact consumed:

- The new set replaces the previous one. An artifact cannot pin its sibling record.
- A consolidated root also captures `lane-packages` from the candidates; re-stamping the root preserves references bound to the same consumed lane pins.

`--reviewed` fixes the package a review or task report judged:

- Later stamps preserve it.
- A task report's attempt number is taken from its filename.

`--mirror` copies the body's declarations into the frontmatter, replacing the previous set. [Frontmatter](../reference/run/state.md#frontmatter) defines which lines are mirrored, their grammar, and what makes one `INVALID`:

- It may repair an already-pinned review or report without consuming its package again.
- A `commit:` declaration must resolve to exactly one commit; it is stored as the full hash with its patch id, and both are kept while the declaration still matches, even after a rebase removes the commit.
- `target:` is comma-separated. Retained targets keep their landing identities. A failed report's target is its own task, derived from the report path when `target:` is absent. New targets are validated together under the [challenge definition](../reference/run/state.md#terms): the id is declared outside code fences, `#intent-goal` names the Goal section, a task is named by its file. `check` later resolves the recorded target even after its item is removed.
- A `prior-finding:` names an earlier review of the same kind that declares the finding.
- Every stamp of a file with declared ids projects `ids` and `retired-ids` from its body and validates them under the `INVALID IDS` conditions in [Frontmatter](../reference/run/state.md#frontmatter). A review's findings are validated the same way without a mirror. A stored `ids` history that no longer matches the body makes `stamp <file>` the frontier before downstream state is computed.

Recorded on every stamp:

- `head`, on artifact and artifact-review stamps carrying `--pin` or `--reviewed`: the diff base for convergence or artifact delta review.
- `lane`, on a named lane's artifact or review: the fingerprint derived from its path and `run-config.md`. The implicit lane receives none.

```sh
node skills/radical-pipelines/scripts/rp.mjs stamp .pipelines/demo/1-spec/spec.md --pin .pipelines/demo/0-intent/intent.md
```

## `check`

```text
node rp.mjs check <pipeline-folder> [--ref <ref>] [--json]
```

`check` computes the state [The frontier](../reference/run/state.md#the-frontier) defines and names the frontier.

Inputs:

- `run-config.md` supplies the workflow, target phase, base branch, and named lanes; its body is ignored. A missing or invalid configuration, a base branch that does not resolve, or no merge-base stops the command.
- `--ref` reads the pipeline's exact paths and identities from a commit instead of the working tree, and takes that commit as the tip. Object bytes come from one streamed `git cat-file --batch` process, so output size is not limited by a subprocess buffer. Tree metadata and batch headers must match their complete grammars.
- Both `check` and `stamp` read only [pipeline state](../reference/run/state.md#names); `stamp` refuses any other file, to stamp or to pin. A member that is not listed may be unwritten; a listed document must be a readable regular file. A read failure stops the command before any fact is computed, naming the ref or worktree and the path.
- Computing a phase review's [code delta](../reference/run/state.md#terms) reads the history bounded by the review: the commit adding it, one `git merge-tree` with the base, and, when a later phase's reports record patch ids, the commits after the review that are outside the base. It requires Git 2.45 or later. A review no commit adds, a failed merge, or unreadable history stops the command.

Output:

- Contradictions come first — malformed files, mirror drift, undeclared lanes, symlinks — and the report stops there, because nothing is computed from a malformed file. Otherwise it lists challenges, claims, and every phase up to the target — production lanes, artifacts, tasks with their latest reports, phase reviews — and names the frontier.
- The `converge` and `review wave` lines of an artifact [under experiment](../reference/run/state.md#terms), and of its production lanes, end with ` (experiment)`.
- Artifact and open-lane entries list their `materials` under **Input changes**, **Review lanes**, **Challenges**, and **Task reports**. Each pending path occurs once.
- A missing consolidation reference puts `consolidate <artifact>` on the frontier. Episodes count from the artifact's last current approval.

`--json` emits the same state machine-readably:

- `configuration` carries the lane fingerprints.
- `challenges` has one entry per (challenge, target), in each file's target order, with its state and `inScope`; entries for one target artifact share adjudication and resolution. `challengeResolved` is true when every target artifact is resolved.
- `materials` carries `inputChanges` (`added`, `removed`, and `changed` paths, plus required-approval `ready`), `reviewLanes` (`lane` and `path` for every review of a rejected closed wave), `challenges` (pending constraint, proposal, and claim paths), and `taskReports` (pending failed-report paths). An artifact under experiment carries `experiment`.

Each command accepts only its documented options and one positional argument. Any other value, missing value, duplicate single option, or unknown option is an error.

```sh
node skills/radical-pipelines/scripts/rp.mjs check .pipelines/demo
```

## `diff`

```text
node rp.mjs diff <pipeline-folder> [--ref <ref>] [--review <phase review>]
```

Writes a binary patch `git apply` accepts: the [net change](../reference/run/state.md#terms), or with `--review` that phase review's code delta. The review argument is absolute or repository-relative. `--ref` takes a commit as the tip and reads the pipeline from it.
