# Doc Plan: Normalize issue content into the standard prompt format when creating a pipeline

Source issue: [Automattic/radical-pipelines#71](https://github.com/Automattic/radical-pipelines/issues/71).

This plan covers **user-facing and contributor-facing documentation** that must change so it accurately reflects the new phase-0 behavior: pipeline creation now synthesizes the issue body, all comments, and one-hop cited references into the single canonical prompt format (Title + Goal / Constraints / Context / Assumptions, omit-empty), pinned to a documented prompt-file rendering, with normalize-don't-converge behavior, surfaced conflicts, and a required owner-confirmation gate (with a revise loop) before the prompt is written and committed.

## Scope boundary (read first)

This is a **self-referential, documentation/instruction-design change** to the Radical Pipelines skill — there is no application code. Two things are therefore **out of this doc plan's scope**:

1. **The behavioral skill edits.** Phase 4 (code) already rewrites the skill's *behavioral* reference docs (`create-pipeline.md`, `setup.md`, `.rp.md`, and the link-target check in `manage-issues.md`) — see code-plan tasks T1–T4. Those files *are* the implementation; they are not documentation-about-the-implementation and are not duplicated here.
2. **The changeset.** Code-plan **T5** already creates the `minor` changeset (`.changeset/normalize-prompt-format.md`) that records this behavior for the release flow and CHANGELOG. No separate docs task re-creates or edits it; DT2 below only *verifies* its prose once it exists, rather than authoring a second one.

What remains for docs is the small set of **narrative/overview** surfaces that *describe* the pipeline to humans or downstream agents, plus the design's explicit docs-phase verification of AC5. Each surface below was inspected in the repo; surfaces that genuinely need no change are recorded in "Surfaces considered — no change needed" so the reviewer can see they were weighed rather than missed.

---

## DT1 — Reconcile the phase-0 overview line in `SKILL.md` (conditional)

**Goal.** Ensure the skill's own phase overview does not misrepresent phase 0 now that the orchestrator *synthesizes, confirms, and writes* `prompt.md` rather than capturing the issue body as-is. The phases table at `SKILL.md:35` reads `| 0 | Prompt | 0-prompt | The raw request (input, not something to create) |`. After this change, phase 0's `prompt.md` is a *synthesized, confirmed* artifact, so "the raw request" and "not something to create" are the two phrases to weigh. Touch the line **only if** it is genuinely misleading; if its in-context meaning ("phase 0 is the pipeline's *input*, not produced by a *phase agent* like the others") still holds, leave it unchanged and record that.

**Audience.** Contributors and the orchestrator itself (the skill overview is on the orchestrator's reading path via `SKILL.md`).

**Files.** `skills/radical-pipelines/SKILL.md` (the "Phases" table row 0 only, `:35`).

**Sections-scope.** Only the phase-0 row of the Phases table. Do **not** add creation mechanics (inputs, confirmation, rendering) here — those live in `create-pipeline.md` (phase-4 scope), and restating them on the overview path would duplicate across reading paths (R-dup-cross) and over-specify the overview (R-min). Keep the row to its one-line altitude: it characterizes *what phase 0 is*, not *how the prompt is produced*. If a change is warranted, it must stay a terse characterization (e.g. clarify that phase 0 is the pipeline's input artifact rather than a phase-agent output), still distinguishing phase 0 from the agent-produced phases 1–5 — not a description of the synthesis flow.

**Depends on.** Conceptually on phase-4 T4 (the behavior the line must not contradict). No file dependency.

**Traces to.** Narrative accuracy for the new phase-0 behavior (R7–R11; AC9–AC14, in spirit). Not a spec AC of its own.

**Acceptance.**
- The phase-0 row of `SKILL.md`'s Phases table does **not** contradict the new behavior — it does not assert the prompt is the issue body verbatim or that nothing is written at phase 0.
- The row still distinguishes phase 0 (the pipeline's *input* / not a phase-agent artifact) from phases 1–5; it does **not** enumerate the canonical sections or describe inputs, confirmation, or the rendering wrapper (no duplication with `create-pipeline.md`; R-dup-cross / R-min preserved).
- If the line was left unchanged, that decision is recorded with the reason (its in-context meaning still holds). A no-op is a valid outcome.
- No tool names introduced (R-generic); the edit, if any, is one line and matches the table's terse style.

---

## DT2 — Verify the changeset narrative is accurate and complete (no new file)

**Goal.** After code-plan T5 creates the `minor` changeset, confirm its prose actually and completely describes the shipped behavior for the CHANGELOG/GitHub Release reader. This is a **verification** task over T5's output, not a second changeset. It exists because the design's "Open items for later phases — Docs phase" calls out the changeset as a docs-phase concern, and the CHANGELOG entry is the most user-visible record of this change.

**Audience.** Consumers reading the CHANGELOG / GitHub Release (the changelog is generated from changesets via `@changesets/changelog-github`).

**Files.** `.changeset/normalize-prompt-format.md` (the file T5 creates) — **read/verify**, edit only to correct prose if it is inaccurate or incomplete. Do **not** create a second changeset; do **not** hand-edit `CHANGELOG.md` or any version file (the release flow consumes the changeset).

**Sections-scope.** The changeset body prose and its frontmatter bump type only.

**Acceptance.**
- Frontmatter is exactly `"@automattic/radical-pipelines": minor` (a feature; pre-1.0 policy maps features to `minor` per `CONTRIBUTING.md`).
- The body, in the present-tense prose style of the sibling changesets (e.g. `.changeset/per-agent-model-config.md`), accurately states that pipeline creation now synthesizes the issue body, **all comments**, and **one-hop cited references** into the single canonical prompt format (Title + Goal / Constraints / Context / Assumptions, omit-empty), pinned to a documented prompt-file rendering (`# Prompt` H1 + `> Source:` line + self-contained note), with **normalize-don't-converge** behavior, **surfaced conflicts**, and a **required owner-confirmation gate** (with a revise loop) **before** the prompt is written and committed.
- It names the supporting capability grants (the **Issues** convention's comment-reading in `setup.md`; the dogfood `.rp.md` "Reading an issue" note).
- If T5's prose already satisfies the above, the task is a verified no-op (record that); otherwise make the minimal prose correction. No bump-type or `CHANGELOG.md` edits.

---

## DT3 — Verify a produced `prompt.md` matches the documented rendering (AC5)

**Goal.** Close the design's explicit docs-phase open item: confirm that a real `prompt.md` produced/rendered under the new flow **matches the documented rendering wrapper** that T4 pins in `create-pipeline.md`. This makes AC5 ("produced files match the documented rendering") concretely checked rather than asserted, and resolves the five-way artifact drift the design documents as the motivation for requirement 4.

**Audience.** The reviewer / maintainer validating that the documented rendering is real and followed (correctness evidence, not a shipped doc surface).

**Files.** Verification only — no new committed artifact required. The natural specimen is **this pipeline's own** `0-prompt/prompt.md` (the design suggests re-rendering it to the documented shape if desired). Do **not** introduce a phase-0 approval file or any new committed record (AC14).

**Sections-scope.** Verification activity over (a) the documented specimen in `create-pipeline.md` step 4 (T4's output) and (b) at least one produced `prompt.md`.

**Depends on.** Phase-4 **T4** (the documented rendering must exist to verify against).

**Traces to.** R4 / **AC5** (rendering documented and matched); design "Open items for later phases — Docs phase" second bullet.

**Acceptance.**
- The documented rendering specimen is present in `create-pipeline.md` step 4: a top `# Prompt` H1, a `> Source:` blockquote attribution line, a self-contained note, then canonical body sections as real `## ` headings with empty sections omitted (no `N/A`, no empty headings); Goal always present.
- At least one produced `prompt.md` (e.g. this pipeline's `0-prompt/prompt.md`) is shown to **conform** to that specimen — same heading, source line, self-contained note, and section shape — or any deviation is reported as a finding.
- No new committed artifact (no approval-record file) is introduced by this verification (AC14 preserved).

---

## Surfaces considered — no change needed

Each was inspected against the new behavior and deliberately left out of the task list:

- **`README.md` — phase list (`:27` "Phase 0. Prompt. The initial idea or request.").** Accurate at its altitude: the change is about *how* `prompt.md` is produced at pipeline creation, not *what* phase 0 is (still the pipeline's prompt/input). The one-liner does not assert verbatim capture, so it does not become wrong. The "raw prompt, an input rather than an agent-produced artifact" parenthetical at `:112` (explaining why phase 0 has no agent profile) also stays true. *No change.*
- **`README.md` — body (install / Pi / configuration / changelog & versioning).** Contains no narrative about the pipeline-creation flow, the "adapt the issue content" behavior, synthesis, comments/references, or phase-0 confirmation, so nothing there becomes inaccurate. The release-relevance note that touching `README.md` requires a changeset does **not** force a README edit — it only means *if* we edited the README we'd need a changeset (already provided by T5). *No change.*
- **`CONTRIBUTING.md`.** Authoritative home for release mechanics (changeset authoring, the CI gate, the release flow). This change ships through the normal changeset path (T5) with no new release mechanics, bump rules, or gate behavior, so nothing here changes. *No change.*
- **`AGENTS.md`.** Contains only "Rules when modifying the skill" (the R-min / R-dup-path / R-neg / R-generic / R-dup-cross rules) — the very rules this change is built to satisfy — and says nothing about phase-0 behavior. (Note for the reviewer: the README at `:165` claims a "changeset … rule lives in `AGENTS.md`" and references a "README-update rule", but the current 11-line `AGENTS.md` contains neither — a **pre-existing** README↔AGENTS mismatch unrelated to this issue and **out of scope** here.) *No change.*
- **`website/index.html`.** Uses "prompt" only generically (hero copy, meta keywords) and shows `prompt.md` solely as a filename in a terminal-listing mock (`:119`). No claim about how the prompt is created. *No change.*
- **`website/demo.js` (`:276`, `:281`).** The reconstructed demo log line "Captured issue #1234 → prompt.md (phase 0 · input)" and the comment "Phase 0 is the raw prompt — an input, already in place, not produced by an agent" remain true at the demo's altitude: the orchestrator (not a phase agent) still produces phase 0, and it is still the pipeline's input. "Captured" is an acceptable simplification for an animated demo. *No change* (flagged here only so the reviewer sees it was weighed).
- **`agents/spec-analyst.md` (`:16`) and other phase-agent profiles.** `spec-analyst.md` already treats the prompt's "goal, constraints, and any 'assumptions / directions to explore'" as the contract it consumes — i.e. it already names the canonical sections. This change *guarantees* `prompt.md` is in that format, making the profile **more** accurate, not less; no edit is needed (and editing agent profiles would stray into behavioral-skill territory owned by phase 4 / out of scope). *No change.*
- **`skills/.../reference/manage-issues.md` (the single taxonomy source) and the behavioral reference docs (`create-pipeline.md`, `setup.md`, `.rp.md`).** These are the *implementation* of the change, owned by code-plan T1–T4. Not documentation-about-the-change; **out of this plan's scope.**

---

## Task ordering and dependencies

- **DT1** can run independently (conditional skill-overview reconciliation); conceptually it must not contradict phase-4 T4.
- **DT2** depends on code-plan **T5** (the changeset must exist to verify).
- **DT3** depends on code-plan **T4** (the documented rendering must exist to verify against) and benefits from a produced `prompt.md` specimen.

Suggested order: DT1, then DT2 and DT3 after their phase-4/T5 prerequisites are settled. All three are small; DT1 and DT2 are likely no-ops if the upstream work is precise, and that is an acceptable, expected outcome.
