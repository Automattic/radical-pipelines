# `rp`

`rp` computes a pipeline's state from its files and names the frontier, certifies landed files, discovers pipelines, and builds review lane branches. It needs Node and Git 2.38 or later (for `git merge-tree --write-tree`), nothing else. The path argument selects the repository and worktree, whatever the process directory. [State](../reference/run/state.md) is the specification; this file is the exact grammar.

```text
node rp.mjs check <pipeline folder> [--ref <commit>] [--json]
node rp.mjs stamp <file> --at <commit>
node rp.mjs pipelines <pipelines folder root> --base <artifact base branch> [--issue <ref>] [--json]
node rp.mjs review <pipeline folder> --lane <lane> [--json]
```

Each command accepts only its options and one positional argument. A command that cannot read what it needs, or is used wrongly, prints `rp: <reason>` to stderr and exits 1. Otherwise it exits 0, whatever the frontier.

## Pipeline files

A pipeline folder is `<pipelines folder root>/<pipeline slug>`, a folder of the root that holds, at its top level, a phase folder `<digits>-<name>/` or `run-config.md` or `prompt.md`, or a phase folder under its `base/` folder, as each format kept its files; any other content of the root, such as tooling, is not a pipeline. `check` and `stamp` take the pipelines folder root to be the parent of the pipeline folder they are given; `pipelines` is given it.

`rp` reads these files of a pipeline folder and ignores every other file:

| Path | What it is | Frontmatter keys |
| --- | --- | --- |
| `run-config.md` | Run configuration | JSON: `format`, `target-phase`, `base`, `lanes` |
| `0-intent/intent.md` | Intent | `issue`, `starts-from`, `re-attempts`, each optional |
| `0-intent/constraint-<n>.md`, `proposal-<n>.md`, `failure-<n>.md` | Later input | `target`, required; `origin`, optional and not interpreted |
| `1-spec/spec.md` | Spec | no frontmatter |
| `1-spec/lanes/<id>/spec.md` | Spec candidate | no frontmatter |
| `2-design-doc/design-doc.md` | Design doc | no frontmatter |
| `2-design-doc/lanes/<id>/design-doc.md` | Design doc candidate | no frontmatter |
| `3-implementation/notes.md` | Implementation notes | `status` |
| `threads/<name>.md` | Thread | `status`, `opener`, `owner`, `artifact`; `cites` on a thread to `owner` (§ Threads) |
| `certification/<path>.json` | The certification of the file at `<path>` (§ Certification) | none: the file is JSON |

A key outside the table, or frontmatter on a file that carries none, makes the file `INVALID`. `rp` reads these values from the frontmatter alone; the body is free text.

### Frontmatter

A frontmatter is the lines between a first line `---` and the next line `---`; either may end in CRLF, and the closing one may end the file. `run-config.md`'s holds a JSON object. Every other file's holds this YAML subset, a flat map of single-line text values:

- Each line is blank or `<key>: <value>`, starting at column 0. `<key>` starts with a letter or digit.
- A plain value is the text written, without surrounding spaces and tabs. A value in single or double quotes is the text between them. Every value is text, including one YAML would read as a number, a boolean, or null, such as `368` or `true`; an empty value is empty text.
- A file whose frontmatter has no closing line, an indented line (a nested map or a multi-line value), a list item, a comment line, a line that is no `<key>: <value>`, or a key given twice is `INVALID`. So is a value YAML would read as other text or as structure: one holding a comment (` #`, or `#` first, as in an unquoted issue reference `#368`), a flow collection (`[`, `{`), an anchor (`&`), an alias (`*`), a tag (`!`), a block scalar (`|`, `>`), a quoted value holding an escape (`\` in double quotes, `''` in single quotes) or followed by text, or a plain value YAML rejects: one starting with `%`, `@`, `` ` ``, `,`, `]`, or `}`, starting with `-`, `?`, or `:` followed by a space or alone, or holding `: ` or ending with `:`. The reason names the key and the construct, or the line.

Quote a value that starts with one of those characters, such as `issue: "#368"`.

### Identity

A file's identity is the first 12 hexadecimal characters of the git blob id of the whole file, frontmatter included: at a commit, the id its tree records; in the working tree, the id `git add` would store for the file at its path, after the clean filters and line-ending conversion its attributes, configuration, and index entry select, so a file committed with CRLF keeps it under `core.autocrlf`. Git computes it on a copy of the worktree's index, writing no object and leaving the index untouched. An unmodified working tree has the identities of `HEAD`'s tree.

### `run-config.md`

```json
{
  "format": 7,
  "target-phase": 4,
  "base": "main",
  "lanes": [
    { "profile": "spec-producer", "id": "a", "brief": "…" },
    { "profile": "reviewer", "id": "security", "brief": "…" }
  ]
}
```

- `format`: the conventions format the pipeline was written under, an integer; the current one is `7`. A `run-config.md` that is absent, has no JSON frontmatter, or has no integer `format` is of an **earlier** format. `check` and `stamp` read only format 7 and stop otherwise, before reading anything else: `rp: <path>: pipeline of an earlier format; it is not continued`, or `rp: <path>: pipeline of a newer format <n>; update the skill`.
- `target-phase`: an integer from 1 to 4. Phase 4 is review.
- `base`: a revision that resolves to a commit.
- `lanes` (optional, non-empty when present): each lane has only `profile`, `id`, and an optional `brief`, all non-empty strings. `profile` is `spec-producer` or `design-doc-producer` for a production lane, or `reviewer` for a review lane. `id` matches `[a-z0-9][a-z0-9-]*` and is unique per profile.
- Without a `reviewer` lane there is one review lane, `default`. A configuration may declare `default` itself alongside other review lanes.

The body is ignored. A missing `run-config.md` or one that breaks these rules stops `check`, as does a missing intent.

### Certification

`stamp` alone writes `certification/<path>.json`, the certification of the artifact, candidate, or approval at `<path>`, relative to the pipeline folder. It is a JSON object holding only:

- `inputs`: a list of `<path>@<identity>`, one per pinned file, with paths relative to the pipeline folder. A pin may name the intent, a later input, an artifact, or a candidate.
- `reviewed`, on an approval only (§ Threads): the full hash of its approved commit (§ Net change and approval).

| What is certified | Required inputs |
| --- | --- |
| `1-spec/spec.md` | `0-intent/intent.md`; every later input targeting it |
| A spec candidate | `0-intent/intent.md` |
| `2-design-doc/design-doc.md` | `1-spec/spec.md`; every later input targeting it |
| A design doc candidate | `1-spec/spec.md` |
| `3-implementation/notes.md` | `1-spec/spec.md`, `2-design-doc/design-doc.md`; every later input targeting it |
| An approval | `0-intent/intent.md`; every later input |

- **Stale**: a required input is unpinned, or pinned at an identity that differs from the current one. A file without a certification is stale on each required input. Pins of other files are checked for grammar only.
- **Missing**: the file is absent. `notes.md` is also missing until its `status` is `done`.
- **Fresh**: neither.

`check` reads the certification of each artifact, candidate, and approval present, in the working tree or at `--ref` alike, and never another file under `certification/`, such as a dropped lane's. A certification that is a symlink or not a regular file, a folder where it belongs, a file where its folder belongs, invalid JSON, a key outside those above or a missing one, an ill-formed or repeated pin, a pin naming no pinnable path, or a `reviewed` that is no full commit hash stops the command: `rp: <path>: <reason>`, with no frontier.

### Later input

A later input's `target` is `<artifact>[#<id>][, <artifact>[#<id>]]...`. Each `<artifact>` is `1-spec/spec.md`, `2-design-doc/design-doc.md`, or `3-implementation/notes.md`. A missing `target` or any other path makes the file `INVALID`.

## Threads

A thread file is named `<n>-<opener>-<owner>-<artifact>.md` after its frontmatter, with `<n>` a positive integer. Threads may share `<n>`.

Its frontmatter holds four keys, five on a thread to `owner`:

```yaml
---
status: open | approved | withdrawn | answered | disagreement
opener: <role>
owner: <role>
artifact: intent | spec | design-doc | implementation
cites: <thread path | evidence path>
---
```

- `<role>` is `<profile>[-<lane id>]`: `owner`, `implementer`, `spec-producer`, `design-doc-producer`, `spec-producer-<lane id>`, `design-doc-producer-<lane id>`, or `reviewer-<lane id>`, with `<lane id>` matching `[a-z0-9][a-z0-9-]*`. Roles are checked by this grammar only, never against `run-config.md`, so closed threads of a removed lane stay valid. Production lanes open no threads: an `open` or `disagreement` thread whose opener or owner is `spec-producer-<lane id>` or `design-doc-producer-<lane id>` is `INVALID <thread>: production lanes open no threads`; the grammar keeps those roles so closed threads stay readable. An `open` thread awaiting a review lane that `run-config.md` does not declare is `INVALID <thread>: lane not configured; close the thread withdrawn`; `default` is declared while no `reviewer` lane is, or when a lane declares it.
- `artifact` pairs with the owner's profile: `intent`–`owner`, `spec`–`spec-producer`, `design-doc`–`design-doc-producer`, `implementation`–`implementer`.
- The opener is any role but `owner`, and differs from the owner.
- A thread to `owner` has status `disagreement` or `answered`, and `cites` with a non-empty value; no other thread has either status or the key. The value is not resolved.

In the body, every line that starts with `## ` outside fenced code is a message heading: `## <author> — <commit>`, with `<author>` the opener, the thread's owner, or `owner`, an em dash, and 7 to 64 hexadecimal characters. Text before the first heading and between headings is free. A thread has at least one message, and the first is the opener's.

An `open` thread awaits its opener when the thread's owner wrote the last message, and its owner otherwise. No other thread awaits anyone.

A **review thread** is one opened by `reviewer-<lane id>` to `implementer`. An **approval** is a review thread closed `approved`.

## Net change and approval

The **base** is the merge-base of the tip with `run-config.md`'s `base`: the latest base the tip holds. A `base` that does not resolve, or has no merge-base with the tip, stops `check`. The **net change** is the diff `<base>..<tip>` outside the pipelines folder root: what the reviewer reads.

An approval's `reviewed` is its approved commit: the pipeline-branch commit that held the approval when it was certified, whose code is the change its reviewer read (§ `stamp`). The approval is **fresh** when no required input changed (§ Certification) and the tip's code is the approved commit's plus clean merges of the base:

1. When `reviewed` is the tip, the code is the approved code.
2. Otherwise, `git merge-tree --write-tree --name-only <reviewed> <base>`. A conflict on a path outside the pipelines folder root changes the code; conflicts inside it are ignored.
3. Then `git diff --quiet <merged tree> <tip> -- . ':(top,exclude,literal)<pipelines folder root>'`. Any difference changes the code.

An approval without a certification is stale on its required inputs, and its code is not judged. An approval whose `reviewed` does not resolve to a commit in the clone, as after a squash merge or a deleted branch, is no approval: `unapproved`. A review lane is **approved** when its highest-numbered review thread is a fresh approval. Approval is computed for the configured review lanes.

## `check`

```text
node rp.mjs check <pipeline folder> [--ref <commit>] [--json]
```

`check` reads the pipeline files and their certifications from the working tree, or with `--ref` from that commit. The tip is `HEAD`, or the `--ref` commit. A pipeline file that is a symlink or not a regular file, a folder where a pipeline file belongs, or a file where a pipeline folder belongs stops `check`, in the working tree and at a ref alike. `check` validates every pipeline file.

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
- `phases`, `threads`: unless `INVALID`. Each phase has `phase`, `artifact`, `state`, `stale` when stale, and `lanes` (`id`, `path`, `state`, `stale`) while its root is missing. Each thread has `path`, `status`, `opener`, `owner`, `artifact`, `awaits`, and `reviewed`, from an approval's certification, else `null`.
- `netChange` (`<base>..<tip>`), `reviews` (`lane`, `approved`, `stale` with the changed inputs, `codeChanged` when the code changed): at target phase 4, unless `INVALID`. A `review` frontier entry carries `changed` and `codeChanged` the same way.

## `stamp`

```text
node rp.mjs stamp <file> --at <commit>
```

`stamp` certifies an artifact, a candidate, or an approval: it writes `certification/<file>.json` (§ Certification) in the pipeline folder of the working tree, and never `<file>`. `--at` names the turn's commit: the tip of the role's worktree when it was woken. `inputs` becomes the file's required inputs at their identities in that commit's tree, whether or not the turn changed the file, so a response that leaves its artifact unchanged becomes fresh, and an input committed after that commit, or not committed, is not certified. `stamp` writes nothing when the certification would not change, so stamping twice changes nothing.

For an approval, `--at` is the change `rp review` built, the review lane's turn commit, and `reviewed` becomes the full hash of `HEAD` where the approval lies: the pipeline-branch commit holding it. `HEAD`'s tree outside the pipelines folder root must equal the change's; otherwise `stamp` stops and writes nothing.

`stamp` validates only what it reads. From the working tree it reads `run-config.md` and the stamped file. At `--at` it reads the intent, every later input (its `target` says whether it applies), and the stamped file's upstream artifacts. Any other file at `--at`, such as a thread malformed then and repaired since, is not read.

A missing `--at` or one that does not resolve, any other kind of file, a review thread that is no approval, a required input missing at `--at`, a file it reads that is malformed or of the wrong kind, or a certification path of the wrong kind stops the command.

## `pipelines`

```text
node rp.mjs pipelines <pipelines folder root> --base <artifact base branch> [--issue <ref>] [--json]
```

Fetching is the caller's job. The pipelines folder root, absolute or relative to the process directory, selects the repository and names the folder of every pipeline, as a path inside it; it need not exist in the working tree. A path that is a file, the repository's root, or outside any repository stops the command. `pipelines` reads every local branch and remote-tracking branch tip:

1. Collect each pipeline folder (§ Pipeline files) of the pipelines folder root at each tip, with its tree id.
2. The pipeline is **live** at that tip when the folder's tree id differs from every tree id that folder had in the history of `--base`.
3. Every folder in the tree of `--base` is **merged**, reported once from `--base`.
4. With `--issue`, keep those whose intent names `issue <ref>` among its origins.

Of each pipeline folder, discovery reads only two things, so pipelines of every format are listed and none is validated:

- **`format`** (§ `run-config.md`): the integer `format` of `run-config.md` when it is a regular file with JSON frontmatter carrying one, else `earlier`.
- **Origins**: of `0-intent/intent.md` when it is a regular file. From format 7, its frontmatter's `issue`, `starts-from`, and `re-attempts`, each as `<key> <value>`, in the order written; an intent whose frontmatter cannot be read (§ Frontmatter) has no origins. In an earlier format, the values of the leading `origin:` lines of its body, below any frontmatter; an intent with unclosed frontmatter has no origins.

A pipeline of format 7 without a regular `0-intent/intent.md` is malformed and stops the command; one of an earlier format is listed with no origins. A missing or unresolving `--base`, or a git failure, stops the command. Branch and folder names are never matched. A pipeline at a local branch and its remote-tracking branch is listed for each.

Without `--json`, one line per pipeline: `<live|merged> <format> <ref> <pipeline folder>`. `--json` prints a list of `{state, format, ref, commit, folder, origins}`.

## `review`

```text
node rp.mjs review <pipeline folder> --lane <lane> [--json]
```

The pipeline branch is the branch checked out in the worktree that holds the pipeline folder, and the **tip** is its `HEAD` commit; the pipeline is read from the tip, never from the working tree. `--lane` names a review lane of the tip's `run-config.md` (§ `run-config.md`), `default` included when no `reviewer` lane is declared. The **base** is the merge-base of the tip with `run-config.md`'s `base` (§ Net change and approval).

The **lane's view** of the pipeline is, at the tip, every file under `<pipeline folder>/0-intent/` and every thread `threads/<n>-reviewer-<lane>-implementer-implementation.md` or `threads/<n>-reviewer-<lane>-owner-intent.md`. `review` builds two commits with a temporary index, touching no worktree:

1. **Review base**: the base's tree with the pipelines folder root replaced by the **lane's root**: the tip's root without its pipeline folders (§ Pipeline files), plus the lane's view; its parent is the base; its message is `rp review base`.
2. **Change**: the tip's tree with the root replaced by the same lane's root; its parent is the review base; its message is `rp review change`.

It reads only commits and trees, through a temporary index, so no worktree's index, `HEAD`, or files affect them.

`git diff <review base> <change>` is the net change; the root's tooling stays, at the tip's version, and the lane's tree and history hold no other pipeline. The lane branch is `<pipeline branch>-review-<lane>`. When a worktree has it checked out, `review` runs `git reset --hard <change>` there; otherwise it creates or moves the branch to the change.

When the lane branch exists, its commits that `git cherry <tip> <lane branch>` marks `+`, other than a review base or a change, have not landed on the pipeline branch: `review` stops and names them, oldest first, and moves nothing.

Without `--json`, it prints `branch <lane branch>`, `base <review base>`, and `change <change>`, one per line. `--json` prints `{branch, base, change, worktree}`, `worktree` being the path it reset or `null`.

A detached `HEAD` where the pipeline folder is, a missing `--lane`, a lane `run-config.md` does not declare, an unreadable `run-config.md` or one of another format, a base that does not resolve or shares no merge-base with the tip, or a git failure stops the command.

## Decisions

These fill details the specification leaves open; the prose aligns with them.

- **A thread to `owner`** opens as `disagreement` and closes `answered`; `open`, `approved`, and `withdrawn` are `INVALID` there.
- **A message by `owner`** on any thread leaves it awaiting the thread's owner.
- **A woken opener** gets `produce` when its artifact is missing and `respond` otherwise, with the threads awaiting it. Beyond the target, a thread's owner gets `respond` even when its artifact is missing.
- **The base an approval is merged with** is the merge-base of the tip with the base branch, not the base branch's tip, so a base that moved without being merged leaves approvals fresh.
- **Strict keys**: unknown frontmatter, `run-config.md`, lane, and certification keys are `INVALID` or stop the command.
