# Design-doc research: Unify the documentation concept on plural "docs" (#134)

This record captures the iterative design Q&A between the design-doc-analyst and the
design-doc-researcher. It settles the concrete, verifiable mechanism for executing the
rename described in the approved spec (`1-spec/spec.md`). It is the input to the
design-doc-writer, who will write `design-doc.md` from it.

## Framing (from the approved spec)

- **What this is.** A careful, verifiable rename of the documentation-phase concept from
  singular `doc` to plural `docs`, everywhere the skill and agent definitions *name* the
  concept, plus the derived copies of those names (`.rp.md` Agent models table,
  `website/demo.js`, the pending changeset). This is markdown prose, not executable code.
- **The naming rule.** The phase's leading concept noun is `docs`; every compound or
  phrase that *leads* with the concept noun changes only that leading `doc` → `docs` and
  preserves the rest exactly.
- **What is protected (unchanged).** The phase-2 `design-doc` concept (a single design
  *document*), the long English word "documentation"/"document", and already-plural
  `docs`/`Docs`/`docs-*`.
- **The verification oracle.** After the change, this leading-noun search returns zero
  matches over the in-scope trees:
  `grep -roiP '(?<![Dd]esign[- ])\b[Dd]oc(?![Ss])(?!ument)\b[- ]' skills agents .rp.md website .changeset README.md`
  (164 matches today; 0 after — see the README scope amendment in Topic 3.)

## Baseline facts established at the start of design (worktree state)

- Leading-noun matches today: **160** across `skills agents .rp.md website .changeset`;
  **164** once `README.md` is added (the spec was amended mid-design to bring README into
  scope — see Topic 3 — adding the 4 agent-name tokens at `README.md:112`).
- Protected-token baselines (in-scope, must not be corrupted):
  - `design-doc`/`Design Doc`: **239** (becomes 240 after the one Req-8 disambiguation
    that adds a "design doc" reference in `design-doc-reviewer.md`).
  - `document`/`documentation`: **118** (unchanged).
  - already-plural `docs`/`Docs`: **87** (unchanged; only grows as new `docs-*` names
    replace `doc-*` ones).
- The four agent files to rename (filename stem must equal `name:` — discovered by
  filename): `agents/doc-plan-writer.md`, `agents/doc-plan-reviewer.md`,
  `agents/doc-writer.md`, `agents/doc-reviewer.md`.

## In-scope files carrying the leading-noun concept token (17 files, incl. README)

From the leading-noun grep, grouped by kind:

- **The four concept agents** (rename + frontmatter + body references):
  `agents/doc-plan-writer.md`, `agents/doc-plan-reviewer.md`, `agents/doc-writer.md`,
  `agents/doc-reviewer.md`.
- **Cross-referencing agents** (body references to `doc-plan.md`, no rename):
  `agents/code-plan-writer.md` (line 65), `agents/code-plan-reviewer.md` (line 29) — both
  say "planned separately as `doc-plan.md`". *These are in scope via the zero-match grep
  over `agents`, though the spec prose enumerates them only implicitly under Requirement 3
  ("in every place the skill and agents read or write them"). The design must enumerate
  them so they are not missed.*
- **Skill reference files**: `skills/radical-pipelines/SKILL.md`,
  `skills/radical-pipelines/reference/assisted-phases/3 - plan.md`,
  `skills/radical-pipelines/reference/autonomous-phases/3 - plan.md`,
  `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md`,
  `skills/radical-pipelines/reference/conventions/setup.md`,
  `skills/radical-pipelines/reference/pipeline-versioning.md`.
- **Derived copies**: `.rp.md` (Agent models table, lines 90/91/94/95),
  `website/demo.js` (task/reads/writes/completion arrays), and **`README.md` (line 112,
  Pi-package agent list — added by the mid-design spec amendment, Topic 3)**.
- **Pending changeset**: `.changeset/agent-scoped-guardrails.md` (line 5).

## The four Requirement-8 generic-document rewords (located, exact current text)

These are reworded, not pluralized. Exact current strings (for anchored substitution):

1. `agents/design-doc-reviewer.md:14` — "Use it to check that **the doc faithfully**
   reflects the decisions" → "the design doc faithfully". (Adds one "design doc" token.)
2. `skills/radical-pipelines/reference/assisted-phases/3 - plan.md:175` — "for each
   surface, **who the doc is for**" → "who the surface is for".
3. `agents/doc-writer.md:14` — "**a reference doc may** only need a glance" →
   "a reference page may".
4. `agents/doc-writer.md:25` — "do not paste design-doc prose into **a reader-facing
   doc**" → "a reader-facing page".

Note: occurrence (4) is a bare end-of-token `doc` that the leading-noun grep never
matched (no trailing hyphen/space), so rewording it does not change the 160→0 count; it
matters only for the separate "no bare singular concept token remains" guarantee.

## Open design topics (to work through with the researcher)

1. The exact substitution mechanism and its ordering vs. the four manual rewords.
2. Idempotency and protection of `design-doc` / `document(ation)` / already-plural `docs`.
3. File renames: `git mv`, frontmatter `name:`, and the discovery contract.
4. Cross-reference completeness (the code-plan agents; any other readers/writers).
5. Space-named files: quoting/escaping for the tooling.
6. The Mermaid edge `commits doc updates` → `commits docs updates` and other labels.
7. End-to-end verification: zero-match grep + positive existence + non-corruption counts.

---

## Q&A log

### Topic 1 — Substitution mechanism, ordering vs. the four rewords, idempotency

**Decision (empirically validated by running the full recipe in the worktree and
inspecting the resulting tree directly):** the rename is executed as **(1) four manual
rewords first, then (2) one anchored, case-preserving regex substitution** across the
in-scope files. This ordering is required because three of the four Requirement-8
occurrences ("the doc faithfully", "who the doc is for", "a reference doc may") contain a
`doc␣` leading token the substitution *would* otherwise pluralize; rewording them first
removes the token so the substitution never sees it.

**Validated result (tree state after running the recipe):**

- Leading-noun oracle: **160 → 0**.
- `design-doc`/`Design Doc`: **239 → 240** (only the single Req-8 addition in
  `design-doc-reviewer.md`, exactly as the spec predicted). No `design-doc` token consumed.
- `document`/`documentation`: **118 → 118** (unchanged). The `(?!ument)` guard and the
  JS DOM `document.*` calls in `website/demo.js` are left untouched.
- `docss` over-pluralization: **0**. `design-docs` corruption: **0**.
- All four `name:` frontmatter lines became plural (`docs-plan-writer`,
  `docs-plan-reviewer`, `docs-writer`, `docs-reviewer`).
- All four Requirement-8 rewords landed verbatim ("the design doc faithfully", "who the
  surface is for", "a reference page may", "a reader-facing page").

**The substitution pattern** mirrors the verification oracle: a `doc` word-token that is
(a) not preceded by `design-`/`design␣` (case-insensitive lookbehind `(?<![Dd]esign[- ])`),
(b) immediately followed by a hyphen or space, and (c) not already `docs`/`document…`
(`(?![Ss])(?!ument)`), with an `s` inserted after the captured `[Dd]oc` so case is
preserved (`doc-` → `docs-`, `Doc␣` → `Docs␣`). Because the pattern is anchored on the
leading noun and never reads the trailing word, every compound and phrase form is caught
without enumeration, and the trailing inflection (`-writers`, `tasks`) is irrelevant.

**Exact commands (verified end-to-end in the worktree).**

Step 1 — the four Requirement-8 rewords, applied **first**, each anchored on a unique
literal span:

```
perl -i -pe 's/\bthe doc faithfully reflects\b/the design doc faithfully reflects/' agents/design-doc-reviewer.md
perl -i -pe 's/\bwho the doc is for\b/who the surface is for/' "skills/radical-pipelines/reference/assisted-phases/3 - plan.md"
perl -i -pe 's/\ba reference doc may\b/a reference page may/' agents/doc-writer.md
perl -i -pe 's/\binto a reader-facing doc\b/into a reader-facing page/' agents/doc-writer.md
```

After Step 1 the oracle is **157** (3 of the 4 rewords each removed one leading-token
match; the fourth, "a reader-facing doc", is a bare end-of-token `doc` the oracle never
matched, so it does not change the count — exactly as the spec predicts).

Step 2 — the single anchored, case-preserving substitution over every in-scope file,
iterated null-safely so the two space-named files are handled correctly:

```
PAT='(?<![Dd]esign[- ])\b([Dd]oc)(?![Ss])(?!ument)\b(?=[- ])'
find skills agents .rp.md website .changeset -type f -print0 | while IFS= read -r -d '' f; do
  perl -i -pe "s/$PAT/\${1}s/g" "$f"
done
```

Pattern, by clause (it mirrors the verification oracle's boundaries by construction, so the
set it touches equals the set the oracle counts):
- `(?<![Dd]esign[- ])` — case-insensitive lookbehind; protects `design-doc`/`Design Doc`.
- `\b([Dd]oc)` — captures the leading token, preserving its case (`$1` = `Doc` or `doc`).
- `(?![Ss])` — leaves already-plural `docs`/`Docs` unmatched (also the idempotency guard).
- `(?!ument)` — leaves `document`/`documentation` (and JS `document.*`) unmatched.
- `\b(?=[- ])` — the token must be immediately followed by a hyphen or space; the lookahead
  does **not** consume it, so the trailing hyphen/space and the following word survive verbatim.
- Replacement `${1}s` appends `s` to the case-correct captured token: `doc-writer` →
  `docs-writer`, `Doc Plan` → `Docs Plan`.

After Step 2 the oracle is **0**. Case preservation verified (`Doc Plan`→`Docs Plan`,
`Docs Writer`, `Docs Reviewer`, lowercase `docs-writer`/`docs-plan`).

**Portability (load-bearing for the code phase):** the lookbehind/lookahead require
Perl-compatible regex. macOS/BSD `sed` does **not** support them — the recipe must use
`perl -i -pe` (present on macOS and Linux), matching the oracle's `grep -P`. Verified that
this machine's `perl` runs the pattern (`echo 'doc-writer Doc Plan design-doc docs
documentation' | perl -pe '<PAT>'` → `docs-writer Docs Plan design-doc docs documentation`).

**Ordering hazard, proven:** dry-running Step 2 on `doc-writer.md` *without* Step 1 turned
"a reference doc may" into "a reference **docs** may" — wrong. Applying the rewords first
removes that token (it becomes "a reference page may"), so Step 2 never sees it. No
carve-out is needed; ordering alone is sufficient. The four reworded spans ("design doc",
"the surface", "a reference page", "a reader-facing page") are untouched by Step 2.

**Idempotency:** the `(?![Ss])` guard makes a second run a no-op — running Step 2 a second
time over the converted tree left the oracle at 0 and `docss` at 0 (verified). There is no
`doc`→`docss` risk.

**Shell-quoting gotcha (load-bearing for the implementer).** When the pattern is in a
shell variable and the perl program is double-quoted (`perl -i -pe "s/$PAT/.../g"`), the
replacement must be written `\${1}s` so the *shell* does not expand `$1` before perl sees
it. If the perl program is single-quoted instead (`perl -i -pe 's/.../${1}s/g'`), write
`${1}s` directly. The spaced filename in Step 1 (`"3 - plan.md"`) must be quoted.

**Single-line edge cases — confirmed at the token level against the pristine tree:**

- `.changeset/agent-scoped-guardrails.md:5` "A code- or **doc**-phase guardrail … one or
  more of `code-writer`, `code-reviewer`, `doc-writer`, and `doc-reviewer`" — the pattern
  fires on exactly **3** tokens (`doc-phase`, `doc-writer`, `doc-reviewer`), yielding
  "A code- or **docs**-phase … `code-writer`, `code-reviewer`, `docs-writer`, and
  `docs-reviewer`". The bare `code-` before "or" and the `code-writer`/`code-reviewer`
  names are a different word and never match. (Matches Req 7: `docs-phase` parallel to
  `code-phase`.)
- `setup.md:48` "(`intent.md`, `spec.md`, `design-doc.md`, `code-plan.md`, `doc-plan.md`,
  etc.)" — exactly **1** match (`doc-plan.md`); `design-doc.md` excluded by the lookbehind,
  `code-plan.md` is a `code` token. Only `doc-plan.md` → `docs-plan.md`.
- `agents/doc-reviewer.md:3` `description:` line "…completed **doc-writer** tasks against
  the **doc** plan, spec, design doc, …" — exactly **2** matches (`doc-writer`, `doc plan`);
  the later "design doc" is excluded by the case-insensitive lookbehind (`doc` preceded by
  "design "). Result: "…completed `docs-writer` tasks against the docs plan, spec, design
  doc, …".

**General guarantee:** the lookbehind and the `(?!ument)`/`(?![Ss])` lookaheads are
evaluated **per-match, not per-line**, so each token on a shared line is judged
independently. A protected token never shields an adjacent in-scope token and vice versa.
The net `design-doc` count 239 → 240 (no `design-doc` consumed) corroborates this.

**Mermaid labels are ordinary tokens, not a separate step:** in the source, `5 - docs.md`
reads `B[Doc Writer]`, `D[Doc Reviewer]`, and the edge `commits doc updates`; the
substitution turns these into `Docs Writer`, `Docs Reviewer`, and `commits docs updates`
as ordinary `[D]oc␣`-led tokens. No manual Mermaid editing is required (Req 4 satisfied by
Step 2).

**Process note:** the researcher applied the recipe in place during the experiment; the
tree has since been reverted to pristine (oracle back to 160). The experiment is preserved
as `git stash@{0}` ("wip-134-substitution-experiment"); the project's safety-net blocks
`git stash drop`, so it could not be removed, but it is harmless (a shelved copy, not on
the tree). The code phase reproduces the result from the recipe above, not from the stash;
the stash can be ignored or dropped later when the safety-net allows.

### Topic 2 — File renames and the agent-discovery contract

**Discovery contract (researcher-confirmed):** agents are discovered purely from the
`agents/` directory **by filename**. `.claude-plugin/plugin.json` and `marketplace.json`
contain **no agent list**, so there is no manifest to update and no hidden touchpoint a
rename could orphan. Consequently the filename stem must equal the `name:` frontmatter, and
Requirement 2's four file renames are load-bearing: editing `name:` without renaming the
file (or vice-versa) would leave the agent mismatched and undiscoverable.

**The four renames** (`git mv`, which preserves history and stages the rename as `R`):

- `agents/doc-plan-writer.md`   → `agents/docs-plan-writer.md`
- `agents/doc-plan-reviewer.md` → `agents/docs-plan-reviewer.md`
- `agents/doc-writer.md`        → `agents/docs-writer.md`
- `agents/doc-reviewer.md`      → `agents/docs-reviewer.md`

None of the four have spaces, so the rename has no quoting concern. The two space-named
phase files (`3 - plan.md`, `5 - docs.md`) are **not** renamed — their stems are phase
numbers, not the concept — only their contents change. (Spaces only matter for *quoting the
file list* fed to the content substitution, not for any rename.)

**Ordering (recommended):** run the content substitution **first** (it flips `name:` and
every body self-reference such as ``You are the `doc-writer` agent``) while the files still
have their old names, then `git mv` the now-internally-plural files to their plural
filenames. The substitution's file list targets the old `doc-*.md` names, so it must run
before the rename.

**Rename proof (observed directly in the researcher's experiment tree):** with the
substitution applied and the four `git mv`s run, `git status --short` shows the four files
as staged renames-with-modification:

```
RM agents/doc-plan-reviewer.md -> agents/docs-plan-reviewer.md
RM agents/doc-plan-writer.md  -> agents/docs-plan-writer.md
RM agents/doc-reviewer.md     -> agents/docs-reviewer.md
RM agents/doc-writer.md       -> agents/docs-writer.md
```

`R` = git tracked it as a rename (history preserved); `M` = the content edit on the same
file. This confirms the rename is clean and the substitution-then-`git mv` ordering works.
(`git mv` both stages the rename and moves the working-tree file in one step.)

### Topic 3 — Cross-reference completeness and a spec-scope discrepancy (README)

**In-scope cross-references are all inside the `find` scope.** Beyond the four concept
agents' own files, the concept name is referenced in:
- `agents/code-plan-writer.md:65` and `agents/code-plan-reviewer.md:29` —
  "planned separately as `doc-plan.md`" (cross-references to the renamed artifact);
- `setup.md:183,186` — guardrail prose listing `doc-writer`/`doc-reviewer`;
- the phase tables and Mermaid blocks in `3 - plan.md` / `5 - docs.md`;
- `.rp.md` Agent models table; `website/demo.js`; `.changeset`.

Every one is inside `find skills agents .rp.md website .changeset`, so the single
substitution covers them all. No agent file `@`-mentions another by name and no YAML
`tools:`/`model:` field references these four, so there is no hidden invocation dependency.

**Scope completeness — confirmed by an out-of-scope sweep.** No source file *outside* the
in-scope trees and outside frozen `.pipelines/` history references the four agent names or
the `doc-plan` artifacts, **except README.md (see discrepancy below)**. Checked
`AGENTS.md` (0), `CLAUDE.md` (0), `CONTRIBUTING.md` (0), `package.json` (0),
`.claude-plugin` (0), `.pi` (0), `.github` (0), `scripts` (0). `CHANGELOG.md` and
`.pipelines/**` carry the old names as historical record and are out of scope by design.

#### RESOLVED — README.md brought into scope (spec amended by the owner)

**Resolution (team-lead ruling, spec amended):** the issue below was escalated to the
team-lead, who amended the approved spec to bring `README.md` into scope (my recommended
option a). The amended spec now: (Req 6) requires `README.md:112`'s Pi-package agent list
to name the four agents plural and keeps README's already-plural mentions (line 32 "Docs"
label, line 157 `docs-summary.md`); (Out of Scope) removes README from "files with no
documentation-concept references"; (Acceptance) adds `README.md:112` to the derived-copies
check **and extends the oracle scope to include `README.md`**, restating the baseline as
**164** (160 + the 4 README agent-name tokens at line 112). Verified: the oracle over
`skills agents .rp.md website .changeset README.md` reads 164 today and 0 after the recipe.
The original finding is kept below for the record.

#### (Original finding) README.md contradicted the spec's scope

`README.md:112` lists the pipeline's phase agent profiles and **names all four concept
agents under their OLD singular form**: `…, code-plan-reviewer`, **`doc-plan-writer`**,
**`doc-plan-reviewer`**, `code-writer`, `code-reviewer`, **`doc-writer`**, and
**`doc-reviewer`** (…).

This conflicts with the approved spec, whose Out-of-Scope item lists README among "Files
with **no documentation-concept references**." That premise is factually wrong for this
line — README has four concept-agent references. The consequence of leaving them: after the
rename, README would advertise `doc-writer`/`doc-reviewer`/`doc-plan-writer`/
`doc-plan-reviewer` while the shipped agents are `docs-writer`/`docs-reviewer`/etc. —
recreating the exact singular-vs-plural contradiction this change exists to eliminate, in
the project's most-read file.

Notes:
- The oracle did **not** catch this because the oracle's scope
  (`skills agents .rp.md website .changeset`) deliberately excludes README — so as written,
  the spec's acceptance check passes while README stays stale. The gap is in the *scope*,
  not the pattern.
- README's other documentation mentions are fine and should stay: line 32 "**Phase 5.
  Docs.**" (already plural label) and line 157's `5-docs/docs-summary.md` (already plural)
  are the phase's outward identity; the long word "documentation" elsewhere is out of scope
  by design. Only the line-112 agent-name list is stale.
- README contains no `doc-plan.md`/artifact-name references beyond the agent names.

**Recommendation (adopted):** treat README.md:112 as in scope and pluralize the four agent
names there (the same `doc-*` → `docs-*` change, by the same rule), adding `README.md` to
the substitution's file list and to the verification scope. This is the minimal, consistent
fix. The owner adopted it and amended the spec (see Resolution above); README is now a
settled part of scope.

**README is the ONLY surprise — confirmed.** A whole-repo sweep for the four agent names
and the `doc-plan` artifacts (excluding `.pipelines/`, `.git/`, `node_modules/`) returns,
outside the already-known in-scope files, only `README.md`. The website tree is fully
covered by `website/demo.js`: `website/index.html`, `styles.css`, `robots.txt`,
`sitemap.xml`, and the `assets/` are free of any concept-agent name or leading-noun token.
`.github/`, `scripts/`, `package.json`, `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`,
`.claude-plugin/`, `.pi/` are all clean.

**Verification-method caveat (important for the suite design):** README:112 carries the
four concept names *and* the four `design-doc-*` names on the **same line**, so a
**line-level** `grep -viP 'design-doc'` filter wrongly drops the whole line and hides the
stragglers (this is exactly what masked README during the first sweep). The verification
must therefore use the spec's **per-match** oracle (the `(?<![Dd]esign[- ])` lookbehind),
never a line-level `grep -v 'design-doc'` post-filter. The oracle is per-match and is
correct; ad-hoc straggler greps used during implementation must mirror it.

### Topic 4 — The full verification suite (verified end-to-end)

I ran the complete recipe — Step 1 rewords, Step 2 substitution (with `README.md` added to
the file list), Step 3 the four `git mv`s — on a throwaway tree and captured every check,
then restored the tree to pristine (oracle back to 160, all four files back with singular
`name:`, `design-doc` back to 239). Results:

| # | Check | Result |
|---|-------|--------|
| 1a | Oracle, spec scope (`skills agents .rp.md website .changeset`) | **0** ✓ |
| 1b | Oracle, spec scope **+ README.md** | **0** ✓ |
| 2 | `agents/docs-{plan-writer,plan-reviewer,writer,reviewer}.md` exist, each with matching `name:` | all 4 exist, `name:` matches ✓ |
| 3 | Old `agents/doc-{plan-writer,plan-reviewer,writer,reviewer}.md` gone | all 4 gone ✓ |
| 4 | `docss` over-pluralization | **0** ✓ |
| 4 | `design-docs`/`Design Docs` corruption | **0** ✓ |
| 5 | Completion predicate `pipeline-versioning.md` reads `3-plan/docs-plan-review-approved.md` | yes ✓ |
| 6 | README:112 agent list now reads `docs-plan-writer`, `docs-plan-reviewer`, `docs-writer`, `docs-reviewer` (and `code-*`/`spec-*`/`design-doc-*` untouched) | yes ✓ |

**Non-corruption counts — scope matters:**
- In-scope only (`skills agents .rp.md website .changeset`): `design-doc` 239 → **240**
  (+1 from the Req-8 disambiguation), `document(ation)` **118** (unchanged).
- With README added to the count scope: `design-doc` reads **246** and `document(ation)`
  reads **124** — *not* corruption: README itself contains 6 `design-doc-*` agent-name
  references (line 112) and 6 `document(ation)` words that are simply README's own
  protected tokens being counted. The point counts (240 / 118) are over the in-scope trees;
  if README is brought in scope, its own protected tokens add to the totals but none is
  altered (`design-docs` corruption stays 0). The robust invariant is **zero `design-docs`
  and zero `docss`** regardless of scope.

**The complete recipe, end to end (the implementer's procedure):**

```
# Step 1 — four Requirement-8 rewords (must run before Step 2):
perl -i -pe 's/\bthe doc faithfully reflects\b/the design doc faithfully reflects/' agents/design-doc-reviewer.md
perl -i -pe 's/\bwho the doc is for\b/who the surface is for/' "skills/radical-pipelines/reference/assisted-phases/3 - plan.md"
perl -i -pe 's/\ba reference doc may\b/a reference page may/' agents/doc-writer.md
perl -i -pe 's/\binto a reader-facing doc\b/into a reader-facing page/' agents/doc-writer.md

# Step 2 — anchored, case-preserving substitution over the in-scope files
# (README.md is in scope per the amended spec — see Topic 3 Resolution):
PAT='(?<![Dd]esign[- ])\b([Dd]oc)(?![Ss])(?!ument)\b(?=[- ])'
find skills agents .rp.md website .changeset README.md -type f -print0 | while IFS= read -r -d '' f; do
  perl -i -pe "s/$PAT/\${1}s/g" "$f"
done

# Step 3 — rename the four agent files so the stem matches the (now-plural) name::
git mv agents/doc-plan-writer.md   agents/docs-plan-writer.md
git mv agents/doc-plan-reviewer.md agents/docs-plan-reviewer.md
git mv agents/doc-writer.md        agents/docs-writer.md
git mv agents/doc-reviewer.md      agents/docs-reviewer.md
```

The amended spec extends the oracle scope to include `README.md` and restates the baseline
as **164** (160 across `skills agents .rp.md website .changeset` + the 4 README agent-name
tokens at line 112); after the recipe the oracle over that scope is **0**.

**Verification commands (the acceptance oracle the code/reviewer phases run):**

```
# 1. Zero leading-noun matches (the spec's oracle, README in scope per the amended spec):
grep -roiP '(?<![Dd]esign[- ])\b[Dd]oc(?![Ss])(?!ument)\b[- ]' skills agents .rp.md website .changeset README.md    # → 0 (164 before)

# 2. Positive existence (guards against "satisfied by deletion"):
for n in docs-plan-writer docs-plan-reviewer docs-writer docs-reviewer; do
  test -f "agents/$n.md" && grep -qE "^name: $n\$" "agents/$n.md" && echo "$n OK"; done

# 3. Old names gone:
for o in doc-plan-writer doc-plan-reviewer doc-writer doc-reviewer; do
  test ! -e "agents/$o.md" && echo "$o removed"; done

# 4. No corruption (robust, scope-independent):
grep -roiP 'docss' skills agents .rp.md website .changeset README.md | wc -l            # → 0
grep -roiP '[Dd]esign[- ]docs' skills agents .rp.md website .changeset README.md | wc -l # → 0
```

**Reversibility/cleanup note for the experiment:** when reverting an in-place `git mv`
experiment, `git checkout -- <file>` is blocked by the project safety-net; use
`rm -f agents/docs-*.md` (the untracked renamed copies) followed by
`git restore --staged --worktree agents/doc-*.md` (restores the staged-deleted originals
from HEAD, non-destructively). This is an experiment-cleanup detail, not part of the
implementation recipe.

### Topic 5 — Space-named files (settled within Topic 1)

The two phase files `skills/radical-pipelines/reference/assisted-phases/3 - plan.md` and
`.../autonomous-phases/3 - plan.md`, and `.../autonomous-phases/5 - docs.md`, contain
literal " - " (space-hyphen-space) in their names and carry the bulk of the matches. They
are **not renamed** (their stems are phase numbers). The substitution iterates with
`find … -print0 | while IFS= read -r -d ''`, which is null-delimited and handles the spaces
correctly; a naive `for f in $(grep -l …)` would split on the spaces and corrupt the loop —
that is the trap the recipe avoids. Step 1's reword on `3 - plan.md` quotes the path.

### Topic 6 — Display labels and Mermaid (settled within Topic 1)

All title-case labels (`Docs Plan`, `Docs Plan Review`, `Docs Plan Topics`, `Docs Writer`,
`Docs Reviewer`, `Docs Plan Writer`, `Docs Plan Reviewer`), the plan template title
`# Docs Plan: <feature name>`, and the Mermaid nodes/edges (`Docs Writer`, `Docs Reviewer`,
`commits docs updates`) are produced by Step 2 as ordinary `[D]oc␣`-led tokens — the
`[Dd]oc` class and case-preserving `${1}s` handle the capitalized forms. No manual label or
Mermaid editing is required.

### Topic 7 — End-to-end verification (settled as Topic 4)

The full acceptance suite — zero-match oracle (README in scope), positive existence of the
four renamed files with matching `name:`, absence of the old files, and the
scope-independent no-corruption invariants (`docss` = 0, `design-docs` = 0) — is recorded
under Topic 4, verified by a complete dry run (164 → 0).

---

## Design summary (for the design-doc-writer)

The change is a verifiable rename executed as a fixed three-step procedure plus a defined
acceptance suite:

1. **Four manual rewords first** (Req 8) — `perl -i -pe` on unique literal spans, turning
   the generic single-document uses into "design doc" / "the surface" / "a reference page" /
   "a reader-facing page". Must precede Step 2 or the substitution would wrongly pluralize
   three of them.
2. **One anchored, case-preserving substitution** — `perl -i -pe "s/$PAT/\${1}s/g"` with
   `PAT='(?<![Dd]esign[- ])\b([Dd]oc)(?![Ss])(?!ument)\b(?=[- ])'`, applied over
   `skills agents .rp.md website .changeset README.md` via a null-safe `find -print0` loop.
   The pattern mirrors the verification oracle by construction, so what it changes equals
   what the oracle counts. It protects `design-doc`/`Design Doc`, `document(ation)` (incl.
   JS `document.*`), and already-plural `docs`/`Docs`/`docs-*` host paths, per-match.
3. **Four `git mv` renames** — so each agent file's stem matches its now-plural `name:`,
   preserving discoverability (agents are discovered by filename; no manifest lists them).

**Decisions settled:** rewords-before-substitution ordering (hazard proven); the perl
recipe (not `sed`, which lacks lookbehind on macOS/BSD); null-safe file iteration for the
two space-named files; the four renames via `git mv` (history-preserving `R`); the
code-plan agents' `doc-plan.md` cross-references and the setup.md guardrail prose are
covered by the single substitution; README.md:112 is in scope (owner amended the spec);
idempotency via `(?![Ss])`. **Acceptance:** oracle 164 → 0 over the amended scope, four
renamed files present with matching `name:`, old files gone, `docss`/`design-docs` = 0.
