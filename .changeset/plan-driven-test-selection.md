---
"@automattic/radical-pipelines": minor
---

A guardrail gate is now either fixed or scoped: a fixed gate is a literal command run as-is, while a scoped gate carries a `{scope}` placeholder filled per pipeline by the plan of the phase whose agents run the gate — applying the same way to the code and docs phases. Test selection is a planning duty: the plan turns the spec's acceptance criteria and edge cases into an explicit e2e test plan — so the suite a change must pass is decided up front rather than per writer. Behavior verification moves to the code-reviewer, which re-drives the planned e2e flows when reviewing a batch. The single `code-writer` agent is split into `code-writer-tdd` and `code-writer-e2e`, dispatched by a task's `Type`, so each task runs the writer suited to its work.
