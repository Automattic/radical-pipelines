# Code Plan Review

## Verdict: rejected

## Summary

The plan is strong on the substance of the feature: the structured-patch approach, the dedicated `syncLockfileVersion` function, the `check-version-sync.mjs` collect-all-mismatches design, the CI wiring, and the one-time drift correction all line up with the design doc, and every factual claim about the codebase checks out (lockfile `.version`/`.packages[""].version` at lines 3 and 9 are `0.1.1`; `@changesets/logger` at line 721 is the legitimate `0.1.1` dependency the structured patch must not corrupt; `package.json`/`plugin.json` at `0.4.0`; lockfile is `lockfileVersion: 3`, 2-space indent, trailing newline; the `changeset` job's trigger and bot-PR `if` are as described; "Guardrail scopes: None" is the correct rendering because the project defines no gates). However, three issues block approval: (1) the E2E flows that drive `sync-version.mjs` instruct an action the script cannot perform — running "the real CLI" against a fixture cwd/repoRoot, which the CLI ignores entirely; this is both a feasibility defect and a hidden design decision; (2) the spec acceptance criterion for the "Version Packages" PR containing the lockfile (Requirement 9) is silently dropped — never traced, never acknowledged; (3) Task 4 declares a dependency on Task 1 only, but one of its own acceptance criteria requires the script created in Task 2.

## Issues

### Issue 1: E2E Flows 1–4 tell the code-writer to drive `sync-version.mjs` as a "real CLI" against a fixture, which the script cannot do

**What's wrong:** Flows 1, 2, 3, and 4 each instruct: "Run the real `scripts/sync-version.mjs` CLI with the fixture as its working repo root" / "Run the real sync CLI" against a temp-dir fixture, and Flow 1 expects "The CLI exits successfully and reports `package-lock.json` ... on stdout." But the script's CLI block runs `syncVersion()` with **no options**, and `syncVersion` defaults `repoRoot` to `REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")` — derived from the script file's own location, not `process.cwd()`. The CLI accepts no arguments and reads no env var, so there is no mechanism to point the real `sync-version.mjs` CLI at a fixture directory. Flow 1's parenthetical "e.g. via the fixture as cwd / repoRoot path the CLI uses" describes a capability the CLI does not have.

This is confirmed by the design doc itself: the `repoRoot` override is a **function-level** option ("The existing `options.repoRoot` override (used by tests)", interface block lines 77–83), and the design explicitly distinguishes "the CLI-against-the-real-repo case" from the `syncVersion`-function case (Failure Modes, line 168). The design never adds a CLI-level fixture-targeting mechanism. Contrast `validate-changesets.mjs`, whose `main()` reads files via **relative paths**, which is precisely why `spawnSync(..., { cwd: dir })` works for it (and for the plan's Flows 5–7) — `sync-version.mjs` has no equivalent.

**Where in plan:** `## E2E test plan` Flows 1, 2, 3, 4 (and Task 5's "Automate Flows 1–4 ... driving the script as a real CLI / via `syncVersion`").

**Suggestion:** Rewrite Flows 1–4 to drive the lockfile-sync behavior through the supported mechanism — `syncVersion({ repoRoot: <fixture> })` against a temp-dir fixture (the way every existing `sync-version.test.mjs` case already works) — and drop the "real CLI" / "fixture as cwd" framing for these flows, OR, if a true subprocess-against-fixture flow is genuinely wanted, add an explicit task (within design scope) to give `sync-version.mjs` a CLI repoRoot mechanism and have the design phase bless it first. As written, Task 5 lets the code-writer-e2e silently pick one of these, which is the design decision this issue is about.

**Why it matters:** A flow that names an action the script cannot perform is not implementable as authored. It forces the code-writer-e2e to either invent a CLI override (a design change/scope expansion not in the design doc) or quietly substitute `syncVersion({ repoRoot })` for "the real CLI" (a design decision made mid-task). Two code-writers would not produce the same thing. The flows are the concrete artifact the e2e writer implements, so the ambiguity must be resolved in the plan, not in the writer's head.

### Issue 2: The "Version Packages PR includes the lockfile" acceptance criterion (Requirement 9) is silently dropped

**What's wrong:** Spec Requirement 9 and its acceptance criterion — "Given a release version bump produces a 'Version Packages' pull request, when that pull request is inspected, then it includes the updated `package-lock.json` alongside `package.json`, `.claude-plugin/plugin.json`, and the changelog" — is never traced to by any task or flow, and is never mentioned anywhere in the plan (no occurrence of "Version Packages" outside the unrelated Flow 8 bot-PR text, and no task's Traces-to lists Requirement 9). The design doc deliberately establishes this is not in-tree assertable (Risks: "documented action behavior, not asserted by the YAML ... worth a verification note in a later phase"), so it is legitimate that no task *implements* it — but the plan must still acknowledge the criterion exists and state why it has no covering task, rather than omitting it entirely.

**Where in plan:** `## Tasks` (no task traces Requirement 9); `## E2E test plan` (no flow covers the bot-PR lockfile contents); `## Overview`.

**Suggestion:** Add an explicit note (in the Overview or as a short "not in-tree verifiable" annotation, mirroring the way Flow 8 already annotates the branch-protection caveat for Requirement 11) recording that the Requirement 9 acceptance criterion is satisfied by the reused release path (the changesets release action committing working-tree changes) and is verifiable only by inspecting a produced bot PR — not by any in-tree task — so the reader can see it was considered, not forgotten.

**Why it matters:** A reviewer/orchestrator reading the plan cannot distinguish "deliberately deferred because not in-tree verifiable" from "overlooked." Silent omission of a spec acceptance criterion is exactly the coverage gap the review exists to catch; making the deferral explicit closes the gap without adding any work.

### Issue 3: Task 4's dependencies do not cover its own acceptance criteria

**What's wrong:** Task 4 declares `Depends on: Task 1`, but its final acceptance criterion is "Running `node scripts/check-version-sync.mjs` against the real repository root after the correction exits `0`." That script does not exist until Task 2 creates it. So Task 4's declared dependency set is insufficient for Task 4's own acceptance to be checkable.

**Where in plan:** Task 4, `Depends on:` line (vs. its last `Acceptance:` bullet).

**Suggestion:** Change Task 4 to `Depends on: Task 1, Task 2`. (Functionally the live correction itself only needs Task 1, but the task's acceptance — as the plan wrote it — also exercises the Task 2 script, so the dependency must include Task 2. Alternatively, drop the check-exits-0 bullet from Task 4 and let Flow 9 / Task 5 own it, but then Flow 9's coverage of that assertion must be unambiguous.)

**Why it matters:** If tasks are scheduled strictly by declared dependencies, Task 4 could be attempted before Task 2 and its last acceptance criterion would be unverifiable (the script is absent). Correct, complete dependency declarations are what let the executor order work safely; an acceptance criterion that reaches outside the declared dependencies is an ordering hazard.

## Non-blocking notes (no action required)

- Local Node here is v20.20.1, where `node --test 'scripts/test/**/*.test.mjs'` does not expand the glob (glob support landed in Node 21/22); CI uses Node 22 (`changeset-gate.yml`), where it works. The 22 existing tests pass when invoked with explicit file paths. This is an environment artifact, not a plan defect — the plan's reliance on `npm test` is correct for the CI runtime.
- "Guardrail scopes: None" is correct: `.rp.md` defines no guardrail gates and no scopes were passed, so there is nothing to fill and no scoped-gate command to validate. The `(none) | None` table row is the valid rendering.
- The format-preservation guarantees in Task 1 / Flow 3 hold by construction: the fixture lockfile is serialized with `JSON.stringify(lock, null, 2) + "\n"`, matching the script's canonical write path, so a reserialize differs only in the two patched version lines. The real lockfile is already in this canonical shape (verified). No issue.
