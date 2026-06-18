# Design Research — Issue 122: Plan-driven test selection and reviewer-side behavior verification

Running record of the design Q&A between the design-doc-analyst and design-doc-researcher. The spec (R1–R10) is binding and decides the *what*; this phase decides the *how* — the concrete shape of the two new `code-plan.md` sections, the task-type field, the writer split mechanics, the plan-reviewer's command-execution validation, the reviewer's re-drive duty, and the lockstep edits across `load.md` / `setup.md` / phase-4 reference / assisted phase-3. Every decision is grounded in the current file state on this branch (stacked on #121).

## Scope (from spec)

- R1: Required-test-commands section in `code-plan.md` (planner-chosen literal commands, two-question model, floor run before every commit by both writers).
- R2: e2e test plan section in `code-plan.md` (transform spec acceptance criteria + edge cases; shared by e2e writer and reviewer).
- R3: Lift "Do NOT plan tests" in lockstep (code-plan-writer, code-plan-reviewer, assisted phase-3); remove "derived from browser verification".
- R4: code-plan-reviewer validates both sections (execute commands / judge coverage / e2e matches spec).
- R5: Split `code-writer` → `code-writer-tdd` + `code-writer-e2e`; task-type field; orchestrator dispatch by type.
- R6: Remove writer-side behavior verification + e2e self-derivation; preserve UI-conventions duty.
- R7: code-reviewer step 3 keeps free-form verification + evidence, adds re-driving planned e2e flows.
- R8: Update load.md gate-running enumeration + setup.md Agents field in lockstep.
- R9: Update phase-4 reference for type-based dispatch.
- R10: Assisted phase-3 consistency + naming touch-ups across assisted 2/3 and README.

## Open design questions

1. Task-type field shape and orchestrator dispatch mechanics.
2. Required-test-commands section shape in `code-plan.md`.
3. e2e test plan section shape in `code-plan.md`.
4. How `code-writer-e2e` reaches the e2e plan (task-block self-containment seam).
5. `code-writer` split mechanics (shared content, frontmatter/role, UI-conventions duty, required-test-commands folding into run-gates).
6. code-plan-reviewer command-execution validation framing.
7. Reviewer re-drive duty wording.
8. Assisted "commands execute" validation mechanism.
9. load.md / setup.md / README lockstep naming.

---

## Q1 — Task-type field + e2e-writer self-containment seam

**Evidence (researcher):**
- The task block is uniform house style: `- **<Field>:** <value>`, bold sentence-case label + colon, single-line values except the multi-line `Acceptance` list. Identical in `agents/code-plan-writer.md:36-44`, assisted `3 - plan.md:135-140`, and the doc-plan schema (`3 - plan.md:210-216`). No existing field's *value* sets an enum vocabulary — the others are free-form prose.
- The orchestrator does NOT parse individual task fields today. `4 - code.md:33` passes the **verbatim** block; the parenthetical field list is descriptive, not a parse instruction. `4 - code.md:30` (step 1) reads tasks only to enumerate/track dispatch status, not to branch on content. There is one content-read point (step 1 enumeration) and one hand-off point (step 3.1 launch); neither branches on a field value today.
- Two existing agent classes: **artifact-readers** (planners read spec+design directly, `code-plan-writer.md:12-13`; the reviewer reads `code-plan.md` directly, `code-reviewer.md:15-17`) and **block-receivers** (writers get only their block, `code-writer.md:12`). Self-containment is a *writer-only* discipline, not global.
- Crucial wording nuance: `code-writer.md:65` scopes the prohibition to "other **tasks** in the code plan" — i.e. don't read sibling task-blocks. It does not forbid reading a non-task shared section.
- The R7 re-drive consumer (code-reviewer) reads `code-plan.md` directly (`code-reviewer.md:15`), so the e2e test plan **must** be a readable `code-plan.md` section regardless of how the writer consumes it. This rules out a per-task-only e2e shape.

**Decisions:**
- **Task-type field:** add `- **Type:** tdd | e2e` to the task block — single-line, house-style label, lowercase single-word enum values matching the agent-name suffixes so type→agent is a literal mapping (`tdd`→`code-writer-tdd`, `e2e`→`code-writer-e2e`). Placement: directly after `Goal`. Only the code-plan task schema gains `Type` (doc tasks are out of scope). Add `Type` to the `4 - code.md:33` parenthetical field enumeration so it stays in sync.
- **Orchestrator dispatch:** authoritative dispatch point is **step 3.1 (launch)** — "launch the writer matching the task's Type." Step 1 (task-list capture) **may** record type per entry but dispatch reads it from the block at launch; keep step 1's edit minimal so there's a single source of the routing decision. The orchestrator still passes the verbatim block; it now also reads the one `Type` field to choose the agent (no new slicing capability).
- **e2e-writer self-containment seam → option (c):** the e2e test plan stays a standalone `code-plan.md` section (shared, two consumers per R2). `code-writer-e2e` gets a **narrow, explicit carve-out**: its "Gather context" reads the assigned task block AND the e2e test plan section of `code-plan.md`. `code-writer-tdd` stays fully block-only. The e2e writer's self-containment guideline is amended to name the e2e section as an explicit permitted input so the two rules don't conflict — consistent with the guideline's existing "other tasks" scoping and with the reviewer already reading the same section directly. Rejected: (a) orchestrator slices the e2e section per task (new orchestrator capability + an unmodeled task→flow mapping); (b) per-task-only e2e specs (denies the reviewer a coherent section to re-drive; contradicts R2).
- **Coupling flagged:** because both writers run the required-test-commands floor before every commit and the floor may include an e2e command, the planner must order e2e tasks so the e2e tests exist by the time a commit must satisfy the floor — the planner's task-ordering obligation (R1/Q6), not part of this seam.

## Q2 — Shape of the two new `code-plan.md` sections

**Evidence (researcher):**
- House template pattern: every artifact opens with `## Overview` then proceeds top-down in consumption/dependency order, with the granular individually-traced blocks LAST (design-doc `2 - design-doc.md:108-133` ends on per-item `### Decision:` blocks; code-plan `code-plan-writer.md:23-47` ends on the numbered `### Task N` blocks).
- The two-question model (`did the command execute? / did the gate pass?`) lives only at the AGENT/run-loop layer — `code-writer.md:51`, `code-reviewer.md:111`, `doc-writer.md:44`, `doc-reviewer.md:113`, and at capture `setup.md:197` — all deriving from `load.md:26`. It is NOT stated inside any artifact.
- Artifacts are strictly **standalone** and never reference convention files (`code-plan-writer.md:19,56`; `2 - design-doc.md:135`; assisted `3 - plan.md:124,148`). So a code-plan.md section cannot point at `load.md`.
- No existing "flow"/"scenario" vocabulary in the skill — net-new. The `Traces to` field is established (`code-plan-writer.md:40`). Guardrails capture shape is `| Name | Command | Agents |` (`setup.md:187-190`); `setup.md:193` establishes "'None' is a complete, valid answer."

**Decisions:**
- **Section ordering:** `# Code Plan` → `## Overview` → `## Required test commands` → `## E2E test plan` → `## Tasks`. Matches the house pattern (numbered task blocks stay terminal, so the `4 - code.md:30` task enumeration is unaffected) and puts the floor + flows ahead of the tasks that reference them.
- **Required-test-commands is pure DATA, no discipline text.** The two-question/run-before-every-commit discipline stays at the consumers (the writers' run-gates step and the plan-reviewer's validation step), which already state it — the artifact restating it would both break standalone-ness (pointing at conventions) and duplicate (CLAUDE.md). R1's "reuse the two-question model" is satisfied by the consumers applying their existing model to these commands. Shape: a `| Name | Command | Covers |` table — drop the guardrails Agents column (uniform floor, both writers run all), keep `Covers` as a one-line "what it exercises" note that directly supports R4 duty 2 (plan-reviewer judges the selection plausibly covers the feature) and mirrors the spirit of `Traces to`. Include a note that an absent floor ("none") is valid, mirroring `setup.md:193`.
- **E2E test plan:** a numbered list of `### Flow N: <title>` blocks (mirroring `### Task N` / `### Decision:`), each with `Steps` (concrete ordered drive steps), `Expected` (observable outcome to assert), and `Traces to` (spec acceptance criterion / edge case). Reusing the existing `Traces to` identifier (no new notation) directly serves R4 duty 3 — the reviewer cross-checks flow `Traces to` lines against the spec AC list exactly as it does for tasks. Granularity is set so the steps are both human-re-drivable (reviewer, R7) and automatable (e2e writer).
- **Flow→task linkage stays in existing task fields, no new schema field.** An e2e task's `Goal`/`Changes` names the flow(s) it implements; its `Acceptance` asserts those flows are covered by passing e2e tests. The block says *which* flows; the E2E test plan section says *what* each flow is (fits the Q1 option-c carve-out). The reviewer's check path: e2e task `Goal`/`Acceptance` → named flows → `### Flow N` → `Traces to` spec AC. Task ordering (floor satisfiability) rides the existing `Depends on` field.

Recommended skeletons (for the planner-section edits and plan-reviewer checks):
```markdown
## Required test commands

<!-- Exact literal commands every writer runs and must pass before every commit, on top of project guardrails. A floor, not the full set. "None" is valid. -->

| Name | Command | Covers |
| ---- | ------- | ------ |
| ...  | ...     | ...    |

## E2E test plan

<!-- The spec's acceptance criteria and edge cases as explicit end-to-end flows. Concrete enough for the e2e writer to automate and the reviewer to manually re-drive. -->

### Flow 1: <title>

- **Steps:** ...
- **Expected:** ...
- **Traces to:** Acceptance criterion N / Edge case <desc>
```

## Q3 — code-writer split mechanics (R5 + R6)

**Evidence (researcher):**
- Cross-agent-file duplication is the established norm — CLAUDE.md's no-duplication rule governs the SKILL's reading paths (reference/convention files), NOT agent files, which are independent dispatch targets that never read each other. The two-question outcome model + drift bullet appears verbatim across all four gate-running agents (`code-writer.md:51-54`, `doc-writer.md:44-47`, `code-reviewer.md:111-114`, `doc-reviewer.md:113`); the "Single task only" / "Files is a guide" / "Stop and report blockers" guidelines and the role-framing/gather-context scaffolding are near-identical between `code-writer.md` and `doc-writer.md`. So two near-twin writer files differing only in the authoring core is consistent with the existing writer/doc-writer relationship.

**Decisions:**
- **Both files share scaffolding verbatim** (role frame, gather-context, run-gates, commit/report, most guidelines); only the authoring core diverges. Both collapse from 6 steps to **4**: Gather context / Implement / Run the gates / Commit and report (the removed behavior-verification and derive-e2e steps collapse; run-gates absorbs the floor).
- **code-writer-tdd.md:** `name: code-writer-tdd`, description "unit tests via TDD." Keep RED/GREEN/REFACTOR (current L16-23) and the public-symbol documentation block (L26-32). DROP L24 ("e2e not in RED, added in step 4...") and REPLACE with a one-line positive statement "this writer writes unit tests only" (no step-4 back-ref). REMOVE step 3 verification body (L34, L36) and step 4 (L40-42) per R6. The **UI-conventions duty (L38) moves into code-writer-tdd ONLY** — the tdd writer implements the production code where UI surfaces are actually written; the e2e writer only drives already-built UI, so UI conventions have no production-code target there. Phrase it conditionally ("if your task involves UI, follow the host project's UI conventions"). Guardrail-read line (L13) names `code-writer-tdd`.
- **code-writer-e2e.md:** `name: code-writer-e2e`, description "implements the planner's e2e test specs from code-plan.md." Step 2 replaces TDD: for each flow named in the task block, read its `### Flow N` spec (Steps/Expected/Traces to) from the E2E test plan section, write an automated e2e test realizing the Steps and asserting the Expected, add it to the project's e2e suite per host testing convention. **No RED/GREEN/REFACTOR** — instead a light confirm: "author the test and confirm it genuinely exercises the flow and passes against the built behavior" (the production behavior exists by the time e2e tasks run, per the planner's ordering obligation; this also catches vacuously-passing tests). Per-task Acceptance (flows covered by passing e2e tests) is the contract. **DROP the heavyweight public-symbol documentation block** (e2e tests rarely add documented public API) and REPLACE with a one-line guideline "follow project conventions for test code, including any inline documentation the test convention expects." Guardrail-read line names `code-writer-e2e`.
- **Required-test-commands folded into run-gates (both files):** read in Gather-context ("Read the Required test commands section of `code-plan.md` — the floor you must pass before every commit"), parallel to how the guardrail selection is read today (L13). Rename step 5 "Run the writer guardrail selection" → **"Run the gates"**, stating the writer runs two command sets — (i) its guardrail selection and (ii) the required-test-commands floor — both subject to the SAME already-stated two-question outcome model and the same no-bypass/all-pass-before-commit rules. The model (L51) and drift/failing outcomes (L52-54) are stated ONCE and apply to both sets (no duplication). Drop L46's back-ref to the removed verification step.
- **Writer-time drift maps cleanly:** L53 (unrunnable declared gate ⇒ blocker, the drift guard) applies to the floor — an unrunnable floor command means drift because the plan-reviewer already validated it runs (R4/Q5); L54 (runs and exits non-zero ⇒ work) applies too. The outcome is identical for both command sets, so one shared bullet suffices; no separate restatement of the floor's drift rationale.
- **Self-containment guideline carve-out (L65):** the prohibition was always scoped to "**other tasks** in the code plan" (sibling task-blocks); reading named non-task sections is an explicit permitted input. Reword per writer:
  - tdd: "The task block plus the Required test commands section of `code-plan.md` are your inputs. You should not need the prompt, spec, design doc, or other tasks in the code plan."
  - e2e: "The task block, the E2E test plan section, and the Required test commands section of `code-plan.md` are your inputs. You should not need the prompt, spec, design doc, or other tasks in the code plan."

Recommended skeletons:
```markdown
# code-writer-tdd
1. Gather context — task block; Required test commands section; guardrails naming code-writer-tdd or no agents; cited review issues.
2. Implement with TDD — RED/GREEN/REFACTOR for unit tests (unit tests only); document public symbols; follow host UI conventions if the task involves UI.
3. Run the gates — guardrail selection AND required-test-commands floor; all pass before commit.
4. Commit and report.

# code-writer-e2e
1. Gather context — task block (names the flows); E2E test plan section + Required test commands section; guardrails naming code-writer-e2e or no agents; cited review issues.
2. Implement the planned e2e flows — realize each named flow's Steps/Expected as an automated e2e test; run each and confirm it genuinely exercises the flow and passes against the built behavior.
3. Run the gates — guardrail selection AND required-test-commands floor; all pass before commit.
4. Commit and report.
```

## Q4 — Planner-side edits: code-plan-writer.md + code-plan-reviewer.md (R3 + R4)

**Evidence (researcher):**
- No agent file in `agents/` references `setup.md` / `load.md` / `conventions/` / `reference/` / `pipeline-versioning.md` by name (grep confirmed). The guardrail two-question discipline is RESTATED inline and verbatim across the four gate-running agents; setup.md owns the capture-time statement, each agent owns its run-time restatement — independent copies, not cross-references. (Only the phase REFERENCE files cite `pipeline-versioning.md`, a different layer.)
- "derived from browser verification" appears in code-plan-writer.md ONLY at L64 and in code-plan-reviewer.md at L28. The phrase "unit tests derived from the task's Acceptance criteria" at `code-writer.md:20` is a DIFFERENT, still-true usage — do not touch it.
- The plan-reviewer runs INSIDE the pipeline worktree (it already "explore[s] the codebase to verify the plan's file paths" — `code-plan-reviewer.md:15`); the worktree exists by phase 3. This is BETTER parity than setup.md, which runs pre-worktree in the main checkout.

**Decisions — code-plan-writer.md:**
- Plan structure (L23-47): insert `## Required test commands` and `## E2E test plan` between `## Overview` and `## Tasks` (Q2 order/skeletons); add `- **Type:** tdd | e2e` after `- **Goal:**` in the task block.
- INVERT L64 to: "**Plan the test floor and e2e flows, not unit tests.** Choose the required-test-commands floor and transform the spec's acceptance criteria and edge cases into the e2e test plan (the two sections above). Per-task unit-test selection stays the writer's: task Acceptance describes *what must be true*, and the tdd writer turns it into unit tests in the RED phase. Do not prescribe which unit tests a task writes." This inverts the prohibition for the two planner-owned channels, preserves R3's unit-TDD boundary, and removes the false "derived from browser verification" phrase.
- L60: KEEP but narrow the actor — "the **tdd writer** turns them into unit tests in the RED phase" (not falsely universal now that e2e tasks exist; the e2e realization path is covered by the E2E test plan section + the e2e task's Goal/Acceptance per Q2).

**Decisions — code-plan-reviewer.md:**
- INVERT L28 to a scoped check: "**No unit-test planning** — does the plan refrain from prescribing which *unit* tests a task writes? Unit-test selection stays the writer's (TDD from per-task Acceptance). Flag any task that prescribes specific unit tests. (The required-test-commands floor and the e2e test plan are now planner-owned and are validated below — they are not a violation.)" Removes the false "derived from browser verification" phrase.
- The three R4 duties slot in as a **hybrid**: duties (b) and (c) are judgment checks added to the step-2 checklist next to the existing Coverage (L21) / Feasibility (L27) items — "**Required-test-commands coverage** — does the floor plausibly cover the feature? A credible floor, not exhaustive..." and "**E2E coverage** — do the planned e2e flows cover the spec's acceptance criteria and edge cases? Flag any criterion or material edge case with no covering flow." Duty (a), executing commands, becomes its OWN new step (it is an execution action, a different mode from the read-only checklist; the reviewer runs no commands today) — inserted as step 2 "Validate the required-test-commands," pushing review to step 3:
  > Execute each command in the plan's Required test commands section, exactly as written. The one question is **did the command's runner resolve and terminate?** — not whether tests exist or pass. The feature is not implemented yet, so a runner that runs but reports zero or missing tests is legitimate and is NOT a rejection. A command that cannot run — runner missing, bad invocation, never returns — IS a rejection. Validation is per-command and independent. A command that writes, deploys, or destroys takes effect against the worktree — judge before running it.
- **Restate inline, do NOT reference setup.md.** Matches the standalone-agent pattern; reuses setup.md's *discipline* (did-it-execute, per-command independence, never-returns/destructive caveats) without a path link. The plan-time twist (zero/missing tests is legitimate) is the ONE thing that differs from setup.md and is the load-bearing addition. Drop setup.md's parity-floor / no-worktree-yet caveat entirely — the plan-reviewer has better parity (runs in the writers' actual worktree), so no environment hedging.
- **Matched-pair linkage (record in design doc):** the plan-reviewer's step-2 validation is exactly what makes the writer-time drift rule (Q3: unrunnable floor command at writer time = blocker/drift) well-founded — the two checks are a matched pair.

## Q5 — Remaining surfaces: reviewer re-drive (R7), phase-4 (R9), load/setup (R8), README, assisted phase-3 (R10)

**Evidence (researcher):**
- Confirmed code-writer hits: load.md only L30; setup.md only L183 + L189; README only L112. The `4 - code.md` L34/L35 "code-writers"/"code-writer in the batch" are generic plural describing shared-worktree sequencing.
- Assisted phase-3 self-check (step 4, L106-120) executes NOTHING today — pure read-judgment. But setup.md's owner-driven guardrail capture DOES validate by EXECUTING and surfacing to the owner (setup.md:195-211) — so "driver executes a command, surfaces result to owner" is an existing assisted-mode pattern, not a new mode. Assisted spawns no agents (`3 - plan.md:3`), so there is NO autonomous plan-reviewer in the assisted path to fall back on.
- The assisted/assisted-2 singular `code-writer` mentions (assisted 3 L25,L59,L96,L114; assisted 2 L48,L81,L100) are abstract phase-4-role references, not roster/dispatch claims.

**Decisions:**
- **R7 (code-reviewer.md):** keep the "### 3. Behavior verification" heading and the free-form body + evidence sentence L35 BYTE-IDENTICAL. Insert a new sentence at the end of L34's paragraph, BEFORE the L35 evidence sentence, so the evidence requirement closes over both free-form verification and re-drive: "Additionally, manually re-drive each flow in the plan's E2E test plan section of `code-plan.md`: perform the flow's Steps and confirm its Expected outcome, capturing evidence as above." Template L81 and guideline L110 stay BYTE-IDENTICAL (re-driven flows are changed behavior exercised end-to-end, already covered). **L29 test-quality check: take the light tie-to-plan rephrase** — "end-to-end tests are present for the e2e flows the batch's e2e tasks implement (per the plan's E2E test plan)" — since e2e is now planned, not derived; keeps the check coherent with the new model (in scope; L35/L81/L110 byte-identical constraint does not cover L29).
- **R9 (`4 - code.md`):** L3 overview → "dispatching each code task to a fresh writer chosen by the task's Type — `code-writer-tdd` for tdd tasks, `code-writer-e2e` for e2e tasks". L23-26 table → two writer rows (`code-writer-tdd`: "Implements its assigned task with TDD, runs the gates, commits"; `code-writer-e2e`: "Implements the planned e2e flows, runs the gates, commits"), neither saying "verifies behavior"; "validates" → "runs the gates" to match the Q3 renamed step. L30 step 1: optionally append ", capturing each task's Type" (minimal, not load-bearing). L33 step 3.1: type-conditional launch ("a fresh writer chosen by the task's Type — `code-writer-tdd` for a `tdd` task, `code-writer-e2e` for an `e2e` task") with the verbatim block, and add `Type` to the parenthetical field list. L34/L35 generic plural STAYS (R9 forbids a row/step naming a single dispatch-target `code-writer`, not the generic plural); optional touch L35 "every writer in the batch". Mermaid: leave the generic "Code Writer" node unchanged (one writer per task chosen by type — not a fork; splitting would misrepresent it).
- **R8 (load.md + setup.md):** load.md:30 enumeration → `code-writer-tdd`, `code-writer-e2e`, `code-reviewer`, `doc-writer`, `doc-reviewer` (rest of sentence unchanged). setup.md:183 option list → same five names; the prose tail ("Naming only `code-reviewer`...") reads fine, no change. setup.md:189 example row → `code-writer-tdd` (illustrative; best illustration is a fast gate on the unit/code writer and it demonstrates the field accepts a split name). The two files agree (same 5-agent set, two views).
- **README.md:112:** replace `code-writer` with `code-writer-tdd`, `code-writer-e2e` in the shipped-agent roster (only README hit; a current-agent roster claim, so AC7 requires it).
- **R10 (assisted `3 - plan.md`):** (a) code-plan.md skeleton (L126-146) gains `## Required test commands` + `## E2E test plan` (Q2 order/shapes) and `- **Type:** tdd | e2e` after Goal — structurally identical to autonomous. (b) Invert L30 constraint, L117 self-check, and narrow L152 with the same R3 boundary (planner owns floor + e2e flows; per-task unit-test selection stays the writer's TDD). (c) **Commands-execute validation → option (i):** the driver executes the required-test-commands as part of the step-4 coverage self-check and surfaces results to the owner (owner decides), mirroring setup.md's owner-driven validate-by-executing pattern. New step-4 item: "**Required-test-commands validate** — execute each command in the Required test commands section and surface the result to the owner: did the command's runner resolve and terminate? The feature isn't implemented yet, so a runner reporting zero or missing tests is fine; a command that cannot run (runner missing, bad invocation, never returns) is a problem to fix with the owner before synthesis. Per-command and independent." Plus an **E2E coverage** step-4 item next to L109. Rejected (iii) drop (assisted produces its own code-plan.md with no autonomous reviewer — dropping leaves unvalidated commands shipping, the exact gap R10 forbids) and (ii) owner-assertion-only (weaker than executing — the discipline is "did it EXECUTE").
- **Assisted naming (5d) → minimal-touch:** invert only the test-planning-semantics lines (L30/L152, already in (b)); LEAVE the abstract singular `code-writer` role mentions (assisted 3 L25,L59,L96,L114; assisted 2 L48,L81,L100). Per AC7 these are abstract phase-4-role references true of both new writers, not roster claims, so not violations; rewriting to "the tdd or e2e writer" is churn that reads worse, and L25's bundling with the unchanged "doc-writer (phase 5)" makes the asymmetry worse.

---

# Settled design — per-file edit map

All five topic clusters settled; every decision grounded in the current branch state. The shapes below are the design the plan/code phases implement.

**New `code-plan.md` structure** (autonomous `code-plan-writer.md` + assisted `3 - plan.md` skeleton, identical): `# Code Plan` → `## Overview` → `## Required test commands` (`| Name | Command | Covers |` table, "floor / none-is-valid" note) → `## E2E test plan` (`### Flow N` blocks: Steps / Expected / Traces to) → `## Tasks` (task block gains `- **Type:** tdd | e2e` after Goal). The two new sections are pure data — no two-question discipline text in the artifact (consumers own it).

- `agents/code-writer.md` → **deleted**, replaced by:
  - `agents/code-writer-tdd.md` — `name: code-writer-tdd`; 4 steps (Gather context / Implement with TDD / Run the gates / Commit and report); unit tests only; keeps the public-symbol documentation block; UI-conventions duty lives HERE (conditional); reads task block + Required test commands section; guardrail-read names `code-writer-tdd`; self-containment carve-out names the Required test commands section.
  - `agents/code-writer-e2e.md` — `name: code-writer-e2e`; 4 steps; Implement step realizes each task-named flow from the E2E test plan section as automated e2e tests (author + confirm it exercises/passes, no RED/GREEN); drops the heavyweight doc block for a one-line test-convention guideline; reads task block + E2E test plan section + Required test commands section; guardrail-read names `code-writer-e2e`; self-containment carve-out names both sections.
  - Both: "Run the gates" step covers guardrail selection AND the required-test-commands floor under one shared two-question model; unrunnable floor command = blocker (drift), failing = work.
- `agents/code-plan-writer.md` → plan structure gains the two sections + Type field; L64 inverted to "Plan the test floor and e2e flows, not unit tests" (phrase "derived from browser verification" removed); L60 narrowed to "the tdd writer ... RED phase".
- `agents/code-plan-reviewer.md` → new step 2 "Validate the required-test-commands" (execute; did-it-resolve-and-terminate; zero/missing tests OK; unrunnable rejects; restated inline, no setup.md ref, no parity caveat); review checklist gains "Required-test-commands coverage" + "E2E coverage" items; L28 inverted to "No unit-test planning" (phrase removed).
- `agents/code-reviewer.md` → step 3 adds the re-drive sentence before the byte-identical evidence sentence (L35); L29 lightly retied to the plan; L81/L110 byte-identical.
- `reference/autonomous-phases/4 - code.md` → L3 type-conditional overview; two writer rows (no "verifies behavior"); optional Type capture in step 1; type-conditional launch in step 3.1 with Type added to the parenthetical; generic plural L34/L35 and the mermaid node stay.
- `reference/conventions/load.md` → L30 enumeration = {code-writer-tdd, code-writer-e2e, code-reviewer, doc-writer, doc-reviewer}.
- `reference/conventions/setup.md` → L183 option list = same five; L189 example row → `code-writer-tdd`.
- `reference/assisted-phases/3 - plan.md` → code-plan.md skeleton gains the two sections + Type; L30/L117/L152 inverted (R3 boundary); step-4 self-check gains "Required-test-commands validate" (driver executes, surfaces to owner) + "E2E coverage"; abstract singular `code-writer` role mentions left as-is.
- `README.md` → L112 roster: `code-writer` → `code-writer-tdd`, `code-writer-e2e`.
- **Untouched (confirmed):** `SKILL.md:39` ("behavior verification" stays a phase-4 output, now at the reviewer); `doc-writer.md:64` (incidental example); `autonomous-phases/3 - plan.md` (orchestrates the pair only, no test-planning content); the steady-state inert-guardrail rule (no migration text — AC8).

**Out of scope (operational follow-up, per spec):** this repo's own `.rp.md` Agent-models — add `code-writer-tdd`/`code-writer-e2e` rows, drop `code-writer`. Not a skill acceptance criterion, but required for the next real run to dispatch and resolve models.

**Acceptance-criteria coverage:** AC1→Q2+Q4; AC2→Q4; AC3→Q3; AC4→Q5.1; AC5→Q5.3; AC6→Q5.2; AC7→Q5.5+README+Q4; AC8→no migration text anywhere.
