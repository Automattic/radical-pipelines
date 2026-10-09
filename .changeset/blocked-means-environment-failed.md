---
"@automattic/radical-pipelines": patch
---

Define a `blocked` task report as a blocker raised after the worker's first write: something it was given — its materials, seat, or environment, rather than anything on its branch — failed it, and the report names what failed with the evidence locating it. A worker whose environment fails after it observed the product now reports `blocked` instead of `failed`. Workers and reviewers separate such failures from their branch's by that one criterion: a failure the evidence locates in what they were given is `blocked` or a blocker; any other is work or a finding. The orchestrator repairs what a blocker or a `blocked` report names before re-dispatching.
