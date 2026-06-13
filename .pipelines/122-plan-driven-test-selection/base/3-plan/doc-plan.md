# Doc Plan — Plan-driven test selection and reviewer-side behavior verification

_Issue: [Automattic/radical-pipelines#122](https://github.com/Automattic/radical-pipelines/issues/122). Pipeline: `122-plan-driven-test-selection`. Inputs: the approved, binding `1-spec/spec.md`, the approved `2-design-doc/design-doc.md`, and the approved `3-plan/code-plan.md` (7 tasks, T1–T7). This plan is the task list the docs phase (phase 5) executes against. This run is **stacked on #121**, so #121's `.changeset/agent-scoped-guardrails.md` is already present in the worktree — it is a separate feature's changeset and is **not** touched here._

## Overview

This feature moves two responsibilities inside the Radical Pipelines skill: test selection becomes a phase-3 planning duty (the code-plan-writer authors a required-test-commands floor and an explicit e2e test plan in `code-plan.md`, validated by the code-plan-reviewer), and behavior verification happens once at the integrated-feature level in the code-reviewer. To make those duties coherent, the single `code-writer` agent splits into `code-writer-tdd` and `code-writer-e2e`, dispatched by a plan-declared task type. Radical Pipelines is "documentation as code," so the feature ships *as* skill-instruction prose — and the approved code plan (T1–T7) already owns the **entire functional documentation surface**: the two new planner sections and inverted test-planning rules (`code-plan-writer.md`, assisted `3 - plan.md`), the reviewer's new validation duties (`code-plan-reviewer.md`), the writer split itself (delete `code-writer.md`, create `code-writer-tdd.md` / `code-writer-e2e.md`), the reviewer-side re-drive (`code-reviewer.md`), the type-based dispatch reference (`4 - code.md`), the lockstep enumeration/Agents-field (`load.md` ⇄ `setup.md`), **and the human-facing `README.md` shipped-agent roster (T6)**. Those are phase-4 deliverables and are **not** re-documented here.

A whole-repository sweep of every live human-facing surface (`README.md`, `CONTRIBUTING.md`, `AGENTS.md`, the `website/` landing page, the `skills/radical-pipelines/` reference tree outside the touched files, `CHANGELOG.md`, and the `.changeset/` directory) found **no documentation surface left out of sync by this change that the code plan does not already own** — each surface stays literally true at its altitude (justified per surface in "Surfaces deliberately not given a task"). The change does touch two **release-relevant** paths (`skills/**`, `agents/**`, and `README.md` per `.changeset/config.json`), and the code plan authors no changeset, so the mandatory CI changeset is the docs phase's to own.

This plan contains **exactly one task**: author the **new** `minor` changeset the Changeset Gate requires for *this* feature (distinct from #121's already-present changeset). Everything else the feature needs is already a code-plan deliverable and is intentionally not duplicated here.

## Tasks

### Task 1 — Author the changeset for the plan-driven-test-selection change

- **Goal.** Satisfy the project's mandatory Changeset Gate for this PR. The change edits `skills/**`, `agents/**`, and `README.md` — all release-relevant `changedFilePatterns` (`.changeset/config.json`) — and the code plan (T1–T7) creates no changeset, so without this task the PR fails CI's presence check (`npx changeset status`). Author a single well-formed **new** `.changeset/*.md` entry describing the user-facing capability. Because this branch is stacked on #121, `.changeset/agent-scoped-guardrails.md` already exists for a *different* feature; this task adds a **separate** file with a new slug and does not edit or fold into #121's entry.

- **Audience.** Changelog readers and project maintainers — people scanning the release notes to learn what changed in a version, at the altitude of a one-line feature summary, not skill internals.

- **Files to change.** One new file under `.changeset/` (a `changeset add`-style Markdown file with valid front matter), with a slug distinct from `agent-scoped-guardrails` (e.g. `plan-driven-test-selection`). No other file — in particular, `.changeset/agent-scoped-guardrails.md` is left byte-for-byte untouched.

- **Sections / scope.**
  - **Front matter — package + bump.** Single package key `"@automattic/radical-pipelines"` (matches the root `package.json` name, exactly as the existing changeset writes it), keyed to a **`minor`** bump.
  - **Bump type `minor`, justified.** This is a new, backwards-compatible feature: phase-3 planning now owns test selection (required-test-commands floor + explicit e2e test plan), behavior verification relocates to the code-reviewer, and the writer splits into `code-writer-tdd` / `code-writer-e2e`. It is additive at the skill level and ships no migration text (spec AC8). Per the authoritative bump table in `CONTRIBUTING.md` ("New features; backwards-compatible additions" ⇒ `minor`; pre-1.0 forbids `major`), the bump is `minor`.
  - **Summary line.** A short, present-tense, user-facing summary describing the *shipped capability* at release-note altitude: phase-3 planning now selects the required test commands and the end-to-end test plan, behavior verification is performed once by the reviewer on the integrated feature, and the code writer is split into a TDD writer and an e2e writer dispatched by task type. Match the voice of the existing released entries (consult `CHANGELOG.md` and the existing `.changeset/agent-scoped-guardrails.md` for tone).
  - **Do not** restate the mechanism — the two-question execution discipline, the per-command/independent validation, the four-step writer shape, the `Type` field/dispatch mapping, the section shapes (`Required test commands` table, `### Flow N` blocks), or the reviewer re-drive. The skill reference owns that; the changeset is a release-note summary, not a second copy of the convention (`AGENTS.md` no-duplication rule).

- **Depends on.** None within this plan. Author it after phase 4 ships so the summary reflects the shipped behavior, but it has no textual dependency on the exact phase-4 wording (it summarizes the capability, not the prose).

- **Traces to.** `CONTRIBUTING.md` "When a changeset is required" (release-relevant `skills/**` + `agents/**` + `README.md`) and "Bump types" (`minor` for backwards-compatible feature additions; pre-1.0 forbids `major`); spec AC8 (no migration text ⇒ additive, not breaking). The code plan explicitly carries no changeset task, so this is the docs phase's deliverable. Precedent: prior pipelines whose code plan did not own the changeset placed the mandatory `minor` changeset in the docs phase (e.g. #121's base doc plan).

- **Acceptance.**
  1. Exactly one **new** `.changeset/*.md` file exists (slug distinct from `agent-scoped-guardrails`), with valid front matter (single key `"@automattic/radical-pipelines"` ⇒ `minor`) that `node scripts/validate-changesets.mjs` accepts.
  2. The bump type is `minor`, justified as a backwards-compatible feature addition per the `CONTRIBUTING.md` bump table.
  3. The summary is a short, user-facing, present-tense description of the shipped capability (plan-owned test selection, reviewer-side single behavior verification, the tdd/e2e writer split) in the voice of existing changeset entries.
  4. The summary does not restate the mechanism (two-question discipline, validation procedure, writer steps, `Type` dispatch, section shapes, reviewer re-drive).
  5. `npx changeset status` reports the change as covered (the presence gate passes); `.changeset/agent-scoped-guardrails.md`, `CHANGELOG.md`, and every other existing changeset entry are left unedited.

## Surfaces deliberately not given a task

A whole-repository sweep confirmed the following surfaces need **no** doc-plan task. They are listed so each absence is an explicit decision, not an oversight:

- **`code-plan-writer.md`, `code-plan-reviewer.md`, `code-writer-tdd.md` / `code-writer-e2e.md` (and the deleted `code-writer.md`), `code-reviewer.md`, `4 - code.md`, `load.md`, `setup.md`, assisted `3 - plan.md`** — the entire functional documentation surface of this feature, all owned by the **code plan** (T1–T5, T7). Re-documenting any of them here is explicitly out of scope; this plan does not duplicate them.

- **`README.md` — owned by the code plan (T6), not skipped.** The only two README hits are the shipped-agent roster (L112) and the phase-4 feature line (L31, "unit and end-to-end tests"). The roster is the single current-agent claim that goes stale at the split, and **code-plan T6 already owns replacing `code-writer` with `code-writer-tdd`, `code-writer-e2e` there** — so the docs phase deliberately does **not** re-plan it. The phase-4 line stays literally true (both new writers still collectively produce unit and e2e tests), so it needs no edit. No human-facing README content is left stale once T6 lands, hence no README docs task.

- **`CONTRIBUTING.md`** — about the changeset gate, CI, bump types, and the release procedure. A keyword sweep found no reference to `code-writer`, behavior verification, test selection, or the e2e mechanism. The changeset this feature ships is an ordinary `minor` changeset already covered by its existing guidance, so nothing there goes stale; CONTRIBUTING **governs** Task 1 (it is the bump-type authority) rather than being a surface to edit.

- **`AGENTS.md`** — a minimalist "rules when modifying the skill" doc. A sweep found no reference to writers, verification, test selection, or `.rp.md` contents. Its rules **constrain** how the phase-4 prose and this plan are written (concision, no cross-path duplication, "reference, don't restate"); nothing the feature adds is described there.

- **`website/`** (`index.html`, `demo.js`, `styles.css`, assets) — high-level marketing copy about the six-phase pipeline model. A keyword sweep found references only to "agents" in the generic adversarial-pair framing, never to the writer roster, behavior verification, test selection, `.rp.md`, or the `code-writer` name. The one numeric claim — `15 agents shipped` (`index.html` hero stats) — does **not** track the raw agent-file count (there are already 17 files in `agents/`), so it is a deliberately rounded marketing figure that this split (net +1 agent file) does not newly falsify; it was never a 1:1 file count and stays an approximate marketing stat. `website/**` is also not release-relevant (`.changeset/config.json`). No website edit is warranted; touching the stat would be an unscoped marketing-copy decision for a human, not a docs-phase deliverable for this feature.

- **`CHANGELOG.md`** — the immutable release history, regenerated only by `changeset version` at release time from accumulated changesets. Repository convention freezes already-recorded entries; it is never hand-edited by a feature PR. Task 1 authors a fresh `.changeset/` entry that the release flow will later fold in; `CHANGELOG.md` itself is untouched.

- **`doc-writer.md` / `doc-reviewer.md` and the docs-phase reading path** — unaffected. This feature changes the code phase (phases 3–4) only; the docs phase neither selects test commands, runs the floor, nor verifies behavior. `doc-writer.md:64`'s incidental `code-writer` mention is an example, not a roster/dispatch claim (design "Untouched"), so it stays literally true and needs no edit.

- **`SKILL.md` and `reference/autonomous-phases/3 - plan.md`** — `SKILL.md:39` keeps "behavior verification" as a phase-4 output (now produced at the reviewer), which stays true; autonomous `3 - plan.md` orchestrates only the planner/reviewer pair and carries no test-planning content (design "Untouched"). Neither goes stale.

- **The dogfood `.rp.md`** — adding the two new writers' model rows and dropping the `code-writer` row is an **operational follow-up** (project config, spec "Out of Scope"), not a docs-phase deliverable. It is intentionally not given a docs task.

- **`.changeset/agent-scoped-guardrails.md` (#121's entry) and `.changeset/README.md` (the cheat-sheet)** — #121's changeset belongs to a separate stacked feature and is frozen; the cheat-sheet is hand-customized convention, not regenerated and not feature-specific. Task 1 authors a fresh, separate entry only.

## Notes for the doc-writer (phase 5)

- **Author against the shipped change, not this plan's strings.** Read the landed planner/reviewer/writer files for the shipped behavior before writing the changeset summary, so the one-line description matches what actually ships.

- **The changeset is this plan's only deliverable.** The feature's functional documentation — including the human-facing README roster (T6) — is entirely owned by the code plan (T1–T7). If you find a human-facing surface that reads as stale after phase 4 ships and is not covered above, surface it rather than silently expanding scope — but the sweep found none beyond T6.

- **A new file, never #121's.** This branch is stacked on #121, so `.changeset/agent-scoped-guardrails.md` already exists for a different feature. Create a **new** `.changeset/*.md` with a distinct slug; do not edit, rename, or fold into #121's entry.

- **`minor`, not `major`.** The change is an additive skill feature with no migration text (spec AC8). Pre-1.0 policy forbids `major` regardless; the authoritative bump table is in `CONTRIBUTING.md`.

- **Reference, don't restate.** The planner sections, the validation discipline, the writer split and `Type` dispatch, and the reviewer re-drive are documented once by phase 4 in the skill reference. The changeset summarizes that the capability **exists**; it does not restate the mechanism (anti-drift; `AGENTS.md` no-duplication rule).
