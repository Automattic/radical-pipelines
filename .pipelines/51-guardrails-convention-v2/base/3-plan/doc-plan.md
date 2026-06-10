# Doc Plan — Add a Guardrails convention to formalize deterministic code-phase verification

_Issue: [Automattic/radical-pipelines#51](https://github.com/Automattic/radical-pipelines/issues/51). Pipeline: `51-guardrails-convention-v2`. Inputs: the approved, binding `1-spec/spec.md`, the approved `2-design-doc/design-doc.md`, and the approved `3-plan/code-plan.md` (7 tasks T1–T7). This plan is the task list the docs phase (phase 5) executes against._

## Overview

This feature is **documentation-as-implementation**: Radical Pipelines has no executable orchestration code, so the whole change is prose / instruction text across five files plus a changeset (design §1, spec OOS 4). The approved code plan (T1–T7) already owns the **entire functional documentation surface** — the conventions loader row and body (`load.md`), the setup capture-and-validate step (`setup.md`), the four phase-agent rewrites, the dogfood `### Guardrails` declaration in `.rp.md`, and the `minor` changeset (code-plan T7). Those are internal skill-reference and dogfood deliverables owned by phase 4 and are **not** re-documented here.

The docs phase owns one surface the code phase leaves out: the **human-facing `README.md` convention overview**. Phase-1 research and the spec settled that README updates belong to the docs phase (spec Overview line 23; spec OOS 7: "README / website human-facing documentation [is] owned by the pipeline's docs phase, not this spec"). The README "Configuration" section enumerates a project's conventions in human-facing prose in two places, both of which omit the new Guardrails convention and would otherwise ship out of sync with what the skill now formalizes. Once Guardrails exists as a discoverable shared convention in `load.md`/`setup.md`/`.rp.md`, the README's convention overview reads as incomplete: a reader scanning "what conventions does a project configure?" would not learn that deterministic verification gates are now a first-class, optional, tool-agnostic convention.

A whole-repository sweep of every live documentation surface (`README.md`, `CONTRIBUTING.md`, `AGENTS.md`, the agent profiles under `agents/`, the entire `skills/radical-pipelines/` reference tree, the `website/` landing page, and the `.changeset/` directory) found **no other surface left out of sync by this change** — the README is the only one. The reasons each other surface needs no task are recorded explicitly in "Surfaces deliberately not given a task" below so the absence is a decision, not an oversight.

This plan contains **exactly one task**: reflect the new Guardrails convention in the README's human-facing convention overview. Everything else the feature needs is already a code-plan deliverable and is intentionally not duplicated here.

> **The changeset is NOT a docs-phase task here.** Unlike some prior pipelines that deferred the mandatory CI changeset to the docs phase, this pipeline's **code plan owns the `minor` changeset as code-phase task T7** (code-plan T7; design D4). The docs phase must **not** author or re-task the changeset — doing so would duplicate T7 and risk two competing changeset files. If the doc-writer observes the changeset is missing when phase 5 runs, that is a phase-4 gap to surface, not a doc-plan deliverable to fill.

## Tasks

### Task 1 — Reflect the Guardrails convention in the README convention overview

- **Goal.** Keep the human-facing README convention overview complete and in sync with the shipped skill by reflecting the new **Guardrails** convention where the README enumerates a project's conventions, so a reader scanning "what conventions does my project's `.rp.md` carry?" learns that deterministic verification gates are now a first-class convention — **shared / tool-agnostic** (not per-tool) and **optional** — without restating the guardrail mechanism the skill reference already owns.

- **Audience.** Project owners / Radical Pipelines users (and teams evaluating a consuming project) reading the README to understand what conventions a project can configure and what lives in `.rp.md`. Not skill internals, not the agents.

- **Files to change.** `README.md` — the `## Configuration` section only. Specifically the two sentences that enumerate a project's conventions:
  1. The **shared-conventions enumeration** (currently around `README.md:147`): _"Shared project conventions include task tracking, pipeline slug format, artifact folder location, and commit rules."_ This list omits Guardrails. Because Guardrails is a **shared / tool-agnostic** convention (design §2; spec req 4, 10 — it lives under `## Shared conventions` in `.rp.md`, not in a per-tool block), it belongs in this **shared** enumeration, **not** in the per-tool ("Claude Code conventions add… / Pi conventions add…") lists that follow in the same paragraph. Add it as the optional deterministic-verification-gates convention, in the README's existing terse voice. Do **not** add it to either per-tool list.
  2. The **`.rp.md`-structure sentence** (currently around `README.md:159`): _"A project's committed `.rp.md` is organized as a shared section (issue tracking, pipeline slug format, artifact folder, commit format, Linear updates, push behavior) followed by a per-tool section…"_ The parenthetical shared-section list omits Guardrails. Add `guardrails` (or the canonical name as shipped) to the **shared-section** parenthetical so the structural description of `.rp.md` matches what now ships — again, the shared list, not the per-tool list.

- **Sections / scope.**
  - Reflect Guardrails in **both** enumerations above, matching the README's existing voice (terse, present-tense, parenthetical convention lists). State that it is **optional** and that it is a **shared / tool-agnostic** convention — the two properties a reader needs to place it correctly against the existing catalog.
  - Signal **what** a guardrail is at the README's altitude — the deterministic, machine-checkable verification gates (exact commands judged pass/fail by exit code) the code/doc phases must pass — in a single terse clause. This mirrors the loader row's one-liner, not the loader body's full definition.
  - **Reference, do NOT restate, the canonical documentation.** If a pointer is natural in the README's voice, point the reader at the [setup conventions](./skills/radical-pipelines/reference/conventions/setup.md) (which already documents the other optional, project-chosen conventions) or the [convention loader](./skills/radical-pipelines/reference/conventions/load.md) for how to author guardrails. Do **NOT** duplicate the guardrail definition, the three-field shape (name / command / phase), the exit-code rule, the phase-selection rule, the setup-validation semantics, or the three-way blocker split into the README — those are documented once by phase 4 in `load.md` / `setup.md` (anti-drift; `AGENTS.md` no-duplication rule: an instruction repeated across reading paths must live in one place and be referenced).
  - Use the **exact convention name as it ships** in `load.md` / `setup.md` / `.rp.md` (expected: `Guardrails`). Verify the final canonical name against the shipped phase-4 text before writing; if phase 4 used different final wording, use whatever shipped.

- **Depends on.** None within this plan. Authored **after** phase 4 ships so it reflects the real shipped catalog wording and the canonical convention name. The README is written against the landed `load.md` / `setup.md` / `.rp.md`, not against this plan's expected strings.

- **Traces to.** Spec Overview (README owned by docs phase), spec OOS 7 (README is the docs phase's surface), spec req 4 / 10 (Guardrails is shared / tool-agnostic, under `## Shared conventions`), spec req 5 (optional). Design §2 (scope surface notes README is out of the spec's five files and owned by docs), D1 (the loader row's terse executable-signalling one-liner is the altitude to mirror), D3 (the `.rp.md` shared-section placement). Code-plan T1 (loader row/body), T6 (setup), T7 (`.rp.md` shared-section placement) — the canonical sources the README references. Precedent: the #90 per-agent-model-config doc plan treated the README convention catalog as a coherence surface that is reflected, not restated; the #91 local-overrides doc plan reconciled the same `## Configuration` narrative for a new convention.

- **Acceptance.**
  1. A reader of the README's `## Configuration` section comes away knowing a project can optionally declare **guardrails** — deterministic verification gates (exact commands judged by exit code) the code/doc phases must pass — and that this is a **shared / tool-agnostic, optional** convention.
  2. Guardrails appears in **both** the shared-conventions enumeration (~`:147`) and the `.rp.md`-structure shared-section parenthetical (~`:159`), using the same canonical name that ships in `load.md` / `setup.md` / `.rp.md`.
  3. Guardrails is placed in the **shared** lists, **not** in either per-tool ("Claude Code conventions add… / Pi conventions add…") list — consistent with it being tool-agnostic and authored under `## Shared conventions` in `.rp.md`.
  4. The new wording matches the surrounding README voice (terse, present-tense, parenthetical convention list) and does **not** restate the guardrail mechanism — the definition, three-field shape, exit-code rule, phase-selection rule, setup-validation semantics, or blocker split. It references the canonical setup/loader documentation instead if a pointer is included.
  5. No other README claim is contradicted: the convention overview still reads as a complete, accurate enumeration, and the shared-vs-per-tool framing stays correct (Guardrails sits on the shared side).
  6. No section outside `## Configuration` is changed; the website, CONTRIBUTING.md, and AGENTS.md are untouched (see the sweep below).

## Surfaces deliberately not given a task

A whole-repository sweep confirmed the following surfaces need **no** doc-plan task. They are listed so the absence is an explicit decision:

- **`load.md`, `setup.md`, the four agent profiles, the dogfood `.rp.md` `### Guardrails` declaration, and the `minor` changeset** — all are functional deliverables already owned by the **code plan** (T1–T7). The changeset specifically is **code-plan T7**, not a docs-phase task (see the Overview note). Duplicating any of these here is explicitly out of scope; the README task **references** them rather than restating them.

- **`CONTRIBUTING.md`** — its content is about the changeset gate, CI, bump types, and the release/maintainer procedure. It has **no convention catalog** and no reference to `.rp.md`'s conventions, verification gates, or guardrails. Nothing this feature changes is described there; the changeset this feature ships is an ordinary `minor` changeset that the existing CONTRIBUTING guidance already covers, so no statement there goes stale.

- **`AGENTS.md`** — a minimalist "rules when modifying the skill" doc (concision, no duplication across reading paths, generic/tool-agnostic, no gratuitous negatives). It carries **no convention catalog** and no reference to `.rp.md` contents, so nothing the feature adds is described there. Its rules instead **govern** how the phase-4 prose and the README task are written (concise, no duplication, reference-don't-restate) — they are constraints on this work, not a surface to edit.

- **`agents/*.md` profiles** — these are rewritten by the **code plan** (T2–T5) to read "the guardrails applicable to the {code|docs} phase." They are internal agent instructions, not human-facing documentation, and the code plan owns every edit to them (including the grep-negative gate). The docs phase does not touch them.

- **`website/`** (`index.html`, `demo.js`, `styles.css`, assets) — the landing page is high-level marketing copy about the six-phase pipeline model. A keyword sweep found **zero references** to conventions, configuration, `.rp.md`, verification gates, guardrails, lint/typecheck, or anything this feature touches. It is marketing-only and is not a surface for this feature — consistent with the #90 and #91 doc-plan sweeps that reached the same conclusion for the same page.

- **The phase-reference docs** (`skills/radical-pipelines/reference/autonomous-phases/`, `reference/assisted-phases/`) — verified grep-clean for both "verification convention" and "guardrail" (design §3.1; spec OOS 5). They reference neither the old wording nor the new convention, so they need no edit. Out of scope per spec OOS 5.

- **`SKILL.md` and the broader skill-reference tree** — the new convention is discoverable through the existing conventions reading path (`SKILL.md` → `load.md` → `setup.md`), which the code plan already updates (T1, T6). No new discoverability clause is warranted: guardrails is "one more convention" surfaced exactly like the existing optional conventions, with no separate reading path to advertise.

- **Historical changesets under `.changeset/`** (e.g. `pipeline-reviews.md`) — already-recorded entries are frozen by repository convention and are never retroactively edited. The new changeset is authored fresh by code-plan T7.

## Notes for the doc-writer (phase 5)

- **Author against the shipped text, not this plan's strings.** Phase 4 finalizes the exact canonical convention name (expected `Guardrails`) and the loader/`.rp.md` wording. Read the shipped `load.md`, `setup.md`, and `.rp.md` for the canonical name and the one-liner altitude before writing the README; if phase 4 used different final wording, use whatever shipped (wording-level drift, not a blocker).

- **Do not duplicate; reference.** The guardrail definition, the name/command/phase shape, the exit-code rule, the phase-selection rule, the setup-validation three-way split, and the agent-side blocker split are documented **once** by phase 4 in the skill reference. The README reflects that the convention **exists** (shared, optional, deterministic gates) and points to the canonical docs — it does not restate the mechanism (anti-drift; `AGENTS.md` no-duplication rule).

- **Place Guardrails on the shared side.** Guardrails is tool-agnostic and lives under `## Shared conventions` in `.rp.md`. In the README it belongs in the **shared** enumeration and the **shared-section** parenthetical — never in the per-tool ("Claude Code conventions add… / Pi conventions add…") lists. Getting this wrong would misrepresent the convention as per-tool.

- **Do not author the changeset.** The `minor` changeset is **code-plan T7**, a code-phase deliverable. If it is already present when phase 5 runs (it should be), leave it; if it is somehow missing, surface that as a phase-4 gap rather than creating a second changeset.
