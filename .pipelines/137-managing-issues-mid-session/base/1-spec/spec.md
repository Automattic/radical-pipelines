# Spec — Managing Issues mid-session

## Overview

The subject is the Radical Pipelines skill itself (`skills/radical-pipelines/`). The actor throughout is the **orchestrator**; no spawned agent ever touches the tracker.

The skill defines a **Managing Issues workflow** (`manage-issues.md`) for creating or modifying a tracker issue: a short owner-led capture Q&A (frame, ask the goal, invite extras, reflect hypotheses, draft, confirm, write), with the issue body matching the phase-0 intent format, and the rule that the create/modify operation is routed through the project's **Issues convention** and nothing is written until the owner approves the rendered draft.

Today the skill presents this workflow only as a **session-start entry point**: it is reached through the "Entry points" table, which is framed as a once-at-session-start decision ("When the owner starts a new session, determine which entry point applies"). There is no general rule that re-enters the workflow when the orchestrator creates or modifies an issue *mid-session* (partway through a "work on an issue" session, which includes while running a pipeline). As a result, mid-session the orchestrator may not recognize that the Managing Issues workflow applies, and — because the session-start framing lives where it has no re-read discipline and can fall out of context over a long run — may author the issue ad hoc instead.

Exactly one mid-session route into the workflow exists today: the merged-pipeline case, where a change requested against an already-merged pipeline is "new work" handled as a new issue rather than a review. It only names the workflow file; it does not restate the capture Q&A, and it carries no explicit return behavior.

This change makes the Managing Issues workflow apply whenever the orchestrator creates or modifies an issue, not only at session start, while keeping the skill conformant to the project's skill-authoring rules (minimalist, generic, no duplication across reading paths, no special-case restatement of a general rule, prose-not-software).

## Requirements

### R1 — Mid-session issue authoring re-enters the Managing Issues workflow

Whenever the orchestrator, partway through a "work on an issue" session (including while running a pipeline), creates or modifies a tracker issue, it follows the Managing Issues workflow — the owner-led capture Q&A and the Issues-convention routing — the same workflow it follows when a session starts at that entry point. The behavior is not limited to session start.

### R2 — Stated once as a general rule; existing references rely on it

The R1 guarantee is expressed once, at a general level, so it covers every mid-session situation (current and future) without enumerating them. It is not a set of special-case restatements added to individual procedures. Existing references to the Managing Issues workflow (the merged-pipeline route) *rely on* this general rule for how the workflow runs rather than restating the capture Q&A, mirroring the skill's established pattern in which a rule stated at the entry-point root is inherited silently by everything downstream.

### R3 — The rule stays reachable mid-run

The rule is placed so the orchestrator reliably encounters it when it acts mid-session; it does not depend solely on the session-start entry-point framing that is the current cause of the skip. (This spec states the durability requirement; the exact file and section are a phase-2 design decision.)

### R4 — `manage-issues.md` is safe to enter mid-session, with no hard-coded next step

The workflow's framing no longer assumes it is reached only at session start. It does not commit the orchestrator to any single fixed next step — neither the current forward-only "advance the issue into a pipeline" nor a universal "return to prior work." Once the issue exists, control returns to the situation that invoked the workflow, and that situation determines where the orchestrator goes next: a merged-pipeline caller correctly proceeds toward fresh pipeline work because its review was abandoned, whereas a mid-run caller would instead resume its run.

The capture Q&A steps, the modify-reads-the-issue-first branch, the approval gate, and the "report the issue reference" close are already situation-neutral and reusable as-is; only the front-door framing and the forward-only close out need the mid-session-aware adjustment so that neither hard-codes a single next step.

### R5 — The existing precedent's route and return stay correct under the general rule

The one existing mid-session hand-off (the merged-pipeline change routed to a new issue) keeps routing correctly and returning correctly under R1–R4: it neither contradicts the general rule nor restates it as a redundant special case. This requirement governs the route and its return behavior only. The condition that fires it — recognizing a merged-pipeline change as new work — is an unchanged review-domain judgment and is not a new recognition trigger added by this change.

## Out of Scope

- **Run-time tracker metadata** (status, labels, assignee, version label, branch push). These are governed by the separate "Orchestrator updates during a run" project conventions, not the Managing Issues workflow, and are unchanged. The intent's phrase about routing every tracker operation through the Issues convention describes how the Managing Issues workflow itself behaves; it is not a directive to fold run-time metadata into that workflow.
- **New recognition triggers.** This change does not teach the orchestrator to proactively recognize new moments to spin off an issue (for example, a blocker that is separate work, or an unrelated change surfaced during a review). It governs only what happens once the orchestrator has decided to create or modify an issue.
- **No spawned-agent behavior changes.** Agents never touch the tracker; nothing in the autonomous or assisted phase files changes.
- **The missing `merge-pipeline.md` / `close-pipeline.md` files.** `work-on-an-issue.md` references these terminal-action files, but neither exists in the skill. This is a pre-existing structural gap unrelated to this change's goal — recorded here as a known gap, not addressed.

## Acceptance Criteria

These are behavioral and verifiable by reading the skill; none assert the sections, wording, or ordering of skill or agent files.

- **AC1.** Following the skill's reading paths, an orchestrator that decides mid-session (including mid-pipeline) to create or modify an issue is routed into the Managing Issues workflow — the create/modify operation goes through the capture Q&A and the Issues convention — rather than authoring the issue ad hoc. This holds for entry points beyond the single merged-pipeline case.
- **AC2.** The guarantee is not implemented as duplicated special-case instructions repeated across individual procedures; the previously-silent mid-session spots are covered by the general rule, not by individual patches. (Verifiable by confirming those spots were not separately patched.)
- **AC3.** Reading `manage-issues.md` as if entered mid-session, it does not hard-code a single next step: nothing in it forces the orchestrator to start fresh pipeline work on the just-created or just-modified issue, and nothing forces a return either — control goes back to the invoking situation, which decides. (For the merged-pipeline caller, proceeding toward pipeline work remains correct; for a mid-run caller, resuming the run is possible.)
- **AC4.** The merged-pipeline hand-off still routes correctly and returns correctly (its post-issue path stays valid) and reads consistently with the general rule, with no contradiction and no redundant restatement. Its triggering condition is unchanged.
- **AC5.** Run-time tracker metadata handling, the set of moments that trigger issue creation, the spawned-agent phase files, and the absent merge/close files are all unchanged.
- **AC6.** The change conforms to the project's skill-writing rules: minimalist, generic (no agentic-tool or issue-tracker-platform specifics), no duplication across reading paths, no unnecessary negative phrasing, and reuse of existing terms (for example "Issues convention", "Managing Issues workflow", "work on an issue").
