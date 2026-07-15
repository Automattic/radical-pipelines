---
"@automattic/radical-pipelines": minor
---

BREAKING: Rename the plan producers — `build-plan-writer` → `build-planner` and `document-plan-writer` → `document-planner`. "Writer" now names one role across the pipeline: the task-scoped agents that write the shipped product (`build-writer-tdd`, `build-writer-e2e`, `document-writer`), while a planner plans the phase's work. Project conventions that name agents (such as agent-model tables) must rename these two entries.
