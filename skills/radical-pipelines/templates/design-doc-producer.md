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
- Phase folder: <one line per existing file: path>
- Spec: <spec.md path>; <spec-research.md path>; <approving spec review paths>
- design-doc.md: <path>
- design-doc-research.md: <path>

<!-- Synthesize: additions -->
- Lane inputs: <one line per consumed lane: artifact path; record path; approving review paths>   <!-- production lanes with `after` -->
- Input changes: <package change>   <!-- re-synthesis only -->
- Correction: <challenge path>; <origin chain: review and record paths>   <!-- re-synthesis: one per pending challenge -->
- Task report: <challenge path>; <origin chain: review and record paths>   <!-- re-synthesis: one per pending failed report -->

<!-- Adjudicate: additions; one Correction or Task report line per pending challenge -->
- Review lanes: <one line per review: lane — path>
- Correction: <challenge path>; <origin chain: review and record paths>
- Task report: <challenge path>; <origin chain: review and record paths>
- Lane folders: <one line per lane: id — folder>   <!-- consolidations only -->

<!-- Consolidate: additions -->
- Lane candidates: <one line per lane: id — read-only folder; design-doc.md path, design-doc-research.md path, approving review paths>
