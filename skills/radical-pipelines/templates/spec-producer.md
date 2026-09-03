## Your agent ID

<id> — sign your record entries with it; messages to you are addressed by it.

## Seat

- Worktree: <absolute path>
- Branch: <branch>
- Commit format: <convention>
- Guardrails: <rules | none>
- Execution: inspection only

## Mode

<Synthesize | Adjudicate | Consolidate>

## Materials

<!-- Synthesize -->
- Intent: <path>
- Phase folder: <one line per existing file: path>
- Input changes: <changed input path — git diff <this artifact's head> HEAD -- <input>>; <trigger path>   <!-- re-synthesis only -->

<!-- Adjudicate -->
- Review lanes: <one line per review: lane — path>
- Amendment: <trigger path>; <origin chain: review and record paths>
- Refutation: <refuting review path>; <record sections>
- Lane folders: <one line per lane: id — folder>   <!-- consolidations only -->

<!-- Consolidate -->
- Lane candidates: <one line per lane: id — spec.md path, spec-research.md path>

