# Docs Review: APPROVED

**Reviewer:** doc-reviewer
**Batch:** ALL of `doc-plan.md` — Task 1 (the doc plan's only task)
**Diff reviewed:** `4c7afad^..4c7afad` (1 doc-writer commit, README only)
**Verdict:** APPROVED

## Commit reviewed

- `4c7afad` Reflect Guardrails convention in README (doc-writer)

Diffstat for the task commit: `README.md` only — two sentences in the
`## Configuration` section changed, both reflecting the new Guardrails
convention. Surgical and on-altitude.

> **Diff-scope note.** The base-ref→HEAD diff (`a2c1e04..HEAD`) is large because
> `a2c1e04` is the merge-base and trails several trunk merges (the
> `107-rename-prompt-to-intent`, `108-what-why-how-pr-template`, and
> `95-pipeline-reviews` pipelines). Those account for the README's
> `Prompt`→`Intent` and run-folder paragraph hunks, which are **not** part of
> this pipeline. The Guardrails docs change under review is exactly the two
> hunks in commit `4c7afad`. I confirmed the pipeline's own footprint
> (`ee839a8^..4c7afad`, excluding `.pipelines/**`) is precisely: `load.md`,
> `setup.md`, the four phase agents, `.rp.md`, `.changeset/guardrails-convention.md`,
> and `README.md` — matching the spec scope surface plus the docs-phase README.

## Docs-phase guardrails

The repo's `.rp.md` `### Guardrails` declares three gates, all phase `code`.
There are **no docs-phase guardrails**, so no command gate applies to this
phase. This accuracy spot-check is the sole gate, and it is produced below.

## Task 1 acceptance — Reflect the Guardrails convention in the README convention overview — PASS

Both required enumerations updated, both on the shared side, name and altitude
matched to the shipped phase-4 text.

### Edit 1 — shared-conventions enumeration (`README.md:147`) — PASS

- Guardrails is added to the **shared** enumeration: "…artifact folder location,
  commit rules, and an optional `Guardrails` convention declaring the
  deterministic verification gates (exact commands judged pass/fail by exit
  code) the code/doc phases must pass…" — **not** added to either per-tool
  ("Claude Code conventions add… / Pi conventions add…") list. Correct placement
  for a tool-agnostic convention (spec req 4; `.rp.md` ships `### Guardrails`
  under `## Shared conventions`). Acceptance 1, 3.
- Marked **optional** ("an optional `Guardrails` convention"). Acceptance 1.
- Signals **what** a guardrail is at README altitude — "deterministic
  verification gates (exact commands judged pass/fail by exit code) the code/doc
  phases must pass" — mirroring the shipped loader-row one-liner almost verbatim
  ("The deterministic verification gates — exact commands judged pass/fail by
  exit code — the code/doc phases must pass", `load.md:22`). Mirrors the row,
  not the loader body's full definition. Acceptance 4.
- **References, does not restate.** Points to `[convention loader](load.md)` and
  `[setup conventions](setup.md)` for authoring, and does **not** restate the
  three-field name/command/phase shape, the exit-code rule mechanics, the
  phase-selection rule, the setup-validation three-way split, or the agent
  blocker split — all of which live once in `load.md`/`setup.md`. Honors the
  `AGENTS.md` no-duplication rule. Acceptance 4.

### Edit 2 — `.rp.md`-structure shared-section parenthetical (`README.md:159`) — PASS

- `guardrails` appended to the **shared-section** parenthetical: "(issue
  tracking, pipeline slug format, artifact folder, commit format, Linear
  updates, push behavior, guardrails)" — **not** the per-tool parenthetical
  ("worktrees, branch names, team spawning, agent models, health monitoring").
  Acceptance 2, 3.
- Matches the shipped `.rp.md`, where `### Guardrails` sits under
  `## Shared conventions` alongside the other shared `###` subsections. Acceptance 2.

### Canonical name and accuracy — PASS

- Canonical name **`Guardrails`** matches the shipped `load.md` row, the
  `setup.md` step, and the `.rp.md` subsection. No wording drift. Acceptance 2.
- The "code/doc phases" framing describes the convention's general capability
  (phase targets `code` and `docs` per spec req 2 / `load.md:26`), not this
  repo's particular declaration (which is code-only) — correct for a README
  describing the product capability, and identical to the loader row's framing.
- No other README claim is contradicted: the shared-vs-per-tool framing stays
  correct (Guardrails on the shared side), the convention overview still reads as
  a complete, accurate enumeration, and the existing `Agent models` per-tool
  framing is untouched. Acceptance 5.
- No section outside `## Configuration` was changed by the task commit. Acceptance 6.

## Scope sweep — PASS

Verified the doc plan's "Surfaces deliberately not given a task" claims (doc plan
lines 47–65) hold against the shipped tree:

- **`CONTRIBUTING.md`, `AGENTS.md`, `website/`** — grep for
  `guardrail|verification gate|verification convention|.rp.md` returns **zero**
  matches in all three; none carries a convention catalog or `.rp.md` reference,
  so nothing the feature adds goes stale there. Confirmed **untouched by the
  pipeline** (`git diff ee839a8^..4c7afad` over those paths is empty) — rightly so.
- **`load.md`, `setup.md`, the four agents, the dogfood `.rp.md` `### Guardrails`,
  and the `minor` changeset** — functional deliverables owned by the **code
  plan** (T1–T7); the README **references** them rather than restating, as
  required. Not re-reviewed here (code phase, already approved at `8fea740`).
- The changeset (`guardrails-convention.md`) is **code-plan T7**, present and not
  authored by the docs phase — correct; the docs phase added no second changeset.

## Checks

| Check | Command | Result |
| --- | --- | --- |
| Task commit footprint | `git diff --stat 4c7afad^..4c7afad` | `README.md` only, 2 sentences |
| Pipeline footprint matches spec scope | `git diff --name-only ee839a8^..4c7afad -- . ':(exclude).pipelines/*'` | load.md, setup.md, 4 agents, .rp.md, changeset, README.md |
| Canonical name matches shipped | grep `Guardrails` in `load.md`/`setup.md`/`.rp.md` | identical name; row one-liner mirrored |
| Guardrails on shared side, not per-tool | read `README.md:147,159` in context | shared enumeration + shared parenthetical only |
| Cited reference paths resolve | `ls skills/radical-pipelines/reference/conventions/{load,setup}.md` | both present |
| Sweep surfaces clean | grep `guardrail\|verification gate\|verification convention\|.rp.md` in CONTRIBUTING.md, AGENTS.md, website/ | none |
| Sweep surfaces untouched by pipeline | `git diff ee839a8^..4c7afad -- CONTRIBUTING.md AGENTS.md website/` | empty |

All Task 1 acceptance criteria met; the README wording is accurate against the
shipped phase-4 text (name, altitude, shared placement); the mechanism is
referenced not restated; the deliberately-untouched surfaces are genuinely
untouched and correctly so. No docs-phase guardrails exist, so this spot-check is
the sole gate, and it passes. Approved.
