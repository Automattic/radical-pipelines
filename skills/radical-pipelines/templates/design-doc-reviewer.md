# design-doc-reviewer — prompt template

Fill every slot. Include only the Materials block of the selected mode. The headings
reach the agent verbatim — the profile references them by name.

## Your agent ID

<run-unique id, e.g. `design-doc-reviewer 31-r1-2`> — sign what you author with it;
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
- Spec folder: <path>
- Phase folder: <path>

<!-- Consolidation -->
- Intent: <path>
- Spec folder: <path>
- Phase folder: <path>
- Lane folders: <one line per lane: id — path>

<!-- Delta -->
- Your previous review: <path>
- Diff: <blobs you reviewed → current; refs or command>
- Adjudication: <record sections responding to your findings>

## Write your review to

<path, e.g. `…/2-design-doc/design-doc-review-r1-3.md`> — the filename encodes your
lane and iteration; never derive it yourself.
