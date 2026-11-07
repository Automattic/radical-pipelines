---
{
  "inputs": [
    "1-spec/spec.md@d17416b916fd"
  ]
}
---
# Design Doc: Keep rp's certification out of the pipeline files

## Overview

`rp stamp` writes its certification — `inputs`, and `reviewed` on an approval — as JSON frontmatter into files roles write, so those files have two writers. A file's identity is the hash of its raw bytes below that frontmatter. Under line-ending conversion, that hash differs between the working tree and the commit. An approval's inputs are pinned at the pipeline tip it lands on, not at the change its reviewer read. An approval whose recorded commit is missing stops `rp check`, and a merge conflict on a pipeline file marks it stale on code. The values roles and the orchestrator write for `rp` — thread headers, `notes.md`'s status, a later input's `target:`, the intent's `origin:` lines — are body lines.

After the change, `rp stamp` writes each landed file's certification to its own JSON file under `certification/` in the pipeline folder. Only `rp` writes there, and the landed file is never touched. A file's identity is the Git blob id of the whole file, the id Git stores for it, so the working tree and a commit agree. An approval is certified at the change `rp review` built, and its approved code is the pipeline-branch commit that holds the landed approval. An approval whose approved commit the clone lacks counts as not approved, and conflicts confined to the pipelines folder root never change the code. The values for `rp` move to a flat YAML frontmatter, read by a subset reader with no dependencies. The pipeline format and the conventions version become 7.

## Architecture

Modified:

- **`skills/radical-pipelines/scripts/rp.mjs`**:
  - **Frontmatter reader** (new responsibility): reads the YAML subset (§ Interfaces) on the intent, later inputs, threads, and `notes.md`, and rejects a frontmatter on the spec, the design doc, and candidates. `run-config.md` keeps its JSON frontmatter and its reader.
  - **Identity**: the Git blob id of the whole file. At a commit it comes from the tree. In the working tree, Git computes it.
  - **Certification store** (new): maps a landed file to `certification/<path>.json`, reads and validates it for `check`, and writes it for `stamp`. A certification that cannot be read stops the command.
  - **`check`**: judges freshness from the certification. It reads thread, `notes.md`, and later-input values from frontmatter. It judges approvals per design-doc-decision-4.
  - **`stamp`**: writes the certification and never the landed file. `--pin` is removed. An approval is certified per design-doc-decision-3.
  - **`pipelines`**: reads a format-7 intent's origins from its frontmatter, and an earlier one's from its leading `origin:` body lines.
  - **Format**: 7.
- **`skills/radical-pipelines/scripts/README.md`**: the exact grammar of everything above.
- **The skill's references**:
  - `reference/run/state.md`: files, terms, landing, threads, run configuration, and discovery.
  - `reference/run/loop.md`: `INVALID` dispatch and consolidation landing.
  - `reference/entries/intent-format.md`, `triage.md`, and `report.md`: origins and the later-input format.
  - `reference/conventions/load.md`, `setup.md`, and `changelog.md`: conventions version 7.
- **Templates**: `templates/reviewer-first.md` and `templates/reviewer-later.md`, where the thread's values become frontmatter.
- **Agent profiles**: `agents/spec-producer.md`, `agents/design-doc-producer.md`, `agents/implementer.md`, and `agents/reviewer.md`, for the thread and `notes.md` formats. The instruction to leave frontmatter untouched is removed.
- **Explanatory layer**: `README.md`, `docs/glossary.md`, `docs/model.md`, and `docs/flowcharts/loop.md`. A changeset records the change.
- **Tests**: `scripts/test/rp/`, on pipelines of the new format.

Untouched but relevant:

- **`rp review`**: the lane's view, `0-intent/` plus the lane's own threads, excludes `certification/`, so reviewers never see it. The change it builds holds no `run-config.md`.
- **`run-config.md`** and **`.rp.md`**: both keep their JSON frontmatter. This repository's `.rp.md` reaches version 7 through the skill's migration.
- **`opencode/`**: reads only skill and agent frontmatter, never pipeline files.

Data flow:

1. A role commits its file, with any values for `rp` in that file's frontmatter.
2. To land the turn, the orchestrator runs `rp stamp <file> --at <turn commit>`. `rp stamp` reads `run-config.md` and the landed file from the working tree, and the required inputs' identities from the turn commit's tree. It writes `certification/<file>.json`, and the orchestrator commits that file.
3. `rp check` reads the pipeline files and their certifications, from the working tree or a commit. It compares each certified identity with the input's current identity and prints the frontier.

## Decisions

design-doc-decision-1: One certification file per landed file, under `certification/`

**Serves:** spec-requirement-1, spec-requirement-2, spec-requirement-8, spec-requirement-11, spec-requirement-12, spec-acceptance-criterion-1, spec-acceptance-criterion-2, spec-acceptance-criterion-12, spec-acceptance-criterion-13
**Decision:**
- Each landed artifact, candidate, and approval has its certification in `certification/<its pipeline-relative path>.json`, inside the pipeline folder and so inside the pipeline's tree. The certification holds its pins and, on an approval, its approved commit (§ Interfaces).
- `rp stamp` is its only writer. No role or orchestrator step writes under `certification/`, and `rp stamp` writes nothing else.
- Every landed path has its own certification file, and only the branch that lands a file writes that file's certification. So the production lanes' merges into the pipeline branch, and the pipeline branch's merges back into a lane, never touch the same file from two sides.

**Alternatives:**
- One JSON file at the pipeline folder root. Lanes landing in parallel edit the same file, so their merges conflict (spec-requirement-11).
- A sidecar beside each landed file. It puts files only `rp` writes into folders roles write, including `threads/`, which roles scan for the next thread number. Every reader of those folders then learns to skip it.
- Git notes or a separate ref. They are outside the tree, so a squash merge or a fresh clone loses them (intent-constraint-1).
- Keeping the certification in the frontmatter with a rule for roles to leave it alone. That is the two-writer file the Goal removes.

**Trade-offs:** The pipeline folder gains a folder of files only `rp` writes. A dropped production lane's certification stays as an unread file (§ Risks).
**Claims:**
- observed: landing today rewrites the role's file (`1-spec/spec/crlf-gitattributes.txt`, `1-spec/spec/review-landing.txt`).
- observed: two lanes each adding their own file under one shared folder merge into the pipeline branch, take the pipeline branch back, re-land, and merge again, all without conflict (`2-design-doc/design-doc/lanes-certification.txt`, from `lanes-certification.sh`).
- observed: production lanes land in their own worktrees, and their branches merge into the pipeline branch. Every other role lands on the pipeline branch (`reference/run/loop.md` § One step, § Production lanes, § Review lanes).
- assumed: `rp stamp` changes no byte of a landed file — confirmed by the landing test in § Verification.

design-doc-decision-2: Identity is the Git blob id of the whole file, computed by Git for the working tree

**Serves:** spec-requirement-7, spec-requirement-8, spec-requirement-9, spec-acceptance-criterion-8, spec-acceptance-criterion-9, spec-acceptance-criterion-10
**Decision:**
- A file's identity is the first 12 hexadecimal characters of the blob id Git stores for the whole file, frontmatter included.
- At a commit (`rp check --ref`, and every input `rp stamp` reads at `--at`), the identity is the blob id the tree records.
- In the working tree, it is the blob id Git would store for the file at its path, after the clean filters and line-ending conversion its attributes and configuration select. Git computes it without writing an object.
- An unmodified working tree therefore yields the identities of `HEAD`'s tree.

**Alternatives:**
- Hashing the raw bytes, as today. The working tree and the commit disagree under line-ending conversion (intent-context-5).
- Normalizing line endings inside `rp`. That reimplements Git's attribute and `core.autocrlf` rules, and its hash is no Git blob id (intent-proposal-2).
- Reading identities from the index for files whose stat is clean. That needs the same hashing for modified files and adds a second path to the same answer.

**Trade-offs:** `rp check` on the working tree runs Git once more. A line-ending change Git's conversion does not undo is still a content change.
**Claims:**
- observed: under `*.md text eol=crlf` and under `core.autocrlf=true`, Git's filtered hash of the working-tree intent equals the committed blob, and the unfiltered hash does not (`1-spec/spec/crlf-gitattributes.txt`, `1-spec/spec/crlf-autocrlf.txt`).
- observed: in a linked worktree, one hashing call over several paths returns each committed blob id and writes no object (`2-design-doc/design-doc/git-probes.txt` § 1, from `git-probes.sh`).
- observed: Git 2.38's `git hash-object` applies the attribute filters unless told not to (`Documentation/git-hash-object.txt` at v2.38.0).
- assumed: `rp check`, `rp check` after the commit, and `rp check --ref HEAD` agree under both conversions — confirmed by the line-ending test in § Verification.

design-doc-decision-3: Landing records the certification at the turn commit; an approval at the change it reviewed

**Serves:** spec-requirement-1, spec-requirement-13, spec-requirement-19, spec-acceptance-criterion-1, spec-acceptance-criterion-14, spec-acceptance-criterion-17, spec-acceptance-criterion-21
**Decision:**
- `rp stamp <file> --at <turn commit>` keeps its meaning: each required input at its identity in the turn commit's tree, whether or not the turn changed the file.
- From the working tree, it reads `run-config.md` (the format, and the configured lanes for a candidate) and the landed file. At `--at`, it reads only the intent, every later input, and the file's upstream artifacts.
- For an approval, `--at` is the review lane's turn commit: the change `rp review` built, which holds the intent and the later inputs the reviewer read.
  - The approval's approved commit, recorded as `reviewed`, is the `HEAD` of the worktree holding the approval when it lands. That is the pipeline-branch commit carrying the cherry-picked approval.
  - `rp stamp` stops, writing nothing, unless `--at` resolves to the commit the reviewer's last message heading names, the change it reviewed. Both reviewer templates head that message with the lane's turn commit.
  - `rp stamp` also stops, writing nothing, unless the approved commit's code outside the pipelines folder root equals the change's.
- `--pin` and the consolidated root's record of its candidates are removed. The certification is exactly what intent-goal names: required inputs and approved code.

**Alternatives:**
- Recording the change itself as the approved commit. No pipeline branch holds it, so every other clone, and this one once the lane branch moves, lacks it, and spec-requirement-15 would make approvals routinely not approved.
- Keeping `--at HEAD` for approvals. That certifies later inputs the reviewer never read.
- Checking only the approved commit's code against `--at`'s. `--at HEAD`, the landing the skill prescribed before this change, has the same code, so it passes and certifies later inputs the reviewer never read (intent-context-5).
- Reading an approval's turn commit from the heading and dropping `--at` for approvals. That ends the single `--at` contract every landing shares, for a commit the heading already lets `rp stamp` check.
- Taking the approved commit as the last commit that changed the thread. Re-stamping would give the same answer, but `rp` would walk history for a commit `HEAD` already names.
- Keeping the candidate record. No step reads it, and the tree already holds the candidates beside the root.

**Trade-offs:** Re-stamping an approval after its certification is committed records a later commit with the same code. Removing `--pin` changes the `stamp` command line and the consolidation landing in `loop.md`.
**Claims:**
- observed: an approval stamped `--at HEAD` pins a later input committed while the reviewer worked (`1-spec/spec/review-landing.txt`).
- observed: with only the code check, `rp stamp --at HEAD` on such an approval exits 0, pins that later input, and leaves the lane `approved`. `--at <change>` leaves it stale on the input (`2-design-doc/design-doc/approval-at-head.txt`, from `3-implementation/notes/approval-at-head.sh`).
- observed: both reviewer templates head the reviewer's message `## reviewer-<lane> — <turn commit>`, the turn commit being the change (`templates/reviewer-first.md`, `templates/reviewer-later.md`, `templates/README.md`).
- observed: the change holds `0-intent/` and the lane's threads, and no `run-config.md` (`rp.mjs` `cmdReview`, its lane-view selection; review test "builds a change whose tree holds the code, the intent, later inputs, and the lane's own threads only").
- observed: no step reads a root's candidate pins (`grep -- --pin` over `skills/`, `agents/`, `docs/`: only `rp stamp`, its README, `state.md`, and `loop.md`'s consolidation landing name them; `rp.mjs` `staleInputs` checks them for grammar only).
- assumed: an approval landed after a later input is stale on that input — confirmed by the review-landing test in § Verification.

design-doc-decision-4: Judging an approval: an absent approved commit counts as not approved; conflicts inside the pipelines folder root never change the code

**Serves:** spec-requirement-14, spec-requirement-15, spec-acceptance-criterion-15, spec-acceptance-criterion-16
**Decision:**
- When the approved commit does not resolve to a commit in the clone, the approval counts as no approval. `rp check` completes, the lane's approval is `unapproved` (JSON `approved: false`, with neither `stale` nor `codeChanged`), and at target phase 4 the frontier wakes the lane.
- Otherwise the approved commit is merged with the base. A conflict on a path outside the pipelines folder root changes the code, and conflicts inside it are ignored. The merged code outside the root is then compared with the tip's, as today.

**Alternatives:**
- Reporting an absent commit as `stale code`. spec-requirement-14 limits code staleness to a difference that was found.
- A new approval state for it. No dispatch distinguishes it from `unapproved`.
- Stopping, as today. intent-proposal-3 and spec-requirement-15 refute it.
- Rebuilding both commits without the pipelines folder root before merging, as `rp review` builds trees. Same result, with more machinery.

**Trade-offs:** `unapproved` does not say the commit is missing. A clone without the commit re-reviews where one with it would not (spec-exclusion-2).
**Claims:**
- observed: a fresh clone after a squash merge stops with `reviewed does not resolve to a commit`. The clone holding the commit reports `stale code`, its only conflict being the thread file (`1-spec/spec/squash.txt`).
- observed: an approved commit merged with a squash of its pipeline branch conflicts only on a pipeline file edited after the approval. The merged tree equals the base outside the root (`2-design-doc/design-doc/git-probes.txt` § 2).
- observed: Git 2.38's `merge-tree --write-tree` lists conflicted paths and exits 1 on conflict (`git-merge-tree` documentation, 2.38.0).
- assumed: both clones behave as spec-acceptance-criterion-15 and spec-acceptance-criterion-16 state — confirmed by the squash-continuation tests in § Verification.

design-doc-decision-5: The values for `rp` are a flat YAML frontmatter, read by a dependency-free subset reader

**Serves:** spec-requirement-3, spec-requirement-4, spec-requirement-5, spec-requirement-6, spec-requirement-19, spec-acceptance-criterion-3, spec-acceptance-criterion-4, spec-acceptance-criterion-5, spec-acceptance-criterion-6, spec-acceptance-criterion-7, spec-acceptance-criterion-21
**Decision:**
- Each file `rp` reads carries its values for `rp` in a frontmatter of the subset in § Interfaces, with the keys listed there. `rp` reads them only there.
  - A thread's header values move to its frontmatter. Its message headings stay in the body, read as today.
  - `notes.md` is done when its `status` is `done`.
  - A later input's targets come from `target`, in today's grammar.
  - The intent's origins are `issue`, `starts-from`, and `re-attempts`. A flat map cannot repeat `origin`.
- The spec, the design doc, and candidates carry no frontmatter.
- `rp` reads every value as text. A plain value YAML resolves to a number, a boolean, or null is read as the text written. Every construct YAML would read as other text or as structure is `INVALID`, with a reason naming the key or the construct.
- The reader uses Node built-ins only.

**Alternatives:**
- A YAML library. `rp` would need an installed package (spec-requirement-5).
- Keeping JSON frontmatter. intent-constraint-4 makes it YAML.
- A repeated `origin` key in the intent. That is a duplicate key, which the subset rejects.
- Rejecting plain values YAML resolves to a non-string. The canonical issue reference in intended use is a bare number, which would be `INVALID` unless quoted.

**Trade-offs:** A writer quotes a value YAML would read otherwise, such as an issue reference beginning with `#`. `rp` maintains its own reader for the subset.
**Claims:**
- observed: a YAML parser reads the values intended use writes — statuses, roles, paths, `target` lists with `#<id>`, URLs, branch names — as their text. It reads `#368` as a comment, `0368` as the number 368, and flow collections, anchors, tags, and escapes as other values (`2-design-doc/design-doc/yaml-values.txt`, from `yaml-values.mjs`, yaml 2.9.0).
- observed: this project's canonical issue reference is the GitHub issue number (`.rp.md` § Issues).
- observed: no code in the repository but `rp.mjs` reads pipeline files (search of `opencode/` and `scripts/opencode-integration/` for `0-intent`, `threads/`, `notes.md`, `intent.md`: no matches).
- observed: `rp.mjs` imports only `node:` modules (read: its import lines).
- assumed: the subset is read and rejected as § Interfaces states — confirmed by the frontmatter tests in § Verification.

design-doc-decision-6: Reading the certification: absent means stale, unreadable stops

**Serves:** spec-requirement-8, spec-requirement-10, spec-requirement-19, spec-acceptance-criterion-11, spec-acceptance-criterion-21
**Decision:**
- `rp check` reads the certification of each artifact, candidate, and approval present, from the working tree or the `--ref` commit alike.
- A landed file without a certification is stale on each required input. For an approval, no code is judged.
- A certification that cannot be read or is malformed stops the command with `rp: <path>: <reason>` and exit 1, and prints no frontier. That covers a non-regular file, a folder where it belongs, a file where its folder belongs, invalid JSON, a key outside `inputs` and an approval's `reviewed`, a missing key, an ill-formed or duplicated pin, a pin naming no pinnable path, or a `reviewed` that is no full commit hash.
- Files under `certification/` that certify no present artifact, candidate, or approval are not read, like any other file `rp` ignores.

**Alternatives:**
- `INVALID`, as today. intent-constraint-2 forbids it.
- Treating an unreadable certification as missing. That silently re-runs roles over a corruption.
- Rejecting unread certification files. A dropped lane's certification would then stop every check.

**Trade-offs:** A malformed certification halts the run until a person looks. Unread files may accumulate.
**Claims:**
- observed: today a malformed `inputs` is an `INVALID` line, and an approval without frontmatter is `INVALID` (`rp.mjs` `parseInputs`, `readState`).
- observed: dropping a lane removes its candidate folder and nothing else (`reference/run/state.md` § Run configuration).
- assumed: each malformed certification stops `check` with no frontier — confirmed by the certification test in § Verification.

design-doc-decision-7: Format 7, conventions version 7, and discovery by format

**Serves:** spec-requirement-16, spec-requirement-17, spec-requirement-18, spec-acceptance-criterion-18, spec-acceptance-criterion-19, spec-acceptance-criterion-20
**Decision:**
- `rp`'s format is 7. `check` and `stamp` stop on format 6 with today's earlier-format message. Triage writes `format: 7`.
- The conventions version becomes 7, and the pipeline format stays the conventions format a pipeline was written under. `changelog.md` gains entry 7, "Migrate from version 6", which changes nothing in `.rp.md` and records that format-6 pipelines are history. A version-6 `.rp.md` therefore migrates by its stamp alone.
- `rp pipelines` reads origins from the intent's frontmatter at format 7 or later, as `issue <ref>`, `starts-from <branch>`, and `re-attempts <slug>` in the order written: the strings today's lines give. Earlier formats are read from the leading `origin:` body lines, as today. Discovery validates nothing: a frontmatter it cannot read yields no origins.

**Alternatives:**
- A pipeline format that is no longer the conventions version. That breaks `state.md`'s definition of `format`, and spec-acceptance-criterion-20 has the stamp at the current version.
- Reading origins from both places whatever the format. A format-7 intent written with body lines would be found by discovery yet carry no origins `rp check` accepts.

**Trade-offs:** Every project confirms a stamp-only migration on its first load after the change.
**Claims:**
- observed: format 6 is current (`rp.mjs` `FORMAT`), and conventions 6 is current (`reference/conventions/load.md` § Schema stamp). `changelog.md` § 6 § Pipelines records the earlier format change.
- observed: `rp pipelines --issue 368` lists this format-6 pipeline with `origins: ["issue 368"]` (`1-spec/spec/discovery-issue-368.txt`).
- assumed: format-6 and format-7 pipelines are both listed with their origins — confirmed by the discovery test in § Verification.

design-doc-decision-8: The skill's guidance shows the frontmatter and drops the rp-only exceptions

**Serves:** spec-requirement-20, spec-acceptance-criterion-22
**Decision:**
- Every format a role or the orchestrator writes for a file `rp` reads shows its values for `rp` as YAML frontmatter: the thread format in the four profiles and both reviewer templates, `notes.md` in the implementer's profile, the intent's origins and the later-input format in `intent-format.md`, and the thread header in `state.md`.
- The profiles drop "Frontmatter on every file is the orchestrator's; leave it untouched."
- `state.md` describes the certification as `rp`'s, written by landing, in place of § Frontmatter. Landing an approval passes the change as `--at`.
- `loop.md`'s `INVALID` row becomes one rule: wake the file's author with **Malformed files**, or fix it yourself when you wrote it. Consolidation lands without `--pin`.
- Where the pipeline format, the conventions version, origins, pins, or stamping are explained (`README.md`, `docs/`), the explanation follows.

**Alternatives:** Leaving the explanatory layer for later. The repository rules require it to follow behavior.
**Trade-offs:** Many files change, each by a few lines.
**Claims:**
- observed: the instruction to leave frontmatter untouched (`agents/spec-producer.md:106`, `agents/design-doc-producer.md:120`, `agents/implementer.md:128`).
- observed: body-line headers (`templates/reviewer-first.md`, `agents/reviewer.md`).
- observed: `loop.md`'s "repair it and re-stamp" row (`reference/run/loop.md:25`).

## Interfaces

### Files `rp` reads

| Path | Values for `rp` | Written by |
| --- | --- | --- |
| `run-config.md` | JSON frontmatter, unchanged; `format` is `7` | Orchestrator |
| `0-intent/intent.md` | Frontmatter `issue`, `starts-from`, `re-attempts`, all optional | Orchestrator |
| `0-intent/constraint-<n>.md`, `proposal-<n>.md`, `failure-<n>.md` | Frontmatter `target` (required, today's grammar), `origin` (optional, not interpreted) | Orchestrator |
| `1-spec/spec.md`, `2-design-doc/design-doc.md`, candidates | None. A frontmatter is `INVALID` | Their producers |
| `3-implementation/notes.md` | Frontmatter `status`. Missing until it is `done` | Implementer |
| `threads/<n>-<opener>-<owner>-<artifact>.md` | Frontmatter `status`, `opener`, `owner`, `artifact`, each required, and `cites`, only and always on a thread to `owner`, under today's rules. Message headings in the body | Its parties; the orchestrator for `owner` |
| `certification/<landed file's path>.json` | The certification (below) | `rp stamp` only |

A key a file does not carry is `INVALID`, naming it.

### Frontmatter subset

- A frontmatter is the lines between a first line `---` and the next line `---`. Either may end in LF or CRLF, and the closing line may end the file.
- Each line is blank or `<key>: <value>` starting at column 0.
- A plain value is its text without surrounding whitespace. A single- or double-quoted value is the text between its quotes. Every value is read as text, including one YAML would resolve to a number, a boolean, or null. An empty value is empty text, which each key's own rules then judge.
- `INVALID <path>: <reason>`, the reason naming the key or the construct, for:
  - no closing line;
  - an indented line (a nested map or a multi-line value), a list item, or a comment line;
  - a key given twice;
  - a value YAML would read as something other than its text: a trailing ` #` comment, a flow collection, an anchor, an alias, a tag, a block scalar, a quoted value containing an escape or followed by text, or a plain value YAML rejects.

### Certification

- `certification/<path>.json` in the pipeline folder certifies the artifact, candidate, or approval at `<path>`, relative to the pipeline folder.
- It is a JSON object holding only:
  - `inputs`: a list of pins `<path>@<identity>`, every required input at its identity in the turn commit's tree. A pin of a path that is not a required input is checked for grammar only.
  - `reviewed`, on an approval only: the full hash of its approved commit.
- `rp stamp` writes nothing when the certification would not change.

### Identity

The first 12 hexadecimal characters of the Git blob id of the whole file:

- at a commit, the blob id its tree records;
- in the working tree, the blob id Git would store for the file at its path, after its clean filters and line-ending conversion, computed without writing an object.

### Commands

- `rp stamp <file> --at <commit>`:
  - Writes the certification of `<file>` and never `<file>`. `--pin` is removed, so it is an unknown option.
  - For an approval, `--at` is the change. The approved commit is the `HEAD` where the approval lies. The command stops, writing nothing, unless `--at` resolves to the commit the reviewer's last message heading names, and unless the approved commit's code outside the pipelines folder root equals the change's.
  - It stops as today on a missing or unresolving `--at`, a file of another kind, a required input missing at `--at`, or a file it reads that is malformed.
- `rp check <pipeline folder> [--ref <commit>] [--json]`:
  - Signature and output shape are unchanged.
  - `unapproved` also covers an approval whose approved commit is absent from the clone.
  - A thread's JSON `reviewed` comes from its certification.
  - A certification that cannot be read stops it.
- `rp pipelines <root> --base <branch> [--issue <ref>] [--json]`: signature and output unchanged. Origins are read by format (design-doc-decision-7).
- `rp review`: unchanged.

### Contracts narrowed and widened

- **Narrowed**:
  - Thread header lines, `notes.md`'s first body line, a later input's `target:` body line, and a format-7 intent's `origin:` body lines are no longer read.
  - The spec, the design doc, and candidates admit no frontmatter.
  - `rp stamp` loses `--pin`. For an approval, it requires `--at` to be the commit the reviewer's last heading names, where it compared their code before.
  - The `INVALID` reasons tied to stamped frontmatter disappear.
- **Widened**:
  - `rp check` completes where an approved commit is absent.
  - Frontmatter is newly admitted on the intent, later inputs, threads, and `notes.md`. Its consumers are `rp check`, `rp pipelines` (origins), reviewers (the intent in their lane's view), and the owner reading the files. Each reads values `rp` validates.
  - Landing produces a new file, which the orchestrator commits, under a folder no role is told about.
- **Left without a purpose and removed**: computing identity below a frontmatter, rendering frontmatter into a role's file, and the README decision "A re-stamp without `--pin` keeps the candidate pins". Reading `origin:` body lines is kept for earlier-format discovery (spec-requirement-17).

## Dependencies

- Node built-ins only; no new package (spec-requirement-5).
- Git 2.38 or later, unchanged. It provides `merge-tree --write-tree` with conflicted-path listing, and blob hashing with attribute filters.

## Failure modes and observability

- **A landing interrupted before `rp stamp`, or an approval `rp stamp` refuses** (`--at` is not the commit the reviewer's last heading names, or `HEAD`'s code differs from the change): the file has no certification. `rp check` reports it stale on every required input, and its owner, or the review lane, is woken again. `rp stamp` prints `rp: <reason>` when it refuses.
- **A landing interrupted after `rp stamp`, before the commit**: the working tree is fresh while `--ref HEAD` is stale. `git status` shows the uncommitted certification, and committing it resolves the difference.
- **An approved commit absent from the clone** (squash merge, deleted branch, garbage collection): `review <lane> unapproved`, and the lane reviews again.
- **A certification that cannot be read or is malformed**: `rp check` exits 1 with `rp: <path>: <reason>` and no frontier. The run stops on a failure and reports it to the owner (`close-out.md`).
- **A frontmatter outside the subset**:
  - `INVALID <path>: <reason>` naming the key or the construct.
  - A role's file goes to its author under **Malformed files**. The orchestrator fixes the intent, later inputs, and its own thread messages.
  - An issue reference beginning with `#` written unquoted is reported as a comment.
- **A pipeline of format 6**: `rp check` stops with the earlier-format message, and triage routes its issue as new intent.

## Verification

- new test at the `rp stamp` boundary — design-doc-decision-1, design-doc-decision-3, spec-acceptance-criterion-1, spec-acceptance-criterion-2 — landing an artifact, a candidate, and an approval changes no byte of any file the turn committed, and writes only that file's certification. The landed file stays fresh when its writer rewrites it from its committed content.
- new test at the `rp check` boundary — design-doc-decision-5, spec-acceptance-criterion-3 — a thread's status and awaited role, `notes.md` being done, and a later input's targets come from frontmatter, whatever the body says. A thread or later input with body lines only is `INVALID`. A `notes.md` with `status: done` only in its body is missing.
- new test at the `rp check` boundary — design-doc-decision-5, spec-acceptance-criterion-4, spec-acceptance-criterion-5 — quoted values are read without their quotes, and plain values YAML would type are read as text. Each construct outside the subset is `INVALID`, naming its key or construct.
- new test at the `rp check` boundary, run where no package is installed — design-doc-decision-5, spec-acceptance-criterion-6 — `rp check` completes on a format-7 pipeline with Node and Git alone.
- existing tests "reads the header and the messages", "ignores ## lines inside fenced code", the "awaited role" cases, and the malformed-heading cases in `threads.test.mjs`, their threads in the new format — design-doc-decision-5, spec-acceptance-criterion-7 — message headings, awaited roles, and heading reasons are read from the body as today.
- new test at the `rp stamp` and `rp check` boundary, under each line-ending conversion spec-acceptance-criterion-8 names — design-doc-decision-2, spec-acceptance-criterion-8 — after a landing, `check` before the commit, `check` after it, and `check --ref HEAD` print the same frontier, with the landed file fresh.
- existing test "the identity of a CRLF intent is its bytes" — design-doc-decision-2 — a line-ending change Git's conversion does not make is still a content change.
- new test at the `rp check` boundary, with the existing `stale.test.mjs` cases — design-doc-decision-2, spec-acceptance-criterion-10 — an input changed only in its frontmatter, or only in its body, makes its consumer stale on it.
- new end-to-end flow at `rp check`, on a squash-merged pipeline continued in a clone holding none of its commits — design-doc-decision-2, spec-acceptance-criterion-9 — the spec and the design doc are fresh, and `notes.md` is stale on the later input that targets it.
- new test at `rp check` in the same continuation, in a clone holding the approved commit — design-doc-decision-4, spec-acceptance-criterion-15 — the lane is approved. With a later input added, it is stale on that input and not on code.
- new test at `rp check` in the same continuation, in a clone lacking the approved commit — design-doc-decision-4, spec-acceptance-criterion-16 — the command exits 0 with the lane `unapproved`, and the frontier is `review <lane>` once no earlier phase has work.
- existing test "goes stale after a conflicting merge's resolution" and the approval-freshness suite — design-doc-decision-4 — a conflict or difference outside the pipelines folder root still changes the code.
- new test at the `rp check` boundary, from the working tree and from `--ref` — design-doc-decision-6, spec-acceptance-criterion-11 — each way a certification can be unreadable or malformed stops `check` with `rp: <reason>` naming it, exit 1, and no frontier.
- existing test "an unstamped artifact is stale on every input it must pin", and a new test for an approval — design-doc-decision-6 — a landed file without certification is stale on each required input.
- new test at the `rp check` boundary — design-doc-decision-6 — a dropped lane's certification, left without its candidate, changes no state.
- new test at the `rp stamp`, Git merge, and `rp check` boundary — design-doc-decision-1, spec-acceptance-criterion-12, spec-acceptance-criterion-13 — two lanes landed from one tip merge into the pipeline branch without conflict and are both fresh, and the pipeline branch merges back into a lane without conflict.
- new test at the `rp review`, `rp stamp`, and `rp check` boundary — design-doc-decision-3, spec-acceptance-criterion-14 — an approval landed after a later input reached the pipeline branch is stale on that input. Once the earlier phase lands, the frontier is `review <lane>`.
- existing tests "reads an approval on a clone of the pipeline branch that never had the change" and "stops stamping an approval whose anchor's code differs from the change it reviewed, writing nothing", landing `--at` the change — design-doc-decision-3 — the approved commit is on the pipeline branch and carries the change's code.
- new test at the `rp stamp` boundary — design-doc-decision-3, spec-requirement-13 — stamping an approval `--at` any commit other than the one its reviewer's last heading names, or `--at` a heading commit that does not resolve, stops and writes no certification.
- existing stamp tests "pins the identities at the --at commit, not an input changed …" and "makes a response that leaves the artifact unchanged fresh" — design-doc-decision-3, spec-acceptance-criterion-17 — landing certifies at the turn commit.
- existing command-line tests in `reading.test.mjs` — design-doc-decision-3 — `stamp` rejects `--pin` as an unknown option.
- existing tests in `frontier.test.mjs` "a configuration that cannot be read stops the command" and in `pipelines.test.mjs` for formats, with format 7 current — design-doc-decision-7, spec-acceptance-criterion-18 — `check` stops on format 6, and `pipelines` lists format 6.
- new test at the `rp pipelines --issue` boundary — design-doc-decision-7, spec-acceptance-criterion-19 — pipelines of format 6 and format 7 are both listed with their format and origins, a format-7 intent's origins read from its frontmatter as text.
- inspection of `load.md`, `setup.md`, `changelog.md`, `state.md` § Run configuration, and `triage.md` — design-doc-decision-7, spec-acceptance-criterion-18, spec-acceptance-criterion-20 — a version-6 `.rp.md` migrates by its stamp alone, and triage writes format 7.
- existing suite `npm run test:rp`, on pipelines of the new format — design-doc-decision-5, design-doc-decision-6, spec-acceptance-criterion-21 — frontiers and states match today's, apart from what spec-acceptance-criterion-8, spec-acceptance-criterion-14, spec-acceptance-criterion-15, and spec-acceptance-criterion-16 change.
- inspection of the agent profiles, the templates, the skill's references, `README.md`, and `docs/` — design-doc-decision-8, spec-acceptance-criterion-22 — every format shows the values for `rp` as YAML frontmatter, no text asks a reader to leave anything of `rp`'s untouched, and every `INVALID` line goes to the file's author or to the orchestrator.

## Risks

- A dropped production lane's certification stays in the tree, unread. A lane later re-added under the same id gets `lane` from its missing candidate and overwrites it.
- A plain value YAML would read as a different number, such as `0368`, is read by `rp` as written. No other code reads these files (design-doc-decision-5), so only a person viewing them through a YAML renderer sees the difference.
- After a squash merge, garbage collection eventually removes the approved commit from the original clone too. Its lanes then review again (spec-exclusion-2).
- A merged pipeline's old branch continued directly, instead of on a `_<n>` branch, and merged with a base that holds its squash, conflicts on its certification files. `rp check` then stops on the conflict markers.
- This pipeline is format 6. Once the change lands, this branch's `rp.mjs` stops on it as an earlier format, so the run continues only while the orchestrator runs the `rp` of the skill it loaded.
