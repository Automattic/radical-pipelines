---
{
  "inputs": [
    "1-spec/spec.md@4d1cb7f5309f",
    "2-design-doc/design-doc.md@534237007e83"
  ]
}
---
status: done

# Implementation notes

## Done

- `rp thread open | reply | close | escalate` and `rp validate`, applying the file grammar alone (`parseFile` without a run configuration); `readWorktree` narrowed to the files a command reads; numbering from the names in the working tree's `threads/`; headings naming `HEAD`; the written file checked with the grammar, a probe heading after the role's message included (d3e425d5).
- Every assignment given `rp`, `node <absolute path of the script>`; the producers' and the implementer's Seat field **rp**, the reviewer requests' commands (660c493b).
- Profiles name the `rp thread` commands and run `rp validate` at the end of every turn; thread header, heading, file name, and number gone from them; the body format kept (4a266fd5).
- Each wrong use refused with what was wrong and what to run instead (c0f92593).
- Reviewer requests open, answer, and approve through `rp thread`; the first-turn request names no thread path, and `next` numbers no thread (9656dc9b).
- An approval without `--body` refused unless the reviewer's own last message names `HEAD`; end-to-end flows through the delivered assignments and `rp land` (bad726a8).
- A missing argument of `check`, `next`, `land`, and `pipelines` also prints the command's form, so one rule covers every command line (b19450eb).
- `scripts/README.md` § `thread`, § `validate`; `templates/README.md`; `state.md`; `docs/model.md`, `docs/glossary.md` (File grammar), `docs/flowcharts/threads.md`; `README.md`; changeset `rp-thread-and-validate` (c7aec662).
- `npm test`: 617 pass. The flow driven as roles reach it, from the delivered assignments: `3-implementation/notes/exercise.txt`, printed by `exercise.sh <rp.mjs>`.

## Remaining

None.

## Decisions

- The `rp` template value is `node <script>` alone; each template writes `{{rp}} <command> {{pipeline-folder}} --role {{role}}`, since the command goes between the script and the pipeline folder.
- A command writes a message only when the grammar would also read a message after it, so a body that leaves fenced code open is refused before it can hide the other party's reply.
- `close` replaces only the bytes of the `status` value; `escalate` writes `cites` plain, else double- or single-quoted, whichever the frontmatter grammar reads back as the text given.
- A wrong use prints the reason, then on its own line what to run instead; a command line a command does not take prints `usage: node rp.mjs <form>`, for every command.
- `rp validate` prints `accepted: every file of <role>`, or `accepted: <path>` with `--file`; a `--file` that is missing stops it.
- `--role owner` passes the role grammar; the thread grammar and the awaited-role rule refuse every thread command it runs.
- Commit order: the from-intent requirements first (d3e425d5, 660c493b, 4a266fd5), then spec-requirement-13 (c0f92593), spec-requirement-17 (9656dc9b), and spec-requirement-6 (bad726a8). spec-requirement-5 lands with d3e425d5: a heading names some commit, and design-doc-decision-5 decides `HEAD`.
- `npm run test:opencode` was not run: it installs opencode from npm and exercises the plugin's materialization, which reads no thread grammar; the plugin's unit tests pass in `npm test`.

## Failed approaches

None.

## Assumptions

- spec-assumption-1: not yet observable: it needs roles seated by a pipeline run that uses this change. What `rp` gives them is observed: `--help` lists each command's form, and each wrong use names what to run instead (`exercise.txt` § 4; `scripts/test/rp/thread-commands.test.mjs`).
- spec-assumption-2: not yet observable: the plans of the next full pipeline run confirm it. Observed in a driven run: the plan after landing names no `fix`, `repair`, or `INVALID` line (`exercise.txt` § 3).
- design-doc-assumption-1: not yet observable: it needs a role seated by each tool in each kind of seat.
- design-doc-decision-1, quoted heredoc: observed: a body with backticks and a fenced `## ` line, given through a quoted heredoc, reads byte for byte in the thread (`exercise.txt` § 1).
