# Doc Plan — Role-scoped guardrails with reviewer fail-fast

_Issue: [Automattic/radical-pipelines#121](https://github.com/Automattic/radical-pipelines/issues/121). Pipeline: `121-role-scoped-guardrails`. Inputs: the approved, binding `1-spec/spec.md`, the approved `2-design-doc/design-doc.md`, and the approved `3-plan/code-plan.md` (4 tasks, T1–T4). This plan is the task list the docs phase (phase 5) executes against._

## Overview

This feature adds an optional **level** dimension (`writer` / `reviewer`, absent = both roles) to the code-phase guardrail declaration, plus a reviewer fail-fast rule. Radical Pipelines is "documentation as code," so the feature ships *as* skill-instruction prose — and the approved code plan (T1–T4) already owns the **entire functional documentation surface**: the level definition and role-filtered selection rule in `load.md`, the level capture bullet and illustrative example in `setup.md`, the writer-selection narrowing in `agents/code-writer.md`, and the reviewer restructure (the new guardrail step with fail-fast, the `skipped` Checks state, and the approval guarantee) in `agents/code-reviewer.md`. Those are internal skill-reference and agent deliverables owned by phase 4 and are **not** re-documented here.

A whole-repository sweep of every live human-facing documentation surface (`README.md`, `CONTRIBUTING.md`, `AGENTS.md`, the `website/` landing page, the `skills/radical-pipelines/` reference tree outside the four touched files, and the `.changeset/` directory) found **no documentation surface left out of sync by this change** — the two README guardrail mentions and every other surface stay literally true at their altitude (justified per surface in "Surfaces deliberately not given a task"). The change does, however, touch two **release-relevant** paths (`skills/**` and `agents/**` per `.changeset/config.json`), and the code plan authors no changeset, so the mandatory CI changeset is the docs phase's to own.

This plan contains **exactly one task**: author the `minor` changeset the Changeset Gate requires. Everything else the feature needs is already a code-plan deliverable and is intentionally not duplicated here.

## Tasks

### Task 1 — Author the changeset for the role-scoped-guardrails change

- **Goal.** Satisfy the project's mandatory Changeset Gate for this PR. The change edits `skills/**` and `agents/**` — both release-relevant `changedFilePatterns` (`.changeset/config.json`) — and the code plan (T1–T4) creates no changeset, so without this task the PR fails CI's presence check (`npx changeset status`). Author a single well-formed `.changeset/*.md` entry describing the user-facing change.

- **Audience.** Changelog readers and project maintainers — people scanning the release notes to learn what changed in a version, at the altitude of a one-line feature summary, not skill internals.

- **Files to change.** One new file under `.changeset/` (a `changeset add`-style Markdown file with valid front matter). No other file.

- **Sections / scope.**
  - **Bump type `minor`.** This is a new, backwards-compatible feature: an optional per-gate `level` field and a reviewer fail-fast rule. It is additive — every existing `.rp.md` keeps today's behavior with no migration (spec R8/AC9) — so it is a feature addition, never a breaking change. Per the authoritative bump table in `CONTRIBUTING.md` ("New features; backwards-compatible additions" ⇒ `minor`; pre-1.0 forbids `major`), the bump is `minor`. Verify the package name in the front matter matches the root `package.json` name as the existing changesets write it.
  - **Summary line.** One sentence, present-tense, user-facing: code-phase guardrails can now carry an optional `writer`/`reviewer` level so writers run cheap gates per commit and reviewers run expensive suites once, with the reviewer able to fail fast on cheaper findings. Match the voice of the existing released changeset entries (consult `CHANGELOG.md` or prior `.changeset/` history for tone).
  - **Do not** restate the mechanism (the selection rule, the fail-fast/approval-guarantee, the `skipped` state, the absent-means-both rule) — the skill reference owns that. The changeset is a release-note summary, not a second copy of the convention.

- **Depends on.** None within this plan. Author it after phase 4 ships so the summary reflects the shipped behavior, but it has no textual dependency on the exact phase-4 wording (it summarizes the capability, not the prose).

- **Traces to.** `CONTRIBUTING.md` "When a changeset is required" (release-relevant `skills/**` + `agents/**`) and "Bump types" (`minor` for backwards-compatible feature additions); spec R8/AC9 (additive, no migration ⇒ not breaking). The code plan explicitly carries no changeset task, so this is the docs phase's deliverable. Precedent: prior pipelines whose code plan did not own the changeset placed the mandatory `minor` changeset in the docs phase.

- **Acceptance.**
  1. Exactly one new `.changeset/*.md` file exists, with valid front matter (correct package name keyed to a `minor` bump) that `node scripts/validate-changesets.mjs` accepts.
  2. The bump type is `minor`, justified as a backwards-compatible feature addition per the `CONTRIBUTING.md` bump table.
  3. The summary is a single user-facing, present-tense sentence describing the role-scoped guardrails + reviewer fail-fast capability, in the voice of existing changeset entries.
  4. The summary does not restate the guardrail mechanism (selection rule, fail-fast, approval guarantee, `skipped` state, absent-means-both) — the skill reference owns that.
  5. `npx changeset status` reports the change as covered (the presence gate passes); no existing changeset or `CHANGELOG.md` entry is edited.

## Surfaces deliberately not given a task

A whole-repository sweep confirmed the following surfaces need **no** doc-plan task. They are listed so each absence is an explicit decision, not an oversight:

- **`load.md`, `setup.md`, `agents/code-writer.md`, `agents/code-reviewer.md`** — the entire functional documentation surface of this feature, all owned by the **code plan** (T1–T4). Re-documenting any of them here is explicitly out of scope; this plan does not duplicate them.

- **`README.md`** — the two guardrail mentions (the `## Configuration` shared-conventions enumeration at ~`:147` and the `.rp.md`-structure shared-section parenthetical at ~`:159`) describe Guardrails at a deliberately high altitude: an optional shared convention declaring "the deterministic verification gates (exact commands judged pass/fail by exit code) the code/doc phases must pass." That altitude already omits the existing **phase-granularity** detail (it never enumerates that a gate names `code`/`docs`), so omitting the new **role-granularity** (writer/reviewer level) and the reviewer fail-fast rule is consistent — adding them would push the README below its own established altitude (design §6). Both sentences stay literally true and complete after this change; nothing goes stale, so no README task is warranted.

- **`CONTRIBUTING.md`** — about the changeset gate, CI, bump types, and the release procedure. It carries no convention catalog and no reference to guardrails or `.rp.md` contents. The changeset this feature ships is an ordinary `minor` changeset already covered by its existing guidance, so no statement there goes stale; CONTRIBUTING **governs** Task 1 (it is the bump-type authority) rather than being a surface to edit.

- **`AGENTS.md`** — a minimalist "rules when modifying the skill" doc (concision, no cross-path duplication, generic/tool-agnostic, no gratuitous negatives). It carries no convention catalog and no reference to `.rp.md` contents. Its rules **constrain** how the phase-4 prose is written (and govern this plan's "reference, don't restate" stance), but nothing the feature adds is described there.

- **`website/`** (`index.html`, `demo.js`, `styles.css`, assets) — high-level marketing copy about the six-phase pipeline model. A keyword sweep found references only to the writer/reviewer **agents** in the generic adversarial-pair framing, never to guardrails, verification gates, `.rp.md`, or convention granularity. Nothing this feature touches is described there; it is marketing-only, and `website/**` is not even release-relevant (`CONTRIBUTING.md`).

- **`doc-writer.md` / `doc-reviewer.md` and the docs-phase reading path** — out of scope by spec (AC11): docs-phase selection stays purely phase-based and never consults level, so their "guardrails applicable to the docs phase" wording stays literally true. Level is inert in docs. The residual reading-path asymmetry (a leveled both-phase gate appearing in `.rp.md` with a Level the doc agents never consult) is the design review's second non-blocking note; the authoritative inert-in-docs rule already lives in `load.md` (code-plan T1), so no docs-phase prose change is needed.

- **The phase-reference docs** (`reference/autonomous-phases/`, `reference/assisted-phases/`) and `autonomous-workflow.md` — guardrails are never in a launch payload; each code agent self-reads `.rp.md`, and the orchestrator passes a closed list. They reference neither the selection mechanism nor the new level, so they need no edit (design §6).

- **The dogfood `.rp.md`** — the setup example uses generic placeholders and migration is out of scope; the real `.rp.md` is intentionally untouched (design §6).

- **Historical changesets under `.changeset/`** (and the `.changeset/README.md` cheat-sheet) — already-recorded entries are frozen by repository convention and are never retroactively edited. Task 1 authors a fresh entry only.

## Notes for the doc-writer (phase 5)

- **Author against the shipped change, not this plan's strings.** Read the landed `load.md`, `setup.md`, and the two agent files for the shipped behavior before writing the changeset summary, so the one-line description matches what actually ships.

- **The changeset is this plan's only deliverable.** The feature's functional documentation is entirely owned by the code plan (T1–T4). If you find a human-facing surface that reads as stale after phase 4 ships and is not covered above, surface it rather than silently expanding scope — but the sweep found none.

- **`minor`, not `major`.** The change is additive and backwards-compatible (existing `.rp.md` files work unchanged, no migration). Pre-1.0 policy forbids `major` regardless; the authoritative bump table is in `CONTRIBUTING.md`.

- **Reference, don't restate.** The level definition, the role-filtered selection rule, the fail-fast/approval-guarantee, and the `skipped` Checks state are documented once by phase 4 in the skill reference. The changeset summarizes that the capability **exists**; it does not restate the mechanism (anti-drift; `AGENTS.md` no-duplication rule).
