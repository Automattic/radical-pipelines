---
{
  "inputs": [
    "0-intent/intent.md@fac028da676c"
  ]
}
---
# Spec: Roles write threads and check their files through `rp`

## Overview

A role that writes a thread's header, file name, number, or message heading by hand produces a file `rp check` rejects, and the rejection wakes the author for a whole extra turn. All four agent profiles repeat the thread format in full so that roles can write it. A role also has no way to check its own files before its turn ends, and `rp check` cannot serve a review lane, whose tree holds no `run-config.md`.

The change gives a role `rp thread open`, `rp thread reply`, `rp thread close`, and `rp thread escalate`, which write a thread's structure, and `rp validate`, which checks a role's files before its turn ends. All of them work from the file grammar alone. The role writes only the body of each message, and the thread format leaves the profiles.

## Requirements

spec-requirement-1: `rp thread open` creates one new thread file in a pipeline folder's `threads/` for a given opener role and owner role: `threads/<n>-<opener>-<owner>-<artifact>.md`, where `<artifact>` is the artifact the owner role owns and `<n>` is one more than the highest number among the thread files in `threads/` of the tree the command runs in, or 1 when there are none. The file holds the frontmatter `status: open`, `opener`, `owner`, and `artifact`, and one message heading by the opener (spec-requirement-5), and no other text.

origin: from-intent 0-intent/intent.md Goal

- observed: `skills/radical-pipelines/scripts/README.md` § Threads and `docs/model.md` § Threads define the file name, the four frontmatter keys, the artifact each owner owns, and `<n>` as one more than the highest number in `threads/`.
- observed: `skills/radical-pipelines/templates/reviewer-first.md` makes a reviewer write the frontmatter and heading of its review thread by hand; `agents/spec-producer.md`, `agents/design-doc-producer.md`, and `agents/implementer.md` hold the thread format in § Formats.

spec-requirement-2: `rp thread escalate` creates one new thread file for a given opener role and a given `cites` value: `threads/<n>-<opener>-owner-intent.md`, numbered as in spec-requirement-1, with the frontmatter `status: disagreement`, `opener`, `owner: owner`, `artifact: intent`, and `cites` holding the given value, and one message heading by the opener (spec-requirement-5).

origin: from-intent 0-intent/intent.md intent-proposal-1

- observed: `agents/reviewer.md` has the reviewer write this file by hand, and the other three profiles describe the same thread in § Threads; the scripts README § Threads requires `cites` to be non-empty on a thread to `owner` and does not resolve it.

spec-requirement-3: `rp thread reply` appends one message heading by a given role to the end of an existing thread file (spec-requirement-5) and changes nothing else in the file.

origin: from-intent 0-intent/intent.md intent-proposal-1

- observed: `skills/radical-pipelines/templates/reviewer-later.md` has a reviewer append a heading `## {{role}} — {{turn-commit}}` by hand; the producers' and the implementer's answers in `.pipelines/370-rp-next-and-land/threads/` are headed the same way.

spec-requirement-4: `rp thread close` sets the `status` of an existing thread file to `approved` or to `withdrawn` and changes nothing else in the file.

origin: from-intent 0-intent/intent.md intent-proposal-1

- observed: `agents/spec-producer.md` § Threads has the opener close a thread `approved` or `withdrawn`; `reviewer-first.md` has a reviewer that would merge the change write a thread that is `approved` from its first message, and `reviewer-later.md` has it set `approved` on a later turn.

spec-requirement-5: Every message heading the commands write is `## <role> — <commit>`, with `<commit>` the commit the worktree holding the thread stands on (`HEAD`).

origin: derived 0-intent/intent.md Goal: a reviewer's heading names its turn commit, which is the tip of its worktree when it writes the thread (`skills/radical-pipelines/templates/reviewer-first.md`).

- observed: `skills/radical-pipelines/templates/README.md` defines `turn-commit` as the tip of the role's worktree, and `reviewer-first.md` and `reviewer-later.md` head the review with it.
- observed: the producers' and the implementer's profiles define the heading's commit as "the one you examined, or the last one carrying your changes".
- assumed: naming `HEAD` serves every use of the named commit, which are the reviewer's later-turn diff and the commit an approval is certified at (`scripts/README.md` § Assignments and § `land`) — confirmed by a review that runs through the commands to approval.

spec-requirement-6: The commands write no body text, and read, change, or remove none: every byte of a thread file outside the frontmatter line the command sets and the heading it adds is as the role left it.

origin: from-intent 0-intent/intent.md intent-constraint-2

- observed: the scripts README § Threads: `rp` reads the values from the frontmatter and the headings; the rest of the body is free text.

spec-requirement-7: Each command changes only the thread file it creates or names. None writes, changes, or removes a certification or any other file.

origin: from-intent 0-intent/intent.md intent-constraint-4

- observed: the scripts README § Certification: `land` alone writes `certification/<path>.json`.

spec-requirement-8: A command used wrongly says what was wrong and the command line to run instead, and changes no file.

origin: from-intent 0-intent/intent.md intent-constraint-5

spec-requirement-9: A use is wrong when the command cannot carry it out, or when carrying it out would leave a thread file `rp validate` rejects, including a thread file that is already rejected.

origin: derived 0-intent/intent.md intent-constraint-5: the thread files roles write by hand today are rejected for their header, file name, and heading (`.pipelines/371-rp-thread-and-validate/1-spec/lanes/omits/spec/probe-check-today.txt`).

- observed: `rp thread` and `rp validate` do not exist today (`node skills/radical-pipelines/scripts/rp.mjs thread open` prints `rp: unknown command: thread`).
- observed: the scripts README § Threads lists the rules a thread file must meet: an opener that is not `owner` and differs from the owner, an owner that owns the artifact, a status that fits a thread to `owner`, a message author that is the opener, the owner, or `owner`, and no production lane as a party of an open thread.

spec-requirement-10: `rp validate` reports, for each pipeline file at the path it is given, the file's `INVALID <path>: <reason>` line as `rp check` prints it, and reports no such line for a file `rp check` accepts. The path is a pipeline file or a pipeline folder, whose files are all reported; without a path it is the current directory. A path that is neither a pipeline folder, nor inside one, nor a pipeline file is a wrong use (spec-requirement-8). The files covered are the pipeline files a role writes or reads: the intent, a later input, the spec and design doc and their candidates, `notes.md`, and the threads.

origin: from-intent 0-intent/intent.md intent-proposal-1

- observed: `rp check` prints, for a thread whose header was written without its `---` lines, `INVALID threads/1-reviewer-default-implementer-implementation.md: frontmatter has no status`; for a heading with a hyphen for the em dash, `message heading must be ## <role> — <commit>: ## reviewer-default - abc1234`; for a wrong file name, `thread file name must be 3-reviewer-default-implementer-implementation.md`; for a `spec.md` with frontmatter, `carries no frontmatter`; for a `notes.md` with an unknown key, `unexpected frontmatter key: foo` (`probe-check-today.txt`, `probe-check-other-files.txt` in `.pipelines/371-rp-thread-and-validate/1-spec/lanes/omits/spec/`).

spec-requirement-11: `rp validate` and the `rp thread` commands read no `run-config.md` and no pipeline file beyond the thread files and, for `rp validate`, the files it reports on. They work on the tree of a review lane, which holds the intent, the later inputs, and the lane's own threads, and no `run-config.md`.

origin: from-intent 0-intent/intent.md intent-constraint-1

- observed: `rp check` on a pipeline without `run-config.md` stops with `rp: .pipelines/demo/run-config.md: pipeline of an earlier format; it is not continued` and prints no verdict on any file (`probe-check-today.txt`); the scripts README § Review lanes defines the lane's tree as `0-intent/` and the lane's own threads under the tip's root.
- observed: `rp check` makes two verdicts from the run configuration: a thread awaiting a review lane the configuration does not declare, and a candidate of a production lane it does not declare (`probe-check-config-verdicts.txt`: `lane not configured; close the thread withdrawn` and `production lane is not configured: spec-producer zz`). `rp validate` makes neither (spec-exclusion-1).

spec-requirement-12: A file written by the commands is accepted by `rp validate` and by `rp check` in a pipeline whose run configuration declares the lanes the file names, and is read as a hand-written file of the same content is: `rp check` lists it with its status and the role it awaits.

origin: derived 0-intent/intent.md Goal: the roles' threads are read by `rp check`, `rp next`, and `rp land` today, and a file that `rp validate` accepts and they reject costs the extra turn the Goal removes.

- observed: the scripts README § `land` step 3 rejects the files a turn brings as `rp check` does, and § Assignments wakes the role again for a rejected file.

spec-requirement-13: The agent profiles `spec-producer`, `design-doc-producer`, `implementer`, and `reviewer` hold no thread file name, thread frontmatter, or message heading format. Each names the `rp thread` commands its role uses and `rp validate`, and names no skill file. Each role's assignment gives the command line that runs `rp` for that role in its seat, so that the role chooses only its thread's owner, its `cites`, its status, and its message text.

origin: from-intent 0-intent/intent.md intent-constraint-3

- observed: all four profiles repeat the thread format today (`agents/*.md` § Threads and § Formats; `agents/reviewer.md` holds the frontmatter block of a thread to `owner`), and `reviewer-first.md` holds the header of a review thread.
- assumed: running the assignment's command line in each seat, a pipeline worktree and a lane worktree, runs `rp` to completion.

spec-requirement-14: Each profile's end of turn has the role run `rp validate` on the files it wrote and fix what it reports before it commits and ends its turn.

origin: from-intent 0-intent/intent.md Goal

- observed: the profiles' § Protocol today has the role fix its malformed files only when its assignment lists them, after `rp check` has rejected them and woken it again.

## Acceptance criteria

spec-acceptance-criterion-1: Given a pipeline folder whose `threads/` holds files numbered 1 and 4, when `design-doc-producer` runs `rp thread open` to `spec-producer`, then `threads/5-design-doc-producer-spec-producer-spec.md` exists with `status: open`, `opener: design-doc-producer`, `owner: spec-producer`, `artifact: spec` and one heading `## design-doc-producer — <HEAD>`; `rp validate` reports no line for it; and `rp check` of the pipeline lists it `open awaits spec-producer`.

spec-acceptance-criterion-2: Given a pipeline folder with no `threads/`, when `rp thread open` runs, then the new file is numbered 1.

spec-acceptance-criterion-3: Given a role that runs `rp thread escalate` with a `cites` value, then `threads/<n>-<role>-owner-intent.md` exists with `status: disagreement`, `owner: owner`, `artifact: intent`, the given `cites`, and the heading `## <role> — <HEAD>`; `rp check` lists the thread and its frontier is `escalate <thread>`. Given an empty `cites` value, `rp thread escalate` is a wrong use that changes no file.

spec-acceptance-criterion-4: Given an `open` thread whose last message is by the opener, when the owner role runs `rp thread reply`, then the file ends with the heading `## <owner role> — <HEAD>` and `rp check` lists the thread as awaiting the opener.

spec-acceptance-criterion-5: Given an `open` thread, when the opener runs `rp thread close` with `approved`, then only its `status` line differs and `rp check` lists it `approved`; with `withdrawn`, it lists it `withdrawn`. Given a reviewer's thread opened and closed `approved` in one turn, then the file holds `status: approved` and one heading, and `rp validate` reports no line for it.

spec-acceptance-criterion-6: Given a thread whose messages hold text, code fences, and `##` lines inside fences, when `rp thread reply` or `rp thread close` runs, then a comparison of the file before and after shows only the added heading, or only the changed `status` line.

spec-acceptance-criterion-7: Given a clean worktree, when any of the five commands succeeds, then `git status` shows that one thread file added or modified and nothing else, and no file under `certification/`.

spec-acceptance-criterion-8: Given the tree `rp next --apply` creates for a review lane, which holds the intent, the later inputs, and the lane's own threads and no `run-config.md`, when `rp thread open`, `reply`, `close`, `escalate`, and `rp validate` run on it, then each completes with its normal result and none stops on the missing `run-config.md`.

spec-acceptance-criterion-9: Given a thread header written without its `---` lines, a message heading with `-` for the em dash, a thread file whose name differs from its frontmatter, a `spec.md` that opens with frontmatter, and a `notes.md` with an unknown frontmatter key, when `rp validate` runs on each, then it prints the same `INVALID <path>: <reason>` line `rp check` prints for it, and no line for any other file.

spec-acceptance-criterion-10: Given a tree without `run-config.md` holding a candidate `1-spec/lanes/<id>/spec.md` and a thread awaiting `reviewer-<id>`, when `rp validate` runs, then it prints no `INVALID` line for either; with a `run-config.md` that declares neither lane, `rp check` prints both.

spec-acceptance-criterion-11: Given `rp thread open` with `owner` as the owner role, then the output names `rp thread escalate` and no file changes. Given `rp thread close` with the status `answered`, then the output names `approved` and `withdrawn`. Given `rp thread reply` on a thread file `rp validate` rejects, then the output names the rejection's reason and no file changes. Given `rp validate` on a path in no pipeline folder, then the output names the form that works.

spec-acceptance-criterion-12: Given the four profiles in `agents/`, when each is read, then none contains the thread file name pattern, a thread frontmatter block, or the message heading format; none refers to a skill file or to `.rp.md`; and each names `rp validate` in its end of turn and the `rp thread` commands its role uses.

spec-acceptance-criterion-13: Given `rp next --apply` waking a producer, the implementer, a reviewer on its first turn, a reviewer on a later turn, and a reviewer on a repair request, when each assignment is read, then it gives the command line that runs `rp` in that role's seat, and none tells the role to write a thread's header, file name, number, or heading by hand.

spec-acceptance-criterion-14: Given roles that write their threads only through the commands and check their files with `rp validate` before they end their turns, when `rp next` plans the step after their turns land, then no `INVALID` line and no `repair` line names a thread they wrote.

## Exclusions

spec-exclusion-1: `rp validate` gives no verdict that needs the run configuration or another pipeline file: not the lanes a configuration declares, not a thread's awaited role, and not freshness, a frontier, or an approval. A thread awaiting an undeclared review lane and a candidate of an undeclared production lane pass `rp validate` and are rejected by `rp check`.

spec-exclusion-2: `rp validate` reports no line on `run-config.md` or on a certification file, which no role writes.

spec-exclusion-3: No command writes a message body, edits or removes a message, deletes a thread, or reopens a closed thread.

spec-exclusion-4: No command writes a thread to `owner` other than `escalate`'s, and none writes the message `## owner — <commit>` or the status `answered`. The orchestrator records the owner's answer as it does today.

spec-exclusion-5: `rp check`, `rp next`, and `rp land` reject the same files for the same reasons as before, and a role whose files they reject is woken with its malformed files as before.

## Considered and not required

- `rp thread reply` or `rp thread close` on a thread that is already closed, a reply by the party the thread does not await, and a close by a role that did not open the thread — `rp check` accepts the files these produce, and no step of the loop leads a role there: observed: `skills/radical-pipelines/scripts/README.md` § Assignments dispatches a reviewer's later turn only while its review thread is `open`, and § Frontier wakes a role only for a thread awaiting it.
- The reading of intent-constraint-5 as enforcing the order in which roles act — the Goal removes the cost of a malformed file, and the order is a rule of the profiles' threads that `rp check` does not judge; the reading taken is a use the command cannot carry out or one whose result `rp validate` rejects.
- A commit chosen by the role for the heading instead of `HEAD` — observed: `reviewer-first.md`, `reviewer-later.md`, and the producers' profile name the turn commit or the commit examined, and no source shows a role naming another commit.
- A message body passed to the command — intent-constraint-2 leaves the body to the role, which writes it beneath the heading the command added.
- A non-zero exit status or a `--json` output for `rp validate` — observed: `rp check` exits 0 on `INVALID`, and every role reads printed lines (scripts README § `check`); no source shows a consumer that branches on either.
- `rp validate` choosing the role's pipeline when given no path — observed: this worktree's `.pipelines/` holds four pipelines, and choosing one needs the run configuration or the branch, which intent-constraint-1 rules out; the current directory is the default.
- `rp validate --ref <commit>` — roles check their working tree before they commit, and no source shows a consumer validating a commit without a run configuration.
- Resolving the path in `cites` — observed: the scripts README § Threads says the value is not resolved, and evidence paths sit in a producer's supporting folder that a reader may not hold.
- Numbers that collide across lanes — `docs/model.md` § Threads: threads opened in parallel may share a number, and the opener in the file name keeps paths unique.
- A thread file with CRLF line endings — observed: `scripts/test/rp/threads.test.mjs` accepts CRLF thread files, so a file that mixes endings after a command stays accepted; the commands need not keep a file's endings.
- The orchestrator's answer to an escalation (`## owner — <commit>` and `answered`) — observed: `skills/radical-pipelines/reference/run/loop.md` § Owner escalation has the orchestrator write it once per escalation and `rp check` validates it; the Goal removes the thread format from the four profiles, not from the orchestrator's reference.

## Open assumptions

spec-assumption-1: A role that follows its assignment's command line needs no knowledge of the thread format, and a pipeline run with the new profiles and assignments produces no `INVALID` line for a thread a role wrote — assumed: observed in the next full pipeline run after the change.

spec-assumption-2: The command line in an assignment runs `rp` from a lane worktree and from the pipeline worktree alike — assumed: running each role's assigned command in each seat after `rp next --apply`.

spec-assumption-3: Naming `HEAD` in every heading serves every use of the named commit: a reviewer's later-turn diff starts from it, and an approval is certified at it — assumed: a review that runs through the commands to approval lands certified with its lane approved.
