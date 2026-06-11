# Normalize issue content into the standard intent format when creating a pipeline

> Source: GitHub issue [#71](https://github.com/Automattic/radical-pipelines/issues/71).
> This file is self-contained; agents do not need to open the issue.

## Goal

When a pipeline is created from an issue, `intent.md` is always written in the
canonical **Goal / Constraints / Context / Assumptions** format, regardless of the
issue's original shape.

The orchestrator reads the full picture — the issue body, all of its comments, any
linked or external references, and the participants' conversation — and synthesizes
it into that standard format. The outcome to achieve: every downstream phase starts
from the same canonical input, whether the originating issue was written in this
project's format or as a free-form third-party discussion.

## Constraints

- When the synthesis transforms the source in any way, the owner confirms the result
  before `intent.md` is written — the synthesis is never committed silently.
- When the issue is already written in the canonical format and has no comments and
  no linked or external references, it maps to `intent.md` unchanged and no owner
  confirmation is needed.

## Context

This is a change to the Radical Pipelines orchestrator skill itself — specifically
the pipeline-creation flow that turns an issue into the phase-0 `intent.md` artifact.
Today that flow adapts the issue content into the intent but does not guarantee a
single canonical structure, and it has no explicit owner-confirmation step before the
file is written, so the shape of `intent.md` can vary with the shape of the issue.

## Assumptions / directions to explore

These are the owner's current hypotheses — starting points to validate through
research, not settled requirements:

- The change likely lives in the orchestrator's pipeline-creation flow (e.g.
  `create-pipeline.md`, and possibly `work-on-an-issue.md`).
- The owner-confirmation step is driven by the orchestrator (assisted Q&A), not by a
  spawned agent.
- External links and references in the issue/comments should be fetched and read as
  part of the synthesis.
