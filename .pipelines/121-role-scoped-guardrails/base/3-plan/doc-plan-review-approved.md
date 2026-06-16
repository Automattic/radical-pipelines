# Doc Plan Review — APPROVED

_Reviewer: doc-plan-reviewer. Iteration: 1 (approval). Target: `3-plan/doc-plan.md` for pipeline `121-role-scoped-guardrails`._

## Verdict

**Approved.** The doc plan is complete, drift-resistant, and aligned with the spec and the code plan. Its single task (author the mandatory `minor` changeset) is correctly scoped, and every deliberate non-edit is justified and verified against the live tree.

## What I verified against the repository

I did not take the plan's claims on trust; I re-checked the load-bearing ones in this worktree:

- **Changeset gate is real and two-pronged.** `.github/workflows/changeset-gate.yml` is described in `CONTRIBUTING.md:44-59` as running both a **Shape** check (`node scripts/validate-changesets.mjs`) and a **Presence** check (`npx changeset status --since=origin/<base>`). The plan's Task 1 acceptance criteria 1 and 5 name both gates correctly. `scripts/validate-changesets.mjs` exists and enforces the package name `@automattic/radical-pipelines` and the pre-1.0 no-`major` rule.
- **Bump type is correct.** The authoritative bump table (`CONTRIBUTING.md:92-97`) maps "New features; backwards-compatible additions" to `minor` and forbids `major` pre-1.0. The change is additive (spec R8/AC9, no migration), so `minor` is right and `major` is impossible — the plan states both.
- **Package name and config match.** Root `package.json` name is `@automattic/radical-pipelines`; `.changeset/config.json` `changedFilePatterns` includes `skills/**` and `agents/**` (and `README.md`, `package.json`, `.claude-plugin/**`). The change edits `skills/**` and `agents/**`, so it is release-relevant — the changeset is genuinely mandatory.
- **The README altitude argument is sound, not just asserted.** The two guardrail mentions are at `README.md:147` ("the deterministic verification gates … the code/doc phases must pass") and `:159` (a bare "guardrails" item in the `.rp.md` shared-section list). Neither enumerates the existing phase-tag (`code`/`docs`) granularity, so omitting the new role granularity is consistent; both sentences stay literally true after the change. No README task is warranted.
- **No stale surface anywhere in the skill tree.** A `grep` for `guardrail` across `skills/` returns **only** `load.md` and `setup.md` — exactly the two convention files the code plan (T1, T2) owns. The phase runbooks (`reference/autonomous-phases/`, `reference/assisted-phases/`) and `autonomous-workflow.md` have **zero** guardrail mentions, confirming guardrails are never in a launch payload and those files need no edit. In `agents/`, the only guardrail mentions outside the two code agents are `doc-writer.md` / `doc-reviewer.md`, whose phase-level wording stays literally true (level is inert in docs).
- **`AGENTS.md` and `website/` carry no guardrail/level content.** `AGENTS.md` has no guardrail mentions; `website/` references only the generic writer/reviewer **agents** in the adversarial-pair framing, never guardrails, gates, or `.rp.md` granularity. Both correctly get no task.

## Adversarial completeness checks (all pass)

- **Is the changeset really the docs phase's job, or the code phase's?** Spec AC11 explicitly excludes "release artifacts such as the changeset and any docs-phase output" from the four-file confinement claim, and the code plan's Out-of-scope list (`code-plan.md:115`) states it authors no changeset. The division is clean and non-overlapping — no gap, no duplication.
- **Does the plan duplicate functional documentation the code plan already owns?** No. The plan repeatedly defers the level definition, selection rule, fail-fast, approval guarantee, and `skipped` state to phase 4 (Overview, "Surfaces deliberately not given a task" first bullet, and the "Reference, don't restate" note). Task 1 acceptance criterion 4 actively forbids restating the mechanism in the changeset summary — this is correct drift-resistance under the project's no-cross-path-duplication rule.
- **Could a human-facing surface go stale and be missed?** The whole-repo sweep is reproducible and I reproduced it: README (covered, stays true), CONTRIBUTING (governs the task, not edited), AGENTS.md (no catalog), website (marketing-only), the docs-phase agents and reading path (out of scope by spec AC11), and the dogfood `.rp.md` (migration out of scope). I found no surface the plan missed.
- **Is the "author after phase 4 ships" instruction safe?** Yes. The plan correctly notes the changeset summarizes the capability, not the exact phase-4 strings, so it has no textual dependency on the landed wording — but the Notes still instruct the doc-writer to read the shipped files first. This is belt-and-suspenders, not a contradiction.

## Minor observations (non-blocking, no change required)

- Task 1 acceptance criterion 5 says "no existing changeset or `CHANGELOG.md` entry is edited." This is consistent with the "Historical changesets … are frozen" surface note and with repository convention. No action needed.
- The plan's empty-changeset awareness is implicit: it correctly selects a `minor` (content) bump rather than the `none` empty changeset, because the change is a real user-facing feature, not a prose-only edit to a release-relevant file. The `none` path (`CONTRIBUTING.md:97`) would be wrong here, and the plan does not fall into it.

The plan is ready for the docs phase to execute.
