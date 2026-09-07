## Seat

- Worktree: <absolute path>
- Branch: <branch>
- Commit format: <convention>
- Guardrails: <rules | none>
- Execution: full

## Brief

<the lane's brief; omit the section for the implicit lane>

## Mode

<Fresh | Delta>

## Materials

<!-- Fresh -->
- Plan: <build-plan.md path>
- Record: <build-plan-research.md path>
- Tasks: <one line per task file: path>
- Design doc: <path>
- Spec: <path>
- Task reports: <one line per report: path>
- Pinned inputs: <one line per file pinned by build-plan.md: path>   <!-- current approving input reviews, adjudicated triggers, production-lane inputs -->
- Amendment: <trigger path>; <origin chain paths>   <!-- when this wave judges one -->
- Task report: <report path>; <its task file path>   <!-- when this wave judges one -->
- Diff: git diff <the branch's start ref> HEAD -- . ':(exclude)<pipelines folder root>'

<!-- Delta: the Fresh materials, Diff from the previous review's head, plus -->
- Your previous review: <path>
- Adjudication: <record path — the entries written since your previous review>

## Write your review to

<path>
