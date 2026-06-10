# Code Plan: Local, per-developer overrides of a project's Radical Pipelines conventions

## Overview

Radical Pipelines loads each consuming project's conventions from a single committed `.rp.md`. This feature lets a developer place a single git-ignored override file, `.rp.local.md`, alongside the committed `.rp.md` to adjust a restricted subset of conventions (agent models, health-monitoring cadence, the Issues access-mechanism) for their own working copy or machine. The override is never committed and never affects other contributors.

Because Radical Pipelines is "documentation as code" — the loader and setup flow are Markdown the orchestrator LLM reads and reasons over, with no parser or deterministic merger — every "code" change here is a concrete edit to a real Markdown instruction file (or, for the dogfood `.gitignore` and changeset, a real config/text file). There is no compiled code or test runner for the merge logic; acceptance criteria are therefore verifiable assertions about file content and the behavior the content prescribes, plus runnable git checks where applicable.

The plan builds the canonical procedure doc first (the single source of truth every other touchpoint points at), then wires the thin loader gate to it, then updates the setup flow, the discoverability touchpoints (SKILL.md, README.md), the dogfood repo's own `.gitignore` (which both ships the dogfood instance and exercises the setup change), and finally a changeset entry. Tasks are ordered so that every file that cross-references `local-overrides.md` is written after `local-overrides.md` exists.

This plan introduces no new design. Every task is faithful to `spec.md` and `design-doc.md`. Two scope guards from the design doc are honored explicitly and called out where they apply: (a) do NOT retroactively add the missing worktree-folder line to this repo's `.gitignore`; (b) do NOT force-refactor the dogfood `.rp.md` Issues block to add a `**Access:**` line.

## Reference: shared content the tasks rely on

These exact strings are fixed by the design doc and several tasks reuse them. They are listed here once so each task can reference them without restating.

- **Fixed override filename:** `.rp.local.md`. **Location:** the same directory as the committed `.rp.md` (the project main checkout root).
- **Main-root resolution recipe:** `main_root = dirname( git rev-parse --git-common-dir )`. `git rev-parse --show-toplevel` must NOT be used (it returns the worktree dir on resume/manage-issues).
- **Gitignore safety check:** `git check-ignore .rp.local.md` run from the main root — exit 0 = ignored/safe, exit 1 = not ignored → warn. Functional, not a grep of `.gitignore` text.
- **Reason-string families (load-bearing for warning discriminability), each stated verbatim and exclusively:**
  - req 15 (discretionary `(non-overridable)` marker): reason contains "the project marked this unit non-overridable"; never "shared across collaborators" or "forced by the active tool".
  - req 16 (inherent lock): reason contains exactly one of "shared across collaborators" (shared-output conventions and the Issues tracker identity) or "forced by the active tool" (tool-forced command forms); never "the project marked".
  - req 17 (malformed): reason is "could not be applied (unrecognized or malformed unit)", naming the unit by the literal heading/label the developer wrote.
- **Batched summary block shape** (emitted only when `.rp.local.md` is present at the main root):

  ```
  Local overrides (.rp.local.md):
  Applied:
    - <unit>: applied your local model.
    - <unit>: added (new entry).
  Ignored:                          (only if any)
    - <unit>: <what happened> — <reason>. Using the committed value.
  Warning:                          (only if applicable)
    - .rp.local.md is at risk of being committed — the project's ignore rules have no entry that ignores it; add one.
  ```

  When `.rp.local.md` is absent: emit nothing at all (no block, no "no overrides found" line). When present and fully clean: emit the header plus the `Applied:` line.

## Tasks

### Task 1: Create the canonical procedure doc `local-overrides.md`

- **Goal:** Author the single source-of-truth reference doc that holds the complete override mechanism. Every other touchpoint in later tasks only points at this file, so it must exist and be complete first.
- **Files to change:** NEW `skills/radical-pipelines/reference/conventions/local-overrides.md`.
- **Changes:** Write a new Markdown reference doc (sibling of `load.md` and `setup.md` under `reference/conventions/`) containing all of the following sections, written as instructions the orchestrator LLM reads and executes:
  1. **Purpose and file basics.** The fixed filename `.rp.local.md`; its location (same directory as the committed `.rp.md`, i.e. the project main checkout root); that it is git-ignored, never committed, and never affects other contributors; that it is partial by design (states only the units it changes) so no required/optional completeness check is applied to it.
  2. **Main-root resolution (worktree-visibility mechanism).** State that the loader resolves the project main root as `dirname( git rev-parse --git-common-dir )`, that this equals the directory holding the committed `.rp.md` and is correct from any working directory including inside a Claude Code worktree (`.claude/worktrees/<slug>`), and that `git rev-parse --show-toplevel` must NOT be used because it returns the worktree dir on resume/manage-issues. State that both `.rp.md` and `.rp.local.md` are read anchored to this main root, and that `.rp.local.md` is read from the main root and merged in memory — nothing is ever copied or written into the worktree.
  3. **Idempotent re-resolution.** State that this step is re-run on every load (fresh, resume, manage-issues; autonomous and assisted), nothing about the merged result is persisted, and `.rp.local.md` is always read freshly from the main root.
  4. **Fail-soft guarantee.** If the main root cannot be determined, or `.rp.local.md` cannot be read or parsed, treat it exactly as "no `.rp.local.md` present": proceed with the committed conventions, at most a warning, never a hard-stop and never a path into setup. A malformed local file never causes a required convention to read as missing and never triggers the setup flow.
  5. **The named-unit merge model — three unit shapes**, each matched off the committed file's own names, never an arbitrary substring:
     - **Labeled bullet** (e.g. Agent models, `**Default:**` plus `**<agent-name>:**` bullets): matched by the exact `**<label>:**`; resolution is a map-merge over labels — a matching label replaces that entry, a new label adds an entry, an absent label inherits the committed entry.
     - **Named prose sub-statement** (e.g. the Issues convention naming the tracker identity separately from how the tracker is accessed): matched by the convention heading plus the committed named sub-statement, restating the named line with its value changed; never matched by free-substring search.
     - **Atomic convention** (e.g. the health-monitoring cadence): the convention as a whole is the unit.
     For every shape: if `.rp.local.md` defines the unit, the local value is used; otherwise the committed value is inherited. A local value replaces the matched unit wholesale — no partial blending inside a single unit's value (e.g. inside an opaque model string or a single access statement). An entry that maps to no committed-named unit is treated as malformed and warn-and-ignored.
  6. **The overridable classification — three groups** (prose, not a new table column):
     - **Overridable:** Agent models; Health-monitoring cadence; the Issues **access** sub-statement.
     - **Locked-shared (inherent):** commit format, artifact folder, pipeline slug, branch names, worktree naming, and the Issues **tracker identity**. Locked by classification; never carry a marker.
     - **Tool-forced (inherent):** command **forms** dictated by the active tool's surface (worktree, branch-name, team-spawning, health-monitor command forms). The form is locked, but the in-scope argument values it carries (e.g. the cadence value) are not.
  7. **The `(non-overridable)` marker (discretionary lock).** A project may explicitly lock an otherwise-overridable unit with a `(non-overridable)` parenthetical appended to the heading or bullet-label, mirroring setup.md's `(required)` idiom. Show both granularities: whole convention (`### Agent models (non-overridable)`) and single unit (`- **spec-writer:** anthropic/claude-opus-4-8 (non-overridable)` and prose `**GitHub is the source of truth** (non-overridable)`). State that this is the rarely-used opt-in marker; default remains local-wins; it is distinct from inherent locks so warnings cite the right reason; inherent families never need and never carry the marker.
  8. **The warnings surface.** A single batched, present-only informational summary emitted at load time, framed as a short informational report with no questions. Include the exact block shape from the "Reference" section above (Applied / Ignored / Warning, with the one-line-per-item template `- <unit>: <what happened> — <reason>. Using the committed value.`). State the absent-file behavior (emit nothing at all) and the present-and-clean behavior (header plus `Applied:` line). State the three reason-string families verbatim and exclusively, exactly as listed in the "Reference" section above (req 15 / req 16 / req 17 substrings), so the warnings are test-discriminable.
  9. **The gitignore safety check (req 18).** `git check-ignore .rp.local.md` run from the main root: exit 0 = ignored/safe, exit 1 = not ignored → queue the gitignore warning. State that this is functional (not a grep of `.gitignore` text) so it honors a parent or global ignore file, and that it is independent of the merge outcome — it fires on mere presence of the file even if every unit was ignored or malformed.
  10. **Worked examples:**
      - **Agent models (full map-merge, all three behaviours):** committed block with `**Default:**`, `**spec-writer:**`, `**code-writer:**`; developer `.rp.local.md` overriding `**spec-writer:**` (e.g. with `(effort: high)`) and adding `**code-reviewer:**`; resolved result showing `Default` inherited, `spec-writer` replaced wholesale (entire value swapped, not blended), `code-writer` inherited, `code-reviewer` added as a new label. Use real agent names and opaque provider/model values, matching the design doc's example.
      - **Issues access (compact before/after):** committed `… accessed via the `gh` CLI.` → local restates the access line as `… accessed via the GitHub MCP server.` → resolved: access = GitHub MCP, the committed tracker-identity sentence retained.
      - **Health cadence (one line, form-vs-argument):** committed `/loop 15m`; local sets cadence `30m` → resolved: monitor loops every 30m; only the cadence value changes; the `/loop` command form is tool-forced, so a local file attempting to change the command form is ignored and warned per req 16.
  11. **Authoring and confirm-before-write rules.** The supported authoring path is hand-authoring: a developer copies the relevant committed block(s) and edits the value(s), reusing the same headings, bullet labels, and named sub-statements so no new syntax is introduced; no dedicated interactive authoring flow exists for v1. The orchestrator MAY (but need not) mention the local-override option when a developer clearly expresses a local-only runtime preference; no proactive intent-detection is required. If the orchestrator ever writes `.rp.local.md` on a developer's behalf, it first shows the proposed content and asks for explicit confirmation, and it never overwrites an existing `.rp.local.md` without explicit approval. State that a local override is partial by design, so the don't-fabricate-a-complete-file concern from `setup.md` does not apply.
  12. **Assisted-mode inertness note (req 24).** Overrides only take effect where the overridden convention is actually exercised. In assisted runs no agents or monitors are spawned, so Agent-models and Health-monitoring overrides have no effect, while the Issues access-mechanism override still applies (the orchestrator itself reads and writes the tracker).
- **Depends on:** none.
- **Traces to:** Spec requirements 1, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24; Design-doc "Components → New components", "Interfaces and Data Flow" (all subsections), "Key Decisions" (Read-from-main-root, Fail-soft, Sibling local-overrides.md, Match-only-off-names, `(non-overridable)` marker, Batched summary, Closed in-scope subset, Confirm-before-write).
- **Acceptance:**
  - The new file `skills/radical-pipelines/reference/conventions/local-overrides.md` exists.
  - It states the fixed filename `.rp.local.md` and that its location is the same directory as the committed `.rp.md` (the project main checkout root).
  - It prescribes resolving the main root as `dirname( git rev-parse --git-common-dir )` and explicitly says NOT to use `git rev-parse --show-toplevel`.
  - It states the override is read from the main root and merged in memory and is never copied or written into the worktree.
  - It states the step is idempotent and re-resolved on every load with nothing persisted.
  - It states fail-soft: an unresolvable main root or unreadable/unparseable `.rp.local.md` is treated as "no override present" and never routes to setup or hard-stops.
  - It defines the three unit shapes (labeled bullet → map-merge over labels; named prose sub-statement → heading + named clause, never free-substring; atomic convention → whole unit) and states a unit value is replaced wholesale with no partial blending.
  - It states that an entry mapping to no committed-named unit is warn-and-ignored as malformed.
  - It defines the three overridability groups with exactly the members listed (overridable: Agent models, Health cadence, Issues access; locked-shared: commit format, artifact folder, pipeline slug, branch names, worktree naming, Issues tracker identity; tool-forced: worktree/branch-name/team-spawning/health-monitor command forms) and notes the cadence argument remains overridable though `/loop` form is tool-forced.
  - It documents the `(non-overridable)` parenthetical marker at both whole-convention and single-unit granularity and states it is distinct from inherent locks.
  - It contains the batched, present-only summary block with `Applied:` / `Ignored:` / `Warning:` sections and the one-line-per-item ignored template.
  - It states the three reason substrings verbatim and exclusively (req 15 "the project marked this unit non-overridable"; req 16 exactly one of "shared across collaborators" / "forced by the active tool"; req 17 "could not be applied (unrecognized or malformed unit)").
  - It states the absent-file behavior emits nothing and the present-and-clean behavior emits header plus an `Applied:` line.
  - It prescribes `git check-ignore .rp.local.md` from the main root (exit 1 → warn) as functional and independent of merge outcome.
  - It contains the three worked examples (Agent-models full map-merge, Issues-access before/after, Health-cadence form-vs-argument) consistent with the design doc.
  - It contains the confirm-before-write rule (show content, ask explicit confirmation, never overwrite an existing `.rp.local.md` without approval) and states hand-authoring is the supported path and the orchestrator may optionally mention the option.
  - It contains the assisted-mode inertness note (Agent-models/Health overrides inert in assisted runs; Issues access still applies).

### Task 2: Wire the loader gate to route to `local-overrides.md` on the PASS branch

- **Goal:** Add a thin `## Local overrides` step to `load.md` that fires only on the required-completeness PASS branch and routes to `local-overrides.md`, plus a guard sentence that the completeness decision is final. Keep the existing read, conventions table, and missing-conventions gate byte-for-byte unchanged.
- **Files to change:** EDIT `skills/radical-pipelines/reference/conventions/load.md`.
- **Changes:**
  - Leave the existing `# Load Conventions` intro, `## Conventions` table (the 9-row table), and `## Missing conventions` gate unchanged.
  - In the `## Missing conventions` section, on the PASS branch ("If all required conventions are available, continue the workflow unchanged"), add or adjust wording so it routes into the new step rather than ending the flow, and add a guard sentence stating that the completeness decision is final — the local-override step that follows runs only on PASS, operates on an already-valid base, and can never make a required convention read as missing or re-open the completeness decision.
  - Add a new `## Local overrides` section AFTER the `## Missing conventions` gate. It must: fire only on the PASS branch; state that override resolution runs strictly after the committed conventions pass the required-completeness check; and route to `local-overrides.md` for the full procedure (resolve main root, probe `.rp.local.md`, merge per named unit, emit the batched summary). It must NOT restate the full merge mechanism — that lives in `local-overrides.md`.
- **Depends on:** Task 1 (the section it routes to must exist).
- **Traces to:** Spec requirements 5, 6; Design-doc "Components → Modified components → load.md", "Interfaces and Data Flow → Data flow", "Key Decisions → Insert the override step after the required-completeness PASS", "Key Decisions → Put the full mechanism in a new sibling local-overrides.md".
- **Acceptance:**
  - `load.md` contains a `## Local overrides` section positioned after the `## Missing conventions` gate.
  - That section states the override step fires only on the required-completeness PASS branch and runs strictly after the committed conventions pass the completeness check.
  - That section routes to `local-overrides.md` and does not restate the full merge mechanism.
  - `load.md` contains a guard sentence stating the completeness decision is final and the local-override step cannot re-open it or make a required convention read as missing.
  - The existing `## Conventions` 9-row table and the FAIL-branch wording ("Read `setup.md`, explain what is missing, and offer to run the setup flow") remain unchanged.

### Task 3: Update the setup flow to add the `.rp.local.md` ignore entry, reword the "only entry" statements, cross-reference `local-overrides.md`, and offer the optional breadcrumb

- **Goal:** Make the project setup flow add the `.rp.local.md` entry to the committed `.gitignore` alongside the existing worktree-folder entry, reword the two sites that imply the worktree folder is the only required ignore entry, cross-reference `local-overrides.md`, and add an optional `.rp.md` breadcrumb offer at step 5.
- **Files to change:** EDIT `skills/radical-pipelines/reference/conventions/setup.md`.
- **Changes:**
  - **At the Artifact-storage explainer bullet (the `- A `.gitignore` entry for the worktree folder used by the active agentic coding tool.` line, ~:114):** extend the explainer so it names a second always-required entry, `.rp.local.md`, keeping it consistent with step 6 (e.g. note the worktree-folder entry per active tool AND the always-required `.rp.local.md` entry).
  - **At step 6 "Set up git ignore" (~:197):** replace "This is the only entry Radical Pipelines requires." with a purpose-stating, count-agnostic reword that names both the worktree-folder entry (per active tool) and the always-required `.rp.local.md` entry, with the "never committed" rationale for `.rp.local.md`. Update the step so it appends `.rp.local.md` to the entries it adds, and add a cross-reference to `local-overrides.md`. Write this prose to be true for any conforming consumer; do NOT describe this repo's current `.gitignore` as the exemplar (it lacks the worktree-folder line — see scope guard in Task 6).
  - **Leave the fork reminder (~:201) as-is** — it reads naturally as plural; `.rp.local.md` is one more line in whichever `.gitignore` setup manages.
  - **At step 5 "Write human-readable Markdown" (~:188–193):** add an optional one-line `.rp.md` breadcrumb offer pointing at `local-overrides.md` — asked, not forced; part of the owner-confirmed `.rp.md` content; advertising the capability without implying a `.rp.local.md` already exists.
  - Do not otherwise change the setup flow's structure or the other conventions it collects.
- **Depends on:** Task 1 (cross-reference and breadcrumb point at `local-overrides.md`).
- **Traces to:** Spec requirements 2, 20, 23; Design-doc "Components → Modified components → setup.md", "Interfaces and Data Flow → Setup-flow interface changes", "Discoverability touchpoints", "Key Decisions → Scope guards on the dogfood repo (a)".
- **Acceptance:**
  - The Artifact-storage explainer in `setup.md` names `.rp.local.md` as a second always-required `.gitignore` entry alongside the worktree-folder entry.
  - Step 6 no longer states the worktree folder is "the only entry Radical Pipelines requires"; it names both the worktree-folder entry and the always-required `.rp.local.md` entry with the "never committed" rationale, and instructs appending `.rp.local.md` to the ignore entries.
  - Step 6 contains a cross-reference to `local-overrides.md`.
  - Step 5 contains an optional `.rp.md` breadcrumb offer pointing at `local-overrides.md`, framed as asked-not-forced.
  - The reworded prose is generic to any conforming consumer and does not present this repo's current `.gitignore` as the prescribed shape.
  - The fork reminder line is unchanged.

### Task 4: Extend the SKILL.md conventions blurb to mention `.rp.local.md`

- **Goal:** Make the local-override capability discoverable from the orchestrator's top-level map without opening `load.md`, by adding one clause to the "Project conventions" sentence.
- **Files to change:** EDIT `skills/radical-pipelines/SKILL.md`.
- **Changes:** In the `## Project conventions` section (around the sentence at ~:46 "See `reference/conventions/load.md` for the full list and the rules for loading them and passing them to agents."), add a one-clause extension mentioning that a developer may place a git-ignored `.rp.local.md` to locally override a restricted subset of conventions, pointing to the convention-loading docs. Keep it to roughly one clause/sentence; do not restate the mechanism.
- **Depends on:** Task 1 (the capability the clause advertises is defined there; conceptual dependency). May be done after Task 2 but does not require it.
- **Traces to:** Spec requirement 20; Design-doc "Components → Modified components → SKILL.md", "Discoverability touchpoints → 4".
- **Acceptance:**
  - The `## Project conventions` section of `SKILL.md` mentions `.rp.local.md` as a git-ignored, per-developer local override of a restricted subset of conventions.
  - The mention is a brief clause/sentence and does not restate the full merge mechanism.
  - The existing pointer to `reference/conventions/load.md` is preserved.

### Task 5: Add a Configuration paragraph to README.md advertising the capability

- **Goal:** Add a short standalone paragraph to the README Configuration section that advertises the local-override capability and links the canonical doc.
- **Files to change:** EDIT `README.md`.
- **Changes:** Add a new standalone paragraph in the `## Configuration` section, placed after the existing paragraph that currently ends around line 157 (the `Agent models` block paragraph). The paragraph must state: the fixed filename `.rp.local.md` and that it sits alongside the committed `.rp.md`; the merge rule (local wins per named unit, committed inherits where the local file is silent, map-merge for keyed lists); the overridable-versus-shared guidance (overridable: agent models, health-monitoring cadence, Issues access-mechanism; shared/tool-forced conventions are not overridable); that the file is git-ignored and never affects others; and a link to the canonical doc `skills/radical-pipelines/reference/conventions/local-overrides.md`. Do not alter the surrounding paragraphs.
- **Depends on:** Task 1 (the link target must exist).
- **Traces to:** Spec requirement 20; Design-doc "Components → Modified components → README.md", "Discoverability touchpoints → 4".

  Note: the README narrative is also referenced by the doc plan, but per the orchestrator's framing this functional discoverability touchpoint (req 20 requires the conventions-overview mention to exist) is owned here. The doc-plan phase may further refine README prose; this task delivers the required touchpoint content.
- **Acceptance:**
  - The `## Configuration` section of `README.md` contains a new standalone paragraph about `.rp.local.md`.
  - The paragraph states the filename and alongside-`.rp.md` location, the merge rule (local-wins per named unit, committed inherits, map-merge for keyed lists), the overridable subset (agent models, health cadence, Issues access) versus shared/tool-forced conventions, and that the file is git-ignored and never affects others.
  - The paragraph links to `skills/radical-pipelines/reference/conventions/local-overrides.md`.
  - Surrounding Configuration paragraphs are unchanged.

### Task 6: Add `.rp.local.md` to the dogfood repo's root `.gitignore`

- **Goal:** Add the `.rp.local.md` entry to this repository's own committed `.gitignore`, which both ships the dogfood instance's ignore entry and exercises the setup change (req 23 / its acceptance criterion). Honor scope guard (a): do NOT add the missing worktree-folder line.
- **Files to change:** EDIT `.gitignore` (repo root).
- **Changes:** Append a single line `.rp.local.md` to the existing root `.gitignore` (which currently contains only `node_modules/`, `.env`, `.env.local`). Do NOT add the missing `.claude/worktrees/` worktree-folder line — that pre-existing dogfood-hygiene gap is explicitly out of scope per the design doc's scope guard (a).
- **Depends on:** Task 3 (the setup instruction this entry conforms to is finalized there; conceptual dependency — this entry is the conforming application of that instruction). Can be performed independently, but should reflect the same entry setup.md prescribes.
- **Traces to:** Spec requirements 2, 23; the "setup completes → committed `.gitignore` contains a `.rp.local.md` entry" acceptance criterion; Design-doc "Untouched-but-relevant components → consuming project's committed `.gitignore`", "Key Decisions → Scope guards on the dogfood repo (a)".
- **Acceptance:**
  - The root `.gitignore` contains a line that ignores `.rp.local.md`.
  - Running `git check-ignore .rp.local.md` from the repo root exits 0 (file would be ignored).
  - The root `.gitignore` does NOT add a `.claude/worktrees/` (worktree-folder) entry as part of this change.

### Task 7: Add a changeset entry for the feature

- **Goal:** Record the feature in the changesets workflow so the package changelog and version bump pick it up, matching the repo's established changeset conventions.
- **Files to change:** NEW `.changeset/<descriptive-name>.md` (e.g. `.changeset/local-convention-overrides.md`).
- **Changes:** Create a new changeset Markdown file following the existing repo pattern (see `.changeset/per-agent-model-config.md`): YAML front matter with `"@automattic/radical-pipelines": minor` (a new optional capability that does not break existing consumers, matching the `minor` bump used for the comparable per-agent-model-config feature), followed by a prose summary describing the local, per-developer `.rp.local.md` override capability: the git-ignored override file alongside `.rp.md`, the restricted overridable subset (agent models, health-monitoring cadence, Issues access-mechanism), local-wins-per-named-unit merge with committed inheritance, the never-committed / never-affects-others guarantee, the post-completeness gating, and that it ships as skill documentation (load/setup/SKILL/README plus the new `local-overrides.md` reference). The changeset is warranted because `changedFilePatterns` in `.changeset/config.json` covers `skills/**` and `README.md`, both of which this feature edits.
- **Depends on:** Tasks 1–6 (the changeset summarizes the change surface those tasks deliver; write it last so the description is accurate).
- **Traces to:** Repo changeset convention (`.changeset/config.json` `changedFilePatterns` includes `skills/**` and `README.md`); precedent `.changeset/per-agent-model-config.md`; the orchestrator's instruction to include a changeset task if repo conventions imply one.
- **Acceptance:**
  - A new `.changeset/*.md` file exists with front matter `"@automattic/radical-pipelines": minor`.
  - Its prose describes the `.rp.local.md` local-override capability, naming the overridable subset, the merge rule, the never-committed guarantee, and the post-completeness gating.
  - The file follows the same shape as existing entries in `.changeset/` (front matter delimited by `---`, single prose paragraph).
