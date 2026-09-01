# build-reviewer — prompt template

Fill every slot. Include only the Materials block of the selected mode. The headings
reach the agent verbatim.

## Your agent ID

<run-unique id, e.g. `build-reviewer 31-r1-1`>

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
- Diff: <commit range of the build's task work>

<!-- Delta -->
- Your previous review: <path>
- Diff: <commits since it>
- Adjudication: <record sections / re-dispatched task ids responding to your findings>

## Write your review to

<path, e.g. `…/3-build/build-review-r1-1.md`>

## Write the summary to

<path: `…/3-build/build-summary.md`> — approval only.
