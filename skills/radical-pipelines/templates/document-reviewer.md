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
- Plan: <document-plan.md path>
- Record: <document-plan-research.md path>
- Tasks: <one line per task file: path>
- Design doc: <path>
- Build plan: <build-plan.md path>; <its tasks and reports>; <approving build review path>
- Spec: <path>
- Task reports: <one line per report: path>
- Documentation conventions: <convention | none>
- Pinned inputs: <one line per file pinned by document-plan.md: path>   <!-- current approving input reviews, adjudicated challenges, production-lane inputs -->
- Correction: <challenge path>; <origin chain paths>   <!-- when this wave judges one -->
- Task report: <report path>; <its task file path>   <!-- when this wave judges one -->
- Diff: git diff <the branch's start ref> HEAD -- . ':(exclude)<pipelines folder root>'   <!-- Fresh -->

<!-- Delta: the Fresh materials, Diff from the previous review's head, plus -->
- Your previous review: <path>
- Diff: git diff <its head> HEAD -- <every named material and branch-artifact path>
- Adjudication: <record path — the entries written since your previous review>

## Write your review to

<path>
