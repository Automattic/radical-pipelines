# Orchestrator-scoped guardrails

## Origin

Owner request made directly to the orchestrator after the completed `review-1-agent-scoped-guardrails` run, and carried out in assisted mode as three commits on the pipeline branch (`cac2d25`, `004f797`, `a0e3fd9` — convenience reference only; this section is self-contained). The owner's request, faithfully paraphrased:

> Review-1 made each agent read `.rp.md` and pick its own guardrails — the gates naming it plus the gates naming no agents — with "names no agents" meaning every gate-running agent. Move that scoping to the orchestrator: it already passes each agent a conventions block at spawn, so let it pass each agent only the gates that name it. Then agents stop self-selecting, the "names no agents" wildcard is no longer needed (every gate just names its agents), and the whole guardrails explainer can leave `load.md`. While there, gate the reviewers' guardrails on their judgment: a reviewer that already rejects on the review or the verification shouldn't spend time running gates — gates should only gate approval. Drop the "selection" vocabulary and normalize the wording.

## Goal

The orchestrator owns guardrail scoping: it passes each spawned agent only the gates that name it, so agents run the gates handed to them instead of selecting their own. Every gate names at least one agent, the "names no agents = every agent" wildcard is gone, and the reviewers' gates run only to confirm an approval — a reject skips them.

## Assumptions / directions to explore

Open directions from the owner–orchestrator discussion; later phases may confirm or revise them:

- The orchestrator already injects a per-agent conventions block at spawn (Artifact folder, Commit format), so adding a **Guardrails** field carrying that agent's gates is the natural home — no new plumbing.
- With scoping done by the orchestrator and each agent file already carrying its own run-behavior, `load.md`'s `## Guardrails` section (vocabulary, gate-running-agent enumeration, selection rule, writer/reviewer archetypes) is fully redundant and can be deleted, leaving only the loader-table row and the committed-only line.
- Judgment-gating the reviewers means the expensive gates run at most once, on the approving iteration; a rejecting iteration records every gate as `skipped` so the skip reads as deliberate, not forgotten. This supersedes review-1's fail-fast-after-a-rejection-finding permission rather than extending it.
- Likely touches: `skills/radical-pipelines/reference/autonomous-workflow.md` (the spawn conventions block), `skills/radical-pipelines/reference/conventions/load.md` (delete the explainer), `skills/radical-pipelines/reference/conventions/setup.md` (capture), and the four gate-running agent files (`agents/code-writer.md`, `agents/code-reviewer.md`, `agents/doc-writer.md`, `agents/doc-reviewer.md`) — seven files, one more than review-1, the extra being `autonomous-workflow.md`.
