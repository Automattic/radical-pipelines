# Design-doc review — review-1: reconcile docs-naming with the merged trunk — APPROVED

Verdict: **APPROVED**.

The design at `2-design-doc/design-doc.md` is complete, sound, and aligned with the spec
(`1-spec/spec.md`) and the design Q&A record (`2-design-doc/design-doc-research.md`). I
independently verified every load-bearing claim against the actual post-merge worktree
(HEAD `928a0b3`, branch `worktree-134-unify-docs-naming`); I did not take the design's
numbers on trust. All experiments were run on copies or applied in place and then reverted;
the worktree was left clean (oracle back to 10).

## Independent verification (all reproduced)

1. **Option-B oracle = 10.** Over all git-tracked files except `.pipelines/`,
   `CHANGELOG.md`, `pr-description.md`, the relaxed leading-noun match-counting search
   returns **10**, in **exactly the 2 in-scope files** (5 in
   `skills/radical-pipelines/reference/guardrails.md`, 5 in
   `skills/radical-pipelines/reference/conventions/passing.md`); no other in-scope file
   contributes. Matches the design (L199–208) and spec.

2. **Anchor-relaxed substitution → oracle 0, no corruption.** Applying the design's exact
   relaxed recipe (`PAT='(?<![Dd]esign[- ])\b([Dd]oc)(?![Ss])(?!ument)\b'`, replacement
   `${1}s`) to the 2 files: full-tree Option-B oracle → **0**; `docss` → **0**;
   `design-docs` → **0**. The byte-exact word-diff shows exactly the 10 `doc`→`docs`
   changes; every `code-*` form (`code-writer-tdd`, `code-writer-e2e`, `code-reviewer`,
   `code-run`, `code plan`, `code-plan.md`, the three `passing.md:11` agents, and L15's
   `` `code` ``) is byte-identical. Tree restored; oracle back to **10**. Matches the
   design (Checks 1, 3) and spec.

3. **`{.pipelines/, CHANGELOG.md, pr-description.md}` exclusion is load-bearing.** Dropping
   only the `pr-description.md` exclusion: **12** pre-fix / **2** post-fix; the delta of 2
   comes solely from `pr-description.md` (the frozen `doc-run`/`doc plan`). Confirms the
   exclusion — not a fix — accounts for those two, and that the primary gate lands on 10→0.
   Matches the design (L214–225, Check 2) and spec.

4. **Lockstep-anchor argument / false certification.** `od -c` confirms the char after the
   bare `doc` in `` for the scoped gates of `doc` agents `` (`passing.md:16`) is a backtick
   (octal 0140), not `-`/space. The base **anchored** oracle counts **9**, the **relaxed**
   oracle counts **10** — the gap is exactly that backtick. Demonstrated the killer
   asymmetry on copies: after the **anchored** substitution, the **anchored** oracle reads
   **0** ("clean") while the **relaxed** oracle reads **1** and the backtick `` `doc` ``
   survives singular on L16 — an anchored oracle would **falsely certify** a tree that still
   carries the straggler. This is the design's central decision (L119–154, Q3); it is
   correct.

5. **Four `docs-*` agents exist** with matching `name:` frontmatter:
   `agents/docs-plan-writer.md`, `agents/docs-plan-reviewer.md`, `agents/docs-writer.md`,
   `agents/docs-reviewer.md` — all OK (Check 4).

6. **No-over-reach census reproduced.** Scope-wide protected-class baseline matches the
   design's pre-fix numbers exactly: `design-doc`/`Design Doc` = **247**,
   `document(ation)` = **132**, plural `docs`/`Docs` = **248**. The in-place fix changed the
   oracle 10→0 with zero corruption, so the only delta is the +10 newly-pluralized tokens
   (`docs` 248→258); the two singular-protected classes are invariant. Both target files
   contain **zero** `design-doc` and **zero** `document(ation)` tokens, confirming the
   substitution is fully surgical there.

## Assessment

- **Completeness.** All four spec requirements and all five spec acceptance criteria are
  addressed with runnable, verified checks. The 10 tokens are enumerated by file and line,
  matching the actual files. Out-of-scope items, failure mode (unescaped `$1`), and the
  rejected alternative (manual one-off edit) are all documented.
- **Soundness.** The mirror invariant (oracle pattern ≡ substitution pattern minus capture)
  is preserved by the lockstep relaxation and verified character-for-character. The central
  decision is justified by the demonstrated false-certification asymmetry, not by counts
  alone. Dropping `find -print0`, the rewords, the `git mv` renames, and the 6-path oracle
  are each justified (no spaced paths in scope; no single-document use in the 2 files; the
  four agents already exist; Option B is a strict file superset of the 6-path set).
- **Alignment.** The design faithfully follows the spec and the Q&A record; numbers and
  reasoning are consistent across all three documents and reproduce against the tree.

No rejectable defects found.
