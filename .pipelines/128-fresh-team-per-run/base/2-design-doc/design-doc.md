# Design Doc: Fresh, working team per run

## Overview

The orchestrator creates one Claude Code agent team per autonomous run. Today the team is named after the pipeline slug, which collides with the orphaned team a previous run/session of the same pipeline left on disk. This design replaces the fixed slug name with a per-creation unique name — the slug plus a short random token — so creation never collides and never needs manual cleanup, while the slug prefix keeps the name traceable to its pipeline. The change is confined to documentation/instructions: the team-spawning convention, the two places that reference the team name, and this repo's deployed convention file. Worktree and branch naming are untouched. Automatic cleanup of orphaned teams is out of scope.

## Approach

A Claude Code team is bound to the session that creates it and cannot be adopted by a later session, so reuse across runs is impossible; the only durable fix is to make each creation produce a distinct name. The orchestrator generates the team name once, at `TeamCreate` time, as `<pipeline-slug>-<random-token>`, holds it for the duration of the run, and supplies it wherever the run needs to name its team (only the health monitor). Nothing about the name is persisted across sessions — each run generates its own, which is precisely what guarantees a fresh, collision-free team every time.

## Components

- **Team-spawning convention** (`reference/conventions/claude-code.md`, the canonical `.rp.md` block) — changed. The current `TeamCreate({ name: "<pipeline-slug>" })` instruction becomes a team name of `<pipeline-slug>-<random-token>`: the pipeline slug as a prefix plus a short random token, generated fresh on every creation. The convention states that the name must be unique per creation and that the slug prefix keeps orphaned teams attributable.
- **Review procedure** (`reference/review-pipeline.md`) — changed. The clause stating a review runs "with the pipeline slug and team unchanged" is corrected: a review, like any run, creates its own team; only the pipeline slug (worktree/branch) is unchanged.
- **Health-monitoring template** (`reference/health-monitoring.md`) — changed. The monitor prompt's literal `team <pipeline-slug>` is replaced with the actual team name the orchestrator created for the run.
- **Deployed convention file** (`.rp.md`, this repo) — changed. Its Team spawning section is re-synced to carry the same unique-naming rule so radical-pipelines' own runs are governed by it immediately.
- **Generic workflow layer** (`reference/autonomous-workflow.md`) — unchanged. It refers to the Team spawning convention by name and never names a team itself.
- **Worktree/branch conventions** — unchanged. They remain keyed to `<pipeline-slug>` and are reused across runs.

## Interfaces and Data Flow

- **Name format:** `<pipeline-slug>-<random-token>`, where `<random-token>` is a short random alphanumeric string generated at creation time. Example: `128-fresh-team-per-run-a3f9`.
- **Creation:** `TeamCreate` is called with this generated name instead of the bare slug.
- **Propagation:** the orchestrator retains the generated name for the run and substitutes it into the health-monitor prompt. Teammates are addressed by agent name, not team name, so no other prompt or interface carries the team name.
- **Lifetime:** the name lives only within the run's session; it is never recorded in artifacts or reused by a later session.

## Key Decisions

### Decision: Slug prefix + random token

- **Choice:** Name the team `<pipeline-slug>-<random-token>`.
- **Alternatives:** slug + timestamp; an unprescribed "short unique token".
- **Trade-offs:** A timestamp is unique-per-creation and encodes *when*, but it is not random (the spec requires a random component) and is longer. An unprescribed token is the most minimal wording but under-specifies the guarantee and could admit a non-unique choice. The slug + random token directly satisfies the spec, is short, and stays greppable by its slug prefix.
- **Traces to:** Requirements 1, 2, 3; Acceptance criteria 2, 3.

### Decision: Probabilistic uniqueness, no clash-detection

- **Choice:** Rely on the entropy of the random token; do not add clash-detection or name-regeneration.
- **Alternatives:** detect an existing-name error and regenerate.
- **Trade-offs:** Detection would make uniqueness guaranteed but adds logic the spec explicitly does not require; a sufficiently random token makes a clash astronomically unlikely, and a clash would merely reproduce today's error — no regression.
- **Traces to:** Requirement 2; Acceptance criterion 1.

### Decision: Update canonical convention and re-sync deployed `.rp.md`

- **Choice:** Change the canonical block in `claude-code.md` plus the two consumers, and also re-sync this repo's `.rp.md`.
- **Alternatives:** change the skill only, leaving `.rp.md` for a later setup re-sync.
- **Trade-offs:** Skill-only stays strictly within "the skill", but radical-pipelines' own runs would not pick up the rule until re-synced. Re-syncing `.rp.md` makes the rule effective here immediately at the cost of touching the deployed file; the canonical and deployed copies must change together to avoid drift.
- **Traces to:** Requirements 4, 5; Acceptance criteria 1, 4.

## Dependencies

No new internal or external dependencies. The change uses the existing `TeamCreate` tool and edits existing skill documentation plus `.rp.md`.

## Failure Modes and Observability

- **Random-token collision (residual):** astronomically unlikely; if it occurred, `TeamCreate` would error exactly as it does today, with no new failure mode introduced. Surfaced to the owner through the orchestrator's normal error handling.
- **No new observability needs.** The generated team name appears in the team config on disk (`~/.claude/teams/<name>/`) and, via its slug prefix, remains attributable to its pipeline for manual inspection or cleanup.

## Risks and Open Questions

- **Orphan accumulation persists.** This change stops collisions but does not remove dead teams from disk; they accumulate until the separate teardown/cleanup follow-up lands. Out of scope by decision; the slug prefix keeps the orphans identifiable in the meantime.
- **Canonical/deployed drift.** The naming rule now lives in both the canonical block (`claude-code.md`) and the deployed `.rp.md`; the code-writer must update both so they stay in agreement.
- No open questions remain.
