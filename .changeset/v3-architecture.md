---
"@automattic/radical-pipelines": minor
---

BREAKING: Architecture v3.

A pipeline is a converging set of artifacts. State is computed from the working tree: identities are body hashes, pins live in frontmatter written only by the orchestrator's `rp stamp`, and `rp check` reports the frontier — the first thing to do — from the tree alone, so any orchestrator, on any machine, continues a pipeline without a handoff. Corrections are amendments that cascade through staleness; forks, revisions, and pipeline families are gone. Every artifact loop carries a third verdict, `unsatisfiable`, that routes a contradiction to the artifact that must change — up to the owner when it contradicts a recorded Goal, Constraint, or Decision. No wave count gates a run: there is no valve and no audit; the orchestrator exercises judgment only at triage and owner escalation.

Spec and design phases verify by inspection only and label every claim verified or assumed; build verifies assumptions first. Plans are folders of self-contained task files; task reports — `completed`, `failed` with reproducible evidence, or `blocked` when the product could not be observed — pin the tasks they executed and name the commits they made; `rp check` requires them to claim every commit after the pipeline's base outside the pipelines folder. Fixed lines in artifacts (`Verdict:`, `Target:`, `Outcome:`, `Depends on:`, `## Commits`, …) are mirrored whole into frontmatter or rejected as `INVALID`; a review's pins never change. Named lanes — production lanes with a brief, optionally `after` others; review lanes with a brief and materials — are identified by their whole declaration, run in their own branches, and consolidate into the root artifact.

Profiles are rewritten on one schema (Role, Seat, Modes, Rules, Protocol, Formats), re-derived from v2 with every rule kept unless a v3 decision retired it, and paired with prompt templates in the skill: consolidators become a producer mode, writers become workers, research goes through one `researcher`, phase summaries are gone, and blockers only report malformed materials or a broken environment. Closure actions — opening, merging, or closing a pull request — are invoked by the owner.

Conventions: `.rp.md` carries a `conventions` schema stamp with a migration changelog; tool mechanics move into the skill's `tools/` files, with a project-supplied fallback for other tools; `Agents` replaces `Agent models`, configuring each profile's model and named lanes; `Artifact storage` keeps `artifacts-in-repo` and `artifacts-in-fork` and names the artifact base branch, which `rp check --base` takes; `Health monitoring` keeps its recovery budget and escalation payload; lifecycle hooks cover pipeline, branch, worktree, phase, lane, run, and closure moments.

The opencode plugin regenerates its namespaced agent-profile folder and spawns RP profiles from their plain names.
