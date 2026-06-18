# Docs Review — Approved

**Batch:** Task 1 (the only task in `doc-plan.md`).
**Base ref:** `5bc233540d565e9b02fb6eb650454d74ca155fa8` → HEAD.
**Docs diff scope:** `README.md` only (the skill/agent edits from phase 4 are code, not docs).

## Verdict

**Approved.** Task 1 meets its per-task Acceptance in full.

## Checks

| Check | Guardrail | Result |
| ----- | --------- | ------ |
| Step-3 accuracy spot-check: README Configuration-section guardrail sentence vs. shipped `skills/radical-pipelines/reference/guardrails.md` | None (this project defines no Guardrails convention) | satisfied |

## Task 1 — Update the README's guardrail characterization in the Configuration section

Verified against the per-task Acceptance:

- **Prose rules, two kinds.** The reworded sentence (`README.md:147`) now reads: "an optional `Guardrails` convention declaring prose rules a project's running agents must satisfy, each a command guardrail (the agent runs a command and confirms the check it describes) or a judgment guardrail (the agent satisfies the rule by its own assessment)." A reader learns guardrails are prose rules, expressible as a command guardrail or a judgment guardrail. Satisfied.
- **No exit-code / deterministic-gate / exact-command framing.** The old parenthetical — "deterministic verification gates (exact commands judged pass/fail by exit code)" — is fully removed. The new sentence carries no "exit 0", "exit code", "exits non-zero", "judged pass/fail by exit code", "deterministic verification gate", or "exact command" wording. Satisfied.
- **Links preserved.** Both inline links — `[convention loader]` and `[setup conventions]` — are intact and unchanged. Satisfied.
- **Other-conventions enumeration unchanged.** The shared-convention list ("task tracking, pipeline slug format, artifact folder location, commit rules") and the rest of the paragraph (Claude Code conventions, Pi conventions, the `Agent models` block) are byte-identical to the base. The only edit is the `Guardrails` characterization. Satisfied.
- **Stays at the model's altitude.** The summary introduces no detail beyond `guardrails.md`: no field names (`rule:`, `agents:`, `{scope}`, `fill-guidance`), no per-guardrail block shape, no fixed/scoped sub-distinction. It states the definition and the two kinds only — strictly below the detail the model file defines. Satisfied.
- **Later `.rp.md` mention accurate.** `README.md:159` lists `guardrails` only as a named section of the committed `.rp.md` shared layout ("issue tracking, pipeline slug format, artifact folder, commit format, Linear updates, push behavior, guardrails"). It names the section, not the exit-code mechanism, so it remains accurate under the redefined model and consistent with the rewritten characterization. Left unchanged, correctly. Satisfied.

### Step-3 accuracy spot-check

The README sentence is a faithful paraphrase of the canonical model in `skills/radical-pipelines/reference/guardrails.md`:

- "A guardrail is a prose rule an agent must satisfy" → README "prose rules a project's running agents must satisfy". Accurate.
- "command guardrail — its body tells the agent to run a command and confirm the check it describes is satisfied" → README "a command guardrail (the agent runs a command and confirms the check it describes)". Accurate paraphrase.
- "judgment guardrail — a prose rule the named agent satisfies by its own assessment, with no command to run" → README "a judgment guardrail (the agent satisfies the rule by its own assessment)". Accurate.

No claim in the README sentence overshoots or contradicts the model file.

## Sweep for other stale guardrail framing

Swept `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `website/index.html`, and `.rp.md` for exit-code / deterministic-gate framing. The only remaining hit is `CHANGELOG.md:30` (the #118 release entry), which the doc plan deliberately and correctly excludes as an immutable record of a past release. No other README/doc surface carries stale guardrail framing that the plan should have caught.

## Step 4 — Guardrails

This project defines no Guardrails convention, so no scoped guardrails were passed to the docs phase. The step-3 accuracy spot-check is the only evidence. Recorded as None in the Checks table.
