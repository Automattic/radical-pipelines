# Support local, per-developer overrides of a consuming project's conventions

_Source: GitHub issue [Automattic/radical-pipelines#91](https://github.com/Automattic/radical-pipelines/issues/91)._

## Goal

In any project that uses Radical Pipelines, a developer can override that project's Radical Pipelines conventions locally — for their own working copy or machine — without editing the project's committed `.rp.md` and without those changes being committed or affecting other contributors.

## Context

- Radical Pipelines loads each consuming project's conventions from that project's committed `.rp.md`. This is a capability of the Radical Pipelines product, applied in every consuming project — _not_ about this repository's own `.rp.md`, which is merely the dogfood instance of the same mechanism.
- There is currently no sanctioned way for a developer in a consuming project to deviate from those shared conventions locally; editing the committed `.rp.md` risks committing machine- or person-specific settings.

## Assumptions / directions to explore

_(open — to confirm or revise in later phases)_

- A git-ignored file such as `.rp.local.md` (exact name TBD) sitting alongside a project's `.rp.md`, overriding or merging over the shared conventions.
- The convention loader (`conventions/load.md`) would need to discover and apply it.
- Loading/merge precedence (local over shared; whole-file vs. per-key override) is a design question, not settled here.
