status: open
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
