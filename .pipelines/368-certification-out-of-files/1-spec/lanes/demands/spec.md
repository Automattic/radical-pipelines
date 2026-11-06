# Spec: Keep rp's certification out of the pipeline files

## Overview

Today `rp` certifies a landed file by writing into it: landing adds an `inputs` frontmatter to the artifact a role committed, and `inputs` and `reviewed` to an approving review thread. Those files therefore have two writers, roles are told to leave the frontmatter alone, and a role that rewrites its own file drops what `rp` recorded. The same certification is also read in two different ways. Under line-ending conversion, `rp check` in the working tree and `rp check --ref HEAD` disagree on the same tree. A pipeline continued after a squash merge stops `rp check` at the review phase, or is reported stale on code that never changed. And a review lane's approval certifies later inputs its reviewer never read.

After the change, `rp`'s certification — each landed file's required inputs at their identities, and each approval's approved code — lives in the pipeline's tree where only `rp` writes it. The values roles and the orchestrator write for `rp` to read move to a flat YAML frontmatter on their own files. Freshness is judged by content, the same way from the working tree as from any commit, including in a clone that lacks the pipeline's history. The pipeline format number increases, and pipelines of earlier formats stay history.

## Requirements

spec-requirement-1: Landing a role's turn changes no file that a role or the orchestrator wrote. `rp`'s certification of the turn is recorded where no role or orchestrator writes: for each landed artifact, candidate, or approval, the identity of each required input, and for an approval its approved code.

origin: from-intent intent-goal, intent-constraint-2

observed: today, landing rewrites the role's file. After `rp stamp`, `1-spec/spec.md` carries an `inputs` frontmatter (`1-spec/lanes/demands/spec/crlf-gitattributes.txt`), and the approved review thread carries `inputs` and `reviewed` (`1-spec/lanes/demands/spec/review-lane-landing.txt`).

spec-requirement-2: A role or the orchestrator can rewrite a whole file it writes from its own content without losing anything `rp` recorded: when the rewrite leaves the content unchanged, `rp check` reports the same states before and after it.

origin: from-intent intent-goal

observed: today, a candidate rewritten without its frontmatter, with its body unchanged, goes from `fresh` to `stale 0-intent/intent.md` (`1-spec/lanes/demands/spec/lanes-and-frontmatter-today.txt`).

spec-requirement-3: The values a file carries for `rp` are a YAML frontmatter at the top of that file, and `rp` reads them only there:

- a thread's `status`, `opener`, `owner`, and `artifact`, and on a thread to `owner` its `cites`;
- `notes.md`'s `status`;
- a later input's `target` and `origin`;
- the intent's origins: its issue and, when present, the branch it starts from and the pipeline it re-attempts.

origin: from-intent intent-constraint-4

observed: today these values are lines in the file's body. The thread header lines, `notes.md`'s first line, a later input's `target:` line, and the intent's leading `origin:` lines are all read from the body (`skills/radical-pipelines/scripts/README.md` § Threads, § Later input, § `pipelines`; `rp.mjs` `parseThread`, `implementationDone`, `parseTargets`, `originsOf`). A thread that carries a frontmatter is `INVALID … carries no frontmatter` (`1-spec/lanes/demands/spec/lanes-and-frontmatter-today.txt`). The intent's three kinds of origin are listed in `skills/radical-pipelines/reference/entries/intent-format.md` § Origin lines.

spec-requirement-4: `rp` reads exactly the subset of YAML that is a flat map of single-line scalar values. `rp check` reports `INVALID <path>` with a reason that names the key or construct for any of these:

- a frontmatter that holds a nested map, a list, or a multi-line value;
- a frontmatter that gives a key twice;
- a frontmatter that is never closed;
- a key the file does not carry for `rp`;
- any frontmatter on a spec, a design doc, or a candidate.

Each value `rp` reads is the value a YAML parser reads for it, so a quoted value is read without its quotes. When YAML would read a value differently from its text, `rp` either reads what YAML reads or reports the value `INVALID` and names it; it never reads a third value. One such value is an `origin` whose issue reference a project's **Issues** convention writes as `#<number>`, which YAML reads as a comment from ` #` on.

origin: from-intent intent-constraint-4

observed: today, an unknown frontmatter key is `INVALID` naming the key, and so is frontmatter on a file that carries none (`rp.mjs` `onlyKeys`, `readState`; `skills/radical-pipelines/scripts/README.md` § Decisions, "Strict keys").

spec-requirement-5: `rp` runs with Node and Git alone. Reading the frontmatter needs no installed package.

origin: from-intent intent-constraint-4

observed: `rp.mjs` imports only `node:` built-in modules (lines 5–11), and `skills/radical-pipelines/scripts/README.md` states that it needs Node and Git 2.38 or later, nothing else.

spec-requirement-6: A thread's message headings, `## <role> — <commit>`, stay in its body below the frontmatter. `rp` reads them there as it does today: who wrote each message, which role an `open` thread awaits, and the `INVALID` reasons for a malformed heading.

origin: from-intent intent-constraint-5

observed: `rp.mjs` `parseThread` reads message headings from the body outside fenced code (lines 447–459), as `skills/radical-pipelines/scripts/README.md` § Threads describes.

spec-requirement-7: Freshness is judged the same way from the working tree as from a commit.

- On a working tree that git reports unmodified, `rp check` and `rp check --ref HEAD` report the same frontier and the same states.
- That holds in a repository whose `.gitattributes` sets `*.md text eol=crlf`, and in one whose `core.autocrlf` is `true`.
- Right after a landing, before its certification is committed, `rp check` reports the landed file fresh when none of its required inputs changed since the turn commit.

origin: from-intent intent-goal, intent-context-5

observed: in both repositories, `rp check` reports `stale 0-intent/intent.md` right after the stamp and still after the stamp is committed, while `rp check --ref HEAD` reports `fresh` and `git status` shows no modification (`1-spec/lanes/demands/spec/crlf-gitattributes.txt`, `1-spec/lanes/demands/spec/crlf-autocrlf.txt`).

spec-requirement-8: Freshness is computed from the pipeline's tree alone. `rp check` judges each landed file's inputs by the content identities its certification records, never through a commit the certification names. A squash merge, a deleted branch, or rewritten history can leave a clone without the pipeline branch's commits. When such a clone continues the merged pipeline on a `_<n>` branch from the base branch, `rp check` reports every artifact through the target: fresh when its inputs are unchanged, and stale, naming each input, when an input changed or was added since its landing.

origin: from-intent intent-constraint-1, intent-context-2

observed: after a squash merge, a branch deletion, and a fresh clone, none of the pipeline's commits are in the clone. There, `rp check` at target phase 3 reports the spec and the design doc `fresh` and `notes.md` `stale 0-intent/failure-1.md`. At target phase 4 it stops (`1-spec/lanes/demands/spec/squash-continuation.txt`).

spec-requirement-9: A landed file is stale on a required input when any of that input's content differs from the content certified for it, whether in its frontmatter values or in its body. A difference that git's line-ending conversion alone introduces between the working tree and the commit is not a change.

origin: from-intent intent-constraint-1, intent-proposal-2

observed: today the intent's origins and a later input's `target` and `origin` are body lines (`skills/radical-pipelines/reference/entries/intent-format.md` § Origin lines, § Later input), and an input's identity covers its whole body (`rp.mjs` `identity`, lines 231–234), so a change to any of these values makes the input's consumers stale.

spec-requirement-10: Only `rp` writes the certification. When `rp` cannot read the certification, or the certification is malformed, the command stops with an error that names it and reports no frontier. Such a certification never produces an `INVALID` line or a state.

origin: from-intent intent-constraint-2

observed: today a malformed `inputs` entry is reported as an `INVALID` frontier line (`rp.mjs` `parseInputs`), and the orchestrator handles it by repairing the frontmatter and stamping again (`skills/radical-pipelines/reference/run/loop.md` dispatch table).

spec-requirement-11: Production lanes of a phase land in parallel from the same pipeline tip. Merging each landed lane branch into the pipeline branch never conflicts because of the certification recorded at landing.

origin: from-intent intent-constraint-3

observed: today, two spec lanes landed from the same tip merge into the pipeline branch without conflict, and `rp check` then reports both candidates `fresh` (`1-spec/lanes/demands/spec/lanes-and-frontmatter-today.txt`).

spec-requirement-12: Merging the pipeline branch into a production lane's branch, before the lane's next turn, never conflicts because of the certification recorded at landing.

origin: derived intent-constraint-3; the orchestrator merges the pipeline branch into an existing lane branch when it wakes the lane again (`skills/radical-pipelines/reference/run/loop.md` § Production lanes, step 1)

observed: today, after both lanes merge, merging the pipeline branch into one lane's branch completes without conflict (`1-spec/lanes/demands/spec/lanes-and-frontmatter-today.txt`).

spec-requirement-13: An approval certifies the inputs its reviewer read: each required input at its identity at the review lane's turn commit. A later input committed to the pipeline branch after that turn commit leaves the landed approval stale, naming that input, so the lane reviews again. The approval's approved code is still the code of the change the reviewer reviewed.

origin: from-intent intent-context-5

observed: `rp review` builds the change with `0-intent/intent.md` alone. A failure committed to the pipeline branch while the reviewer worked is still pinned by the approval once it lands `--at HEAD`. After the implementer answers that failure without changing code, the frontier is `complete` and the review lane `approved` (`1-spec/lanes/demands/spec/review-lane-landing.txt`).

spec-requirement-14: An approval is stale on code only when the code outside the pipelines folder root differs from its approved code plus clean merges of the base. A conflict or a difference confined to the pipelines folder root never makes it stale on code.

origin: from-intent intent-context-5

observed: in a squash-merged pipeline continued on `p_2` in the clone that holds the approved commit, `rp check` reports `review default stale code`, although no code outside the pipelines folder root changed. Merging the approved commit with the base conflicts only on the thread file (`1-spec/lanes/demands/spec/squash-continuation.txt`).

spec-requirement-15: When an approval's approved commit is absent from the clone where `rp check` runs, the approval counts as not approved. `rp check` completes and reports the review lane not approved. At target phase 4, once no earlier phase has work, its frontier is `review <lane>`.

origin: from-intent intent-proposal-3

observed: in a fresh clone of a squash-merged pipeline continued on `p_2`, `rp check` at target phase 4 stops with `rp: reviewed does not resolve to a commit`, with or without a later input (`1-spec/lanes/demands/spec/squash-continuation.txt`).

spec-requirement-16: The pipeline format number increases.

- `rp check` stops on a pipeline whose `run-config.md` records format 6 with `pipeline of an earlier format; it is not continued`, as it does today for earlier formats.
- `rp pipelines` lists such a pipeline with its recorded format.
- A pipeline started after the change records the new number.

origin: from-intent intent-constraint-6

observed: the current format is 6 (`rp.mjs` `FORMAT`, `requireFormat`, lines 328–342), and three live pipelines record it, this one among them (`1-spec/lanes/demands/spec/discovery-issue-368.txt`).

spec-requirement-17: `rp pipelines --issue <ref>` lists every pipeline whose intent names the issue as its origin, with its format and its origins. It reads the origin from the intent's leading `origin:` body lines at format 6, and from the intent's frontmatter at the new format.

origin: derived intent-constraint-6; triage scans an issue's pipelines with `rp pipelines --issue`, and the owner may start new work from an earlier-format pipeline's tip (`skills/radical-pipelines/reference/entries/triage.md` § 2. Scan, § 3. Route)

observed: `rp pipelines --issue 368 --json` lists the three format-6 pipelines with `origins: ["issue 368"]` (`1-spec/lanes/demands/spec/discovery-issue-368.txt`).

spec-requirement-18: The run configuration keeps the values, the form, and the validation it has today. Only its format number changes.

origin: derived intent-constraint-4; the constraint lists the values that move to YAML and leaves out the run configuration, whose `lanes` value in this run's `run-config.md` is a list of objects with briefs

observed: `run-config.md` is a JSON frontmatter of `format`, `target-phase`, `base`, and `lanes`, and a malformed one stops `rp check` (`rp.mjs` `parseConfig`; `.pipelines/368-certification-out-of-files/run-config.md`).

spec-requirement-19: A pipeline of the new format gets the same `rp check` report as the same pipeline gets in the current format: frontier, artifact, lane, review, and thread states. The exceptions are what spec-requirement-7, spec-requirement-13, spec-requirement-14, and spec-requirement-15 change. The rules that stay the same are:

- the inputs each file requires;
- the meaning of missing, stale, and fresh;
- `notes.md` counting as missing until its status is `done`;
- the thread rules;
- the frontier rules;
- landing certifying each required input at its identity in the turn commit's tree, so an input committed after the turn commit, or never committed, is not certified.

origin: derived intent-constraint-1; every step of a run dispatches on what `rp check` reports (`skills/radical-pipelines/reference/run/loop.md` § One step)

observed: `npm run test:rp` passes all 346 tests on the current format. The rules are stated in `skills/radical-pipelines/reference/run/state.md` and `skills/radical-pipelines/scripts/README.md`.

spec-requirement-20: The skill's guidance changes in three ways:

- Each format that the agent profiles, the templates, and the skill's references give a role or the orchestrator, for a file `rp` reads, shows that file's values for `rp` as its YAML frontmatter.
- No instruction asks a role or the orchestrator to leave anything of `rp`'s untouched.
- Each `INVALID` line is dispatched to the file's writer: the role that wrote it, or the orchestrator for the files it writes.

origin: from-intent intent-goal

observed: the producer profiles and the implementer profile say "Frontmatter on every file is the orchestrator's; leave it untouched" (`agents/spec-producer.md:106`, `agents/design-doc-producer.md:120`, `agents/implementer.md:128`). The reviewer's template gives the thread header as body lines (`skills/radical-pipelines/templates/reviewer-first.md`). `loop.md` dispatches a malformed frontmatter to the orchestrator: "repair it and re-stamp" (`skills/radical-pipelines/reference/run/loop.md`).

## Acceptance criteria

spec-acceptance-criterion-1: Given a role's committed turn that wrote an artifact, a candidate, or an approval, when the orchestrator lands it, then every file the turn wrote is, at the landed tip, byte for byte as the turn committed it.

spec-acceptance-criterion-2: Given a landed artifact or candidate that is fresh, when its writer rewrites the whole file with the content it committed, then `rp check` reports it fresh.

spec-acceptance-criterion-3: Given a thread, a `notes.md`, a later input, and an intent whose values for `rp` are in their YAML frontmatter, when `rp check` and `rp pipelines --issue` run, then each of the following comes from the frontmatter, whatever the body says:

- the thread's status and awaited role;
- whether `notes.md` is missing;
- each later input's targets;
- the intent's issue origin.

spec-acceptance-criterion-4: Given a file `rp` reads that has any of these, when `rp check` runs, then its frontier is `INVALID <path>: <reason>`, and the reason names the key or the construct:

- a frontmatter with a nested map, a list, a multi-line value, a key given twice, or no closing line;
- a key its file does not carry for `rp`;
- any frontmatter on a spec, a design doc, or a candidate.

spec-acceptance-criterion-5: Given a frontmatter value written in single or double quotes, when `rp check` runs, then it reads the value a YAML parser reads. Given a value followed by ` #` text, when `rp check` runs, then it either reads the value a YAML parser reads or reports `INVALID` and names that value.

spec-acceptance-criterion-6: Given a checkout of the skill with no package installed, when `rp check` runs on a pipeline of the new format, then it completes using Node and Git only.

spec-acceptance-criterion-7: Given a thread of the new format, when `rp check` runs, then:

- each `## <role> — <commit>` heading in its body is a message;
- an `open` thread awaits its opener when its owner wrote the last message, and its owner otherwise, as today;
- a malformed heading is `INVALID` with today's reason.

spec-acceptance-criterion-8: Given a repository whose `.gitattributes` sets `*.md text eol=crlf`, or whose `core.autocrlf` is `true`, with a pipeline checked out, when a turn is landed, then all three of these report the landed file fresh and print the same frontier:

- `rp check` before the landing is committed;
- `rp check` after it is committed;
- `rp check --ref HEAD` after it is committed.

spec-acceptance-criterion-9: Given a pipeline that was squash-merged into the base branch, whose branch was deleted, in a clone that holds none of its commits, when it is continued on a `_<n>` branch from the base branch with a later input targeting `3-implementation/notes.md`, then `rp check` reports the spec and the design doc fresh and `notes.md` stale, naming that later input.

spec-acceptance-criterion-10: Given a landed artifact, when one of its required inputs changes only in a frontmatter value, or only in its body, then `rp check` reports the artifact stale, naming that input.

spec-acceptance-criterion-11: Given a certification that `rp` cannot read, or one that is malformed, when `rp check` runs, then it exits 1, prints `rp: <reason>` naming that certification, and prints no frontier.

spec-acceptance-criterion-12: Given two production lanes of one phase woken at the same pipeline tip and each landed, when each lane branch is merged into the pipeline branch, then each merge completes without conflict, and `rp check` reports each candidate fresh.

spec-acceptance-criterion-13: Given a pipeline branch that holds the landed candidates of two production lanes, when it is merged into one of the lane branches, then the merge completes without conflict.

spec-acceptance-criterion-14: Given a review lane woken on the change `rp review` built, and a later input committed to the pipeline branch before the lane's approval lands, when the approval lands, then `rp check` reports the review lane stale, naming that later input. Once no earlier phase has work, the frontier is `review <lane>`.

spec-acceptance-criterion-15: Given a pipeline that was squash-merged and continued on a `_<n>` branch, in a clone that holds the approved commit, with no change outside the pipelines folder root, when `rp check` runs at target phase 4, then it reports the review lane approved.

spec-acceptance-criterion-16: Given the same continuation in a clone that lacks the approved commit, when `rp check` runs at target phase 4, then it exits 0 and reports the review lane not approved. When no earlier phase has work, its frontier is `review <lane>`.

spec-acceptance-criterion-17: Given a pipeline whose `run-config.md` records `"format": 6`, when `rp check` runs on it, then it stops with `pipeline of an earlier format; it is not continued`. Given a pipeline that triage starts after the change, when `rp check` runs on it, then its `run-config.md` records the new format number and `rp check` reads it.

spec-acceptance-criterion-18: Given pipelines of format 6 and of the new format whose intents name issue `<ref>`, when `rp pipelines --issue <ref>` runs, then it lists each of them with its format and its origins.

spec-acceptance-criterion-19: Given a `run-config.md` in today's form with the new format number, when `rp check` runs, then it reads the target phase, the base, and the lanes as it does today, and a malformed one stops the command as it does today.

spec-acceptance-criterion-20: Given a pipeline in the current format, and the same pipeline with its values for `rp` written as the new format's frontmatter and its certification recorded by landing, when `rp check` runs on each, then their frontiers and states match. The only differences allowed are those spec-acceptance-criterion-8, spec-acceptance-criterion-14, spec-acceptance-criterion-15, and spec-acceptance-criterion-16 describe.

spec-acceptance-criterion-21: Given the agent profiles, the templates, and the skill's references, when a role or the orchestrator reads the format of a file `rp` reads, then that format shows the file's values for `rp` as its YAML frontmatter. No instruction asks the reader to leave anything of `rp`'s untouched, and every `INVALID` line is dispatched to the file's writer.

## Exclusions

spec-exclusion-1: A pipeline of format 6 or earlier is neither migrated to the new format nor continued. Work on its issue starts a new pipeline, as it does today.

spec-exclusion-2: A clone that lacks an approval's approved commit does not report that approval approved, even when a clone that holds the commit does.

## Considered and not required

- Reading intent-goal's "no pipeline file has two writers" as one writer per thread, not taken — both parties write a thread and the orchestrator appends the owner's answer (`skills/radical-pipelines/reference/run/state.md` § Threads, `skills/radical-pipelines/reference/run/loop.md` § Owner escalation), and the Goal's next sentence sets `rp`'s certification apart from what roles and the orchestrator write.
- Reading intent-goal as also moving `run-config.md` to a flat YAML map, not taken — intent-constraint-4 lists the values that move and leaves the run configuration out, and its `lanes` value is a list of objects (`.pipelines/368-certification-out-of-files/run-config.md`).
- An intent whose origins change while the rest of it stays the same — no intended use produces it: observed: re-synthesizing an intent preserves its origins (`skills/radical-pipelines/reference/entries/intent-format.md` § Synthesis from an issue).
- A consolidated root's record of the candidates it merged — no intended use reads it: observed: `rp check` checks those pins for grammar only (`skills/radical-pipelines/scripts/README.md` § `inputs`), and the skill describes them only as a record, read by no step (`skills/radical-pipelines/reference/run/state.md` § Terms, `docs/glossary.md`).
