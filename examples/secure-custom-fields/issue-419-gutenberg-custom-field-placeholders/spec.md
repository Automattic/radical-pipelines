# Task

Create an implementation-ready specification for GitHub issue #419, "Experiment: Add Gutenberg-compatible custom field placeholders for post content."

# Summary

Add support for post-content placeholders using exact `[[field_name]]` syntax so authors can reference post-level Secure Custom Fields values inline inside Gutenberg-authored post content. Placeholder replacement must occur at render time without mutating stored `post_content`, must degrade safely when placeholders are invalid or values are unavailable, and must sanitize output according to WordPress standards.

Version 1 is intentionally narrow. It applies only to singular frontend post-content rendering for the current post, supports only a defined allowlist of text-capable post field types, excludes fields intended to store sensitive or non-public values, preserves only inline-safe HTML, and leaves all non-exact bracketed text untouched.

# Problem statement

Authors can store reusable values in post-level custom fields, but they cannot currently reference those values directly inside post content without duplicating text, writing PHP templates, or creating custom blocks. This creates content drift, makes updates harder, and reduces the value of custom fields for editorial workflows.

A placeholder syntax inside post content would let authors keep a single source of truth in custom fields while reusing those values in paragraphs and other text-based content areas.

# Goals

- Allow authors to type exact `[[field_name]]` placeholders directly into post content and have them render as the matching field value for the current post.
- Support Gutenberg-authored content without changing how content is stored in the database.
- Preserve raw placeholder text in saved content so plugin deactivation does not corrupt or rewrite content.
- Sanitize rendered output according to WordPress core standards while preserving safe inline formatting.
- Fail safely for missing, empty, malformed, or unsupported placeholders.
- Define a narrow, testable v1 scope with explicit render contexts, supported field types, HTML rules, and conservative data-exposure boundaries.

# Functional requirements

1. **Placeholder syntax**
   - The feature must recognize placeholders written in the exact form `[[field_name]]`.
   - `field_name` refers to a post-level custom field name saved against the current post.
   - Supported field identifiers in v1 must be limited to letters, numbers, underscores, and hyphens.
   - Only exact matches to the `[[field_name]]` pattern are eligible for replacement.
   - Any bracketed text that does not exactly match the supported pattern must remain literal and unchanged in rendered output.
   - Examples that must remain unchanged include `[[movie title]]`, `[[movie_title]`, `[movie_title]`, `[[movie_title|upper]]`, nested tokens, and escaped or entity-altered bracket text that no longer appears as an exact placeholder at replacement time.

2. **Render-time behavior**
   - Placeholder replacement must happen at render time only.
   - Stored `post_content` in the database must remain exactly as authored, including the raw placeholder text.
   - For a supported placeholder with a matching supported field value, the placeholder must be replaced inline with the rendered field output.
   - Multiple placeholders may appear in the same post and in the same block content string.
   - Repeated use of the same placeholder within one rendered post must produce the same output for that post render.
   - Placeholder matching for v1 must operate on the content string as received by the replacement callback in the chosen frontend render path; if earlier filters have transformed the brackets so the exact placeholder text no longer exists, no replacement occurs.

3. **Supported render scope and contexts**
   - v1 must support placeholders authored inside Gutenberg post content.
   - v1 must replace placeholders only when singular post content for the current post is rendered on the frontend through the standard `the_content` pipeline.
   - v1 must support inline replacement inside these exact Gutenberg block types when their saved content is rendered through that pipeline:
     - Paragraph (`core/paragraph`)
     - Heading (`core/heading`)
   - v1 Gutenberg compatibility means authors can safely type, save, reopen, and publish placeholders in the block editor, and can see resolved output on the frontend after save.
   - v1 does not require live RichText substitution while editing, block validation-time substitution, or block serialization changes.

4. **Non-supported render contexts in v1**
   - The following contexts are intentionally out of scope for placeholder replacement in v1 unless they happen to render via the same supported singular frontend `the_content` path and receive the same callback behavior:
     - post excerpts
     - feeds
     - REST API content fields
     - admin list tables
     - admin edit-form previews outside normal saved frontend viewing
     - block editor live editing canvas substitution
     - block editor preview mechanisms that do not use the supported singular frontend `the_content` path
     - widgets, comments, term descriptions, user profiles, option pages, and non-post objects
   - In these non-supported contexts, placeholder text may remain raw and this is acceptable v1 behavior.

5. **Field support contract**
   - v1 field support is determined by an explicit allowlist of SCF field types, not by arbitrary final value shape.
   - The supported field types in v1 are:
     - `text`
     - `textarea`
     - `number`
     - `range`
     - `email`
     - `url`
     - `select` when the resolved value is a single scalar value
     - `radio`
     - `button_group`
     - `date_picker`
     - `date_time_picker`
     - `time_picker`
     - `wysiwyg`
   - For supported field types, the resolved formatted value must still be scalar string/number output before sanitization and insertion.
   - Supported field types that return arrays, objects, or other non-scalar results in a given configuration must be treated as unsupported for that render and must output an empty string.
   - Fields intended to hold sensitive, secret, private, obscured, credential-like, or otherwise non-public values are out of scope for v1 placeholder rendering, even if their stored type might otherwise appear text-like.
   - Field keys, option values, term fields, user fields, comment fields, and cross-object lookups are not supported in v1.

6. **Missing, empty, malformed, and unsupported placeholders**
   - If the placeholder references a field that does not exist for the current post, the rendered output must be an empty string.
   - If the placeholder references a supported field that exists but has no usable value, the rendered output must be an empty string.
   - Empty output is the default and only v1 behavior; no user setting is required in v1.
   - Malformed placeholders must remain unchanged in rendered content so authors can see the original token they entered.
   - Exact-syntax placeholders that resolve to unsupported field types, sensitive/non-public fields, or unsupported non-scalar values must render as an empty string.
   - These cases must not produce PHP warnings, JavaScript errors, visible admin notices to end users, or broken page markup.

7. **Sanitization and escaping**
   - Rendered output must be sanitized before insertion into rendered content.
   - Plain-text values must be escaped for safe HTML output.
   - HTML-bearing values are permitted only for supported string-returning fields and only when the final rendered output is safe for inline insertion.
   - Allowed HTML behavior in v1 is limited to inline-safe markup that survives WordPress post-content sanitization, such as emphasis, strong text, links, code, and line-break-level inline formatting.
   - Block-level HTML output is not supported in v1 placeholder rendering. If a field value contains block-level or layout-producing markup such as `<p>`, headings, lists, tables, block wrappers, embeds, iframes, forms, scripts, or similar structural elements, that markup must not be rendered as block output through placeholder replacement.
   - For HTML-bearing values from supported fields such as `wysiwyg`, v1 must sanitize the value and then preserve only the inline-safe subset for insertion. Any disallowed or block-level markup must be stripped rather than rendered.
   - Disallowed tags, disallowed attributes, scripts, event handlers, forms, iframes, and malformed unsafe markup must not be rendered.
   - Sanitization failures or malformed HTML must not crash rendering.

8. **Observability and user-facing silence**
   - v1 must be silent to end users for missing fields, empty fields, unsupported fields, sensitive/non-public fields, and sanitization stripping.
   - v1 must not inject fallback text, HTML comments, debug text, or visible warnings into post content for these cases.
   - v1 is not required to expose a user-facing notice, editor warning, or developer debug panel for unsupported placeholders or stripped HTML.
   - Internal logging or future developer hooks may be added later, but no such observability is required for v1 and no acceptance criteria depend on it.

9. **Backward compatibility and persistence**
   - Existing content without placeholders must render unchanged.
   - Existing content containing bracketed text that does not match the supported placeholder syntax must render unchanged.
   - Deactivating Secure Custom Fields must not remove, rewrite, or corrupt saved post content.
   - After plugin deactivation, raw placeholder text must remain visible because stored content is unchanged and replacement no longer runs.

10. **Extensibility expectations**
   - v1 must not expose a user-facing UI picker for inserting placeholders.
   - v1 may add internal extension points or filters only if they do not change the required default behavior in this spec.
   - Any new public hooks introduced for this feature should prefer `scf/...` hook names unless backward compatibility requires an `acf_` pattern.

# Non-functional requirements

- **WordPress standards**: Implementation must follow WordPress core coding standards, plugin best practices, repository conventions in `AGENTS.md`, and SCF naming conventions.
- **Safety**: The feature must never execute arbitrary PHP, shortcodes, JavaScript, unsanitized HTML, or expose intentionally non-public field values through placeholder rendering.
- **Performance**: Placeholder parsing and field lookup must be scoped to supported singular frontend post renders and should avoid redundant lookups for repeated placeholders within the same content render.
- **Reliability**: Missing data, invalid syntax, unsupported field types, unsupported value shapes, sensitive-field exclusions, and malformed field HTML must not generate fatal errors, notices visible to users, or invalid block storage.
- **Editor stability**: The block editor must continue to load, save, and reopen posts containing placeholders without validation errors caused by this feature.
- **Determinism**: Only exact placeholders are replaced; all other bracketed text must remain literal so authors can predict output.
- **Testability**: Behavior must be covered by automated tests for successful replacement, empty handling, malformed placeholders, unsupported contexts, sensitive-field exclusion, sanitization, and deactivation-safe persistence.

# Acceptance criteria

1. A user can type `[[movie_title]]` into a Gutenberg paragraph block, save the post, and see the matching current post field value rendered inline on the frontend singular post view.
2. The raw saved `post_content` in the database still contains `[[movie_title]]` rather than the resolved field value.
3. A post containing multiple placeholders in the same paragraph renders each supported placeholder with the correct current post field value.
4. Placeholder replacement works in both Paragraph (`core/paragraph`) and Heading (`core/heading`) blocks when rendered on the frontend singular post view through the supported content pipeline.
5. A placeholder referencing a missing field renders no output and does not produce PHP errors, JS errors, or broken page markup.
6. A placeholder referencing an empty field renders no output and does not leave unsafe or broken markup.
7. A malformed or non-exact token such as `[[movie title]]`, `[[movie_title]`, `[movie_title]`, or `[[movie_title|upper]]` remains unchanged in rendered content.
8. A placeholder that resolves to an unsupported field type, a sensitive/non-public field, or an unsupported non-scalar value renders no output and does not display raw `Array`, serialized data, or PHP warnings.
9. A supported field value containing safe inline HTML such as `<strong>`, `<em>`, or a safe `<a>` renders with that formatting preserved after sanitization.
10. A supported field value containing unsafe HTML such as `<script>` or disallowed attributes is sanitized so unsafe content is not rendered.
11. A supported HTML-bearing field value containing block-level markup such as `<p>` or `<ul>` does not render that structural markup through placeholder replacement; only the inline-safe sanitized subset, if any, is inserted.
12. Placeholder text remains raw in at least one explicitly unsupported v1 context, such as an excerpt or REST content response, confirming that unsupported consumer behavior is non-replacement rather than content mutation.
13. Deactivating the plugin does not rewrite or corrupt saved post content; the frontend shows the original raw placeholder text because replacement no longer runs.
14. Posts containing placeholders can be reopened in the block editor and resaved without block corruption introduced by this feature.

# Out of scope

- Cross-post, cross-user, cross-term, comment, or option-page field references.
- Field-key token lookup or any token syntax other than exact `[[field_name]]` matches.
- Rendering fields intended to hold sensitive, secret, private, obscured, credential-like, or otherwise non-public values.
- Nested placeholders or a general templating language.
- Conditional logic, fallback text, transforms, filters, or formatting directives inside placeholder syntax.
- A block-editor UI picker, autocomplete, or inserter for placeholders.
- Rendering structured field types such as repeaters, groups, galleries, images, files, relationship collections, or arbitrary arrays/objects.
- Per-placeholder, per-block, or global settings for empty-value display behavior.
- Live inline substitution inside the editable RichText canvas while the user is typing.
- Replacement in excerpts, feeds, REST responses, admin previews, or other non-supported contexts listed above.
- Automatic migration of existing shortcodes, merge tags, or other token syntaxes.

# Assumptions

- The current singular post context is available during the supported frontend `the_content` render path.
- SCF field values can be retrieved by field name for the current post using existing SCF/ACF field APIs.
- Gutenberg-authored Paragraph and Heading blocks persist literal placeholder text without additional escaping that prevents server-side replacement on the supported render path.
- WordPress sanitization primitives are sufficient to reduce supported HTML-bearing values to an inline-safe subset for v1.
- A narrow explicit allowlist of supported non-sensitive field types is acceptable for the first release of this feature.

# Risks

- Users may expect replacement in previews, REST responses, or excerpts because the raw token syntax is visible in those contexts, but v1 intentionally does not guarantee support there.
- Even with sanitization, stripping block-level HTML from WYSIWYG values may surprise users who expect full rich content embedding.
- Hook placement in the content pipeline may still create edge cases if third-party filters alter bracket text before replacement runs.
- Silent empty output for unsupported, missing, or sensitive fields may reduce discoverability of authoring mistakes without future editor assistance.

# Cost

- **Implementation size**: Small to medium.
- **Complexity drivers**: exact token parsing, explicit render-scope enforcement, supported field-type allowlist handling, sensitive-field exclusion, inline-safe HTML sanitization, and automated coverage across supported and unsupported contexts.
- **Testing cost**: Medium, because the feature needs PHP/unit coverage plus E2E coverage for Gutenberg authoring, frontend rendering, unsupported contexts, sensitive-field exclusion, sanitization behavior, and deactivation-safe persistence.
- **Support cost**: Medium, because users may request broader editor, REST, preview, structured-field, and sensitive-field support beyond the intentionally narrow v1 scope.

# Open questions

1. Should a future version add editor affordances such as placeholder autocomplete, insertion UI, or validation messaging for unsupported field references?
2. Should a future version expand replacement beyond singular frontend `the_content` to previews, excerpts, feeds, or REST-rendered content?
3. Should a future version support additional scalar-like field types beyond the v1 allowlist, or add a broader developer opt-in mechanism?
4. Should a future version provide optional observability such as developer hooks, logs, or editor notices when placeholders resolve empty or HTML is stripped?
5. Should a future version introduce richer syntax such as fallback text or formatting directives, while preserving backward compatibility with exact `[[field_name]]` tokens?
