# Docs Review — Phase 5 batch (iteration 1) — REJECTED

**Verdict:** Rejected.
**Batch:** D-1 (`310cb90`), D-2 (`e0cb3c1`). Diff base `967e122`..`e0cb3c1` (HEAD).
**Files changed:** `skills/radical-pipelines/reference/manage-issues.md` (D-1), `.changeset/normalize-intent-format.md` (D-2).

## Rejected task IDs (deduplicated)

- **D-2** — the changeset summary describes a synthesis/confirmation trigger that does not exist in the shipped feature.

(D-1 is accurate and clean — see "Passing checks" below. The batch is rejected solely on D-2.)

---

## D-2 — changeset summary mischaracterizes the feature trigger (accuracy)

**Severity:** reject (substantive accuracy defect — the changelog/Release body will mislead maintainers and users about what the feature does).

**Where:** `.changeset/normalize-intent-format.md` line 5.

**Current summary (verbatim):**

> Normalize intent.md to a canonical format in phase-0: synthesize the full issue picture and confirm with the owner **when no intent exists or the existing file is stale or malformed**.

**The defect.** The trailing condition clause invents a mechanism that is not part of this feature:

1. **"when no intent exists"** — the create-from-issue phase-0 step always writes `intent.md` fresh; there is no "does an intent already exist?" check, and synthesis is not conditioned on its absence. Spec req 1 ("`intent.md` MUST always be written in the canonical intent format") and shipped `create-pipeline.md:23` ("Write `intent.md` to `<artifacts-folder>/0-intent/intent.md`") both treat the file as freshly created.

2. **"the existing file is stale or malformed"** — there is no staleness or malformed-file check anywhere in the feature. The decision to synthesize-and-confirm vs. map-directly keys off the **issue's** shape, not a pre-existing `intent.md`.

**What actually triggers synthesis + confirmation (source of truth).** Shipped `create-pipeline.md:33-37, 41` and spec req 5–10: confirmation is owed unless **all three** skip conditions about the *issue* hold —

- `create-pipeline.md:35` (clause A) — "the issue body is structurally canonical";
- `create-pipeline.md:36` (clause B) — "the issue has no comments";
- `create-pipeline.md:37` (clause C) — "the body contains no references";

and `create-pipeline.md:41` — "**If any fails**, synthesize the intent from the full picture, then confirm it with the owner before committing."

So the synthesis/confirmation trigger is "the issue is non-canonical, OR has comments, OR has references" — not "no intent exists / the existing file is stale or malformed." I searched the spec, design doc, and shipped `create-pipeline.md` for any `stale` / `malformed` / `no intent` / `existing intent` concept; the only hits are (a) spec:110 and design-doc:379/385, which concern the **fork/resume** path the feature explicitly does **not** touch (spec req 15), and (b) design-doc:379's "stale artifact," which is about a fork's confirmation-session file — unrelated. The concept simply does not exist in this feature.

**Note — the first half is correct.** "Normalize intent.md to a canonical format in phase-0: synthesize the full issue picture and confirm with the owner" accurately captures spec req 1, 2, 5, 11–12. Only the trailing `when …` clause is wrong.

**Suggested fix (illustrative, doc-writer's wording).** Replace the trailing clause with the actual skip-condition trigger, e.g.:

> Normalize intent.md to a canonical format in phase-0: synthesize the full issue picture (body, comments, references) and confirm with the owner, unless the issue is already canonical with no comments and no references — in which case it maps directly.

Keep it one line, imperative, sentence case (the doc-writer owns the exact phrasing).

**Acceptance items this fails:** D-2 — "The summary is … describing the behavioral change (not the implementation detail)." The summary as written describes a behavioral change the feature does not make.

---

## Passing checks (recorded as evidence)

### D-1 — accurate, in scope, correct altitude (PASS)

The only changed line is `manage-issues.md:14`:

> This is both the issue format and the phase-0 intent format — when the pipeline is created, the orchestrator writes `0-intent/intent.md` from it. **A canonical issue (this format, no comments, no references in the body) maps directly; otherwise the orchestrator synthesizes the intent from the full picture and confirms with the owner.** Render these sections and **omit any that are empty** — no `N/A` placeholders:

Consistency with the shipped skip conditions (`create-pipeline.md`):

| manage-issues.md clause | Shipped step-4 condition |
| --- | --- |
| "this format" | `create-pipeline.md:35` clause A — issue body structurally canonical |
| "no comments" | `create-pipeline.md:36` clause B — issue has no comments |
| "no references in the body" | `create-pipeline.md:37` clause C — body contains no references |
| "maps directly" | `create-pipeline.md:39` — "If all three hold, map the body's sections to `intent.md` unchanged … do not synthesize" |
| "otherwise … synthesizes the intent from the full picture and confirms with the owner" | `create-pipeline.md:41` — "If any fails, synthesize the intent from the full picture, then confirm it with the owner before committing" |

- No longer asserts the unconditional `body _is_ the intent` identity. ✓
- Conveys canonical→direct (skip) and otherwise→synthesize. ✓
- Still motivates the issue format ("This is both the issue format and the phase-0 intent format … the orchestrator writes `0-intent/intent.md` from it"). ✓
- No other line changed (diff confirms a single-line replacement at line 14). ✓
- Altitude fits the user-facing issue-authoring file. ✓

### Drift sweep (PASS — doc-plan scope was correct)

`grep` for `body _is_` / `body is the` / `prompt format` / `0-prompt` / `# Prompt` across `README.md`, `skills/`, `agents/` returns only `create-pipeline.md` (the code-phase file) — the stale `manage-issues.md` identity is now fixed. All other `intent` / `0-intent` mentions describe phase 0 at the abstraction level the doc-plan claimed stays accurate:

- `SKILL.md:35` — "The input"; `SKILL.md:3` — phase list.
- `autonomous-workflow.md:39`, `assisted-workflow.md:17` — "Already in place".
- `fork-pipeline.md:14,38,42` — `0-intent` as a folder name to copy.
- `conventions/setup.md:48,64,113` — `intent.md` as a stored artifact; "pulls its initial intent from an issue".
- `README.md:112` — "phase 0 is the intent, an input rather than an agent-produced artifact".

None asserts a body-is-intent identity or contradicts the synthesis/confirmation behavior. No additional doc surface needs an edit.

### Gates (PASS)

- `node scripts/validate-changesets.mjs` → exit **0** (front matter valid; package `@automattic/radical-pipelines` matches root `package.json`; bump `minor`; no `major`).
- `npx changeset status` → exit **0**; "Packages to be bumped at minor: @automattic/radical-pipelines" (presence check satisfied for the `skills/**` change).
- `npm test` → **99 pass / 0 fail** (13 suites). Green.

These gates pass on their own terms — the D-2 rejection is a prose-accuracy defect, not a validator/test failure. Re-run all three after the fix.

---

## Required for approval

1. **D-2** — rewrite `.changeset/normalize-intent-format.md` line 5 so the synthesis/confirmation trigger reflects the actual skip conditions (issue non-canonical / has comments / has references), not a nonexistent "no intent exists / stale or malformed existing file" mechanism. Keep one line, imperative, sentence case, `minor` bump. Then re-run `node scripts/validate-changesets.mjs` and `npx changeset status` (both must stay exit 0).
