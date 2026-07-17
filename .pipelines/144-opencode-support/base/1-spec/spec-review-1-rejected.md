# Spec Review

## Verdict: rejected

## Reviewed revision

cbee2b9 — "Add spec and spec research for opencode support (spec-lead)".

## Verification log

- Q1(a) tool-convention file — read `skills/radical-pipelines/reference/conventions/claude-code.md`; 21 lines; canonical Team spawning / Health monitoring blocks, `/loop` + `CronList` + `CronDelete`, worktree-inside-repo, inform-not-ask — confirmed.
- Only per-tool file — `ls skills/radical-pipelines/reference/conventions/` → `claude-code.md`, `load.md`, `passing.md`, `setup.md` — confirmed.
- Q1/Q3 setup claims — read `setup.md`: Tool→Read table single row (:21-23), inform-not-ask (:29), spawning "across orchestrator sessions" (:73), Setup actions section (:183-189), `.rp.md` commit + gitignore consent (:202-215), skip-when-complete (:222) — all confirmed at the cited lines.
- Q3(a)/(d) loader claims — read `load.md`: required/optional convention table (:7-18); missing-conventions check tests presence only, no tool-match guard — confirmed; grounds requirements 9 and 10.
- Q1(b) packaging/install — read `.claude-plugin/plugin.json` (0.10.0), `marketplace.json` (`automattic`, `source: "./"`), `package.json` (0.10.0, changesets-only devDeps, no runtime deps), README install section (marketplace add + install, local checkout, `--plugin-dir`), `scripts/sync-version.mjs` present; `ls agents/` → 17 profiles; plugin cache `~/.claude/plugins/cache/automattic/radical-pipelines/` holds 0.6.0–0.10.0 — all confirmed.
- Q3(b)/(c) phases and completion — read `SKILL.md` phases table and `pipeline-versioning.md` (:32 lane-branch merge, :36 artifact paths, :49-64 per-phase required-artifact table) — matches requirement 15's artifact enumeration.
- Close-out and spawn conventions — read `autonomous-workflow.md`: spawn with unique name + identifier + model via Agent models applied at spawn (:63-68); close-out = stop monitor, push branches, tell owner (:89-95); no merge/PR step — confirmed.
- Q4(a) liveness contract — read `health-monitoring.md`: four signals (:17-25), 2-retry recovery table (:28-37), identifier propagation (:65), leftover-loop cancel-before-restart (:79) — confirmed; grounds requirement 14.
- Q4(b) resume — read `resume-pipeline.md`: loop persists until cancelled (:9), worktree reuse/recreate from branch (:13), committed-state-only resume (:23) — confirmed; grounds requirement 16.
- Negative greps — re-ran permission/allowlist/sandbox grep over `skills/` + `agents/` → single hit `setup.md:213`; overlap/concurrent-turn grep → no health-loop-related hits — record's claims confirmed.
- Idle-fire property — bundled loop package SKILL.md states "Loops only fire when the agent is idle (not streaming)" — confirmed verbatim; grounds requirement 13's no-overlapping-turns clause.
- Research item 1 (versions) — `npm view`: `opencode-ai@latest` = 1.18.3 (bin `opencode`); `@opencode-ai/cli@next` = 0.0.0-next-15756 (bin `opencode2`) — moved from the record's 15718 within a day, strengthening the moving-beta/pin premise; `@beta`/`@dev` bins = `lildax` (not v2) — caveat confirmed.
- Q2 owner quotes — `gh issue view 144 --comments`: 6 comments, #2-#6 by the owner; "supersedes the **V1-first targeting decision**", "pin the exact CLI and plugin versions and set global `\"autoupdate\": false`", "explicit compatibility matrix and pinned integration tests", "**V2-first, without Ensemble**… pinned minimum beta build until V2 stabilizes", "A thin V1 adapter is justified only if…" — all confirmed verbatim; grounds requirements 2-3 and Out of Scope 1-3.
- Research item 2 (plugin API) — fetched v2 plugins doc and the v2-branch source `packages/plugin/src/v2/effect/{agent,tool,skill,command}.ts`: AgentDraft = list/get/default/update/remove and CommandDraft = list/get/update/remove (no `add`); ToolDraft has `add`; SkillDraft has `source` — the record's premise correction confirmed at source level.
- Research item 3 (session create) — fetched v2 API reference: accepts `agent`, `model`, `location{directory, workspaceID}`; no `parentID` — confirmed; grounds requirement 11's feasibility.
- Research item 4 (skills) — fetched v2 skills doc + repo code search: scans `.claude/skills` (global and project) with progressive disclosure; `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS` exists in `packages/opencode/src/effect/runtime-flags.ts` — confirmed; grounds requirement 6. (Note: the scan paths no longer sit in the record's cited `discovery.ts` on today's `v2` tree — substance holds via docs, runtime flags, and `packages/core/src/plugin/skill/customize-opencode.md`; the drift itself illustrates the pin rationale.)
- Research item 5 (agents) — fetched v2 agents doc: profiles at `.opencode/agents/` / `~/.config/opencode/agents/`, ID derived from filename (no `name` frontmatter), no `.claude/agents` scanning mentioned — confirmed; grounds requirement 7.
- Research items 6-7 (no loop; no CLI plugin install) — fetched full `v2`-branch tree: CLI handlers = api, auth, console, debug, default, mcp, migrate, mini, pair, run, serve, service — no `plugin`, no loop/cron/schedule handler; zero loop/cron/schedule hits in source paths; plugins doc: config-only `plugins` array, git specifiers undocumented, `/api/plugin` returns IDs only, "Match the plugin package version to the OpenCode release you target" — confirmed; grounds requirements 1, 4, 5, 13.
- Open-limitation issues — anomalyco/opencode#36605 and #34957 both open — confirmed as recorded.
- Intent coverage — every goal, constraint, and assumption traced: goal → reqs 1, 15; per-tool pattern → req 8; no-ensemble → req 1 + exclusion 4; v2-compatible → reqs 2-3; pin direction → reqs 2-3; RP-owned-layer direction → reqs 11-14 at outcome level, mechanism dispositioned to design; scheduler direction → req 13; Git-distribution direction → invalidated by research item 7 and explicitly re-dispositioned to design — complete.
- Fidelity — spec.md requirements 1-16 and Out of Scope 1-7 match the record's consolidated lists near-verbatim; Overview accurately carries both premise corrections — confirmed.
- AC ↔ requirement cross-check — every AC traces to a requirement; requirement 5 has no AC, and requirement 14's message-failure and network-failure recovery rows are uncovered → Issue 1.
- Worktree clean before writing this review — `git status --porcelain` empty at cbee2b9 — confirmed.

## Summary

The record is thorough and honest: every load-bearing claim carries a declared check, and every check I re-ran — skill-file line citations, packaging facts, owner quotes on issue #144, and the seven opencode-v2 research items, which I re-verified independently against npm, the v2 docs, and the `v2` branch source — reproduced. The two premise corrections (no in-process agent/command registration; no direct-from-Git CLI install) are properly recorded and no requirement leans on the corrected premises. Scope, altitude, and intent coverage are sound; the lead's scope decisions where the owner was silent are explicitly recorded and defensible; the tool-mismatch guard is well-grounded negative space. The single defect is acceptance-criteria coverage: requirement 5 (update) has no acceptance criterion at all, and requirement 14's recovery matrix is only half exercised. This is a small, precise fix.

## Issues

### Issue 1: Acceptance criteria omit requirement 5 entirely and cover only half of requirement 14's recovery matrix

**What's wrong:** No acceptance criterion exercises the documented update procedure (requirement 5). Requirement 14 names four observable signals and five recovery actions, but the criteria test only the no-output-stall path (ping → restart → identifier propagation) and the auth-error path (model-swap → re-spawn); message-failure observation with re-send, and network-failure surfacing with retry, appear in no criterion.

**Where:** `spec.md` — Acceptance Criteria section, against Requirements 5 and 14.

**Suggestion:** Add three Given-When-Then criteria: (1) Given an installed RP at an older release, when the owner follows the documented update procedure, then the RP-provided version surface reports the newer release and the updated skill and agents are the ones in effect. (2) Given a directed inter-agent message that fails or is not delivered, when the health monitor acts, then the delivery failure is observable, the message is re-sent, and on a second failure the target agent is restarted. (3) Given a tool call failing with a transient network error, when the health monitor acts, then the error is observable and retried per the recovery table.

**Why it matters:** Build-phase tests are written from the acceptance criteria; an uncovered requirement can ship unverified. Update is exactly the surface the research shows to be non-trivial under opencode (config-only plugin loading, isolated cache, restart-after-version-change, no version reporting) — it is why requirement 5 exists — and message-failure re-send is a named recovery action the opencode layer must make possible, not a free byproduct of happy-path messaging.
