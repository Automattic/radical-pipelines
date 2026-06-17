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

- Topic 1 (in flight): re-read mechanics — which candidate home is actually traversed again mid-run vs. merely "read once at start." Sent to researcher.

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

### The two R4 spots in `manage-issues.md`

- Front-door framing — `manage-issues.md:3`: "This is the front door: it is upstream of `work-on-an-issue.md` and stops once the issue exists — it does **not** create or run pipelines."
- Forward-only close-out — `manage-issues.md:52-54`: "advancing it into a pipeline happens separately through `work-on-an-issue.md`."

Both presume the next step is the session-start forward path (advance into a pipeline). R4: neither may hard-code a single next step; control returns to the invoking situation.

## Decisions

_(populated as the Q&A proceeds)_
