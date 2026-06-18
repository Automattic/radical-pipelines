# Design-doc research — review-1: reconcile docs-naming with the merged trunk

Running Q&A record between `design-doc-analyst` and `design-doc-researcher`. This is a
REVIEW run. The substantive change is small and surgical: pluralize the **10** remaining
singular documentation-phase concept stragglers in the **2 new trunk-added skill
reference files** (`skills/radical-pipelines/reference/guardrails.md` and
`skills/radical-pipelines/reference/conventions/passing.md`), all `doc` → `docs`, plus a
deliberate strengthening of the verification mechanism (Option B oracle + lockstep
substitution) so this class of straggler is caught next time.

## Inherited foundation (base run, proven approach)

The base design (`../base/2-design-doc/design-doc.md`) and code summary
(`../base/4-code/code-summary.md`) establish the proven mechanism this review adapts:

- **A single anchored substitution, mirrored by a counting oracle.** The substitution is
  the oracle pattern plus a capture/replacement, so what the change touches provably
  equals what the oracle counts. Anchored on the leading concept noun `doc`/`Doc`, never
  reading the trailing word, so every compound/phrase form is covered without enumeration.
- **Three protections, evaluated per-match:** `(?<![Dd]esign[- ])` leaves `design-doc`
  forms; `(?![Ss])` leaves already-plural `docs`/`Docs`; `(?!ument)` leaves
  `document(ation)`.
- **`perl -i -pe`, not `sed`** — lookbehind/lookahead need Perl-compatible regex matching
  the oracle's `grep -P` dialect, so substitution and verification share one engine.
- **Positive-existence checks** guard against satisfied-by-deletion; **corruption
  invariants** (`docss`=0, `design-docs`=0) guard against over-/mis-pluralization.

What this review changes vs. the base mechanism: the base run also did four single-document
**rewords** (step 1) and four **`git mv` renames** (step 3). This review needs **neither**
— the spec says no rewording is required (all 10 tokens are genuine concept references),
and the four `docs-*` agents already exist post-merge (no renames). So the review's
mechanism collapses to: one anchored substitution over the 2 in-scope files, plus a
verification suite. The single adaptation to the substitution+oracle pair is **Option B**:
both drop their trailing anchor (`[- ]` in the oracle / `(?=[- ])` in the substitution) in
lockstep, so the backtick `` `doc` `` is reached.

## Analyst pre-verification (grounded, run from worktree root)

Before opening the Q&A I verified the spec's load-bearing numbers and the core technical
finding directly against the post-merge tree:

- **Option B oracle = 10 today** over all-tracked excl. `.pipelines/`/`CHANGELOG.md`/
  `pr-description.md` (5 in `guardrails.md`, 5 in `passing.md`).
- **Without the `pr-description.md` exclusion = 12** (confirms that exclusion is
  load-bearing: the +2 frozen `doc-run`/`doc plan` tokens in `pr-description.md`).
- **The anchor must drop in lockstep.** Dry-run on `passing.md:16`:
  - anchored substitution (`…\b(?=[- ])`) → leaves `` for the scoped gates of `doc`
    agents `` singular (lookahead fails on the trailing backtick) — straggler survives.
  - relaxed substitution (anchor dropped) → `` for the scoped gates of `docs` agents `` —
    fixed, now parallel to line-15's `` `code` ``.
- **Relaxed substitution dry-run over both files** converts all 10 tokens cleanly
  (`docs-writer`, `docs-reviewer`, `docs-run gates by the docs plan`, `docs-plan.md`,
  `docs-plan-writer`, `docs-plan-reviewer`, `` `docs` agents ``); the `code-*` lines are
  untouched (no `code` → `codes`).

These confirm the spec's premises; the Q&A below settles the concrete design points.

---

## Q&A

### Q1 — Exact in-scope file set and oracle completeness → 2 files, complete and minimal

**Question.** Prove the 10 stragglers live *only* in the 2 known files (per-file grouped
count, not just "the 2 known files match"); confirm the +2 (oracle without the
`pr-description.md` exclusion) come *only* from `pr-description.md`; and confirm no other
trunk-added/modified tracked file outside `.pipelines/` carries an oracle-caught concept
token.

**A (researcher, confirmed; analyst re-ran the grouped census independently).**

Per-file Option B oracle (relaxed pattern `(?<![Dd]esign[- ])\b[Dd]oc(?![Ss])(?!ument)\b`)
over all-tracked excl. `.pipelines/`/`CHANGELOG.md`/`pr-description.md`, nonzero files only:

```
5    skills/radical-pipelines/reference/conventions/passing.md
5    skills/radical-pipelines/reference/guardrails.md
```

→ exactly **10**, in **exactly those 2 files**, nothing else in scope contributes. With the
`pr-description.md` exclusion dropped:

```
2    pr-description.md
5    skills/radical-pipelines/reference/conventions/passing.md
5    skills/radical-pipelines/reference/guardrails.md
```

→ **12**; the +2 come **only** from `pr-description.md` (the frozen `doc-run`/`doc plan`).

Researcher cross-checks: base **anchored** pattern over the same Option-B file set → 9 (it
misses the backtick `` `doc` `` on `passing.md:16`, the gap Option B closes). All 10
in-scope matches are the bare token `doc`; the match set contains zero
`design-doc`/`document`/`docs` hits (no over-reach). Both target files contain **zero**
`design-doc` and **zero** `document(ation)` tokens, so there are no protected tokens
adjacent to in-scope ones in these files — the substitution is fully surgical here.

**Design decision.** The in-scope file set is exactly two files —
`skills/radical-pipelines/reference/guardrails.md` and
`skills/radical-pipelines/reference/conventions/passing.md` — and it is **complete and
minimal**: the all-tracked Option B oracle proves no other in-scope file carries a
straggler. The exclusion list is exactly `{.pipelines/, CHANGELOG.md, pr-description.md}`;
nothing else needs excluding.

The 10 tokens (for the Components section):
- `guardrails.md` (5): L20 `doc-writer`, `doc-reviewer`; L28 `doc-run`, `doc plan`; L32
  `doc-plan.md`.
- `passing.md` (5): L11 `doc-writer`, `doc-reviewer`; L16 `doc-plan-writer`,
  `doc-plan-reviewer`, and the backtick `` `doc` `` (→ `` `docs` ``, parallel to L15's
  `` `code` ``).
