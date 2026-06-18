# Spec Review — APPROVED

Issue 122: Plan-driven test selection and reviewer-side behavior verification (BASE run, stacked on #121).

## Verdict

APPROVED. The spec-writer's revision (5ba952f) resolves the single blocking finding from spec-review-1-rejected.md and the advisory note, with no scope creep and no new inconsistencies.

## Findings resolved

- **(a) BLOCKING — README traceability.** R10 now names "the repository's human-facing agent roster in `README.md`" within its naming-consistency scope, so AC7's blanket no-`code-writer` clause traces to a requirement. Requirements and AC7 now agree that README's roster is in scope — matching the spec research's Q7 edit map. Resolved.
- **(b) ADVISORY — AC7 judgment clause.** AC7 now carries the illustrative distinction: a roster/role mention presenting `code-writer` as a current agent (e.g., README's shipped-agent roster) is a violation, while a purely illustrative example that does not present it as current is not. This correctly captures the incidental `doc-writer.md:64` example. Resolved.
- **(c) ADVISORY — path shorthand.** Explicitly optional and intentional at spec altitude; left as-is. The design phase owns literal paths.

## Confirmation against the research and prior review

The rest of the spec is unchanged from the version I reviewed last round and remains faithful:

- R1–R10 capture the intent's goal and the research's settled requirements at requirements altitude.
- The four fixed constraints (unit-test TDD with writers, required commands as a floor, evidence requirement intact-and-relocated, CI matrix at PR time) are present.
- Scope decisions intact: assisted phase-3 in scope; `.rp.md` self-edit recorded as an operational follow-up (Out of Scope), not an AC; unit-test selection left to TDD writers; CI matrix and evidence requirement untouched.
- Lockstep obligations captured: R8 (load.md gate-running enumeration ⇄ setup.md Agents field) and R3 (the "Do NOT plan tests" inversion across code-plan-writer.md, code-plan-reviewer.md, assisted-phases/3 - plan.md, with the "derived from browser verification" phrase removed).
- ACs 1–8 each trace to a requirement; AC7 now traces cleanly to R10.
- No design/implementation leaks.

All load-bearing claims about current (#121-stacked) file state were verified in the prior review round and hold.
