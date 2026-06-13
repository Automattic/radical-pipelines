# Doc Plan — Agent-scoped guardrails

_Pipeline: `121-role-scoped-guardrails`, review run `review-1-agent-scoped-guardrails`. Inputs: the approved, binding `1-spec/spec.md`, the approved `2-design-doc/design-doc.md`, and the approved `3-plan/code-plan.md` (six tasks, T1–T6). This plan is the task list the docs phase (phase 5) executes against._

## Overview

This review replaces the guardrail `phase`+`level` dimensions with a single **agents** dimension across this repo's own skill. Radical Pipelines is "documentation as code," so the change ships *as* skill-instruction prose — and the approved code plan (T1–T6) already owns the **entire functional documentation surface**: the agents-field definition, name-membership selection rule, and behavior archetypes in `load.md`; the agents-capture bullet and reshaped example in `setup.md`; the agent-name re-key in `code-writer.md`, `code-reviewer.md`, and `doc-writer.md`; and the fresh reviewer restructure in `doc-reviewer.md`. Those are internal skill-reference and agent deliverables owned by phase 4 and are **not** re-documented here.

This plan owns the two surfaces the code plan deliberately leaves out, both named by the spec as docs-phase obligations:

1. **The pending changeset** (`.changeset/role-scoped-guardrails.md`, AC12 / spec R9). The base run authored this `minor` changeset to describe the now-superseded `level` feature. The base run (PR #124) is open and unmerged, so `level` shipped in **no release** — it exists only as this unreleased changeset. This review supersedes `level` with agent scoping before either ever ships. The obligation is to **reword the existing changeset in place** (renaming the slug as appropriate) to describe agent scoping, with **no second changeset stacked** — so the merged changelog never announces a `level` field that shipped in no release.

2. **`README.md:147`** (spec Out of Scope, named as a docs-phase touchpoint). The README's `## Configuration` shared-conventions sentence describes Guardrails as the gates "the code/doc phases must pass" — the exact phase-altitude phrasing that code-plan T1 strips from `load.md:22` and T2 strips from `setup.md:173`. Once the skill no longer frames guardrails by phase, the README is the lone human-facing surface still naming a phase-bounded guardrail model that no longer exists, so it goes stale and needs the parallel re-word.

A whole-repository sweep of every other live human-facing surface (`CONTRIBUTING.md`, `AGENTS.md`, the `website/` landing page, the `skills/radical-pipelines/` reference tree outside the six touched files, `CHANGELOG.md` history, and the rest of `.changeset/`) found no surface left out of sync by this change — each stays literally true at its altitude, justified per surface in "Surfaces deliberately not given a task."

These two tasks are independent and touch disjoint files; they may run in parallel.

## Tasks

### Task 1 — Reword the pending changeset in place to describe agent scoping

- **Goal.** Reconcile the base run's unreleased `level` changeset (`.changeset/role-scoped-guardrails.md`) so the next release announces the shipped **agent-scoping** model, not a superseded `level` field that shipped in no release. Reword the existing changeset **in place** (renaming the slug as appropriate), stacking **no** second changeset. (Satisfies AC12; spec R9.)

- **Audience.** Changelog readers and project maintainers — people scanning release notes to learn what changed in a version, at the altitude of a one-line feature summary, not skill internals.

- **Files to change.** The single existing file `.changeset/role-scoped-guardrails.md` — its body reworded, and its filename renamed to a slug that describes agent scoping (e.g. `agent-scoped-guardrails.md`). **No** new `.changeset/*.md` file is created; no other `.changeset/` entry, and no `CHANGELOG.md` entry, is edited.

- **Sections / scope.**
  - **Front matter — bump type stays `minor`.** This is a backwards-compatible feature: the agents field is optional by definition ("names no agents = every gate-running agent"), every existing `.rp.md` keeps working with no migration (spec R1, Out of Scope #2). Per the authoritative bump table in `CONTRIBUTING.md` ("New features; backwards-compatible additions" ⇒ `minor`; pre-1.0 forbids `major`), `minor` is correct — unchanged from the existing changeset. Keep the front matter's package key (`"@automattic/radical-pipelines"`) exactly as written.
  - **Body — replace the `level` summary with an agent-scoping summary.** One present-tense, user-facing summary describing the shipped capability: a code- or doc-phase guardrail can now name the agents that run it (one or more of `code-writer`, `code-reviewer`, `doc-writer`, `doc-reviewer`); a gate naming no agents runs for every gate-running agent. Match the voice of the existing released changeset entries (consult `CHANGELOG.md` `0.3.0` and prior `.changeset/` history for tone — that entry is the base Guardrails convention this one extends).
  - **Frame it as the successor, not an addition.** The summary describes the model *as it now is* (a single agents dimension), not as a diff against `level`. Because `level` never shipped in a release, the changelog must not reference it — naming it would announce a field that no release ever had.
  - **Do not restate the mechanism.** The name-membership selection rule, the unnamed-gate-runs-for-all rule, the forward-declaration inertness, the fail-fast/approval guarantee, the `skipped` Checks state, and the archetype mapping are owned by the skill reference (code-plan T1–T6). The changeset is a release-note summary, not a second copy of the convention (`AGENTS.md` no-duplication rule).

- **Depends on.** None within this plan. Reword after phase 4 ships so the summary reflects the shipped behavior, though it has no textual dependency on the exact phase-4 wording (it summarizes the capability, not the prose).

- **Traces to.** Spec R9 / AC12 (reword in place, rename slug, no second changeset); `CONTRIBUTING.md` "Bump types" (`minor` for backwards-compatible feature additions) and "Pre-1.0 policy"; design §8 item 7 (docs-phase deliverable, not a design- or code-phase edit). Spec Out of Scope #6 (`CHANGELOG.md` history is immutable and not edited).

- **Acceptance.**
  1. `.changeset/role-scoped-guardrails.md` no longer exists; exactly one changeset file describes agent scoping, under a slug naming agent scoping (e.g. `agent-scoped-guardrails.md`). The total count of `.changeset/*.md` content entries is unchanged from before (no second changeset stacked).
  2. The front matter is `minor` with the package key `"@automattic/radical-pipelines"`, and `node scripts/validate-changesets.mjs` accepts the file.
  3. The body is a single user-facing, present-tense summary describing the agent-scoping capability (a guardrail names the agents that run it; unnamed = every gate-running agent), in the voice of existing changeset entries.
  4. The summary makes no reference to a `level` field or `writer`/`reviewer` levels — it describes the model as it now is.
  5. The summary does not restate the mechanism (selection rule, fail-fast, approval guarantee, `skipped` state, archetype mapping) — the skill reference owns that.
  6. `npx changeset status` reports the change as covered; no `CHANGELOG.md` entry and no other changeset is edited.

---

### Task 2 — Re-word the README guardrail sentence to drop the phase-altitude phrasing

- **Goal.** Keep `README.md:147` literally true after the skill drops the phase-bounded guardrail framing. Strip the "the code/doc phases must pass" phrasing from the `## Configuration` shared-conventions sentence — the same phrase code-plan T1 removes from `load.md:22` and T2 removes from `setup.md:173` — so the README no longer names a phase-bounded guardrail model the skill no longer carries. (Spec Out of Scope, README docs-phase touchpoint; design §6 README row, §8 item 5.)

- **Audience.** README readers — contributors and adopters scanning the convention catalog at a high altitude, learning that an optional `Guardrails` convention exists, not its selection mechanics.

- **Files to change.** `README.md` only — the single sentence at `:147` (the `## Configuration` "Shared project conventions include …" sentence describing the `Guardrails` convention). The sentence's two reference links (to `load.md` and `setup.md`) and the rest of the paragraph (Claude Code / Pi tool-block enumeration, `Agent models`) stay intact.

- **Sections / scope.**
  - Re-word the guardrail clause `an optional `Guardrails` convention declaring the deterministic verification gates (exact commands judged pass/fail by exit code) the code/doc phases must pass` to drop the trailing `the code/doc phases must pass`, matching the altitude T1/T2 land in the skill (e.g. end the clause at `… judged pass/fail by exit code`).
  - **Stay at README altitude.** The README never enumerated the old `phase`/`level` granularity, and it must not enumerate the new agents granularity either — adding the agent-name selection here would push the README below its established altitude (design §6). The edit only *removes* the now-false phase framing; it adds no agents-dimension detail. The "optional `Guardrails` convention declaring the deterministic verification gates" framing and the two how-to-author links stay.
  - Confirm no other `README.md` sentence carries the phase-bounded guardrail framing. (The verified sweep found `:147` is the only Guardrails mention naming the phases; the `.rp.md`-structure shared-section parenthetical lists "guardrails" as a section name only, with no phase phrasing, and stays true.)

- **Depends on.** None within this plan. Edit after phase 4 ships so the README altitude matches the landed skill phrasing, though it depends only on the *altitude* T1/T2 land, not their exact strings.

- **Traces to.** Spec Out of Scope (README:147 phase-altitude wording, a docs-phase touchpoint); design §6 (README untouched-by-code-plan row: "a docs-phase touchpoint named for the doc-plan") and §8 item 5. Code-plan T1 (loader-table re-word) and T2 (section-intro re-word) are the parallel skill edits whose altitude this README change matches.

- **Acceptance.**
  1. `README.md:147` no longer contains the phrase "the code/doc phases must pass" (or any phase-bounded guardrail framing).
  2. The sentence still describes the `Guardrails` convention as optional, declaring "the deterministic verification gates (exact commands judged pass/fail by exit code)," and retains both how-to-author links (`load.md`, `setup.md`).
  3. The README adds no agents-dimension detail (no agent names, no selection rule) — it only removes the stale phase framing, staying at its established altitude.
  4. No other `README.md` content changes; the rest of the `## Configuration` paragraph is intact.

---

## Surfaces deliberately not given a task

A whole-repository sweep confirmed the following surfaces need **no** doc-plan task. They are listed so each absence is an explicit decision, not an oversight:

- **`load.md`, `setup.md`, `agents/code-writer.md`, `agents/code-reviewer.md`, `agents/doc-writer.md`, `agents/doc-reviewer.md`** — the entire functional documentation surface of this change, all owned by the **code plan** (T1–T6). Re-documenting any of them here is explicitly out of scope; this plan does not duplicate them.

- **`README.md` `.rp.md`-structure parenthetical** (the shared-section enumeration listing "guardrails" among the section names) — names "guardrails" as a section only, with no phase or level granularity, so it stays literally true. Task 2 touches only the `:147` Configuration sentence that carries the stale phase phrasing.

- **`CONTRIBUTING.md`** — about the changeset gate, CI, bump types, and the release procedure. It carries no convention catalog and no reference to guardrails or `.rp.md` contents. The changeset Task 1 reconciles is an ordinary `minor` changeset already covered by its existing guidance, so no statement there goes stale; `CONTRIBUTING.md` **governs** Task 1 (it is the bump-type authority) rather than being a surface to edit.

- **`AGENTS.md`** — a minimalist "rules when modifying the skill" doc. It carries no convention catalog and no reference to `.rp.md` contents. Its rules **constrain** how the phase-4 prose is written and govern this plan's "reference, don't restate" stance, but nothing the change adds is described there.

- **`website/`** (`index.html`, `demo.js`, `styles.css`, assets) — high-level marketing copy about the six-phase pipeline model. A keyword sweep found references only to the writer/reviewer **agents** in the generic adversarial-pair framing, never to guardrails, verification gates, `.rp.md`, or convention granularity. Nothing this change touches is described there.

- **The phase-reference docs** (`reference/autonomous-phases/`, `reference/assisted-phases/`) and `autonomous-workflow.md` — guardrails are never in a launch payload; each gate-running agent self-reads `.rp.md`, and the orchestrator passes a closed list. They reference neither the selection mechanism nor the dimensions, so they need no edit (design §6).

- **`reference/pipeline-versioning.md` and the per-phase completion predicate** — Checks-file consumers test existence + committed, never content; a `skipped` Result or absent row breaks no consumer (design §6). No edit.

- **The dogfood `.rp.md`** — this repo's `.rp.md` declares no guardrails; the setup example uses generic placeholders and migration is out of scope; the real `.rp.md` is intentionally untouched (design §6, spec Out of Scope #2).

- **`CHANGELOG.md`** — the released `0.3.0` entry (base Guardrails convention) is immutable repository history and is never retroactively edited (spec Out of Scope #6). Task 1 reconciles only the *unreleased* `.changeset/` entry; once it merges and a release runs, the changelog records agent scoping going forward, leaving the released `0.3.0` text untouched.

- **`.changeset/README.md` and `.changeset/config.json`** — the changeset cheat-sheet and config are unaffected; `README.md` is already in `config.json`'s `changedFilePatterns`, so Task 2's README edit needs no config change.

## Notes for the doc-writer (phase 5)

- **Author against the shipped change, not this plan's strings.** Read the landed `load.md`, `setup.md`, and the four agent files for the shipped behavior before rewording the changeset summary and the README sentence, so each matches what actually ships at its own altitude.

- **Reword in place; do not stack.** Task 1's defining constraint (spec R9 / AC12) is that the *existing* changeset is reworded and its slug renamed — **no** second changeset is added. A stacked changeset would make the merged changelog announce both `level` and agent scoping, exactly the outcome R9 forbids.

- **Never reference `level` in the changeset.** `level` shipped in no release. The reworded summary describes the agents model as it now is; it does not present itself as a diff against `level`.

- **README stays at altitude.** Task 2 only *removes* the stale phase phrasing — it adds no agents-dimension detail. The README never enumerated phase/level granularity and must not enumerate agents granularity (design §6).

- **`minor`, not `major`.** The change is additive and backwards-compatible (agents field optional, existing `.rp.md` files work unchanged, no migration). Pre-1.0 policy forbids `major` regardless; the authoritative bump table is in `CONTRIBUTING.md`. The existing changeset is already `minor` — keep it.

- **Reference, don't restate.** The agents definition, the name-membership selection rule, the archetypes, the fail-fast/approval guarantee, and the `skipped` Checks state are documented once by phase 4 in the skill reference. The changeset summarizes that the capability **exists**; it does not restate the mechanism (anti-drift; `AGENTS.md` no-duplication rule).
