# Spec: Keep agent edits and commits inside the pipeline worktree and branch

## Overview

When a radical-pipelines run executes in a worktree, every file an agent touches and every commit it makes must land in the pipeline's worktree copy of the repository and on the pipeline branch (`worktree-<pipeline-slug>`). Today this isolation is only assumed: the orchestrator enters the worktree once and spawned agents inherit it as their working directory, but no agent is told it is in a worktree, which branch to commit to, or to avoid the main checkout. As a result, agents sometimes write to the main checkout's copy of a file (the worktree is a literal subpath of the main repo, so the same tracked file exists as two distinct physical copies and a main-anchored absolute path silently resolves to the wrong one) and sometimes commit to the main branch instead of the pipeline branch.

This spec defines the observable outcome the skill must guarantee: across all the agent roles a pipeline spawns, file changes and commits stay confined to the pipeline's worktree and branch, even when an agent works from an absolute path or runs a git command that could otherwise target the main checkout. The subject under spec is the radical-pipelines skill itself. The skill is prose, not software: these requirements become instructions in skill and agent prose, achieved by correct-by-construction wiring plus clear instructions, with no runtime layer that mechanically blocks a stray write or commit.

## Requirements

Throughout, "spawned agent" means any agent role the orchestrator spawns for a pipeline — every spec, design-doc, plan, code, and docs role, including writers, analysts, the consolidator, researchers, and reviewers. The orchestrator itself is a distinct actor and is not a "spawned agent" for these requirements.

1. Every file a spawned agent creates, edits, or deletes during a pipeline run lands in the pipeline's worktree copy of the repository and never in the main checkout's copy — including when the agent acts on an absolute path rather than a path relative to its working directory.

2. Every commit a spawned agent makes during a pipeline run lands on the pipeline branch (`worktree-<pipeline-slug>`) and never on the main branch — including when the commit results from a git invocation that could otherwise be directed at the main checkout or its shared git directory.

3. Working-tree mutations a spawned agent makes by running commands — for example a reviewer running a guardrail or behavior-verification command that writes, deploys, or destroys — take effect against the worktree and never against the main checkout.

4. A spawned agent can determine the pipeline's worktree location and the pipeline branch from what it is given at spawn time, without having to infer them from the artifact folder, from git, or from prior knowledge of where the project lives. This determination remains correct even when the artifact folder is configured to a location outside the worktree.

5. A spawned agent confirms it is acting against the pipeline's worktree and branch before editing files or committing, rather than relying solely on inherited working-directory state.

6. These outcomes hold under every agentic-coding tool the skill supports (at minimum Claude Code and Pi), fitting each tool's worktree and spawn model, and are achieved through skill and agent prose rather than a runtime enforcement layer.

7. The orchestrator's existing, deliberate operations against the main checkout and main branch remain correct and unconstrained by the agent worktree/branch discipline — specifically, committing `.rp.md` and `.gitignore` to the project/fork main branch during setup, and reading lineage tree SHAs from the main branch during pipeline versioning.

## Out of Scope

- Runtime enforcement, hooks, or tooling that mechanically blocks a wrong-tree write or wrong-branch commit. The skill is prose, not software.
- Changing where worktrees, branches, or artifact folders are located, or how they are named.
- Constraining or altering the orchestrator's own main-checkout operations listed in requirement 7.
- Automatic detection, cleanup, or recovery of a stray write or commit already made to the main checkout. This spec governs preventing misplaced changes, not undoing one that already happened.

## Acceptance Criteria

- Given a pipeline running in its worktree, when all spawned agents have completed their phases, then the main checkout's working tree shows no agent-made modifications and the main branch has gained no agent-made commits; every agent edit and commit is present only in the worktree and on the pipeline branch.

- Given a spawned agent that writes a file using an absolute path, when the write completes, then the file changes appear in the worktree copy of that file and the main checkout's copy of that file is unchanged.

- Given a spawned agent that commits its output, when the commit completes, then the commit is on `worktree-<pipeline-slug>` and the main branch's history is unchanged.

- Given a spawned agent that runs a command which writes, deploys, or destroys (such as a guardrail or behavior-verification command), when the command runs, then its effects are confined to the worktree and the main checkout is unaffected.

- Given a spawned agent at the moment it is spawned, when it needs the worktree location or the pipeline branch, then both are available to it from what it was given, without inferring them from the artifact folder, from git, or from prior knowledge of the project's location — and they remain correct even if the artifact folder is configured outside the worktree.

- Given a spawned agent about to edit a file or commit, when it acts, then it has confirmed it is operating against the pipeline's worktree and branch rather than assuming it by inherited working directory.

- Given the same pipeline run executed under any agentic-coding tool the skill supports (at minimum Claude Code and Pi), when agents complete their phases, then all of the above hold for that tool.

- Given a pipeline setup and a pipeline-versioning operation, when the orchestrator commits `.rp.md` and `.gitignore` to the project/fork main branch and reads lineage tree SHAs from the main branch, then those operations still occur on the main branch and are not redirected into the worktree by the agent worktree/branch discipline.
