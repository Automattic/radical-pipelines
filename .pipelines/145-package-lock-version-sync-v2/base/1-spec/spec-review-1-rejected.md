# Spec Review

## Verdict: rejected

## Summary

This is a strong, well-grounded spec. Every factual claim in the Overview checks out against the codebase: `package.json` is at `0.4.0`, both lockfile version fields (`.version` and `.packages[""].version`) are drifted at `0.1.1`, `plugin.json` is at `0.4.0`, there are no pending changesets, and the two CI workflows (`release.yml`, `changeset-gate.yml`) are as described. The binding owner constraint (`npm install --package-lock-only`) is correctly named and cited as a constraint rather than smuggled in as a design choice, the guaranteed invariant is framed conservatively and correctly ("version fields match + idempotent," not "only those fields ever change"), the backfill is scoped to `0.4.0`, the drift guard is included, and Out of Scope is explicit with offline-not-required first. The reason for rejection is narrow but real: the Acceptance Criteria under-cover the drift guard. The guard's requirements (10–11) elevate `.claude-plugin/plugin.json` to a first-class checked location and promise an actionable message, yet no Given-When-Then exercises a `plugin.json` disagreement, and the message-content promise is left untestable. These gaps need closing before the spec is buildable-and-testable end to end.

## Issues

### Issue 1: No acceptance criterion exercises a `.claude-plugin/plugin.json` version disagreement

**What's wrong:** Requirements 5 and 10 make `.claude-plugin/plugin.json` a first-class member of the four checked version-bearing locations, and requirement 10 states the guard "fails when the version is inconsistent across `package.json`, `.claude-plugin/plugin.json`, and the two lockfile version fields." But the Acceptance Criteria for the drift guard only cover three cases: all-four-agree (pass), lockfile-disagrees (fail), and `package.json`-hand-edited (fail). There is no criterion where `plugin.json` is the sole or a contributing disagreeing file. Since the guard treats all four locations symmetrically per requirement 10, a `plugin.json`-only drift is a distinct, plausible failure path that the criteria leave unverified — an implementer could ship a guard that ignores `plugin.json` and still pass every listed criterion.

**Where in spec:** Acceptance Criteria, "Drift guard on the pull-request gate" (spec.md:59-63), against Requirements 5 and 10 (spec.md:20, 31).

**Suggestion:** Add a Given-When-Then for a `plugin.json` disagreement, e.g.: "Given a pull request in which `.claude-plugin/plugin.json`'s version disagrees with `package.json` and the lockfile, when the pull-request gate runs, then the drift guard fails with a message identifying `.claude-plugin/plugin.json` as the offending file."

**Why it matters:** Acceptance criteria must cover the edge cases the requirements create. Requirement 10 explicitly checks four locations; the criteria test only two of the four as failure sources. Without this case, the guard's coverage of `plugin.json` is asserted in the requirements but never made testable, so downstream tests can be written that fully pass while the requirement is unmet.

### Issue 2: Requirement 11's "actionable message" promise is not testably pinned by any acceptance criterion

**What's wrong:** Requirement 11 states that on failure the guard "reports an actionable message identifying the offending file(s) and the conflicting version(s)." None of the acceptance criteria assert the *content* of the message — the failing-case criterion (spec.md:62) only says the guard "fails with a message identifying the inconsistency," which restates the requirement loosely rather than making it verifiable. "Identifying the offending file(s) and the conflicting version(s)" is a concrete, testable claim (the message names the file and shows the two versions), but no criterion expresses it in a form a test can check.

**Where in spec:** Acceptance Criteria, "Drift guard on the pull-request gate" (spec.md:62), against Requirement 11 (spec.md:32).

**Suggestion:** Strengthen the failing-case criterion (or add one) so the message content is testable, e.g.: "...then the drift guard fails and the reported message names the offending file(s) and shows the conflicting version values." The repo's existing convention (`validate-changesets.mjs` emits `file:line: message`) confirms a checkable message format is feasible, so the criterion can be made concrete without prescribing implementation.

**Why it matters:** A requirement that promises actionability but has no acceptance criterion pinning what "actionable" means cannot be verified — an implementer could emit a bare "version drift detected" with no file or version and satisfy every listed criterion. The criteria must make requirement 11 falsifiable.
