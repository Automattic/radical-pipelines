# Code Plan: Keep agent edits and commits inside the pipeline worktree and branch

## Overview

The radical-pipelines skill is prose. This change makes the worktree/branch isolation — today only implicit through inherited working directory — into stated, checkable instructions, entirely in skill prose, with no runtime enforcement. It has two parts. **Anchor:** the orchestrator injects two new labeled fields into the spawn-time `## Conventions` block authored in `skills/radical-pipelines/reference/conventions/passing.md` — an absolute worktree-root path (to all spawned agents) and the pipeline branch `worktree-<pipeline-slug>` (to committing agents only). **Verify-before-acting:** those two fields carry the behavior — anchor every absolute path on the passed worktree root and never construct a main-anchored path (write-side guard); confirm the current branch matches the passed branch before committing (commit-side guard). The tool-specific derivation of the worktree-root value is deferred from `passing.md` to the per-tool conventions `claude-code.md` (`git rev-parse --show-toplevel`) and `pi.md` (the absolute Pi worktree path already used for spawn `cwd`), following the `health-monitoring.md:13` generic-instruction-with-tool-defer pattern. The order is: first author the generic field-and-behavior change in `passing.md` (Task 1), then add the per-tool derivation in `claude-code.md` (Task 2) and `pi.md` (Task 3), then verify the orchestrator-to-agent flow end to end against the resulting prose (Task 4). Agent profiles, `autonomous-workflow.md`, `setup.md`, and `pipeline-versioning.md` are deliberately left untouched.

## Guardrail scopes

None — this project defines no guardrails, and the product is skill prose with no automated test harness. (`CLAUDE.md`: "The skill is prose, not software. Do not write structural tests that assert the content of skill or agent files.")

| Gate | Scope |
| ---- | ----- |
| None | — |

## E2E test plan

There is no automated test harness for the skill prose, and `CLAUDE.md` forbids structural tests that assert skill/agent file sections, wording, or ordering. These flows are therefore **inspection-and-reasoning scenarios**: each is a behavioral outcome a reviewer can confirm by reading the changed prose and tracing what an orchestrator and a spawned agent following that prose would do. They are not automated tests and must not be turned into assertions over file content. They exist so the reviewer can manually re-drive the spec's acceptance criteria against the resulting prose.

### Flow 1: Both anchor fields reach the agent at spawn

- **Steps:** Read the modified `## Conventions` block in `passing.md`. Simulate the orchestrator assembling the block for a spawned writer agent: it derives the absolute worktree root via the active tool's command and fills the branch as `worktree-<pipeline-slug>`.
- **Expected:** The block now defines a worktree-root field (value = the absolute path of the pipeline's worktree root; `Agents: all`) and a branch field (value = `worktree-<pipeline-slug>`; `Agents: committing agents`), each in the file's existing `- **Label:**` + `Agents:` style. An agent reading only the block can determine both the worktree location and the branch without inferring them from the artifact folder, from git, or from prior project knowledge — and the worktree-root value is derived independently of the artifact folder, so it stays correct even if the artifact folder is configured outside the worktree.
- **Traces to:** Acceptance criterion "anchor available from what it was given, even if artifact folder is outside the worktree" (spec AC 5); Requirement 4.

### Flow 2: Absolute-path write lands in the worktree copy

- **Steps:** A spawned agent (any role) follows the worktree-root field's instruction. It needs to write a file by absolute path. It constructs the path by anchoring on the passed worktree root.
- **Expected:** The instruction directs the agent to anchor every absolute path on the passed worktree root and never construct a path into the main checkout. Following it, the write resolves to the worktree copy of the file; the main checkout's copy is untouched. The guard is the passed value itself (declarative anchoring), with no per-write command.
- **Traces to:** Acceptance criterion "absolute-path write appears in the worktree copy, main copy unchanged" (spec AC 2); Requirements 1, 5.

### Flow 3: Command-driven working-tree mutation stays in the worktree

- **Steps:** A reviewer or researcher agent runs a command that writes, deploys, or destroys (e.g. a guardrail or behavior-verification command). It is operating from the passed worktree root.
- **Expected:** Because the worktree-root field and its anchoring instruction go to **all** spawned agents (including researchers and reviewers), the agent treats the worktree root as the location its commands act against; effects are confined to the worktree and the main checkout is unaffected.
- **Traces to:** Acceptance criterion "command that writes/deploys/destroys is confined to the worktree" (spec AC 4); Requirement 3.

### Flow 4: Commit lands on the pipeline branch

- **Steps:** A committing agent (any role except the two researchers) reaches its commit step. It reads the branch field, confirms the current branch matches the passed branch, then commits.
- **Expected:** The branch field carries a one-clause commit-confirm instruction (may name `git branch --show-current` inline). Following it, the agent confirms it is on `worktree-<pipeline-slug>` before committing; a mismatch is self-evident at commit time. The commit lands on `worktree-<pipeline-slug>`; main's history is unchanged.
- **Traces to:** Acceptance criterion "commit on `worktree-<pipeline-slug>`, main history unchanged" and "agent confirms branch rather than assuming by inherited cwd" (spec AC 3, AC 6); Requirements 2, 5.

### Flow 5: Branch field is scoped away from non-committing researchers

- **Steps:** Inspect the `Agents:` line on the branch field. Trace which roles receive it.
- **Expected:** The branch field's `Agents:` line resolves to every role that has its own commit step — all roles except `spec-researcher` and `design-doc-researcher` (whose analysts commit). Those two researchers still receive the worktree-root field (they mutate the working tree during experiments) but not the inert commit-confirm line.
- **Traces to:** Design decision "Worktree-root anchor → all agents; branch confirm → committing agents only"; Requirements 2, 3.

### Flow 6: Outcomes hold under both supported tools

- **Steps:** For Claude Code, simulate the orchestrator deriving the worktree root via `git rev-parse --show-toplevel` from its own cwd (the worktree). For Pi, simulate it reusing the absolute Pi worktree path it already uses for spawn `cwd`. In each case the derived value fills the worktree-root field; the branch is the tool-agnostic `worktree-<pipeline-slug>`.
- **Expected:** Each per-tool convention states how the orchestrator derives the absolute worktree root for injection. `passing.md` stays tool-mention-free and defers the derivation to the active tool's convention (mirroring `health-monitoring.md:13`). Flows 1–5 hold identically under either tool.
- **Traces to:** Acceptance criterion "all of the above hold under any supported tool (at minimum Claude Code and Pi)" (spec AC 7); Requirement 6.

### Flow 7: Orchestrator's main-checkout operations are unchanged

- **Steps:** Inspect `setup.md` and `pipeline-versioning.md` for any new constraint introduced by this change. Confirm the new fields live only on the spawned-agent passing path in `passing.md`, which the orchestrator never consumes for its own operations.
- **Expected:** No carve-out or defensive language is added anywhere. The orchestrator still commits `.rp.md` and `.gitignore` to the project/fork main branch during setup and still reads lineage tree SHAs from the main branch during pipeline versioning — unredirected — because the discipline is scoped exclusively to the spawned-agent `## Conventions` block. Requirement 7 holds by construction.
- **Traces to:** Acceptance criterion "orchestrator main-branch setup commits and lineage SHA reads still occur on main" (spec AC 8); Requirement 7; design decision "Requirement 7 — no carve-out language."

## Tasks

### Task 1: Add the worktree-root and branch fields (with their verify-before-acting behavior) to the `## Conventions` block in `passing.md`

- **Goal:** Add two new labeled fields to the spawn-time `## Conventions` block — a worktree-root anchor field carrying the declarative write-anchoring instruction, and a branch field carrying the one-clause commit-confirm instruction — using the file's existing `- **Label:**` + `Agents:` convention, and keeping the derivation of the worktree-root value deferred to the active tool's convention so `passing.md` stays tool-mention-free.
- **Type:** tdd
- **Files to change:** `skills/radical-pipelines/reference/conventions/passing.md`
- **Changes:**
  - Add a **worktree-root** field to the block. Value: the absolute path of the pipeline's worktree root. `Agents: all`. Behavior clause (declarative, minimal): anchor every absolute path on this worktree root; never construct a path into the main checkout. Defer the derivation of the value to the active tool's convention generically (no tool name, no command in this file) — mirror the `health-monitoring.md:13` phrasing "the active tool's rules (see `conventions/claude-code.md` or `conventions/pi.md`) provide …".
  - Add a **branch** field to the block. Value: `worktree-<pipeline-slug>`. `Agents: committing agents` — define "committing agents" as every role except the two researchers `spec-researcher` and `design-doc-researcher` (whose analysts commit), consistent with how `Guardrails` already scopes a subset of agents in this file. Behavior clause (one clause, minimal): commit on this branch; confirm the current branch matches before committing (may name `git branch --show-current` inline).
  - Place both fields within the existing list, preserving the file's labeling and `Agents:` style. Do not add rationale prose around them (minimalism).
- **Depends on:** none
- **Traces to:** Spec Requirements 1, 2, 3, 4, 5; Acceptance criteria on absolute-path writes, commits on `worktree-<pipeline-slug>`, command-driven mutations, anchor-availability-at-spawn, and confirm-before-commit; design decisions "Two-part design," "Carry the behavior centrally in the injected block," "Worktree-root anchor → all / branch → committing," "Asymmetric verify form," and "Generic instruction in `passing.md`, tool-specific derivation deferred."
- **Acceptance:**
  - The `## Conventions` block defines a worktree-root field whose stated value is the absolute path of the pipeline's worktree root and whose recipient scope is all agents.
  - The worktree-root field instructs anchoring every absolute path on that root and never constructing a path into the main checkout, and it expresses the write-side guard as the passed value (no per-write command).
  - The block defines a branch field whose stated value is `worktree-<pipeline-slug>` and whose recipient scope is committing agents — explicitly excluding `spec-researcher` and `design-doc-researcher`.
  - The branch field instructs confirming the current branch matches the passed branch before committing, in a single clause (optionally naming `git branch --show-current` inline), with no procedural string-comparison recipe.
  - `passing.md` contains no tool-specific command or tool name for deriving the worktree root; the derivation is deferred to the active tool's convention in the same manner as `health-monitoring.md:13`.
  - The two new fields follow the file's existing `- **Label:**` + `Agents:` style and add no surrounding rationale prose.
  - A reader of only the block can determine both the worktree location and the branch without inferring them from the artifact folder, from git, or from prior project knowledge.

### Task 2: Add the Claude Code worktree-root derivation for injection to `claude-code.md`

- **Goal:** State that, under Claude Code, the orchestrator derives the absolute worktree root for injection into the `## Conventions` block with `git rev-parse --show-toplevel` run from its own cwd (the worktree), completing the deferred half of Task 1's worktree-root field for this tool.
- **Type:** tdd
- **Files to change:** `skills/radical-pipelines/reference/conventions/claude-code.md`
- **Changes:**
  - Add a brief statement that, for injecting the worktree-root field, the orchestrator obtains the absolute worktree root by running `git rev-parse --show-toplevel` from its own cwd (which is the worktree). Phrase it minimally and in the file's existing voice.
  - Place it where the file's worktree/branch conventions live (near the `## Worktrees` / `## Branch names` content), not inside the `.rp.md` canonical block (this is orchestrator-injection guidance, not `.rp.md` content).
- **Depends on:** Task 1
- **Traces to:** Spec Requirement 6 (outcomes hold under each supported tool); Requirement 4; design component "`reference/conventions/claude-code.md` (MODIFIED)" and decision "Generic instruction in `passing.md`, tool-specific derivation deferred."
- **Acceptance:**
  - `claude-code.md` states that the orchestrator derives the absolute worktree root for injection with `git rev-parse --show-toplevel` run from its own (worktree) cwd.
  - The derivation produces an absolute path that fills the worktree-root field defined in Task 1.
  - The statement is placed as orchestrator-injection guidance, not inside the canonical `.rp.md` block, and is phrased minimally in the file's existing voice.

### Task 3: Add the Pi worktree-root derivation for injection to `pi.md`

- **Goal:** State how, under Pi, the orchestrator obtains the absolute worktree root for injection — reusing the absolute Pi worktree path it already uses as the spawn `cwd` — completing the deferred half of Task 1's worktree-root field for Pi, and recording the deterministic fallback plus the unverified-tooling assumption from the design's open question.
- **Type:** tdd
- **Files to change:** `skills/radical-pipelines/reference/conventions/pi.md`
- **Changes:**
  - Add a brief statement that, for injecting the worktree-root field, the orchestrator reuses the same absolute Pi worktree path it already uses as the spawn `cwd` (captured from `/worktree create` if it surfaces an absolute path; otherwise resolved as `.pi/worktrees/<folder-name>` against the repo root). Phrase minimally, in the file's existing voice.
  - Write the deterministic-derivation wording (reuse-the-spawn-`cwd`-path, with the `.pi/worktrees/<folder-name>` fallback) as the stated mechanism, and flag — as a short note — that the exact Pi-tooling specifics are unverified against live `@zenobius/pi-worktrees`: whether `/worktree create` emits an absolute path, the exact on-disk folder name (`worktree-<slug>` vs `<slug>`), and whether the spawn `cwd` value is absolute or repo-relative. The note records the assumption so a later verification can pin the precise folder name without reopening the design.
  - Place it where the file's Pi worktree conventions live (near `## Pi worktrees` / `## Pi branch names`), not inside the canonical `.rp.md` block.
- **Depends on:** Task 1
- **Traces to:** Spec Requirement 6; Requirement 4; design component "`reference/conventions/pi.md` (MODIFIED)," decision "Generic instruction in `passing.md`, tool-specific derivation deferred," and the design's Risk/Open-Question "Pi worktree-root derivation is unverified against live tooling."
- **Acceptance:**
  - `pi.md` states that the orchestrator derives the absolute worktree root for injection by reusing the absolute Pi worktree path it already uses as the spawn `cwd`, with the `.pi/worktrees/<folder-name>` resolution as the deterministic fallback.
  - The derivation produces an absolute path that fills the worktree-root field defined in Task 1.
  - The file records, as a brief note, that the three Pi-tooling specifics (create-command output, exact folder name, spawn-`cwd` absoluteness) are unverified, so the assumption is explicit and the precise folder name can be confirmed later without reopening the design.
  - The statement is placed as orchestrator-injection guidance, not inside the canonical `.rp.md` block, and is phrased minimally in the file's existing voice.

### Task 4: Verify the end-to-end prose flow and the untouched-by-construction surfaces

- **Goal:** Confirm, by inspection across the changed and deliberately-unchanged files, that the assembled `## Conventions` block delivers both anchors to the right agents under both tools, that the verify-before-acting behavior is stated where an agent will read it, and that the orchestrator's main-checkout operations and the agent profiles remain untouched — satisfying every spec acceptance criterion without any structural test.
- **Type:** e2e
- **Files to change:** none (verification task; produces no edits unless it surfaces a defect in Tasks 1–3, which is then fixed in the owning task)
- **Changes:**
  - Re-drive the seven flows in `## E2E test plan` against the resulting prose: trace what an orchestrator following `autonomous-workflow.md:62-64` + `passing.md` + the active tool's convention would inject, and what an agent reading only the injected block would do for an absolute-path write, a command-driven mutation, and a commit.
  - Confirm `passing.md` stays tool-mention-free and that the derivation is deferred to `claude-code.md` / `pi.md` exactly as `health-monitoring.md:13` defers the loop command.
  - Confirm `autonomous-workflow.md`, `setup.md`, `pipeline-versioning.md`, and all agent profiles are unchanged by this work, and that no carve-out/exemption language was added to `setup.md` or `pipeline-versioning.md` (Requirement 7 holds by construction).
  - Confirm the change does not contradict the existing "takes effect against the worktree — judge before running it" prose already present in `code-plan-reviewer.md` and `docs-plan-reviewer.md` (no reconciliation needed).
- **Depends on:** Task 1, Task 2, Task 3
- **Traces to:** All spec acceptance criteria (end-to-end coverage); Requirements 1–7; design decisions "Requirement 7 — no carve-out language" and "Carry the behavior centrally in the injected block."
- **Acceptance:**
  - Tracing the orchestrator-to-agent flow shows both fields reach an agent at spawn under both Claude Code and Pi, and the worktree-root value is derived independently of the artifact folder (stays correct if the artifact folder is outside the worktree).
  - Following the injected block, an absolute-path write resolves to the worktree copy, a command-driven mutation acts against the worktree, and a commit is confirmed against `worktree-<pipeline-slug>` before it is made — covering spec acceptance criteria 1–4 and 6.
  - The branch field reaches committing agents only; the two researchers receive the worktree-root field but not the commit-confirm line.
  - `passing.md` is tool-mention-free with the derivation deferred per the `health-monitoring.md:13` pattern; the per-tool derivations live only in `claude-code.md` and `pi.md`.
  - `autonomous-workflow.md`, `setup.md`, `pipeline-versioning.md`, and every agent profile are unchanged by this work, and no carve-out language was added to `setup.md` or `pipeline-versioning.md` (spec acceptance criterion 8 / Requirement 7).
  - The change does not contradict the existing worktree prose in `code-plan-reviewer.md` and `docs-plan-reviewer.md`.
