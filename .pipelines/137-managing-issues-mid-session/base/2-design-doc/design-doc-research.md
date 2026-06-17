# Design Research — Managing Issues mid-session

Running record of the design Q&A between `design-doc-analyst` and `design-doc-researcher`. Ground truth is `1-spec/spec.md`; this records the evidence behind the design decisions the `design-doc-writer` will write up.

## The central decision

WHERE the durable "mid-session issue authoring re-enters the Managing Issues workflow" rule (R1) should live so it is reliably re-encountered mid-run (R3), honoring:

- R3 — durability without depending on the session-start entry-point framing that currently causes the skip.
- CLAUDE.md — minimalist, generic, no cross-path duplication, no special-case restatement of a general rule, prose-not-software, reuse existing terms.
- R2 — stated once at a general level; existing references rely on it silently.
- R4 — `manage-issues.md` made safe to enter mid-session with NO hard-coded next step; control returns to the invoking situation.
- R5 — the lone `review-pipeline.md` precedent keeps routing/returning correctly, relying on the rule without restating it.

Candidate homes: SKILL.md Rules section, vs. the Issues-convention description reached via `reference/conventions/load.md`, possibly both.

## Open questions

- Topic 1 — RESOLVED (see Findings → Topic 1 resolution).
- Topic 2 — converging on the placement. Researcher's Topic-1 trace already supplies the mechanism evidence (see Findings → Topic 2 mechanism + the emerging two-job framing). Confirming synthesis with researcher.

## Findings

### Analyst's pre-Q&A map of the reading paths (to be confirmed by researcher)

All references to the **Issues convention** in the skill (`grep`):

- `conventions/load.md:16` — table row defining what it covers (loaded at workflow start).
- `conventions/setup.md:62` — capture spec, read only during setup.
- `create-pipeline.md:25` — uses it to read the issue.
- `intent-format.md:29` — provenance-header reference.
- `work-on-an-issue.md:15` — uses it to verify/capture the issue.
- `manage-issues.md:5` — the routing rule ("every tracker operation … goes through the **Issues** convention").

There is **no single "Issues convention description" page** the orchestrator is routinely sent back to on each tracker touch. The convention's abstract description is one table row in `load.md`; concrete behavior lives in the project `.rp.md`. So the "Issues-convention description via `load.md`" candidate is effectively "put the rule in `load.md`."

Who points at `conventions/load.md` (grep): only `SKILL.md:46`, `manage-issues.md:5`, `work-on-an-issue.md:7`. The latter two are the two entry points. **Nothing mid-run** (`autonomous-workflow.md`, `review-pipeline.md`, `create-pipeline.md`) re-routes through `load.md`. So `load.md` has the same "read once at start" weakness as SKILL.md — arguably worse, since it is reached only from entry points.

Implication (pending researcher confirmation): neither candidate is structurally re-traversed mid-run by a tracker operation. R3 ("reliably re-encountered when it acts mid-session") is therefore not satisfied by *placement on a re-traversed path*; it must be satisfied another way (e.g., placement at the entry-point root that every relevant procedure already inherits, the same inheritance pattern R2 names; and/or a pointer from the mid-run tracker-touch sites).

### Topic 1 resolution — re-read mechanics (researcher-confirmed)

Researcher's independent trace confirmed the analyst map and sharpened it:

- There is **no literal re-read/reread instruction anywhere** in the skill (grepped). So R3 cannot be met by "a re-read discipline" that doesn't exist.
- `conventions/load.md` carries only a **start-of-every-workflow load mandate** (line 6: conventions loaded "at the start of any workflow"). The tracker-routing rule ("Every tracker operation … goes through the **Issues** convention") lives in `manage-issues.md:6`, **not** in `load.md`. The spec's phrase "re-read discipline carried via load.md" (R3) is therefore loose; `load.md` is not where that rule lives today.
- The one existing mid-session caller is `review-pipeline.md:12` (precondition (b) Unmerged) — names the file, no restatement, no explicit return.
- "Orchestrator updates during a run" (status/labels/push/version/assignee) is a **project convention in `.rp.md`** (referenced from `review-pipeline.md:54`), not part of the generic skill and not part of Managing Issues — consistent with the spec's Out-of-Scope.

**Conclusion of Topic 1:** Neither candidate home is on a path that is structurally re-traversed mid-run. Both SKILL.md and `load.md` are reached only at skill-activation / workflow-start / entry-point-start. R3's "reliably re-encountered mid-run" therefore cannot be satisfied by *placing the rule on a re-traversed path* — no such path exists. It must be satisfied by the **inheritance pattern R2 already names**: a rule stated once at the entry-point root that downstream procedures inherit silently, the same way `manage-issues.md:18` inherits `intent-format.md`'s authoring discipline "across all steps," and the way SKILL.md's "## Rules" already governs everything. The design question becomes WHICH root, and whether the lone mid-run caller needs anything beyond inheritance.

### Topic 2 mechanism — the skill's real durability pattern (researcher-confirmed)

Researcher traced the back-pointers and re-traversal paths:

- **SKILL.md is never pointed back to.** No `reference/*` file points to SKILL.md or says "consult the Rules" (the only SKILL.md grep hits, `pi.md:51-52`, are unrelated agent-install paths). The autonomous run lives entirely in `autonomous-workflow.md` + phase files and never re-traverses SKILL.md. A rule in SKILL.md Rules is **read-once-and-hope** — the least re-traversed location of all candidates.
- **`load.md` is also load-once-at-workflow-start** (`load.md:5,7`), not re-traversed per tracker-touch — no better than SKILL.md for re-encounter.
- **The mechanism that actually works is inline naming at the point of need.** The **Issues** convention is re-named at every tracker op (`manage-issues.md:3,5,30,50`; `work-on-an-issue.md:15`; `create-pipeline.md:25`; `intent-format.md:29`). The orchestrator is reminded "go through the Issues convention" not by re-reading `load.md` but because each procedure names it inline. Likewise the one mid-run issue-authoring path, `review-pipeline.md:12`, **names `manage-issues.md` inline**; following that name re-reads the full capture Q&A regardless of whether SKILL.md is still in context.
- **`work-on-an-issue.md` is genuinely re-traversed mid-session** (returned to by `resume-pipeline.md:42`, `review-pipeline.md:50,58`); **`manage-issues.md` is only forward-jumped-to** from `review-pipeline.md:12`, never returned to.

**The heart of the WHERE decision (researcher's framing):** SKILL.md Rules is the idiomatic home for "a general rule stated once" (R2) but is the *least* durable for re-encounter (R3). `manage-issues.md` is guaranteed re-read by anyone who follows a pointer to it (R3-strong) but you have to *already decide* to go there — it is not where an orchestrator that has forgotten the workflow exists would look. That tension is the crux.

### Emerging synthesis — the rule has two distinct jobs (analyst, to confirm)

R1 actually asks for two things, and conflating them is what makes the WHERE question feel unresolvable:

1. **Recognition** — "when I am about to create or modify an issue, the Managing Issues workflow is what applies" (don't author ad hoc). This is the *general rule* R2 wants stated once. Its job is to fire even when the orchestrator has NO pointer in front of it — so it must live where the orchestrator's standing rules live: **SKILL.md `## Rules`**. It points at `manage-issues.md` rather than restating the Q&A (R2: existing references rely on it; CLAUDE.md: no duplication).
2. **Execution/durability** — once recognized, the full capture Q&A is re-encountered by *following the pointer* into `manage-issues.md`. This is the existing inline-naming mechanism (R3-strong), and it already works for `review-pipeline.md:12`.

Under this split: R3's "reliably re-encountered" is satisfied because the recognition rule routes the orchestrator to `manage-issues.md`, which it then re-reads in full. SKILL.md Rules' read-once weakness is mitigated because the rule there is short and is the kind of standing behavioral rule the orchestrator is meant to hold for the whole session (like "humans only talk with you"). `load.md` / Issues-convention is rejected as the home: that convention is *where issues live and how to read/create/modify them* (a project-supplied, generic-by-abstraction convention), not a *workflow-routing* behavior; folding workflow routing into it would blur a clean term (CLAUDE.md: reuse existing terms, stay generic) and still wouldn't be re-traversed mid-run.

### The two R4 spots in `manage-issues.md`

- Front-door framing — `manage-issues.md:3`: "This is the front door: it is upstream of `work-on-an-issue.md` and stops once the issue exists — it does **not** create or run pipelines."
- Forward-only close-out — `manage-issues.md:52-54`: "advancing it into a pipeline happens separately through `work-on-an-issue.md`."

Both presume the next step is the session-start forward path (advance into a pipeline). R4: neither may hard-code a single next step; control returns to the invoking situation.

## Decisions

_(populated as the Q&A proceeds)_
