# Doc-plan review — APPROVED (Issue #81)

**Verdict:** Approved. The doc plan at `3-plan/doc-plan.md` is ready to drive the
Docs phase (phase 5).

## Scope of review

Reviewed `3-plan/doc-plan.md` against `3-plan/code-plan.md` (the surfaces phase 4
will create), `2-design-doc/design-doc.md` (C1–C7, K1–K6), its approved review
note 1, and `1-spec/spec.md` (R1–R13, AC1–AC9). Swept the live worktree's docs
end-to-end — root `README.md`, `AGENTS.md`, `CLAUDE.md`, `.pi-extension/README.md`,
`.changeset/`, the per-CLI `.rp.md` files, and the skill `reference/` docs — to
confirm every file path, section, and audience the plan names is real and that no
host-project surface documenting the changelog/versioning workflow is left out.

## Coverage of surfaces — complete and verified

Every documentation surface the plan touches was checked against the worktree:

- **`AGENTS.md:7`** holds the existing per-change README rule verbatim — the real
  sibling anchor for Task 1's standing changeset rule.
- **`README.md`** has the **Project Usage** (git-source and marketplace install
  flows), **Configuration**, and **Current status and limitations** sections the
  plan names — Task 2's placement is real and natural.
- **`CLAUDE.md`** is the thin `@AGENTS.md` pointer — Task 1's "no edit, inherits
  the rule" is correct.
- **`.pi-extension/README.md`** exists and is Pi-package-scoped — Task 2's
  optional one-line pointer (non-duplicative) is justified.
- **`marketplace.json`** carries no version field — the Task 2 / Notes guard
  against implying it does is correct (R10/AC6).
- No `.changeset/`, no `CHANGELOG.md`, no `scripts/` exist yet — so Task 3's and
  Task 4's conditionality on phase-4 output is sound.
- The only other `.md` files mentioning "changelog/changeset/version" are
  pipeline-mechanics docs (`reference/.../5 - docs.md:14` lists "changelogs" as a
  generic doc-writer output category; `doc-writer.md`, the `3 - plan.md`
  reference, agent profiles). None document *this* repo's versioning workflow, so
  the plan correctly excludes them. No surface was missed.

## Traceability and per-task acceptance — sound

Each task carries explicit `Traces to` (R/AC/design-component) tags and a
testable Acceptance block, and the Coverage map closes the loop: AC2 → Task 4,
AC8 first clause → Task 1 (demonstrated by Task 4), AC8 second clause / R13 →
Task 2, R6 → Task 1 (+ Task 2 cross-ref). Task 3 is correctly marked
supporting/clarity with no AC depending on it. The design-review note 1 wiring
(standing rule is the durable mechanism; the doc-plan itself carries the
changeset-authoring task rather than an agent inventing a duty) is reproduced
accurately and is the correct fix for the altitude concern the design review
raised.

## Drift-resistance — strong

The plan never treats concrete phase-4 names as ground truth. It explicitly tells
the doc-writer to verify the run-script **name** and exact command string, the
config keys, the sync-script path/filename, the lockfile command, and the
version-bearing file set **against the shipped code, never from memory**, and
states that a wording-level rename (`release:version`, `scripts/sync-version.mjs`)
is *not* design↔code drift. It also installs the right guardrails: do not
document a publish/tag/CI release flow (stop and report a blocker if phase 4
added one), and the one-time `0.1.1` correction gets no changelog entry (Task 4
must not run `changeset version` or touch `CHANGELOG.md`).

## No code tasks; scope clean

The plan writes documentation plus the single `.changeset/*.md` metadata file
only — no code, config, scripts, or tests. It explicitly defers C1–C5 to the
code plan and confirms the `.changeset/*.md` is metadata within the doc-writer's
remit (consistent with the design review's `doc-writer.md:60` finding that the
doc-writer owns "changelogs" and is barred only from source code). The
code-plan / doc-plan boundary is stated on both sides and does not overlap.

## Audience, granularity, ordering — sound

Each task names a concrete audience (contributors/agents for `AGENTS.md`;
developers/maintainers for the README; a `.changeset/` reader for Task 3; the
changelog reader/reviewers for Task 4) and a voice keyed to the existing file's
register. Tasks are independently completable, dependencies are honest (Task 2 is
the pointer target for Task 1; Tasks 3–4 depend on phase-4 output), and either
ordering of Tasks 1/2 is explicitly fine as long as the pointer stays accurate.

## Minor observations (non-blocking, no re-spin)

- Task 4 fixes the affected-package name as `@automattic/radical-pipelines`
  (the root) and **expects** `minor` while instructing the writer to confirm both
  against the shipped config and bump-type guidance — the "verify, don't assume"
  framing keeps this from being hard-coded drift. Acceptable as written.
- Task 2's optional `.pi-extension/README.md` pointer is left to the writer's
  judgment with a clear no-duplication rule — appropriately bounded.

None of these block. Coverage is complete, traceability is exact, the plan is
drift-resistant, it carries zero code tasks, and scope stays within the Docs
phase without bleeding into the code plan.
