# Spec: Default output rules for pipeline-produced code

## Overview

Radical Pipelines runs teams of agents that produce real product for a host project — source code, tests, documentation, and the commit messages that ship that work. Two output qualities are expected of any work done by hand but are not guaranteed by the tool today: a change should leave untouched comments and prose alone, and the shipped product should read as if a person wrote it, with no trace of the pipeline that produced it. The motivating incident was generated code that carried a comment narrating the pipeline's own process (naming a plan task and a key decision); separately, a change that tidies comments on code it never modified produces noisy, hard-to-review diffs. Both behaviors were previously corrected by hand-passing guidelines to individual pipelines on every run.

This feature promotes those two qualities into permanent, always-on rules of the tool, so every pipeline run honors them by default with no owner action. They are referred to here as **Rule 1** (leave unchanged comments and prose untouched) and **Rule 2** (the shipped product is transparent to the pipeline), collectively **the output rules**. The rules apply to a run's **host-project product** — the source code, tests, inline and external documentation, and the commit messages a run ships into the host repository — as distinct from the pipeline's own artifacts (specs, design docs, plans, reviews, summaries, and any file under the pipeline's artifacts folder). Compliance is enforced by the existing review gate of each phase that produces host-project output: a violation is a must-fix issue that blocks the phase from completing until it is resolved.

## Requirements

### Always-on application

1. Both output rules are in force for every pipeline run, with no owner action and no opt-out. On any host project — including one where the owner has said nothing about comments or pipeline references — a run's code, documentation, and commit messages are subject to both Rule 1 and Rule 2. There is no per-run or per-project override or opt-out, and the owner never restates the rules per run.

### Rule 1 — leave unchanged comments and prose untouched

2. A change must not reword, reflow, reformat, or otherwise tidy comments attached to code the change did not modify, or prose sections of a documentation file the change edits but does not otherwise touch. Such untouched comments and unrelated prose are left exactly as they were.

3. Rule 1 targets only content the change did not touch. When a change modifies code or documentation whose own comment or prose is naturally updated as part of that change, updating that comment or prose is permitted and is not a violation. Rule 1 imposes no duty to preserve a still-valid comment beside code that was changed. Rule 1 does not apply to commit messages.

### Rule 2 — the host-project product is transparent to the pipeline

4. No part of the shipped product references this run's pipeline, its phases, its artifacts, or its agents, nor narrates the writing agent's own process. This reach is total across product content: comments, identifiers and names, string literals, log and error messages, and inline API documentation. The product reads as if written by hand. Rule 2 is not limited to comments.

5. External documentation produced by the pipeline — READMEs, guides, changelogs, examples, and the like — references neither this run's pipeline, phases, artifacts, or agents, nor the pipeline as the origin of the work.

6. Rule 2 targets only references whose referent is *this run's* own process, artifacts, or agents — the concrete pipeline instance that produced this output. It never flags the mere vocabulary of pipeline concepts. A host project's legitimate use of words like "spec", "plan", "design doc", "pipeline", "phase", or "artifact", documentation of the methodology, references to artifact *types* in general, illustrative paths, or artifact-type filenames used as product data (for example a `spec.md` string literal or an illustrative `.pipelines/issue-1234/.../spec.md` path shown in docs) are not violations — including in the self-hosting Radical Pipelines repository itself. The decisive test is whether the reference identifies the actual pipeline instance that wrote this output.

### Commit messages and provenance

7. A commit that introduces host-project product carries no pipeline-naming provenance in its message — including no agent-name provenance tag. Inspecting such a message reveals no named pipeline, phase, artifact, or agent. This holds regardless of how the pipeline's artifacts are stored, and independently of the host's specific commit format: the host commit format governs product commits in full except that it contributes no pipeline-naming provenance to them.

8. A commit that changes only pipeline-artifact files is exempt from Rule 2 and may reference the pipeline freely, including carrying the host's agent-name provenance tag. The boundary is by file path: a commit is a product commit when none of its changed paths are under the pipeline's artifacts folder.

9. The output rules and a host's configured commit-format convention do not contradict each other. On a host whose commit format would otherwise tag every commit with provenance, product commits go untagged while artifact-only commits keep the tag; the rule never needs to know the host's specific format, because it forbids one property (pipeline-naming provenance) on one class of commit (product commits).

### Single source and consistency

10. The output rules govern every phase that produces host-project output and the commit messages each such phase produces. Rule 1 applies wherever comments or unrelated prose exist in a file a change edits; Rule 2 applies to all product content and to product commit messages.

11. The output rules are stated once and consistently, with no narrower or conflicting earlier version surviving. In particular, the pre-existing narrower statement of Rule 2 carried in the code writer's profile ("Comments must be self-contained — never reference the spec, the plan, or any other artifact") no longer exists as a separate, overlapping version that could drift from the canonical rules.

### Enforcement

12. A violation of either rule blocks its producing phase from completing until the violation is resolved. When generated output that violates Rule 1 or Rule 2 is present at the point a producing phase would be marked complete, the phase does not complete: the phase's review gate treats the violation as a must-fix issue, no approval is recorded, the phase-completion condition is not satisfied, and the affected work is sent back for correction — until the violation is resolved. The review gate is the only route to phase completion, with no bypass. Because detecting a violation is a semantic judgment rather than a mechanical check, enforcement guarantees that a violation, once seen, cannot be approved; it does not guarantee that detection is mechanically exhaustive.

## Out of Scope

1. **Preserving still-valid comments adjacent to changed code.** Rule 1 forbids only tidying comments and prose on content the change did not touch; it adds no duty to keep an accurate comment beside code that was changed.
2. **A general ban on the Radical Pipelines vocabulary, or any token, keyword, or path scan.** A host's legitimate use of words like "spec", "plan", "design doc", "pipeline", "phase", or "artifact" — including in the self-hosting Radical Pipelines repository's README, website, and skill files, and including artifact-type filenames or illustrative `.pipelines/` paths used as documentation — is not a violation. A blanket vocabulary ban, or any token/keyword/path scan that would flag such content, is explicitly NOT the rule; Rule 2 is referent-based.
3. **Any per-run or per-project override or opt-out.** The rules are always-on.
4. **The internals of the enforcement mechanism.** Whether the review gate's check is purely judgment, aided by tooling, or hybrid is a design-phase decision; the requirement is only that a violation is detected at the gate and blocks completion.
5. **Rule 2 over pipeline-artifact-only commit messages.** Commits that change only files under the pipeline's artifacts folder are exempt and may reference the pipeline and carry the provenance tag.
6. **Rule 1 over commit messages.** Commit messages carry no pre-existing comments or prose.

## Acceptance Criteria

### Always-on application

- Given a host project where the owner has configured nothing about comments or pipeline references, when a pipeline run produces code, documentation, and commit messages, then all of that output is subject to both Rule 1 and Rule 2 without any owner action.
- Given any pipeline run, when the owner looks for a way to disable, override, or opt out of either output rule for that run or that project, then no such mechanism exists.

### Rule 1

- Given a file that contains comments on code (or prose sections) the change does not modify, when an agent changes other parts of that file, then the untouched comments and unrelated prose are left exactly as they were.
- Given a change that modifies a piece of code or documentation whose own comment or prose is naturally updated as part of that change, when that comment or prose is updated, then this is not treated as a Rule 1 violation.
- Given a change that modifies code while leaving a still-valid comment beside it unchanged, when Rule 1 is evaluated, then leaving that comment unchanged is not a violation (Rule 1 imposes no duty to preserve it).
- Given a commit message, when Rule 1 is evaluated, then Rule 1 does not apply to it.

### Rule 2 — content

- Given generated source code, tests, or inline documentation, when its comments, identifiers and names, string literals, and log and error messages are inspected, then none point at a this-run artifact, reference a phase or plan task of this run, narrate the writing agent's own process, or claim the output was produced by the pipeline or its agents.
- Given a code comment that narrates this run's pipeline process — for example one that names a plan task and a key decision of this run — when Rule 2 is evaluated, then it is a violation.
- Given external documentation produced by the pipeline (README, guide, changelog, or example), when it is inspected, then it does not reference this run's pipeline, phases, artifacts, or agents as the origin of the work.

### Rule 2 — referent-based discriminator

- Given a host project (including the self-hosting Radical Pipelines repository) whose own product legitimately uses pipeline vocabulary, documents the methodology, names artifact types in general, or includes an illustrative artifact path or an artifact-type filename used as product data, when Rule 2 is evaluated, then that content is not flagged, because it does not identify the concrete pipeline instance that produced this output.
- Given a reference in shipped product, when deciding whether it violates Rule 2, then the decisive test is whether the reference identifies the actual pipeline instance that wrote this output: if it does, it is a violation; if it only uses the vocabulary, it is not.

### Rule 2 — commit messages and provenance

- Given a commit that introduces host-project product (code or external documentation), when its message is inspected, then it names no pipeline, phase, artifact, or agent and carries no agent-name provenance tag — regardless of the artifact storage mode and regardless of the host's specific commit format.
- Given a commit none of whose changed paths are under the pipeline's artifacts folder, when classified, then it is a product commit and is subject to Rule 2's commit-message constraint.
- Given a commit all of whose changed paths are under the pipeline's artifacts folder, when classified, then it is an artifact-only commit, is exempt from Rule 2, and may reference the pipeline and carry the host's agent-name provenance tag.
- Given a host whose configured commit format would otherwise tag every commit with provenance, when a run produces commits, then product commits go untagged and artifact-only commits keep the tag, and no contradiction between the rule and the host format arises.

### Single source and consistency

- Given the tool after this change, when the statements of the output rules are inspected, then the rules are expressed once and consistently, and the earlier narrower statement of Rule 2 in the code writer's profile no longer exists as a separate, conflicting version.

### Enforcement

- Given generated output that violates Rule 1 or Rule 2, present at the point a producing phase would be marked complete, when the phase's review gate runs, then the violation is recorded as a must-fix issue, no approval is recorded, the phase does not complete, and the affected work is sent back for correction until the violation is resolved.
- Given a phase that produces host-project output, when the only route to completion is examined, then it passes through the review gate with no bypass, so a run cannot reach phase-complete while a known violation stands.
