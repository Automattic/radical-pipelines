# Spec Review

## Verdict: rejected

## Summary

The spec is well-structured, accurate about the codebase (the two lockfile version fields at lines 3 and 9, the `sync-version.mjs` propagation gap, the release flow, and the CI gate all check out), and covers all 13 consolidated requirements with mostly clean Given-When-Then acceptance criteria and an explicit Out of Scope section. It is close. However, it has one genuine internal contradiction (an absolute "no network" requirement that the spec's own open-mechanism choice cannot guarantee), one unaddressed consistency gap (the drift check's CI placement collides with the bot-PR exemption on the very PR that carries the lockfile fix), a requirement-vs-criterion wording mismatch on the network bar, and a missing acceptance criterion. These need resolving before the spec is solid ground for design.

## Issues

### Issue 1: Absolute "no network" requirement contradicts the explicitly-open mechanism choice

**What's wrong:** Requirement 8 states the automatic sync "does not depend on registry availability to update the lockfile version" — an absolute guarantee. But the Out of Scope section deliberately leaves the mechanism open: "Choosing the implementation mechanism for the automatic sync (e.g. refreshing the lockfile via npm versus patching the version fields directly)... leaves the mechanism to the design phase." Per spec-research Q3, the `npm install --package-lock-only` mechanism "MAY contact the registry if anything needs resolving (not guaranteed offline-safe)." So the spec simultaneously (a) permits a mechanism that cannot guarantee offline operation and (b) mandates that the outcome be offline-guaranteed. A design that picks the permitted npm mechanism could satisfy Out of Scope while violating Requirement 8 — the spec is internally contradictory.

**Where in spec:** Requirement 8 (line 25) vs. Out of Scope bullet 4 (line 43).

**Suggestion:** Either tighten Requirement 8 so it constrains the mechanism enough to be satisfiable (e.g. the sync must not introduce a *new* network dependency / must work with whatever the release flow already does), or narrow the Out of Scope bullet to exclude mechanisms that cannot meet the no-network bar. Make the two sections agree on whether offline operation is an absolute outcome the design must honor.

**Why it matters:** A design reviewer cannot tell whether an npm-based mechanism is acceptable. The contradiction lets two implementers build mutually-incompatible-yet-"compliant" solutions, which is exactly the ambiguity a spec must eliminate.

### Issue 2: "No network" requirement and its acceptance criterion state different bars

**What's wrong:** Requirement 8 says the sync "does not depend on registry availability" (absolute). The matching acceptance criterion (line 52) weakens it to "without depending on registry availability *beyond what the release already requires*" (conditional/relative). These are two different testable claims. The reader cannot tell which is the bar a test must verify.

**Where in spec:** Requirement 8 (line 25) vs. Acceptance Criteria (line 52).

**Suggestion:** Pick one phrasing and use it in both places. (Resolving Issue 1 will likely force this choice anyway.)

**Why it matters:** Acceptance criteria are the contract for what tests assert. A requirement that doesn't match its own acceptance criterion gives the test author two incompatible targets.

### Issue 3: Drift check CI placement collides with the bot-PR exemption — unaddressed

**What's wrong:** Requirement 11 and its acceptance criterion (lines 31, 56) say the drift check "runs in CI on pull requests to `trunk`" and "blocks merge if it fails." Per spec-research Q4, the natural home is `changeset-gate.yml`. But that workflow exempts the bot PR via `if: github.head_ref != 'changeset-release/trunk'` (changeset-gate.yml:18). The "Version Packages" PR that carries the synced lockfile (Requirement 9) IS that bot PR. So a drift check placed in `changeset-gate.yml` would never run on the very PR that introduces the lockfile change. The spec does not state whether the bot PR is in or out of scope for the drift check, leaving a real coverage question unanswered: does the check guard only human PRs, and is it acceptable that the lockfile-bearing bot PR is unchecked?

**Where in spec:** Requirement 11 (line 31) and Acceptance Criteria (line 56), in relation to Requirement 9 (line 26).

**Suggestion:** State the observable scope of the drift check explicitly — e.g. "the check runs on pull requests to `trunk` (the bot 'Version Packages' PR is/ is not exercised by it)." Keep it at the WHAT level (which PRs the guard must protect), without prescribing the workflow file. If the intent is that the automatic sync makes the bot PR correct by construction so it needn't be re-checked, say that.

**Why it matters:** This is the prevent-regression half of the feature. If the spec is silent on whether the lockfile-carrying PR is in the check's scope, the design could ship a guard that demonstrably never inspects the file whose drift started this whole effort.

### Issue 4: Requirement 13 has no acceptance criterion

**What's wrong:** Requirement 13 (script conventions: no new external runtime dependencies, no network dependency for the sync itself, repo testability/self-containment conventions) has no corresponding entry in the Acceptance Criteria list. The 11 criteria cover requirements 1–12; requirement 13 is never expressed as a verifiable outcome.

**Where in spec:** Requirement 13 (line 36); Acceptance Criteria section (lines 47–58).

**Suggestion:** Add a Given-When-Then criterion for the conventions that are observable (e.g. "Given the new/changed version logic, when its dependencies are inspected, then it pulls in no new external runtime dependency"). If parts of req 13 are deemed pure HOW and not independently testable, note that explicitly so the gap is intentional rather than an omission.

**Why it matters:** Every other requirement has an acceptance criterion that makes it testable. An un-criterioned requirement is easy to silently drop during implementation, and the "no new external dependency / no network for the sync" portion is a real, checkable constraint that the rest of the spec leans on (see Issue 1).

### Issue 5: Multi-file / multi-field drift behavior is underspecified

**What's wrong:** The drift-check failure criterion (line 55) says the check "fails with a non-zero exit status and a message identifying the mismatched file and field." It is phrased in the singular and does not state the expected behavior when more than one of the three files (or more than one field within `package-lock.json`) drifts at once — e.g. must it report all mismatches, or is reporting the first sufficient? Given the live drift involves both lockfile fields simultaneously, this is not a hypothetical edge case.

**Where in spec:** Requirement 10 (line 30) and Acceptance Criteria (line 55).

**Suggestion:** Specify the observable behavior for multiple simultaneous mismatches (report all vs. report at least one), so the test author knows what to assert.

**Why it matters:** "Identifying the mismatched file and field" reads as exactly one mismatch; the real-world case has two. Without a stated expectation, two implementers could build a single-error reporter and an all-errors reporter and both claim conformance.
