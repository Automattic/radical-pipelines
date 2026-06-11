# Pipeline Versioning

When the owner discards a pipeline or wants to try a different approach, the orchestrator forks a new pipeline from a previous one. Each pipeline is an independent branch and worktree branched from the project's main branch.

## Model

- **Pipeline version** — `v1` is implicit for the first pipeline. Subsequent pipelines are `v2`, `v3`, …
- **Pipeline base slug** — the version-less slug the **Pipeline base slug** convention produces; the shared stem of all of an issue's pipelines.
- **Pipeline versioned slug** — one specific pipeline's identifier:
  - First pipeline (`v1`): the pipeline base slug, unchanged — `v1` carries no suffix, because it is implicit.
  - Subsequent pipelines (`v<N>`, N ≥ 2): the pipeline base slug with `-v<N>` appended.

### Runs within a pipeline

A **run** is one pass of the full phase flow recorded under a pipeline. Most artifacts live at `<artifacts-folder>/<run>/<phase>`; a run-level artifact lives directly under `<artifacts-folder>/<run>/`. `<artifacts-folder>` is the pipeline's own artifact folder and `<run>` is `base`, `review-1-<short-description>`, `review-2-<short-description>`, …

`base` is always the first run, always present, and never restructured or rewritten by a review; a review only ADDS a sibling run folder. `<short-description>` is a kebab-case summary of the review's goal (lowercase, hyphens, no spaces), formatted like the pipeline-slug short description, and `N` in `review-N-…` is a per-pipeline monotonic counter — the next integer after the existing `review-*` folders.

A run carries no `-v<N>` suffix, is not a slug/branch/worktree, and does not change the pipeline version; `base` and every review of a pipeline share its one branch and worktree. Reviews are added one at a time, on top of a complete run.

### Reviewer base ref

The diff base ref is keyed on the start of the current run, captured once at run start and held constant for the whole run:

- **Review run** → the **tip of the previous run** (`base` or `review-(N-1)`): the branch tip at the moment the review run begins, before the review's intent is committed — equivalently, the parent of the review run's first commit, which is the intent commit.
- **Base run** → the **merge-base of the pipeline branch and main** (robust against main advancing).

The value is captured once while HEAD is still the prior-run tip, then passed unchanged to every code/docs reviewer invocation across all rejection/re-dispatch iterations; the diff is always `base-ref → current HEAD`.

### Key concepts

- Every pipeline is created from the project's main branch — never from another pipeline's tip.
- Inherited artifacts are copied as plain files into the new pipeline's artifact folder.
- Lineage is **derived** by comparing artifact content across the pipelines of an issue.

## Per-phase completion

A phase has two visible states on disk: **in progress** (the folder or some artifacts exist but the predicate below is not yet satisfied) and **complete** (predicate satisfied). Phase folders are created at the start of a phase, so folder existence alone does not imply completion — only the predicate does.

A phase is complete when all of these are committed to the pipeline branch (same predicate regardless of workflow mode):

| Phase          | Required artifacts                                                             |
| -------------- | ------------------------------------------------------------------------------ |
| 0 – Intent     | `0-intent/intent.md`                                                           |
| 1 – Spec       | `1-spec/spec-review-approved.md`                                               |
| 2 – Design doc | `2-design-doc/design-doc-review-approved.md`                                   |
| 3 – Plan       | `3-plan/code-plan-review-approved.md` and `3-plan/doc-plan-review-approved.md` |
| 4 – Code       | `4-code/code-review-approved.md`                                               |
| 5 – Docs       | `5-docs/docs-review-approved.md` and `run-summary.md`                          |

The artifact paths above are relative to the run folder (`<artifacts-folder>/<run>/`): the common case is `<phase>/…` but a path may also name a file at the run root (e.g. `run-summary.md` in phase 5).

A pipeline's **completed phase** and **active phase** are those of its **latest run** — the highest-numbered `review-N` run, or `base` if there are no reviews — with the completed/active predicate evaluated within that run's folder. The **completed phase** is the highest-numbered phase whose predicate is satisfied; the **active phase** is the phase after it if any of that phase's artifacts have started appearing (in progress), otherwise none.

Two notions follow: overall **pipeline state** (the latest run's phase; drives resume) versus **per-run completion** (a run complete through phase 5; gates whether a new review may start). They coincide except while a review is in flight. When a review run has only its `0-intent/intent.md` committed, the pipeline's **next phase** is that review's phase 1 (spec) — its intent is the input to phase 1, just as the base intent is for `base`. By the started-artifacts active-phase predicate the run has no active phase yet, so resume starts phase 1 from the committed intent with no rollback.

## Deriving lineage from artifact content

Whether two pipelines share a phase is read directly from the artifacts: a phase folder is the same in two pipelines **if its content is byte-identical**, and git answers that with the folder's tree object SHA.

```
git rev-parse <ref>:<artifacts-folder>/base/<phase>
```

`<ref>` is wherever that pipeline's committed artifacts live: its **branch** if it still exists, otherwise the artifact-bearing repo's **main branch** (the fork's main in `artifacts-in-fork` mode, the project's main in `artifacts-in-repo` mode) — where a merged, branch-deleted pipeline is found per "Listing pipelines for an issue" (step 3). `<artifacts-folder>` is that pipeline's own folder, derived from its versioned slug. Tree SHAs are pure content hashes, so SHAs read through a branch and through main are directly comparable. Tree SHAs are always computed over the pipeline's `base/` run; reviews are not part of the cross-pipeline tree, because lineage is a cross-fork comparison and forks inherit from `base/`, so only base phases are comparable.

## Listing pipelines for an issue

For a given issue, find every existing pipeline:

1. **Derive a search pattern** for the issue from the **Pipeline base slug** convention's deterministic relationship to the issue (the default keys on the issue id). It must match the pipeline base slug and any `-v<N>` extension of it.
2. **Search branches** — local and remote — that match the **Branch names** convention for that slug pattern. Subsequent pipelines are picked up because their slugs (and therefore branch names) are the pipeline base slug with `-v<N>` appended.
3. **Search artifact folders** in the **Artifact folder** location on the main branch of the artifact-bearing repository (the fork's main in `artifacts-in-fork` mode, the project's main in `artifacts-in-repo` mode, per the **Artifact storage** convention). A pipeline that was merged and had its branch deleted is only visible here.

Among the pipelines found, the pipeline base slug is the stem the others extend: that pipeline is `v1`, and each fork's slug is the base followed by `-v<N>`.

## Reconstructing the pipeline tree

The orchestrator rebuilds the tree on demand from artifact content:

1. List pipelines as described in "Listing pipelines for an issue".
2. For each pipeline, compute the tree SHA of each phase folder of its `base/` run, in phase order (`base/0-intent`, `base/1-spec`, …), stopping at the first phase folder it does not have:
   ```
   git rev-parse <ref>:<artifacts-folder>/base/<phase>
   ```
   `<ref>` is that pipeline's branch, or the artifact-bearing repo's main branch if its branch was deleted after merging (see "Deriving lineage from artifact content"). This yields, per pipeline, an ordered sequence of `(phase, SHA)` pairs.
3. Build the tree as a trie over these sequences. A **node** is a `(phase, SHA)` pair: pipelines sharing the same SHA at a phase share that node. Pipelines stay on a common path while their SHAs match and branch apart at the first phase where they differ. The shared root of the trie is the **issue itself** — an abstract node above every pipeline's `base/0-intent`, described by its pipeline base slug, carrying no SHA.

### Rendering

Render the tree as plain ASCII using box-drawing characters (`├`, `└`, `│`, `─`) so it displays correctly in any surface. Each node is a phase artifact, labeled version-first as `v<N>: <phase>`. A node shared by several pipelines is labeled with the **lowest** version among them — the earliest pipeline carrying that artifact.

Example:

```
#<pipeline-base-slug>
├── v1: 0-intent
│   ├── v1: 1-spec
│   │   ├── v1: 2-design-doc
│   │   │   └── v1: 3-plan → 4-code → 5-docs  [merged]
│   │   └── v2: 2-design-doc
│   │       ├── v2: 3-plan (in progress)
│   │       └── v3: 3-plan → 4-code (in progress)
│   └── v4: 1-spec
│       └── v4: 2-design-doc → 3-plan (in progress)
└── v5: 0-intent → 1-spec → 2-design-doc (in progress)
```

Reading conventions:

- A pipeline's **completed phase** is the deepest labeled node whose **Per-phase completion** predicate is satisfied. v1 has completed all five phases (and is merged); v2's deepest node is `3-plan` but the predicate is not yet satisfied, so its completed phase is `2-design-doc` and `3-plan` is its active phase; v3's completed phase is `3-plan` and `4-code` is its active phase.
- **Sibling nodes at the same phase have diverged** — their content differs. v1, v2, and v3 share one `1-spec` node, so all three carry the same spec. v4 has its own `1-spec` node branching straight off the shared `v1: 0-intent`: its spec differs from v1's (for instance, v4 forked from v1 and revised the spec). v5 diverges one level higher still — it revised the **intent**, so it branches at the issue root with its own `v5: 0-intent`.
- What a pipeline **shares** is every ancestor node up to the root; those phases are byte-identical to the pipelines it shares them with. v2 shares `v1: 1-spec` and `v1: 0-intent`; v3 shares everything v2 shares plus `v2: 2-design-doc`; v4 shares only `v1: 0-intent`; v5 shares only the issue root — its intent differs from every other pipeline's.
- A linear chain of phases held by one pipeline with no further divergence may be compressed onto one line with `→` separators (as `v1: 3-plan → 4-code → 5-docs` and `v5: 0-intent → 1-spec → 2-design-doc` above).
- `(in progress)` annotates the trailing node when its **Per-phase completion** predicate isn't yet satisfied. It signals that work has started but not finished.
- `[merged]` annotates a pipeline that has been merged into the project's main branch. Phase completion can be inferred from the predicate; "merged into main" cannot.
- A pipeline's runs are reported as a linear chain annotated on the pipeline, not as tree nodes: `base → review-1-<short-description> → review-2-<short-description> …`, each annotated with its own state.
