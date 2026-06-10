# Spec Review

## Verdict: approved

## Summary

The revised spec resolves all five issues raised in `spec-review-1-rejected.md` and survives a fresh adversarial pass with no new material problems. The merge model now grounds itself in the actual structure of a committed `.rp.md` (named prose sub-statements, not invented `**bold**` labels), which removes the central contradiction around the Issues convention. Every non-overridable and ignored category — the project opt-in marker, shared-output conventions, the inherently-locked Issues tracker identity, and tool-forced mechanism conventions — now has a defined observable outcome and a matching Given-When-Then acceptance criterion. The previously-untested worktree-crossing requirement is now covered. The spec faithfully tracks all 26 consolidated requirements, keeps an explicit Out-of-Scope section, maintains clean WHAT-not-HOW altitude (mechanism is consistently fenced off as a design decision), and its acceptance criteria are specific enough to drive tests. Approved.

## Verification of the five prior issues

### Issue 1 — Issues access-mechanism not a "labeled" unit: RESOLVED

Requirement 8 (spec lines 30–35) no longer claims overrides "key off the exact label." It now defines the unit as "the smallest **named sub-statement the committed `.rp.md` already presents**" and enumerates three shapes: labeled bullets (Agent models), **named prose sub-statements within one block** (the Issues case — tracker identity vs. access), and atomic conventions. This matches the real dogfood `.rp.md`, whose Issues block presents "GitHub is the source of truth" (line 9) and "accessed via the `gh` CLI" (line 11) as distinct prose statements with no `**Access:**` label. The acceptance criterion (spec line 109) now reads "distinct **named sub-statements**" rather than "labeled sub-statements," so it no longer asserts a structure the committed file lacks. The contradiction between requirements 8 and 12 is gone; the most-cited motivating sub-case is now buildable as specified.

### Issue 2 — Tracker-identity override had no defined outcome: RESOLVED

Requirement 12 (spec line 47) now states that an attempt to override the tracker identity "is ignored and warned under requirement 16." Requirement 16 (spec lines 56–59) adds an explicit second family — "**The Issues tracker identity** — the source-of-truth tracker, an inherently-locked named sub-statement." A matching acceptance criterion (spec line 122) tests the override-tracker-identity path end to end (ignored, committed identity retained, warning naming the unit). The case is now defined and testable.

### Issue 3 — Tool-forced conventions ignored but no warning required: RESOLVED

Requirement 13 (spec line 48) now ties tool-forced overrides to "ignored and warned under requirement 16," and requirement 16 adds the third family "**Tool-forced mechanism conventions**." An acceptance criterion (spec line 123) tests a tool-forced override (team-spawning / worktree command form) producing an ignore-plus-warning. The form-versus-argument nuance (the `/loop` command form is tool-forced, but the cadence it carries remains overridable per requirement 12) is stated in requirement 13 and exercised on both sides (cadence overridable, line 110; command form rejected, line 123). No silent-inert gap remains.

### Issue 4 — Worktree-visibility requirement had no acceptance criterion: RESOLVED

A new acceptance criterion (spec line 98) reads: "Given a `.rp.local.md` authored at the project root and a run executing inside the Claude Code worktree (`.claude/worktrees/<slug>`, where the git-ignored override is not automatically present), when conventions are resolved, then the root-authored override takes effect in the run." It stays at the observable level and does not bake in the mechanism, exactly as requirement 7 intends.

### Issue 5 — Requirement 3 drifted into mechanism: RESOLVED

Requirement 3 (spec lines 17–19) now states the observable guarantee (never in any commit, pipeline branch, fork branch, or upstream PR diff) plus the two complementary one-line reasons (file-level "never committed" because git-ignored; effect-level "never affects others" because only local-runtime conventions are overridable). The cherry-pick "secondary defense-in-depth layer" mechanism explanation has been removed. The altitude slip is corrected.

## Fresh adversarial pass

- **Grounding against the real files.** Verified requirement 8's three convention shapes against `.rp.md` (Agent-models bullet shape per `setup.md:88–98`; Issues prose split at `.rp.md:9`/`:11`; atomic health cadence at `.rp.md:74–78`) and against `claude-code.md:1–6` for the tool-forced families. The spec's structural claims are accurate.
- **Completeness.** All 26 consolidated requirements map into the spec: consolidated 1–24 to spec requirements 1–24, and consolidated 25–26 to the two Out-of-Scope bullets. The spec adds no scope beyond the consolidated set; its two extra Out-of-Scope notes (no dedicated authoring flow, no mandatory intent-detection) restate the negatives already in requirements 19 and 21.
- **Acceptance-criteria coverage.** Every behavioral and warning requirement (15–18, 22, 24) has at least one Given-When-Then criterion, including all three families under requirement 16. The four cases that were missing or under-covered in v1 are now present.
- **Internal consistency.** No contradiction between requirement 11 (local-wins) and requirement 14 (project opt-in lock), nor between requirement 12 (Issues access overridable) and requirement 13 (health-monitoring command form tool-forced) — the form/argument distinction is drawn explicitly and consistently.
- **Altitude.** Mechanism is fenced off throughout (requirement 7's "How the loading flow makes the override available... is a design decision"; the warnings preamble's "Whether a warning appears inline or batched is a design detail"). The spec stays on WHAT.

No new material issues found. The acceptance criteria correctly stay observable even though the "loader" is an LLM reading Markdown rather than deterministic code; that is a design concern, not a spec defect.
