# Docs Plan Review

## Verdict: rejected

## Summary

The plan is substantively sound: its repository-wide sweep is accurate, its task set is complete, and both tasks are correctly scoped, traceable, and drift-resistant. I independently re-swept the repo (README, CONTRIBUTING, AGENTS, CHANGELOG, `.changeset/`, all of `skills/`, all ~18 agent profiles, and `website/`) and confirmed that `README.md:155` is the only prose surface outside the three canonical code-phase files that enumerates the spawn payload, that no agent profile or other reference file restates the `## Conventions` fields or the worktree/branch model in a way that would drift, and that the "Surfaces deliberately not given a task" list is correct and auditable. The changeset task correctly identifies that a `skills/**` change makes a changeset mandatory and correctly defers the bump type to `CONTRIBUTING.md`'s authoritative table. Guardrail scopes = None is correct. No code tasks leaked in. I am rejecting only for two concrete factual inaccuracies in the plan's prose — one in each task — that contradict the actual repository and should be corrected before the plan is executed, because a positional cue and a traceability claim that disagree with reality can mislead the docs-writer and undermine the plan's auditability. Neither is structural; the fixes are small and localized.

## Issues

### Issue 1: Task 1 mislocates the target README sentence as the "second-to-last paragraph"

**What's wrong:** Task 1's "Files to change" describes the target sentence as "currently the second-to-last paragraph of that section." That is factually wrong. The target sentence ("The orchestrator loads and verifies conventions before launching phase agents. When it spawns a phase agent or team, it passes …") is at `README.md:155`, and the Configuration section continues past it with at least three more paragraphs (`:157` run-folder/summary prose, `:159` `.rp.md` shared/per-tool structure, and the section runs on toward the Changelog heading at `:161`). The target sentence is the **fourth-to-last** paragraph of the Configuration section, not the second-to-last.

**Where in plan:** Task 1 → "Files to change."

**Suggestion:** Drop the inaccurate positional descriptor, or correct it. The plan already gives a robust, unique anchor — the verbatim opening of the sentence — which is sufficient on its own to locate the target; the positional cue adds nothing and, being wrong, can only mislead.

**Why it matters:** A positional cue that contradicts the file invites the docs-writer to edit the wrong paragraph or to distrust the otherwise-correct quoted anchor. The plan is meant to point the writer precisely at one sentence; a false "second-to-last" claim works against that precision.

### Issue 2: Task 2 traces the changeset rule to `AGENTS.md`, which does not contain it

**What's wrong:** Task 2's "Traces to" cites "the repository's standing changeset rule recorded in `AGENTS.md` and detailed in `CONTRIBUTING.md`." `AGENTS.md` in this repository contains only the skill-authoring rules ("Rules when modifying the skill"); it has no changeset rule and no mention of changesets at all (`grep -ni changeset AGENTS.md` returns nothing). The authoritative changeset rule and the when-required path list live in `CONTRIBUTING.md` (`## Adding a changeset`, `### When a changeset is required`, with `skills/**` listed), mirrored by `.changeset/config.json`'s `changedFilePatterns`. The "recorded in `AGENTS.md`" claim appears to be inherited from `README.md:167` ("The matching rule lives in `AGENTS.md`"), but that README pointer does not match the actual `AGENTS.md` file content.

**Where in plan:** Task 2 → "Traces to" (and, by reference, the changeset-rule provenance the task relies on).

**Suggestion:** Remove the `AGENTS.md` citation from Task 2's traceability and trace the changeset requirement to `CONTRIBUTING.md` (`### When a changeset is required`) and `.changeset/config.json` (`changedFilePatterns`), which are where the rule actually lives. The rest of Task 2 already points the writer to `CONTRIBUTING.md` correctly, so this is a traceability-accuracy fix, not a redesign.

**Why it matters:** Traceability pointers must resolve to real content, or the auditable chain the plan promises breaks. A docs-writer who follows the `AGENTS.md` pointer to confirm the rule will find nothing there and lose confidence in the task's grounding; the inaccuracy also propagates a pre-existing README discrepancy rather than steering clear of it.

## Notes (not blocking)

- Bump type: the plan's deferral to `CONTRIBUTING.md`'s bump table and pre-1.0 policy is correct. For the reviewer's record, this change is a backwards-compatible behavioral addition to skill prose, which the table maps to `minor` (pre-1.0: features → `minor`); it is neither a fix (`patch`) nor breaking. The plan rightly leaves the final determination to the writer reading the table against what landed, with a `BREAKING:` prefix only if the landed change is actually breaking (it is not expected to be).
- Task 1's acceptance criterion allowing the writer to confirm the existing "role-specific host-project conventions" wording already conveys the new items and leave it unchanged is well-judged and drift-resistant; keep it.
- The phase-reference prose ("Code-writers / Docs-writers share the pipeline branch's single working tree") and the agent-profile spawn-prompt mentions (artifact folder / commit format only) were independently checked and confirmed NOT to be drift surfaces; the plan's exclusion of them is correct.
