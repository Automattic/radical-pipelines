# Prompt: Generate a PR description artifact

Source issue: Automattic/radical-pipelines#66

## Goal

The pipeline generates a PR description as an inspectable artifact (for example `pr-description.md`), so that opening a pull request draws from that artifact rather than re-deriving the description from scratch.

## Assumptions / directions to explore

These are the owner's current hunches, recorded as open directions, not requirements. Later phases should confirm or revise them based on their own research.

- Produce the PR description as a **second artifact in the Docs phase**, since that phase already reviews everything that shipped. Leaving it to the orchestrator instead would force the orchestrator to examine all the changes, increasing its context burden. This is a gut feel only, with no strong opinion attached.
- If the PR description becomes a Docs-phase artifact, the merge-pipeline guide (issue #57, `merge-pipeline.md`) will need to explain that this artifact is the source used to open the PR, whether the artifacts live in the repository itself (artifacts-in-repo) or upstream (artifacts-in-fork).

## Related

- Issue #57 introduces `merge-pipeline.md`, the reference for merging a finished pipeline. Whatever shape this PR-description artifact takes, the merge guide is expected to reference it when opening the PR.
