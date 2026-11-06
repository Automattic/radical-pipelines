# Spec: Keep rp's certification out of the pipeline files

## Overview

Today `rp` certifies a landed file by writing into it: landing adds an `inputs` frontmatter to the artifact or candidate a role committed, and `inputs` and `reviewed` to an approving review thread. Those files have two writers, roles are told to leave the frontmatter alone, and a role that rewrites its own file drops what `rp` recorded. The same certification is judged differently from the working tree and from a commit: under line-ending conversion, `rp check` and `rp check --ref HEAD` disagree on the same tree. A pipeline continued after a squash merge stops `rp check` at the review phase, or has its approval reported stale on code that never changed. And a review lane's approval certifies later inputs its reviewer never read.

After the change, `rp`'s certification — each landed file's required inputs at their identities, and each approval's approved code — lives where only `rp` writes it. The values roles and the orchestrator write for `rp` to read are a flat YAML frontmatter on the files they write. Freshness is judged by content, the same way from the working tree as from any commit, including in a clone that lacks the pipeline's history. The pipeline format number increases, and pipelines of earlier formats stay history.

## Requirements

spec-requirement-1: Landing a role's turn changes no byte of any file a role or the orchestrator wrote. `rp`'s certification is recorded where only `rp` writes: for each landed artifact, candidate, and approval, the identity, by content, of each of its required inputs, and for an approval its approved code.

origin: from-intent intent-goal, intent-constraint-2

observed: today landing rewrites the role's file: after `rp stamp`, `1-spec/spec.md` carries an `inputs` frontmatter (`1-spec/spec/crlf-gitattributes.txt`, from `1-spec/spec/crlf.sh attr`), and the approved review thread carries `inputs` and `reviewed` (`1-spec/spec/review-landing.txt`, from `1-spec/spec/review-landing.sh`). Each probe sources `1-spec/spec/common.sh`.

spec-requirement-2: A role or the orchestrator that rewrites a whole file it writes, from its own content, loses nothing `rp` recorded: when the rewrite leaves the content as it was, `rp check` reports the same states before and after it.

origin: from-intent intent-goal

observed: today a candidate rewritten without its frontmatter, its body unchanged, goes from `fresh` to `stale 0-intent/intent.md` (`1-spec/spec/lanes.txt`, from `1-spec/spec/lanes.sh`).

spec-requirement-3: The values a file carries for `rp` are a YAML frontmatter at the top of that file, and `rp` reads them only there; a value written only as a body line is not provided:

- a thread's `status`, `opener`, `owner`, and `artifact`, and on a thread to `owner` its `cites`;
- `notes.md`'s `status`;
- a later input's `target` and `origin`;
- the intent's origins: its issue and, when present, the branch it starts from and the pipeline it re-attempts.

origin: from-intent intent-constraint-4

observed: today these values are body lines: a thread's header lines, `notes.md`'s first line, a later input's `target:` line, and the intent's leading `origin:` lines (`skills/radical-pipelines/scripts/README.md` § Threads, § Later input, § `pipelines`; `skills/radical-pipelines/reference/entries/intent-format.md` § Origin lines). A thread carrying a frontmatter is `INVALID … carries no frontmatter` (`1-spec/spec/lanes.txt`).

spec-requirement-4: `rp` reads exactly the YAML subset that is a flat map of single-line scalar values, each value read as a YAML parser reads it, a quoted value without its quotes. Anything outside that subset makes `rp check` report `INVALID <path>` with a reason that names the key or construct: a nested map, a list, a multi-line value, a key given twice, or a frontmatter with no closing line. Where YAML reads a value differently from its text, as it reads ` #` and what follows as a comment, `rp` reads what YAML reads or reports that value `INVALID`; it never reads the text as written.

origin: from-intent intent-constraint-4

observed: today `rp` reads only JSON frontmatter (`rp.mjs` `frontmatterOf`), and an unclosed frontmatter is `INVALID` (`splitFrontmatter`: "frontmatter has no closing --- line").

spec-requirement-5: `rp` runs with Node and Git alone; reading the frontmatter needs no installed package.

origin: from-intent intent-constraint-4

observed: `rp.mjs` imports only `node:` built-in modules, and `skills/radical-pipelines/scripts/README.md` states it needs Node and Git 2.38 or later, nothing else.

spec-requirement-6: A thread's message headings, `## <role> — <commit>`, stay in its body, and `rp` reads them there as it does today: who wrote each message, which role an `open` thread awaits, and the `INVALID` reasons for a malformed heading.

origin: from-intent intent-constraint-5

observed: `rp.mjs` `parseThread` reads message headings from the body outside fenced code, as `skills/radical-pipelines/scripts/README.md` § Threads describes.

spec-requirement-7: Freshness is judged the same way from the working tree as from a commit. On a working tree git reports unmodified, `rp check` and `rp check --ref HEAD` report the same frontier and states, also in a repository whose `.gitattributes` sets `*.md text eol=crlf` or whose `core.autocrlf` is `true`. Right after a landing, before its certification is committed, `rp check` reports the landed file fresh when none of its required inputs changed since the turn commit.

origin: from-intent intent-goal, intent-context-5

observed: in both repositories, `rp check` reports `stale 0-intent/intent.md` right after the stamp and again after the stamp is committed, while `rp check --ref HEAD` reports `fresh` and `git status` shows no modification (`1-spec/spec/crlf-gitattributes.txt`, `1-spec/spec/crlf-autocrlf.txt`, from `1-spec/spec/crlf.sh attr` and `1-spec/spec/crlf.sh autocrlf`).

spec-requirement-8: Freshness is computed from the pipeline's tree alone, by the content of each input, never through a commit. A squash merge, a deleted branch, or rewritten history can leave a clone without the pipeline branch's commits; when such a clone continues the merged pipeline on a `_<n>` branch from the base branch, `rp check` reports every artifact through the target fresh when its inputs are unchanged, and stale, naming each input, when an input changed or was added since its landing.

origin: from-intent intent-constraint-1, intent-context-2

observed: after a squash merge, a branch deletion, and a fresh clone holding none of the pipeline's commits, `rp check` at target phase 3 reports the spec and the design doc `fresh` and `notes.md` `stale 0-intent/failure-1.md`; at target phase 4 it stops (`1-spec/spec/squash.txt`, from `1-spec/spec/squash.sh`).

spec-requirement-9: A landed file is stale on a required input when that input's content differs from the content certified for it, whether in its frontmatter or in its body. A difference that git's line-ending conversion alone makes between the working tree and the commit is no difference.

origin: from-intent intent-proposal-2, intent-context-4

observed: today the intent's origins and a later input's `target` and `origin` are body lines, and an input's identity covers its whole body (`rp.mjs` `identity`), so a change to any of these values makes the input's consumers stale.

spec-requirement-10: When `rp` cannot read the certification, or the certification is malformed, the command stops with `rp: <reason>` naming it, exits 1, and reports no frontier. Such a certification never produces an `INVALID` line or a state.

origin: from-intent intent-constraint-2

observed: today a malformed `inputs` entry is an `INVALID` frontier line (`rp.mjs` `parseInputs`), which the orchestrator handles by repairing the frontmatter and stamping again (`skills/radical-pipelines/reference/run/loop.md` dispatch table).

spec-requirement-11: Production lanes of a phase woken at the same pipeline tip land in parallel, and merging each landed lane branch into the pipeline branch never conflicts on the certification recorded at landing.

origin: from-intent intent-constraint-3

observed: today two spec lanes landed from the same tip merge into the pipeline branch without conflict, and `rp check` then reports both candidates `fresh` (`1-spec/spec/lanes.txt`).

spec-requirement-12: Merging the pipeline branch into a production lane's branch, before the lane's next turn, never conflicts on the certification recorded at landing.

origin: derived intent-constraint-3; the orchestrator merges the pipeline branch into an existing lane branch when it wakes the lane again (`skills/radical-pipelines/reference/run/loop.md` § Production lanes, step 1)

observed: today, after both lanes merge, merging the pipeline branch into one lane's branch completes without conflict (`1-spec/spec/lanes.txt`).

spec-requirement-13: An approval certifies the inputs its reviewer read: each required input at its identity in the review lane's turn commit, the change `rp review` built. A later input committed to the pipeline branch after that change was built leaves the landed approval stale on that input, so the lane reviews again. The approval's approved code is the code of that change.

origin: from-intent intent-context-5

observed: the change `rp review` builds holds `0-intent/intent.md` alone; a failure committed to the pipeline branch while the reviewer worked is pinned by the approval once it lands `--at HEAD`, and after the implementer answers that failure without changing code the frontier is `complete` with the review lane `approved` (`1-spec/spec/review-landing.txt`).

spec-requirement-14: An approval is stale on code only when the code outside the pipelines folder root differs from its approved code plus clean merges of the base. A conflict or a difference confined to the pipelines folder root never makes it stale on code.

origin: from-intent intent-context-5

observed: in a squash-merged pipeline continued on `p_2`, in the clone that holds the approved commit, `rp check` reports `review default stale code` although no code outside the pipelines folder root changed; merging the approved commit with the base conflicts only on the thread file (`1-spec/spec/squash.txt`).

spec-requirement-15: When an approval's approved commit is absent from the clone where `rp check` runs, the approval counts as not approved: `rp check` completes, exits 0, and reports the review lane not approved, and at target phase 4, once no earlier phase has work, its frontier is `review <lane>`.

origin: from-intent intent-proposal-3

observed: in a fresh clone of a squash-merged pipeline continued on `p_2`, `rp check` at target phase 4 stops with `rp: reviewed does not resolve to a commit`, with or without a later input (`1-spec/spec/squash.txt`).

spec-requirement-16: The pipeline format number increases. `rp check` stops on a pipeline whose `run-config.md` records format 6 with `pipeline of an earlier format; it is not continued`, as it does today for earlier formats; `rp pipelines` lists such a pipeline with its recorded format; a pipeline triage starts after the change records the new number.

origin: from-intent intent-constraint-6

observed: the current format is 6 (`rp.mjs` `FORMAT`, `requireFormat`), and this pipeline records it (`1-spec/spec/discovery-issue-368.txt`).

spec-requirement-17: `rp pipelines --issue <ref>` lists every pipeline whose intent names the issue as its origin, with its format and its origins: an intent of an earlier format by its leading `origin:` body lines, as today, and an intent of the new format by its frontmatter.

origin: derived intent-constraint-6; triage scans every pipeline of an issue with `rp pipelines --issue` and may start new work from an earlier-format pipeline's tip (`skills/radical-pipelines/reference/entries/triage.md` § 2. Scan, § 3. Route; `skills/radical-pipelines/reference/entries/report.md` step 2)

observed: `rp pipelines .pipelines --base trunk --issue 368 --json` lists this format-6 pipeline with `origins: ["issue 368"]` (`1-spec/spec/discovery-issue-368.txt`).

spec-requirement-18: A project whose committed `.rp.md` records conventions version 6 loads the skill after the change with its conventions kept, and the pipelines triage then starts in it record the new format.

origin: derived intent-constraint-6; this project's `.rp.md` records `"conventions": 6`, and a pipeline's `format` is the conventions format it was written under (`skills/radical-pipelines/scripts/README.md` § `run-config.md`; `skills/radical-pipelines/reference/conventions/load.md` § Schema stamp)

observed: `load.md` § Schema stamp sends an older stamp to `setup.md` § Migration, which walks `changelog.md`'s later entries; `changelog.md` § 6 § Pipelines records the previous format change.

spec-requirement-19: A pipeline of the new format, its values for `rp` in frontmatter, gets the same `rp check`, `rp pipelines`, and `rp review` behavior as the same pipeline gets in format 6 — frontier and action names, artifact, lane, review, and thread states, and output shape — except where spec-requirement-7, spec-requirement-13, spec-requirement-14, and spec-requirement-15 change it. These stay as today:

- the required inputs of each file;
- missing, stale, and fresh: a landed file without certification is stale on each required input, and `notes.md` is missing until its status is `done`;
- the thread rules and the frontier rules;
- landing certifies each required input at its identity in the turn commit's tree whether or not the turn changed the file, so a response that leaves its artifact unchanged becomes fresh, and an input committed after the turn commit, or never committed, is not certified.

origin: derived intent-goal; every step of a run dispatches on what `rp check` reports (`skills/radical-pipelines/reference/run/loop.md` § One step)

observed: `npm run test:rp` passes 346 of 346 tests on the current format (`1-spec/spec/test-rp.txt`); the rules are stated in `skills/radical-pipelines/reference/run/state.md` and `skills/radical-pipelines/scripts/README.md` § `inputs`, § Threads, § Frontier, § `stamp`.

spec-requirement-20: The skill's guidance follows the change. Each format the agent profiles, the assignment templates, and the skill's references give a role or the orchestrator for a file `rp` reads shows that file's values for `rp` as its YAML frontmatter. No instruction asks a role or the orchestrator to leave anything of `rp`'s untouched. Every `INVALID` line is dispatched to the file's author, or handled by the orchestrator for a file it wrote, as `INVALID` lines on anything but frontmatter are today.

origin: from-intent intent-goal

observed: the producer and implementer profiles say "Frontmatter on every file is the orchestrator's; leave it untouched" (`agents/spec-producer.md:106`, `agents/design-doc-producer.md:120`, `agents/implementer.md:128`); `skills/radical-pipelines/templates/reviewer-first.md` gives the thread header as body lines; `loop.md`'s dispatch table sends a malformed frontmatter to the orchestrator: "repair it and re-stamp".

## Acceptance criteria

spec-acceptance-criterion-1: Given a role's committed turn that wrote an artifact, a candidate, or an approval, when the orchestrator lands it, then every file the turn wrote is, at the landed tip, byte for byte as the turn committed it.

spec-acceptance-criterion-2: Given a landed artifact or candidate that is fresh, when its writer rewrites the whole file with the content it committed, then `rp check` reports it fresh.

spec-acceptance-criterion-3: Given a thread, a `notes.md`, a later input, and an intent whose values for `rp` are in their frontmatter, when `rp check` and `rp pipelines --issue` run, then the thread's status and awaited role, whether `notes.md` is missing, each later input's targets, and the intent's issue origin come from the frontmatter, whatever the body says. Given a thread or a later input whose values are body lines only, `rp check` reports it `INVALID <path>: <reason>`; given a `notes.md` with `status: done` as a body line only, `rp check` reports it missing.

spec-acceptance-criterion-4: Given a file `rp` reads whose frontmatter holds a nested map, a list, a multi-line value, or a key given twice, or has no closing line, when `rp check` runs, then its frontier is `INVALID <path>: <reason>`, and the reason names the key or the construct.

spec-acceptance-criterion-5: Given a frontmatter value written in single or double quotes, when `rp check` runs, then it reads the value without its quotes. Given a value followed by ` #` and text, when `rp check` runs, then it reads the value a YAML parser reads or reports `INVALID` naming that value.

spec-acceptance-criterion-6: Given a checkout of the skill with no package installed, when `rp check` runs on a pipeline of the new format, then it completes using Node and Git only.

spec-acceptance-criterion-7: Given a thread of the new format, when `rp check` runs, then each `## <role> — <commit>` heading in its body is a message, an `open` thread awaits its opener when its owner wrote the last message and its owner otherwise, and a malformed heading is `INVALID` with today's reason.

spec-acceptance-criterion-8: Given a repository whose `.gitattributes` sets `*.md text eol=crlf`, or whose `core.autocrlf` is `true`, with a pipeline checked out, when a turn is landed, then `rp check` before the landing is committed, `rp check` after it is committed, and `rp check --ref HEAD` after it is committed each report the landed file fresh and print the same frontier.

spec-acceptance-criterion-9: Given a pipeline squash-merged into the base branch, its branch deleted, in a clone holding none of its commits, continued on a `_<n>` branch from the base branch with a later input targeting `3-implementation/notes.md`, when `rp check` runs, then it reports the spec and the design doc fresh and `notes.md` stale, naming that later input.

spec-acceptance-criterion-10: Given a landed artifact, when one of its required inputs changes only in a frontmatter value, or only in its body, and is committed, then `rp check` reports the artifact stale, naming that input.

spec-acceptance-criterion-11: Given a certification that `rp` cannot read, or one that is malformed, when `rp check` runs, then it exits 1, prints `rp: <reason>` naming that certification to stderr, and prints no frontier.

spec-acceptance-criterion-12: Given two production lanes of one phase woken at the same pipeline tip and each landed, when each lane branch is merged into the pipeline branch, then each merge completes without conflict, and `rp check` reports each candidate fresh.

spec-acceptance-criterion-13: Given a pipeline branch that holds the landed candidates of two production lanes, when it is merged into one of the lane branches, then the merge completes without conflict.

spec-acceptance-criterion-14: Given a review lane woken on the change `rp review` built, and a later input committed to the pipeline branch before the lane's approval lands, when the approval lands, then `rp check` reports the review lane stale, naming that later input, and once no earlier phase has work the frontier is `review <lane>`.

spec-acceptance-criterion-15: Given a pipeline squash-merged and continued on a `_<n>` branch, in a clone that holds the approved commit, with no change outside the pipelines folder root, when `rp check` runs at target phase 4, then it reports the review lane approved; with a later input added since, it reports the lane stale on that input and not on code.

spec-acceptance-criterion-16: Given the same continuation in a clone that lacks the approved commit, when `rp check` runs at target phase 4, then it exits 0 and reports the review lane not approved, and when no earlier phase has work its frontier is `review <lane>`.

spec-acceptance-criterion-17: Given a later input committed to the pipeline branch after a role's turn commit, when that turn is landed, then `rp check` reports the landed file stale on that input. Given a response turn that leaves its artifact unchanged, when it is landed, then `rp check` reports the artifact fresh.

spec-acceptance-criterion-18: Given a pipeline whose `run-config.md` records `"format": 6`, when `rp check` runs on it, then it exits 1 with `pipeline of an earlier format; it is not continued`, and `rp pipelines` lists it with format 6. Given a pipeline triage starts after the change, when `rp check` runs on it, then its `run-config.md` records the new format number and `rp check` reads it.

spec-acceptance-criterion-19: Given pipelines of format 6 and of the new format whose intents name issue `<ref>`, when `rp pipelines --issue <ref>` runs, then it lists each of them with its format and its origins.

spec-acceptance-criterion-20: Given a project whose committed `.rp.md` records conventions version 6, when the skill loads its conventions, then they load with their content kept and the stamp at the current version, and a pipeline triage then starts records the new format.

spec-acceptance-criterion-21: Given a pipeline written in format 6, and the same pipeline written in the new format with its values for `rp` in frontmatter and its certification recorded by landing, when today's `rp check` runs on the first and the changed `rp check` on the second, then their frontiers and their artifact, lane, review, and thread states match, apart from what spec-acceptance-criterion-8, spec-acceptance-criterion-14, spec-acceptance-criterion-15, and spec-acceptance-criterion-16 describe.

spec-acceptance-criterion-22: Given the agent profiles, the assignment templates, and the skill's references, when a role or the orchestrator reads the format of a file `rp` reads, then it shows the file's values for `rp` as YAML frontmatter; no instruction asks the reader to leave anything of `rp`'s untouched; and every `INVALID` line is dispatched to the file's author, or to the orchestrator for a file it wrote.

## Exclusions

spec-exclusion-1: A pipeline of format 6 or earlier is neither migrated to the new format nor continued; work on its issue starts a new pipeline, as it does today.

spec-exclusion-2: A clone that lacks an approval's approved commit does not report that approval approved, even when a clone that holds the commit does.

spec-exclusion-3: `run-config.md` keeps its form, its values, and its validation; only its format number changes.

## Considered and not required

- Reading intent-goal's "no pipeline file has two writers" as one writer per thread, not taken — both parties write a thread and the orchestrator appends the owner's answer (`skills/radical-pipelines/reference/run/state.md` § Threads, `loop.md` § Owner escalation), and the Goal's next sentence sets `rp`'s certification apart from what roles and the orchestrator write.
- Reading intent-goal as also moving `run-config.md` to a flat YAML map, not taken — intent-constraint-4 lists the values that move and leaves the run configuration out, and its `lanes` value is a list of objects with briefs, which no flat map of single-line scalars holds: observed: `.pipelines/368-certification-out-of-files/run-config.md`.
- Reading intent-constraint-2's "a certification that cannot be read" to include an approval whose approved commit is absent from the clone, not taken — intent-proposal-3 takes the other reading, and a squash merge or a deleted branch makes that absence routine: observed: `1-spec/spec/squash.txt`.
- Listing for `rp pipelines --issue` only intents that hold their origin in frontmatter, not taken — triage and report scan every pipeline of an issue and may start new work from an earlier-format pipeline's tip (`triage.md` § 2, § 3; `report.md` step 2): observed: `1-spec/spec/discovery-issue-368.txt` lists this format-6 pipeline for issue 368.
- A frontmatter key a file does not carry for `rp`, or a frontmatter on a spec, a design doc, or a candidate — no profile, template, or reference has a role or the orchestrator write one: observed: the formats in `agents/*.md` and `skills/radical-pipelines/templates/*`.
- An input whose committed line endings change and nothing else — no step of the skill rewrites a pipeline file's line endings alone: observed: `loop.md`, `triage.md`, `agents/*.md`.
- A lane dropped and later re-added under the same id, meeting its predecessor's certification — no source shows a step that re-adds a dropped lane: observed: `state.md` § Run configuration: the commit that drops a lane removes its candidate folder.
- A certification edited by hand into a well-formed but false record — only `rp` writes the certification (intent-constraint-2), and today's only hand repair of what `rp` writes is followed by a re-stamp that rewrites it: observed: `loop.md` dispatch table.
- A consolidated root's record of the candidates it merged — no step reads it: observed: `rp check` checks those pins for grammar only (`skills/radical-pipelines/scripts/README.md` § `inputs`; `rp.mjs` `staleInputs`), and `state.md` § Terms describes them only as a record.
