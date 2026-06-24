# Code Review

## Verdict: approved

## Batch scope

Tasks reviewed:

- Task 1: Add the worktree-root and branch fields (with their verify-before-acting behavior) to the `## Conventions` block in `passing.md`
- Task 2: Add the Claude Code worktree-root derivation for injection to `claude-code.md`
- Task 3: Add the Pi worktree-root derivation for injection to `pi.md`
- Task 4: Verify the end-to-end prose flow and the untouched-by-construction surfaces

## Summary

The batch delivers the two-part anchor-and-verify isolation fix entirely in skill prose, exactly as the design and plan specify. The source diff is precisely the three convention files (`passing.md` +4, `claude-code.md` +1, `pi.md` +4) and nothing else: agent profiles, `autonomous-workflow.md`, `setup.md`, and `pipeline-versioning.md` are byte-for-byte unchanged, so Requirement 7 holds by construction with no carve-out language. The verify-before-acting behavior is authored once in the injected `## Conventions` block (`passing.md`), which stays tool-mention-free and defers the worktree-root derivation to `claude-code.md` and `pi.md` using the same `health-monitoring.md:13` pattern; each per-tool derivation sits inside that tool's fenced `.rp.md` block in the worktree section, mirroring where each file's `/loop` command sits. All four tasks meet every acceptance bullet, all eight spec acceptance criteria trace through against the resulting prose, and the additions honor the project's authoring rules (minimal, generic, non-duplicative, no gratuitous negatives, profiles self-contained). This project defines no guardrails and has no automated test harness; acceptance is verified by inspection and reasoning over the prose, which is the project's accepted pattern.

## Checks

| Check | Command | Result |
| ----- | ------- | ------ |
| None (no guardrails convention defined for this project) | — | n/a |

## Behavior verification

The change is skill prose; the code-plan's `## E2E test plan` flows are explicitly inspection-and-reasoning scenarios. I re-drove all seven by reading the changed prose and the deliberately-unchanged files and reasoning about what an orchestrator and a spawned agent following the prose would do. Evidence below is the load-bearing quotes and the file/line locations.

- **Flow 1 — both anchor fields reach the agent at spawn.** `passing.md:7-10` defines a worktree-root field (`Agents: all`) and a branch field (`Agents: committing agents`), each in the file's `- **Label:**` + `Agents:` style. An orchestrator following `autonomous-workflow.md:62-63` ("include the `## Conventions` block at the top of its initial prompt") injects the block at every spawn; per `claude-code.md:17` it derives the root from `git rev-parse --show-toplevel` (independent of the artifact folder) and fills the branch as `worktree-<slug>`. An agent reading only the block can determine both location and branch without inferring from the artifact folder, git, or prior knowledge. Spec AC 5 / Requirement 4 satisfied.

- **Flow 2 — absolute-path write lands in the worktree copy.** The worktree-root field instructs "Anchor every absolute path on this root; never construct a path into the main checkout" — declarative, the passed value is the guard, with no per-write command. A write anchored on the passed root resolves to the worktree copy; the main checkout copy is untouched. Spec AC 2 / Requirements 1, 5 satisfied.

- **Flow 3 — command-driven working-tree mutation stays in the worktree.** The worktree-root field is `Agents: all`, so reviewers and researchers running write/deploy/destroy commands receive the same anchoring instruction; effects are confined to the worktree. Spec AC 4 / Requirement 3 satisfied.

- **Flow 4 — commit lands on the pipeline branch.** The branch field carries "Commit on this branch; confirm the current branch (`git branch --show-current`) matches before committing" — one clause, naming the command inline, no scripted string comparison. A mismatch is self-evident at commit time. Spec AC 3, AC 6 / Requirements 2, 5 satisfied.

- **Flow 5 — branch field scoped away from non-committing researchers.** The branch field's `Agents:` line reads "committing agents — every role except `spec-researcher` and `design-doc-researcher`." Those two still receive the worktree-root field (it is `Agents: all`) but not the inert commit-confirm line. Matches the design decision exactly.

- **Flow 6 — outcomes hold under both supported tools.** `passing.md` is tool-mention-free and defers derivation per `health-monitoring.md:13`. `claude-code.md:17` supplies `git rev-parse --show-toplevel`; `pi.md:18` supplies the reused absolute Pi worktree path with the `.pi/worktrees/<folder-name>` fallback. Each derivation sits inside its tool's fenced `.rp.md` block in the worktree section (`## Worktrees` at `claude-code.md:10`, `## Pi worktrees` at `pi.md:8`), mirroring where each file's `## Health monitoring` `/loop` command sits. The branch is the tool-agnostic `worktree-<slug>`. Flows 1-5 hold under either tool. Spec AC 7 / Requirement 6 satisfied.

- **Flow 7 — orchestrator's main-checkout operations unchanged.** `git diff 8350faa..HEAD` over source paths shows only the three convention files changed; `setup.md`, `pipeline-versioning.md`, `autonomous-workflow.md`, and every agent profile under `agents/` are unchanged, and no carve-out or exemption language was added anywhere. The new fields live only on the spawned-agent passing path, which the orchestrator never consumes for its own operations, so Requirement 7 holds by construction. Spec AC 8 / Requirement 7 satisfied.

- **Non-contradiction check.** The existing "A command that writes, deploys, or destroys takes effect against the worktree — judge before running it" prose in `code-plan-reviewer.md:19` and `docs-plan-reviewer.md:20` is consistent with the new worktree-anchoring instruction; no reconciliation needed.
