# Design doc: Normalize issue content into the standard intent format when creating a pipeline

## Summary

Radical Pipelines turns an issue into a pipeline's phase-0 artifact, `base/0-intent/intent.md`, during the pipeline-creation flow. Today that transformation reads only the issue **body**, copies it through a thin "adapt to the schema" instruction, and commits without showing the owner what it produced. The shape of `intent.md` therefore varies with the shape of the originating issue, and a free-form third-party discussion seeds a different kind of intent than a project-authored, already-canonical issue.

This change makes the creation flow synthesize the **full picture** of the issue — its body, all its comments, the substance of its in-tracker cross-references and external links, and the participants' conversation — into the single canonical intent format. Because synthesis is a judgment-laden transformation, the orchestrator renders the draft to the run owner and writes `intent.md` only on explicit approval; the synthesis is never committed silently. A narrow fast-path preserves today's zero-friction behavior for the one case where no transformation is possible: an already-canonical issue with no comments and no references maps through unchanged (apart from a standard provenance header), with no confirmation.

This is a change to the **Radical Pipelines orchestrator skill itself** — it edits the skill's reference documents, not any consuming project's code. The deliverable is **four files**: a rewrite of `create-pipeline.md` step 4, an in-place extension of the Issues convention in `conventions/setup.md`, a new provenance-header section in `intent-format.md`, and a `minor` changeset. Everything else in the skill is verified untouched.

## Goals

- Every downstream phase starts from the same canonical, self-contained `intent.md` regardless of how the originating issue was written.
- The full picture of the issue (body + all comments + one-level references + external pages) is read and folded into `intent.md` before it is written.
- The owner sees and explicitly approves the synthesized draft before it is committed — except in the passthrough fast-path, where no transformation occurs.
- A standard provenance header marks every issue-derived intent as self-contained.
- The change stays within the spec's declared edit set; out-of-scope flows (forks, review intents, write-back, recursion, precedence rules, sidecar snapshots) require no edits.

## Non-goals

These are out of scope and are called out so later phases do not silently expand the change:

- **Forks.** A forked pipeline inherits its intent by literal filesystem copy of the parent's `base/0-intent` (`fork-pipeline.md` step 5); it never re-synthesizes from the issue and never invokes `create-pipeline.md`. No handling is needed here.
- **Review intents.** Review-pipeline authoring (`review-pipeline.md` step 5) produces a review intent from a *different source* — the review request — captured in its mandatory **Origin** section, not from the issue. The issue→intent fetch/synthesis/confirmation logic does not apply to review intents, and the confirmation gate is not extended to them.
- **Write-back / tracker sync.** The normalized intent is never written back to the issue; the issue is left untouched.
- **Recursive reference exploration.** Following references beyond one level is phase-1 research's job, not phase 0.
- **Multi-participant precedence rules.** No formal "whose statement wins" rule is invented; conflicts ride as open Assumptions and resolve at the confirmation gate.
- **Snapshotting textual references as sidecar files.** Textual references are folded into `intent.md` as substance; only binary assets continue to be downloaded as files.

## Background — how the flow works today

`work-on-an-issue.md` step 1 runs on **every** "work on an issue" entry and does a lightweight verify-exists-plus-capture-body. Step 2 then branches: if a pipeline already matches the issue it resumes/forks/reviews/merges/closes (and the captured content is never used to author an intent — the intent is already on disk, forks copy it, resumes re-attach); if no pipeline matches, control passes to `create-pipeline.md`. **`create-pipeline.md` is the sole path that authors a new intent**, and it has exactly one caller (`work-on-an-issue.md`).

Inside `create-pipeline.md`, step 4 ("Generate the initial intent") today is three bullets (`create-pipeline.md:23-27`):

- `:23` — folder mechanics: create `base/0-intent/` and write `intent.md` there.
- `:25` — "Adapt the issue content into the intent that seeds the subsequent phases, following the schema and authoring discipline in `intent-format.md`."
- `:26` — download screenshots/assets via the Issues convention into `base/0-intent/` and reference them by relative path.
- `:27` — the phase-0 subfolder must be self-contained.

Step 4 already performs its **own** Issues-convention tracker access (the asset download at `:26`), so it does not lean on step 1's capture — there is in-file precedent for step 4 reaching the tracker itself. Step 5 ("Commit") follows.

Two adjacent facts shape the design:

- `review-pipeline.md:37` borrows "the `create-pipeline.md` step-4 pattern" as an authoring pattern (not a call). The pattern it borrows is the single authoring-discipline sentence at `:25` — "following the schema and authoring discipline in `intent-format.md`" — and **none** of the fetch/asset/self-containment bullets.
- `intent-format.md` is the **shared** format for tracker issue bodies, base intents, and review intents alike. Anything documented there as unscoped is read by all three consumers.

## Design overview

The behavior is anchored entirely in **`create-pipeline.md` step 4**, with two supporting touch-points (the Issues convention's capability list and the provenance-header documentation) plus a changeset. The three reasons the read lives in step 4 rather than `work-on-an-issue.md` step 1:

1. **Sole-caller topology.** Step 4 is the only path that authors an intent; a heavy read in step 1 would be wasted work on every resume/fork/review/close entry (the majority of invocations once a pipeline exists).
2. **It only pays off on creation.** The full-picture read is exactly the creation-path transformation; nothing else consumes it.
3. **Step 4 already reaches the tracker.** The new read extends the existing in-step asset-download mechanic instead of taxing every entry through step 1.

Step 4 **stays a single numbered step** ("Generate the initial intent"), restructured internally with the house idiom (intro prose + bold-lead-in bullets and an `**If …** / **Otherwise**` branch). It is **not** split into separate gather/synthesize/confirm steps, for two reasons: (a) a split would make "step 4" name the *gather* sub-step — exactly the part of the pattern `review-pipeline.md:37` does **not** borrow — forcing a rewrite there; (b) `manage-issues.md` step 5 is direct precedent for packing a whole draft→confirm→write sequence into one titled step. Commit stays step 5; there is zero renumbering and `review-pipeline.md` needs no edits.

## File-level changes

### 1. `skills/radical-pipelines/reference/create-pipeline.md` — rewrite step 4

Step 4 keeps its heading ("Generate the initial intent"), keeps the `:23` folder-mechanics intro unchanged, keeps the `:26` asset-download bullet, and keeps the `:27` self-containment rule as the closing principle. The `:25` adapt sentence expands into a single linear, gather-first structure:

**a. Gather.** Read the issue body and enumerate its comments, in-tracker cross-references (`#NN`, linked PRs/issues), external links, and binary attachments — all tracker-side reads through the **Issues** convention. This enumeration is what the passthrough predicates are evaluated against, so it must run before the branch. (Passthrough does not skip the gather; it degenerates to "read the body and verify the comment/reference/attachment sets are empty." Only the full path does the heavier substance-read. One linear order covers both branches.)

**b. Passthrough branch (`**If** …`).** **If** the body is already in the canonical format of `intent-format.md` (the structural heading check — H1 title; `## Goal` present; only the allowed optional H2s; nothing else — *and* synthesis would be a no-op) **and** there are no comments, no in-tracker cross-references, no external links, and no attachments: write the body to `intent.md` **unchanged apart from the provenance header** (applied per `intent-format.md`), with **no owner confirmation**, and proceed to step 5.

**c. Full path (`**Otherwise**`).** This branch is structured into four textually distinct parts so the borrowed authoring discipline stays separable from the issue-specific fetch mechanics (spec requirement 3):

- *Fetch mechanics (issue-specific — not part of the borrowed pattern).* Read all comments and the substance of in-tracker cross-references through the **Issues** convention; fetch external URLs with the orchestrator's **own web-access tooling** (a separate channel from the Issues convention — see below); follow references **one level only** (deeper exploration belongs to phase 1); a reference that cannot be read (unreachable, deleted, private, auth-walled) is **noted visibly in the draft** (e.g. under Context), never silently dropped.
- *Authoring discipline (standalone sentence — the pattern `review-pipeline.md` borrows).* Synthesize the gathered material into the intent, **following the schema and authoring discipline in `intent-format.md`** — fold the substance of comments, references, and pages into `intent.md` with links kept only as **convenience pointers** (mirroring the Origin "substance plus a convenience link" wording at `review-pipeline.md:39`); capture the **latest agreed state** of the conversation; record unsettled proposals — **including proposals from participants other than the owner** — as **open Assumptions** per `intent-format.md:13,22`.
- *Assets.* The current `:26` asset-download bullet, unchanged.
- *Confirmation gate (mirrors `manage-issues.md` step 5).* Render the draft intent (with the provenance header), show it to the owner — surfacing any unresolved references — and **do not write `intent.md` until the owner explicitly approves**; write the file on approval. This is a **transient interactive gate**: no approval artifact is produced (unlike the assisted workflow's `<artifact>-review-approved.md`).

The standalone authoring-discipline sentence must keep the exact phrase "following the schema and authoring discipline in `intent-format.md`", with the fetch mechanics in separate preceding bullets. That is what keeps `review-pipeline.md:37`'s "step-4 pattern" cross-reference resolving to a coherent shared discipline (canonical format + `intent-format.md`) and not to the fetch mechanics — **so `review-pipeline.md` needs zero edits**.

**External-URL channel.** External URLs are fetched via "the orchestrator's own web-access tooling" — tool-agnostic, unbound, first mention of web-fetching anywhere in skill text. This is deliberately phrased as an unbound orchestrator capability, parallel to how skill text never names `gh`: skill text says *what*, the consuming project's runtime supplies *how*. It is kept **textually distinct** from the Issues convention, which is the tracker abstraction and is **not** extended to cover arbitrary web pages (spec requirement 7).

### 2. `skills/radical-pipelines/reference/conventions/setup.md` — extend the Issues convention

The Issues convention's capability statement today is a single verb clause (`setup.md:64`): "the orchestrator needs **a way to read, comment on, and update them**", followed by the "Ask the owner which issue tracker… and how to access it" line.

Extend that verb list **in place** so the convention covers: reading the issue body, **reading all of its comments**, commenting, updating, and **following its in-tracker cross-references**. The "Ask the owner" line and everything else in the convention stay untouched; no new sub-structure, no new convention.

**Tracker-agnostic wording is a hard constraint** (`AGENTS.md:12`): skill text must never name a tracker (no GitHub/Linear, no `#NN` notation) outside the existing ask-the-owner parenthetical. The new clause says "cross-references" tracker-agnostically — matching how the spec's own acceptance criterion (`spec.md:71`) phrases it.

The extension is **purely additive**: this project's `.rp.md` (and consuming projects generally) bind Issues as a generic access mechanism with no per-capability enumeration, so generic bindings already satisfy the extended capabilities. No capability-level validation exists anywhere in the skill (`load.md` checks only convention *presence*), so **no setup gate is added and no `.rp.md` migration is required**.

`load.md` is **not** edited: its `:16` table row ("Where to find the project issues and how to create/modify them") is a loose purpose summary, not a capability enumeration, and it remains true. Keeping the diff minimal outweighs a cosmetic sync.

### 3. `skills/radical-pipelines/reference/intent-format.md` — document the provenance header

Add a **new third H2** to `intent-format.md` whose heading carries the scope, e.g. **"## Provenance header (intents created from an issue)"**. It documents the canonical header and its scoping:

- **Format** — a two-line blockquote placed **after the H1 title and before the first H2** of the intent (the H1 stays line 1):
  - Line 1: `> Source:` with the issue reference and link. The concrete, tracker-specific form is supplied by the project's Issues binding; the **template in skill text stays tracker-agnostic** (`> Source: <issue reference and link, per the Issues convention>.`).
  - Line 2: the self-containment assertion: `> This file is self-contained; agents do not need to open the source issue.`
  - The header carries **no other content** — in particular not the "Assumptions are open / not settled requirements" disclaimer, which belongs to the body's Assumptions discipline (`intent-format.md:13,22`). (One existing artifact leaked that disclaimer into its header; that is the anti-pattern this scoping avoids.)
- **Scope** — applies **only to a base intent created from an issue** by the create-pipeline flow, in **both** the passthrough and synthesis cases. It is **not** added to tracker issue bodies authored via `manage-issues.md`, and **not** added to review intents, which keep their mandatory **Origin** section as their provenance mechanism (`review-pipeline.md`). The scoping must be stated explicitly because `intent-format.md` is shared across all three intent kinds.

The scope-named heading and explicit scoping statement are what keep the header from being mis-applied: `manage-issues.md` points only at the *shared* schema/discipline of `intent-format.md` (never "apply everything in this file"), so a scope-named H2 is sufficient to keep the `> Source:` line out of issue bodies and review intents.

There are **no changes** to `intent-format.md`'s "Schema and rendering" or "Authoring discipline" sections. Spec requirements 6 (unresolved-reference note) and 10 (conversation synthesis) are expressed in *step-4 text* by pointing at the existing schema (`intent-format.md:12` Context as the natural home for an unresolved-reference note; `:13` "labeled open" and `:22` "recorded under Assumptions, not as a requirement" for unsettled proposals) — they are content the existing schema already admits, not new schema.

`create-pipeline.md` step 4 carries only a **one-line pointer** to apply the header (in both the passthrough and synthesis branches) — it never duplicates the template, consistent with how step 4 already delegates format to `intent-format.md`.

### 4. `.changeset/<name>.md` — new `minor` changeset

`skills/**` is a release-relevant path; the Changeset Gate CI fails without a changeset. This is a backwards-compatible behavior addition, so it is a **`minor`** bump for `@automattic/radical-pipelines` (not the empty/`none` case — the change alters orchestrator behavior). The changeset body summarizes the behavior change: full-picture read of the issue (body + comments + one-level references + external pages), canonical synthesis, owner confirmation before write, the standard provenance header, and the passthrough fast-path.

## Key decisions and rationale

- **Anchor the read in `create-pipeline.md` step 4 only; leave `work-on-an-issue.md` step 1 unchanged.** Sole-caller topology means a step-1 read would be wasted on every resume/fork/review/close entry; step 4 already reaches the tracker for asset download. *Trade-off considered:* anchoring (or duplicating) in step 1 would centralize "capture content" but tax the majority non-creation path and split the read across two files — rejected.
- **Keep step 4 a single numbered step.** A literal gather/synthesize/confirm split would make "step 4" name the gather sub-step — the one part `review-pipeline.md:37` does *not* borrow — and would force an edit there; `manage-issues.md` step 5 is precedent for a one-step draft→confirm→write. *Trade-off:* sub-numbered steps (4a/4b) would read more granularly but exist nowhere in the skill and would break the cross-reference — rejected.
- **Gather-first single linear order for both branches.** The passthrough predicates ("already canonical", "no comments/refs/attachments", "synthesis is a no-op") can only be evaluated *after* the gather, so passthrough cannot precede it; passthrough just degenerates to a light gather. One order is simpler than two and matches the fact that the predicates depend on the enumeration.
- **Authoring discipline kept as a standalone sentence, separable from fetch mechanics.** This is what makes `review-pipeline.md:37`'s borrowed "step-4 pattern" keep resolving to the shared discipline (not the fetch bullets), achieving spec requirement 3 with **zero edits to `review-pipeline.md`**.
- **External URLs via an unbound orchestrator web-access channel, not the Issues convention.** The Issues convention is the tracker abstraction; extending it to arbitrary web pages would conflate two distinct channels. First web-fetch mention in skill text; phrased tool-agnostically like the rest of the skill.
- **In-place verb-list extension of the Issues convention; additive, no validation, no `.rp.md` migration.** Generic bindings already satisfy the new capabilities and no capability-validation step exists; adding one would be scope creep. Tracker-agnostic wording per `AGENTS.md:12`.
- **Provenance header as a scope-named third H2 in `intent-format.md`, with a one-line pointer from step 4.** A bullet inside the shared "Schema and rendering" H2 would be read by the issue-body and review-intent consumers — inviting the exact mis-application requirement 14 warns against. Documenting only in `create-pipeline.md` is ruled out by the spec. The scope-named H2 is the placement that both centralizes the template and confines its application. *The #71 short form is canonicalized;* the existing long-form variant (stale "prompt" terminology + leaked disclaimer) is the anti-pattern.
- **Bare in-tracker cross-refs disqualify passthrough; embedded binary attachments disqualify passthrough.** Self-containment is the rationale: an issue that says "Depends on #95" is not self-contained until #95's substance is pulled in, and an attachment's pointer must be rewritten to a downloaded relative path — both are content-bearing transformations, so both route through the full read→synthesize→confirm path.
- **Confirmation is a transient gate, not an artifact.** Owner approval gates the write in-session; no `*-review-approved.md` file is produced. The gate is always feasible because pipeline creation runs interactively in the `work-on-an-issue` session *before* the workflow mode (autonomous vs assisted) is chosen — the owner is present at intent-write time on every creation path.
- **`manage-issues.md` is not edited.** Spec requirement 2 supplies the authoritative one-time-transform interpretation of "the issue body *is* the phase-0 intent", and the "turns the issue into" clause already reads that way. An optional "_is_" softening was considered and **declined** as out of the spec's edit set. No edits to SKILL.md, README, `work-on-an-issue.md`, `review-pipeline.md`, `load.md`, or any phase doc — verified nothing goes stale (phase docs treat `intent.md` as opaque input; nothing parses its leading lines).

## How each spec requirement is met

| # | Requirement | Where met |
|---|---|---|
| 1 | Normalization applies to the pipeline-creation flow only (`create-pipeline.md` step 4) | Anchor decision; step-4 rewrite |
| 2 | Source issue never modified; `intent.md` may diverge | No write-back anywhere; `manage-issues.md` not edited |
| 3 | Authoring discipline kept separable from fetch mechanics; `review-pipeline.md:37` still resolves | Standalone authoring sentence retaining the exact `intent-format.md` phrase; fetch mechanics in separate bullets — zero edits to `review-pipeline.md` |
| 4 | Full-picture read: body + all comments + cross-references (Issues convention) + external URLs (web access) | Step-4 gather + full-path fetch bullets; two distinct channels |
| 5 | Reference-following bounded to one level | "one level only" clause in fetch mechanics |
| 6 | Unreadable reference noted visibly, not dropped; surfaced at gate | "noted visibly in the draft (e.g. under Context)" + gate surfaces unresolved references |
| 7 | Issues convention extended to comments + cross-references, tracker-agnostic | `setup.md:64` in-place verb-list extension |
| 8 | `intent.md` always in canonical format with authoring discipline | Authoring-discipline sentence points at `intent-format.md` (both branches produce canonical output) |
| 9 | Substance folded in; links as convenience pointers; no sidecar snapshots; binaries downloaded | Fold-substance clause mirroring Origin wording; `:26` asset bullet retained; `:27` self-containment rule retained |
| 10 | Conversation synthesis: latest agreed state; unsettled proposals (incl. non-owner) as open Assumptions | Conversation-synthesis clause pointing at `intent-format.md:13,22` |
| 11 | Confirmation gate whenever passthrough does not apply (exact complement) | Full-path confirmation gate mirroring `manage-issues.md` step 5 |
| 12 | Confirmation is a transient gate, no approval artifact | Stated explicitly in the gate text |
| 13 | Passthrough only when canonical + no comments + no references/attachments | Passthrough branch predicates; attachments/cross-refs as disqualifiers |
| 14 | Provenance header documented + applied in both cases, scoped to issue-derived base intents | New scope-named H2 in `intent-format.md`; one-line pointer in both step-4 branches |

Out-of-scope items (forks, review intents, write-back, recursion, precedence rules, sidecar snapshots) require no edits anywhere — verified.

## Risks and verification

- **Cross-reference fragility.** The single repo-wide reference to a numbered create-pipeline step (`review-pipeline.md:37`) is preserved by keeping step 4 a single step and retaining the verbatim authoring-discipline phrase. *Verify:* grep for "step-4" / "step 4" references resolves to a coherent shared discipline.
- **Header mis-application.** The scope-named H2 plus explicit scoping statement guard against a `> Source:` line appearing in issue bodies or review intents. *Verify:* `manage-issues.md` and `review-pipeline.md` produce no provenance header; both passthrough and synthesis base intents do.
- **Tracker-agnostic wording.** The new Issues-convention clause and the header template must name no tracker. *Verify:* no GitHub/Linear/`#NN` tokens in the new skill text outside the existing ask-the-owner parenthetical (`AGENTS.md:12`).
- **Changeset gate.** *Verify:* a `minor` changeset for `@automattic/radical-pipelines` exists so CI passes.

Because the deliverable is prose in the orchestrator's reference docs, verification is primarily reviewing that each edited file reads coherently against the requirement table above and that the four-file edit set is complete and self-consistent — no other file changes, nothing goes stale.
