# Spec: Fresh, working team per run

## Overview

When the orchestrator runs a pipeline, it creates an agent team via the Claude Code "Team spawning" convention. Today that team is named after the pipeline slug (`TeamCreate({ name: "<pipeline-slug>" })`). Because a Claude Code team is bound to the session that created it and is never torn down by the skill, a completed run leaves an orphaned team on disk. When a later session for the same pipeline (a review, a resume, a fork re-run, or simply continuing across two sittings) tries to create a team with the same slug-based name, `TeamCreate` fails with an "Already leading team" error, and the orphan cannot be removed from the new session — forcing manual deletion of `~/.claude/teams/…` and `~/.claude/tasks/…`.

This change makes every team the skill creates carry a per-creation unique name, so creation never collides with a leftover team and never requires manual cleanup. The name stays traceable to its pipeline so orphaned teams remain attributable. The scope is naming only; automatic cleanup of orphaned teams is left to a separate follow-up.

## Requirements

1. **Unique per creation.** Each time the skill creates an agent team, the team name is unique to that creation. It never reuses or collides with the name of a team created by a prior run or a prior session of the same pipeline.
2. **Randomness as the mechanism.** Uniqueness is achieved by including a sufficiently random component in the team name. Probabilistic uniqueness is acceptable; the skill is not required to detect a name clash or regenerate the name.
3. **Traceable to the pipeline.** The team name carries the pipeline slug (or an equivalent pipeline identifier) so a team left on disk can be attributed to the pipeline that created it.
4. **Applies to every team creation.** The unique-naming rule holds wherever the skill creates a team — every autonomous run start, covering base, resume, fork, and review runs. (The assisted workflow creates no team.)
5. **No implication of reuse.** The skill's instructions do not state or imply that a team is reused or carried over across runs or sessions. Specifically, the claim in `review-pipeline.md` that a review runs "with the pipeline slug and team unchanged" is corrected to reflect that each run creates its own team.
6. **Worktree and branch naming unchanged.** Only the team name gains a unique component. Worktree and branch names remain keyed to the pipeline slug (`worktree-<pipeline-slug>`) and continue to be reused across runs.

## Out of Scope

- Automatic teardown or cleanup of orphaned teams and their task lists (`~/.claude/teams/…`, `~/.claude/tasks/…`) — deferred to a separate follow-up issue.
- Any change to worktree or branch naming.
- Clash-detection or name-regeneration logic on team creation.
- Team handling for any agentic coding tool other than Claude Code.

## Acceptance Criteria

1. **No collision with a leftover team**
   - **Given** a pipeline whose previous run left a team on disk,
   - **When** a new run for that pipeline starts and creates its team,
   - **Then** team creation succeeds without a name collision and without any manual cleanup of `~/.claude/teams/…` or `~/.claude/tasks/…`.

2. **Name is unique and traceable**
   - **Given** the skill creates a team,
   - **When** the team name is generated,
   - **Then** it contains the pipeline slug (or equivalent pipeline identifier) **and** a random component.

3. **Distinct names across runs/sessions**
   - **Given** two runs of the same pipeline (e.g. base then review, or a run resumed in a new session),
   - **When** each run creates its team,
   - **Then** the two team names differ.

4. **Documentation does not imply reuse**
   - **Given** the skill's documentation,
   - **When** it is read end to end,
   - **Then** no statement implies a team persists or is reused across runs or sessions; in particular `review-pipeline.md` no longer claims the team is "unchanged".

5. **Worktree and branch untouched**
   - **Given** a team is created for a run,
   - **When** the worktree and branch for that pipeline are inspected,
   - **Then** their names remain `worktree-<pipeline-slug>` / slug-based and are unchanged by this work.
