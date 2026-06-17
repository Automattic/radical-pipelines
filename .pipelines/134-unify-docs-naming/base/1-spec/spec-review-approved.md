# Spec Review: Unify the documentation concept on plural "docs" — APPROVED

**Verdict:** Approved (re-approval after README scope correction, terminator).
**Spec under review:** `1-spec/spec.md` (committed `41d7cf4`, "Correct spec scope to include README").
**Reviewer:** fresh `spec-reviewer`, phase 1.

## Summary

The spec was previously approved, then phase-2 design discovered that `README.md:112`
(the Pi-package install list enumerating every shipped agent profile) still names the
four documentation-concept agents in their singular form — a surface the earlier spec
wrongly excluded. `spec-writer-6` corrected the scope (commit `41d7cf4`): `README.md`
is now an in-scope tree in Requirement 6, AC#5's verification file list, and the empirical
counts. This re-review verifies the correction is right and the spec remains sound and
internally consistent. It is. Every load-bearing empirical claim was re-verified against
the live worktree; the reword-then-rename was re-simulated on a scratch copy with
`README.md` in the file list.

## What the correction added (verified)

- **Requirement 6** now lists `README.md` among the derived-name surfaces and names the
  four agents at `README.md:112` as `docs-plan-writer`, `docs-plan-reviewer`,
  `docs-writer`, `docs-reviewer`, while explicitly keeping README's already-plural
  mentions — the "Docs" phase label (`README.md:32`) and `docs-summary.md`
  (`README.md:157`).
- **AC#5** adds `README.md` to the in-scope tree list and to the empirical search
  invocation, and updates the catalogued counts to include README's contributions.

## Independent verification (live worktree)

### README is correctly in scope and correctly bounded
- Leading-noun concept matches in `README.md`:
  `grep -nP '(?<![Dd]esign[- ])\b[Dd]oc(?![Ss])(?!ument)\b[- ]' README.md` → exactly **4**,
  all on line 112 (`doc-plan-writer`, `doc-plan-reviewer`, `doc-writer`, `doc-reviewer`).
  Nothing else in README is the concept in leading-noun form. Matches the spec.
- README's already-plural concept mentions correctly stay (pattern leaves them unmatched):
  line 32 `Docs` and line 157's four `docs` (incl. `docs-summary.md`).
- README's `design-doc` occurrences total **6** and all stay untouched: the four
  `design-doc-*` profiles at line 112 plus the "Design doc"/"design doc" phase reference at
  lines 29 and 43. README's two bare-`doc` occurrences (lines 29, 43) are exactly that
  phase reference — out of scope — matching AC#5's prose precisely.
- Bringing README in contradicts no other requirement: it only adds four agent-name tokens
  to Requirement 6's existing derived-copy list and adds `design-doc` references it does not
  touch.

### AC#5 counts and the reword-then-rename simulation (README included)
- Leading-noun **before**, six paths `skills agents .rp.md website .changeset README.md`:
  **164** = 160 across the five non-README paths + 4 README:112 agent-name tokens. Matches spec.
- After the three reworded occurrences the pattern reads → **161**. (The fourth,
  `doc-writer.md`'s "a reader-facing doc", is a bare end-of-token `doc` the pattern never
  matched, so rewording it leaves this count unchanged — the four README tokens are agent
  names the rewords do not touch.) Matches spec.
- After the anchored leading-`doc`→`docs` rename → **0**. Self-completing: zero, no
  stragglers. (Simulated on a scratch copy with a `find`-based, null-delimited file list so
  the space-containing filenames `3 - plan.md` / `5 - docs.md` are renamed too.)
- `design-doc`/`Design Doc`: **245 → 246** (the single net addition is the
  `design-doc-reviewer.md` disambiguation) and holds at **246** through the rename — no
  consumption. README contributes 6, all untouched. README line 112 after the simulated
  rename keeps all four `design-doc-*` profiles and pluralizes all four concept agents.
- `design-docs` corruption: **0**. `docss` over-pluralization: **0**.
- `document`/`documentation`: **124 → 124**, unchanged throughout (README's 6 included).

### Completeness — README was the only overlooked surface (independent sweep)
- Repo-wide `grep -rliP '(?<![Dd]esign[- ])\b[Dd]oc(?![Ss])(?!ument)\b[- ]'` excluding
  `.git`/`node_modules`: every concept-bearing file outside `.pipelines/**` and
  `CHANGELOG.md` falls within the spec's declared in-scope trees — `.rp.md`, `README.md`,
  `website/demo.js`, `.changeset/agent-scoped-guardrails.md`, `agents/*.md`, and
  `skills/radical-pipelines/**`. `.pipelines/**` and `CHANGELOG.md` are explicitly out of
  scope as historical records. No other surface exists, so README closes the last gap.

## Conclusion

The README scope correction is right, the counts are accurate, and the spec is sound,
complete, internally consistent, and self-completing. The previously-approved remainder is
unchanged and still sound. No blocking issues. Approved.
