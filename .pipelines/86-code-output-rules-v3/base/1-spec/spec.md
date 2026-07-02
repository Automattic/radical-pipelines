# Spec: Default output rule — host-project output never references the run that produced it

## Overview

Every pipeline run should, by default, produce host-project output that reads as if written by hand, carrying no reference to the specific run that produced it. Today the owner must restate this each run, and leaks slip through — a comment or a commit subject citing "R9", "task 3", or "the design doc". This promotes a single, always-on rule into the producing and reviewing agent profiles: nothing a pipeline writes into the host project may point at an artifact of the run that produced it.

The rule is **referent-based** — it targets pointers to *this* run, never the vocabulary of the domain — so it applies uniformly to every host project, including this self-hosting one, with no carve-outs. It is enforced at the existing per-phase review gate. A second rule from the original request — leaving untouched comments untouched — is deferred (see Out of Scope).

## Requirements

### R1 — A single, always-on default
The rule lives in the agent profiles and applies to every run automatically; the owner never restates it.

### R2 — Scope defined by exclusion
The rule governs everything a pipeline writes into the host project, defined as all output outside the pipeline's own artifacts folder (the `<artifacts-folder>` location). This covers — without the list being exhaustive — code comments, identifiers and names, string literals (including test names and descriptions), log and error messages, inline API docs, external documentation, changeset/changelog entries, files and directories the run creates, and commit-message content. The artifacts folder is the only place references to the run are allowed, because the artifacts are the record of the run.

### R3 — What counts as a violation (the discriminator)
A violation is a reference that points at a specific piece of *this* run:
- a task, flow, requirement, or acceptance criterion by its number (e.g. "task 3", "R5");
- a named artifact behind the change (the spec, the plan, the design doc, the review); or
- another agent named as the author of the work.

Bare domain vocabulary used as the product's own subject matter is never a violation — a symbol named `spec`, documentation that describes a spec-writing feature, or the words "task", "plan", "phase", "pipeline" as domain terms.

### R4 — The rule must not depend on the concept "pipeline"
An agent reads only its own profile and its launch prompt, so the rule's wording names only referents an agent already holds — its task, the spec/plan/design doc it followed, the review it addressed, and the other agents. It must not use the term "pipeline" or assume the agent knows what a pipeline is.

### R5 — Uniform and referent-based; no scanning, no carve-outs
The rule applies identically to every host project, this repository included. It is not a token, keyword, or path scan, and carries no self-hosting carve-out. Vocabulary as subject matter, illustrative or example artifact paths, and artifact-type names are never violations.

### R6 — Commit messages
A commit message's descriptive content is subject to the rule; the agent-name tag that the commit-format convention adds is not a violation and remains. A commit is subject to the rule when it changes any path outside the artifacts folder — for producers, always; a reviewer's artifact-only commit is exempt.

### R7 — Placement in producers
The producing agents (code-writer-tdd, code-writer-e2e, docs-writer) carry the rule as a standing disposition among their Guidelines, not embedded in a numbered workflow step.

### R8 — Placement in reviewers
The reviewing agents (code-reviewer, docs-reviewer) carry the rule as a detection check in their review checklist, worded for finding violations rather than for writing. It is not the producers' block pasted verbatim.

### R9 — Enforcement
The rule is enforced at the existing per-phase review gate: a reviewer treats a violation as a must-fix that blocks approval. No new gate, script, or tool is introduced.

### R10 — Generic
The updated profiles contain no hardcoded artifact-folder path and no tool-specific references; the artifacts location is taken from the `<artifacts-folder>` convention.

## Out of Scope

- **Rule 1 — leaving untouched comments untouched.** Deferred, to be observed further before deciding whether and how to constrain it.
- **Any authorship policy for commits.** Agent naming stays as the commit-format convention defines it; the rule neither adds nor removes it.
- **Earlier-phase agents.** Spec, design-doc, and plan agents write only artifacts and are not modified.
- **New enforcement machinery.** No deterministic scanner, script, or gate; enforcement is the reviewer's judgment at the existing gate.
- **Vocabulary bans or self-hosting carve-outs.**
- **Branch names and git tags.**

## Acceptance Criteria

### AC1 — A run-pointer in host-project output is caught
Given a producer writes host-project content that points at this run — e.g. a comment "// per R5", an identifier `task3Helper`, a doc line "as the design doc specifies", or a commit subject "Add parser per R9" — when a reviewer reviews the batch, then the reviewer flags it as a must-fix and approval is blocked until it is removed.

### AC2 — Domain vocabulary is not caught
Given host-project content uses the vocabulary as its own subject matter — a symbol named `spec`, a doc describing a spec-writing feature, or "task"/"plan"/"phase"/"pipeline" as domain terms — when a reviewer reviews it, in any repository including this one, then it is not flagged.

### AC3 — The commit agent-name tag is allowed
Given a producer commits with the convention's agent-name tag (e.g. "Add parser (code-writer-tdd)"), when a reviewer reviews the commit, then the tag is not treated as a violation.

### AC4 — Artifacts may reference the run
Given the run's own artifacts under `<artifacts-folder>` reference its tasks, phases, and agents, when a reviewer reviews them, then that is not a violation.

### AC5 — The rule text is pipeline-free
Given the updated producing and reviewing profiles, then the rule's wording names only concrete referents (task, spec, plan, design doc, review, agents) and does not use the term "pipeline" nor assume the agent knows what a pipeline is.

### AC6 — Role-appropriate placement
Given the updated profiles, then each producer carries the rule as a Guidelines disposition and each reviewer carries it as a detection checklist item, and the two are not the same block duplicated.

### AC7 — Generic wording
Given the updated profiles, then they contain no hardcoded artifact-folder path and no tool-specific reference; the artifacts location comes from the `<artifacts-folder>` convention.
