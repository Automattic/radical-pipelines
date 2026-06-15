# Plan-completed guardrail commands for the feature being worked on

## Origin

Owner request made directly to the orchestrator after the completed `base` run of
the #122 v2 pipeline (GitHub issue #122 — convenience reference only; this section
is self-contained). The owner's request, faithfully paraphrased:

> The v2 writers run "two command sets before you commit: every gate in the
> guardrails convention the orchestrator passes, AND every command in the
> required-test-commands floor from `code-plan.md`." These are treated as two
> different things, but they are not. The required-test-commands are not a separate
> floor stacked on top of the guardrails — they are commands that *complete* the
> guardrails for the specific pipeline and the feature/bug being worked on.
>
> This is not something every project needs — it is a possibility we provide for
> large projects. Example: in a large project `npm test` can take half an hour. Such
> a project may want the full `npm test` to run once, on the code-reviewer, while the
> writers run only the tests for the feature in question on each commit. So the setup
> should offer the option to scope some commands this way. Exactly how a scoped gate
> runs — which end runs the full command and which runs the feature command — is the
> owner's choice at setup, not a fixed rule. The unanswered question is *who decides
> which tests are the feature's tests?* — and the answer is the code-plan-writer, per
> pipeline, from the spec and design. So when that option is chosen, the actual
> feature-specific command is decided in the code-plan. The separate "floor" framing
> goes away, and the way the plan records these commands has to be reformulated to be
> the per-pipeline completion of the guardrails.

## Goal

Setup lets the owner mark a guardrail gate as completed per pipeline, for the cases
(large/slow projects) that need it: the gate's command is not fully fixed at setup but
finished by the code-plan-writer for the specific feature/bug. The owner decides at
setup how such a gate runs — for example, writers running the plan-supplied
feature-scoped command on each commit while the code-reviewer runs the full command
once. When a gate is marked this way, the code-plan-writer supplies the
pipeline-specific commands that complete it. Gates not marked keep today's behavior,
running as written wherever they are named.

## Constraints

- The default is unchanged: a project or gate that does not opt into per-pipeline
  completion behaves exactly as it does today. This is an opt-in capability for the
  projects that need it, not a new universal rule.
- How a marked gate's ends run (full vs. feature-scoped, and on which agents) is the
  owner's decision at setup — not a fixed reviewer-runs-full / writer-runs-scoped law.
- When a gate is marked, the selection authority for the feature command is the
  code-plan-writer — not the owner at setup, not the writer by judgment.
- The "a floor … on top of project guardrails" framing is removed. The plan does not
  carry a separate command set; it carries the commands that complete the declared
  guardrails for this pipeline. The `code-plan.md` section that records them is
  reformulated accordingly, and the writers run one unified set of gates, not two.
- The agent's interface stays a single resolved list of gates handed to it by the
  orchestrator. An agent does not merge a conventions source with a plan source to
  learn its commands; whatever resolution is needed happens before the agent is spawned.

## Assumptions / directions to explore

Open directions from the owner–orchestrator discussion; later phases may confirm or
revise them:

- How the resolved command reaches the agent. Today the orchestrator passes each agent
  its gates in the spawn `## Conventions` block's **Guardrails:** field (name + exact
  command), sourced from `.rp.md` (`reference/autonomous-workflow.md`). For a
  plan-completed gate the command lives in `code-plan.md`. Consistent with the
  orchestrator already owning guardrail scoping (#121 review-2), the natural resolution
  is: in the code phase the orchestrator reads `code-plan.md`, resolves each marked gate
  to its feature command, and passes the fully-resolved gate list in the same
  **Guardrails:** field — so the agent receives one complete list through one channel.
  This would remove the writers' "read the Required test commands section" step; they
  run exactly the gates handed to them. Phases 1–3 should confirm or revise this.
- The conflation lives in connected places that should move together: the writers'
  "Run the guardrails" step (`agents/code-writer-tdd.md`, `agents/code-writer-e2e.md`)
  phrased as two additive sets; the `## Required test commands` section of
  `code-plan.md` framed as a floor (`agents/code-plan-writer.md`,
  `agents/code-plan-reviewer.md`); and `setup.md` (the "scope the writers' gates to the
  feature" reminder), which gestures at scoping writer gates but offers no mechanism and
  wrongly implies the owner can name the feature scope.
- Setup (`reference/conventions/setup.md`) needs a per-gate option to mark a gate as
  plan-completed, and the guardrails model (`reference/conventions/load.md`) needs to
  represent that mark, so the orchestrator knows which gate commands come from
  `code-plan.md` rather than `.rp.md`.
- The `code-plan.md` test-command section needs a new shape: it lists the commands that
  complete the marked guardrails for this feature/bug, replacing the standalone
  "Required test commands" floor.
- For a project with no marked gates (as this repo's own `.rp.md`), the plan supplies
  nothing and that section is empty or absent.
- The e2e test plan section of `code-plan.md` is a separate concern from this change
  and is not in scope for this review.
