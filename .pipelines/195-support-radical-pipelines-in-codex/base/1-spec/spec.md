# Spec: Codex support

## Overview

Radical Pipelines must run end-to-end with Codex on every Codex surface that can access a local repository. Codex support must preserve normal successful workflow execution and interoperable artifacts across tools. Codex may use different runtime mechanisms from Claude Code.

## Requirements

1. **Local Codex surfaces**
   - Support every Codex surface that can operate directly on a local repository, including the Codex desktop app, CLI, and IDE extension.
   - Provide the same required Radical Pipelines outcomes on each in-scope surface even when their native controls differ.

2. **Workflow parity**
   - Support both autonomous and assisted workflows wherever those workflows are available in Radical Pipelines.
   - Match normal successful execution, committed artifacts, and phase outcomes for issue management; pipeline creation, listing, resumption, revision, and forking; phase execution; multi-agent and multilane orchestration; worktree isolation; agent model configuration; guardrails; approval gates; tracker synchronization; commits; and run close-out.
   - Preserve the existing phase boundaries, agent roles, owner approval points, and completion rules.
   - Health monitoring and detached recovery are optional for the first Codex release.

3. **Cross-tool interoperability**
   - Codex and Claude Code must use the same branch grammar, pipeline family and run layout, artifact paths, artifact formats, and phase-completion predicates.
   - Either tool must be able to list, inspect, resume, revise, or fork a pipeline created by the other without migrating its branches or artifacts.

4. **Configuration coexistence**
   - A project already configured for Claude Code must be able to add Codex-specific configuration without rewriting, discarding, or disabling its Claude Code configuration.
   - Each tool must apply its own tool-specific conventions alongside the same shared project conventions.

5. **Compatibility**
   - Codex support must not change the observable behavior of existing Claude Code workflows.
   - Missing Codex prerequisites must use the existing convention-completeness and setup behavior rather than allowing a partially supported run.

## Out of Scope

- Codex cloud or web surfaces without direct local-repository access.
- Codex-only pipeline behavior beyond parity.
- Changes to shared branch grammar, artifact contracts, or phase-completion predicates.
- Breaking or removing existing Claude Code support or configuration.
- Mandatory health monitoring or detached recovery in the first Codex release.

## Acceptance Criteria

1. **Surface coverage**
   - Given the Codex desktop app, CLI, or IDE extension has direct access to a local repository with complete project conventions, when an owner invokes Radical Pipelines, then the selected workflow can complete normally with the same committed artifacts and phase outcomes on each surface.

2. **Autonomous workflow**
   - Given an issue and complete Codex conventions, when an owner runs an autonomous pipeline through Document, then every phase completes using the required agent roles, review gates, artifacts, commits, tracker updates, and completion predicates.

3. **Assisted workflow**
   - Given a pipeline whose next phase is supported by assisted mode, when an owner runs and approves that phase in Codex, then the same research, final artifact, approval marker, commit, tracker update, and close-out behavior occurs as in Claude Code.

4. **Pipeline operations**
   - Given pipelines in any supported state, when Codex lists, resumes, revises, or forks them, then it applies the existing versioning, branch, worktree, lane, artifact, and cleanup rules.

5. **Cross-tool continuation**
   - Given a pipeline created or advanced with Claude Code, when Codex inspects or continues it, then Codex recognizes its exact state and proceeds without migration; and the same is true when Claude Code continues a Codex-created pipeline.

6. **Configuration coexistence**
   - Given a project with working Claude Code conventions, when Codex-specific conventions are added, then both tools select their applicable conventions while retaining the same shared conventions, and the Claude Code workflow continues to work unchanged.

7. **Surface capability differences**
   - Given in-scope Codex surfaces expose different native controls, when Radical Pipelines runs on them, then normal successful execution preserves the required committed artifacts and phase outcomes without requiring identical runtime mechanisms.

8. **Incomplete setup**
   - Given required Codex conventions or prerequisites are missing, when a workflow starts, then Radical Pipelines stops at the existing completeness gate, identifies what is missing, and offers the supported setup path without creating partial pipeline work.

9. **Optional monitoring**
   - Given a Codex surface has no health monitor or detached recovery mechanism, when a pipeline runs normally, then the absence of those optional capabilities does not prevent first-release conformance.

10. **No Claude Code regression**
   - Given an existing Claude Code project configuration and workflow, when Codex support is present, then the same Claude Code operations and artifacts continue to satisfy their prior behavior and completion predicates.
