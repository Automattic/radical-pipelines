# Design Doc Review — APPROVED (iteration 1)

Reviewer: `design-doc-reviewer` · Team: `137-managing-issues-mid-session-r7k2`

Verdict: **APPROVED**

Reviewed `…/base/2-design-doc/design-doc.md` against the spec (`…/base/1-spec/spec.md`), the design research (`…/base/2-design-doc/design-doc-research.md`), the project `CLAUDE.md` skill-authoring rules, and the live skill under `skills/radical-pipelines/`.

## Independent verification of load-bearing claims

All factual claims the design rests on were re-derived directly from the live skill, not taken on trust:

- **Complete issue create/modify site set = `reference/manage-issues.md` (`:3,:9,:30,:50`) + `review-pipeline.md:12`.** Confirmed by grepping all create/modify/author/write-issue sites. The only other "issue" hits are review-feedback findings in `autonomous-phases/4 - code.md:34` and `5 - docs.md:35` (problems scoped to a task, not tracker writes) and `setup.md:40` (slug uniqueness). The assisted-phases files (spec, design-doc, plan) carry no tracker write. So there is nothing to patch per-procedure (AC2 holds by construction).
- **No re-traversed path / no back-pointer to `SKILL.md`.** Confirmed: no `reference/*` file points back to `SKILL.md` or "the Rules"; the only `SKILL.md` grep hits are unrelated agent-install paths in `pi.md:51-52`. Nothing mid-run routes through `SKILL.md`.
- **`conventions/load.md` is load-once-at-workflow-start, not a re-read path.** Confirmed: `load.md:5` ("Read it at the start of any workflow"); only `SKILL.md:46`, `work-on-an-issue.md:7`, and `manage-issues.md:5` route through it — both the latter are entry points; nothing mid-run does. There is **no literal re-read discipline anywhere in the skill** (grep for re-read/reread/read-again/read-fresh returns only `health-monitoring.md:70` and `resume-pipeline.md:20`, both unrelated). The tracker-routing rule "Every tracker operation … goes through the **Issues** convention" lives in `manage-issues.md:5`, not in `load.md`. The design correctly does not over-claim a re-read discipline that does not exist; it rests durability on policy-vs-procedure instead.
- **`manage-issues.md` is only forward-jumped-to, never returned to.** Confirmed: the only inbound reference is `review-pipeline.md:12` (plus the `SKILL.md` Entry-points row). No "return to manage-issues.md" exists.
- **The two R4 spots and their line numbers are accurate.** `manage-issues.md:3` carries the three tangled claims (scope boundary, hard-coded next step, positional front-door framing); `:52-54` is the `## Close out` heading + forward-only sentence. Both match the design's citations.
- **"Managing Issues workflow" is a spec-only term.** Confirmed: the skill uses the H1 "# Managing Issues" (`manage-issues.md:1`) and the Entry-points label "Manage issues"; the literal string "Managing Issues workflow" appears nowhere. The design's Writer Note A correctly instructs reuse of the file reference / existing handle rather than coining a new proper noun (AC6).

## Soundness against the spec

- **R1 / AC1** — One standing recognition rule in `SKILL.md ## Rules`, pointing at `reference/manage-issues.md`, fires for any create/modify decision and routes into the full capture Q&A. Covers mid-session and mid-pipeline, beyond the single merged case. Sound.
- **R2 / AC2** — Stated once at the Rules altitude; existing references rely on it. No per-procedure patches (verified site set above). Sound.
- **R3** — The crux. The design correctly identifies that no structurally re-traversed path exists and defeats the "place it on a re-traversed path" framing by resting durability on the policy-vs-procedure distinction, with the two existing always-on Rules bullets as the empirical precedent (never re-read, reliably govern). It does not depend solely on the session-start entry-point framing, because the rule is a separate standing statement. Honest and sound.
- **R4 / AC3** — D3 dissects line 3 into KEEP (scope boundary), REMOVE (hard-coded next step), SOFTEN (positional framing), and replaces the close-out with a bare situation-neutral return carrying zero caller examples. The no-examples rationale is well-argued and aligns with "describe the system only as designed" (a "mid-run caller resumes its run" example would document a caller that does not concretely exist today). The negative criterion AC3 is satisfied by confirming an absence. Sound.
- **R5 / AC4** — `review-pipeline.md:12` is a terminal redirect (verified: no post-redirect review logic to return into) and stays byte-for-byte unchanged, inheriting routing from the rule and return from the situation-neutral close-out. Its triggering condition is an unchanged review-domain judgment. Sound.

## Out-of-Scope (all five locked items respected)

Run-time tracker metadata (`.rp.md` "Orchestrator updates during a run"), no new recognition triggers, no spawned-agent behavior changes, and the absent `merge-pipeline.md`/`close-pipeline.md` files are all explicitly preserved and untouched. The rule's wording stays on "create or modify an issue" so it cannot capture metadata ops. AC5 covered.

## CLAUDE.md skill-authoring compliance (AC6)

- **Minimalist** — one bullet, no restatement; the close-out carries no enumeration.
- **No cross-path duplication** — the recognition rule lives once; `review-pipeline.md:12` relies on it without restating.
- **Generic** — the rule is deliberately kept out of the project-supplied Issues convention; no agentic-tool or tracker-platform specifics; reuses existing handles ("Issues convention", "work on an issue", "Managing Issues" / file reference).
- **Negatives** — the one retained negative (Claim A's "does not create or run pipelines") is correctly identified as a necessary scope boundary permitted under the rule; the design explicitly warns the implementer not to strip it and not to hunt for a negative to remove.
- **Prose-not-software** — the acceptance criteria are behavioral; no structural assertions about sections/wording/ordering are introduced.

## Notes (non-blocking)

- The design refers to the file consistently as `reference/manage-issues.md`, the accurate full path; the spec used the bare `manage-issues.md`. The fuller form is an improvement, not a defect.

No architectural gaps, factual errors, Out-of-Scope violations, or skill-authoring-rule violations were found. The design is complete, internally consistent, faithfully aligned with R1–R5 and AC1–AC6, and admissible to proceed to the Plan phase.
