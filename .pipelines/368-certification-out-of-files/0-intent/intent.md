origin: issue 368

# Keep rp's certification out of the pipeline files

## Goal

No pipeline file has two writers. What `rp` certifies about a pipeline — each landed file's required inputs at their identities, and each approval's approved code — lives where only `rp` writes it, and the values that roles and the orchestrator write for `rp` to read are a flat YAML frontmatter on the files they write. A role never has to leave anything of `rp`'s untouched, and freshness is judged the same way from the working tree and from a commit.

## Constraints

intent-constraint-1: Freshness stays computed from the tree alone: the certification records the identities of the inputs, by content. A recorded commit never replaces them. A squash merge, a deleted branch, or rewritten history removes commits from the clone where `rp check` runs, and a continuation of a merged pipeline — a `_<n>` branch from the base branch — must still compute every artifact's freshness.

intent-constraint-2: Only `rp` writes the certification. A certification that cannot be read, or is malformed, stops the command; it is never a fact about the pipeline.

intent-constraint-3: Production lanes land in parallel and merge into the pipeline branch: recording their certification never makes those merges conflict.

intent-constraint-4: The values a file carries for `rp` — a thread's status, opener, owner, artifact, and cites; `notes.md`'s status; a later input's target and origin; the intent's origins — are YAML frontmatter that is a flat map of single-line scalar values. `rp` stays dependency-free and reads exactly that subset; anything outside it is `INVALID` with a reason that names it.

intent-constraint-5: A thread's message headings stay in its body.

intent-constraint-6: The pipeline format number increases. A pipeline of an earlier format is history and is never continued, as today.

## Context

intent-context-1: Today `rp stamp` writes JSON frontmatter — `inputs`, and `reviewed` on an approval — into files that roles write, and a file's identity is the hash of its body below that frontmatter, so that a stamp never changes it. Roles are told to leave frontmatter untouched. When a file is malformed, `rp check` reports `INVALID` and its author is woken again only to repair it.

intent-context-2: Certifying by content rather than by commit is a settled decision of the project: the tree at any commit describes the pipeline's state, and history may speed a computation up but is never required. Reproduced on the current format: a pipeline is merged by squash, its branch is deleted, and a fresh clone continues it on a `_2` branch from the base branch with a reported failure targeting `notes.md`. With content pins, `rp check` reports the spec and the design doc fresh and `notes.md` stale on the failure, although every commit a pin was computed at is missing from that clone.

intent-context-3: An approval records the commit whose code it approved, `reviewed`, because the code moves by clean merges of the base and only a commit lets `rp` recompute "the approved code plus clean merges of the base". Its `inputs` are computed at that same commit.

intent-context-4: With the certification out of the files, a file's identity no longer needs to leave out a frontmatter that `rp` writes.

intent-context-5: Failures observed on the current format:
  - In a repository whose `.gitattributes` sets `*.md text eol=crlf`, or with `core.autocrlf=true`, a spec stamped `--at` the commit holding its intent reports `stale 0-intent/intent.md` from `rp check` right after the stamp, and `fresh` from `rp check --ref HEAD` once the stamp is committed: `stamp` hashes the committed blob, and `check` the working-tree bytes.
  - After a pipeline is merged by squash and continued on a `_<n>` branch, `rp check` at target phase 4 stops with `reviewed does not resolve to a commit` in a clone that lacks the approved commit. In a clone that holds it, `git merge-tree <reviewed> <base>` conflicts on the thread file itself, whose frontmatter changed, and the approval is reported stale with `code` although no code outside the pipelines folder changed.
  - Inferred, not reproduced: a review lane's approval is stamped `--at HEAD` after its commits are cherry-picked onto the pipeline branch, so a later input that landed on the pipeline branch while the reviewer worked is pinned by an approval whose reviewer never read it.

## Proposals

intent-proposal-1: Record, per landed file, the identity of each required input, in a JSON file at the pipeline folder root, or one file per landed file so parallel lanes never touch the same file.

intent-proposal-2: A file's identity becomes the git blob hash of the whole file.

intent-proposal-3: An approval whose approved commit is missing from the clone counts as not approved, so its lane reviews again, instead of stopping the command.
