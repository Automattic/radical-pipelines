# Spec Research: Fresh, working team per run

# Starting a run should always get a fresh, working team — never blocked by a stale one

> Source: GitHub issue [Automattic/radical-pipelines#128](https://github.com/Automattic/radical-pipelines/issues/128).
> This file is self-contained; agents do not need to open the source issue.

## Goal

Starting a run on a pipeline (base, review, resume, …) always gets a fresh, working agent team and is never blocked by leftover team or task state from a previous session — and never requires manual cleanup of `~/.claude/teams/…` or `~/.claude/tasks/…`.

## Context

- Observed while starting a review run for pipeline `121-role-scoped-guardrails`: a leftover team from the base run's session still existed with a stale lead. `TeamDelete` had no team context to act on, so the run had to manually move the stale `~/.claude/teams/…` and `~/.claude/tasks/…` directories aside before it could create the team for the review run.
- Confirmed root cause: a Claude Code team's lead is fixed to the session that created it and cannot be transferred (per the agent-teams docs). A later session — a review, or a resumed/re-opened run — therefore cannot adopt the prior session's team. Same-name `TeamCreate` against the orphan errors with *"Already leading team … Use TeamDelete to end the current team before creating a new one"*, and `TeamDelete` cannot target an orphan from a fresh session, so manual directory removal is the only recovery. Reproduced exactly in anthropics/claude-code#32730 (closed).
- The skill currently creates teams (`TeamCreate({ name: "<pipeline-slug>" })`) but never tears them down — `TeamDelete` appears nowhere in the skill — so every completed run leaves an orphaned team behind.
- `review-pipeline.md` states a review runs "with the pipeline slug and team unchanged," implying team reuse — which the fixed-lead design makes impossible across sessions.

## Assumptions / directions to explore

- The collision key is the **session**, not the run: any team name derived from durable identity (pipeline slug, fork version, run name) collides whenever a second session touches the same run (crash-resume, or simply running one run across two sittings). So suffixing the run name is insufficient.
- A team name with a **random component** (e.g. `<pipeline-slug>-<random>`) would be unique by construction, so `TeamCreate` never collides and the error path is never entered; keeping the slug as a readable prefix keeps orphaned teams identifiable for later cleanup. Open — agents may confirm or find a better mechanism.
- The "pipeline slug and team unchanged" claim in `review-pipeline.md` would need to be dropped/reworded under per-creation naming.
- Random naming would fix the collision/blocking problem but not orphan accumulation; tearing the team down at run close-out (the lead deleting its own team while still alive — the one moment `TeamDelete` works) is a complementary hygiene measure, separable from the core fix.

## Q&A

### Q1 — Scope boundary: naming-only, or naming + teardown hygiene?

The bug that bit you is the **collision/blocking** problem (a stale team blocks creating a new one). A separate, related problem is **orphan accumulation** (every run leaves a dead team on disk forever). These can be fixed independently. Which does this pipeline cover?

**Answer:** Naming fix only. Cover the collision/blocking fix (unique team name per creation). Orphan accumulation / teardown-at-close-out is left to a separate follow-up issue.

### Q2 — Is name traceability a requirement, or is uniqueness enough?

Since orphan cleanup is now out of scope, dead teams will still pile up on disk and occasionally need manual removal. Should the generated team name be required to stay traceable to its pipeline (e.g. carry the pipeline slug), so a human can still tell which pipeline an orphan belongs to — or is uniqueness the only requirement, leaving the name's shape entirely to the design phase?

**Answer:** Traceability required. The team name must remain identifiable to its pipeline (carry the pipeline slug or equivalent) so a human can tell which pipeline an orphan belongs to.

### Q3 — Probabilistic uniqueness, or a guarantee?

A purely random suffix makes collision astronomically unlikely but not impossible — and since `TeamCreate` errors on a name clash (no auto-rename), even a rare clash would resurface the bug. Should the spec accept probabilistic uniqueness (enough randomness that a clash is effectively impossible), or require a guarantee (the skill must ensure team creation is never blocked by an existing name — e.g. detect a clash and regenerate)?

**Answer:** Probabilistic. A sufficiently random component so a clash is effectively impossible in practice; no clash-detection/regeneration mechanism is required.

### Q4 — Confirm the out-of-scope boundaries

Collected exclusions for confirmation (see Out of Scope section). Anything to add or remove?

**Answer:** Confirmed. Owner directed proceeding to the design-doc phase without changes to the out-of-scope list.

## Research

- The skill hardcodes the team name in `reference/conventions/claude-code.md` ("Team spawning": `TeamCreate({ name: "<pipeline-slug>" })`) — this is the canonical `.rp.md` block, and it is the single place the slug-as-team-name rule originates. The generic layer (`autonomous-workflow.md`) only references the "Team spawning convention" by name, so the functional change is localized to that convention. Source: `skills/radical-pipelines/reference/conventions/claude-code.md:25-33`.
- Team creation happens only at autonomous run start (`autonomous-workflow.md:37`, step 5.1); the assisted workflow spawns no teams. Base/resume/fork/review autonomous runs all reach this same creation point. Source: `reference/autonomous-workflow.md`, `reference/assisted-workflow.md`.
- Worktree and branch names are intentionally stable per pipeline (`worktree-<pipeline-slug>`) and are reused across runs (resume re-enters the same worktree); only the team name needs a per-creation unique component. Source: `reference/conventions/claude-code.md` (Worktrees, Branch names).
- `review-pipeline.md:54` asserts a review runs "with the pipeline slug and team unchanged" — incorrect under per-creation naming and a direct consequence to fix. Source: `reference/review-pipeline.md:54`.

## Out of Scope

## Out of Scope

- Automatic teardown/cleanup of orphaned teams and their task lists — deferred to a separate follow-up issue.
- Worktree and branch naming — unchanged; they stay keyed to the pipeline slug and are reused across runs.
- Clash-detection / name-regeneration logic — not required; a sufficiently random component is accepted.
- Team handling for any agentic coding tool other than Claude Code.

## Consolidated Requirements

1. Each time the skill creates an agent team, the team name is unique to that creation — it never reuses or collides with the name of a team from a prior run or session of the same pipeline.
2. Uniqueness is achieved by including a sufficiently random component in the name. Probabilistic uniqueness is acceptable; no clash-detection or regeneration is required.
3. The team name stays traceable to its pipeline: it carries the pipeline slug (or an equivalent pipeline identifier) so an orphaned team left on disk can be attributed to its pipeline.
4. The unique-naming rule applies at every point the skill creates a team — i.e. every autonomous run start, covering base, resume, fork, and review runs.
5. The skill's instructions no longer imply that a team is reused or carried over across runs or sessions. In particular, `review-pipeline.md`'s "pipeline slug and team unchanged" statement is corrected.
6. Worktree and branch naming are unchanged (`worktree-<pipeline-slug>`, reused across runs); only the team name gains a per-creation unique component.
