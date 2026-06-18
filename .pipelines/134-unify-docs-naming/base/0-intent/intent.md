# Unify the documentation concept on plural "docs"

> Source: Automattic/radical-pipelines#134 (https://github.com/Automattic/radical-pipelines/issues/134).
> This file is self-contained; agents do not need to open the source issue.

## Goal

The documentation concept is named consistently across the skill and agent definitions — the same thing is never spelled singular `doc` in one place and plural `docs` in another.

## Constraints

- Standardize on the plural form `docs` for the documentation concept (phase 5 and the phase-3 documentation plan).
- Leave the phase-2 `design-doc` concept untouched — there "doc" means a single design *document*, a distinct concept, and keeping it singular preserves a useful distinction from "docs" = documentation.

## Context

- The agent layer is currently uniformly singular (`doc-plan-writer`, `doc-plan-reviewer`, `doc-writer`, `doc-reviewer`) and the phase-3 plan artifacts use singular (`doc-plan.md`, "Doc Plan"), while phase 5's outward identity is already plural ("Docs", `5-docs`, `docs-review-*`). The inconsistency is the singular stragglers; phase 2 (`design-doc`) is a separate concept.
