# Spec Review — Rejected (iteration 1)

**Verdict:** Rejected
**Spec reviewed:** `1-spec/spec.md` (commit `1c5f8e4`)
**Reason:** A requirement is not covered by its own acceptance criterion. The acceptance-criteria grep (AC #5) can return zero matches while two clauses that Requirement 5 explicitly promises are still violated. The spec's primary "done" test is therefore satisfiable with the change incomplete.

---

## Blocking finding — the absence-check does not test all of Requirement 5

Requirement 5 ("Lowercase prose is plural") promises that running-text forms read, among others, **"docs task"** and **"docs-writers"/"Docs-writers"**, and that **no singular "doc task"** remains for the concept. AC #5 is the spec's testable expression of that ("searching … returns zero matches after the change"). But the four grep patterns in AC #5 leave two of those promised forms untested:

### 5a. Plural `doc-writers` / `Doc-writers` is not caught by any pattern (4 real occurrences)

Pattern P1 is `(?<!design-)\bdoc-(plan-writer|plan-reviewer|plan-review|plan|writer|reviewer)\b`. The trailing `\b` after `writer`/`reviewer` means `doc-writer` matches but **`doc-writers` does not** — the `s` removes the word boundary. Verified empirically: `printf 'doc-writers' | grep -oP '<P1>'` produces no match.

These four occurrences are in scope and are exactly what Requirement 5 names ("docs-writers"/"Docs-writers"):
- `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md:36` — "Doc-writers share the pipeline branch's single working tree…"
- `agents/doc-plan-reviewer.md:32` — "If two doc-writers executed this plan independently…"
- `agents/doc-plan-writer.md:6` — "…a group of doc-writers can execute in phase 5."
- `agents/doc-reviewer.md:103` — "…fresh doc-writers will read your review file…"

Consequence: an implementer could leave all four singular, run AC #5, get **zero matches**, and conclude "done" — while Requirement 5 is violated. The acceptance criterion does not test the requirement it is meant to test.

### 5b. Plural `doc tasks` is not caught (3 real occurrences)

Pattern P2c is `\bdoc task\b|\bdoc-plan topic\b|\bdoc planning\b`. `\bdoc task\b` matches the singular "doc task" but **not** "doc tasks". Requirement 5 says no singular "doc task" remains; the plural inflection is the same concept and is in scope, but is untested:
- `skills/radical-pipelines/reference/assisted-phases/3 - plan.md:118` — "…which doc tasks block which" (paraphrase; "doc tasks")
- `skills/radical-pipelines/reference/assisted-phases/3 - plan.md:177` — "…which doc tasks block which."
- `agents/doc-plan-reviewer.md:28` — "…dependencies between doc tasks correct?"

Same failure mode: these can survive a passing AC #5.

### Required fix

Make AC #5's patterns cover the inflected/plural forms that Requirements 4 and 5 promise — or, equivalently, state the patterns so they match the concept token regardless of a trailing `s`. Concretely, one workable adjustment:
- P1: allow an optional trailing plural on the role nouns, e.g. change `…|writer|reviewer)\b` to `…|writers?|reviewers?)\b` (keep the `(?<!design-)` lookbehind; `design-doc-writers` does not occur, but the anchor stays correct).
- P2c: change `\bdoc task\b` to `\bdoc tasks?\b`.

After adjusting, re-confirm the patterns still (a) return the catalogued hits before the change, (b) return zero after, and (c) do not match `design-doc-*` or already-plural `docs-*`. (The same `(?<!design-)`/`(?<!Design )` anchoring already in the spec handles the design-doc protection; verified that `design-doc-writer`/`design-doc-reviewer` are not matched by P1.)

Note: this is a defect in the **acceptance criterion's testability**, not in the requirements' intent. Requirements 4 and 5 already name the plural/inflected targets correctly; only the grep that is supposed to verify them is too narrow.

---

## Non-blocking observations (fix encouraged, not required for approval)

- **Requirement 5 / AC wording vs. the actual text.** Requirement 5 lists "docs-plan topic" (hyphenated). The repository contains both the hyphenated form (`assisted-phases/3 - plan.md:164`, "doc-plan topic") and a spaced form (`:160`, "doc plan topics") plus the title-case heading `## Doc Plan Topics` (`:52`, referenced `:59,169`). The spaced/title-case forms are caught by P2a (`(?<!Design )\b[Dd]oc [Pp]lan\b`) and the hyphen form by P2c, so coverage is fine — but Requirement 5's enumeration could mention the spaced "docs plan topic(s)" form too, for symmetry with what AC #5 actually checks. Optional.

- **No standalone-`doc` straggler concern.** I re-ran a bare-token sweep; every remaining standalone "doc" outside the catalogued forms is either `design-doc`/"design doc" (protected), the long word "document"/"documentation" (out of scope by design), or already-plural "docs"/"Docs". No uncatalogued singular concept token exists, so the inventory behind Requirements 1–5 is complete apart from the inflection gap above. Good.

---

## What is sound (for the record)

The following were independently verified against the worktree and are accurate and complete:

- **Requirements 1–4, 6, 7, 8** rest on verified facts:
  - The four agents are `doc-plan-writer`, `doc-plan-reviewer`, `doc-writer`, `doc-reviewer` with matching `name:` frontmatter (confirmed at `agents/*.md:2`).
  - **filename == `name:` is a universal invariant** across all 17 agents (zero mismatches), grounding Requirement 2's filename-rename requirement and its discoverability rationale.
  - The completion predicate references `…/3-plan/doc-plan-review-approved.md` (in `skills/radical-pipelines/reference/pipeline-versioning.md`), and the phase-5 input list references `doc-plan.md` (`…/autonomous-phases/5 - docs.md:9`), grounding Requirement 3 and AC #2. (Minor: the spec text doesn't cite the predicate's file path, so the research's stale `conventions/pipeline-versioning.md` citation does not propagate into the spec — no spec defect.)
  - `.rp.md` Agent models table lists the four singular names at rows 90, 91, 94, 95 (Requirement 6 / AC #4).
  - `website/demo.js` hard-codes the singular agent names and `doc-plan.md`/`doc-plan-review-approved.md` (Requirement 6 / AC #4).
  - `.changeset/agent-scoped-guardrails.md:5` names `doc-writer`/`doc-reviewer` in present-tense, live-concept prose (Requirement 7).
- **Design-doc protection is real and the anchoring works.** `design-doc-writer`/`design-doc-reviewer` contain the substrings `doc-writer`/`doc-reviewer`, but the `(?<!design-)` lookbehind correctly excludes them (verified: P1 matches nothing inside `agents/design-doc-writer.md`/`design-doc-reviewer.md`), and the matched-string set for P1 is exactly `{doc-plan, doc-plan-review, doc-plan-reviewer, doc-plan-writer, doc-reviewer, doc-writer}` — no design-doc contamination. AC #7 (design-doc byte-for-byte unchanged) and Out-of-Scope are correct.
- **The naming rule** (leading noun → `docs`, suffix preserved) is clearly stated, derived from the existing phase-5/code-phase convention, and internally consistent across the requirements.
- **The match-vs-line caveat** in AC #5 is correct and important: `setup.md` and `doc-reviewer.md` each carry both an in-scope `doc-plan.md` token and a protected `design-doc.md` token on one line, so `-o` (count matches) rather than line-filtering is required. Verified.

Once AC #5's patterns are widened to cover the plural `doc-writers`/`Doc-writers` and `doc tasks` forms (and any other trailing-`s` inflection of the in-scope tokens), the spec is approvable.
