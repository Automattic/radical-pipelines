# Reconcile docs-naming with the merged trunk

## Origin

After this pipeline reached a complete, unmerged state (PR open), the owner merged the
current trunk into its branch and asked for a review run. In the owner's words:

> merge trunk and launch a new run of BILLOW-76 (which I haven't manually reviewed yet),
> because trunk contains many changes, to see if any further modifications to any
> new/modified file are needed for the initial intent.

The "initial intent" is this pipeline's original goal: unify the documentation-phase
concept on the plural form `docs` across the skill and agent definitions.

Trunk had advanced 104 commits since this pipeline branched. The merge (commit
`Merge trunk into unify-docs-naming` on this branch) brought in substantial structural
change the original run never saw — notably the single `code-writer` agent split into
`code-writer-tdd` and `code-writer-e2e`, a reworked guardrails model (fixed vs scoped
gates) with new reference files (`reference/guardrails.md`,
`reference/conventions/passing.md`), and a new `pr-description.md`. Some of these added
or changed surfaces still spell the documentation concept in the singular
(`doc-writer`, `doc-reviewer`, `doc-plan`, "Doc Plan").

Convenience link: PR https://github.com/Automattic/radical-pipelines/pull/135
(issue https://github.com/Automattic/radical-pipelines/issues/134).

## Goal

Across the post-merge codebase, the documentation-phase concept is spelled consistently
in the plural (`docs`) everywhere the skill and agent definitions name it — including
every surface trunk added or changed — and this pipeline's original rename integrates
cleanly with trunk's new structure, leaving no singular stragglers and no broken
cross-references.

## Constraints

- Standardize on the plural `docs` for the documentation concept; leave the phase-2
  `design-doc` concept singular — there "doc" means a single design *document*, a
  distinct concept worth preserving.
- Leave historical records untouched: the published `CHANGELOG.md` and the `.pipelines/**`
  run artifacts retain whatever names they shipped with.

## Context

- This pipeline's original intent and its prior run live in the sibling `base/` run.
- The merge already resolved the conflicting files by taking trunk's content and
  re-applying the plural rename within those hunks; trunk's newly added files were
  merged as-is and may still carry singular names — the spec phase should sweep the
  whole post-merge tree rather than assume any list is complete.
