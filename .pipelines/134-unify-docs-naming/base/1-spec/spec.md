# Spec: Unify the documentation concept on plural "docs"

## Overview

The pipeline's documentation concept is spelled inconsistently: the same thing is singular `doc` in some places and plural `docs` in others. Phase 5's outward identity is already plural (folder `5-docs`, "Docs" phase label, `docs-review-*.md`, `docs-summary.md`), but the agents and phase-3 plan artifacts that feed it are still singular (`doc-writer`, `doc-reviewer`, `doc-plan-writer`, `doc-plan-reviewer`, `doc-plan.md`, "Doc Plan"). The result is contradictions such as a singular-named `doc-reviewer` producing the plural-named `docs-review-approved.md`.

This change standardizes the documentation concept on the plural form `docs` everywhere the skill and agent definitions name it, plus the derived copies of those names that ship alongside them. The naming rule, derived from the existing phase-5 convention (and matching how the code phase forms `code-writer`/`code-plan.md` and the design-doc phase forms `design-doc-*`): the documentation phase's leading concept noun is `docs`; every compound identifier is `docs-<role-or-suffix>`, changing only the leading `doc` → `docs` and preserving the rest of each compound exactly. The phase-2 `design-doc` concept (a single design *document*) and the long English word "documentation" are deliberately distinct and remain unchanged.

## Requirements

1. **Agent names are plural.** The four documentation-concept agents are named `docs-plan-writer`, `docs-plan-reviewer`, `docs-writer`, and `docs-reviewer` — in their `name:` frontmatter and in every prose, table, and Mermaid-label reference across the skill and agent definitions. No agent uses the singular `doc-` form for this concept.

2. **Agent definition filenames match their names.** The four agent definition files are `agents/docs-plan-writer.md`, `agents/docs-plan-reviewer.md`, `agents/docs-writer.md`, and `agents/docs-reviewer.md`, preserving the repo-wide convention that every agent's filename stem equals its `name:` (the agents are discovered by filename, so the file must be renamed for them to remain discoverable).

3. **Plan artifact identifiers are plural.** The phase-3 documentation-plan artifact is `docs-plan.md`, and its review artifacts are `docs-plan-review-N-rejected.md` and `docs-plan-review-approved.md`, in every place the skill and agents read or write them — including the pipeline completion predicate and the phase-5 input list.

4. **Display labels and headings are plural.** Title-case labels and template headings for the concept read `Docs Plan`, `Docs Plan Review`, `Docs Plan Topics`, `Docs Writer`, `Docs Reviewer`, `Docs Plan Writer`, and `Docs Plan Reviewer` (for example, the plan template title `# Docs Plan: <feature name>`).

5. **Lowercase prose is plural.** Running-text forms read "docs plan", "docs task", "docs-plan topic", "docs planning", and "docs-writers"/"Docs-writers". No singular "doc plan"/"doc task" remains for the concept.

6. **Derived copies of the names stay in sync.** The `.rp.md` Agent models table lists the four agents under their plural names (so the orchestrator resolves their models by an exact name match), and the `website/demo.js` pipeline demo uses the plural agent names and plural plan-artifact names (so the shipped homepage demo no longer spells the same concept singular and plural at once).

7. **The pending changeset uses the plural names.** The unreleased changeset fragment `.changeset/agent-scoped-guardrails.md` refers to `docs-writer` and `docs-reviewer`, so the changelog it eventually publishes is consistent with the renamed agents.

8. **The phase-2 `design-doc` concept is unchanged.** Every `design-doc` identifier, file, frontmatter name, artifact, Mermaid label, and "design doc" prose reference remains exactly as it is.

## Out of Scope

- **The phase-2 `design-doc` concept.** Singular by design — "doc" there means a single design *document*, a distinct concept whose singular form preserves a useful distinction from "docs" = documentation. Untouched, including the substrings `doc-writer`/`doc-reviewer` that appear inside `design-doc-writer`/`design-doc-reviewer`.
- **The long English word "documentation".** It coexists with the `docs` identifier by design (e.g. the agent `description:` lines that say "documentation plan", `SKILL.md`'s "Documentation (both internal and external)", and docs-phase prose like "documentation tasks"). This is not a singular-vs-plural defect and is not normalized to "docs".
- **`.pipelines/**`.** Frozen historical records of past pipeline runs. Many legitimately contain the old singular names as the artifacts those runs produced; rewriting them would falsify history, and they are not the skill's source of truth. (This pipeline's own in-flight artifacts use the new `docs-*` names going forward.)
- **Already-published `CHANGELOG.md`.** A historical release record.
- **Files with no documentation-concept references.** README, CONTRIBUTING, scripts/tests, `package.json`, the plugin/marketplace manifests, `.pi/settings.json`, and `AGENTS.md`/`CLAUDE.md`.
- **Generic English "document"/"documentation" and host-project documentation references** (e.g. "inline documentation", "read reference docs"). These are not the pipeline phase concept.

## Acceptance Criteria

- Given the four documentation-concept agents, when their `name:` frontmatter is inspected, then it reads `docs-plan-writer`, `docs-plan-reviewer`, `docs-writer`, and `docs-reviewer` respectively, and each agent's definition file is named to match (`agents/docs-plan-writer.md`, `agents/docs-plan-reviewer.md`, `agents/docs-writer.md`, `agents/docs-reviewer.md`).

- Given the phase-3 plan phase, when the skill or an agent reads or writes the documentation-plan artifacts, then it refers to `docs-plan.md`, `docs-plan-review-N-rejected.md`, and `docs-plan-review-approved.md`, including the pipeline completion predicate (`3-plan/docs-plan-review-approved.md`) and the phase-5 input list.

- Given any display label, template heading, or Mermaid node for the concept, when it is rendered, then it uses the plural form (`Docs Plan`, `Docs Plan Review`, `Docs Plan Topics`, `Docs Writer`, `Docs Reviewer`, `Docs Plan Writer`, `Docs Plan Reviewer`), e.g. the plan template title `# Docs Plan: <feature name>`.

- Given the derived name copies, when `.rp.md`'s Agent models table and `website/demo.js` are inspected, then both list the four agents under their plural `docs-*` names, and `website/demo.js` uses the plural plan-artifact names; and when `.changeset/agent-scoped-guardrails.md` is inspected, then it names `docs-writer` and `docs-reviewer`.

- Given the in-scope trees (`skills`, `agents`, `.rp.md`, `website`, `.changeset`) and excluding `.pipelines/`, when an implementer runs the design-doc-anchored, match-counting search below, then it returns zero matches after the change (the same searches return the catalogued occurrences before the change). Counting matches rather than lines is required, because some lines carry both an in-scope `doc-plan.md` token and a protected `design-doc.md` token (e.g. `setup.md`, `doc-reviewer.md`).
  - `grep -roP '(?<!design-)\bdoc-(plan-writer|plan-reviewer|plan-review|plan|writer|reviewer)\b' skills agents .rp.md website .changeset`
  - `grep -roP '(?<!Design )\b[Dd]oc [Pp]lan\b' skills agents .rp.md website .changeset`
  - `grep -roP '(?<!Design )\bDoc (Writer|Reviewer)\b' skills agents .rp.md website .changeset`
  - `grep -roP '\bdoc task\b|\bdoc-plan topic\b|\bdoc planning\b' skills agents .rp.md website .changeset`

- Given the absence checks above could be satisfied by deletion, when the new names are checked positively, then they exist — e.g. `agents/docs-writer.md` exists with `name: docs-writer` (and likewise for the other three renamed agents).

- Given the phase-2 `design-doc` concept, when its identifiers, files, frontmatter names, artifacts, Mermaid labels, and "design doc" prose are inspected after the change, then they are byte-for-byte unchanged from before.
