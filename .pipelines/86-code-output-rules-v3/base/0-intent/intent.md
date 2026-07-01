# What a pipeline writes into the host project never references the run that produced it

> Source: GitHub issue #86 (https://github.com/Automattic/radical-pipelines/issues/86).
> This file is self-contained; agents do not need to open the source issue.

## Goal

What a pipeline writes into the host project — code, tests, documentation, and commit messages — never references the concrete pipeline run that produced it: its tasks, flows, requirements, phases, artifacts, or agents. Every pipeline gets this by default, without the owner restating it each run.

## Constraints

- Commit messages keep the agent-name tag the commit-format convention adds (e.g. `Add spec (spec-reviewer)`); the rule must not forbid naming an agent in a commit.
- Stay generic: no hardcoded artifact-folder paths or tool-specific references in the agent profiles.

## Context

- The rule's origin is an observed leak where generated code referenced a pipeline artifact (https://github.com/Automattic/skillsmith/blob/25dd6b4246d1d3c426e9c3f066b754f5844cc35f/src/improvement/improver.ts#L106-L109). Recent examples: commit subjects like "…per R9" and "…per R1f/R6/R8" that point at this run's review findings.
- The original issue paired this with a second rule — leave comments on unchanged code untouched. That rule is dropped for now: an agent improving a missing description or type in a file it is already modifying looks like a legitimate improvement, so we want to observe the behavior more and forbid only the cases that are actually wrong. v3 covers this rule only.

## Assumptions / directions to explore (open)

- The rule reads most reliably stated concretely: the leak is a specific pointer to this run's machinery — a task / flow / requirement / criterion by its number, a named artifact (spec, plan, design doc, review), or another agent — while bare domain vocabulary is fine. Rough test: "is a number or a name pinning it to this run's paperwork?" The spec settles the exact formulation.
- The rule likely lives as a standing disposition in each producer's Guidelines and as a detection check in each reviewer's checklist — not one identical block in both.
- Enforcement stays at the existing per-phase review gate.
