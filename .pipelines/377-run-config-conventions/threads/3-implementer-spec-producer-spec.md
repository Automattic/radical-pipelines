---
status: open
opener: implementer
owner: spec-producer
artifact: spec
---

## implementer — cfa4cb4bb147ecb958cff62f01e7d6ae185e1974

The review lanes raised one finding that questions the spec. Evidence paths are relative to the pipeline folder.

### Finding 1: A new pipeline's slug can name the branch of an unmerged pipeline that discovery does not list

spec-requirement-20 requires a new pipeline's folder not to exist in the tree of the commit its branch starts from. Considered and not required leaves out checking the slug against every branch tip, because "a branch whose name is taken cannot be created". reviewer-default's finding 1 questions this.

Observed (`3-implementation/notes/owner-findings.txt`, first section):
- This pipeline is unmerged, and its folder holds `run-config.md` and no `run-config.json`.
- `v4`'s tree has no `.pipelines/377-run-config-conventions`.
- `rp pipelines <pipelines folder root> --base v4 --issue 377 --json`, run with the changed `rp`, prints `[]`.
- Its branch `377-run-config-conventions` exists.

Under the changed skill, new work on issue 377 routes as new intent from `v4`. The Pipeline slug convention, `<issue-number>-<short-description>`, can give `377-run-config-conventions`, which names no folder of `v4`'s tree, so spec-requirement-20 adds no suffix, yet its branch exists. Triage step 5 then cannot create the branch, and no rule gives the pipeline another slug. Alternatively, triage checks that branch out and writes the new intent into a folder holding another pipeline's files, which is what spec-requirement-20 guards against.

The design doc's Risks say further work on the issues of such pipelines starts new pipelines, so this input arises in intended use for as long as pipelines holding `run-config.md` stay unmerged. The reviewer also notes that a pipeline triage has prepared is unlisted from step 5, which commits its intent, until step 6 commits its `run-config.json`.

Question: does a new pipeline's slug also name no existing branch, local or remote-tracking, taking the next suffix while it does?

## spec-producer — 0d022d46276eb6c0aad7306217b1d989a6ae3c4b

### Finding 1: stands

spec-requirement-20 is the owner's clause. Commit a5c6c02a narrowed it from "no folder at any branch tip" to the tree the new pipeline starts from. The same commit recorded the taken-branch case under Considered and not required. The finding's input is observed. Its outcome is not the one the clause guards against:

- Triage step 5 creates a new pipeline's branch at the start ref ("Branch at the chosen start ref"). No step for a new pipeline checks out an existing branch (read `reference/entries/triage.md` step 5).
- When a local branch already holds the name, `git worktree add -b <name> <path> <start ref>` stops with `fatal: a branch named '<name>' already exists` and creates nothing (`1-spec/spec/taken-branch-probe.txt`).
- When only a remote-tracking branch holds the name, the branch is created at the start ref and holds only the new pipeline's files. Pushing it is then rejected as non-fast-forward (same file).

So the new pipeline's folder never receives another pipeline's files, which is what spec-requirement-20 requires. What remains is a visible stop: triage cannot create the branch, or the push is rejected, and no rule gives another slug. The owner chose that outcome over checking branches. Commit 0d022d46 restates the reason in the Considered line with both observed outcomes, and leaves the requirement unchanged. Taking the next suffix for a taken branch name would reverse the owner's choice, so that decision is the owner's. Escalate it if you hold that it should change.

### A prepared pipeline is unlisted from step 5 to step 6: stands

The same evidence holds. Until step 6 commits its `run-config.json`, a prepared pipeline's folder exists only at its branch tip, outside the base branch's tree, and its branch name is taken as above. The spec leaves out listing such a pipeline under Considered and not required, because no source shows a consumer continuing a pipeline whose run never started. Committing `run-config.json` together with the intent is a question of how triage is built, so the design doc decides it.
