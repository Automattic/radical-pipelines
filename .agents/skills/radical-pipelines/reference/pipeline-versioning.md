# Pipeline Versioning

When the owner discards a pipeline or wants to try a different approach, the orchestrator forks a new pipeline from a previous one. Each pipeline is an independent branch and worktree branched from the project's main branch.

## Model

- **Pipeline slug** — per the **Pipeline slug** convention.
- **Pipeline version** — `v1` is implicit for the first pipeline. Subsequent pipelines are `v2`, `v3`, …
- **Branch name**:
  - First pipeline: per the **Branch names** convention applied to the pipeline slug.
  - Subsequent pipelines: append `/v<N>` to the first pipeline's branch name.
- **Artifact folder** (`<artifacts-folder>`):
  - First pipeline: per the **Artifact folder** convention applied to the pipeline slug.
  - Subsequent pipelines: the first pipeline's artifact folder with `v<N>/` appended.
- **Worktree**: one per pipeline, per the **Worktrees** convention.

### Key concepts

- Every pipeline is created from the project's main branch — never from another pipeline's tip.
- Inherited artifacts are copied as plain files into the new pipeline's artifact folder.
- Git ancestry does not carry inheritance information; `pipeline.yml` does.

## `pipeline.yml`

Each pipeline forked from a previous one carries one file at the root of its artifact folder:

```yaml
forked_from:
  pipeline: <parent-branch-name>
  phase: <last-inherited-phase>
```

1. The first pipeline has no `pipeline.yml`.
2. `pipeline.yml` is written once by the orchestrator at fork time and is never modified.
3. `forked_from.pipeline` is the parent's full branch name.
4. `forked_from.phase` is the inherited phase — the highest-numbered phase folder copied from the parent (`0-prompt`, `1-spec`, `2-design-doc`, `3-code-plan`, `4-doc-plan`, etc.).

## Listing pipelines for an issue

For a given issue, find every existing pipeline:

1. **Derive a slug pattern** using the **Pipeline slug** convention that matches every slug referring to this issue.
2. **Search branches** — local and remote — that match the **Branch names** convention and whose slug refers to this issue. Subsequent pipelines are picked up by the same pattern because their branch names append `/v<N>` to the first pipeline's branch.
3. **Search artifact folders** in the **Artifact folder** location on the main branch of the artifact-bearing repository (the fork's main in `artifacts-in-fork` mode, the project's main in `artifacts-in-repo` mode, per the **Artifact storage** convention). A pipeline that was merged and had its branch deleted is only visible here.

The first pipeline is the branch whose name has no `/v<N>` segment — equivalently, the branch whose artifact folder contains no `pipeline.yml`.

## Reconstructing the pipeline tree

The tree is not stored. The orchestrator rebuilds it on demand:

1. List pipelines as described in "Listing pipelines for an issue".
2. For each pipeline branch other than the first pipeline, read `pipeline.yml` from that branch without checkout:
   ```
   git show <branch>:<artifacts-folder>/pipeline.yml
   ```
3. Join on `forked_from.pipeline` to obtain parent edges. Group by parent for siblings.

### Rendering

Render the tree as plain ASCII using box-drawing characters (`├`, `└`, `│`, `─`) so it displays correctly in any surface. Each phase artifact is a node, labeled version-first as `v<N>: <phase>`. The root `0-prompt` carries no label — it's the shared starting point.

Example:

```
0-prompt
└── v1: 1-spec
    ├── v1: 2-design-doc
    │   └── v1: 3-code-plan → 4-doc-plan → 4-code → 5-docs  [merged]
    └── v2: 2-design-doc
        ├── v2: 3-code-plan
        └── v3: 3-code-plan → 4-doc-plan
```

Reading conventions:

- A pipeline's **current phase** is its deepest labeled node. v1 is at `5-docs` (merged); v2 is at `3-code-plan`; v3 is at `4-doc-plan`.
- What a pipeline **inherits** is every ancestor node up to the root. v2 inherits `v1: 1-spec` and `0-prompt`; v3 inherits everything v2 inherits plus `v2: 2-design-doc`.
- A linear chain of phases owned by one pipeline with no further divergence may be compressed onto one line with `→` separators (as `v1: 3-code-plan → 4-doc-plan → 4-code → 5-docs` above).
- `[merged]` is the only state annotation worth keeping explicit — completion of all phases can be inferred from position in the tree, but "merged into main" can't.
