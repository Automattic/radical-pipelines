---
"@automattic/radical-pipelines": patch
---

Define a `blocked` task report as the environment failing the worker, shown by the identical failure reproducing on the commit the attempt started from, so a worker that hits an environmental failure after observing the product reports `blocked` instead of `failed`. Workers and reviewers separate environmental failures from the change's by that one reproduction criterion: an environmental one is `blocked` for a worker and a blocker for a reviewer, any other is work or a finding. The orchestrator repairs whatever a blocker or a `blocked` report names — materials, seat, or environment — before re-dispatching.
