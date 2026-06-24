# Docs Summary

## What

Two documentation surfaces were brought into sync with the worktree/branch-isolation change the code phase shipped:

- **`README.md` (Configuration section).** The spawn-payload sentence that enumerates what the orchestrator passes to a spawned phase agent now also names the two new `## Conventions`-block items: the absolute worktree root (passed to every spawned agent) and the pipeline branch (passed to the agents that commit).
- **`.changeset/worktree-branch-isolation.md` (new).** A release changeset for `@automattic/radical-pipelines` describing the change as a changelog note, with bump type `patch`.

## Why

- The README's Configuration section is the user-facing summary of how the pipeline isolates each spawned agent's work and what context an agent receives at spawn; left unchanged it would have understated the spawn payload after the code phase added the two fields.
- The repository's changeset gate requires a changeset for any change touching a release-relevant path (`skills/**` here), so the release and `CHANGELOG.md` reflect the change.

The canonical in-place documentation of the new behavior lives in the skill prose the code phase edited (`conventions/passing.md`, `claude-code.md`, `pi.md`); these two surfaces are the remaining references that would otherwise drift.

## How

- The README sentence was extended in place, anchored on its verbatim opening, to add the two items at their correct scope (worktree root → all spawned agents; branch → committing agents), matching the `Agents:` lines in `conventions/passing.md`. It stays at the README's existing summary altitude and does not duplicate the skill's field-level verify-before-acting wording.
- The changeset was authored in the repository's standard front-matter format (`"@automattic/radical-pipelines": patch`) with an imperative summary stating that spawned agents' edits stay in the pipeline worktree and commits on the pipeline branch via explicit spawn-time anchoring rather than inherited working directory. It passes `scripts/validate-changesets.mjs` and satisfies the changeset gate's Presence check.

## Key decisions

- **Bump type `patch`, not `minor`.** The project is pre-1.0 (`0.4.0`) and the change is a backwards-compatible behavioral improvement to the skill that adds no new user-facing feature. Per `CONTRIBUTING.md`'s authoritative bump table, that maps to `patch` (`minor` is reserved for new features/additions). The docs-plan's Overview had earlier estimated `minor`; the landed `patch` is the correct value for what actually shipped and matches the precedent of the project's existing backwards-compatible behavioral changesets. No `BREAKING:` prefix, since the change is not breaking.

## Known limitations

- None for the docs. The accuracy of these surfaces is bounded by the shipped skill prose they reference; if that prose changes, both surfaces would need re-reconciling.
