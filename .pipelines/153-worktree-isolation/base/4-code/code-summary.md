# Code Phase Summary

## What

Three skill-prose convention files gained the worktree/branch isolation discipline, +9 lines total:

- `skills/radical-pipelines/reference/conventions/passing.md` (+4) — two new labeled fields in the spawn-time `## Conventions` block: a **Worktree root** field (`Agents: all`) carrying the declarative write-anchoring instruction, and a **Branch** field (`Agents: committing agents — every role except spec-researcher and design-doc-researcher`) carrying the one-clause commit-confirm instruction.
- `skills/radical-pipelines/reference/conventions/claude-code.md` (+1) — inside the fenced `.rp.md` block, in `## Worktrees`: the orchestrator derives the worktree-root value via `git rev-parse --show-toplevel` from its own (worktree) cwd.
- `skills/radical-pipelines/reference/conventions/pi.md` (+4) — inside the fenced `.rp.md` block, in `## Pi worktrees`: the orchestrator reuses the absolute Pi worktree path it already uses for spawn `cwd` (with the `.pi/worktrees/<folder-name>` fallback), plus a note recording the three unverified Pi-tooling specifics.

## Why

A radical-pipelines run executes in a worktree, but spawned agents were only kept isolated by inherited working directory — no agent was told it was in a worktree, which branch to commit to, or to avoid the main checkout. Because a worktree is a literal subpath of the main repo, a main-anchored absolute path silently resolves to the wrong copy and a git invocation can commit to the main branch. The change turns that silent inheritance into a stated, checkable precondition: agents get a reliable anchor and are instructed to use it.

## How

The fix is two-part and prose-only, with no runtime enforcement. **Anchor:** the orchestrator injects an absolute worktree-root path (all agents) and the pipeline branch `worktree-<pipeline-slug>` (committing agents only) into the `## Conventions` block it already attaches to every spawn prompt. **Verify before acting:** the worktree-root field instructs anchoring every absolute path on that root and never constructing a main-checkout path (write-side guard, the passed value is the guard); the branch field instructs confirming the current branch via `git branch --show-current` before committing (commit-side guard). The behavior is authored once in `passing.md`; the per-tool worktree-root derivation is deferred to `claude-code.md` and `pi.md`, following the `health-monitoring.md:13` generic-instruction-with-tool-defer pattern, with each derivation placed inside that tool's fenced `.rp.md` block in the worktree section. Task 4 verified the end-to-end prose flow by inspection.

## Key decisions

- **Behavior carried centrally in the injected block, not duplicated per-profile** — mirrors the existing Guardrails precedent; the ~18 agent profiles are untouched. Rejected: duplicating the instruction into every profile (high edit cost, drift risk) and a hybrid (two homes that can disagree).
- **Asymmetric verify form** — declarative path-anchoring for writes (no per-write command), a one-clause branch confirmation for commits. Rejected: a per-write command-check (impractical, only catches a bad path after construction) and a full procedural string-compare recipe (over-specifies against the minimalist house style).
- **Requirement 7 holds by construction with no carve-out language** — the discipline lives exclusively on the spawned-agent passing path the orchestrator never consumes, so `setup.md` and `pipeline-versioning.md` need no defensive exemption prose. The orchestrator's main-branch setup commits and lineage-SHA reads remain unredirected.

## Known limitations

- The guarantee is behavioral, not mechanical (per Requirement 6 and the spec's Out of Scope): a sufficiently errant agent could still construct a main-anchored path or commit without confirming the branch. The change provides the strongest-available prose mechanism but cannot eliminate the possibility.
- The Pi worktree-root derivation is unverified against live `@zenobius/pi-worktrees`. Three specifics — whether `/worktree create` emits an absolute path, the exact on-disk folder name (`worktree-<slug>` vs `<slug>`), and whether the spawn `cwd` value is absolute or repo-relative — are recorded as an explicit note in `pi.md` so a later check can pin the precise folder name without reopening the design.
