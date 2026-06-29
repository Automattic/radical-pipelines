# Docs Plan: Default output rules for pipeline-produced code

## Overview

This feature promotes two always-on output rules into the Radical Pipelines tool — **Rule 1** (a change leaves untouched comments and prose exactly as they were) and **Rule 2** (the shipped host-project product reads as if written by hand, with no trace of the pipeline that produced it, and product commit messages carry no pipeline-naming provenance). It ships entirely as edits to five Markdown agent profiles under `agents/` (the three producing profiles and the two reviewing profiles), with no runtime code. Those profile edits are the feature's *code* and are handled by the code phase; they are not documentation surfaces.

Three documentation surfaces must change to keep the repository in sync with the shipped behavior:

1. A **changeset** under `.changeset/` — mandatory, because the change touches the release-relevant `agents/**` path and CI fails any such PR that lacks one. This is the authoritative release-note record of the feature and becomes both a `CHANGELOG.md` entry and a GitHub Release body.
2. The root **`README.md`** — its value-proposition section advertises the qualities every pipeline run guarantees about its output ("Compounding quality", "Consistent assets"); the always-on output rules add a new such guarantee that an adopter would expect to find documented there.
3. The **marketing website** (`website/demo.js`) — its animated demo depicts an illustrative pipeline run, and one of its depicted commits is a **product** commit (it writes source and test files outside the artifacts folder) whose message carries an agent-name provenance tag — exactly the provenance this feature removes from product commits. Left as-is, the public demo would advertise a behavior the shipped tool no longer produces.

A repository-wide sweep checked `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, the marketing website (`website/index.html`, `website/demo.js`), `SKILL.md`, `AGENTS.md`, `.rp.md`, the changeset config, the PR template, and `pr-description.md`. No **prose** describing the output rules, the commit-provenance behavior, or the review-gate enforcement exists today, so there is no descriptive prose to repair — the changeset and README additions above are net-new. The one out-of-sync surface the sweep found is the website demo's depicted product commit (surface 3): a concrete illustration that, after the feature ships, would contradict the feature's own Requirement 7. Surfaces deliberately **not** touched, and why, are listed under "Surfaces deliberately out of scope".

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

### Task 3: Drop the agent-name provenance tag from the product commit shown in the website demo

- **Goal:** Update the marketing website's animated demo so its one depicted **product** commit no longer shows an agent-name provenance tag in its message, keeping the public-facing illustration consistent with the behavior the tool now guarantees (a product commit carries no pipeline-naming provenance). Leave every artifact-only commit shown on the site untouched — those legitimately keep the tag.
- **Audience:** Website visitors evaluating Radical Pipelines — prospective adopters who watch the demo to see what a run produces and how its commits look.
- **Files to change:** `website/demo.js`.
- **Sections / scope:** The demo is a sequence of illustrative phase steps; one phase-4 step depicts an agent that writes product files (source and tests, paths outside the artifacts folder) and shows an example shell command that commits them. That commit's example message currently carries an agent-name provenance tag; rewrite the depicted message so it carries no pipeline-naming provenance (no agent-name tag, no phase/artifact/task naming) while still reading as a normal commit for that work. The docs-writer identifies the exact step and string by reading the demo data and applying the changed-path test (a depicted commit is a product commit when it writes any path outside the artifacts folder). Touch only the product-commit depiction: do **not** alter the artifact-only commit log shown elsewhere on the site (the `git log` over the artifacts folder, whose entries write only artifact paths and correctly keep the tag per Requirement 8), and do **not** restyle, relabel, or otherwise edit unrelated demo content (Rule 1). The website is not a release-relevant path, so this edit needs no changeset of its own.
- **Depends on:** none
- **Traces to:** Spec Requirement 7 (a product commit carries no pipeline-naming provenance, including no agent-name tag) and Requirement 8 (artifact-only commits are exempt and keep the tag); Spec acceptance "Rule 2 — commit messages and provenance". Keeps the public demo consistent with the user-visible commit behavior produced by Code plan Tasks 1–5.
- **Acceptance:**
  - A website visitor watching the demo sees the depicted product commit (the one that writes source/test files) carry an ordinary commit message with no agent-name tag and no other pipeline-naming provenance.
  - Every depicted artifact-only commit (those writing only paths under the artifacts folder) is left exactly as it was, still carrying its agent-name tag — the edit changes only the product-commit depiction.
  - No unrelated demo content is restyled, relabeled, or reworded (Rule 1: untouched content stays untouched).

## Surfaces deliberately out of scope

These surfaces were swept and intentionally excluded; recording them here keeps a docs-writer from editing them and prevents drift.

- **`.rp.md` "Commit format" convention (lines 49–59).** This is the host project's commit-format *convention* (the tool's configuration input), which the design explicitly leaves **unchanged** — the output rule never reads or alters the host's specific format; it only subtracts pipeline-naming provenance from product commits at authoring time. Editing it would change the very convention the feature is designed to preserve. The README's single mention of "commit format" (in its list of what `.rp.md` contains) likewise remains accurate.
- **The marketing website's artifact-only commit log (`website/index.html`).** The site's `index.html` shows a `git log` taken over the artifacts folder; every entry writes only paths under that folder, so all of those depicted commits are artifact-only and legitimately keep the agent-name tag (Requirement 8). They stay exactly as they are. (The one *product* commit depicted on the site — in `website/demo.js` — is **not** artifact-only and is handled by Task 3, not excluded here. The rest of the website's hand-authored landing prose makes no claim about output quality, comment handling, or product-commit provenance that this feature contradicts, so it needs no change.) The website is not release-relevant and needs no changeset.
- **`CHANGELOG.md`.** Generated by `@changesets/changelog-github` from changesets — contributors never edit it directly. It is covered transitively by Task 1.
- **`SKILL.md`, `AGENTS.md`, and the agent profiles under `agents/`.** These are the tool's instructions/"code", not user- or contributor-facing documentation of the output behavior. The agent-profile edits are the feature's implementation, owned by the code phase; `SKILL.md` and `AGENTS.md` carry no output-quality prose that the feature changes.
- **`CONTRIBUTING.md`, the PR template, `pr-description.md`, the changeset config.** Release-mechanics and PR-process surfaces; none describes the output rules, and the feature changes nothing about how releases, changesets, or PRs work.
