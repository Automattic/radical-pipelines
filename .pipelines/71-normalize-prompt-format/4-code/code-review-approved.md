# Code Review — APPROVED (iteration 1)

Source issue: [Automattic/radical-pipelines#71](https://github.com/Automattic/radical-pipelines/issues/71) — "Normalize issue content into the standard prompt format when creating a pipeline".

Reviewed the full phase-4 batch (T1–T5) adversarially against the approved spec (`1-spec/spec.md`, R1–R12 / AC1–AC15), design doc (`2-design-doc/design-doc.md`, D1–D6), and code plan (`3-plan/code-plan.md`). Range: `9d994c3..HEAD`. Commits 527c7e2 (T1), d5d5381 (T2), 12e2278 (T3), 931cfdd (T4), 005eb9c (T5).

Verdict: **APPROVED.** Every task's acceptance assertions hold in the shipped files, all spec requirements and ACs are satisfied, AGENTS.md compliance is clean, and the change is end-to-end coherent. No findings requiring re-dispatch.

## Scope check

`git diff --name-only 9d994c3 HEAD` touches exactly the four planned files (plus the no-op T1 commit on `manage-issues.md`):
- `.changeset/normalize-prompt-format.md` (T5)
- `.rp.md` (T3)
- `skills/radical-pipelines/reference/conventions/setup.md` (T2)
- `skills/radical-pipelines/reference/create-pipeline.md` (T4)

No collateral edits.

## Per-task verification

### T1 — manage-issues.md link-target stability (no-op)
- Commit 527c7e2 is empty (`git show --numstat` returns nothing); `git diff 9d994c3 HEAD -- manage-issues.md` is empty — the file is byte-identical to base. Verifying-without-editing is the documented valid outcome.
- `grep -c '^## The issue format$'` = **1** (unique, stable link target T4 cites).
- The taxonomy section (`:12-22`) still lists Title/Goal/Constraints/Context/Assumptions, the omit-empty rule, and the "vague idea → Title + Goal" minimal case. Single source of truth preserved.

### T2 — setup.md Issues capability (comment-reading)
- Capability sentence (`:64`) now reads "read them and their comments, comment on, and update them" — additive, generic.
- No tool name introduced into the capability sentence. The `gh`/`MCP` hits in setup.md are pre-existing illustrative-access mentions at `:66` (unchanged access-mechanism sentence) and `:144` (fork convention) — not in the granted capability.
- No web/URL/external/fetch capability added to the Issues block (grep of `:62-67` is clean) — external fetch correctly excluded per D3/D-T1.

### T3 — .rp.md "Reading an issue" note
- New `#### Reading an issue` subsection added under "Managing tasks", peer to "Creating an issue"/"Modifying an issue": "Read the issue with `gh`, including its comments." One line, matches sibling terseness; states comments are included; `gh` named (allowed — `.rp.md` is tool-specific config, exempt from R-generic).

### T4 — create-pipeline.md step 4 rewrite + step-5 reconciliation (core)
All acceptance assertions verified:

- **Single source / referenced not duplicated (R1, R3; AC1, AC4):** Step 4 cites `manage-issues.md` ("The issue format") via the file+section idiom (`:29`). No section *semantics* are defined in create-pipeline.md (grep for "binding must"/"prior decisions"/"desired outcome" is empty — definitions live only in manage-issues.md). The cross-link is load-bearing (manage-issues.md is otherwise off this reading path).
- **Rendering wrapper documented & checkable (R2, R4; AC2, AC3, AC5):** `# Prompt` H1 + `> Source:` blockquote + self-contained note + `## ` body sections, empty ones omitted (no `N/A`). A rendering specimen (`:33-45`) is present with Goal always present and Constraints/Context/Assumptions marked "only if present". Minimal = `# Prompt` + source line + `## Goal` is stated explicitly (`:47`). The line-31 mention of the section labels documents the omit-empty *rendering rule* (which sections render / are omitted) — it is the wrapper illustration, not a competing taxonomy definition, consistent with design D1/plan acceptance ("section headings in the specimen are the wrapper illustration, not a definition").
- **Synthesis inputs (R5, R6; AC6, AC7, AC8):** reads body + every comment, noting each comment's author; fetches one-hop references with the access split (GitHub-internal via **Issues** convention, others via web fetch); "one hop only … not crawled"; best-effort ("note any reference you cannot reach and proceed"). Wording is fully generic — `grep -Ei '\bgh\b|\bMCP\b|WebFetch|curl|git'` over create-pipeline.md returns nothing.
- **Normalize, don't converge; surface conflicts (R7, R8; AC9, AC10):** preserves stated intent; files hypotheses/directions under **Assumptions / directions to explore** labeled open; adds no requirements/AC/technical direction/design/implementation; never substitutes a different goal; conflicts/revisions reflected as "best current reading" and surfaced to the owner at confirmation, not silently resolved.
- **Owner confirmation (R9–R11; AC11–AC14):** unconditional render→confirm→revise→write→commit gate (`:49`) shows "the full rendered `prompt.md` text — the exact content to be written, not a summary"; revise-and-re-show loop; "On explicit approval, write `prompt.md` and commit it, in that order"; "Nothing is written to disk before approval" (gate before the *write*). No `Decisions` section (grep empty) — gate is unconditional and upstream of mode selection (confirmed: `work-on-an-issue.md` step 2 create-pipeline precedes step 3 pick-mode). No phase-0 approval artifact is introduced.
- **Assets & self-containment (R12; AC15):** asset download broadened to "the issue, any comment, or a cited reference"; relative-path rule kept; downloaded "before showing the draft so its links resolve"; self-contained note now spans body + comments + references.
- **Step-4/5 reconciliation:** old standalone "Commit" step removed; commit folded into step 4's approval branch tied to the **Commit format** convention at the approval moment — no separate silent commit. Step headings run 1–4 with no gap; intro line (`:3`) still accurate.

### T5 — changeset
- Valid frontmatter `"@automattic/radical-pipelines": minor` — package name confirmed against `package.json` ("name": "@automattic/radical-pipelines") and sibling changesets.
- Single concise prose paragraph (one body paragraph), accurate to the shipped behavior, and names both supporting grants (setup Issues comment-reading; dogfood `.rp.md` "Reading an issue"). At ~212 words it is denser than the shortest siblings but on par with `per-agent-model-config.md` (146 words) for a change of this breadth; the plan (T5) explicitly mandated covering all behaviors plus the grants in one paragraph. Not an R-min concern worth rejecting.
- No manual `CHANGELOG.md` or version-file edits.

## AGENTS.md compliance (cross-cutting)
- **R-min** — additions are tight; wrapper spec + specimen are compact; no padding.
- **R-neg** — positive phrasing throughout; the retained "must-not" clauses (no goal substitution; add no requirements) are operationally load-bearing (the phase-0/later-phase boundary).
- **R-generic** — no tool names in `create-pipeline.md` or in the setup.md capability sentence; `gh` appears only in `.rp.md` (exempt).
- **R-dup-path / R-dup-cross** — taxonomy referenced not copied; the confirm loop is in-place on a sibling path (`create-pipeline.md` vs `manage-issues.md`, never co-loaded) per the design's recorded reasoning; no new shared file created.

## End-to-end coherence
The whole change implements the specified behavior: pipeline creation now reads body + all comments (author-attributed) + one-hop best-effort access-split references, synthesizes into the single referenced canonical format rendered in a documented checkable wrapper, normalizes without converging while surfacing conflicts, and gates the write+commit on an unconditional owner confirmation with a revise loop — with the supporting capability grants in place. Nothing missing or contradictory.
