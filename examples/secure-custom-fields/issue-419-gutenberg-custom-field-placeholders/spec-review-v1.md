Decision: DENY

Why
- The spec is directionally strong and substantially improved over a loose feature request, but it is not yet implementation-ready because several requirements that materially affect architecture, compatibility, and test scope are still unresolved.
- The largest gap is render-context scope. The spec says v1 must replace placeholders on singular frontend content through the normal content pipeline, but the open questions still leave preview and REST-rendered contexts undecided. That matters for Gutenberg compatibility, because editor previews and other WordPress consumers may use those paths. An implementation cannot be cleanly scoped until the required and non-required render contexts are explicitly enumerated.
- The field support contract is still ambiguous. The spec says v1 supports values whose formatted value resolves to a scalar string or number, but also asks whether support should be determined by field type allowlist versus final value shape. Those are different product and engineering choices with different maintenance costs and different test matrices. The spec must choose one.
- Sanitization requirements are not sufficiently precise for HTML-bearing values. The spec says HTML string values may be supported after sanitization at the WordPress post-content allowlist level, but it leaves unresolved whether block-level markup from a WYSIWYG field is allowed inline or must be restricted. That ambiguity affects broken-markup risk, user expectations, and acceptance criteria.
- Acceptance criteria are not fully measurable for supported contexts. Criterion 4 says placeholders work in “at least paragraph blocks and one additional text-based block type,” but the additional block type is unspecified. That is not testable as written and leaves too much discretion for implementation.
- Backward-compatibility behavior is partly specified but still incomplete around non-frontend consumers. The spec correctly protects stored post_content and deactivation behavior, but it does not clearly state whether excerpts, feeds, REST responses, admin previews, or other consumers are intentionally out of scope for v1.
- The malformed-token behavior is mostly clear, but the spec should explicitly define whether token matching is performed before or after normal content filters that may alter bracket characters or HTML entities. Without that, edge behavior may vary by hook placement.
- Cost and support impact are slightly understated given the unresolved scope. Once contexts, field-type gating, and HTML rules are fixed, implementation may still be small-to-medium, but support cost could rise quickly if users expect broader block/editor/REST behavior than v1 actually ships.

Cost notes
- Current cost estimate is premature because the unresolved questions are not cosmetic; they define the implementation boundary.
- Choosing a strict allowlist of supported field types and strict frontend-only scope would keep v1 closer to small/medium cost.
- Allowing support based on final formatted value alone, or supporting preview/REST/editor-rendered contexts, increases compatibility testing, support burden, and maintenance risk.
- Allowing block-level HTML from WYSIWYG-like fields inline raises markup and UX risk and likely increases implementation and testing cost.

Required changes
1. Resolve render-context scope explicitly. State whether v1 applies only to singular frontend `the_content`, or also to previews, excerpts, feeds, REST-rendered content, and editor preview paths. Any non-supported context should be explicitly listed as out of scope.
2. Resolve the field support contract. Choose one of these and state it normatively:
   - explicit allowlist of supported SCF field types in v1, or
   - support determined solely by final resolved scalar/string output.
   The current draft cannot leave both models in play.
3. Tighten HTML output rules. State whether HTML-bearing values are allowed only when they remain inline-safe after sanitization, or whether block-level markup from WYSIWYG-like fields is intentionally supported inline. The spec should define the expected behavior, not leave it as an open question.
4. Make acceptance criterion 4 measurable by naming the exact additional supported text-based block type, not “one additional text-based block type.”
5. Clarify unsupported consumer behavior for excerpts/feeds/REST/admin preview/editor preview. If they are out of scope, say so in either requirements or out-of-scope.
6. Clarify malformed/literal bracket handling enough to prevent overmatching. The draft should explicitly state that only exact `[[field_name]]` matches are replaced and all other bracketed text remains literal.
7. Clarify observability expectations for unsupported fields and sanitization stripping. If v1 is intentionally silent to end users, say that explicitly so support and test expectations are aligned.
8. Reconcile “implementation-ready” status with the open questions section. Either resolve the open questions into decisions for v1 or demote them so they do not affect architecture, acceptance criteria, or required test coverage.

Next version expected
- `spec-v2.md`
- It should preserve the current narrow v1 scope, but convert the unresolved architectural/product choices above into explicit decisions so the design phase can proceed without guessing.