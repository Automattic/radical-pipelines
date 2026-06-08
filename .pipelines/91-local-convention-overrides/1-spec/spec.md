# Spec: Local, per-developer overrides of a project's Radical Pipelines conventions

## Overview

Radical Pipelines loads each consuming project's conventions from a single committed `.rp.md`. That file is currently the only sanctioned source of conventions, so an individual developer has no safe way to deviate locally — the only option is editing the committed `.rp.md`, which risks committing machine- or person-specific settings and leaking them to everyone else on the project.

This feature lets a developer place a single, git-ignored override file named `.rp.local.md` alongside the committed `.rp.md`. The override file lets that developer adjust a restricted subset of conventions — the ones that govern only their own local runtime behaviour (which agent models to use, how often the health monitor loops, and how the issue tracker is accessed) — for their own working copy or machine. The override is never committed and never affects other contributors. It merges over the committed conventions per named unit (local wins, committed inherits where the local file is silent), and it is resolved only after the committed conventions already pass the loader's required-completeness check, so a local file can never be the sole source of a required convention. This is a product capability of Radical Pipelines that applies in every consuming project; this repository's own `.rp.md` is merely the dogfood instance of the same mechanism.

## Requirements

Each requirement below is an observable outcome. The conventions and their loading flow are the things that change; this repository's own `.rp.md` is only the dogfood example of a consuming project's `.rp.md`.

### The local override file

1. A developer can place a single, fixed-name file `.rp.local.md` in the same directory as the project's committed `.rp.md` (today the repository root) to override that project's Radical Pipelines conventions for their own working copy or machine.
2. `.rp.local.md` is never committed: a setup-installed, committed `.gitignore` entry for the fixed filename keeps it out of version control for every developer, with no per-developer action required.
3. Neither `.rp.local.md` nor its effects ever appear in any commit, the pipeline branch, the fork branch (in `artifacts-in-fork` mode), or an upstream PR diff. This rests on two complementary guarantees that the spec states together:
   - **File-level — "never committed."** Because the file is git-ignored, it is in no commit whatsoever, in every artifact-storage mode.
   - **Effect-level — "never affects others."** Only conventions that govern the developer's own local runtime behaviour are overridable (see requirement 12), so nothing the orchestrator derives from a local override flows into a committed artifact or shared identifier.
4. A project that has no `.rp.local.md` behaves exactly as before: the file's absence changes nothing and produces no warning (backward compatibility for every existing consumer).

### Discovery and loading

5. When loading conventions, the loader reads the committed `.rp.md` first (unchanged behaviour), validates required completeness exactly as today, and only then always probes for `.rp.local.md` in the same location. If the override file is absent, loading proceeds exactly as it does today.
6. Override resolution runs strictly after the committed conventions pass the existing required-completeness check. The local file operates on an already-valid base: it may modify a unit the committed file defines, or add an entry to a list-shaped convention, but it may never be the sole source of a required convention. A missing required convention still routes to the setup flow, regardless of whether `.rp.local.md` supplies a value for it.
7. An override authored at the project root takes effect in the run even though the pipeline executes inside a git-ignored Claude Code worktree (`.claude/worktrees/<slug>`) where the git-ignored `.rp.local.md` is not automatically present. (How the loading flow makes the developer's `.rp.local.md` available inside the run is a design decision; the observable requirement is only that the override takes effect.)

### Merge semantics

8. The override unit is the smallest **named sub-statement the committed `.rp.md` already presents** for that convention. The committed file determines what is named, and the convention's existing shape decides the form that naming takes:
   - For a convention written as a **list of labeled bullets** (for example Agent models, structured as a `**Default:**` bullet plus `**<agent-name>:**` bullets), the unit is a single labeled bullet, keyed off that bullet's label.
   - For a convention whose committed prose **names distinct sub-statements within one block** (for example the Issues convention, which names the tracker identity — "GitHub is the source of truth" — separately from how that tracker is accessed — "accessed via the `gh` CLI"), the unit is one of those named sub-statements.
   - For an **atomic** convention (for example the health-monitoring cadence), the convention as a whole is the unit.

   An override targets the named sub-statement the committed file draws, never an arbitrary substring within it. No granularity finer than what the committed file already names is recognised, so a convention the committed file presents as a single undivided value cannot be partially overridden.
9. For each named unit (a labeled bullet, a named prose sub-statement, or a whole atomic convention, per requirement 8): if `.rp.local.md` defines it, the local value is used; otherwise the committed value is inherited. A local value replaces the matched unit wholesale — there is no partial blending inside a single unit's value (for example, inside an opaque model string or a single access statement).
10. For a list-shaped convention, resolution is a map-merge over labels: a matching label replaces that entry, a new label adds an entry, and an absent label inherits the committed entry. For example, overriding `**spec-writer:**`'s model while inheriting `**Default:**` and every other agent's model, or adding a `**code-reviewer:**` bullet that the committed file lacks.
11. Local conventions take precedence over committed ones, except where the project has explicitly marked a convention or unit as non-overridable, in which case the committed value wins (see requirement 14).

### Overridable subset (the dividing line)

12. Local overrides apply only to conventions whose value governs the developer's local runtime behaviour and does not flow into committed artifacts or shared naming. For v1 the in-scope set is exactly:
    - **Agent models** — which model each agent uses.
    - **Health-monitoring cadence** — how often the run's monitor loops.
    - **The Issues access-mechanism** — how the tracker is accessed (CLI such as `gh`, MCP, or an API token). This is the named sub-statement the committed Issues convention already presents alongside the tracker identity (see requirement 8); an override targets that access sub-statement, not the convention as a whole.

    The Issues **tracker identity** (which tracker is the source of truth) is **not** overridable, even though it is a named sub-statement of the same Issues convention block as the access-mechanism. It is shared across every collaborator, so an attempt to override it is ignored and warned under requirement 16.
13. Local overrides do not apply to conventions that produce committed output or shared identifiers — commit format, artifact folder, pipeline slug, branch names, and worktree naming — nor to tool-forced mechanism conventions (those whose form is dictated by the active tool's surface, such as the worktree, branch-name, team-spawning, and health-monitoring command forms when running under Claude Code). An attempt to override any of these is ignored and warned under requirement 16. The tool-forced restriction applies to the command *form*, not to the in-scope per-developer values carried as its arguments — for example, the health-monitoring *cadence* remains overridable per requirement 12 even though the `/loop` command form that consumes it is tool-forced.
14. A project may explicitly mark a specific convention or unit as non-overridable in its committed `.rp.md`; a conflicting local value for such a unit is ignored and the committed value is used. This is a rarely-used, opt-in project marker — the default remains local-wins.

### Warnings

All four warnings below are required observable outcomes, surfaced to the developer in the orchestrator's run output. The orchestrator is the sole human-facing channel; there is no separate log or side channel. (Whether a warning appears inline at load time or batched into a startup summary is a design detail; the observability is the requirement.)

15. If `.rp.local.md` targets a unit the project marked non-overridable, the committed value is used and the run output warns, naming the unit and stating that the project marked it non-overridable.
16. If `.rp.local.md` targets a shared or tool-forced unit that is not in the overridable subset, the attempt is ignored, the committed value is used, and the run output warns, naming the unit and stating that it is not locally overridable because it is shared across collaborators or forced by the active tool. This covers all three such families:
    - **Shared-output conventions** — commit format, artifact folder, pipeline slug, branch names, and worktree naming.
    - **The Issues tracker identity** — the source-of-truth tracker, an inherently-locked named sub-statement inside the otherwise-overridable Issues convention (requirement 12).
    - **Tool-forced mechanism conventions** — units whose form is dictated by the active tool's surface (requirement 13).
17. If a unit in `.rp.local.md` is malformed or cannot be applied, that unit is ignored (the committed value is used), the remaining valid units still apply, and the run output warns, naming the bad unit. A malformed local file never causes a required convention to read as missing and never triggers the setup flow.
18. If `.rp.local.md` is present but the project's `.gitignore` has no matching entry for it, the run output warns that the file is at risk of being committed and that the ignore entry should be added.

### Authoring, discoverability, and safety

19. The supported authoring path is hand-authoring: a developer creates `.rp.local.md` by copying the relevant convention block(s) from the committed `.rp.md` and editing the value(s), reusing the same headings, bullet labels, and named sub-statements the committed file already uses so that no new syntax is introduced. No dedicated interactive developer authoring flow is built for v1.
20. The capability is discoverable through committed, passive documentation touchpoints. The Radical Pipelines skill documentation includes a section (in the convention-loading docs, with a cross-reference from setup and a conventions-overview mention) that states: the fixed filename and location; the merge rule (local wins per named unit, committed inherits, map-merge for keyed lists); the overridable-versus-shared guidance; the fact that the file is git-ignored and never affects others; and at least one worked example (an Agent-models single-agent override). The project author may optionally leave a one-line breadcrumb pointing to `.rp.local.md` in the committed `.rp.md`.
21. The orchestrator is permitted, but not required, to mention the local-override option when a developer clearly expresses a local-only runtime preference. No proactive intent-detection is mandated for v1.
22. If the orchestrator ever writes `.rp.local.md` on a developer's behalf, it first shows the proposed content and asks for explicit confirmation, and it never overwrites an existing `.rp.local.md` without explicit approval — a lighter mirror of the committed-file confirm-before-write discipline. A local override may be partial by design (it states only the units it changes), so no required/optional completeness check is applied to it.

### Setup-flow changes

23. The project setup flow adds the `.rp.local.md` entry to the committed `.gitignore` (alongside the existing worktree-folder entry) and updates any documentation that previously implied the worktree folder was the only required `.gitignore` entry.

### Effect of overrides across run modes

24. Overrides only take effect where the overridden convention is actually exercised. In assisted runs no agents or monitors are spawned, so Agent-models and Health-monitoring overrides have no effect, while the Issues access-mechanism override still applies (the orchestrator itself reads and writes the tracker). The documentation states this expectation.

## Out of Scope

The following are explicitly out of scope for v1 and recorded here as future work:

- **Overriding the artifact-storage mode and its fork/remote configuration** (`artifacts-in-repo` versus `artifacts-in-fork`, the upstream and fork remotes, and the upstream branch/commit formats). This is the leading future-work item. The motivation is real — a solo contributor wanting to route their own work through a private fork on a project that commits in-repo — but flipping the mode locally rewires where commits are pushed and how the upstream PR is produced. Those are shared, observable effects that other contributors and the orchestrator's close-out depend on, so a safe local override for it needs more design than v1 allows. It is severable: the override mechanism ships cleanly without it.
- **A per-machine override location outside the repository** (for example `~/.config/...`). For v1 the repo-root, git-ignored `.rp.local.md` is the only supported location. A location outside the repo would break the "alongside `.rp.md`" model, would not be covered by the committed `.gitignore` entry that underpins the "never committed" guarantee, and would require an additional precedence layer.

Additionally, the following are deliberately not built for v1, as established during requirements clarification:

- A dedicated interactive developer flow for authoring `.rp.local.md` (authoring is hand-done by copying labeled blocks from `.rp.md`).
- Mandatory proactive intent-detection that surfaces the override option (the orchestrator may mention it, but no detection logic is required).

## Acceptance Criteria

These criteria drive the tests. "Run output" means the channel the orchestrator uses to communicate with the developer.

### Backward compatibility and discovery

- Given a project with a committed `.rp.md` and no `.rp.local.md`, when conventions are loaded, then loading behaves exactly as before and no override-related warning is produced.
- Given a project with a committed `.rp.md`, when conventions are loaded, then the committed `.rp.md` is read first and validated for required completeness, and only afterward is `.rp.local.md` probed for in the same location.
- Given a `.rp.local.md` authored at the project root and a run executing inside the Claude Code worktree (`.claude/worktrees/<slug>`, where the git-ignored override is not automatically present), when conventions are resolved, then the root-authored override takes effect in the run.

### Never committed / never affects others

- Given a `.rp.local.md` present in the working tree, when any pipeline run executes, then the file never appears in `git status`'s staged set, in any pipeline commit, in the fork branch (in `artifacts-in-fork` mode), or in the upstream PR diff.
- Given a project set up after this feature ships, when setup completes, then the committed `.gitignore` contains an entry that ignores `.rp.local.md`.

### Merge semantics — overridable subset

- Given a committed `.rp.md` with an Agent-models block (`**Default:**` plus per-agent bullets) and a `.rp.local.md` that overrides only `**spec-writer:**`'s model, when conventions are resolved, then the spec-writer agent uses the local model while `**Default:**` and every other agent retain their committed models.
- Given a committed Agent-models block that lacks a `**code-reviewer:**` bullet and a `.rp.local.md` that adds one, when conventions are resolved, then the code-reviewer entry from `.rp.local.md` is applied as a new entry and all committed entries are inherited unchanged.
- Given a committed Issues convention whose prose names the tracker identity ("GitHub is the source of truth") and how that tracker is accessed ("accessed via the `gh` CLI") as distinct named sub-statements, and a `.rp.local.md` that overrides only the access sub-statement, when conventions are resolved, then the local access-mechanism is used while the committed tracker identity is retained.
- Given a committed Health-monitoring cadence and a `.rp.local.md` that overrides it, when an autonomous run starts its monitor, then the monitor uses the locally overridden cadence.
- Given a `.rp.local.md` that defines a unit, when that unit is resolved, then the local value replaces the matched unit wholesale with no partial blending inside the unit's value.

### Required-completeness interaction

- Given a committed `.rp.md` that is missing a required convention and a `.rp.local.md` that supplies a value for that convention, when conventions are loaded, then the run still routes to the setup flow (the local file is never the sole source of a required convention).
- Given a committed `.rp.md` that passes the required-completeness check, when a malformed `.rp.local.md` is present, then no required convention reads as missing and the run does not route to the setup flow.

### Non-overridable and out-of-scope conventions

- Given a project that has explicitly marked a convention or unit as non-overridable in its committed `.rp.md`, and a `.rp.local.md` that targets that unit, when conventions are resolved, then the committed value is used and the run output warns, naming the unit and stating that the project marked it non-overridable.
- Given a `.rp.local.md` that targets a shared-output convention (for example commit format, pipeline slug, artifact folder, or branch/worktree names), when conventions are resolved, then the attempt is ignored, the committed value is used, and the run output warns, naming the unit and stating it is not locally overridable because it is shared across collaborators.
- Given a committed Issues convention and a `.rp.local.md` that overrides the tracker identity (the source-of-truth tracker), when conventions are resolved, then the attempt is ignored, the committed tracker identity is retained, and the run output warns, naming the tracker identity and stating it is not locally overridable because it is shared across collaborators.
- Given a `.rp.local.md` that targets a tool-forced mechanism convention (for example, under Claude Code, the team-spawning or worktree command form forced by the tool surface), when conventions are resolved, then the attempt is ignored, the committed value is used, and the run output warns, naming the unit and stating it is not locally overridable because it is forced by the active tool.

### Malformed input and missing ignore entry

- Given a `.rp.local.md` containing one malformed unit and other valid units, when conventions are resolved, then the malformed unit is ignored (its committed value is used), the valid units are applied, and the run output warns naming the bad unit.
- Given a `.rp.local.md` present in a project whose `.gitignore` has no matching entry for it, when conventions are loaded, then the run output warns that the file is at risk of being committed and that the ignore entry should be added.

### Authoring safety

- Given the orchestrator is asked to write `.rp.local.md` on the developer's behalf, when it would write the file, then it first shows the proposed content and asks for explicit confirmation before writing.
- Given an existing `.rp.local.md`, when the orchestrator is asked to write `.rp.local.md`, then it does not overwrite the existing file without explicit approval.

### Run-mode effect

- Given a `.rp.local.md` that overrides Agent models or Health-monitoring cadence, when an assisted run executes (which spawns no agents or monitor), then those overrides have no effect on the run.
- Given a `.rp.local.md` that overrides the Issues access-mechanism, when an assisted run executes, then the override still applies to how the orchestrator reads and writes the tracker.
