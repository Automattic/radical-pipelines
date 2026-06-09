# Design Doc: Normalize issue content into the standard prompt format when creating a pipeline

Source issue: [Automattic/radical-pipelines#71](https://github.com/Automattic/radical-pipelines/issues/71) — "Normalize issue content into the standard prompt format when creating a pipeline".

This design doc is standalone. It captures the architecture and the file-by-file change surface for the approved spec (`1-spec/spec.md`, requirements 1–12, AC1–AC15). A reader does not need to open the research log to implement from this.

## What kind of change this is

This is a **self-referential, documentation/instruction-design change** to the Radical Pipelines skill itself. There is no application code. The "system" being designed is a set of Markdown instruction files that the orchestrator and its agents read and follow. "Architecture" therefore means four concrete things:

1. **Placement** — which Markdown reference file each new piece of behavior lives in.
2. **Cross-linking** — how the pipeline-creation flow points at the *single* canonical-format definition so the two cannot drift apart, using the repo's existing cross-link idioms.
3. **Rendering convention** — how the literal shape of the `prompt.md` *file* is written down so that "always written in the canonical format" becomes checkable.
4. **Flow wording** — how the synthesis inputs, the normalize-don't-converge behavior, and the owner-confirmation gate are expressed in the creation flow, reusing existing house idioms.

Every decision below is constrained by the project's "Rules when modifying the skill" (`AGENTS.md`), reproduced here because they are load-bearing for the design:

- **R-min** — minimalist: every word serves a purpose; say it in fewer words if you can.
- **R-dup-path** — no duplicate information in the current reading path: if a file is only reachable through another that already states something, do not restate it.
- **R-neg** — no negative phrasing ("don't do X") unless strictly necessary for operation.
- **R-generic** — the skill stays generic: no tool-specific names (no `gh`, no "web fetch tool", etc.) except in files dedicated to documenting a specific tool, which the orchestrator loads conditionally.
- **R-dup-cross** — an instruction repeated across *different* reading paths must be extracted to a separate referenced file.

## The problem, precisely

The pipeline-creation flow lives in `skills/radical-pipelines/reference/create-pipeline.md`. It is reached from `work-on-an-issue.md` step 2 (line 39) when the owner starts work on an issue and no pipeline exists yet. The flow creates the worktree and artifact folder, writes `0-prompt/prompt.md`, and commits.

Today, step 4 "Generate the initial prompt" (`create-pipeline.md:21-28`) says only "Adapt the issue content as a prompt" (`:25`). It has four gaps the spec closes:

1. **No named format.** Step 4 never names the canonical sections (Goal / Constraints / Context / Assumptions), so it cannot enforce them. The format already exists, defined once, in `manage-issues.md` "The issue format" (`:12-22`) — but `create-pipeline.md` does not reference it.
2. **No documented file rendering.** The literal file wrapper (a top heading, a source-attribution line, a self-contained note) exists only by example in committed `prompt.md` artifacts, and those examples disagree (see "Motivating evidence" below). "Always in the canonical format" is therefore not checkable.
3. **Body-only inputs.** The flow reads the issue body. It does not read the issue's comments, and it does not fetch references the issue cites. Asset download (`:27`) is scoped to "the issue" alone.
4. **No confirmation gate.** Step 4 writes `prompt.md` to disk (`:23`) and step 5 commits it (`:30-32`) with no owner-confirmation step anywhere. The shape of `prompt.md` varies with the shape of the originating issue, and free-form third-party issues produce a different starting point than issues already written in this project's format.

### Motivating evidence — "by example" demonstrably failed

The reason requirement 4 (document the rendering) exists is concrete drift across the five committed `prompt.md` files in the repo:

| Artifact | Top heading | Source line | Self-contained note | Goal section |
| --- | --- | --- | --- | --- |
| `8-research…` | `# Prompt` | none (inline "based on GitHub issue #8") | no | **missing** |
| `90-per-agent-model-config` | `# Prompt` | plain `Source issue:` line | no | yes |
| `83-automate-releases` | issue **title** | `> Source:` blockquote | yes | yes |
| `70-restructure…` | issue **title** | `> Source:` blockquote | no | yes |
| `71-normalize-prompt-format` (our own) | `# Prompt` | `> Source:` blockquote | yes | yes |

The top heading is sometimes "Prompt", sometimes the issue title; the source line is sometimes a blockquote, sometimes a plain line, sometimes absent; the self-contained note is inconsistent; one file even omits Goal. Picking and documenting one rendering is what makes AC5 ("produced files match the documented rendering") enforceable.

## Architecture: where each piece of behavior lives

The change touches a small, deliberate set of files. The taxonomy stays in exactly one home; the file-wrapper gets exactly one home; the flow wording lives where the file is written; and the access capability is granted where capabilities are configured. The two "homes" are deliberately split because they describe two different things.

### Two layers, two homes

"Written in the canonical format" has two distinct layers, and the design keeps each in exactly one place:

- **Layer 1 — section taxonomy** (Title, Goal, Constraints, Context, Assumptions; omit-empty; minimal = Title + Goal). This describes an **issue body**. It lives in `manage-issues.md` "The issue format" and stays there.
- **Layer 2 — prompt-file wrapper** (a top heading identifying the file, a source-attribution line, a self-contained note, then the body sections). This describes a **standalone file** — an issue body has no `# Prompt` heading and no `> Source:` line; those exist *only* because the prompt is a file on disk. This layer is newly documented in `create-pipeline.md` step 4, where the file is actually written.

Putting the wrapper in `manage-issues.md` would be wrong: that file is about issue *bodies* written through the tracker, and a wrapper has no meaning for a tracker body. Putting the taxonomy in `create-pipeline.md` would duplicate the single source and violate R-dup-cross. So: **taxonomy → `manage-issues.md`; file-wrapper → `create-pipeline.md`.**

### The cross-link is load-bearing, not redundant

A key fact from the research that justifies "reference, don't duplicate": `manage-issues.md` is **not on `create-pipeline.md`'s reading path today**. The orchestrator reaches `create-pipeline.md` via `work-on-an-issue.md` step 2; neither file reads `manage-issues.md`. `manage-issues.md` is reachable only as a sibling entry-point in `SKILL.md`'s table (it is the "create/modify an issue" front door).

Consequently, a cross-link from `create-pipeline.md` → `manage-issues.md` ("The issue format") is the *only* thing that pulls the taxonomy onto the creation path. It is load-bearing. This is what makes "reference rather than restate" satisfy R-dup-path (the two files are on different paths, so referencing creates no on-path duplication) and R-dup-cross (the taxonomy already lives in one referenced file that `create-pipeline.md` will cite, so there is nothing to extract).

### File-by-file change surface

| File | Change | Requirements / ACs |
| --- | --- | --- |
| `skills/radical-pipelines/reference/create-pipeline.md` | Rewrite step 4. Name the canonical format by referencing `manage-issues.md` ("The issue format"); document the prompt-file rendering wrapper; instruct reading body + all comments and fetching one-hop references (generic, access-split); state normalize-don't-converge + surface-conflicts; broaden asset download to comments and references; gate the write+commit on owner confirmation with a revise loop. Fold the commit into the approval branch (reconcile with step 5). | R1–R12; AC1–AC15 |
| `skills/radical-pipelines/reference/manage-issues.md` | No structural change to "The issue format" — it stays the single source. Touch only if needed to keep the cited section heading stable as a link target. | R1, R3; AC1, AC4 |
| `skills/radical-pipelines/reference/conventions/setup.md` | "Issues (required)" capability sentence (`:64`): extend to include reading an issue's *comments* (generic wording). | R5; AC6 |
| `.rp.md` (dogfood project config) | Add a short "Reading an issue" note granting comment-reading and stating that reading an issue includes its comments. Naming `gh` is allowed here — `.rp.md` is tool-specific config, exempt from R-generic. | R5; AC6 (dogfood) |
| `.changeset/<slug>.md` | New `minor` changeset (prose) describing the normalized-prompt behavior. | Release hygiene (phase 5) |

Scope discipline:
- `manage-issues.md` keeps owning the section taxonomy (R1). The design does **not** relocate it (relocating would break `manage-issues.md` step 5, which renders the issue in that format, and is churn for no gain) and does **not** duplicate it into `create-pipeline.md`.
- **No new reference file is created.** The confirm-loop and the rendering wrapper live in-place in `create-pipeline.md`. Extraction is neither required (different reading paths; not verbatim-identical to any existing text) nor desirable (it would force parameterization that adds words, against R-min).

## Design decisions

### D1 — Single source + load-bearing cross-link (R1, R3; AC1, AC4)

The canonical section taxonomy remains defined **only** in `manage-issues.md` "The issue format" (`:12-22`). `create-pipeline.md` step 4 references it instead of re-listing the sections, using the repo's verified file+section idiom (`` `file.md` ("Section name") ``):

> Synthesize the gathered material into the canonical format defined in `manage-issues.md` ("The issue format").

`create-pipeline.md` does not enumerate Goal / Constraints / Context / Assumptions anywhere. Because the cited file is otherwise off `create-pipeline.md`'s reading path, this single reference both satisfies AC4 (the flow points to the definition rather than re-enumerating it) and pulls the taxonomy onto the path without on-path duplication (AC1: the taxonomy is found in exactly one place).

### D2 — Prompt-file rendering wrapper, documented in `create-pipeline.md` (R4; AC5)

Step 4 pins one concrete file shape, resolving the five-way artifact drift. The chosen rendering and the rationale for each choice:

- **A top `# Prompt` H1** identifying the file as the prompt. Chosen over "H1 = issue title" because the file *is* the prompt (the issue's title is captured inside the body's Title/Goal), and a fixed heading makes the wrapper mechanically checkable. This also matches the majority and most-recent artifacts, including our own dogfood prompt.
- **A source-attribution line** pointing to the originating issue, rendered as a `> Source:` blockquote. Chosen over a plain line for consistency with the majority of recent artifacts.
- **A self-contained note**: the file is self-contained; downstream agents do not need to open the issue.
- **Then the canonical body sections** per the referenced format (D1): Goal always present; Constraints / Context / Assumptions only when they have content; rendered as real `## ` headings, empty sections omitted entirely (no `N/A`, no empty headings).

Documented rendering specimen — this is what "matches the documented rendering" means in AC5:

```
# Prompt

> Source: <originating issue reference>. This file is self-contained; agents do not need to open the issue.

## Goal

<outcome>

## Constraints        ← only if present
## Context            ← only if present
## Assumptions / directions to explore   ← only if present
```

The minimal valid output is `# Prompt` + source line + `## Goal` (AC3 — a minimal issue yields a minimal but complete prompt).

### D3 — Synthesis inputs: read everything, fetch one hop, access-split, generic (R5, R6; AC6, AC7, AC8)

Step 4 instructs the synthesis to gather the full picture, phrased generically (no tool names, per R-generic):

- **Read the issue body and every comment, noting each comment's author.** Reading all comments is how the spec's "participants' conversation" is satisfied — it is not a separate input. Author attribution is net-new phrasing (the repo has no existing author-attribution idiom); it is kept minimal and used so that who-said-what is preserved where it matters to intent (e.g. a later comment that revises the ask).
- **Fetch and read references cited directly in the body or any comment** — GitHub-internal references via the **Issues** convention's access mechanism; other references via web fetch — **one hop only** (references found *inside* fetched references are not crawled), **best-effort** (an unreachable or gated reference is noted, and creation proceeds on the accessible material).

**The access split** is the key technical decision here, and it follows from how the codebase models capabilities:

- The skill never enumerates or gates the orchestrator's capabilities. The orchestrator is defined by role only (`SKILL.md:10`); every "the orchestrator…" mention describes an *action taken by instruction*, never a gated capability. So the right move is a plain instruction, not a new "the orchestrator can fetch the web" capability construct (which would be a novel out-of-style layer, against R-min).
- The precedent is asset download: `create-pipeline.md:27` already instructs the orchestrator to download the issue's assets — an external fetch — routed "through the access mechanism captured by the **Issues** convention," with no capability statement. The GitHub-internal half of reference-fetching literally reuses that idiom.
- A GitHub-internal reference (an issue/PR/file in the same tracker) is a tracker operation and rides the **Issues** convention's access mechanism. An arbitrary external URL is *not* a tracker operation, so it cannot ride the **Issues** convention; it is fetched via generic "web fetch." This split is exactly how the spec frames R6 (`spec.md:37`), and the generic vocabulary ("search and fetch … references") mirrors the existing researcher-agent Web idiom.

The capability is made real for projects by a minimal additive grant (D-T1 below in "Supporting capability grants"), not by inventing an orchestrator web-capability layer. R6's "best-effort, does not block creation" already covers a host tool that lacks web access.

### D4 — Normalize, don't converge; surface conflicts (R7, R8; AC9, AC10)

Step 4 keeps and extends the existing no-converge seed (`create-pipeline.md:26`). The synthesis:

- Reorganizes the gathered material (body, comments, one-hop references) into the canonical sections, **preserving stated intent in substance**.
- Files hypotheses, proposed directions, and beliefs about cause or current state under **Assumptions / directions to explore**, labeled open.
- Adds **no** requirements, acceptance criteria, technical directions, design, or implementation detail beyond what the source already held — those belong to later phases.
- **Never substitutes a different goal** for the one the source expresses.

When the body and comments conflict, or when a later comment appears to revise the original ask, the synthesis does **not** silently pick one reading or drop content. It reflects its best current reading and **surfaces the conflict or evolution to the owner at the confirmation step** (this rides the D5 gate), so the owner decides.

Phrasing follows R-neg: positive form where possible. The few "must not" clauses retained (no goal substitution; no added requirements) are kept because they are operationally load-bearing — they are the boundary that separates phase 0 from later phases, and removing them would re-admit the over-specification the spec exists to prevent.

This is a **normalize, not converge** boundary: phase 0 reshapes existing material into a fixed structure; it does not do the research, requirements work, or design that phases 1–5 own.

### D5 — Confirmation gate + revise loop, in-place (R8, R9, R10, R11; AC11, AC12, AC13, AC14)

Step 4 ends with a compact in-place loop, mirroring the `manage-issues.md:62` "Draft, confirm, write" idiom but for the prompt-*file* subject:

- **Show the owner the full rendered `prompt.md` text** — the exact content that will be written, not a summary — together with any surfaced conflicts/revisions from D4.
- **If the owner requests changes, revise and show again.** The loop repeats; nothing is committed until the owner approves.
- **On explicit approval, write `prompt.md` and commit** (in that order).

The gate sits **before the write**, not merely before the commit, because R9/AC11 require that the prompt is never *written or committed* silently. This mirrors `manage-issues.md:62` (render the draft and show it before writing to the tracker; write only on approval) and makes AC14 (no phase-0 approval file) trivially true: confirmation is transient, so no approval artifact is produced.

**Why in-place rather than extracted to a shared file:** the render→confirm→revise pattern is house style — it appears in-place in 7+ files and has never been extracted. `create-pipeline.md` and `manage-issues.md` are sibling entry points that are never co-loaded, so R-dup-path is satisfied. The two loops differ materially in subject (synthesis→file vs. issue→tracker) and only the new one surfaces conflicts (R8), so they are not the verbatim-repeated cross-path instruction that R-dup-cross targets. Extraction would force parameterization that adds words, against R-min.

**Why the gate is unconditional, regardless of mode:** pipeline creation runs *upstream* of mode selection. In `work-on-an-issue.md`, step 2 (create the pipeline → `create-pipeline.md`, line 39) precedes step 3 (pick the workflow mode, line 41). So synthesis and confirmation happen *before* the owner chooses autonomous vs. assisted and before any autonomous run starts. The confirmation therefore does not conflict with the autonomous workflow's "no further questions once the run starts" rule. There is also no `Decisions` section in `create-pipeline.md` and none is added: the autonomous workflow reads per-phase `Decisions` only for phases 1–5 (`autonomous-workflow.md:25`), and phase-0 creation predates the run. Confirmation is an unconditional gate inside creation, not an autonomous per-phase decision. There is **no pass-through exemption** for issues already written in the canonical format: synthesize → confirm → write runs every time, even when the synthesis is a near-identity reformat.

The revise loop's "if they want changes, revise and confirm again" wording mirrors the existing `autonomous-workflow.md:29` revise-loop idiom.

### D6 — Assets and self-containment, extended to the new inputs (R12; AC15)

Broaden the asset-download scope in `create-pipeline.md:27` from "the issue" to "the issue, any comment, or a cited reference." The existing rules are kept and now cover the broader input set:

- Downloaded assets go into `0-prompt/` and are referenced from `prompt.md` by **relative path**.
- The phase-0 folder stays **self-contained**: once committed, a downstream agent reading `prompt.md` plus the downloaded assets can understand the issue without reaching back to the body, the comments, **or** the one-hop references.

**Sequencing sub-decision:** assets are downloaded *before* the draft is shown to the owner, so the draft's relative-path asset links resolve when the owner inspects it. Assets are downloaded artifacts, not the synthesized prompt; AC14 only forbids an *approval* artifact, so downloading assets before approval violates nothing.

### Step-4/step-5 reconciliation

Today step 5 is a standalone "Commit" (`create-pipeline.md:30-32`). Because the write must be gated on approval (D5), the commit folds into step 4's approval branch (write + commit on approval). Step 5 is then either removed or reduced to a pointer to the **Commit format** convention used at the approval moment. The exact step renumbering is an implementation detail for the plan phase; the binding outcome is: **the synthesized `prompt.md` is written and committed only after explicit owner approval, in that order, with no separate silent commit step.**

### Supporting capability grants (D-T1 realized)

The synthesis instruction in D3 stays generic in the skill, but the underlying capability must be real for a project. Two minimal additive edits make it so:

- **`setup.md` "Issues (required)" (`:64`)** — extend the capability sentence from "read, comment on, and update them" to also include reading an issue's *comments* (generic; e.g. "read them and their comments, comment on, and update them"). External-URL fetch does **not** belong here — it is not a tracker capability.
- **`.rp.md` (dogfood)** — add a short "Reading an issue" note stating that reading an issue includes its comments. `.rp.md` already has "Creating an issue" and "Modifying an issue" subsections but no "Reading an issue" one; reading is only implied by "accessed via the `gh` CLI." Naming `gh` here is allowed because `.rp.md` is tool-specific config, exempt from R-generic.

## Full target shape of `create-pipeline.md` step 4

For the plan/code phases, the intended logical sequence inside step 4 (exact wording subject to R-min review) is:

1. Create the `0-prompt/` subfolder.
2. **Gather inputs** — read the issue body and every comment (noting each author); fetch and read one-hop references (GitHub-internal via the **Issues** convention's access mechanism, other references via web fetch; best-effort, noting any inaccessible reference).
3. **Download assets** from the issue, any comment, or a cited reference into `0-prompt/`.
4. **Synthesize** the gathered material into the canonical format defined in `manage-issues.md` ("The issue format"), normalizing without converging (D4), and render it in the documented prompt-file wrapper (D2).
5. **Show the full rendered draft** to the owner, surfacing any conflicts or revisions.
6. **Revise and re-show** on request, until the owner explicitly approves.
7. **On approval, write `prompt.md` and commit** (Commit format convention).

Nothing of the synthesized prompt is written to disk before approval.

## How the design satisfies each requirement and acceptance criterion

### Canonical format

- **R1 / AC1 — Single source.** Taxonomy stays only in `manage-issues.md` "The issue format" (D1). `create-pipeline.md` references it and defines no competing list.
- **R2 / AC2 — Canonical sections, omit-empty.** D1 (referenced taxonomy) + D2 (real `## ` headings, empty sections omitted). Goal stated as an outcome per the referenced definition.
- **R3 / AC4 — Format referenced, not duplicated.** D1: the flow cites `manage-issues.md` ("The issue format") instead of re-enumerating sections; the cross-link is load-bearing (off-path target), so it both references and pulls the taxonomy in without on-path duplication.
- **AC3 — Minimal issue → minimal prompt.** D2 specimen: `# Prompt` + source line + `## Goal` is a complete valid prompt.
- **R4 / AC5 — Rendering documented and matched.** D2 documents the wrapper (top heading + `> Source:` line + self-contained note + body sections) in `create-pipeline.md`; produced files match the documented specimen.

### Synthesis inputs

- **R5 / AC6 — Body + all comments.** D3: read the body and every comment, attributed to author; content present only in a comment is not dropped. Capability granted in `setup.md` + `.rp.md`.
- **R6 / AC7 — One-hop references fetched and used.** D3: fetch and read directly-cited references (access-split: GitHub-internal via **Issues** convention; other URLs via web fetch); references inside fetched references are not crawled.
- **AC8 — Inaccessible reference doesn't block.** D3: reference-following is best-effort; an unreachable/gated reference is noted and creation proceeds on accessible material.

### Synthesis behavior

- **R7 / AC9 — Normalize, not converge.** D4: reorganize into canonical sections preserving intent; hypotheses/directions filed under **Assumptions / directions to explore** labeled open; no requirements/AC/design/implementation added; no goal substitution.
- **R8 / AC10 — Conflicts surfaced.** D4 + D5: conflicting or revising comments are reflected as the best current reading and surfaced to the owner at confirmation, never silently resolved or dropped.

### Owner confirmation

- **R9 / AC11 — Commit gated on confirmation, always.** D5: the write *and* commit are gated on explicit approval; the gate is unconditional and upstream of mode selection (`work-on-an-issue.md` step 2 < step 3); no per-run mode skips it; no pass-through for already-canonical issues.
- **R10 / AC12 — Full rendered prompt shown.** D5: the owner sees the exact rendered `prompt.md` text, not a summary.
- **R11 / AC13 — Revise-and-re-confirm.** D5: on requested changes, the flow revises and re-shows; commits only on approval; the loop repeats until then.
- **AC14 — No phase-0 approval file.** D5: confirmation is transient (a gate before the write); no approval artifact is produced. Assets in `0-prompt/` are not an approval record.

### Preserved behaviors

- **R12 / AC15 — Assets + self-containment.** D6: asset download broadened to the issue, any comment, or a cited reference; relative-path references kept; the phase-0 folder remains self-contained across body + comments + one-hop references. Assets downloaded before the draft is shown so links resolve.

## Out of scope (carried from spec; the design adds nothing here)

- No phase-0 approval file (confirmation is transient).
- No transitive or deep external research at phase 0 — reference-following is one hop only; deep web/codebase research belongs to the spec and design-doc research agents.
- No PR review-thread ingestion; no following the issue's closing-PR cross-reference. Inputs are the issue body, its comments, and one-hop cited references only.
- No requirements, acceptance criteria, design, architecture, or task breakdown in `prompt.md`.
- No goal substitution.
- No new prompt format — the section taxonomy is the existing one; the only newly written-down piece is the prompt-file rendering wrapper (R4), which pins existing by-example behavior.

## AGENTS.md compliance check

- **R-min** — all additions are short; the rendering wrapper is ~3 lines; no padding.
- **R-dup-path** — taxonomy referenced, not copied; the confirm-loop and the `manage-issues.md` loop sit on different, never-co-loaded paths.
- **R-neg** — positive phrasing preferred; only the operationally-necessary "must not" clauses (no goal substitution, no added requirements) are kept.
- **R-generic** — no tool names in the skill; access routed through the **Issues** convention + generic "web fetch"; `gh` appears only in `.rp.md` (tool-specific config, exempt).
- **R-dup-cross** — not triggered: the two render→confirm loops differ in subject and content (only the new one surfaces conflicts) and are not verbatim repeats, so there is nothing to extract.

## Open items for later phases

- **Plan phase** — exact step renumbering of `create-pipeline.md` (fold-commit-into-step-4 vs. keep a trimmed step 5), and the precise final wording, subject to an R-min minimalism review.
- **Docs phase** — author the `minor` changeset; verify a produced `prompt.md` matches the documented rendering (AC5), e.g. by re-rendering this pipeline's own prompt to the documented shape if desired.
