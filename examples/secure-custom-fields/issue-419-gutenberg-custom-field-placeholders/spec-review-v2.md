Decision: DENY

Why
- This revision resolves nearly all of the implementation-blocking ambiguities from v1. It now makes explicit decisions on render scope, unsupported contexts, exact-token matching, supported block types, HTML handling, and observability. The spec is much closer to implementation-ready.
- However, I am still denying approval because the v1 field allowlist includes `password`, which creates an avoidable security/privacy risk that is not justified or mitigated by the spec.
- A password-type field is commonly understood to contain sensitive or intentionally obscured values. Allowing exact `[[field_name]]` placeholders to render password field contents inline on the public frontend would make accidental disclosure significantly easier for editors/authors and would create support and security risk disproportionate to v1’s value.
- The current draft’s safety language focuses on sanitization and code execution, but this problem is not an HTML-sanitization issue. It is a data-exposure issue. A value can be perfectly sanitized and still be the wrong thing to expose.
- Because this feature is specifically about editorial inline reuse, the v1 supported-type list should be conservative. Including `password` weakens the spec’s security posture without being necessary to prove the feature concept.
- Aside from that issue, the unresolved items from the prior denial were converted into explicit decisions and the spec is otherwise implementation-ready.

Cost notes
- Removing `password` from the allowlist lowers security review burden and support cost with negligible implementation cost.
- Keeping `password` in scope would increase risk of accidental sensitive-data exposure and likely require additional product justification, documentation, and possibly capability/authoring safeguards that are out of proportion for a narrow v1.
- All other scoping choices in this revision appropriately control engineering and maintenance cost for phase 2.

Required changes
1. Remove `password` from the v1 supported field-type allowlist.
2. Add an explicit statement that fields intended to hold sensitive, secret, or non-public values are out of scope for v1 placeholder rendering.
3. Ensure the acceptance criteria and any related assumptions remain aligned with the revised allowlist after `password` is removed.

Next version expected
- `spec-v3.md`
- It should keep the current v2 structure and decisions, but tighten the security/privacy model by excluding password/sensitive-value fields from v1 support.