# Intent

> Source: GitHub issue [#71](https://github.com/Automattic/radical-pipelines/issues/71)
> — "Normalize issue content into the standard intent format when creating a pipeline".
> This file is self-contained; agents do not need to open the issue.

## Goal

When a pipeline is created from an issue, `intent.md` should always be written in
the canonical **Goal / Constraints / Context / Assumptions** format, regardless of
the issue's original shape.

The orchestrator reads the full picture — the issue body, all of its comments, any
linked or external references, and the participants' conversation — and synthesizes
it into that standard format. When that synthesis transforms the source in any way,
the owner confirms it before `intent.md` is written. When the issue is already
written in the canonical format and carries no comments and no linked or external
references, it maps to `intent.md` unchanged and no owner confirmation is needed.

The outcome to achieve: every downstream phase starts from the same canonical input,
whether the originating issue was written in this project's format or as a free-form
third-party discussion.

## Constraints

- The owner must confirm the synthesized intent before it is committed (the
  synthesis is not written silently) — **except** when the issue is already written
  in the canonical Goal / Constraints / Context / Assumptions format and has no
  comments and no linked or external references. In that case the issue maps directly
  to `intent.md` with no transformation, so confirmation is skipped.

Beyond the confirmation rule above, no further hard constraints were stated.

## Context

This is a change to the Radical Pipelines orchestrator skill itself — specifically
the pipeline-creation flow that turns an issue into the phase-0 `intent.md` artifact.

Today that flow adapts the issue content into an intent directed at the agents that
run subsequent phases, but it does not guarantee a single canonical structure for
`intent.md`, and it does not include an explicit owner-confirmation step before the
file is written. As a result, the shape of `intent.md` can vary with the shape of the
originating issue.

## Assumptions / directions to explore

These are the owner's current hypotheses. Treat them as starting points to validate
through research, not as settled requirements:

- The change likely lives in the orchestrator's pipeline-creation flow (e.g.
  `create-pipeline.md`, and possibly `work-on-an-issue.md`).
- The owner-confirmation step is driven by the orchestrator (assisted Q&A), not by a
  spawned agent.
- External links and references in the issue/comments should be fetched and read as
  part of the synthesis.
