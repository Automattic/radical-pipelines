Decision: DENY

Why
- The design is strong overall and tracks the approved spec closely on render-time replacement, block scope, field-type allowlisting, silent failure, deactivation behavior, and a narrow frontend-only implementation path.
- However, it is not yet implementation-ready because it leaves two security/behavior decisions materially unresolved in the “Open questions” section:
  1. whether placeholder eligibility requires `allow_in_bindings` to be explicitly `true`, or only denies when it is explicitly `false`
  2. the exact inline HTML allowlist, especially whether `span` is allowed and which attributes survive
- Those are not minor follow-ups. They directly determine the trust boundary for “non-public” field exposure and the final sanitization contract. Phase 2 should lock those down, not defer them.
- There is also one architecture realism gap: the design says the service should “instantiate during plugin bootstrap” and hook `render_block`, but it does not pin the registration point tightly enough to show that the callback will only exist in the intended frontend runtime and remain isolated from broader plugin behavior. The implementation path is likely straightforward, but the design should state where the class is loaded/bootstrapped and why that lifecycle is correct.

Architecture notes
- Good decisions:
  - Using `render_block` with exact `core/paragraph` and `core/heading` checks is appropriately narrower than whole-string `the_content` replacement and aligns with the approved spec.
  - The proposed regex `~\[\[([A-Za-z0-9_-]+)\]\]~` matches the approved token grammar and preserves malformed tokens literally.
  - Reusing `get_field_object()` plus the `acf/prevent_access_to_unknown_fields` pattern is realistic in this codebase and consistent with existing shortcode security behavior.
  - Local per-request caching keyed by post ID + field name is sensible and low risk.
  - Explicitly sanitizing formatted values with a placeholder-specific `wp_kses()` policy instead of relying on generic escaped-HTML output is the right architectural direction for the spec’s inline-only HTML requirement.
- Concerns to resolve:
  - The `allow_in_bindings` rule must be deterministic. The codebase defaults legacy fields with missing `allow_in_bindings` to `true` in field settings UI behavior, while new fields default to `false`. The design currently recommends “deny only when explicitly false” but also leaves the stricter alternative open. That ambiguity changes which existing fields become placeholder-readable and therefore changes the security posture.
  - The inline HTML contract must be fixed. “Suggested baseline” is too soft for implementation review. If `span` is included, the attribute list must be explicit. If it is excluded, say so. Similar clarity is needed for anchors (`href`, `target`, `rel`, possibly `title`).
  - The bootstrap/lifecycle note should specify where the service is required and when hooks are attached, so implementers do not accidentally register behavior in contexts the spec intentionally excludes.

Required changes
1. Resolve the `allow_in_bindings` policy definitively.
   - Choose one rule and remove the open question.
   - The design must explicitly state the default behavior for legacy fields where `allow_in_bindings` is absent.
   - It must justify that choice against the approved spec’s “sensitive/non-public” exclusion and backward-compatibility expectations.
2. Replace the “suggested baseline” inline HTML allowlist with a final, explicit allowlist.
   - State the exact allowed tags.
   - State the exact allowed attributes per tag.
   - Explicitly decide whether `span` is allowed; if yes, define its allowed attributes.
   - Keep the policy aligned with the approved inline-only requirement.
3. Tighten the bootstrap/registration section.
   - Name the concrete file/class loading path.
   - State when the service is instantiated and hooks are registered.
   - Confirm the callback is intended to run only as part of frontend rendering logic and does not broaden the feature scope beyond the approved render path.
4. Remove or close any remaining open questions that materially affect v1 security or output behavior.
   - Questions about future extensibility can remain if clearly marked non-blocking.
   - Questions that change eligibility or sanitization behavior cannot remain open in an implementation-ready design.

Next version expected
- `design-v2.md`
- Expected outcome: same overall architecture, but with the field-publicity rule, sanitization contract, and bootstrap lifecycle fully specified and no blocking open questions remaining.