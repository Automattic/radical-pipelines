# Spec review — APPROVED

Review of `1-spec/spec.md` for review-1 (reconcile docs-naming with the merged trunk),
judged against the review intent (`0-intent/intent.md`), the Q&A record
(`1-spec/spec-research.md`), and — independently — the actual post-merge worktree state.

## Verdict

**APPROVED.** The spec is correct, testable, and surgically scoped. Every factual claim,
count, and load-bearing technical assertion was independently re-verified against the
worktree; none was taken on trust. All checks reproduced the spec's stated values exactly.

## What I verified (not taken on trust)

**Acceptance oracle (the core check).** Re-ran the spec's Option B oracle from the
worktree root:
- Excluding `.pipelines/`, `CHANGELOG.md`, `pr-description.md` → **10** (matches spec).
- Without the `pr-description.md` exclusion → **12** (matches spec; confirms the exclusion
  is genuinely load-bearing, exactly the +2 frozen `pr-description.md` stragglers).

**Per-file / per-line straggler inventory.** Counting matches with line numbers:
- `skills/radical-pipelines/reference/guardrails.md` — 5 (L20×2 `doc-writer, doc-reviewer`;
  L28×2 `doc-run` + `doc plan`; L32 `doc-plan.md`).
- `skills/radical-pipelines/reference/conventions/passing.md` — 5 (L11×2 `doc-writer,
  doc-reviewer`; L16×3 `doc-plan-writer`, `doc-plan-reviewer`, and the backtick `` `doc` ``).
- `pr-description.md` — 2 (L10 `doc-run` + `doc plan`).

Matches the spec's Requirement 1 breakdown to the token.

**The anchor is genuinely load-bearing (Requirement 2).** The base pattern with the
trailing `[- ]` anchor returns **4** on `passing.md` (it misses the backtick `` `doc` `` —
the lookahead fails on the trailing backtick); the anchor-relaxed pattern returns **5**.
So dropping the anchor in both oracle and substitution is required to fix that token by
construction, not optional polish. Confirmed.

**End-to-end substitution dry run.** Applied the relaxed perl substitution
(`s/(?<![Dd]esign[- ])\b([Dd]oc)(?![Ss])(?!ument)\b/${1}s/g`) to copies of both in-scope
files:
- relaxed oracle over the patched files → **0**;
- `docss` → 0, `design-docs` → 0, `codes` → 0 (no over-pluralization);
- all 10 tokens correctly become `docs-writer`, `docs-reviewer`, `docs-run gates by the
  docs plan`, `docs-plan.md`, `docs-plan-writer`, `docs-plan-reviewer`, and
  `` for the scoped gates of `docs` agents ``;
- the `code-*` lines are untouched — L15 `` `code` agents `` stays put while L16 becomes
  `` `docs` agents ``, making the two lines parallel exactly as the spec describes.

**No over-reach (Requirement 3).** All 10 in-scope matches are literally the bare lowercase
token `doc` (verified case-sensitively: 10× `doc`, zero capitalized concept forms). The
protections are non-vacuous: in the same scope there are 247 `design-doc`, 132
`document(ation)`, and 248 already-plural `docs` tokens, all correctly skipped by the
oracle (which still returns only 10). Corruption invariants `docss`/`design-docs` are 0
both before and after.

**Positive existence (Requirement 4).** All four base-run agents exist with matching
`name:` frontmatter (`docs-plan-writer`, `docs-plan-reviewer`, `docs-writer`,
`docs-reviewer`); the old singular `doc-*.md` files are absent; the split agents
`code-writer-tdd`/`code-writer-e2e` exist and carry zero concept stragglers.

**Out-of-scope justifications.**
- `pr-description.md`: `git log --follow` shows a single commit `2e88eb7` by `luisherranz`
  (manual owner, not a pipeline agent); the skill references it in exactly one place
  (`setup.md:134`, fork-mode "using `pr-description.md` as the body") and never writes or
  templates it. Frozen #122 record, overwritten per-PR — the exclusion is justified, and
  the oracle delta (12 vs 10) proves it is load-bearing rather than cosmetic.
- `.changeset/unify-docs-naming.md` is a 13-byte empty stub (frontmatter delimiters only) —
  an intentional base-run stub, correctly out of scope.
- `README.md` (L112 roster), `.rp.md` (Agent models table), and `website/demo.js` are all
  already plural for the `docs-*` agents and correctly keep `design-doc-*` singular —
  confirmed already-correct, untouched by this review.

## Assessment against review criteria

- **Faithful to intent.** Sweeps the whole post-merge tree (Option B oracle over all
  tracked files) rather than trusting any hardcoded list — directly answering the intent's
  "sweep the whole post-merge tree rather than assume any list is complete." Standardizes
  the docs-phase concept on plural while protecting `design-doc`, `document(ation)`, and
  historical records, per the inherited constraints.
- **Testable.** The acceptance oracle is a concrete, reproducible command; corruption
  invariants and positive-existence checks are explicit; the `pr-description.md`-exclusion
  load-bearing test is a real differential check.
- **Internally consistent.** Counts in Overview, Requirements, Out of Scope, and
  Acceptance Criteria all agree (10 in-scope, 12 without exclusion, 2 frozen) and all
  reproduce against the worktree.
- **Philosophy-faithful.** Preserves the base design's oracle↔substitution mirror by
  relaxing the trailing anchor in lockstep, rather than special-casing the backtick token —
  avoiding the enumerate-the-special-case fragility the base design rejected.

No defects found. Approved.
