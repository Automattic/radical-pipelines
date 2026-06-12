# Spec: Role-scoped guardrails with reviewer fail-fast

## Overview

Today guardrails carry one scoping dimension: phase (`code`/`docs`). Every code-phase guardrail is mandatory for both the `code-writer` (on every commit) and the `code-reviewer` (on every review iteration). An expensive suite declared as a `code` guardrail therefore runs on every task commit and every review iteration; the only alternative is not declaring it, which makes it a gate for no one.

This change adds a **level** dimension to the guardrail declaration so a gate can name which code-phase role runs it. Writers run cheap gates (lints, typechecks) on every commit; expensive suites run on the reviewer's side, where a new fail-fast rule lets the reviewer reject early on cheaper findings without running the not-yet-run gates of its selection. When all goes well, the expensive reviewer-leveled suites execute exactly once — on the approving iteration.

The level is optional: a guardrail without a level keeps today's behavior (both roles run it), so existing `.rp.md` files work unchanged with no migration. Docs-phase guardrail semantics and the two doc agents are untouched.

## Requirements

### R1 — Level dimension

A guardrail declaration may carry an optional **level** with exactly two valid values: `writer` and `reviewer`. A guardrail without a level applies to both roles (unscoped). The level is part of the committed guardrail declaration; guardrails remain shared and committed-only, never taken from `.rp.local.md`, so the level is never overridable per-developer.

### R2 — Code-phase selection is role-filtered

Within the code phase, selection applies the phase filter first, then a role filter:

- The `code-writer` selects the code-phase guardrails leveled `writer` or unscoped.
- The `code-reviewer` selects the code-phase guardrails leveled `reviewer` or unscoped.

Neither role runs the other role's leveled gates. Unscoped gates are the shared mandatory floor both roles run. An empty role selection means run none and proceed (the existing empty-selection rule).

### R3 — Docs-phase selection never consults level

The docs-phase selection remains purely phase-based. `doc-writer` and `doc-reviewer` behavior is unchanged. Level filters the code-phase selection only; the docs-phase selection never consults level, including for gates that span both phases — a both-phase gate carrying a level still runs for both doc agents. Level is inert within the docs phase; it never removes a gate from docs selection.

### R4 — Writer behavior unchanged in form

The `code-writer` runs every gate in its role selection, exactly as each command is written, and all must pass before each commit. These are the same obligations as today, applied over the narrowed (role-filtered) selection.

### R5 — Reviewer fail-fast

The reviewer runs the judgment-based checks before running its guardrail selection. Once it has at least one rejection finding, it may reject without running any not-yet-run gate of its role selection.

Each deliberately skipped gate is recorded as **skipped** in the Checks table, distinguishable from a gate that was never considered or forgotten.

### R6 — Approving iteration guarantee

The reviewer approves only when every gate in its role selection has run and passed in that same iteration — no skips on an approving iteration. The guarantee is per-iteration: there is no cross-iteration caching or memory; each reviewer instance is fresh and stateless. Net effect when all goes well: the expensive reviewer-leveled suites execute exactly once, on the approving iteration.

### R7 — Setup captures the level

During guardrail capture, setup asks the level for each code-applicable gate as an optional field alongside name, exact literal command, and applicable phase(s). The default when unset is unscoped (both roles). The captured level lands in the committed `.rp.md` guardrail declaration.

### R8 — Backward compatibility by definition

"Absent level = both roles" is a definition/load rule. Every existing `.rp.md` — whether its gates carry no level field or it has no Guardrails section at all — keeps today's behavior with no migration.

### R9 — No new validation path

A level value outside the `{writer, reviewer}` vocabulary follows the same implicit behavior as an unrecognized phase target: it matches no role filter, so the gate is selected for no code-phase role. No explicit error, blocker, or warning is introduced for a malformed level.

## Out of Scope

- Any change to docs-phase guardrail semantics or the two doc agents (`doc-writer`, `doc-reviewer`).
- Cross-iteration state ("this suite already ran on iteration N−1"); each reviewer instance remains fresh and stateless.
- Assisted mode — the owner approves and no code-reviewer Checks table exists there, so role scoping and fail-fast have no assisted-mode surface.
- README prose update — a candidate touchpoint deferred to the docs phase, not a spec requirement.
- Migration or rewriting of existing `.rp.md` files.
- The "Plan-driven test selection and reviewer-side behavior verification" work (#122) — independent, but it edits the same writer/reviewer agent files and must not be worked on in parallel.
- The exact `.rp.md` storage syntax for the level — a design-phase decision, as with the existing per-gate fields. This spec fixes the field, its vocabulary, and its absent-means-both semantics, not its serialization.

## Acceptance Criteria

1. The guardrail definition documents an optional `level` field with valid values `writer` and `reviewer`, and that an absent level means both roles. The committed-only nature of guardrails (never from `.rp.local.md`) is preserved for the level.
2. The selection rule states that, within the code phase, the writer selects gates leveled `writer` or unscoped and the reviewer selects gates leveled `reviewer` or unscoped, with neither role running the other's leveled gates.
3. The selection rule states that level filters the code-phase selection only; the docs-phase selection is purely phase-based and never consults level, including for both-phase gates.
4. `agents/code-writer.md` runs its role selection (writer + unscoped code-phase gates), with the existing "run every one, exactly as written, all must pass before commit" obligations applied over that selection.
5. `agents/code-reviewer.md` selects its role selection (reviewer + unscoped code-phase gates) and runs the judgment-based checks before running its guardrail selection; once it has at least one rejection finding it may reject without running not-yet-run gates of its selection.
6. On a rejecting iteration, the reviewer records each deliberately skipped gate of its selection as skipped in the Checks table, distinct from a gate with a pass/fail result and from a gate that is absent.
7. On an approving iteration, every gate in the reviewer's role selection has run and passed; the reviewer cannot approve with any of its selection unrun or skipped.
8. `reference/conventions/setup.md` asks the level per code-applicable gate as an optional field, defaulting to unscoped, and the level lands in the committed `.rp.md`.
9. An existing `.rp.md` with level-less gates (or no Guardrails section) produces today's behavior unchanged — both roles run every applicable gate — with no migration step.
10. A malformed/out-of-vocabulary level matches no role filter and triggers no new error path, mirroring the existing implicit handling of an unrecognized phase target.
11. The convention and agent edits are confined to `reference/conventions/load.md`, `reference/conventions/setup.md`, `agents/code-writer.md`, and `agents/code-reviewer.md`; `agents/doc-writer.md` and `agents/doc-reviewer.md` are unchanged, so docs-phase behavior and the docs-phase completion path are preserved. (Release artifacts such as the changeset and any docs-phase output are outside this claim.)
