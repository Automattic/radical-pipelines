# Project-format changelog

Entries are ordered by version. Version 0 is the unstamped format.

## 7

Migrate from version 6.

### Frontmatter

Rewrite the frontmatter as the line `conventions: 7`.

### Entries

Rewrite each `Guardrails` and `Resources` block, and each `Agents` profile and lane, as an entry (`load.md` § Conventions), its text unchanged: a block's `agents` become its `profiles`, its `rule` or `resource` its text, and a lane's brief the lane's text. Keep every other section as it is. In `.rp.local.md`, the same entries take the same form, and its `Agents` entries keep only their models.

### Additions

- `Landing commit`, optional: the template of the commits `rp land` makes. Propose one that the commit format's examples follow, such as `{subject} (orchestrator)`.
- `Variables`, optional: the placeholders the guardrail, resource, commit-format, and brief texts use (`setup.md` § Write).

## 6

Migrate from version 5.

### Profiles

Four profiles remain: `spec-producer`, `design-doc-producer`, `implementer`, `reviewer`. In `Agents`, and in the `agents` of every `Guardrails` and `Resources` block:

| Existing profile | Becomes |
| --- | --- |
| `build-worker`, `document-worker` | `implementer` |
| `build-reviewer`, `document-reviewer` | `reviewer` |
| `build-plan-producer`, `document-plan-producer`, `spec-reviewer`, `design-doc-reviewer`, `helper` | removed |

When renamed blocks give one profile different models, ask the owner which to keep. Drop a block's removed profiles, and the block when none remain.

### Lanes

- `build-reviewer` and `document-reviewer` lanes become `reviewer` lanes. Ask the owner whether each `spec-reviewer` or `design-doc-reviewer` lane becomes a production lane of that artifact's producer, keeping its brief as the direction it explores, or is dropped.
- Remove every lane's `materials` and `after`.

## 5

Migrate from version 4.

### Renames

`build-worker-tdd`, `build-worker-edit`, and `build-worker-e2e` become one profile, `build-worker`, wherever `.rp.md` names them. When their models differ, ask the owner which to keep.

## 4

Migrate from version 3.

### Additions

- `Resources`, optional: what agents have available and how to use it. Where a `Guardrails` rule describes something agents can use, offer to move that description into a `Resources` block and keep only the obligation in the rule.

## 3

Migrate from version 2.

### Renames

| Existing section | New heading     |
| ---------------- | --------------- |
| `Branch naming`  | `Pipeline slug` |

Reword its body to describe the slug.

### Additions

- `Pipeline branch format`, optional: the pipeline branch as a template over `<pipeline slug>`.

## 2

Migrate from version 1.

### Frontmatter

Rewrite the frontmatter as a JSON object.

### Renames

In `Agents`, the `researcher` block becomes `helper`.

### Removals

- `researcher` from every `Guardrails` block's `agents`, dropping a block left with none.

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

### Additions

- `Agents`, optional: model per profile and named lanes (replaces `Agent models`).
- `Artifact storage`, required, gains the artifact base branch.
- Frontmatter schema stamp 1.
