---
"@automattic/radical-pipelines": minor
---

A failed task report opens an investigation. While a challenge on an artifact is a failed task report or leads to one through its `origin` chain, `rp check` marks that artifact's converge and review-wave lines `(experiment)`, and their producers, reviewers, and helpers run under `Execution: experiment`. This applies in every phase. The producer establishes the failure's cause before its disposition: it reproduces the failure, checks the report's account against the raw evidence, and discriminates the candidate causes with experiments, handing whole investigations to helpers. Reviewers check that investigation and may run their own experiments on the failure. Experiment evidence supports only that failure's disposition. A failed report may carry the worker's observations toward the cause. Prompts are exactly their filled templates, and messages to agents carry facts and next steps, never judgment about the work.
