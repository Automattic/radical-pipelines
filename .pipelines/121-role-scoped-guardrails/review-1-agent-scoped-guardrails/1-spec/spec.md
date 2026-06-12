# Spec: Agent-scoped guardrails

## Overview

Today a guardrail carries two scoping dimensions: a **phase** (`code`/`docs`) and, within the code phase, an optional **level** (`writer`/`reviewer`). The two dimensions decide which of the four gate-running agents — `code-writer`, `code-reviewer`, `doc-writer`, `doc-reviewer` — runs the gate. Phase splits code from docs; level splits the two code roles. The model is closed to exactly these four agents and cannot express, for example, a gate scoped to a future dedicated end-to-end-test agent.

This change replaces both dimensions with a single **agents** dimension: a guardrail names the agents that run it. Any gate-running agent — current or future, code or docs — can be given its own gate selection by name. `phase` and `level` are deleted outright. A gate naming no agents runs for every gate-running agent; a gate naming only agents not present in a run is inert until such an agent exists.

This is a more flexible successor to the phase+level model, not an additive field. It deletes both prior dimensions and, unlike the base run, deliberately touches all six convention and agent files — including both doc agents, which can no longer be identified by phase and must instead be named.

## Requirements

### R1 — Single agents dimension

A guardrail declaration carries one optional field: the **agents** that run it — one or more exact agent names. `phase` and `level` are deleted; no compatibility sugar is kept for either. Guardrails remain shared and committed-only, never taken from `.rp.local.md`, so the agents field is never overridable per-developer. The exact `.rp.md` serialization of the field is a design-phase decision, not fixed here.

### R2 — Gate-running agent set named explicitly

The guardrail definition names the set of gate-running agents: `code-writer`, `code-reviewer`, `doc-writer`, `doc-reviewer`. No existing roster abstraction names this set, so the definition enumerates it directly. The enumeration is load-bearing: adding a future gate-running agent updates it.

### R3 — Selection rule is agent-name membership

An agent's guardrail selection is the gates that name it, plus the gates that name no agents. Phase plays no part in selection. A gate naming no agents applies to every gate-running agent. Each gate-running agent self-reads `.rp.md` and knows its own canonical name, so self-selection needs no new plumbing. An empty selection after this filter means run none and proceed — the existing empty-selection rule, never a blocker and never a warning.

### R4 — Unnamed gates run for every agent

A gate that names no agents runs for every gate-running agent, doc agents included. This is a real behavior change from the base, where phase bounded a level-less code gate to the two code roles: with phase gone, a bare gate now also runs in the docs phase. The consequence is mitigated by setup guidance (R8), not by a phase boundary; a gate meant for the code roles only must name `code-writer` and `code-reviewer` explicitly.

### R5 — Unknown names are forward declarations

A gate naming only agents that are not in the gate-running set is selected by no current agent and is inert until such an agent exists. This is a legitimate forward declaration (e.g. naming a not-yet-existing end-to-end-test agent), not malformed input. No validation, error, or warning path is introduced; silent no-match falls out of the membership test alone.

### R6 — Behavior archetypes stated once

The skill states, in one place, the two run-behaviors and the rule mapping any gate-running agent to one of them:

- **Writer-type** agents produce commits: they run every gate in their selection, exactly as each command is written, and all must pass before each commit.
- **Reviewer-type** agents issue verdicts: they run their judgment-based checks first, may fail-fast (reject without running not-yet-run gates of their selection, recording each as skipped), and approve only when every gate in their selection has run and passed in that same iteration. Each reviewer instance is fresh and stateless — no cross-iteration caching or memory.

A future agent maps by whether it commits work (writer-type) or reviews it (reviewer-type). Each gate-running agent file carries behavior consistent with its archetype.

### R7 — Doc-reviewer gains the reviewer archetype

`agents/doc-reviewer.md` is generalized to the reviewer archetype, mirroring the base run's `code-reviewer` restructure: guardrails are promoted out of the mid-review bullet into their own step after the judgment checks (the review pass and the accuracy spot-check), with fail-fast permission, skipped recording, the approving-iteration guarantee, a stateless line, and the `pass`/`fail`/`skipped` Checks-table vocabulary including the absent-vs-skipped distinction.

`agents/doc-writer.md` keeps writer behavior, with its gate selection re-keyed from "the docs-phase guardrails" to the agent-name selection rule.

`agents/code-writer.md` and `agents/code-reviewer.md` keep their writer/reviewer behavior, with their selections re-keyed from level to agent name.

### R8 — Setup captures agents and surfaces the default

During guardrail capture, setup captures per gate: a name, the exact literal command, and the optional **agents** (one or more names) — asked for every gate, since no phase remains to condition the question on. When the agents field is unset, the gate applies to every gate-running agent, doc agents included; setup surfaces this consequence so the owner names the agents of code-specific or expensive gates deliberately. The owner's decision criterion re-anchors to names: naming only `code-reviewer` runs an expensive suite on the reviewer's side instead of on every writer commit. The example table reshapes to `Name | Command | Agents`, with code-scoped rows naming their agents explicitly. The command-execution validation flow is untouched.

### R9 — Pending changeset reconciled in place

`.changeset/role-scoped-guardrails.md` is the base run's unreleased changeset describing the now-superseded `level` feature. The docs phase rewords it in place (renaming the slug as appropriate) to describe agent scoping; no second changeset is stacked, so the merged changelog never announces a `level` field that shipped in no release. This spec names the obligation; the changeset text is the docs phase's deliverable.

## Out of Scope

- The exact `.rp.md` serialization of the agents field — a design-phase decision, as with the existing per-gate fields. This spec fixes the field, its multiplicity, and its absent-means-all semantics, not its storage syntax.
- Migration or rewriting of existing `.rp.md` files — none declare guardrails (this repo's own `.rp.md` has no Guardrails section), so deleting `phase` and `level` needs no migration.
- Cross-iteration gate-result caching — each reviewer-type instance remains fresh and stateless.
- Assisted mode — it carries no guardrail surface and its runs end at phase 3, so the agent-scoping change has no assisted-mode footprint.
- README prose (`README.md:147`, phase-altitude guardrail wording) — a docs-phase touchpoint named here for the doc-plan, not a spec requirement.
- `CHANGELOG.md` history — an immutable released entry, not edited.

## Acceptance Criteria

1. The guardrail definition documents a single optional **agents** field holding one or more exact agent names, with `phase` and `level` removed and no compatibility sugar for either. The committed-only nature of guardrails (never from `.rp.local.md`) is preserved.
2. The guardrail definition names the gate-running agent set explicitly: `code-writer`, `code-reviewer`, `doc-writer`, `doc-reviewer`.
3. The selection rule states that an agent selects the gates that name it plus the gates that name no agents, with phase playing no part; the empty-selection rule (run none, proceed) is preserved.
4. A gate naming no agents is selected by every gate-running agent, doc agents included.
5. A gate naming only agents not in the gate-running set is selected by no current agent and triggers no error, blocker, or warning.
6. The skill states the two behavior archetypes once — writer-type (every selected gate passes before each commit) and reviewer-type (judgment checks first, fail-fast with skipped recording, approving-iteration guarantee, stateless) — with the rule mapping a gate-running agent to one of them by whether it commits or reviews.
7. `agents/code-writer.md` runs its agent-name selection with the existing "run every one, exactly as written, all must pass before each commit" obligations; its selection is keyed to agent name, not level.
8. `agents/code-reviewer.md` runs the judgment-based checks before its agent-name selection, may fail-fast once it has a rejection finding, records each skipped gate as skipped, and approves only when every gate in its selection has run and passed that iteration; its selection is keyed to agent name, not level.
9. `agents/doc-writer.md` runs its agent-name selection with writer obligations (all pass before commit), re-keyed from "the docs-phase guardrails" to agent name.
10. `agents/doc-reviewer.md` carries the reviewer archetype: guardrails in their own step after the judgment checks, fail-fast permission, skipped recording, approving-iteration guarantee, stateless line, and the `pass`/`fail`/`skipped` Checks vocabulary with the absent-vs-skipped distinction.
11. `reference/conventions/setup.md` captures the optional agents field (one or more names) per gate, asked for every gate, defaulting to every gate-running agent when unset, with that default surfaced to the owner; the example table is `Name | Command | Agents` with code-scoped rows naming their agents; the command-execution validation flow is unchanged.
12. The spec names the obligation to reword `.changeset/role-scoped-guardrails.md` in place in the docs phase, with no second changeset stacked.
13. The convention and agent edits span exactly six files — `reference/conventions/load.md`, `reference/conventions/setup.md`, `agents/code-writer.md`, `agents/code-reviewer.md`, `agents/doc-writer.md`, `agents/doc-reviewer.md` — deliberately reversing the base spec's docs-agent confinement claim. (Release artifacts such as the changeset and any docs-phase output are outside this claim.)
