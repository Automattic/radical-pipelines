# Spec Research: Guardrails convention

> Verbatim copy of `0-prompt/prompt.md`:

# Add a Guardrails convention to formalize deterministic code-phase verification

## Goal

The code phase has a formally declared, deterministic, machine-checkable set of
**guardrails** (gates) it must pass before it can complete. Each gate is an exact
command that passes or fails by exit code and is mandatory. "Guardrails" exists as
a first-class project-level convention — a contract that is discoverable, captured
at setup time, declared in this project's own conventions, and referenced by name
by the code-phase agents — rather than the implicit "host project's verification
convention" the agents reach for today.

## Context

- The code-phase agents (`code-writer`, `code-reviewer`) already instruct
  themselves to read *the host project's verification convention* and treat its
  gates — lint, typecheck, unit tests, e2e, build, behavior verification — as
  mandatory, looping on them until they pass. But this convention isn't formally
  listed in `conventions/load.md`, isn't asked about during `conventions/setup.md`,
  and isn't declared in this repo's own `.claude/.rp.md` / `.pi/.rp.md`. The agents
  reach for something that, today, does not formally exist as a project-level
  contract.
- This is the Ralph Orchestrator *backpressure* model: keep agents in the loop
  until the deterministic checks all pass. The convention should make those gates
  explicit instead of implicit.
  Reference: https://mikeyobrien.github.io/ralph-orchestrator/concepts/backpressure/
- This work **supersedes #18** — Guardrails subsumes E2E along with lint,
  typecheck, build, behavior verification, and similar gates.

## Assumptions / directions to explore

The following is the owner's proposed direction (open, may be revised):

- Add a "Guardrails" row to `conventions/load.md` as a required convention.
- Add a Guardrails section to `conventions/setup.md` that captures the list of gate commands.
- Update `code-writer.md` and `code-reviewer.md` to read the **Guardrails** convention by name instead of *the host project's verification convention*.
- Populate Guardrails in this repo's `.claude/.rp.md` and `.pi/.rp.md` as the reference example.

## Q&A

### Q1 — Scope breadth: which agents adopt the Guardrails name?

The issue scopes the rename to `code-writer.md` and `code-reviewer.md`. But the
identical phrase "the host project's verification convention" also drives the docs
phase (`doc-writer.md`, `doc-reviewer.md`) for doc gates. If only the code-phase
agents switch to "Guardrails" while the doc agents keep saying "verification
convention," the two phases will name the same underlying thing differently.

Should the Guardrails convention replace that concept everywhere it appears, or
stay limited to the code phase as the issue literally scopes?

**Answer:** The owner reframed the question. The issue is old and partly outdated;
these changes should be reflected in the spec (and possibly the prompt/issue):

- **Restructure `.rp.md` into a general config file** with separate top-level
  sections: the existing convention content moves under a **Conventions** section,
  and a new **Guardrails** section is added. Guardrails are deliberately *not*
  conventions — the separation reflects that distinction. (Per owner + @luisherranz,
  issue comment
  https://github.com/Automattic/radical-pipelines/issues/51#issuecomment-4658783995.)
- **Phase applicability is declared inside the Guardrails section** — i.e. each
  guardrail says which phase(s) it applies to, rather than the question being
  answered globally / hardcoded in agent prose.
- The **guardrail definition from the issue still applies** (each gate: an exact
  command, pass/fail by exit code, mandatory). Other details in the issue may be
  out of date but remain relevant.

### Q2 — What counts as a guardrail? (the behavior-verification boundary)

The issue contains an internal tension. It defines a guardrail as *"an exact
command, pass/fail by exit code, mandatory"* (owner reaffirmed this), yet also says
"Guardrails subsumes E2E along with lint, typecheck, build, **behavior
verification**." Behavior verification, as the agents use it today, produces
*evidence* (screenshots, transcripts, output samples) and a human/agent judgement —
not an exit code. Those two framings don't fully fit together.

How should a guardrail be defined?

_(Owner asked to clarify the difference between "exit-code commands only" and
"command-only, verify via command." Clarification given: both treat a guardrail as
an exact command judged by exit code; they differ on behavior verification — option 1
keeps it as a separate evidence-based step that coexists with guardrails, while
option 3 collapses everything to commands and removes the standalone evidence step.)_

**Answer:** Commands only + separate evidence (option 1). A **guardrail is an exact
command, judged by exit code (0 = pass), mandatory**. **Behavior verification is NOT
a guardrail** — it remains a separate, evidence-based agent responsibility
(screenshots / transcripts / output samples), unchanged from today. Two mechanisms
coexist: deterministic command guardrails + the existing evidence-based behavior
verification. This resolves the issue's "subsumes behavior verification" wording:
Guardrails subsume the *command-checkable* gates (lint, typecheck, unit, e2e, build,
etc.); behavior verification persists alongside, not as a guardrail.

### Q3 — Which phases can a guardrail be assigned to?

Per Q1, phase applicability is data in the Guardrails section. For the spec to be
testable, the allowed set of phase targets must be defined. The only phases whose
agents consult "the verification convention" today are the code phase
(`code-writer`/`code-reviewer`) and the docs phase (`doc-writer`/`doc-reviewer`).

**Answer:** Code + Docs. A guardrail may target the code phase and/or the docs
phase. (These are exactly the phases whose agents run gates today; keeps the model
bounded to current reality.)

### Q4 — Is declaring guardrails required, and how is "no command gates" expressed?

Guardrails are no longer a "convention," so the `load.md` required-conventions
completeness check does not gate on them. Today `code-writer.md` treats a missing
verification convention as a *blocker*, while the doc agents note "many projects
enumerate none" (none is normal for docs). Need to decide whether a project must
declare guardrails, and what an absent/empty Guardrails section means for the
agents (blocker vs. "nothing to run").

**Answer:** Optional; absent/empty = none. The Guardrails section is optional. An
absent or empty Guardrails section means "no command gates for that phase" and is
**not a blocker** — agents run whatever guardrails exist for their phase, and zero
is acceptable. Consequence: the current rule in `code-writer.md` ("if the
verification convention is missing/unrunnable, that IS a blocker") must change —
having no guardrails is fine; a *defined* guardrail that fails is still work (fix
it), not a blocker.

### Q5 — Validator for the Guardrails section, or agent-read prose only?

`.rp.md` is not parsed by any code today (finding 7). The guardrail *commands* are
deterministic (exit codes), but the Guardrails *section* itself would just be prose
the agents read. We could optionally add a script that validates the section is
well-formed (each guardrail has a command + valid phase tag), which would add real
executable code and a unit test to the code phase.

**Answer:** Prose only — no validator. Guardrails live in `.rp.md` as prose the
agents read, consistent with every other convention. No parser, no new executable
code. Acceptance is verified by file inspection plus the repo's existing command
gates.

### Q6 — Are guardrails tool-specific (per-tool split) or tool-agnostic?

Owner was unsure whether the per-tool config split should be out of scope, and
asked for an investigation of how Radical Pipelines handles per-tool config today.

Investigation (sources: `.rp.md`, `conventions/claude-code.md`, `conventions/pi.md`,
`conventions/setup.md`, `conventions/load.md`):

- There is **one committed root `.rp.md`**. Its header documents a model of a
  **shared section + per-tool sections** (Claude Code, Pi): shared conventions apply
  to every tool; tool-specific ones get their own section.
- The only **tool-specific** conventions are **Worktrees, Branch names, Team
  spawning, Health monitoring** — they differ per tool (`EnterWorktree` /
  `TeamCreate` / `/loop` vs `@zenobius/pi-worktrees` / `pi-teams`). Their canonical
  per-tool text lives in `claude-code.md` / `pi.md`; `setup.md` step 1 reads the
  active tool's file and step 5 writes that variant into `.rp.md`.
- The issue's `.claude/.rp.md` + `.pi/.rp.md` (two files) reflects an **older
  layout**; today it is a single root `.rp.md` (finding 3).

Reasoning for guardrails specifically: a guardrail is a **project verification
command** (`npm test`, `node scripts/validate-changesets.mjs`). These commands are
**identical regardless of the agentic coding tool** — there is nothing
Claude-Code- or Pi-specific about `npm test`. Unlike worktrees/teams/health, gate
commands do not vary per tool. Therefore guardrails are **tool-agnostic** and belong
in a single shared `## Guardrails` section, not a per-tool split.

**Answer / decision:** Confirmed — guardrails are **tool-agnostic** → one shared
`## Guardrails` section in the single root `.rp.md`; no per-tool guardrail variants.
The per-tool *split of guardrails* stays out of scope for that reason (gate commands
don't vary by tool). Redesigning the conventions' own shared-vs-per-tool
organization is also out of scope — the restructure merely relocates existing
convention content under a `## Conventions` heading and adds `## Guardrails`
alongside it.

## Research

Findings gathered by the orchestrator before/while running the Q&A (worktree
`worktree-51-guardrails-convention`, branched from `trunk`). Sources are repo paths.

1. **"Verification convention" is referenced in two phases, not just the code phase.**
   The issue scopes only `code-writer.md` and `code-reviewer.md`, but the same
   phrase *"the host project's verification convention"* also drives the **docs
   phase**:
   - Code phase: `agents/code-writer.md` (lines 13, 36, 46, 51, 70) and
     `agents/code-reviewer.md` (lines 18, 32, 36, 68, 98).
   - Docs phase: `agents/doc-writer.md` (lines 35, 40, 45, 65) and
     `agents/doc-reviewer.md` (lines 33, 98, 99) — they consult the same convention
     for *documentation gates* (link check, markdown lint, render, doc tests),
     noting "many projects enumerate none."
   → Open question: does Guardrails rename/replace the term everywhere (consistency)
   or only in the code phase (issue's literal scope)?

2. **Established pattern for adding a convention.** A convention is added in two
   places: a row in `skills/radical-pipelines/reference/conventions/load.md`'s
   table (with a Required? column), and a collection section in
   `skills/radical-pipelines/reference/conventions/setup.md`. Current `load.md`
   table lists 9 conventions; `setup.md` collects 10 (it also collects "Artifact
   storage", which is not yet a row in the `load.md` table — a pre-existing minor
   drift, not part of this issue).

3. **`.rp.md` location in this repo no longer matches the issue's premise.** The
   issue says to populate `.claude/.rp.md` and `.pi/.rp.md`. Today the repo has a
   **single committed root `.rp.md`** (shared across tools) plus a git-ignored
   `.rp.local.md` for per-developer **local overrides** (see `load.md` "Local
   overrides" + `.gitignore`). There is `.pi/settings.json` but **no `.pi/.rp.md`
   and no `.claude/.rp.md`**. So "populate `.claude/.rp.md` and `.pi/.rp.md`"
   should most likely become "populate the root `.rp.md`" — a stale premise to
   confirm with the owner.

4. **This repo's actual gates (for the reference example).** `package.json` exposes
   `test` = `node --test 'scripts/test/**/*.test.mjs'`. CI (`.github/workflows/
   changeset-gate.yml`) runs, on PRs to `trunk`: `npm test`,
   `node scripts/validate-changesets.mjs`, and `npx changeset status --since=...`
   (require a changeset for release-relevant changes). There is **no lint,
   typecheck, build, or e2e** in this project (it is mostly Markdown + small Node
   scripts). So this repo's Guardrails reference example is a small, real set.

5. **No behavior change to the code-phase loop.** `code-writer.md` already loops on
   the gates until they pass and treats a missing/unrunnable verification
   convention as a blocker. The issue is about *formalizing/naming* the contract,
   not changing the loop's runtime behavior.

6. **`.rp.md` restructure (from Q1 / issue comment).** The committed root `.rp.md`
   currently is essentially one "Shared conventions" block. The agreed direction is
   to reshape it into a general config file with separate top-level sections —
   **Conventions** (existing content, moved unchanged) and **Guardrails** (new) —
   because guardrails are not conventions. Per-guardrail phase applicability lives
   in the Guardrails section. This reframes several of the issue's original scope
   bullets:
   - "Add a Guardrails *row* to `load.md`'s convention table" → likely instead:
     `load.md` documents the new `.rp.md` structure and how guardrails are loaded,
     rather than listing Guardrails as a convention row. (To confirm in Q&A.)
   - `setup.md` still needs a step to capture guardrails, but framed as a separate
     concept, not another convention.
   - "Populate `.claude/.rp.md` and `.pi/.rp.md`" → populate the single root
     `.rp.md` (see finding 3).

7. **`.rp.md` is not parsed by code — only read by agents.** No script/skill/agent
   parses `.rp.md` (`grep` of `scripts/`, `skills/`, `agents/`, `*.json` finds no
   programmatic reads). It is consumed by the orchestrator and agents as prose.
   Implications: (a) "machine-checkable" applies to the guardrail *commands* (run by
   the agent, judged by exit code), not to parsing `.rp.md`; (b) this issue is almost
   entirely Markdown/contract edits — `.rp.md`, `conventions/load.md`,
   `conventions/setup.md`, and the four agent prompt files — with little or no new
   executable code; (c) acceptance is verifiable by file inspection plus this repo's
   own command gates. `.rp.md` is also referenced in `README.md` and the per-tool
   rule files `conventions/claude-code.md` and `conventions/pi.md`; doc-facing
   updates there belong to this pipeline's **docs phase (5)**, not the spec.

## Out of Scope

Candidates collected during Q&A (to be confirmed with the owner in step 4):

1. **Per-tool split of guardrails** — guardrails are tool-agnostic (gate commands
   like `npm test` don't vary by tool), so they live in one shared `## Guardrails`
   section in the single root `.rp.md`. No `.claude/.rp.md` / `.pi/.rp.md` split, and
   no per-tool guardrail variants (Q6). Also out of scope: redesigning the
   conventions' own shared-vs-per-tool organization (the restructure only relocates
   existing convention content under `## Conventions`).
2. **A Guardrails section parser/validator** — guardrails are agent-read prose only
   (Q5). No parser, no new executable code.
3. **Redesigning the code-phase loop / backpressure mechanics** — the agents already
   loop on gates until they pass. This work renames/formalizes the contract and
   changes the "no guardrails" rule (Q4); it does not redesign the loop.
4. **The behavior-verification mechanism** — unchanged; stays a separate
   evidence-based agent step (Q2). Only its relationship to guardrails is clarified.
5. **Inventing new gate tooling for this repo** — the repo's `.rp.md` declares its
   *existing* real gates only; no new lint/typecheck/build tooling is added.
6. **Guardrails for phases other than code and docs** — only code + docs are valid
   targets (Q3).
7. **User-facing documentation** (README, website, per-tool rule files
   `claude-code.md` / `pi.md`) — produced by this pipeline's **docs phase (5)**, not
   specified or written here.
8. **Tracker actions for #18** — closing/relabelling the superseded issue is a
   tracker chore, not part of this code change.

## Consolidated Requirements

1. Introduce **Guardrails** as a first-class, named concept, distinct from
   conventions. A guardrail is a **mandatory, deterministic verification gate**
   defined as an **exact command judged by exit code** (0 = pass).
2. Guardrails are **tool-agnostic** and declared in a single shared `## Guardrails`
   section of the project's root `.rp.md` (no per-tool variants).
3. Each guardrail declares: a human-readable **name/label**, the **exact command**,
   and the **phase(s)** it applies to.
4. Valid phase targets are **code** and **docs** only.
5. Guardrails are **optional**: an absent or empty `## Guardrails` section means "no
   command gates" and is **not a blocker**. Each agent runs only the guardrails
   applicable to its phase; zero is acceptable. A *defined* guardrail that fails is
   work to fix, not a blocker.
6. **Behavior verification** remains a separate, evidence-based agent responsibility
   and is **not** a guardrail. It persists as a self-contained evidence step and no
   longer depends on a named "verification convention."
7. **Restructure `.rp.md`** into top-level `## Conventions` (existing convention
   content relocated unchanged) and `## Guardrails` (new), reflecting that guardrails
   are not conventions.
8. **`conventions/load.md`**: document that `.rp.md` holds conventions *and*
   guardrails and how guardrails are loaded. Guardrails are **not** added as a row in
   the conventions table and are **not** part of the required-conventions
   completeness check.
9. **`conventions/setup.md`**: add a step to capture guardrails, framed as a separate
   (optional) concept from conventions.
10. **Agent updates** — `code-writer`, `code-reviewer` (code phase) and `doc-writer`,
    `doc-reviewer` (docs phase) read the project's Guardrails applicable to their
    phase **by name**, replacing every reference to "the host project's verification
    convention" for the command-gate role. Other "host project's X convention"
    references (inline docs, testing, UI, coding, commit format, documentation) are
    untouched.
11. Update the agents' **blocker rule**: a missing/empty Guardrails section is not a
    blocker (today's "verification convention missing = blocker" is removed).
12. **Reference example** — restructure this repo's root `.rp.md` into Conventions +
    Guardrails and declare the repo's real command gates (candidates from CI:
    `npm test`, `node scripts/validate-changesets.mjs`, and the changeset-required
    check; exact list is a code-phase decision).

Exclusions are recorded in **Out of Scope** above.
