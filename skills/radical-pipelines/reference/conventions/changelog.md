# Project-format changelog

Entries are ordered by version. Version 0 is the unstamped format.

## 9

Migrate from version 8.

### Data

Move `Worktree folder root` into the frontmatter's data as `worktree-folder-root` (`../../scripts/README.md` § Conventions data), its folder unchanged, and remove the section from the body. Offer `landing-commit`, the template of the commits `rp land` makes, proposing one that the **Commit format** convention's examples follow, such as `{subject} (orchestrator)`. In `.rp.local.md`, the same conventions move into its frontmatter.

### Pipelines

Pipelines keep format 8 and are continued.

## 8

Migrate from version 7.

### Data

Move these sections into the frontmatter's data (`../../scripts/README.md` § Conventions data), with every value and text unchanged, and remove them from the body:

- `Commit format` → `commit-format`, a list of its lines when it has several.
- Each `Guardrails` block → an entry of `guardrails` under its name: its `rule`, and its `agents` as `profiles`.
- Each `Resources` block → an entry of `resources` under its name: its `resource`, and its `agents` as `profiles`.
- `Agents` → `agents`: each profile's `model` and `subagents`, and its lanes under `lanes` by id, each with its `brief`, `model`, and `subagents`.

Offer variables for the placeholders these texts use (`setup.md` § Write). In `.rp.local.md`, the same conventions move into its frontmatter, without `conventions`.

### Pipelines

A pipeline whose `run-config.md` carries no `format` 8 is listed by discovery with its format and never continued: work on its issue starts a new pipeline, from the base branch or from its tip.

## 7

Migrate from version 6. No section of `.rp.md` changes.

### Pipelines

A pipeline whose `run-config.md` carries no `format` 7 is listed by discovery with its format and never continued: work on its issue starts a new pipeline, from the base branch or from its tip.

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

### Pipelines

A pipeline whose `run-config.md` carries no `format` 6 is listed by discovery as `earlier` and never continued: work on its issue starts a new pipeline, from the base branch or from its tip.

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

### Pipelines

Pipelines in the previous layout (`<pipeline slug>/base/…`) are closed: discovery reads `<pipeline slug>/0-intent/intent.md`, so they are neither live nor continued. Further work on their issue starts a new pipeline.

### Additions

- `Agents`, optional: model per profile and named lanes (replaces `Agent models`).
- `Artifact storage`, required, gains the artifact base branch.
- Frontmatter schema stamp 1.
