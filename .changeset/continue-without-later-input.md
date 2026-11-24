---
"@automattic/radical-pipelines": minor
---

Continue a pipeline without inventing a later input.

- A base branch that conflicts with the pipeline branch makes `notes.md` stale: `rp check` reports `respond implementation`, with `base-conflicts` naming the paths, and the implementer's assignment lists them under **Base conflicts**. A conflict that leaves no file unmerged, such as a directory rename split, now counts as a conflict, for the base branch and for an approval's code alike. The implementer merges the base and the reviewers review the resolution, with nothing written in phase 0.
- Commits the owner made on the pipeline branch are recorded as a proposal that names them. The implementer keeps or revises them and each reviewer reads the diff since the commit it approved.
- Triage continues a live pipeline whose frontier names the work. It fast-forwards the artifact base branch before discovering pipelines, and each pipeline's base branch before reading its frontier.
- The upstream pull request's retry merges the updated base branch into the pipeline branch and runs the loop, instead of waking the implementer by hand, and stops when the same net change fails again.
- An owner's answer to an escalation that states a fact and decides nothing about the intent, such as that the obstacle is gone, is written in the thread alone, which closes `answered` with no later input. An `answered` thread is now a required input of its opener's artifact, so the opener is woken once to read the answer, with the thread among its changed inputs. A producer's and the implementer's assignments list those threads under **Owner's answers**. While such a thread is malformed, `rp land` leaves the artifact's certification as it is.

In a live pipeline that already holds answered threads, each opener's artifact is stale on them until its owner's next turn lands.
