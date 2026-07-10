# Design Doc Review

## Verdict: rejected

## Summary

The native hierarchy removes the rejected design's unproven supervisor and detached scheduler, and the recovery table now covers active-agent messaging and exact network retries. The design still cannot execute its promised worktree, role, model, and recovery contracts through the native interfaces it names. It also retains an invalid marketplace source path, so the prior distribution issue is not fully resolved.

## Issues

### Issue 1: Native spawn cannot seat agents in their assigned worktrees

**What's wrong:** The design says the orchestrator passes an absolute worktree path and that each child verifies its current working directory is inside that worktree. The native spawn contract it selects has no working-directory or worktree parameter; passing a path in the task does not change the child's inherited working directory. This directly conflicts with `skills/radical-pipelines/reference/conventions/load.md:14`, `skills/radical-pipelines/reference/conventions/setup.md:71-75`, and every agent profile's pre-write seat check. A foreground orchestrator seated in the run worktree therefore cannot concurrently start isolated-lane agents whose fixed working directories are their distinct lane worktrees.
**Where in design doc:** Native execution topology; Spawn contract; End-to-end data flow
**Suggestion:** Name a verified native operation that starts each child with its assigned worktree as its fixed working directory on all three surfaces. If native spawn cannot do that, redesign the Codex seating contract and the shared profile checks around explicit absolute-path operations such as tool working-directory arguments and `git -C`, including how concurrent lanes remain isolated without changing Claude Code behavior.
**Why it matters:** Worktree isolation, multilane execution, and the existing agent profiles fail before their first write under the stated topology, violating Requirement 2 and acceptance criteria 2 and 4.

### Issue 2: The design does not bind native agent roles or models

**What's wrong:** The spawn contract claims every spawn supplies a canonical Markdown profile and `gpt-5.6-sol`, but it does not identify a native field or configuration layer that carries either. The current native spawn operation accepts a task, not a profile, model, or settings parameter. Codex custom agents load role instructions and models from `.codex/agents/*.toml` or `[agents.<name>]` configuration, while the plugin manifest exposes no native mapping for this repository's root `agents/*.md` profiles. The component table therefore says the plugin exposes profiles and the readiness gate verifies model pinning without defining the mechanism that makes either true, including when an analyst spawns its depth-2 researcher.
**Where in design doc:** Distribution and configuration; Readiness and setup; Components; Spawn contract
**Suggestion:** Define the exact Codex role-registration and spawn mapping: how each canonical profile becomes the child's developer instructions, how the parent selects that role, where the model/settings are configured, and how the installed plugin and project setup make the mapping available to both depth-0 and depth-1 parents. Reconcile this with the existing optional Agent models convention rather than treating a prompt claim as effective model selection.
**Why it matters:** Without a native binding, spawned agents are not guaranteed to run the required role or model, so the existing topology, role behavior, and agent-model capability cannot be implemented or checked by readiness.

### Issue 3: Hierarchical monitoring still weakens the existing health policy

**What's wrong:** Replacing the independent recurring monitor leaves the depth-0 orchestrator without a parent that can detect or recover its no-output stalls and message failures. The design covers only the orchestrator's own login and network errors after they return. Its login row also retries the same model and authentication state twice, while `skills/radical-pipelines/reference/health-monitoring.md:30-35` switches to an authenticated provider-qualified model before re-spawn. Repeating an expired login unchanged is not an equivalent recovery action, yet the design claims the existing policy is preserved.
**Where in design doc:** Hierarchical monitoring and recovery; Decision: Make the native hierarchy the health monitor; Failure Modes and Observability
**Suggestion:** Account for all four signals at depth 0 and define an effective login recovery that reconciles fixed model pinning with the existing authenticated-provider fallback. If native hierarchy cannot monitor its root, record and justify an equivalent cross-surface mechanism instead of claiming full preservation.
**Why it matters:** Health monitoring is an explicit parity capability. The current design silently drops root-level detection and weakens authentication recovery, contrary to Requirement 2 and acceptance criteria 2, 7, and 9.

### Issue 4: Replacement leaks native threads outside the capacity model

**What's wrong:** Every restart interrupts the old agent and spawns a new ID, but interruption leaves the old agent available for follow-up. The design names no close or retirement operation. Codex's `agents.max_threads` limit counts open agent threads, while readiness computes only the nominal planned tree. Replacements for stalls, messages, or login errors can therefore consume capacity with interrupted IDs until a required retry or later lane cannot spawn. Close-out likewise interrupts agents but does not close them.
**Where in design doc:** Persistent identity and communication; Hierarchical monitoring and recovery; Readiness and setup; Dependencies
**Suggestion:** Define the verified close/retirement lifecycle for interrupted IDs and include replacement headroom in capacity calculations. If the supported native interface cannot close an ID, redesign restart and close-out semantics so bounded recovery cannot exhaust `agents.max_threads`.
**Why it matters:** The promised second retries, nested cancellation, and capacity gate are internally inconsistent; recovery can fail because of the lifecycle it creates rather than the underlying issue.

### Issue 5: The repository marketplace source path uses the wrong relative base

**What's wrong:** The design correctly calls `$REPO_ROOT/.agents/plugins/marketplace.json` repository-scoped, but says the repository-root plugin source is `../..` relative to that file. Codex resolves `source.path` relative to the marketplace root, which is already `$REPO_ROOT`, not relative to `.agents/plugins/`. Repository-local paths must be `./`-prefixed and remain inside that root. `../..` therefore does not express the repository root and does not satisfy the documented marketplace path rules.
**Where in design doc:** Distribution and configuration; Components; Decision: Distribute through the repository marketplace
**Suggestion:** Specify the repository-root plugin with the actual marketplace schema and a source path resolved from `$REPO_ROOT`—for example `./` if root plugins are supported by the implementation—and include the required installation policy, authentication policy, and category fields.
**Why it matters:** The prior scope ambiguity is fixed, but the proposed entry can still be skipped or resolve incorrectly, preventing plugin discovery and installation on the required surfaces.
