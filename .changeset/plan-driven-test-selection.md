---
"@automattic/radical-pipelines": minor
---

The code plan now owns test selection: the planning phase chooses the required test commands every writer must pass and lays out the end-to-end test plan as explicit flows traced to the spec's acceptance criteria. The code writer splits into a TDD writer that drives unit tests from each task and an e2e writer that automates the planned flows, dispatched by task type. Behavior verification moves to the reviewer, who exercises the integrated feature end-to-end once per batch.
