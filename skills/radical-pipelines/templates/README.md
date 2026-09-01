# Prompt templates

One template per agent profile, paired 1:1 with `agents/`. The orchestrator dispatches an agent by filling its template; the filled prompt is everything the agent knows beyond its profile.

Rules:

- Headings reach the agent verbatim — profiles reference them by name (**Mode**, **Materials**, **Guardrails**, …). A term exists for an agent only if a prompt heading defines it.
- Fill every slot; include only the Materials block of the selected mode.
- The orchestrator computes derived values (output paths, lane ids, iteration numbers); agents never derive them.

> Phase 4 (document) templates pending. Design record: [#273](https://github.com/Automattic/radical-pipelines/issues/273).
