# Spec Review

## Verdict: approved

## Summary

The spec faithfully captures the consolidated requirements from `spec-research.md` and stays disciplined at the WHAT-not-HOW altitude that a spec demands. Every core isolation outcome (file edits, commits, command-driven mutations), the spawn-time anchor/branch availability, the pre-action verification behavior, the cross-tool constraint, and the orchestrator's deliberate main-branch exceptions are each present as a requirement and backed by a matching Given-When-Then acceptance criterion. I verified the spec's load-bearing claims against the actual skill: the spawn surface is the `## Conventions` block in `reference/conventions/passing.md` (today carrying only the artifact folder as a path), the worktree is a literal subpath of the main checkout, the pipeline branch is `worktree-<pipeline-slug>`, and the orchestrator genuinely commits `.rp.md`/`.gitignore` to the main branch (`reference/conventions/setup.md:211,220`) and reads lineage tree SHAs from main (`reference/pipeline-versioning.md:65,73,86`). The spec contradicts none of these and proposes nothing infeasible. The failure mechanisms the research uncovered (main-anchored absolute paths, `-C`/`--git-dir`/`cd`-out git redirection) are correctly embedded only as outcome qualifiers ("including when...") rather than prescribed mechanisms, keeping design choices out of the spec. This is a rare clean first pass; it is warranted.

## Notes (non-blocking)

The following were considered and judged not to be defects; recorded so the approval is transparent about what was checked.

- **Consolidated requirement 9 is absent, and correctly so.** Consolidated req 9 (express the change within the spawn-time `## Conventions` block, the per-tool conventions, and agent profiles, respecting the skill's authoring rules) is a HOW concern — it dictates which files to edit and how to structure the change. The spec-writer profile explicitly forbids promoting such mechanism into a requirement. Its omission is the right call, not a gap.

- **Consolidated requirements 4 and 5 are merged into spec requirement 4, reframed as outcome.** The research framed these as "every agent receives an anchor" and "every committing agent is given the branch name" (mechanism-flavored). The spec restates them as "a spawned agent can determine the worktree location and pipeline branch from what it is given at spawn time." This is a deliberate, correct lift to outcome altitude and loses no coverage; the edge case (artifact folder configured outside the worktree) survives the merge and appears in both requirement 4 and its acceptance criterion.

- **Researchers and reviewers are in scope.** The scoping paragraph names researchers and reviewers explicitly, and requirement 3 plus its acceptance criterion cover command-driven working-tree mutations — so the research's near-exception roles (researchers running experiments, reviewers running guardrail/verification commands) are covered.
