# Code Plan — Managing Issues mid-session

## Nature of this change

The "code" here is the **skill's prose** under `skills/radical-pipelines/`. Three small markdown edits across two files, plus one file deliberately left untouched. The design (Key Decisions D1–D4) is fully resolved; the only open work is the minimalist writing pass on the exact wording.

There are **no automated guardrail gates** for this project, and the project's `CLAUDE.md` forbids structural tests that assert skill/agent file content (sections, wording, ordering). Verification is therefore **behavioral**: read the skill and trace its reading paths to confirm the acceptance criteria hold. This is captured as the final task; it does not write any test file.

Every task must respect the `CLAUDE.md` authoring rules (minimalist; generic — no agentic-tool or issue-tracker-platform specifics; no duplication across reading paths; no special-case restatement of a general rule; no unnecessary negatives; reuse existing terms; prose-not-software) and all five Out-of-Scope items in the spec.

**Shared terminology note (applies to every editing task).** The literal string "Managing Issues workflow" is a spec term that does **not** appear in the skill. The skill's own handles are the H1 `# Managing Issues` (in `reference/manage-issues.md`) and the Entry-points label "Manage issues". New prose must point at the workflow via its **file reference** (`reference/manage-issues.md`) and/or the existing "Managing Issues" handle — never coin a new capitalized proper noun. The two distinct existing handles must stay apart: the **Issues** convention (project-supplied tracker mechanism) versus the Managing Issues workflow (the generic capture process in `manage-issues.md`). The new rule references the latter and must not touch the former.

---

## Task 1 — Add the recognition rule to `SKILL.md` `## Rules`

**Goal:** State, once and at a general level, that creating or modifying an issue — at session start or mid-session — means following the Managing Issues workflow, so the guarantee is carried as a standing invariant rather than living only in the session-start entry-point row. (D1)

**Files:**
- `skills/radical-pipelines/SKILL.md` (`## Rules` section, after `:14`–`:15`)

**Changes:**
- Add exactly **one** bullet to the `## Rules` list, in the same silently-inherited style and altitude as the two existing bullets (`:14` "Humans only talk with you, never with the other agents."; `:15` "Each phase produces concrete, inspectable artifacts…").
- The bullet declares: whenever you create or modify an issue — at session start or mid-session — follow `reference/manage-issues.md`. Indicative phrasing (subject to the minimalism / term-reuse pass): *"Whenever you create or modify an issue — at session start or mid-session — follow `reference/manage-issues.md`."* The final wording is a writing choice; the decision (one bullet, this altitude, points at the file, no Q&A restatement) is fixed.
- The bullet **points at** the workflow file; it does **not** restate the capture Q&A steps.
- Keep the wording on "**create or modify an issue**" so it cannot capture out-of-scope run-time tracker metadata (status, labels, assignee, version label, branch push), which are the separate `.rp.md` "Orchestrator updates during a run" convention. Do not mention or fold in those metadata operations.
- Reference the workflow by its file reference and/or the existing "Managing Issues" handle; do not coin a new capitalized proper noun (no literal "Managing Issues workflow" string). Reference the Managing Issues workflow, not the Issues convention.

**Depends on:** none.

**Traces to:** R1, R2, R3 / AC1, AC2, AC6. (Design D1.)

**Acceptance:**
- `## Rules` contains exactly one new bullet covering issue create/modify, alongside the two pre-existing bullets (no other bullet added, none removed).
- The bullet names `reference/manage-issues.md` and does not reproduce any of the capture Q&A steps (frame / ask the goal / invite extras / reflect hypotheses / draft-confirm-write).
- The bullet's trigger is "create or modify an issue" (issue-level), not run-time metadata; reading it against the spec's Out-of-Scope #1 shows it does not reach metadata operations.
- No new proper noun is coined; the bullet uses the file reference and/or the "Managing Issues" handle, and does not reference the Issues convention.
- The bullet is generic: no agentic-tool and no issue-tracker-platform specifics.

---

## Task 2 — De-exclusivize the Entry points preamble in `SKILL.md`

**Goal:** Stop the Entry points preamble from asserting that the Manage-issues route is a session-start-only decision, so it no longer contradicts the standing rule added in Task 1, while keeping the "Manage issues" row as the discoverable session-start front door. (D2)

**Files:**
- `skills/radical-pipelines/SKILL.md` (Entry points preamble, `:50`; the table at `:52`–`:55`)

**Changes:**
- Give the preamble sentence (`:50`, currently "When the owner starts a new session, determine which entry point applies from the table below.") a minimal touch so it no longer implies the Manage-issues route is reached only at session start. The table still functions as a session-start router — at session start the owner picks an entry point, which remains true — so the touch removes the false *exclusivity* without denying the session-start use.
- **Keep** the "Manage issues" row (`:55`) and the "Work on an issue" row (`:54`) and the table itself unchanged. (Filing/editing an issue is a legitimate top-level intent at session start, and the table is its discoverable front door. `work-on-an-issue.md` also stays discoverable via the "Work on an issue" row.)
- This touch **removes a false implication only**; it must **not** restate the recognition rule from Task 1 (that would be cross-path duplication). Do not add an "anytime" clause to the preamble — the mid-session truth lives solely in the Task 1 Rules bullet.
- Minimal-touch wording is an implementation choice; the decision (no longer asserts session-start-only, rows retained, no rule restatement) is fixed.

**Depends on:** Task 1 (same file; the de-exclusivization is only coherent once the standing rule exists to carry the mid-session truth, and sequencing avoids edit conflicts in `SKILL.md`).

**Traces to:** R3, R4 / AC1, AC6. (Design D2.)

**Acceptance:**
- The preamble no longer asserts the Manage-issues route is a session-start-only / once-at-start decision; reading Rules-bullet-then-preamble surfaces no contradiction ("anytime" vs. "only at session start").
- The "Manage issues" and "Work on an issue" rows and the table structure are retained.
- The preamble does not restate the recognition rule (no duplicated "create or modify an issue → follow `manage-issues.md`" statement on this path).
- Wording stays generic and minimalist.

---

## Task 3 — Make `manage-issues.md` mid-session-safe with no hard-coded next step

**Goal:** Let `manage-issues.md` be entered mid-session without falsely committing the orchestrator to a single fixed next step. Keep the workflow's scope boundary and its "report the issue reference" close, but drop the forward-only "advance into a pipeline" commitment and the session-start positional framing, so control returns to the situation that invoked the workflow and that situation decides what happens next. (D3)

**Files:**
- `skills/radical-pipelines/reference/manage-issues.md` (framing line `:3`; close-out `:52`–`:54`)

**Changes (framing line, `:3`):**
- **Keep** the scope boundary: the workflow stops once the issue exists and does **not** create or run pipelines. The one negative ("does not create or run pipelines") is a necessary scope statement and is deliberately retained — do not hunt for a negative to strip here.
- **Remove** the hard-coded forward-only next step: the "it is upstream of `work-on-an-issue.md`" / "advancing it into a pipeline happens separately through `work-on-an-issue.md`" commitment, which is false for a non-session-start caller.
- **Soften** the positional framing: drop the "This is the front door / upstream of `work-on-an-issue.md`" sequencing that encodes "reached first, at session start". The scope boundary already states what the workflow does without claiming a fixed position in a fixed sequence.
- Do not weaken or remove the "creating or modifying an issue" purpose statement, the **Issues** convention routing, or the "make sure project conventions are loaded" pointer (`:5`).

**Changes (close-out, `:52`–`:54`):**
- **Keep** "Report the issue reference to the owner" and the "The issue now exists" statement.
- **Replace** the forward-only pointer ("advancing it into a pipeline happens separately through `work-on-an-issue.md`") with a **bare situation-neutral** return instruction: control returns to the situation that invoked the workflow, which decides what happens next. Indicative phrasing: *"The issue now exists. Report the issue reference to the owner. Control returns to the situation that invoked this workflow, which decides what happens next."* (final wording is an implementation choice).
- Add **no caller examples** — neither a session-start "advance into a pipeline" example nor a mid-run "resume the run" example. Examples would be a mini-enumeration of callers in the workflow file (against stated-once), would illustrate reasoning rather than the instruction, and a "mid-run caller resumes its run" example would document a caller that does not concretely exist today. Zero examples.

**Untouched within this file (do not edit):** the H1 (`:1`), the conventions-loaded pointer (`:5`), "What this covers" (`:7`–`:10`), "The issue format" (`:12`–`:14`), "Constraints" / the approval gate (`:17`–`:20`), Steps 1–5 including the modify-reads-the-issue-first branch (`:30`) and the draft/confirm/write approval gate (`:48`–`:50`). These are already situation-neutral and reusable as-is.

**Depends on:** none (different file from Tasks 1–2; logically independent of them).

**Traces to:** R4 / AC3, AC6. (Design D3.)

**Acceptance:**
- Reading `manage-issues.md` as if entered mid-session, nothing forces the orchestrator to start fresh pipeline work on the just-created/just-modified issue, and nothing forces a return either — the close-out hands control back to the invoking situation, which decides.
- The scope boundary survives, including its necessary negative "does not create or run pipelines".
- "Report the issue reference" and "The issue now exists" survive in the close-out.
- The close-out contains zero enumerated caller examples.
- Steps 1–5, the modify-reads-first branch, the approval gate, the Issues-convention routing, and the conventions-loaded pointer are unchanged.
- The framing no longer claims a fixed "front door / upstream of `work-on-an-issue.md`" position.
- Wording stays generic, minimalist, and reuses existing terms.

---

## Task 4 — Behavioral verification by tracing the skill's reading paths

**Goal:** Confirm, by reading the edited skill and tracing its reading paths (not by writing any test), that all acceptance criteria hold and every out-of-scope file is untouched. This is the project's mandated verification mode for a prose change with no guardrail gates and a `CLAUDE.md` prohibition on structural tests over skill content. (D4 and the spec's AC1–AC6.)

**Files (read-only inspection; no file is written or tested):**
- `skills/radical-pipelines/SKILL.md`
- `skills/radical-pipelines/reference/manage-issues.md`
- `skills/radical-pipelines/reference/review-pipeline.md`
- `skills/radical-pipelines/reference/work-on-an-issue.md`
- `skills/radical-pipelines/reference/conventions/load.md`
- the phase files, `autonomous-workflow.md`, `assisted-workflow.md`, `create-pipeline.md`, and the project's `.rp.md` run-time-metadata convention (confirm absence of changes only)

**Changes:** none — this task produces a verification note in the code-writer's task summary, not a code or test artifact. Do **not** create structural tests asserting sections, wording, or ordering of skill/agent files (forbidden by `CLAUDE.md`).

**Depends on:** Task 1, Task 2, Task 3.

**Traces to:** R1–R5 / AC1–AC6. (Design D4 for the AC4/AC5 portions.)

**Acceptance — trace each and record the result:**
- **AC1 (R1):** Following the reading paths, an orchestrator that decides mid-session (including mid-pipeline) to create or modify an issue is routed into the Managing Issues workflow via the new Rules bullet (Task 1) — the operation goes through the capture Q&A and the Issues convention — rather than ad hoc, and this holds beyond the single merged-pipeline case.
- **AC2 (R2):** The guarantee is the single general Rules bullet, not duplicated special-case instructions; confirm the previously-silent mid-session spots (every create/modify site) were **not** separately patched. The complete create/modify site set is `manage-issues.md` (the workflow itself) plus `review-pipeline.md:12` (the lone pointer); confirm no per-procedure pointer was added anywhere.
- **AC3 (R4):** Reading `manage-issues.md` as if entered mid-session, no single next step is hard-coded; control returns to the invoking situation. The merged-pipeline caller proceeding toward pipeline work remains correct; a mid-run caller resuming is possible.
- **AC4 (R5):** `review-pipeline.md:12` is **byte-for-byte unchanged** (verify with a diff/grep), still routes correctly (its terminal redirect to `manage-issues.md`) and returns correctly (via the situation-neutral close-out), reads consistently with the general rule with no contradiction and no redundant restatement, and its triggering condition (recognizing a merged-pipeline change as new work) is unchanged.
- **AC5 (out-of-scope):** Run-time tracker metadata handling, the set of moments that trigger issue creation, the spawned-agent phase files, both workflow files, `create-pipeline.md`, and the absent `merge-pipeline.md` / `close-pipeline.md` are all unchanged. Confirm the only modified files are `SKILL.md` and `reference/manage-issues.md`.
- **AC6 (authoring rules):** The change is minimalist, generic (no agentic-tool or issue-tracker-platform specifics), free of duplication across reading paths, free of unnecessary negatives (the one retained scope negative is necessary), and reuses existing terms ("Issues" convention, "Managing Issues" handle / file reference, "work on an issue"); no new proper noun was coined.
- Report any failing trace back as a defect for the relevant editing task rather than papering over it.
