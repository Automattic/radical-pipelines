# Docs Review — Approved

**Batch:** doc-plan.md Task 1 (author the mandatory `minor` changeset) — the plan's only task.
**Base ref:** `f1dbd7943b94ffa5de90d03d68fdd0e97ea04061` → current HEAD.
**Guardrails:** `.rp.md` declares none — empty selection, run none and proceed. The accuracy verification below is the sole gate.

## Verdict

Approved. The single deliverable — the role-scoped-guardrails changeset — is well-formed, correct, and at the right altitude, and the doc plan's deliberate non-edits all hold: the shipped phase-4 change left no human-facing documentation surface stale.

## Task 1 — checked against acceptance

The new file `.changeset/role-scoped-guardrails.md` is the only changeset added by this branch (`git diff --name-status` shows a single `A` under `.changeset/`).

1. **Exactly one new `.changeset/*.md`, valid front matter, accepted by the validator.** Met. `node scripts/validate-changesets.mjs` exits 0. Front matter keys `@automattic/radical-pipelines` — matching the root `package.json` name and the package key every prior `CHANGELOG.md` entry uses — to a `minor` bump.
2. **Bump type `minor`, justified as a backwards-compatible feature addition.** Met. The change is additive (an optional `level` field; existing `.rp.md` files keep today's behavior with no migration, spec R8/AC9). The `CONTRIBUTING.md` bump table maps "New features; backwards-compatible additions" to `minor`, and pre-1.0 policy forbids `major`.
3. **Single user-facing, present-tense summary in the voice of existing entries.** Met. "Add an optional per-gate `level` to code-phase guardrails so a project can scope each gate to the writer, the reviewer, or both…" mirrors the released `## 0.3.0` Guardrails entry's "Add a Guardrails convention…" opening and one-paragraph capability-summary voice.
4. **Summary does not restate the mechanism.** Met. It names the capability (per-gate `level`, scope to writer/reviewer/both, writers run cheap gates per commit, reviewers run the expensive suites once, reviewer fails fast on a cheaper finding) without restating the selection rule, the `skipped` Checks state, or the absent-means-both load rule — the skill reference owns those (AGENTS.md no-duplication rule).
5. **`npx changeset status` reports the change covered; no existing changeset or `CHANGELOG.md` edited.** Met. `changeset status` reports `@automattic/radical-pipelines` bumped at `minor`. The diff touches no `CHANGELOG.md`, `.changeset/config.json`, or `.changeset/README.md`.

## Deliberate non-edits — verified not stale

The doc plan gives Task 1 as the only task and attributes the entire functional documentation surface to the code plan (T1–T4). The shipped phase-4 prose confirms that attribution and the surrounding sweep holds:

- **`load.md`, `setup.md`, `code-writer.md`, `code-reviewer.md`** — the shipped diff carries the level definition + role-filtered selection rule (`load.md`), the optional level capture and illustrative table (`setup.md`), the writer-selection narrowing (`code-writer.md`), and the reviewer restructure — new guardrail-run step, fail-fast, `skipped` Checks state, approval guarantee (`code-reviewer.md`). All owned by the code plan; correctly not re-documented in the docs phase.
- **`README.md`** — the two guardrail mentions (`:147` enumeration, `:159` shared-section parenthetical) describe Guardrails at the "deterministic verification gates the code/doc phases must pass" altitude, which already omits phase-granularity; omitting the new role-granularity and fail-fast is consistent. Both sentences stay literally true. No task warranted.
- **`agents/doc-writer.md` / `agents/doc-reviewer.md`** — unchanged on this branch (verified via `git diff`), as spec AC11 requires. Their wording speaks only of "guardrails applicable to the docs phase" — purely phase-based, never consulting level (R3) — so a both-phase leveled gate still runs for both doc agents under the existing prose. Not stale.
- **`CONTRIBUTING.md`, `AGENTS.md`, `website/`, the phase-reference docs, the dogfood `.rp.md`, historical/frozen changesets and `CHANGELOG.md`** — carry no guardrail/`.rp.md` convention catalog this change falsifies; an independent repo-wide `guardrail` grep surfaced no live surface beyond the above. No edits needed.

## Checks

| Check | Command | Result |
| ----- | ------- | ------ |
| Changeset shape | `node scripts/validate-changesets.mjs` | pass |
| Changeset presence gate | `npx changeset status` | pass (covered at `minor`) |
| Accuracy spot-check (summary vs shipped behavior, deliberate non-edits) | manual review | pass |
