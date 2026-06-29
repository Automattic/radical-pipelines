# Design Doc Review

## Verdict: rejected

## Summary

This is a strong, unusually thorough design. Every spec requirement (Reqs 1–12) traces to a named decision, every decision lists credible alternatives with trade-offs, the product/artifact boundary is defined with a concrete predicate, and the feasibility claims check out against the codebase: the five target profiles exist, the narrower Rule 2 line is exactly at `code-writer-tdd.md:33`, the commit-format default and fork-mode cherry-pick behave as described, the strict `tdd | e2e` router and completion-predicate-via-approval-artifact are as stated, and the `AGENTS.md`/`CLAUDE.md` no-structural-tests rule is real. The Topic 8 "decision-only" path for this feature's own prose tasks is a genuine literal-reading tension, but it is honestly disclosed as an accepted residual and is grounded in real precedent (123/134/137/90 shipped identically). The design is rejected for one consistency gap that two implementers would resolve differently — the design describes the `docs-reviewer`'s new commit-message check as parallel to the `code-reviewer`'s, but the two reviewers' existing step-2 checklists are not symmetric, and the design's wording papers over the difference in a way that touches a spec requirement (Req 7 on docs product commits).

## Issues

### Issue 1: The docs-reviewer has no existing commit-message hook to layer onto; the design describes its new check as symmetric with the code-reviewer's when it is not

**What's wrong:** The design adds product-commit-message provenance inspection to both reviewers' step-2 "Review the changes" checklists, describing the two additions in parallel (Components, line 36: "in its step 2 'Review the changes' checklist, including product-commit-message inspection"; Decision "Enforcement reuses the existing review gate," line 102: "adding product-commit-message inspection for provenance leaks"). But the two reviewers' existing checklists are not symmetric:

- `code-reviewer.md:31` already has **"Convention compliance — host project's coding, testing, build, and commit conventions"** — a natural hook the commit-provenance check rides on. The design's research correctly anchors to this (`code-reviewer.md:31`).
- `docs-reviewer.md:33`'s closest item is **"Convention compliance — host project's documentation conventions (voice, structure, formatting, cross-linking)"** — scoped entirely to documentation *content*. It says nothing about commit messages, and the `docs-reviewer` step-2 checklist has **no** commit-conventions item at all (verified: `grep -i commit` over `docs-reviewer.md` step 2 returns nothing).

So for the docs phase a genuinely **new** checklist concern (commit-message inspection) must be introduced, not a rider added to an existing commit hook. The design treats the two cases as the same shape. This matters because the `docs-writer` commits external docs, which are product commits subject to Req 7's no-provenance constraint — the docs-reviewer's enforcement of the product-commit rule is load-bearing, not incidental.

**Where in design doc:** Components (line 36); Key Decisions → "Enforcement reuses the existing review gate" (lines 100–105); Interfaces and Data Flow (line 57, which lumps both reviewers' commit inspection together).

**Suggestion:** State explicitly that the docs-reviewer gains a **distinct** commit-message inspection item (product commits carry no pipeline-naming provenance), because — unlike the code-reviewer — its existing convention-compliance item covers only documentation content and offers no commit hook. Either name the new item separately for the docs-reviewer, or note the asymmetry and say the same standalone commit-provenance check is added to both. Make the two reviewers' additions independently specified rather than described as one symmetric edit.

**Why it matters:** As written, two implementers would diverge: one would attach a referent rider to the docs-reviewer's documentation-convention item (which does not cover commit messages, so Req 7 on docs product commits would go unenforced at the docs gate), and another would add a distinct commit-inspection item. A spec requirement's enforcement hinges on which reading wins. The "if two implementers read this independently, would they implement the same thing" test fails here.

### Issue 2: The "decisive line for Rule 1 / Rule 2 wording" precedent points at a profile line that no longer carries the cited content — verify the template anchor before implementation relies on it

**What's wrong:** The research record (which the design faithfully reflects) repeatedly cites `docs-writer.md:64` as the house "drift-vs-natural-adaptation" template the canonical Rule 1 / Rule 2 wording should follow (research Topics 3 and 6; design "Rule 1 is a content-discipline rule," "Rule 2 referent-based test"). The design doc itself describes "the house template the existing profiles use to state a fine semantic line with a negative example" (Open Questions, line 150) without a line number, so the design text is not wrong on its face. But the anchor the research leans on, `docs-writer.md:64`, currently reads **"Design↔code drift is a blocker"** — a blocker-reporting guideline, not a Rule-1/Rule-2-shaped content-discipline rule. The named-rule + decisive-criterion + negative-example *shape* is present there, so the template is not invalid, but the specific line the upstream record points at does not carry the "natural adaptation vs drift" content the research attributes to it.

**Where in design doc:** "Rule 1 is a content-discipline rule" (lines 86–91) and "Rule 2 is expressed as a referent-based test" (lines 79–84), via their reliance on the research's `docs-writer.md:64` template; Open Questions "Exact canonical wording" (line 150).

**Suggestion:** Confirm the intended template anchor and cite it correctly so the implementation phase reaches for the right precedent. If the shape (named rule → one-line decisive criterion → concrete "this is NOT a violation" example → action) is what is meant, state that shape directly rather than via a line reference that has drifted, so the canonical-wording task in the Plan phase is not sent to the wrong exemplar.

**Why it matters:** The exact canonical wording is the single most consequential deferred decision (it is the byte-identical block duplicated into five profiles, and Req 11's "stated once and consistently" rests on it). Pointing the wording effort at a stale anchor risks the implementer either mismodeling the rule or wasting a cycle rediscovering the right exemplar. This is a low-cost fix now and a higher-cost ambiguity later.
