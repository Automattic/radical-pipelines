# Doc Plan: Optional convention for per-agent model configuration

Source issue: [Automattic/radical-pipelines#90](https://github.com/Automattic/radical-pipelines/issues/90) — "Optional convention for per-agent model configuration"

Inputs: `1-spec/spec.md` (15 requirements, 16 ACs), `2-design-doc/design-doc.md`, `3-plan/code-plan.md` (approved, commit 7094c02).

## Overview

This feature is **documentation-as-implementation**: Radical Pipelines has no executable orchestration code, so the code phase (phase 4, `code-plan.md`) ships its behavior entirely as prose edits to the skill-reference Markdown and the dogfood `.rp.md`. The code phase deliberately authors the **canonical shape and the per-tool, internal conventions** — the `### Agent models` block shape and resolution rule in `setup.md`, the `load.md` optional row, the spawn-resolution step in `autonomous-workflow.md`, the per-tool spawn-surface notes in `claude-code.md`/`pi.md`, the escalation/recovery edits in `health-monitoring.md`, and the dogfood `.rp.md` example blocks. Those are owned by phase 4 and are **not** re-documented here.

The docs phase (phase 5) owns the surfaces the code plan explicitly **deferred** to it, both of which are end-user-/release-facing rather than internal skill text:

1. **The `README.md` per-tool convention catalog** — the human-facing "Configuration" overview (`README.md:157`) and the `.rp.md`-structure sentence (`README.md:167`) each enumerate the per-tool conventions a project's `.rp.md` carries (worktrees, branch names, team spawning, health monitoring). Both omit the new optional `Agent models` convention and would otherwise be left out of sync with what ships. The README is written **after** the code lands so it is authored against the real shipped catalog wording and the canonical convention name `Agent models`.
2. **The mandatory CI changeset** (`.changeset/*.md`) — the repo's Changeset Gate requires a changeset on any PR that touches release-relevant paths (`skills/**`, `agents/**`, `.claude-plugin/**`, root `package.json`, `README.md`). This feature touches `skills/**` and `README.md`, so a changeset is mandatory or the PR fails CI. The changeset is the docs-phase "changelog" output: a release-facing summary of what the feature adds, written once the full change is known.

No genuinely separate end-user "how to opt in" guide is warranted: the canonical opt-in shape, the resolution rule, the optionality, and the per-tool value forms are already documented by phase 4 in `setup.md` (the file that documents the other optional, project-chosen conventions). Per the design's anti-drift rule (design §12 risks 2 and 4) and the repo's "no duplication across reading paths" rule (`AGENTS.md`), the README task **references** that canonical documentation rather than restating the block shape. The doc surfaces sweep (README at root, `.changeset/`, `website/`, `CONTRIBUTING.md`, `AGENTS.md`) found no other end-user surface that enumerates the per-tool conventions — `website/index.html` mentions worktrees only as a generic capability line, not as the `.rp.md` convention catalog, so it is not a surface for this feature.

## Tasks

### Task 1: Add the `Agent models` convention to the README per-tool convention catalog

- **Goal:** Keep the human-facing README convention catalog complete and in sync with the shipped skill by adding the new optional `Agent models` convention to the two places the README enumerates the per-tool `.rp.md` conventions, so a reader scanning "what conventions does my project's `.rp.md` carry?" sees the new capability and that it is optional and per-tool.
- **Audience:** Project owners / Radical Pipelines users reading the README to understand what conventions a project can configure and what lives in `.rp.md` — not skill internals.
- **Files to change:** `README.md`.
- **Sections / scope:**
  - The **"Configuration"** overview paragraph that enumerates per-tool conventions (the sentence around `README.md:157` listing "worktree commands … team spawning … health monitor" for Claude Code and "provider/model recovery … health monitor … agent discovery rules" for Pi). Add `Agent models` (the optional per-agent / project-wide model + settings convention) to the per-tool enumeration, matching the existing terse, parenthetical, present-tense voice. State that it is optional.
  - The **`.rp.md`-structure** sentence around `README.md:167` that lists what the per-tool section covers ("worktrees, branch names, team spawning, health monitoring"). Add `agent models` to that list so the structural description of `.rp.md` matches what now ships.
  - Reference, do **not** restate, the canonical shape: if a pointer is natural in the README's voice, point the reader at the setup/conventions documentation for how to author the block. Do **not** duplicate the `### Agent models` block shape, the resolution rule, or the per-tool value forms into the README — those are documented once by phase 4 in `setup.md` (anti-drift; `AGENTS.md` no-duplication rule).
  - Use the exact convention name `Agent models` as it ships in `setup.md` / `load.md` / `.rp.md` (verify the final canonical name against the shipped phase-4 text before writing).
- **Depends on:** none (within the doc plan). Authored after phase 4 ships so it reflects the real shipped catalog wording and canonical name.
- **Traces to:** Spec R5, R6, R8 (optional, per-tool); design §4.5 (README catalog), §3 "Files touched" (`README.md` row); code-plan Overview "Deferred to the doc plan" + code-plan Task 9 (README reconciled to the canonical name in phase 5). Documentation-completeness surface.
- **Acceptance:**
  - A reader of the README's Configuration overview comes away knowing a project can optionally configure which model (and settings) each spawned agent runs on, and that this is a per-tool, optional convention.
  - The `Agent models` convention appears in both the Configuration per-tool enumeration (~`:157`) and the `.rp.md`-structure sentence (~`:167`), using the same canonical name that ships in `setup.md`/`load.md`/`.rp.md`.
  - The new wording matches the surrounding README voice (terse, present-tense, parenthetical convention list) and does not restate the block shape, resolution rule, or value forms — it references the canonical setup/conventions documentation instead if a pointer is included.
  - No other README claim is contradicted (the catalog still reads as a complete, accurate enumeration of per-tool conventions).

### Task 2: Add the mandatory release changeset for the feature

- **Goal:** Satisfy the repository's Changeset Gate (CI) and record this feature in the changelog by adding a single `.changeset/*.md` file describing the new optional per-agent model configuration convention and declaring its version bump, so the PR passes the gate's Presence check and the change is attributed in the generated `CHANGELOG.md`.
- **Audience:** Changelog readers and release consumers of `@automattic/radical-pipelines` — a release-facing, user-oriented summary of what the feature adds, not an internal design note.
- **Files to change:** a new file under `.changeset/` (e.g. `.changeset/<changesets-generated-name>.md`), authored in the project's changeset format.
- **Sections / scope:**
  - Front matter declaring the package `"@automattic/radical-pipelines"` and the bump type. This is a backwards-compatible **new feature** (purely additive; a project that configures nothing is unaffected), so the bump is `minor` per the project bump table (`CONTRIBUTING.md` "Bump types" + pre-1.0 policy: features are `minor`). Confirm the package name and bump rules against the shipped `.changeset/config.json` and `CONTRIBUTING.md` before writing; this is **not** a prose-only edit, so the empty-changeset form does not apply.
  - A one-paragraph body in the imperative mood (matching the existing changesets, e.g. `.changeset/restructure-repository-layout.md`, `.changeset/recommend-standard-remote-names.md`) summarizing the user-facing change: a project can optionally pin, per spawned agent and/or as a project-wide default, which model and model settings (e.g. reasoning `effort`) each agent runs on, expressed per active tool and passed verbatim to the spawn; absence keeps today's behavior in both runtimes; recovery model swaps remain transient and never re-select the just-failed model. Keep it release-note-appropriate, not a design dump; the canonical shape lives in the skill docs.
  - Do not restate the block shape or resolution algorithm; summarize the capability and its optionality.
- **Depends on:** Task 1 (the changeset summary should reflect the full landed change, including the README catalog update). Authored after phase 4 ships so the summary matches what actually shipped.
- **Traces to:** Repo Changeset Gate (`CONTRIBUTING.md` "When a changeset is required": `skills/**` and `README.md` are release-relevant); design §3 "Files touched" did not enumerate the changeset (deferred to docs); code-plan Overview "Deferred to the doc plan" (the mandatory CI changeset is a docs-phase changelog output). Release/changelog completeness across all spec requirements (R1–R15 land behind this one feature changeset).
- **Acceptance:**
  - A single well-formed `.changeset/*.md` file exists with valid front matter naming `@automattic/radical-pipelines` and a bump type consistent with the project bump table (a feature → `minor` while pre-1.0; verify against the shipped `CONTRIBUTING.md`/`config.json`).
  - The body is an imperative-mood, release-facing summary that tells a changelog reader the feature adds optional per-agent (and project-wide-default) model/settings configuration, that absence is fully inert, and that values are per-tool and passed verbatim — without restating the internal block shape or resolution algorithm.
  - The changeset satisfies the Changeset Gate's Shape and Presence checks for a PR touching `skills/**` and `README.md` (it is a content changeset, not the canonical-empty form, because the change is a real feature, not a prose-only edit).
  - The summary does not contradict the spec or the shipped behavior (it claims only what the feature actually does: optional, additive, per-tool, verbatim pass-through, transient recovery swaps).

## Acceptance criteria coverage

These two docs-phase surfaces are the surfaces the code plan deferred; every spec acceptance criterion is realized by the **code** phase (see `code-plan.md` "Acceptance criteria coverage"). The docs phase ensures the feature is discoverable and releasable:

- **README catalog completeness** (so AC5/AC6/AC7 optionality and AC8–AC11 per-tool expression are discoverable to a reader) — Task 1.
- **Release/changelog record** (so the feature that realizes R1–R15 / AC1–AC16 ships with a mandatory, valid changeset and a changelog entry) — Task 2.

## Notes for the doc-writer (phase 5)

- **Author against the shipped text.** Phase 4 finalizes the exact canonical convention name and the per-tool value-form wording. Read the shipped `setup.md`, `load.md`, and `.rp.md` for the canonical name (`Agent models`) before writing the README and changeset; if phase 4 used a different final name, use whatever shipped (wording-level drift, not a blocker).
- **Do not duplicate.** The block shape, resolution rule, optionality mechanism, and per-tool value forms are documented once by phase 4 in the skill reference. Reference them; do not restate them (anti-drift; `AGENTS.md` no-duplication rule).
- **Verify the changeset config.** Confirm the package name and required bump from the shipped `.changeset/config.json` and `CONTRIBUTING.md` rather than from this plan; this plan fixes the surfaces and intent, not frozen strings.
