# Doc Plan Review — APPROVED

**Issue:** [#113](https://github.com/Automattic/radical-pipelines/issues/113) — "Rename the conventions concept to configuration (conventions becomes a subsection)"

**Artifact reviewed:** [`doc-plan.md`](./doc-plan.md)
**Reviewer:** doc-plan-reviewer
**Verdict:** APPROVED

---

## Summary

This is a docs/terminology refactor of *this* repository, so the code plan
(phase 4) legitimately owns every primary documentation surface: `.rp.md`,
`SKILL.md`, `README.md`, and the four `reference/conventions/ → reference/configuration/`
files plus their inbound links (code-plan Tasks 1–7). The doc plan is therefore
intentionally minimal — a single task (D1) to add the required Changesets entry.

I verified adversarially against the live worktree that this minimal scope is
**correct and complete**: D1 is genuinely required, it does not duplicate any
code-plan task, and no genuinely-separate documentation surface is missed.

---

## Verification performed (live worktree)

### 1. The changeset is genuinely required and CI-enforced — D1 is not redundant
- `.changeset/config.json` `changedFilePatterns` = `["skills/**", "agents/**", ".claude-plugin/**", "package.json", "README.md"]`. This rename edits `skills/**` (the SKILL/reference files) **and** `README.md` → it **is** release-relevant.
- `.github/workflows/changeset-gate.yml` runs both enforcement steps: `node scripts/validate-changesets.mjs` (shape) and `npx changeset status --since=origin/${base}` (presence). The bot-PR exemption (`changeset-release/trunk`) does not apply here.
- `CONTRIBUTING.md` "When a changeset is required" confirms `skills/**` and `README.md` are release-relevant (and that `.changeset/`, `.github/`, `scripts/`, `website/`, `AGENTS.md` are **not**).
- **No code-plan task creates a `.changeset/*.md`** — `grep -ni "changeset" code-plan.md` returns nothing. Tasks 1–7 are all `.md` doc edits; none touch `.changeset/`. So omitting D1 would fail the presence gate. D1 is correctly placed in the docs phase.

### 2. Bump-type recommendation is defensible against repo policy
- Package is `@automattic/radical-pipelines` at `0.1.1` → pre-1.0.
- `validate-changesets.mjs:149` hard-rejects `major` only while `version.startsWith("0.")`; `patch` / `minor` / `none` all pass shape.
- Per `CONTRIBUTING.md` "Bump types" + "Pre-1.0 policy": this change is not breaking (spec R6/AC18), adds no feature, fixes no bug (spec R7/AC19–20). That rules out `minor`+`BREAKING:` and forbids `major`. The two policy-correct options are exactly **`patch`** (backwards-compatible non-feature change) or **`none`** (prose-only, empty changeset). D1's default recommendation of `patch` with an explicit surface-to-owner of the `patch`-vs-`none` choice is sound and matches the bump table verbatim.
- D1 correctly references the canonical empty-changeset form (`---\n---\n`, accepted by the validator at lines 85–87 and consumed without a bump) for the `none` path.

### 3. Writer's rule-outs all confirmed by grep
- **Existing `.changeset/*.md` (frozen history):** the three "conventions"-mentioning entries (`local-convention-overrides.md`, `per-agent-model-config.md`, `restructure-repository-layout.md`) describe *already-shipped* deltas and are appended verbatim to `CHANGELOG.md` at release. Correctly left untouched (analogous to `.pipelines/**`). D1 explicitly forbids editing them; AC #1 enforces "no `M` entries" under `.changeset/`.
- **`website/`:** `grep -rni "conventions" website` → zero matches. Nothing to update. Confirmed.
- **`AGENTS.md`:** `grep -ni "conventions" AGENTS.md` → zero matches. No umbrella wording. Confirmed.
- **`CONTRIBUTING.md`:** the only two "convention" uses are generic English — `### Summary format conventions` and "the convention that surfaces the breaking nature" (the `BREAKING:` prefix). Neither names RP's umbrella concept; CONTRIBUTING is also not release-relevant. Out of scope. Confirmed.
- **`agents/*.md`:** every hit ("host project's coding/documentation conventions", "project conventions", "existing patterns and conventions", "internal conventions") is generic/host-project English — the spec's explicitly out-of-scope third bucket (design §2, §7). None use "conventions" as RP's own umbrella. Confirmed.
- **Glossary / architecture / terminology docs:** `find` for `*glossar*`/`*terminolog*`/`*architecture*` → none. The full repo-wide `grep -rln "conventions" --include="*.md"` (minus `.pipelines/`) yields only: code-plan-owned files (`.rp.md`, `README.md`, `SKILL.md`, `reference/conventions/*`), R2 named-rule / out-of-scope reference & phase files, generic `agents/*.md`, generic `CONTRIBUTING.md`, and the frozen `.changeset/*`. **No standalone conceptual doc uses "conventions" as the umbrella and is left stale by the code plan.** No missed surface.

### 4. Task D1 field & acceptance completeness
D1 has all required fields — **Goal / Audience / Files / Sections-scope / Depends on / Traces to / Acceptance** — each substantive:
- **Traces to** correctly notes no spec AC covers this (it is a repo-process requirement the code plan does not address — precisely why it belongs here).
- **Acceptance** is concrete and machine-checkable, tied directly to the live gate: (1) exactly one added `.changeset/*.md` and no modified entries; (2) `node scripts/validate-changesets.mjs` exits 0; (3) `npx changeset status` no longer reports a missing changeset; (4) bump is `patch` or `none` (never `major`, never `minor`+`BREAKING:`); (5) content grep for the umbrella rename + folder move + explicit "no breaking change"; (6) no collateral edits.

---

## Findings

None blocking. The minimal one-task scope is deliberate and complete: it does
not duplicate the code plan's doc edits, and it does not miss any genuinely
separate documentation work. Task D1 is well-specified, traceable, and its
acceptance ties cleanly to the CI Changeset Gate.

**Verdict: APPROVED.**
