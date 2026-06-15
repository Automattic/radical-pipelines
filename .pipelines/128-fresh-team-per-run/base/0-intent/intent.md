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
