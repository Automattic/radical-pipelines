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

**Completeness, beyond the oracle (researcher's extra grounding).** Three independent
checks confirm nothing concept-shaped hides outside the 2 files:
- *Superset sweep* (Option B pattern minus its trailing `\b`, a strict superset that would
  also catch compound forms like `doc-plan`, `doc tasks`, `doc-phase`, `doc-writers`)
  returns only the 5+5 plus three false positives — `website/index.html` `<!doctype html>`
  and two `website/assets/*.svg` `sodipodi:docname="…"`. Each continues with a letter, so
  the real oracle's trailing `\b` rejects all three (Option B oracle = 0 on those files,
  verified). They are not concept tokens.
- *No-protections census* (bare `doc`, guards removed) floods with `design-doc-*` files
  (e.g. `design-doc-analyst.md`=26), all `doc` inside `design-doc`, correctly excluded by
  the lookbehind — confirming nothing concept-shaped hides behind the protections.
- *Merge provenance* ties the scope to the merge: both in-scope files were authored on
  trunk independently of the base run (`guardrails.md` from `8ae67f0`, even with a later
  `91be728 Fix doc-plan.md typo` writing singular; `passing.md` from `05869fd`). Every
  other concept surface predates the merge and already carries the base run's `docs`
  renames (which survived). That is precisely why these two — and only these two — carry
  stragglers the base run never saw.

### Q2 — Substitution recipe and file iteration → one relaxed substitution, plain 2-file loop

**Question.** Does the review still need the base run's `find … -print0` null-safe
iteration? Verify the exact relaxed recipe end-to-end on the real tree (then restore).
Settle the shell-quoting (escaped `\${1}s` vs single-quoted form).

**A (researcher; applied in place then restored to HEAD — worktree left clean, oracle back
to 10).**

**Drop `find -print0`.** Neither in-scope path contains a space or odd char (both are plain
`[A-Za-z0-9/._-]`). The base's null-safe machinery existed solely for the two phase files
whose *paths* contain literal `" - "` (`autonomous-phases/3 - plan.md`, etc.), which are
not in scope here. With a fixed 2-file list and no spaces, a plain loop suffices.

**End-to-end dry run (relaxed `PAT`, replacement `${1}s`, applied to the 2 files):**
- BEFORE: Option B oracle (full scope) = 10. AFTER: Option B oracle = **0**.
- Corruption over full Option B scope: `docss` = **0**, `design-docs` = **0**.
- Byte-exact word-diff (5 insertions / 5 deletions across the 2 files): every change is
  `doc`→`docs`; every `code-*` token byte-identical. Specifically — `guardrails.md` L20
  `docs-writer, docs-reviewer`; L28 `docs-run`/`docs plan` (the `code-run`/`code plan` on
  the same line untouched); L32 `docs-plan.md` (`code-plan.md` untouched). `passing.md` L11
  the two `docs-*` agents (the three `code-*` agents on the line untouched); L16
  `docs-plan-writer`/`docs-plan-reviewer` AND the backtick `` `doc` ``→`` `docs` `` (now
  parallel to L15's byte-identical `` `code` `` agents). Zero `code`→`codes`.

**Shell-quoting (both forms verified byte-identical on copies):**
- *FORM A* — pattern in a variable, double-quoted perl program:
  `perl -i -pe "s/$PAT/\${1}s/g" "$f"`. The replacement **must** be `\${1}s` (escaped) so
  the shell leaves `$1` for perl. With an **unescaped** `${1}`, the shell expands `$1` to
  empty → program becomes `s/.../s/g` → corruption (`` `doc-plan-writer` ``→
  `` `s-plan-writer` ``). This is the exact hazard the base design flagged.
- *FORM B* — single-quoted program, pattern inlined:
  `perl -i -pe 's/(?<![Dd]esign[- ])\b([Dd]oc)(?![Ss])(?!ument)\b/${1}s/g' "$f"`. No shell
  escaping needed at all; result byte-identical to FORM A.

**Design decision.** Mechanism = **one relaxed substitution** over the **2 named files**
via a plain loop (no null-safety). Use **FORM A** (pattern in a variable named once,
double-quoted program with `\${1}s`): it makes the oracle↔substitution **mirror** visually
explicit — the identical `PAT` string appears in both the substitution and the acceptance
oracle, which is the base design's load-bearing invariant — at the cost of the documented
escaping footgun, which the design records as a failure mode (unescaped `$1` → corruption).
The base run's step 1 (rewords) and step 3 (`git mv` renames) are **both dropped**: no
single-document "doc" exists in these 2 files (no rewords), and the four `docs-*` agents
already exist post-merge (no renames). Ordering is therefore trivial — the substitution is
the only step.

The concrete recipe:

```
PAT='(?<![Dd]esign[- ])\b([Dd]oc)(?![Ss])(?!ument)\b'
for f in skills/radical-pipelines/reference/guardrails.md \
         skills/radical-pipelines/reference/conventions/passing.md; do
  perl -i -pe "s/$PAT/\${1}s/g" "$f"
done
```

It is the base pattern with the trailing `(?=[- ])` removed (the lockstep relaxation of
Q3), with a capture/replacement bolted on — i.e. the acceptance oracle's pattern plus
`${1}s`.
