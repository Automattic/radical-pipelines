status: open
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
