# Code Plan: Role-scoped guardrails with reviewer fail-fast

## Overview

This change adds an optional **level** dimension (`writer` / `reviewer`, absent = both roles) to the code-phase guardrail declaration, and a reviewer fail-fast rule. It is prose-and-instruction-text only — no executable code, module, or parser; guardrails stay prose the agents read. The work is confined to exactly four files and decomposes one-task-per-file, matching design decisions D1–D4:

1. `skills/radical-pipelines/reference/conventions/load.md` (D1) — the authoritative level definition and the role filter on the selection rule. This is the foundation the other three files name by reference, so it is sequenced first.
2. `skills/radical-pipelines/reference/conventions/setup.md` (D2) — capture the level during guardrail setup, with one illustrative example.
3. `agents/code-writer.md` (D3) — narrow the writer to its role selection; obligations unchanged in form.
4. `agents/code-reviewer.md` (D4) — narrow the reviewer to its role selection; promote the guardrail run to its own step carrying fail-fast, the skipped state, and the approval guarantee.

Tasks 2–4 depend on Task 1 conceptually (they reference the level vocabulary and selection rule it defines) but touch disjoint files. They are ordered for review coherence, not for any code-level dependency.

The change is governed by these definitions, which all four files must encode consistently (design §4):

- **Level** — an optional fourth per-gate field, `writer` or `reviewer`, naming which code-phase role runs the gate. No level = both roles (unscoped). It is part of the committed declaration, so it inherits the committed-only rule (never from `.rp.local.md`).
- **Selection is two filters, phase then level.** Docs phase selects by phase only and never consults level (a both-phase gate carrying a level still runs for both doc agents; level is inert in docs). Code phase selects by phase, then by role: the writer runs `writer`-leveled or unscoped gates; the reviewer runs `reviewer`-leveled or unscoped gates. Unscoped gates are the shared mandatory floor both code roles run.
- **Fail-fast and the approval guarantee are two halves of one rule.** The reviewer runs the judgment-based checks (its review checklist and behavior verification) before running its guardrail selection. Once it has at least one rejection finding it **may** (not must) reject without running any not-yet-run gate of its selection, recording each deliberately skipped gate as **skipped**. It **approves only** when every gate in its selection has run and passed in that same iteration. Each reviewer instance is fresh and stateless — the guarantee is per-iteration, with no cross-iteration caching.
- **A malformed level gets no new handler.** A level outside `{writer, reviewer}` matches no role filter, so the gate is selected for no code-phase role — exactly the existing implicit behavior of an unrecognized phase target. No prose is added for this case; the membership-test wording produces the silent no-match by itself.

## Tasks

### Task 1: Define the level and role-filter the selection rule in `load.md`

- **Goal:** Make `load.md` the single authoritative source of the level vocabulary and the role-filtered code-phase selection, so the agent files can name only their own selection without re-deriving it (mirroring how the phase filter is already split between `load.md` ¶3 and the agents).
- **Files to change:** `skills/radical-pipelines/reference/conventions/load.md`
- **Changes:**
  - In the `## Guardrails` definition paragraph (currently ¶1, the sentence beginning "A guardrail is an exact command…" ending "…a guardrail may apply to one or both."), add one sentence defining the optional **level**: a guardrail may carry an optional level, `writer` or `reviewer`, naming which code-phase role runs it; a guardrail with no level applies to both roles. State this as a definition/load fact decoupled from any storage syntax, so that "no Guardrails section", "no Level column", and "blank Level cell" all resolve to both roles uniformly.
  - In the selection-rule paragraph (currently ¶3, the sentence "To load the guardrails for a phase, select the guardrails whose phase(s) include the current phase; an empty selection means run none and proceed."), append the role filter applied **after** the phase filter: within the code phase, the writer selects gates leveled `writer` or unscoped and the reviewer selects gates leveled `reviewer` or unscoped; the docs-phase selection never consults level, and a both-phase gate carrying a level still runs for both doc agents. Preserve the existing "empty selection means run none and proceed" rule over the role-filtered selection.
  - Do **not** add any malformed-level text. Do **not** edit the committed-only line in `## Local overrides` ("Guardrails is shared and committed-only; it is never taken from `.rp.local.md`.") — it already scopes the whole declaration, so the level inherits it.
- **Depends on:** none
- **Traces to:** Spec R1, R2, R3, R8, R9 / Acceptance criteria 1, 2, 3, 9, 10 / Design decision D1 (design §4.1, §4.2, §4.5)
- **Acceptance:**
  - The Guardrails definition paragraph documents an optional `level` field with valid values `writer` and `reviewer`, and states that a guardrail with no level applies to both roles.
  - The definition expresses "absent level = both roles" as a load/definition rule independent of storage syntax, such that a missing Guardrails section, a missing level, and a blank level all resolve to both roles.
  - The selection-rule paragraph states that, within the code phase, the writer selects `writer`-leveled or unscoped gates and the reviewer selects `reviewer`-leveled or unscoped gates, with the role filter applied after the phase filter.
  - The selection-rule paragraph states that the docs-phase selection never consults level, and that a both-phase gate carrying a level still runs for both doc agents.
  - The "empty selection means run none and proceed" rule remains and reads correctly over the role-filtered selection.
  - No prose is added for a malformed or out-of-vocabulary level; the committed-only line in `## Local overrides` is unchanged.

### Task 2: Capture the level during guardrail setup in `setup.md`

- **Goal:** Have setup ask the level per code-applicable gate as an optional field defaulting to unscoped, and give the author and load-time reader a common anchor via one illustrative example — without mandating any storage syntax.
- **Files to change:** `skills/radical-pipelines/reference/conventions/setup.md`
- **Changes:**
  - In the `### Guardrails` step's "**Capture per gate:**" bullet list (currently three bullets: name, exact literal command, applicable phase(s)), add a fourth bullet for an optional **level** — `writer` or `reviewer` — naming which code-phase role runs the gate; asked **only for gates whose phase(s) include `code`**; default when unset is unscoped (both roles). Keep it to two sentences (optional field + vocabulary + code-applicable-only; default unscoped); the asked-only-for-code clause already covers "level is meaningless for a docs-only gate", so no separate sentence about docs-only gates is needed.
  - Attach one motivating clause to the level bullet, in register with the step's existing motivational prose: leveling an expensive suite `reviewer` runs it on the reviewer's side instead of on every writer commit — the owner's decision criterion.
  - Immediately after the "Capture per gate" list, add one generic illustrative table with columns `Name | Command | Phase | Level` containing exactly three rows: one `writer`-leveled gate, one `reviewer`-leveled gate, and one both-phase gate whose **Level cell is blank** (the "unscoped looks like absence" anchor). Use generic placeholder commands only — no tool-, platform-, or ecosystem-specific command names. Frame it as an illustrative recommended shape, not a mandated block or parser input.
  - Do **not** change the validation block (currently "**Validate each command as you capture it.**" through the two caveats) — it is command-execution-only and level-agnostic.
- **Depends on:** Task 1 (uses the level vocabulary and "absent = both" semantics defined there)
- **Traces to:** Spec R7 / Acceptance criterion 8 / Design decision D2 (design §5 D2, §9 item 2)
- **Acceptance:**
  - The "Capture per gate" list has a fourth bullet asking an optional `level` (`writer` or `reviewer`), asked only for gates whose phase(s) include `code`, with the default when unset being unscoped (both roles).
  - The level bullet carries one motivating clause explaining that leveling an expensive suite `reviewer` runs it on the reviewer's side instead of on every writer commit.
  - One generic `Name | Command | Phase | Level` table appears right after the capture list with three rows: a `writer` gate, a `reviewer` gate, and a both-phase gate with a blank Level cell; commands are generic placeholders with no tool/platform/ecosystem-specific names.
  - The example is framed as an illustrative recommended shape, not a mandated syntax or parser input.
  - The validation block is unchanged.

### Task 3: Narrow `code-writer.md` to the writer guardrail selection

- **Goal:** Scope the writer's guardrail obligations from "code-phase" to "the writer guardrail selection" (writer-leveled + unscoped code-phase gates), with the obligations otherwise unchanged in form.
- **Files to change:** `agents/code-writer.md`
- **Changes:**
  - Step 1.2 (currently "Read the guardrails applicable to the code phase — the code-tagged guardrails you must run before completing.") gains the writer selection phrase: read the code-phase guardrails leveled `writer` or unscoped — the gates you must run before completing.
  - Retitle step 5 (currently "### 5. Run the code-phase guardrails") to name the writer guardrail selection (e.g. "Run the writer guardrail selection"), and update its body and sub-bullets to range over that selection. The R4 obligations survive verbatim in form — "run **every** gate, exactly as its command is written", "every applicable gate must pass before you commit", "no bypass (no `--no-verify`, no `skip`, no commented-out checks)", and the two-question outcome model — now scoped to the writer selection rather than "every code-phase guardrail". Reword the empty-selection sub-bullet to the role selection ("No gates in your selection apply" / equivalent). The drift-guard sub-bullet and the exit-non-zero sub-bullet stay substantively unchanged.
  - In the Guidelines blocker bullet (currently the final bullet, "**Stop and report blockers.**", which references "a declared code-phase guardrail's command cannot execute"), reword the guardrail phrase to a gate of the writer's selection, consistent with the term the rest of the file now uses (the substance is identical — a reviewer-leveled gate is never in the writer's selection, so the writer never attempts it).
  - Leave step 3's "not a guardrail" disclaimer about behavior verification substantively unchanged (it only needs to keep pointing at the renamed guardrail step). Cross-references elsewhere in the file to "step 5" / "the guardrails in step 5" must remain accurate after the retitle.
- **Depends on:** Task 1 (names the writer selection — `writer`-leveled or unscoped — defined there)
- **Traces to:** Spec R4 / Acceptance criterion 4 / Design decision D3 (design §5 D3, §9 item 3)
- **Acceptance:**
  - Step 1.2 instructs reading the code-phase guardrails leveled `writer` or unscoped as the gates to run before completing.
  - The guardrail-running step is retitled to name the writer guardrail selection and runs every gate in that selection, exactly as written, all passing before commit, with no bypass — the R4 obligations preserved in form over the narrowed selection.
  - The empty-selection sub-case is worded over the writer's role selection and preserves run-none-and-proceed.
  - The drift-guard and exit-non-zero sub-cases are substantively unchanged.
  - The Guidelines blocker bullet refers to a gate of the writer's selection consistently with the file's selection wording.
  - Every internal cross-reference to the guardrail step (including step 3's disclaimer) is accurate after the retitle; no docs-phase or unrelated writer behavior is changed.

### Task 4: Restructure `code-reviewer.md` — guardrails become their own step with fail-fast

- **Goal:** Narrow the reviewer to its role selection (reviewer-leveled + unscoped), make the step ordering load-bearing, and promote the guardrail run to its own numbered step that carries the fail-fast permission, the skipped state, and the approval guarantee.
- **Files to change:** `agents/code-reviewer.md`
- **Changes:**
  - Step 1 read item 5 (currently "Read the guardrails applicable to the code phase — the code-tagged guardrails you must run during review.") gains the reviewer selection phrase: read the code-phase guardrails leveled `reviewer` or unscoped.
  - Remove the guardrail bullet from step 2 (currently the "**No regressions / verification gates pass**" bullet, which today instructs running every code-phase guardrail and recording results in the Checks table). The remaining judgment checks in step 2 stay.
  - Add a **new numbered step after behavior verification** (after the current step 3) named to run the reviewer guardrail selection, renumbering the subsequent "Write the review" and "Commit and report" steps. The restructure must leave every internal cross-reference accurate, including two that this specific change invalidates: (a) step 3's "not a guardrail" disclaimer ends "…separate from running the guardrails **in step 2**" — guardrails no longer run in step 2, so this must point at the new guardrail step; (b) Commit and report's "Commit the file you wrote **in step 4**…" must name the renumbered "Write the review" step (step 4 becomes step 5 once the guardrail step is inserted before it). This new step states, **once**, four things:
    1. **Selection obligation** — run every gate of the reviewer selection, exactly as each command is written, recording each command and its result in the Checks table; no bypass (no `--no-verify`, no `skip`, no commented-out checks).
    2. **Runs-after bridge** — one sentence stating this step runs **only after** the step-2 review checks and the step-3 behavior verification, so it is unambiguous that the spec's "judgment-based checks" precede the guardrail selection.
    3. **Fail-fast permission** — once the reviewer has at least one rejection finding it **may** (explicitly "may", not "must") reject without running any not-yet-run gate of its selection; each deliberately skipped gate is recorded as **skipped**. The reviewer may also choose to run gates while rejecting.
    4. **Approval guarantee** — the reviewer approves only when every gate in its selection has run and passed in that same iteration; it cannot approve with any selection gate unrun or skipped. State this as per-iteration with no cross-iteration caching (each reviewer instance is fresh and stateless).
  - Update the `## Checks` review template (currently `| Check | Command | Result |`) so a row appears for **every** gate of the reviewer's selection, with Result one of `pass`, `fail`, or `skipped`. A skipped row still shows the gate's literal command (uniform column meaning) but the command is not run. Add one short template comment documenting the Result vocabulary (`pass | fail | skipped`) and the every-gate-gets-a-row rule, so that a forgotten gate is an absent row, a deliberately skipped gate is a present row with `skipped`, and a run gate is a present row with `pass`/`fail` — the three-way distinction. The behavioral rule itself lives in the new step's prose, not in the template comment.
  - In the Guidelines, reconcile the two guardrail bullets: the "**Run the guardrails.**" bullet names the reviewer selection and back-references the new step's fail-fast rule instead of restating it, keeping the empty-selection run-none-and-proceed rule; the two-question outcome-model bullet stays substantively unchanged except its empty-selection sub-case rewords "code-phase guardrails" to the reviewer's role-filtered selection.
  - Word the reviewer's drift-guard blocker prose (the "**A declared guardrail's command cannot execute**" sub-bullet in the outcome model and the matching clause in the "**Stop and report blockers.**" bullet) consistently with the selection phrasing this file lands on — a gate of the reviewer's selection — resolving the design review's non-blocking note about wording consistency. The drift guard's substance is unchanged: it triggers only on an **attempted** gate, and a skipped gate is never attempted, so fail-fast cannot manufacture a false drift blocker.
- **Depends on:** Task 1 (names the reviewer selection — `reviewer`-leveled or unscoped — defined there)
- **Traces to:** Spec R5, R6 / Acceptance criteria 5, 6, 7 / Design decision D4 (design §4.4, §5 D4, §9 item 4)
- **Acceptance:**
  - Step 1's guardrail read item instructs reading the code-phase guardrails leveled `reviewer` or unscoped.
  - Step 2 no longer contains a guardrail-running bullet; the remaining judgment checks are intact.
  - A new numbered step after behavior verification runs the reviewer guardrail selection and states, once, the selection obligation, the runs-after-judgment-checks bridge, the fail-fast permission (worded as "may", with skipped gates recorded), and the per-iteration approval guarantee; subsequent steps are renumbered consistently.
  - On a rejecting iteration the reviewer may reject without running not-yet-run selection gates and records each as `skipped`; on an approving iteration every selection gate has run and passed, and the reviewer cannot approve with any selection gate unrun or skipped.
  - The `## Checks` template gives every selection gate a row with Result in `{pass, fail, skipped}`, a skipped row shows the literal command unrun, and a short template comment documents the Result vocabulary and the every-gate-gets-a-row rule — so a forgotten gate (absent row), a skipped gate (present `skipped` row), and a run gate (`pass`/`fail` row) are three distinct states.
  - The two Guidelines guardrail bullets are reconciled: the "Run the guardrails" bullet names the reviewer selection and back-references the new step; the outcome-model bullet's empty-selection sub-case names the role-filtered selection.
  - The reviewer's drift-guard prose names a gate of the reviewer's selection consistently with the file's selection wording, and its trigger-on-attempt substance is preserved.
  - Every internal cross-reference to the guardrail step and to the renumbered steps is accurate after the restructure — in particular, step 3's disclaimer no longer says guardrails run "in step 2" but points at the new guardrail step, and Commit and report names the renumbered "Write the review" step rather than "step 4".
  - Apart from the renumbering and the cross-reference fixes above, no docs-phase behavior, the verdict/filename logic, or the commit-and-report behavior is changed.

## Out of scope (carried from spec and design — do not touch in any task)

- `agents/doc-writer.md` and `agents/doc-reviewer.md` — docs selection stays purely phase-based; their wording stays literally true. (The residual reading-path asymmetry of a leveled both-phase gate appearing in `.rp.md` with a Level the doc agents never consult is the design review's second non-blocking note; the authoritative inert-in-docs rule lives in `load.md` per Task 1. Any docs-prose consideration belongs to the docs phase, not this plan.)
- The phase runbooks (`reference/autonomous-phases/4 - code.md`) and `autonomous-workflow.md` — guardrails are never in a launch payload; agents self-read `.rp.md`.
- The per-phase completion predicate — it checks file existence/commit, never content; a `skipped` Result or absent row breaks no consumer.
- The committed-only line in `load.md` — it already scopes the whole declaration; the level inherits it.
- The README — a candidate touchpoint deferred to the docs phase.
- The real `.rp.md` — the setup example uses generic placeholders; migration is out of scope.
- Assisted mode — no code-reviewer Checks table exists there, so role scoping and fail-fast have no surface.
- Any new validation path, parser, or schema for the level; cross-iteration state; and the #122 work.
