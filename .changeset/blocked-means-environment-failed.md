---
"@automattic/radical-pipelines": patch
---

Define a `blocked` task report as a blocker raised after the worker's first write — malformed materials, an unreadable input, or a broken seat or environment, with the evidence locating the failure there — so a worker whose environment fails after it observed the product reports `blocked` instead of `failed`. Every profile states the blocker in those terms; any other failure is work for a worker and a finding for a reviewer. The orchestrator repairs what a blocker or a `blocked` report names before re-dispatching.
