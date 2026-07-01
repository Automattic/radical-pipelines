# Spec Research: Default output rule (no references to the pipeline run)

# What a pipeline writes into the host project never references the run that produced it

> Source: GitHub issue #86 (https://github.com/Automattic/radical-pipelines/issues/86).
> This file is self-contained; agents do not need to open the source issue.

## Goal

What a pipeline writes into the host project — code, tests, documentation, and commit messages — never references the concrete pipeline run that produced it: its tasks, flows, requirements, phases, artifacts, or agents. Every pipeline gets this by default, without the owner restating it each run.

## Constraints

- Commit messages keep the agent-name tag the commit-format convention adds (e.g. `Add spec (spec-reviewer)`); the rule must not forbid naming an agent in a commit.
- Stay generic: no hardcoded artifact-folder paths or tool-specific references in the agent profiles.

## Context

- The rule's origin is an observed leak where generated code referenced a pipeline artifact (https://github.com/Automattic/skillsmith/blob/25dd6b4246d1d3c426e9c3f066b754f5844cc35f/src/improvement/improver.ts#L106-L109). Recent examples: commit subjects like "…per R9" and "…per R1f/R6/R8" that point at this run's review findings.
- The original issue paired this with a second rule — leave comments on unchanged code untouched. That rule is dropped for now: an agent improving a missing description or type in a file it is already modifying looks like a legitimate improvement, so we want to observe the behavior more and forbid only the cases that are actually wrong. v3 covers this rule only.

## Assumptions / directions to explore (open)

- The rule reads most reliably stated concretely: the leak is a specific pointer to this run's machinery — a task / flow / requirement / criterion by its number, a named artifact (spec, plan, design doc, review), or another agent — while bare domain vocabulary is fine. Rough test: "is a number or a name pinning it to this run's paperwork?" The spec settles the exact formulation.
- The rule likely lives as a standing disposition in each producer's Guidelines and as a detection check in each reviewer's checklist — not one identical block in both.
- Enforcement stays at the existing per-phase review gate.

## Q&A

### Q1 — Scope: which surfaces does the rule govern?

The intent covers "what a pipeline writes into the host project — code, tests, documentation, and commit messages." To make it reviewer-checkable, I'd read that as every place a pipeline authors text: code comments, symbol/identifier names, string literals, log & error messages, inline API docs, external docs (READMEs/guides/changelogs), and the commit-message text. Is that the full set, or would you scope any of those out?

**Owner:** Are there any other surfaces?

**Surfaces surfaced for consideration (awaiting owner's scope decision):**
- Sub-cases already inside the 7: test names / `describe`/`it` descriptions, UI/i18n copy, CLI help, API response text (→ string literals); config keys, env-var/feature-flag names (→ identifiers/literals); migration names, `@since`/`@see` doc tags (→ identifiers/inline docs). Test descriptions are the hotspot — the WooCommerce leaks landed there.
- Additional, need in/out call: file & directory names the pipeline creates; changeset/changelog release-note entries (`.changeset/*.md`); PR title & description (if a pipeline opens the PR — ambiguous, may legitimately reference process).
- Likely out (pipeline infra/meta, not host-project product): branch names, git tags, and the pipeline's own `.pipelines/` artifacts (which legitimately reference the run).

**Owner:** Generalize — don't enumerate surfaces. Forbid references anywhere that is not the pipeline's own artifacts.

**Resolution (Q1 — scope):** The rule governs all output a pipeline writes, defined by exclusion: everything **except the pipeline's own artifacts folder** (the `<artifacts-folder>` location; here `.pipelines/<slug>/`). This subsumes every surface — comments, identifiers, string literals (incl. test names), log/error text, inline & external docs, changesets, file/dir names, commit-message text, PR description — and any not enumerated. The artifacts folder is the only place run-references are allowed, because the artifacts are the record of the run. Uses the `<artifacts-folder>` convention, never a hardcoded path (per intent Constraint).
- Separate from scope: *what* counts as a reference (the discriminator — a pointer to THIS run's machinery). That, not location, is what keeps the self-hosting repo's own pipeline-vocabulary docs from being flagged.
- For the spec: a commit message isn't a file under a folder, so "outside the artifacts folder" for a commit means the commit touches any non-artifact path (v2's changed-path test) — for producers, always.

### Q2 — The discriminator: what counts as a "reference to this run"?

What separates a forbidden reference from language that merely uses the same words? The working test from the intent: a violation is a *specific pointer to this run's machinery* — a task / flow / requirement / criterion **by its number** (e.g. task 3, R5), a **named artifact of this run** (the spec, the plan, the design doc, the review), or **another agent** named as the author — while bare domain vocabulary (a function named `spec`, prose *about* pipelines, "this validates the plan") is fine. Does that capture the line, or would you draw it differently?

**Owner:** Yes — but the rule must avoid the word "pipeline".

**Resolution (Q2 — discriminator):** A violation is a specific pointer to *the work that produced this change*: a task / flow / requirement / criterion by its number (task 3, R5), a named artifact behind it (the spec, the plan, the design doc, the review), or another agent named as its author. Bare domain vocabulary is fine (a function named `spec`, docs that describe such a feature, "this validates the plan").
- Requirement: the rule's wording must not depend on the term "pipeline", nor on an agent knowing what a pipeline is. An agent reads only its own profile + launch prompt; it is grounded in its task, the spec/plan/design doc it followed, the review, and the other agents — so the rule names those concretely and drops the umbrella. (Applies to the rule text in the profiles; the artifacts themselves may use "pipeline" freely.)

### Q3 — Where the rule lives and how it is enforced

Intent's direction: producers carry it as a standing disposition (in their **Guidelines**), reviewers carry it as a **detection check** in their review checklist, and it is enforced at the existing per-phase review gate — a violation is a must-fix that blocks approval. Is that the enforcement model you want?

**Owner:** Yes.

**Resolution (Q3 — enforcement):** Producers (code-writer-tdd, code-writer-e2e, docs-writer) carry the rule as a standing disposition in their Guidelines. Reviewers (code-reviewer, docs-reviewer) carry it as a detection check in their review checklist, worded for finding violations. Enforced at the existing per-phase review gate — a violation is a must-fix that blocks approval; no new gate or script. Earlier-phase agents (spec, design, plan) write only artifacts, so they do not carry it.

### Q4 — Edge case: false positives in the self-hosting repo

This repo's own product (skill files, README, website) legitimately uses "spec", "plan", "task", "phase", "agent" as subject matter, and those files live outside the artifacts folder — so the rule applies to them, and the discriminator (pointer to THIS run) is what keeps them safe. How much extra guard do you want against a reviewer over-flagging them: trust the discriminator and keep the rule minimal, or also bake in a couple of explicit "not a violation" examples? (v2 over-invested here and got verbose.)

## Research

- Target profiles: `agents/code-writer-tdd.md`, `agents/code-writer-e2e.md`, `agents/docs-writer.md` (producers → Guidelines); `agents/code-reviewer.md`, `agents/docs-reviewer.md` (reviewers → review checklist). Each already has a distinct Guidelines section and a review-checklist step.
- Reusable prior art from v2: the changed-path commit classifier (a commit is host-project/product when it touches any path outside `<artifacts-folder>`). v2 mistakes to avoid: agent-name-tag ban, hardcoded `.pipelines/<slug>/` path, and one identical block pasted into producers and reviewers.

## Out of Scope

- **Rule 1** (leave untouched comments untouched) — deferred; observe further before constraining.
- **Any authorship policy for commits** — agent naming stays as the commit-format convention defines it; the rule neither adds nor removes it.
- **Earlier-phase agents** (spec, design, plan) — write only artifacts; not modified.
- **New enforcement machinery** — no scanner/script/gate; enforcement is the reviewer's judgment at the existing gate.
- **Vocabulary bans / self-hosting carve-outs.**
- **Branch names and git tags.**
- **Hardcoded artifact paths / tool-specific wording.**

## Consolidated Requirements

1. One always-on default rule, living in the agent profiles; the owner never restates it.
2. Scope by exclusion: everything a pipeline writes outside its own `<artifacts-folder>`. The artifacts folder is the only place run-references are allowed.
3. Discriminator: a violation points at a specific piece of *this* run — a task/flow/requirement/criterion by number, a named artifact (spec/plan/design doc/review), or another agent as author. Bare domain vocabulary as subject matter is never a violation.
4. Rule wording must not use "pipeline" or assume an agent knows what a pipeline is; it names only referents the agent already holds.
5. Uniform and referent-based: identical for every host project including this one; no token/keyword/path scan; no self-hosting carve-out; illustrative paths and artifact-type names are fine.
6. Commit-message content is subject to the rule; the convention's agent-name tag stays. A commit is subject when it touches any non-artifact path (producers: always); reviewers' artifact-only commits are exempt.
7. Producers (code-writer-tdd, code-writer-e2e, docs-writer) carry it as a Guidelines disposition.
8. Reviewers (code-reviewer, docs-reviewer) carry it as a detection check in their checklist — not the producers' block duplicated.
9. Enforced at the existing per-phase review gate as a must-fix; no new gate or script.
10. Generic: no hardcoded artifact path, no tool-specific references; artifacts location via the `<artifacts-folder>` convention.
