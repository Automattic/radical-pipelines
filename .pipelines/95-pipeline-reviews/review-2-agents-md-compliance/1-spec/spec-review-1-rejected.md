# Spec Review

## Verdict: rejected

## Summary

The spec is strong on substance: every flagged passage, quote, and line reference was re-verified against the current working tree and is accurate; the consolidated requirements from the research are all covered (requirements 1–13 map cleanly onto research requirements 1–11); the two-tier compliance bar (AGENTS.md jurisdiction vs. owner's request) is correctly carried over from the research; the Out of Scope section is explicit and correct; and the acceptance criteria are specific and checkable, in the same style as the approved review-1 spec. The rejection is for internal consistency and precision defects: the spec invents a finding numbering that contradicts both the intent and itself, contains a wrong requirement cross-reference, mischaracterizes the "model" base-ref pointer pattern it tells the design to copy (the cited examples are not substance-free), and leaves requirement 8 ambiguous about whether line 29's "NEVER create a new branch" may survive the dedup. Each of these can send the design-doc phase in conflicting directions.

## Issues

### Issue 1: Finding numbering contradicts the intent and the spec itself

**What's wrong:** The intent enumerates **six** findings, where finding 6 is the "Minor" trio (6a "rows are unchanged" sentence, 6b review-pipeline opener/step-6 overlap, 6c README ↔ changeset). The spec renumbers 6c as "finding 7" (Overview tier 2; requirement 9's heading "finding 7 — owner's request") while simultaneously keeping the intent's count: "The six findings are the **complete known violation list**" (Overview) and requirement headings "(finding 6, partial)". Worse, the tier-1 statement "Findings 1–6 (the `AGENTS.md`-governed prose) … These are violations of the literal rules" is false under the intent's numbering, because the intent's finding 6 *includes* the README ↔ changeset pair, which the spec itself establishes is **not** AGENTS.md-governed.
**Where in spec:** Overview (tier bullets and the "complete known violation list" sentence); requirement headings for requirements 7, 8, and 9.
**Suggestion:** Pick one numbering and use it consistently. Either keep the intent's 1–6 with 6a/6b/6c sub-labels (as the research does), or renumber to 1–7 everywhere — including the "complete known violation list" sentence and the tier-1/tier-2 split (tier 1 would then be findings 1–5 plus 6a/6b, or 1–6 under the renumbering).
**Why it matters:** The design-doc phase reads the spec alongside the intent. Conflicting numbering between the two documents — and within the spec itself — makes traceability claims like "findings 1–6 are literal violations" wrong as written, and invites the design to mis-scope the jurisdiction split the spec worked hard to establish.

### Issue 2: Wrong cross-reference — "requirement 9" should be the no-new-violations requirement

**What's wrong:** The Overview says "the change must not introduce new ones (requirement 9)". Requirement 9 is the README ↔ changeset dedup. The no-new-violations requirement is **11**.
**Where in spec:** Overview, final paragraph before "All flagged passages have been re-verified…".
**Suggestion:** Change "(requirement 9)" to "(requirement 11)". While fixing cross-references, also make Out of Scope's "beyond what the nine requirements name" explicit — the spec has thirteen requirements, and "the nine" presumably means the concrete edit requirements 1–9, but a reader cannot know that without guessing.
**Why it matters:** A broken pointer in the sentence that defines the change's central safety constraint (don't introduce new violations) sends a careful reader to the wrong requirement; the "nine requirements" phrase compounds the confusion from Issue 1.

### Issue 3: The "model" pointer pattern is mischaracterized as substance-free

**What's wrong:** Requirement 6 instructs the design to copy "the already-compliant pointer pattern … a parenthetical that names the rule and **gives no substance** (as in `autonomous-phases/4 - code.md` and `5 - docs.md`)", and requirement 11 / AC 10 calls these parentheticals "pointer-only". The actual parentheticals read "(the start of the current run — see the **Reviewer base ref** rule in `pipeline-versioning.md`)" (`4 - code.md:35`, `5 - docs.md:36`) — they carry a gloss that restates the canonical rule's keying clause ("keyed on the start of the current run", `pipeline-versioning.md:23`). They are not substance-free.
**Where in spec:** Requirement 6 (second sub-bullet); requirement 11; Acceptance Criteria 6 and 10.
**Suggestion:** Describe the pattern accurately (a reference with at most a minimal orienting gloss, no restatement of the value, capture timing, or hold-constant clause) — or state explicitly that the target for the two edited steps is a bare reference, stricter than the 4/5 parentheticals. Then make AC 6 say whether a gloss like "the start of the current run" counts as restating.
**Why it matters:** Two implementers following "copy the 4/5 pattern" vs. "give no substance" produce different text, and the reviewer applying AC 6 cannot tell whether a copied gloss is a pass or a fail. Precision here is the whole point of finding 3.

### Issue 4: Requirement 8 is ambiguous about line 29's "NEVER create a new branch"

**What's wrong:** Requirement 8 says line 29's "and NEVER create a new branch" "restates the same fact a third time and is part of the same cluster available to the design" — i.e., a candidate for removal — and in the same paragraph lists "step 3/line-29's re-attach-don't-create-a-branch instruction" among the "distinct operational content" each location keeps. AC 8 inherits both: the fact must appear "once" while the "step 3/line-29 re-attach instruction … retain[s its] distinct operational content". If the design keeps "NEVER create a new branch" verbatim, it is undecidable from the spec whether the file now states the fact once (the instruction is operational) or twice (it is part of the cluster).
**Where in spec:** Requirement 8 ("Within-path overlap" section); Acceptance Criterion 8.
**Suggestion:** Resolve the tension explicitly. Either: (a) classify "NEVER create a new branch" as operational content of the re-attach step (like resume's rollback override), exclude it from the cluster, and scope the dedup to the opener/step-6 pair — matching the intent, whose finding 6b names only those two; or (b) include it in the cluster and require the design to fold it into the single statement. State which.
**Why it matters:** This is the one requirement where the spec hands the design a "cluster" without a decidable success condition. AC 8 must be checkable by the downstream reviewers; as written, the same edit can be judged pass or fail.
