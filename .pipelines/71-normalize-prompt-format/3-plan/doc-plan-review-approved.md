# Doc Plan Review — APPROVED

Source issue: [Automattic/radical-pipelines#71](https://github.com/Automattic/radical-pipelines/issues/71) — "Normalize issue content into the standard prompt format when creating a pipeline".

Artifact under review: `.pipelines/71-normalize-prompt-format/3-plan/doc-plan.md`.

**Verdict: APPROVED.**

The doc plan is complete, correctly scoped, structurally sound, and faithful to the shipped behavior the spec/design define (canonical-format normalization + a required owner-confirmation gate at pipeline creation). Every "no-change-needed" determination was independently verified against the actual repo content and holds. No task is missing; no busywork is invented; there is no overlap with the phase-4 behavioral skill edits.

---

## Completeness — independently verified (the flagged main risk)

I re-inspected every surface the writer recorded as "no change needed," reading the actual current file content rather than trusting the plan's summary. Each determination is correct:

| Surface | Plan's call | Verified against repo |
| --- | --- | --- |
| `README.md:27` ("Phase 0. Prompt. The initial idea or request.") | no change | **Correct.** Highest-altitude description of *what phase 0 is*; makes no verbatim-capture claim and says nothing about how `prompt.md` is produced. Still true after the change. |
| `README.md:112` ("phase 0 is the raw prompt, an input rather than an agent-produced artifact, so it has no agent profile") | no change | **Defensible and correct.** The load-bearing claim — phase 0 has no agent profile because it is not phase-agent-produced — remains true (the orchestrator, not a phase agent, produces it). "raw" is weakly imprecise but not *wrong* at its altitude, and editing the README would trigger the README-update/changeset rule for no accuracy gain. |
| `README.md` body (install / Pi / configuration / changelog & versioning) | no change | **Correct.** Contains no narrative about the creation flow, synthesis, comments/references, or phase-0 confirmation; nothing becomes inaccurate. The "touching README requires a changeset" note does not *force* a README edit. |
| `CONTRIBUTING.md` | no change | **Correct.** Authoritative for release mechanics; this change ships via the normal changeset path (T5) with no new release mechanics, bump rules, or gate behavior. |
| `AGENTS.md` | no change; flags a pre-existing README↔AGENTS mismatch as out of scope | **Correct.** The 11-line `AGENTS.md` contains only the five "Rules when modifying the skill" and nothing about phase-0 behavior. The README at `:165` does claim a changeset rule "lives in `AGENTS.md`," which `AGENTS.md` does not contain — a genuine pre-existing mismatch, correctly identified and correctly scoped out (unrelated to issue #71). |
| `website/index.html` (`:12` keywords, `:119` filename mock) | no change | **Correct.** "prompt" is generic hero/meta copy; `prompt.md` appears only as a filename in a terminal-listing mock. No claim about how the prompt is created. |
| `website/demo.js` (`:276` "Captured issue #1234 → prompt.md (phase 0 · input)", `:281` comment) | no change | **Correct.** Both remain true at the animated-demo altitude: the orchestrator (not a phase agent) produces phase 0, and it is the pipeline's input. "Captured" is an acceptable demo simplification. |
| `agents/spec-analyst.md:16` and the other spec-phase profiles | no change | **Correct.** `spec-analyst.md:16` already treats the prompt's "goal, constraints, and any 'assumptions / directions to explore'" as the contract it consumes; `spec-writer.md:12`, `spec-reviewer.md:14`, `spec-consolidator.md:14` describe `prompt.md` as "the original idea." Under normalize-don't-converge, `prompt.md` still faithfully represents the original idea — guaranteeing the format makes these profiles *more* accurate, not less. Agent profiles are also phase-4/behavioral territory, correctly out of docs scope. |
| Behavioral reference docs (`create-pipeline.md`, `setup.md`, `.rp.md`, `manage-issues.md` link target) and the workflow files (`work-on-an-issue.md`, `fork-pipeline.md`) | out of scope (phase 4) | **Correct.** These are the implementation, owned by code-plan T1–T4. I confirmed none of `work-on-an-issue.md:15` ("capture its content" — issue-existence verification, not synthesis) or `fork-pipeline.md:14` becomes inaccurate. |

**No missing task found.** The design's "Open items for later phases — Docs phase" lists exactly two docs concerns (author the changeset; verify a produced `prompt.md` matches the documented rendering / AC5). Both are covered (DT2, DT3). DT1 sensibly adds the single narrative-on-the-orchestrator's-reading-path surface (`SKILL.md:35`) that the design did not enumerate.

## The one surface that warranted a task — `SKILL.md:35` (DT1)

`SKILL.md:35` reads `| 0 | Prompt | 0-prompt | The raw request (input, not something to create) |`. After this change the orchestrator demonstrably *does* create `prompt.md` (synthesize → confirm → write), so "not something to create" is in tension with the new behavior on the orchestrator's own reading path. DT1 is **conditional** and permits a recorded no-op, which is legitimate rather than evasive: there is a pre-existing in-context reading ("phase 0 is the pipeline's *input* / not a *phase-agent* artifact like phases 1–5," consistent with `create-pipeline.md:3` already saying the orchestrator "writes `prompt.md`"), and DT1's acceptance *forces* an explicit decision-with-reason and forbids leaving a contradiction or restating creation mechanics on the overview path (preserving R-dup-cross / R-min). Well-posed.

## Structure, overlap, and fidelity

- **Field completeness.** All three tasks carry Goal / Audience / Files / Sections-scope / Depends-on / Traces-to / Acceptance, with concrete, checkable acceptance (e.g. DT3 names a real specimen and a pass/deviation rule; DT2 pins exact frontmatter and the required prose content).
- **No overlap with phase-4.** The "Scope boundary" section explicitly fences the behavioral skill edits (code-plan T1–T4) and the changeset authoring (T5) out of docs scope. DT2 *verifies* T5's changeset rather than re-authoring it; DT3 *verifies* the rendering rather than committing a new artifact (AC14 preserved). No invented busywork.
- **Fidelity to shipped behavior.** The plan's framing (synthesize body + all comments + one-hop references into the single canonical format, pinned rendering, normalize-don't-converge, surfaced conflicts, required owner-confirmation gate with revise loop, no phase-0 approval file) matches spec R1–R12 / AC1–AC15 and design D1–D6.

## Corroborating evidence gathered during review (informational, for the doc-writer)

- The `.changeset/` directory does **not** yet contain a normalize-prompt-format entry (T5 creates it), and the sibling `.changeset/per-agent-model-config.md` is exactly the present-tense `minor` prose style DT2 cites — and it likewise ends by naming its supporting surfaces, validating DT2's "name the supporting capability grants" requirement.
- This pipeline's own `0-prompt/prompt.md` (DT3's natural specimen) already broadly conforms to the documented wrapper (`# Prompt` H1, `> Source:` blockquote, self-contained note, real `## ` body sections). One nuance for DT3 to weigh as a possible reported finding: its `## Constraints` ends with a prose line "No further hard constraints were stated in the originating issue." — a near-filler note inside an otherwise-present section (not an omit-empty violation, since the section has real content, but worth flagging against the "no `N/A`/placeholder" spirit).

---

**Conclusion:** APPROVED. Proceed to the docs phase with DT1, DT2, DT3 as written.
