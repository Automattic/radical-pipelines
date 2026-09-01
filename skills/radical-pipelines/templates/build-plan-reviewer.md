# build-plan-reviewer — prompt template

Fill every slot. Include only the Materials block of the selected mode. The headings
reach the agent verbatim — the profile references them by name.

## Your agent ID

<run-unique id, e.g. `build-plan-reviewer 31-r1-1`>

## Seat

- Worktree: <absolute path>
- Branch: <branch name>
- Commit format: <project convention>
- Guardrails: <rules, or "none">

## Charter

<full scope | focus>

## Mode

<Fresh | Delta>

## Materials

<!-- Fresh -->
- Spec folder: <path>
- Design folder: <path>
- Phase folder: <path>

<!-- Delta -->
- Your previous review: <path>
- Diff: <blobs you reviewed → current; refs or command>
- Adjudication: <record sections responding to your findings>

## Write your review to

<path, e.g. `…/3-build/build-plan-review-r1-2.md`> — never derive the filename yourself.
