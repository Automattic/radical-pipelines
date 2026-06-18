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

### Q3 — Lockstep anchor relaxation (the core decision) → relax both, in lockstep

**Question.** Ground the *reasoning*, not just the counts: why both oracle and substitution
must drop the trailing anchor together (the mirror invariant); why the manual-one-off-edit
alternative is rejected; and the no-over-reach safety proof.

**A (researcher; all experiments run + restored, worktree clean).**

**Why both must relax — the mirror invariant, with the mechanical why.** The backtick token
on `passing.md:16` is `` for the scoped gates of `doc` agents ``. `od -c` of the span shows
the char immediately after the bare `doc` is a **backtick** (octal 0140), not `-` or space.
- *Substitution side:* the trailing lookahead `(?=[- ])` requires the next char to be `-`
  or space; a backtick is neither → lookahead fails → the anchored substitution skips the
  token → `` `doc` `` survives singular.
- *Oracle side (symmetric):* the base **anchored** oracle ends `\b[- ]`, which likewise
  requires a following `-`/space → it also cannot see `` `doc` ``. Proven pre-fix over the
  full Option-B scope: anchored oracle = **9**, relaxed oracle = **10**; the anchored
  oracle undercounts by exactly the backtick.
- *The killer asymmetry — false certification (demonstrated):* apply the **anchored**
  substitution, then run the **anchored** oracle → it reads **0** ("clean"), while the
  relaxed oracle reads **1** and points at the surviving `` `doc` `` on L16. An anchored
  oracle would **falsely certify** a tree that still carries the straggler — it is
  structurally blind to the exact token the anchored substitution cannot fix. That is why
  oracle and substitution must drop the anchor **together** to stay mirror images.

**Rejected alternative — manual one-off backtick edit, keep both patterns anchored.**
- *(a) Breaks the mirror.* With both anchored and the backtick hand-edited, the anchored
  oracle reads 0 — but produced by a non-mechanism edit, not by the substitution. The
  oracle no longer proves "the substitution reached every concept token"; it would read 0
  even where the mechanism missed a token, as long as a human happened to patch it. The
  base design's equivalence (oracle ≡ substitution-minus-capture, so passing the oracle ≡
  the mechanism reached every token) is voided.
- *(b) Reintroduces per-form enumeration fragility* — a manual carve-out is exactly the
  "list of literal find-replace pairs per form" the base design explicitly rejected. Each
  future punctuation-bounded form would need its own hand edit; relaxing catches the whole
  class by construction.
- *Not hand-waving a class:* enumerating all 10 relaxed-oracle hits by following char, 9
  are `doc-`/`doc ` (anchor-satisfying) and exactly 1 is `` doc` ``. The filter `(?![- ])`
  (relaxed hits whose next char is not `-`/space) returns exactly that single hit
  scope-wide. **One and only one** punctuation-bounded bare concept token exists in the
  whole tree.

**No over-reach — the safety proof.**
- Relaxed vs anchored oracle over full scope differ by **exactly 1** (10 vs 9), and that 1
  is the backtick. Dropping the anchor adds zero matches anywhere else.
- Scope-wide protected-class census, pre-fix → post-fix (relaxed substitution applied, then
  restored): `design-doc`/`Design Doc` **247 → 247** (unchanged); `document(ation)`
  **132 → 132** (unchanged); plural `docs`/`Docs` **248 → 258** (+10 = exactly the 10
  newly-pluralized tokens); oracle post = 0. The +10 equals the +10 fixed tokens; the two
  singular-protected classes are byte-for-byte invariant.
- Conclusion: the **lookbehind + two lookaheads** do all the protecting; the trailing
  `[- ]` anchor **never protected anything** — it only narrowed which concept forms were
  counted (excluding the punctuation-bounded backtick). Safe to drop in both.

**Design decision (the review's central Key Decision).** Relax the trailing anchor in the
acceptance oracle (`[- ]` removed) and the substitution (`(?=[- ])` removed) **in
lockstep**, keeping them mirror images. Rationale: preserve the mirror invariant (passing
the oracle proves the mechanism reached every token); the anchor was a counting-narrowing
artifact, not a protection; exactly one punctuation-bounded token exists today and the whole
class is caught by construction, not by enumeration. The anchored + hand-edit path is the
cautionary Failure Mode (false certification + enumeration fragility).

### Q4 — The acceptance/verification suite → Option B oracle + invariants + existence; drop 6-path

**Question.** Lock the exact, runnable acceptance suite (each check with its expected
number, verified post-fix); decide whether to also keep the base run's 6-path-scoped oracle.

**A (researcher; suite applied in place then restored — worktree clean).**

The suite, verified to pass on the post-fix tree:

**Check 1 — Acceptance oracle (Option B): 10 → 0.**
```
git ls-files | grep -vE '^\.pipelines/' | grep -vE '^(CHANGELOG\.md|pr-description\.md)$' \
  | while IFS= read -r f; do grep -oiP '(?<![Dd]esign[- ])\b[Dd]oc(?![Ss])(?!ument)\b' "$f"; done | wc -l
```
Before = 10, after = **0**.

**Check 2 — `pr-description.md` exclusion is load-bearing → 2.** Same oracle dropping only
the `pr-description.md` exclusion (excl `.pipelines/` + `CHANGELOG.md`), run after the fix:
```
git ls-files | grep -vE '^\.pipelines/' | grep -vE '^(CHANGELOG\.md)$' \
  | while IFS= read -r f; do grep -oiP '(?<![Dd]esign[- ])\b[Dd]oc(?![Ss])(?!ument)\b' "$f"; done | wc -l
```
After = **2** (the two frozen `doc-run`/`doc plan` in `pr-description.md`) — confirms they
are intentionally left and the exclusion, not a fix, accounts for them.

**Check 3 — Corruption invariants → 0 / 0** (over the Option-B file set, after the fix):
```
... | while IFS= read -r f; do grep -oiP 'docss' "$f"; done | wc -l            # 0
... | while IFS= read -r f; do grep -oiP '[Dd]esign[- ]docs' "$f"; done | wc -l # 0
```
`docss` = **0**, `design-docs` = **0**.

**Check 4 — Positive existence (not satisfied by deletion).** Already satisfied post-merge;
kept as a full regression guard:
```
for n in docs-plan-writer docs-plan-reviewer docs-writer docs-reviewer; do
  test -f "agents/$n.md" && grep -qE "^name: $n\$" "agents/$n.md" && echo "$n OK"; done
```
All four → OK.

**Check 5 — In-scope eyeball (aid, not a gate).** Post-fix `doc`/`code` lines in the 2
files: all 8 distinct concept forms plural (`docs-writer`, `docs-reviewer`, `docs-run`,
`docs plan`, `docs-plan.md`, `docs-plan-writer`, `docs-plan-reviewer`, `` `docs` ``); every
`code-*` line byte-identical (`guardrails.md` keeps `code-writer-tdd/e2e`, `code-reviewer`,
`code-run gates by the code plan`, `code-plan.md`; `passing.md` keeps its three `code-*`
agents and L15's `` `code` `` line).

**Drop the 6-path oracle — Option B strictly dominates (proven by file-set comparison).**
- 6-path scope (`skills agents .rp.md website .changeset README.md`) = 59 tracked files.
- Option B scope (all-tracked excl. the 3) = 78 tracked files.
- `comm -23 sixpath optb` = **empty** → every one of the 59 6-path files is also in Option
  B's set; Option B is a strict file superset using the identical pattern.
- The 19 extra files Option B covers (`.claude-plugin/{plugin,marketplace}.json`,
  `.github/**`, `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `scripts/**`, `package.json`,
  …) are exactly the kind of off-list area whose blind spot originally masked README:112 in
  the base run.

**Design decision.** The acceptance suite is **Checks 1–4** as gates (Option B oracle 10→0;
the load-bearing exclusion assertion → 2; the two corruption invariants → 0/0; positive
existence of the four `docs-*` agents), with Check 5 as a human eyeball aid. **Drop the base
run's 6-path oracle**: it adds zero coverage and re-bakes the file-list blind spot — Option
B, anchored on the same leading concept noun, certifies the whole tracked tree instead.

---

## Conclusions — the design (settled, fully grounded)

1. **Scope.** Two trunk-added skill reference files only —
   `skills/radical-pipelines/reference/guardrails.md` (5 tokens) and
   `skills/radical-pipelines/reference/conventions/passing.md` (5 tokens, incl. the backtick
   `` `doc` `` on L16) — 10 stragglers, all `doc` → `docs`. Complete and minimal (Q1).

2. **Mechanism.** A single anchor-**relaxed** substitution
   (`PAT='(?<![Dd]esign[- ])\b([Dd]oc)(?![Ss])(?!ument)\b'`, replacement `${1}s`) applied to
   the 2 named files via a plain loop — no `find -print0` (no spaces in the paths), no
   manual rewords (no single-document "doc" in these files), no `git mv` renames (the four
   `docs-*` agents already exist). Pattern stated once in a variable (FORM A) so the
   oracle↔substitution mirror is visually explicit; `\${1}s` escaping required, with the
   unescaped-`$1` corruption recorded as a failure mode (Q2).

3. **Central decision — lockstep anchor relaxation.** The oracle drops its trailing `[- ]`
   and the substitution drops its trailing `(?=[- ])` **together**, keeping them mirror
   images. The anchor was a counting-narrowing artifact, never a protection (the lookbehind
   + two lookaheads protect; census `design-doc` 247→247, `document` 132→132, `docs`
   248→258 = +10). Exactly one punctuation-bounded concept token exists (the backtick), and
   the whole class is caught by construction. The anchored + hand-edit alternative is
   rejected (false certification + enumeration fragility) (Q3).

4. **Acceptance suite.** Gates: Option B oracle 10→0; load-bearing exclusion → 2; corruption
   invariants `docss`/`design-docs` → 0/0; positive existence of the four `docs-*` agents.
   The base run's 6-path oracle is dropped (Option B strictly dominates it) (Q4).

5. **Out of scope (carried from spec + base intent).** `pr-description.md` (frozen #122 PR
   body, named in the oracle exclusion); `.pipelines/**` and `CHANGELOG.md` (historical
   records); the phase-2 `design-doc` concept, the word `document(ation)`, and already-plural
   `docs` (all protected by the pattern). Everything else in the post-merge tree is already
   correctly plural.