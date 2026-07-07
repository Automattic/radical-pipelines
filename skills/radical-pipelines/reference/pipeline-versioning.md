# Pipeline Versioning

An issue's pipelines form a **family**: the first pipeline is `v1`; each fork — a new approach tried from a previous pipeline — adds `v2`, `v3`, … Within a pipeline, work happens in **runs**: one pass of the full phase flow. The **base** run comes first; revision runs are layered one at a time on top of a complete run.

## Branch grammar

The **Branch names** convention produces the `<branch-base>` — it may contain slashes for namespacing and must not contain `_`. Everything after it is fixed skill grammar with `_` as the structural separator; every other segment is kebab-case:

```
<branch-base>[_v<N>][_rev-<N>-<desc>][_<phase>-lane-<K>]
```

Omitted segments are defaults: no version segment means `v1`, no run segment means the base run.

```
123-fix-checkout                                    v1 base
123-fix-checkout_rev-1-fix-something                v1 rev-1
123-fix-checkout_1-spec-lane-2                      v1 base, spec lane 2
123-fix-checkout_v2                                 v2 base
123-fix-checkout_v2_rev-1-fix-copy                  v2 rev-1
123-fix-checkout_v2_rev-1-fix-copy_1-spec-lane-2    v2 rev-1, spec lane 2
```

Parsing is deterministic because the segment shapes are reserved: `v<digits>` is a version, `rev-<N>-<desc>` a run, `<phase>-lane-<K>` a lane. In `rev-<N>-<desc>`, `<desc>` is a kebab-case summary of the revision's goal and `N` is the next integer after the pipeline's existing revisions.

## Branches

Branches exist at exactly two levels; there is no pipeline-level branch.

**Run branches** are chained: the base run's branch starts at the pipeline's start ref, and every later run's branch starts at the tip of the previous run's branch. The pipeline's tip is its latest run branch — that is what merges into the project's main branch.

**Lane branches** carry the parallel work of the spec and design-doc phases: one branch per lane, forked from the run branch at phase start. Every lane writes the same canonical artifact paths as the run branch — lane identity lives only in the ref. The phase's consolidator reads the lane artifacts off their branches (`git show <lane-ref>:<path>`) and commits the consolidated artifact on the run branch. Lane worktrees are removed after consolidation; lane branches are never merged — they are pushed and kept permanently as the record of the parallel work.

## Artifacts

Artifacts live at `<artifact-folder>/<run>/<phase>`, where `<run>` is `base` or `rev-<N>-<desc>` (matching the run's branch segment) and `<phase>` is the phase folder. The **Artifact folder** convention produces one artifact folder per family, identical across all forks, so cross-fork comparison is a constant path under a varying ref:

```
git show <ref>:<artifact-folder>/base/1-spec/spec.md
```

A one-line `pipeline.md` identity file at the artifact-folder root records the pipeline version. A fork's first commit updates it: the legible fork marker in history, and how a merged, branch-deleted pipeline's version is recovered from the main branch.

## Start refs

The owner names the base run's start ref. The default is the project's main branch; two alternatives are first-class:

- **Stacking** — another pipeline's run-branch tip, to build on unmerged work.
- **Forking** — the **cut commit** in the parent pipeline's history: the commit that completed the last inherited phase's completion predicate. A fork is a branch at the cut commit; the inherited history carries the inherited work itself — artifacts, code, and commits.

## Per-phase completion

A phase's predicate is evaluated at `<artifact-folder>/<run>/<phase>` on the run branch. A phase is **complete** when all of its required artifacts are committed there — the same predicate in both workflow modes:

| Phase          | Required artifacts                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------- |
| 0 – Intent     | `intent.md`                                                                                      |
| 1 – Spec       | `spec.md`, `spec-review-approved.md`                                                             |
| 2 – Design doc | `design-doc.md`, `design-doc-review-approved.md`                                                 |
| 3 – Build      | `build-plan.md`, `build-plan-review-approved.md`, `build-review-approved.md`, `build-summary.md` |
| 4 – Document   | `document-plan.md`, `document-plan-review-approved.md`, `document-review-approved.md`, `document-summary.md` |

Phase folders are created at phase start, so a phase whose folder or some artifacts exist with the predicate unsatisfied is **in progress**.

A pipeline's **completed phase** and **active phase** are those of its latest run — the highest-`N` revision, or `base`. The completed phase is the highest phase whose predicate is satisfied; the active phase is the phase after it when that phase is in progress, otherwise none. A revision run with only its `0-intent/intent.md` committed has `1-spec` as the pipeline's next phase — the revision intent is its input.

Plan approval is the build and document phases' inner gate: a phase with its plan approved and tasks pending is in progress. Resuming it is investigative: inspect the plan, the commits, and the diff to judge how far the tasks got, revert partial-task work, and re-dispatch from the last complete task — the commits and the diff are the only record of task progress.

## Diff bases

A run's diff base is derived on demand: `git merge-base <run-branch> <previous-run-branch>` — for the base run, with the start ref. Any reviewer recomputes the same answer at any time; a run's commits are `git log <run-branch> ^<previous-run-branch>`.

## Lineage

Two layers answer two different questions:

- **Ancestry** (primary) answers what a pipeline started from. Fork points — `git merge-base` between family branches — define the tree, permanently and exactly, even after either side rewrites an inherited artifact.
- **Content** (annotation) answers what is identical right now. Tree SHAs over the canonical artifact paths (`git rev-parse <ref>:<artifact-folder>/base/<phase>`) compare a fork's phase against the cut commit and the parent's tip, yielding per-phase labels:
  - `inherited-identical` — fork and parent both still match the cut commit.
  - `inherited-modified` — the fork changed the inherited artifact.
  - `parent-diverged` — the fork matches the cut commit but the parent has since changed it.

**Merged detection:** a pipeline is merged when `git merge-base --is-ancestor <latest-run-tip> <main>` succeeds.

## Listing pipelines for an issue

1. **Branches** — enumerate the family's branch namespace, local and remote (`git branch --list '<branch-base>*'`, `git branch -r --list '*<branch-base>*'`), and parse each name with the branch grammar.
2. **Artifact folder** — read the family's artifact folder on the main branch of the artifact-bearing repository (per the **Artifact storage** convention). A merged, branch-deleted pipeline is visible only here; its `pipeline.md` recovers that pipeline's version.

## Rendering the pipeline tree

Render the tree from ancestry, as plain ASCII with box-drawing characters (`├`, `└`, `│`, `─`) so it displays correctly in any surface. The root is the issue; pipelines started from the main branch hang under the root, and each fork hangs under its parent, labeled with the phase of its cut commit. Annotate each pipeline with:

- Its state: completed phase or `complete`, active phase with `(in progress)`, `[merged]`.
- Its run chain: `base → rev-1-<desc> → …`, when it has revisions.
- On forks, the content labels of the inherited phases.

Example:

```
#123-fix-checkout
├── v1 — complete [merged] · base → rev-1-fix-copy
│   ├── v2 — cut at 1-spec · 1-spec inherited-modified · 2-design-doc (in progress)
│   └── v3 — cut at 2-design-doc · 2-design-doc parent-diverged · complete
└── v4 — 1-spec (in progress)
```
