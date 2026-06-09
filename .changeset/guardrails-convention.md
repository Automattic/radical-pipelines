---
"@automattic/radical-pipelines": minor
---

Add the Guardrails convention — a project's named, mandatory verification gates declared once and run as exact commands judged by exit code. A guardrail is a `Name | Command | Phases` row in a new `## Guardrails` section of `.rp.md`, a sibling of `## Conventions`: tool-agnostic, mandatory within the phase(s) it lists, and passing only on a zero exit code. The convention loader (`load.md`) carries the canonical definition and loads the guardrails applicable to the phase being run, so the code and docs agents execute them as non-negotiable checks before completing their work, and setup gains an optional step to capture a project's gates. This repository dogfoods the convention with two gates: `npm test` (code phase) and `node scripts/validate-changesets.mjs` (code and docs phases).
