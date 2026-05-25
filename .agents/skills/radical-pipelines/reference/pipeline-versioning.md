# Pipeline Versioning

When the owner discards a pipeline or wants to try a different approach, the orchestrator forks a new pipeline from a previous one. Each pipeline is an independent branch and worktree branched from the project's main branch.

## Model

- **Pipeline version** — `v1` is implicit for the first pipeline. Subsequent pipelines are `v2`, `v3`, …
- **Pipeline base slug** — the version-less slug the **Pipeline base slug** convention produces; the shared stem of all of an issue's pipelines.
- **Pipeline versioned slug** — one specific pipeline's identifier:
  - First pipeline (`v1`): the pipeline base slug, unchanged — `v1` carries no suffix, because it is implicit.
  - Subsequent pipelines (`v<N>`, N ≥ 2): the pipeline base slug with `-v<N>` appended.

### Key concepts

- Every pipeline is created from the project's main branch — never from another pipeline's tip.
- Inherited artifacts are copied as plain files into the new pipeline's artifact folder.
- Lineage is not recorded anywhere. The tree is **derived** by comparing artifact content across the pipelines of an issue.

## Per-phase completion

A phase has two visible states on disk: **in progress** (the folder or some artifacts exist but the predicate below is not yet satisfied) and **complete** (predicate satisfied). Phase folders are created at the start of a phase, so folder existence alone does not imply completion — only the predicate does.

A phase is complete when all of these are committed to the pipeline branch (same predicate regardless of workflow mode):

| Phase          | Required artifacts                                                             |
| -------------- | ------------------------------------------------------------------------------ |
| 0 – Prompt     | `0-prompt/prompt.md`                                                           |
| 1 – Spec       | `1-spec/spec-review-approved.md`                                               |
| 2 – Design doc | `2-design-doc/design-doc-review-approved.md`                                   |
| 3 – Plan       | `3-plan/code-plan-review-approved.md` and `3-plan/doc-plan-review-approved.md` |
| 4 – Code       | `4-code/code-review-approved.md`                                               |
| 5 – Docs       | `5-docs/docs-review-approved.md`                                               |

A pipeline's **completed phase** is the highest-numbered phase whose predicate is satisfied. Its **active phase** is the phase after the completed phase if any of that phase's artifacts have started appearing (in progress); otherwise the pipeline has no active phase.

## Deriving lineage from artifact content

Whether two pipelines share a phase is read directly from the artifacts: a phase folder is the same in two pipelines **if its content is byte-identical**, and git answers that with the folder's tree object SHA.

```
git rev-parse <ref>:<artifacts-folder>/<phase>
```

`<ref>` is wherever that pipeline's committed artifacts live: its **branch** if it still exists, otherwise the artifact-bearing repo's **main branch** (the fork's main in `artifacts-in-fork` mode, the project's main in `artifacts-in-repo` mode) — where a merged, branch-deleted pipeline is found per "Listing pipelines for an issue" (step 3). `<artifacts-folder>` is that pipeline's own folder, derived from its versioned slug. Tree SHAs are pure content hashes, so SHAs read through a branch and through main are directly comparable.

## Listing pipelines for an issue

For a given issue, find every existing pipeline:

1. **Derive a search pattern** for the issue from the **Pipeline base slug** convention's deterministic relationship to the issue (the default keys on the issue id). It must match the pipeline base slug and any `-v<N>` extension of it.
2. **Search branches** — local and remote — that match the **Branch names** convention for that slug pattern. Subsequent pipelines are picked up because their slugs (and therefore branch names) are the pipeline base slug with `-v<N>` appended.
3. **Search artifact folders** in the **Artifact folder** location on the main branch of the artifact-bearing repository (the fork's main in `artifacts-in-fork` mode, the project's main in `artifacts-in-repo` mode, per the **Artifact storage** convention). A pipeline that was merged and had its branch deleted is only visible here.

Among the pipelines found, the pipeline base slug is the stem the others extend: that pipeline is `v1`, and each fork's slug is the base followed by `-v<N>`.

## Reconstructing the pipeline tree

The tree is not stored. The orchestrator rebuilds it on demand from artifact content:

1. List pipelines as described in "Listing pipelines for an issue".
2. For each pipeline, compute the tree SHA of each phase folder it carries, in phase order (`0-prompt`, `1-spec`, …), stopping at the first phase folder it does not have:
   ```
   git rev-parse <ref>:<artifacts-folder>/<phase>
   ```
   `<ref>` is that pipeline's branch, or the artifact-bearing repo's main branch if its branch was deleted after merging (see "Deriving lineage from artifact content"). This yields, per pipeline, an ordered sequence of `(phase, SHA)` pairs.
3. Build the tree as a trie over these sequences. A **node** is a `(phase, SHA)` pair: pipelines sharing the same SHA at a phase share that node. Pipelines stay on a common path while their SHAs match and branch apart at the first phase where they differ. `0-prompt` is identical across every pipeline of an issue (it is the issue), so it is always the shared root.

### Rendering

Render the tree as plain ASCII using box-drawing characters (`├`, `└`, `│`, `─`) so it displays correctly in any surface. Each node is a phase artifact, labeled version-first as `v<N>: <phase>`. A node shared by several pipelines is labeled with the **lowest** version among them — the earliest pipeline carrying that artifact. The root `0-prompt` carries no label — it's the shared starting point.

Example:

```
0-prompt
├── v1: 1-spec
│   ├── v1: 2-design-doc
│   │   └── v1: 3-plan → 4-code → 5-docs  [merged]
│   └── v2: 2-design-doc
│       ├── v2: 3-plan (in progress)
│       └── v3: 3-plan → 4-code (in progress)
└── v4: 1-spec
    └── v4: 2-design-doc → 3-plan (in progress)
```

Reading conventions:

- A pipeline's **completed phase** is the deepest labeled node whose **Per-phase completion** predicate is satisfied. v1 has completed all five phases (and is merged); v2's deepest node is `3-plan` but the predicate is not yet satisfied, so its completed phase is `2-design-doc` and `3-plan` is its active phase; v3's completed phase is `3-plan` and `4-code` is its active phase.
- **Sibling nodes at the same phase have diverged** — their content differs. v1, v2, and v3 share one `1-spec` node, so all three carry the same spec. v4 has its own `1-spec` node branching straight off `0-prompt`: its spec differs from v1's (for instance, v4 forked from v1 and revised the spec).
- What a pipeline **shares** is every ancestor node up to the root; those phases are byte-identical to the pipelines it shares them with. v2 shares `v1: 1-spec` and `0-prompt`; v3 shares everything v2 shares plus `v2: 2-design-doc`; v4 shares only `0-prompt` with the rest.
- A linear chain of phases held by one pipeline with no further divergence may be compressed onto one line with `→` separators (as `v1: 3-plan → 4-code → 5-docs` above).
- `(in progress)` annotates the trailing node when its **Per-phase completion** predicate isn't yet satisfied. It signals that work has started but not finished.
- `[merged]` annotates a pipeline that has been merged into the project's main branch. Phase completion can be inferred from the predicate; "merged into main" cannot.
