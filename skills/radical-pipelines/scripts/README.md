# `rp`

`rp` computes a pipeline's state from its files and names the frontier, stamps frontmatter, and discovers pipelines. It needs Node and git, nothing else. The path argument selects the repository and worktree, whatever the process directory.

```text
node rp.mjs check <pipeline folder> [--ref <commit>] [--json]
node rp.mjs stamp <file> [--pin <path>]... [--reviewed]
node rp.mjs pipelines <repo path> [--issue <ref>] [--json]
```

Each command accepts only its options and one positional argument. A command that cannot read what it needs, or is used wrongly, prints `rp: <reason>` to stderr and exits 1. Otherwise it exits 0, whatever the frontier.

## Pipeline files

The pipelines folder root is the first non-blank line under the heading `### Pipelines folder root` in `.rp.md` at the repository root, read from the working tree, with surrounding backticks and a trailing `/` removed. Without that heading, it is `.pipelines`. A pipeline folder is `<pipelines folder root>/<pipeline slug>`.

`rp` reads these files of a pipeline folder and ignores every other file:

| Path | What it is | Owner | Frontmatter keys |
| --- | --- | --- | --- |
| `run-config.md` | Run configuration | orchestrator | `target-phase`, `base`, `lanes` |
| `0-intent/intent.md` | Intent | orchestrator | none |
| `0-intent/constraint-<n>.md`, `proposal-<n>.md`, `failure-<n>.md` | Later input | orchestrator | none |
| `1-spec/spec.md` | Spec | `spec-producer` | `inputs` |
| `1-spec/lanes/<id>/spec.md` | Spec candidate | its lane | `inputs` |
| `2-design-doc/design-doc.md` | Design doc | `design-doc-producer` | `inputs` |
| `2-design-doc/lanes/<id>/design-doc.md` | Design doc candidate | its lane | `inputs` |
| `3-implementation/notes.md` | Implementation notes | `implementer` | `inputs` |
| `threads/<name>.md` | Thread | its opener and owner | `reviewed` |

Frontmatter is a JSON object between a first line `---` and the next line `---`. A file without frontmatter has none. A key outside the table makes the file `INVALID`.

### Identity

A file's identity is the first 12 hexadecimal characters of the git blob hash of its body: every byte below the frontmatter, unnormalized. Stamping never changes it.

### `run-config.md`

```json
{
  "target-phase": 4,
  "base": "main",
  "lanes": [
    { "profile": "spec-producer", "id": "a", "brief": "…", "model": "…" },
    { "profile": "reviewer", "id": "security", "brief": "…" }
  ]
}
```

- `target-phase`: an integer from 1 to 4. Phase 4 is review.
- `base`: a revision that resolves to a commit, usually the base branch.
- `lanes` (optional): each lane has `profile`, `id`, `brief`, and optionally `model`. `profile` is `spec-producer` or `design-doc-producer` for a production lane, or `reviewer` for a review lane. `id` matches `[a-z0-9][a-z0-9-]*` and is unique per profile.
- Without a `reviewer` lane there is one implicit review lane with id `review`.

The body is ignored.

### `inputs`

`inputs` is a list of `<path>@<identity>`, one per pinned file, with paths relative to the pipeline folder. It may pin any phase artifact, later input, or lane candidate.

An artifact must pin its required inputs:

| Artifact | Required inputs |
| --- | --- |
| `1-spec/spec.md` and its candidates | `0-intent/intent.md` |
| `2-design-doc/design-doc.md` and its candidates | `1-spec/spec.md` |
| `3-implementation/notes.md` | `1-spec/spec.md`, `2-design-doc/design-doc.md` |

Every later input whose `target:` names an artifact is also a required input of that artifact and of its candidates.

An artifact is **stale** when a required input is not pinned, or when a pinned file's identity differs now or the file no longer exists. It is **fresh** otherwise.

### Later input

A later input's body has a line `target: <artifact>[#<id>][, <artifact>[#<id>]]...`. Each `<artifact>` is `1-spec/spec.md`, `2-design-doc/design-doc.md`, or `3-implementation/notes.md`. A missing `target:` line or any other path makes the file `INVALID`.

### `notes.md`

The implementation is done when the first line of `notes.md`'s body is exactly `status: done`.

## Threads

A thread file is named `<n>-<opener>-<owner>-<artifact>.md`, with `<n>` a positive integer unique among the pipeline's threads.

Its body begins with the header, one `key: value` line each, in this order, followed by a blank line:

```text
status: open | closed: approved | closed: withdrawn | disagreement
opener: <role>
owner: <role>
artifact: <path>
lane: <review lane id>
territory: owner
```

- `<role>` is `orchestrator`, `spec-producer`, `design-doc-producer`, `implementer`, or `reviewer`. The opener and the owner differ.
- `artifact` is a phase artifact or a later input, relative to the pipeline folder; `owner` is its owner from the table above. A thread about the code names `3-implementation/notes.md`.
- `lane` is required when the opener is `reviewer`, and allowed only then. It names a configured review lane, or `review` when none is configured.
- `territory: owner` is optional. It marks the thread as owner territory: what the intent means or demands.

After the header, every line that starts with `## ` outside fenced code is a message heading: `## <author> — <commit>`, with `<author>` the opener or the owner, an em dash, and 7 to 64 hexadecimal characters. Text before the first heading and between headings is free. A thread has at least one message, and the first is the opener's.

Whose turn it is:

- A `closed: …` thread is nobody's.
- A `disagreement` thread with `territory: owner` is an owner escalation.
- Otherwise, the turn is the owner's when the opener wrote the last message, and the opener's when the owner did.

A reviewer's thread with `status: closed: approved` must carry `reviewed`, and only such a thread may.

## Net change

The net change is the stable patch id of the diff from the merge-base of `base` and the tip to the tip, outside the pipelines folder root:

```sh
git diff --binary --no-renames <base>...<tip> -- . ':(top,exclude,literal)<pipelines folder root>' | git patch-id --stable
```

An empty diff has the id `0000000000000000000000000000000000000000`. A merge from the base leaves the id unchanged; a conflict resolution changes it. The tip is `HEAD`, or the `--ref` commit for `check`. A `base` that does not resolve, or has no merge-base with the tip, stops the command.

A review lane is approved when one of its reviewer's threads (`lane:` equal to its id) is `closed: approved` with `reviewed` equal to the current net change.

## `check`

```text
node rp.mjs check <pipeline folder> [--ref <commit>] [--json]
```

`check` reads the pipeline files from the working tree, or with `--ref` from that commit, and the tip from `HEAD` or that commit. A pipeline file that is a symlink or not a regular file, or a file where a pipeline folder belongs, stops the command.

### Frontier

The frontier is every action of the first rule that holds:

1. **`INVALID <path>: <reason>`** for each malformed file: malformed or unknown frontmatter, a malformed thread header or message heading, an invalid `run-config.md` (or a missing one), a later input without a valid target, a candidate of a lane not configured for its profile, or `reviewed` where it does not belong or missing where it must be. Nothing else is computed.
2. **`escalation <thread>`** for each owner escalation.
3. For the lowest phase, from `0-intent` to `3-implementation`, that needs its owner:
   - Through the target phase, an artifact that is missing: **`produce <artifact>`**. When production lanes are configured for the phase: **`lane <phase folder>/<lane id>`** for each lane whose candidate is missing or stale, otherwise **`consolidate <artifact>`**.
   - Through the target phase, an artifact that is stale, or any phase whose owner a thread awaits: **`respond <artifact>`**. The threads awaiting the owner are listed in `--json`. A thread about a later input awaits the intent's owner.
   - Through the target phase, `notes.md` that is fresh but not done: **`produce 3-implementation/notes.md`**.
4. **`reply <thread>`** for each thread whose opener's turn it is.
5. At target phase 4, **`review <lane id>`** for each review lane not approved.
6. **`complete`**.

Lane candidates matter only while the root artifact is missing.

### Output

Without `--json`, one line each, in this order:

```text
lane <phase folder>/<lane id> <state>          for each production lane of a phase through the target
artifact <artifact> <state>                    for each phase through the target, after its lanes
net-change <patch id>                          at target phase 4
review <lane id> approved|unapproved           at target phase 4, for each review lane
thread <thread> <status>[ awaits <role or escalation>]
frontier <action>[ <target>][: <reason>]       one line per frontier action
```

`<state>` is `missing`, `fresh`, or `stale <input>[ <input>]...`. For `notes.md`, a fresh state is `done` or `in-progress`. On `INVALID`, only the frontier lines are printed. Paths are relative to the pipeline folder.

`--json` prints one object:

- `pipeline`, `tip`, `frontier`: always. Each frontier entry has `action`, and `target`, `reason`, or `threads` where they apply.
- `targetPhase`, `phases`, `threads`: unless `INVALID`. Each phase has `phase`, `artifact`, `state`, `stale` when stale, `done` for an existing `notes.md`, and `lanes` (`id`, `path`, `state`, `stale`). Each thread has `path`, `status`, `opener`, `owner`, `artifact`, `lane`, `territory`, `awaits`, and `reviewed`.
- `netChange`, `reviews` (`lane`, `approved`): at target phase 4.

## `stamp`

```text
node rp.mjs stamp <file> [--pin <path>]... [--reviewed]
```

`stamp` writes frontmatter and keeps the body byte for byte. It writes nothing when the frontmatter would not change.

- `--pin` records `inputs` on a spec, design doc, `notes.md`, or candidate. The pins given replace the previous set, sorted by path. Each pinned file is in the same pipeline folder and is a phase artifact, later input, or candidate.
- `--reviewed` records `reviewed`, the current net change at `HEAD`, on a reviewer's thread with `status: closed: approved`. The base comes from the working tree's `run-config.md`.

A stamp without options, an option on the wrong kind of file, a file or pin that cannot be read, or malformed frontmatter stops the command.

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

These fill details the model leaves open; the prose aligns with them.

- **Owner territory** is the header line `territory: owner`, written by whoever marks the disagreement. The artifact a thread names does not decide it: a dispute about a spec clause can be about what the intent demands.
- **A disagreement off owner territory** keeps the turn of an open thread: the addressee of the last message acts.
- **Review threads carry `lane:`**, so a lane's approval is found by its threads, whichever owner they address.
- **An unstamped approval is `INVALID`**: the orchestrator stamps `--reviewed` when it lands the reviewer's close.
- **Production lanes produce a missing artifact.** `lane` and `consolidate` take `produce`'s place at the artifact's phase, before replies, instead of following them. Once the root exists, a stale root is responded to, not re-laned.
- **A stale candidate is re-laned** before consolidation, so a consolidator never merges candidates from different inputs.
- **Required inputs** are the model's pins plus every later input targeting the artifact: a new later input makes its target stale. Extra pins, such as candidates on a consolidated root, are allowed and checked.
- **Unfinished implementation**: a fresh `notes.md` without `status: done` on its first body line names `produce`, the implementer's implement mode.
- **A thread to the owner of an artifact beyond the target phase** still wakes that owner.
- **Strict keys**: unknown frontmatter keys, unknown `run-config.md` keys, and unknown lane keys are `INVALID`.
- **Identity covers the whole body**, the intent's `origin:` lines included.
- **The pipelines folder root** comes from the working tree's `.rp.md`, also for `--ref` and discovery.
- **An empty net change** has the all-zero id, so an implementation without code changes can still be approved.
