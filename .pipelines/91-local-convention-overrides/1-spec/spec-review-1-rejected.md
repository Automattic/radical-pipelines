# Spec Review

## Verdict: rejected

## Summary

The spec is well-organized, faithfully tracks the consolidated requirements, keeps a clear and explicit Out-of-Scope section, and shows strong discipline in fencing off mechanism ("Mechanism is a design decision; the observable requirement is…"). Its weaknesses are not omissions of whole requirements but a small number of internal inconsistencies and coverage gaps clustered around the **Issues convention** and around requirements that have no matching acceptance criterion. The most serious is that the spec's merge model (override only labeled units the committed file already exposes) contradicts how the Issues access-mechanism actually appears in a committed `.rp.md` (inline prose, no label), and one acceptance criterion asserts a "distinct labeled sub-statement" structure that does not exist today. Two other non-overridable/ignored categories — tracker identity and tool-forced mechanism conventions — are declared in the requirements but never given a defined observable outcome (which warning, if any). Finally, the explicitly-flagged worktree-visibility requirement has no acceptance criterion. These are concrete, fixable, and worth correcting before the spec advances. Fix the items below and resubmit.

## Issues

### Issue 1: The Issues access-mechanism is not a "labeled sub-statement" in a committed `.rp.md`, contradicting the merge model

**What's wrong:** Requirement 8 states overrides "key off the exact heading or bullet label the committed `.rp.md` uses; no granularity finer than the labels the committed file already presents is recognised." Requirement 12 makes the **Issues access-mechanism** overridable while the tracker identity is not, and the acceptance criterion (spec line 100) asserts the committed Issues convention "names the tracker identity and the access-mechanism as distinct labeled sub-statements."

But in a real committed `.rp.md` (the dogfood instance, `.rp.md` lines 7–34) the access mechanism is **inline prose**, not a labeled unit: `https://github.com/Automattic/radical-pipelines — accessed via the \`gh\` CLI`. There is no `**Access:**`/`**Tracker:**` label. `setup.md:62-66` likewise describes *what the orchestrator asks* ("which tracker… and how to access it"), not a labeled structure the committed file carries. So an override targeting the access-mechanism has no label to key off, which requirement 8 explicitly forbids matching at finer-than-label granularity. The spec presents the "distinct labeled sub-statement" structure as a given that does not exist.

**Where in spec:** Requirements 8 and 12; Acceptance Criteria, the Issues merge bullet (line 100).

**Suggestion:** Resolve the contradiction at spec level. Either (a) make it an explicit requirement that the Issues convention must expose the access-mechanism as its own labeled unit (so requirement 8's label-keying can apply), and state that the committed `.rp.md` format provides such a label — noting this is an observable change to how Issues is structured; or (b) if no structural change to Issues is intended, restate the Issues acceptance criterion so it does not assert a labeled sub-statement that the committed file lacks, and reconcile it with requirement 8. Do not leave requirement 12 depending on a label that requirement 8 says must already exist while the committed file has none.

**Why it matters:** This is the load-bearing example the research repeatedly cites as proof that per-unit (not whole-file) merge is correct. As written, two implementers diverge: one restructures the Issues block to expose a label; another matches an inline substring, which requirement 8 prohibits. The single most-cited motivating sub-case is therefore unbuildable as specified.

### Issue 2: Overriding the (inherently non-overridable) tracker identity has no defined observable outcome

**What's wrong:** Requirement 12 declares the Issues **tracker identity** "is not overridable," but it is neither one of the enumerated shared/out-of-scope conventions in requirement 13/16 (commit format, artifact folder, slug, branch names, worktree naming) nor necessarily the project opt-in non-overridable marker of requirement 14 — it is *inherently* locked as a sub-part of an in-scope block. None of the four warning requirements (15–18) names this case. So if a `.rp.local.md` overrides the tracker identity, the spec does not say what happens: ignored silently? warned under requirement 15's wording? under requirement 16's wording? The acceptance criteria only test the happy path ("override only the access-mechanism → tracker identity retained," line 100); there is no criterion for "override the tracker identity."

**Where in spec:** Requirement 12 vs. requirements 13–16; Acceptance Criteria (no case for overriding tracker identity).

**Suggestion:** State explicitly which warning category an attempt to override the tracker identity falls under (it reads most naturally as the requirement-16 "affects shared output" family, since tracker identity is shared across collaborators), or define a distinct outcome. Add a matching Given-When-Then acceptance criterion.

**Why it matters:** Tracker identity is the one sub-part the spec singles out as locked inside an otherwise-overridable block; leaving its override outcome undefined makes the most subtle case of the dividing line untestable and lets implementers disagree on whether it warns at all.

### Issue 3: Tool-forced mechanism conventions are "ignored" but no warning is required for them

**What's wrong:** Requirement 13 says attempts to override "tool-forced mechanism conventions (those dictated by the active tool's surface)" are ignored — alongside the shared-output conventions. But requirement 16 (the warning for ignored attempts) enumerates only "commit format, slug, artifact folder, or branch/worktree names" and does **not** mention tool-forced mechanism conventions. So when a developer tries to override, say, `TeamCreate`/team-spawning or the `/loop` command form (tool-forced per `claude-code.md:1-6`), requirement 13 says it is ignored, but it is unclear whether a warning is required. The acceptance criterion (line 112) mirrors requirement 16's list and omits tool-forced conventions too.

**Where in spec:** Requirement 13 vs. requirement 16; Acceptance Criteria (line 112).

**Suggestion:** Decide and state whether ignoring a tool-forced override warrants a warning, and if so add it to requirement 16's coverage (and a matching acceptance criterion). If no warning is intended for that subclass, say so explicitly so the silence is deliberate rather than a gap.

**Why it matters:** "Ignored with no feedback" is exactly the silently-inert behavior the research warns erodes trust (Q4(d)). Whether tool-forced overrides warn is a directly observable outcome an implementer must get right; today it is undefined.

### Issue 4: The worktree-visibility requirement has no acceptance criterion

**What's wrong:** Requirement 7 is a distinct, non-trivial requirement — an override authored at the project root must take effect even though the run executes inside a git-ignored worktree where `.rp.local.md` is not automatically present. The research flagged this as a "must-resolve" wrinkle. Yet the Acceptance Criteria section contains no Given-When-Then that directly exercises "override authored at the project root takes effect in the run despite the worktree." The merge-semantics criteria assume the override is already in effect and never assert the worktree-crossing observable.

**Where in spec:** Requirement 7; Acceptance Criteria (none cover it).

**Suggestion:** Add an acceptance criterion of the form: "Given a `.rp.local.md` authored at the project root and a run executing inside the Claude Code worktree, when conventions are resolved, then the root override takes effect in the run." Keep it at the observable level (do not bake in the mechanism).

**Why it matters:** A requirement with no acceptance criterion cannot be verified and is the first thing to silently regress. This one is precisely the hard part the research singled out, so leaving it untested is the riskiest omission in the criteria.

### Issue 5: Requirement 3's fork-mode explanation drifts into mechanism

**What's wrong:** Requirement 3's second sub-bullet explains the fork-mode cherry-pick "also excludes non-code commits, which is a never-needed secondary layer for this file (there is no commit containing it for the cherry-pick to act on)." This describes the internal mechanism of fork-mode close-out (defense-in-depth) rather than stating an observable outcome; the observable ("never appears in the upstream PR diff") is already stated. The explanatory mechanism belongs in the design phase, not the spec.

**Where in spec:** Requirement 3, second bullet.

**Suggestion:** Reduce requirement 3 to the observable guarantee (never in any commit / pipeline branch / fork branch / upstream PR diff) and the two complementary *reasons* at a one-line altitude (file-level: git-ignored; effect-level: only local-runtime conventions overridable). Move the cherry-pick "secondary layer" explanation out of the spec or compress it to a single non-mechanistic clause.

**Why it matters:** Minor relative to the others, but the spec should stay on WHAT. Embedding the cherry-pick's internal behavior here pre-commits a design detail and mixes altitudes; it is the one place the otherwise-disciplined HOW-fencing slips.

## Note (not blocking)

The acceptance criteria correctly stay observable even though the "loader" is an LLM reading Markdown rather than deterministic code; that is a design concern, not a spec defect, and is acknowledged in the research. No change requested there. Resolving Issues 1–4 (and trimming Issue 5) is sufficient for approval.
