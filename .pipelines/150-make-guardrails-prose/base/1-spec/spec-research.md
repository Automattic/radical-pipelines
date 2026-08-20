# Spec Research: Make guardrails prose

# Make guardrails prose

> Source: GitHub issue [Automattic/radical-pipelines#150](https://github.com/Automattic/radical-pipelines/issues/150).
> This file is self-contained; agents do not need to open the source issue.

## Goal

Guardrails are prose. Every guardrail is expressed as prose, and the exit-code (`exit 0`) machinery is removed.

## Context

Passing prose rules to the agents is sometimes more useful than runnable commands. A concrete example from the Radical Pipelines project itself: adding guardrails for the build reviewer and the document reviewer with specific rules similar to those in `AGENTS.md`.

## Assumptions / directions to explore

- When a guardrail _is_ a command, express it as prose too — e.g. _"run this command and check that it doesn't fail: [command]"_.
- From the issue discussion: today the `agents:` field admits only `build-writer-tdd`, `build-writer-e2e`, `build-reviewer`, `document-writer`, `document-reviewer` — a restriction that makes sense while guardrails are exit-code commands. Once guardrails are prose, project-owned judgment rules (e.g. design-taste rules such as YAGNI or KISS) naturally target other agents too; the discussion proposed extending the audience to the spec and design-doc agents (lead and reviewer).
- From the owner, pre-pipeline: extend the allowed `agents:` audience to **all** pipeline agents, not only the spec and design-doc lead and reviewer.
- Open question from the owner: how far the removal goes is unresolved — whether command-backed guardrails survive as a distinct kind (possibly keeping the fixed/scoped `{scope}` machinery and its per-run fill lifecycle), or every guardrail folds into plain prose with no separate command field. To be settled in the spec phase.

## Q&A

### Q1: Does a guardrail keep a machine-readable command, or does every guardrail become a single prose rule with any command embedded in the prose?

Today's model (`reference/guardrails.md`): every gate is an exact command judged pass/fail by exit code; a gate is **fixed** or **scoped** (`{scope}` placeholder filled per run by the build/document plan, validated by the plan reviewers). Two futures are on the table:

- **(A) Single kind — pure prose.** The per-guardrail block has one `rule:` field; a command, when the rule rests on one, lives inside the prose ("run `npm test` and confirm it passes"). There is no machine-distinguished command field, so the `{scope}` fill lifecycle (plan `## Guardrail scopes` sections, planner fill step, plan-reviewer validation step) has no anchor and disappears; a rule scopes itself in prose ("run the tests covering what you touched") and the agent judges the scope.
- **(B) Two kinds.** A **command guardrail** keeps a structured command (still fixed or scoped, keeping the `{scope}` fill lifecycle); a **judgment guardrail** is a prose rule satisfied by the agent's own assessment. "Exit-code machinery removed" then means only that pass/fail becomes the agent confirming the check the prose describes, not a mechanical exit-code gate.

Owner counter-questions: if commands are removed, is it easy to simulate the scope mechanism with prose? And can planner-chosen scope be reproduced with no scope concept in the skill at all? → see Research: "Simulating scoped gates in prose" and "Reproducing planner-chosen scope with no scope concept in the skill".

**A:** **(A) — single kind, pure prose.** A guardrail is a prose rule with an audience; any command lives inside the prose. The skill drops the scope concept entirely: no `{scope}` placeholder, no `fill-guidance`, no fill lifecycle, no `## Guardrail scopes` plan sections, no plan-reviewer scope validation. A project that wants planner-chosen scope authors the choreography in its own rule (see Research), which the extended audience makes possible.

**Reasoning:** Most faithful reading of the goal ("expressed as prose", "machinery removed"); the research shows the machinery no longer buys capability, only cross-project standardization of a protocol projects can now author themselves; aligns with the skill's minimalism rules (a general mechanism — prose rules with audiences — covers the special case). The exit-code anchor's hardness survives as rule wording where a project wants it ("a non-zero exit is a rejection").

**Sources:** owner decision in assisted Q&A; `reference/guardrails.md`, `reference/conventions/passing.md`, `agents/build-planner.md`, `agents/build-plan-reviewer.md`, `agents/document-planner.md`, `agents/document-plan-reviewer.md` (current machinery surface).

### Q2: Does "all agents" mean all 17 agent profiles — researchers and consolidators included — or only the agents that produce or review committed artifacts?

The skill defines 17 spawnable profiles. The intent's audience direction says "all pipeline agents"; the edge cases are the two researchers (`spec-researcher`, `design-doc-researcher`), which produce no committed artifacts — a rule naming one would govern how it investigates and answers — and the two consolidators, which produce the consolidated artifacts in multilane runs.

**A:** All of them — and further: the skill imposes **no agent restriction anywhere**. The `agents:` field names one or more agents, full stop; the skill stops enumerating an allowed audience (today `reference/guardrails.md` whitelists five names in the block template and `conventions/passing.md` restricts the Guardrails field's recipients). Simplicity is the rationale: no list to maintain, no special cases.

### Q3: When a phase runs in assisted mode, do the guardrails naming that phase's agents apply to the orchestrator's work?

New intersection created by the audience extension. Assisted mode covers the spec and design-doc phases; the orchestrator produces the artifacts itself and spawns no agents, while guardrails are delivered at agent spawn via the Conventions block. Today this never collides because guardrails can only name build/document agents — phases that always run autonomously. Once a rule can name `spec-lead` or `spec-reviewer`, an assisted spec run either honors those rules (the orchestrator satisfies the rules naming the role it performs) or bypasses them (rules bind spawned agents only, so assisted work escapes the project's guardrails).

**A:** Option 1, with an owner gate: the rules naming the phase's agents apply to the orchestrator's assisted work, but the orchestrator surfaces them and asks the owner before executing them — the owner decides whether they run.

### Q4: Does setup still validate a rule's embedded command at capture time?

Today's setup (`conventions/setup.md`, Guardrails section) validates every captured command by running it — the bar is "it executed", not "exit 0" — with side-effect confirmation and an owner escape hatch; an unrunnable command is corrected or dropped before writing `.rp.md`. With rules as prose, a command is no longer a structured field, but a rule that embeds one can still be validated the same way at capture (run it once, confirm it executes). The alternative is dropping capture-time validation entirely — an unrunnable embedded command is then discovered mid-run by the first agent that tries it, as a blocker.

**A:** Yes — best-effort: when a captured rule embeds a command, setup attempts to validate it by running it once (same bar as today: it executed, any exit code; side-effect confirmation and the owner escape hatch stay). A rule with nothing runnable has nothing to validate.

### Q5: Is any backwards compatibility owed to the old `command:` block format?

Existing adopters carry `.rp.md` guardrail blocks in the old format (`command:` field, `{scope}` templates, `fill-guidance`). The skill's design rules exclude documenting transients, so the candidate positions are: no compatibility — the skill describes only the new format and adopters rewrite their blocks (this repo's own `.rp.md` gate is rewritten as part of this change) — or some accommodation in the skill.

**A:** None. The skill describes only the new format; adopters rewrite their guardrail blocks. This repo's own `.rp.md` gate is rewritten as part of this change, recorded as a breaking change per the repository's changeset conventions.

## Research

### Simulating scoped gates in prose

**Question.** Can prose replicate what the `{scope}` machinery does today?

**How the machinery works today** (`reference/guardrails.md`, `conventions/passing.md`, planner/plan-reviewer profiles): the owner captures a command template with a `{scope}` placeholder plus optional `fill-guidance`; the phase's planner chooses the scope value per run and records it in the plan's `## Guardrail scopes`; the plan reviewer executes the filled command to prove the runner resolves and judges the choice; the orchestrator substitutes the value and hands running agents an exact command — they have zero discretion.

**Prose equivalent.** The template and its fill-guidance fold into one rule: `command: npm test -- {scope}` + `fill-guidance: "the package the run touches"` becomes _"Run the unit tests of every package your work touches (`npm test -- <package>`) and confirm they pass."_ Expressing the scoping is trivial — the rule self-scopes.

**What changes.** The scope choice moves from plan time to run time, and from one recorded decision to each agent's own reading:

- No per-run recorded value → writers in the same run may resolve the scope differently; uniformity is no longer guaranteed by an artifact.
- No mechanical pre-validation → an unrunnable command shape is discovered by the first agent that tries it (blocker), not by the plan reviewer ahead of execution.
- The surviving backpressure is the reviewer: it holds the same rule and re-resolves the scope independently, so a writer's too-narrow reading surfaces at review.

**Usage evidence.** The two repos swept use only fixed commands — this repo's `.rp.md` declares a single gate (`tests`: `npm test`) and skillsmith's `.rp.md` declares `typecheck`, `lint`, `tests`, all literal commands (checked via `gh api repos/Automattic/skillsmith/contents/.rp.md`, 2026-07-18). The owner corrects the generalization: other repositories not swept here do use scoped gates, so the `{scope}` machinery has real users.

### Reproducing the planner-chosen scope over prose rules

**Question (owner).** If the command field is removed, can the scope mechanism be reproduced exactly as it works today — the scope chosen by the planner, not by each running agent?

**Answer: yes.** The fill lifecycle never depended on the `command:` field — it anchors on the `{scope}` placeholder and on instructions carried by the planner, plan-reviewer, and passing docs, all of which are executed by agents reading text, not by a shell harness. A prose rule can carry the same placeholder:

```markdown
### tests

- rule: Run `npm test -- {scope}` and confirm it passes.
- agents: build-writer-tdd, build-writer-e2e, build-reviewer
- fill-guidance: the package the run touches
```

Piece by piece:

- **Scoped-ness** = the rule's text contains `{scope}`. Fixed/scoped stops being a kind and becomes a property any rule may have.
- **`fill-guidance`** stays a separate optional field — justified by audience: it addresses the planner, while the rule addresses the running agents; folding it into the rule would send planner-directed text to runners.
- **Planner** — unchanged: receives the scoped rules ("Guardrail scopes to fill"), chooses each value, records it in the plan's `## Guardrail scopes`.
- **Orchestrator** — unchanged: substitutes the recorded value into the rule text (instead of into a command) before placing it in the Conventions block; running agents receive the resolved rule.
- **Plan reviewer** — bind and coverage checks unchanged. The execute-to-validate step survives wherever the filled rule embeds a command (run it and confirm the runner resolves); a scoped rule with no embedded command is validated by judgment instead.

**Net.** Removing the command field costs none of the plan-time scope machinery; the only step that weakens slightly is the plan reviewer's mechanical validation, which becomes conditional on the rule embedding a command.

### Reproducing planner-chosen scope with no scope concept in the skill

**Question (owner).** Sharper version of the above: can today's behavior — the scope chosen by the planner, recorded in the plan, validated by the plan reviewer, received resolved by the runners — be reproduced with prose alone, with the skill holding no scope concept at all (no `{scope}`, no fill lifecycle, no plan section, no fill-guidance)?

**Answer: yes, provided guardrails can name planners and plan reviewers.** Every step of today's lifecycle is an agent following instructions; those instructions can come from the project's rule text instead of the skill's grammar. A project that wants plan-time scope writes the choreography into one rule addressed to all the involved agents:

> "The build plan records, in a section named `Test scope`, the packages whose tests cover this run's changes [guidance on choosing them]. Writers and the build reviewer: run `npm test -- <packages>` for the packages that section names and confirm it passes. Plan reviewer: confirm the section exists, its choice covers the run, and the command it yields executes."

Delivered via `agents: build-planner, build-plan-reviewer, build-writer-tdd, build-writer-e2e, build-reviewer`, each agent receives the same rule and plays its part — the planner records the value per run, the plan reviewer validates it, the runners read the plan section the rule names. This depends on the audience extension the intent already carries: without planners and plan reviewers as admissible `agents:`, the rule cannot reach the agent that chooses the scope.

**What changes vs today:**

- **The protocol moves from skill grammar to project prose.** The skill loses the concept entirely; a project wanting plan-time scope authors a paragraph of choreography instead of a `{scope}` placeholder. Capability is preserved; *standardization* is the real cost — each project invents its own wording, and the skill no longer guarantees a uniform fill/validate protocol across projects.
- **The orchestrator resolves nothing.** Runners receive the unresolved rule and fetch the value by reading the plan section it names (one extra hop; precedent exists — `build-writer-e2e` already reads the plan's E2E section per its profile).
- **No skill-enforced bind/coverage checks** in the plan reviewer; the rule itself must tell the plan reviewer what to verify.
- Projects that don't need plan-time uniformity use the lighter pattern (self-scoping rule: "run the tests of what you touched"), with no protocol at all.

## Out of Scope

1. **Backwards compatibility with the old block format** — the skill describes only the new prose format; adopters rewrite their `command:`/`{scope}`/`fill-guidance` blocks (Q5).
2. **A skill-standardized protocol for planner-chosen scope** — the fill machinery is removed and no replacement convention is introduced; a project wanting plan-time scope authors the choreography in its own rule (Q1; Research: "Reproducing planner-chosen scope with no scope concept in the skill").
3. **Validation of `agents:` values** — the skill enumerates no allowed audience and validates none; a name that matches no spawned agent simply never has its rule delivered (Q2).

## Consolidated Requirements

1. A guardrail is a named prose rule with an audience: its `.rp.md` block is `### <name>`, a `rule:` body, and an `agents:` list (Q1).
2. A rule that rests on a command embeds it in the prose — "run this command and confirm the check it describes holds"; there is no structured command field (intent Goal; Q1).
3. The skill carries no scope concept: no `{scope}` placeholder, no `fill-guidance`, no fill lifecycle, no `## Guardrail scopes` plan sections, no plan-reviewer scope-validation step, no "Guardrail scopes to fill" passing field, and no pass/fail-by-exit-code framing anywhere (Q1).
4. `agents:` names one or more agents; the skill enumerates no allowed audience and imposes no restriction (Q2).
5. Every spawned agent named by a rule receives it in its Conventions block's Guardrails field and must satisfy it in the work it produces: producing agents satisfy their rules before committing, and reviewing agents record how each rule naming them was evaluated — an unsatisfied rule is a rejection finding (Q1; Research: current machinery surface).
6. When a phase runs in assisted mode, the rules naming that phase's agents apply to the orchestrator's work; the orchestrator surfaces them and asks the owner before executing them (Q3).
7. Setup captures each guardrail as its prose block; when the rule embeds a command, setup attempts validation by running it once — the bar is "it executed", any exit code — keeping the side-effect confirmation and the owner escape hatch (Q4).
8. The Guardrails convention stays committed-only — never taken from `.rp.local.md` (unchanged; current `conventions/load.md`).
9. Every skill and documentation surface that describes guardrails describes only the prose model, and the repository's own `.rp.md` guardrail block is rewritten as prose; the change is recorded as breaking per the repository's changeset conventions (Q5).
