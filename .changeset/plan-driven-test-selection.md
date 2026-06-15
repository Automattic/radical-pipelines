---
"@automattic/radical-pipelines": minor
---

Test selection is now a code-planning duty: the code plan sets a required-test-commands floor and turns the spec's acceptance criteria and edge cases into an explicit e2e test plan, so the suite a change must pass is decided up front rather than per writer. Behavior verification moves to the code-reviewer, which re-drives the planned e2e flows when reviewing a batch. The single `code-writer` agent is split into `code-writer-tdd` and `code-writer-e2e`, dispatched by a task's `Type`, so each task runs the writer suited to its work.
