# Design Doc — Add a Guardrails convention to formalize deterministic code-phase verification

_Issue: [Automattic/radical-pipelines#51](https://github.com/Automattic/radical-pipelines/issues/51). Pipeline: `51-guardrails-convention-v2`. Inputs: the approved, binding `1-spec/spec.md` and the committed `2-design-doc/design-doc-research.md`. This document is the standalone design the plan and code phases build against._

## 1. Summary

This feature formalizes a contract the code-phase and doc-phase agents already lean on but that exists nowhere in the project's data: **Guardrails** — a project's deterministic, machine-checkable verification gates, each an **exact command** judged pass/fail **solely by its exit code**, mandatory within the phase(s) it applies to.

Today the four phase agents (`code-writer`, `code-reviewer`, `doc-writer`, `doc-reviewer`) reach for "the host project's verification convention" to play the command-gate role. That convention is not a row in the conventions loader, is not captured at setup, and is not a declarable convention — the agents reference something that does not formally exist. This design adds Guardrails as **one more optional convention** alongside the existing ones: discoverable in the loader, captured at setup (with new command-validation), authored in `.rp.md`, and read by name by the four agents.

The change is **prose and instruction text only**. There is no executable code, no module, no API, no schema, and no parser — guardrails are prose the agents read, exactly like every other `.rp.md` entry (spec OOS 4). The "design" is therefore the exact shape and wording of the prose to add or rewrite across five files, plus a `minor` changeset.

The conceptual model is the Ralph Orchestrator *backpressure* pattern: don't prescribe how the agent works; declare objective gates that reject incomplete work, so the agent must produce concrete evidence (`tests: pass, lint: pass`) instead of "I think it works," and keeps iterating until every deterministic gate passes.

### What this is explicitly NOT

Guardrails is **not** a sibling top-level section, **not** a `.rp.md` retitle, and **not** part of any "configuration umbrella" rename. That framing was attempted in closed PR #112, extracted into closed issue #113 / closed PR #115, and rejected on its own merits ("doesn't add benefit, only adds complexity"). The binding re-scope (issue #51, dated 2026-06-10) is: "Guardrails will be added simply as one more convention." This design honors that re-scope literally.

## 2. Scope surface

The design touches **exactly five things** (spec Overview), and nothing else:

| # | File | What changes |
| - | ---- | ------------ |
| 1 | `skills/radical-pipelines/reference/conventions/load.md` | One `Guardrails` table row (`No`) + a short body definition + one local-overrides carve-out sentence |
| 2 | `skills/radical-pipelines/reference/conventions/setup.md` | A new optional `### Guardrails` capture sub-section (last in Step 2) with command-validation semantics |
| 3 | `agents/code-writer.md`, `agents/code-reviewer.md`, `agents/doc-writer.md`, `agents/doc-reviewer.md` | Read-guardrails-by-name + three-way blocker split + behavior-verification decoupling |
| 4 | `.rp.md` | A dogfood `### Guardrails` subsection declaring this repo's three real code-phase gates |
| 5 | A `minor` changeset | Required because the change edits release-relevant `agents/**` and `skills/**` |

Guardrails is a **product capability of Radical Pipelines** that applies in every consuming project; this repository is the dogfood instance. The human-facing README / website prose is owned by the pipeline's docs phase and is out of scope here (spec OOS 7).

## 3. Grounded file state (verified against the live tree)

The design rests on the current shape of the touched files, re-verified in this worktree.

### 3.1 The "verification convention" grep surface

A repo-wide `grep -rn "verification convention" --include="*.md"` (excluding the historical `.pipelines/` artifacts) matches in **exactly the four phase agents** and nowhere else in scope. The phase-reference docs (`reference/autonomous-phases/`, `reference/assisted-phases/`) are grep-clean for both "verification convention" and "guardrail" — so spec OOS 5 holds: those need no edit. "guardrail" appears nowhere outside `.pipelines/`; this is greenfield, with no existing machinery to reconcile.

The exact line-level occurrences — the rewrite worklist — are:

- **`agents/code-writer.md`**: `:13` (step 1.2 read), `:36` (behavior verification "using the host project's verification convention"), `:46` (step 5 "defines a set of gates"), `:51` ("missing or unrunnable … is a blocker"), `:70` (blocker guideline "the verification convention is missing").
- **`agents/code-reviewer.md`**: `:18` (step 1.5 read), `:32` (step 2 "run … exactly as documented"), `:36` (behavior verification), `:68` (review-template comment), `:98` (blocker guideline "the verification convention is undefined").
- **`agents/doc-writer.md`**: `:35` (step 3 straggler "if the verification convention supports doc tests"), `:40` (step 4 "may enumerate gates relevant to documentation"), `:45` ("missing or unrunnable … is a blocker"), `:65` (blocker guideline "the verification convention is missing").
- **`agents/doc-reviewer.md`**: `:33` (step 2 "Doc gates — if the host project's verification convention enumerates…"), `:98` (guideline "Run the gates if any exist"), `:99` (blocker guideline "the verification convention is undefined").

### 3.2 `load.md` structure

`## Conventions` table at `load.md:11-21` (optional rows Commit format / Team spawning / Agent models all marked `No`). `## Missing conventions` at `:23-29` keys off **required** conventions only ("If all required conventions are available, continue…"; "If one or more required conventions are missing, do not proceed…"). `## Local overrides` at `:31-37` is a three-paragraph generic stub: it lets a developer place a git-ignored `.rp.local.md` to "override a restricted subset of conventions," explains worktree resolution, and gives an **unconditional** merge rule ("where it names a convention its value wins, where it is silent the committed value is inherited"). It does **not** enumerate which conventions are overridable and contains **no** "ignored / committed-value-used / warn-on-override" enforcement text.

### 3.3 `setup.md` structure

Step 2 "Collect required conventions" (`setup.md:26`) holds one `###` capture sub-section per convention, ending with `### Artifact storage (required)` at `:106`. Step 4 "Confirm writes before changing files" (`:179-186`) is the confirm-before-write gate ("do not create a misleading complete conventions file").

### 3.4 `.rp.md` structure

`## Shared conventions` (`:5`) contains tool-agnostic `###` subsections: `### Commit format` (`:49`), `### Agent models` (`:73`, a Markdown table), `### Health monitoring` (`:94`, a bullet list). The file title `# Radical Pipelines project conventions` (`:1`) is unchanged. The new `### Guardrails` subsection goes under `## Shared conventions` alongside these — it is tool-agnostic — never in a per-tool section and never as a `## Guardrails` sibling.

### 3.5 Live behavior of the three candidate dogfood gates

Run in this worktree (Node v20.19.4, no `engines` pin):

- `npm test` → **exit 1**, `Could not find '…/scripts/test/**/*.test.mjs'`. The `test` script is `node --test 'scripts/test/**/*.test.mjs'` (single-quoted `**`). Node 20's `node --test` does not expand `**`; built-in glob support landed in Node 21, and CI runs Node 22 (`changeset-gate.yml:26`). So this command is **unrunnable on Node 20 / runnable-and-green on Node ≥21** — the live environment-parity case the setup-validation requirement teaches.
- `node scripts/validate-changesets.mjs` → **exit 0** (resolves, executes, passes).
- `npx changeset status --since=origin/trunk` → **exit 0**. The `--since=origin/trunk` pin makes this a fixed literal command (CI varies the base per run via `origin/${{ base.ref }}`; the dogfood pins `origin/trunk`).

All three are the exact CI gate steps in `.github/workflows/changeset-gate.yml`, and all three are code-phase gates.

## 4. The conceptual model the prose must encode

Every wording decision below serves one coherent model. The four agents and the setup flow must behave consistently because they share these definitions.

### 4.1 What a guardrail is

A **guardrail** is a mandatory verification gate defined as an **exact command** whose pass/fail is judged **solely by its exit code** (exit 0 = pass, any non-zero = fail). "Run the tests" is not a guardrail; `npm test` is. Each guardrail declares three things:

1. a human-readable **name / label**,
2. the **exact command** to run, and
3. the **phase(s)** it applies to — the only valid targets are **`code`** and **`docs`**; a guardrail may apply to one phase or both.

A guardrail's command is a **fixed, literal string** — it does not take per-run parameters. Where a project's real gate is inherently parameterized (e.g. a base ref that varies per CI run), it is declared pinned to a concrete sensible default so the guardrail stays a single exact command (the dogfood's `--since=origin/trunk` is the worked example).

Guardrails are **tool-agnostic**: the same guardrail applies regardless of the active agentic coding tool (Claude Code, Pi, …). There are no per-tool variants, and the declaration lives in the **shared / tool-agnostic** area of `.rp.md`.

Guardrails are **optional**. A project may declare none. An absent or empty guardrails declaration means "this project has no command gates" and is a valid, complete state — never a blocker and never a warning.

### 4.2 The spine: "did the command execute?" vs "did the gate pass?"

The single distinction that ties the whole feature together — setup-time validation, the agents' run-time behavior, and the residual blocker — is:

> **"Did the command execute?"** (it was found, was executable, and ran to completion) — distinct from — **"Did the gate pass?"** (it exited 0).

A command can execute and still fail (red tests exit non-zero); that is a real, runnable gate and just today's state of the code. A command that *cannot* execute (binary missing, script renamed, wrong shell) is a different kind of problem entirely. This design states the spine explicitly in both `setup.md` and the four agents so the rules read as one model, not as disconnected special cases.

### 4.3 Behavior verification is NOT a guardrail

Exercising user-observable behavior and capturing subjective evidence (screenshots, transcripts, output samples, response diffs) is a separate, evidence-based agent responsibility, categorically distinct from a deterministic exit-code command. It stays its own step in the code agents and is explicitly **not** reclassified as a guardrail. The optional "expected evidence" field for behavioral / AI-as-judge gates is deferred (spec OOS 3) — not part of v1.

## 5. Design decisions

Six decisions (D1–D6), each settled on doubly-verified evidence: the design analyst's re-verification, the approved spec-review's empirical reproduction, and the researcher's live experiments. Each cites the requirements and acceptance criteria it satisfies.

> **Binding-input note.** Where the research's *consolidated* requirements 11 and 22 carry stale pre-correction wording, **the approved `spec.md` is binding.** This bites in exactly two places, both already resolved correctly in D5 and D6: (a) the setup parity floor is the **main checkout's** standard shell and working directory, NOT "the worktree working directory" (no worktree exists at setup time) — spec req 17; (b) the local-overrides edit is a **scoping carve-out**, NOT "ignored and the run warns" enforcement (that #91 machinery does not ship) — spec req 24. The design below uses the binding spec wording in both places.

### D1 — `load.md`: loader row + body definition

_Satisfies spec req 7, 8, 9; AC 1, 2, 13._

**Table row.** Add one row to the `## Conventions` table (`load.md:11-21`), matching the existing optional-row pattern:

```
| Guardrails | <terse one-liner signalling executable/exit-code nature> | No |
```

The "What it covers" cell stays terse like every other row but must signal the value is **executable, not advisory** — so a reader knows it is a command to run, not guidance to follow. Spec req 7 gives the model wording: _"The deterministic verification gates — exact commands judged pass/fail by exit code — the code/doc phases must pass."_ The table is hand-aligned; the writer re-pads the column.

**Why `No` is load-bearing, not incidental.** The `## Missing conventions` logic (`load.md:23-29`) keys off **required** conventions. An optional row is structurally invisible to that gate, which is exactly how spec req 8 / AC 13 ("absent guardrails never blocks, never triggers the setup-required flow") is satisfied **for free** — no new branch in the missing-conventions logic. **The design must NOT add guardrails to any required-completeness check.** A project with no guardrails still passes the required-completeness check unchanged.

**Body addition.** The table cell cannot carry the definition. Spec req 9 / AC 2 puts the fuller "what a guardrail is" in `load.md`'s body. Add a short body addition — a `### Guardrails` subsection or a paragraph under the table, whichever matches load.md's existing prose density (the writer picks the lighter touch) — that documents:

1. **What a guardrail is** — an exact command, judged pass/fail solely by exit code (0 = pass, non-zero = fail), mandatory within the phase(s) it applies to. "Run the tests" is not a guardrail; `npm test` is.
2. **Absent / empty = no command gates** — a valid, complete state, never a blocker, never a warning.
3. **How an agent loads guardrails for a phase** — select the guardrails whose phase(s) include the current phase; an empty selection means run none and proceed.

This body text is the single place the code/docs phase dimension and the phase-selection rule are defined, so the four agents can simply say "the guardrails applicable to the {code|docs} phase" without re-deriving the selection each time. Stating it once in the loader keeps the agents terse.

### D2 — The four-agent rewrite (three buckets, ~17 line-level edits)

_Satisfies spec req 18, 19, 20, 21, 22, 23; AC 7, 8, 9, 10._

Three transformation buckets, applied per the spec's leave-alone discipline against the verified line map in §3.1.

#### Bucket 1 — read guardrails by name (replace the command-gate role)

Replace "host project's verification convention" → **"the guardrails applicable to the {code|docs} phase"** wherever it plays the command-gate role. The code agents get **code**-phase guardrails; the doc agents get **docs**-phase guardrails (spec req 18 / AC 7). A code-tagged guardrail never runs in the docs phase and vice versa. Each agent runs **every** guardrail applicable to its phase, treats each as **mandatory**, does not complete while any fails, and bypasses none (no `--no-verify`, no `skip`, no commented-out checks).

The "read" step and the "run-the-gates" step both change:

- **code-writer** `:13` (read step), `:46` ("defines a set of gates" → "run every guardrail applicable to the code phase").
- **code-reviewer** `:18` (read step), `:32` (step-2 "run … exactly as documented" → run the code-phase guardrails, record each command and result), `:68` (review-template comment — evidence wording).
- **doc-writer** `:35` (straggler "if the verification convention supports doc tests" → "if a docs-phase guardrail covers doc tests"), `:40` (step-4 "may enumerate gates relevant to documentation" → the docs-phase guardrails; the enumerated examples link-check / markdown-lint / render-check / doc-tests / spelling stay, now as *examples of docs-phase guardrails*).
- **doc-reviewer** `:33` (step-2 "Doc gates — if the host project's verification convention enumerates…" → the docs-phase guardrails), `:98` (guideline "Run the gates if any exist" → reworded to docs-phase guardrails).

#### Bucket 2 — the three-way blocker split (the subtle heart)

_Spec req 19, 20, 21 / AC 8._ Today's text conflates two notions ("absent → blocker" and "unrunnable → blocker"). They must be split into **three** explicit outcomes, stated in each agent:

1. **Absent / empty guardrails for the phase ⇒ run none and proceed.** NOT a blocker, no warning. This **removes** the "missing or unrunnable … is a blocker" sentences (code-writer `:51`, doc-writer `:45`) and the "verification convention is missing / undefined" blocker examples (code-writer `:70`, code-reviewer `:98`, doc-writer `:65`, doc-reviewer `:99`). After the change **no "guardrails missing = blocker" path remains** in any of the four agents (spec req 20).
2. **A declared guardrail whose command does not resolve / execute (unrunnable) ⇒ blocker.** A declared gate the agent cannot honor (binary missing, script renamed). This is the **residual run-time blocker** (spec req 21) — kept, but reworded so it triggers only on "the declared command cannot execute," NOT on "no guardrails declared." It is the drift guard: a once-valid command that later became unrunnable.
3. **A guardrail that runs and exits non-zero ⇒ work to fix, not a blocker.** Same as today's "failing tests / broken builds are work, not blockers." Kept in spirit (code-writer `:50` and the doc-writer `:65` tail already say this).

State the spine — **"did the command execute?" vs "did the gate pass?"** (§4.2) — in the agents so the split reads as one coherent model. The setup-time validation (D5) and this run-time residual blocker are **complementary**: setup catches bad commands at authoring time; the residual blocker catches drift at run time. They pivot on the same distinction.

#### Bucket 3 — de-couple behavior verification

_Spec req 22 / AC 9._ Reword code-writer `:36` and code-reviewer `:36` to stand alone: the agent exercises the changed user-observable behavior end-to-end **itself** and decides the appropriate evidence (screenshots / transcripts / output samples / response diffs). The guidance on *how to exercise* the behavior and *what evidence to capture* must now live **in the step itself** — there is no longer a convention to defer to. Behavior verification is explicitly **not** reclassified as a guardrail. The review-template "Behavior verification" comment (code-reviewer `:68`) loses its "as required by the host project's verification convention" anchor.

#### Leave-alone list (do NOT touch)

_Spec req 23 / AC 10._ These are different conventions, not the command-gate role — they stay verbatim:

- inline API-documentation convention (code-writer `:29`, code-reviewer `:30`);
- testing convention (code-writer `:42`);
- UI conventions (code-writer `:38`);
- coding / build conventions (code-reviewer `:31`);
- commit format (code-writer `:56`, code-reviewer `:84`, doc-writer `:50`, doc-reviewer `:85`);
- **documentation convention** = voice / structure / formatting / cross-linking (doc-writer `:17`, `:27`; doc-reviewer `:19`, `:32`).

#### The naming-collision trap

_Spec req 23, called out explicitly._ Two things named "gates" in the doc agents — doc-writer step 4 "documentation **gates**" (`:40`) and doc-reviewer "Doc **gates**" (`:33`) — ARE docs-phase guardrails (they source from "the host project's **verification** convention" and list link-check / markdown-lint / render-check / doc-tests / spelling) → **rewrite** to "docs-phase guardrails." Do NOT confuse these with doc-writer `:17` / `:27`'s "documentation **convention**" (voice / structure) → **leave alone**. The writer must name the two distinctly so the rewrite touches the gate role and never the voice/structure convention.

#### Hard acceptance gate for this decision

After the rewrite, **`grep -rn "verification convention" agents/` returns nothing** (spec AC 10, grep-negative). This is a cheap mechanical check, distinct from "the agents now reference guardrails" — a sloppy edit can add guardrails wording while leaving a straggler (e.g. doc-writer `:35`). **Both** checks must pass: the string is gone from all four agents AND the leave-alone convention references are intact.

### D3 — `.rp.md`: the dogfood `### Guardrails` subsection

_Satisfies spec req 3, 4, 10, 25; AC 3, 12._

Add a `### Guardrails` subsection under `## Shared conventions` (tool-agnostic — spec req 4 / AC 3), alongside `### Commit format` / `### Agent models` / `### Health monitoring`. **File title unchanged; no `## Guardrails` sibling; no "configuration" retitle** (spec OOS 1).

Declare this repository's three **real** code-phase gates (spec req 25 / AC 12), each with name + exact literal command + phase:

| Name | Command | Phase |
| ---- | ------- | ----- |
| Test suite | `npm test` | code |
| Changeset shape | `node scripts/validate-changesets.mjs` | code |
| Changeset presence | `npx changeset status --since=origin/trunk` | code |

These are this repo's actual CI gates (`.github/workflows/changeset-gate.yml`), drawn from what the project really runs — no new gate tooling is invented. The `--since=origin/trunk` pin makes the third a fixed exact command (CI varies the base per run; spec req 3).

**Shape.** Since OOS 4 forbids any schema or parser, author this as **prose the agents read**, matching how the other `###` subsections are written. A small `Name | Command | Phase` Markdown table reads cleanly and mirrors the `### Agent models` table already in this file — recommended — but the writer may use a bullet list if it matches the surrounding density better; either is "prose the agents read."

**The Node ≥21 caveat (one line).** `npm test` validates clean on Node ≥21 (CI uses Node 22) because the `test` script's quoted `**` glob relies on `node --test` built-in glob support added in Node 21; on a stale local Node 20 the same command errors as unrunnable. That is precisely the environment-parity lesson the validation requirement teaches and is worth a one-line note next to the gate. **The `npm test` script wart is NOT fixed here** (spec OOS 2) — that is a real but separate concern; bundling an unrelated build-script fix is the scope-creep that closed #112.

### D4 — Changeset + grep-negative mechanics

_Satisfies spec req 27; AC 14._

The change edits release-relevant `agents/**` and `skills/**`, so the PR carries a **`minor`** changeset (a pre-1.0, backwards-compatible new feature; `validate-changesets.mjs` forbids `major` pre-1.0). The package is `@automattic/radical-pipelines` at `0.2.0`. `.changeset/config.json` `changedFilePatterns` = `["skills/**","agents/**",".claude-plugin/**","package.json","README.md"]`; `.rp.md` and `.pipelines/**` are not release-relevant, but the agents/skills edits require the changeset regardless.

The changeset is **authored, not a guardrail.** `npx changeset status` and `node scripts/validate-changesets.mjs` are guardrails that *check* the changeset; the changeset is the thing checked — so there is no circularity. The existing `.changeset/pipeline-reviews.md` is the template: `---`-delimited frontmatter with a single line `"@automattic/radical-pipelines": minor`, then a one-paragraph summary. The new changeset follows it exactly (one new `.changeset/<name>.md`, `minor`, one-paragraph feature summary).

This is a **plan / code-phase deliverable** — the design records only that it is required and `minor`; it does not author the changeset here.

### D5 — `setup.md`: capture step + three-way validation

_Satisfies spec req 11, 12, 13, 14, 15, 16, 17; AC 4, 5, 6._

**Placement.** A new optional `### Guardrails` capture sub-section inside Step 2 "Collect required conventions" (`setup.md:26`), placed **last** — after `### Artifact storage` (`:106`). Two reasons: (1) it is optional and self-contained, and nothing earlier in Step 2 supplies data it needs (validation keys off the live environment, not off captured conventions); (2) it is the **only** capture step that *executes* commands, so trailing placement keeps the pure-Q&A steps together and the one side-effecting step at the end. Its only real dependency — Step 1's tool-rules read being done — is satisfied with margin. "None" is a complete, valid answer.

**Capture content** (spec req 11 / AC 4). The step must:

1. Explain **why** guardrails matter — the backpressure rationale: objective gates that reject incomplete work so the agent produces concrete evidence and keeps iterating until every deterministic gate passes.
2. Explain **what kinds** to consider — tests, lint, typecheck, build, format, audit, e2e, project-specific validators.
3. Capture per gate: a **name**, the **exact literal command**, and the applicable **phase(s)** ∈ {code, docs}.
4. State that "None" is complete and valid.

**Timing — validate as each guardrail is captured, BEFORE the Step-4 confirm.** The validation action lives *inside* this capture step and runs *as each command is captured*, so an unrunnable command can be corrected or dropped before the owner reaches Step 4's confirm-before-write (`setup.md:179-186`, "do not create a misleading complete conventions file"). Do **not** defer validation to Step 4 — that would surface failures after the owner already approved the proposed file content.

**Validation before writing** (spec req 11–16 / AC 5). The orchestrator runs each captured command and writes it only on the right outcome. The three-way split, stated explicitly:

- **Runs and exits non-zero ⇒ WRITE.** A valid guardrail; the failing result is just today's code state (red tests / mid-development). **This is the clause most likely to be omitted — it must be explicit.** The pass bar is "it executed," NOT "exit 0."
- **Errors as unrunnable (127/126-style) ⇒ do NOT write.** Surface the failure to the owner (the error and exit code) and offer to (a) fix / replace the command, (b) drop that guardrail, or (c) — only if the owner explicitly insists the command is correct and the validation environment is the discrepancy — keep it as an escape hatch. **Default: do not write an unvalidated command.** Never silently persist a known-unrunnable gate; never "write anyway but warn."
- **Zero captured ⇒ nothing to validate**, a valid complete state; no failure is manufactured from emptiness.

Validation is **per-command and independent** — one unrunnable command does not void or block writing the others and does not abort the wider conventions capture (drop or correct it and finish). Exit codes are the **primary signal but a heuristic, not a proof**: a wrapper script can exit 127 for internal reasons, and some tools print "not found"-style errors while exiting 0. For ambiguous cases the orchestrator confirms with the owner whether the command actually executed. The requirement is "confirm it executed," NOT "the exit code must be a specific number."

**Parity floor** (spec req 17 / AC 6 — binding). Setup runs **before any pipeline worktree exists** (`setup.md:3` — it runs in the main checkout; the worktree is created later when a workflow begins). So the floor is worded **verbatim per spec req 17**: validate "in a context matching the agents' execution environment as closely as the orchestrator can reach — at minimum the **project's standard shell and working directory** [the main checkout]." This is NOT "the worktree working directory" — no worktree exists yet. (The research's *consolidated* req 11 "worktree working directory" is the older pre-correction phrasing and is **superseded** by approved spec.md req 17.)

The main-checkout standard shell genuinely catches the realistic failure modes — measured live in this worktree (zsh, Node v20.19.4): command-not-found (`nonexistent-linter --check` → exit 127), not-executable (a `chmod -x` script → exit 126), and the `npm test` glob / parity case (exit 1 with "Could not find '…/scripts/test/**/*.test.mjs'", confirmed to be the glob, not a real failure). Perfect parity (env vars, secrets, network) is acknowledged as impossible; the requirement is an explicit goal with a stated floor, not an absolute. The one thing the main-checkout floor cannot catch is a worktree-only env difference injected at run time — which the spec already concedes as the impossible-parity tail.

**Two edge-case caveats beyond the three-way split** — both specific to this being the only setup step that *runs* a command:

1. **Hang / no-return → fold into the don't-write-and-surface branch.** A command that never returns (a watch/server started by mistake, a tool waiting on input forever) yields *no exit code at all*, so the three-way split — which assumes a terminal exit — has no branch for it. One prose line: _"if a validation command does not return promptly, treat it as not-validated, stop it, and surface it to the owner — a guardrail must terminate on its own; a never-returning command isn't a deterministic gate."_ Frame it as a fourth observable outcome folded into the unrunnable branch (don't-write + surface). Do **NOT** mandate a timeout number — `timeout` is not even present on the macOS shell here (`command not found: timeout`), so a portable numeric timeout can't be assumed and over-mechanizing it would be brittle. Interactive-prompt commands are absorbed by this same note (most fail-fast on closed stdin, but a tool reading `/dev/tty` directly can block, which is just the hang case).
2. **State-mutating command → confirm before running.** Unlike every other capture step, this one *executes* the captured command, so a gate that writes / deploys / destroys (`format --write`, a deploy, a `db-reset`) would take effect against the owner's checkout *just to validate it*. The dogfood gates are all read-only, so this didn't bite in experiments, but the risk is real and unique to this step. One short caveat: _"validation runs the command, so a gate that writes, deploys, or destroys will take effect — confirm with the owner before running such a command (or accept their word it is correct: the escape hatch above)."_ It costs one sentence and prevents the worst foot-gun; it is not over-engineering, because the act of validation is itself the side-effect vector.

**Complementarity** (spec req 21). State the shared spine — **"did the command execute?" vs "did the gate pass?"** — in `setup.md` too, so setup-time validation (authoring-time gate) and the agent-side run-time residual blocker (drift guard) read as one model across the two files.

### D6 — `load.md` `## Local overrides`: one carve-out sentence

_Satisfies spec req 24; AC 11._

Guardrails is **not locally overridable**: it is a shared, must-hold-for-everyone contract, not a developer-local-runtime convention. It is kept non-overridable **by omission** — the shipped stub does not enumerate an overridable subset, so guardrails is simply never added to one and there is nothing to opt it into.

Add **one sentence** to the existing `## Local overrides` stub (`load.md:31-37`). Do **NOT** enumerate an overridable subset, and do **NOT** author any "ignored / committed-value-used / warn-on-override" enforcement — none exists in the shipped loader to extend, and porting it re-opens #91 scope (spec OOS 7).

**The wording is load-bearing — phrase it as a carve-out from the merge rule, not as warn-on-override behavior.** The stub's merge rule (`load.md:37`) is **unconditional**: "where it names a convention its value wins." With no enumerated subset and no exclusion logic, a developer who dropped a `### Guardrails` block into `.rp.local.md` would, under the literal merge rule, have the **local value win** — silently weakening a shared, must-hold-for-everyone gate, with nothing to catch it (the ignore-and-warn enforcement does not exist). That is a real correctness gap, which is why the sentence is **warranted, not optional**.

- **Correct shape** (a scoping carve-out the agent applies when reading the merge step): _"Guardrails is shared and committed-only; it is never taken from `.rp.local.md`."_ An agent following load.md simply won't apply a local guardrails value — honest about what's shippable, closes the gap, adds no mechanism.
- **WRONG shape** (asserts absent enforcement): "a local guardrails override is ignored and the run warns." This promises the #91 warn machinery that does not ship — it is exactly the iteration-1 spec-review defect. **Do NOT write this.**

The sentence attaches to the existing stub, after the `:37` merge rule, as a carve-out from it. No other change to `## Local overrides`. This change adds **no** new override mechanism and **no** new override behavior.

## 6. End-to-end optionality — the central guarantee

_Spec req 26 / AC 13._ The "optional" guarantee spans **setup + load + agents**, not just the loader row. A project (or a phase) with **zero applicable guardrails** flows cleanly through the whole system with **no blocker and no warning anywhere**:

| Stage | Behavior with zero guardrails | Why |
| ----- | ----------------------------- | --- |
| **Setup** | Capture step accepts "None" as complete; nothing to validate | D5 — "None" is a valid, complete answer; no failure manufactured from emptiness |
| **Load** | Required-completeness check passes; no missing-required block; no setup-required flow triggered | D1 — the `No` row is structurally invisible to the missing-conventions gate |
| **Agents (all four)** | Run none and proceed | D2 Bucket 2.1 — absent/empty ⇒ run none and proceed; no "missing = blocker" path remains |

This is the spec's central correctness claim. The design must keep all three stages aligned: removing the loader's "missing = blocker" branch is not enough if an agent still treats absent guardrails as a blocker, and vice versa.

## 7. Acceptance criteria mapping

How the design enables each of the spec's 15 acceptance criteria:

| AC | Criterion | Decision(s) |
| -- | --------- | ----------- |
| 1 | Loader row marked `No`, terse executable-signalling cell | D1 |
| 2 | Loader body defines a guardrail + phase-selection rule | D1 |
| 3 | `.rp.md` shape: `### Guardrails` shared, no sibling, no retitle | D3 |
| 4 | Setup step exists, explains backpressure + kinds, captures (name, command, phase), accepts "None" | D5 |
| 5 | Setup validation three-way split (write nonzero / don't-write unrunnable / zero = valid) | D5 |
| 6 | Parity floor: main-checkout standard shell + working dir | D5 |
| 7 | Agents read guardrails by name (code→code-tagged, docs→docs-tagged), run all as mandatory | D2 Bucket 1 |
| 8 | Three-way blocker split in agents | D2 Bucket 2 |
| 9 | Behavior verification de-coupled, its own step, not a guardrail | D2 Bucket 3 |
| 10 | Grep-negative over `agents/`; leave-alone refs intact; doc "gates" → docs-phase guardrails | D2 (gate) |
| 11 | Local overrides: non-overridable by omission, one carve-out sentence, no warn machinery | D6 |
| 12 | Dogfood gates declared and resolve-and-execute on Node ≥21 | D3 |
| 13 | End-to-end optionality across setup + load + agents, no blocker/warning | §6 (D1 + D5 + D2) |
| 14 | `minor` changeset present, not declared as a guardrail | D4 |
| 15 | Out-of-scope respected | §8 |

## 8. Out of scope (do not touch)

Carried verbatim from spec Out of Scope 1–9, restated as a build-time guardrail against scope creep:

1. The conventions → "configuration" umbrella rename, any `.rp.md` retitle, and any top-level `## Guardrails` sibling section (dead per closed #113 / #115 and the #51 re-scope).
2. Fixing the `npm test` Node-portability wart (the quoted-`**`-glob reliance on Node ≥21). File separately if desired.
3. Reclassifying behavior verification as a guardrail, and the optional 4th "expected evidence" guardrail field (deferred).
4. Per-tool guardrail variants, and any parser / validator / schema for the guardrails section (it is prose the agents read).
5. Redesigning the code / docs phase loop or backpressure mechanics, and any change to the phase-reference docs (`reference/autonomous-phases/4 - code.md`, `5 - docs.md`, and the assisted equivalents — verified grep-clean for both "verification convention" and "guardrail").
6. Guardrails for phases other than `code` and `docs`.
7. Any new mechanism or enforcement behavior for local overrides (guardrails is non-overridable by omission). Also out of scope: README / website human-facing documentation (owned by the pipeline's docs phase).
8. Retroactively back-filling guardrails into existing / other pipelines or other consuming projects' `.rp.md` (ship the convention plus this repo's dogfood only — no migration).
9. Changes to the orchestrator's phase-dispatch orchestration (the agents read guardrails; how phases are dispatched is unchanged).

## 9. Deliverable map (per file, for the plan and code phases)

1. **`skills/radical-pipelines/reference/conventions/load.md`** (D1 + D6):
   - One `Guardrails | <terse executable-signalling one-liner> | No` row in the `## Conventions` table. `No` is load-bearing — keep guardrails out of every required-completeness check.
   - A short body addition defining a guardrail (exact command, judged by exit code, mandatory within its phase(s)), stating absent/empty = no command gates (valid, never a blocker/warning), and giving the phase-selection rule (select guardrails whose phase(s) include the current phase; empty selection ⇒ run none, proceed).
   - One carve-out sentence on the `## Local overrides` stub: _"Guardrails is shared and committed-only; it is never taken from `.rp.local.md`."_ NOT phrased as warn-on-override.

2. **`skills/radical-pipelines/reference/conventions/setup.md`** (D5):
   - New optional `### Guardrails` capture sub-section, **last** in Step 2. Explains the backpressure *why* and the *kinds*; captures name + exact literal command + phase(s) ∈ {code, docs}; "None" is complete.
   - Validation **as each command is captured** (before the Step-4 confirm), in the **main-checkout** standard shell (parity floor verbatim per spec req 17). Three-way outcome: runs-and-exits-nonzero ⇒ WRITE; unrunnable (127/126-style) ⇒ don't-write + surface (error + exit code) + fix/drop/insist-escape-hatch, default don't-write; zero captured ⇒ nothing to validate. Per-command independent; exit codes a heuristic, owner arbitrates ambiguous cases. Plus the two caveats: hang/no-return folds into don't-write + surface (no mandated timeout number); state-mutating command confirmed-before-running. State the "did it execute? vs did it pass?" spine.

3. **`agents/code-writer.md`, `agents/code-reviewer.md`, `agents/doc-writer.md`, `agents/doc-reviewer.md`** (D2): three buckets per the §3.1 line map —
   - Bucket 1: replace "host project's verification convention" → "the guardrails applicable to the {code|docs} phase" for the command-gate role (read step + run-the-gates step).
   - Bucket 2: the three-way blocker split — absent/empty ⇒ run none and proceed (remove every "missing = blocker" path); declared-but-unrunnable ⇒ blocker (residual drift guard); runs-but-exits-nonzero ⇒ work to fix. State the "did it execute? vs did it pass?" spine.
   - Bucket 3: de-couple behavior verification, keep it as its own step, NOT a guardrail; the how-to-exercise / what-evidence guidance now lives in the step itself.
   - Honor the leave-alone list and the documentation-convention-vs-docs-phase-guardrails naming-collision trap. **Gate: `grep -rn "verification convention" agents/` returns empty.**

4. **`.rp.md`** (D3): `### Guardrails` under `## Shared conventions`, declaring the three real code-phase gates (`npm test`, `node scripts/validate-changesets.mjs`, `npx changeset status --since=origin/trunk`) as prose the agents read (a `Name | Command | Phase` table mirroring `### Agent models`, or a bullet list). File title unchanged; no `## Guardrails` sibling; no retitle. One-line Node ≥21 note for `npm test`.

5. **Changeset** (D4): one `minor` changeset following the `.changeset/pipeline-reviews.md` template. Authored, not a guardrail.
