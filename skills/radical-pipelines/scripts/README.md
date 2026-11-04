# `rp`

`rp` computes a pipeline's state from its files and names the frontier, stamps frontmatter, and discovers pipelines. It needs Node and git, nothing else. The path argument selects the repository and worktree, whatever the process directory. [State](../reference/run/state.md) is the specification; this file is the exact grammar.

```text
node rp.mjs check <pipeline folder> [--ref <commit>] [--json]
node rp.mjs stamp <file> [--pin <path>]... [--reviewed]
node rp.mjs pipelines <repo path> [--issue <ref>] [--json]
```

Each command accepts only its options and one positional argument. A command that cannot read what it needs, or is used wrongly, prints `rp: <reason>` to stderr and exits 1. Otherwise it exits 0, whatever the frontier.

## Pipeline files

The pipelines folder root is the first non-blank line under the heading `### Pipelines folder root` in `.rp.md` at the repository root, read from the working tree, with surrounding backticks and a trailing `/` removed. Without that heading, it is `.pipelines`. A pipeline folder is `<pipelines folder root>/<pipeline slug>`.

`rp` reads these files of a pipeline folder and ignores every other file:

| Path | What it is | Frontmatter keys |
| --- | --- | --- |
| `run-config.md` | Run configuration | `target-phase`, `base`, `lanes` |
| `0-intent/intent.md` | Intent | no frontmatter |
| `0-intent/constraint-<n>.md`, `proposal-<n>.md`, `failure-<n>.md` | Later input | no frontmatter |
| `1-spec/spec.md` | Spec | `inputs` |
| `1-spec/lanes/<id>/spec.md` | Spec candidate | `inputs` |
| `2-design-doc/design-doc.md` | Design doc | `inputs` |
| `2-design-doc/lanes/<id>/design-doc.md` | Design doc candidate | `inputs` |
| `3-implementation/notes.md` | Implementation notes | `inputs` |
| `threads/<name>.md` | Thread | `reviewed` |

Frontmatter is a JSON object between a first line `---` and the next line `---`. A key outside the table, or frontmatter on a file that carries none, makes the file `INVALID`.

### Identity

A file's identity is the first 12 hexadecimal characters of the git blob hash of its body: every byte below the frontmatter, unnormalized. Stamping never changes it.

### `run-config.md`

```json
{
  "target-phase": 4,
  "base": "main",
  "lanes": [
    { "profile": "spec-producer", "id": "a", "brief": "…" },
    { "profile": "reviewer", "id": "security", "brief": "…" }
  ]
}
```

- `target-phase`: an integer from 1 to 4. Phase 4 is review.
- `base`: a revision that resolves to a commit.
- `lanes` (optional, non-empty when present): each lane has only `profile`, `id`, and `brief`, all non-empty strings. `profile` is `spec-producer` or `design-doc-producer` for a production lane, or `reviewer` for a review lane. `id` matches `[a-z0-9][a-z0-9-]*` and is unique per profile.
- Without a `reviewer` lane there is one review lane, `default`.

The body is ignored. A missing `run-config.md` or one that breaks these rules stops `check`, as does a missing intent.

### `inputs`

`inputs` is a list of `<path>@<identity>`, one per pinned file, with paths relative to the pipeline folder. A pin may name the intent, a later input, an artifact, or a candidate.

| Artifact | Required inputs |
| --- | --- |
| `1-spec/spec.md` and its candidates | `0-intent/intent.md` |
| `2-design-doc/design-doc.md` and its candidates | `1-spec/spec.md` |
| `3-implementation/notes.md` | `1-spec/spec.md`, `2-design-doc/design-doc.md` |

Every later input whose `target:` names an artifact is also a required input of that artifact and of its candidates.

- **Stale**: a required input is unpinned, or pinned at an identity that differs from the current one. Pins of anything else, such as the candidates a consolidated root merged, are checked for grammar only.
- **Missing**: the file is absent. `notes.md` is also missing until the first line of its body is exactly `status: done`.
- **Fresh**: neither.

### Later input

A later input's body has a line `target: <artifact>[#<id>][, <artifact>[#<id>]]...`. Each `<artifact>` is `1-spec/spec.md`, `2-design-doc/design-doc.md`, or `3-implementation/notes.md`. A missing `target:` line or any other path makes the file `INVALID`.

## Threads

A thread file is named `<n>-<opener>-<owner>-<artifact>.md` after its header, with `<n>` a positive integer. Threads may share `<n>`.

Its body begins with exactly four header lines, followed by a blank line:

```text
status: open | closed: approved | closed: withdrawn | closed: answered | disagreement
opener: <role>
owner: <role>
artifact: intent | spec | design-doc | implementation
```

- `<role>` is `spec-producer`, `design-doc-producer`, `implementer`, `reviewer-<lane id>` for each review lane, or `owner`.
- `owner` and `artifact` pair as `owner`–`intent`, `spec-producer`–`spec`, `design-doc-producer`–`design-doc`, `implementer`–`implementation`.
- The opener is any role but `owner`, and differs from the owner.
- A thread to `owner` has status `disagreement` or `closed: answered`; no other thread has either.

After the header, every line that starts with `## ` outside fenced code is a message heading: `## <author> — <commit>`, with `<author>` the opener, the thread's owner, or `owner`, an em dash, and 7 to 64 hexadecimal characters. Text before the first heading and between headings is free. A thread has at least one message, and the first is the opener's.

An `open` thread awaits its opener when the thread's owner wrote the last message, and its owner otherwise. No other thread awaits anyone.

A **review thread** is one opened by `reviewer-<lane id>` to `implementer`. A review thread closed `approved` must carry `reviewed`, and only such a thread may.

## Net change

The net change is the stable patch id of the diff from the merge-base of `base` and a commit to that commit, outside the pipelines folder root:

```sh
git diff --binary --no-renames <base>...<commit> -- . ':(top,exclude,literal)<pipelines folder root>' | git patch-id --stable
```

An empty diff has the id `0000000000000000000000000000000000000000`. A merge from the base leaves the id unchanged; a conflict resolution changes it. A `base` that does not resolve, or has no merge-base with the commit, stops the command.

A review lane is **approved** when its highest-numbered review thread is `closed: approved` with `reviewed` equal to the net change at the tip.

## `check`

```text
node rp.mjs check <pipeline folder> [--ref <commit>] [--json]
```

`check` reads the pipeline files from the working tree, or with `--ref` from that commit. The tip is `HEAD`, or the `--ref` commit. A pipeline file that is a symlink or not a regular file, or a file where a pipeline folder belongs, stops the command.

### Frontier

The frontier is every action of the first rule that holds:

1. **`INVALID <path>: <reason>`** for each malformed file.
2. **`escalate <thread>`** for each `disagreement` thread.
3. The lowest phase through the target whose role has work: an `open` thread awaiting the role, or the phase's artifact missing or stale. Phases 1 to 3 belong to their artifact's owner, phase 4 to the reviewers.
   - Production lanes configured and the root missing: **`lane <artifact> <lane id>`** for each candidate missing or stale, else **`consolidate <artifact>`**.
   - The artifact missing: **`produce <artifact>`**.
   - Otherwise, the artifact stale or a thread awaiting the role: **`respond <artifact>`**.
   - Phase 4: **`review <lane id>`** for each lane not approved or with a thread awaiting `reviewer-<lane id>`.
4. **`complete`**.

### Output

Without `--json`, the frontier comes first, one line per action, then one line per fact:

```text
frontier <action>[ <target>][ <lane id>][: <reason>]
lane <artifact> <lane id> <state>              for each production lane while its root is missing
artifact <artifact> <state>                    for each phase through the target, after its lanes
net-change <patch id>                          at target phase 4
review <lane id> approved|unapproved           at target phase 4, for each review lane
thread <thread> <status>[ awaits <role>]
```

`<state>` is `missing`, `fresh`, or `stale <changed input>[ <changed input>]...`. On `INVALID`, only the frontier lines are printed. Paths are relative to the pipeline folder.

`--json` prints one object:

- `pipeline`, `tip`, `targetPhase`, `frontier`: always. Each frontier entry has `action`, and where they apply `target`, `lane`, `reason`, `threads` (the threads awaiting the woken role), and `changed` (the changed inputs of a stale artifact or candidate).
- `phases`, `threads`: unless `INVALID`. Each phase has `phase`, `artifact`, `state`, `stale` when stale, and `lanes` (`id`, `path`, `state`, `stale`) while its root is missing. Each thread has `path`, `status`, `opener`, `owner`, `artifact`, `awaits`, and `reviewed`.
- `netChange`, `reviews` (`lane`, `approved`): at target phase 4, unless `INVALID`.

## `stamp`

```text
node rp.mjs stamp <file> [--pin <path>]... [--reviewed]
```

`stamp` writes frontmatter and keeps the body byte for byte. It writes nothing when the frontmatter would not change.

- `--pin` records `inputs` on an artifact or candidate. The pins given replace the previous set, sorted by path. Each pinned file is in the same pipeline folder.
- `--reviewed` records `reviewed` on a review thread closed `approved`: the net change at the commit its last message names. The base comes from the working tree's `run-config.md`.

A stamp without options, an option on the wrong kind of file, a file, pin, or commit that cannot be read, or malformed frontmatter stops the command.

## `pipelines`

```text
node rp.mjs pipelines <repo path> [--issue <ref>] [--json]
```

Fetching is the caller's job. `pipelines` reads every local branch and remote-tracking branch tip:

1. Collect each `<pipelines folder root>/<slug>` folder at each tip, with its tree id.
2. Read its `run-config.md`; its `base` names the base branch.
3. The pipeline is **live** at that tip when the folder's tree id differs from every tree id that folder had in the base branch's history.
4. Otherwise it is **merged**, reported once from the base branch's tip when the folder exists there.
5. With `--issue`, keep those whose intent opens with the line `origin: issue <ref>`.

A pipeline folder at a tip without a readable `run-config.md` or intent, or whose base does not resolve, stops the command. Branch and folder names are never matched. A pipeline at a local branch and its remote-tracking branch is listed for each.

Without `--json`, one line per pipeline: `<live|merged> <ref> <pipeline folder>`. `--json` prints a list of `{state, ref, commit, folder, origins}`, where `origins` holds the values of the intent's leading `origin:` lines.

## Decisions

These fill details the specification leaves open; the prose aligns with them.

- **A thread to `owner`** opens as `disagreement` and closes `closed: answered`; `open`, `closed: approved`, and `closed: withdrawn` are `INVALID` there.
- **A message by `owner`** on any thread leaves it awaiting the thread's owner.
- **A woken opener** gets `produce` when its artifact is missing and `respond` otherwise, with the threads awaiting it.
- **Strict keys**: unknown frontmatter, `run-config.md`, and lane keys are `INVALID` or stop the command.
- **An empty net change** has the all-zero id, so an implementation without code changes can still be approved.
- **The pipelines folder root** comes from the working tree's `.rp.md`, also for `--ref` and discovery.
