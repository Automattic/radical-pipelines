# Spec Review

## Verdict: approved

## Reviewer

Owner (assisted workflow)

## Notes

Owner reframed the work mid-Q&A: the originating issue is partly outdated. `.rp.md`
is restructured into `## Conventions` + `## Guardrails`; guardrails are a first-class
concept distinct from conventions, tool-agnostic, optional, and apply to the code
and/or docs phases. Behavior verification stays a separate evidence-based step (not a
guardrail). No Guardrails-section validator (prose only). Derived decisions
(guardrail entry = name + command + phase; behavior verification reframed to stand
alone; only verification-convention references change) were surfaced and approved.
