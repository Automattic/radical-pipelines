---
{
  "inputs": [
    "1-spec/spec.md@2b8cf4596df3",
    "2-design-doc/design-doc.md@d96d81265b53"
  ]
}
---
status: done

# Implementation notes

## Done

- `rp check --json` reports `complete`, one definition (`completePhases`) shared with `rp land` (a4d35e0f).
- Conventions version 9: `worktree-folder-root` (required) and `landing-commit` in `.rp.md`'s data, `.rp.local.md` overriding either; this repository's `.rp.md` migrated, its hook blocks unchanged; changelog § 9, `load.md`, `setup.md` (a3b51450).
- `rp next` (plan, `--apply`) and `rp land`; `assign`, `review`, and `stamp` removed, their computations kept as `certificationOf`, `reviewBuildOf`/`commitBuild`, and `assignmentOf`; the step record; a lane holding unlanded commits landed first, or repaired in place; `scripts/README.md` (40ebe1fe).
- Each changed input names the commit at which its artifact's certification pins it (7e134642).
- Skill prose: `loop.md`, `state.md`, `SKILL.md`, `lifecycle-hooks.md`, `triage.md` § 5, `health-monitoring.md`, `load.md`, `close-out.md`, `report.md`, `templates/README.md`, `tools/*.md` § Models (9c00e7a9, 311df1e5, 36498bad).
- README, `docs/glossary.md`, `docs/model.md`, `docs/flowcharts/loop.md`, changeset `rp-next-and-land` (1a147e8c).
- `rp land` reads the pipeline after the landing before the pipeline branch moves (7d936ff2); an approval that lands uncertified has any certification its path held removed (9b66f80f); the step record's turn fields are validated, a reviewer's `change` required (caaffe51); the step record is placed by its location, not among Prepared files (d632eda2).
- A recorded turn drops its phase (5c324e06). A failed `--apply` is reported to the owner, who repairs it, and `state.md` states where the step record sits (a23e9507).
- Evidence: a whole run driven by `rp next`, `--apply`, and `rp land`, each turn simulated by a commit (`notes/loop-run.sh`, `notes/loop-run.txt`); one lane step run live on opencode from the plan alone and landed (`notes/e2e-opencode.md`); a cold read of the changed loop against those plans on both tools (`notes/cold-read.md`), whose findings this change owned are fixed in 36498bad and 037d1b17.

## Remaining

## Decisions

- Plan grammar: one line per fact, `<entry> <role> <field> <value>` with any free value last; hooks are `hook <hook> <role>[ <path>]` or `hook phase-started <n>`, in the order the orchestrator acts, a woken role's merging hooks after its wake lines. `rp land` prints `hook phase-completed <n>`. The assignment path is a `wake` line, not a separate entry.
- `rp land` builds every commit from plumbing (merge through `git merge-tree`; a pick merges the picked commit into a commit of the tip's tree on the picked commit's parent, so Git 2.38 suffices), validates the result, then moves the pipeline worktree once with `git merge --ff-only`: a stop before that changes nothing.
- A production lane is always merged with a merge commit, `Merge <artifact> lane <id>`; the certifications are one commit, `Certify <what>`; picked review commits keep their messages and authors.
- Lane branch moves use `git reset --keep` in the worktree that has the branch, `git update-ref` otherwise; both stop rather than discard.
- A new worktree's private git directory is predicted as Git names it (`worktrees/<folder name>`, numbered from 1 while taken), so the plan names the assignment path before the worktree exists; applying checks the prediction.
- The step record is `rp/step.json` in the pipeline worktree's git directory; a turn holds its worktree, branch, turn commit, and a review lane's change. `rp land` uses the recorded change; planning and applying find a lane's change on its branch (`changeOf`).
- spec-requirement-9 and -13 (unlanded lanes) went into the core commit with `next` and `land`: a lane's branch move depends on them.
- Tests: the `assign`, `review`, and `stamp` tests are ported to `assignments`, `review-lanes`, and `land` tests driving `next --apply` and `land`; the fixture builds certifications directly (`certifyAt`) and keeps `.rp.md` out of commits.

## Failed approaches

## Assumptions

- spec-assumption-1: observed: one lane step run live on opencode, the role created, seated, and started with the plan's worktree, profile, lane, model name, and assignment path, then landed (`notes/e2e-opencode.md`); every kind of step's tool calls on opencode and Claude Code written from the plans alone in the cold read (`notes/cold-read.md`). Claude Code was not run.
- spec-assumption-2: observed: the cold read fired each hook intent-context-2 describes from the plan's entries (`notes/cold-read.md`), and the live run fired `after-creating-worktree` from the plan's role and path (`notes/e2e-opencode.md`).

Seen while running, outside this change: the live `spec-producer` reported that it could not run `rp check`, since its profile names no path to `rp`.
