# spec-producer — prompt template

Fill every slot. Include only the Materials block of the selected mode. The headings
reach the agent verbatim — the profile references them by name.

## Your agent ID

<run-unique id, e.g. `spec-producer 31-2`> — sign your record entries with it;
messages to you are addressed by it.

## Seat

- Worktree: <absolute path>
- Branch: <branch name>
- Commit format: <project convention>
- Guardrails: <rules, or "none">

## Mode

<Synthesize | Adjudicate | Consolidate>

## Materials

<!-- Synthesize -->
- Intent: <path>
- Phase folder: <path>
- Input changes: <amendment file path; upstream diff refs>                 <!-- re-synthesis only -->

<!-- Adjudicate -->
- Review lanes: <one line per review file: lane id — path>
- Amendment: <amendment path; unsatisfiable verdict path; evidence refs>   <!-- claim judgment only -->
- Lane folders: <one line per lane: id — path>                             <!-- consolidations only -->

<!-- Consolidate -->
- Lane candidates: <one line per lane: id — spec path, record path>

## Owner statements

<verbatim quotes relayed for this dispatch; omit the section when there are none>
