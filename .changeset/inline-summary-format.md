---
"@automattic/radical-pipelines": patch
---

Inline the per-phase summary format into the `build-reviewer` and `document-reviewer` profiles instead of holding it in a standalone `reference/summary-format.md` that the orchestrator resolved and passed in each reviewer's launch prompt. The reviewer is the only agent with the whole-phase view and already authors the summary, so the format now lives at its point of use in each profile and the orchestrator no longer couriers it.
