## Seat

- Worktree: <absolute path>
- Branch: <branch>
- Commit format: <convention>
- Guardrails: <rules | none>
- Execution: inspection only

## Write to

<the phase folder where your artifact and record land>

## Mode

<Synthesize | Adjudicate>

## Materials

- Research: <researcher answer>   <!-- when a research request preceded this dispatch; any mode -->
- Spec: <spec.md path>; <its approving review paths>
- Design doc: <design-doc.md path>; <approving design-doc review paths>
- Task reports: <one line per report: path>   <!-- none when empty -->
- Phase folder: <one line per existing file: path>

<!-- Synthesize adds -->
- Input changes: <package change>   <!-- re-synthesis only -->
- Correction: <challenge path>; <origin chain paths>   <!-- re-synthesis: one per pending challenge -->
- Task report: <challenge path>; <origin chain paths>   <!-- re-synthesis: one per pending failed report -->

<!-- Adjudicate adds one Correction or Task report line per pending challenge, plus the current plan package -->
- build-plan.md: <path>
- Tasks: <one line per task file: path>
- build-plan-research.md: <path>
- Review lanes: <one line per review: lane — path>
- Correction: <challenge path>; <origin chain paths>
- Task report: <report path>; <its task file path>
