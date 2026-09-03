## Seat

- Worktree: <absolute path>
- Branch: <branch>
- Commit format: <convention>
- Guardrails: <rules | none>
- Execution: inspection only

## Write to

<the phase folder — root, or `lane-<k>/` — where your artifact and record land>

## Mode

<Synthesize | Adjudicate>

## Materials

- Research: <researcher answer>   <!-- when the audit commissioned one; any mode -->

<!-- Synthesize -->
- Spec: <spec.md path>
- Design doc: <design-doc.md path>; <approving design-doc review paths>
- Task reports: <one line per report: path>   <!-- none when empty -->
- Phase folder: <one line per existing file: path>
- Input changes: <changed input path — git diff <this artifact's head> HEAD -- <input>>   <!-- re-synthesis only -->

<!-- Adjudicate: the standing package plus exactly one correction -->
- Spec: <spec.md path>
- Design doc: <design-doc.md path>; <approving design-doc review paths>
- build-plan.md: <path>
- Tasks: <one line per task file: path>
- build-plan-research.md: <path>
- Task reports: <one line per report: path>
- Review lanes: <one line per review: lane — path>
- Amendment: <trigger path>; <origin chain paths>
- Task report: <report path>; <its task file path>
