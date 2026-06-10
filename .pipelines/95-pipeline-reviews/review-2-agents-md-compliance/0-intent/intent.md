# Bring the reviews-feature prose into AGENTS.md compliance

## Goal

The skill and agent prose introduced by this pipeline (PR #106) complies with the rules in `AGENTS.md` — minimalist wording, no duplicated information within a reading path, no duplication across paths, and no unnecessary negative phrasing — without losing meaning.

## Origin

The owner asked the orchestrator to check whether the changes in PR #106 (https://github.com/Automattic/radical-pipelines/pull/106/) follow the rules in `AGENTS.md` (https://github.com/Automattic/radical-pipelines/blob/trunk/AGENTS.md), then requested a review covering all findings. The check found the structural rules (genericity, cross-path dedup via `intent-format.md` and the single **Reviewer base ref** definition) are followed, but the new and edited prose violates the minimalism and no-repeat rules in these spots:

1. `fork-pipeline.md` states that forks never inherit the parent's reviews three times: step 4 ("a fork starts a fresh `base/` and never inherits the parent's reviews"), step 5 ("the parent's `review-*` runs (if any) are never inherited"), and again in the copy bullet ("from the parent's `base/` run").
2. `review-pipeline.md` states that the advisories are non-gating three times: step 1 ("The fork-vs-review and split advisories (next step) never gate a review the owner chooses"), step 2's heading "(non-gating)", and step 2's body ("Both advisories are recommendations only — the owner decides, and the orchestrator never unilaterally redirects").
3. `review-pipeline.md` step 3 restates the content of the **Reviewer base ref** rule it cites ("capture the review's base ref = the prior-run tip… While HEAD is still the prior-run tip (before the review intent is committed)"), which `pipeline-versioning.md` already states. `autonomous-workflow.md`'s "and hold it constant for the whole run" duplicates the cited rule the same way.
4. `pipeline-versioning.md` states that reviews are not part of the cross-pipeline tree three times: the lineage section ("reviews are not part of the cross-pipeline tree…"), tree-building step 3 ("a pipeline's reviews are not nodes"), and the rendering bullet ("reviews never add or move nodes"). "A pipeline with no reviews shows no run chain" is a defensive negative whose content is already implied.
5. `work-on-an-issue.md`'s new decision guide ends with a bullet ("The sharpest discriminator is…") that only restates the three bullets directly above it.
6. Minor: `pipeline-versioning.md`'s "The rows are unchanged; only their root is the run folder" adds nothing after the preceding sentence; `review-pipeline.md`'s opener "it never creates a new pipeline" overlaps step 6's "Same branch, same pipeline, so the version is unchanged"; the README and the changeset carry the same run-model sentence nearly verbatim.

The owner confirmed a single review covering all findings, including the minor ones.
