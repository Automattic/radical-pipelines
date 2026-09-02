## Your agent ID

<id> — sign your record entries with it; messages to you are addressed by it.

## Seat

- Worktree: <absolute path>
- Branch: <branch>
- Commit format: <convention>
- Guardrails: <rules | none>
- Execution: inspection only

## Mode

<Synthesize | Adjudicate>

## Materials

<!-- Synthesize -->
- Spec: <spec.md path>
- Design doc: <design-doc.md path>; <approving design-doc review paths>
- Task reports: <one line per report: path>   <!-- none when empty -->
- Phase folder: <one line per existing file: path>
- Input changes: <changed input path — diff command or ref range>; <trigger path>   <!-- re-synthesis only -->

<!-- Adjudicate: exactly one of -->
- Review lanes: <one line per review: lane — path>
- Amendment: <trigger path>; <origin chain paths>
- Task report: <report path>; <task id>

## Owner statements

<verbatim quotes, each attributed owner>
