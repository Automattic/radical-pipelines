# Code Summary: Unify the documentation concept on plural "docs"

## What

The documentation-phase concept is now spelled plural (`docs`) everywhere the skill and agent definitions name it, plus the derived copies that ship alongside those names. The change touches the changeset, `.rp.md`, `README.md`, four concept agent files (renamed), two cross-referencing agent files, six skill reference files, and `website/demo.js`. The four documentation-concept agents are now `docs-plan-writer`, `docs-plan-reviewer`, `docs-writer`, `docs-reviewer` — in their `name:` frontmatter, their filenames, and every reference across the in-scope trees. The phase-3 plan artifact is `docs-plan.md` (with `docs-plan-review-N-rejected.md` / `docs-plan-review-approved.md`), including the phase-3 completion predicate and the phase-5 input list. Display labels, template headings, and Mermaid node/edge labels are plural (`Docs Plan`, `Docs Writer`, the edge `commits docs updates`, the plan title `# Docs Plan: <feature name>`, etc.).

## Why

The concept was spelled inconsistently — singular in the agents and phase-3 plan artifacts, already plural in phase 5's outward identity — producing contradictions such as a singular-named `doc-reviewer` writing the plural-named `docs-review-approved.md`. Standardizing on the plural removes that split and brings the agent names in line with the phase-5 convention and the code phase's `code-writer`/`code-plan.md` forms. The derived copies are kept in sync so the orchestrator still resolves each agent's model by an exact `name:` match, the homepage demo no longer spells the same concept two ways, and the most-read file (README) does not re-introduce the singular form.

## How

A fixed three-step procedure, one task per step plus a verification task:

1. **Four single-document rewords** (commit `4c21de3`). Four bare-`doc` occurrences meaning a single document (not the phase concept) were reworded, not pluralized: `agents/design-doc-reviewer.md` → "the design doc faithfully reflects"; `assisted-phases/3 - plan.md` → "who the surface is for"; `agents/docs-writer.md` → "a reference page may" and "into a reader-facing page". This runs first because three sit on a `doc␣` token the substitution would otherwise wrongly pluralize.
2. **One anchored, case-preserving substitution** (commit `efd68fd`). A single `perl` regex — the oracle pattern plus a capture/replacement — rewrites the leading `doc`/`Doc` token to `docs`/`Docs` across the in-scope files, iterated null-safely so the two space-named phase files are handled. It protects `design-doc`, `document(ation)`, and already-plural `docs` per match, so what it changes equals exactly what the oracle counts. This step produces every renamed identifier, prose form, label, heading, and Mermaid label at once.
3. **Four `git mv` renames** (commit `5dd305c`). Each concept agent's file was renamed so its stem matches its now-plural `name:`; agents are discovered by filename, so the rename is load-bearing for discoverability. Staged as rename-with-modification, preserving history.

Verification is the design's one-time acceptance suite, independently re-run: the per-match oracle goes 164 → 0; the four new agent files exist with matching `name:`; the four old files are gone; and the scope-independent corruption invariants (`docss`, `design-docs`) are both 0. Protected-concept counts match the design's predictions exactly (`design-doc`/`Design Doc` 240, `document`/`documentation` 118). Per the project rule, no structural tests over skill prose were added.

## Key decisions

- **One anchored substitution, not per-form edits.** Anchoring on the leading noun and never reading the trailing word catches every compound and phrase form by construction and makes the substitution pattern the oracle pattern plus a replacement, so the change set provably equals the oracle's count set. Enumerating literal find-replace pairs was rejected as drift-prone (it can miss trailing inflections like `-writers`/`tasks`).
- **Rewords before substitution.** Applying the four Requirement-8 rewords first removes the only ambiguous single-document tokens cleanly, so the pattern stays minimal — no per-phrase carve-outs needed.
- **`perl`, not `sed`.** The lookbehind/lookahead require Perl-compatible regex (BSD/macOS `sed` lacks them) and match the oracle's `grep -P` dialect, so substitution and verification share one engine.
- **`README.md:112` brought into scope** via an owner-approved spec amendment: its Pi-package install list named all four agents singular; leaving it would re-create the exact contradiction this change removes, in the most-read file.

## Known limitations

- `.pipelines/**` historical records (including this pipeline's own pre-rename phase-3 artifacts, e.g. `3-plan/doc-plan.md`) intentionally retain the old singular names as the artifacts those runs produced; rewriting them would falsify history. Going forward this pipeline uses the new `docs-*` names.
- The published `CHANGELOG.md` is a historical release record and is left unchanged; only the pending changeset fragment was updated.
