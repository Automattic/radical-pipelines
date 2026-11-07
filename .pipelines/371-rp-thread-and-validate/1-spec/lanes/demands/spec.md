---
{
  "inputs": [
    "0-intent/intent.md@fac028da676c"
  ]
}
---
# Spec: Roles write threads through rp and validate their own files

## Overview

Today roles write every thread by hand: its file name and number, its header, and each message heading. They copy them from the thread grammar that all four agent profiles and the reviewer's requests repeat. `rp` gives roles no command to write a thread or check a file, and no assignment says how to run `rp`. `rp check` stops in a reviewer's tree, which holds no `run-config.md`. A mistake therefore surfaces only when `rp land` rejects the file, and the next step wakes its author again to repair it: a whole turn.

After the change, roles write a thread's structure through `rp thread open`, `rp thread reply`, `rp thread close`, and `rp thread escalate`, and write each message body themselves. Before ending a turn, a role runs `rp validate`. It reports each of the role's own files that landing would reject, with the reason landing gives, so the role fixes the file in the same turn. These commands work in every seat from the file grammar alone, and a wrong use says what was wrong and what to run instead. The profiles name only the commands, each assignment says how to run `rp`, and certification stays with `rp land`.

## Requirements

spec-requirement-1: A role opens a thread with `rp thread open`, for the artifact it questions. `rp` writes a new file `<n>-<opener>-<owner>-<artifact>.md` in its pipeline's `threads/` folder, creating the folder when it is absent. `<n>` is one more than the highest number among the thread files in that folder when the command runs, or 1 when the folder holds none. The file holds the header — status `open`, the role as opener, the artifact's owner, and the artifact — and the first message's heading, which names the role and a commit of its repository. The role writes the message body below that heading.

origin: from-intent intent-goal, intent-proposal-1

observed: today a role writes the whole file by hand. A producer or the implementer takes the file name and number from its profile's **Threads** and the header and headings from its **Formats** (`agents/spec-producer.md:78`, `:141`; `agents/design-doc-producer.md:92`, `:168`; `agents/implementer.md:103`, `:154`). A reviewer copies the lines its first-turn request shows (`skills/radical-pipelines/templates/reviewer-first.md:13`–`23`). `rp` has no `thread` command (`1-spec/lanes/demands/spec/probe-today.txt` § 1, the transcript `probe-today.sh` prints).

observed: a reviewer's tree holds no `threads/` folder before its first thread (`probe-today.txt` § 3). Threads may share a number (`skills/radical-pipelines/scripts/README.md` § Threads). In one turn, commit `cd370c32`, the implementer opened two threads, numbered 2 and 3 (`.pipelines/369-conventions-as-data/threads/`).

spec-requirement-2: A party to an `open` thread adds a message with `rp thread reply`. `rp` appends, on a line of its own after the thread's last message, a heading naming the role and a commit of its repository. The header and every earlier message stay unchanged. The role writes the message body below that heading. The thread then awaits the other party.

origin: from-intent intent-goal, intent-proposal-1

observed: an `open` thread awaits its opener when its owner wrote the last message, and its owner otherwise (`scripts/README.md` § Threads). The implementer answers several threads in one turn (commits `b9917965`, `cd370c32`).

spec-requirement-3: The opener of an `open` thread closes it with `rp thread close`, as `approved` or `withdrawn`, with or without a closing message. `rp` sets the thread's status. With a closing message, it also appends that message's heading, as `rp thread reply` does. Nothing else in the file changes.

origin: from-intent intent-goal, intent-proposal-1

observed: openers close threads both ways today. In commit `3817cdf0`, the implementer appended a closing message and set `approved`. `.pipelines/370-rp-next-and-land/threads/1-design-doc-producer-spec-producer-spec.md` and `.pipelines/369-conventions-as-data/threads/4-design-doc-producer-spec-producer-spec.md` were closed `approved` with the owner's message last.

spec-requirement-4: A role raises a disagreement with the owner with `rp thread escalate`, giving the thread the disagreement comes from or the path of its evidence. `rp` writes `<n>-<role>-owner-intent.md` in the same folder, numbered as `rp thread open` numbers. The file holds status `disagreement`, the role as opener, `owner` as owner, `intent` as artifact, and `cites` holding what the role gave, then the first message's heading. The role writes the question below that heading.

origin: from-intent intent-goal, intent-proposal-1

observed: today a reviewer copies these lines from its profile and writes the file beside its review thread (`agents/reviewer.md:8`–`20`). A producer or the implementer composes them from its **Threads** rule and **Formats** (`agents/implementer.md:112`, `:154`).

spec-requirement-5: A reviewer that approves through `rp` ends its turn with its review thread `approved` and the thread's last message, its own, naming its turn commit: the change it reviewed. This holds on a first turn whose review approves at once, and on a later turn, after the implementer answered. Once `rp land` lands the turn, the lane is approved.

origin: derived intent-goal — input: the reviewer's first-turn request has it write `status: approved` when it would merge (`templates/reviewer-first.md:26`); its later-turn request has it append a heading naming its turn commit and set `approved` (`templates/reviewer-later.md:13`).

observed: `rp land` certifies an approval at the commit its reviewer's last message names. It lands the approval uncertified when that commit's code differs from the landed commit's (`scripts/README.md` § `land`, step 4).

observed: in `1-spec/lanes/demands/spec/probe-approval.txt` § 3, the transcript `probe-approval.sh` prints, reviewer lane `a` set `approved` on a later turn without a new message. Its approval landed uncertified: `rp check` reported `review a stale 0-intent/intent.md`, and the frontier named `review a` again. Lane `b` appended a message naming its turn commit, and `rp check` reported `review b approved`.

spec-requirement-6: Every thread file an `rp thread` command writes is accepted by `rp validate`. A use that would leave a file `rp validate` rejects writes nothing.

origin: from-intent intent-goal

observed: the thread grammar rejects, among others, an `open` thread whose opener is a production lane, a thread whose opener is its owner, and a thread to `owner` whose status is neither `disagreement` nor `answered` (`scripts/README.md` § Threads).

spec-requirement-7: Every message body is Markdown the role writes, kept as the role wrote it. `rp` writes no body text.

origin: from-intent intent-constraint-2

observed: the text between message headings is free and written by the roles (`scripts/README.md` § Threads). Bodies hold level-3 headings, lists, and fenced code (`.pipelines/370-rp-next-and-land/threads/`).

spec-requirement-8: A role runs `rp validate` in its worktree. For each file the role writes that `rp land` would reject, `rp validate` prints `INVALID <path>: <reason>`, with the path and reason `rp check` prints for that file in the pipeline. The files a role writes are its artifact or candidate and each thread whose file name names it as opener or owner. When none of them is rejected, `rp validate` says that they are accepted. Given the path of one of the role's files, it reports on that file alone. It reads each file as it stands in the worktree, committed or not.

origin: from-intent intent-goal, intent-proposal-1

observed: today only landing checks a role's files. In `probe-today.txt` § 3, a review thread whose body holds the line `## Summary` met no check until `rp land` stopped on it: `INVALID threads/3-reviewer-default-implementer-implementation.md: message heading must be ## <role> — <commit>: ## Summary`. The next step woke the reviewer to repair it (`repair reviewer-default …`).

observed: `rp check` stops in a reviewer's tree: `rp: .pipelines/demo/run-config.md: pipeline of an earlier format; it is not continued` (`probe-today.txt` § 2).

observed: of the checks landing applies to a role's file, two read `run-config.md`: an `open` thread awaiting a review lane it does not declare, and a candidate of a production lane it does not declare. Every other check reads the file alone (`skills/radical-pipelines/scripts/rp.mjs` `parseFile`, `parseThread`, `frontmatterOf`).

observed: a role writes its artifact or candidate and every thread whose file name names it as opener or owner (`scripts/README.md` § Assignments, step 1).

spec-requirement-9: Run without a path, `rp validate` reports only the role's own files, in the role's own pipeline. It reports no other role's file and no file of another pipeline folder in the worktree.

origin: derived intent-goal — input: one `INVALID` frontier wakes several roles in the same pipeline worktree, each with only its own lines under **Malformed files** (`probe-today.txt` § 5). A worktree of this repository holds, beside its pipeline, the folders of pipelines of an earlier format (`1-spec/lanes/demands/spec/worktree-pipelines.txt`), whose threads today's grammar rejects (`probe-today.txt` § 6: `frontmatter has no status`).

spec-requirement-10: Every `rp thread` command and `rp validate` works wherever a role runs it:

- a review lane's tree, which holds only `0-intent/` and the lane's own threads, no `run-config.md`, and no `threads/` folder before its first thread;
- a production lane's worktree;
- the pipeline worktree.

Apart from the numbers of the threads in `threads/`, what a command writes or reports depends on no pipeline file but the ones it writes or checks. A missing `run-config.md`, another role's malformed file, or another pipeline's folder in the worktree neither stops a command nor changes its result.

origin: from-intent intent-constraint-1

observed: before its first review, a review lane's tree holds `0-intent/intent.md` alone (`probe-today.txt` § 2), as the lane's view defines (`scripts/README.md` § Review lanes). Several roles work in the pipeline worktree while one another's files are rejected (`probe-today.txt` § 5).

spec-requirement-11: A command used wrongly prints what was wrong and what to run instead, exits with failure, and changes no file.

origin: from-intent intent-constraint-5

observed: today `rp thread open` prints `rp: unknown command: thread`, names nothing to run instead, and exits 1 (`probe-today.txt` § 1). The profiles limit who writes what in a thread. A role writes only in a thread it opened or one that awaits it. A closed thread is history. The opener closes a thread (`agents/implementer.md:110`, `:113`).

spec-requirement-12: No `rp thread` command and no `rp validate` run writes a certification or lands a turn. A review thread closed `approved` through `rp` approves its lane only once `rp land` lands the turn.

origin: from-intent intent-constraint-4

observed: `rp land` alone writes `certification/`, and an approval without a certification is stale (`scripts/README.md` § Certification, § Net change and approval).

spec-requirement-13: No agent profile — `agents/spec-producer.md`, `agents/design-doc-producer.md`, `agents/implementer.md`, `agents/reviewer.md` — states the thread grammar: the thread file name and its number, the header's keys and values, or the message heading's form. Where a profile has its role open, answer, close, or escalate a thread, it names `rp thread open`, `rp thread reply`, `rp thread close`, or `rp thread escalate`. No profile names a skill file or the path of `rp`.

origin: from-intent intent-constraint-3

observed: the producers' and the implementer's profiles state the file name and number under **Threads**, and the header and headings under **Formats**. The reviewer's states the escalation's file name, header, and heading (`agents/spec-producer.md:78`, `:141`–`163`; `agents/design-doc-producer.md:92`, `:168`–`190`; `agents/implementer.md:103`, `:154`–`176`; `agents/reviewer.md:8`–`20`). No profile names a skill file today (`grep -n -i skill agents/*.md`).

spec-requirement-14: Each profile has its role run `rp validate` before it ends any turn, and fix each file it reports.

origin: from-intent intent-goal

observed: today each profile's end of turn waits only for the commands and subagents the role started (`agents/spec-producer.md:102`, `agents/design-doc-producer.md:116`, `agents/implementer.md:124`, `agents/reviewer.md:24`).

spec-requirement-15: Every assignment `rp next --apply` writes states how to run `rp` from the role's worktree. This covers the producers' and the implementer's assignments in every mode, and a reviewer's first-turn, later-turn, and repair requests. A role that runs `rp` as its assignment states runs it.

origin: from-intent intent-constraint-3

observed: no assignment says how to run `rp` today: neither the reviewer's first-turn request nor the implementer's assignment in `probe-today.txt` § 2 and § 4, nor any template. Only the repair request and the profiles mention `rp check` at all (`templates/reviewer-repair.md:1`).

spec-requirement-16: No assignment shows thread structure for a role to write by hand. A reviewer's first-turn request has it open its review through `rp`, approval included. Its later-turn request has it answer and approve through `rp`. A thread path a reviewer's request names is the path `rp thread open` writes in the reviewer's tree.

origin: derived intent-goal — input: the reviewer's first-turn request shows the header and heading lines to copy, and names `threads/3-reviewer-default-implementer-implementation.md` while the reviewer's tree holds no thread (`probe-today.txt` § 2). Its later-turn request gives the heading to append and the status to set (`templates/reviewer-later.md:13`).

## Acceptance criteria

spec-acceptance-criterion-1: Given a role whose `threads/` folder holds thread files numbered up to `<h>`, or no such folder, as in a review lane's tree before its first review, when the role runs `rp thread open` for the artifact it questions, then the folder holds `<h + 1>-<role>-<owner>-<artifact>.md`, or `1-<role>-<owner>-<artifact>.md` when there was none. Its header has status `open`, the role as opener, the artifact's owner, and the artifact. Its first message heading names the role and a commit of the repository. A second thread the role opens in the same turn is numbered one higher.

spec-acceptance-criterion-2: Given an `open` thread the role is a party to, when it runs `rp thread reply` and writes its body, then the file ends with a heading naming the role and a commit of the repository, followed by that body. Its header and earlier messages are byte-identical to before. Once the turn lands, `rp check` reports the thread awaiting the other party.

spec-acceptance-criterion-3: Given an `open` thread the role opened, when it runs `rp thread close` with `approved` or `withdrawn`, with or without a closing message, then the file's status is that value. A closing message, when given, ends the file under a heading naming the role. Nothing else in the file differs.

spec-acceptance-criterion-4: Given a role whose disagreement is about what the intent means or demands, when it runs `rp thread escalate` citing its thread or an evidence path, then its `threads/` folder holds `<n>-<role>-owner-intent.md` with status `disagreement`, the role as opener, `owner` as owner, `intent` as artifact, `cites` as given, and a first message heading naming the role. Once the turn lands, `rp check`'s frontier is `escalate` for that thread.

spec-acceptance-criterion-5: Given a reviewer that would merge the change, on its first turn or on a later turn after the implementer answered, when it approves through `rp`, then its review thread is `approved` and its last message heading names its turn commit. After `rp land` lands the turn, `rp check` reports `review <lane> approved`.

spec-acceptance-criterion-6: Given a use of an `rp thread` command that would leave a thread `rp validate` rejects, such as a production lane's role opening a thread or a role opening one about the artifact it owns, when it runs, then the role's `threads/` folder is unchanged.

spec-acceptance-criterion-7: Given a message body the role writes holding level-3 headings, lists, and fenced code, when the thread is written through `rp`, then the body reads byte for byte as written, below the heading `rp` wrote.

spec-acceptance-criterion-8: Given a file the role writes that `rp land` would reject, committed or not, when the role runs `rp validate` in its worktree, then it prints the line `INVALID <path>: <reason>` that `rp check` prints for that file. Given only accepted files, then `rp validate` says they are accepted, and `rp land` lands the turn without stopping on any file it brings. Given the path of one of the role's files, then `rp validate` reports on that file alone.

spec-acceptance-criterion-9: Given a pipeline worktree where one `INVALID` frontier woke several roles, each for its own file, and a worktree holding the folders of other pipelines of an earlier format, when a role runs `rp validate` without a path, then it prints a line for each of its own rejected files in its own pipeline, and none for any other file.

spec-acceptance-criterion-10: Given a review lane's tree with no `run-config.md`, or a pipeline worktree where another role's file is malformed, when the role there runs an `rp thread` command or `rp validate`, then the command writes and reports as it would in a pipeline with no malformed file. No command stops on the missing configuration.

spec-acceptance-criterion-11: Given a command used wrongly, when it runs, then it prints what was wrong and the command to run instead, exits with failure, and no file in the worktree changes. Wrong uses include:

- an unknown `rp thread` subcommand or option, or a missing argument;
- a path that names no thread of the role's pipeline;
- `rp thread reply` or `rp thread close` on a thread that is not `open`;
- `rp thread close` by the thread's owner, or with a status other than `approved` or `withdrawn`;
- `rp thread open` addressed to `owner`;
- `rp thread escalate` with nothing cited.

spec-acceptance-criterion-12: Given a reviewer that closed its review thread `approved` through `rp` in its lane, while its turn is not yet landed, when `rp check` runs on the pipeline, then it reports no approval for that lane. No `rp thread` command or `rp validate` run creates or changes a file under `certification/`, or moves the pipeline branch.

spec-acceptance-criterion-13: Given each of the four agent profiles, when it is read, then it states no thread file name or number, no header keys and values, and no message heading form, and it names no skill file and no path of `rp`. Where its role opens, answers, closes, or escalates a thread, it names `rp thread open`, `rp thread reply`, `rp thread close`, or `rp thread escalate`.

spec-acceptance-criterion-14: Given each of the four agent profiles, when it is read, then its role runs `rp validate`, and fixes each file it reports, before ending any turn.

spec-acceptance-criterion-15: Given any assignment `rp next --apply` writes, for any role in any seat and mode, when the role runs `rp` from its worktree as the assignment states, then `rp` runs.

spec-acceptance-criterion-16: Given a reviewer's first-turn or later-turn request, when it is read, then it shows no header line, heading form, or status edit to write by hand, and it names the `rp thread` commands that open, answer, and approve. Any review thread path a first-turn request names is the path `rp thread open` writes in the reviewer's tree.

## Exclusions

spec-exclusion-1: `rp validate` does not report an `open` thread awaiting a review lane `run-config.md` does not declare, or a candidate of a production lane it does not declare. `rp check` and `rp land` still reject both.

spec-exclusion-2: A body line starting with `## ` that is no message heading stays rejected by `rp validate`, `rp check`, and `rp land` alike.

spec-exclusion-3: A file a role commits that `rp land` rejects still stops the landing, and the next step still wakes its author with **Malformed files**.

## Considered and not required

- The orchestrator's answer on a thread to `owner`, its `## owner — <commit>` heading and `answered` status, written through `rp` — the reading of intent-goal that covers it is not taken. The Goal names roles, and intent-context-1 traces the `INVALID` lines to the grammar the four profiles have roles write by hand; the orchestrator writes the answer per `skills/radical-pipelines/reference/run/loop.md` § Owner escalation.
- A `## ` line in a body read as body text — the reading of intent-constraint-2's "free Markdown" that changes the grammar is not taken. `scripts/README.md` § Threads already calls the text between headings free while every `## ` line outside fenced code is a heading. No thread in this repository holds such a line (observed: `1-spec/lanes/demands/spec/thread-headings-scan.txt`), and `rp validate` reports one within the turn (spec-requirement-8).
- The body's format (`### Finding <n>`, `### <point>: changed in | stands | owned by`) leaving the profiles — the reading of intent-constraint-3's "thread grammar" that includes it is not taken. The Goal gives `rp` the header, the file name and number, and the headings; the body is the role's (intent-constraint-2), and `rp` reads none of it.
- An `open` thread awaiting an undeclared review lane, or a candidate of an undeclared production lane, among a role's files — no intended use produces either. The commit that drops a lane closes its open threads `withdrawn` and removes its candidate folder (observed: `skills/radical-pipelines/reference/run/state.md:108`), and a lane writes its candidate at the **Write to** its assignment names.
- A reason `rp validate` prints that names no form to write, such as `frontmatter has no opener` — only a header written by hand produces it (observed: `rp.mjs` `parseThread`), and `rp` writes every header (spec-requirement-1).
- A role writing in a `disagreement` thread — no role is woken while one exists: it puts `escalate` on the frontier until the orchestrator closes it `answered` (observed: `reference/run/state.md` § The frontier, rule 2; `reference/run/loop.md` § Owner escalation).
- A reviewer opening a thread to an owner other than `implementer` or `owner` — its requests and profile have it write only its review thread and its escalation, and its lane's view holds no other thread (observed: `templates/reviewer-first.md`, `agents/reviewer.md`, `scripts/README.md` § Review lanes).
- `rp thread escalate` checking that the cited path exists — `rp check` does not resolve `cites`, and the orchestrator reads what it names at escalation (observed: `scripts/README.md` § Threads; `reference/run/loop.md` § Owner escalation).

## Open assumptions

spec-assumption-1: A role that has the command names from its profile and how to run `rp` from its assignment, and nothing else, finds each command's arguments in `rp`'s own output and writes its threads through `rp` within its turn — assumed: a role in each seat (a review lane, a production lane, the pipeline worktree) opens, answers, closes, escalates, and validates through `rp`, using only its profile, its assignment, and `rp`'s output.
