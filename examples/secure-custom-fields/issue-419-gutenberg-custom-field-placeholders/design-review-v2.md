Decision: APPROVE

Why
- This revision closes the blocking gaps from `design-review-v1.md` and is now implementation-ready.
- The design is traceable to the approved spec and makes concrete, testable decisions on the three boundaries that mattered most for phase 2:
  - where replacement runs (`render_block` with strict runtime gating)
  - which fields are eligible (explicit field-type allowlist plus explicit `allow_in_bindings` opt-in)
  - which HTML survives (`wp_kses()` with a fixed inline-only tag/attribute allowlist)
- The architecture is realistic for WordPress/Gutenberg and for this codebase specifically. It reuses existing SCF resolution and security patterns (`get_field_object()` and temporary `acf/prevent_access_to_unknown_fields` protection) without broadening existing template, REST, or block bindings behavior.
- Security posture is appropriately conservative for a v1 experiment. Requiring `allow_in_bindings` to be explicitly present and truthy is stricter than the existing binding default behavior for some legacy fields, but it is deterministic, documented in the design, and aligned with the spec’s exclusion of sensitive/non-public values.
- The sanitization contract is now explicit enough to implement and test without guesswork. Excluding `span`, classes, styles, IDs, data attributes, and event handlers keeps the output surface narrow and predictable.
- Backward compatibility and deactivation behavior remain correct: saved content is untouched, unsupported contexts stay raw, and plugin deactivation reveals the original placeholder text.
- Testing guidance is sufficiently complete for both PHP and E2E coverage.

Architecture notes
- Hooking `render_block` and then narrowing to `core/paragraph` and `core/heading` is the right choice for the approved v1 scope. It is more precise than whole-content `the_content` search/replace and avoids accidental support for unsupported block types.
- The runtime gate is appropriately conservative:
  - no admin
  - no JSON request
  - no feed
  - singular only
  - inside `the_content`
  - in loop
  - main query
  - valid supported block
  - `[[` substring present
- The bootstrap section is now concrete enough for implementation review. Naming the include path, instantiation point, and single filter registration path removes ambiguity about lifecycle and scope.
- The replacement/data flow is clear and efficient: scan only supported block HTML, dedupe placeholder names per block, resolve each once, and cache by post ID + field name including empty-string results.
- The field-resolution path is realistic in this repository:
  - strict field lookup against current post metadata
  - temporary unknown-field access prevention
  - explicit allowlist check
  - explicit `allow_in_bindings` check
  - scalar/non-empty enforcement
- The final KSES allowlist is narrow and matches the spec’s inline-only requirement. The documented examples also make the intended stripping behavior clear for WYSIWYG values containing structural markup.
- The remaining open questions are truly non-blocking future-scope items and do not weaken v1 implementation readiness.

Required changes
- None.

Next version expected
- No further phase-2 design revision required.
- Proceed to phase 3 implementation plan based on `design-v2.md`.