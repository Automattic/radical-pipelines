# Spec — Add a Guardrails convention to formalize deterministic code-phase verification

_Issue: [Automattic/radical-pipelines#51](https://github.com/Automattic/radical-pipelines/issues/51). Pipeline: `51-guardrails-convention-v2` (v2 — starts over from the intent; nothing inherited from the prior pipeline / closed PR #112)._

## Overview

The code-phase agents (`code-writer`, `code-reviewer`) already treat "the host project's verification convention" — lint, typecheck, unit tests, e2e, build, behavior verification — as a set of mandatory gates they loop on until they pass. The doc-phase agents (`doc-writer`, `doc-reviewer`) reference the same convention for documentation gates. But that contract is **not formalized anywhere**: it is not a row in the conventions loader, not captured at setup, and not a declarable convention. The agents reach for something that does not formally exist.

This feature formalizes that contract as **Guardrails**: a project's deterministic, machine-checkable verification gates, each an **exact command** judged pass/fail **solely by its exit code**, mandatory within the phase(s) it applies to. This is the Ralph Orchestrator *backpressure* model — don't prescribe how the agent works; declare objective gates that reject incomplete work, so the agent must produce concrete evidence (`tests: pass, lint: pass`) rather than "I think it works," and keeps iterating until every deterministic gate passes.

Guardrails is added as **one more convention** — an **optional** one — alongside the existing project conventions. It is discoverable in the conventions loader, captured at setup, and referenced by name by the four phase agents. It is explicitly **not** a sibling top-level section and **not** part of any "configuration umbrella" rename: that framing was attempted in closed PR #112, extracted into closed issue #113 / closed PR #115, and rejected on its own merits. The binding re-scope (issue #51, dated 2026-06-10) is "Guardrails will be added simply as one more convention."

New in this v2 (not present in #112): at setup the orchestrator **validates each guardrail command before writing it** — runs it in a context matching the agents' execution environment and confirms it actually executes (it is found, executable, and runs to completion), rather than recording commands blindly.

**Scope surface.** The spec touches exactly five things:

- `skills/radical-pipelines/reference/conventions/load.md` — the conventions loader.
- `skills/radical-pipelines/reference/conventions/setup.md` — the setup capture flow.
- `agents/code-writer.md`, `agents/code-reviewer.md`, `agents/doc-writer.md`, `agents/doc-reviewer.md` — the four phase agents.
- `.rp.md` — this repository's own committed conventions file, which gains a worked `### Guardrails` example (the dogfood).
- A `minor` changeset (required because the change edits release-relevant `agents/**` and `skills/**` paths).

Guardrails is a **product capability of Radical Pipelines** that applies in every consuming project; this repository is the dogfood instance. The human-facing README / website prose is owned by the pipeline's docs phase and is out of scope here.

## Requirements

Each requirement is an observable outcome.

### The Guardrails concept

1. A **guardrail** is a mandatory verification gate defined as an **exact command** whose pass/fail is judged **solely by its exit code** (exit 0 = pass, any non-zero = fail). "Run the tests" is not a guardrail; `npm test` is.
2. Each guardrail declares three things: a human-readable **name/label**, the **exact command** to run, and the **phase(s)** it applies to. The only valid phase targets are **`code`** and **`docs`**; a guardrail may apply to one phase or both.
3. A guardrail's command is a **fixed, literal string** — it does not take per-run parameters. Where a project's real gate is inherently parameterized (e.g. a base ref that varies per CI run), it is declared pinned to a concrete sensible default so the guardrail remains a single exact command (see requirement 23 for the reference example).
4. Guardrails are **tool-agnostic**: the same guardrail applies regardless of the active agentic coding tool (Claude Code, Pi, …). There are no per-tool guardrail variants, and the guardrails declaration lives in the **shared / tool-agnostic** area of `.rp.md`, not a per-tool section.
5. Guardrails are **optional**. A project may declare none. An absent or empty guardrails declaration means "this project has no command gates" and is a valid, complete state — never a blocker and never a warning.
6. **Behavior verification is NOT a guardrail.** Exercising user-observable behavior and capturing subjective evidence (screenshots, transcripts, output samples, response diffs) is a separate, evidence-based agent responsibility, categorically distinct from a deterministic exit-code command. The optional "expected evidence" field for behavioral / AI-as-judge gates is explicitly deferred — not part of v1.

### Guardrails as a convention (loader and `.rp.md` shape)

7. `load.md`'s `## Conventions` table gains a new row for **Guardrails**, marked **`No`** in the `Required?` column (optional). The "What it covers" cell is a terse one-liner — like every other row — that signals the executable / exit-code nature so a reader knows the value is executable, not advisory (e.g. "The deterministic verification gates — exact commands judged pass/fail by exit code — the code/doc phases must pass").
8. Because the loader's `## Missing conventions` logic keys off **required** conventions, an absent Guardrails convention never blocks the pipeline and never triggers the setup-required flow. A project with no guardrails still passes the required-completeness check.
9. `load.md` documents what a guardrail is (exact command, judged by exit code, mandatory within its phase(s), absent/empty = no command gates) and how an agent loads the guardrails applicable to a phase: select the guardrails whose phase(s) include the current phase; an empty selection means run none and proceed. The fuller "what a guardrail is" definition lives in `load.md`'s body and/or `setup.md`, not crammed into the terse table cell.
10. The project's guardrails are authored in `.rp.md` as a **`### Guardrails` subsection** alongside the other `###` convention subsections, in the shared / tool-agnostic area (under `## Shared conventions`). The file title (`# Radical Pipelines project conventions`) is unchanged; there is **no** top-level `## Guardrails` sibling section and **no** retitle of the file to "configuration".

### Setup capture with command validation (new in v2)

11. `setup.md` gains an **optional** guardrails-capture step, presented as a distinct convention consistent with the existing one-capture-step-per-convention pattern. It explains *why* guardrails matter (the backpressure rationale) and *what kinds* to consider (tests, lint, typecheck, build, format, audit, e2e, project-specific validators), and captures per gate a **name**, the **exact command**, and the applicable **phase(s)**. "None" is a complete, valid answer.
12. Before writing a captured command to `.rp.md`, the orchestrator **validates** it: it runs the exact command in a context matching the agents' execution environment — at minimum the project's standard shell and working directory, as close to the agents' environment as the orchestrator can reach — and confirms the command **resolves and actually executes** (it is found, is executable, and runs to completion, not a 127/126-style "unrunnable" error). The **pass bar is "it executed," NOT "exit 0."**
13. A command that **runs but exits non-zero** (the gate legitimately fails right now — e.g. red tests in a mid-development project) **IS written**: it is a valid guardrail; the failing result is just today's state of the code. The agent will later loop until it passes.
14. A command that **errors as unrunnable** is **NOT written**: the orchestrator surfaces the failure to the owner (the error and exit code) and offers to (a) fix / replace the command, (b) drop that guardrail, or (c) — only if the owner explicitly insists the command is correct and the validation environment is the discrepancy — keep it as an escape hatch. The default is "do not write an unvalidated command." Validation never silently persists a known-unrunnable gate, and it never "writes anyway but warns."
15. Validation is **per-command and independent**: each captured command is validated on its own; one unrunnable command does not void or block writing the others. Zero captured guardrails = nothing to validate = a valid, complete state (no failure is manufactured from emptiness). One bad command does not abort the wider conventions capture — it is dropped (or corrected) and setup finishes.
16. Exit codes are the **primary signal but a heuristic, not a proof** (a wrapper script can exit 127 for internal reasons; some tools print "not found"-style errors while exiting 0). For ambiguous cases the orchestrator confirms with the owner whether the command actually executed. The requirement is "confirm it executed," not "the exit code must be a specific number."

### Environment-parity floor for validation

17. Setup runs **before any pipeline worktree exists** (it runs when required conventions are missing, before a workflow starts, in the main checkout). The parity requirement is therefore "validate in a context matching the agents' execution environment as closely as the orchestrator can reach — at minimum the project's standard shell and working directory." This still catches the realistic failure modes (command-not-found, tool-not-installed, bad invocation / wrong-shell quoting). Perfect parity (env vars, secrets, network) is acknowledged as impossible; the requirement is an explicit goal with a stated floor, not an absolute.

### Agent behavior — the four phase agents

18. `code-writer.md` and `code-reviewer.md` read **the guardrails applicable to the code phase** (the code-tagged guardrails) **by name** where they currently read "the host project's verification convention" for the command-gate role; `doc-writer.md` and `doc-reviewer.md` read **the guardrails applicable to the docs phase** (the docs-tagged guardrails) likewise. A code-tagged guardrail never runs in the docs phase and vice versa.
19. Each such agent runs **every** guardrail applicable to its phase, treats each as **mandatory**, does not complete while any of them fails, and does not bypass any (no `--no-verify`, no `skip`, no commented-out checks). A guardrail that runs and exits non-zero is **work to fix, not a blocker**.
20. **Absent / empty guardrails for the phase is a valid, non-blocker state for all four agents:** the agent runs none and proceeds. The previous rule that treated a missing verification convention as a blocker is removed — after this change there is **no longer any "guardrails missing = blocker" path** in any of the four agents.
21. A **declared** guardrail whose command **does not resolve / execute** (unrunnable — binary missing, script renamed, etc.) remains a **blocker** (a declared gate the agent cannot honor). This residual run-time blocker is distinct from "no guardrails declared" (proceed) and from "guardrail runs and exits non-zero" (work). Setup-time validation (requirements 12–16) and this run-time residual blocker are **complementary**: setup catches bad commands at authoring time; the residual blocker catches drift (a once-valid command that later became unrunnable). The distinction shared across both is **"did the command execute?" vs "did the gate pass?"** — the spine of the whole model.
22. **Behavior verification is preserved as its own step** in both code agents, de-coupled from the verification-convention wording: the agent exercises the changed user-observable behavior end-to-end itself and captures the appropriate evidence. The guidance on how to exercise the behavior and what evidence to capture lives **in the step itself**, because there is no longer a convention to defer to. Behavior verification is NOT reclassified as a guardrail.
23. After the change, **no agent contains the string "verification convention" for the command-gate role** (grep-negative). All other "host project's X convention" references are **unchanged**: the inline API-documentation convention, testing convention, UI conventions, coding / build conventions, commit format, and the **documentation convention** (voice / structure / formatting / cross-linking). The **"doc gates"** in `doc-writer.md` / `doc-reviewer.md` (link-check, markdown-lint, render-check, doc tests, spelling) ARE docs-phase guardrails and are rewritten accordingly — distinct from the leave-alone "documentation **convention**". The straggler "if the verification convention supports doc tests" in `doc-writer.md` is rephrased to reference a docs-phase guardrail.

### Local overrides

24. Guardrails is **not locally overridable**. It is not in the `.rp.local.md` overridable subset (it is a shared, must-hold-for-everyone contract, not a developer-local-runtime convention). A guardrail placed in `.rp.local.md` is **ignored, the committed value is used, and the run output warns** — the behavior the local-overrides mechanism (pipeline #91) already provides for shared / non-overridable conventions; **no new mechanism is added**. The loader's overridable-vs-shared guidance gains a one-line note placing guardrails on the shared / non-overridable side.

### Reference example (this repository's dogfood)

25. This repository's own committed `.rp.md` gains a `### Guardrails` subsection declaring its **real** command gates as the worked example, drawn from what the project actually runs (its CI gates in `.github/workflows/changeset-gate.yml`):
    - `npm test` — the `node --test` suite over `scripts/test/**`.
    - `node scripts/validate-changesets.mjs` — the changeset-shape validator.
    - `npx changeset status --since=origin/trunk` — the changeset-presence check, pinned to a concrete default base (`origin/trunk`) so it is a fixed exact command (CI varies the base per run; requirement 3).

    All three are code-phase gates. The declared commands must validate (resolve-and-execute) in the environment the maintainers run. Note: `npm test` requires **Node ≥21** (CI uses Node 22) because the `test` script's quoted `**` glob relies on `node --test` built-in glob support added in Node 21 — on a stale local Node 20 the same command errors as unrunnable, which is precisely the environment-parity lesson the validation requirement teaches. No new gate tooling is invented for this purpose, and the `npm test` Node-portability wart is **not** fixed here (out of scope).

### End-to-end optionality (the central "optional" guarantee)

26. A project (or a phase) with **zero applicable guardrails** flows cleanly through the whole system with **no blocker and no warning anywhere**: setup's capture step accepts "none" as complete; the loader's required-completeness check passes; and all four agents run none and proceed. This guarantee spans **setup + load + agents**, not just the loader row.

### Required project mechanics

27. Because the change edits release-relevant paths (`agents/**`, `skills/**`), the PR carries a **`minor`** changeset (a pre-1.0, backwards-compatible new feature). The changeset is **authored, not a guardrail** — `npx changeset status` and `node scripts/validate-changesets.mjs` are guardrails that *check* the changeset; the changeset is the thing checked, so there is no circularity. (`.rp.md` and `.pipelines/**` are not release-relevant; the changeset is required by the agents / skills edits regardless.)

## Out of Scope

1. **The conventions → "configuration" umbrella rename**, any `.rp.md` retitle, and any top-level `## Guardrails` sibling section. Dead per closed issue #113 / closed PR #115 ("doesn't add benefit, only adds complexity") and the final #51 re-scope ("one more convention").
2. **Fixing the `npm test` Node-portability wart** (the quoted-`**`-glob reliance on Node ≥21). A real but separate concern; bundling an unrelated build-script fix is the scope-creep that closed #112. File separately if desired.
3. **Reclassifying behavior verification as a guardrail**, and the optional 4th "expected evidence" guardrail field (deferred enhancement).
4. **Per-tool guardrail variants** (guardrails are tool-agnostic, one shared declaration) and **any parser / validator / schema** for the guardrails section (it is prose the agents read, like every other `.rp.md` entry).
5. **Redesigning the code / docs phase loop or backpressure mechanics** (they already exist; this formalizes the contract only) and **any change to the phase-reference docs** (`reference/autonomous-phases/4 - code.md`, `5 - docs.md`, and the assisted equivalents — verified they reference neither the verification convention nor guardrails today, so they need no edit).
6. **Guardrails for phases other than `code` and `docs`.**
7. **Any new mechanism for local overrides** (guardrails is non-overridable for free via pipeline #91's existing rules) and **README / website human-facing documentation** (owned by the pipeline's docs phase, not this spec).
8. **Retroactively back-filling guardrails** into existing / other pipelines or other consuming projects' `.rp.md`. The feature ships the convention plus this repository's own dogfood declaration only — no migration.
9. **Changes to the orchestrator's phase-dispatch orchestration.** The agents read guardrails; how phases are dispatched is unchanged.

## Acceptance Criteria

A reviewer can confirm the feature is complete and correct by checking all of the following.

1. **Loader row.** `load.md`'s `## Conventions` table has a `Guardrails` row marked `No` in `Required?`, with a terse "What it covers" cell that signals the executable / exit-code nature. (Requirements 7, 8.)
2. **Loader body.** `load.md` documents what a guardrail is (exact command, judged by exit code, mandatory within its phase(s), absent = no command gates) and how an agent selects the guardrails applicable to a phase, with empty selection = run none and proceed. (Requirement 9.)
3. **`.rp.md` shape.** This repo's `.rp.md` has a `### Guardrails` subsection in the shared / tool-agnostic area, the file title is unchanged, and there is no `## Guardrails` sibling and no "configuration" retitle. (Requirements 4, 10.)
4. **Setup step exists and explains.** `setup.md` has an optional guardrails-capture step that gives the backpressure rationale and the kinds of gates to consider, captures (name, exact command, phase(s)) per gate, and accepts "None" as a complete answer. (Requirement 11.)
5. **Setup validation — the three-way outcome split.** Setup validation, as documented, treats: (a) a command that **resolves and executes** (regardless of exit code) as written — including a command that **runs but exits non-zero** (the red-tests / `npm test` case is written, not refused); (b) a command that **errors as unrunnable** (127/126-style) as NOT written, surfaced to the owner with the error and exit code, with fix / drop / insist-escape-hatch options and a default of don't-write; (c) **zero captured guardrails** as a valid complete state with nothing to validate. All three branches are asserted. (Requirements 12, 13, 14, 15, 16.)
6. **Parity floor.** Setup validation is documented as running in a context matching the agents' execution environment as closely as reachable — at minimum the project's standard shell and working directory — acknowledging setup runs before any worktree exists. (Requirement 17.)
7. **Agents read guardrails by name.** All four agents read the guardrails applicable to their phase (code agents → code-tagged; doc agents → docs-tagged) where they previously read "the host project's verification convention" for the command-gate role, and run every applicable guardrail as mandatory without bypass. (Requirements 18, 19.)
8. **Three-way blocker split in the agents.** Each agent encodes: absent / empty guardrails ⇒ run none and proceed (not a blocker, no "missing = blocker" path remains); a declared-but-unrunnable guardrail ⇒ blocker; a guardrail that runs and exits non-zero ⇒ work to fix (not a blocker). (Requirements 20, 21.)
9. **Behavior verification de-coupled.** Both code agents keep behavior verification as its own evidence-based step, worded to stand alone (the agent drives the behavior and decides the evidence) with no reference to a verification convention, and it is not a guardrail. (Requirement 22.)
10. **Grep-negative.** After the change, `grep -r "verification convention"` over `agents/` returns nothing for the command-gate role (the string is gone from all four agents), while the leave-alone convention references (inline API-documentation, testing, UI, coding / build, commit format, documentation convention) are intact, and the doc "gates" are rewritten to "docs-phase guardrails". (Requirement 23.)
11. **Local overrides note.** `load.md`'s overridable-vs-shared guidance notes guardrails sits on the shared / non-overridable side; no new override mechanism is added. (Requirement 24.)
12. **Dogfood gates validate.** This repo's `### Guardrails` declares `npm test`, `node scripts/validate-changesets.mjs`, and `npx changeset status --since=origin/trunk` as code-phase gates; each resolves-and-executes in a Node ≥21 (CI-parity) environment. (Requirements 3, 25.)
13. **End-to-end optionality.** A walkthrough of a project with zero guardrails passes setup (capture accepts "none"), load (no missing-required block), and all four agents (proceed, run none) with no blocker and no warning anywhere. (Requirement 26.)
14. **Changeset.** The PR carries a `minor` changeset, and the changeset is not declared as a guardrail. (Requirement 27.)
15. **Out-of-scope respected.** No "configuration" rename / retitle / sibling section; no `npm test` script fix; no phase-reference-doc edits; no per-tool guardrail variants; no new local-overrides mechanism; no README / website prose; no back-fill into other `.rp.md` files. (Out of Scope 1–9.)
