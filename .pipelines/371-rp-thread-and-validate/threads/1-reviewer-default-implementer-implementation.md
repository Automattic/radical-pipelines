---
{
  "inputs": [
    "0-intent/intent.md@fac028da676c"
  ],
  "reviewed": "9108ff5a4e490cadc8f27847f75d3b9550d1f1a9"
}
---
status: approved
opener: reviewer-default
owner: implementer
artifact: implementation

## reviewer-default — ea53f15cce0f62331970d9e9321ab6eb4b725f1b

Overall this is a good change and close to mergeable. The four `rp thread` commands and `rp validate` do what the issue asks. They write the file name, number, header, and headings. They refuse to write anything the grammar would reject or misread, they never touch certification, and they work in a review lane's tree that has no `run-config.md`. That last point is tested in `thread-commands.test.mjs` ("a review lane's tree, with no run-config.md and no threads folder…"). The profiles now name only the commands, and the reviewer's first-turn request no longer has to guess a thread number. I tried the commands by hand in a scratch repo, and most wrong uses gave a clear message and a correct next step. Two issues should be fixed before merge, and a few smaller ones are optional.

### Finding 1: `thread open` tells producers to open threads downstream, and accepts them

`cmdThreadOpen` (`skills/radical-pipelines/scripts/rp.mjs`, the `OWNERS[artifact] === role.profile` branch) builds its "what to run instead" from *every other* artifact. That list is only correct for the implementer, the one case the test covers (`thread-commands.test.mjs:178`). For the other roles it points the wrong way:

```
$ rp thread open p/x --role spec-producer --artifact spec --body - <<<'…'
rp: thread open: spec-producer owns spec
open a thread about an artifact you consume: --artifact design-doc or implementation

$ rp thread open p/x --role design-doc-producer --artifact design-doc --body - <<<'…'
rp: thread open: design-doc-producer owns design-doc
open a thread about an artifact you consume: --artifact spec or implementation
```

The spec-producer consumes neither of the artifacts it is told to use, and the design-doc-producer does not consume `implementation`. If the producer follows the advice, the command accepts it:

```
$ rp thread open p/x --role spec-producer --artifact implementation …
…/threads/1-spec-producer-implementer-implementation.md
$ rp thread open p/x --role reviewer-default --artifact spec …
…/threads/2-reviewer-default-spec-producer-spec.md
$ rp validate p/x --role spec-producer
accepted: every file of spec-producer
```

`docs/model.md` § Threads says "Nobody opens a thread downstream" and "The reviewer opens threads to the implementer only". So this breaks intent-constraint-5: the fix it suggests is itself a wrong use. The command knows the role and `PHASES` already records each artifact's upstream. It can therefore name only the artifacts the role consumes, or escalation when there are none, as for the spec-producer. It should refuse the rest with that same message. The test should cover every profile, not just the implementer.

### Finding 2: an empty body opens, or approves, a review with no text

`bodyOf` takes whatever arrives, and the grammar accepts a message with no body. A reviewer who runs the documented `--body -` with stdin already at EOF gets a review thread holding only its heading:

```
$ rp thread open p/x --role reviewer-default --artifact implementation --body - </dev/null
…/threads/3-reviewer-default-implementer-implementation.md
$ cat …/3-reviewer-default-implementer-implementation.md
---
status: open
…
---

## reviewer-default — 83d1b8a9…
```

That is easy to do from a tool that runs commands without a terminal. On the first-turn path in `reviewer-first.md` (open, then `close --status approved` without `--body`), it lands an approval that holds no review. The same gap lets `reply` and `escalate` write empty messages. The commands already refuse a bad body before writing anything. A body that is empty or only whitespace should be refused the same way, with "write the message on standard input or in the file --body names".

### Finding 3 (risk): the review goes through the shell, and an unquoted heredoc runs its backticks

`reviewer-first.md` and `reviewer-later.md` now pass the whole review on standard input (`--body -`), so the natural way to write it is a heredoc. Reviews are full of inline code. With an unquoted delimiter, the shell runs every backtick span and expands every `$`:

```
$ rp thread reply … --body - <<EOF
Run `echo RAN`, cost $HOME.
EOF
$ tail -1 …/1-reviewer-default-implementer-implementation.md
Run RAN, cost /Users/luisherranz.
```

So the review is silently corrupted, and the commands it mentions run in the reviewer's worktree. The old request avoided this by having the reviewer write a file. I'd show the safe form in the templates: write the message to a file outside the worktree and pass `--body <that file>`, or show `<<'EOF'` in the command block. A one-word change to the command block would cover most of it.

### Finding 4 (minor): `validate --file` treats a pipeline-relative path as "not your file"

`rp validate` prints pipeline-relative paths (`INVALID threads/1-…md: …`), but `--file` and `--thread` resolve against the process directory. Pasting the printed path back, from the worktree root where roles run, fails with a misleading reason:

```
$ rp validate p/x --role reviewer-default --file threads/1-reviewer-default-implementer-implementation.md
rp: validate: threads/1-reviewer-default-implementer-implementation.md is no file of reviewer-default, whose files are its artifact or candidate and the threads naming it
```

It *is* the reviewer's file; the path just resolved outside the folder. Either accept a path relative to the pipeline folder as well, or say that the path lies outside `<pipeline folder>` instead of "is no file of". `--file` also has no caller: no template or profile uses it, and checking all of a role's files takes no longer. Dropping it would also make this finding go away.

### Optional

- `rp validate` exits 0 when it prints `INVALID` lines. That matches the "exits 0 whatever the frontier" sentence in the README. A non-zero exit when something is rejected would let a hook or a role's script use it directly.
- `--cites` is written exactly as given. Roles will pass the absolute path `thread open` prints, so a reviewer's escalation records a path inside its lane worktree, not the thread's place in the pipeline. The old template had the same problem. But `rp` now writes the header, so it could write any path inside the pipeline folder in its pipeline-relative form.
- `RP` (`node ${fileURLToPath(import.meta.url)}`) is put into shell command blocks unquoted. It breaks if the skill is installed under a path with a space. The worktree paths in the templates share this, so it is low priority.
- Adding the usage line to `check`, `pipelines`, `next`, and `land` goes slightly beyond the issue, which is about the roles' commands. It is small and consistent with intent-constraint-5, so I'm fine keeping it.

### Rules

- **tests** — `npm test` passes: 617 tests, 0 failures, exit 0.
- **documentation** — Follows `AGENTS.md` and `docs/glossary.md`. It has a changeset. README.md, `docs/model.md`, `docs/glossary.md` (new **File grammar** entry, and the updated **Assignment** and **Thread** entries), and `docs/flowcharts/threads.md` are updated. The profiles reference no skill file or `.rp.md`, and the shared thread rules are copied into each producer profile. The terms match the glossary. I found no reference to an external project or an issue tracker. The only documentation gap is the downstream-thread behavior in Finding 1: `scripts/README.md` § `thread` lists "`open` … about the artifact the role owns" as a wrong use but not an artifact the role doesn't consume.

## implementer — 510d1da38f605f4e2dfbbc818c2cceab89f1ddd5

### Finding 1: changed in 270549c6 (the remedy); stands (refusing an open about an artifact the role does not consume)

The remedy now names only the artifacts the role consumes besides the intent, its phase's upstream ones. Opened about its own artifact, the design-doc-producer is told `--artifact spec`. The spec-producer consumes the intent alone, so it is told `rp thread escalate`. The wrong-use table now has a row for each producer profile, and the rows for the spec-producer and the design-doc-producer fail on the old remedies.

Refusing an open about an artifact the role does not consume stands. The spec weighed the reviewer's case and left it out: "A reviewer opening a thread to an owner other than `implementer` or `owner` — its requests and profile have it write only its review thread and its escalation, and its lane's view holds no other thread" (`1-spec/spec.md` § Considered and not required). spec-requirement-13 lists as wrong the uses that cannot be carried out, or that would leave a file the grammar rejects, write in history, or land an approval uncertified. A thread opened downstream is none of these: `rp check` accepts it and lists it. With the remedy corrected, no source leads a role to open one. Each producer profile has its role open a thread only "to the owner of an artifact you consume", and the reviewer's requests open only its review thread. `scripts/README.md` § `thread` therefore lists it as no wrong use.

### Finding 2: changed in 627b578e

A body of whitespace alone, from the file or from standard input, is refused before anything is written: `rp: thread reply: the body on standard input is empty`, then `write the message on standard input, or in the file --body names, and run the command again`. This covers `open`, `reply`, `escalate`, and a `close` given `--body`. The wrong-use table has a row for it. `scripts/README.md` § `thread` lists it.

### Finding 3: changed in 3e04e648

The reviewer's requests now write each command that takes a message with a quoted heredoc: `--body - <<'EOF'`, a `<your review>`, `<your closing message>`, or `<your answer>` line, then `EOF`. `rp --help` says a quoted heredoc passes the body as written, backticks and `$` included, for the roles that read it there. The end-to-end test runs each stated block as written, its placeholder line replaced by a body holding backticks and `$HOME`, and checks that the landed thread ends with that body byte for byte. `3-implementation/notes/exercise.txt` § 1 shows the same through the delivered first-turn request.

### Finding 4: changed in 41216680

A `--file` that resolves outside the pipeline folder now says so: `rp: validate: threads/1-….md lies outside .pipelines/demo, as --file resolves against the process directory`, then `give --file <pipeline folder>/<its path in the pipeline folder>`, with the pipeline folder's absolute path filled in. "Is no file of" now comes only for a path inside the folder that names none of the role's files.

`--file` stays: spec-requirement-10 has `rp validate`, "given the path of one of the role's files", report "on that file alone", from intent-proposal-1's `rp validate [<path>]`. It also stays against the process directory: design-doc-decision-2 has every path option resolve there, as every path argument of `rp` does.

### Optional: a failing exit status from `rp validate`: stands

`1-spec/spec.md` § Considered and not required: "A failing exit status or a JSON output for `rp validate` — `rp check` exits 0 on an `INVALID` frontier and roles read printed lines; no source shows a consumer branching on either."

### Optional: `--cites` written in its pipeline-relative form: stands

spec-requirement-4 and spec-acceptance-criterion-4 have the escalation's `cites` hold "what the role cited", and the design's § Interfaces writes "the text given". Rewriting the path would change what the role cited, which is the spec's to decide.

### Optional: quoting `RP` and the paths in the stated commands: owned by design-doc-producer

design-doc-decision-7 chose to insert these paths as written, and its § Risks leaves a path holding a space uncovered. I carried this to its owner, with a reproduction, together with the other lane's finding on the same point (`threads/2-implementer-design-doc-producer-design-doc.md`).

### Optional: the usage line on `check`, `pipelines`, `next`, and `land`: kept

You are fine keeping it, and nothing changed.

`npm test`: 625 tests pass.

## reviewer-default — b03cc59ccdcdace9e764c92bd2ee99fa6d9834fd

Thanks. Every answer holds, and I'd merge this as it stands.

### Finding 1: resolved

The remedy now names only what the role consumes. I checked it by hand. The spec-producer is sent to `rp thread escalate` ("owns spec, and consumes the intent alone"), and the design-doc-producer is told `--artifact spec`. The wrong-use table now covers each producer profile. I accept that refusing downstream opens stands. The spec weighed that case and left it out, and with the remedy fixed nothing in the requests or profiles leads a role to open one.

### Finding 2: resolved

An empty body is now refused before anything is written: stdin at EOF, and a `--body` file holding only spaces and tabs, both give "the body … is empty" plus the remedy.

### Finding 3: resolved

The reviewer's command blocks now use `<<'EOF'`, and a body containing `` `echo RAN` `` and `$HOME` lands byte for byte. Quoting the `rp` path and the folder and thread arguments as shell words (`pipeline-folder-arg`, `thread-arg`) also covers the path-with-a-space point from my optional list.

### Finding 4: resolved

A pipeline-relative `--file` now says it lies outside the folder and shows the form to give. I accept that `--file` stays, per the spec's requirement.

### Optional points: accepted

The exit status, `cites` as given, and the usage lines all stand, and I accept that. `validate` also now stops on a file where `threads/` or the role's artifact folder belongs, as `check` does, and it reads past such a file elsewhere. I checked both cases and they're tested.

One nit, not blocking: the remedies print absolute paths unquoted, for example `give --file /private/tmp/rp371 b'…/p/x/<its path in the pipeline folder>`. The same goes for the path `thread open` prints, which the first-turn request has the reviewer pass as `--thread <that path>`. If a worktree path holds a space, the role has to quote those itself.

### Rules

- **tests** — `npm test` passes: 625 tests, 0 failures, exit 0.
- **documentation** — Follows `AGENTS.md` and `docs/glossary.md`. The changeset, `scripts/README.md` (§ `thread`, § `validate`, § Assignments), and `templates/README.md` describe the new behavior and the new `pipeline-folder-arg` and `thread-arg` values. No profile references a skill file, and the terms match the glossary.
