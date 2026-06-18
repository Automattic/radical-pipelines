# Design Doc Review (N=2) — opencode support (via opencode-ensemble)

## Verdict

**Approved.**

The revision resolves the single blocking issue from review N=1 and addresses both minor items, introducing no new defects. The design remains a faithful, minimal, source-verified realization of the spec.

## Summary

Review N=1 rejected on one blocking gap: the design's central scope claim ("every other generic skill file stays literally true on opencode with no edit") had an unexamined counterexample at `setup.md:102` — a *second* generic-file context-window assertion that, once opencode joins the supported-tools set, would assert opencode auto-compacts (precisely what spec:59 puts Out of Scope as "unverified … and not relied on"). Two minor items accompanied it: a partial quote of the `health-monitoring.md:24` before-text, and a note to confirm ensemble's underscore-form tool ids at implementation time.

I re-verified the blocking fix against live source and the framing across the whole document. All three are genuinely resolved:

**Issue 1 (blocking) — resolved.** The design now treats `setup.md` as one file with **two edit sites** and folds the `setup.md:102` context-window clause into the authorized context-window rewording (the first resolution N=1 offered). I confirmed against live source:
- `setup.md:102` reads exactly "Context-window limits are handled by each tool's own auto-compaction, not by the monitor." — the design's quoted "before" matches it, so the edit is applicable.
- `health-monitoring.md:24` reads exactly "…Both Claude Code and Pi auto-compact agent context near the limit, so the monitor would only react after the tool has already handled it." — matches the design's (now full) quote.
- A repo-wide grep for context-window assertions (`auto-compact|context-window|auto-compaction`) across `skills/radical-pipelines/` returns **exactly two hits** — `setup.md:102` and `health-monitoring.md:24`. The design's claim "the only two such assertions live in the two edited files" (L82) is true against HEAD. No third generic file carries one.
- A grep for the fixed tool-pair (`Claude Code and Pi`) returns only `health-monitoring.md:24` — no other generic file names the pair. The "names no fixed set of tools after the edit" property holds.

The "exactly two files" contract therefore holds: the design edits exactly `setup.md` and `health-monitoring.md`; the second setup.md edit site keeps the **file** count at two (the spec's controlling constraint in Req 17 is a file count) while honoring spec:59. Leaving `setup.md:102` unedited would have breached spec:59 — the more fundamental constraint — so editing the second site is the correct resolution, and the rewording ("each tool's own auto-compaction" → "each tool's own mechanism") is behavior-preserving for Claude Code and Pi (a strict generalization that still describes their auto-compaction; the monitor still watches no context-window limit on any tool). The framing is now internally consistent across all five passages (Overview L13, Approach L23/L33, Components L60/L62-64, Decision 5 L134, UNTOUCHED L82); no passage still describes setup.md as a single-edit file.

I also re-confirmed the four "stay-unedited" monitor-lifecycle sentences (`autonomous-workflow.md:38`/`:88`, `resume-pipeline.md:9`, `review-pipeline.md:54`, `load.md`) each defer to the Health monitoring convention (`per reference/health-monitoring.md`, `per the Health monitoring convention`), so they read as no-ops on opencode unedited — Req 18 holds.

**Issue 2 (minor) — resolved.** Components L67 now quotes the full `health-monitoring.md:24` sentence including the trailing "…so the monitor would only react after the tool has already handled it" clause, and states explicitly that the replacement edits the whole sentence, not a prefix.

**Issue 3 (minor) — addressed.** A new "Tool-name forms" paragraph (Interfaces L100) lists the underscore-form tool names, ties them to the verified ensemble source files at HEAD, and records that the exact registered tool ids must be confirmed against ensemble's registry at implementation time — exactly the note N=1 asked for.

Everything verified as sound in N=1 (worktree neutralization via `worktree: false`, no re-root / no per-spawn directory, model-resolution precedence, the `.opencode/ensemble.json` config surface, the double-init hazard + "list only the meta-plugin" mitigation, the timeout no-lead-message gap, the auth-recovery rule via `opencode models`, verbatim agent bodies, and the workspace-sub-package packaging with sync-version/changeset tooling edits scoped as non-`skills/`) is unchanged and carries forward. Traceability to Requirements 1–19 and the acceptance criteria remains complete; decisions retain genuine alternatives with honest trade-offs; the two accepted observability gaps remain surfaced rather than hidden.

## Issues

None blocking. The revision resolves all N=1 issues without introducing new defects. The Open Questions the design defers to implementation (Loop-template placement, opencode threshold values, workspace tooling choice, `opencode models` CLI-surface stability) are appropriately scoped to later phases and do not gate approval.
