# Docs review — APPROVED

Issue #51 (Guardrails convention), Phase 5 (Docs). Adversarial review of the full
docs batch, iteration N = 1. Diff reviewed: `cc01ed0..HEAD` (one commit,
`01be3dd`, touching only `README.md`).

**Verdict: APPROVED.**

## Gate run (recorded)

- `node scripts/validate-changesets.mjs` → **exit 0** (pass). The unit suite is a
  code-phase guardrail, not a docs gate; not required, not run.

## Scope discipline — verified

- `git diff --name-only cc01ed0..HEAD` → **`README.md` only**. No agent-facing
  files, no `.rp.md`/`load.md`/`setup.md`, no per-tool rule files, no CI workflow
  touched in the docs phase.
- Changesets added in this PR vs `trunk` (`git diff --name-only trunk...HEAD --
  .changeset/`) → **exactly one**: `.changeset/guardrails-convention.md`
  (`@automattic/radical-pipelines: minor`). The other `.changeset/*.md` files are
  pre-existing unreleased changesets from prior merged PRs, not this PR's. No
  duplicate feature changeset; no hand-maintained changelog created.

## Task 1 (README) — accuracy verified against shipped code

- **Top-level structure corrected.** `README.md:159` now describes `.rp.md` as
  "two top-level sibling sections: `## Conventions` … and `## Guardrails`". This
  matches the ACTUAL shipped root `.rp.md` (headings `## Conventions` at line 5,
  `## Guardrails` at line 82). The prior "shared section … followed by a per-tool
  section" top-level framing is gone — `grep -niE "shared section|per-tool
  section|shared conventions"` across README/website/per-tool files/SKILL.md/
  CONTRIBUTING.md/AGENTS.md returns **zero** hits.
- **Guardrails concept is correct** (README:159) and matches `load.md` §Guardrails
  and spec R1–R5: exact command (`npm test`), pass/fail solely by exit code,
  mandatory within the phase(s) it applies to, only phase targets **code** and
  **docs** (one or both), tool-agnostic with no per-tool variant, and optional
  (declaring none is a complete, valid state).
- **Authoritative-definition pointer** links to
  `load.md#guardrails`, the file that carries the canonical definition (matches the
  design's centralize-in-`load.md` decision D3).
- **Dogfooding note** (`npm test` code; `node scripts/validate-changesets.mjs`
  code+docs) matches the worked example in root `.rp.md:86-89` and the changeset.
- **Rest of the section preserved in meaning.** Setup flow (`:145`), per-tool
  *conventions* (`:147`), local overrides (`:149`), and the multi-CLI dogfooding
  note (`:161`) are intact; `:161` now correctly scopes the per-tool split to
  *conventions only*, consistent with the new model.

### Judgment call on `README.md:145` — correct to leave untouched

"Setup separates shared project guidance from guidance specific to the active
agentic coding tool" describes what the *setup flow* does when eliciting
*conventions* (shared vs per-tool), not the file's top-level `## Conventions` +
`## Guardrails` shape. The following paragraph (`:147`, "Shared project conventions
include…") is its direct continuation, and `:161` affirms the per-tool split
"applies to *conventions* only." So `:145` describes still-accurate behavior, not
the stale top-level file structure that `:159` previously asserted. Leaving it is
sound — no residual contradiction.

## Cross-references resolve

- `load.md#guardrails` → `load.md` heading `## Guardrails` (line 31). **Resolves.**
- `load.md#local-overrides` (README:149) → `load.md` heading `## Local overrides`
  (line 45). **Resolves.**
- Headings present in `load.md`: `## Conventions`, `## Missing conventions`,
  `## Guardrails`, `## Local overrides` — both linked anchors hit real headings.

## Task 2 (changeset reconcile) — no-change decision is sound

The single `.changeset/guardrails-convention.md` (`minor`) already states the
shipped scope, including that `load.md` carries the canonical definition and the
two dogfooded gates. `changedFilePatterns` covers `README.md`, so the docs-phase
README edit is already represented; a second changeset would be a duplicate. No
edit needed; bump stays `minor`. Validator passes.

## Task 3 (excluded-surface sweep) — independently re-verified clean

- **Website** (`website/`): no `.rp.md`/conventions/guardrails structural narrative
  (`grep` → none). No contradiction introduced. No-op confirmed.
- **Per-tool rule files** (`skills/radical-pipelines/reference/conventions/
  claude-code.md`, `pi.md`): no "shared section" structural claim, no guardrails
  content. `pi.md:45` references the **Apply agentic coding tool setup actions**
  step of `setup.md` **by title** (number-free), no stale numbered step remains.
  `claude-code.md` has no `setup.md` step reference.
- **`SKILL.md`**: "Project conventions" section only points to `load.md` (no
  structural claim); the phase table's "behavior verification" entry (line 39)
  stays accurate (R15 preserves behavior verification). No contradiction.
- **`CONTRIBUTING.md` / CI**: "gate" naming intentionally preserved —
  `.github/workflows/changeset-gate.yml` "Changeset Gate" and CONTRIBUTING's
  "changeset gate" references are intact; nothing renamed to "guardrail"
  (`grep -rniE "guardrail" .github/ CONTRIBUTING.md` → none). Matches spec
  Out-of-Scope and design §9 "do not rename CI gate."
- **`AGENTS.md`**: no conventions/guardrails narrative; no contradicting claim.

All three tasks satisfy their acceptance criteria. No issues found.
