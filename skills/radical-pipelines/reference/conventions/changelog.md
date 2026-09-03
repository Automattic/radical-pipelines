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

- The `.rp.md` sections defining agent spawn, address, seat, and termination mechanics, and `Health monitoring`. The active `tools/<tool>.md` owns them.
- Run-layout descriptions.
- The former branch grammar beyond the issue-derived slug.
- Status-specific review filenames.
- Per-phase completion-predicate tables.
- Blocker instructions for agents.
- `Artifact storage`: `.rp.md` and the pipelines folder always live in the project's repository.

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

### Additions

- `Agents`, optional: model per profile and named lanes (replaces `Agent models`).
- `Thresholds`, optional.
- Frontmatter stamp `conventions: 1`.
