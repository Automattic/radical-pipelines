# `rp`

`rp` computes a pipeline's state from its files and names the frontier, stamps frontmatter, discovers pipelines, and fills a role's convention blocks. It needs Node and Git 2.38 or later (for `git merge-tree --write-tree`), nothing else. The path argument selects the repository and worktree, whatever the process directory. [State](../reference/run/state.md) is the specification; this file is the exact grammar.

```text
node rp.mjs check <pipeline folder> [--ref <commit>] [--json]
node rp.mjs stamp <file> --at <commit> [--pin <candidate>]...
node rp.mjs pipelines <repo path> --base <artifact base branch> [--issue <ref>] [--json]
node rp.mjs blocks <pipeline folder> --role <role> [--json]
```

Each command accepts only its options and one positional argument. A command that cannot read what it needs, or is used wrongly, prints `rp: <reason>` to stderr and exits 1. Otherwise it exits 0, whatever the frontier.

## Pipeline files

A pipeline folder is `<pipelines folder root>/<pipeline slug>`. `check` and `stamp` take the pipelines folder root to be the parent of the pipeline folder they are given; `pipelines` reads it from the conventions (§ `pipelines`).

`rp` reads these files of a pipeline folder and ignores every other file:

| Path | What it is | Frontmatter keys |
| --- | --- | --- |
| `run-config.md` | Run configuration | `format`, `target-phase`, `base`, `lanes` |
| `0-intent/intent.md` | Intent | no frontmatter |
| `0-intent/constraint-<n>.md`, `proposal-<n>.md`, `failure-<n>.md` | Later input | no frontmatter |
| `1-spec/spec.md` | Spec | `inputs` |
| `1-spec/lanes/<id>/spec.md` | Spec candidate | `inputs` |
| `2-design-doc/design-doc.md` | Design doc | `inputs` |
| `2-design-doc/lanes/<id>/design-doc.md` | Design doc candidate | `inputs` |
| `3-implementation/notes.md` | Implementation notes | `inputs` |
| `threads/<name>.md` | Thread | `inputs` and `reviewed`, on an approval only |

Frontmatter is a JSON object between a first line `---` and the next line `---`. A key outside the table, or frontmatter on a file that carries none, makes the file `INVALID`.

### Identity

A file's identity is the first 12 hexadecimal characters of the git blob hash of its body: every byte below the frontmatter, unnormalized. Stamping never changes it.

### `run-config.md`

```json
{
  "format": 6,
  "target-phase": 4,
  "base": "main",
  "lanes": [
    { "profile": "spec-producer", "id": "a", "brief": "…" },
    { "profile": "reviewer", "id": "security", "brief": "…" }
  ]
}
```

- `format`: the conventions format the pipeline was written under, an integer; the current one is `6`. A `run-config.md` that is absent, has no JSON frontmatter, or has no integer `format` is of an **earlier** format. `check` and `stamp` read only format 6 and stop otherwise, before reading anything else: `rp: <path>: pipeline of an earlier format; it is not continued`, or `rp: <path>: pipeline of a newer format <n>; update the skill`.
- `target-phase`: an integer from 1 to 4. Phase 4 is review.
- `base`: a revision that resolves to a commit.
- `lanes` (optional, non-empty when present): each lane has only `profile`, `id`, and an optional `brief`, all non-empty strings. `profile` is `spec-producer` or `design-doc-producer` for a production lane, or `reviewer` for a review lane. `id` matches `[a-z0-9][a-z0-9-]*` and is unique per profile.
- Without a `reviewer` lane there is one review lane, `default`. A configuration may declare `default` itself alongside other review lanes.

The body is ignored. A missing `run-config.md` or one that breaks these rules stops `check`, as does a missing intent.

### `inputs`

`inputs` is a list of `<path>@<identity>`, one per pinned file, with paths relative to the pipeline folder. A pin may name the intent, a later input, an artifact, or a candidate.

| What carries `inputs` | Required inputs |
| --- | --- |
| `1-spec/spec.md` | `0-intent/intent.md`; every later input targeting it |
| A spec candidate | `0-intent/intent.md` |
| `2-design-doc/design-doc.md` | `1-spec/spec.md`; every later input targeting it |
| A design doc candidate | `1-spec/spec.md` |
| `3-implementation/notes.md` | `1-spec/spec.md`, `2-design-doc/design-doc.md`; every later input targeting it |
| An approval (§ Threads) | `0-intent/intent.md`; every later input |

- **Stale**: a required input is unpinned, or pinned at an identity that differs from the current one. Other pins, such as the candidates a consolidated root merged, are checked for grammar only.
- **Missing**: the file is absent. `notes.md` is also missing until the first line of its body is exactly `status: done`.
- **Fresh**: neither.

### Later input

A later input's body has a line `target: <artifact>[#<id>][, <artifact>[#<id>]]...`. Each `<artifact>` is `1-spec/spec.md`, `2-design-doc/design-doc.md`, or `3-implementation/notes.md`. A missing `target:` line or any other path makes the file `INVALID`.

## Threads

A thread file is named `<n>-<opener>-<owner>-<artifact>.md` after its header, with `<n>` a positive integer. Threads may share `<n>`.

Its body begins with exactly four header lines, five on a thread to `owner`, followed by a blank line:

```text
status: open | closed: approved | closed: withdrawn | closed: answered | disagreement
opener: <role>
owner: <role>
artifact: intent | spec | design-doc | implementation
cites: <thread path | evidence path>
```

- `<role>` is `<profile>[-<lane id>]`: `owner`, `implementer`, `spec-producer`, `design-doc-producer`, `spec-producer-<lane id>`, `design-doc-producer-<lane id>`, or `reviewer-<lane id>`, with `<lane id>` matching `[a-z0-9][a-z0-9-]*`. Roles are checked by this grammar only, never against `run-config.md`, so closed threads of a removed lane stay valid. Production lanes open no threads: an `open` or `disagreement` thread whose opener or owner is `spec-producer-<lane id>` or `design-doc-producer-<lane id>` is `INVALID <thread>: production lanes open no threads`; the grammar keeps those roles so closed threads stay readable. An `open` thread awaiting a review lane that `run-config.md` does not declare is `INVALID <thread>: lane not configured; close the thread withdrawn`; `default` is declared while no `reviewer` lane is, or when a lane declares it.
- `artifact` pairs with the owner's profile: `intent`–`owner`, `spec`–`spec-producer`, `design-doc`–`design-doc-producer`, `implementation`–`implementer`.
- The opener is any role but `owner`, and differs from the owner.
- A thread to `owner` has status `disagreement` or `closed: answered`, and the `cites:` line with a non-empty value; no other thread has either status or the line. The value is not resolved.

After the header, every line that starts with `## ` outside fenced code is a message heading: `## <author> — <commit>`, with `<author>` the opener, the thread's owner, or `owner`, an em dash, and 7 to 64 hexadecimal characters. Text before the first heading and between headings is free. A thread has at least one message, and the first is the opener's.

An `open` thread awaits its opener when the thread's owner wrote the last message, and its owner otherwise. No other thread awaits anyone.

A **review thread** is one opened by `reviewer-<lane id>` to `implementer`. An **approval** is a review thread closed `approved`. An approval must carry `inputs` and `reviewed`, a full commit hash, and no other thread carries frontmatter.

## Net change and approval

The **base** is the merge-base of the tip with `run-config.md`'s `base`: the latest base the tip holds. A `base` that does not resolve, or has no merge-base with the tip, stops `check`. The **net change** is the diff `<base>..<tip>` outside the pipelines folder root: what the reviewer reads.

An approval's `reviewed` is the commit the reviewer's turn started at: the code it approved. The approval is **fresh** when no required input changed (§ `inputs`) and the tip's code is the approved commit's plus clean merges of the base:

1. When `reviewed` is the tip, the code is the approved code.
2. Otherwise, `git merge-tree --write-tree <reviewed> <base>`. A conflict changes the code.
3. Otherwise, `git diff --quiet <merged tree> <tip> -- . ':(top,exclude,literal)<pipelines folder root>'`. Any difference changes the code.

A `reviewed` that does not resolve to a commit stops `check`. A review lane is **approved** when its highest-numbered review thread is a fresh approval. Approval is computed for the configured review lanes.

## `check`

```text
node rp.mjs check <pipeline folder> [--ref <commit>] [--json]
```

`check` reads the pipeline files from the working tree, or with `--ref` from that commit. The tip is `HEAD`, or the `--ref` commit. A pipeline file that is a symlink or not a regular file, a folder where a pipeline file belongs, or a file where a pipeline folder belongs stops `check`, in the working tree and at a ref alike. `check` validates every pipeline file.

### Frontier

The frontier is every action of the first rule that holds:

1. **`INVALID <path>: <reason>`** for each malformed file.
2. **`escalate <thread>`** for each `disagreement` thread.
3. The lowest phase whose roles have work. Phases 1 to 3 belong to their artifact's profile, its production lanes included, and phase 4 to the reviewers. Work is an `open` thread awaiting the role, in any phase, or the artifact missing or stale, through the target:
   - **`lane <artifact> <lane id>`**, while the root is missing, for each configured lane whose candidate is missing or stale.
   - Production lanes configured, the root missing, and no lane action: **`consolidate <artifact>`**.
   - The artifact missing, without production lanes: **`produce <artifact>`**.
   - The artifact stale, or a thread awaiting the artifact's owner: **`respond <artifact>`**. Beyond the target, only the thread counts.
   - Phase 4: **`review <lane id>`** for each lane a thread awaits, and, at target phase 4, each configured lane not approved.
4. **`complete`**.

### Output

Without `--json`, the frontier comes first, one line per action, then one line per fact:

```text
frontier <action>[ <target>][ <lane id>][: <reason>]
lane <artifact> <lane id> <state>              for each production lane while its root is missing
artifact <artifact> <state>                    for each phase through the target, after its lanes
net-change <base>..<tip>                       at target phase 4
review <lane id> <approval>                    at target phase 4, for each review lane
thread <thread> <status>[ awaits <role>]
```

`<state>` is `missing`, `fresh`, or `stale <changed input>[ <changed input>]...`. `<approval>` is `approved`, `unapproved` when the latest review thread is no approval, or `stale` followed by the changed inputs and, when the code changed, `code`. On `INVALID`, only the frontier lines are printed. Paths are relative to the pipeline folder.

`--json` prints one object:

- `pipeline`, `tip`, `targetPhase`, `frontier`: always. Each frontier entry has `action`, and where they apply `target`, `lane`, `reason`, `threads` (the threads awaiting the woken role; not on `lane`), and `changed` (the changed inputs of a stale artifact, candidate, or approval).
- `phases`, `threads`: unless `INVALID`. Each phase has `phase`, `artifact`, `state`, `stale` when stale, and `lanes` (`id`, `path`, `state`, `stale`) while its root is missing. Each thread has `path`, `status`, `opener`, `owner`, `artifact`, `awaits`, and `reviewed`.
- `netChange` (`<base>..<tip>`), `reviews` (`lane`, `approved`, `stale` with the changed inputs, `codeChanged` when the code changed): at target phase 4, unless `INVALID`. A `review` frontier entry carries `changed` and `codeChanged` the same way.

## `stamp`

```text
node rp.mjs stamp <file> --at <commit> [--pin <candidate>]...
```

`--at` names the turn's commit: the tip of the role's worktree when it was woken. `stamp` pins the file's required inputs (§ `inputs`) at their identities in that commit's tree, whether or not the turn changed the file, so a response that leaves its artifact unchanged becomes fresh, and an input committed after that commit, or not committed, is not certified. `stamp` keeps the body byte for byte, and writes nothing when the frontmatter would not change, so stamping twice changes nothing.

- **An artifact or candidate**: `inputs` becomes its required inputs. A spec or design doc keeps the candidate pins it recorded; `--pin <candidate>` replaces them with the candidates named, at consolidation. A `--pin` path is absolute or relative to the pipeline folder, whatever the process directory.
- **An approval**: `inputs` becomes its required inputs, and `reviewed` the full hash of the `--at` commit.

`stamp` validates only what it reads. From the working tree it reads the stamped file. At `--at` it reads `run-config.md`, the intent, every later input (its `target:` line says whether it applies), the stamped file's upstream artifacts, and the candidates `--pin` names. Any other file at `--at`, such as a thread malformed then and repaired since, is not read.

A missing `--at` or one that does not resolve, any other kind of file, `--pin` on anything but a spec or design doc, a `--pin` path that is not a file (`cannot read --pin <path tried>: not a file`), a `--pin` file that is not one of its candidates, a required input or candidate missing at `--at`, a file it reads that is malformed or of the wrong kind, or malformed frontmatter on the stamped file stops the command.

## `pipelines`

```text
node rp.mjs pipelines <repo path> --base <artifact base branch> [--issue <ref>] [--json]
```

Fetching is the caller's job. The pipelines folder root is the first non-blank line of the `Pipelines folder root` convention (§ Conventions) in `.rp.local.md`, else in `.rp.md`, with surrounding backticks and a trailing `/` removed; without that convention in either, it is `.pipelines`. A value that is a heading, absolute, or leaves the repository stops the command. `pipelines` reads every local branch and remote-tracking branch tip:

1. Collect each `<pipelines folder root>/<slug>` folder at each tip, with its tree id.
2. The pipeline is **live** at that tip when the folder's tree id differs from every tree id that folder had in the history of `--base`.
3. Every folder in the tree of `--base` is **merged**, reported once from `--base`.
4. With `--issue`, keep those whose intent opens with the line `origin: issue <ref>`.

Of each pipeline folder, discovery reads only two things, so pipelines of every format are listed and none is validated:

- **`format`** (§ `run-config.md`): the integer `format` of `run-config.md` when it is a regular file with JSON frontmatter carrying one, else `earlier`.
- **Origins**: the values of the leading `origin:` lines of `0-intent/intent.md`'s body when it is a regular file, frontmatter skipped. An intent with unclosed frontmatter has no origins.

A pipeline of format 6 without a regular `0-intent/intent.md` is malformed and stops the command; one of an earlier format is listed with no origins. A missing or unresolving `--base`, or a git failure, stops the command. Branch and folder names are never matched. A pipeline at a local branch and its remote-tracking branch is listed for each.

Without `--json`, one line per pipeline: `<live|merged> <format> <ref> <pipeline folder>`. `--json` prints a list of `{state, format, ref, commit, folder, origins}`.

## Conventions

`pipelines` and `blocks` read `.rp.md` and `.rp.local.md` at the root of the main checkout: the parent of `git rev-parse --git-common-dir` in a linked worktree, and the worktree itself otherwise, so a linked worktree sees the git-ignored `.rp.local.md`. An absent file is skipped; one that cannot be read stops the command.

A **convention** is the text under the one heading, at any level, titled with its name, up to the next heading of that level or higher; headings inside fenced code are not headings. Two headings with the name in one file stop the command.

## `blocks`

```text
node rp.mjs blocks <pipeline folder> --role <role>
```

`--role` is a thread role other than `owner` (§ Threads). The pipeline slug is the pipeline folder's last segment, and the **agent name** is `<pipeline slug>-<role>`.

A block of the `Guardrails` or `Resources` convention is a heading one level below the convention's, whose title is the block's name, followed by exactly two items, in either order:

- its text: `- rule: <text>` in `Guardrails`, `- resource: <text>` in `Resources`, with the indented and blank lines after it;
- `- agents: <profile>[, <profile>]...`, on one line, each profile one of `spec-producer`, `design-doc-producer`, `implementer`, `reviewer`, optionally in backticks.

Text before the first block is ignored. Any other heading level, line, or item in a block, an empty text, an empty or unknown profile, or two blocks with one name in a file stops the command, naming the file and the block.

A block of `.rp.local.md` replaces the block of `.rp.md` with its name, in its place; its other blocks follow. `blocks` keeps the blocks whose `agents` include the role's profile, drops their `agents` item, and replaces every `{agent}` in their text with the agent name. It prints each convention as the assignment carries it:

```text
## Guardrails

### <name>

<text>

## Resources

none
```

Blocks are separated by a blank line; a convention without one is `none`. `--json` prints `{agent, guardrails, resources}`, each a list of `{name, text}`.

## Decisions

These fill details the specification leaves open; the prose aligns with them.

- **A thread to `owner`** opens as `disagreement` and closes `closed: answered`; `open`, `closed: approved`, and `closed: withdrawn` are `INVALID` there.
- **A message by `owner`** on any thread leaves it awaiting the thread's owner.
- **A woken opener** gets `produce` when its artifact is missing and `respond` otherwise, with the threads awaiting it. Beyond the target, a thread's owner gets `respond` even when its artifact is missing.
- **The base an approval is merged with** is the merge-base of the tip with the base branch, not the base branch's tip, so a base that moved without being merged leaves approvals fresh.
- **A re-stamp without `--pin`** keeps the candidate pins a root recorded, so the record of a consolidation survives later stamps.
- **Strict keys**: unknown frontmatter, `run-config.md`, and lane keys are `INVALID` or stop the command.
