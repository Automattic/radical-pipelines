# Generated code should never edit unchanged comments or reference Radical Pipelines artifacts

> Source: GitHub issue [#86](https://github.com/Automattic/radical-pipelines/issues/86).
> This file is self-contained; agents do not need to open the source issue.

## Goal

Code produced by a pipeline follows two output rules by default, without the owner having to restate them each run:

1. Comments on code that wasn't changed are left untouched.
2. The product code never mentions or references Radical Pipelines artifacts (pipelines, phases, specs, design docs, plans, etc.).

## Context

- Both are guidelines that were hand-passed to the Skillsmith pipeline (issue #37, v2); the intent is to promote them into the Radical Pipelines tool so every pipeline gets them for free.
- The "no RP-artifact references" rule comes from an observed leak where generated code carried a comment narrating the pipeline process — a plan task and the pipeline itself: https://github.com/Automattic/skillsmith/blob/25dd6b4246d1d3c426e9c3f066b754f5844cc35f/src/improvement/improver.ts#L106-L109
- Team discussion concluded both rules "should be included in the tool's general prompts."

## Assumptions / directions to explore (open)

- Proposed home is the tool's general prompts, so the rules apply across phases — recorded as a direction, not a requirement; the spec and design phases decide the actual mechanism and scope.
