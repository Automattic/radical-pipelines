# Docs Summary — Make guardrails prose

## What

The docs phase brought the root `README.md` into line with the redefined guardrail model. A single sentence in the `Configuration` section that characterized the optional `Guardrails` convention as "deterministic verification gates (exact commands judged pass/fail by exit code)" now reads: declaring "prose rules a project's running agents must satisfy, each a command guardrail (the agent runs a command and confirms the check it describes) or a judgment guardrail (the agent satisfies the rule by its own assessment)." No other documentation surface was changed.

## Why

The code phase redefined a guardrail from an exact command judged by exit code into a prose rule an agent must satisfy, expressible as a command guardrail or a judgment guardrail. The README was the only published documentation surface *about* the guardrail concept living outside the nine in-scope skill/agent files that still carried the old exit-code framing. Leaving it stale would tell a README reader that guardrails are exact commands judged by exit code — the exact characterization the change removes.

## How

One doc task edited `README.md`. The `Guardrails` clause in the `Configuration`-section convention sentence was reworded to the prose-rule definition and the two kinds, at the README's existing summary altitude. The two inline links (convention loader, setup conventions) and the enumeration of the other shared conventions in the same sentence were preserved unchanged. The later mention of `guardrails` as a named section of the committed `.rp.md` shared layout was verified to name the section (not the exit-code mechanism), so it remained accurate under the new model and was left untouched.

## Key decisions

- **Kept the summary at the model's altitude.** The README states only the definition and the two kinds — no field names, block shape, or fixed/scoped sub-distinction — so it introduces no detail beyond what `reference/guardrails.md` defines and won't drift as that file evolves.
- **Excluded surfaces recorded, not edited.** The doc plan deliberately swept and excluded the changelog (immutable release history, including the #118 entry that still describes the old model as it shipped), the marketing website (no guardrail characterization), `CONTRIBUTING.md` (its "gate" references are the CI Changeset Gate, unrelated), the scratch `pr-description.md`, and `.rp.md` (no guardrail characterization). The nine in-scope skill/agent files are the *code* of this change, covered by `code-plan.md`, not duplicated as docs here.

## Known limitations

- `CHANGELOG.md` retains the original #118 entry describing guardrails as "deterministic verification gates — each an exact command judged pass/fail solely by its exit code." This is intentional: released changelog entries are an immutable record of past releases and are not rewritten to reflect a later redefinition.
