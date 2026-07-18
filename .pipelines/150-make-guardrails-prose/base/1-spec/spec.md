# Spec: Make guardrails prose

## Overview

Guardrails are today defined as exact commands judged pass/fail by exit code, restricted to five build/document agents, with a fixed/scoped kind split and a per-run `{scope}` fill lifecycle spanning the plans, the planners, and the plan reviewers. This change redefines a guardrail as a **prose rule with an audience**: a named rule the agents it names must satisfy. Commands survive only embedded in prose ("run this command and confirm it passes"), the exit-code and scope machinery is removed entirely, and the audience becomes unrestricted — any agent can be named. Projects that relied on the scope machinery express the same choreography in their rules' prose.

## Requirements

1. **A guardrail is a named prose rule with an audience.** Its `.rp.md` block consists of a `### <name>` heading, a `rule:` body, and an `agents:` list. No other field exists.
2. **Commands live inside the prose.** A rule that rests on a command embeds it in the rule body — e.g. "run `npm test` and confirm it passes". There is no structured command field.
3. **No scope concept in the skill.** The skill contains no `{scope}` placeholder, no `fill-guidance` field, no fill lifecycle, no `## Guardrail scopes` section in the build or document plan templates, no scope-validation step in the plan reviewers, no "Guardrail scopes to fill" field in the conventions passed to agents, and no pass/fail-by-exit-code framing anywhere.
4. **Unrestricted audience.** `agents:` names one or more agents. The skill enumerates no allowed audience and imposes no restriction on which agents a rule may name.
5. **Delivery and satisfaction.** Each spawned agent receives, in its `## Conventions` block's **Guardrails** field, the rules naming it, and must satisfy every one in the work it produces: a producing agent satisfies its rules before committing; a reviewing agent records how each rule naming it was evaluated, and an unsatisfied rule is a rejection finding. An agent named by no rule receives no Guardrails field and proceeds without comment.
6. **Assisted mode honors the rules.** When a phase runs in assisted mode, the rules naming that phase's agents apply to the orchestrator's own work; the orchestrator surfaces them and asks the owner before executing them.
7. **Setup captures prose and validates best-effort.** Setup captures each guardrail as its prose block; when the rule embeds a command, setup attempts to validate it by running it once — the bar is "it executed", any exit code — keeping today's side-effect confirmation and owner escape hatch. A rule with nothing runnable has nothing to validate.
8. **Committed-only, unchanged.** The Guardrails convention is never taken from `.rp.local.md`.
9. **Coherent surfaces.** Every skill and documentation surface that describes guardrails — `reference/guardrails.md`, the conventions docs (`load.md`, `setup.md`, `passing.md`), the agent profiles, the plan templates, `GLOSSARY.md`, `README.md` — describes only the prose model. The repository's own `.rp.md` guardrail block is rewritten as prose. The change is recorded as breaking per the repository's changeset conventions.

## Out of Scope

- **Backwards compatibility with the old block format.** The skill describes only the new format; adopters rewrite their `command:`/`{scope}`/`fill-guidance` blocks.
- **A skill-standardized protocol for planner-chosen scope.** No replacement convention is introduced; a project wanting plan-time scope authors the choreography in its own rule's prose.
- **Validation of `agents:` values.** The skill validates no names; a name matching no spawned agent simply never has its rule delivered.

## Acceptance Criteria

- Given a project's `.rp.md`, when a guardrail is captured, then its block contains exactly a name, a `rule:` body, and an `agents:` list — and no `command:`, `fill-guidance:`, or `{scope}`.
- Given an agent named by N ≥ 1 rules, when the orchestrator spawns it, then its `## Conventions` block's Guardrails field carries those N rules; given an agent named by none, then the field is omitted and the agent proceeds without warning.
- Given a rule whose `agents:` names any agent profile, when that agent is spawned, then the rule is delivered — no audience restriction applies.
- Given a producing agent with a rule whose embedded command fails, when it reaches its commit step, then it does not commit until the rule is satisfied.
- Given a reviewing agent with at least one unsatisfied rule, when it writes its review, then the verdict is a rejection and the review records the outcome of every rule naming it.
- Given an assisted-mode phase in a project whose rules name that phase's agents, when the orchestrator is about to execute those rules, then it asks the owner first and proceeds only as the owner directs.
- Given setup capturing a rule that embeds a command, when the block is written, then the command was run once and executed (any exit code), or the owner explicitly kept it via the escape hatch.
- Given the skill tree and the repository docs, when searched for `{scope}`, `fill-guidance`, `Guardrail scopes`, or exit-code pass/fail framing, then no match remains outside pipeline artifacts.
