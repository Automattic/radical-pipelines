# Doc Plan: Fresh, working team per run

## Overview

This is a skill-instruction change with a single external-facing documentation surface: the project changelog, fed by a Changeset. CI's Changeset Gate fails any pull request that touches `skills/**` without a changeset, and this change does. No other documentation surface describes the team-naming behavior: the README only lists `TeamCreate` generically (no naming scheme), and the website uses "team" in the marketing sense. So the doc plan is one task — add the changeset.

## Tasks

### Task 1: Add a changeset for the unique-per-run team naming

- **Goal:** Satisfy the Changeset Gate and record the user-visible change in the changelog.
- **Audience:** Changelog / release-note readers — people tracking what changed in the skill between versions.
- **Files to change:** a new `.changeset/<name>.md` (Changesets format: front matter with the `@automattic/radical-pipelines` package and a bump type, followed by a one-paragraph summary).
- **Sections / scope:** Single changeset entry, bump type `patch` (backwards-compatible fix, no new feature, per `CONTRIBUTING.md`). The summary conveys that each run now gets its own uniquely named team so a new run never collides with a stale team from a prior run or session, and no longer requires manual cleanup of leftover team state.
- **Depends on:** none (independent of code Tasks 1–3, but documents them)
- **Traces to:** Code Tasks 1, 2, 3 (the team-naming change they implement)
- **Acceptance:**
  - A `.changeset/*.md` exists for this change with valid front matter and a `patch` bump for `@automattic/radical-pipelines`, passing `node scripts/validate-changesets.mjs`.
  - The reader of the changelog understands that a new run always gets a fresh, uniquely named team and that stale-team collisions / manual cleanup no longer occur.
  - The entry does not promise anything out of scope (e.g. automatic teardown/cleanup of orphaned teams).
