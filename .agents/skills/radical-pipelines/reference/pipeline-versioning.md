# Pipeline Versioning

A pipeline can have multiple attempts. When the owner discards an attempt or wants to try a different approach, the orchestrator forks a new attempt from a previous one. Each attempt is an independent branch and worktree branched from the project's main branch. Sibling attempts are invisible to each other locally.

## Model

- **Pipeline slug** — per the **Pipeline slug** convention (e.g. `123-add-import-wizard`).
- **Attempt id** — `v1` is implicit for the first attempt. Subsequent attempts are `v2`, `v3`, …
- **Branch name**:
  - First attempt: per the **Branch names** convention applied to the pipeline slug.
  - Subsequent attempts: append `/v<N>` to the first attempt's branch name. Example with a project that uses the `rp/<pipeline-slug>` branch format: `rp/123-add-import-wizard/v2`, `rp/123-add-import-wizard/v3`.
- **Artifact folder**:
  - First attempt: `.pipelines/<pipeline-slug>/` per the **Artifact folder** convention.
  - Subsequent attempts: `.pipelines/<pipeline-slug>/v<N>/`.
- **Worktree**: one per attempt, per the **Worktrees** convention.

Every attempt is created from the project's main branch — never from another attempt's tip. Inherited artifacts are copied as plain files into the new attempt's artifact folder. Git ancestry does not carry inheritance information; `attempt.yml` does.

## `attempt.yml`

Each attempt forked from a previous one carries one file at the root of its artifact folder:

```yaml
forked_from:
  attempt: <parent-branch-name>
  phase: <last-inherited-phase>
```

Example for an attempt forked from the first attempt at the spec phase:

```yaml
forked_from:
  attempt: rp/123-add-import-wizard
  phase: 1-spec
```

Rules:

1. The first attempt has no `attempt.yml`.
2. `attempt.yml` is written once by the orchestrator at fork time and is never modified.
3. `forked_from.attempt` is the parent's full branch name.
4. `forked_from.phase` is the inherited phase — the highest-numbered phase folder copied from the parent (`0-prompt`, `1-spec`, `2-design-doc`, `3-code-plan`, `4-doc-plan`, etc.).
5. No other fields. Status, current phase, siblings, and parent's parent are derived on demand.

## Enumerating attempts of an issue

Given a pipeline slug `<slug>`, list every branch whose name starts with the branch-name form used for `<slug>` per the **Branch names** convention. The match includes the first attempt and every subsequent attempt.

Example for a project that uses the `rp/<pipeline-slug>` branch format:

```
git for-each-ref --format='%(refname:short)' 'refs/heads/rp/<slug>*'
```

The first attempt is the branch whose name has no `/v<N>` segment — equivalently, the branch whose artifact folder contains no `attempt.yml`.

## Reconstructing the attempt tree

The tree is not stored. The orchestrator rebuilds it on demand:

1. List branches matching the pipeline slug prefix.
2. For each attempt branch other than the first attempt, read `attempt.yml` from that branch without checkout:
   ```
   git show <branch>:.pipelines/<pipeline-slug>/v<N>/attempt.yml
   ```
3. Join on `forked_from.attempt` to obtain parent edges. Group by parent for siblings.

If a graph visualization is needed, render it from the result on demand (stretch). Any cached `graph.md` is a projection — never a source of truth.

## What is not stored

- Sibling lists — derived by grouping attempts by `forked_from.attempt`.
- Current phase — derived from the highest-numbered phase folder on the attempt's branch.
- Title or human-readable name — the attempt id suffices; descriptive context lives in the commit that introduced the attempt.
