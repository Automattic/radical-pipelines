# Project-format changelog

Entries are ordered by version. Version 0 is the unstamped format.

## 1

Migrate from version 0.

### Renames

| Existing section                              | New heading             |
| --------------------------------------------- | ----------------------- |
| `Branch name base`                            | `Branch naming`         |
| The per-issue pipeline-folder section         | `Pipelines folder root` |
| `Worktree root`                               | `Worktree folder root`  |

`Pipelines folder root` now names one root containing all pipeline folders, rather than a per-issue path.

### Removals

- For an active tool with a skill `tools/<tool>.md`, remove the `.rp.md` sections defining agent spawn, address, seat, and termination mechanics, and health-loop start and cancel commands. That file owns them; `Health monitoring` keeps only interval and stall-threshold overrides. For other tools, retain the confirmed mechanics in the active tool section.
- Run-layout descriptions.
- The former branch grammar beyond the issue-derived slug.
- Status-specific review filenames.
- Per-phase completion-predicate tables.
- Blocker instructions for agents.

### Model tables

Move the model table into an `Agents` section — one block per profile — renaming the rows — `spec-lead` → `spec-producer`, `design-doc-lead` → `design-doc-producer`, `build-planner` → `build-plan-producer`, `build-writer-<kind>` → `build-worker-<kind>`, `document-planner` → `document-plan-producer`, `document-writer` → `document-worker`, `spec-researcher` and `design-doc-researcher` → `researcher`; drop `spec-consolidator` and `design-doc-consolidator` — leaving one row per current profile:

- `spec-producer`
- `spec-reviewer`
- `design-doc-producer`
- `design-doc-reviewer`
- `build-plan-producer`
- `build-plan-reviewer`
- `build-worker-tdd`
- `build-worker-edit`
- `build-worker-e2e`
- `build-reviewer`
- `document-plan-producer`
- `document-plan-reviewer`
- `document-worker`
- `document-reviewer`
- `researcher`

Keep one `researcher` row, asking the owner which existing research value to retain when values differ.

### Pipelines

Pipelines in the previous layout (`<slug>/base/…`) are closed: discovery reads `<slug>/0-intent/intent.md`, so they are neither live nor continued. Further work on their issue starts a new pipeline.

### Additions

- `Agents`, optional: model per profile and named lanes (replaces `Agent models`).
- `Artifact storage`, required, gains the artifact base branch.
- Frontmatter stamp `conventions: 1`.
