---
"@automattic/radical-pipelines": minor
---

Add a Guardrails convention: a project may now declare deterministic verification gates — each an exact command judged pass/fail solely by its exit code — that the code and doc phases must pass. Guardrails are optional and tool-agnostic: the conventions loader documents them, setup captures them per gate (name, exact command, applicable phase) and validates each command before writing, and the four phase agents read the guardrails applicable to their phase and run every one as mandatory. A declared command that cannot execute is a blocker; an absent or empty declaration runs nothing and never blocks or warns.
