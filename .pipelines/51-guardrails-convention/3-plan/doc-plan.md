# Doc plan: Guardrails convention

Issue #51. This plan covers the **docs phase** (Phase 5) for the Guardrails feature.
It is standalone: it synthesizes the spec (`1-spec/spec.md`, R1–R17 / AC1–AC12), the
design doc (`2-design-doc/design-doc.md`, D1–D9, §9), and the code plan
(`3-plan/code-plan.md`, T1–T10) into an ordered set of human-facing documentation
tasks. Each task names what to document, where, for whom, and how to verify it —
not the wording.

The docs phase owns the **user-facing** documentation the spec's Out-of-Scope and
design §9 explicitly route here: the README's configuration narrative, the
website/docs site, and the per-tool human rule files
(`conventions/claude-code.md`, `conventions/pi.md`). The code phase already
restructured `.rp.md`, `load.md`, `setup.md`, the four agents, and `pi.md`'s
renumber reference, and authored the changeset (code-plan T2–T10); none of those
are re-planned here.

All paths are repo-relative to the worktree root
`/Users/darerodz/Code/radical-pipelines/.claude/worktrees/51-guardrails-convention`.
Line numbers cite file state at planning time; treat them as anchors, not
contracts — match on text.

## Overview

### What the docs phase must accomplish

The code phase changed the project's mental model in one externally-visible way: a
project's `.rp.md` is no longer "conventions only, organized as a shared section
plus a per-tool section." It now holds **two sibling top-level sections** —
`## Conventions` (everything it held before) and a new `## Guardrails` (a project's
named, exact-command, exit-code-judged, mandatory verification gates, applied to
the code and/or docs phase, tool-agnostic, committed-only). The human-facing docs
must teach this new structure and the Guardrails concept, and must stop describing
`.rp.md` with the now-stale "shared section / per-tool section" framing.

### Repo sweep result — where the stale/missing human-facing text lives

A full sweep of every human-facing surface (README, website, `CONTRIBUTING.md`,
`AGENTS.md`, the per-tool rule files, `SKILL.md`, and `.changeset/README.md`)
found the documentation surface area is small and concentrated:

- **`README.md` — the primary surface.** Its "Configuration" section narrates
  `.rp.md`'s structure for human readers and is the surface both the spec's
  Out-of-Scope note and design §9 single out. Three places describe `.rp.md` as
  "shared conventions" / "shared section … per-tool section" and none mention
  guardrails: `README.md:143` ("A project's shared conventions live in a committed
  `.rp.md` file"), `README.md:145` (setup "separates shared project guidance from
  guidance specific to the active agentic coding tool"), and most directly
  `README.md:159` ("organized as a shared section … followed by a per-tool
  section"). This is the same staleness D2 fixed inside `.rp.md` itself — design §9
  explicitly defers the README copy of it to the docs phase. → **Task 1.**
- **Website (`website/index.html`, `website/demo.js`) — no change needed.** The
  site is high-level marketing: six phases, inspectable artifacts, "runs on Claude
  Code and Pi." It carries **no** `.rp.md` / conventions / guardrails / verification
  narrative. `demo.js` uses `npm test` only as a transcript prop in a sped-up demo,
  not as a documentation claim. Nothing on the site describes the structure that
  changed, so there is nothing to update. Recorded as **evaluated and excluded**
  (Task 3 verifies this stays true).
- **Per-tool human rule files (`conventions/claude-code.md`, `conventions/pi.md`)
  — no human-doc change needed.** Their "canonical `.rp.md` content" blocks contain
  only tool-specific convention subsections (Worktrees, Branch names, …). They make
  **no** "shared section" structural claim and carry **no** guardrails content, so
  they do not go stale under the restructure. `pi.md`'s one stale item (a `setup.md`
  step-number reference) is already fixed by code-plan T5 (renumber-proofing), which
  is not human-facing documentation. Recorded as **evaluated and excluded** (Task 3
  confirms no residual "shared section" framing or stale step-number claim).
- **`SKILL.md`, `CONTRIBUTING.md`, `AGENTS.md` — no change needed.** `SKILL.md`'s
  "Project conventions" section only points to `load.md` (generic, no structural
  claim); its phase table "behavior verification" entry stays accurate (behavior
  verification is preserved, R15). `CONTRIBUTING.md`/CI use "gate" to mean the
  **Changeset Gate (CI)** — spec Out-of-Scope and design §9 say **do not** rename CI
  "gate" naming. `AGENTS.md` has no conventions/guardrails narrative. All recorded
  as **evaluated and excluded**.
- **No hand-maintained changelog.** Releases use Changesets; the changelog is
  generated from `.changeset/*.md`. The PR's changeset is already code-plan T10.
  There is **no** separate manual changelog-writing surface, so no changelog doc
  task is planned (per the team-lead's boundary).

### Net scope

The docs phase reduces to **one substantive documentation task** (Task 1: the
README configuration narrative) plus **one verification/sweep task** (Task 3) that
closes the loop and confirms the deliberately-excluded surfaces stayed clean. Task
2 covers the docs phase's own changeset/changelog obligation only if the docs-phase
edits independently require one (see Task 2's note — the code phase's T10 changeset
already covers `README.md`, so Task 2 is conditional).

### Audience

All tasks target **human readers of the repository**: prospective adopters and
contributors reading the README to understand how to configure a project, and
maintainers keeping the public-facing description of `.rp.md` accurate. (The
agent-facing surfaces — `load.md`, `setup.md`, the agent profiles — were the code
phase's job and are out of scope here.)

### Ordering

- **Task 1** is the only content task and has no dependency on Task 2/3; do it
  first.
- **Task 2** (changeset/changelog obligation check) depends on knowing the final
  docs-phase edit surface, so it follows Task 1.
- **Task 3** (final human-facing accuracy sweep) is last — it verifies Task 1's
  result and re-confirms the excluded surfaces.

---

## Task 1 — Update the README configuration narrative to the Conventions + Guardrails model

**Goal.** Bring the README's human-facing description of `.rp.md` in line with the
restructured file: teach that `.rp.md` now holds two sibling top-level sections —
the project's **conventions** and its **guardrails** — and introduce the Guardrails
concept (named, exact-command, exit-code-judged, mandatory verification gates that
apply to the code and/or docs phase, tool-agnostic, committed-only). Remove the
now-stale "shared section / per-tool section" framing the restructure invalidated.

**Audience.** Prospective adopters and contributors reading the README to learn how
a project is configured and what `.rp.md` contains.

**Files to change.**
- `README.md`

**Sections-scope.**
- The **Configuration** section (`README.md:141`–`159`), specifically the
  structural-description sentences at `:143`, `:145`, and `:159`. The local-overrides
  sentences (`:147`, `:149`) and the orchestrator/agent/AGENTS.md paragraphs
  (`:151`–`:157`) are about other topics; touch them only where they assert the
  "shared/per-tool conventions-only" structure and would otherwise contradict the
  new model. Do **not** restructure or rewrite the whole section — make the smallest
  edits that make the structural description correct and add the Guardrails concept.

**What to cover (outcomes, not wording).**
- `.rp.md` is organized as **two top-level sibling sections**: `## Conventions`
  (the project's pipeline conventions — task source, slug format, artifact folder,
  commit rules, worktrees, branch names, team spawning, etc.) and `## Guardrails`
  (the project's verification gates). Replace the "shared section followed by a
  per-tool section" description (`:159`) — that framing described an internal
  conventions split that the restructure does not surface as the file's top-level
  shape.
- The **Guardrails concept**, briefly and accurately: a guardrail is an exact
  command (e.g. `npm test`), judged pass/fail by exit code, mandatory within the
  phase(s) it applies to; the only phase targets are **code** and **docs**;
  guardrails are **tool-agnostic** (the same command regardless of the active CLI,
  so there are no per-tool guardrail variants); and they are **optional** (a project
  may declare none, which is a complete, valid state).
- A pointer to the authoritative definition is sufficient for depth — link the
  Guardrails description to the convention loader
  (`./skills/radical-pipelines/reference/conventions/load.md`), the file that now
  carries the canonical definition (code-plan T3), mirroring how `:149` already
  links to the Local overrides section there.
- Optionally note this repository's own dogfooded guardrails (`npm test`,
  `node scripts/validate-changesets.mjs`) consistent with the worked example in the
  root `.rp.md`, only if it reads naturally in the existing narrative — not required.
- Preserve the rest of the Configuration section's meaning (setup flow, per-tool
  *conventions*, local overrides for conventions, the multi-CLI dogfooding note).
  The per-tool framing remains correct **for conventions**; only the claim that the
  file's top-level structure is "shared + per-tool" and the omission of guardrails
  are what change.

**Depends on.** Nothing in the docs phase. (Reflects code-plan T2's restructured
`.rp.md` and T3's `load.md` definition, both produced by the code phase.)

**Traces to.** Spec Out-of-Scope ("User-facing documentation … README … is the
responsibility of this pipeline's docs phase"); design §9 (README "still describes
`.rp.md` as having 'a per-tool section' (stale)"); code-plan T2 (the `.rp.md`
restructure this documents), T3 (the canonical definition this links to). Concept
content traces to R1–R6, R17 / AC1–AC3, AC12.

**Acceptance.**
- The README's Configuration section no longer describes `.rp.md`'s top-level
  structure as a "shared section followed by a per-tool section"; it describes the
  two sibling sections `## Conventions` and `## Guardrails`.
- The Guardrails concept is introduced accurately: exact command, exit-code
  pass/fail, mandatory, code and/or docs phase, tool-agnostic, optional — with no
  per-tool guardrail variant implied.
- The Guardrails description points the reader to the convention loader for the
  authoritative definition.
- The remaining Configuration content (setup flow, per-tool conventions, local
  overrides, multi-CLI dogfooding) is preserved in meaning; per-tool framing is kept
  only where it correctly applies to **conventions**.
- No agent-facing files, the website, or the per-tool rule files are edited by this
  task.

---

## Task 2 — Reconcile the docs-phase changeset / changelog obligation

**Goal.** Ensure the docs phase's own edits do not leave the PR without the
changeset the repository's standing rule requires, **without** duplicating the
code-phase changeset (code-plan T10) or hand-writing a changelog.

**Audience.** Maintainers / the release flow (the changeset feeds the generated
changelog and version bump); indirectly, future readers of the changelog.

**Files to change.**
- Potentially `.changeset/<existing-or-new-slug>.md` — **conditional**, see below.
  Likely **no new file**.

**Sections-scope.** The PR's changeset front matter and summary only.

**What to cover (outcomes, not wording).**
- Confirm the PR already carries the changeset authored in the code phase
  (code-plan T10: `"@automattic/radical-pipelines": minor`). That changeset's
  `changedFilePatterns` coverage **already includes `README.md`** (design Risk 1 and
  code-plan T10 cite `README.md` among the release-relevant paths the changeset
  accounts for), so Task 1's README edit is already represented.
- Because of that, **do not** author a second changeset. If, after Task 1, the
  existing changeset's summary no longer reflects the full shipped scope (e.g. it
  omits that the README/user-facing docs were updated to the Conventions +
  Guardrails model), make a **minimal** adjustment to that single changeset's
  summary so it stays accurate — do not change its bump type (`minor`) or add a new
  file.
- This task writes **no** hand-maintained changelog: the changelog is generated from
  `.changeset/*.md` by the release tooling; there is no manual changelog surface in
  this repo.

**Depends on.** Task 1 (the final docs-phase edit surface determines whether the
existing changeset summary needs a touch).

**Traces to.** Design Risk 1 / §7 / §10 and code-plan T10 (the single PR changeset
that already covers `README.md`); the repo's standing changeset rule
(`AGENTS.md` / `CONTRIBUTING.md` "When a changeset is required").

**Acceptance.**
- The PR carries exactly one feature changeset for #51
  (`"@automattic/radical-pipelines": minor`); no duplicate changeset is created by
  the docs phase.
- If touched, the changeset summary accurately reflects that user-facing docs were
  updated to the Conventions + Guardrails model; bump type stays `minor`.
- `node scripts/validate-changesets.mjs` (the declared changeset-shape guardrail for
  the docs phase) passes.
- No hand-maintained changelog file is created or edited.

---

## Task 3 — Final human-facing accuracy sweep

**Goal.** Verify the docs phase left every human-facing surface accurate and
internally consistent with the restructured `.rp.md`, and confirm the deliberately
excluded surfaces stayed clean (no residual "shared section / per-tool section"
framing of the file's top-level structure; no stale step-number claim).

**Audience.** Human readers across all public-facing docs (the verification protects
their accuracy).

**Files to change.** None expected (this is a verification task). If the sweep finds
a residual stale human-facing structural claim, fix it in-place within the same
docs-phase scope (README / per-tool rule files / website) and re-run the sweep.

**Sections-scope.** Repository-wide human-facing markdown and the website
(`README.md`, `website/`, `conventions/claude-code.md`, `conventions/pi.md`,
`SKILL.md`, `CONTRIBUTING.md`, `AGENTS.md`).

**What to cover (outcomes, not wording).**
- **README:** the Configuration section now describes the `## Conventions` +
  `## Guardrails` two-section structure and introduces the Guardrails concept
  (Task 1 outcome); no remaining sentence claims `.rp.md`'s top-level structure is
  "shared section + per-tool section."
- **Website:** still carries no `.rp.md` / conventions / guardrails structural
  narrative — confirm nothing in `index.html` / `demo.js` now contradicts the new
  model (it described none before, so this should remain a no-op).
- **Per-tool rule files:** `claude-code.md` / `pi.md` canonical-content blocks still
  describe only tool-specific convention subsections, make no "shared section"
  top-level claim, and reference `setup.md`'s agent-install step **by title**
  (code-plan T5's renumber-proofing), with no stale numbered step reference
  remaining.
- **SKILL.md / CONTRIBUTING.md / AGENTS.md:** unchanged and still accurate; CI's
  "gate" naming is intentionally preserved (not renamed).
- **Cross-references:** any human-facing link that points into the conventions docs
  (e.g. the README's link to the loader's Local overrides / a new Guardrails
  pointer) resolves to a real anchor/section.

**Depends on.** Task 1 (and Task 2 if it touched the changeset).

**Traces to.** Spec Out-of-Scope (docs phase owns user-facing documentation); design
§9 (enumerates the user-facing surfaces and the explicit "do not rename CI gate"
constraint); confirms Task 1's outcome and the excluded-surface decisions in the
Overview.

**Acceptance.**
- No human-facing surface describes `.rp.md`'s top-level structure as
  "shared section + per-tool section"; the two-section `## Conventions` +
  `## Guardrails` model is the only structural description.
- The website and per-tool rule files contain no claim contradicting the new model;
  no stale `setup.md` step-number reference remains in `pi.md`.
- CI's "gate" naming is unchanged (not renamed to "guardrail").
- All human-facing cross-references into the conventions docs resolve.
