# Code plan: Normalize issue content into the standard intent format when creating a pipeline

## Orientation for the implementer

This is a change to the **Radical Pipelines orchestrator skill itself** — the deliverable is edited reference Markdown plus a changeset, not application code. "Code" in this plan therefore means precise, file-level prose edits to skill docs. There is no compiler and no test runner for prose; verification is done by re-reading each edited file against the acceptance criteria stated per task and by running the grep / structural checks called out below.

The change touches **exactly four files** (the approved design's edit set), nothing else:

1. `skills/radical-pipelines/reference/create-pipeline.md` — rewrite step 4.
2. `skills/radical-pipelines/reference/conventions/setup.md` — extend the Issues convention's capability clause in place.
3. `skills/radical-pipelines/reference/intent-format.md` — add a scope-named third H2 documenting the provenance header.
4. `.changeset/<name>.md` — a new `minor` changeset.

Read the approved design (`base/2-design-doc/design-doc.md`) and spec (`base/1-spec/spec.md`) before starting. The design's "File-level changes" section (§1–§4) is the authoritative specification of each edit; this plan orders those edits into independently verifiable tasks and translates the design's reader-facing notation into the literal, tracker-agnostic wording that must actually land in the files.

### Hard constraints that govern ALL skill text (read before writing a single word)

These come from `AGENTS.md` and from the four non-blocking notes in the approved design review (`base/2-design-doc/design-doc-review-approved.md`). They are the most common ways this change can go wrong:

- **No tracker-specific notation, ever, in skill text.** `AGENTS.md` forbids any mention of issue-tracking platforms (GitHub, Linear, Jira, …) and, by extension, tracker-specific notation. The design doc and spec describe cross-references with the reader-facing parenthetical "(`#NN`, linked PRs/issues)". **That parenthetical is explanatory shorthand in the design — it must NOT appear in the edited skill files.** The literal skill wording says **"in-tracker cross-references"** (or "cross-references") with no `#NN`, no "PR", no "issue link" examples. The single tolerated tracker-naming spot in the whole skill is the pre-existing ask-the-owner parenthetical in `setup.md:66` ("GitHub, Linear, Jira, GitLab, …"), which this change does **not** touch.
- **No design-organization meta-labels in skill text.** The design's §1c uses italic part-labels like "*Fetch mechanics (issue-specific — not part of the borrowed pattern)*" and "*Authoring discipline (standalone sentence …)*". These are how the design groups its reasoning; they are **not** skill prose. Do not copy them into `create-pipeline.md`. The required "textual distinctness" between fetch mechanics and the borrowed authoring sentence is achieved purely by **bullet ordering and a standalone sentence**, not by labels or headings.
- **Verbatim authoring phrase is load-bearing.** The standalone authoring-discipline sentence in step 4 must keep the exact phrase **"following the schema and authoring discipline in `intent-format.md`"**. `review-pipeline.md:37` borrows "the `create-pipeline.md` step-4 pattern" and must keep resolving to that shared discipline — which is why the phrase cannot be reworded and the fetch mechanics must sit in separate, preceding bullets (not inside that sentence).
- **No negative phrasing unless operationally necessary** (`AGENTS.md`), and **match the surrounding house idiom**: intro prose followed by bold-lead-in bullets and `**If …** / **Otherwise**` branches, mirroring existing steps and `manage-issues.md` step 5.
- **Minimal diff.** Do not edit `work-on-an-issue.md`, `review-pipeline.md`, `load.md`, `manage-issues.md`, `SKILL.md`, the README, or any phase doc. The design verified none of these go stale. Step 4 stays a single numbered step; commit stays step 5; there is zero renumbering.

### Suggested execution order

Tasks 1–4 are independent edits and may be done in any order, but the recommended order is **Task 3 (provenance header in `intent-format.md`) → Task 1 (`create-pipeline.md` step 4) → Task 2 (`setup.md`) → Task 4 (changeset) → Task 5 (whole-set verification)**. Rationale: Task 1's step-4 text contains a one-line pointer to the provenance header that Task 3 defines, so defining the header first lets Task 1 reference it concretely. Task 5 is a final cross-file consistency gate and must run last.

---

## Task 1 — Rewrite `create-pipeline.md` step 4 ("Generate the initial intent")

**File:** `skills/radical-pipelines/reference/create-pipeline.md` (current step 4 is lines 21–27).

**What to do.** Replace the body of step 4 while keeping its heading ("### 4. Generate the initial intent") and keeping step 5 ("### 5. Commit") untouched. The rewrite preserves three existing pieces and expands the single "adapt" bullet (`:25`) into a gather-first structure with a passthrough/full-path branch.

Retain unchanged:
- The `:23` intro prose (folder mechanics: create `base/`, the `base/0-intent/` phase-0 subfolder, write `intent.md` there). Keep this as the step's opening prose.
- The `:26` asset-download bullet (download screenshots/other assets via the **Issues** convention into `base/0-intent/`, reference by relative path). It moves into the full-path branch but its wording is unchanged.
- The `:27` self-containment rule. Keep it as the closing principle of the step.

Add, in this linear order (the design's §1a→§1b→§1c):

1. **Gather (runs before the branch).** Prose or a bullet instructing the orchestrator to read the issue body and enumerate its comments, its in-tracker cross-references, its external links, and its binary attachments — all tracker-side reads through the **Issues** convention. State that this enumeration is what the passthrough check is evaluated against, so it precedes the branch. (Passthrough does not skip the gather; it degenerates to "read the body and confirm the comment / cross-reference / external-link / attachment sets are empty.")
   - **Wording constraint:** "in-tracker cross-references" — NO `#NN`, NO "PR/issue" examples.

2. **Passthrough branch — `**If** …`.** **If** the issue body is already in the canonical format of `intent-format.md` (the structural heading check — H1 title; `## Goal` present; only the allowed optional H2s; nothing else — **and** synthesis would be a no-op) **and** there are no comments, no in-tracker cross-references, no external links, and no binary attachments: write the body to `intent.md` **unchanged apart from the provenance header** (applied per `intent-format.md` — a one-line pointer, see Task 3), with **no owner confirmation**, and proceed to step 5.

3. **Full path — `**Otherwise**`.** Structure as ordered bullets whose ordering alone (no meta-labels) keeps the fetch mechanics separable from the borrowed authoring sentence:
   - **Fetch-mechanics bullet(s).** Read all comments and the substance of in-tracker cross-references through the **Issues** convention; fetch external URLs with the orchestrator's **own web-access tooling** (a separate channel from the Issues convention — tool-agnostic, naming no specific tool, parallel to how the skill never names a tracker tool); follow references **one level only** (deeper exploration belongs to phase 1); a reference that cannot be read (unreachable, deleted, private, auth-walled) is **noted visibly in the draft** (e.g. under Context) rather than dropped.
   - **Authoring-discipline bullet — standalone, verbatim phrase.** A single sentence that synthesizes the gathered material into the intent, **following the schema and authoring discipline in `intent-format.md`** (this exact phrase must survive). Fold the substance of comments, references, and pages into `intent.md` with links kept only as **convenience pointers** (mirror the "substance plus a convenience link" pattern at `review-pipeline.md:39`); capture the **latest agreed state** of the conversation; record unsettled proposals — **including proposals from participants other than the owner** — as **open Assumptions** (per `intent-format.md`). This bullet must NOT contain the fetch mechanics — they live in the preceding bullet(s).
   - **Assets bullet.** The existing `:26` asset-download bullet, unchanged.
   - **Confirmation-gate bullet (mirror `manage-issues.md` step 5).** Render the draft intent (with the provenance header), show it to the owner — surfacing any unresolved references — and do **not** write `intent.md` until the owner explicitly approves; write the file on approval. State that this is a **transient interactive gate**: no approval artifact is produced.
   - After approval, control falls through to step 5 (commit) as today.

4. **Closing self-containment principle** — the retained `:27` rule.

**Wording the implementer must NOT carry over from the design:** the italic part-labels (§1c "*Fetch mechanics …*", "*Authoring discipline …*", "*Assets*", "*Confirmation gate …*") and any `#NN` / "PR" parenthetical. Use ordinary bullets and "in-tracker cross-references".

**Acceptance criteria.**
- Step 4 retains its heading and remains a single numbered step; step 5 is still "### 5. Commit"; no other step is renumbered.
- The gather precedes the `**If** / **Otherwise**` branch; the branch predicates are the exact complement of the gate condition (passthrough requires canonical + no-op synthesis + no comments + no cross-references + no external links + no attachments; everything else routes to the full path with the gate).
- The passthrough branch writes the body unchanged apart from the provenance header and asks for no confirmation.
- The full path contains, as separate bullets in order: fetch mechanics → standalone authoring sentence (with the verbatim phrase) → assets → confirmation gate.
- The verbatim phrase "following the schema and authoring discipline in `intent-format.md`" appears in the standalone authoring bullet and is not interrupted by fetch mechanics.
- External-URL fetching is described as the orchestrator's own web-access tooling, textually distinct from the Issues convention, naming no specific tool.
- One-line provenance-header pointer appears in **both** branches; the header template is NOT duplicated here (it lives in `intent-format.md`).
- The `:27` self-containment rule is retained as the closing principle.
- No `#NN`, no "PR", no tracker name, no italic meta-labels, no `N/A`/negative phrasing beyond what the existing step already uses.

**How to verify.**
- `grep -nE '#[0-9]|GitHub|Linear|Jira|GitLab|\bPR\b' skills/radical-pipelines/reference/create-pipeline.md` returns nothing in the new text.
- `grep -n 'following the schema and authoring discipline in `intent-format.md`' skills/radical-pipelines/reference/create-pipeline.md` returns the standalone sentence.
- `grep -nE '^### [0-9]' skills/radical-pipelines/reference/create-pipeline.md` shows steps 1–5 with no renumbering.
- Re-read step 4 top-to-bottom: gather → If/Otherwise → (full path: fetch / author / assets / gate) → self-containment, with no design meta-labels present.

---

## Task 2 — Extend the Issues convention's capability clause in `setup.md`

**File:** `skills/radical-pipelines/reference/conventions/setup.md` (the Issues convention is lines 62–66; the verb clause to extend is at `:64`).

**What to do.** Extend the single capability verb clause **in place**. Today line 64 reads: "Each pipeline pulls its initial intent from an issue, so the orchestrator needs **a way to read, comment on, and update them**." Extend the verb list so the convention covers: reading the issue body, **reading all of its comments**, commenting, updating, and **following its in-tracker cross-references**. Phrase it tracker-agnostically ("comments", "cross-references"), matching how the spec's acceptance criterion (`spec.md:71`) words it.

Leave everything else in the convention untouched — the "Ask the owner which issue tracker… and how to access it" line at `:66` (including its existing tracker-naming parenthetical) stays exactly as is. No new sub-structure, no new convention, no capability-validation gate, no `.rp.md` migration (the extension is purely additive; generic bindings already satisfy it).

**Acceptance criteria.**
- Line 64's verb clause now enumerates: read the body, read all comments, comment, update, and follow in-tracker cross-references — phrased against the convention, naming no tracker tool.
- The "Ask the owner…" line and the rest of the Issues convention are byte-identical to before.
- No new heading, no new convention, no validation step added anywhere.
- No tracker name or `#NN`/`PR` notation introduced in the new clause (the pre-existing parenthetical at `:66` is untouched and is the only tolerated tracker-naming spot).

**How to verify.**
- `git diff skills/radical-pipelines/reference/conventions/setup.md` shows a change confined to the `:64` verb clause.
- The new clause contains "comments" and "cross-references" and contains no `#NN`/`PR`/tracker name.
- `load.md` is NOT in the diff (its `:16` purpose summary remains true and is intentionally not synced).

---

## Task 3 — Document the provenance header as a scope-named third H2 in `intent-format.md`

**File:** `skills/radical-pipelines/reference/intent-format.md` (currently two H2s: "## Schema and rendering" at `:5`, "## Authoring discipline" at `:17`).

**What to do.** Add a **new third H2** whose heading carries the scope, e.g. **"## Provenance header (intents created from an issue)"**. Make NO changes to the existing "Schema and rendering" or "Authoring discipline" sections. The new section documents:

- **Format** — a two-line blockquote placed **after the H1 title and before the first H2** of the intent (the H1 stays line 1):
  - Line 1 — a `> Source:` line naming the source issue and its link. The concrete tracker-specific form is supplied by the project's Issues binding; the **template in skill text stays tracker-agnostic**, e.g. `> Source: <issue reference and link, per the Issues convention>.`
  - Line 2 — the self-containment assertion, e.g. `> This file is self-contained; agents do not need to open the source issue.`
  - The header carries **no other content** — in particular not the Assumptions disclaimer, which belongs to the body's Assumptions discipline (`intent-format.md` Authoring discipline). (One existing artifact leaked that disclaimer into its header; that is the anti-pattern the scoping avoids — but do not narrate this history in skill text per `AGENTS.md`; just keep the header to the two lines.)
- **Scope** — state explicitly that the header applies **only to a base intent created from an issue** by the create-pipeline flow, in **both** the passthrough and synthesis cases. It is **not** added to tracker issue bodies authored via `manage-issues.md`, and **not** added to review intents (which keep their mandatory **Origin** section as their provenance mechanism). The explicit scoping is required because `intent-format.md` is shared across all three intent kinds.

**Acceptance criteria.**
- A new, third H2 exists with a scope-naming heading; the two existing H2s are unchanged.
- The header is documented as a two-line `> Source:` + self-containment blockquote, placed after the H1 and before the first H2, carrying no other content.
- The `> Source:` template is tracker-agnostic (a placeholder like `<issue reference and link, per the Issues convention>`), naming no tracker.
- The scoping statement names all three kinds explicitly: applies to issue-derived base intents (both passthrough and synthesis); not to `manage-issues.md` issue bodies; not to review intents (Origin section instead).
- No edits to "Schema and rendering" or "Authoring discipline".

**How to verify.**
- `grep -nE '^## ' skills/radical-pipelines/reference/intent-format.md` shows exactly three H2s, the third scope-named.
- `grep -nE '#[0-9]|GitHub|Linear|Jira|GitLab' skills/radical-pipelines/reference/intent-format.md` returns nothing in the new section.
- The new section contains `> Source:` and the self-containment line and an explicit "not … review intents / not … issue bodies" scoping.

---

## Task 4 — Add a `minor` changeset

**File:** new `.changeset/<name>.md` (suggested name: `normalize-issue-intent.md`; any descriptive kebab-case name not already present works — confirm it does not collide).

**What to do.** Create a changeset with the standard frontmatter and a one-paragraph body. Use `minor` for `@automattic/radical-pipelines` (this is a backwards-compatible behavior addition that alters orchestrator behavior — not `none`/`patch`). Format mirrors the existing `.changeset/pipeline-reviews.md`:

```
---
"@automattic/radical-pipelines": minor
---

<one-paragraph summary>
```

The body summarizes the behavior change: when creating a pipeline from an issue, the orchestrator now reads the full picture (body + all comments + one-level in-tracker cross-references + external pages), synthesizes it into the canonical intent format, shows the draft for owner approval before writing, adds a standard provenance header, and keeps a passthrough fast-path for an already-canonical issue with no comments and no references. Keep the wording tracker-agnostic (no `#NN`/tracker names) and distinct from the README.

**Acceptance criteria.**
- A single new `.changeset/*.md` file exists with valid frontmatter bumping `@automattic/radical-pipelines` `minor`.
- The body is one self-contained paragraph describing the behavior change; tracker-agnostic; no `#NN`/tracker names.
- Filename is kebab-case and does not collide with an existing changeset.

**How to verify.**
- `cat .changeset/<name>.md` shows valid frontmatter (`"@automattic/radical-pipelines": minor`) and a body.
- `grep -rE '#[0-9]|GitHub|Linear|Jira|GitLab' .changeset/<name>.md` returns nothing.
- `npx changeset status` (if the toolchain is available) reports a pending `minor` bump; otherwise rely on the frontmatter check.

---

## Task 5 — Whole-set consistency verification (final gate)

**No file edits.** This task confirms the four-file set is complete, self-consistent, and that nothing outside it changed or went stale.

**Checks.**
- **Edit set is exactly four files.** `git status --porcelain` shows changes only to: `create-pipeline.md`, `conventions/setup.md`, `intent-format.md`, and the one new `.changeset/*.md`. Nothing else.
- **No tracker leakage in new text.** `grep -rnE '#[0-9]|GitHub|Linear|Jira|GitLab|GitLab' skills/radical-pipelines/reference/create-pipeline.md skills/radical-pipelines/reference/intent-format.md skills/radical-pipelines/reference/conventions/setup.md` — the only permitted hit is the pre-existing tracker parenthetical at `setup.md:66`, which this change does not touch. New text has zero hits.
- **Cross-reference integrity.** `grep -rn 'step-4\|step 4' skills/radical-pipelines/reference/` — confirm `review-pipeline.md:37`'s "create-pipeline.md step-4 pattern" still resolves to a coherent shared discipline (step 4 is still a single step containing the verbatim authoring sentence). `review-pipeline.md` is NOT in the diff.
- **Provenance header confined.** Confirm the `> Source:` template lives only in `intent-format.md`'s new H2 and is pointed at (not duplicated) from both step-4 branches; confirm `manage-issues.md` and `review-pipeline.md` are not edited and so produce no provenance header.
- **No meta-labels leaked.** Confirm `create-pipeline.md` contains none of the design's italic part-labels.
- **Requirement coverage.** Re-read the design's "How each spec requirement is met" table against the edited files; each of the 14 requirements maps to landed text.

**Acceptance criteria.** All checks pass; the working tree contains exactly the four intended changes; no skill file outside the set is modified; the new text is fully tracker-agnostic and free of design meta-labels; the `review-pipeline.md:37` cross-reference still resolves.
