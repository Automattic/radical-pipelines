# Spec research — review-1: reconcile docs-naming with the merged trunk

Running Q&A record between `spec-analyst` and `spec-researcher`. Goal of this REVIEW
run: after trunk was merged into the `unify-docs-naming` branch, determine exactly
which post-merge files reintroduced singular `doc-*` / `doc ` naming for the
documentation-PHASE concept and need further `doc`→`docs` changes to keep the original
intent satisfied — and bound scope precisely (in vs out).

## Inherited rules from the base run (the original intent)

- Standardize the documentation-PHASE concept on the plural `docs`.
- Leave the phase-2 `design-doc` concept singular (a single design *document*).
- Leave the long word `document(ation)` alone.
- Generic single-document uses of "doc" are reworded for clarity, not pluralized.
- `.pipelines/**` (frozen run history) and the published `CHANGELOG.md` stay as shipped.
- The base run's verification oracle (per-match counting grep, run from worktree root):
  `grep -roiP '(?<![Dd]esign[- ])\b[Dd]oc(?![Ss])(?!ument)\b[- ]' skills agents .rp.md website .changeset README.md`
  — protects `design-doc`, `document(ation)`, and already-plural `docs` by construction.

## What the merge changed (from review intent + initial recon)

- `code-writer` split into `code-writer-tdd` + `code-writer-e2e`.
- Reworked guardrails model: new `reference/guardrails.md`,
  `reference/conventions/passing.md`.
- New root-level `pr-description.md` (PR description for issue #122, a different feature).
- The base run's `docs-*` renames SURVIVED the merge: `agents/docs-*.md` files exist,
  `.rp.md` Agent models table lists `docs-*`, README roster lists `docs-*` (and already
  includes `code-writer-tdd`/`code-writer-e2e`). So the only regressions are in
  trunk-added/modified files.

## Analyst pre-recon (to be confirmed by researcher)

Across ALL git-tracked files, excluding `.pipelines/` history and `CHANGELOG.md`, exactly
three files carry singular documentation-PHASE concept stragglers:

- `skills/radical-pipelines/reference/guardrails.md` — 5 matches (lines 20, 28, 32):
  `doc-writer, doc-reviewer` (agent roster), `doc-run gates by the doc plan`,
  `doc-plan.md`.
- `skills/radical-pipelines/reference/conventions/passing.md` — 4 matches (lines 11, 16):
  `doc-writer`, `doc-reviewer`, `doc-plan-writer`, `doc-plan-reviewer`, `doc` agents.
- `pr-description.md` — 2 matches (line 10): `doc-run gates by the doc plan` (PR
  description for issue #122, a different feature).

Notes corroborating tight scope:
- The base run's `docs-*` renames SURVIVED the merge: `agents/docs-*.md`, `.rp.md` table,
  README roster, `setup.md` (`docs-plan.md`), phase-3 completion predicate and phase-5
  references (`autonomous-phases/3 - plan.md`, `assisted-phases/3 - plan.md`,
  `pipeline-versioning.md`) are all already plural.
- The two reference files are inside the original oracle's file list (`skills`).
  `pr-description.md` is at the repo ROOT, OUTSIDE the original oracle's file list.
- `.changeset/unify-docs-naming.md` is an intentional empty changeset created by the base
  run's docs-writer (commit `5f13308`); the base spec's `agent-scoped-guardrails.md` was
  consumed by a trunk "Version Packages" release. Not a breakage — out of scope.
- Corruption invariants hold in all three target files: 0 `docss`, 0 `design-docs`. The
  target files contain no `design-doc` forms and only one `document(ation)` token
  (`pr-description.md:17`), so a substitution is safe and surgical.

### Analyst note — a concept straggler the original oracle MISSES

`passing.md:16` reads ``- `doc-plan-writer` and `doc-plan-reviewer` for the scoped gates of `doc` agents`` —
parallel to line 15's ``... for the scoped gates of `code` agents``. The bare
backtick-wrapped `` `doc` `` is a genuine documentation-PHASE concept reference, but:

- the original oracle pattern does NOT flag it (a backtick, not a hyphen/space, follows
  `doc`, so `\bdoc...\b[- ]` fails);
- the base run's perl substitution does NOT fix it either (same reason).

So beyond the agent-name tokens on line 16 (`doc-plan-writer`, `doc-plan-reviewer`) which
the oracle DOES catch, there is a third concept token on that line the oracle misses.
The intended parallel form is `` `docs` agents`` (matching line 15's `` `code` ``).

This is a scope/verification question for the researcher (see Q&A): does the review (a)
broaden the verification so it would catch backtick-wrapped/punctuation-adjacent concept
forms, and (b) require fixing `` `doc` ``→`` `docs` `` on `passing.md:16`?

---

## Q&A

### Q1 — Post-merge straggler inventory (evidence-based)

**A (researcher, confirmed against analyst recon):**

The merge is clean for the original 17 files: all four agents renamed and present
(`agents/docs-plan-writer.md`, `docs-plan-reviewer.md`, `docs-writer.md`,
`docs-reviewer.md`) with matching `name:` frontmatter; old `doc-*.md` gone. The new split
agents `code-writer-tdd.md` / `code-writer-e2e.md` carry ZERO concept stragglers.
Corruption invariants over full scope incl. `pr-description.md`: `docss`=0,
`design-doc(s)`=0.

Oracle counts (base pattern):
- base 6-path scope (`skills agents .rp.md website .changeset README.md`): **9 matches**
- adding `pr-description.md`: **11 matches**
- plus 1 oracle-blind token (the backtick `` `doc` `` on `passing.md:16`): real total **12**

The 11 oracle-visible stragglers, all genuine docs-PHASE concept, all in 3 trunk-added
files (none generic-document, none colliding with `design-doc`/`document`; substitution
dry-run converts all 11 cleanly, no Requirement-8 rewording needed):
- `guardrails.md` (5): L20 `doc-writer, doc-reviewer`; L28 `doc-run gates by the doc plan`
  (2 tokens); L32 `doc-plan.md`.
- `passing.md` (4): L11 `doc-writer, doc-reviewer`; L16 `doc-plan-writer`,
  `doc-plan-reviewer`.
- `pr-description.md` (2): L10 `doc-run gates by the doc plan` (2 tokens).

Researcher confirmed the oracle-blind `` `doc` `` on `passing.md:16` is the ONLY
punctuation-bounded bare concept token in the entire scope. Intended form `` `docs` ``
(parallel to line-15's `` `code` ``).

File provenance: `guardrails.md` + `passing.md` are durable packaged skill reference
files (clearly in scope). `pr-description.md` is the only ambiguous one — see Q2.

### Q2 — Is `pr-description.md` in scope or out? → OUT

Decision criteria: (1) provenance/durability — does the skill treat `pr-description.md`
as a durable shipped template/convention or a per-pipeline transient artifact the
orchestrator writes fresh per PR; (2) is a #122-specific PR body checked into trunk the
skill's intended steady state or a leftover; (3) does it fall under the base intent's
"leave historical records untouched" constraint (`CHANGELOG.md` + `.pipelines/**`).
Weighing (a) OUT — frozen #122 PR body, parallel to historical records, regenerated for
this branch's PR anyway; vs (b) IN — tracked repo-root file an implementer reads, leaving
`doc-run`/`doc plan` perpetuates the exact split the intent kills.

**Analyst grounding (independent):** `pr-description.md` is referenced in exactly ONE
place in the whole skill — `setup.md:134`, inside the `artifacts-in-fork` lifecycle:
"Opens the PR in `upstream` from that clean branch, using `pr-description.md` as the
body." There is no template for it anywhere in the skill, and the skill never prescribes
its content. The root `pr-description.md` is simply the PR body the most recent pipeline
run (issue #122) produced and left checked in — a per-PR transient artifact, not a
durable skill surface. This very pipeline will itself produce a fresh `pr-description.md`
(the body for THIS PR), overwriting the #122 content. Rewriting the #122 body's naming
would be editing a record of an already-shipped, different feature — squarely the spirit
of the base intent's "leave historical records untouched" constraint.

**Analyst decision: `pr-description.md` is OUT of scope** (matches researcher's lean;
grounded in its single fork-mode consumer, absence of any template, and its
overwrite-per-PR transience). Its 2 stragglers are therefore not in-scope to fix.

**Resulting in-scope target:** the two durable skill reference files only —
`guardrails.md` (5 tokens) + `passing.md` (5 tokens, incl. the 1 oracle-blind backtick
`` `doc` ``) = **10 stragglers in 2 files**, all → `docs`.

**Researcher confirmation (independent evidence):** OUT, with extra grounding —
`git log --follow -- pr-description.md` shows a SINGLE commit `2e88eb7`, a MANUAL owner
commit (author `luisherranz`, not a pipeline agent; commit "Refactor agent documentation
and workflows…"), never updated since; the file is NOT in setup.md:110-113's enumeration
of durable workflow-produced files; the skill only READS it (no write/create/generate
instruction anywhere). It is a frozen #122 record this #134 pipeline must not rewrite —
parallel to `CHANGELOG.md`/`.pipelines/**`.

**Consequence to carry into the spec (researcher flagged, analyst agrees):** the original
oracle's hardcoded file list (`skills agents .rp.md website .changeset README.md`)
structurally cannot see `pr-description.md` (a root file), so under the original oracle no
exclusion is needed. But IF the spec's acceptance oracle broadens to "all tracked files
excl. `.pipelines/` + `CHANGELOG.md`", it MUST add `pr-description.md` to the exclusion
list, else the check fails on a file we intentionally froze. This is a Q3 (verification)
decision — see below.

### Q3 — The review's acceptance oracle (pending researcher)

Two gaps in the base oracle this review exposes: (1) pattern blind spot — trailing
`[- ]` anchor misses backtick `` `doc` `` on `passing.md:16`; (2) file-list gap — base
list omits root files (convenient: never sees out-of-scope `pr-description.md`, but can't
certify the whole tree).

Analyst pre-verified: the anchor-relaxed pattern
`(?<![Dd]esign[- ])\b[Dd]oc(?![Ss])(?!ument)\b` (base pattern minus trailing `[- ]`)
keeps all three protections and returns:
- over the 6-path base list: **10** today (9 base-visible + 1 backtick), → 0 after fix.
- over all-tracked excl. `.pipelines/` + `CHANGELOG.md`: **12** (those 10 + 2 in
  `pr-description.md`), → 0 after fix only if `pr-description.md` is ALSO excluded.

Deciding between:
- **Option A** — relax pattern, keep 6-path list. 10→0. `pr-description.md` excluded
  structurally; no explicit carve-out needed.
- **Option B** — relax pattern + broaden to all-tracked excl.
  `.pipelines/`/`CHANGELOG.md`/`pr-description.md`. 12→0. Stronger whole-tree guarantee;
  must hardcode the `pr-description.md` exclusion.

Also asking: does the FIX require relaxing the anchor in BOTH the oracle AND the
substitution mechanism (to actually convert the backtick `` `doc` `` → `` `docs` ``), or
can that one token be handled another way?
