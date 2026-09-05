## Seat

- Worktree: <absolute path>
- Branch: <branch>
- Commit format: <convention>
- Guardrails: <rules | none>
- Execution: inspection only

## Brief

<the lane's brief; omit the section without one>

## Write to

<the phase folder — root, or `<lane>/` — where your artifact and record land>

## Mode

<Synthesize | Adjudicate | Consolidate>

## Materials

- Research: <researcher answer>   <!-- when the audit commissioned one; any mode -->

<!-- Synthesize -->
- Intent: <path>
- Spec: <spec.md path>; <spec-research.md path>; <approving spec review paths>
- Phase folder: <one line per existing file: path>
- Lane inputs: <one line per artifact of the lanes this one comes after: path>   <!-- production lanes with `after` -->
- Input changes: <changed input path — git diff <this artifact's head> HEAD -- <input>>   <!-- re-synthesis only -->

<!-- Adjudicate: the standing package plus exactly one correction -->
- Intent: <path>
- Spec: <spec.md path>; <spec-research.md path>; <approving spec review paths>
- design-doc.md: <path>
- design-doc-research.md: <path>
- Review lanes: <one line per review: lane — path>
- Amendment: <trigger path>; <origin chain: review and record paths>
- Lane folders: <one line per lane: id — folder>   <!-- consolidations only -->

<!-- Consolidate: the Synthesize materials plus -->
- Lane candidates: <one line per lane: id — design-doc.md path, design-doc-research.md path, approving review paths>
