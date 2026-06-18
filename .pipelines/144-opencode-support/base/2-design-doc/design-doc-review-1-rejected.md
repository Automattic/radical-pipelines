# Design Doc Review — opencode support (via opencode-ensemble)

## Verdict

**Rejected.**

One blocking issue: the design's load-bearing claim that "every other generic skill file stays literally true on opencode with no edit" has an unexamined counterexample in `setup.md`'s context-window sentence, which after opencode is added asserts something the spec declares unverified and not-relied-on. The rest of the design is sound, exceptionally well-researched, and verified against live source; this is a single surgical gap, not an architectural defect.

## Summary

The design is a faithful, minimal realization of the spec: one new convention file (`opencode.md` mirroring `pi.md`), one publishable workspace sub-package re-exporting `@hueyexe/opencode-ensemble` as a meta-plugin, and two authorized generic edits. I independently verified every load-bearing external claim against source @ HEAD and they hold with unusual precision:

- **Worktree neutralization** — `team-spawn.ts:89` `isReadOnly = args.agent === "plan" || args.agent === "explore"` and `:90` `useWorktree = args.worktree !== false && !isReadOnly && …`. The "`worktree: false` load-bearing on every spawn" risk is real and correctly stated.
- **No re-root / no per-spawn directory** — `session.create` (`team-spawn.ts:178-184`) passes `workspaceID` only, never `directory`; the launch-rooted-in-worktree decision is the only source-supported path. Verified.
- **Model resolution** — `resolveModel` (`team-spawn.ts:23-39`) precedence is exactly explicit-arg > `modelsByAgent` > rotate/random > `defaultModel`. The per-`team_spawn` model decision is correctly the highest-precedence path.
- **Config** — `config.ts` `DEFAULT_CONFIG`: `mergeOnCleanup: true`, `stallThresholdMs: 300_000`, `timeoutMs: 1_800_000`, `dashboardPort: 4747`. The stale "3 min" JSDoc (`config.ts:8`) vs. the real 5-min default is exactly as the research flagged.
- **Double-init** — `index.ts` init does `mkdirSync` + `createDb` + watchdog `setInterval` + (main-instance only, `!isWorktreeInstance`) dashboard on 4747. Hazard real; "list only the meta-plugin" mitigation correct.
- **Timeout no-lead-message gap** — `watchdog.ts` `check()` (the `ttlMs` path) marks `timed_out`, `session.abort`, and `tui.showToast`, but unlike `checkStalled()`/`checkChatty()` it does **not** `sendMessage(... to: "lead")`. The design's "known gap" is verified to the line.
- **Auth surface** — fast-idle <15s warning + `session.error` surfaced to lead (`index.ts`); `opencode models` prints `${providerID}/${modelID}` (opencode `cli/cmd/models.ts`). Recovery rule and its CLI-stability hedge are well-founded.
- **Agent bodies tool-agnostic** — grep across all 17 `agents/*.md` finds zero tool/provider names; verbatim-body reuse is sound.
- **Repo tooling** — `TARGET_MANIFESTS = [".claude-plugin/plugin.json"]`, `changedFilePatterns`, root `private:true` with Pi peer-deps. The workspace-sub-package decision and the sync-version/changeset edits are correctly scoped as non-`skills/` build tooling.

The four "untouched-but-relevant" monitor-lifecycle sentences (`autonomous-workflow.md:38`/`:88`, `resume-pipeline.md:9`, `review-pipeline.md:54`, `load.md:21`) match the cited lines and read as no-ops on opencode. Traceability to Requirements 1–19 and the acceptance criteria is complete. Decisions carry genuine alternatives with honest trade-offs. The two accepted observability gaps are correctly surfaced rather than hidden.

## Issues

### Blocking

**1. `setup.md:102`'s context-window sentence is a second generic-file context-window claim the design neither edits nor proves stays true — and after opencode is added it asserts the spec's explicitly-unverified opencode behavior.**

The design (Overview L15; Decision 5; Components L62-63) treats the context-window note as living solely in `health-monitoring.md:24` ("Both Claude Code and Pi auto-compact agent context near the limit, so the monitor would only react after the tool has already handled it"), and rewords only that one. But a **second** generic file makes a universal context-window assertion:

- `setup.md:102` (the "Health monitoring (required)" convention description, *not* the supported-tools table the spec authorizes editing): "Context-window limits are handled by **each tool's own auto-compaction**, not by the monitor."

This sentence universally quantifies over every supported tool. Once opencode is a supported tool, it asserts that opencode handles context-window limits **by auto-compaction** — precisely the claim the spec puts Out of Scope: "Whether opencode auto-compacts context is **unverified** in the research and is **not relied on** by this feature" (spec:59). The design's own stated reason for edit 17b is "asserting nothing about opencode's behavior" (design L63); that same reasoning applies verbatim to `setup.md:102`, yet the design leaves it untouched and never mentions it.

This breaks the design's central scope claim — "every other generic skill file stays literally true on opencode with no edit" (Overview L15; Components L78) — because `setup.md:102` is **not** literally true on opencode under the spec's own premise (opencode auto-compaction unverified). The design must resolve this rather than leave it silently contradicted. Acceptable resolutions:
- Fold `setup.md:102` into the same context-window rewording (the spec speaks of "the context-window note" generally and forbids relying on opencode auto-compaction, so making this sentence tool-agnostic — e.g. "each tool's own mechanism" — is arguably the same authorized edit, not a third file; the design should state this explicitly and confirm it stays within Req 17's "exactly two existing generic files" by treating `setup.md` as one file with the table-row edit and this note edit), **or**
- Explicitly argue why `setup.md:102` remains literally true on opencode despite the unverified-auto-compaction premise (a harder case to make, given the spec's wording), **or**
- At minimum, surface it as an Open Question with a decided default, the way the design handles the Loop-template-placement question — rather than omitting it.

Either way the design as written asserts a property ("every other generic file stays literally true unedited") that has a known counterexample it never examined; that must be corrected before the plan phase, since the plan will otherwise inherit and propagate the incorrect "two files only, everything else literally true" inventory.

### Minor (non-blocking — fix opportunistically, do not gate on these)

**2. Partial quote of the `health-monitoring.md:24` before-text.** Components L63 quotes the edit target as "Both Claude Code and Pi auto-compact agent context near the limit," but the actual sentence continues "…near the limit, **so the monitor would only react after the tool has already handled it.**" The proposed replacement ("each tool handles context-window limits by its own mechanism") drops that trailing causal clause. This is fine as an outcome, but the design's quoted "before" is incomplete; the plan should edit the whole sentence, not a prefix of it.

**3. Tool-name string vs. config-surface coupling for `team_tasks_*`.** The design uses `team_tasks_add`/`team_tasks_list`/`team_tasks_complete`/`team_claim` and `team_message`/`team_broadcast`. Verified the corresponding tool files exist (`src/tools/team-tasks-{add,complete,list}.ts`, `team-claim.ts`, `team-message.ts`, `team-broadcast.ts`). No defect — recording only that the exact invocable tool names (underscore form) should be confirmed against ensemble's registered tool ids at implementation time, since the design depends on the orchestrator calling them by name.

These minor items would not, alone, justify rejection; they are listed so the writer can address them in the same revision pass as the blocking issue.
