# Design doc: Reconcile docs-naming with the merged trunk

## Summary

This is a REVIEW run of the `134-unify-docs-naming` pipeline. The base run unified the
documentation-phase concept on the plural form `docs` across the skill and agent
definitions and opened a PR. The owner then merged trunk (104 commits) into the pipeline
branch. Trunk added two new skill reference files the base run never saw —
`skills/radical-pipelines/reference/guardrails.md` and
`skills/radical-pipelines/reference/conventions/passing.md` — and they spell the
documentation-phase concept in the singular. The base run's `docs-*` renames survived the
merge intact; these two files are the only surviving stragglers.

The change is small and surgical: pluralize the **10** remaining singular
documentation-phase concept tokens in those 2 files, all `doc` → `docs`. It also
deliberately strengthens the verification mechanism (an anchor-relaxed oracle paired with a
matching substitution) so the same class of trunk-introduced straggler — punctuation-bounded
forms and files outside the base run's hardcoded path list — is caught next time.

The documentation-phase concept is the pipeline's phase-5 documentation work and the phase-3
plan that feeds it: the agents `docs-plan-writer`, `docs-plan-reviewer`, `docs-writer`,
`docs-reviewer`, the artifact `docs-plan.md`, and every prose/label/phrase form that leads
with that concept noun. It is distinct from the phase-2 `design-doc` concept (where "doc"
means a single design *document*) and from the English word `documentation`; both stay
singular by design.

## The 10 in-scope tokens

All 10 are genuine documentation-phase concept references — none is a generic single-document
use, none is a `design-doc` form, none is the word `document(ation)`. No rewording is needed,
only pluralization (`doc` → `docs`, the rest of each token preserved exactly).

**`skills/radical-pipelines/reference/guardrails.md` (5):**
- L20 agent roster: `doc-writer, doc-reviewer` → `docs-writer, docs-reviewer`
- L28 phrase `doc-run gates by the doc plan` → `docs-run gates by the docs plan`
  (2 tokens — the compound `doc-run` and the spaced phrase `doc plan`)
- L32 artifact `doc-plan.md` → `docs-plan.md`

**`skills/radical-pipelines/reference/conventions/passing.md` (5):**
- L11 agent roster: `` `doc-writer` ``, `` `doc-reviewer` `` → `` `docs-writer` ``,
  `` `docs-reviewer` ``
- L16 planning agents `` `doc-plan-writer` `` and `` `doc-plan-reviewer` `` →
  `` `docs-plan-writer` `` and `` `docs-plan-reviewer` ``
- L16 the backtick-bounded `` `doc` `` (in `` for the scoped gates of `doc` agents ``) →
  `` `docs` ``, making it parallel to the line directly above it on L15
  (`` for the scoped gates of `code` agents ``)

The `code-*` forms on the same lines (e.g. `code-writer-tdd`, `code-writer-e2e`,
`code-reviewer`, `code-run gates by the code plan`, `code-plan.md`, the three `code-*` agents
on `passing.md:11`, and L15's `` `code` `` line) are not concept tokens and stay byte-identical.

## Architecture / approach

The base run established a proven mechanism that this review inherits and minimizes: **a
single substitution whose pattern is exactly the acceptance oracle's pattern plus a
capture/replacement.** Because the two share one pattern, what the change touches provably
equals what the oracle counts — passing the oracle proves the mechanism reached every
in-scope concept token. This "mirror invariant" is the load-bearing design property and the
spine of every decision below.

### The pattern, and what it protects

Both the oracle and the substitution are anchored on the **leading** concept noun `doc`/`Doc`
itself, never reading the trailing word. This is why every compound and phrase form
(`doc-writer`, `doc-run`, `doc plan`, `doc-plan.md`, …) is covered without enumerating them.
The pattern carries one lookbehind and two lookaheads that do all the protecting:

- `(?<![Dd]esign[- ])` — leaves every `design-doc` / `Design Doc` form untouched (the
  phase-2 concept), including the `doc-writer`/`doc-reviewer` substrings inside
  `design-doc-writer`/`design-doc-reviewer`.
- `(?![Ss])` — leaves already-plural `docs` / `Docs` unmatched.
- `(?!ument)` — leaves `document` / `documentation` unmatched.

The `-i` flag (with `[Dd]`) catches capitalized concept forms.

The substitution adds a capture group and a replacement:

```
PAT='(?<![Dd]esign[- ])\b([Dd]oc)(?![Ss])(?!ument)\b'   # oracle pattern + capture
replacement = ${1}s                                      # re-emit the matched case, append s
```

The oracle is the identical pattern with the capture parens dropped, used for counting:

```
(?<![Dd]esign[- ])\b[Dd]oc(?![Ss])(?!ument)\b
```

### Mechanism: one substitution over the 2 named files

The mechanism collapses to a single step. Concretely:

```sh
PAT='(?<![Dd]esign[- ])\b([Dd]oc)(?![Ss])(?!ument)\b'
for f in skills/radical-pipelines/reference/guardrails.md \
         skills/radical-pipelines/reference/conventions/passing.md; do
  perl -i -pe "s/$PAT/\${1}s/g" "$f"
done
```

Three deliberate properties of this recipe:

1. **`perl -i -pe`, not `sed`.** The lookbehind/lookaheads need Perl-compatible regex, which
   also matches the oracle's `grep -P` dialect — so substitution and verification share one
   engine and the mirror holds character-for-character.

2. **A plain 2-file loop — no `find … -print0`.** The base run's null-safe iteration existed
   only for phase files whose *paths* contain a literal `" - "` (e.g.
   `autonomous-phases/3 - plan.md`), which are not in scope here. Both in-scope paths are
   plain `[A-Za-z0-9/._-]` with no spaces, so a fixed 2-file loop suffices and reads more
   directly.

3. **The pattern is named once in a variable (FORM A: pattern in `$PAT`, double-quoted perl
   program with `\${1}s`).** This makes the oracle↔substitution mirror *visually* explicit —
   the identical `PAT` string appears in both the substitution and the acceptance oracle. The
   alternative (FORM B: a single-quoted inlined program) is byte-identical in result but
   hides the shared pattern, weakening the mirror's legibility.

### Central decision: relax the trailing anchor in lockstep

This is the review's one substantive design decision.

The base run's pattern ended with a trailing anchor: `[- ]` in the oracle and `(?=[- ])` in
the substitution, requiring the character after the bare `doc` to be a hyphen or a space.
**This review removes that trailing anchor from BOTH the oracle and the substitution, in
lockstep.**

**Why it is required.** The backtick token on `passing.md:16` is
`` for the scoped gates of `doc` agents ``. The character immediately after the bare `doc`
is a **backtick** (octal 0140), not `-` or space.

- *Substitution side:* with `(?=[- ])` in place the lookahead fails on the backtick, so the
  anchored substitution skips the token and `` `doc` `` survives singular. Dry-run confirmed:
  anchored substitution leaves `` for the scoped gates of `doc` agents ``; relaxed
  substitution produces `` for the scoped gates of `docs` agents `` (now parallel to L15).
- *Oracle side (symmetric):* the anchored oracle ends `\b[- ]`, which likewise cannot see
  `` `doc` ``. Over the full in-scope file set the anchored oracle counts **9** and the
  relaxed oracle counts **10**; the difference is exactly the backtick.

**The killer asymmetry — false certification.** If only the substitution were relaxed (or
only the oracle), the two would no longer mirror. Worse, an *anchored* oracle run after an
*anchored* substitution reads **0** ("clean") while the relaxed oracle reads **1** and points
at the surviving `` `doc` `` — i.e. an anchored oracle would **falsely certify** a tree that
still carries the straggler, because it is structurally blind to the exact token the anchored
substitution cannot fix. Oracle and substitution must therefore drop the anchor *together* to
remain mirror images and keep "oracle passes ⇒ mechanism reached every token" true.

**Safety — the anchor never protected anything.** Dropping it adds exactly one match
scope-wide (the backtick) and zero elsewhere. A scope-wide protected-class census before vs.
after the relaxed substitution confirms it: `design-doc`/`Design Doc` **247 → 247**,
`document(ation)` **132 → 132**, plural `docs`/`Docs` **248 → 258** (+10 = exactly the 10
newly-pluralized tokens). The lookbehind + two lookaheads do all the protecting; the trailing
anchor only narrowed *which* concept forms were counted (excluding the punctuation-bounded
backtick). It is safe to drop in both.

### Rejected alternative: manual one-off edit, keep both anchored

Hand-editing the single backtick `` `doc` `` and leaving both patterns anchored was
considered and rejected:

- **It breaks the mirror.** The anchored oracle would read 0 — but produced by a non-mechanism
  edit, not by the substitution. The oracle would then read 0 even where the mechanism missed
  a token, as long as a human happened to patch it. The "oracle ≡ substitution-minus-capture"
  equivalence is voided, and with it the proof that the mechanism reached every concept token.
- **It reintroduces per-form enumeration fragility.** A manual carve-out is exactly the
  "list of literal find-replace pairs per form" the base design rejected. Each future
  punctuation-bounded form would need its own hand edit; relaxing the anchor catches the whole
  class by construction. (Today exactly one such token exists: filtering the relaxed-oracle
  hits to those whose next char is not `-`/space returns exactly the one backtick, scope-wide.)

### Dropped from the base mechanism

The base run had two extra steps this review does **not** need:

- **No single-document rewords.** The base run reworded four genuine single-*document* "doc"
  uses. Neither in-scope file contains a single-document "doc"; all 10 tokens are concept
  references, so no rewording is required.
- **No `git mv` renames.** The base run renamed four agent files via `git mv`. Those four
  `docs-*` agent files already exist post-merge (their renames survived), so no renames are
  needed. (See acceptance check 4.)

Because the substitution is the only step, ordering is trivial.

### Failure mode: unescaped `$1`

FORM A requires the replacement to be written `\${1}s` so the shell passes a literal `$1` to
perl. With an **unescaped** `${1}`, the shell expands `$1` to empty before perl ever sees it,
so the program becomes `s/$PAT/s/g` and the captured concept noun is dropped — corrupting,
e.g., `` `doc-plan-writer` `` into `` `s-plan-writer` `` (reproduced on a copy). This is a
real, easy-to-hit hazard and is recorded here as the mechanism's documented failure mode. FORM
B (single-quoted, inlined) avoids the escaping entirely but trades away the visible mirror.

## Verification / acceptance approach

The acceptance suite is **Checks 1–4 as gates**, with Check 5 as a human eyeball aid. All
counts below were verified by applying the relaxed substitution to copies of the 2 files and
running the suite; the worktree itself was left untouched (oracle back to 10).

**Check 1 — Acceptance oracle (Option B): 10 → 0.** Over all git-tracked files except
`.pipelines/`, `CHANGELOG.md`, and `pr-description.md`, count *matches* (not lines — one line
can carry both an in-scope and a protected token):

```sh
git ls-files | grep -vE '^\.pipelines/' | grep -vE '^(CHANGELOG\.md|pr-description\.md)$' \
  | while IFS= read -r f; do grep -oiP '(?<![Dd]esign[- ])\b[Dd]oc(?![Ss])(?!ument)\b' "$f"; done | wc -l
```

Before = 10 (5 in `guardrails.md`, 5 in `passing.md` — verified per-file). After = **0**.

This Option-B oracle is the spec's primary gate. It is the base run's pattern with the
trailing `[- ]` anchor removed (the lockstep relaxation above), anchored on the leading
concept noun and run over the **whole** tracked tree minus three exclusions.

**Check 2 — the `pr-description.md` exclusion is load-bearing → 2.** The same oracle dropping
*only* the `pr-description.md` exclusion (so excluding `.pipelines/` + `CHANGELOG.md` only):

```sh
git ls-files | grep -vE '^\.pipelines/' | grep -vE '^(CHANGELOG\.md)$' \
  | while IFS= read -r f; do grep -oiP '(?<![Dd]esign[- ])\b[Dd]oc(?![Ss])(?!ument)\b' "$f"; done | wc -l
```

After the fix = **2** — the two frozen `doc-run` / `doc plan` stragglers inside
`pr-description.md`. This confirms those two are *intentionally* left, and that the
*exclusion* (not a fix) accounts for them. Without the exclusion the oracle would read 12, not
10; the exclusion is what makes the primary gate land on 10→0.

**Check 3 — corruption invariants → 0 / 0.** Over the same Option-B file set, after the fix,
no `docss` and no `design-docs`:

```sh
... | while IFS= read -r f; do grep -oiP 'docss' "$f"; done | wc -l            # 0
... | while IFS= read -r f; do grep -oiP '[Dd]esign[- ]docs' "$f"; done | wc -l # 0
```

`docss` guards against over-pluralization; `design-docs` guards against the substitution
wrongly reaching a phase-2 form. Both = **0**.

**Check 4 — positive existence (an absence check is not satisfied by deletion).** Already
satisfied post-merge; kept as a regression guard so the four base-run agents cannot be
silently lost:

```sh
for n in docs-plan-writer docs-plan-reviewer docs-writer docs-reviewer; do
  test -f "agents/$n.md" && grep -qE "^name: $n\$" "agents/$n.md" && echo "$n OK"; done
```

All four files exist with matching `name:` frontmatter → OK.

**Check 5 — in-scope eyeball (aid, not a gate).** After the fix, inspect the `doc`/`code`
lines in the 2 files: all 8 distinct concept forms are plural (`docs-writer`, `docs-reviewer`,
`docs-run`, `docs plan`, `docs-plan.md`, `docs-plan-writer`, `docs-plan-reviewer`,
`` `docs` ``) and every `code-*` line is byte-identical.

### Why the base run's 6-path oracle is dropped

The base run scoped its oracle to 6 hardcoded path roots
(`skills agents .rp.md website .changeset README.md`) = 59 tracked files. Option B (all-tracked
minus the 3 exclusions) = 78 tracked files. A `comm -23` of the two file lists is **empty** —
every one of the 59 six-path files is also in Option B's set, using the identical pattern, so
Option B is a strict file *superset*. The 19 extra files Option B covers
(`.claude-plugin/*.json`, `.github/**`, `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`,
`scripts/**`, `package.json`, …) are exactly the kind of off-list area whose blind spot
originally masked a README straggler in the base run. The 6-path oracle adds zero coverage and
re-bakes that file-list blind spot, so it is dropped in favor of Option B alone.

## Out of scope

- **`pr-description.md`** — a frozen PR body for issue #122 (a different feature), created by a
  single manual owner commit and never updated. The skill never templates or writes it; it is
  read in exactly one place (`setup.md`, the fork-mode lifecycle) and is regenerated fresh per
  PR — this pipeline will itself overwrite it with the body for *this* PR. Rewriting the #122
  content would edit a record of an already-shipped, different feature. Its 2 singular concept
  stragglers (`doc-run` / `doc plan`) are therefore left, and `pr-description.md` is named in
  the oracle's exclusion list (load-bearing — see Check 2).
- **`.pipelines/**` and the published `CHANGELOG.md`** — frozen historical records of past runs
  and releases; they keep whatever names they shipped with. Excluded from the oracle.
- **The phase-2 `design-doc` concept** — singular by design ("doc" = a single design
  *document*), including the `doc-writer`/`doc-reviewer` substrings inside
  `design-doc-writer`/`design-doc-reviewer`. Protected by the `(?<![Dd]esign[- ])` lookbehind.
- **The English word `document` / `documentation`** — coexists with the `docs` identifier by
  design; not a singular-vs-plural defect. Protected by the `(?!ument)` lookahead.
- **Already-plural `docs` / `Docs`** — protected by the `(?![Ss])` lookahead.
- **Everything else in the post-merge tree** — already correct. The base run's renames survived
  the merge: the four `docs-*` agent files and frontmatter, the `.rp.md` Agent models table,
  the `README.md` agent roster (including the new `code-writer-tdd` / `code-writer-e2e`),
  `setup.md` (`docs-plan.md`), the phase-3 completion predicate, and the phase-5 references are
  all already plural. The new split agents `code-writer-tdd` / `code-writer-e2e` carry zero
  concept stragglers. The empty `.changeset/unify-docs-naming.md` is an intentional base-run
  stub. None of these is touched.
