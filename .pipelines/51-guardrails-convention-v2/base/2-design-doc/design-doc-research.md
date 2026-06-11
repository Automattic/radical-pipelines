# Design-Doc Research — Add a Guardrails convention to formalize deterministic code-phase verification

_Pipeline: `51-guardrails-convention-v2`. Input: the approved `1-spec/spec.md` (grounded by `1-spec/spec-research.md`). This is the design analyst's running record: the grounded facts, the open questions sent to the researcher, the answers, and the resulting design decisions that the design-doc-writer will turn into `design-doc.md`._

## What this design has to produce

This is a **documentation/prose change to agent and skill instruction files** — there is no executable code, no module, no API. The "design" is therefore: for each of the touched files, the exact shape of the prose to add or rewrite, the precise wording boundaries (especially the grep-negative and leave-alone lists), and the conceptual model the wording must encode so the four agents and the setup flow behave consistently. No data structures, no schema, no parser (spec OOS 4 — guardrails is prose the agents read, like every other `.rp.md` entry).

Scope surface (exactly five things, per spec Overview):

1. `skills/radical-pipelines/reference/conventions/load.md` — the conventions loader (table row + body + one local-overrides sentence).
2. `skills/radical-pipelines/reference/conventions/setup.md` — the setup capture flow (new optional capture step + validation semantics).
3. `agents/code-writer.md`, `agents/code-reviewer.md`, `agents/doc-writer.md`, `agents/doc-reviewer.md` — the four phase agents (read-by-name + three-way blocker split + behavior-verification decoupling).
4. `.rp.md` — this repo's own committed conventions file (the dogfood `### Guardrails` subsection).
5. A `minor` changeset.

## Grounded facts established before Q&A (verified against the live tree)

### The complete grep surface for "verification convention"

Repo-wide `grep -rn "verification convention" --include="*.md"` (excluding `.pipelines/`, which is historical artifacts) returns matches in **exactly the four phase agents** and nowhere else in-scope. The phase-reference docs (`reference/autonomous-phases/`, `reference/assisted-phases/`) are **grep-clean** for both "verification convention" and "guardrail" — so spec OOS 5 holds: those need no edit. "guardrail" appears nowhere outside `.pipelines/` — this is greenfield, no existing machinery to reconcile.

Exact line-level occurrences (the rewrite worklist):

- **`agents/code-writer.md`**: `:13` (step 1.2 read), `:36` (behavior verification "using the host project's verification convention"), `:46` (step 5 "defines a set of gates"), `:51` ("missing or unrunnable … is a blocker"), `:70` (blocker guideline "the verification convention is missing").
- **`agents/code-reviewer.md`**: `:18` (step 1.5 read), `:32` (step 2 "run … exactly as documented"), `:36` (behavior verification), `:68` (review-template comment), `:98` (blocker guideline "the verification convention is undefined").
- **`agents/doc-writer.md`**: `:35` (step 3 straggler "if the verification convention supports doc tests"), `:40` (step 4 "may enumerate gates relevant to documentation"), `:45` ("missing or unrunnable … is a blocker"), `:65` (blocker guideline "the verification convention is missing").
- **`agents/doc-reviewer.md`**: `:33` (step 2 "Doc gates — if the host project's verification convention enumerates…"), `:98` (guideline "Run the gates if any exist"), `:99` (blocker guideline "the verification convention is undefined").

### Live behavior of the three candidate dogfood gates (run in this worktree, Node v20.19.4, no `engines` pin)

- `npm test` → **exit 1**, `Could not find '…/scripts/test/**/*.test.mjs'`. The `test` script is `node --test 'scripts/test/**/*.test.mjs'` (single-quoted `**`). On Node 20 `node --test` does not expand `**`; built-in glob support landed in Node 21, and CI runs Node 22 (`changeset-gate.yml:26`). So this command is **unrunnable here / runnable-and-green on Node ≥21** — the live environment-parity case the spec's setup-validation requirement teaches.
- `node scripts/validate-changesets.mjs` → **exit 0** (resolves, executes, passes).
- `npx changeset status --since=origin/trunk` → **exit 0**. The `--since=origin/trunk` pin makes this a fixed literal command (CI varies the base per run via `origin/${{ base.ref }}`; the dogfood pins `origin/trunk`).

All three are the exact CI gate steps in `.github/workflows/changeset-gate.yml` (`npm test`, `node scripts/validate-changesets.mjs`, `npx changeset status --since=origin/<base>`). All three are code-phase gates.

### The shipped `## Local overrides` section (load.md:31-37) — verified generic

The entire section is three short paragraphs. It says a developer "may place a git-ignored `.rp.local.md` … to override a restricted subset of conventions," explains worktree resolution, and describes the merge ("where it names a convention its value wins, where it is silent the committed value is inherited"). It does **NOT** enumerate which conventions are overridable, and contains **NO** "ignored / committed-value-used / warn-on-override" enforcement text. The #91 enforcement machinery the research's consolidated req 22 describes is genuinely **absent from the shipped loader** — it lives only in unshipped #91 pipeline artifacts. This confirms the **approved spec.md req 24 / AC 11** is the accurate, binding statement: the only permitted edit is "at most a short sentence noting guardrails is shared / committed-only," and porting any enumerated-subset or warn machinery is out of scope.

### `.rp.md` subsection style to match (the dogfood)

`.rp.md` has `## Shared conventions` (`:5`) containing `###` subsections: `### Commit format` (`:49`), `### Agent models` (`:73`, a Markdown table), `### Health monitoring` (`:94`, a bullet list). The file title `# Radical Pipelines project conventions` (`:1`) is unchanged. The new `### Guardrails` subsection goes under `## Shared conventions` (it is tool-agnostic — spec req 4 / AC 3), alongside these, NOT in a per-tool section and NOT as a `## Guardrails` sibling.

### README is out of scope (confirmed)

README `## Configuration` (lines 141-159) is human-facing prose and mentions conventions + local overrides, but spec OOS 7 defers README/website prose to the pipeline's docs phase. No edit here; the docs phase owns it.

## Open questions to the researcher (and answers)

### Q1 — Local-overrides edit scope (spec req 24 vs research consolidated req 22)

**ANSWERED — confirmed on all three, with a paper trail.** (a) The approved spec.md req 24 / AC 11 is **binding**; the research's consolidated req 22 is the **pre-rejection wording the spec phase already discarded**. The discrepancy I flagged was the *exact* iteration-1 spec-review blocker (`spec-review-1-rejected.md:51-109`, defect B1: "req 24 edits a 'loader overridable-vs-shared guidance' that does not exist; the 'for-free / no-new-mechanism' claim is false"), fixed by commit `d2b2369` and confirmed in `spec-review-approved.md:18-36`. (b) Shipped-tree grep (excluding `.pipelines/`) for `overridable` / ignore-warn phrasing / `.rp.local` returns **zero** enumerated-subset or enforcement matches — only the generic stub (load.md:33), the out-of-scope README Configuration paragraph (README.md:143,149), and a CHANGELOG note. The detailed #91 machinery used to live in a separate `local-overrides.md` (180 lines) that commit `c243245` **deleted**, collapsing load.md to today's 3-sentence stub before #91 merged; the enumerated-subset + ignore-and-warn rules survive only in unshipped `.pipelines/91-...` artifacts. So "non-overridable by omission" contradicts nothing. (c) The clarifying sentence is **warranted, not optional** — and the *wording* is load-bearing (see D6).

→ Settled in **D6** below.

### Q2 — `setup.md` capture-step placement, parity-floor wording, and validation edge cases

**ANSWERED — placement confirmed, parity floor confirmed (consolidated req 11 superseded), two edge-case caveats added.** (a) The guardrails capture step goes **last in Step 2** — it's optional, self-contained, and the only step that *executes* commands; A2 also sharpened the timing: validate **as each guardrail is captured**, before the Step-4 confirm-before-write, so failures surface before the owner approves the file. (b) The parity floor is the approved spec req 17 wording — **main-checkout standard shell and working directory**, NOT the worktree (none exists at setup); A2 measured live that this floor catches command-not-found (127), not-executable (126), and the `npm test` glob/parity case (exit 1, unrunnable). The research's consolidated req 11 "worktree working directory" is **superseded**. (c) Two caveats beyond the spec's three-way split, both specific to this being the only setup step that runs a command: a **hang/no-return** command folds into the don't-write-and-surface branch (no mandated timeout number — `timeout` isn't portable, confirmed absent on macOS), and a **state-mutating** command (`--write`/deploy/destroy) should be confirmed-before-running because validation executes it. Interactive prompts are absorbed by the hang note.

→ Settled in **D5** above.

## Design decisions (all settled on grounded evidence)

These follow from the approved spec + the verified file state + the researcher's evidence. D1-D4 were settled directly from the spec and the live files; D5 and D6 are settled by the researcher's answers A2 and A1 respectively. Each decision cites the requirement(s) and acceptance criteria it satisfies.

### D1 — `load.md` loader row + body

**Table row.** Add one row to the `## Conventions` table (load.md:11-21), matching the existing optional-row pattern (Commit format / Team spawning / Agent models all `No`):

| `Guardrails` | terse one-liner signalling executable/exit-code nature | `No` |

The "What it covers" cell stays terse like every other row but must signal the value is *executable, not advisory*. Spec req 7 gives the model wording: "The deterministic verification gates — exact commands judged pass/fail by exit code — the code/doc phases must pass." Column alignment is cosmetic (the table is hand-aligned); the writer re-pads.

**Why `No` is load-bearing, not incidental:** the `## Missing conventions` logic (load.md:23-29) keys off **required** conventions ("If all required conventions are available, continue…"; "If one or more required conventions are missing, do not proceed"). An optional row is structurally invisible to the missing-conventions gate, which is exactly how spec req 8 / AC 13 ("absent guardrails never blocks, never triggers setup-required flow") is satisfied **for free** — no new branch in the missing-conventions logic. The design must NOT add guardrails to any required-completeness check.

**Body addition.** The table cell can't carry the definition; spec req 9 / AC 2 puts the fuller "what a guardrail is" in `load.md`'s body and/or `setup.md`. Decision: add a short body paragraph (a `### Guardrails` subsection or a paragraph under the table — writer picks the lighter touch that matches load.md's existing prose density) documenting:

1. **What a guardrail is** — an exact command, judged pass/fail solely by exit code (0 = pass, non-zero = fail), mandatory within the phase(s) it applies to. "Run the tests" is not a guardrail; `npm test` is.
2. **Absent/empty = no command gates** — a valid, complete state, never a blocker, never a warning.
3. **How an agent loads guardrails for a phase** — select the guardrails whose phase(s) include the current phase; an empty selection means run none and proceed. This is the phase-selection rule the four agents rely on; stating it once in the loader keeps the four agents terse (they reference "the guardrails applicable to the {code|docs} phase" and the loader defines what that selection means).

This body text is where the code/docs phase dimension is explained, so the agents can just say "the guardrails applicable to the {code|docs} phase" without re-deriving the selection each time.

### D2 — The four-agent rewrite contract (three buckets, ~17 line-level edits)

Grounded in the verified line map above. Three transformation buckets, applied per the spec's leave-alone discipline.

**Bucket 1 — replace "host project's verification convention" → "the guardrails applicable to the {code|docs} phase" for the command-gate role.** code-writer/code-reviewer get **code**-phase guardrails; doc-writer/doc-reviewer get **docs**-phase guardrails (spec req 18 / AC 7). The "read" step and the "run-the-gates" step both change:

- code-writer `:13` (read step), `:46` (the "defines a set of gates" paragraph → "run every guardrail applicable to the code phase").
- code-reviewer `:18` (read step), `:32` (step-2 "run … exactly as documented" → run the code-phase guardrails), `:68` (review-template comment — evidence wording).
- doc-writer `:35` (straggler "if the verification convention supports doc tests" → "if a docs-phase guardrail covers doc tests"), `:40` (step-4 "may enumerate gates relevant to documentation" → the docs-phase guardrails; the enumerated examples link-check/markdown-lint/render-check/doc-tests/spelling stay as *examples of docs-phase guardrails*).
- doc-reviewer `:33` (step-2 "Doc gates — if the host project's verification convention enumerates…" → docs-phase guardrails), `:98` (guideline "Run the gates if any exist" — reworded to docs-phase guardrails).

**Bucket 2 — the three-way blocker split (the subtle heart; spec req 19/20/21, AC 8).** Two notions today's text conflates ("absent → blocker" and "unrunnable → blocker") must be split into three outcomes, stated explicitly in each agent:

1. **Absent/empty guardrails for the phase ⇒ run none and proceed.** NOT a blocker, no warning. This **removes** the "missing or unrunnable … is a blocker" sentences (code-writer `:51`, doc-writer `:45`) and the "verification convention is missing/undefined" blocker examples (code-writer `:70`, code-reviewer `:98`, doc-writer `:65`, doc-reviewer `:99`). After the change **no "guardrails missing = blocker" path remains** in any agent (spec req 20).
2. **A declared guardrail whose command does not resolve/execute (unrunnable) ⇒ blocker** — a declared gate the agent cannot honor (binary missing, script renamed). This is the *residual* run-time blocker (spec req 21). It is kept, but reworded so it triggers only on "the declared command cannot execute," NOT on "no guardrails declared."
3. **A guardrail that runs and exits non-zero ⇒ work to fix, not a blocker** — same as today's "failing gates are work, not blockers." Kept verbatim in spirit (code-writer `:50` already says this).

The single distinction tying setup-time validation and the run-time residual blocker together — **"did the command execute?" vs "did the gate pass?"** — should be stated in the agents so the split reads as one coherent model, not three disconnected rules.

**Bucket 3 — de-couple behavior verification, keep it as its own step, NOT a guardrail (spec req 22 / AC 9).** code-writer `:36` and code-reviewer `:36` are reworded to stand alone: the agent exercises the changed user-observable behavior end-to-end **itself** and decides the appropriate evidence (screenshots/transcripts/output samples/response diffs). The guidance on *how to exercise* and *what evidence to capture* must now live **in the step itself** — there is no convention to defer to. Behavior verification is explicitly NOT reclassified as a guardrail. The review-template "Behavior verification" comment (code-reviewer `:68`) loses its "as required by the host project's verification convention" anchor.

**Leave-alone list (must stay; do NOT touch — spec req 23 / AC 10).** These are different conventions, not the command-gate role:

- inline API-documentation convention (code-writer `:29`, code-reviewer `:30`);
- testing convention (code-writer `:42`);
- UI conventions (code-writer `:38`);
- coding/build conventions (code-reviewer `:31`);
- commit format (code-writer `:56`, code-reviewer `:84`, doc-writer `:50`, doc-reviewer `:85`);
- **documentation convention** = voice/structure/formatting/cross-linking (doc-writer `:17`, `:27`; doc-reviewer `:19`, `:32`).

**The naming-collision trap (spec req 23 explicitly):** doc-writer step 4 "documentation **gates**" (`:40`) and doc-reviewer "Doc **gates**" (`:33`) ARE docs-phase guardrails (they source from "the host project's **verification** convention" and list link-check/markdown-lint/render-check/doc-tests/spelling) → rewrite to "docs-phase guardrails." Do NOT confuse with doc-writer `:17/:27`'s "documentation **convention**" (voice/structure) → leave alone. The writer must name these distinctly.

**Verification of this bucket:** after the rewrite, `grep -rn "verification convention" agents/` returns **nothing** (spec AC 10, grep-negative). This is a hard acceptance gate distinct from "the agents now reference guardrails" — a sloppy edit can add guardrails wording while leaving a straggler (e.g. doc-writer `:35`). Both checks must pass.

### D3 — `.rp.md` dogfood `### Guardrails` subsection

Add `### Guardrails` under `## Shared conventions` (tool-agnostic — spec req 4/AC 3), alongside `### Commit format` / `### Agent models` / `### Health monitoring`. File title unchanged; no `## Guardrails` sibling; no "configuration" retitle (spec OOS 1).

Declares the three **real** code-phase gates (spec req 25 / AC 12), each with name + exact literal command + phase:

- `npm test` — the `node --test` suite over `scripts/test/**` (code).
- `node scripts/validate-changesets.mjs` — the changeset-shape validator (code).
- `npx changeset status --since=origin/trunk` — changeset-presence, pinned to `origin/trunk` so it is one fixed literal command (code).

Shape decision (since OOS 4 forbids any schema/parser): author it as prose the agents read, matching how other `### ` subsections are written. A small Markdown table (`Name | Command | Phase`) reads cleanly and mirrors the `### Agent models` table already in this file — recommend that, but the writer may use a bullet list if it matches the surrounding density better; either is "prose the agents read." The `npm test` Node ≥21 caveat is worth a one-line note (it validates clean on Node ≥21 / CI Node 22; on stale local Node 20 it errors as unrunnable — the live parity lesson). The `npm test` script wart is **not** fixed here (spec OOS 2).

### D4 — Changeset + grep-negative

`minor` changeset (spec req 27 / AC 14): the change edits release-relevant `agents/**` and `skills/**`. Pre-1.0 new feature = `minor` (`validate-changesets.mjs` forbids `major` pre-1.0). The changeset is **authored, not a guardrail** — `npx changeset status` / `validate-changesets.mjs` are the guardrails that *check* it; the changeset is the thing checked (no circularity). `.rp.md` and `.pipelines/**` are not release-relevant, but the agents/skills edits require the changeset regardless.

**Grounded changeset shape** (verified): `.changeset/config.json` `changedFilePatterns` = `["skills/**","agents/**",".claude-plugin/**","package.json","README.md"]`; package is `@automattic/radical-pipelines` at `0.2.0` (pre-1.0). Existing changeset `.changeset/pipeline-reviews.md` is the template: `---`-delimited frontmatter with a single line `"@automattic/radical-pipelines": minor`, then a one-paragraph summary. The new changeset follows this exactly (one new `.changeset/<name>.md`, `minor`, one-paragraph feature summary). This is a **plan/code-phase deliverable**, not something the design doc authors; the design records only that it is required and `minor`.

The grep-negative (`grep -rn "verification convention" agents/` → empty) is the cheap mechanical acceptance check the writer/reviewer run after the agent rewrites.

### Cross-check: the approved spec-review pre-verifies most of the design's grounding

`1-spec/spec-review-approved.md` (iteration N=2) records that the spec-reviewer **empirically reproduced** in iteration 1: the grep-negative scope (string in exactly the four phase agents), the agent-rewrite line targets and leave-alone references, the loader/`.rp.md` structure (no `## Guardrails` sibling), the three-way validation outcome split (exit 127 unrunnable / 1 runs-but-fails / 0 passes, reproduced), Node v20.19.4 local vs Node 22 CI + the `npm test` glob behavior, and the changeset requirement. I independently re-verified the grep surface, the three live gate commands, and the `## Local overrides` stub above — they match. So D1–D4 rest on doubly-confirmed ground.

Notably, the **iteration-1 spec-review blocker was exactly the local-overrides discrepancy I raised in Q1**, and it was resolved precisely as I concluded: guardrails non-overridable **by omission**, only a short shared/committed-only sentence, no ported #91 machinery, OOS 7 bars porting it. The approved spec.md is therefore binding **and** accurate on this point; Q1's answer is effectively pre-settled by the approved spec. (Still awaiting the researcher's explicit confirmation, but the design proceeds on the approved-spec reading.)

**Carried-forward non-blocker (from spec-review):** `claude-code.md` says "three" tool-forced conventions but documents four blocks. Pre-existing, in a file this spec does not touch, no bearing on guardrails — explicitly NOT a guardrails-introduced error and NOT in this design's scope. Recorded so it is not mistaken for one.

### D5 — `setup.md` capture step + three-way validation _(SETTLED by A2)_

**Placement (confirmed by A2).** A new `### Guardrails` capture sub-section inside Step 2 "Collect required conventions" (setup.md:26), placed **last** (after `### Artifact storage`, setup.md:106). Two reasons: (1) it is optional and self-contained, and nothing earlier in Step 2 supplies data it needs (validation keys off the live environment, not off captured conventions); (2) it is the **only** capture step that *executes* commands, so trailing placement keeps the pure-Q&A steps together and the one side-effecting step at the end. Its only real dependency is Step 1 (the tool-rules read) being done, which last-in-Step-2 satisfies with margin. Marked **optional**; "None" is a complete, valid answer.

**Timing — validate as each guardrail is captured, BEFORE the Step-4 confirm (A2 sharpening).** The validation action lives *inside* this capture step and runs *as each command is captured*, so an unrunnable command can be corrected/dropped before the owner reaches Step 4's confirm-before-write (setup.md:179-186, "do not create a misleading complete conventions file"). Do NOT defer validation to Step 4 — that would surface failures after the owner already approved the proposed file content.

**Capture content (spec req 10 / AC 4).** The step must:
1. Explain **why** guardrails matter — the backpressure rationale (objective gates that reject incomplete work so the agent produces concrete evidence and keeps iterating until every deterministic gate passes).
2. Explain **what kinds** to consider — tests, lint, typecheck, build, format, audit, e2e, project-specific validators.
3. Capture per gate: a **name**, the **exact literal command**, and the applicable **phase(s)** ∈ {code, docs}.
4. State that "None" is complete and valid.

**Validation before writing (spec req 11-16 / AC 5).** The orchestrator runs each captured command and writes it only on the right outcome. The three-way split, stated explicitly:
- **runs-and-exits-nonzero ⇒ WRITE.** A valid guardrail; the failing result is just today's code state (red tests / mid-development). This is the clause most likely to be omitted — it must be explicit. (Live proof: `node -e "process.exit(1)"` → exit 1 = resolved+executed = a real runnable gate.)
- **errors-as-unrunnable (127/126-style) ⇒ do NOT write.** Surface the failure to the owner (error + exit code); offer (a) fix/replace, (b) drop that guardrail, (c) keep only if the owner explicitly insists the command is correct and the validation environment is the discrepancy (escape hatch). Default: do not write an unvalidated command. Never silently persist a known-unrunnable gate; never "write anyway but warn." (Live proof: `nonexistent-linter --check` → exit 127 = unrunnable; `npm test` on Node 20 → "Could not find …" exit 1 but *didn't actually run as intended* — an owner-arbitrated ambiguous case.)
- **zero captured ⇒ nothing to validate**, a valid complete state; no failure manufactured from emptiness.

Validation is **per-command and independent** (one bad command doesn't void or block the others, and doesn't abort the wider conventions capture — drop/correct it and finish). Exit codes are the **primary signal but a heuristic, not a proof** (a wrapper can exit 127 internally; some tools print "not found" while exiting 0) — for ambiguous cases the orchestrator confirms with the owner whether the command actually executed. The requirement is "confirm it executed," NOT "exit code must be N."

**Parity floor (spec req 17 / AC 6) — CONFIRMED by A2.** Setup runs **before any pipeline worktree exists** (setup.md:3 — runs in the main checkout; the worktree is created later by `EnterWorktree` when a workflow begins). So the floor is worded **verbatim per spec req 17**: "the project's standard shell and working directory [main checkout], as close to the agents' execution environment as the orchestrator can reach" — NOT "the worktree working directory" (no worktree exists yet). The research's *consolidated* req 11 "at minimum the worktree working directory" is the older pre-correction phrasing and is **superseded** by approved spec.md req 17. Perfect parity (env vars, secrets, network) is impossible; the requirement is an explicit goal with a stated floor.

The main-checkout standard shell genuinely catches the realistic failure modes — A2 measured them live in this worktree (zsh, Node v20.19.4): command-not-found `nonexistent-linter --check` → exit 127; not-executable (`chmod -x` script) → exit 126; the `npm test` glob/parity case → exit 1 with "Could not find '…/scripts/test/**/*.test.mjs'" (confirmed it's the glob, not a real failure — `node --test scripts/test/*.test.mjs` → exit 0); the two clean dogfood gates → exit 0. The only thing the main-checkout floor can't catch is a worktree-only env difference (vars/secrets/paths injected at worktree run time) — which the spec already concedes as the impossible-parity tail.

**Complementarity (spec req 21).** Setup-time validation (authoring-time gate) and the agent-side run-time residual blocker (drift guard) are complementary, not redundant — different time windows (author vs run) and failure sources (bad input vs drift). Both pivot on the same distinction: **"did the command execute?"** (unrunnable = problem) vs **"did the gate pass?"** (non-zero exit = legitimate work). The design should state this shared spine in both setup.md and the agents so the two requirements read as one model.

**Two edge-case caveats beyond the three-way split (A2 — keep; both are specific to this being the only setup step that *runs* a command).**

1. **Hang / no-return → fold into the don't-write-and-surface branch.** A command that never returns (a watch/server started by mistake, a tool waiting on input forever) yields *no exit code at all*, so the three-way split — which assumes a terminal exit — has no branch for it. One prose line: "if a validation command does not return promptly, treat it as not-validated, stop it, and surface it to the owner — a guardrail must terminate on its own; a never-returning command isn't a deterministic gate." Frame it as a fourth observable outcome folded into the unrunnable branch (don't-write + surface). Do **NOT** mandate a timeout number: A2 confirmed `timeout` is not even present on this macOS shell (`command not found: timeout`), so a portable numeric timeout can't be assumed — over-mechanizing it would be brittle. Interactive-prompt commands are absorbed by this same note (most fail-fast on closed stdin — `read </dev/null` → exit 0 immediately — but a tool reading `/dev/tty` directly can block, which is just the hang case).
2. **State-mutating command → confirm before running.** Unlike every other capture step, this one *executes* the captured command, so a gate that writes/deploys/destroys (`format --write`, a deploy, a `db-reset`) would take effect against the owner's checkout *just to validate it*. The dogfood gates are all read-only so this didn't bite in experiments, but the risk is real and unique to this step. One short caveat: "validation runs the command, so a gate that writes, deploys, or destroys will take effect — confirm with the owner before running such a command (or accept their word it is correct: the req-13 escape hatch)." Worth including — it costs one sentence and prevents the worst foot-gun, and it is *not* over-engineering because the act of validation is itself the side-effect vector.

### D6 — `load.md` `## Local overrides`: one carve-out sentence (SETTLED by A1)

Add **one sentence** to the existing `## Local overrides` stub (load.md:31-37). Do NOT enumerate an overridable subset, do NOT author any "ignored / committed-value-used / warn-on-override" enforcement (none exists in the shipped loader to extend; porting it re-opens #91 scope — spec OOS 7). This satisfies spec req 24 / AC 11 exactly.

**The wording is load-bearing — phrase it as a carve-out from the merge rule, not as warn-on-override behavior.** The stub's merge rule (load.md:37) is *unconditional*: "where it names a convention its value wins." With no enumerated subset and no exclusion logic, a developer who drops a `### Guardrails` block into `.rp.local.md` would, under the literal merge rule, have the **local value win** — silently weakening a shared, must-hold-for-everyone gate, with nothing to catch it (the ignore+warn enforcement doesn't exist). That is a real correctness gap, which is why the sentence is **warranted, not optional**.

- **Correct shape** (a scoping carve-out the agent applies when reading the merge step): *"Guardrails is shared and committed-only; it is never taken from `.rp.local.md`."* An agent following load.md simply won't apply a local guardrails value — honest about what's shippable, closes the gap, adds no mechanism.
- **WRONG shape** (asserts absent enforcement): "a local guardrails override is ignored and the run warns." This promises the #91 warn machinery that doesn't ship — exactly the iteration-1 spec-review defect. Do NOT write this.

The sentence attaches to the existing stub (after load.md:37's merge rule, as a carve-out from it). No other change to `## Local overrides`.

## Design complete — deliverable map for the design-doc-writer

All open questions resolved; all six decisions settled on doubly-verified evidence (my own re-verification + the approved spec-review's empirical reproduction + the researcher's live experiments). This is a **prose/instruction change across five files plus a changeset** — no code, no schema, no parser (spec OOS 4). The design doc should specify, per file:

1. **`skills/radical-pipelines/reference/conventions/load.md`** (D1 + D6):
   - One `Guardrails | <terse executable-signalling one-liner> | No` row in the `## Conventions` table (load.md:11-21). `No` is load-bearing — it makes guardrails structurally invisible to the missing-conventions gate (load.md:23-29), satisfying optionality for free. Do NOT add guardrails to any required-completeness check.
   - A short body addition defining a guardrail (exact command, judged by exit code, mandatory within its phase(s)), stating absent/empty = no command gates (valid, never a blocker/warning), and giving the phase-selection rule (select guardrails whose phase(s) include the current phase; empty selection ⇒ run none, proceed).
   - One carve-out sentence on the `## Local overrides` stub: "Guardrails is shared and committed-only; it is never taken from `.rp.local.md`." NOT phrased as warn-on-override.

2. **`skills/radical-pipelines/reference/conventions/setup.md`** (D5):
   - New optional `### Guardrails` capture sub-section, **last** in Step 2. Explains the backpressure *why* and the *kinds* (tests/lint/typecheck/build/format/audit/e2e/project validators); captures name + exact literal command + phase(s) ∈ {code, docs}; "None" is complete.
   - Validation **as each command is captured** (before Step-4 confirm), in the main-checkout standard shell (parity floor verbatim per req 17). Three-way outcome: runs-and-exits-nonzero ⇒ WRITE; unrunnable (127/126-style) ⇒ don't-write + surface (error+exit code) + fix/drop/insist-escape-hatch, default don't-write; zero captured ⇒ nothing to validate. Per-command independent; exit codes a heuristic, owner arbitrates ambiguous cases. Plus the two caveats: hang/no-return folds into don't-write+surface (no mandated timeout number); state-mutating command confirmed-before-running.

3. **`agents/code-writer.md`, `agents/code-reviewer.md`, `agents/doc-writer.md`, `agents/doc-reviewer.md`** (D2): three buckets per the exact line map —
   - Bucket 1: replace "host project's verification convention" → "the guardrails applicable to the {code|docs} phase" for the command-gate role (read step + run-the-gates step).
   - Bucket 2: the three-way blocker split — absent/empty ⇒ run none and proceed (remove every "missing = blocker" path); declared-but-unrunnable ⇒ blocker (residual drift guard); runs-but-exits-nonzero ⇒ work to fix. State the "did it execute? vs did it pass?" spine.
   - Bucket 3: de-couple behavior verification, keep it as its own step, NOT a guardrail; the how-to-exercise/what-evidence guidance now lives in the step itself.
   - Honor the leave-alone list and the documentation-convention-vs-docs-phase-guardrails naming-collision trap. **Gate: `grep -rn "verification convention" agents/` returns empty.**

4. **`.rp.md`** (D3): `### Guardrails` under `## Shared conventions`, declaring the three real code-phase gates (`npm test`, `node scripts/validate-changesets.mjs`, `npx changeset status --since=origin/trunk`) as prose the agents read (a `Name | Command | Phase` table mirroring `### Agent models`, or a bullet list). File title unchanged; no `## Guardrails` sibling; no retitle. One-line Node ≥21 note for `npm test`.

5. **Changeset** (D4): one `minor` changeset following the `.changeset/pipeline-reviews.md` template. Authored, not a guardrail.

**Out of scope (do not touch):** the configuration-umbrella rename / `.rp.md` retitle / `## Guardrails` sibling (OOS 1); the `npm test` Node-glob fix (OOS 2); behavior-verification-as-guardrail and the 4th evidence field (OOS 3); per-tool guardrail variants and any parser/schema (OOS 4); the phase-loop / phase-reference docs — verified grep-clean (OOS 5); non-code/docs phases (OOS 6); any new local-overrides mechanism and the README/website prose — docs-phase territory (OOS 7); back-filling other `.rp.md` files (OOS 8); phase-dispatch orchestration (OOS 9).

**Acceptance verification the design enables (spec AC 1-15):** the grep-negative over `agents/`; the three-way validation split asserted in setup.md; the three-way blocker split asserted in each agent; the loader row marked `No`; the `.rp.md` shape (no sibling/retitle); the dogfood gates resolve-and-execute on Node ≥21; end-to-end optionality across setup+load+agents with no blocker/warning; the `minor` changeset present and not declared as a guardrail.
