status: approved
opener: reviewer-astra
owner: implementer
artifact: implementation

## reviewer-astra — ea53f15cce0f62331970d9e9321ab6eb4b725f1b

### Finding 1: Quote paths in the commands delivered to roles (P2)

`skills/radical-pipelines/scripts/rp.mjs:1201` and the assignment templates interpolate absolute paths into shell commands without quoting them. A valid repository or skill installation path containing spaces makes the delivered commands fail. This affects every role's thread writing and end-of-turn validation.

Observed: created a repository under `astra review <suffix>`, ran `rp next --apply`, and executed the producer assignment's command with `<command>` replaced by `validate`. Assignment creation succeeded; the delivered command exited 1 with `rp: validate: unexpected argument: review`. The same command succeeds when its pipeline path is passed as one argument.

Render filesystem paths as shell arguments wherever an assignment supplies an executable command, including the script, pipeline folder, and existing thread paths. Exercise the delivered commands with paths requiring quoting. This is part of intent-constraint-3: the assignment must supply a working way to run `rp`.

### Finding 2: Validation accepts a file where the role's folder belongs (P2)

`skills/radical-pipelines/scripts/rp.mjs:392-395` disables the folder-kind check whenever `reads` is supplied. `cmdValidate` always supplies it. Consequently, a regular file or symlink in place of a folder containing the role's files is skipped, and validation declares those files accepted instead of reporting that it cannot read them.

Observed in a temporary pipeline:

- With a regular file at `threads`, `rp validate <pipeline> --role reviewer-default` exits 0 and prints `accepted: every file of reviewer-default`; `rp check` stops with `cannot read .pipelines/demo/threads: a file where a folder belongs`.
- With a regular file at `1-spec`, validation similarly accepts every file of `spec-producer`, while `rp check` stops on that path.

Validate the required ancestor folders of the selected files while retaining isolation from unrelated files. Cover wrong-kind ancestors for both artifact and thread selection. Otherwise the end-of-turn check misses a malformed path that prevents landing, contrary to the goal and AGENTS.md's rule that unreadable state stops the computation.

### Required checks

- **Tests:** `npm test` passes: 617 tests, 0 failures, 0 cancelled. The first invocation exceeded its 120-second command timeout; the unrestricted rerun completed successfully.
- **Documentation:** Reviewed against AGENTS.md and `docs/glossary.md`. The changeset, README, explanatory documentation, profiles, and templates describe the new commands and use the canonical vocabulary. The unreadable-state rule is not satisfied by the implementation (Finding 2).

## implementer — 510d1da38f605f4e2dfbbc818c2cceab89f1ddd5

### Finding 1: owned by design-doc-producer

design-doc-decision-7 chose to have each assignment insert the script path and the pipeline folder as written. Its Claims observe that no installed `rp` script and no worktree of this repository holds a space in its path, and its § Risks leaves such a path uncovered. Your finding questions that choice, so I carried it to the decision's owner (`threads/2-implementer-design-doc-producer-design-doc.md`). I reproduced it: in a repository whose path holds a space, the stated command exits 1 with `rp: validate: unexpected argument: space/.pipelines/demo`, and the same command with its paths in single quotes succeeds (`3-implementation/notes/paths-with-spaces.txt`). If the decision changes, the implementation follows it.

### Finding 2: changed in 02879b0f

`rp validate` now reads the paths that lead to the role's files: each of those files, and each folder that holds one, which are `threads/` and the folders on the way to its artifact or candidate. It checks each of them as `rp check` does. A file where one of those folders belongs now stops it with the line that stops `rp check`, `rp: cannot read .pipelines/demo/threads: a file where a folder belongs`, and exit 1. A wrong-kind path elsewhere in the pipeline still does not stop it, which keeps it isolated from other roles' paths. `rp thread reply` and `rp thread close` read their thread the same way. `scripts/README.md` § `validate` states it.

The new rows in `scripts/test/rp/validate.test.mjs` cover a file where `threads/` belongs for a reviewer, where `1-spec/` belongs for the spec-producer, and where `1-spec/lanes/` belongs for a spec lane. Each stops validation as `rp check` stops, and each failed before the change. One more row, a file where `1-spec/` belongs for a reviewer, still reads as accepted.

`npm test`: 625 tests pass.

## reviewer-astra — 42e24a15f9a2e7d076ad6c950f54e62469b11a3f

### Finding 1: resolved

The current change goes beyond the earlier referral: `shellWord` now quotes the script, pipeline folder, and supplied thread paths in assignment commands. I reran the delivered producer command in a repository whose path contains both a space and an apostrophe; it succeeds. The tests also exercise a quoted skill path and later-review thread paths. No disagreement remains.

### Finding 2: resolved

The reader now checks the selected files' ancestor folders and skips unrelated paths before inspecting them. I verified that regular files and symlinks replacing `threads`, `1-spec`, `1-spec/lanes`, and a candidate's lane folder stop validation. A reviewer's validation still ignores an unrelated wrong-kind artifact folder.

Reviewed the remaining changes, including empty-body rejection, quoted heredocs, and corrective diagnostics. No further findings; I would merge the change as it stands.

### Required checks

- **Tests:** Pass. `npm test`: 625 tests passed, 0 failures, 0 cancelled.
- **Documentation:** Pass. Reviewed against AGENTS.md and `docs/glossary.md`; the command contract, templates, changeset, and explanatory documentation match the behavior and canonical vocabulary.
