# Task

Create a technical design for GitHub issue #419, "Experiment: Add Gutenberg-compatible custom field placeholders for post content."

# Spec reference

- Approved phase-1 spec: `.pi/pipelines/issue-419-gutenberg-custom-field-placeholders/spec.md`
- Pipeline prompt: `.pi/pipelines/issue-419-gutenberg-custom-field-placeholders/prompt.md`

# Problem recap

The approved spec requires Secure Custom Fields to replace exact `[[field_name]]` tokens inside Gutenberg-authored post content at render time, without mutating stored `post_content`. v1 is intentionally narrow:

- frontend only
- singular current-post rendering only
- only through the standard `the_content` path
- only for Gutenberg Paragraph and Heading blocks
- only for an explicit allowlist of scalar/text-capable post field types
- silent failure for missing, empty, malformed, unsupported, or non-public fields
- sanitization that preserves only inline-safe HTML

The design therefore needs to solve two tensions at once:

1. be precise enough to touch only the intended Gutenberg render path
2. reuse existing SCF field loading/formatting behavior without exposing unsupported field values or unsafe HTML

# Goals and non-goals

## Goals

1. Replace exact `[[field_name]]` tokens during frontend render for `core/paragraph` and `core/heading` blocks only.
2. Leave saved `post_content` unchanged in the database.
3. Resolve values only from the current post using existing SCF field APIs.
4. Restrict replacement to an explicit field-type allowlist plus a public-display check.
5. Sanitize resolved output to an inline-safe HTML subset before insertion.
6. Fail closed to an empty string for unsupported, missing, empty, non-scalar, or non-public fields.
7. Reuse existing SCF/ACF formatting caches where possible and avoid repeated work within a single render.

## Non-goals

1. No editor-side live substitution.
2. No placeholder insertion UI, autocomplete, or validation UI.
3. No support for excerpts, feeds, REST-rendered content, admin previews, widgets, comments, or non-post objects.
4. No support for nested placeholders, transforms, filters, or fallback syntax.
5. No support for structured field outputs such as repeater, group, gallery, relationship, image, file, or arbitrary arrays/objects.
6. No content migration or stored-content rewrite.

# Architecture overview

## Proposed implementation shape

Add a dedicated frontend service, for example:

- `includes/class-scf-post-content-placeholders.php`

Load it from `secure-custom-fields.php` alongside other frontend/core includes, then instantiate it during plugin bootstrap.

## Service responsibilities

The service should:

1. register the render hook
2. gate execution to the approved v1 context
3. scan supported block HTML for exact placeholders
4. resolve placeholder values from SCF field metadata/value APIs
5. sanitize resolved values for inline insertion
6. cache per-request resolved values per post/field
7. expose narrowly-scoped internal filters for future extension

## Why a dedicated service

A dedicated class keeps the feature isolated from:

- template API behavior (`get_field()`, shortcode)
- block bindings behavior
- field-type classes
- generic `the_content` behavior for non-block content

That isolation matters because the spec is narrower than existing SCF display surfaces.

# Rendering/data flow

## Hook choice

Use block render filtering, not raw whole-content string replacement.

Preferred approach:

- hook `render_block`
- early-return unless the block is `core/paragraph` or `core/heading`

Rationale:

1. It scopes replacement to the exact Gutenberg block types required by the spec.
2. It avoids accidentally replacing tokens inside unsupported blocks that also pass through `the_content`.
3. It still runs during frontend `the_content` rendering because block output is produced by `do_blocks()` inside the normal content pipeline.
4. It preserves saved block serialization because replacement happens after parsing and during render.

A `the_content`-only implementation would be simpler but too broad for v1 because it could replace tokens in unsupported block output or non-block markup.

## Context gate

The callback should return the original `$block_content` unless all of the following are true:

1. `! is_admin()`
2. `is_singular()`
3. `doing_filter( 'the_content' )`
4. `in_the_loop()`
5. `is_main_query()`
6. current block name is exactly `core/paragraph` or `core/heading`
7. current post ID resolves to a valid post object
8. block content contains `[[`

This gate intentionally keeps unsupported contexts raw:

- excerpts
- REST responses
- feeds
- editor canvas previews
- arbitrary `render_block()` consumers outside the singular content loop

## Replacement flow

Per supported block render:

1. Receive rendered block HTML from `render_block`.
2. Skip immediately if no `[[` substring exists.
3. Run a regex match for exact placeholders only:
   - `~\[\[([A-Za-z0-9_-]+)\]\]~`
4. For each unique placeholder name in the block, resolve a replacement string.
5. Replace exact matched tokens with the resolved value.
6. Return the modified block HTML.

## Why exact-regex replacement is sufficient

The regex only matches the approved token shape. Everything else remains untouched by construction:

- `[[movie title]]` does not match
- `[movie_title]` does not match
- `[[movie_title]` does not match
- `[[movie_title|upper]]` does not match

Malformed tokens therefore stay visible to authors, matching the spec.

# Integration points and hooks/APIs

## WordPress integration points

### `render_block`

Primary integration point for replacement.

Expected callback responsibilities:

- inspect block name
- verify frontend singular `the_content` context
- rewrite only the rendered HTML string for supported blocks

## SCF/ACF APIs to reuse

### `get_field_object( $selector, $post_id, true, true, false )`

Use strict field lookup by field name against the current post.

Why this API:

- it resolves the actual field object, not just a raw value
- it provides field type metadata for allowlist checks
- it uses the field-reference lookup path via `acf_maybe_get_field()`
- it returns `false` when the field reference is not valid for the current post

This is safer than loose field-name lookups because it stays bound to the current post’s field reference metadata.

### `acf_format_value()` via `get_field_object()`

Let SCF field types perform their existing formatting first. This is especially important for:

- date/time fields
- select/radio/button-group labels
- WYSIWYG field content

### `acf_field_type_supports()`

Use as a secondary capability check where helpful, but do not let it replace the explicit v1 allowlist. The spec requires a fixed supported-type contract.

### `acf/prevent_access_to_unknown_fields`

Within placeholder resolution, temporarily enable the same protection pattern already used by the shortcode path so unknown-field access fails closed.

That means:

1. add `__return_true` to `acf/prevent_access_to_unknown_fields` before field lookup if it is not already enabled
2. remove it after lookups are complete

This prevents loose fallback behavior from loading ad hoc meta when a proper SCF field reference is missing.

## New internal hooks

The feature can add internal/public-but-advanced filters without changing defaults. Suggested names:

- `scf/post_content_placeholders/supported_field_types`
- `scf/post_content_placeholders/inline_allowed_html`
- `scf/post_content_placeholders/is_field_allowed`
- `scf/post_content_placeholders/prepared_value`

These should default to the spec behavior and exist only for future extensibility.

# Data model and state assumptions

## Placeholder token model

A placeholder token is not stored as structured data. It remains literal text inside `post_content` and block attributes/content exactly as authored.

v1 token model:

- opener: `[[`
- identifier: `[A-Za-z0-9_-]+`
- closer: `]]`

No nesting, escaping syntax, fallback syntax, or directives are supported.

## Current-post assumption

All lookups are against the currently rendered singular post. No cross-object IDs are parsed from the placeholder.

## Field eligibility state

A placeholder resolves only if all of the following are true:

1. the field exists on the current post via SCF field reference metadata
2. the field type is in the explicit allowlist
3. the field is considered public-display-safe for this feature
4. the formatted value is scalar
5. the scalar value is not empty after normalization

## Supported field-type allowlist

The design should hardcode the spec’s v1 allowlist, then optionally pass it through a filter:

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

## Additional per-type constraints

### `select`

Only allow a single scalar resolved value.

Reject and return empty when:

- the field is configured for multiple values
- the formatted value is an array
- the formatted value is an object or non-scalar

### `wysiwyg`

Allow string output only, then re-sanitize to the placeholder-specific inline HTML subset.

### all other allowed types

Require final formatted output to be scalar.

# Security and sanitization considerations

## Security posture

The implementation should fail closed.

Unsupported or uncertain cases must resolve to `''`, not to raw field data.

## Public-display check for sensitive/non-public fields

The spec excludes fields intended to be non-public. v1 needs an enforceable, code-level rule for that.

Recommended rule:

1. require the field type to be in the explicit allowlist
2. treat `allow_in_bindings === false` as an explicit deny signal
3. allow an internal filter (`scf/post_content_placeholders/is_field_allowed`) to deny additional fields

This reuses the repository’s existing field-level exposure concept without adding a new v1 UI.

Behavior detail:

- if a field explicitly disables "Allow Access to Value in Editor UI" (`allow_in_bindings` false), placeholder output is empty
- if the setting is absent on legacy fields, default behavior follows the saved field object plus the feature’s allowlist/filter checks

This is not a perfect semantic model of "sensitive," but it is the most incremental, testable security boundary already present in the SCF codebase.

## Sanitization pipeline

Do **not** rely solely on `get_field_object(..., true, true, true)` for final insertion, because the built-in escaped HTML path uses the broad `acf` KSES context and may still allow block-level tags such as `<p>` or lists. The spec requires an inline-only subset.

Recommended pipeline:

1. Resolve the formatted value unescaped:
   - `get_field_object( $name, $post_id, true, true, false )`
2. Ensure the resulting value is scalar.
3. Cast to string.
4. Sanitize using a placeholder-specific allowed-tags list with `wp_kses()`.
5. Return the sanitized string.

## Inline allowed HTML policy

Create a dedicated allowlist for inline-safe markup only. Suggested baseline:

- `a` with safe URL-related attributes
- `abbr`
- `b`
- `br`
- `cite`
- `code`
- `del`
- `em`
- `i`
- `mark`
- `small`
- `span` with a very limited attribute set if needed
- `strong`
- `sub`
- `sup`

Notably excluded:

- `p`
- headings
- lists and list items
- tables
- div/section/layout wrappers
- iframe/embed/form/script/style
- media wrappers

`wp_kses()` will strip disallowed tags while preserving allowed child text/inline markup where possible. That aligns with the spec requirement to strip block-level markup rather than render it structurally.

## URL and attribute safety

If links are allowed, rely on `wp_kses()` to enforce safe attributes and protocols.

## Failure modes

The following all return `''` silently:

- field not found
- unsupported field type
- explicitly denied field
- non-scalar formatted output
- empty formatted output
- malformed field data
- sanitization reducing output to empty

The following remain literal text because they never match the regex:

- malformed placeholders
- non-exact bracketed tokens

# Compatibility and backward-compatibility considerations

## Stored content compatibility

No migration is required because `post_content` is never rewritten.

## Plugin deactivation behavior

Because saved content remains raw, deactivating SCF naturally falls back to visible `[[field_name]]` text. No cleanup or rollback is needed.

## Gutenberg compatibility

This design is compatible with Gutenberg because it does not:

- alter saved block serialization
- rewrite block attributes in the editor
- inject editor-only markup into saved content

The placeholder remains plain text in Paragraph and Heading blocks, so reopening and resaving content should not trigger block validation errors.

## Interaction with existing SCF output surfaces

The feature should not change behavior of:

- `get_field()`
- `the_field()`
- shortcode output
- REST formatting
- block bindings

It reuses pieces of those systems but adds an isolated render path.

# Performance considerations

## Scope minimization

Most renders should bail out quickly via:

1. singular/frontend/main-loop checks
2. block-name checks
3. `strpos( $block_content, '[[' ) === false`

## Value caching

Use two existing/per-request caching layers:

1. SCF formatted value caching inside `acf_format_value()` / value store
2. a placeholder-service local cache keyed by `post_id + field_name`

The local cache avoids repeating:

- field-object lookup
- allowlist checks
- public-display checks
- inline `wp_kses()` sanitization

Suggested cache shape:

```php
array(
	$post_id => array(
		'movie_title' => 'Resolved value',
	),
)
```

Cache empty-string results too, so repeated missing/unsupported placeholders are cheap.

## Regex cost

Run regex replacement only on supported blocks containing `[[`. This keeps the feature cost proportional to actual placeholder usage.

# Testing strategy

## PHP tests

Add focused PHPUnit coverage for the new service, likely under:

- `tests/php/includes/test-scf-post-content-placeholders.php`

Recommended cases:

1. exact placeholder replacement for supported field types
2. multiple placeholders in one block string
3. repeated placeholder in one render uses cached result
4. malformed tokens remain unchanged
5. missing field returns empty string
6. unsupported field type returns empty string
7. `select` with array output returns empty string
8. explicit `allow_in_bindings` false returns empty string
9. WYSIWYG/HTML value preserves allowed inline tags
10. block-level tags are stripped from WYSIWYG output
11. unsafe tags/attributes are stripped
12. unsupported block names are untouched
13. non-singular or out-of-loop contexts are untouched

Implementation note: these tests should exercise the service methods directly where possible, and use WordPress filter application where integration behavior matters.

## E2E tests

Add a Playwright scenario covering the author workflow, likely with a dedicated test plugin fixture and a new spec such as:

- `tests/e2e/post-content-placeholders.spec.ts`

Recommended E2E flow:

1. create a field group with supported fields attached to posts
2. create a post containing placeholders in a Paragraph block and a Heading block
3. save and publish
4. verify frontend singular view shows resolved values
5. reopen the post in Gutenberg and confirm the raw placeholder text still exists in the editor content
6. verify a malformed token remains raw on the frontend
7. verify at least one unsupported context stays raw, preferably REST content or excerpt output
8. deactivate SCF and confirm raw placeholder text appears again

## Why both PHP and E2E are needed

- PHP tests cover parsing, gating, field eligibility, and sanitization deterministically.
- E2E tests prove Gutenberg authoring/save/reopen behavior and deactivation-safe persistence.

# Rollout or migration notes

## Rollout

This can ship as an always-on narrow v1 feature with no migration.

## Migration

None required.

## Documentation follow-up

Post-implementation docs should explain:

- exact placeholder syntax
- supported blocks
- supported field types
- frontend-only limitations
- empty-output behavior for missing/unsupported fields
- deactivation behavior
- inline-HTML sanitization limitations for WYSIWYG values

# Risks

1. **Context-gating drift**: some themes/plugins may call `the_content` or `render_block` in unusual places, so singular/main-loop checks must be conservative.
2. **Field-publicity ambiguity**: "sensitive/non-public" is a product concept, not a first-class stored field property. Reusing `allow_in_bindings` is incremental but imperfect.
3. **Sanitization surprises**: users may expect full WYSIWYG markup, but v1 intentionally strips block-level HTML.
4. **Third-party filter order**: if other filters mutate bracket text before the callback sees it, replacement will not occur.
5. **Block render assumptions**: if Gutenberg/core changes paragraph or heading render details, block-level targeting may need adjustment, though the exact block names are stable.

# Open questions

1. Should placeholder eligibility require `allow_in_bindings` to be explicitly true, or only deny when it is explicitly false? The former is more conservative; the latter is more backward-compatible.
2. Should the callback use generic `render_block` with block-name checks, or dynamic block-specific filters if the target WP baseline guarantees them? Generic `render_block` is simpler and easier to reason about.
3. Should the feature emit `acf/removed_unsafe_html` or a new silent internal action when sanitization strips markup, or stay entirely silent in v1?
4. Should the inline allowed-tags list include `span`, and if so, which attributes should survive? The narrower the list, the safer and more predictable the output.
5. Should the service expose a future opt-in filter for additional supported blocks, or keep block support fully hardcoded until a later spec broadens scope?
