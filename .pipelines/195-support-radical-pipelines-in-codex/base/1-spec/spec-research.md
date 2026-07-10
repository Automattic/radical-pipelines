# Spec Research: Codex support

# Support Radical Pipelines in Codex

> Source: [GitHub issue #195](https://github.com/Automattic/radical-pipelines/issues/195).
> This file is self-contained; agents do not need to open the source issue.

## Goal

Owners can run Radical Pipelines end-to-end using Codex as their agentic coding tool.

## Q&A

### Question 1

Which Codex surfaces must the first release support: the Codex CLI, IDE extension, desktop app, or every surface where Codex can access a local repository?

### Answer 1

Every surface where Codex can access a local repository.

### Question 2

Must the first release support both Radical Pipelines workflows—autonomous and assisted—on every eligible Codex surface?

### Answer 2

Yes.

### Question 3

Should Codex support match every Radical Pipelines capability currently available in Claude Code, or may Codex omit capabilities that its surfaces cannot provide?

### Answer 3

Codex support must match every Radical Pipelines capability currently available in Claude Code.

### Question 4

What setup experience should a Codex user have before their first Radical Pipelines run?

### Clarification request

The owner asked what “setup experience” means.

### Question 4 (clarified)

Starting with Codex installed and a local repository open, what should the user have to do before they can ask Codex to run Radical Pipelines?

### Clarification request

The owner asked whether this meant installing a Radical Pipelines Codex plugin and said the question remained unclear.

### Resolution

Question 4 was withdrawn because it mixed user requirements with distribution and implementation choices that belong in the design phase.

### Question 5

Must a project already configured for Claude Code be able to add Codex support without changing or losing its Claude Code configuration?

### Answer 5

Yes. The owner suggested keeping a single `.rp.md` routing file whose prose directs Claude Code to `.rp.claude.md` and Codex to `.rp.codex.md`, avoiding changes to the skill.

### Question 6

Must Codex and Claude Code use the same branch grammar, artifact paths, artifact formats, and phase-completion predicates so either tool can resume work started by the other?

### Answer 6

Yes.

### Question 7

Is there any additional behavior, constraint, or success condition for Codex support that full Claude Code parity does not already capture?

### Clarification request

The owner asked what this question means.

### Question 7 (clarified)

Is full Claude Code parity the complete goal, or is there any Codex-only outcome you also want?

### Answer 7

Full Claude Code parity is the goal. No additional Codex-only outcome was specified.

### Question 8

The proposed exclusions were Codex surfaces without direct local-repository access, Codex-only behavior beyond parity, changes to shared pipeline contracts, and regressions to Claude Code support or configuration. Is anything missing?

### Answer 8

No.

## Research

- The repository distributes a standalone agent skill intended for compatible agents, but its setup flow currently lists only Claude Code as a supported agentic coding tool. Sources: `README.md`, `skills/radical-pipelines/reference/conventions/setup.md`.
- Tool-dependent conventions are isolated from shared project conventions. Codex support must supply the required team-spawning and health-monitoring conventions for Codex before the existing completeness gate permits a run. Sources: `skills/radical-pipelines/reference/conventions/load.md`, `skills/radical-pipelines/reference/conventions/claude-code.md`.
- Codex's CLI, IDE extension, and desktop app share MCP configuration, while each remains a distinct interaction surface. The spec therefore cannot assume that controls exposed in one current session exist identically everywhere. Source: [Codex MCP documentation](https://developers.openai.com/codex/mcp/).
- The repository currently provides a Claude Code plugin plus a standalone agent skill, but no Codex-specific distribution or setup files. Source: `README.md`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`.
- Direction to explore: use `.rp.md` as a prose router to tool-specific `.rp.claude.md` and `.rp.codex.md` files so both configurations coexist. This is open pending design-phase verification; the implementation may confirm or revise whether skill changes are unnecessary.
- Current local Codex releases expose subagents in the desktop app, CLI, and IDE extension, and allow custom agents with distinct model configurations and instructions. This makes autonomous multi-agent parity feasible across the required local surfaces. Source: [Codex subagents documentation](https://developers.openai.com/codex/subagents/).
- Codex Scheduled management is available in the desktop app and web, but not in the CLI or IDE extension. Cross-surface parity therefore cannot assume Scheduled as the health-monitoring mechanism; the required monitoring outcome must remain available on every in-scope surface. Source: [Codex scheduled tasks documentation](https://developers.openai.com/codex/app/automations/).

## Out of Scope

- Codex cloud or web surfaces without direct local-repository access.
- Codex-only pipeline behavior beyond Claude Code parity.
- Changes to shared branch grammar, artifact contracts, or phase-completion predicates.
- Breaking or removing existing Claude Code support or configuration.

## Consolidated Requirements

1. Radical Pipelines must run on every Codex surface that can access a local repository, including the desktop app, CLI, and IDE extension.
2. Every in-scope Codex surface must support the autonomous and assisted workflows with full parity to the capabilities available in Claude Code.
3. Codex and Claude Code must share the branch grammar, artifact paths, artifact formats, and phase-completion predicates so either tool can list, resume, revise, or fork work created by the other.
4. Projects already configured for Claude Code must be able to add Codex-specific configuration without rewriting or losing their Claude Code configuration.
5. Surface-specific differences must not remove Radical Pipelines behavior; each in-scope surface must provide the same observable workflow outcomes through the capabilities available to that surface.
6. Codex support must not regress existing Claude Code workflows.
