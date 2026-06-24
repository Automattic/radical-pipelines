# Docs Review

## Verdict: approved

## Batch scope

Tasks reviewed:

- **Task 1** — Reconcile the README "Configuration" spawn-payload summary with the new `## Conventions` fields.
- **Task 2** — Add the required release changeset for this change.

This is the whole batch: every task in `3-plan/docs-plan.md`. The batch's docs diff (`8350faa..HEAD`) touches exactly two docs files — `README.md` (+1/-1) and a new `.changeset/worktree-branch-isolation.md`. Everything else in the range is the phase-4 shipped skill prose (`conventions/passing.md`, `claude-code.md`, `pi.md` — the accuracy source of truth, not under docs review) or `.pipelines/` artifact bookkeeping (out of scope).

## Summary

Both tasks satisfy their per-task Acceptance criteria, and every concrete claim in the two docs surfaces matches the shipped skill prose. The README spawn-payload sentence now enumerates the two new always-/conditionally-passed items at the correct scope — worktree root to every spawned agent, branch to committing agents — consistent with `passing.md`'s `Agents:` lines, kept at the README's summary altitude, and without duplicating the verify-before-acting field wording. The changeset is well-formed, validates clean, satisfies the changeset gate's Presence requirement for a PR touching `skills/**`, and carries the correct `patch` bump for a pre-1.0 backwards-compatible behavioral change that adds no feature. The drift sweep confirms the docs-plan's "deliberately not given a task" list still holds: no other prose surface enumerates the spawn payload or the `## Conventions`-block fields, and the only public surface the code introduced is documented in-place by the code phase and summarized at the README. Scope is clean — the two docs-writer commits touch only the two in-scope files, with no scope creep and no out-of-batch work.

## Checks

This project defines no guardrails, so there are no gates to run; the accuracy spot-check below is the verification evidence. The two changeset-gate commands are not project guardrails but were run as part of the Task 2 accuracy spot-check, and are recorded here for transparency.

| Check | Command | Result |
| ----- | ------- | ------ |
| Guardrails | — (none defined for this project) | n/a |
| Changeset shape validator (spot-check) | `node scripts/validate-changesets.mjs` | pass (exit 0) |
| Changeset presence (spot-check) | changeset added in `8350faa..HEAD` alongside `skills/**` edits | pass |

## Accuracy spot-check

**Task 1 — README sentence vs. shipped `conventions/passing.md`.** The reconciled README sentence (`README.md:155`) reads that the orchestrator passes "the absolute worktree root that anchors every path the agent writes (passed to every spawned agent), the pipeline branch the agent commits to (passed to the agents that commit)". Verified against the shipped fields in `conventions/passing.md`:

- Worktree root field → `Agents: all` ⇒ README "passed to every spawned agent". Match.
- Branch field (`worktree-<pipeline-slug>`) → `Agents: committing agents — every role except spec-researcher and design-doc-researcher` ⇒ README "passed to the agents that commit". Match.

The README does not leak the field-level verify-before-acting wording: a grep for `anchor every`, `confirm the current branch`, `never construct`, `git branch --show-current`, and `git rev-parse` over `README.md` returns nothing, so the summary altitude is preserved and the skill's `passing.md` prose is not duplicated.

**Task 2 — changeset package name, format, and bump vs. the repo standard.** The committed `.changeset/worktree-branch-isolation.md` declares `"@automattic/radical-pipelines": patch`. Verified:

- Package name matches `package.json`'s `name` and every existing `.changeset/*.md`.
- Front-matter shape (`---` / single quoted package: bump / `---` / blank line / imperative summary) byte-for-byte matches existing entries (`manage-issues-mid-session.md`, `package-lock-version-sync.md`).
- `node scripts/validate-changesets.mjs` exits 0.
- Presence: the changeset is added (`git diff --diff-filter=A`) in the same `8350faa..HEAD` range that edits `skills/**`, so the gate's Presence check is satisfied for the PR.
- Bump adjudication: project version is `0.4.0` (pre-1.0). The change is a backwards-compatible behavioral improvement to the skill that adds no new user-facing feature (no new flag, command, or capability the user invokes). Per `CONTRIBUTING.md`'s authoritative bump table, `patch` = "backwards-compatible changes that don't add features"; `minor` is reserved for new features/additions. `patch` is therefore correct, not `minor`. This matches the precedent set by the two existing backwards-compatible behavioral changesets, both `patch`. No `BREAKING:` prefix, correctly, since the change is not breaking.

**Drift sweep.** A repo-wide grep for spawn-payload / `## Conventions`-block enumeration across `skills/**`, `agents/**`, `website/**`, `README.md`, `CONTRIBUTING.md`, `AGENTS.md` surfaces only: the README sentence (Task 1, updated); `load.md:9`, which is the convention *catalog* (`Worktrees`, `Branch names`, … at the convention level, not the spawn-block-field level — explicitly out of scope per the docs-plan and unaffected by the two injected fields); and `autonomous-workflow.md:63`, which references the block only by directing the orchestrator to include it "per `reference/conventions/passing.md`" without enumerating fields. Both hold exactly as the docs-plan's "Surfaces deliberately not given a task" list states; no surface was left stale, and the code introduced no public surface left undocumented.

## Issues

None.
