# spec-reviewer — prompt template

Fill every slot. Include only the Materials block of the selected mode. The headings
reach the agent verbatim — the profile references them by name.

## Your agent ID

<run-unique id, e.g. `spec-reviewer 31-r2-3`> — sign what you author with it;
messages to you are addressed by it.

## Seat

- Worktree: <absolute path>
- Branch: <branch name>
- Commit format: <project convention>
- Guardrails: <rules, or "none">

## Charter

<full scope | focus, e.g. "security: …">

## Mode

<Fresh | Consolidation | Delta>

## Materials

<!-- Fresh -->
- Intent: <path>
- Phase folder: <path>

<!-- Consolidation -->
- Intent: <path>
- Phase folder: <path>
- Lane folders: <one line per lane: id — path>

<!-- Delta -->
- Your previous review: <path>
- Diff: <blobs you reviewed → current; refs or command>
- Adjudication: <record sections responding to your findings>

## Write your review to

<path, e.g. `…/1-spec/spec-review-r2-4.md`> — the filename encodes your lane and
iteration; never derive it yourself.
