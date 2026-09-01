# Load conventions

Project conventions live in `.rp.md` at the project's main root. When you are inside a worktree, resolve the main root with `dirname(git rev-parse --git-common-dir)` and read it from there.

## Version check

The skill's conventions schema version is **1** (see `changelog.md`).

`.rp.md` declares its schema in frontmatter: `conventions: <N>`.

- **Match** — continue to the completeness check.
- **Older, or no stamp** — run the delta migration: walk `changelog.md` from the file's version (no stamp = pre-versioned), propose each rename mechanically, interview any new-required row, offer new-optional rows, and — with the owner's approval — apply the edits and write the stamp. Then continue.
- **Newer than 1** — stop: this skill is older than the project's conventions; the skill must be updated first.

The stamp is an index, not authority: the completeness check below is the safety net either way.

## Conventions

| Convention           | What it covers                                                                                      | Required? |
| -------------------- | ---------------------------------------------------------------------------------------------------- | --------- |
| Branch naming        | How branch names are built from the issue; the pipeline's folder label derives from the branch base | Yes       |
| Pipelines folder root| Where pipeline folders live; default `.pipelines/`                                                   | No        |
| Issues               | Where the project tracks issues; how to read, comment, update; the canonical issue-reference format written into origins | Yes |
| Worktree folder root | Where worktrees live                                                                                 | Yes       |
| Commit format        | How to write commits                                                                                 | No        |
| PR format            | How to write PR titles and descriptions                                                              | No        |
| Agent spawning       | How to spawn, address, seat, and terminate agents. The skill ships per-tool mechanics in `../../tools/<tool>.md`; a per-tool section here overrides or extends them. Required only while no tool file covers the active tool | Yes\* |
| Health monitoring    | How to launch and cancel the recurring run-health loop                                               | Yes       |
| Policy defaults      | Models per profile, review lanes and charters per artifact, escalation gate mode, non-convergence thresholds | No |
| Guardrails           | Project rules agents must satisfy, per agent family                                                  | No        |
| Lifecycle hooks      | Prose instructions run at defined moments (see `lifecycle-hooks.md`)                                 | No        |
| Artifact storage     | Whether `.rp.md` and pipeline folders live in the project's repository or a fork                     | Yes       |

A convention in a per-tool section counts as present only when that section's tool matches the active tool.

If a required convention is missing, do not proceed: read `setup.md`, explain what is missing, and offer the setup flow. If the owner declines, stop and state what is still missing.

## Local overrides

A developer may place a git-ignored `.rp.local.md` beside `.rp.md` to override conventions for their working copy. After the completeness check, merge it over the committed values in memory: where it names a convention its value wins; where it is silent the committed value is inherited.

## Lifecycle hooks

Read `lifecycle-hooks.md` — the workflows fire its hooks at defined moments.
