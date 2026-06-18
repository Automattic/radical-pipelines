# Spec Review — Rejected (iteration 3)

**Verdict:** Rejected
**Spec reviewed:** `1-spec/spec.md` (commit `a688bbb`)
**Reason:** The acceptance-criteria absence-check (AC #5) still does not test all of the requirements it claims to verify. The two prior findings are resolved, but the AC #5 patterns enumerate only a **closed whitelist of trailing words** after the concept noun (`-plan…`, `task(s)`, `writer(s)`, `reviewer(s)`, `planning`, `plan topic`). Any other word following the short-form concept noun `doc` slips through — and at least six such in-scope occurrences exist today. The spec's primary "done" test is therefore still satisfiable with the change incomplete. This is the same defect class as iterations 1 and 2, on a third axis (trailing-word coverage rather than inflection or case).

---

## Prior findings — both resolved (verified)

- **Iteration 1 (inflection).** P1 now reads `…|writers?|reviewers?)\b` and P2c reads `\bdoc tasks?\b`. Verified: `doc-writers` and `doc tasks` are caught.
- **Iteration 2 (case).** All four patterns now carry `-i` and the lookbehinds are `(?<![Dd]esign-)` / `(?<![Dd]esign )`. Verified against the worktree: the three previously-missed capitalized occurrences are now caught — `Doc-writers` (`5 - docs.md:36`), `Doc-plan` (`doc-reviewer.md:32`), `Doc tasks` (`3 - plan.md:27`) — while `design-doc-*`/`Design Doc` stay excluded and already-plural `docs-*`/`Docs-writers` are not matched.

These are genuinely fixed. The new finding is independent of both.

---

## Blocking finding — AC #5 misses six in-scope short-form `doc` occurrences

The four AC #5 patterns match the concept noun `doc` only when it is immediately followed by one of a hand-listed set of words. When `doc` (the same short-form concept noun the spec is normalizing) is followed by **any other word**, no pattern fires. Six real, in-scope occurrences are missed. Each is verified present in the worktree at `a688bbb`, is the documentation-phase concept in short form (not `design-doc`, not the long word "documentation"), is in no Out-of-Scope carve-out, and — confirmed by feeding it to all four patterns — produces **no match**:

1. **`doc updates`** — `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md:44`
   Mermaid edge label: `B -->|commits doc updates| C{All batch tasks done?}`. The code phase's parallel edge reads `commits code + tests` (`4 - code.md:43`), confirming this is the phase concept. Target: `commits docs updates`.

2. **`doc tests`** — `agents/doc-writer.md:35`
   "If a gate covers **doc tests**, exercise them…". Documentation tests = the phase concept. Target: `docs tests`.

3. **`doc gates`** — `agents/doc-writer.md:67`
   "Failing **doc gates** are not blockers…". The phase concept. (The same line also contains `doc-plan`, which P1 *does* catch — but the `doc gates` token itself is uncaught, so the line is not a safety net.) Target: `docs gates`.

4. **`doc diff`** — `agents/doc-reviewer.md:21`
   "Inspect the **doc diff** for the batch…". The diff of the documentation produced this phase — the phase concept in short form. Target: `docs diff`.

5. **`doc surfaces`** — `skills/radical-pipelines/reference/assisted-phases/3 - plan.md:28`
   "…task slicing, ordering, file boundaries, **doc surfaces**, audiences." Documentation surfaces = the phase concept (cf. the same file's "documentation surface" at :24). Target: `docs surfaces`.

6. **`doc-phase`** — `.changeset/agent-scoped-guardrails.md:5`
   "A code- or **doc-phase** guardrail can now name the agents that run it…". Directly parallel to the existing `spec-phase` (`spec-researcher.md:3`) and `design-phase` (`design-doc-researcher.md:3`) compounds — the phase concept. This file is explicitly **in scope** (Requirement 7), and the same sentence's `doc-writer`/`doc-reviewer` are being pluralized; leaving `doc-phase` singular re-introduces the very split the change targets, inside an in-scope file. Target: `docs-phase`.

**Consequence (same as iterations 1–2):** an implementer can fix everything the four patterns catch, leave these six singular, run the AC #5 searches, get **zero matches**, and conclude "done" — while the documentation concept is still spelled `doc` in six in-scope places. The acceptance criterion does not fully test the requirements it is meant to test.

**Why this keeps recurring (root cause).** The patterns chase a closed whitelist of *trailing* words. Each iteration discovers a new trailing word that was not on the list. The whitelist approach is structurally incomplete for "no singular concept token remains." A check anchored on the *leading concept noun* `doc` (followed by a hyphen or space, with the `(?<![Dd]esign[- ])` and `document`-exclusion anchors already in the spec) — rather than on an enumeration of what follows it — would be self-completing and would not need a fourth revision when the next trailing word appears.

### Required fix

Make AC #5 detect the short-form concept noun `doc` regardless of the word that follows it, while preserving the existing exclusions. One workable formulation (anchor on the leading token, exclude the protected/generic cases):

- A leading-noun pattern such as `(?<![Dd]esign[- ])\b[Dd]oc(?![Ss])(?!ument)\b[- ]` — i.e. a `doc` word-token (not `docs`, not `document…`, not preceded by `design`/`Design`) followed by a hyphen or space — catches `doc updates`, `doc tests`, `doc gates`, `doc diff`, `doc surfaces`, and `doc-phase` along with everything the current four patterns already catch. Tune the trailing anchor so the genuinely-generic cases below are not forced in (see "Author decision required").
- Keep the `(?<![Dd]esign[- ])` lookbehind and the `document` exclusion so `design-doc-*`/`Design Doc` and the long word "documentation" stay unmatched, and confirm already-plural `docs-*`/`Docs …` stay unmatched.
- Correspondingly, Requirement 4 (display labels / Mermaid) and/or Requirement 5 (lowercase prose) should name these forms so the requirement text and its test agree — e.g. the Mermaid edge `commits docs updates`, and the prose forms `docs tests` / `docs gates` / `docs diff` / `docs surfaces` / `docs-phase`. (Requirement 4 currently lists Mermaid *node* labels `Docs Writer`/`Docs Reviewer` but not the *edge* label `doc updates`; Requirement 7 covers the changeset's agent names but not its `doc-phase` token.)

After adjusting, re-confirm the patterns still:
(a) return the catalogued occurrences before the change (now including these six);
(b) return zero after the change;
(c) do **not** match `design-doc-*`/`Design Doc …`;
(d) do **not** match already-plural `docs-*`/`Docs …`;
(e) do **not** force in the generic-English cases the author rules out below (or, if the author rules them in, do match them and name them in the requirements).

### Author decision required (three borderline generic occurrences)

Three further short-form `doc` occurrences are uncaught by AC #5 and are plausibly **out of scope** under the existing carve-out "generic English 'document'/'documentation' and host-project documentation references." They read as a generic single document rather than the phase identifier. State the ruling explicitly (and ensure the AC pattern's trailing anchor matches the ruling) so the next reviewer does not have to guess:

- `agents/doc-writer.md:14` — "a reference **doc** may only need a glance" (generic single document).
- `skills/radical-pipelines/reference/assisted-phases/3 - plan.md:175` — "who the **doc** is for" (generic single surface).
- `agents/design-doc-reviewer.md:14` — "check that the **doc** faithfully reflects…" — here "the doc" is the *design* doc; **out** under the phase-2 `design-doc` exclusion regardless.

My read: the first two are defensibly out (generic English "the doc"), the third is clearly out (design-doc). I am **not** blocking on these; I list them so the spec can say so rather than leave them ambiguous. The six numbered items above are the blocking gap.

Note: like iterations 1 and 2, this is a defect in the **acceptance criterion's testability**, not in the requirements' intent. The naming rule the spec states — "the leading noun is `docs` regardless of any trailing … word" — already implies these six are in scope; only the grep meant to verify it is still too narrow.

---

## What is sound (for the record)

Independently re-verified against the worktree at `a688bbb` and accurate:

- **The case + inflection fixes from iterations 1–2 hold.** `-i` plus `writers?`/`reviewers?`/`tasks?` plus the `(?<![Dd]esign[- ])`/`(?<![Dd]esign )` lookbehinds catch all lowercase and capitalized inflected forms on the whitelisted trailing words, with design-doc and `docs-*` correctly excluded.
- **Design-doc protection holds under `-i`.** P1 matches nothing inside `agents/design-doc-{writer,reviewer,analyst,researcher}.md`; P2a/P2b match nothing in the `2 - design-doc.md` mermaid labels. The `doc-writer`/`doc-reviewer` substrings inside `design-doc-writer`/`design-doc-reviewer` stay unmatched.
- **No `docs-*` false positives.** The widened, case-insensitive P1 still does not match any already-plural `docs-*`/`Docs-writers` form.
- **The match-vs-line caveat** (count matches with `-o`, not lines, because `setup.md:48` and `doc-reviewer.md:115` each carry an in-scope `doc-plan.md` and a protected `design-doc.md` on one line) remains correct and preserved.
- **Requirements 1–4, 6, 7, 8** rest on facts verified in prior iterations and unchanged here: the four agents and their `name:`/filename pairs; filename==name as a universal invariant grounding Requirement 2; the completion predicate and phase-5 input list grounding Requirement 3; `.rp.md` rows 90/91/94/95 and `website/demo.js` for Requirement 6; the changeset's agent names for Requirement 7.
- **The positive presence check** (`agents/docs-writer.md` exists with `name: docs-writer`, etc.) correctly guards against satisfying absence by deletion.
- **The naming rule** (leading noun → `docs`, suffix preserved, derived from phase-5/code-phase parallels) is stated correctly and consistently; the **Out of Scope** section is correct as far as it goes.

Once AC #5 detects the short-form concept noun `doc` regardless of the following word (catching the six occurrences above while keeping the design-doc, long-word, and `docs-*` exclusions), and Requirements 4/5/7 name those forms, the spec is approvable.
