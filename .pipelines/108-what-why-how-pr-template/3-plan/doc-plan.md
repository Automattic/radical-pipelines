# Doc plan — Add a What/Why/How pull request template

## Overview

The code phase ships exactly one file, `.github/PULL_REQUEST_TEMPLATE.md`, which
GitHub auto-fills into the PR description box (code-plan Task 1). The template is
**largely self-documenting**: its author guidance lives in HTML-comment hints that
are visible in the edit box, and its single visible `## Changeset` footer *links
out to* `CONTRIBUTING.md` rather than restating any rules (design KD3, KD6). The
information flow is template → `CONTRIBUTING.md`, not the reverse.

I swept the repository end-to-end for documentation surfaces that reference the
pull-request / contribution process or that a contributor would consult before
opening a PR. Surfaces checked and their disposition:

- **`CONTRIBUTING.md`** (repo root) — the authoritative home for changeset/release
  mechanics. It is the changeset footer's link target, but it currently makes **no
  mention of a PR template** and gives no "how to open a PR / what goes in the
  description" guidance. This is the one surface a doc task addresses (Task 1 —
  discoverability only).
- **`README.md`** — has a "Changelog and versioning → Adding a changeset" section
  that already delegates changeset detail to `CONTRIBUTING.md`; it has no
  "Contributing" / "how to open a PR" narrative and no PR-template reference. The
  template is not a release-relevant or usage concern the README covers. **No
  change needed.**
- **`AGENTS.md`** — cross-agent project rules plus the standing changeset /
  README-update rule; no PR-description authoring guidance and no place a template
  reference belongs. **No change needed.**
- **`.changeset/README.md`** — the changesets cheat-sheet; cross-links `README.md`
  and `CONTRIBUTING.md` for changeset/release flow only; no PR-template surface.
  **No change needed.**
- **`skills/radical-pipelines/reference/conventions/setup.md`** — its "PR"
  references describe the *pipeline's own upstream-PR transformation for downstream
  projects*, which the spec explicitly puts **out of scope** (the deliverable is
  this repo's own template, not a downstream/generated one — AC10). **No change
  needed.**
- **`website/index.html`** — "PR" appears only as marketing prose ("Everyone else
  sees the PR at the end"); not contributor-process documentation. **No change
  needed.**

Net result: **1 optional doc task**, scoped to `CONTRIBUTING.md`. The task is
discoverability-only and is **not required by the spec** (the spec adds no
documentation requirement, and AC9/AC10 confine the shipped change to
`.github/**`). It is included because `CONTRIBUTING.md` is the changeset footer's
link target and the natural place a contributor learns the repo's PR conventions,
so a one-line "a PR template now exists; fill it in" pointer closes the loop and
aids discovery. If the doc-writer, on reading the shipped template and
`CONTRIBUTING.md` in phase 5, judges the mention to be redundant noise (the
template is self-documenting and CONTRIBUTING is purely release-mechanics today),
recording that decision and making no edit is an acceptable outcome — see Task 1's
Acceptance.

No doc surface needs to *restate* the template's content (that would duplicate the
shipped file and risk drift), and no new documentation is planned for features the
spec did not ask for (no Testing section, no AI-disclosure note — both omitted by
design).

## Tasks

### Task 1 — Note the new PR template in `CONTRIBUTING.md` (discoverability pointer)

**Goal:** Make a contributor reading `CONTRIBUTING.md` aware that opening a pull
request now pre-fills a What/Why/How template, and that the template's changeset
footer points back into this document. A brief pointer only — it must **not**
restate the template's body, the What/Why/How prompts, or the changeset/version
rules (those live in the template and in CONTRIBUTING's existing changeset
sections respectively). The mention exists to aid discovery and to close the loop
between the template's `CONTRIBUTING.md` link and this document.

**Audience:** Contributors (human or agent) opening a pull request against the
`radical-pipelines` repository, and maintainers maintaining the contribution docs.

**Files to change:**
- `CONTRIBUTING.md` (repo root)

**Sections-scope:** A single short addition. Preferred home is a brief pointer near
the top of the contribution flow (e.g. alongside the existing "Adding a changeset"
framing) or a small dedicated note; the doc-writer chooses placement by reading the
shipped `CONTRIBUTING.md` structure in phase 5. Do **not** expand or restructure the
changeset/release sections, and do **not** add a new top-level release/versioning
heading. Touch only the new pointer text.

**Depends on:** Code Task 1 (`.github/PULL_REQUEST_TEMPLATE.md` must exist and be
readable so the doc-writer can describe it accurately — its real headings, its
`Closes #` stub, and its `## Changeset` footer link target).

**Traces to:**
- Spec — no explicit documentation requirement; supports the spirit of Requirement
  5 / AC5 (the template's changeset footer points readers to `CONTRIBUTING.md`),
  by making `CONTRIBUTING.md` aware of, and reciprocally linking, the template that
  links to it. Stays within AC10 because it edits only `CONTRIBUTING.md` (a non
  release-relevant meta file — see CONTRIBUTING's own "no changeset" list), not the
  template or any CI/workflow.
- Code task — code-plan Task 1 (`.github/PULL_REQUEST_TEMPLATE.md`).

**Acceptance (drift-resistant):**
- After phase 5, a contributor reading `CONTRIBUTING.md` can learn that opening a
  PR pre-fills a What/Why/How pull-request template and is prompted to link the
  issue and (when relevant) add a changeset — without `CONTRIBUTING.md` reproducing
  the template's section prompts or its exact wording.
- The mention references the template by its real role/location (the repo's default
  PR template that GitHub auto-fills), consistent with the file the code phase
  actually shipped; it introduces no second copy of the changeset rules and no
  contradiction with the template's changeset footer.
- The edit is confined to `CONTRIBUTING.md`; it adds no checkbox checklist, no
  Gutenberg/WordPress content, and does not alter the existing changeset/release
  mechanics sections beyond inserting the pointer.
- The change touches only a non release-relevant path (`CONTRIBUTING.md` is not in
  `changedFilePatterns`), so it does not, by itself, demand a changeset or affect
  the Changeset Gate.
- **Valid skip:** if the doc-writer, after reading the shipped template and the
  current `CONTRIBUTING.md`, concludes the template is sufficiently self-documenting
  that a CONTRIBUTING pointer would be redundant, recording that reasoning (in the
  phase-5 doc artifact) and making no edit satisfies this task. The task must not be
  closed silently — either the pointer lands or the no-change rationale is stated.
