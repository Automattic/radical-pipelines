# Spec: Orchestrator-scoped guardrails

## Overview

Review-1 left guardrail scoping in the **agents**: each gate-running agent self-read `.rp.md` and computed its own selection — the gates that name it, plus the gates that name no agents — where a gate naming no agents ran for every gate-running agent. The vocabulary of that model (the gate-running-agent enumeration, the name-membership selection rule, and the two behaviour archetypes) lived in `load.md`'s `## Guardrails` section, and each reviewer ran its selection with a fail-fast permission: once it had a rejection finding it could reject without running the not-yet-run gates.

This change moves scoping from the agents to the **orchestrator**. The orchestrator already injects a per-agent conventions block into every spawn prompt; this change adds a **Guardrails** field to that block carrying the gates that name the agent — one per line as a name and its exact command. Each agent runs the gates it is handed and no longer reads `.rp.md` or computes a selection. Three consequences follow:

- **The "names no agents" wildcard is removed.** Every gate names at least one agent. There is no longer any notion of a bare gate, so the review-1 default ("names no agents = every gate-running agent") and the docs-phase leak it caused both disappear.
- **`load.md`'s `## Guardrails` explainer is deleted.** With the orchestrator scoping and each agent file carrying its own run-behaviour, the section's vocabulary, enumeration, selection rule, and archetype prose are redundant. Only the loader-table row and the committed-only line remain.
- **Reviewer gates become judgment-gated.** A reviewer reaches the guardrail step holding a provisional verdict from its judgment checks. If that verdict is reject, it skips the gates entirely (recording each as `skipped`); if approve, it runs every gate and approves only if all pass. Gates gate approval alone. This supersedes the fail-fast-after-a-rejection-finding permission.

Alongside, the change normalizes terminology — "gate" is the unit, "guardrails" the set/convention — and trims redundancy across the agent files. The edits span **seven** files: review-1's six (the two convention files and the four agent files) plus `autonomous-workflow.md`, which now carries the gates into the spawn prompt.

## Requirements

### R1 — The orchestrator passes each agent its gates

The autonomous-workflow spawn step instructs the orchestrator to include a `## Conventions` block at the top of every agent's initial prompt, each field labeled exactly: **Artifact folder** (the absolute path to the active run's folder), **Commit format** (omit when the project defines none), and **Guardrails** — the gates that name this agent, one per line as a name and its exact command, omitted when no gate names it. The conventions-block format is stated inline in the spawn step. This replaces review-1's prose listing of the conventions passed at spawn, which named only the artifact folder and commit format.

### R2 — Agents run the gates handed to them, not a self-computed selection

No gate-running agent self-reads `.rp.md` for guardrails or computes a selection. The writer/reviewer step-1 "read the guardrails that name you" items are removed; each agent runs "the guardrails convention" the orchestrator passed it. The per-agent "selection" vocabulary ("the writer guardrail selection", "the reviewer's selection", etc.) is dropped wherever it appears, and the guardrail step in each agent file is titled "Run the guardrails".

### R3 — Every gate names at least one agent; the wildcard is removed

Setup captures, per gate, the **agents** that run it — one or more of `code-writer`, `code-reviewer`, `doc-writer`, `doc-reviewer` — and **every gate names at least one**. The review-1 "when unset, the gate runs for every gate-running agent" default is removed, and with it the notion of a gate that names no agents. No "names no agents = all agents" rule survives in any file.

### R4 — `load.md` carries no guardrails explainer

The `## Guardrails` section of `load.md` is deleted in full: the exact-command/exit-code definition, the gate-running-agent enumeration, the name-membership selection rule, the empty-selection and forward-declaration rules, and the writer-type/reviewer-type archetype paragraphs. What remains is the loader-table row describing guardrails generically ("the deterministic verification gates — exact commands judged pass/fail by exit code", optional) and the committed-only line in `## Local overrides` ("Guardrails is shared and committed-only; it is never taken from `.rp.local.md`").

### R5 — Reviewer gates are judgment-gated (approval-only)

`code-reviewer.md` and `doc-reviewer.md` run their guardrail step after the judgment checks (the review pass and the behavior verification / accuracy spot-check), holding a provisional verdict:

- **Verdict reject** → skip the guardrail step entirely and go to the write-up; record each gate as `skipped` in the Checks table so the skip reads as deliberate.
- **Verdict approve** → run every gate in the guardrails convention, exactly as written; approve only if every gate runs and passes this iteration. A gate that exits non-zero is itself a rejection finding — the verdict flips to reject and remaining gates may be left unrun (recorded `skipped`). No gate may be bypassed.
- **No guardrails convention** → there are no gates to run and the judgment checks stand (for the doc-reviewer, the accuracy spot-check is then the only evidence).

This replaces review-1's "run the selection, fail-fast once you have a rejection finding, approve only when every selection gate has passed". The `pass | fail | skipped` Checks vocabulary and the absent-vs-skipped distinction are preserved.

### R6 — Writer gates keep their force, re-keyed to the handed-in convention

`code-writer.md` and `doc-writer.md` run "the guardrails convention", exactly as each command is written, every applicable gate passing before commit, no bypass. The three-way result sort is preserved and re-keyed off the convention: **no guardrails convention** → proceed (not a blocker, no warning; for the doc-writer, the accuracy verification is then the only validation); **a declared gate cannot execute** → blocker; **a gate runs and exits non-zero** → work, fix it. The review-1 wording naming "the writer guardrail selection" is replaced by "the guardrails convention".

### R7 — Terminology normalized and redundancy trimmed

"Gate" denotes the unit and "guardrails" the set/convention, consistently across the seven files. The redundant framings review-1 carried are removed: the "two questions — did the command execute? and did the gate pass?" outcome-model bullet in the agent guidelines, the duplicated outcome block in the reviewer guidelines (already covered by the guardrail step and the blocker bullet), and a repeated guardrail-listing line in `code-writer.md`'s step 5. The reviewers' Guidelines "Run the guardrails." bullet is reduced to a back-reference to the judgment-gated step.

### R8 — Setup guardrails capture refactored

`setup.md`'s Guardrails capture is rewritten for clarity and to enforce R3:

- The per-gate capture is **name**, **exact literal command**, and **agents** (one or more names, every gate names at least one). The review-1 "optional agents, asked every gate, defaulting to all when unset" framing is gone.
- A reminder that `code-writer`s and `doc-writer`s run once per task but `code-reviewer`s and `doc-reviewer`s run once per pipeline run, so slow commands should be scoped to the writers' feature/bug work and the complete suites left to the reviewers.
- Command validation is captured as a **two-outcome** model — *it executed ⇒ write it* (any exit code, including non-zero) and *it did not execute ⇒ do not write it* (command-not-found, not-executable, or never-returns; surface to the owner and offer to fix, drop, or keep as an escape hatch) — replacing review-1's three-outcome restatement. Validation remains per-command and independent, matches the agents' environment as closely as the main checkout allows, and accounts for side effects.

## Out of Scope

- The exact `.rp.md` serialization of the agents field — a design-phase decision, as in review-1. This spec fixes the model, not its storage syntax.
- Migration of existing `.rp.md` files — this repo's `.rp.md` declares no guardrails, so removing the wildcard and the explainer strands nothing.
- README prose (`README.md` guardrail wording) — a docs-phase touchpoint, not a spec requirement here.
- `CHANGELOG.md` history and `.changeset/` text — release artifacts; review-1's changeset reconciliation already governs the changelog, and this review adds no second changeset.
- Assisted mode — it carries no guardrail surface and its runs end at phase 3, so orchestrator scoping has no assisted-mode footprint.
- The per-phase completion predicate and the reviewer→orchestrator message protocol — unchanged; the Checks table still reports `pass | fail | skipped` and the verdict still travels out-of-band.

## Acceptance Criteria

1. `autonomous-workflow.md`'s spawn step instructs the orchestrator to include a `## Conventions` block at the top of each agent prompt with the exactly-labeled fields **Artifact folder**, **Commit format** (omit when none), and **Guardrails** (the gates that name this agent, one per line as a name and its exact command, omit when none name it).
2. No gate-running agent file reads guardrails from `.rp.md` or computes a selection; the step-1 guardrail-read items are absent and the "selection" vocabulary appears in none of the four agent files.
3. Each agent file's guardrail step is titled "Run the guardrails" and refers to "the guardrails convention" the orchestrator passed.
4. `setup.md` captures per gate a name, the exact command, and the agents that run it, stating that **every gate names at least one** agent; no "when unset / names no agents = every gate-running agent" default remains in `setup.md` or `load.md`.
5. `load.md` contains no `## Guardrails` section; only the loader-table guardrails row and the committed-only line in `## Local overrides` remain.
6. `code-reviewer.md` and `doc-reviewer.md` run guardrails after the judgment checks; a reject verdict skips all gates (each recorded `skipped`) and proceeds to the write-up; an approve verdict runs every gate and approves only if all pass, with a non-zero gate flipping the verdict to reject; the no-guardrails case leaves the judgment checks (the accuracy spot-check, for the doc-reviewer) as the evidence. The `pass | fail | skipped` Checks vocabulary and absent-vs-skipped distinction are intact.
7. `code-writer.md` and `doc-writer.md` run the guardrails convention with every applicable gate passing before commit, no bypass, and the three-way sort (no convention ⇒ proceed; cannot execute ⇒ blocker; exits non-zero ⇒ work) re-keyed off the convention.
8. The "two questions" outcome-model bullet is gone from the writer and reviewer Guidelines; the reviewer Guidelines carry no duplicated outcome block; `code-writer.md`'s step 5 carries no repeated guardrail-listing line.
9. Terminology is consistent — "gate" for the unit, "guardrails" for the set/convention — across the seven files.
10. `setup.md`'s command validation is a two-outcome model (executed ⇒ write; did-not-execute ⇒ do not write, surface and offer fix/drop/escape-hatch), with per-command independence, the environment parity floor, and the side-effects caution retained.
11. The convention, workflow, and agent edits span exactly seven files — `reference/autonomous-workflow.md`, `reference/conventions/load.md`, `reference/conventions/setup.md`, `agents/code-writer.md`, `agents/code-reviewer.md`, `agents/doc-writer.md`, `agents/doc-reviewer.md` — review-1's six plus `autonomous-workflow.md`.
