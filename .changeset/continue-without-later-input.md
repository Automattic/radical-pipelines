---
"@automattic/radical-pipelines": minor
---

Continue a pipeline without inventing a later input.

- A base branch that conflicts with the pipeline branch makes `notes.md` stale: `rp check` reports `respond implementation`, with `base-conflicts` naming the paths, and the implementer's assignment lists them under **Base conflicts**. The implementer merges the base and the reviewers review the resolution, with nothing written in phase 0.
- Commits the owner made on the pipeline branch are recorded as a proposal that names them. The implementer keeps or revises them and each reviewer reads the diff since the commit it approved.
- Triage continues a live pipeline whose frontier names the work, and fast-forwards each pipeline's base branch before reading its frontier.
- An owner's answer to an escalation that rules nothing, such as that the obstacle is gone, is written in the thread alone, which closes `answered` with no later input.
