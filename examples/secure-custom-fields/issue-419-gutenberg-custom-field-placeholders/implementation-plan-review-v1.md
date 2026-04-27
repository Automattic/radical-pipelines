Decision: APPROVE

Why
- The plan is traceable to the approved spec and approved design, and it stays within the narrow v1 scope.
- It identifies the correct implementation surface:
  - new dedicated service class in `includes/class-scf-post-content-placeholders.php`
  - bootstrap include in `secure-custom-fields.php`
  - runtime registration through a single `render_block` filter
- The runtime gating, placeholder parsing, field-resolution rules, `allow_in_bindings` enforcement, inline-only sanitization, and cache behavior all map cleanly back to the approved design.
- File targets and bootstrap points are correct for this repository. The plan places inclusion in the main bootstrap include list and instantiation inside `ACF::init()` before `do_action( 'acf/init', ACF_MAJOR_VERSION );`, which is consistent with the approved design and existing plugin lifecycle.
- The plan covers the key safety requirements explicitly:
  - exact-regex matching only
  - no save-time mutation
  - no broad `the_content` whole-string replacement
  - no unsupported contexts
  - no structured/non-scalar output
  - no unsafe HTML execution
- Test coverage is sufficiently complete across PHP and E2E for the approved v1 behavior, including malformed tokens, unsupported blocks/contexts, `allow_in_bindings`, sanitization, persistence, and deactivation behavior.
- The sequencing is safe: bootstrap first, then runtime gating/parsing/resolution/sanitization, then tests and validation.

Plan notes
- The plan correctly keeps replacement limited to `core/paragraph` and `core/heading` block output via `render_block`, rather than broadening scope to classic content or arbitrary `the_content` HTML.
- The bootstrap details are concrete enough to implement without guesswork and align with the actual `secure-custom-fields.php` initialization flow.
- The safe field-resolution tasks are implementation-ready and correctly reuse the repository’s existing unknown-field access protection pattern from shortcode-related logic.
- The sanitization section is explicit and consistent with the approved inline-only allowlist from the design.
- The proposed PHP test file path `tests/php/includes/test-scf-post-content-placeholders.php` and E2E spec path `tests/e2e/post-content-placeholders.spec.ts` fit existing repository conventions.
- Optional helper changes are clearly marked as optional and do not expand scope.

Required changes
- None.

Next version expected
- No implementation-plan v2 required.
- Proceed to implementation using `implementation-plan-v1.md`.
