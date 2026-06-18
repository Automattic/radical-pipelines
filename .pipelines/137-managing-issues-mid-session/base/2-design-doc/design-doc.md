# Design Doc: Managing Issues mid-session

## Overview

Today the Radical Pipelines skill (`skills/radical-pipelines/`) defines a Managing Issues workflow (`reference/manage-issues.md`) — an owner-led capture Q&A that frames the conversation, asks the goal, invites extras, reflects hypotheses back as open, drafts, confirms, and writes the issue through the project's **Issues** convention, with nothing written until the owner approves the rendered draft. The orchestrator is the only actor that touches the tracker; no spawned agent ever does.

The skill presents that workflow only as a session-start entry point: it is reached through the "Entry points" table, framed as a once-at-session-start decision ("When the owner starts a new session, determine which entry point applies"). There is no general rule that re-enters the workflow when the orchestrator creates or modifies an issue mid-session — partway through a "work on an issue" session, including while running a pipeline. Because the only statement of the workflow's applicability lives in a session-start entry-point row, an orchestrator that decides mid-run to author an issue has no standing rule telling it the workflow applies, and may author the issue ad hoc instead. Exactly one mid-session route exists today: the merged-pipeline case in `review-pipeline.md:12`, where a change requested against an already-merged pipeline is handled as a new issue via `manage-issues.md`; it names the workflow file inline and carries no restatement and no return note.

This change makes the workflow apply whenever the orchestrator creates or modifies an issue, not only at session start, while keeping the skill conformant to the project's skill-authoring rules (minimalist, generic, no duplication across reading paths, no special-case restatement of a general rule, prose-not-software).

The approach turns on one insight: the requirement is really two jobs, and conflating them is what makes "where does the rule live?" feel unresolvable.

1. **Recognition** — "when I am about to create or modify an issue, the Managing Issues workflow is what applies." This is a standing policy that must fire even when the orchestrator has no pointer in front of it. It lives where standing policies live: `SKILL.md` `## Rules`, as one new bullet pointing at `reference/manage-issues.md` without restating the Q&A.
2. **Execution** — once recognized, the full capture Q&A is re-encountered by following that pointer into `manage-issues.md` and reading it fresh. This is the skill's existing inline-naming mechanism, already proven by the `review-pipeline.md:12` caller.

The split is what lets the durable part (a one-line policy) be remembered across a long run while the fragile part (the multi-step procedure) is never asked to be remembered — it is re-read on demand. Two supporting edits make the change consistent: the Entry points preamble is de-exclusivized so it stops asserting the route is session-start-only, and `manage-issues.md`'s framing is made safe to enter mid-session by dropping its single hard-coded next step. `review-pipeline.md:12` is left byte-for-byte unchanged and relies on these edits.

## Approach

The mental model end to end:

1. **One standing recognition rule, stated once in `SKILL.md` `## Rules`.** A single new bullet declares that creating or modifying an issue — at session start or mid-session — means following `reference/manage-issues.md`. It is added at the same altitude and in the same silently-inherited style as the two existing bullets (`SKILL.md:14` "Humans only talk with you"; `:15` "Each phase produces inspectable artifacts"). It points at the workflow file rather than restating the capture Q&A.

2. **The Entry points preamble stops asserting session-start exclusivity.** The preamble (`SKILL.md:50`, "When the owner starts a new session, determine which entry point applies") is given a minimal touch so it no longer implies the Manage-issues route is a session-start-only decision. The "Manage issues" row stays — filing or editing an issue is a legitimate top-level intent at session start, and the table remains the discoverable front door for it.

3. **`manage-issues.md` is made safe to enter mid-session, with no hard-coded next step.** Only the framing (`:3`) and the close-out (`:52-54`) change. The framing keeps the scope-boundary claim (the workflow stops once the issue exists; it does not create or run pipelines) but drops the forward-only "advance into a pipeline via `work-on-an-issue.md`" commitment and softens the positional "front door / upstream" sequencing. The close-out keeps "report the issue reference" and then states that control returns to the situation that invoked the workflow, which decides what happens next — a bare situation-neutral instruction with no enumerated caller examples.

4. **The lone existing caller inherits the change unchanged.** `review-pipeline.md:12` is a terminal redirect: once it hands control to `manage-issues.md`, the review is abandoned and there is no post-redirect review logic to return into. It now relies on the standing rule for routing and on the situation-neutral close-out for return, and needs no edit. Its triggering condition — recognizing a merged-pipeline change as new work — is an unchanged review-domain judgment.

5. **Everything else inherits for free.** The complete set of issue create/modify sites in the skill is `manage-issues.md` (the workflow itself) plus `review-pipeline.md:12` (the lone external pointer). No phase file, neither workflow file, and `create-pipeline.md` ever writes an issue — they only read it through the Issues convention. There is therefore nothing to patch per-procedure; the one general rule governs every current and future mid-session create/modify site at once.

The durability question — "how is the rule reliably encountered when the orchestrator acts mid-run?" — is answered by the policy-vs-procedure distinction, not by token position. There is no point in the skill that is structurally re-traversed on every tracker touch: `SKILL.md` is read once at activation and is never pointed back to by any `reference/*` file; `conventions/load.md` is loaded once at workflow start and is reached only from the two entry points. So no candidate home is re-read mid-run, and the requirement cannot be met by placing the rule on a re-traversed path. It is met instead by the inheritance pattern the skill already relies on: a standing invariant in `## Rules` that the orchestrator carries as policy for the whole session, exactly as it carries the two existing bullets — which are never re-read yet reliably govern multi-hour runs. The fragile multi-step Q&A is never asked to be held in memory; it is re-read fresh from `manage-issues.md` the moment recognition fires.

## Components

**Modified components**

- `skills/radical-pipelines/SKILL.md` — `## Rules` gains one bullet stating the recognition rule (create/modify an issue → follow `reference/manage-issues.md`); the Entry points preamble (`:50`) is de-exclusivized while the "Manage issues" row is kept.
- `skills/radical-pipelines/reference/manage-issues.md` — the framing line (`:3`) keeps the scope boundary, drops the hard-coded next step, and softens the positional sequencing; the close-out (`:52-54`) replaces the forward-only pointer with a situation-neutral return instruction and keeps "report the issue reference."

**Untouched but load-bearing**

These carry the change with no edit; they are listed so the implementer knows not to touch them:

- `skills/radical-pipelines/reference/review-pipeline.md` — line 12 stays byte-for-byte unchanged. It inherits routing from the new Rules bullet and return from the situation-neutral close-out. Editing it would add a redundant restatement and a per-procedure patch — exactly what the general rule exists to avoid.
- `skills/radical-pipelines/reference/manage-issues.md` steps 1–5, the modify-reads-the-issue-first branch (`:30`), the approval gate (`:20`, `:50`), and the "report the issue reference" sentence are already situation-neutral and reusable as-is; they are not touched.
- `skills/radical-pipelines/reference/conventions/load.md` and the Issues-convention table row — the rule is deliberately not placed here (see Key Decisions). The convention's altitude and referent are different from the rule's.
- All phase files, both workflow files (`autonomous-workflow.md`, `assisted-workflow.md`), `create-pipeline.md`, and the absent `merge-pipeline.md` / `close-pipeline.md` — none writes an issue; none is edited.
- All run-time tracker-metadata handling (status, labels, assignee, version label, branch push), governed by the project's separate "Orchestrator updates during a run" conventions in `.rp.md` — out of scope and untouched.

## Interfaces and Data Flow

The "interfaces" here are the skill's reading paths and the inheritance that connects them, not code APIs.

**The recognition rule (the new standing policy).** Stated once in `SKILL.md` `## Rules` as one bullet, structurally identical to the two existing bullets: a short, always-on invariant the orchestrator holds for the session, never restated downstream. It names the workflow by its file reference (`reference/manage-issues.md`) — and may use the skill's existing "Managing Issues" handle — rather than restating the capture Q&A. The skill already uses two distinct handles in this area and keeps them apart: the **Issues** convention (the project-supplied tracker mechanism — where issues live and how to read/create/modify them) and the Managing Issues workflow (the generic capture process in `manage-issues.md`). The rule references the latter; it does not touch the former.

Indicative wording (final phrasing is an implementation choice, subject to a minimalism pass and to reusing the skill's existing terms rather than coining new ones): *"Whenever you create or modify an issue — at session start or mid-session — follow `reference/manage-issues.md`."*

**Scope of the rule (the boundary that keeps out-of-scope ops out).** The rule governs genuine issue create/modify only. Per-run tracker metadata — status, labels, branch push, version label, assignee — fires repeatedly mid-run but is the separate `.rp.md` "Orchestrator updates during a run" convention, not part of Managing Issues. The rule's wording stays on "create or modify an issue" so it cannot accidentally capture those metadata operations.

**The routing flow, end to end.** An orchestrator that decides mid-session to author an issue holds the recognition rule as standing policy → it follows the pointer into `manage-issues.md` → it reads the full capture Q&A fresh (frame, ask the goal, invite extras, reflect hypotheses, draft/confirm/write, all routed through the Issues convention, nothing written until the owner approves) → on completion the issue exists, the orchestrator reports the issue reference, and control returns to the situation that invoked the workflow, which decides the next step.

**The merged-pipeline caller's flow.** `review-pipeline.md:12` detects a merged-pipeline change is new work → redirects to `manage-issues.md` (the review is abandoned at this point) → the capture Q&A runs as above → at the close-out, control returns to the caller's situation, which — having already determined the change is new work with no review to resume — naturally proceeds toward a fresh pipeline for the new issue. The forward-only close-out that exists today is accidentally correct for this one caller; the situation-neutral close-out makes it correct by construction for every caller.

**The `manage-issues.md` framing, after the edit.** The framing line carries three distinct claims today; the edit treats them separately:

- The **scope boundary** ("stops once the issue exists; does not create or run pipelines") is situation-neutral and true regardless of caller — it describes what the workflow itself does and does not do. It is kept, including its one necessary negative ("does not create or run pipelines"), which is a legitimate scope statement permitted under the project's "negatives only when strictly necessary" rule.
- The **hard-coded next step** ("advancing it into a pipeline happens separately through `work-on-an-issue.md`"; "upstream of `work-on-an-issue.md`") is the forward-only commitment. It is false for the merged caller (whose review was abandoned) and for any future mid-run caller (which would resume its run). It is removed and made situation-dependent.
- The **positional framing** ("This is the front door: it is upstream of `work-on-an-issue.md`") encodes "reached first, at session start, ahead of pipeline work" — the session-start-only assumption named as the root cause. It is softened: the positional "front door / upstream" sequencing is dropped, while the scope boundary already states what the workflow does without claiming a fixed position in a fixed sequence.

Indicative close-out (final wording is an implementation choice): *"The issue now exists. Report the issue reference to the owner. Control returns to the situation that invoked this workflow, which decides what happens next."*

## Key Decisions

### Decision: State the recognition rule once in `SKILL.md` `## Rules`, pointing at `manage-issues.md`

- **Choice:** Add one bullet to `SKILL.md` `## Rules` stating that creating or modifying an issue means following `reference/manage-issues.md`, in the silently-inherited style of the two existing bullets. Do not restate the capture Q&A. The existing `review-pipeline.md:12` caller then relies on this rule.
- **Alternatives:** (a) Place the rule in `conventions/load.md` or the Issues-convention table row. (b) Add per-procedure pointers at each potential mid-run create/modify site.
- **Trade-offs:** The actual failure being fixed is not "general rules scroll out of context" — it is that the workflow exists today *only* as a session-start entry-point routing decision, with no general rule at all. The fix is to promote it from a once-at-start entry-point row to a standing invariant, which is precisely what `## Rules` is for. Durability does not depend on re-reading: both existing Rules bullets are never re-read mid-run (zero downstream back-pointers) yet reliably govern, because they are always-on policy the orchestrator carries, not procedural steps it must re-encounter. The new bullet inherits exactly that mechanism, and it does not depend solely on the session-start framing because it is a separate standing statement. This is also the only mechanism admissible under the "no duplicated special-case patches" rule: a single general rule is the only way to govern all such spots — current and future — at once. The `load.md` / Issues-convention option is rejected because the Issues convention is a project-supplied tracker mechanism (where issues live, how to access them), whereas the rule is generic, tool-agnostic workflow-routing behavior; placing it there would break "stay generic," conflate two referents the skill deliberately keeps separate, and offer no durability gain (`load.md` is also read only once at workflow start). Per-procedure pointers are rejected because they are the duplicated-special-case form the rules forbid.
- **Traces to:** R1, R2, R3 / AC1, AC2.

### Decision: De-exclusivize the Entry points preamble, keep the "Manage issues" row

- **Choice:** Give the Entry points preamble (`SKILL.md:50`) a minimal touch so it no longer asserts the Manage-issues route is a session-start-only decision. Keep the "Manage issues" row.
- **Alternatives:** (a) Leave the preamble unchanged. (b) Remove the "Manage issues" row entirely.
- **Trade-offs:** Leaving the preamble unchanged is unsafe: it is the exact framing named as the cause ("the session-start framing lives where it has no re-read discipline"). If the standing Rules bullet is added but the preamble keeps asserting the route is a session-start decision, the preamble becomes the new home of the very over-narrow framing being removed, and a careful reader hits a contradiction (Rules: "anytime"; preamble: "at session start"). The skill must describe the system only as it is designed to work, so the now-false exclusivity must go. Removing the row goes too far: filing or editing an issue is a legitimate top-level intent at session start, and the table is the discoverable front door for it; the row is retained and the table stays a session-start router (at session start the owner still picks an entry point — true), while the mid-session truth lives in the Rules bullet. This touch removes a false implication; it does not restate the recognition rule (which would be a duplicate).
- **Traces to:** R3, R4 / AC1, AC6.

### Decision: Make `manage-issues.md` mid-session-safe with no hard-coded next step

- **Choice:** Edit only the framing (`:3`) and the close-out (`:52-54`). Keep the scope boundary; remove the hard-coded "advance into a pipeline" next step; soften the positional "front door / upstream" framing. Replace the forward-only close-out with a bare situation-neutral return instruction and keep "report the issue reference." Leave steps 1–5, the modify-reads-first branch, and the approval gate untouched.
- **Alternatives:** (a) Keep the forward-only close-out. (b) Replace it with a situation-neutral instruction *plus* two caller examples (a session-start caller advances into a pipeline; a mid-run caller resumes its run).
- **Trade-offs:** The forward-only close-out hard-codes a single next step that is wrong for any non-session-start caller; it must become situation-dependent so control returns to the invoking situation, which decides. On whether to include examples: the relevant acceptance criterion is a negative one — verified by confirming an absence (nothing forces a single next step) — and the bare instruction "the invoker decides" satisfies all of its clauses directly; no example is load-bearing, since the criterion never asks the close-out to *demonstrate* both branches are reachable. Even two examples is a mini-enumeration of caller situations sitting in the workflow file, inviting future editors to "add my caller" — the opposite of the stated-once property. Examples also illustrate consequences of the instruction for particular callers (reasoning), not the instruction itself, which the minimalism rule discourages. Most decisively, the skill describes the system only as designed: a "mid-run caller resumes its run" example documents a caller that does not concretely exist today (the only concrete mid-run caller proceeds toward fresh pipeline work, not resume), and dropping that speculative example would leave only "session-start → `work-on-an-issue.md`," which is the removed hard-coded next step creeping back in softened clothing. So neither example may stay. Nothing is lost at zero examples: the session-start owner is served because their invoking situation decides (and `work-on-an-issue.md` stays discoverable via the Entry points "Work on an issue" row), and the merged caller is served because its situation decides.
- **Traces to:** R4 / AC3, AC6.

### Decision: Leave `review-pipeline.md:12` byte-for-byte unchanged

- **Choice:** Make no edit to `review-pipeline.md:12`. It relies on the new Rules bullet for routing and on the situation-neutral close-out for return.
- **Alternatives:** Add an explicit return note to `review-pipeline.md:12` describing where control should go after the issue is created.
- **Trade-offs:** `review-pipeline.md:12` is a terminal redirect — "handle it as a new issue via `manage-issues.md`, not a review." Once it sends control to `manage-issues.md`, the review is abandoned and there is no post-redirect review logic to return into. The situation-neutral close-out lands the caller back at the point where it already determined the change is new work, from which the correct, natural move is a fresh pipeline for the new issue. An explicit return note would be a redundant restatement and a per-procedure patch — exactly what the general rule and the situation-neutral close-out exist to avoid. Its triggering condition (recognizing a merged-pipeline change as new work) is an unchanged review-domain judgment; this change adds no new recognition trigger.
- **Traces to:** R5 / AC4, AC5.

## Dependencies

None new. The change is entirely prose-level within `SKILL.md` and `reference/manage-issues.md`. It depends only on existing skill mechanics already in place: the `## Rules` standing-invariant pattern, the inline-naming mechanism by which following a file reference re-reads the named procedure in full, the Issues convention as the tracker-routing handle, and the Entry points table as the session-start router. It stays generic — no agentic-tool specifics and no issue-tracker-platform specifics — and reuses the skill's existing terms ("Issues convention," "work on an issue," and the workflow's own "Managing Issues" handle / file reference) rather than coining new ones.

## Failure Modes and Observability

This is a skill-prose change with no runtime component; the failure modes are authoring and consistency hazards, and the "observability" is reading the skill.

**The standing rule fails to fire mid-run.** The recognition rule is a one-line policy in `## Rules`, the category an LLM holds across a long run (proven by the two existing bullets that govern multi-hour runs without re-reading). The multi-step capture Q&A — the part an LLM does drop over a long run — is never asked to be held in memory; it is re-read fresh from `manage-issues.md` once recognition fires. This split is the mitigation; it is the same basis the skill's other invariants already rely on, not a new gamble.

**A reader hits a contradiction in `SKILL.md`.** If the Entry points preamble kept asserting session-start exclusivity, it would contradict the new "anytime" Rules bullet. De-exclusivizing the preamble removes this surface; the table is left describing only what is true (at session start the owner picks an entry point), and the mid-session truth lives solely in the Rules bullet.

**The rule accidentally captures out-of-scope metadata operations.** Per-run tracker metadata (status, labels, push, version, assignee) is the separate `.rp.md` convention and must not be folded into the workflow. The rule's wording stays on "create or modify an issue," so it does not reach metadata ops. The detection point is reading the rule against the out-of-scope list.

**A future editor reintroduces duplication or a per-procedure patch.** The risk is someone "helpfully" restating the capture Q&A in a caller, or adding caller examples to the close-out. The design forecloses both by construction: the rule is stated once and the close-out carries zero examples, so any later addition is visibly a restatement or an enumeration the project's rules forbid.

## Risks and Open Questions

**Risks**

- The change must honor the project's minimalist, generic, no-duplication, prose-not-software writing rules. The recognition rule lives once in `## Rules` and is referenced (never restated) by `review-pipeline.md:12`; the close-out carries no enumerated examples. The one retained negative — the scope boundary's "does not create or run pipelines" — is a necessary scope statement and is deliberately kept; the implementer should not hunt for a negative to strip there.
- The rule must use the skill's existing handles, not coin a new capitalized proper noun. The literal string "Managing Issues workflow" is a spec term that appears nowhere in the skill; the skill uses the H1 "# Managing Issues" and the Entry-points label "Manage issues." The Rules bullet should point at the workflow via its file reference (`reference/manage-issues.md`) and/or the existing "Managing Issues" handle.
- The Entry points preamble touch must remove the false exclusivity without restating the recognition rule, or it reintroduces duplication; and it must keep the "Manage issues" row, or it loses the session-start front door.

**Open questions (deferred to implementation)**

- The exact minimalist wording of the new `## Rules` bullet — the indicative phrasing above is illustrative; the final wording is a writing pass subject to term-reuse and minimalism. The decision (one bullet, this altitude, pointing at the file, no Q&A restatement) is fixed.
- The exact minimal-touch wording of the de-exclusivized Entry points preamble — the decision (no longer asserts session-start-only, row retained, no rule restatement) is fixed; the phrasing is implementation work.
- The exact wording of the softened `manage-issues.md` framing and the situation-neutral close-out — the decision (keep scope boundary, drop hard-coded next step, soften positional framing, no caller examples, keep "report the issue reference") is fixed; the phrasing is implementation work.
