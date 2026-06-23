# Spec: Default output rules for generated code

## Overview

Every pipeline run produces output that lands in a host project: source code, tests, and inline documentation (Code phase); external documentation such as READMEs, guides, changelogs, and examples (Docs phase); and the commit messages that carry that product. Two desirable properties of that output were historically hand-passed to each pipeline by the owner, and one of them leaked in practice — generated code carried a comment narrating the pipeline process (a plan task and the pipeline itself).

This feature promotes both properties into the tool itself, applied **by default** with no per-run owner action:

1. **Unchanged comments and prose are left untouched.** A change must not reword, reflow, or otherwise tidy comments — or unrelated documentation prose — that belong to content it did not modify.
2. **The host-project product is transparent to the pipeline.** The shipped product must not reference the pipeline that produced it, its phases, its artifacts, or its agents, anywhere in its content. The output must read as if written by hand.

Rule 1 is **always-on and unconditional**. Rule 2 is **on by default but per-project overridable**: a project may, in its host convention, independently disable Rule 2's content-transparency reach or its commit-provenance clause. Every rule that is in force is **enforced** — output that violates it is detected and blocks the offending phase from completing, rather than being offered as advice the agents may ignore.

This spec defines **what** the rules require, **how** a project may override them, and how compliance is measured. **Where** the rules and switches live in the agents' prompts and host convention, and **how** violations are detected and blocked, are decisions left to the design phase.

Throughout this spec, "host-project product" means the source code, tests, inline and external documentation, and the commit messages that the run ships into the host repository — as distinct from the pipeline's own artifacts (specs, design docs, plans, reviews, and other files the pipeline writes about its own process).

## Requirements

### R1 — Two default output rules, applied automatically by default

The tool applies both rules below to the output of every pipeline run with no per-run action from the owner; the owner never restates them per run. Rule 1 is always-on and unconditional. Rule 2 — both its content reach and its commit-provenance clause — is on by default but per-project overridable per R9.

### R2 — Rule 1: leave unchanged comments and prose untouched

A generated change must not reword, reflow, reformat, or otherwise tidy:

- comments attached to code the change did not modify, or
- prose sections of a documentation file the change edits but did not otherwise touch.

The rule constrains gratuitous edits to content the change did not modify. It does **not** constrain comments or prose belonging to the content being changed, and it imposes no duty to preserve a still-valid comment beside changed code. Commit messages carry no pre-existing comments or prose, so Rule 1 does not apply to them. Rule 1 has no override.

### R3 — Rule 2: the host-project product is transparent to the pipeline

The shipped product must not reference this run's pipeline, its phases, its artifacts, its agents, or narrate the agent's own process — **anywhere** in its content. Forbidden content includes, but is not limited to:

- Pointers to pipeline artifacts — e.g. `spec.md`, `design-doc.md`, `code-plan.md`, `docs-plan.md`, or any path under the pipeline's artifacts folder.
- References to the tool's phases or plan tasks — e.g. "the spec," "the design doc," "implements task 4.2 of the code plan," "in the Docs phase."
- Narration of the agent's own reasoning or process — e.g. a comment explaining a change in terms of the task the agent was given.
- Any statement that the code, tests, or docs were produced by the pipeline or its agents.

This reach is total: it covers code comments, identifiers and names (variables, functions, types), string literals, log and error messages, inline API documentation, and external documentation — not only the commit message. The product must read as if written by hand with no knowledge of the pipeline.

Rule 2's reach is split into two independently overridable parts (see R9): its **content transparency** (this requirement and R5, plus the no-pipeline-narrative half of R6) and its **commit-provenance clause** (the no-provenance-tag half of R6).

### R4 — Rule 2 targets this run's process, not a vocabulary

Rule 2 forbids references to **this run's** pipeline process and artifacts only. It must not flag a host project's legitimate source content, even when that content is itself about specs, plans, design docs, or Radical Pipelines. In particular, the Radical Pipelines repository can be a host project — it builds itself — and its product legitimately contains those terms; this must remain possible.

### R5 — Surfaces covered

Both rules apply to every part of the generated product that lands in the host repository:

- Source code, including tests, identifiers/names, string literals, and log/error messages.
- Code comments and inline API documentation (Code phase).
- External documentation produced by the Docs phase (READMEs, guides, changelogs, examples).

Rule 1 applies wherever comments or unrelated prose exist in a file the change edits. Rule 2's content transparency applies to all product content above.

### R6 — Commit messages

Rule 2 applies to the commit message of any commit that introduces host-project product (code or external documentation). Such a message must not:

- (a) reference this run's pipeline, its phases, its artifacts, or its agents in its narrative — this is part of Rule 2's **content transparency**; nor
- (b) carry a provenance tag that names the pipeline or its agents — this is Rule 2's **commit-provenance clause**.

A commit that changes **only** pipeline artifacts (files under the pipeline's artifacts folder) is exempt and may reference the pipeline freely and carry a provenance tag. This boundary holds the same whether the pipeline keeps its artifacts in a separate fork or directly in the upstream repository. (Rule 1 does not apply to commit messages.) Parts (a) and (b) are independently overridable per R9.

### R7 — Rules apply across the producing phases, consistently

The rules govern every phase that produces host-project output — the Code phase (`code-writer-tdd`, `code-writer-e2e`) and the Docs phase (`docs-writer`) — and the commit messages each produces. The tool states the rules **once** and consistently, replacing the pre-existing narrower statement of Rule 2 in `agents/code-writer-tdd.md` ("Comments must be self-contained — never reference the spec, the plan, or any other artifact") so that no two overlapping versions remain to drift apart.

### R8 — Enforcement of the rules in force

Compliance is enforced, not merely advised, for every rule that is **in force** for the run. When generated output violates an in-force rule, the violation is detected and the affected phase does not complete until it is resolved. A run cannot reach a "phase complete" state for the Code phase or the Docs phase while a known violation of an in-force rule remains in that phase's output.

A rule (or rule part) a project has disabled per R9 is **not in force**: output that would otherwise violate it is neither reported as a violation nor blocks phase completion.

### R9 — Per-project override of Rule 2

A project may disable either of two independent switches, each **on by default**, set in the project's host convention (per-project; there is no per-run override):

- **Content-transparency switch** — governs Rule 2's content reach: R3 and R5, and the no-pipeline-narrative half of the commit-message clause (R6a). Disabled, the shipped product may reference this run's pipeline, its phases, artifacts, or agents anywhere in its content (including commit-message narrative) without it being a violation.
- **Provenance switch** — governs the commit-provenance clause (R6b). Disabled, a product commit may carry an agent-name provenance tag without it being a violation.

The two switches are independent: a project may disable one and keep the other (for example, keep the product reading as hand-written while still tagging commits for attribution, or the reverse). A switch applies project-wide across both producing phases; there is no per-agent or per-phase granularity. Rule 1 is not switchable. The exact representation of the switches in the host convention, and how their state reaches the enforcing agents, are design decisions.

## Out of Scope

1. **Preserving still-valid comments adjacent to changed code.** Rule 1 forbids only tidying comments on untouched code; it adds no requirement to keep an accurate comment beside code that was changed.
2. **A general ban on the Radical Pipelines vocabulary.** A host project's legitimate use of words like "spec," "plan," "design doc," "pipeline," or "Radical Pipelines" — including the Radical Pipelines repository's own source — is not a violation.
3. **Per-run override.** The R9 switches are per-project only; a single run cannot flip them.
4. **Overriding Rule 1.** Rule 1 is always-on; only Rule 2's content transparency and its provenance clause are switchable.
5. **Per-agent or per-phase switch granularity.** A switch applies project-wide across both producing phases, not to individual agents or one phase only.
6. **Choosing the enforcement mechanism, the switch encoding, and state propagation.** Whether detection is a deterministic check, a reviewer-style check, or a hybrid; how the switches are represented in the host convention; and how their on/off state reaches the producing and reviewing agents — all are design-phase decisions. This spec requires only that violations of in-force rules are detected and block phase completion.
7. **Rule 2 over pipeline-artifact-only commit messages.** Commits that change only files under the pipeline's artifacts folder are exempt from Rule 2.

## Acceptance Criteria

### AC1 — Rules apply by default without the owner restating them
- **Given** a pipeline run on any host project that has not changed the defaults and where the owner has said nothing about comments or pipeline references,
- **When** the run produces code, docs, and commit messages,
- **Then** Rule 1 and Rule 2 (both content transparency and the provenance clause) are in force for that output.

### AC2 — Unrelated comments and prose are preserved
- **Given** a file containing comments on code, or prose sections, that a change does not modify,
- **When** an agent makes its change to other parts of the file,
- **Then** the comments on the unmodified code and the unrelated prose are unchanged (no rewording, reflowing, or reformatting).

### AC3 — Rule 1 does not over-reach
- **Given** a change that modifies a piece of code or documentation whose own comment or prose is naturally updated as part of the change,
- **When** the agent updates that comment or prose as part of the change,
- **Then** this is not treated as a Rule 1 violation (the rule targets content the change did *not* touch).

### AC4 — No pipeline references or process narration in code content (content transparency in force)
- **Given** generated source code, tests, or inline documentation, with the content-transparency switch enabled,
- **When** the content is inspected — comments, identifiers and names, string literals, and log/error messages,
- **Then** it contains no pointer to a pipeline artifact, no reference to a phase or plan task, no narration of the agent's own process, and no statement that it was produced by the pipeline or its agents.

### AC5 — No pipeline references in external docs and product commit messages (in force)
- **Given** external documentation generated by the Docs phase, and the message of a commit that introduces host-project product, with the relevant switches enabled,
- **When** they are inspected,
- **Then** none of them reference the pipeline, its phases, its artifacts, or its agents as the origin of the work, and no product commit message carries an agent-name provenance tag.

### AC6 — Legitimate host content is not flagged
- **Given** a host project (including the Radical Pipelines repository itself) whose own source legitimately uses words like "spec," "plan," "design doc," "pipeline," or "Radical Pipelines,"
- **When** that legitimate content is produced or edited and Rule 2 is evaluated,
- **Then** it is not reported as a violation, because Rule 2 targets references to *this run's* pipeline process and artifacts, not the vocabulary.

### AC7 — A violation of an in-force rule blocks phase completion
- **Given** generated output that violates Rule 1, or violates a part of Rule 2 whose switch is enabled,
- **When** the producing phase (Code or Docs) reaches the point where it would be marked complete,
- **Then** the violation is detected and the phase is not allowed to complete until the violation is resolved.

### AC8 — One consistent statement of the rules
- **Given** the tool's agent prompts after this change,
- **When** they are reviewed,
- **Then** the two rules are stated once and consistently, and the pre-existing narrower statement in `agents/code-writer-tdd.md` no longer exists as a separate, conflicting version.

### AC9 — Pipeline-artifact-only commits are exempt
- **Given** a commit that changes only files under the pipeline's artifacts folder,
- **When** its message references the pipeline, a phase, an artifact, or carries the project's agent provenance tag,
- **Then** this is not a Rule 2 violation and does not block the phase.

### AC10 — Disabling content transparency suppresses its enforcement
- **Given** a project that has disabled the content-transparency switch in its host convention,
- **When** generated product references this run's pipeline, its phases, artifacts, or agents in its content (including commit-message narrative),
- **Then** this is not reported as a violation and does not block phase completion.

### AC11 — Disabling provenance suppresses its enforcement
- **Given** a project that has disabled the provenance switch in its host convention,
- **When** a commit that introduces host-project product carries an agent-name provenance tag,
- **Then** this is not reported as a violation and does not block phase completion.

### AC12 — The switches are independent and do not affect Rule 1
- **Given** a project that has disabled exactly one of the two switches,
- **When** the run produces output,
- **Then** the other switch's rule remains in force and enforced, and Rule 1 remains in force and enforced regardless of either switch.
