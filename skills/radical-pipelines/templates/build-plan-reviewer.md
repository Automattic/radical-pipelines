## Seat

- Worktree: <absolute path>
- Branch: <branch>
- Commit format: <convention>
- Guardrails: <rules | none>
- Execution: inspection only

## Brief

<the lane's brief; omit the section for the implicit lane>

## Mode

<Fresh | Delta>

## Materials

<!-- Fresh: the package judged -->
- Spec: <spec.md path>
- Design doc: <design-doc.md path>
- build-plan.md: <path>
- Tasks: <one line per task file: path>
- build-plan-research.md: <path>
- Pinned inputs: <one line per file pinned by build-plan.md: path>   <!-- current approving input reviews, adjudicated triggers, production-lane inputs -->
- Amendment: <trigger path>; <origin chain paths>   <!-- when this wave judges one -->
- Task report: <report path>; <its task file path>   <!-- when this wave judges one -->
- Research: <researcher answer>   <!-- when a research request preceded this dispatch -->

<!-- Delta: the Fresh materials plus -->
- Your previous review: <path>
- Diff: git diff <its head> HEAD -- <every named material path>
- Adjudication: <record path — sections>

## Write your review to

<path>
