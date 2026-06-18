# Spec: Make guardrails prose

## Overview

In the Radical Pipelines skill, a guardrail is currently defined as an exact command judged pass/fail by exit code: a deterministic verification gate. This framing limits guardrails to runnable commands and forces every behavior that consumes a guardrail — writers gating their commits, reviewers recording results, setup validating capture — to speak in exit-code terms. But some of the most useful rules a project wants to enforce are not commands at all. The motivating case is reviewer rules like those in this project's own `AGENTS.md` ("the skill must be written in a minimalist way…", "must not contain negative phrases…", "is prose, not software"), which an agent satisfies by judgment, not by running anything.

This change redefines a guardrail as a **prose rule** an agent must satisfy, and removes the exit-code machinery. Two kinds of guardrail coexist under one prose representation: a **command guardrail**, whose prose tells the agent to run a command and confirm its check is satisfied, and a **judgment guardrail**, a prose rule the named agent satisfies by its own assessment with no command to run. The binary approve/reject review outcome and the per-pipeline command-scoping capability (the `{scope}` fill lifecycle) are preserved unchanged; only the exit-code framing is stripped, and the command-presupposing shapes are broadened so judgment guardrails fit. The subject of this change is the skill and agent profiles themselves — not the addition of any concrete guardrail to a project.

## Requirements

### Guardrail definition and kinds

1. The skill defines a guardrail as a prose rule an agent must satisfy. The definition contains no exit-code framing (no "exact command judged pass/fail by exit code").
2. Two kinds of guardrail are expressible:
   - a **command guardrail**, whose prose tells the agent to run a command and confirm the check it describes is satisfied (e.g. "run this command and check that it doesn't fail: [command]");
   - a **judgment guardrail**, a prose rule the named agent satisfies by its own assessment, with no command to run (e.g. a reviewer rule like those in the project's `AGENTS.md`).
3. An owner can author a judgment guardrail whose body is the rule prose alone, and the system accepts it without requiring a command.

### The per-gate block in the project's convention file

4. A single, unified per-gate block shape expresses both kinds: a name, the guardrail's prose body, the agents it applies to, and an optional fill-guidance. A judgment guardrail omits the command-only fields (the `{scope}` placeholder and fill-guidance), the way a fixed command guardrail already omits fill-guidance.
5. The `agents:` field continues to determine which of the five guardrail-running agents (code-writer-tdd, code-writer-e2e, code-reviewer, doc-writer, doc-reviewer) a guardrail applies to. An owner can confine a judgment guardrail to reviewers (e.g. code-reviewer, doc-reviewer) so writers never receive it.

### Per-pipeline command scoping is preserved

6. The fixed-vs-scoped distinction and the `{scope}` fill lifecycle remain in force for command guardrails: a scoped command guardrail still carries a `{scope}` placeholder; the planning agent of the phase whose agents run it still chooses the `{scope}` value and records it in the plan's `## Guardrail scopes` section; and the orchestrator still resolves it before passing the guardrail to the agent. None of this carries exit-code framing. The fixed/scoped distinction is a property of command guardrails only — a judgment guardrail is neither fixed nor scoped.

### Reviewer behavior

7. A reviewer records a per-guardrail result for both kinds. A command guardrail's result comes from running its command and seeing whether the check it describes is satisfied; a judgment guardrail's result comes from the reviewer's own assessment of whether the rule is satisfied. The reviewer's result-recording shape broadens so that a guardrail with no command produces a valid result.
8. A guardrail the reviewer finds unsatisfied — a command guardrail whose check fails, or a judgment guardrail the reviewer assesses as violated — is a rejection finding that drives the verdict to reject, through the existing must-fix review machinery. The binary approve/reject outcome is preserved.
9. The reviewer's gate-running step, its skipped-result semantics, and the spawn-time guardrail block read as prose covering both kinds, with no "exact command", "exits non-zero", or "pass/fail by exit code" framing.

### Writer behavior

10. A writer runs each command guardrail it receives and confirms the check it describes is satisfied before committing, expressed in prose without exit-code vocabulary. The distinction between a guardrail that **cannot run at all** (e.g. a missing tool or renamed script — a blocker) and one that **runs but is not satisfied** (work to fix, not a blocker) is preserved by meaning, stated without "exits non-zero".
11. The no-guardrails path is unchanged: with no guardrails declared, the writer or reviewer proceeds on its other validation; this is not a blocker and warrants no warning.

### Setup / capture

12. Setup captures guardrails as prose. For a command guardrail, the owner is still asked to confirm the command runs at capture time — it is accepted if it runs, even when its check currently fails, and rejected only if it cannot run — stated without "exit 0" or "exit code" vocabulary. For a judgment guardrail there is no command to run, so this run-time validation does not apply, matching how other prose conventions (e.g. commit format) are captured verbatim and not validated.

### Exit-code framing removed everywhere

13. No exit-code framing ("exit 0", "exit code", "exits non-zero", "judged pass/fail by exit code") remains anywhere guardrails are defined, captured, passed, run, or reviewed — across the guardrails reference, the convention loader, the setup and passing convention files, the autonomous-workflow spawn block, the assisted plan phase, the two code writers, the doc writer, and the two reviewers. Where the underlying meaning is load-bearing — notably setup's acceptance of a command that runs even though its check currently fails, and the reviewer/writer "the command ran but the check it describes isn't satisfied" outcome — the meaning is preserved while the exit-code words are removed.

### Constraints the change must honor

14. The change keeps the skill minimalist and generic: no new structure beyond what both kinds genuinely need (the one unified block and the existing `agents:` field); no tool-specific or issue-tracker-specific mentions; no negative phrasing unless strictly necessary; and shared instructions stated once rather than duplicated across reading paths. The skill remains prose, not software — no structural tests assert the content, sections, wording, or ordering of skill or agent files.

## Out of Scope

- **The `{scope}` fill lifecycle and `## Guardrail scopes` plan sections.** These, together with the plan-reviewer and assisted-phase "did the command's runner resolve and terminate?" validation, are execution checks, not exit-code checks. They are preserved, not removed.
- **The binary approve/reject verdict and the must-fix review model.** Only the per-guardrail fail *source* broadens (a judgment guardrail can fail by assessment); the verdict machinery is unchanged.
- **The set of agents and the six-phase pipeline structure.** Unchanged.
- **The setup flow for non-guardrail conventions** (artifact folder, commit format, issues, worktrees, branch names, etc.). Unchanged — only the guardrails portion of setup is affected.
- **Populating any project's own convention file with concrete guardrails.** Adding reviewer or writer guardrails to this project is the owner's motivating use case, but it is enabled by this change, not part of it. This change makes such authoring possible; it does not itself author any guardrail.

## Acceptance Criteria

- Given the guardrails reference, when an owner reads the guardrail definition, then it describes a guardrail as a prose rule an agent must satisfy and contains no exit-code framing.
- Given an owner authoring a guardrail, when the guardrail's prose tells an agent to run a command and confirm its check is satisfied, then it is accepted as a command guardrail.
- Given an owner authoring a guardrail, when the guardrail's body is rule prose with no command, then it is accepted as a judgment guardrail without requiring a command.
- Given the per-gate block shape, when an owner authors a judgment guardrail, then the same unified block expresses it by carrying a name, the rule prose, and the applicable agents, while omitting the `{scope}` and fill-guidance fields.
- Given a judgment guardrail whose `agents:` field names only the reviewers, when the orchestrator spawns a writer, then that guardrail is not placed in the writer's prompt.
- Given a scoped command guardrail, when its phase's plan is produced, then the planning agent chooses the `{scope}` value and records it in the plan's `## Guardrail scopes` section, and the orchestrator resolves it before passing the guardrail — with no exit-code framing anywhere in that lifecycle.
- Given a judgment guardrail, when an owner inspects it, then it is neither fixed nor scoped and carries no `{scope}` placeholder.
- Given a reviewer that received a command guardrail, when it reviews, then it records a per-guardrail result obtained by running the command and checking whether the check it describes is satisfied.
- Given a reviewer that received a judgment guardrail, when it reviews, then it records a per-guardrail result obtained by its own assessment of whether the rule is satisfied, and a guardrail with no command still produces a valid result.
- Given a guardrail the reviewer finds unsatisfied (a command guardrail whose check fails or a judgment guardrail assessed as violated), when the reviewer forms its verdict, then that finding is must-fix and drives the verdict to reject.
- Given a writer that received a command guardrail, when the command cannot run at all (e.g. a missing tool or renamed script), then the writer treats it as a blocker; and when the command runs but the check it describes is not satisfied, then the writer treats it as work to fix and not a blocker — both expressed without exit-code vocabulary.
- Given a project with no guardrails declared, when a writer or reviewer runs, then it proceeds on its other validation without raising a blocker or a warning.
- Given setup capturing a command guardrail, when the owner runs the command at capture time, then a command that runs is accepted even if its check currently fails, and a command that cannot run is rejected — described without "exit 0" or "exit code" vocabulary.
- Given setup capturing a judgment guardrail, when there is no command to run, then the run-time validation does not apply and the rule is captured verbatim.
- Given the full set of guardrail-related files (the guardrails reference, the convention loader, setup, passing, the autonomous-workflow spawn block, the assisted plan phase, the two code writers, the doc writer, and the two reviewers), when an owner reads them, then no exit-code framing ("exit 0", "exit code", "exits non-zero", "judged pass/fail by exit code") remains, while every load-bearing meaning (accepting a runnable-but-currently-failing command; "the command ran but the check isn't satisfied") is preserved.
- Given the changed skill, when it is reviewed against the project's authoring rules, then it introduces no new block structure beyond the unified block and the existing `agents:` field, contains no tool-specific or issue-tracker-specific mentions, adds no negative phrasing unless strictly necessary, states shared instructions once rather than duplicating them across reading paths, and adds no structural tests asserting the content of skill or agent files.
