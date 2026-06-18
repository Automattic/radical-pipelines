# Spec: Reconcile docs-naming with the merged trunk

## Overview

This is a REVIEW run of the `134-unify-docs-naming` pipeline. The base run already
unified the documentation-phase concept on the plural form `docs` across the skill and
agent definitions (renaming the four agents to `docs-plan-writer`, `docs-plan-reviewer`,
`docs-writer`, `docs-reviewer`, pluralizing the phase-3 plan artifacts to `docs-plan.md`,
the display labels to `Docs Plan` / `Docs Writer` / etc., and the derived name copies in
`.rp.md`, `README.md`, and `website/demo.js`). That work completed and a PR was opened
but not yet merged.

Afterward the owner merged trunk (advanced 104 commits) into the pipeline branch and
asked for this review. Trunk brought substantial structural change the base run never saw
— notably the single `code-writer` agent split into `code-writer-tdd` and
`code-writer-e2e`, a reworked guardrails model with two new skill reference files
(`skills/radical-pipelines/reference/guardrails.md` and
`skills/radical-pipelines/reference/conventions/passing.md`), and a new root-level
`pr-description.md`. The base run's `docs-*` renames survived the merge intact, but the
two new reference files were merged as-is and still spell the documentation-phase concept
in the singular.

The documentation-phase concept is the pipeline's phase-5 documentation work and the
phase-3 plan that feeds it: the agents `docs-plan-writer`, `docs-plan-reviewer`,
`docs-writer`, `docs-reviewer`, the artifact `docs-plan.md`, and every prose, label, and
phrase form that leads with that concept noun. It is distinct from the phase-2
`design-doc` concept (where "doc" means a single design *document*) and from the long
English word "documentation"; both remain singular by design.

This review's substantive change is small and surgical: pluralize the **10** remaining
singular documentation-phase concept stragglers found in the **2 new skill reference
files**, all `doc` → `docs`. It also deliberately strengthens the verification mechanism
so the same class of trunk-introduced straggler — including punctuation-bounded forms and
files outside the base run's hardcoded path list — is caught next time.

## Requirements

1. **The two new skill reference files spell the documentation-phase concept plural.**
   Exactly 10 singular concept stragglers, all changed `doc` → `docs`, preserving the
   rest of each token exactly:

   - `skills/radical-pipelines/reference/guardrails.md` (5 occurrences):
     - the agent roster `doc-writer, doc-reviewer` → `docs-writer, docs-reviewer`;
     - the phrase `doc-run gates by the doc plan` → `docs-run gates by the docs plan`
       (2 tokens — the compound `doc-run` and the spaced phrase `doc plan`);
     - the artifact `doc-plan.md` → `docs-plan.md`.
   - `skills/radical-pipelines/reference/conventions/passing.md` (5 occurrences):
     - the agent roster `doc-writer`, `doc-reviewer` → `docs-writer`, `docs-reviewer`;
     - the planning agents `doc-plan-writer` and `doc-plan-reviewer` →
       `docs-plan-writer` and `docs-plan-reviewer`;
     - the backtick-bounded `` `doc` `` (in `` for the scoped gates of `doc` agents ``)
       → `` `docs` ``, making it parallel to the line directly above it
       (`` for the scoped gates of `code` agents ``).

   All 10 are genuine documentation-phase concept references. None is a generic
   single-document use, none is a `design-doc` form, and none is the word
   `document(ation)`; no rewording is required, only pluralization.

2. **The substitution mechanism mirrors the acceptance oracle.** The base run's design
   pairs a counting oracle with a substitution that is the oracle pattern plus a
   capture/replacement, so what the change touches provably equals what the oracle
   counts. This review preserves that mirror: the acceptance oracle relaxes the base
   pattern's trailing `[- ]` anchor (see Acceptance Criteria), and the substitution
   mechanism MUST drop its corresponding trailing `(?=[- ])` anchor in lockstep. This is
   load-bearing — with the anchor in place the substitution leaves the backtick
   `` `doc` `` untouched (the lookahead fails on the trailing backtick), so the straggler
   would survive. Dropping the anchor in both keeps oracle and substitution mirror images
   and fixes all 10 tokens by construction, with no per-form special-case edits.

3. **No corruption or over-pluralization is introduced.** After the change, across all
   tracked files except `.pipelines/`, `CHANGELOG.md`, and `pr-description.md`, there are
   zero `docss` tokens and zero `design-docs` tokens. The `design-doc` concept, the word
   `document(ation)`, and already-plural `docs` are all left unchanged (protected by the
   pattern's lookbehind and lookaheads).

4. **The already-renamed agents are preserved.** The four base-run agent files
   `agents/docs-plan-writer.md`, `agents/docs-plan-reviewer.md`, `agents/docs-writer.md`,
   and `agents/docs-reviewer.md` continue to exist with matching `name:` frontmatter.

## Out of Scope

- **`pr-description.md`.** A frozen PR body for issue #122 (a different feature), created
  by a single manual owner commit and never updated. The skill never templates or writes
  it — it is read in exactly one place (`setup.md`, the fork-mode lifecycle, "using
  `pr-description.md` as the body") and is regenerated fresh per PR. This pipeline will
  itself overwrite it with the body for *this* PR. Rewriting the #122 content would edit
  a record of an already-shipped, different feature — squarely the base intent's "leave
  historical records untouched" constraint. Its 2 singular concept stragglers
  (`doc-run gates by the doc plan`) are therefore not fixed, and `pr-description.md` is
  named in the acceptance oracle's exclusion list (load-bearing: without the exclusion
  the oracle counts 12 instead of 10).

- **`.pipelines/**` and the published `CHANGELOG.md`.** Frozen historical records of past
  runs and releases; they retain whatever names they shipped with. Excluded from the
  oracle.

- **The phase-2 `design-doc` concept.** Singular by design — "doc" there means a single
  design *document*. Untouched, including the `doc-writer`/`doc-reviewer` substrings
  inside `design-doc-writer`/`design-doc-reviewer`. Protected by the pattern's
  `(?<![Dd]esign[- ])` lookbehind.

- **The long English word `document`/`documentation`.** Coexists with the `docs`
  identifier by design; not a singular-vs-plural defect. Protected by the pattern's
  `(?!ument)` lookahead.

- **Already-plural `docs`/`Docs`.** Protected by the pattern's `(?![Ss])` lookahead.

- **Everything else in the post-merge tree, already correct.** The base run's renames
  survived the merge: the four `docs-*` agent files and their frontmatter, the `.rp.md`
  Agent models table, the `README.md` agent roster (including the new
  `code-writer-tdd`/`code-writer-e2e`), `setup.md` (`docs-plan.md`), the phase-3
  completion predicate, and the phase-5 references are all already plural. The new split
  agents `code-writer-tdd` and `code-writer-e2e` carry zero concept stragglers. The empty
  `.changeset/unify-docs-naming.md` is an intentional base-run stub, not a breakage. None
  of these is touched.

## Acceptance Criteria

- **In-scope fix.** Given the two files `skills/radical-pipelines/reference/guardrails.md`
  and `skills/radical-pipelines/reference/conventions/passing.md`, when inspected after
  the change, then every documentation-phase concept token is plural: `docs-writer`,
  `docs-reviewer`, `docs-run`, `docs plan`, `docs-plan.md`, `docs-plan-writer`,
  `docs-plan-reviewer`, and the backtick `` `docs` `` (`` for the scoped gates of `docs`
  agents ``); and the `code-*` lines in those files are unchanged (no `code` → `codes`).

- **Acceptance oracle (Option B) → 0.** Given all git-tracked files except `.pipelines/`,
  `CHANGELOG.md`, and `pr-description.md`, when the anchor-relaxed leading-noun
  match-counting search below is run from the worktree root, then it returns **0** after
  the change (it returns **10** before — 5 in `guardrails.md`, 5 in `passing.md`):

  ```
  git ls-files | grep -vE '^\.pipelines/' | grep -vE '^(CHANGELOG\.md|pr-description\.md)$' \
    | while IFS= read -r f; do grep -oiP '(?<![Dd]esign[- ])\b[Dd]oc(?![Ss])(?!ument)\b' "$f"; done | wc -l
  ```

  The pattern is the base run's pattern with the trailing `[- ]` anchor removed. It is
  anchored on the leading concept noun `doc` itself: the `(?<![Dd]esign[- ])` lookbehind
  excludes every `design-doc`/`Design Doc` form, the `(?![Ss])` leaves already-plural
  `docs`/`Docs` unmatched, the `(?!ument)` leaves `document`/`documentation` unmatched,
  and the `-i` flag (with `[Dd]`) catches capitalized concept forms. Removing the trailing
  anchor lets the pattern see the backtick-bounded `` `doc` `` (the base anchor required a
  following hyphen or space, which a backtick is not); it introduces no over-reach because
  every match in scope is literally the bare token `doc`, and the only such token at an
  end-of-token boundary is that backtick `` `doc` `` (itself the concept). Counting
  matches (not lines) is required because a single line can carry both an in-scope concept
  token and a protected token.

- **Corruption invariants.** Given the same file set (all tracked except `.pipelines/`,
  `CHANGELOG.md`, `pr-description.md`), when searched after the change, then `docss`
  returns 0 matches and `design-docs` returns 0 matches.

- **Positive existence (absence check is not satisfied by deletion).** Given the four
  base-run agent files, when checked after the change, then `agents/docs-plan-writer.md`,
  `agents/docs-plan-reviewer.md`, `agents/docs-writer.md`, and `agents/docs-reviewer.md`
  all exist, each with its matching `name:` frontmatter.

- **`pr-description.md` exclusion is load-bearing.** Given the acceptance oracle run
  without the `pr-description.md` exclusion (all tracked except `.pipelines/` and
  `CHANGELOG.md` only), when run after the change, then it returns 2 (the two frozen
  `doc-run`/`doc plan` stragglers in `pr-description.md`), confirming those are
  intentionally left and that the exclusion — not a fix — accounts for them.
