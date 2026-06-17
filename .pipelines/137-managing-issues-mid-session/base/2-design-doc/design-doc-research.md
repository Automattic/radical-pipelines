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

- Topic 1 — RESOLVED (re-read mechanics).
- Topic 2 — RESOLVED. Central placement decided: state the rule once in SKILL.md `## Rules`. See Decisions D1.
- Topic 3 (next): `manage-issues.md` framing rewrite — front-door (`:3`) and forward-only close-out (`:52-54`) made mid-session-safe with no hard-coded next step (R4/AC3); the Entry points table wording (`SKILL.md:50` "starts a new session") checked for consistency; `review-pipeline.md:12` return behavior (R5/AC4) checked.

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

**"Touches the tracker" splits by operation type (important for scoping, R5/AC5):**

- **Per-run metadata updates** (status, labels, push, version, assignee) fire mid-run repeatedly but are out of scope (spec Out-of-Scope, line 41). They neither pass through a candidate home nor should — no design change touches them.
- **Genuine issue create/modify mid-run** is the only in-scope tracker op, and today exactly one reading path produces it: `review-pipeline.md:12`. It already re-enters the workflow by naming `manage-issues.md` inline. The R1/R3 gap is the absence of a *general* statement that any future mid-run create/modify routes through the workflow — `review-pipeline.md:12` is a hand-written one-off, not a general rule.

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

### Topic 2 stress-tests — researcher-confirmed (the basis for D1)

The researcher ran the three stress-tests and the synthesis held; the key correction it produced reframed the whole decision:

- **Test 1 (is SKILL.md Rules enough for R3?).** Yes — but NOT because it stays in context. The intent's failure (intent.md:14) is that the workflow is framed ONLY as a session-start entry-point routing decision (`SKILL.md:50`), with **no general rule at all today**. The fix is to promote it to a standing `## Rules` invariant. `## Rules` durability comes from being an always-on policy the orchestrator carries, proven by the two existing bullets (`:14`, `:15`) that are never re-read mid-run yet reliably govern. So the model "general rule held all session" IS the design's answer; the failure was the *absence of a rule* (only an entry-point row), not a rule scrolling away.
- **Test 2 (AC2 / no per-procedure patches).** Confirmed: the general rule is the ONLY admissible mechanism, because AC2 forbids per-procedure patches. `review-pipeline.md:12` keeps working by inheritance and needs no routing change. Researcher grep found no other mid-run issue-create/modify site today (consistent with spec "no new triggers").
- **Test 3 / part (c) (load.md / Issues-convention rejected).** The Issues convention is project-supplied tracker mechanism; the routing rule is generic skill behavior. Different altitude, different referent. Placing the rule there breaks "stay generic" and conflates "Issues convention" with "Managing Issues workflow" — two concepts the skill keeps separate (and `manage-issues.md` uses side by side). Verified precedent: both existing `## Rules` bullets have zero downstream restatements (pure silent inheritance) — the R2 pattern, empirically.

### The two R4 spots in `manage-issues.md`

- Front-door framing — `manage-issues.md:3`: "This is the front door: it is upstream of `work-on-an-issue.md` and stops once the issue exists — it does **not** create or run pipelines."
- Forward-only close-out — `manage-issues.md:52-54`: "advancing it into a pipeline happens separately through `work-on-an-issue.md`."

Both presume the next step is the session-start forward path (advance into a pipeline). R4: neither may hard-code a single next step; control returns to the invoking situation.

## Decisions

### D1 — The general rule lives once in SKILL.md `## Rules` (the central placement decision)

**Decision.** State R1 as a single new bullet in SKILL.md `## Rules`, at the same altitude and in the same silently-inherited style as the two existing bullets. It points at `reference/manage-issues.md` and does not restate the capture Q&A. Do NOT place it in `load.md` or the Issues-convention row. Do NOT add per-procedure pointers. The existing `review-pipeline.md:12` caller then *relies on* this rule (R2/R5) and is unchanged for routing.

Indicative wording (final phrasing is the design-doc-writer's, subject to the writer's minimalism pass): *"Whenever you create or modify an issue — at session start or mid-session — follow the Managing Issues workflow (`reference/manage-issues.md`)."*

**Why this home, on evidence:**

- **It reframes the rule's STATUS, which is the actual fix.** The intent's failure (intent.md:14) is not "general rules scroll out of context." It is that the Managing Issues workflow exists today ONLY as a session-start **entry-point decision** (`SKILL.md:50` "When the owner starts a new session, determine which entry point applies") — a one-time routing choice, with no general rule at all. The fix is to *promote* it from a once-at-start entry-point row to a standing `## Rules` invariant. That is precisely what `## Rules` is for.
- **`## Rules` durability does not depend on re-reading.** Both existing bullets (`SKILL.md:14` "Humans only talk with you"; `:15` "Each phase produces inspectable artifacts") are never re-read mid-run (zero downstream back-pointers, researcher-grepped) yet reliably govern — because they are always-on invariants the orchestrator carries as policy, not procedural steps it must re-encounter. The new bullet inherits exactly that mechanism. This satisfies R3 ("reliably encounters it when it acts mid-session") in the same way the skill already relies on for its other invariants, and it does not depend SOLELY on the session-start entry-point framing (R3's explicit requirement) because it is a separate, standing statement, not the entry-point row.
- **It is the only mechanism admissible under AC2.** AC2 forbids covering the previously-silent mid-session spots with per-procedure patches; a single general rule is the only way to govern all such spots (current and future) at once. `## Rules` is where the skill already states this kind of cross-cutting, never-restated invariant.
- **The R2 inheritance pattern is empirically the established one here.** The two existing `## Rules` bullets are stated once and never restated downstream (researcher grep: zero hits). Adding a third structurally-identical bullet matches the skill's own idiom.

**Why NOT `load.md` / the Issues-convention row (rejected):**

- The **Issues convention** is a PROJECT-SUPPLIED convention about WHERE issues live and HOW to read/create/modify them at the tracker level (`load.md:16`; `setup.md:66` asks which tracker and how to access it) — i.e. tool mechanism, filled in per project. The R1 rule is a GENERIC, tool-agnostic workflow-routing behavior. Putting generic skill behavior inside a project-supplied convention slot breaks CLAUDE.md "stay generic."
- It conflates two referents the skill deliberately keeps separate — the **Issues convention** (tracker mechanism) vs the **Managing Issues workflow** (capture process); note `manage-issues.md` uses BOTH side by side. CLAUDE.md says reuse existing terms for the SAME concept; these are different concepts. Merging muddies both.
- `load.md` is also only read at workflow start (no mid-run re-traversal), so it offers no durability advantage, and it is the wrong altitude: `load.md` is about loading/verifying conventions, not about when to run a workflow.

**Scope guard (R5/AC5).** The rule governs only genuine issue create/modify. Per-run tracker metadata (status/labels/push/version/assignee — the `.rp.md` "Orchestrator updates during a run" convention) is out of scope and is NOT routed through the workflow; the rule's wording stays on "create or modify an issue" so it does not accidentally capture metadata ops.
