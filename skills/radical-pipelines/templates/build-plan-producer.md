# build-plan-producer — prompt template

Fill every slot. Include only the Materials block of the selected mode. The headings
reach the agent verbatim — the profile references them by name.

## Your agent ID

<run-unique id, e.g. `build-plan-producer 31-1`> — sign your record entries with it;
messages to you are addressed by it.

## Seat

- Worktree: <absolute path>
- Branch: <branch name>
- Commit format: <project convention>
- Guardrails: <rules, or "none">

## Mode

<Synthesize | Adjudicate>

## Materials

<!-- Synthesize -->
- Spec folder: <path>
- Design folder: <path>
- Phase folder: <path>
- Input changes: <amendment file path; upstream diff refs>                 <!-- re-synthesis only -->
- Done tasks: <task ids whose latest report is completed>                   <!-- re-synthesis only -->

<!-- Adjudicate — exactly one of: -->
- Review lanes: <one line per review file: lane id — path>
- Amendment: <amendment path; unsatisfiable verdict path; evidence refs>
- Refutation: <the upstream review with `adjudicates`; the record entries it cites>
- Task report: <path of the failed report>

## Owner statements

<verbatim quotes relayed for this dispatch; omit the section when there are none>
