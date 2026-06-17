# Spec Review — Rejected (iteration 4)

**Verdict:** Rejected
**Spec reviewed:** `1-spec/spec.md` (commit `75d208c`)
**Reason:** The new leading-noun-anchored AC#5 pattern is sound and self-completing — it resolves the iteration 1–3 defect class. But AC#5 backs the pattern's *bare-`doc` skip* with a categorical empirical claim that is false, and the counterexample is a fourth generic single-document occurrence (`agents/doc-writer.md:25`, "a reader-facing doc") that is materially identical to the three the spec deliberately catalogues and rewords (Requirement 8) yet is left unmentioned and untouched. The spec is therefore internally inconsistent (one line of `doc-writer.md` is reworded, a near-identical line eleven lines later is not) and rests one of its correctness claims on an unverified absolute — the same kind of unre-verified claim that produced every prior rejection.

---

## The pattern itself is now correct (verified)

I ran the AC#5 pattern and a full reword-then-rename simulation against the worktree. The anchored approach works and is genuinely self-completing:

- **Pre-change count = 160**, exactly as the spec claims.
- **Every previously-missed form is now caught:** the six iteration-3 trailing-word forms (`doc updates`, `doc tests`, `doc gates`, `doc diff`, `doc surfaces`, `doc-phase`) and the iteration 1–2 inflected/capitalized forms (`doc-writers`/`Doc-writers`, `doc tasks`/`Doc tasks`, `Doc-plan`, `Doc Plan`). The leading-noun anchor reads nothing after the concept noun, so no future trailing word can slip through — the structural fix the third reviewer asked for.
- **Exclusions all hold:** `design-doc`/`Design Doc`, `document`/`documentation`, and already-plural `docs`/`Docs`/`docs-*` are left unmatched.
- **Full simulation:** 160 → 157 after rewording the three Requirement-8 occurrences → **0** after the anchored rename. No `design-docs`/`Design Docs` corruption was introduced; no `docss` over-pluralization. The four `design-doc-*` agent files and both `2 - design-doc.md` files are byte-for-byte unchanged except `agents/design-doc-reviewer.md`, whose only change is the prescribed "the doc" → "the design doc" disambiguation (which the lookbehind then protects). `design-doc` token count unchanged.

Requirement/test agreement is also good: Requirement 4 and AC name the Mermaid edge `commits docs updates`; Requirement 5 names `docs tests`/`docs gates`/`docs diff`/`docs surfaces`/`docs-phase`; Requirement 7 and AC name `docs-phase`; the positive presence check and the match-not-line caveat are present and correct.

---

## Blocking finding — AC#5 makes a false universal claim, and a fourth generic-`doc` occurrence is unhandled

AC#5's prose justifies why it is safe for the pattern to require a trailing hyphen or space (and thus skip a bare `doc` at end-of-token) with this sentence:

> "A bare `doc` followed by punctuation or end-of-token does not match, which is correct: **every such occurrence in the in-scope trees is a `design-doc` substring, not the concept in short form.**"

That claim is false. Applying the AC#5 pattern's own anchors — `(?<![Dd]esign[- ])`, exclude `docs`/`document` — to bare `doc` tokens (not followed by hyphen/space) over the in-scope trees returns **exactly one** non-`design-doc` occurrence:

```
grep -roiP '(?<![Dd]esign[- ])\b[Dd]oc(?![Ss])(?!ument)\b(?![- ])' skills agents .rp.md website .changeset
# -> agents/doc-writer.md:25
```

`agents/doc-writer.md:25`:
> "- **Why.** … Translate it into the audience's framing — do not paste design-doc prose into **a reader-facing doc**."

The matched token is the final "a reader-facing **doc**." (bare `doc` + period), which is **not** a `design-doc` substring. The spec's "every such occurrence is a `design-doc` substring" is therefore wrong by one counterexample.

### Why this is a defect, not a nitpick

This is the same generic single-document sense that Requirement 8 catalogues and rewords for three other occurrences — and it is not just *like* one of them, it is **eleven lines above it in the same file**:

- `doc-writer.md:14` — "a reference **doc** may only need a glance" → Requirement 8 reclassifies as generic and rewords to "a reference page".
- `doc-writer.md:25` — "a reader-facing **doc**" → not mentioned anywhere in the spec; left as-is.

Both mean *one document being written*; both "would read wrong as 'docs'" (the spec's own justification for rewording the three). The spec's logic for line 14 applies verbatim to line 25 — yet line 14 is disambiguated and line 25 is silently untouched. After the change, `doc-writer.md` would carry "a reference page" (reworded) in one bullet and "a reader-facing doc" (bare singular concept token) eleven lines later. That is exactly the kind of "same thing spelled inconsistently" state the issue exists to eliminate, sitting unaddressed inside an in-scope file.

The test *outcome* is not pass-while-incomplete here (the occurrence is genuinely out of scope, and the pattern correctly skips it), so this is not a re-run of the iterations 1–3 testability gap. But it is a real spec defect on two counts:

1. **A correctness claim in AC#5 is factually false** — and it is an unverified absolute of precisely the kind that produced all three prior rejections. The author re-verified the pattern's match behavior but did not re-verify this sentence.
2. **A fourth generic single-document occurrence is unhandled and inconsistent** with the spec's own treatment of the three it does handle, leaving a visible singular/plural split inside an in-scope file.

### Required fix

Decide line 25's disposition and make the spec consistent and accurate:

- **Recommended:** treat `doc-writer.md:25` "a reader-facing doc" the same way as the three in Requirement 8 — reword so it no longer carries a bare singular concept token (e.g. "a reader-facing page", or recast the clause), and add it to Requirement 8, the Out-of-Scope "generic single-document" carve-out, and the AC#5 disambiguation bullet alongside the existing three. This restores intra-file consistency in `doc-writer.md`.
- **Then correct the false sentence in AC#5.** Either drop the categorical "every such occurrence is a `design-doc` substring" claim, or replace it with an accurate statement (e.g. that the only non-`design-doc` bare-`doc` occurrence is the generic single-document use at `doc-writer.md:25`, which is reworded under Requirement 8 — so after the change no bare singular concept token of any form remains).

After adjusting, re-confirm: the anchored AC#5 pattern still returns 0 after the change; the bare-`doc` skip claim is true (no non-`design-doc` bare-`doc` concept token remains in scope); and `doc-writer.md` reads consistently (no bullet still carrying a bare singular "doc" for a single document while a sibling bullet was reworded).

---

## What is sound (for the record)

Independently verified against the worktree at `75d208c` and accurate:

- **The leading-noun-anchored AC#5 pattern resolves the iterations 1–3 defect class.** It catches every in-scope `doc` form regardless of inflection, case, or trailing word; the simulation goes 160 → 0 with no `design-docs` corruption and no `docss` over-pluralization. The "no future trailing word can slip through" property holds because the pattern never reads what follows the concept noun.
- **All exclusions hold:** `design-doc`/`Design Doc` (via `(?<![Dd]esign[- ])`), `document`/`documentation` (via `(?!ument)`), and already-plural `docs`/`Docs`/`docs-*` (via `(?![Ss])`).
- **The three Requirement-8 borderline occurrences are handled consistently** across Requirements, Out of Scope, and AC#5 — ruled out and reworded (not mechanically pluralized). The reworded `design-doc-reviewer.md` line is then correctly protected by the lookbehind (adds a "design doc" reference, removes none).
- **design-doc protection is real and intact** — the four `design-doc-*` agent files and both `2 - design-doc.md` files are unchanged except the one prescribed disambiguation in `design-doc-reviewer.md`.
- **Requirement/test agreement** is correct for the Mermaid edge (`commits docs updates`), the six iteration-3 prose forms, and the changeset `docs-phase` token.
- **Requirements 1–4, 6, 7, 8** rest on facts verified across prior iterations and unchanged here; the **positive presence check** and the **match-not-line caveat** are present and correct; the **naming rule** (leading noun → `docs`, suffix preserved) is stated correctly and consistently.

Once `doc-writer.md:25` is dispositioned (recommend rewording, parallel to Requirement 8) and the false "every such occurrence is a `design-doc` substring" claim in AC#5 is corrected, the spec is approvable.
