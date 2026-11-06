---
{
  "inputs": [
    "0-intent/intent.md@278f3b3641b5"
  ]
}
---
# Spec: Keep rp's certification out of the pipeline files

## Overview

Today `rp stamp` rewrites the frontmatter of files that roles write: `inputs` on a spec, design doc, notes file, and lane candidate, and `inputs` plus `reviewed` on an approval. Those files have two writers. The same design makes `rp check` disagree with itself: in a repository that converts line endings, a freshly certified spec is stale from the working tree and fresh from the commit. A pipeline continued after a squash merge cannot be checked at the review phase, or has its approval reported stale for code that did not change.

The change moves everything `rp` certifies into files only `rp` writes. No file has two writers, a role never has to leave any part of a file it writes untouched, and freshness is the same from the working tree and from a commit. The values roles and the orchestrator write for `rp` to read become a flat YAML frontmatter on the files they write. The pipeline format number increases.

A file is **landed** when the orchestrator has certified it at its turn commit: an artifact (spec, design doc, notes), a lane candidate, or an approval (an approved review thread). A file's **required inputs** are those `skills/radical-pipelines/scripts/README.md` § `inputs` defines.

## Requirements

spec-requirement-1: Certifying a landed file changes no byte of any file a role or the orchestrator writes. What `rp` certifies is held only in files that `rp` alone writes, and no role or the orchestrator writes or edits them.

origin: from-intent Goal

observed: `rp stamp` writes JSON `inputs` (and `reviewed`) into the spec, design doc, notes, candidate, and approval thread themselves (`late.out`, "approval's pins"; scripts/README.md § `stamp`).

spec-requirement-2: For each landed artifact and lane candidate, the certification records the identity, by content, of each required input as of its turn commit; for each approval it also records the approved code. A turn that leaves its file unchanged is still certified, so a file revised to answer a changed input becomes fresh. A landed file with no certification is stale on each of its required inputs.

origin: from-intent Goal

observed: `stamp` pins at `--at` "whether or not the turn changed the file", and an unpinned required input makes a file stale (`turn.out`: the unchanged spec is fresh after the re-stamp; scripts/README.md § `inputs`).

spec-requirement-3: `rp check` on the working tree and `rp check --ref <commit>` on the commit holding the same files report the same freshness for every file and the same approval for every review lane, also in a repository whose line-ending conversion makes the working-tree bytes of a file differ from its committed bytes.

origin: from-intent Goal

observed: with `.gitattributes` `*.md text eol=crlf` (`crlf.out`) and with `core.autocrlf=true` (`autocrlf.out`), a spec stamped at the commit holding its intent is `stale 0-intent/intent.md` from the working tree and `fresh` from `--ref HEAD`: `stamp` hashes the committed blob, `check` the working-tree bytes.

spec-requirement-4: `rp check` computes every artifact's freshness from the tree it is given alone. After a pipeline is merged by squash, its branch is deleted, and a `_<n>` branch continues it from the base branch in a clone that holds none of the commits the pipeline was certified at, `rp check` reports each artifact fresh or stale as it did before the merge, plus the effect of any later input added since.

origin: from-intent intent-constraint-1

observed: on the current format, target phase 3 in such a clone reports the spec and design doc `fresh` and `notes.md` `stale 0-intent/failure-1.md` (`squash.out`, "target-phase 3" block).

spec-requirement-5: A certification that `rp` cannot read, or that is malformed, stops the command: `rp check` prints `rp: <reason>` naming the certification to stderr, exits 1, and reports no frontier. It is never reported as `INVALID` for a file a role wrote, and never as a stale or unapproved file.

origin: from-intent intent-constraint-2

observed: what `rp` cannot read already stops the command with `rp: <reason>` and exit 1 (`squash.out`: `rp: reviewed does not resolve to a commit`).

spec-requirement-6: When production lanes land in parallel from one pipeline commit, each with its certification recorded, merging their branches into the pipeline branch never conflicts on the certification.

origin: from-intent intent-constraint-3

observed: today each lane's stamp touches only its own candidate file, so two lanes merge cleanly and both candidates are then `fresh` (`lanes.out`).

spec-requirement-7: `rp` reads these values from a file's YAML frontmatter and from nowhere else: a thread's `status`, `opener`, `owner`, `artifact`, and, on a thread to `owner`, `cites`; `notes.md`'s `status`; a later input's `target` and `origin`; the intent's origins (issue, starts-from, re-attempts). A file that holds one of them only in its body does not provide it: a thread without them, or a later input without `target`, is `INVALID`, and a `notes.md` with `status: done` only in its body is not done.

origin: from-intent intent-constraint-4

observed: today these are body lines (scripts/README.md § Threads, § Later input, § `inputs`; `rp.mjs` `parseThread`, `parseTargets`, `originsOf`).

spec-requirement-8: A frontmatter that is not a flat map of single-line scalar values — one with a nested value, a list, a value spanning lines, or a repeated key — makes its file `INVALID`, and the reason names the offending key or line. `rp` still runs with Node and Git alone.

origin: from-intent intent-constraint-4

observed: `rp.mjs` imports only `node:` built-ins. The origin values in use (`issue <n>`, `starts-from <branch>`, a URL, a thread path) and a `target` of comma-separated artifact paths with `#<id>` are single-line scalars (`intent-format.md` § Origin lines, § Later input).

spec-requirement-9: A thread's message headings (`## <role> — <commit>`) stay in its body, and `rp` reads from them who a thread awaits.

origin: from-intent intent-constraint-5

observed: scripts/README.md § Threads: every line starting `## ` outside fenced code is a message heading.

spec-requirement-10: The pipeline format number is one more than today's. A pipeline of an earlier format is listed by `rp pipelines` with its format and is never continued: `rp check` stops on it with `pipeline of an earlier format; it is not continued`.

origin: from-intent intent-constraint-6

observed: scripts/README.md § `run-config.md`; `rp.mjs` `requireFormat`.

spec-requirement-11: A project whose `.rp.md` records the previous conventions version is migrated to the new one when the skill loads it.

origin: derived intent-constraint-6 every project with a committed `.rp.md` at conventions 6 loads the skill after the change

observed: the run-config `format` is "the conventions format it was written under" and `.rp.md`'s `conventions` carries the same number; an older stamp triggers migration (scripts/README.md § `run-config.md`; `load.md` § Schema stamp; `changelog.md` § 6 § Pipelines).

spec-requirement-12: When a review lane's latest review thread is an approval whose approved commit is not in the clone, `rp check` does not stop: it exits 0 and reports the lane not approved, so `review <lane>` is on the frontier once no earlier phase has work.

origin: from-intent intent-proposal-3

observed: `rp check` at target phase 4 in a clone that lacks the approved commit stops with `rp: reviewed does not resolve to a commit` and prints no frontier, although the same clone computes every artifact at target phase 3 (`squash.out`, first and "target-phase 3" blocks).

spec-requirement-13: An approval is stale for code only when the tip's code outside the pipelines folder differs from the approved code plus clean merges of the base. A difference or a conflict inside the pipelines folder never makes an approval stale for code.

origin: derived intent-context-5 an approval whose commit the clone holds, after a squash merge and a `_<n>` continuation (`squash.out`, last block)

observed: in that clone the lane is `stale 0-intent/failure-1.md code`: merging the approved commit with the base conflicts on the approval's own thread file, although no code outside the pipelines folder changed.

spec-requirement-14: A landed file is certified for the inputs as they were at its turn, never for an input that landed after the turn began. An approval is stale on a later input that landed on the pipeline branch after the change its reviewer was given was built, even when the approval lands after it.

origin: derived intent-context-5 a later input recorded on the pipeline branch while a review lane works (`triage.md`: a later input "joins" the live pipeline whenever the owner gives it)

observed: for a producer's turn this holds today: a constraint committed after the turn commit leaves the spec `stale 0-intent/constraint-1.md` (`turn.out`). For a review lane it does not: the approval is stamped at the pipeline tip after the cherry-pick, pins a constraint absent from the reviewer's `0-intent/`, and `rp check` reports `review default approved` (`late.out`).

spec-requirement-15: A change to any part of an input file, its frontmatter included, makes the files that consumed it stale. In particular a changed `target` value on a later input, or a changed value in the intent's frontmatter, makes the files that pinned it stale on it.

origin: derived intent-proposal-2 the owner re-targets a later input to another clause of the same artifact (`intent-format.md` § Later input: `target:` may name a clause by `#<id>`)

observed: today `target:` and `origin:` are body bytes of the later input and the intent, so an edit to them changes the file's identity and stales its consumers.

spec-requirement-16: The shipped role profiles, assignment templates, and reference documents show each value of requirement 7 in the frontmatter form its author writes, and tell no role to leave any part of a file untouched on `rp`'s behalf.

origin: from-intent Goal

observed: each producer and the implementer is told "Frontmatter on every file is the orchestrator's; leave it untouched" (`agents/spec-producer.md`, `design-doc-producer.md`, `implementer.md`), and `templates/reviewer-first.md` shows the thread header as body lines.

## Acceptance criteria

spec-acceptance-criterion-1: Given a spec, a design doc, a notes file marked done, a lane candidate, and an approved review thread, each as its author committed it, when the orchestrator certifies each at its turn commit, then `git diff` of those files against what the authors committed is empty, `rp check` reports the artifacts and the candidate `fresh`, and the lane `approved`.

spec-acceptance-criterion-2: Given a fresh spec and a constraint that targets it committed afterward, when the spec's producer answers without changing the spec and its turn is certified, then `rp check` reports the spec `fresh`. Given a spec committed and never certified, `rp check` reports it `stale 0-intent/intent.md`.

spec-acceptance-criterion-3: Given a repository whose line-ending conversion gives the working tree bytes that differ from the commits' (`*.md text eol=crlf`, or `core.autocrlf=true`), and a spec certified at the commit holding its intent, when `rp check` runs on the working tree and `rp check --ref HEAD` runs once the certification is committed, then both report the spec `fresh`.

spec-acceptance-criterion-4: Given a pipeline merged by squash, its branch deleted, and a clone holding only the base branch plus a `_2` branch with a new failure targeting `3-implementation/notes.md`, when `rp check` runs at target phase 3, then it reports the spec and design doc `fresh` and `notes.md` `stale 0-intent/failure-1.md`.

spec-acceptance-criterion-5: Given a certified pipeline whose certification files are edited so that they no longer parse, when `rp check` runs, then stderr holds `rp: <reason>` naming the certification, the exit status is 1, and stdout holds no frontier line.

spec-acceptance-criterion-6: Given two production lanes landed in parallel from one pipeline commit, when their branches are merged into the pipeline branch, then neither merge conflicts and `rp check` reports both candidates `fresh`.

spec-acceptance-criterion-7: Given a thread whose frontmatter holds `status`, `opener`, `owner`, and `artifact` and whose body holds `## <role> — <commit>` headings, when `rp check` runs, then it lists the thread with its status and the role it awaits. Given the same thread with those values as body lines and no frontmatter, then `rp check` prints `INVALID threads/<file>: <reason>`.

spec-acceptance-criterion-8: Given a `notes.md` whose frontmatter holds `status: done`, when `rp check` runs at target phase 3, then it is not reported `missing`. Given a `notes.md` with `status: done` only as the first body line, then it is `missing`.

spec-acceptance-criterion-9: Given a later input whose frontmatter holds `target: 3-implementation/notes.md`, when `rp check` runs, then `notes.md` is stale on it and the spec is not. Given a later input with its `target:` only in the body, then `rp check` prints `INVALID 0-intent/<file>: <reason>`.

spec-acceptance-criterion-10: Given an intent whose frontmatter holds the issue origin `issue 7`, when `rp pipelines <root> --base <branch> --issue 7` runs, then the pipeline is listed with its format. Given an intent that holds the origin only as a body line, then the pipeline is not listed for issue 7.

spec-acceptance-criterion-11: Given a thread whose frontmatter has a nested value, a list, a value on several lines, or a repeated key, when `rp check` runs, then it prints `INVALID threads/<file>: <reason>` and the reason names the key or line.

spec-acceptance-criterion-12: Given a pipeline whose `run-config.md` has `format` 6, when `rp check` runs on it, then stderr holds `rp: <path>: pipeline of an earlier format; it is not continued` and the exit status is 1; when `rp pipelines` lists it, its format is 6, and a pipeline written under the new format lists the new number.

spec-acceptance-criterion-13: Given a project whose `.rp.md` records conventions 6, when the skill loads its conventions, then it follows the migration to the new version.

spec-acceptance-criterion-14: Given a `_2` continuation at target phase 4 in a clone that lacks the commit an approval was certified at, when `rp check` runs, then it exits 0, reports the lane not approved, and, with no earlier work on the frontier, names `review default`.

spec-acceptance-criterion-15: Given the same continuation in a clone that holds the approved commit, when `rp check` runs at target phase 4, then the lane is reported stale on the new failure and not on `code`.

spec-acceptance-criterion-16: Given a review lane's change built at the pipeline tip, a constraint committed on the pipeline branch afterward, and the reviewer's approval then landed on the pipeline branch, when `rp check` runs, then the lane is reported stale on that constraint and not approved. Given a producer's turn commit older than a later input, when its turn is certified, then its artifact is `stale` on that input.

spec-acceptance-criterion-17: Given a fresh spec and a later input targeting `1-spec/spec.md#spec-requirement-1`, when the input's `target` is changed to name another clause and committed, then `rp check` reports the spec `stale` on that input. Given a fresh spec, when a value in the intent's frontmatter is edited and committed, then it is `stale 0-intent/intent.md`.

spec-acceptance-criterion-18: Given the shipped profiles, templates, and references, when read, then none tells a role to leave frontmatter untouched, and each that mentions the thread header, `notes.md` status, later-input `target` and `origin`, or intent origins shows them as frontmatter.

## Exclusions

spec-exclusion-1: A pipeline of an earlier format is not converted, migrated, or continued.

spec-exclusion-2: `run-config.md` keeps its lane list and its present values; only its `format` number changes.

spec-exclusion-3: The intent, the later inputs, `run-config.md`, and every thread other than an approval carry no certification.

spec-exclusion-4: A person's hand edit of the certification that leaves it well-formed but false is neither prevented nor detected.

spec-exclusion-5: The frontier rules, the action names, and the shape of `rp check`, `rp pipelines`, and `rp review` output are unchanged, apart from what the requirements above change.

## Considered and not required

- The record of the candidates a consolidated root merged (`--pin <candidate>` at consolidation) — the intent names the certification as required inputs and approved code, and nothing reads the record: observed: `rp check` checks those pins for grammar only (scripts/README.md § `inputs`; `rp.mjs` `staleInputs`).
- A lane dropped and later re-added under the same id, finding a certification left by its predecessor — no source shows a flow that re-adds a dropped lane: observed: `state.md` § Run configuration says dropping removes the candidate folder, ids are unique per profile, and nothing describes re-adding.
- A spec, design doc, or candidate that carries frontmatter — `rp` reads no value from such a file, and no profile or template tells a role to write one: observed: `agents/*.md`, `templates/*`.
- `run-config.md` read as flat YAML, as the Goal's "the values that roles and the orchestrator write for `rp` to read" could also mean — `intent-constraint-4` lists the values by file and omits it, and its `lanes` list of objects with briefs cannot be a flat map of single-line scalars: observed: `.pipelines/368-certification-out-of-files/run-config.md`.
- "A certification that cannot be read" (`intent-constraint-2`) read to include a well-formed approval naming a commit absent from the clone — a squash merge or a deleted branch makes that routine, and stopping makes a merged pipeline's continuation unrunnable at the review phase (`squash.out`); `intent-proposal-3` takes the other reading.
- A line-ending-only change to an input file — no source shows an intended use that rewrites the line endings of a pipeline file by itself.
- Several review lanes whose approved commits are all absent from the clone — requirement 12 applies to each lane; no separate outcome.
