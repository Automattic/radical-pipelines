# Code Plan: Normalize issue content into the standard prompt format when creating a pipeline

Source issue: [Automattic/radical-pipelines#71](https://github.com/Automattic/radical-pipelines/issues/71).

This plan is the ordered, implementable derivation of the approved design (`2-design-doc/design-doc.md`, decisions D1–D6 and the "Full target shape of `create-pipeline.md` step 4") against the approved spec (`1-spec/spec.md`, R1–R12, AC1–AC15). It adds no scope and drops none.

## Nature of this change (read before implementing)

This is a **self-referential, documentation/instruction-design change** to the Radical Pipelines skill. The "code" is Markdown instruction files the orchestrator and its agents read and follow. There is **no application code and no unit/e2e test framework** — do **not** invent one. Each task's **Acceptance** is therefore a set of concrete, checkable assertions on the edited Markdown: grep-able presence/absence checks, cross-link integrity, no duplicated format definition, and a rendering-specimen check.

Every edit is bound by the project's "Rules when modifying the skill" (`AGENTS.md:5-11`), abbreviated below as they appear in the design:

- **R-min** — minimalist; every word serves a purpose; say it in fewer words if you can.
- **R-dup-path** — no duplicate information in the current reading path.
- **R-neg** — no negative phrasing ("don't do X") unless strictly necessary for operation.
- **R-generic** — no tool-specific names in the skill (no `gh`, no "web fetch tool", etc.) except in files dedicated to a specific tool, which the orchestrator loads conditionally. `.rp.md` is tool-specific config and is **exempt** from R-generic.
- **R-dup-cross** — an instruction repeated across *different* reading paths must be extracted to a separate referenced file.

After writing each file, re-read it and apply the R-min self-check ("can I say this in fewer words without losing meaning?"). Match the surrounding tone and idioms of the file you are editing.

## File change surface (from the design)

| File | Touched by task(s) |
| --- | --- |
| `skills/radical-pipelines/reference/manage-issues.md` | T1 (link-target stability check only) |
| `skills/radical-pipelines/reference/conventions/setup.md` | T2 |
| `.rp.md` | T3 |
| `skills/radical-pipelines/reference/create-pipeline.md` | T4 (the core rewrite of step 4 + step-4/step-5 reconciliation) |
| `.changeset/<slug>.md` | T5 (release hygiene; phase-5/docs concern, listed here for completeness) |

Verified current state (line numbers are pre-edit anchors, for the writer's orientation):
- `manage-issues.md:12-22` — "The issue format" (the single taxonomy source; bullet list Title/Goal/Constraints/Context/Assumptions, omit-empty at `:14`, minimal case at `:22`).
- `manage-issues.md:60-62` — step 5 "Draft, confirm, write" (the render→confirm→write idiom to mirror).
- `create-pipeline.md:21-28` — step 4 "Generate the initial prompt" (today: `:25` "Adapt the issue content"; `:26` no-converge seed; `:27` asset download scoped to "the issue"; `:28` self-contained note).
- `create-pipeline.md:30-32` — step 5 "Commit" (the standalone silent commit to fold into the approval branch).
- `setup.md:62-66` — "Issues (required)"; capability sentence at `:64` ("read, comment on, and update them").
- `.rp.md:14-24` — "Creating an issue" / "Modifying an issue" subsections; **no** "Reading an issue" subsection today.
- `work-on-an-issue.md:39` (step 2, create the pipeline) precedes `:41` (step 3, pick the workflow mode) — confirms the confirmation gate is upstream of mode selection (D5).

## Task ordering and dependency rationale

T1, T2, T3 are independent groundwork (link-target stability + the two capability grants) and may proceed in any order or in parallel. **T4 depends on T1** (it cross-links the section title T1 guarantees is stable) and is the largest task. **T5** (changeset) is a docs/release-phase concern that describes the shipped behavior; it depends conceptually on T4 being settled. Order: T1 → (T2, T3) → T4 → T5.

---

## T1 — Confirm/stabilize the cross-link target section title in `manage-issues.md`

**Goal.** Guarantee that `manage-issues.md` retains the section heading **"The issue format"** verbatim as a stable link target for T4's cross-link, and that the section remains the **single** definition of the canonical section taxonomy. This task makes **no structural change** to the taxonomy; it only protects the link target and the single-source invariant.

**Files.**
- `skills/radical-pipelines/reference/manage-issues.md`

**Changes.**
- Verify the heading at `manage-issues.md:12` is exactly `## The issue format` and leave it unchanged (this is the parenthesized section title T4 will cite). Do **not** rename it.
- Verify the taxonomy bullet list (Title / Goal / Constraints / Context / Assumptions, with the omit-empty rule and the "vague idea → Title + Goal" minimal case) stays intact and unchanged.
- Make an edit here **only if** required to keep the cited heading stable (per the design, this is the sole permitted touch). If no edit is needed, the task's deliverable is the verified invariant — record that the file is unchanged. Do **not** relocate or duplicate the taxonomy.

**Depends on.** None.

**Traces to.** R1, R3; AC1, AC4. Design D1 ("Single source + load-bearing cross-link"); design file-by-file row for `manage-issues.md` ("No structural change … Touch only if needed to keep the cited section heading stable as a link target").

**Acceptance.**
- `grep -n '^## The issue format$' skills/radical-pipelines/reference/manage-issues.md` returns exactly one match (the link target T4 cites exists and is unique).
- The taxonomy section still lists the canonical sections (Title, Goal, Constraints, Context, Assumptions) and still contains the omit-empty rule and the "vague idea yields just a Title and a Goal" minimal case — i.e. the single source of truth is preserved.
- No second, independent enumeration of the section taxonomy is introduced anywhere by this task (single source preserved). If the file is left unchanged, that is a valid, expected outcome.

---

## T2 — Extend the **Issues (required)** capability to include reading comments (`setup.md`)

**Goal.** Make the body-only Issues capability cover **reading an issue's comments**, so the synthesis inputs in T4 (read body + all comments) rest on a real, granted capability. Keep the wording **generic** (no tool names) — `setup.md` is part of the skill.

**Files.**
- `skills/radical-pipelines/reference/conventions/setup.md`

**Changes.**
- Edit the capability sentence at `setup.md:64`. Today: "… the orchestrator needs a way to **read, comment on, and update them**." Extend it minimally to also grant reading their comments — e.g. "… needs a way to **read them and their comments, comment on, and update them**" (final wording subject to R-min). One sentence; additive only.
- Do **not** add external-URL / web-fetch capability here — that is not a tracker capability and does not belong in the Issues convention (design D3, D-T1).
- Leave the access-mechanism sentence (`setup.md:66`, "Ask the owner which tracker … and how to access it") unchanged.

**Depends on.** None.

**Traces to.** R5; AC6. Design D3 / "Supporting capability grants (D-T1 realized)" — first bullet (`setup.md` "Issues (required)" gains comment-reading; external-URL fetch excluded).

**Acceptance.**
- The "Issues (required)" capability sentence now references reading an issue's **comments** in addition to reading, commenting on, and updating issues (grep the section for "comment" used as a *reading* target, not only as the existing "comment on" verb).
- The sentence remains **generic**: no tool name (`gh`, MCP, etc.) is introduced into this sentence beyond the existing illustrative-access mention at `:66` (which is unchanged).
- No web-fetch / external-URL capability is added to the Issues convention (grep the "Issues (required)" block: no "URL", "web", "external", "fetch" capability granted there).
- The edit is additive (one sentence changed); no other capability lines in `setup.md` are altered.

---

## T3 — Add a "Reading an issue" note granting comment-reading in dogfood `.rp.md`

**Goal.** Make the comment-reading capability concrete for this repository's own (dogfood) project config: state that reading an issue includes its comments, accessed via the project's tracker tool. Naming `gh` is allowed here because `.rp.md` is tool-specific config (exempt from R-generic).

**Files.**
- `.rp.md`

**Changes.**
- Under "Managing tasks", add a short **"Reading an issue"** subsection (peer to the existing "Creating an issue" at `.rp.md:14` and "Modifying an issue" at `:22`) stating that reading an issue includes reading its comments, via the `gh` CLI (the source-of-truth tracker per `.rp.md:9-11`). Keep it to one or two lines, matching the terse style of the sibling subsections.
- Naming `gh` here is correct and expected (`.rp.md` is the tool-specific config). Do not over-specify; mirror the existing subsections' brevity.

**Depends on.** None. (Parallels T2; both realize D-T1, one generic in the skill, one tool-specific in dogfood config.)

**Traces to.** R5; AC6 (dogfood). Design D3 / "Supporting capability grants (D-T1 realized)" — second bullet (`.rp.md` gains a "Reading an issue" note; `gh` allowed); design file-by-file row for `.rp.md`.

**Acceptance.**
- `.rp.md` "Managing tasks" now contains a **"Reading an issue"** subsection (e.g. `grep -n '#### Reading an issue' .rp.md` returns a match), alongside the pre-existing "Creating an issue" and "Modifying an issue" subsections.
- That subsection states that reading an issue **includes its comments**.
- The subsection is short (1–2 lines) and consistent in tone/format with its sibling subsections; `gh` is named (allowed in `.rp.md`).

---

## T4 — Rewrite `create-pipeline.md` step 4 (synthesis inputs, canonical-format reference + rendering wrapper, normalize-don't-converge + surface-conflicts, asset broadening, confirmation gate + revise loop) and reconcile step 5

**Goal.** Replace the four-gap step 4 with the design's target sequence so that pipeline creation always produces `prompt.md` in the documented canonical wrapper, synthesized from body + all comments + one-hop references, normalized (not converged), with conflicts surfaced, and **written and committed only after explicit owner approval** (with a revise loop). Fold the standalone commit (current step 5) into the approval branch. This is the core task; T1–T3 exist to support it.

**Files.**
- `skills/radical-pipelines/reference/create-pipeline.md`

**Changes.** Rewrite step 4 ("Generate the initial prompt", `create-pipeline.md:21-28`) to express the design's "Full target shape of step 4" logical sequence, and reconcile step 5 (`:30-32`). The required content, mapped to design decisions:

1. **Create the `0-prompt/` subfolder** (keep from today's `:23`).

2. **Gather inputs (D3, D-T6).** Instruct the synthesis to **read the issue body and every comment, noting each comment's author**; and to **fetch and read references cited directly in the body or any comment** — GitHub-internal references via the **Issues** convention's access mechanism, other references via web fetch — **one hop only** (references found inside fetched references are not crawled) and **best-effort** (an unreachable or gated reference is noted, and creation proceeds on the accessible material). Phrase generically: no tool names (route GitHub-internal through the **Issues** convention; use generic "web fetch" wording for other URLs), per R-generic. Do **not** invent an orchestrator "web capability" construct — phrase it as a plain instruction (the asset-download precedent at today's `:27`).

3. **Download assets (D6, D-T5).** Broaden the asset-download instruction from "the issue" (today's `:27`) to **"the issue, any comment, or a cited reference."** Keep the existing rules: assets go into `0-prompt/` and are referenced from `prompt.md` by **relative path**; extend the **self-contained** note (today's `:28`) so it covers body + comments + one-hop references (a downstream agent reading `prompt.md` plus the assets need not reach back to the body, the comments, **or** the references). Assets are downloaded **before** the draft is shown so the draft's relative-path links resolve.

4. **Synthesize into the referenced canonical format (D1) and render in the documented wrapper (D2).**
   - **Reference, do not duplicate (D1):** cite the single taxonomy source using the repo's file+section idiom — e.g. "Synthesize the gathered material into the canonical format defined in `manage-issues.md` (\"The issue format\")." **Do not enumerate** Goal / Constraints / Context / Assumptions anywhere in `create-pipeline.md`.
   - **Document the prompt-file wrapper (D2):** pin the one concrete file shape — a top `# Prompt` H1 identifying the file; a source-attribution line as a `> Source:` blockquote pointing to the originating issue; a self-contained note (the file is self-contained; downstream agents do not need to open the issue); then the canonical body sections per the referenced format, rendered as real `## ` headings, empty sections omitted (no `N/A`, no empty headings). Goal always present. Include the documented rendering specimen so AC5 is checkable. The minimal valid output is `# Prompt` + source line + `## Goal`.

5. **Normalize, don't converge; surface conflicts (D4).** Keep and extend the existing no-converge seed (today's `:26`): reorganize the gathered material into the canonical sections **preserving stated intent in substance**; file hypotheses, proposed directions, and beliefs about cause/current state under **Assumptions / directions to explore**, labeled open; add **no** requirements, acceptance criteria, technical directions, design, or implementation detail beyond what the source held; **never substitute a different goal**. When body and comments conflict, or a later comment appears to revise the original ask, reflect the **best current reading** and **surface the conflict/revision to the owner at the confirmation step** rather than silently choosing or dropping. Favor positive phrasing (R-neg); retain only the operationally-necessary "must not" clauses (no goal substitution; no added requirements).

6. **Confirmation gate + revise loop, in-place (D5, D-T2, D-T7).** End step 4 with a compact render→confirm→revise→write loop, mirroring the `manage-issues.md:60-62` idiom but for the prompt-**file** subject: **show the owner the full rendered `prompt.md` text** (the exact content to be written, **not a summary**) together with any surfaced conflicts/revisions; **if the owner requests changes, revise and show again** (loop repeats); **on explicit approval, write `prompt.md` and commit (in that order)**. **Nothing of the synthesized prompt is written to disk before approval.** Reference the **Commit format** convention at the commit moment. The gate is **unconditional, regardless of mode** (creation runs upstream of mode selection; do **not** add a `Decisions` section). Do **not** introduce any committed phase-0 approval artifact (AC14).

7. **Reconcile step 5 ("Step-4/step-5 reconciliation").** The current standalone "Commit" step (`:30-32`) must no longer be a separate silent commit. Fold the commit into step 4's approval branch (write + commit on approval). Then either remove step 5 entirely or reduce it to a pointer to the **Commit format** convention used at the approval moment. Either is acceptable; the binding outcome is **no separate silent commit step** — `prompt.md` is written and committed only after explicit owner approval, in that order. If a step is removed, leave the remaining step numbering coherent.

Keep steps 1–3 of `create-pipeline.md` (slug, worktree, artifact folder) unchanged.

**Depends on.** T1 (the cross-link in change-item 4 targets the "The issue format" heading T1 guarantees is stable). Conceptually relies on T2/T3 having granted the comment-reading capability that change-item 2 exercises, but does not edit those files.

**Traces to.** R1–R12; AC1–AC15. Design D1 (cross-link, item 4), D2 (rendering wrapper, item 4), D3 (synthesis inputs/access-split, item 2), D4 (normalize/surface-conflicts, item 5), D6 (assets/self-containment, item 3), D5 (confirmation gate + revise loop, item 6), and "Step-4/step-5 reconciliation" (item 7). "Full target shape of `create-pipeline.md` step 4" (1–7) is the canonical sequence.

**Acceptance.**

*Canonical format & single source (R1, R3; AC1, AC4):*
- `create-pipeline.md` cites the taxonomy via the file+section idiom: `grep -n 'manage-issues.md' skills/radical-pipelines/reference/create-pipeline.md` matches a reference that names the section "The issue format" (the load-bearing cross-link).
- `create-pipeline.md` does **not** re-enumerate the section taxonomy: it contains no independent list of "Goal / Constraints / Context / Assumptions" as a *definition* of the format (the only place that list lives is `manage-issues.md`). (Section *headings* appearing inside the rendering specimen are the wrapper illustration, not a competing taxonomy definition — see the rendering check below; the prose must reference, not define.)

*Rendering wrapper documented & checkable (R2, R4; AC2, AC3, AC5):*
- Step 4 documents the prompt-file wrapper: a top `# Prompt` H1, a `> Source:` blockquote attribution line, and a self-contained note; followed by the canonical body sections as real `## ` headings with empty sections omitted (no `N/A`, no empty headings).
- A rendering specimen is present in step 4 (the documented shape), and it shows Goal always present with Constraints/Context/Assumptions marked "only if present", so AC5 ("produced files match the documented rendering") is checkable and AC3 (minimal = `# Prompt` + source line + `## Goal`) is explicit.

*Synthesis inputs (R5, R6; AC6, AC7, AC8):*
- Step 4 instructs reading the issue **body and every comment**, noting each comment's **author**.
- Step 4 instructs fetching/reading **directly-cited references** with the **access split** (GitHub-internal via the **Issues** convention's access mechanism; other references via web fetch), explicitly **one hop** (references inside fetched references are not crawled) and **best-effort** (an inaccessible/gated reference is noted and creation proceeds).
- The synthesis-input wording is **generic**: no tool name (`gh`, named web-fetch tool, MCP) appears in `create-pipeline.md` (grep confirms none introduced). Access is routed through the **Issues** convention + generic "web fetch."

*Normalize, don't converge; surface conflicts (R7, R8; AC9, AC10):*
- Step 4 states the synthesis preserves stated intent, files hypotheses/directions under **Assumptions / directions to explore** labeled open, adds no requirements/AC/design/implementation, and **never substitutes a different goal**.
- Step 4 states that conflicts between body and comments (or a revising comment) are **surfaced to the owner at confirmation**, not silently resolved or dropped.

*Owner confirmation (R9, R10, R11; AC11, AC12, AC13, AC14):*
- Step 4 contains a render→confirm→revise→write loop that **shows the full rendered `prompt.md` text** (not a summary), **revises and re-shows on request**, and **writes + commits only on explicit approval, in that order**.
- The text makes clear **nothing is written to disk before approval** (the gate is before the *write*, not just the commit).
- The gate is **unconditional**: no per-run mode (autonomous/assisted) skips it, and **no `Decisions` section** is added to `create-pipeline.md` (`grep -n '^## *Decisions' skills/radical-pipelines/reference/create-pipeline.md` returns nothing).
- **No phase-0 approval artifact** is introduced (the flow produces `prompt.md` and assets only; nothing instructs writing an approval-record file for phase 0).

*Assets & self-containment (R12; AC15):*
- The asset-download instruction is broadened to **"the issue, any comment, or a cited reference"**, keeps the **relative-path** rule, and the **self-contained** note now spans body + comments + one-hop references. Assets are downloaded **before** the draft is shown.

*Step-4/step-5 reconciliation:*
- There is **no separate silent commit step**: either the old step 5 is removed (the commit now lives in step 4's approval branch) or step 5 is reduced to a pointer to the **Commit format** convention. `grep -n 'Commit' skills/radical-pipelines/reference/create-pipeline.md` shows the commit is tied to the approval moment, not a standalone unconditional commit after a silent write. Remaining step numbering is coherent.

*AGENTS.md compliance (cross-cutting):*
- R-min: additions are tight (the wrapper spec ~3 lines + a specimen); re-read and trim. R-neg: positive phrasing except the load-bearing "must not" clauses. R-generic: no tool names introduced. R-dup-path / R-dup-cross: taxonomy referenced not copied; the confirm-loop is in-place (sibling-path to `manage-issues.md`, never co-loaded), consistent with the design's recorded reasoning — no new shared file is created.

---

## T5 — Add a `minor` changeset describing the normalized-prompt behavior

**Goal.** Record the shipped behavior change in a Changesets entry so the release flow (CHANGELOG + version bump) picks it up. This is release hygiene; it is the docs/phase-5 concern flagged in the design, included here so the plan covers the full change surface.

**Files.**
- `.changeset/<slug>.md` (new file; suggested slug `normalize-prompt-format.md`).

**Changes.**
- Create a new changeset file with the repo's frontmatter shape (matching the existing entries, e.g. `.changeset/per-agent-model-config.md`):
  - Frontmatter: `"@automattic/radical-pipelines": minor`.
  - Body: a concise prose summary (one paragraph, present-tense, consistent with the existing changeset prose) describing that pipeline creation now synthesizes the issue body, all comments, and one-hop cited references into the single canonical prompt format (Title + Goal / Constraints / Context / Assumptions, omit-empty), pinned to a documented prompt-file rendering (`# Prompt` H1 + `> Source:` line + self-contained note), with normalize-don't-converge behavior, surfaced conflicts, and a required owner-confirmation gate (with a revise loop) before the prompt is written and committed. Mention the supporting capability grants (Issues convention comment-reading in `setup.md`; dogfood `.rp.md` "Reading an issue").
- Do **not** edit `CHANGELOG.md` or any version file by hand — the release workflow consumes the changeset.

**Depends on.** T4 (the changeset describes the behavior T4 implements). May also reference T2/T3's grants.

**Traces to.** Release hygiene (design "file-by-file change surface" `.changeset/<slug>.md` row; design "Open items for later phases — Docs phase"). No spec R# / AC# (out of the spec's functional scope; required for repo release process).

**Acceptance.**
- A new `.changeset/*.md` file exists with valid frontmatter `"@automattic/radical-pipelines": minor`.
- Its body is a single concise prose paragraph (matching the style of the sibling changesets) that accurately summarizes the normalized-prompt-format behavior and names the supporting grants.
- No manual edits to `CHANGELOG.md` or version-bearing files were made in this task.

---

## Coverage check — every requirement and AC is owned by a task

| Spec | Owning task(s) |
| --- | --- |
| R1 / AC1 (single source) | T1, T4 |
| R2 / AC2 (canonical sections, omit-empty) | T4 |
| AC3 (minimal → minimal) | T4 |
| R3 / AC4 (referenced, not duplicated) | T1, T4 |
| R4 / AC5 (rendering documented & matched) | T4 |
| R5 / AC6 (body + all comments) | T2, T3 (grants), T4 (instruction) |
| R6 / AC7 (one-hop references) | T4 |
| AC8 (inaccessible reference doesn't block) | T4 |
| R7 / AC9 (normalize, not converge) | T4 |
| R8 / AC10 (conflicts surfaced) | T4 |
| R9 / AC11 (commit gated on confirmation, always) | T4 |
| R10 / AC12 (full rendered prompt shown) | T4 |
| R11 / AC13 (revise-and-re-confirm) | T4 |
| AC14 (no phase-0 approval file) | T4 |
| R12 / AC15 (assets + self-containment) | T4 |
| Release hygiene (changeset) | T5 |

Out-of-scope items (carried from spec/design) are deliberately **not** tasks: no phase-0 approval file, no transitive/deep research, no PR review-thread ingestion, no requirements/AC/design/task-breakdown in `prompt.md`, no goal substitution, no new prompt format. T4's acceptance assertions actively guard several of these (no `Decisions` section, no approval artifact, no taxonomy duplication, no added requirements).
