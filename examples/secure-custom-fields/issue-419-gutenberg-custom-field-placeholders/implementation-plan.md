# Task

Create an implementation-ready phase-3 plan for GitHub issue #419, "Experiment: Add Gutenberg-compatible custom field placeholders for post content."

# Spec reference

- Approved spec: `.pi/pipelines/issue-419-gutenberg-custom-field-placeholders/spec.md`
- Approved design: `.pi/pipelines/issue-419-gutenberg-custom-field-placeholders/design.md`
- Approved design review: `.pi/pipelines/issue-419-gutenberg-custom-field-placeholders/design-review-v2.md`

# Design reference

- Primary design document: `.pi/pipelines/issue-419-gutenberg-custom-field-placeholders/design.md`
- Prior rejected draft for context: `.pi/pipelines/issue-419-gutenberg-custom-field-placeholders/design-v1.md`
- Current approved design revision: `.pi/pipelines/issue-419-gutenberg-custom-field-placeholders/design-v2.md`

# Implementation summary

Implement a new frontend-only placeholder service that hooks into `render_block`, rewrites only rendered `core/paragraph` and `core/heading` block HTML during supported singular `the_content` renders, resolves exact `[[field_name]]` tokens against the current post via SCF field APIs, enforces the approved v1 field allowlist plus explicit `allow_in_bindings` opt-in, sanitizes values to a fixed inline-only HTML subset, and leaves unsupported or malformed cases raw or empty according to the approved spec.

The implementation should stay tightly scoped to the approved v1 behavior:

- no save-time mutation of `post_content`
- no editor-side live substitution
- no REST/excerpt/feed support
- no support beyond paragraph and heading blocks
- no structured/non-scalar field output
- no broad `the_content` whole-string replacement

# Work breakdown

1. **Add the placeholder service class**
   - Create `includes/class-scf-post-content-placeholders.php`.
   - Implement constructor-based hook registration for `render_block`.
   - Add private/protected helpers for runtime gating, placeholder extraction, field resolution, allowlist checks, inline sanitization, and per-request caching.

2. **Bootstrap the service in plugin load/init flow**
   - Include the new class file from `secure-custom-fields.php` during plugin bootstrap.
   - Instantiate the service inside `ACF::init()` after field types are loaded and before `do_action( 'acf/init', ACF_MAJOR_VERSION );`.
   - Keep instantiation unconditional, with runtime checks inside the service preventing unsupported execution.

3. **Implement supported runtime gating**
   - In the `render_block` callback, bail unless all approved conditions are met:
     - frontend only
     - non-JSON request
     - non-feed
     - singular request
     - inside `the_content`
     - main query / loop
     - block name exactly `core/paragraph` or `core/heading`
     - valid current post ID
     - block output contains `[[`
   - Return original block HTML untouched for all unsupported contexts.

4. **Implement exact placeholder parsing and replacement**
   - Match only `[[field_name]]` via the approved regex `~\[\[([A-Za-z0-9_-]+)\]\]~`.
   - Deduplicate placeholder names per block before lookup.
   - Replace exact matches only; malformed or non-exact bracketed text must remain untouched.
   - Ensure multiple and repeated placeholders in one block are supported deterministically.

5. **Implement safe field resolution**
   - Resolve values with `get_field_object( $field_name, $post_id, true, true, false )`.
   - Follow the approved temporary unknown-field protection pattern around `acf/prevent_access_to_unknown_fields`.
   - Require a real field object tied to the current post.
   - Reject unsupported field types, absent/false `allow_in_bindings`, non-scalar values, and empty normalized values.
   - Cache results per request by post ID + field name, including empty-string failures.

6. **Implement inline-only sanitization**
   - Add a fixed placeholder-specific allowed HTML map using the approved tags/attributes only.
   - Sanitize final string output with `wp_kses()`.
   - Preserve safe inline HTML for supported values.
   - Strip block-level and disallowed markup rather than rendering it.
   - Return empty string if sanitization yields no usable output.

7. **Add PHP automated coverage**
   - Create a focused PHPUnit test file for the new service.
   - Cover runtime gating, replacement behavior, unsupported field behavior, `allow_in_bindings` behavior, scalar checks, sanitization, and malformed token handling.

8. **Add E2E coverage for Gutenberg authoring and frontend rendering**
   - Add a new Playwright spec focused on paragraph/heading placeholders.
   - Verify authoring, save/reopen behavior, frontend replacement, unsupported token behavior, raw persistence, and deactivation-safe behavior.

9. **Run targeted validation**
   - Execute targeted PHPUnit tests for the new class.
   - Execute the focused E2E scenario through repository npm scripts.
   - Optionally run relevant lint/format commands if the implementation introduces style issues.

# File-by-file changes

## `secure-custom-fields.php`

Planned changes:

- Add `acf_include( 'includes/class-scf-post-content-placeholders.php' );` in the main bootstrap include list.
- Instantiate `new SCF_Post_Content_Placeholders();` in `ACF::init()` after field types are available and before `do_action( 'acf/init', ACF_MAJOR_VERSION );`.

Why:

- The service must be loaded early enough to be available in runtime, but instantiated only after SCF field APIs and field-type registrations exist.

## `includes/class-scf-post-content-placeholders.php` (new)

Planned contents:

- New `SCF_Post_Content_Placeholders` class.
- Constructor registering `add_filter( 'render_block', array( $this, 'filter_render_block' ), 10, 2 );`.
- Methods/helpers for:
  - supported runtime checks
  - supported block-name checks
  - placeholder regex matching
  - unique placeholder extraction
  - request-local cache reads/writes
  - temporary `acf/prevent_access_to_unknown_fields` protection
  - field lookup and eligibility checks
  - final placeholder-specific inline sanitization
  - allowed HTML map definition
- Optional internal filters only if implementation needs them and they do not change defaults:
  - `scf/post_content_placeholders/supported_field_types`
  - `scf/post_content_placeholders/inline_allowed_html`
  - `scf/post_content_placeholders/is_field_allowed`
  - `scf/post_content_placeholders/prepared_value`

Why:

- Keeps the feature isolated from shortcode, REST, and generic block-binding behavior while matching the approved design.

## `tests/php/includes/test-scf-post-content-placeholders.php` (new)

Planned coverage:

- paragraph replacement success
- heading replacement success
- multiple placeholders in one block
- repeated placeholder reuse/cache behavior at output level
- malformed token remains unchanged
- missing field returns empty
- unsupported field type returns empty
- `allow_in_bindings` absent returns empty
- `allow_in_bindings` false returns empty
- `allow_in_bindings` true permits supported field output
- non-scalar/select-array result returns empty
- `wysiwyg` inline HTML preservation
- block-level/disallowed markup stripping
- unsupported block name remains untouched
- unsupported runtime/context remains untouched

Why:

- Most feature risk is in PHP render-time behavior, so coverage should lock down exact parsing, gating, safety, and sanitization contracts.

## `tests/e2e/post-content-placeholders.spec.ts` (new)

Planned coverage:

- create/configure a field group with supported fields
- ensure placeholder-capable field has `allow_in_bindings` enabled
- create a post using paragraph and heading placeholders
- verify frontend replacement after save/publish
- reopen editor and confirm raw placeholders remain in content
- verify malformed tokens still render literally
- verify disabled/denied field resolves empty
- verify at least one unsupported context stays raw
- deactivate plugin and verify raw placeholder text reappears

Why:

- Confirms the feature works through Gutenberg save/reopen/frontend flows, not just in isolated PHP tests.

## Possible existing test helpers touched only if needed

### `tests/e2e/field-helpers.js`

Potential changes:

- Only update if a reusable helper is needed to create fields with `allow_in_bindings` enabled or to simplify post-content setup.

### `tests/e2e/fixtures.js`

Potential changes:

- Only update if common admin/editor setup needs a new fixture utility.

These helper changes are optional; prefer keeping the first E2E spec self-contained unless duplication becomes excessive.

# Hook/bootstrap changes

1. **Plugin bootstrap include**
   - Add the new placeholder class file to the core include list in `secure-custom-fields.php`.

2. **Plugin init instantiation**
   - Instantiate the service in `ACF::init()` after field-type includes and before `acf/init` fires.

3. **Runtime filter registration**
   - Register one new filter:
     - `render_block` → `SCF_Post_Content_Placeholders::filter_render_block()`

4. **No save/editor bootstrap additions**
   - Do not add hooks for block serialization, `save_post`, editor JS, REST formatting, or broad `the_content` replacement.

5. **Possible internal extension filters**
   - Only add `scf/...` filters if needed to encapsulate internal policy without widening the default scope.

# Data flow changes

1. WordPress renders a post through the normal frontend singular `the_content` pipeline.
2. Each Gutenberg block passes through `render_block`.
3. The new service receives rendered block HTML and the parsed block array.
4. The service returns early unless the render matches the approved v1 runtime and block constraints.
5. For supported paragraph/heading block HTML containing `[[`, the service scans for exact placeholders.
6. The service deduplicates matched field names per block.
7. For each unique field name, the service:
   - checks cache for the current post ID
   - temporarily enables `acf/prevent_access_to_unknown_fields` if not already enabled
   - calls `get_field_object()` for the current post
   - validates type allowlist and `allow_in_bindings`
   - ensures the resolved formatted value is scalar and non-empty
   - sanitizes the final string through placeholder-specific inline KSES
   - stores the final string or empty string in cache
8. The service replaces exact placeholder matches in block HTML with the resolved sanitized strings.
9. The rendered post continues through the normal output pipeline.
10. Stored `post_content` remains unchanged throughout.

# Sanitization and security tasks

1. **Unknown-field access hardening**
   - Reuse the existing shortcode-style `acf/prevent_access_to_unknown_fields` pattern during placeholder resolution.
   - Ensure temporary filter removal happens reliably after lookup.

2. **Supported type enforcement**
   - Implement the approved explicit allowlist only:
     - `text`
     - `textarea`
     - `number`
     - `range`
     - `email`
     - `url`
     - `select` when scalar
     - `radio`
     - `button_group`
     - `date_picker`
     - `date_time_picker`
     - `time_picker`
     - `wysiwyg`

3. **Public-display enforcement**
   - Require `allow_in_bindings` to be present and truthy.
   - Treat missing or false values as denied output.

4. **Scalar-only enforcement**
   - Reject arrays, objects, and other non-scalar outputs.
   - Treat multi-select/array-like outputs as unsupported for this render.

5. **Inline-only HTML sanitization**
   - Use a fixed `wp_kses()` allowlist for:
     - `a[href,target,rel,title]`
     - `abbr[title]`
     - `b`, `br`, `cite`, `code`, `del`, `em`, `i`, `mark`, `small`, `strong`, `sub`, `sup`
   - Explicitly exclude `span`, `class`, `style`, `id`, `data-*`, event attributes, and all block-level tags.

6. **Silent failure behavior**
   - Exact placeholders with missing/denied/unsupported/empty results must render `''`.
   - Malformed tokens must remain literal.
   - No user-facing warnings, comments, or debug strings should be injected.

7. **No unsafe execution paths**
   - Do not evaluate shortcodes, scripts, embeds, event handlers, or arbitrary HTML as part of placeholder output.

# Test plan

## PHPUnit

Run targeted tests for the new class first, then broader PHP coverage if needed:

```bash
composer test:php -- --filter Post_Content_Placeholders
# or
vendor/bin/phpunit tests/php/includes/test-scf-post-content-placeholders.php
```

Minimum PHPUnit assertions:

- supported placeholder replacement in paragraph output
- supported placeholder replacement in heading output
- repeated placeholders produce same output
- malformed tokens remain unchanged
- missing fields resolve empty
- unsupported block names are untouched
- unsupported runtime gates are untouched
- unsupported field types resolve empty
- missing/false `allow_in_bindings` resolves empty
- safe inline HTML is preserved
- block-level/disallowed tags are stripped
- array/non-scalar values resolve empty

## E2E

Run the focused Playwright spec through the required npm wrapper:

```bash
npm run test:e2e -- tests/e2e/post-content-placeholders.spec.ts
```

Minimum E2E assertions:

- placeholder survives save/reopen in Gutenberg
- frontend paragraph replacement works
- frontend heading replacement works
- malformed token remains raw on frontend
- unsupported/denied field renders empty
- unsupported context remains raw
- deactivation reveals original raw placeholder text

## Optional quality checks

If implementation touches multiple files or triggers formatting issues:

```bash
composer lint:php
npx wp-scripts lint-js
```

Only run JS lint if helper/spec changes require it.

# Rollout/verification steps

1. Build the feature behind normal plugin initialization with no migration.
2. Create a manual verification post with paragraph and heading placeholders.
3. Confirm frontend singular rendering replaces supported placeholders.
4. Confirm the editor still shows raw `[[field_name]]` text after reopen/resave.
5. Confirm excerpts/REST/feed behavior remains raw or otherwise untouched.
6. Confirm a denied field (`allow_in_bindings` disabled) renders empty without warnings.
7. Confirm a WYSIWYG field preserves safe inline markup but strips structural HTML.
8. Deactivate the plugin and confirm raw placeholder text becomes visible again.
9. If all tests and manual checks pass, the orchestrator can promote the approved plan and proceed to implementation.

# Risks and dependencies

## Risks

1. **Legacy field behavior surprise**
   - Existing fields may default to `allow_in_bindings` true in some stored contexts, while the design requires explicit presence + truthiness checks for placeholders. Implementation must follow the approved design exactly, and tests should document this behavior.

2. **Context-gating edge cases**
   - Theme/plugin variations in `render_block`, loop state, or content rendering order may reveal edge cases; the gate should remain conservative rather than trying to broaden support.

3. **Sanitization surprises for WYSIWYG values**
   - Users may expect full rich markup, but v1 intentionally strips block-level structure.

4. **Test setup complexity**
   - E2E setup may need careful field creation/configuration to ensure `allow_in_bindings` is enabled and predictable.

## Dependencies

- Existing SCF APIs, especially `get_field_object()` and field type registration in `ACF::init()`.
- WordPress frontend block render pipeline via `render_block`.
- Existing field setting `allow_in_bindings` behavior.
- Existing PHPUnit bootstrap and E2E wp-env setup.

# Out of scope

- Replacing placeholders in excerpts, REST content, feeds, widgets, comments, or admin previews.
- Supporting blocks beyond `core/paragraph` and `core/heading`.
- Save-time content mutation or serialization changes.
- Live editor preview/substitution while typing.
- Cross-object lookups or field-key syntax.
- Nested placeholders, fallback syntax, filters, or formatting directives.
- Structured field rendering for repeaters, groups, images, files, relationships, or arbitrary arrays/objects.
- User-facing UI for inserting or validating placeholders.

# Open questions

1. During implementation, do existing PHP test utilities already provide a clean pattern for simulating `render_block` in-loop singular contexts, or will the new test class need small custom setup?
2. For E2E coverage of unsupported contexts, is excerpt rendering the simplest stable assertion, or is a REST response check more reliable in this repository’s test environment?
3. If minor helper extraction is needed for E2E field setup, should it stay local to the new spec or be promoted into shared helpers after the first implementation lands?
