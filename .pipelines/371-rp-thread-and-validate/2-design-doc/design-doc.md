---
{
  "inputs": [
    "1-spec/spec.md@4d1cb7f5309f"
  ]
}
---
# Design Doc: Roles write threads and check their own files through `rp`

## Overview

Today a role writes every thread by hand — its file name and number, its header, and each message heading — from the grammar four profiles and the reviewer's requests repeat, and no check reaches its files before `rp land` rejects one and the next step wakes it again for a whole turn. `rp check`, the only checker, stops in a review lane's tree, which holds no `run-config.md`.

The change adds five role-facing commands to `rp`. `rp thread open`, `rp thread reply`, `rp thread close`, and `rp thread escalate` take the role's pipeline folder, its role, and the message body the role writes, and write everything around that body: the file name and number, the header and its status, and each heading, naming the commit the role's worktree stands on. A command writes only a file the file grammar accepts and reads as intended; otherwise it says what was wrong and what to run instead, and changes nothing. `rp validate` applies the same file grammar, without the run configuration, to the role's own files as they stand in its worktree, and prints the `INVALID` lines `rp check` prints for them. Every assignment states the exact command that runs `rp` as its role; the reviewer's requests and the four profiles name the commands instead of the grammar, and every profile has its role run `rp validate` before it ends a turn. `rp check`, `rp next`'s dispatch, and `rp land` keep their behavior.

## Architecture

New components, in `skills/radical-pipelines/scripts/rp.mjs`:

- **`rp thread`** — `open`, `reply`, `close`, `escalate`. Writes a thread's structure and the role's message in the role's worktree, and refuses every wrong use. It reads the thread it writes, the file names under `threads/`, the body the role gives, and the `HEAD` of the worktree that holds the pipeline folder; it writes that one thread file.
- **`rp validate`** — reports which of the role's files the file grammar rejects. It reads only the role's files and writes nothing.

Modified components:

- **The file grammar** — the checks of a pipeline file that read the file alone: the thread grammar and each other kind's frontmatter and name checks (observed: `rp.mjs:597`–`660`). It becomes the judge `rp validate` and `rp thread` apply alone; `rp check` and `rp land` apply it and, on top, the two checks that read `run-config.md` (observed: `rp.mjs:649`, `:658`). What it rejects, and the reason it gives, are unchanged.
- **The command line** — `thread` with four subcommands, and `validate`, beside `check`, `pipelines`, `next`, and `land`; the usage lists them (observed today: `rp.mjs:1710`–`1757`).
- **Assignments** (`rp next --apply`) — every role's template is given the command that runs `rp` as that role. The reviewer's first-turn request names no thread path, so `next` no longer numbers a new review thread (observed today: `rp.mjs:1295`–`1301`).
- **Templates** — `spec-producer.md`, `design-doc-producer.md`, `implementer.md`, `reviewer-first.md`, `reviewer-later.md`, `reviewer-repair.md`, and `templates/README.md`'s values.
- **Profiles** — `agents/spec-producer.md`, `agents/design-doc-producer.md`, `agents/implementer.md`, `agents/reviewer.md`.
- **Documentation** that names `rp`'s commands or says how a thread is written: `skills/radical-pipelines/scripts/README.md`, `templates/README.md`, `reference/run/state.md`, `docs/model.md`, `docs/glossary.md`, and `README.md`.

Untouched but relevant:

- `rp check`'s frontier and listing; `rp land`'s validation, which still applies the run-configuration checks, and its certification of an approval at the commit its reviewer's last heading names (observed: `rp.mjs:1682`–`1686`).
- The lane's view: a review lane's tree holds `0-intent/` and the lane's own threads only (observed: `scripts/README.md` § Review lanes).
- The awaited-role rule (observed: `rp.mjs:730`–`733`) and the criterion that picks a role's files from its artifact or candidate and the thread names that name it (observed: `rp.mjs:1237`–`1251`).
- The orchestrator's answer on a thread to `owner`, written by hand (spec-exclusion-5; observed: `reference/run/loop.md` § Owner escalation).

Data flow:

1. `rp next --apply` writes each assignment with the command that runs `rp` as its role.
2. The role runs `rp thread` with each message's body; one thread file changes in its worktree, and the command prints its path.
3. Before ending its turn, the role runs `rp validate`, fixes each file it reports, and commits.
4. The orchestrator runs `rp land` as today: it validates with the run configuration, certifies, and lands.

Post-change coherence:

- **Narrowed.** The first-turn request names no thread path, and `templates/README.md`'s `thread` value belongs to the later-turn request alone. `next`'s numbering of a new review thread loses its purpose and goes: `rp thread open` and `rp thread escalate` are the one place a thread number is computed.
- **Left without purpose, removed.** The thread header and heading forms in the producers' and the implementer's **Formats**, and the definition of the commit a heading names; the file name and number in their **Threads**; the reviewer profile's escalation lines; the first-turn request's header block and status edit; the later-turn request's heading and status edit.
- **Widened.** `rp` admits the five commands; their consumers are the roles, through the command their assignment states, and `rp --help` lists them. The template values admit the command that runs `rp`, which every role template consumes. The file grammar gains `rp validate` and `rp thread` as callers.

## Decisions

design-doc-decision-1: `rp` writes each message whole, around the body the role gives it

**Serves:** spec-requirement-1, spec-requirement-2, spec-requirement-3, spec-requirement-4, spec-requirement-8, spec-acceptance-criterion-1, spec-acceptance-criterion-2, spec-acceptance-criterion-3, spec-acceptance-criterion-4, spec-acceptance-criterion-7
**Decision:** `rp thread open`, `reply`, and `escalate` take the message body through `--body <file | ->`, required; `rp thread close` takes it optionally, and giving it is giving a closing message. `rp` reads the body's bytes from the file, or from standard input only when given `-`, and writes them unchanged under the heading it writes. `open` and `escalate` create the file with its header and the role's message; `reply` adds the role's message at the end; `close` sets the status and, with a body, adds the closing message at the end. Every byte already in the file stays as it was, but for the status value `close` sets. No command authors, alters, or removes body text: the role writes each body itself, and `rp` places it, which is how spec-requirement-8's "writes no body text" is read.
**Alternatives:**
- `rp` writes the header and the heading and the role adds the body by editing the file — the reading of intent-constraint-2 under which `rp` handles no byte of a body. Rejected: the role edits the file after `rp`, so the header and the earlier messages being byte-identical (spec-acceptance-criterion-2) rests on that edit, and a body the grammar misreads — a `## ` line outside fenced code, or a fence left open, which hides every later heading (`2-design-doc/design-doc/probes.txt` § 3, § 4) — is found only by a later `rp validate`. Given the body, the command that would write it refuses it (design-doc-decision-4).
- The body read from standard input by default — rejected: a role's shell tool gives a command it runs without input an empty standard input (`2-design-doc/design-doc/probes.txt` § 2), so a body the role leaves out would be read as empty without a word, where a required `--body` names what is missing.
- The body as an argument — rejected: a shell rewrites the backticks and `$` that Markdown bodies hold in an unquoted or double-quoted argument.
**Trade-offs:** the role passes each body through a file or a quoted heredoc, one more element in its command. A body file the role leaves in its worktree can be committed with its turn (Risks).
**Claims:**
- observed: a quoted heredoc reaches a command's standard input byte for byte, backticks, `$`, and fenced `## ` lines included, and this seat's shell tool gives a command an empty standard input (`2-design-doc/design-doc/probes.txt` § 1, § 2, from `probes.sh`).
- observed: the thread grammar reads the text between headings as free and skips `## ` lines inside fenced code (`rp.mjs:619`–`628`; `scripts/README.md` § Threads).
- assumed: a role in each seat passes its bodies through `--body`, and its threads read as it wrote them — the threads of the next full pipeline run, written through `rp`, confirm it (spec-assumption-1).

design-doc-decision-2: Every role command takes the role's pipeline folder and `--role`

**Serves:** spec-requirement-11, spec-requirement-12, spec-requirement-13, spec-requirement-16, spec-acceptance-criterion-10, spec-acceptance-criterion-11, spec-acceptance-criterion-15
**Decision:** the five commands take the role's pipeline folder as their one positional argument, as `check`, `next`, and `land` take theirs, and `--role <role>`, as `land` takes it (Interfaces). The pipeline folder selects the repository, the worktree, and the role's pipeline; `--role` names the role the command acts as, its opener or message author, or whose files it reports. Every other path — `--thread`, `--file`, `--body` — resolves against the process directory, as every path argument of `rp` does. `--role` takes a role's name as the thread grammar defines it, `<profile>[-<lane>]`; any other value is a wrong use. No command reads `run-config.md`, the step record, or an assignment to learn the role or its pipeline. "Run without a path" (spec-requirement-11) is `rp validate` without `--file`.
**Alternatives:**
- `rp thread reply <thread>` and `rp thread close <thread>`, the pipeline taken from the thread's path, and `rp validate [<path>]`, the pipeline taken from the process directory — rejected: the process directory is the role's worktree, which holds other pipelines' folders (`1-spec/spec/worktree-pipelines.txt`), so it names no pipeline; and a thread path would then define the role's pipeline instead of being checked against it (spec-requirement-13).
- The role or the pipeline in environment variables — rejected: absent from the command the role runs and from its output, while `land --role` already names a role on the command line.
- The role inferred from the step record or from the assignment in the worktree's git directory — rejected: the pipeline worktree seats several roles in one step (`1-spec/spec/probe-today.txt` § 5), and intent-constraint-1 leaves the commands the file grammar alone.
**Trade-offs:** every command repeats the pipeline folder and the role; the assignment states them once, in the command the role copies (design-doc-decision-7).
**Claims:**
- observed: `rp` accepts options and its one positional argument in any order, and resolves a path argument against the process directory (`rp.mjs:1717`–`1733`, `:165`–`183`).
- observed: `land` names its role with `--role` (`scripts/README.md` § `land`).

design-doc-decision-3: A new thread is numbered from the thread names its worktree holds

**Serves:** spec-requirement-1, spec-requirement-4, spec-requirement-12, spec-acceptance-criterion-1, spec-acceptance-criterion-4, spec-acceptance-criterion-11
**Decision:** `rp thread open` writes `<pipeline folder>/threads/<n>-<role>-<owner>-<artifact>.md`, `<owner>` the profile that owns the artifact, and `rp thread escalate` writes `<n>-<role>-owner-intent.md` there. `<n>` is one more than the highest number among the names `threads/<n>-….md` in the working tree, the role's uncommitted threads and malformed files included, or 1 when it holds none or is absent; the command creates `threads/` when absent. Neither replaces an existing file.
**Alternatives:**
- Numbering over the pipeline branch's threads, as the first-turn request numbers today — rejected: a review lane's tree holds only its own threads (`1-spec/spec/probe-today.txt` § 2), and intent-constraint-1 admits no other source; threads may share a number, and the opener in the name keeps paths distinct (`scripts/README.md` § Threads).
- Numbering over `HEAD`'s tree — rejected: a second thread opened before the role commits would take the first's number and path (spec-acceptance-criterion-1).
**Trade-offs:** a review lane's thread numbers count its own threads only, so they may be lower than other roles' in the pipeline; review approval and the later-turn request read a lane's highest-numbered review thread among its own (observed: `rp.mjs:586`–`588`).
**Claims:**
- observed: a review lane's tree holds no `threads/` folder before its first review (`1-spec/spec/probe-today.txt` § 2), and one implementer turn opened two threads (`1-spec/spec/thread-history.txt`, commit `cd370c32`).

design-doc-decision-4: A thread command writes only a file the grammar accepts and reads as intended, or refuses and changes nothing

**Serves:** spec-requirement-2, spec-requirement-3, spec-requirement-7, spec-requirement-8, spec-requirement-9, spec-requirement-13, spec-acceptance-criterion-6, spec-acceptance-criterion-7, spec-acceptance-criterion-8, spec-acceptance-criterion-12
**Decision:**
- A `reply` or `close` on a thread file the file grammar rejects (design-doc-decision-6) is refused, naming the rejection's reason.
- The uses spec-requirement-13 lists are refused: a missing argument or an unknown subcommand or option, and a `--role` that is no role's name; a `--thread` that is no thread file of the pipeline folder; a `reply` to a thread that does not await the role; a `close` by a role other than the opener, on a thread that is not `open`, or with a status other than `approved` or `withdrawn`; an `open` or `escalate` by a production lane's role; an `open` about the intent or about the artifact the role owns; an `escalate` with an empty `--cites`; and an approval design-doc-decision-5 refuses.
- A command writes a file only when the file grammar accepts it and reads, under the header the command intends, the role's message as the last, headed as the command wrote it. Otherwise it is refused, naming what the grammar read, such as a body line read as a heading.
- A refusal prints `rp: ` and what was wrong, then what to run instead, to standard error, exits 1, and writes nothing. It names the remedies spec-acceptance-criterion-12 lists: `rp thread escalate` for the intent, `approved` and `withdrawn` for another status, the rejection's reason for a rejected thread file, the role a thread awaits, and the same command with `--body` for an approval without a closing message.
- A command that succeeds changes its one thread file: no other file, no certification, ref, index, or commit. No command edits or removes a message, deletes a thread, or reopens a closed one. The owner's answer is never written through `rp`, by these rules alone: a thread to `owner` is never `open`, so it awaits no one and no role closes it, and `answered` is no status `close` takes.
**Alternatives:**
- Refusing only the uses that cannot be carried out, leaving every other mistake to `rp validate` — rejected: spec-requirement-7 has every file a command writes accepted, and a body that leaves a fence open is accepted while it hides the heading written after it (`2-design-doc/design-doc/probes.txt` § 3), which only reading the file the command would write catches.
- Checking bodies with rules of their own, such as no `## ` line and balanced fences — rejected: a second statement of the grammar; reading the file to be written with the grammar covers every body the grammar misreads.
**Trade-offs:** a role whose body holds a `## ` line outside fenced code edits the body and runs the command again. A thread file a role broke by hand is repaired by hand, then checked with `rp validate`.
**Claims:**
- observed: `rp` reports a wrong use as `rp: <reason>` on standard error with exit status 1 (`scripts/README.md`, the paragraph after the usage block; `rp.mjs:1748`–`1756`).
- observed: a fence left open in one message hides every later heading, and a `## ` line outside fenced code that is no heading is rejected (`2-design-doc/design-doc/probes.txt` § 3, § 4).

design-doc-decision-5: A heading names the commit the role's worktree stands on; an approval without a closing message needs the reviewer's own last message there

**Serves:** spec-requirement-5, spec-requirement-6, spec-acceptance-criterion-1, spec-acceptance-criterion-2, spec-acceptance-criterion-3, spec-acceptance-criterion-4, spec-acceptance-criterion-5
**Decision:** every heading a command writes is `## <role> — <commit>`, `<commit>` the full hash `HEAD` names in the worktree that holds the given pipeline folder when the command runs. `rp thread close --status approved` without `--body` on a review thread is refused unless the thread's last message is the role's own and names that commit; the refusal names the same command with `--body`. `rp land` is unchanged: it certifies an approval at the commit the reviewer's last heading names, which through `rp` is the commit the reviewer's worktree stood on — the change, or a commit of the reviewer's own on it.
**Alternatives:**
- The role choosing the commit a heading names — not taken in the spec (Considered and not required).
- Accepting a last message that names another commit holding the change's code — rejected: spec-requirement-13 states the condition by commit, and a reviewer that committed between its message and its approval gives a closing message, in the same command.
**Trade-offs:** a reviewer that commits its review before approving it gives a closing message.
**Claims:**
- observed: 34 of the 35 headings roles wrote name the commit their worktree stood on (`1-spec/spec/heading-commits.txt`).
- observed: an approval set without a new message on a later turn lands uncertified, and the lane reviews again (`1-spec/spec/probe-approval.txt` § 3).

design-doc-decision-6: The file grammar judges a file alone, and `rp validate` applies it to the role's files

**Serves:** spec-requirement-7, spec-requirement-9, spec-requirement-10, spec-requirement-11, spec-requirement-12, spec-acceptance-criterion-6, spec-acceptance-criterion-8, spec-acceptance-criterion-9, spec-acceptance-criterion-10, spec-acceptance-criterion-11
**Decision:**
- The file grammar, every check of a pipeline file that reads the file alone, is one component. `rp check` and `rp land` apply it and the two run-configuration checks; `rp validate` and `rp thread` apply it alone. A file it rejects gets the reason `rp check` prints.
- `rp validate` reads, from the working tree, the role's files alone: its artifact or candidate, and each thread under `threads/` whose file name names it as opener or owner — the criterion that picks a role's malformed files. With `--file`, it reads that file, which must be one of them.
- It prints `INVALID <path>: <reason>`, the path relative to the pipeline folder, for each rejected file, as `rp check` prints it; when none is rejected, a line saying the role's files are accepted. It exits 0 either way, as `rp check` does on an `INVALID` frontier. A role's file that cannot be read stops it as it stops `rp check`.
- It reads no `run-config.md`, intent, certification, or other role's file, and writes nothing.
**Alternatives:**
- Reading the pipeline as `rp check` does and keeping the role's lines — rejected: `rp check` stops in a review lane's tree (`1-spec/spec/probe-today.txt` § 2), and a file of the wrong kind anywhere in the pipeline stops the whole reading (observed: `rp.mjs:378`–`399`), against spec-requirement-12.
- Applying the run-configuration checks when `run-config.md` is present — rejected: the same file would be reported in one seat and accepted in another; spec-exclusion-1 leaves both checks to landing.
- A configuration made up to declare every lane — rejected: configuration invented to silence two checks.
- A failing exit status when a file is rejected — not taken in the spec (Considered and not required); `rp check`'s convention is kept.
- `rp check <pipeline folder> --role <role>`, `check` reshaped to judge a role's files without the run configuration, instead of a command of its own — rejected: the spec names `rp validate`, and `check` reports the pipeline's frontier, computed under a run configuration a review lane's tree lacks.
**Trade-offs:** the two run-configuration rejections reach a role through landing alone (spec-exclusion-1).
**Claims:**
- observed: of the checks of a role's files, two read `run-config.md` and every other reads the file alone (`rp.mjs:645`–`660`).
- observed: a role's files are its artifact or candidate and each thread whose file name names it (`rp.mjs:1237`–`1251`; `scripts/README.md` § Assignments step 1).

design-doc-decision-7: Every assignment states the command that runs `rp` as its role

**Serves:** spec-requirement-16, spec-acceptance-criterion-15
**Decision:** `rp next --apply` gives every template — the producers' and the implementer's in every mode and seat, and the reviewer's first-turn, later-turn, and repair requests — the command that runs `rp` as the role from its worktree: `node` and the absolute path of the `rp` script applying the step, with the role's pipeline folder in its worktree and `--role <role>` for every command the role runs. Each template states it; `templates/README.md` documents what each template is given. Every path an assignment puts on a command line — the script, the pipeline folder, and a thread — is written as one POSIX shell word: as written when every character in it is one a shell takes literally, quoted otherwise. Every path an assignment shows for the role to read stays the path as written. A path that needs no quoting reads the same on a command line and in prose. An assignment written again for an unchanged turn stays byte-identical.
**Alternatives:**
- Each path inserted as written, a path holding a space left under Risks — rejected: `rp`'s documentation already allows for spaces in the absolute paths it writes for its consumers (`scripts/README.md` § Plan: "every path is absolute, and a value that may hold spaces ends its line"), and in a repository whose path holds one, every command an assignment states fails (`2-design-doc/design-doc/paths-with-spaces.txt`).
- Each path quoted wherever it appears, prose included — rejected: the later-turn request shows its thread, and the repair request its pipeline folder, as paths the reviewer reads with its file tools, where quotes are no part of the path.
- A wrapper script written beside the assignment — rejected: a written, executable file per role for a command the assignment can state.
- The copy of `rp` in the role's worktree — rejected: a project that uses the skill has none, and this repository's worktrees hold the code under change.
- Node's absolute executable path instead of `node` — rejected: `rp` is documented and run as `node <this skill's folder>/scripts/rp.mjs` (observed: `reference/run/state.md:3`).
**Trade-offs:** the script lies in the orchestrator's installation of the skill, outside the role's worktree; a tool that asks permission to run it blocks the role until the owner answers (design-doc-assumption-1). A path that needs quoting reads quoted on a command line and as written in prose, two forms in one assignment.
**Claims:**
- observed: `rp` finds its templates from its own location (`rp.mjs:1190`), and no assignment says how to run `rp` (`1-spec/spec/probe-today.txt` § 2, § 4).
- observed: a template inserts each value as written (`templates/README.md` § Syntax). In a repository whose path holds a space, the command an assignment states exits 1 with `rp: validate: unexpected argument: space/.pipelines/demo`, and the same command with its script and pipeline folder each one shell word runs (`2-design-doc/design-doc/paths-with-spaces.txt`, at commit `9c659cdd`).
- observed: the reviewer's requests put the pipeline folder and the thread both on command lines and in prose (`templates/reviewer-later.md:13`, `:16`, `:24`; `templates/reviewer-repair.md:1`, `:8`).

design-doc-decision-8: The reviewer's requests write through `rp`, and the first-turn request names no thread path

**Serves:** spec-requirement-6, spec-requirement-17, spec-acceptance-criterion-5, spec-acceptance-criterion-16
**Decision:** the first-turn request has the reviewer write its review with `rp thread open` about the implementation and, when it would merge the change as it stands, close it `approved` with `rp thread close`; it names no thread path and shows no header line, heading, or status edit. The later-turn request names the open review thread and the diff, and has the reviewer answer with `rp thread reply`, or approve with `rp thread close` and a closing message. The repair request lists the malformed files and has the reviewer check its fix with `rp validate`. Every request carries the command of design-doc-decision-7.
**Alternatives:**
- Naming the new thread's path, numbered from the lane's own threads — rejected: a second place that numbers threads, holding only for the first thread the reviewer opens.
**Trade-offs:** none beyond design-doc-decision-5's.
**Claims:**
- observed: the first-turn request numbers its thread past the pipeline's highest while the reviewer's tree holds none (`rp.mjs:1299`–`1300`; `1-spec/spec/probe-today.txt` § 2).

design-doc-decision-9: Profiles name the commands and have their role run `rp validate` before it ends a turn

**Serves:** spec-requirement-14, spec-requirement-15, spec-acceptance-criterion-13, spec-acceptance-criterion-14
**Decision:** the four profiles state no thread file name or number, header key, or heading form, and name no skill file or path of `rp`. Where their role opens, answers, closes, or escalates a thread, they name `rp thread open`, `rp thread reply`, `rp thread close`, or `rp thread escalate`, run as the assignment states. Each has its role run `rp validate` and fix each file it reports before it ends any turn. They keep the body's format: findings numbered across the thread, and the answer to each point. They keep telling the opener when to close a thread approving its findings and when withdrawing them, which `rp thread close` carries out. The reviewer's escalation lines become `rp thread escalate`, citing its review thread.
**Alternatives:**
- The thread grammar kept in the profiles as a reference beside the commands — rejected: intent-constraint-3 takes it out of them.
- The body's format leaving the profiles — not taken in the spec (Considered and not required).
**Claims:**
- observed: the producers' and the implementer's profiles state the thread file name and number under **Threads** and the header and headings under **Formats**, and the reviewer's the escalation's file name, header, and heading (`agents/spec-producer.md:78`, `:141`; `agents/design-doc-producer.md:92`, `:168`; `agents/implementer.md:103`, `:154`; `agents/reviewer.md:8`–`20`); each profile's end of turn waits only for its commands and subagents (`agents/implementer.md:124`, `agents/reviewer.md:24`).

## Interfaces

```text
node rp.mjs thread open <pipeline folder> --role <role> --artifact <spec | design-doc | implementation> --body <file | ->
node rp.mjs thread reply <pipeline folder> --role <role> --thread <thread file> --body <file | ->
node rp.mjs thread close <pipeline folder> --role <role> --thread <thread file> --status <approved | withdrawn> [--body <file | ->]
node rp.mjs thread escalate <pipeline folder> --role <role> --cites <thread path | evidence path> --body <file | ->
node rp.mjs validate <pipeline folder> --role <role> [--file <path>]
```

- `open` writes `threads/<n>-<role>-<owner>-<artifact>.md` (design-doc-decision-3): status `open`, opener the role, owner the artifact's owner (`spec-producer`, `design-doc-producer`, or `implementer`), artifact as given, and one message.
- `escalate` writes `threads/<n>-<role>-owner-intent.md`: status `disagreement`, opener the role, owner `owner`, artifact `intent`, `cites` the text given, written so the frontmatter grammar reads that text back, and one message.
- `reply` adds the role's message at the end. `close` sets the status and, with `--body`, adds the closing message at the end.
- A message is `## <role> — <full hash of HEAD>` followed by the body (design-doc-decision-1, design-doc-decision-5). The header and headings are those `scripts/README.md` § Threads defines, which this change leaves as they are.
- Each thread command prints the absolute path of the thread file it wrote and exits 0; `--thread` accepts it.
- `validate` prints `INVALID <path>: <reason>` for each of the role's rejected files, or one line saying its files are accepted, and exits 0.
- A wrong use prints `rp: ` with what was wrong and what to run instead to standard error, exits 1, and changes no file (design-doc-decision-4). An input that cannot be read — the pipeline folder, a body file, a thread file that is no regular file, `HEAD` — prints `rp: <reason>`, exits 1, and changes no file.
- `rp --help` lists the five forms beside the four existing ones.
- Assignments: every template is given the command that runs `rp` as its role, each path on a command line one POSIX shell word and each path shown for reading as written (design-doc-decision-7); the first-turn request is given no thread path (design-doc-decision-8).
- `check`, `pipelines`, `next`, and `land` keep their signatures and output.

## Dependencies

- Node and Git, as today; `HEAD` is read through Git. `rp` stays free of dependencies (observed: `rp.mjs:2`). No new dependency.
- Internal: the file grammar, the criterion of a role's files, and the awaited-role rule, all existing.
- The `rp` script of the orchestrator's installation of the skill, which roles run by its absolute path (design-doc-decision-7).

## Failure modes and observability

- **A wrong use** — refused with what was wrong and what to run instead (design-doc-decision-4); the role reads it in the command's output and runs the right command within its turn.
- **A body the grammar misreads** — refused, naming what the grammar read; the role edits the body and runs the command again.
- **A thread file broken by hand** — `reply` and `close` refuse it with the reason; `rp validate` reports it; the role repairs it by hand.
- **Two opens that compute one number in one worktree** — the second finds its path taken and stops without replacing the file; run again, it takes the next number. Roles that write concurrently in the pipeline worktree write distinct names, the opener being in each.
- **A role that skips `rp validate`, or a file only the run configuration rejects** (spec-exclusion-1) — landing rejects it as today, and the next step wakes its author with **Malformed files** (spec-exclusion-3).
- **The stated command fails to start**, the script moved or Node missing — the role's shell reports it, and the role reports a blocker naming its seat, as its profile has it.
- **A tool asks permission to run the script** — the role waits on a pending permission request, which the owner sees and answers (observed: `tools/opencode.md:33`, `tools/claude-code.md:28`).

## Verification

- new test at the `rp thread open` and `rp thread escalate` command line — design-doc-decision-1, design-doc-decision-3, design-doc-decision-5, spec-acceptance-criterion-1, spec-acceptance-criterion-4 — the file each writes is named and numbered one past the highest thread number its folder holds, 1 when it holds none or is absent, and a second one in the turn one higher; its header is the role's thread to the artifact's owner, or its escalation citing what it was given; its one message is the role's, headed with the commit `HEAD` names, holding the body as given.
- new test at the `rp thread reply` and `rp thread close` command line — design-doc-decision-1, design-doc-decision-5, spec-acceptance-criterion-2, spec-acceptance-criterion-3 — a reply leaves the header and earlier messages byte-identical, ends the file with the role's message, and leaves the thread awaiting the other party; a close sets the status, ends the file with a closing message only when one is given, and changes nothing else.
- new test at the `rp thread` command line — design-doc-decision-1, design-doc-decision-4, spec-acceptance-criterion-7 — a body of level-3 headings, lists, and fenced code holding `## ` lines reads back byte for byte after an open, a reply, and a close; a body the grammar would read as holding a heading, or that would hide the next one, is refused and nothing is written.
- new test at the `rp thread` and `rp validate` command line — design-doc-decision-2, design-doc-decision-4, design-doc-decision-5, spec-acceptance-criterion-12 — each wrong use spec-requirement-13 lists exits with failure, names what was wrong and what to run instead, with the remedies spec-acceptance-criterion-12 names, and leaves every file in the worktree unchanged.
- new test at the `rp thread` and `rp validate` command line — design-doc-decision-4, design-doc-decision-6, spec-acceptance-criterion-8 — a thread command that succeeds changes only its thread file, `rp validate` changes none, and neither creates or changes a file under `certification/` or moves a ref.
- new test at the `rp validate` command line — design-doc-decision-6, spec-acceptance-criterion-9, spec-acceptance-criterion-10 — it prints, for each of the role's rejected files, committed or not, the line `rp check` prints for that file, none for another role's file or another pipeline folder's, and a line of acceptance when none is rejected; with `--file`, it reports that file alone; it applies neither run-configuration check.
- new test at the `rp thread` and `rp validate` command line — design-doc-decision-2, design-doc-decision-3, design-doc-decision-6, spec-acceptance-criterion-11 — in a review lane's tree with no `run-config.md` and no `threads/`, and in a production lane's worktree, each writes and reports what it does with every other file well-formed and `run-config.md` present.
- new test at `rp next --apply`'s assignments, with the templates the tests own — design-doc-decision-7, design-doc-decision-8, spec-acceptance-criterion-15 — every role's assignment, in every mode and seat and in the reviewer's three requests, is given the command that runs `rp` as that role, which runs from the role's worktree as written, whatever characters its paths hold, and acts as that role; each path it shows for reading is the path as written; the first-turn request is given no thread path, and the later-turn request its open review thread.
- end-to-end flow through `rp next --apply`, the commands its assignments state, and `rp land` — design-doc-decision-5, design-doc-decision-6, design-doc-decision-7, design-doc-decision-8, spec-acceptance-criterion-5, spec-acceptance-criterion-6, spec-acceptance-criterion-9 — a reviewer that approves on its first turn, and one that approves with a closing message after the implementer's `rp thread reply`, each lands to `review <lane> approved`; a reviewer's approval without a closing message after the implementer's reply is refused; `rp check` lists every thread file written with the status and awaited role a hand-written file of the same content gets, and the next plan names no `INVALID` or `repair` line for them.
- existing test "are written for every role from this repository's .rp.md, a run confirmed with its Agents defaults, and the delivered templates, for every kind of turn" — design-doc-decision-7 — every delivered template fills the command that runs `rp`.
- existing tests of `rp check`, `rp next`, and `rp land` (`npm run test:rp`) — design-doc-decision-6, spec-exclusion-3 — they reject the same files for the same reasons as before.
- inspection — design-doc-decision-8, spec-acceptance-criterion-16 — no delivered template shows a thread file name, header line, heading form, or status edit, and the reviewer's first-turn and later-turn requests name the `rp thread` commands that open, answer, and approve.
- inspection — design-doc-decision-9, spec-acceptance-criterion-13, spec-acceptance-criterion-14 — each of the four profiles states no thread file name or number, header key, or heading form, names no skill file or path of `rp`, names the `rp thread` command where its role opens, answers, closes, or escalates, and has its role run `rp validate` and fix what it reports before ending any turn.

## Risks

- A body file the role writes inside its worktree can be committed with its turn. In a review lane, it joins the code the lane's commits bring to the pipeline branch, and the approval lands uncertified, its code no longer the change's, so the lane reviews again (design-doc-decision-1).
- A tool that asks permission to run a script outside the role's worktree blocks the role until the owner answers (design-doc-assumption-1).
- A thread file a role names by hand so that its name names no role is no role's file: `rp validate` passes over it, landing rejects it, and the next plan names it for the orchestrator to fix. Only a file named by hand produces it.
- This repository's resources name its own copy of `rp`, the code under change (`.rp.md` resource "test suite and scripts"): a role here that runs that copy instead of its assignment's command runs the branch's version of the commands.
- The roles finding each command's arguments in `rp`'s output, and leaving no file for landing to reject, are unconfirmed (spec-assumption-1, spec-assumption-2).

## Open assumptions

spec-assumption-1: A role that has the command names from its profile and how to run `rp` from its assignment, and nothing else, finds each command's arguments in `rp`'s own output and writes its threads through `rp` within its turn — assumed: a role in each seat (a review lane, a production lane, the pipeline worktree) opens, answers, closes, escalates, and validates through `rp`, using only its profile, its assignment, and `rp`'s output.

spec-assumption-2: Roles that write their threads through `rp` and run `rp validate` before ending their turns leave no file of theirs for `rp land` to reject — assumed: the plans of the next full pipeline run after the change name no `INVALID` or `repair` line for a file a role wrote.

design-doc-assumption-1: Each tool the skill supports runs the command an assignment states from the role's worktree without a permission request, though the `rp` script lies outside that worktree — assumed: a role seated by each tool in a review lane, a production lane, and the pipeline worktree runs `rp validate` as its assignment states with no pending permission request.
