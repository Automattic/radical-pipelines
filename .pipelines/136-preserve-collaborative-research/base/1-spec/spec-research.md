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

## Research

## Out of Scope

## Consolidated Requirements
