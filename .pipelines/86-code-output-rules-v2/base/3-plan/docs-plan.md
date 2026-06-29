# Docs Plan: Default output rules for pipeline-produced code

## Overview

This feature promotes two always-on output rules into the Radical Pipelines tool — **Rule 1** (a change leaves untouched comments and prose exactly as they were) and **Rule 2** (the shipped host-project product reads as if written by hand, with no trace of the pipeline that produced it, and product commit messages carry no pipeline-naming provenance). It ships entirely as edits to five Markdown agent profiles under `agents/` (the three producing profiles and the two reviewing profiles), with no runtime code. Those profile edits are the feature's *code* and are handled by the code phase; they are not documentation surfaces.

Two documentation surfaces must change to keep the repository in sync with the shipped behavior:

1. A **changeset** under `.changeset/` — mandatory, because the change touches the release-relevant `agents/**` path and CI fails any such PR that lacks one. This is the authoritative release-note record of the feature and becomes both a `CHANGELOG.md` entry and a GitHub Release body.
2. The root **`README.md`** — its value-proposition section advertises the qualities every pipeline run guarantees about its output ("Compounding quality", "Consistent assets"); the always-on output rules add a new such guarantee that an adopter would expect to find documented there.

A repository-wide sweep found that **no existing user- or contributor-facing prose currently describes the output rules, the commit-provenance behavior, or the review-gate enforcement** (surfaces checked: `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, the marketing website, `SKILL.md`, `AGENTS.md`, `.rp.md`, the changeset config, the PR template, `pr-description.md`). There is therefore no out-of-sync prose to repair — only the two additive surfaces above. Surfaces deliberately **not** touched, and why, are listed under "Surfaces deliberately out of scope".

## Guardrail scopes

No guardrails are defined for this project.

| Gate | Scope |
| ---- | ----- |
| None | None |

## Tasks

### Task 1: Add the release changeset for the output-rules feature

- **Goal:** Record the feature as a committed changeset so the release flow folds it into `CHANGELOG.md` and the next GitHub Release, and so the PR satisfies the mandatory Changeset Gate (the change touches `agents/**`, a release-relevant path).
- **Audience:** Adopters and contributors reading the changelog / GitHub Release notes to learn what changed in this version.
- **Files to change:** a new `.changeset/<descriptive-name>.md` file (created via the project's changeset flow; do not hand-edit `CHANGELOG.md`, which is generated).
- **Sections / scope:** The changeset's front matter declares the package and bump level; its body is the one-paragraph, imperative-mood release note. Bump level is `minor` — this is a new feature, and pre-1.0 the project maps features to `minor` (see `CONTRIBUTING.md` "Bump types" and "Pre-1.0 policy"). It is not a breaking change, so it carries no `BREAKING:` prefix. The body should convey, in plain release-note terms, that pipeline-produced host-project product is now held to two always-on rules — untouched comments and prose are left as they were, and the shipped product (code, tests, docs, and commit messages) reads as written by hand with no trace of the pipeline — enforced at the existing per-phase review gate, with no opt-out. Write it from the host-repository consumer's point of view; do not enumerate which agent profiles changed.
- **Depends on:** none
- **Traces to:** Spec Overview and Requirements 1, 4, 7, 12; Code plan Tasks 1–5 (all of which edit `agents/**`, the release-relevant path that triggers the changeset requirement).
- **Acceptance:**
  - A single new changeset file exists under `.changeset/` declaring the project package at a `minor` bump and carrying no `BREAKING:` prefix.
  - Its body is an imperative-mood release note that tells a changelog reader the tool now guarantees, with no opt-out, that pipeline-produced product leaves untouched comments and prose alone and reads as if written by hand with no trace of the pipeline.
  - The release note is written for the host-repository consumer and names no internal agent profile, phase, or artifact path of this run.
  - The body uses pipeline vocabulary only as the subject matter of the feature; it does not attribute itself to this run's pipeline, phases, artifacts, or agents.

### Task 2: Document the always-on output-quality guarantee in the README value proposition

- **Goal:** Add the new always-on output guarantee to the README so an adopter evaluating or running Radical Pipelines learns that pipeline-produced product is held to the output rules by default — fitting it alongside the existing guarantees the README already advertises.
- **Audience:** Adopters and end users of the tool (people choosing or running pipelines on their own host projects), not contributors to this repository's internals.
- **Files to change:** `README.md`.
- **Sections / scope:** Place the addition where the README describes the qualities every run guarantees about its output — the "What this unlocks" area (currently home to "Compounding quality" and "Consistent assets") is the natural fit; the docs-writer picks the exact location by reading the section as it stands. Cover, at the right altitude for marketing/overview prose: (a) that the rules are always-on with no per-run or per-project opt-out and require no owner action; (b) Rule 1 — a change leaves comments and prose it did not touch exactly as they were; (c) Rule 2 — the shipped product (code, tests, documentation, and commit messages) reads as if written by hand, with no trace of the pipeline that produced it; (d) that compliance is enforced at the existing per-phase review gate. Keep it to overview prose — do not restate the canonical rule text from the agent profiles, do not reproduce the referent-based discriminator's negative examples, and do not name individual agent profiles. Because the README is a release-relevant path, this edit is covered by the Task 1 changeset and needs no changeset of its own.
- **Depends on:** Task 1
- **Traces to:** Spec Requirements 1 (always-on, no opt-out), 2–3 (Rule 1), 4–5 (Rule 2 content and external docs), 12 (enforcement at the review gate); Spec acceptance "Always-on application". Documents the user-visible guarantee produced by Code plan Tasks 1–5.
- **Acceptance:**
  - A reader of the README learns that every pipeline run, with no opt-out and no owner action, holds its produced product to the output rules.
  - The README conveys both rules at overview altitude: untouched comments and prose are preserved (Rule 1), and the shipped product — including commit messages — reads as if written by hand with no trace of the pipeline (Rule 2).
  - The README conveys that the rules are enforced at the existing per-phase review gate.
  - The addition sits within the existing value-proposition flow and reads consistently with the surrounding README voice; it does not restate the canonical profile wording, reproduce the rule's negative examples, or name individual agent profiles.
  - The README's own prose uses pipeline vocabulary only as subject matter and contains no reference identifying this run's pipeline, phases, artifacts, or agents.

## Surfaces deliberately out of scope

These surfaces were swept and intentionally excluded; recording them here keeps a docs-writer from editing them and prevents drift.

- **`.rp.md` "Commit format" convention (lines 49–59).** This is the host project's commit-format *convention* (the tool's configuration input), which the design explicitly leaves **unchanged** — the output rule never reads or alters the host's specific format; it only subtracts pipeline-naming provenance from product commits at authoring time. Editing it would change the very convention the feature is designed to preserve. The README's single mention of "commit format" (in its list of what `.rp.md` contains) likewise remains accurate.
- **The marketing website (`website/index.html`, `website/demo.js`).** Hand-authored landing content. It makes no claim about output quality, comment handling, or product-commit provenance that this feature contradicts; its illustrative commit-log entries are all artifact-only commits, which legitimately keep the agent-name tag (Requirement 8). The website is not release-relevant and needs no changeset; no change is required.
- **`CHANGELOG.md`.** Generated by `@changesets/changelog-github` from changesets — contributors never edit it directly. It is covered transitively by Task 1.
- **`SKILL.md`, `AGENTS.md`, and the agent profiles under `agents/`.** These are the tool's instructions/"code", not user- or contributor-facing documentation of the output behavior. The agent-profile edits are the feature's implementation, owned by the code phase; `SKILL.md` and `AGENTS.md` carry no output-quality prose that the feature changes.
- **`CONTRIBUTING.md`, the PR template, `pr-description.md`, the changeset config.** Release-mechanics and PR-process surfaces; none describes the output rules, and the feature changes nothing about how releases, changesets, or PRs work.
