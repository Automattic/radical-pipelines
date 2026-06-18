# Code Summary — Managing Issues mid-session

## What

Three prose edits across two skill files make the Managing Issues workflow apply whenever the orchestrator creates or modifies an issue, not only at session start:

- `skills/radical-pipelines/SKILL.md`
  - `## Rules` gains one standing bullet (`:16`): *"Whenever you create or modify an issue — at session start or mid-session — follow `reference/manage-issues.md`."*
  - The Entry points preamble (`:51`) is de-exclusivized: "When the owner starts a new session, determine which entry point applies from the table below." → "At session start, pick an entry point from the table below." The "Manage issues" and "Work on an issue" rows and the table are retained.
- `skills/radical-pipelines/reference/manage-issues.md`
  - The framing line (`:3`) keeps the scope boundary ("stops once the issue exists — it does **not** create or run pipelines") but drops the positional "entry point / front door / upstream of `work-on-an-issue.md`" sequencing and the forward-only "advancing it into a pipeline" commitment.
  - The close-out (`:54`) keeps "Report the issue reference to the owner. The issue now exists." and replaces the forward-only pointer with a situation-neutral return: "Control returns to the situation that invoked this workflow, which decides what happens next."

No source file other than these two changed. `reference/review-pipeline.md` is byte-for-byte unchanged.

## Why

The workflow was previously expressed only as a session-start entry-point routing decision, with no general rule. An orchestrator that decided mid-run (including mid-pipeline) to author an issue had no standing rule telling it the Managing Issues workflow applied, and could author the issue ad hoc — and the session-start framing lived where it had no re-read discipline. The change promotes the guarantee to a standing invariant and makes the workflow safe to enter mid-session, while keeping the skill conformant to the project's minimalist, generic, no-duplication, prose-not-software authoring rules.

## How

The requirement was split into two jobs so neither overloads the wrong mechanism:

- **Recognition** — a one-line standing policy in `SKILL.md` `## Rules`, in the same silently-inherited style and altitude as the two existing bullets. An LLM reliably carries this category of always-on invariant across a long run without re-reading it.
- **Execution** — once recognition fires, the full capture Q&A is re-read fresh by following the file reference into `manage-issues.md`, using the skill's existing inline-naming mechanism (already proven by the `review-pipeline.md:12` caller). The fragile multi-step procedure is never asked to be held in memory.

Two supporting edits keep the change consistent: the Entry points preamble stops asserting session-start exclusivity (otherwise it would contradict the new "anytime" rule), and `manage-issues.md` drops its single hard-coded next step so control returns to the invoking situation. The lone caller, `review-pipeline.md:12`, inherits routing from the new rule and return from the situation-neutral close-out, and needs no edit.

Verification was behavioral, as mandated for a prose change with no guardrail gates and a `CLAUDE.md` prohibition on structural tests over skill content: reading the edited skill and tracing its reading paths. No test file was produced.

## Key decisions

- **The recognition rule lives once in `SKILL.md` `## Rules`, pointing at the file.** Rejected placing it in `conventions/load.md` / the Issues-convention row (that convention is a project-supplied tracker mechanism, not generic workflow-routing behavior — placing it there would break "stay generic" and conflate two referents the skill keeps separate). Rejected per-procedure pointers (the duplicated special-case form the project's rules forbid).
- **`review-pipeline.md:12` left byte-for-byte unchanged.** It is a terminal redirect; once it hands control to `manage-issues.md` the review is abandoned, so there is no return logic to patch. An explicit return note would be a redundant restatement.
- **Zero caller examples in the close-out.** The relevant criterion (AC3) is a negative one, satisfied directly by the bare "the invoker decides" instruction. Examples would be a mini-enumeration inviting future "add my caller" edits, and a "mid-run caller resumes its run" example would document a caller that does not concretely exist today.
- **The recognition rule's wording stays on "create or modify an issue"** so it cannot capture out-of-scope run-time tracker metadata (status, labels, assignee, version label, branch push), which remain governed by the separate `.rp.md` "Orchestrator updates during a run" convention.
- **No new proper noun coined.** The spec's literal "Managing Issues workflow" appears nowhere in the skill; the edits use the `reference/manage-issues.md` file reference and the existing handles.

## Known limitations

- `work-on-an-issue.md` references terminal-action files `merge-pipeline.md` and `close-pipeline.md` that do not exist in the skill. This is a pre-existing structural gap, explicitly out of scope for this change, and is unaddressed.
