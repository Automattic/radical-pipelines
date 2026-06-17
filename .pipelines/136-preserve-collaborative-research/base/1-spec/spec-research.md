# Spec Research: Preserve collaborative research across the assisted phases

> Source: GitHub issue Automattic/radical-pipelines#136 (https://github.com/Automattic/radical-pipelines/issues/136).
> This file is self-contained; agents do not need to open the source issue.

## Goal

In the assisted spec, design-doc, and plan phases, the substantive research and exploration the orchestrator does hand-in-hand with the owner — candidate solutions, the problems with each, trade-offs weighed together — is reliably preserved in the phase's research artifact, even when it doesn't fit that artifact's documented format. Today this collaborative exploration can be lost to the chat.

## Context

- Spec phase (`reference/assisted-phases/1 - spec.md`): `spec-research.md` is Q&A-structured, and `## Research` is scoped to the orchestrator's *own* codebase reads. Owner-initiated questions and explanatory dialogue — often the most valuable findings — have no clear home.
- The design-doc and plan phases capture options, trade-offs, and decisions through a `## Topics` structure, so they fare better — but all three phases instruct recording *"in real time, not in batches,"* an aspiration with no concrete trigger, so material still slips away under conversational momentum.
- The spec phase's *"MUST NOT propose design or implementation choices"* applies across all steps, blurring the line between *advocating* a design (which should stay out of scope) and *recording* design-adjacent exploration that arose with the owner (which should be preserved). Each later assisted phase has analogous "don't do the next phase's job" rules.

## Assumptions / directions to explore

_(open — for later phases to confirm or revise)_

- Make the recording trigger reliable rather than the aspirational "in real time." Trade-off to resolve: *before each reply* (most reliable; risk of noise) vs. *before the next question* (a settled per-thread summary; less noise, but depends on noticing the moment — the failure mode that loses research today). Noise may be better controlled by *what* is recorded — a distilled, per-settled-thread entry, as the design-doc/plan `## Topics` structure already does — than by *when*.
- Make explicit that owner-initiated questions and explanatory exchanges count as recordable material, not just the orchestrator's scripted questions (sharpest in the spec phase).
- Distinguish *advocating or committing to* a design from *recording* design-adjacent exploration; the "don't propose" rules should constrain the former, not the latter.
- When an assisted phase's discussion drifts into the next phase's territory (spec → design, design → plan), the orchestrator flags it and recommends running the next assisted phase once the current one is complete — while the context is still fresh — so those decisions land in their proper artifact instead of being lost. (The plan phase's next phase, code, is agent-driven with no assisted form, so this naturally stops at plan.)
- For that handoff to preserve value, the next phase must pick up the research, but each phase normally reads only the prior phase's standalone artifact (e.g. design reads `spec.md`, not `spec-research.md`). How the research carries across is to be worked out.

## Q&A

### Q1 (to researcher): How do phase artifacts carry across phases today, in assisted and autonomous modes? Does any downstream phase read a prior phase's research artifact, or only the standalone artifact?

**A (researcher):**
- The three assisted research artifacts and their sections: `spec-research.md` (`## Q&A`, `## Research`, `## Out of Scope`, `## Consolidated Requirements`); `design-doc-research.md` (`## Research`, `## Topics`, `## Open Questions`, `## Risks`, with each Topic = Spec link / Options / Trade-offs / Decision / Rationale); `plan-notes.md` (`## Research`, `## Code Plan Topics`, `## Doc Plan Topics`, `## Open Questions`, `## Risks`, same Topic shape).
- WITHIN a phase, the writer reads its own research artifact: autonomous `design-doc-writer` reads BOTH `spec.md` AND `design-doc-research.md` (`autonomous-phases/2`, lines 26, 33).
- ACROSS phases, the next phase reads ONLY the prior phase's standalone artifact. Design-doc input is just `spec.md` (`assisted-phases/2` line 7; `autonomous-phases/2` line 7). Plan inputs are `spec.md` + `design-doc.md` (lines 7-8). The research files (`spec-research.md`, `design-doc-research.md`, `plan-notes.md`) are NEVER listed as a downstream phase input anywhere.
- The standalone artifacts explicitly tell the reader they should NOT need the research file (e.g. `spec.md` "the reader should not need `spec-research.md`", `assisted-phases/1` line 110).
- Conclusion: the carry-across gap is real — collaborative exploration recorded in a phase's research artifact has no path into the next phase, which by design reads only the standalone artifact.
- Added precision (researcher follow-up): the negative "standalone — reader should NOT need the research file" statements appear at `assisted-phases/1` line 110, `2` line 135, `3` line 124. By phase 3 the writer already reads two prior *standalone* artifacts (`spec.md` + `design-doc.md`) and zero research/notes artifacts. So a carry-forward mechanism must choose between: (a) the downstream phase reads the prior research file directly, vs. (b) the research is folded into the standalone artifact that the downstream phase already reads. This is a design-phase choice; the spec states the WHAT (the research must reach the next phase) without dictating the mechanism.

### Q2 (to researcher): In `1 - spec.md`, what's the exact current scope of `## Research` vs `## Q&A`, the verbatim "MUST NOT propose design" constraint, and does step 2 frame the dialogue as two-directional?

**A (researcher):**
- (a) **`## Research` scope** is pinned to the orchestrator's OWN codebase reads in two places: constraint line 25 ("Record any non-trivial findings under `## Research` ... with sources cited. Do not produce a separate research artifact...") and step 2 line 68 ("Record non-trivial findings under `## Research`"). `## Q&A` (per step 2 lines 53-56) is strictly the transcript of orchestrator-question/owner-answer pairs. The four sections are `## Q&A`, `## Research`, `## Out of Scope`, `## Consolidated Requirements` (lines 38-44). **Neither an owner-initiated question + its explanatory exchange, nor design-adjacent collaborative exploration, has a clean home**: `## Q&A` is framed one-directional, `## Research` is codebase-reads-only, and there is no `## Topics`-style structure here (unlike design-doc/plan, which DO have one for owner-collaborative options/trade-offs).
- (b) **The constraint**, verbatim line 21: "You MUST NOT propose design or implementation choices — those belong to later phases." It sits under `## Constraints` ("These rules apply across all steps", line 17). **Nothing currently distinguishes advocating/committing to a design from merely recording design-adjacent discussion the owner raised** — the prohibition is flat and unqualified, reinforced by line 20 ("MUST NOT answer your own questions or propose solutions on the owner's behalf"). The word "record" appears only in the codebase-reads sense.
- (c) **Step 2 frames the orchestrator as sole question-asker; the owner only answers.** Line 51 "Ask one question at a time"; lines 53-56 loop ("Formulate the question... Present it to the owner and wait for the answer... Decide what to ask next"); line 58 "Cover these areas strategically" (the seven areas are the orchestrator's checklist). The only owner agency over direction is step 7 line 118 ("The owner may also send you back to step 2 for more Q&A") — redirecting flow, not initiating a recordable question. The intent's "owner-initiated questions and explanatory dialogue" maps to a real gap.

## Research

(Findings below cite the orchestrator's own reads of the skill source.)

- The assisted workflow runs exactly ONE phase per session: "continuing to a later phase happens in a separate session" (`reference/assisted-workflow.md` line 32). The phase run is the pipeline's "next phase" (line 5). This is load-bearing for the intent's "recommend running the next assisted phase" direction — the recommendation is a cross-session handoff, not an in-session continuation.

## Out of Scope

## Consolidated Requirements
