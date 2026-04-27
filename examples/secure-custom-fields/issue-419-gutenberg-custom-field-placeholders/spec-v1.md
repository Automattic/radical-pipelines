# Task

Create an implementation-ready specification for GitHub issue #419, "Experiment: Add Gutenberg-compatible custom field placeholders for post content."

# Summary

Add support for post-content placeholders using `[[field_name]]` syntax so authors can reference post-level Secure Custom Fields values inline inside Gutenberg-authored post content. Placeholder replacement must occur at render time without mutating stored `post_content`, must degrade safely when placeholders are invalid or values are unavailable, and must sanitize output according to WordPress standards.

Version 1 of the feature is limited to post-level field lookups for the current post and to placeholders that resolve to scalar or HTML string output suitable for inline rendering.

# Problem statement

Authors can store reusable values in post-level custom fields, but they cannot currently reference those values directly inside post content without duplicating text, writing PHP templates, or creating custom blocks. This creates content drift, makes updates harder, and reduces the value of custom fields for editorial workflows.

A placeholder syntax inside post content would let authors keep a single source of truth in custom fields while reusing those values in paragraphs and other text-based content areas.

# Goals

- Allow authors to type `[[field_name]]` directly into post content and have it render as the matching field value for the current post.
- Support Gutenberg-authored content without changing how content is stored in the database.
- Preserve raw placeholder text in saved content so plugin deactivation does not corrupt or rewrite content.
- Sanitize rendered output according to WordPress core standards while preserving safe inline formatting.
- Fail safely for missing, empty, malformed, or unsupported placeholders.
- Define a narrow, testable v1 scope that can be shipped without introducing a broader templating language.

# Functional requirements

1. **Placeholder syntax**
   - The feature must recognize placeholders written as `[[field_name]]`.
   - `field_name` refers to a post-level custom field name saved against the current post.
   - Supported field identifiers in v1 must be limited to simple field names composed of lowercase or uppercase letters, numbers, underscores, and hyphens.
   - Placeholders containing spaces, nesting, additional operators, or unsupported characters must be treated as malformed.

2. **Render-time behavior**
   - Placeholder replacement must happen at render time only.
   - Stored `post_content` in the database must remain exactly as authored, including the raw placeholder text.
   - For a supported placeholder with a matching field value, the placeholder must be replaced inline with the rendered field output.
   - Multiple placeholders may appear in the same post and in the same block content string.
   - Repeated use of the same placeholder within one rendered post must produce the same output for that post render.

3. **Supported scope and contexts**
   - v1 must support placeholders authored inside Gutenberg post content.
   - v1 must replace placeholders when singular post content for the current post is rendered through the normal WordPress content rendering pipeline on the frontend.
   - v1 must support inline replacement inside paragraph blocks and other text-based blocks whose saved content passes through the standard post-content rendering pipeline.
   - v1 must not require block serialization changes, block attribute schema changes, or content migrations.
   - Gutenberg compatibility in v1 means authors can safely type and save placeholders in the block editor and receive resolved output on render; live RichText substitution while editing is not required.

4. **Field value support**
   - v1 must support post-level fields whose formatted value resolves to a scalar string or number suitable for inline output.
   - v1 may support HTML-bearing string values, including WYSIWYG-like output, only after sanitization defined in this spec.
   - Fields that resolve to arrays, objects, attachments, repeaters, galleries, relational collections, or other structured/non-scalar values must be treated as unsupported in v1.
   - Unsupported field values must fail safely without PHP warnings, JavaScript errors, or broken markup.

5. **Missing, empty, malformed, and unsupported placeholders**
   - If the placeholder references a field that does not exist for the current post, the rendered output must be an empty string.
   - If the placeholder references a field that exists but has no usable value, the rendered output must be an empty string.
   - Empty output must be the default and only v1 behavior; no user setting is required in v1.
   - Malformed placeholders must remain unchanged in rendered content so authors can see the original token they entered.
   - Supported syntax that resolves to an unsupported field type must render as an empty string.

6. **Sanitization and escaping**
   - Rendered output must be sanitized before insertion into rendered content.
   - Plain-text values must be escaped for safe HTML output.
   - HTML-bearing string values must be sanitized using the WordPress post-content allowlist level, preserving safe inline markup such as emphasis and links while stripping unsafe markup.
   - Disallowed tags, disallowed attributes, scripts, event handlers, forms, iframes, and malformed unsafe markup must not be rendered.
   - Sanitization failures or malformed HTML must not crash rendering.

7. **Backward compatibility and persistence**
   - Existing content without placeholders must render unchanged.
   - Existing content containing bracketed text that does not match the supported placeholder syntax must render unchanged.
   - Deactivating Secure Custom Fields must not remove, rewrite, or corrupt saved post content.
   - After plugin deactivation, raw placeholder text must remain visible because stored content is unchanged.

8. **Extensibility expectations**
   - v1 must not expose a user-facing UI picker for inserting placeholders.
   - v1 may add internal extension points or filters only if they do not change the required default behavior in this spec.
   - Any new public hooks introduced for this feature should prefer `scf/...` hook names unless backward compatibility requires an `acf_` pattern.

# Non-functional requirements

- **WordPress standards**: Implementation must follow WordPress core coding standards, plugin best practices, repository conventions in `AGENTS.md`, and SCF naming conventions.
- **Safety**: The feature must never execute arbitrary PHP, shortcodes, JavaScript, or unsanitized HTML from field values.
- **Performance**: Placeholder parsing and field lookup must be scoped to rendered post content and should avoid redundant lookups for repeated placeholders within the same content render.
- **Reliability**: Missing data, invalid syntax, unsupported field types, and malformed field HTML must not generate fatal errors, notices visible to users, or invalid block storage.
- **Editor stability**: The block editor must continue to load, save, and reopen posts containing placeholders without validation errors caused by this feature.
- **Testability**: Behavior must be covered by automated tests for successful replacement, empty handling, malformed placeholders, sanitization, and deactivation-safe persistence.

# Acceptance criteria

1. A user can type `[[movie_title]]` into Gutenberg paragraph content, save the post, and see the matching current post field value rendered inline on the frontend.
2. The raw saved `post_content` in the database still contains `[[movie_title]]` rather than the resolved field value.
3. A post containing multiple placeholders in the same paragraph renders each supported placeholder with the correct current post field value.
4. Placeholder replacement works in at least paragraph blocks and one additional text-based block type that uses normal saved post content rendering.
5. A placeholder referencing a missing field renders no output and does not produce PHP errors, JS errors, or broken page markup.
6. A placeholder referencing an empty field renders no output and does not leave unsafe or broken markup.
7. A malformed token such as `[[movie title]]`, `[[movie_title]`, or `[[movie_title|upper]]` remains unchanged in rendered content.
8. A placeholder that resolves to an unsupported non-scalar field value renders no output and does not display raw `Array`, serialized data, or PHP warnings.
9. A field value containing safe inline HTML such as `<strong>` or `<em>` renders with that formatting preserved after sanitization.
10. A field value containing unsafe HTML such as `<script>` or disallowed attributes is sanitized so unsafe content is not rendered.
11. Deactivating the plugin does not rewrite or corrupt saved post content; the frontend shows the original raw placeholder text because replacement no longer runs.
12. Posts containing placeholders can be reopened in the block editor and resaved without block corruption introduced by this feature.

# Out of scope

- Cross-post, cross-user, cross-term, comment, or option-page field references.
- Nested placeholders or a general templating language.
- Conditional logic, fallback text, transforms, filters, or formatting directives inside placeholder syntax.
- A block-editor UI picker, autocomplete, or inserter for placeholders.
- Rendering structured field types such as repeaters, groups, galleries, images, files, relationship collections, or arbitrary arrays/objects.
- Per-placeholder, per-block, or global settings for empty-value display behavior.
- Live inline substitution inside the editable RichText canvas while the user is typing.
- Automatic migration of existing shortcodes, merge tags, or other token syntaxes.

# Assumptions

- The current post context is available at render time for the supported frontend content pipeline.
- SCF field values can be retrieved by field name for the current post using existing SCF/ACF field APIs.
- WordPress post-content sanitization primitives are sufficient for v1 HTML safety requirements.
- Gutenberg-authored paragraph and similar text blocks persist literal placeholder text without additional escaping that would prevent server-side replacement on render.
- Shipping a narrow scalar/string-focused v1 is acceptable even though the issue discusses broader custom-field usage.

# Risks

- Overly broad token matching could accidentally alter content that users intended as literal bracketed text.
- Rendering HTML-bearing field values inline may still create layout surprises if block contexts expect plain text.
- Some field types may return formatted output that appears scalar but is unsuitable for inline insertion unless further constrained in implementation.
- Hook placement in the content pipeline may affect previews, excerpts, REST-rendered content, or other consumers differently than expected.
- Unsupported structured fields may create user confusion if placeholders silently render empty without editor guidance.

# Cost

- **Implementation size**: Small to medium.
- **Complexity drivers**: safe token parsing, field-type gating, HTML sanitization, Gutenberg/frontend compatibility, and automated coverage.
- **Testing cost**: Medium, because the feature needs PHP/unit coverage plus E2E coverage for Gutenberg authoring, frontend rendering, and deactivation-safe persistence.

# Open questions

1. Should v1 replacement run only on singular frontend content, or also in preview/REST-rendered contexts where block editor previews may consume rendered post content?
2. Should field lookup support only field names in v1, or also field keys when the token syntax matches a field key?
3. Should unsupported structured field placeholders render empty silently, or should SCF expose a developer-only debug signal or hook for observability?
4. Do we want an explicit allowlist of supported SCF field types in v1, or should support be determined strictly by the final resolved value being scalar/string?
5. If a supported field value contains block-level HTML (for example, paragraph tags from a WYSIWYG field), should v1 allow it inline after sanitization or restrict output to inline-safe markup only?
