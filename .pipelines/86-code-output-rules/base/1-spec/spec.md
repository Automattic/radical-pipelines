# Spec: Default output rules for generated code

## Overview

Every pipeline run produces output that lands in a host project: source code, tests, and inline documentation (Code phase); external documentation such as READMEs, guides, changelogs, and examples (Docs phase); and the commit messages that carry that product. Today two desirable properties of that output must be hand-passed to each pipeline by the owner, and one of them has already leaked in practice — generated code carried a comment narrating the pipeline process (a plan task and the pipeline itself).

This feature promotes both properties into the tool itself, so every run gets them for free without the owner restating them:

1. **Unchanged comments and prose are left untouched.** A change must not reword, reflow, or otherwise tidy comments — or unrelated documentation prose — that belong to content it did not modify.
2. **The host-project product is transparent to the pipeline.** The shipped product must not reference the pipeline that produced it, its phases, its artifacts, or its agents, anywhere in its content. The output must read as if written by hand.

Both rules are always-on and unconditional, and both are **enforced**: output that violates a rule is detected and blocks the offending phase from completing, rather than being offered as advice the agents may ignore.

This spec defines **what** the rules require and how compliance is measured. **Where** the rules live in the agents' prompts and **how** violations are detected and blocked — a deterministic check, a reviewer-style check, or a hybrid — are decisions left to the design phase.

Throughout this spec, "host-project product" means the source code, tests, inline and external documentation, and the commit messages that the run ships into the host repository — as distinct from the pipeline's own artifacts (specs, design docs, plans, reviews, and other files the pipeline writes about its own process).

## Requirements

### R1 — Two default output rules, applied automatically

The tool applies both rules below to the output of every pipeline run, with no action required from the owner. The owner never restates them per run, and there is no override or opt-out.

### R2 — Rule 1: leave unchanged comments and prose untouched

A generated change must not reword, reflow, reformat, or otherwise tidy:

- comments attached to code the change did not modify, or
- prose sections of a documentation file the change edits but did not otherwise touch.

The rule constrains gratuitous edits to content the change did not modify. It does **not** constrain comments or prose belonging to the content being changed, and it imposes no duty to preserve a still-valid comment beside changed code. Commit messages carry no pre-existing comments or prose, so Rule 1 does not apply to them.

### R3 — Rule 2: the host-project product is transparent to the pipeline

The shipped product must not reference this run's pipeline, its phases, its artifacts, its agents, or narrate the agent's own process — **anywhere** in its content. Forbidden content includes, but is not limited to:

- Pointers to pipeline artifacts — e.g. `spec.md`, `design-doc.md`, `code-plan.md`, `doc-plan.md`, or any path under the pipeline's artifacts folder.
- References to the tool's phases or plan tasks — e.g. "the spec," "the design doc," "implements task 4.2 of the code plan," "in the Docs phase."
- Narration of the agent's own reasoning or process — e.g. a comment explaining a change in terms of the task the agent was given.
- Any statement that the code, tests, or docs were produced by the pipeline or its agents.

This reach is total: it covers code comments, identifiers and names (variables, functions, types), string literals, log and error messages, inline API documentation, and external documentation — not only the commit message. The product must read as if written by hand with no knowledge of the pipeline.

### R4 — Rule 2 targets this run's process, not a vocabulary

Rule 2 forbids references to **this run's** pipeline process and artifacts only. It must not flag a host project's legitimate source content, even when that content is itself about specs, plans, design docs, or Radical Pipelines. In particular, the Radical Pipelines repository can be a host project — it builds itself — and its product legitimately contains those terms; this must remain possible.

### R5 — Surfaces covered

Both rules apply to every part of the generated product that lands in the host repository:

- Source code, including tests, identifiers/names, string literals, and log/error messages.
- Code comments and inline API documentation (Code phase).
- External documentation produced by the Docs phase (READMEs, guides, changelogs, examples).

Rule 1 applies wherever comments or unrelated prose exist in a file the change edits. Rule 2 applies to all product content above.

### R6 — Commit messages

Rule 2 applies to the commit message of any commit that introduces host-project product (code or external documentation): that message must not reference the pipeline, its phases, its artifacts, or its agents — including any provenance tag that would name them.

A commit that changes **only** pipeline artifacts (files under the pipeline's artifacts folder) is exempt from Rule 2 and may reference the pipeline freely. This boundary holds the same whether the pipeline keeps its artifacts in a separate fork or directly in the upstream repository.

### R7 — Rules apply across the producing phases, consistently

The rules govern every phase that produces host-project output — the Code phase (`code-writer-tdd`, `code-writer-e2e`) and the Docs phase (`docs-writer`) — and the commit messages each produces. The tool states the rules **once** and consistently, replacing the pre-existing narrower statement of Rule 2 in `agents/code-writer-tdd.md` ("Comments must be self-contained — never reference the spec, the plan, or any other artifact") so that no two overlapping versions remain to drift apart.

### R8 — Enforcement

Compliance is enforced, not merely advised. When generated output violates Rule 1 or Rule 2, the violation is detected and the affected phase does not complete until it is resolved. A run cannot reach a "phase complete" state for the Code phase or the Docs phase while a known violation remains in that phase's output.

## Out of Scope

1. **Preserving still-valid comments adjacent to changed code.** Rule 1 forbids only tidying comments on untouched code; it adds no requirement to keep an accurate comment beside code that was changed.
2. **A general ban on the Radical Pipelines vocabulary.** A host project's legitimate use of words like "spec," "plan," "design doc," "pipeline," or "Radical Pipelines" — including the Radical Pipelines repository's own source — is not a violation.
3. **Any per-run or per-project override or opt-out.** The rules are always-on.
4. **Choosing the enforcement mechanism.** Whether detection is a deterministic check, a reviewer-style check, or a hybrid is a design-phase decision; this spec requires only that violations are detected and block completion.
5. **Rule 2 over pipeline-artifact-only commit messages.** Commits that change only files under the pipeline's artifacts folder are exempt from Rule 2.

## Acceptance Criteria

### AC1 — Rules apply without the owner restating them
- **Given** a pipeline run on any host project where the owner has said nothing about comments or pipeline references,
- **When** the run produces code, docs, and commit messages,
- **Then** both Rule 1 and Rule 2 are in force for that output.

### AC2 — Unrelated comments and prose are preserved
- **Given** a file containing comments on code, or prose sections, that a change does not modify,
- **When** an agent makes its change to other parts of the file,
- **Then** the comments on the unmodified code and the unrelated prose are unchanged (no rewording, reflowing, or reformatting).

### AC3 — Rule 1 does not over-reach
- **Given** a change that modifies a piece of code or documentation whose own comment or prose is naturally updated as part of the change,
- **When** the agent updates that comment or prose as part of the change,
- **Then** this is not treated as a Rule 1 violation (the rule targets content the change did *not* touch).

### AC4 — No pipeline references or process narration in code content
- **Given** generated source code, tests, or inline documentation,
- **When** the content is inspected — comments, identifiers and names, string literals, and log/error messages,
- **Then** it contains no pointer to a pipeline artifact, no reference to a phase or plan task, no narration of the agent's own process, and no statement that it was produced by the pipeline or its agents.

### AC5 — No pipeline references in external docs and product commit messages
- **Given** external documentation generated by the Docs phase, and the message of a commit that introduces host-project product,
- **When** they are inspected,
- **Then** none of them reference the pipeline, its phases, its artifacts, or its agents as the origin of the work.

### AC6 — Legitimate host content is not flagged
- **Given** a host project (including the Radical Pipelines repository itself) whose own source legitimately uses words like "spec," "plan," "design doc," "pipeline," or "Radical Pipelines,"
- **When** that legitimate content is produced or edited and Rule 2 is evaluated,
- **Then** it is not reported as a violation, because Rule 2 targets references to *this run's* pipeline process and artifacts, not the vocabulary.

### AC7 — A violation blocks phase completion
- **Given** generated output that violates Rule 1 or Rule 2,
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
