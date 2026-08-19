---
"@automattic/radical-pipelines": minor
---

Route no-behavior changes to a dedicated `edit` writer instead of forcing tests on them. The build plan's `Type` field gains `edit` for changes with no behavior to test (prose-in-code, deletions, type-only, config, mechanical refactors), executed by the new `build-writer-edit`: it applies the change, verifies acceptance by inspecting the changed files, and proves correctness through the guardrail gates alone — writing no tests. The `Type` is a reviewed claim: the `build-plan-reviewer` rejects a `tdd`/`e2e` task whose acceptance asserts no observable behavior change and an `edit` task whose changes imply one, and the `build-reviewer` flags an `edit` task whose diff adds tests or changes observable behavior.
