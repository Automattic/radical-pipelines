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

- Research: <researcher answer>   <!-- when a research request preceded this dispatch; any mode -->

<!-- Standing: every mode -->
- Intent: <path>
- Spec: <spec.md path>; <spec-research.md path>; <approving spec review paths>
- design-doc.md: <path>
- design-doc-research.md: <path>

<!-- Synthesize: additions -->
- Phase folder: <one line per existing file: path>
- Lane inputs: <one line per consumed lane: artifact path; record path; approving review paths>   <!-- production lanes with `after` -->
- Input changes: <one line per changed input: path — git diff <this artifact's head> HEAD -- <input>; one line per unresolved trigger targeting design-doc.md: path>   <!-- re-synthesis only -->

<!-- Adjudicate: additions; exactly one correction -->
- Phase folder: <one line per existing file: path>
- Review lanes: <one line per review: lane — path>
- Amendment: <trigger path>; <origin chain: review and record paths>
- Task report: <trigger path>; <origin chain: review and record paths>
- Lane folders: <one line per lane: id — folder>   <!-- consolidations only -->

<!-- Consolidate: additions -->
- Phase folder: <one line per existing file: path>
- Lane candidates: <one line per lane: id — design-doc.md path, design-doc-research.md path, approving review paths>
