# Code review: APPROVED

Reviewer: code-reviewer. Scope: the full batch of code-plan Tasks 1–5 for "Normalize issue content into the standard intent format when creating a pipeline", landed as commits `6174574`, `5bbc6ca`, `2d5e636`, `c1ad0d6` (diff `1cacde8..HEAD`, source files only).

## Verdict

**Approved.** The landed text satisfies every task's acceptance criteria, all 14 spec requirements, and all five hard constraints. No blocking findings.

## What was verified

**Edit set (Task 5).** Exactly the four intended source files changed: `skills/radical-pipelines/reference/create-pipeline.md`, `skills/radical-pipelines/reference/conventions/setup.md`, `skills/radical-pipelines/reference/intent-format.md`, and new `.changeset/normalize-issue-intent.md`. Nothing else outside `.pipelines/**`.

**Task 1 — `create-pipeline.md` step 4.**
- Heading retained; step 4 remains a single numbered step; step 5 is still "### 5. Commit"; no renumbering.
- Linear order is correct: folder-mechanics intro (retained) → gather → `**If**` passthrough → `**Otherwise**` full path (fetch → standalone authoring sentence → assets → confirmation gate) → retained self-containment closing rule.
- The gather precedes the branch and states the enumeration is what the branch is evaluated against.
- Passthrough predicates are the exact complement of the gate: canonical structural check (H1; `## Goal`; only allowed optional H2s; nothing else) + synthesis no-op + no comments + no in-tracker cross-references + no external links + no binary attachments. Passthrough writes the body unchanged apart from the provenance header, with no owner confirmation.
- The verbatim phrase "following the schema and authoring discipline in `intent-format.md`" survives intact in the standalone Synthesize bullet, uninterrupted by fetch mechanics, which sit in the preceding bullet. `review-pipeline.md:37`'s "the `create-pipeline.md` step-4 pattern" still resolves to that shared discipline; `review-pipeline.md` is not in the diff.
- External URLs fetched via "the orchestrator's own web-access tooling (a separate channel from the Issues convention)" — tool-agnostic, no tool named; one-level bound stated; unreadable references "noted visibly in the draft (e.g. under Context) rather than dropped" and surfaced at the gate.
- Confirmation gate mirrors `manage-issues.md` step 5: render, show to owner, write only on explicit approval; explicitly a transient interactive gate with no approval artifact; falls through to step 5.
- Synthesis clause covers fold-substance with links as convenience pointers, latest agreed state, and non-owner unsettled proposals as open Assumptions per `intent-format.md`.
- Grep-verified: no `#NN`, no "PR", no tracker names, no design italic meta-labels anywhere in the file.

**Task 2 — `setup.md` Issues clause.** The diff is confined to the line-64 verb clause, which now enumerates: read the issue body, read all of its comments, comment, update, and follow its in-tracker cross-references — tracker-agnostic. The `:66` "Ask the owner…" line (with its pre-existing tracker parenthetical) is byte-identical. No new heading, convention, or validation gate. `load.md` untouched.

**Task 3 — `intent-format.md` provenance H2.** Exactly three H2s now; the third is scope-named ("## Provenance header (intents created from an issue)"); the two existing sections are unedited (pure append). The header is documented as a two-line `> Source:` + self-containment blockquote, placed after the H1 and before the first H2, "exactly these two lines — no other content". The `> Source:` template is tracker-agnostic (`<issue reference and link, per the Issues convention>`). Scoping names all three intent kinds: applies to issue-derived base intents in both passthrough and synthesis cases; not to `manage-issues.md` issue bodies; not to review intents (Origin section instead, which matches `review-pipeline.md:39`). The template lives only here — `create-pipeline.md` points at it and never duplicates it.

**Task 4 — changeset.** `normalize-issue-intent.md` is new (no collision), kebab-case, valid frontmatter bumping `@automattic/radical-pipelines` `minor`, format mirrors `pipeline-reviews.md`, one self-contained tracker-agnostic paragraph covering full-picture read, canonical synthesis, owner approval gate, provenance header, and the passthrough fast-path.

**Spec coverage.** All 14 requirements map to landed text (requirements 1–3 via scope/anchoring and the preserved cross-reference; 4–7 via gather/fetch bullets, the two distinct channels, the one-level bound, the visible-unresolved-reference rule, and the `setup.md` extension; 8–10 via the Synthesize bullet; 11–12 via the gate text; 13 via the passthrough predicates; 14 via the new H2 plus pointers in both branches).

## Minor non-blocking notes

1. **Full-path provenance pointer is implicit.** The passthrough branch says "the provenance header (applied per `intent-format.md`)", but the full path's render bullet says only "(with the provenance header)" without its own "per `intent-format.md`" qualifier. The definition is unambiguous (the adjacent Synthesize bullet references `intent-format.md` twice, and the header is documented only there), so this reads fine — noted only because the plan asked for a pointer in both branches.
2. **`setup.md` verb-list grammar.** "…a way to read the issue body, read all of its comments, comment, update, and follow its in-tracker cross-references" — "comment" and "update" lost their objects ("comment on it, and update it" would read more smoothly). Meaning is clear; purely stylistic.
3. **Asset bullet lead-in bolded.** The retained `:26` asset bullet now opens "**If the issue has screenshots or other assets,**" — a formatting-only deviation from "wording is unchanged" that matches the house bold-lead-in idiom of its sibling bullets. Reasonable as landed.
