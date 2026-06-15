# Agent-scoped guardrails

## Origin

Owner request made directly to the orchestrator after inspecting the completed `base` run (the run under review; its pull request is https://github.com/Automattic/radical-pipelines/pull/124 — convenience link only, this section is self-contained). The owner's request, faithfully paraphrased:

> The base run added a `level` field with `writer` and `reviewer` values. It would be more flexible to scope by agent name instead — `agent` rather than `level` — deciding which guardrails each agent runs. That way it also works for docs and for future agents, like dedicated end-to-end test agents. And since guardrails would name their agents, the `phase` field becomes a bit redundant and could be deleted.

## Goal

A guardrail declares which agents run it: the base run's two scoping dimensions (`phase` + `level`) are replaced by a single agent-name dimension, so any gate-running agent — current or future, code or docs — can be given its own gate selection.

## Assumptions / directions to explore

Open directions from the owner–orchestrator discussion; later phases may confirm or revise them:

- A gate that names no agents applies to every gate-running agent (`code-writer`, `code-reviewer`, `doc-writer`, `doc-reviewer`) — the natural successor to "no level = both roles".
- `phase` is deleted outright rather than kept as a parallel dimension or compatibility sugar; the base run's backward-compatibility constraint on phase-scoped declarations is relaxed, on the belief that no deployed `.rp.md` declares guardrails yet.
- The reviewer fail-fast permission and approving-iteration guarantee generalize to reviewer-type agents; writer-type agents keep all-selected-gates-pass-before-commit. How an arbitrary future agent maps to one of these behaviors needs a rule.
- Likely touches: `skills/radical-pipelines/reference/conventions/load.md` (definition + selection rule), `skills/radical-pipelines/reference/conventions/setup.md` (capture), and the four gate-running agent files (`agents/code-writer.md`, `agents/code-reviewer.md`, `agents/doc-writer.md`, `agents/doc-reviewer.md`).
