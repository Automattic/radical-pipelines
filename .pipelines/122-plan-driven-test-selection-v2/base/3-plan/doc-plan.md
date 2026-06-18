# Doc Plan: Plan-driven test selection and reviewer-side behavior verification

## Overview

This feature edits this repository's own Radical Pipelines skill: it makes test selection a phase-3 planning duty (a required-test-commands floor and an e2e test plan in `code-plan.md`), relocates behavior verification from the writer to the code-reviewer, and splits the single `code-writer` agent into `code-writer-tdd` and `code-writer-e2e` dispatched by a plan-declared task `Type`.

The approved code plan (`code-plan.md` in this folder) already updates the in-code prose that documents these mechanics for their agent/orchestrator audience: the agent files, the phase-4 autonomous reference, the assisted phase-3 reference, the `setup.md` gate-running enumeration, and the `README.md` shipped-agent roster line. This doc plan covers only the documentation surfaces that fall **outside** the code plan — the human-facing release note and the marketing website — which reference the agent roster the split changes and which no code task touches.

Two surfaces examined and deliberately excluded (no task), because the spec/design already settled them: `SKILL.md`'s phase-4 row keeps "behavior verification" as a phase-4 output (it still is — it moved from the writer to the reviewer, both phase 4), so it stays accurate; the existing `CHANGELOG.md` and the `.changeset/agent-scoped-guardrails.md` file are historical records of prior releases and editing them would be migration/historical churn, which the spec forbids (acceptance criterion 8).

## Tasks

### Task 1: Add the feature's changeset

- **Goal:** Record this feature in a new `.changeset/*.md` file so it appears in the changelog and drives the version bump, satisfying the repository's standing every-change-records-a-changeset rule and the CI Changeset Gate.
- **Audience:** Users and maintainers reading the changelog / GitHub Release to learn what changed in this version.
- **Files to change:** a new `.changeset/<descriptive-name>.md` file (one new changeset; do not edit `CHANGELOG.md` or any existing changeset — `CHANGELOG.md` is generated from changesets at release time).
- **Sections / scope:** The standard changeset shape — front matter declaring the `@automattic/radical-pipelines` package and the bump type, followed by a prose summary. The summary covers, at the changelog's altitude (what changed and why, not implementation prose): test selection becoming a planning duty (the plan's required-test-commands floor and e2e test plan), behavior verification moving to the reviewer, and the `code-writer` split into the two type-dispatched writers. Choose the bump type by the project's pre-1.0 versioning policy for a user-visible behavior change of this size (the sibling agent-scoped-guardrails changeset is the closest precedent); the doc-writer confirms the type against `CONTRIBUTING.md`'s "When a changeset is required" and pre-1.0 policy.
- **Depends on:** none
- **Traces to:** Repository standing changeset rule (`README.md` "Changelog and versioning" / `CONTRIBUTING.md` "Adding a changeset"); the feature as a whole (spec Overview; all code tasks). This surface is release-mechanics, outside the code plan and outside the spec's acceptance criteria, but mandatory for the change to merge through the CI gate.
- **Acceptance:**
  - A new `.changeset/*.md` file exists with valid front matter (correct package name and a bump type permitted by the pre-1.0 policy) that passes `node scripts/validate-changesets.mjs`.
  - The summary conveys the three user-visible shifts (plan-owned test selection, reviewer-side behavior verification, the two type-dispatched writers) accurately and at changelog altitude, without migration or backward-compatibility prose.
  - No existing changeset and no `CHANGELOG.md` content is edited.

### Task 2: Update the website's agent-roster references to the split

- **Goal:** Keep the marketing website consistent with the post-split agent set so a visitor does not see a now-removed `code-writer` agent or a stale agent count.
- **Audience:** Prospective users and visitors reading the project's public website.
- **Files to change:** `website/index.html`, `website/demo.js`.
- **Sections / scope:**
  - `website/index.html` — the hero "agents shipped" count stat: reconcile the displayed agent count with the post-split roster (the split turns one shipped writer into two, changing the total). The doc-writer reads the actual shipped agent set (the `agents/` directory after the code phase) to determine the correct number rather than assuming a delta.
  - `website/demo.js` — the simulated phase-4 run currently shows a `code-writer` task and a commit-message trailer naming `code-writer`. Update the simulated phase-4 step(s) so the agent name(s) shown reflect the shipped writers (a type-dispatched `code-writer-tdd` / `code-writer-e2e`), keeping the demo a plausible illustration of a real run. This is the one demo task; if the demo's structure makes a single representative writer the natural fit, the doc-writer picks the one that keeps the simulated run coherent.
- **Depends on:** none (independent of Task 1; both trace to the shipped agent set, which the code phase establishes)
- **Traces to:** Spec R5 (the split) and R10's roster-consistency intent (human-facing roster reconciled with the two-writer reality), applied to the website surface that the code plan does not touch.
- **Acceptance:**
  - The website no longer presents `code-writer` as a current shipped/dispatched agent; any writer name shown is a post-split name.
  - The "agents shipped" count on the site matches the actual count of shipped agents after the split.
  - The demo still reads as a coherent simulated pipeline run (no dangling or contradictory phase-4 step).
  - No migration or backward-compatibility text is introduced.
