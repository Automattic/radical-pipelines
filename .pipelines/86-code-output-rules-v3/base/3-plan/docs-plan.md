# Docs Plan: Default output rule — host-project output never references the run that produced it

## Overview

The code phase adds one always-on rule to five agent profiles under `agents/` (a prose-only edit): everything a producing agent writes into the host project — code, comments, identifiers, string/test names, messages, docs, files it creates, and commit-message descriptive content — must read as if written by hand and carry no pointer back at the specific run that produced it; the two reviewer profiles gain a matching detection check. This is a behavior change to shipped, release-relevant files (`agents/**`), so the only external/host-project documentation surface it genuinely warrants is a **changeset** — the repository's committed record of the change that CI requires on every release-relevant PR and that feeds the auto-generated changelog and GitHub Release. A repository-wide sweep found no other host-project documentation surface that describes this rule or the agents' internal guidelines/checklists today: the top-level `README.md`, the `website/`, `CONTRIBUTING.md`, `AGENTS.md`, and the `skills/` reference files all describe the agents only at the phase / agent-name / high-level-responsibility level and never reproduce any profile's internal Guidelines dispositions or review-checklist items, so adding a bullet to five profiles leaves none of them out of sync. `CHANGELOG.md` is auto-generated from the changeset during the release flow and needs no manual edit.

## Guardrail scopes

No guardrail scopes were passed to this phase, and this project defines no Guardrails convention, so there are no scoped gates to fill.

| Gate | Scope |
| ---- | ----- |
| None | None  |

## Tasks

### Task 1: Add a changeset recording the new output rule

- **Goal:** Provide the committed `.changeset/*.md` file that the repository requires for any change touching a release-relevant path (`agents/**`), so the change is recorded, satisfies CI's Changeset Gate, and surfaces in the next release's changelog and GitHub Release.
- **Audience:** Maintainers and downstream consumers of Radical Pipelines reading the changelog / GitHub Release to understand what changed in a version — people who consume the agent profiles as a Claude Code plugin or Pi package, not people editing the profiles.
- **Files to change:** Create one new file under `.changeset/` (a `.changeset/*.md` changeset, authored per the repository's changeset workflow). Do not edit `CHANGELOG.md` by hand — it is regenerated from the changeset by the release flow.
- **Sections / scope:** A single changeset entry: front matter declaring the package and bump type, plus a one-line imperative summary describing the change. The summary describes the user-facing behavior — that every pipeline run now, by default, produces host-project output carrying no reference to the run that produced it, enforced at the existing review gate — in the vocabulary of someone reading release notes, not in terms of "task N" or the internal profile mechanics. Choose the bump type per the repository's bump table and pre-1.0 policy: this adds new, enforced behavior to shipped profiles (it is not a typo fix and not a no-op prose tweak), so it warrants a non-empty bump reflecting a backwards-compatible behavior addition — not an empty changeset. It is not a breaking change, so no `BREAKING:` prefix.
- **Depends on:** none
- **Traces to:** Code plan Tasks 1–5 (all five profile edits touch `agents/**`, the release-relevant path that triggers the changeset requirement); Spec R1 (a single, always-on default) and R9 (enforcement at the existing gate) as the behavior the summary describes.
- **Acceptance:**
  - The PR that carries the five profile edits includes exactly one committed changeset file under `.changeset/`, so the Changeset Gate's presence check passes for this release-relevant change.
  - The changeset has valid front matter and a non-empty imperative one-line summary; the summary conveys, to a release-notes reader, that host-project output no longer references the run that produced it and that this is enforced by the reviewer at the existing review gate.
  - The declared bump type reflects a backwards-compatible behavior addition under the repository's pre-1.0 policy (a real change, not an empty/no-op changeset, and not a breaking change).
  - The changeset summary is itself clean host-project output: it reads as a hand-written release note and does not point back at this run's own artifacts (no task numbers, requirement/criterion IDs, or artifact names cited as its authority), while any agent-name tag the commit convention appends remains allowed.

## Surfaces reviewed and intentionally not changed

The following surfaces were swept and require no documentation task; recording them so the docs phase does not silently omit a surface that later drifts.

- **`README.md`** — Describes the pipeline, its phases, and the agents only by name and high-level responsibility (e.g. the flat list of agent profiles and the "Phase 4 / Phase 5" summaries). It reproduces no agent's internal Guidelines disposition or review checklist, so a new bullet in five profiles does not change any README prose. Its "Changelog and versioning" section is generic mechanics that points to `CONTRIBUTING.md` and is unaffected.
- **`website/` (`index.html`, `demo.js`, assets)** — A marketing site and a hardcoded illustrative demo of a fictional run. It does not document the agents' guidelines/checklists, and `website/**` is explicitly not a release-relevant path. The demo's example producer commit subject is already a hand-written-style message with the exempt agent-name tag, so it neither describes nor violates the new rule.
- **`CONTRIBUTING.md`** — Documents release/changeset mechanics only; carries nothing about agent output rules.
- **`AGENTS.md` / `CLAUDE.md`** — Authoring rules for the skill and profiles (a meta file, not release-relevant). It does not enumerate any agent's output rules and needs no change.
- **`skills/` reference files (including the phase-4 and phase-5 references)** — Describe the phases and conventions but, by the project's own rule, never reproduce an agent profile's internal Guidelines or checklist; a repo-wide sweep found none of the rule's wording or the deleted line here.
- **`CHANGELOG.md`** — Auto-generated from the changeset by `@changesets/changelog-github` during the release flow; not hand-edited. Task 1's changeset is what populates it; no separate task is needed.
