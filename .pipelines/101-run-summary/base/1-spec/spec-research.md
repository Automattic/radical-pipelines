# Spec Research: Generic per-run pipeline summary artifact

# Generic per-run pipeline summary artifact

> Source: [Automattic/radical-pipelines#101](https://github.com/Automattic/radical-pipelines/issues/101).
> This file is self-contained; agents do not need to open the source issue.

## Goal

Each pipeline run (`base`, `review-1`, …) produces a generic, inspectable summary of what that run changed. The summary lets later reviews build on an accurate picture of prior runs, and gives each project a single artifact it can consume however it needs — all without coupling Radical Pipelines to GitHub, git, or any specific tracker.

## Constraints

- Radical Pipelines stays agnostic to GitHub/git. The artifact is a generic run/pipeline summary, not a "PR description".
- Producing the artifact is the whole scope. Consuming it — opening or updating a PR, pushing it anywhere, etc. — is left to each project (its conventions and orchestrator).

## Context

- Depends on #95 (reviews: re-run the whole pipeline as `base` + `review-N` runs on the same branch) — now closed, so the dependency is satisfied. The artifact's defining role — carrying a run's context into the next review — only exists once reviews do. #95 makes reviews agnostic to prior runs; this artifact is how prior-run awareness is selectively reintroduced. #95 also settled what each re-run is called (`base`, `review-N`), which a comment on the issue had flagged as a prerequisite for naming the artifact.
- Supersedes #66 (Generate a PR description artifact), closed as superseded by this issue.
- PR #92 implemented a v1 PR-description artifact (a mandatory, always-last doc task in phase 5 producing `pr-description.md`) and was closed pending #95 and this decision: https://github.com/Automattic/radical-pipelines/pull/92

## Assumptions / directions to explore

Open hypotheses from the discussion, to confirm or revise in later phases:

- A single file per run, generated at the end of the run, passed as input to the next review and edited/updated across iterations. The issue body suggests `pipeline-summary.md` as the name, but discussion flagged that a pipeline-level name for a per-run file could be confusing — the name should account for the run naming (`base`, `review-N`).
- A **What / Why / How** default format, which each project can override in its conventions.

## Q&A

**Q1.** The intent's open hypothesis says the summary is "generated at the end of the run", but a run's target phase varies — an autonomous run may stop at spec, plan, or docs, and continue later in another session. What counts as "the end of the run" for producing the summary: does the artifact only exist once a run has completed its final phase (5 – Docs), or should it appear/update earlier as the run advances through phases?

**A1.** Only once a run has completed its final phase.

**Q2.** What must the summary cover? Only the shipped change itself — what the run changed in code and docs and why — or also run-level context such as key decisions taken along the way, rejected approaches, or known limitations that the next review would benefit from knowing?

**A2.** Deferred — the owner is consulting teammates and will come back to this. Q&A continues meanwhile.

**Q3.** When a review run starts, which prior summaries does it receive as input: only the immediately previous run's summary (e.g. `review-2` reads `review-1`'s), or the summaries of all prior runs of the pipeline (`base` through `review-N-1`)?

The owner asked for a recommendation. Suggested: **all prior runs' summaries, in run order**, because each summary describes only its own run's delta ("what that run changed"), so the accurate picture of the pipeline is the ordered set — reading only `review-N-1`'s summary would lose every earlier run's context. The set stays cheap (one short file per run, runs per pipeline are few), and each summary stays immutable — describing its run once, never rewritten by later runs — mirroring how a review only adds a sibling run folder and never rewrites `base`. The latest-only alternative would force each summary to be cumulative, re-describing the whole pipeline every run.

**A3.** All prior runs' summaries, in run order.

**Q4.** The intent's hypothesis mentions the file being "edited/updated across iterations". Given A1 (the summary is generated only once a run completes its final phase) and A3 (each run has its own summary), is each run's summary written once at the end of its run and then immutable — later runs never edit prior runs' summaries — or is there still a case where an existing summary gets updated?

**A4.** Later runs never edit prior runs' summaries.

**Q5.** The intent's second hypothesis proposes a **What / Why / How** structure as the default format, with each project able to override it in its conventions. Do you confirm both parts — that default structure, and a project-level override via the conventions file?

**A5.** Yes, but as a direction to explore, not a decision — the spec should carry a default format that projects can override, while the exact default structure (What / Why / How) stays open for later phases to confirm.

**Q6.** Should producing the summary be required for the run to count as complete — that is, a run that finished its final phase but lacks its summary is not done — or is the summary best-effort, with the run completing without it?

**A6.** The summary is required for the run to count as complete.

**A2 (resolved).** Include run-level context in addition to the shipped change — key decisions taken along the way, rejected approaches, known limitations the next review benefits from knowing.

**Q7.** On the file's name and location: the issue discussion flagged that a pipeline-level name like `pipeline-summary.md` is confusing for a per-run file, and that the name should account for run naming (`base`, `review-N`). Do you already hold a preference for the filename and where it lives (e.g. inside the run's folder), or should the spec only carry the naming constraint and leave the exact name/location to the design phase?

**A7.** The spec only carries the naming constraint; the exact name and location are left to the design phase.

**Q8.** Must the summary's accuracy be verified before the run completes — some form of review gate, as other run artifacts have — or is producing it enough, with no review of its content?

**A8.** No review for now — producing it is enough. (Out-of-scope candidate: a review gate for the summary's content.)

**Q9.** When a pipeline is forked, inherited artifacts are copied as plain files into the new pipeline's artifact folder. Should the source pipeline's run summaries be copied to the fork as well, or do summaries stay with the pipeline whose runs produced them — the fork producing its own when its run completes?

**A9.** Summary per fork — summaries are not copied on fork; each pipeline's runs produce their own.

**Q10.** Is there anything else you want the spec to capture — constraints, success criteria, or behaviors not yet asked about — or is the Q&A complete?

**A10.** Nothing else — Q&A complete.

## Research

## Out of Scope

Confirmed with the owner:

1. **Consuming the artifact** — opening or updating a PR, pushing it anywhere, etc. Left to each project (its conventions and orchestrator).
2. **A review gate on the summary's content** — producing it is enough for now; no reviewer verifies its accuracy.
3. **Summaries for unfinished runs** — no summary appears or updates mid-run; only a run that completes its final phase produces one.
4. **Editing prior runs' summaries** — later runs never touch them.
5. **Copying summaries on fork** — a forked pipeline starts without summaries; its own runs produce their own.
6. **Fixing the exact filename, location, and default format structure in the spec** — the spec carries the naming constraint and the override requirement; the concrete name, location, and default structure (e.g. What / Why / How) are explored in the design phase.

## Consolidated Requirements

1. Every run (`base` and each `review-N`) of a pipeline produces exactly one summary artifact: a single file belonging to that run. (intent, A3, A4)
2. The summary is generated only once the run has completed the pipeline's final phase (5 – Docs). (A1)
3. Producing the summary is required for the run to count as complete. (A6)
4. The summary covers the shipped change — what the run changed and why — plus run-level context: key decisions taken along the way, rejected approaches, known limitations. (A2)
5. A review run receives as input the summaries of all prior runs of its pipeline, in run order (`base`, `review-1`, …, `review-(N-1)`). (A3)
6. A run's summary is written once at the end of its run; later runs never edit prior runs' summaries. (A4)
7. Radical Pipelines defines a default summary format that each project can override in its conventions; the exact default structure (What / Why / How is the working hypothesis) is settled in later phases. (A5)
8. The artifact's name must read as per-run — consistent with run naming (`base`, `review-N`) — not pipeline-level. The exact filename and location are design decisions. (A7)
9. The summary stays agnostic to GitHub, git, and issue trackers — it is a generic run summary, not a PR description. (intent)
10. Summaries are not copied when a pipeline is forked; each pipeline's runs produce their own. (A9)
