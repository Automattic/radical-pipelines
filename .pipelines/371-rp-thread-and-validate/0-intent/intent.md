origin: issue 371
origin: starts-from 370-rp-next-and-land

# Let roles write threads through rp and validate their files

## Goal

A malformed thread or pipeline file costs no extra turn. Roles write a thread's structure through `rp`, which writes its header, its file name and number, and each message heading, and roles check what they wrote with `rp` before they end their turn.

## Constraints

intent-constraint-1: These commands work from the file grammar alone, without the run configuration or any other pipeline file: a reviewer's tree holds only the intent, its later inputs, and its own threads.

intent-constraint-2: A role writes each message's body itself, as free Markdown.

intent-constraint-3: The thread grammar leaves the agent profiles, which name only the commands. How a role runs `rp` reaches it through its assignment; no profile references a skill file.

intent-constraint-4: Roles never record certification: landing stays the orchestrator's.

intent-constraint-5: A command used wrongly says what was wrong and what to run instead.

## Context

intent-context-1: Most `INVALID` lines come from thread headers and file names written by hand. All four profiles repeat the thread grammar in full, and a malformed file wakes its author again with **Malformed files** in its assignment, which costs a whole turn.

intent-context-2: Thread values are YAML frontmatter, `rp` writes each role's assignment, and `rp` lands each turn, after the three changes this one starts from.

## Proposals

intent-proposal-1: `rp thread open`, `rp thread reply`, `rp thread close`, and `rp thread escalate` for a disagreement with its `cites`, and `rp validate [<path>]` for a role's own files.
