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
