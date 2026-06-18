# Spec Research — Issue 122: Plan-driven test selection and reviewer-side behavior verification

Running record of the requirements Q&A between the spec-analyst and spec-researcher. Each topic captures the question, the evidence gathered, and the settled requirement.

## Scope (from intent)

Move test selection from per-writer judgment to phase-3 planning, and move behavior verification from per-task (writer) to once-at-the-integrated-feature (code-reviewer). Concretely the intent proposes:

- A "Required test commands" section in `code-plan.md`: planner-chosen exact commands, two-question exit-code model, run by every writer before every commit.
- The planner transforms spec acceptance criteria + edge cases into an explicit e2e test plan inside `code-plan.md`; "derive e2e from behavior verification" is removed.
- `code-plan-reviewer` validates both sections.
- Writer-side behavior-verification step removed; `code-reviewer` verifies the integrated feature once (free-form + re-driving planned e2e flows).
- Split `code-writer` into `code-writer-tdd` and `code-writer-e2e`, dispatched by task type.

Constraints (fixed, not open):
- Unit-test TDD stays with the writers as-is.
- Plan-specified test commands are a floor, not the full set — writers still run judgment-chosen tests on top.
- The evidence requirement for behavior verification stays intact.
- The CI matrix stays at PR time, outside Radical Pipelines.

## Topics worked through (all settled)

1. Required-test-commands vs guardrails convention — Q1.
2. Orchestrator dispatch by task type — Q2.
3. Agent roster / gate-running enumeration impact of the split — Q3.
4. Behavior-verification relocation + e2e-plan source — Q4.
5. code-plan-reviewer's new validation duties — Q5.
6. Writer run-loop integration + assisted-mirror scope — Q6.
7. Complete surface inventory + agent registration — Q7.

The settled requirements (R1-R10), out-of-scope items, and acceptance criteria are at the end of this document.

---

## Q1 — Required-test-commands vs guardrails convention

**Evidence (researcher):**
- Guardrails (load.md/setup.md, stored in `.rp.md`) are the ONLY declared deterministic command-gate channel today. A writer-type agent "runs every gate in its selection exactly as each command is written, all passing before each commit" (load.md:32); selection = guardrails naming it + guardrails naming no agents (load.md:30). The task-block schema has no command field (code-plan-writer.md:37-44), and code-plan-writer.md:64 forbids planning tests.
- Lifecycle distinction confirmed: guardrails are captured ONCE at setup, project-wide, shared across pipelines, committed-only (`.rp.md`; load.md:48; setup.md:206 anchors capture to the pre-pipeline main checkout). Nothing today lets a per-pipeline artifact carry writer-must-run commands.
- Neither load.md nor setup.md contemplates feature-specific/per-pipeline test commands; everything is framed "the project" (setup.md:177), not "this feature."
- TDD unit tests and derived e2e tests ARE commands writers run, but by judgment, not as a declared gate.

**Settled requirement:**
- Required-test-commands is a GENUINELY NEW concept: a second, per-pipeline command-gate channel sourced from `code-plan.md`, chosen by the planner from spec+design, coexisting with (not replacing) the project-wide `.rp.md` guardrails channel.
- It REUSES guardrails mechanics: exact literal command, the two-question exit-code model ("did the command execute?" / "did the gate pass?"), run-before-every-commit by writers, mandatory floor.
- It DIFFERS in lifecycle (per-pipeline vs project-once), authorship (planner vs owner-at-setup), source (spec+design vs owner judgment).
- It is a FLOOR, not the full set: writers still run judgment-chosen tests on top (intent constraint).
- Guardrails remain unchanged and continue to run alongside required-test-commands.

**Flagged seam (for Q3):** load.md:30 fixes gate-running agents as exactly `code-writer`, `code-reviewer`, `doc-writer`, `doc-reviewer` and calls the enumeration "load-bearing." Splitting code-writer affects this enumeration and the guardrails Agents-field semantics.

## Q2 — Orchestrator dispatch by task type

**Evidence (researcher):**
- Today the orchestrator launches the single `code-writer` for EVERY task, no per-task branching ("4 - code.md":31,33). The batch is just the ordered task list. The orchestrator reads only the six task-block fields (Goal/Files/Changes/Depends on/Traces to/Acceptance) and passes them verbatim; it does not interpret them to choose an agent.
- No notion of task "type"/"kind" exists anywhere (grep: zero hits). The task-block schema has no type field and no field distinguishing e2e vs unit. "User-observable behavior" lives only in code-writer.md:34 and code-reviewer.md:35, never in the task schema.
- Today TDD-vs-e2e is decided INSIDE one task by writer judgment: e2e is a sub-step (code-writer steps 3-4) of any behavior-changing task, not its own task. A single task may carry both unit and e2e tests. This is a genuine structural change, not surfacing something latent.
- Literal `code-writer` sites in "4 - code.md": L3, L25 (required-agents row), L33, L34, L35.
- "3 - plan.md": ZERO literal code-writer mentions; phase-3 exposure is indirect via code-plan-writer.md / code-plan-reviewer.md.

**Other `code-writer` name sites beyond the intent's listed-touched set (scope flags):**
- agents/code-reviewer.md L3,L6,L8,L99; agents/code-plan-writer.md L6,L32,L57,L60,L64; agents/code-plan-reviewer.md L26,L28,L31; agents/doc-writer.md:64 (incidental example).
- setup.md:183 + example table L189 (guardrails Agents field enumerates code-writer); load.md:30 (load-bearing gate-running enumeration).
- assisted-phases/3 - plan.md L25,L30,L114,L149,L152 and assisted-phases/2 - design-doc.md L48,L81,L100 (the ASSISTED mirror; not in intent's "Likely touches").

**Settled requirements:**
- A new per-task TYPE field is required in the code-plan.md task schema so the orchestrator can dispatch the correct writer. Tasks become EITHER tdd-type OR e2e-type (mutually exclusive); the planner partitions unit and e2e work into separate tasks. (Exact field name and values are a design-phase detail; the requirement is that task type is plan-declared and orchestrator-readable.)
- Phase-4 dispatch (step 3) must select the writer agent by the task's type rather than always launching `code-writer`.
- Open question deferred to design: whether e2e tasks map 1:1 to behavior or consume a separate e2e-plan section. Spec records that e2e work becomes its own task type; not the mapping.

**Scope decision needed (raise in Q8):** the split + test-planning reframe forces edits beyond the two phase files the intent names — load.md:30, setup.md:183/189, all four code-* agent files, and a call on the assisted mirror. CLAUDE.md's "no duplication across paths" rule implies leaving the assisted mirror inconsistent would be a defect.

## Q3 — Agent roster / gate-running enumeration impact of the split

**Evidence (researcher):**
- Dropping `code-writer` from the load.md:30 enumeration makes any guardrail that names ONLY `code-writer` "selected by no current agent and is inert … this causes no error, blocker, or warning" (load.md:30). Silent loss. A no-agent guardrail still runs for every gate-running agent, so it would run for both new writers.
- No migration/rename machinery exists anywhere in the skill; the inert rule is steady-state, not migration. CLAUDE.md forbids transient/historical/migration text. The generic case is already handled gracefully by the steady-state inert rule. No migration text needed.
- Guardrail-running is keyed to the writer-type ROLE, not the literal name: "A writer-type agent produces commits — it runs every gate in its selection … all passing before each commit. … An agent is writer-type if it commits work" (load.md:32). Both new writers commit (code-writer.md:6,59; step 5 L44-49), so both are writer-type and run their guardrail selection before every commit. Each writer's selection = guardrails naming it + guardrails naming no agents (load.md:30), so tdd-only and e2e-only gates can be targeted independently.
- `.rp.md` is owner-captured config written ONLY by the setup flow (setup.md:112,223,232,249-250); read at run start (load.md:5). No reference file instructs editing `.rp.md` when the roster changes. The canonical `.rp.md` block in claude-code.md:7-44 covers only Worktrees/Branch names/Team spawning/Health monitoring — it does NOT enumerate agent names, so claude-code.md is unaffected by the split. Agent-models and Guardrails-Agents live in the owner-captured portion.
- Operational catch for THIS repo: its Agent-models table has a `code-writer` row (sonnet) and NO `**Default:**` row, so after the split code-writer-tdd/code-writer-e2e would have no model mapping for a real run.

**Settled requirements:**
- The load.md:30 gate-running enumeration MUST be updated to {code-writer-tdd, code-writer-e2e, code-reviewer, doc-writer, doc-reviewer}.
- setup.md:183 Agents-field option list MUST be updated to offer both new writer names; the setup.md:189 example table (currently names `code-writer`) MUST be updated to a post-split name. These two files MUST stay in lockstep (same set, two views) — CLAUDE.md forbids cross-path inconsistency.
- Both code-writer-tdd and code-writer-e2e are writer-type agents: each runs its guardrail selection (and the new required-test-commands) before every commit. Each selects guardrails naming it plus no-agent guardrails.
- NO migration/backward-compat text is added; the steady-state inert rule already covers a guardrail naming a now-gone agent.

**Scope boundary (decided):**
- Editing `.rp.md` is NOT a skill change. The skill is "done" when load.md:30 + setup.md:183/189 are updated and the two writer agent files exist. Updating THIS repo's own `.rp.md` (add code-writer-tdd / code-writer-e2e model rows, drop code-writer) is a required OPERATIONAL follow-up for the next real run to dispatch correctly, recorded in the spec as out-of-scope-for-skill but necessary, NOT folded into skill acceptance criteria. (Confirm framing with owner if needed; default is to record as a follow-up note.)

## Q4 — Behavior-verification relocation + e2e-plan source (coupled)

**Evidence (researcher):**
- Writer-side text to remove/rework in code-writer.md: L24 (e2e not in RED, added in step 4 after behavior verification), L34 heading (step 3 Behavior verification), L36 (behavior-verification paragraph + evidence capture), L40 heading (step 4 Derive e2e), L42 (self-derivation), L46 (step-5 back-reference). L38's UI-conventions duty sits inside step 3 but is independent of verification and must be PRESERVED somewhere. Frontmatter L3 / L6 frame the agent as TDD.
- Residual writer e2e duty: e2e tests are STILL written by a writer, but the source flips — code-writer-e2e IMPLEMENTS the planner's e2e specs from code-plan.md instead of self-deriving from its own verification. code-writer-tdd writes unit tests only (RED/GREEN/REFACTOR, L18-23). Whether code-writer-e2e does any local verification is design-open; intent leans toward verification moving entirely to the reviewer.
- Reviewer ALREADY does integrated, batch-level free-form behavior verification WITH the strong evidence requirement (code-reviewer.md:8 "once per batch"; L33-35; template L81; guideline L110). L35: "...A verification claim without evidence is not a verification — either produce the evidence or reject the batch." The reviewer also already checks e2e presence (L29).
- The change to the reviewer is ADDITIVE: keep existing free-form verification + evidence text unchanged, ADD "manually re-driving the planned e2e flows" from code-plan.md.
- Evidence locus: today writer-side (code-writer.md:36, weaker capture-only form) + reviewer-side (code-reviewer.md:35, strong verdict-bearing form). After change, writer-side text goes away with the step; reviewer-side stays UNCHANGED. "Evidence requirement stays intact" = relocation, not rewording — the strong rule was already on the reviewer.
- The e2e test plan is a SHARED code-plan.md section with TWO consumers: code-writer-e2e (to implement) AND code-reviewer (to re-drive). It must be concrete enough for both.

**Settled requirements:**
- Remove the writer-side behavior-verification step and the writer-side e2e self-derivation step from the code-writer agent(s), including the back-references (code-writer.md L24, L34-42, L46). Preserve the independent UI-conventions duty (L38) in the appropriate writer.
- code-writer-tdd: unit tests only via TDD. code-writer-e2e: implements the planner's e2e test specs from code-plan.md.
- code-plan-writer gains a duty: transform the spec's acceptance criteria + edge cases into an explicit e2e test plan section in code-plan.md. This section is a shared artifact serving both the e2e writer (implement) and the reviewer (re-drive); it must be concrete enough for both.
- The "Do NOT plan tests" prohibition (code-plan-writer.md:64; code-plan-reviewer.md:28's "No test planning" check) MUST be lifted/reworked — the planner is now REQUIRED to plan e2e flows and required-test-commands. THIS IS THE SINGLE MOST IMPORTANT CONSISTENCY EDIT; it is the exact opposite of today's text. (Note: unit tests remain TDD/writer-chosen — the lift is scoped to e2e flows + required-test-commands, not unit tests.)
- code-reviewer step 3 gains "manually re-drive the planned e2e flows" while its evidence text stays intact.
- The reviewer's evidence requirement (code-reviewer.md:35, template L81, guideline L110) is unchanged.

**Coupling:** (a) writer-step removal, (b) e2e-writer repoint, (c) planner e2e-plan section + lift "Do NOT plan tests", (d) reviewer re-drive duty — must land together.

## Q5 — code-plan-reviewer's new validation duties

**Evidence (researcher):**
- Analogy holds exactly: plan-reviewer : code-plan.md required-test-commands :: setup.md : .rp.md guardrails. setup.md validation EXECUTES commands but answers ONLY "did it execute?" not "did it pass?" (L197); pass bar is "it executed, NOT exit 0" (L199); unrunnable ⇒ reject (L200); per-command independent (L202); never-returning/destructive caveats (L210-211).
- code-plan-reviewer runs NO commands today — only reads/inspects (L11-31; L16 explores codebase to verify paths). Executing-to-validate is a brand-new duty; setup.md is the only existing command-executing validator in the skill.
- Environment: the plan-reviewer runs INSIDE the pipeline worktree (better parity than setup.md, which runs in the main checkout before any worktree exists).
- PLAN-TIME-NO-CODE-YET COLLISION (new, needs decision): at plan time the feature isn't implemented, so a required-test-command pointing at not-yet-written tests is legitimately "unrunnable." Naive setup.md transplant would wrongly reject. The coherent line: the plan-reviewer confirms each command's RUNNER resolves and terminates (runner real, syntax valid — matches setup.md's command-not-found/tool-not-installed/bad-invocation floor, L206), and does NOT require the tests to exist or pass yet.
- Three new checks mapped: (a) "commands execute" = NET-NEW (no existing check runs commands; closest is read-based Feasibility L27); (b) "selection plausibly covers" = NET-NEW judgment, sibling to Coverage L20 / Feasibility L27 / Clarity L31, and mirrors setup.md's owner-judgment about completeness (L177); (c) "e2e coverage matches spec" = OVERLAPS/EXTENDS the existing Coverage-of-acceptance-criteria check (L20) applied to the new e2e section.
- The "No test planning" check (L28) is INVERTED for the two new sections, not replaced 1:1; the matching writer-side prohibition (code-plan-writer.md:64) is lifted in lockstep.

**Settled requirements:**
- code-plan-reviewer gains three validation duties on the new code-plan.md sections:
  1. EXECUTE each required-test-command and confirm it RUNS (the runner resolves and terminates) — NOT that tests exist or pass. This transplants setup.md's two-question "did it execute?" discipline into phase 3. An unrunnable command (runner missing, bad invocation, never-returns) is a rejection trigger; a runner that runs but reports zero/missing tests because they aren't written yet is NOT a rejection (legitimate at plan time). Per-command and independent.
  2. JUDGE that the required-test-command selection plausibly covers the feature (a credible floor, not exhaustive — writers add their own).
  3. CHECK that the planned e2e flows cover the spec's acceptance criteria + edge cases (coverage discipline L20 extended to the e2e section).
- The "No test planning" check (code-plan-reviewer.md:28) MUST be reworked: the planner is now REQUIRED to plan required-test-commands and e2e flows. Boundary: per-task UNIT test selection remains the writer's (TDD); the lift/inversion is scoped to required-test-commands + e2e flows. The spec must state this boundary explicitly so unit-test planning is not accidentally mandated.

## Q6 — Writer run-loop integration + assisted-mirror scope

**Evidence + decisions (Part A — writer run-loop):**
- Required-test-commands use the same two-question model and run-before-every-commit floor as guardrails (code-writer.md:48-54 machinery). DECISION: fold them into the existing run-gates step (step 5/6) so the writer runs (i) its guardrail selection AND (ii) the plan's required-test-commands under the same "execute, must pass, no bypass, commit only when all pass" rules. They are NOT a guardrail-selection member (sourced from code-plan.md, not .rp.md) but obey the same discipline. Reuse the existing prose; do not duplicate the two-question model (CLAUDE.md no-duplication).
- Both code-writer-tdd and code-writer-e2e run the full required-test-commands floor before every commit ("every writer runs them" — intent). Not scoped by writer type.
- DECISION on floor scope (the ambiguous part): required-test-commands are a SINGLE feature-wide floor every writer runs. The PLANNER is responsible for ordering tasks and the commands' applicability so each writer's commit can pass the floor given what exists at that point (e.g. a command targeting e2e tests is satisfiable by the time the commit that must pass it lands). This matches the guardrail "no-agent gate runs for all" default and avoids partitioning complexity. Rationale recorded so design/plan can honor the ordering obligation.
- DECISION on writer-time drift: an unrunnable required-test-command at writer time is a BLOCKER (mirrors the guardrail drift-guard, code-writer.md:53) — the plan-reviewer already validated the commands run (Q5), so an unrunnable one at writer time genuinely indicates drift. A command that runs and exits non-zero is work-to-do, not a blocker (same as guardrails).

**Evidence + decisions (Part B — assisted-workflow scope):**
- Assisted spawns NO agents (assisted-workflow.md:3; assisted-phases/3 - plan.md:3) and INLINE-DUPLICATES the planner guidance — it does NOT delegate to agents/*.md. So editing agents/*.md alone leaves the assisted path inconsistent.
- Assisted covers ONLY phases 1-3; phase 4 (Code) and 5 (Docs) "Can't be run in assisted workflow" (assisted-workflow.md:21-22). No assisted code phase, no behavior-verification, no writer/guardrail running. So the writer-split (Q2) and behavior-verification removal (Q4) DO NOT touch assisted.
- Assisted phase 3 produces its OWN code-plan.md inline (Task schema L126-146; coverage self-check L105-120) and carries the contradicting test-planning rules.

**Settled requirements (assisted scope boundary):**
- IN SCOPE (consistency-forced): assisted-phases/3 - plan.md must gain the two new planner duties to match the new code-plan.md shape — a required-test-commands section and an e2e test plan section, plus the matching self-checks. The contradicting rules MUST be reworked: L30 ("MUST NOT plan tests"), L117 ("No test planning" self-check), L152 ("Tests are the code-writer's job"). Inversion scoped the same way: per-task UNIT test selection stays writer/TDD; required-test-commands + e2e flows become the planner's job.
  - Assisted-specific nuance: assisted's "reviewer" is the OWNER and the flow is Q&A, so the EXECUTE-the-required-test-commands validation maps differently than the autonomous plan-reviewer's. How "commands execute" validation appears in assisted's owner-driven self-check (run by the driver/owner, or relaxed) is a design-phase detail; the spec records that assisted must carry an equivalent validation expectation, not the exact mechanism.
- IN SCOPE (naming consistency): incidental singular-"code-writer" mentions that read stale after the split (assisted-phases/3 - plan.md L25,L59,L96,L114,L149; assisted-phases/2 - design-doc.md L48,L81,L100) should be reconciled with the two-writer reality. CLAUDE.md forbids cross-path inconsistency. Lower priority than the duty changes but in scope.
- OUT OF SCOPE: assisted code/docs phases (nonexistent).

**Consolidated edit map (from Q2 + this Q):**
- agents/code-reviewer.md, code-plan-writer.md, code-plan-reviewer.md name "code-writer" literally and must be reconciled with the split + new duties.

## Q7 — Complete surface inventory + agent registration

**Evidence (researcher):**
- NO central agent manifest. Agents are registered by FILE PRESENCE + `name:` frontmatter discovered from the `agents/` directory (pi.md:51-52 for Pi; Claude Code uses the plugin's agents/ dir the same way). plugin.json / marketplace.json / package.json / SKILL.md do NOT enumerate agents. load.md:30's enumeration is the only place the skill hard-codes the writer name as a set member.
- Adding the two writers requires: create agents/code-writer-tdd.md + code-writer-e2e.md with correct `name:`; delete agents/code-writer.md; update load.md:30. No manifest edit needed for recognition.
- Phase-4 (4 - code.md) is the ONLY autonomous phase reference naming code-writer (phase 3 has zero).
- SKILL.md:39 phase-4 "Produces" cell names "behavior verification" as a phase-4 output — still accurate (verification stays in phase 4, just at the reviewer); no edit forced.
- README.md:112 lists `code-writer` in the human-facing agent roster — naming update needed.
- doc-writer.md:64 is purely illustrative; incidental.
- Load-bearing consistency: the exact phrase "end-to-end tests derived from browser verification" appears verbatim in code-plan-writer.md:64 AND code-plan-reviewer.md:28 and is now FALSE (e2e is planned, not derived) — must be removed in both. "Do NOT plan tests" must invert together across code-plan-writer.md:64, code-plan-reviewer.md:28, assisted-phases/3 - plan.md L30/L117. load.md:30 + setup.md:183 move in lockstep.

**Settled — complete deduplicated edit map (live surfaces):**

(a) BEHAVIOR CHANGE REQUIRED:
- agents/code-writer.md → SPLIT into code-writer-tdd.md + code-writer-e2e.md; remove step 3 (L34-38) + step 4 (L40-42) + back-refs (L24, L46); e2e writer implements planned e2e specs; fold required-test-commands into the run-gates step (L44-59); preserve UI-conventions duty (L38) in the right writer; per-writer frontmatter + role text.
- agents/code-reviewer.md → step 3 (L33-35) ADD "re-drive the planned e2e flows from code-plan.md"; KEEP evidence text intact; naming L3/L6/L8/L99.
- agents/code-plan-writer.md → invert L64 "Do NOT plan tests"; ADD required-test-commands section + e2e test plan section to the code-plan.md structure (L22-47); nuance L60 (unit-only RED); remove the false "derived from browser verification" phrase; naming L6/L32/L57.
- agents/code-plan-reviewer.md → invert L28 "No test planning" for the two new sections; ADD three checks (commands execute / selection plausibly covers / e2e matches spec); L27 feasibility extends to command execution; remove the false "derived from browser verification" phrase; naming L26/L31.
- skills/.../autonomous-phases/4 - code.md → L3 type-conditional dispatch; L23-26 table → two writer rows (drop "verifies behavior" from the description); L30 task-list may capture type; L33 type-conditional launch; L34/L35 naming.
- skills/.../conventions/load.md:30 → enumeration → {code-writer-tdd, code-writer-e2e, code-reviewer, doc-writer, doc-reviewer}.
- skills/.../conventions/setup.md:183 → Agents-field option list adds both names; L189 example row updates.
- skills/.../assisted-phases/3 - plan.md → invert L30/L117/L152; ADD required-test-commands + e2e-plan sections + self-checks (assisted in scope per Q6); assisted "commands execute" validation maps to owner-driven flow (design detail).

(b) NAMING-CONSISTENCY ONLY:
- README.md:112; assisted-phases/3 - plan.md L25/L59/L96/L114/L149; assisted-phases/2 - design-doc.md L48/L81/L100; naming portions of the code-* agent files.
- .rp.md:91 Agent-models row (PROJECT CONFIG, operational follow-up per Q3 — not a skill acceptance criterion).

(c) INCIDENTAL:
- doc-writer.md:64 (example); SKILL.md:39 (accurate as-is).

---

# FINAL REQUIREMENTS SUMMARY (settled)

## R1 — Plan-owned required-test-commands (new code-plan.md section)
The code-plan-writer adds a "Required test commands" section to code-plan.md: planner-chosen exact literal commands, sourced from spec + design. They reuse the guardrails two-question exit-code model and are a mandatory FLOOR run by every writer before every commit. They are NOT `.rp.md` guardrails (per-pipeline, plan-sourced) but obey the same pass-before-commit discipline. They coexist with the project-wide guardrails channel, which is unchanged. The floor is feature-wide and uniform across both writer types; the planner orders tasks so each writer's commit can satisfy the floor given what exists at that point.

## R2 — Plan-owned e2e test plan (new code-plan.md section)
The code-plan-writer transforms the spec's acceptance criteria + edge cases into an explicit e2e test plan section in code-plan.md. "Derive e2e from behavior verification" is removed. The section is a shared artifact with two consumers — the e2e writer (implements the tests) and the code-reviewer (re-drives the flows) — and must be concrete enough for both.

## R3 — Lift the "Do NOT plan tests" prohibition (consistency)
code-plan-writer.md:64, code-plan-reviewer.md:28, assisted-phases/3 - plan.md L30/L117/L152 must invert together. The false phrase "end-to-end tests derived from browser verification" is removed. Boundary: per-task UNIT test selection stays the writer's (TDD); only required-test-commands + e2e flows become the planner's duty.

## R4 — code-plan-reviewer validates the two new sections
Three duties: (1) EXECUTE each required-test-command and confirm the runner RESOLVES and TERMINATES (not that tests exist or pass) — transplanting setup.md's "did it execute?" discipline into phase 3; an unrunnable command is a rejection trigger, a runner reporting zero/missing tests is not. (2) JUDGE the command selection plausibly covers the feature (credible floor, not exhaustive). (3) CHECK the planned e2e flows cover the spec's acceptance criteria + edge cases.

## R5 — Split code-writer into code-writer-tdd and code-writer-e2e
agents/code-writer.md is replaced by two agent files (correct `name:` frontmatter; delete the old file). code-writer-tdd: unit tests via TDD only. code-writer-e2e: implements the planner's e2e specs. Both are writer-type, both run their guardrail selection AND the required-test-commands floor before every commit. Tasks gain a TYPE the planner sets; the orchestrator dispatches the correct writer by type. An unrunnable required-test-command at writer time is a blocker (drift); a failing one is work.

## R6 — Remove writer-side behavior verification
The writer-side behavior-verification step (code-writer.md:34-38) and e2e self-derivation step (L40-42) and their back-references (L24, L46) are removed. The independent UI-conventions duty (L38) is preserved in the appropriate writer.

## R7 — Reviewer verifies the integrated feature once
code-reviewer step 3 keeps its existing free-form integrated behavior verification and its evidence requirement UNCHANGED, and ADDS manually re-driving the planned e2e flows from code-plan.md. The evidence requirement now lives only at the reviewer (relocation, not rewording).

## R8 — Update the gate-running enumeration + Agents field in lockstep
load.md:30 enumeration → {code-writer-tdd, code-writer-e2e, code-reviewer, doc-writer, doc-reviewer}. setup.md:183 Agents-field option list offers both writer names; the L189 example updates. No migration/backward-compat text is added (steady-state inert rule covers a guardrail naming a gone agent).

## R9 — Update phase-4 reference for type-based dispatch
4 - code.md: overview (L3), required-agents table (two writer rows, drop "verifies behavior"), step 1 task-list (may capture type), step 3.1 (type-conditional launch), step 3.2/step 4 naming.

## R10 — Assisted phase-3 consistency
assisted-phases/3 - plan.md gains the two new planner sections + self-checks and inverts its test-planning rules. assisted naming touch-ups across assisted 2/3. Assisted code/docs phases are untouched (nonexistent).

## OUT OF SCOPE
- Editing this repo's `.rp.md` is an operational follow-up (add code-writer-tdd/code-writer-e2e model rows, drop code-writer), not a skill acceptance criterion — but required for the next real run on this repo to dispatch and resolve models correctly.
- Backward-compat/migration handling for other projects' `.rp.md` guardrails naming a now-gone agent (steady-state inert rule already covers it).
- The CI matrix (stays at PR time, outside Radical Pipelines).
- Per-task unit-test selection (stays writer/TDD).

## ACCEPTANCE CRITERIA (testable)
1. code-plan.md gains a required-test-commands section and an e2e test plan section; code-plan-writer.md instructs producing both; the "Do NOT plan tests" prohibition and the "derived from browser verification" phrase are gone from code-plan-writer.md and code-plan-reviewer.md.
2. code-plan-reviewer.md instructs executing required-test-commands to confirm they run (not pass), judging selection coverage, and checking e2e coverage against the spec; the "No test planning" check is reworked accordingly.
3. agents/code-writer.md no longer exists; agents/code-writer-tdd.md and agents/code-writer-e2e.md exist with correct `name:` frontmatter; the tdd writer writes unit tests only; the e2e writer implements planned e2e specs; neither contains a behavior-verification or e2e-self-derivation step; both run the guardrail selection AND the required-test-commands floor before commit.
4. code-reviewer.md step 3 retains its free-form verification + evidence text verbatim and adds re-driving the planned e2e flows.
5. load.md:30 enumeration and setup.md:183 Agents-field list both name the two new writers and not the old code-writer, and agree with each other.
6. 4 - code.md dispatches by task type (two writer rows; type-conditional launch); no required-agents table or step still names a single code-writer; the table no longer attributes behavior verification to the writer.
7. assisted-phases/3 - plan.md carries the two new planner sections + inverted test-planning rules; no live skill file (excluding .pipelines/ artifacts and project `.rp.md`) still names "code-writer" in a way that contradicts the split.
8. No migration/backward-compat text is introduced anywhere.
