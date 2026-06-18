# Doc Plan: Plan-completed guardrail commands

## Overview

The shipped change unifies the code-plan's separate `## Required test commands`
"floor" with the guardrails convention: a `.rp.md` gate may be marked
plan-completed for some of its agents, the code-plan-writer authors their
feature-scoped command in `code-plan.md`'s new `## Plan-completed guardrails`
section, and the orchestrator resolves it into those agents' guardrails line
before spawn. The "floor / required-test-commands / two command sets" framing is
removed from the live skill tree.

The skill files themselves carry their own documentation; that is the code
phase's deliverable, not this phase's. This phase covers the project's
user-facing docs that describe the changed behavior to outside readers.

### What the docs phase must update

Exactly one user-facing doc carries vocabulary that this change makes stale: the
unreleased v2 changeset `plan-driven-test-selection.md`, whose summary says "the
code plan sets a **required-test-commands floor**." That floor framing is the
exact framing this review-1 change removes, and the changeset is the only
released-facing description of the same v2 work. It is part of the same v2 unit
of work, so its summary is amended in place — not supplemented with a second
changeset.

### What stays untouched (judged independently)

- **README** — the agent roster already lists `code-writer-tdd` and
  `code-writer-e2e`; this change adds and removes no agent. Its guardrail prose
  is generic ("exact commands judged pass/fail by exit code") and carries no
  floor token. The spec and design confirm the README needs no change, and the
  independent judgment here agrees: nothing user-facing in the README describes
  the floor.
- **Website** (`index.html`, `demo.js`) — the "18 agents shipped" count is
  unchanged (no agent added or removed), and the demo names only
  `code-writer-tdd` with a generic `npm test` gate, carrying no floor or
  plan-completed vocabulary. Website edits are not release-relevant
  (CONTRIBUTING) and need no changeset; nothing here describes the changed
  behavior.
- **CHANGELOG.md** — historical, generated at release; never hand-edited.
- **CONTRIBUTING.md** — describes release mechanics, not the guardrails model;
  carries no floor token.
- **`agent-scoped-guardrails.md` changeset** — the sibling #121 changeset
  describes per-agent guardrails (the machinery this change reuses), not the
  floor; it is accurate as-is and untouched.

## Tasks

### D1: Amend the v2 changeset to drop the floor framing

- **Goal:** Rewrite the `plan-driven-test-selection.md` changeset summary so its
  description of plan-phase test selection reflects the unified
  plan-completed-guardrails model and carries no "required-test-commands floor"
  vocabulary, while keeping the other two user-visible v2 shifts (behavior
  verification on the code-reviewer; the `code-writer` split) intact.
- **Audience:** Release-notes / changelog readers — consumers of the package who
  read the generated changelog to learn what changed at feature altitude.
- **Files:** `.changeset/plan-driven-test-selection.md`
- **Sections-scope:** The body summary only. The front matter
  (`@automattic/radical-pipelines`, `minor`) is unchanged — the change is still a
  pre-1.0 feature (CONTRIBUTING bump table; matches the `minor` precedent of the
  sibling `agent-scoped-guardrails` changeset), so no `BREAKING:` prefix and no
  bump-type change.
- **Depends on:** none
- **Traces to:** Spec R4, R8, R10 (floor framing removed; plan now carries
  commands that *complete* the declared guardrails) / Design "Overview", "The
  `## Plan-completed guardrails` section in `code-plan.md`"
- **Acceptance:**
  - The summary no longer contains "required-test-commands floor" or any
    floor / two-command-set vocabulary.
  - It describes plan-phase test selection as the code plan completing the
    project's declared guardrails per pipeline (the plan-supplied feature command
    for a marked gate), at feature altitude — no implementation detail
    (no `plan-completed-for` field name, no resolution-step mechanics, no spawn
    fields).
  - The other two v2 shifts already in the summary (behavior verification moving
    to the code-reviewer re-driving planned e2e flows; the `code-writer` split
    into `code-writer-tdd` / `code-writer-e2e` dispatched by task `Type`) are
    preserved and unchanged in substance.
  - The front matter stays `@automattic/radical-pipelines` / `minor`; no
    `BREAKING:` prefix; no second changeset is added.
  - `node scripts/validate-changesets.mjs` passes.
  - No migration or back-compat prose is added.

### D2: Verify the user-facing doc surface is otherwise unchanged

- **Goal:** Confirm no other user-facing doc carries floor vocabulary or stale
  behavior, so D1 is the complete docs-phase surface.
- **Audience:** N/A (verification task; protects the doc surface from drift).
- **Files:** none (no edit unless the sweep surfaces a stale user-facing token,
  which would be fixed in the owning doc — not by adding a file).
- **Sections-scope:** N/A
- **Depends on:** D1
- **Traces to:** Spec R9, R10 (README and website untouched; every floor token
  retargeted) / Design "Untouched by design"
- **Acceptance:**
  - A sweep of the user-facing docs (`README.md`, `CONTRIBUTING.md`, `website/`,
    `CHANGELOG.md`, the other `.changeset/*.md` files) for floor-family tokens
    ("required test command", "required-test-commands", "floor",
    "two command set") finds no match describing this behavior.
  - `README.md`, `CONTRIBUTING.md`, the website, and `CHANGELOG.md` are
    unchanged by this phase.
  - The website "agents shipped" count and the demo's writer name are accurate
    for the unchanged agent roster.
