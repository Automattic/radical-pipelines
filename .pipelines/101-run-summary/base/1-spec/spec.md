# Spec: Generic per-run pipeline summary artifact

## Overview

A pipeline executes as a sequence of runs on one branch: `base` first, then `review-1`, `review-2`, … — each run a full pass of the phase flow. Reviews are by design agnostic to the runs before them; the run summary is the artifact that selectively reintroduces prior-run awareness.

Every run that completes the pipeline's final phase produces one generic, inspectable summary of what that run changed. Later review runs read the prior summaries to build on an accurate picture of the pipeline so far, and each project gets a single artifact per run it can consume however it needs — all without coupling Radical Pipelines to GitHub, git, or any issue tracker.

## Requirements

1. **One summary per run.** Every run (`base` and each `review-N`) produces exactly one summary artifact: a single file belonging to that run.
2. **Produced at run completion.** The summary is generated only when the run completes the pipeline's final phase (5 – Docs). It does not appear or update mid-run.
3. **Gates run completion.** A run does not count as complete until its summary exists; producing it is part of finishing the run.
4. **Content.** The summary describes the shipped change — what the run changed and why — plus run-level context the next review benefits from knowing: key decisions taken along the way, rejected approaches, and known limitations.
5. **Input to review runs.** When a review run starts, it receives as input the summaries of all prior runs of its pipeline, in run order (`base`, `review-1`, …, `review-(N-1)`).
6. **Immutable once written.** A run's summary is written at the end of that run; later runs never edit prior runs' summaries.
7. **Default format, project-overridable.** Radical Pipelines defines a default summary format; each project can override it in its conventions. The working hypothesis for the default structure is **What / Why / How**, to be confirmed or revised in the design phase.
8. **Per-run naming.** The artifact's name must read as a per-run summary — consistent with the run naming (`base`, `review-N`) — not a pipeline-level one. The exact filename and location are design decisions.
9. **Generic.** The summary's mechanism and default format stay agnostic to GitHub, git, and issue trackers. The artifact is a run summary, not a PR description.
10. **Per-pipeline on fork.** Summaries are never copied when a pipeline is forked; each pipeline's runs produce their own.

## Out of Scope

- **Consuming the artifact** — opening or updating a PR, pushing it anywhere, etc. Left to each project (its conventions and orchestrator).
- **A review gate on the summary's content** — producing it is enough; no reviewer verifies its accuracy.
- **Summaries for unfinished runs** — a run that has not completed the final phase has no summary.
- **Editing prior runs' summaries** — later runs never touch them.
- **Copying summaries on fork** — a forked pipeline starts without summaries.
- **Fixing the exact filename, location, and default format structure** — the design phase settles them within the constraints above.

## Acceptance Criteria

1. **Given** a run executing its final phase, **when** the run completes, **then** exactly one summary file for that run exists, committed to the pipeline branch.
2. **Given** a run whose final phase's other work is done but whose summary has not been produced, **when** run completion is evaluated, **then** the run is not complete.
3. **Given** a completed run's summary, **when** it is read, **then** it describes what the run changed and why, and records key decisions, rejected approaches, and known limitations of that run.
4. **Given** a pipeline whose runs `base` through `review-(N-1)` are complete, **when** run `review-N` starts, **then** the summaries of all prior runs, in run order, are part of its input.
5. **Given** the summaries of prior runs, **when** a later run executes and completes, **then** the prior summaries are byte-identical to before that run.
6. **Given** a project that overrides the summary format in its conventions, **when** a run's summary is produced, **then** it follows the project's format; **given** no override, **then** it follows the default format.
7. **Given** any run's summary artifact, **when** its name is read, **then** it identifies a single run's summary and does not read as a whole-pipeline summary.
8. **Given** a pipeline forked from a source pipeline whose runs have summaries, **when** the fork is created, **then** no summary file is copied into the fork's artifact folder.
9. **Given** the default format and the production mechanism, **when** inspected, **then** they reference no GitHub-, git-, or tracker-specific concepts.
