# Task

Create a technical design for GitHub issue #419, "Experiment: Add Gutenberg-compatible custom field placeholders for post content."

# Spec reference

- Approved phase-1 spec: `.pi/pipelines/issue-419-gutenberg-custom-field-placeholders/spec.md`
- Pipeline prompt: `.pi/pipelines/issue-419-gutenberg-custom-field-placeholders/prompt.md`
- Prior draft: `.pi/pipelines/issue-419-gutenberg-custom-field-placeholders/design-v1.md`
- Review outcome for prior draft: `.pi/pipelines/issue-419-gutenberg-custom-field-placeholders/design-review-v1.md`

# Problem recap

The approved spec requires Secure Custom Fields to resolve exact `[[field_name]]` tokens inside Gutenberg-authored post content at render time only. Stored `post_content` must remain unchanged, deactivation must reveal the original raw tokens, and unsupported or unsafe cases must fail silently.

The implementation must stay narrow in v1:

- frontend only
- singular current-post rendering only
- standard `the_content` rendering path only
- Gutenberg `core/paragraph` and `core/heading` only
- exact `[[field_name]]` syntax only
- explicit allowlist of supported field types only
- inline-safe HTML only
- unsupported contexts left raw

This means the design has to be precise about three boundaries:

1. where placeholder parsing runs in the Gutenberg/server render pipeline
2. which field values are eligible for output at all
3. exactly which HTML survives sanitization before inline insertion

# Goals and non-goals

## Goals

1. Replace exact `[[field_name]]` tokens during frontend render for `core/paragraph` and `core/heading` blocks only.
2. Preserve stored `post_content` exactly as authored.
3. Resolve values only from the currently rendered post using existing SCF field APIs.
4. Restrict output to an explicit v1 allowlist of field types and a deterministic public-display rule.
5. Sanitize resolved output to a fixed inline-only HTML subset before insertion.
6. Fail closed to an empty string for missing, empty, unsupported, non-scalar, denied, or malformed value states.
7. Keep behavior incremental and isolated from existing shortcode, REST, block bindings, and template APIs.

## Non-goals

1. No editor-side live substitution in the block editor.
2. No placeholder inserter UI, autocomplete, or editor validation UI.
3. No support for excerpts, feeds, REST content fields, widgets, comments, admin previews, or non-post objects.
4. No support for nested placeholders, fallback syntax, transforms, filters, or formatting directives.
5. No support for structured or collection outputs such as repeater, group, gallery, relationship, image, file, or arbitrary arrays/objects.
6. No migration of saved content and no serialization changes to Gutenberg blocks.

# Architecture overview

## Proposed implementation shape

Add a dedicated frontend service class:

- `includes/class-scf-post-content-placeholders.php`

Load the file from `secure-custom-fields.php` during the plugin include/bootstrap sequence, then instantiate the service from the main plugin `init()` method after core APIs and field types are loaded.

Concrete bootstrap plan:

1. In `secure-custom-fields.php`, add:
   - `acf_include( 'includes/class-scf-post-content-placeholders.php' );`
2. In the main plugin `init()` method, after existing core/frontend includes and before `do_action( 'acf/init', ACF_MAJOR_VERSION );`, instantiate:
   - `new SCF_Post_Content_Placeholders();`
3. The class constructor registers exactly one server-side filter:
   - `add_filter( 'render_block', array( $this, 'filter_render_block' ), 10, 2 );`

Why this lifecycle is correct:

- the class is available only after SCF core APIs such as `get_field_object()`, `acf_field_type_supports()`, and field type registration are loaded
- hook registration happens during normal plugin initialization, not lazily during a template call
- the callback exists globally once initialized, but runtime gating inside the callback keeps actual behavior limited to the approved v1 frontend path
- no editor-side scripts, block serialization hooks, or save-time hooks are introduced

## Service responsibilities

The service is responsible for:

1. registering the block render filter
2. gating execution to the approved v1 runtime
3. matching exact placeholder syntax in supported block output
4. resolving values from the current post via SCF field metadata/value APIs
5. enforcing the field-type allowlist and public-display rule
6. sanitizing output to a fixed inline-only allowlist
7. caching per-request resolution results by post ID and field name

## Why a dedicated service

A dedicated service isolates this feature from:

- shortcode behavior in `includes/api/api-template.php`
- block bindings behavior in `includes/Blocks/Bindings.php`
- generic field formatting internals
- non-block or non-`the_content` rendering paths

That isolation matches the approved spec’s intentionally narrow scope.

# Rendering/data flow

## Hook choice

Use `render_block`, not whole-string replacement on `the_content`.

The service filter runs for all rendered blocks, but only rewrites output when the block name is exactly:

- `core/paragraph`
- `core/heading`

Rationale:

1. This is narrower than a whole-content `the_content` regex pass.
2. It precisely matches the spec’s supported Gutenberg block list.
3. It avoids replacing tokens in unsupported blocks, custom blocks, classic content, excerpts, widgets, or arbitrary HTML that might also pass through `the_content`.
4. It preserves Gutenberg storage because replacement occurs after parsing and during server render only.

## Runtime gate

`filter_render_block( $block_content, $block )` must return the original `$block_content` unless all of the following are true:

1. `! is_admin()`
2. `! wp_is_json_request()`
3. `! is_feed()`
4. `is_singular()`
5. `doing_filter( 'the_content' )`
6. `in_the_loop()`
7. `is_main_query()`
8. `$block['blockName']` is exactly `core/paragraph` or `core/heading`
9. `get_the_ID()` resolves to a valid post ID
10. `strpos( $block_content, '[[' ) !== false`

This gate is the main mechanism that keeps unsupported contexts raw.

## Replacement flow

For each supported block render:

1. Receive the rendered block HTML string.
2. Bail out if `[[` is absent.
3. Match placeholders with this exact regex:
   - `~\[\[([A-Za-z0-9_-]+)\]\]~`
4. Build a unique list of placeholder names found in the block.
5. Resolve each unique placeholder name once for the current post.
6. Replace exact matches with the resolved sanitized string.
7. Return the modified block HTML.

All non-matching bracketed text remains unchanged by construction.

## Server/client boundary

Placeholder parsing and substitution happen only on the server in PHP during frontend render.

Not in scope for v1:

- RichText live preview while typing
- block editor canvas substitution
- save-time transformation
- block validation-time transformation
- REST formatting

This preserves Gutenberg save/reopen behavior because raw placeholder text remains in stored content.

# Integration points and hooks/APIs

## WordPress integration point

### `render_block`

Primary integration point.

The callback should inspect:

- block name
- current query/render context
- rendered block HTML

and should only rewrite the returned HTML string for supported blocks.

## SCF/ACF APIs to reuse

### `get_field_object( $selector, $post_id, true, true, false )`

Use this as the primary resolution API.

Reasons:

- returns actual field metadata plus formatted value
- uses field reference lookup tied to the current post
- provides field type and field settings needed for eligibility checks
- fails when no valid field reference exists

### `acf/prevent_access_to_unknown_fields`

Use the shortcode-style protection pattern around field lookup.

Resolution flow must:

1. detect whether the filter is already enabled via `apply_filters( 'acf/prevent_access_to_unknown_fields', false )`
2. if not enabled, temporarily add `__return_true`
3. perform field lookup/resolution
4. remove the temporary filter afterward

This prevents unknown field names from degrading into loose meta access.

### `acf_field_type_supports()`

Optional secondary validation helper, but not the source of truth for v1 eligibility. The explicit spec allowlist remains authoritative.

## New hooks/APIs

Any new extension points should use `scf/...` naming and must not change defaults.

Recommended internal/public filters:

- `scf/post_content_placeholders/supported_field_types`
- `scf/post_content_placeholders/inline_allowed_html`
- `scf/post_content_placeholders/is_field_allowed`
- `scf/post_content_placeholders/prepared_value`

These are optional extension points, not required for v1 correctness.

# Data model and state assumptions

## Placeholder token model

A placeholder remains literal text in saved content.

Exact token grammar:

- opening delimiter: `[[`
- identifier: one or more of `A-Z`, `a-z`, `0-9`, `_`, `-`
- closing delimiter: `]]`

No nesting, escaping syntax, or directives are recognized.

## Current-post model

All resolution is against the currently rendered singular post only. No cross-object lookup syntax exists in v1.

## Supported field-type allowlist

The v1 allowlist is fixed to:

- `text`
- `textarea`
- `number`
- `range`
- `email`
- `url`
- `select`
- `radio`
- `button_group`
- `date_picker`
- `date_time_picker`
- `time_picker`
- `wysiwyg`

The implementation may pass this list through `scf/post_content_placeholders/supported_field_types`, but the default list above is the design contract.

## Deterministic field-publicity rule

This draft resolves the blocker from review with a final v1 rule:

A field is eligible for placeholder output only when **all** of the following are true:

1. the field exists on the current post via SCF reference metadata
2. the field type is in the explicit v1 allowlist
3. `allow_in_bindings` is present on the field object and strictly truthy
4. the formatted value is scalar
5. the formatted scalar is non-empty after normalization

If `allow_in_bindings` is absent, the field is treated as **not allowed** and resolves to an empty string.

Why this is the chosen rule:

- it is the most conservative mapping to the approved spec’s exclusion of sensitive/non-public fields
- it avoids silently exposing legacy fields whose intended display posture is unknown
- it is deterministic and implementation-ready
- it uses an existing SCF exposure control instead of inventing a new v1 UI

Backward-compatibility consequence:

- legacy fields without `allow_in_bindings` set will not render through placeholders until explicitly enabled in field settings or via a future migration/product decision

This is acceptable for v1 because the feature is new and opt-in exposure is safer than implicit exposure.

## Additional per-type constraints

### `select`

Allowed only when the formatted result is a single scalar.

Return empty when:

- the formatted value is an array
- the field is configured in a way that produces non-scalar output

### `radio` and `button_group`

Allowed only when the formatted result is scalar.

### `wysiwyg`

Allowed only when the formatted result is a string. It is then passed through the placeholder-specific inline HTML sanitization step.

### All other allowed types

Allowed only when the final formatted value is scalar.

# Security and sanitization considerations

## Security posture

The feature fails closed.

Anything uncertain, unsupported, missing, denied, or malformed resolves to `''` or remains literal token text, depending on whether the input matched the exact placeholder grammar.

## Field-resolution safety

To resolve `[[field_name]]` safely:

1. enable `acf/prevent_access_to_unknown_fields` temporarily if needed
2. call `get_field_object( $field_name, $post_id, true, true, false )`
3. require a real field object
4. require the field type allowlist check to pass
5. require `allow_in_bindings` to be explicitly truthy
6. require the resolved formatted value to be scalar

This keeps placeholder access aligned with an existing field-level exposure toggle and prevents arbitrary meta reads.

## Final sanitization contract

Do not use `get_field_object( ..., true )` escaped-html output as the final placeholder output because the generic `acf` KSES context is broader than the spec’s inline-only requirement.

Instead, the final insertion pipeline is:

1. get the formatted but unescaped field value
2. reject non-scalars
3. cast to string
4. sanitize via `wp_kses( $value, $allowed_html )` with the fixed allowlist below
5. return the sanitized string

## Fixed inline HTML allowlist

This draft resolves the blocker from review with a final explicit allowlist.

Allowed tags and attributes:

```php
array(
	'a'      => array(
		'href'   => true,
		'target' => true,
		'rel'    => true,
		'title'  => true,
	),
	'abbr'   => array(
		'title' => true,
	),
	'b'      => array(),
	'br'     => array(),
	'cite'   => array(),
	'code'   => array(),
	'del'    => array(),
	'em'     => array(),
	'i'      => array(),
	'mark'   => array(),
	'small'  => array(),
	'strong' => array(),
	'sub'    => array(),
	'sup'    => array(),
)
```

Final decisions:

- `span` is **not allowed** in v1
- no `class`, `style`, `id`, `data-*`, `onclick`, or other event attributes are allowed on any tag
- no block-level tags are allowed, including `p`, `div`, headings, lists, tables, block wrappers, forms, iframes, embeds, scripts, and media containers

Why `span` is excluded:

- it mostly preserves styling hooks rather than semantic inline content
- excluding it keeps the output contract simpler and more predictable
- it reduces the chance of carrying theme/editor CSS coupling into placeholder output

## Output behavior examples

- plain text field value `Hello` → `Hello`
- wysiwyg value `<strong>Hello</strong>` → `<strong>Hello</strong>`
- wysiwyg value `<p>Hello</p>` → `Hello`
- wysiwyg value `<ul><li>One</li></ul>` → `One`
- wysiwyg value `<a href="https://example.com" onclick="x()">Link</a>` → `<a href="https://example.com">Link</a>`
- wysiwyg value `<span class="x">Hello</span>` → `Hello`
- unsafe/script markup → stripped, leaving only any safe surviving text

## Failure behavior

Return empty string for:

- field not found
- field found but `allow_in_bindings` missing or false
- unsupported field type
- formatted value is array/object/non-scalar
- formatted scalar is empty
- sanitization strips everything

Leave literal token text in place for:

- malformed placeholders that do not match the regex

This matches the spec’s distinction between malformed tokens and exact-syntax placeholders that resolve unsuccessfully.

# Compatibility and backward-compatibility considerations

## Stored content compatibility

No saved content changes are made. Raw placeholders remain in `post_content`.

## Deactivation behavior

Deactivating SCF disables runtime replacement and naturally exposes the original raw placeholder text. No migration or cleanup path is required.

## Gutenberg compatibility

Because the feature does not modify block serialization, editor content, or save-time output, posts containing placeholders can be reopened and resaved without block corruption introduced by this feature.

## Backward-compatibility tradeoff for legacy fields

The explicit `allow_in_bindings === true` requirement means some older fields will not render through placeholders until editors enable field exposure.

This is an intentional v1 security tradeoff:

- favors non-exposure over implicit exposure
- avoids changing the trust boundary of existing fields silently
- remains compatible with the spec’s narrow, safety-first first release

# Performance considerations

## Cheap bailouts

The callback should exit early on:

1. unsupported runtime context
2. unsupported block name
3. missing `[[` substring

## Per-request caching

Maintain a local cache keyed by post ID and field name, including empty-string results:

```php
array(
	123 => array(
		'movie_title' => 'Example',
		'missing_key' => '',
	),
)
```

This avoids repeated:

- field object lookup
- `allow_in_bindings` checks
- allowlist checks
- sanitization work

## Reuse existing SCF caches

Because resolution uses standard field APIs, SCF’s existing formatted value cache in `acf_format_value()` also helps reduce repeated cost.

# Testing strategy

## PHP tests

Add a focused test class, e.g.:

- `tests/php/includes/test-scf-post-content-placeholders.php`

Required coverage:

1. paragraph placeholder replacement for a supported text field
2. heading placeholder replacement for a supported number/date-like field
3. multiple placeholders in one block
4. repeated placeholder in one block resolves once and returns cached result
5. malformed token remains unchanged
6. missing field returns empty string
7. unsupported field type returns empty string
8. `allow_in_bindings` missing returns empty string
9. `allow_in_bindings` false returns empty string
10. `allow_in_bindings` true allows supported field output
11. `select` returning array resolves empty
12. `wysiwyg` keeps allowed inline tags
13. block-level tags are stripped
14. `span` and disallowed attributes are stripped
15. unsupported block names are untouched
16. non-frontend or non-`the_content` contexts are untouched

## E2E tests

Add a dedicated Playwright scenario, e.g.:

- `tests/e2e/post-content-placeholders.spec.ts`

Suggested flow:

1. create a post field group with at least one supported field having `allow_in_bindings` enabled
2. create a post with placeholders in Paragraph and Heading blocks
3. publish and verify frontend replacement
4. confirm raw placeholder text still exists in the editor after reopening the post
5. verify malformed tokens remain visible on frontend
6. verify a field with `allow_in_bindings` disabled renders empty
7. verify an unsupported context such as excerpt or REST response stays raw
8. deactivate the plugin and verify raw placeholder text appears again

## Coverage intent

- PHP tests lock down parsing, gating, eligibility, and sanitization.
- E2E tests prove Gutenberg compatibility, frontend rendering, and deactivation-safe persistence.

# Rollout or migration notes

## Rollout

Ship as an always-on server-render feature with no user-facing migration.

## Migration

None in v1.

## Documentation follow-up

Documentation should explicitly state:

- exact placeholder syntax
- supported block types
- requirement that the field be configured for editor/UI exposure (`allow_in_bindings` enabled)
- frontend-only behavior
- empty-output behavior for unsupported or denied fields
- inline HTML limitations for WYSIWYG values
- deactivation behavior

# Risks

1. **Adoption friction for legacy fields**: requiring explicit `allow_in_bindings` may surprise users who expect all text-like fields to work immediately.
2. **Context edge cases**: some themes/plugins may invoke block rendering in unusual ways, so the gating checks must remain conservative.
3. **Sanitization surprises**: users may expect full WYSIWYG markup, but v1 intentionally strips structural HTML.
4. **Third-party filter ordering**: other filters may alter bracket text before the supported render path sees it, preventing replacement.

# Open questions

Only non-blocking future questions remain:

1. Should a future version add editor affordances such as autocomplete, insertion UI, or author warnings for unresolved placeholders?
2. Should a future version expand supported render contexts beyond singular frontend `the_content`?
3. Should a future version add a dedicated placeholder-access setting separate from block bindings, if product requirements diverge?
4. Should a future version expand the inline allowlist or supported block list after usage feedback?
