# Design Doc — Orchestrator-scoped guardrails

_Pipeline: `121-role-scoped-guardrails`, review run `review-2-orchestrator-scoped-guardrails`. Input: the approved, binding `1-spec/spec.md`. This is a **review run** layered on top of `review-1-agent-scoped-guardrails`; that run's end state — the worktree at the tip of review-1 — is this run's baseline, and the design here describes the end state the review's three assisted commits (`cac2d25`, `004f797`, `a0e3fd9`) produced. The artifacts are backfilled: they document shipped work rather than precede it, so this document is grounded against the **current worktree HEAD**, which already carries the change._

## 1. Summary

Review-1 placed guardrail scoping in the **agents**. Each gate-running agent self-read `.rp.md`, computed its selection (the gates that name it plus the gates that name no agents), and ran it; a gate naming no agents ran for every gate-running agent. `load.md`'s `## Guardrails` section defined the supporting model — the gate-running-agent enumeration, the name-membership selection rule, and the two run-behaviour archetypes — and each reviewer ran its selection with a fail-fast permission (reject without running the not-yet-run gates once it had a rejection finding).

This review moves scoping to the **orchestrator**. The orchestrator already injects a per-agent conventions block at spawn; the change adds a **Guardrails** field to it carrying the gates that name the agent, one per line as a name and its exact command. The agent runs what it is handed — it no longer reads `.rp.md` or computes a selection. Three things fall out of that move:

- **No more wildcard.** Every gate names at least one agent, so there is no bare gate and no "names no agents = every agent" rule — and the review-1 docs-phase leak that rule caused is gone with it.
- **No more explainer.** With the orchestrator scoping and each agent file already carrying its own run-behaviour, `load.md`'s `## Guardrails` section is redundant and is deleted; only the loader-table row and the committed-only line remain.
- **Reviewer gates gate approval only.** A reviewer reaches the guardrail step holding a provisional verdict; a reject skips the gates (each recorded `skipped`), an approve runs them all and approves only if all pass. This supersedes fail-fast.

The change is **prose and instruction text only** — no executable code, no parser. The "design" is the exact shape and wording of the prose to delete or rewrite across **seven** files: review-1's six (the two convention files and the four agent files) plus `autonomous-workflow.md`, which now carries the gates into the spawn prompt. Terminology is normalized ("gate" = unit, "guardrails" = set) and review-1's redundant framings are trimmed.

## 2. Scope surface

The design touches **exactly seven files** (spec AC11) — review-1's six plus `autonomous-workflow.md`. The extra file is the structural heart of the change: scoping now happens where the orchestrator spawns agents, so the spawn step is where the gates enter the system.

| # | File | What changes |
| - | ---- | ------------ |
| 1 | `skills/radical-pipelines/reference/autonomous-workflow.md` | Spawn step: the conventions passed to each agent become a labeled `## Conventions` block (Artifact folder, Commit format, **Guardrails**), format stated inline |
| 2 | `skills/radical-pipelines/reference/conventions/load.md` | `## Guardrails` explainer section **deleted**; loader-table row and committed-only line kept |
| 3 | `skills/radical-pipelines/reference/conventions/setup.md` | Guardrails capture rewritten: agents required per gate; per-run scoping reminder; two-outcome validation; an incidental dedent in the fork-remote step |
| 4 | `agents/code-writer.md` | Step-1 guardrail-read removed; step 5 re-keyed to "the guardrails convention"; a repeated listing line dropped; blocker bullet de-selection-ized |
| 5 | `agents/code-reviewer.md` | Step-1 guardrail-read removed; step 4 rewritten judgment-gated; guidelines outcome block trimmed; "selection" vocabulary removed |
| 6 | `agents/doc-writer.md` | Step-1 guardrail-read removed; step 3/step 5 re-keyed to "the guardrails convention"; "selection" vocabulary removed |
| 7 | `agents/doc-reviewer.md` | Step-1 guardrail-read removed; step 4 rewritten judgment-gated; guidelines outcome block trimmed; "selection" vocabulary removed |

Out-of-scope touchpoints are enumerated in §7.

## 3. Grounded file state (verified against the current worktree HEAD)

All citations are to the live files on `worktree-121-role-scoped-guardrails`, which already carry the three review-2 commits. `git diff HEAD~3..HEAD` is the realized change, against the tip of review-1 (`HEAD~3` = `fe7d199`, review-1's `docs-review-approved` commit).

### 3.1 `autonomous-workflow.md`

The spawn step's "Important" list (`:60-68`) now reads (`:63-66`):

> - Each time you spawn an agent, include a `## Conventions` block at the top of its initial prompt, each field labeled exactly as shown:
>   - **Artifact folder:** the absolute path to the active run's folder (e.g. `<artifacts-folder>/base/`).
>   - **Commit format:** the commit message format the agent must use. Omit when the project defines none.
>   - **Guardrails:** the gates that name this agent — one per line as a name and its exact command. Omit when no gate names it.

The review-1 baseline carried a two-item prose list (artifact folder + commit format, no guardrails, no block format). The team-spawning, model-resolution, and self-commit bullets (`:62`, `:67`, `:68`) are unchanged.

### 3.2 `load.md`

There is **no `## Guardrails` section**. The Conventions table's Guardrails row (`:22`) reads "The deterministic verification gates — exact commands judged pass/fail by exit code | No". The only other guardrails mention is the committed-only line in `## Local overrides` (`:38`): "Guardrails is shared and committed-only; it is never taken from `.rp.local.md`." The review-1 baseline had a multi-paragraph `## Guardrails` section (definition, gate-running-agent enumeration, name-membership selection rule, writer/reviewer archetypes) between the table and `## Missing conventions`; the whole section is gone.

### 3.3 `setup.md`

`### Guardrails` (`:171-198`) motivates the gates, then captures per gate (`:181-183`): a **name**, the **exact literal command**, and "The **agents** that run the gate — one or more of `code-writer`, `code-reviewer`, `doc-writer`, `doc-reviewer`. **Every gate names at least one.**" A per-run scoping reminder follows (`:185`: writers run once per task, reviewers once per pipeline run — scope writers' gates to the feature/bug, leave the slow suites to reviewers). Validation is "validate each command as you capture it" (`:187`) sorted into **two outcomes** (`:191-192`: executed ⇒ write, any exit code; did-not-execute ⇒ do not write, surface and offer fix/drop/escape-hatch), then three "Also" bullets (`:196-198`: per-command independence, environment parity floor, side effects). The review-1 baseline had an optional-agents-defaulting-to-all bullet, an illustrative `Name | Command | Agents` table, a "None is a complete, valid answer" line, and a three-outcome validation restatement; the capture is now leaner. Separately, the fork-remote "Wait for confirmation, then re-run `git remote -v`" line (`:146`) was dedented one level — an incidental formatting fix.

### 3.4 `code-writer.md` (writer)

Step 1 (`:10-13`) has two items — the task block and the optional review file; **no guardrail-read item**. Step 5 "Run the guardrails" (`:43-53`) opens "Run every gate in the guardrails convention, exactly as its command is written. Each is mandatory." then the all-pass-before-commit and no-bypass bullets and the three-way "Sort each gate result" list (`:49-52`: no convention ⇒ proceed; cannot execute ⇒ blocker; exits non-zero ⇒ work). The Guidelines blocker bullet (`:71`) says "a gate cannot execute" (not "a gate of your selection"). The review-1 baseline titled the step "Run the writer guardrail selection", read the selection in step 1, and carried a redundant "Run **every** gate … Do not invent commands. Do not omit any." line above the per-result bullets.

### 3.5 `code-reviewer.md` (reviewer)

Step 1 (`:12-18`) ends at item 5, "Inspect the diff for the batch" — **no guardrail-read item**. Step 4 "Run the guardrails" (`:36-44`) is judgment-gated: "By the time you reach this step you have a provisional verdict from steps 2–3." (`:38`), then **reject ⇒ skip entirely, record each gate `skipped`** (`:40`), **approve ⇒ run every gate, all must pass, a non-zero gate flips to reject and remaining gates may be left unrun** (`:42`), and **no guardrails convention ⇒ judgment stands** (`:44`). The `## Checks` comment block (`:70-73`) keeps `pass | fail | skipped` and the absent-vs-skipped distinction. The Guidelines "Run the guardrails." bullet (`:110`) is a back-reference: "When your step-2/3 judgment leaves no rejection finding, run every gate per step 4 and approve only if all pass. If you already reject on judgment, skip them." The review-1 baseline read the selection in step 1, titled step 4 "Run the reviewer guardrail selection" with a fail-fast/approving-iteration framing, and carried a standalone two-question outcome-model bullet plus a longer blocker bullet in the Guidelines.

### 3.6 `doc-writer.md` (writer)

Step 1 (`:10-18`) reads the task block, spec, design doc, shipped code, existing docs, the doc convention, and the optional review file — **no guardrail-read item**. Step 3 accuracy verification (`:35`) says "If a gate covers doc tests, exercise them; otherwise trace by hand." Step 4 "Run the guardrails" (`:38-48`) mirrors `code-writer` step 5, with the doc-specific no-convention sub-case (`:45`: "the step-3 accuracy verification is your only validation; proceed"). The Guidelines blocker bullet (`:67`) says "a gate cannot execute". The review-1 baseline keyed these to "the docs-phase guardrails … name `doc-writer` or name no agents" / "the writer guardrail selection".

### 3.7 `doc-reviewer.md` (reviewer)

Step 1 (`:12-20`) ends at item 7, "Inspect the doc diff for the batch" — **no guardrail-read item**. Step 4 "Run the guardrails" (`:38-46`) is judgment-gated exactly as `code-reviewer` step 4, with the doc-specific no-convention sub-case (`:46`: "the step-3 accuracy spot-check is your only evidence"). The `## Checks` comment block (`:72-75`) keeps `pass | fail | skipped` and the absent-vs-skipped distinction. The Guidelines "Run the guardrails." bullet (`:111`) is the same back-reference form as `code-reviewer:110`. The review-1 baseline read the selection in step 1, titled step 4 "Run the reviewer guardrail selection" with fail-fast framing, and carried a two-question outcome-model bullet plus a longer blocker bullet.

## 4. The model the prose encodes

Every wording decision serves one model; the seven files must stay consistent because they share it.

### 4.1 The orchestrator scopes; the agent runs what it is handed

Scoping is a single orchestrator act. At spawn the orchestrator already passes a per-agent conventions block; it now also resolves, for that agent, the gates whose agents field names it, and lists them under **Guardrails** — name and exact command, one per line. The agent's job collapses to "run the gates in front of you." This removes the only reason an agent had to read `.rp.md`'s guardrails or know the gate-running-agent set: both were inputs to a selection the agent no longer performs.

The block is **prose with exact labels**, not a parser input — consistent with how every other convention is passed. "Omit when no gate names it" is the load-rule successor to review-1's empty selection: an agent with no gates simply receives no Guardrails field, and each agent file already handles "no guardrails convention" as run-none-and-proceed.

### 4.2 Every gate names at least one agent

With scoping centralized, a gate must name its agents for the orchestrator to route it — there is no fallback that fans an unnamed gate out to everyone. So setup requires **every gate names at least one** agent (§3.3). This deletes review-1's wildcard and, with it, the bare-gate-runs-in-docs leak that review-1 had to mitigate with setup guidance: there is no bare gate to leak. The gate-running-agent set (`code-writer`, `code-reviewer`, `doc-writer`, `doc-reviewer`) now lives only where it is used to author gates — `setup.md`'s capture bullet — not as a load-bearing enumeration in `load.md`.

### 4.3 `load.md` returns to a pure loader

Because the orchestrator scopes and each agent file carries its own run-behaviour, nothing reads `load.md`'s `## Guardrails` model anymore. Keeping it would duplicate the agent files (run-behaviour) and `setup.md` (the agent set, the capture). The section is deleted; `load.md` keeps only the one-line table description (guardrails are an optional convention) and the committed-only line (guardrails are shared, never from `.rp.local.md`) — the two facts a loader genuinely owns. This reverses review-1's altitude rise, where `load.md` ¶4 had taken on "what an agent does with what it loaded."

### 4.4 Writer behaviour: run the convention, all pass before commit

A writer-type agent (`code-writer`, `doc-writer`) runs every gate in the guardrails convention it was handed, exactly as each command is written, all passing before commit, no bypass. The three-way result sort is unchanged in force and re-keyed off "the convention" rather than "the selection": **no convention** ⇒ proceed (no blocker, no warning; for the doc-writer the accuracy verification is then the only validation); **a declared gate cannot execute** ⇒ blocker (the drift guard); **a gate exits non-zero** ⇒ work, fix it. Each agent file states this for itself; there is no shared archetype prose to point back to.

### 4.5 Reviewer behaviour: judgment first, gates gate approval

A reviewer-type agent (`code-reviewer`, `doc-reviewer`) runs its judgment checks first — the review pass (step 2) and the behavior verification / accuracy spot-check (step 3) — and reaches step 4 holding a provisional verdict. The verdict drives the gates, not the other way around:

- **Reject** ⇒ the batch returns to the writers regardless, so the gates would tell the reviewer nothing; skip them entirely and record each as `skipped` (deliberate, not forgotten).
- **Approve** ⇒ run every gate; approve only if every gate runs and passes this iteration; a non-zero gate is itself a rejection finding (verdict flips to reject, remaining gates may be left unrun and recorded `skipped`); never bypass.
- **No convention** ⇒ no gates; the judgment checks stand (the accuracy spot-check is the doc-reviewer's only evidence).

This is strictly cleaner than review-1's fail-fast permission: fail-fast let a reviewer stop running gates *once it had a rejection finding*, but still framed gates as something run on every iteration; judgment-gating states the simpler invariant — **gates run only to confirm an approval** — and the expensive gates therefore execute at most once, on the approving iteration. Each reviewer instance is fresh and stateless, so "this iteration" is the whole horizon. The `pass | fail | skipped` Checks vocabulary and the absent-vs-skipped distinction are retained because they still carry the deliberate-skip signal.

### 4.6 Terminology and redundancy

"Gate" is the unit; "guardrails" is the set/convention. With the orchestrator scoping and `load.md` silent, the agent files no longer need the "two questions — did the command execute? and did the gate pass?" scaffolding that review-1 used to derive the result sort: each file states its sort directly. The reviewers' Guidelines lose the duplicated outcome block (the step-4 prose and the blocker bullet already carry it), and `code-writer`'s step 5 loses a line that restated "run every gate, don't invent, don't omit" already implied by "run every gate … exactly as its command is written. Each is mandatory."

## 5. Design decisions

Six decisions (D1–D6), each citing the acceptance criteria it satisfies.

### D1 — `autonomous-workflow.md` carries the gates into the spawn prompt

_Satisfies AC1._

The spawn step's conventions list becomes a labeled `## Conventions` block with the format stated inline, gaining the **Guardrails** field (the gates that name this agent, one per line as name + exact command, omitted when none name it) alongside Artifact folder and Commit format (the latter omitted when the project defines none). This is the single structural change: scoping is now an orchestrator act performed here, so the gates must be resolved and listed at spawn. Stating the block format inline (rather than referencing it elsewhere) keeps the spawn step self-contained.

### D2 — `load.md` deletes the explainer

_Satisfies AC5._

The `## Guardrails` section is removed in full. Nothing consumes it after D1 and D3–D6: the orchestrator scopes (D1), setup authors gates and owns the agent-set enumeration (D3), and each agent file carries its own run-behaviour (D4–D6). The loader-table row and the committed-only line stay — they are the loader-level facts (guardrails are an optional, committed-only convention) that survive independent of the deleted model.

### D3 — `setup.md` requires agents per gate and leans out the validation prose

_Satisfies AC4, AC10._

The capture is name, exact command, and agents — **every gate names at least one** (AC4), deleting the review-1 unset-defaults-to-all bullet and the wildcard with it. A per-run scoping reminder replaces the old "name only `code-reviewer`" decision-criterion prose, framed in run cadence (writers per task, reviewers per run). Validation collapses from three outcomes to **two** (AC10): executed ⇒ write (any exit code), did-not-execute ⇒ do not write (surface and offer fix/drop/escape-hatch), with per-command independence, the parity floor, and the side-effects caution kept as follow-on bullets. The illustrative table and the "None is a valid answer" line are dropped as redundant with the capture bullets and the load-table's "optional" marking. The incidental fork-remote dedent (`:146`) rides along in the same clarity pass.

### D4 — `code-writer.md` and `doc-writer.md` run the handed-in convention

_Satisfies AC2, AC3, AC7 (writers), AC8 (code-writer line), AC9._

Both writers lose their step-1 guardrail-read item — they no longer self-select (AC2). The guardrail step is titled "Run the guardrails" (AC3) and runs "the guardrails convention", every applicable gate passing before commit, no bypass, with the three-way sort re-keyed off the convention (AC7). `code-writer` step 5 drops the repeated "run every gate, don't invent, don't omit" line (AC8); `doc-writer` re-keys its step-3 doc-tests clause and step-4 no-convention sub-case off "a gate" / "the guardrails convention" rather than "the docs-phase guardrails" (AC9). The blocker bullets say "a gate cannot execute", dropping "of your selection".

### D5 — `code-reviewer.md` and `doc-reviewer.md` are judgment-gated

_Satisfies AC2, AC3, AC6, AC8 (reviewer guidelines)._

Both reviewers lose their step-1 guardrail-read item (AC2). Step 4 "Run the guardrails" (AC3) is rewritten to the verdict-driven shape of §4.5 (AC6): a provisional verdict from steps 2–3, reject ⇒ skip all (record `skipped`), approve ⇒ run all and approve only if all pass with a non-zero gate flipping to reject, no-convention ⇒ judgment stands. The `pass | fail | skipped` Checks vocabulary and absent-vs-skipped distinction are preserved. The Guidelines "Run the guardrails." bullet becomes a back-reference to step 4 and the standalone two-question outcome-model bullet plus the duplicated outcome sub-bullets are removed (AC8); the blocker bullet keeps broken-input framing with "a gate cannot execute".

### D6 — Terminology normalized across the seven files

_Satisfies AC9._

"Gate" is the unit and "guardrails" the set/convention everywhere; "guardrail selection" / "the writer's selection" / "the reviewer's selection" appear in none of the agent files. This is the connective tissue of D1–D5 rather than a separate edit site.

## 6. Confinement to seven files (the AC11 guarantee)

The seven edited files are in §2; everything below stays untouched, and each non-edit is justified.

| Untouched | Why it stays correct |
| --------- | -------------------- |
| `reference/autonomous-phases/4 - code.md`, `5 - docs.md` | The phase runbooks dispatch writers and reviewers; the gates ride in the spawn block authored by `autonomous-workflow.md` (D1), so the runbooks need no guardrail prose. |
| `reference/assisted-workflow.md` | Assisted runs end at phase 3 and spawn no gate-running agents — no guardrail surface (§7). |
| Per-phase completion predicate (`pipeline-versioning.md`) | Checks file existence, never content; a `skipped` row or an approval written after a clean gate run breaks no consumer. The verdict still travels out-of-band in the reviewer's message. |
| `load.md:38` committed-only line | Scopes the whole declaration; survives the explainer deletion as a loader-level fact. |
| Real `.rp.md` | Declares no guardrails; removing the wildcard and the explainer strands nothing. |
| README, `CHANGELOG.md`, `.changeset/` | Docs-phase / release artifacts; review-1's changeset reconciliation governs the changelog and this review stacks no second changeset (§7). |

Assisted mode has no surface here: it carries no guardrail surface and its runs end at phase 3.

## 7. Acceptance-criteria mapping

| AC | Criterion | Decision |
| -- | --------- | -------- |
| 1 | `## Conventions` spawn block with Artifact folder / Commit format (omit when none) / Guardrails (gates naming the agent, name + command, omit when none) | D1 |
| 2 | No agent reads guardrails from `.rp.md` or computes a selection; "selection" vocabulary absent | D4, D5 |
| 3 | Each agent's guardrail step titled "Run the guardrails", referring to the handed-in convention | D4, D5 |
| 4 | Setup captures name + command + agents, every gate names at least one; no unset/names-no-agents default in `setup.md` or `load.md` | D3 (and D2) |
| 5 | `load.md` has no `## Guardrails` section; only the table row and committed-only line remain | D2 |
| 6 | Reviewers judgment-gated: reject ⇒ skip all (`skipped`); approve ⇒ run all, all pass, non-zero flips to reject; no-convention ⇒ judgment stands; Checks vocab + absent-vs-skipped intact | D5 |
| 7 | Writers run the convention, all pass before commit, no bypass, three-way sort re-keyed | D4 |
| 8 | Two-question outcome bullet gone from writer + reviewer guidelines; no duplicated reviewer outcome block; no repeated `code-writer` step-5 line | D5 (reviewers), D4 (`code-writer`) |
| 9 | "Gate"/"guardrails" terminology consistent across the seven files | D6 |
| 10 | `setup.md` validation is two-outcome with independence, parity floor, side-effects caution | D3 |
| 11 | Edits span exactly the seven named files (review-1's six plus `autonomous-workflow.md`) | §2, §6 |

## 8. Out of scope (do not touch)

Carried from the spec's Out of Scope, restated as a guard against scope creep:

1. The exact `.rp.md` serialization of the agents field — illustrated by `setup.md`'s capture prose, not mandated; no parser or schema.
2. Migration of existing `.rp.md` files — this repo's `.rp.md` declares no guardrails.
3. README prose (guardrail wording) — a docs-phase touchpoint, not a design- or code-phase edit here.
4. `CHANGELOG.md` history and `.changeset/` text — release artifacts; review-1's changeset reconciliation owns the changelog and this review adds no second changeset.
5. Assisted mode — no guardrail surface; its runs end at phase 3.
6. The per-phase completion predicate and the reviewer→orchestrator message protocol — unchanged.

## 9. Deliverable map (per file)

1. **`skills/radical-pipelines/reference/autonomous-workflow.md`** (D1): spawn "Important" list — conventions become a labeled `## Conventions` block (Artifact folder; Commit format, omit when none; Guardrails, the gates naming the agent as name + command, omit when none), format inline.
2. **`skills/radical-pipelines/reference/conventions/load.md`** (D2): delete the `## Guardrails` section; keep the table row (`:22`) and the committed-only line (`:38`).
3. **`skills/radical-pipelines/reference/conventions/setup.md`** (D3): capture name + command + agents (every gate names ≥1); per-run scoping reminder; two-outcome validation with independence / parity floor / side-effects bullets; drop the illustrative table and the "None is valid" line; incidental fork-remote dedent.
4. **`agents/code-writer.md`** (D4): remove the step-1 guardrail-read; step 5 "Run the guardrails" off the convention; drop the repeated listing line; blocker bullet "a gate cannot execute".
5. **`agents/code-reviewer.md`** (D5): remove the step-1 guardrail-read; rewrite step 4 judgment-gated; trim the Guidelines outcome block to a back-reference; remove "selection" vocabulary.
6. **`agents/doc-writer.md`** (D4): remove the step-1 guardrail-read; re-key step 3 (doc-tests clause) and step 4 off "the guardrails convention"; keep the doc-specific no-convention sub-case; blocker bullet "a gate cannot execute".
7. **`agents/doc-reviewer.md`** (D5): remove the step-1 guardrail-read; rewrite step 4 judgment-gated with the doc-specific no-convention sub-case; trim the Guidelines outcome block to a back-reference; remove "selection" vocabulary.
