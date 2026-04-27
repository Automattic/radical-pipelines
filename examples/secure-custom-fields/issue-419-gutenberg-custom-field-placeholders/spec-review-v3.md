Decision: APPROVE

Why
- This revision resolves the remaining blocker from v2 by removing `password` from the supported field-type allowlist and explicitly excluding sensitive, secret, private, obscured, credential-like, and otherwise non-public fields from v1 placeholder rendering.
- The spec is now implementation-ready. It makes explicit, testable decisions on:
  - exact placeholder syntax and literal-text preservation
  - render-time-only replacement
  - supported frontend render scope
  - unsupported contexts
  - supported Gutenberg block types for v1
  - field support via explicit allowlist
  - empty/malformed/unsupported handling
  - sanitization and inline-safe HTML rules
  - silent user-facing behavior
  - backward compatibility and deactivation behavior
- Security/privacy expectations are now appropriately conservative for a v1 feature. The spec distinguishes sanitization safety from data-exposure safety and keeps sensitive-value rendering out of scope.
- Acceptance criteria are measurable and aligned with the stated scope. The spec gives phase 2 enough clarity to design architecture, hook placement, sanitization behavior, and test coverage without guessing.
- The document is also aligned with repository conventions in `AGENTS.md`, especially around WordPress standards, backward compatibility expectations, and the need for automated coverage.

Cost notes
- The current scope is well controlled and realistic for a small-to-medium implementation.
- Testing cost remains medium because the approved scope still requires both behavior verification and compatibility coverage across supported and intentionally unsupported contexts.
- Support cost remains manageable because the spec is explicit about what v1 does not do, which should help prevent accidental scope creep in design and implementation.
- Excluding sensitive/non-public fields lowers security review and support burden materially without reducing the core value of the experiment.

Required changes
- None.

Next version expected
- No further phase-1 spec revision required.
- Proceed to phase 2 design doc based on `spec-v3.md`.