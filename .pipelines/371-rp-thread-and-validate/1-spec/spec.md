# Spec: Roles write threads and check their own files through `rp`

## Overview

Today a role writes every thread by hand: its file name and number, its header, and each message heading, copied from the thread grammar that all four agent profiles and the reviewer's requests repeat. `rp` has no command that writes a thread or checks a file, no assignment says how to run `rp`, and `rp check` stops in a review lane's tree, which holds no `run-config.md`. A mistake therefore surfaces only when `rp land` rejects the file, and the next step wakes its author again to repair it: a whole turn.

After the change, a role writes a thread's structure through `rp thread open`, `rp thread reply`, `rp thread close`, and `rp thread escalate`, and writes each message body itself. Before ending any turn it runs `rp validate`, which reports each of its own files that landing would reject, with the reason landing gives, so the role fixes the file in the same turn. The commands work in every seat from the file grammar alone, and a wrong use says what was wrong and what to run instead. The profiles name only the commands, each assignment says how to run `rp`, and certification stays with `rp land`.

## Requirements

spec-requirement-1: A role opens a thread about an artifact it questions with `rp thread open`. Its pipeline's `threads/` folder then holds a new file `<n>-<role>-<owner>-<artifact>.md`, the folder created when absent, `<n>` one more than the highest number among the thread files the folder held, or 1 when it held none. The file's header has status `open`, the role as opener, the artifact's owner, and the artifact. The file holds one message, the role's, headed as spec-requirement-5 states, whose body is the Markdown the role writes.

origin: from-intent intent-goal, intent-proposal-1

observed: today a producer or the implementer takes the file name and number from its profile's **Threads** and the header and headings from its **Formats** (`agents/spec-producer.md:78`, `:141`; `agents/design-doc-producer.md:92`, `:168`; `agents/implementer.md:103`, `:154`), and a reviewer copies the lines its first-turn request shows (`skills/radical-pipelines/templates/reviewer-first.md:13`–`24`). `rp` has no `thread` command (`1-spec/spec/probe-today.txt` § 1, the transcript `probe-today.sh` prints).

observed: a review lane's tree holds no `threads/` folder before its first thread (`probe-today.txt` § 2, § 3). In one turn, commit `cd370c32`, the implementer opened two threads, numbered 2 and 3 (`1-spec/spec/thread-history.txt`, the transcript `thread-history.sh` prints).

spec-requirement-2: A party to an `open` thread adds a message with `rp thread reply`. The file then ends with the role's message, headed as spec-requirement-5 states, whose body is the Markdown the role writes. The header and every earlier message stay unchanged, and the thread awaits the other party.

origin: from-intent intent-goal, intent-proposal-1

observed: an `open` thread awaits its opener when its owner wrote the last message, and its owner otherwise (`skills/radical-pipelines/scripts/README.md` § Threads). Every message a role added to a thread in this repository's history went to an `open` thread (`thread-history.txt`).

spec-requirement-3: The opener of an `open` thread closes it `approved` or `withdrawn` with `rp thread close`, with or without a closing message of its own. The thread's status becomes that value, a closing message ends the file, headed as spec-requirement-5 states, and nothing else in the file changes.

origin: from-intent intent-goal, intent-proposal-1

observed: of the twelve threads a role closed in this repository's history, ten were closed with the opener's closing message and two with the owner's message last, and each was closed by its opener (`thread-history.txt`).

spec-requirement-4: A role raises a disagreement on what the intent means or demands with `rp thread escalate`, citing the thread it comes from or the path of its evidence. Its `threads/` folder then holds `<n>-<role>-owner-intent.md`, numbered as spec-requirement-1 numbers. The file's header has status `disagreement`, the role as opener, `owner` as owner, `intent` as artifact, and `cites` holding what the role cited. The file holds one message, the role's, headed as spec-requirement-5 states, whose body is the question the role writes.

origin: from-intent intent-goal, intent-proposal-1

observed: today a reviewer copies these lines from its profile (`agents/reviewer.md:8`–`20`), and a producer or the implementer composes them from its **Threads** and **Formats** (`agents/implementer.md:112`, `:154`–`162`).

spec-requirement-5: Every message heading an `rp thread` command writes names the role and the commit its worktree stands on when the command runs.

origin: derived intent-goal — input: of the 35 headings roles wrote in this repository's threads, 34 name the commit the writer's worktree stood on (a producer's or the implementer's the parent of the commit adding it, a reviewer's the `rp review change` commit its turn reviewed), and the other, on a spec thread, names the commit before that, whose spec is the same (`1-spec/spec/heading-commits.txt`, the transcript `heading-commits.sh` prints).

observed: `rp land` certifies an approval at the commit its reviewer's last message names, and a reviewer's later-turn diff starts from that commit (`skills/radical-pipelines/scripts/README.md` § `land` step 4, § Assignments step 2).

spec-requirement-6: A reviewer that approves through `rp`, on a first turn whose review approves at once or on a later turn after the implementer answered, ends its turn with its review thread `approved` and holding a message of its own written that turn. Once `rp land` lands the turn, its lane is approved.

origin: derived intent-goal — input: the first-turn request has the reviewer write `status: approved` when it would merge (`skills/radical-pipelines/templates/reviewer-first.md:26`), and the later-turn request has it append a message and set `approved` (`skills/radical-pipelines/templates/reviewer-later.md:13`); each of the six later-turn approvals in this repository's history added the reviewer's message (`thread-history.txt`).

observed: in `1-spec/spec/probe-approval.txt` § 3, the transcript `probe-approval.sh` prints, review lane `a` set `approved` on a later turn without a new message. Its approval landed uncertified: `rp check` reported `review a stale 0-intent/intent.md`, and the frontier named `review a` again. Lane `b` appended a message naming its turn commit, and `rp check` reported `review b approved`.

spec-requirement-7: Every thread file an `rp thread` command writes is accepted by `rp validate`. Once landed in a pipeline whose `run-config.md` declares the lanes the file names, it is accepted by `rp check`, which lists it with the status and the awaited role a hand-written file of the same content gets.

origin: from-intent intent-goal

observed: `rp land` rejects the files a turn brings as `rp check` does, and the next step wakes their author to repair them (`skills/radical-pipelines/scripts/README.md` § `land` step 3; `probe-today.txt` § 3).

spec-requirement-8: A message's body is exactly the Markdown its role wrote: no `rp thread` command writes, changes, or removes body text of any message.

origin: from-intent intent-constraint-2

observed: the text before the first heading and between headings is free, and a line starting with `## ` inside fenced code is no heading (`skills/radical-pipelines/scripts/README.md` § Threads). Bodies in this repository's threads hold level-3 headings and lists (`.pipelines/370-rp-next-and-land/threads/`); none holds fenced code (`1-spec/spec/thread-fences.txt`).

spec-requirement-9: An `rp thread` command changes only the thread file it writes, and `rp validate` changes no file. Neither writes or changes a certification or lands a turn: a review thread closed `approved` through `rp` approves its lane only once `rp land` lands the turn.

origin: from-intent intent-constraint-4

observed: `rp land` alone writes `certification/`, and an approval without a certification is stale (`skills/radical-pipelines/scripts/README.md` § Certification, § Net change and approval).

spec-requirement-10: A role runs `rp validate` as its assignment states. For each of the role's files that `rp land` would reject, it prints `INVALID <path>: <reason>`, with the path and reason `rp check` prints for that file; when none is rejected, it says that they are accepted. Given the path of one of the role's files, it reports on that file alone. It reports each file as it stands in the worktree, committed or not. A role's files are its artifact or candidate and every thread whose file name names it as opener or owner.

origin: from-intent intent-goal, intent-proposal-1

observed: today only landing checks a role's files. In `probe-today.txt` § 3, a review thread whose body holds the line `## Summary` met no check until `rp land` stopped on it with `INVALID threads/3-reviewer-default-implementer-implementation.md: message heading must be ## <role> — <commit>: ## Summary`, and the next step woke the reviewer to repair it. `rp check` stops in a review lane's tree (`probe-today.txt` § 2).

observed: a role writes its artifact or candidate and every thread whose file name names it as opener or owner, and the `INVALID` lines of those files are its malformed files (`skills/radical-pipelines/scripts/README.md` § Assignments step 1).

observed: of the checks `rp check` applies to a role's files, two read `run-config.md`, an `open` thread awaiting a review lane it does not declare and a candidate of a production lane it does not declare; every other reads the file alone (`skills/radical-pipelines/scripts/rp.mjs:649`, `:658`, and `parseThread`, `parseFile`).

spec-requirement-11: Run without a path, `rp validate` reports only the role's own files, in the role's own pipeline: no other role's file, and no file of another pipeline folder in the worktree.

origin: from-intent intent-goal, intent-proposal-1

observed: one `INVALID` frontier wakes several roles in the same pipeline worktree, each with only its own lines under **Malformed files** (`probe-today.txt` § 5), and the orchestrator wakes them in one step and lands each as it ends its turn (`skills/radical-pipelines/reference/run/loop.md` § One step, steps 5–6). A worktree of this repository holds, beside its pipeline, the folders of other pipelines (`1-spec/spec/worktree-pipelines.txt`), whose threads today's grammar rejects (`probe-today.txt` § 6: `frontmatter has no status`).

spec-requirement-12: Every `rp thread` command and `rp validate` works in each seat a role runs it from:

- a review lane's tree, which holds only `0-intent/` and the lane's own threads, no `run-config.md`, and no `threads/` folder before its first thread;
- a production lane's worktree;
- the pipeline worktree.

Apart from the thread numbers `threads/` already holds, a missing `run-config.md`, another role's malformed file, or another pipeline folder in the worktree neither stops a command nor changes what it writes or reports.

origin: from-intent intent-constraint-1

observed: before its first review, a review lane's tree holds `0-intent/intent.md` alone, and `rp check` there stops with `rp: .pipelines/demo/run-config.md: pipeline of an earlier format; it is not continued` (`probe-today.txt` § 2), as the lane's view defines (`skills/radical-pipelines/scripts/README.md` § Review lanes). Several roles work in the pipeline worktree while one another's files are rejected (`probe-today.txt` § 5).

spec-requirement-13: A wrong use prints what was wrong and what to run instead, exits with failure, and changes no file. These uses are wrong:

- an unknown `rp thread` subcommand or option, or a missing argument;
- `rp thread reply` or `rp thread close` naming a path that is no thread file of the role's pipeline, and `rp validate` naming a path that is none of the role's files;
- `rp thread open` or `rp thread escalate` by a production lane's role;
- `rp thread open` about the artifact the role owns, or about the intent;
- `rp thread close` with a status other than `approved` or `withdrawn`, or on a thread to `owner`;
- `rp thread reply`, or `rp thread close` with a closing message, by a role that is neither the thread's opener nor its owner;
- `rp thread escalate` citing nothing;
- `rp thread reply` or `rp thread close` on a thread file `rp validate` rejects.

origin: derived intent-constraint-5 — input: each listed use either cannot be carried out or would leave a thread file the thread grammar rejects (`skills/radical-pipelines/scripts/README.md` § Threads), the class of file that wakes its author again today (`probe-today.txt` § 3, § 5).

observed: `rp` reports a wrong use today with `rp: <reason>` on stderr and exit status 1 (`skills/radical-pipelines/scripts/README.md`, the paragraph after the usage block); `rp thread open` prints `rp: unknown command: thread`, naming nothing to run instead (`probe-today.txt` § 1).

spec-requirement-14: No agent profile (`agents/spec-producer.md`, `agents/design-doc-producer.md`, `agents/implementer.md`, `agents/reviewer.md`) states the thread grammar: a thread's file name or number, its header's keys and values, or a message heading's form. Where a profile has its role open, answer, close, or escalate a thread, it names `rp thread open`, `rp thread reply`, `rp thread close`, or `rp thread escalate`. No profile names a skill file or the path of `rp`.

origin: from-intent intent-constraint-3

observed: the producers' and the implementer's profiles state the file name and number under **Threads** and the header and headings under **Formats**, and the reviewer's states the escalation's file name, header, and heading (`agents/spec-producer.md:78`, `:141`–`159`; `agents/design-doc-producer.md:92`, `:168`–`186`; `agents/implementer.md:103`, `:154`–`172`; `agents/reviewer.md:8`–`20`). No profile names a skill file today (`grep -n -i skill agents/*.md` prints nothing).

spec-requirement-15: Each profile has its role run `rp validate` before it ends any turn, and fix each file it reports.

origin: from-intent intent-goal

observed: today each profile's end of turn waits only for the commands and subagents the role started, and a role fixes its files only when a later assignment lists them under **Malformed files** (`agents/spec-producer.md:100`–`102`, `agents/design-doc-producer.md:114`–`116`, `agents/implementer.md:122`–`124`, `agents/reviewer.md:24`).

spec-requirement-16: Every assignment `rp next --apply` writes states how to run `rp` from the role's worktree: a producer's and the implementer's in every mode and seat, and a reviewer's first-turn, later-turn, and repair requests. Run as it states, each command acts as the role the assignment is for: the `rp thread` commands write that role as opener and message author, and `rp validate` reports that role's files.

origin: from-intent intent-constraint-3, intent-goal

observed: no assignment says how to run `rp` today: neither the reviewer's first-turn request nor the implementer's assignment does (`probe-today.txt` § 2, § 4), nor any template; only the repair request mentions `rp check` (`skills/radical-pipelines/templates/reviewer-repair.md:1`). A role's name carries its lane, as `reviewer-default` or `spec-producer-demands` (`skills/radical-pipelines/scripts/README.md` § Threads), and the first-turn request writes it into the header lines it shows (`skills/radical-pipelines/templates/reviewer-first.md:18`, `:23`).

spec-requirement-17: No assignment shows thread structure for its role to write by hand: no file name, header line, heading form, or status edit. A reviewer's first-turn request has it write its review, approval included, through `rp`, and its later-turn request has it answer and approve through `rp`. A review thread path a request names is the path `rp thread open` writes in the reviewer's tree.

origin: derived intent-goal — input: the first-turn request shows the header and heading lines to copy and names `threads/3-reviewer-default-implementer-implementation.md` while the reviewer's tree holds no thread (`probe-today.txt` § 2), and the later-turn request gives the heading to append and the status to set (`skills/radical-pipelines/templates/reviewer-later.md:13`).

observed: the first-turn request names a review thread numbered one past the highest in the pipeline's `threads/` (`skills/radical-pipelines/scripts/README.md` § Assignments step 2), while the reviewer's tree holds only its lane's threads (§ Review lanes).

## Acceptance criteria

spec-acceptance-criterion-1: Given a role's `threads/` folder holding thread files numbered up to `<h>`, or no `threads/` folder, as in a review lane's tree before its first review, when the role runs `rp thread open` for an artifact it questions, then the folder holds `<h + 1>-<role>-<owner>-<artifact>.md`, or `1-<role>-<owner>-<artifact>.md` when it held none. Its header has status `open`, the role as opener, the artifact's owner, and the artifact, and its one message is the role's, headed with the role and the commit `git rev-parse HEAD` printed in the role's worktree when the command ran. A second thread the role opens in the same turn is numbered one higher.

spec-acceptance-criterion-2: Given an `open` thread the role is a party to, when it runs `rp thread reply` and writes its body, then the file ends with a heading naming the role and the commit its worktree stood on, followed by that body. Its header and earlier messages are byte-identical to before, and once the turn lands, `rp check` lists the thread as awaiting the other party.

spec-acceptance-criterion-3: Given an `open` thread the role opened, when it runs `rp thread close` with `approved` or `withdrawn`, with or without a closing message, then the file's status is that value, a closing message when given ends the file under a heading naming the role and the commit its worktree stood on, nothing else in the file differs, and `rp check` lists the thread with that status.

spec-acceptance-criterion-4: Given a role whose disagreement is on what the intent means or demands, when it runs `rp thread escalate` citing its thread or an evidence path, then its `threads/` folder holds `<n>-<role>-owner-intent.md`, numbered as in spec-acceptance-criterion-1, with status `disagreement`, the role as opener, `owner` as owner, `intent` as artifact, `cites` holding what it cited, and one message, the role's, headed with the role and the commit its worktree stood on. Once the turn lands, `rp check`'s frontier is `escalate` for that thread.

spec-acceptance-criterion-5: Given a reviewer that would merge the change, on its first turn or on a later turn after the implementer answered, when it approves through `rp` as its request says, then its review thread is `approved` and holds a message of its own from that turn, and after `rp land` lands the turn, `rp check` reports `review <lane> approved`.

spec-acceptance-criterion-6: Given any thread file an `rp thread` command writes, when `rp validate` checks it, and `rp check` checks the pipeline once the turn lands in a pipeline whose `run-config.md` declares the file's lanes, then neither prints an `INVALID` line for it, and `rp check` lists it with the status and awaited role of a hand-written file of the same content.

spec-acceptance-criterion-7: Given a message body of free Markdown, holding level-3 headings, lists, and fenced code with lines inside it that start with `## `, when its thread is opened, replied to, or closed through `rp`, then that body reads byte for byte as the role wrote it.

spec-acceptance-criterion-8: Given a worktree with no uncommitted change, when an `rp thread` command succeeds, then `git status` shows only that thread file added or changed; after `rp validate`, it shows no change. No `rp thread` command or `rp validate` run creates or changes a file under `certification/` or moves a branch, and a review thread closed `approved` through `rp` in a lane whose turn is not landed is no approval in `rp check` of the pipeline.

spec-acceptance-criterion-9: Given a file the role writes that `rp land` would reject, committed or not, when the role runs `rp validate` as its assignment states, then it prints the `INVALID <path>: <reason>` line `rp check` prints for that file. Given only accepted files, it says that they are accepted, `rp land` lands the turn without stopping on a file it brings, and the next `rp next` plan names no `INVALID` or `repair` line for them. Given the path of one of the role's files, it reports on that file alone.

spec-acceptance-criterion-10: Given a pipeline worktree where one `INVALID` frontier woke several roles, each for its own file, and a worktree holding other pipeline folders whose files today's grammar rejects, when a role runs `rp validate` without a path, then it prints a line for each of its own rejected files and none for any other file.

spec-acceptance-criterion-11: Given a review lane's tree with no `run-config.md` and no `threads/` folder, a production lane's worktree, or a pipeline worktree where another role's file is malformed, when the role there runs an `rp thread` command or `rp validate` as its assignment states, then the command writes and reports what it would were every other file well-formed and a `run-config.md` present, and none stops on the missing configuration.

spec-acceptance-criterion-12: Given each wrong use spec-requirement-13 lists, when it runs, then it prints what was wrong and the command to run instead, exits with failure, and no file in the worktree changes. `rp thread open` about the intent names `rp thread escalate`; `rp thread close` with another status names `approved` and `withdrawn`; a reply or close on a thread file `rp validate` rejects names the rejection's reason.

spec-acceptance-criterion-13: Given each of the four agent profiles, when it is read, then it states no thread file name or number, no header key or value, and no message heading form, names no skill file and no path of `rp`, and names `rp thread open`, `rp thread reply`, `rp thread close`, or `rp thread escalate` where its role opens, answers, closes, or escalates a thread.

spec-acceptance-criterion-14: Given each of the four agent profiles, when it is read, then its role runs `rp validate`, and fixes each file it reports, before ending any turn.

spec-acceptance-criterion-15: Given any assignment `rp next --apply` writes, for any role in any seat and mode, a reviewer's first-turn, later-turn, and repair requests included, when the role runs `rp` from its worktree as the assignment states, then `rp` runs, the `rp thread` commands write that role as opener and message author, and `rp validate` reports that role's files.

spec-acceptance-criterion-16: Given any assignment `rp next --apply` writes, when it is read, then it shows no thread file name, header line, heading form, or status edit for its role to write by hand. A reviewer's first-turn and later-turn requests name the `rp thread` commands that open, answer, and approve, and any review thread path a first-turn request names is the path `rp thread open` writes in the reviewer's tree.

## Exclusions

spec-exclusion-1: `rp validate` does not report an `open` thread awaiting a review lane `run-config.md` does not declare, or a candidate of a production lane it does not declare. `rp check` and `rp land` still reject both.

spec-exclusion-2: A body line starting with `## ` outside fenced code that is no message heading stays rejected, by `rp validate`, `rp check`, and `rp land` alike.

spec-exclusion-3: `rp check`, `rp next`, and `rp land` reject the same files for the same reasons as before: a file a role commits that `rp land` rejects still stops the landing, and the next step still wakes its author with **Malformed files**.

spec-exclusion-4: No command edits or removes a message, deletes a thread, or reopens a closed thread.

spec-exclusion-5: The owner's answer on a thread to `owner`, its `## owner — <commit>` message and its status `answered`, is not written through `rp`.

## Considered and not required

- `rp thread reply` or `rp thread close` on a thread that is not `open`, and `rp thread close` by the thread's owner, as wrong uses — the reading of intent-constraint-5 not taken: no intended use produces them, since every message a role added in this repository's threads went to an `open` thread and every thread a role closed was closed by its opener (observed: `1-spec/spec/thread-history.txt`); the reading taken refuses a use that cannot be carried out or whose result the thread grammar rejects.
- A role choosing the commit its message heading names — of the 35 headings roles wrote by hand, 34 name the commit the writer's worktree stood on and the other a commit whose spec is the same (observed: `1-spec/spec/heading-commits.txt`).
- `rp validate` reporting every pipeline file under a path, the current directory by default — the reading of intent-proposal-1 not taken: the proposal names a role's own files, and roles woken together in the pipeline worktree each get only their own (observed: `probe-today.txt` § 5).
- A `## ` line outside fenced code in a body read as body text — the reading of intent-constraint-2's "free Markdown" that changes the grammar is not taken: the grammar already calls the text between headings free while every such line is a heading (`skills/radical-pipelines/scripts/README.md` § Threads), no thread in this repository's history holds one (observed: `1-spec/spec/thread-headings-scan.txt`), and `rp validate` reports one within the turn (spec-requirement-10).
- The body's format (`### Finding <n>`, `### <point>: changed in | stands | owned by`) leaving the profiles — the reading of intent-constraint-3's "thread grammar" that includes it is not taken: the Goal gives `rp` the header, the file name and number, and the headings, and intent-constraint-2 gives the body to the role.
- The orchestrator's answer on a thread to `owner` written through `rp` — the reading of intent-goal that covers it is not taken: the Goal names roles, and intent-context-1 traces the `INVALID` lines to the grammar the four profiles have roles write by hand; the orchestrator writes the answer (observed: `skills/radical-pipelines/reference/run/loop.md:40`).
- A role writing in a `disagreement` thread — no role is woken while one exists: it puts `escalate` on the frontier until the orchestrator closes it `answered` (observed: `skills/radical-pipelines/scripts/README.md` § Frontier, rule 2; `skills/radical-pipelines/reference/run/loop.md` § Owner escalation).
- A reviewer opening a thread to an owner other than `implementer` or `owner` — its requests and profile have it write only its review thread and its escalation, and its lane's view holds no other thread (observed: `skills/radical-pipelines/templates/reviewer-first.md`, `agents/reviewer.md`, `skills/radical-pipelines/scripts/README.md` § Review lanes).
- An `open` thread awaiting an undeclared review lane, or a candidate of an undeclared production lane, among a role's files — no intended use produces either: the commit that drops a lane closes its open threads `withdrawn` and removes its candidate folder (observed: `skills/radical-pipelines/reference/run/state.md:108`), and a lane writes its candidate at the **Write to** its assignment names.
- A reason `rp validate` prints that names no form to write, such as `frontmatter has no opener` — only a header written by hand produces it (observed: `skills/radical-pipelines/scripts/rp.mjs:602`), and `rp` writes every header (spec-requirement-1).
- `rp thread escalate` checking that what `cites` names exists — `rp check` does not resolve `cites`, and the orchestrator reads what it names at escalation (observed: `skills/radical-pipelines/scripts/README.md` § Threads; `skills/radical-pipelines/reference/run/loop.md` § Owner escalation).
- Two threads opened in parallel lanes with the same number — threads may share a number, and the opener in the file name keeps their paths distinct (observed: `skills/radical-pipelines/scripts/README.md` § Threads; `skills/radical-pipelines/reference/run/state.md:75`).
- A failing exit status or a JSON output for `rp validate` — `rp check` exits 0 on an `INVALID` frontier and roles read printed lines (observed: `skills/radical-pipelines/scripts/README.md`, the paragraph after the usage block, § `check`); no source shows a consumer branching on either.
- `rp validate` at a commit instead of the working tree — roles check their files before they commit, and no source shows a consumer validating a commit without a run configuration.
- A thread file with CRLF line endings — no thread in this repository holds one (observed: `grep -l $'\r' .pipelines/*/threads/*.md` prints nothing), and the grammar accepts one (observed: `scripts/test/rp/threads.test.mjs:38`).

## Open assumptions

spec-assumption-1: A role that has the command names from its profile and how to run `rp` from its assignment, and nothing else, finds each command's arguments in `rp`'s own output and writes its threads through `rp` within its turn — assumed: a role in each seat (a review lane, a production lane, the pipeline worktree) opens, answers, closes, escalates, and validates through `rp`, using only its profile, its assignment, and `rp`'s output.

spec-assumption-2: Roles that write their threads through `rp` and run `rp validate` before ending their turns leave no file of theirs for `rp land` to reject — assumed: the plans of the next full pipeline run after the change name no `INVALID` or `repair` line for a file a role wrote.
