# Design Doc: Unify the documentation concept on plural "docs"

## Overview

The pipeline's documentation-phase concept is spelled inconsistently: the same thing is singular `doc` in some places and plural `docs` in others. Phase 5's outward identity is already plural (folder `5-docs`, the "Docs" phase label, `docs-review-*.md`, `docs-summary.md`), but the agents and phase-3 plan artifacts that feed it are still singular (`doc-writer`, `doc-reviewer`, `doc-plan-writer`, `doc-plan-reviewer`, `doc-plan.md`, "Doc Plan"). This produces contradictions such as a singular-named `doc-reviewer` producing the plural-named `docs-review-approved.md`.

This change standardizes the documentation concept on the plural `docs` everywhere the skill and agent definitions *name* it, plus the derived copies that ship alongside those names (`.rp.md`, `website/demo.js`, the pending changeset, and `README.md`'s agent list). It is a careful, verifiable rename of markdown prose, not a code change. Two concepts are deliberately protected and left singular: the phase-2 `design-doc` concept (a single design *document*) and the long English word "documentation"/"document". The change is governed by a single naming rule and proven complete by a per-match grep oracle whose match count goes from 164 to 0.

## Approach

The naming rule, derived from the existing phase-5 convention and matching how the code phase forms `code-writer`/`code-plan.md`: the documentation phase's leading concept noun is `docs`; every compound or phrase that *leads* with the concept noun changes only that leading `doc` → `docs` and preserves the rest exactly. Because the rule is anchored on the leading noun and never reads the trailing word, every compound (`doc-plan-writer`) and phrase (`doc tasks`) form is covered without enumerating them, and trailing inflection (`-writers`, `tasks`) is irrelevant.

The change is realized as a **fixed three-step procedure**, dry-run-verified end-to-end against the worktree:

1. **Four manual rewords first.** Four occurrences use the bare short form "doc" to mean a single document, not the phase concept. They are reworded (not pluralized) so they no longer carry a bare singular concept token. Three of them sit on a `doc␣` leading token that the substitution in step 2 would otherwise wrongly pluralize, so this step must run first to remove that token before the substitution can see it.

2. **One anchored, case-preserving substitution.** A single `perl` regex, mirroring the oracle by construction, rewrites the leading `doc`/`Doc` token to `docs`/`Docs` across the in-scope files. It protects `design-doc`, `document(ation)`, and already-plural `docs` per-match, so what it changes equals exactly what the oracle counts.

3. **Four `git mv` renames.** Each of the four agent definition files is renamed so its filename stem matches its now-plural `name:`. Agents are discovered by filename, so the rename is load-bearing for discoverability.

The mental model: the substitution is the engine that does the bulk of the work uniformly; the four rewords are a hand-applied preface that resolves the only ambiguous cases (single-document "doc"); the renames keep the discovery contract intact. The oracle is the source of truth for completeness — the substitution pattern is the oracle pattern with a capture and replacement bolted on, so passing the oracle is equivalent to the substitution having reached every concept token.

## Components

Seventeen in-scope files carry the leading-noun concept token (the rest of the repo is protected or out of scope).

**The four concept agents — renamed, frontmatter and body rewritten:**
- `agents/doc-plan-writer.md` → `agents/docs-plan-writer.md`
- `agents/doc-plan-reviewer.md` → `agents/docs-plan-reviewer.md`
- `agents/doc-writer.md` → `agents/docs-writer.md`
- `agents/doc-reviewer.md` → `agents/docs-reviewer.md`

Each gets its `name:` frontmatter pluralized and every body self-reference (e.g. ``You are the `doc-writer` agent``, the `description:` line) rewritten by the substitution; then the file itself is `git mv`'d. `agents/doc-writer.md` also receives two of the four manual rewords (step 1) before substitution.

**Cross-referencing agents — body references only, no rename:**
- `agents/code-plan-writer.md` (line 65) and `agents/code-plan-reviewer.md` (line 29) — both say "planned separately as `doc-plan.md`"; the substitution updates the artifact reference to `docs-plan.md`. These are inside the substitution's `agents` scope and must not be missed.

**Skill reference files — body references only:**
- `skills/radical-pipelines/SKILL.md`
- `skills/radical-pipelines/reference/assisted-phases/3 - plan.md` (also one manual reword in step 1)
- `skills/radical-pipelines/reference/autonomous-phases/3 - plan.md`
- `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md` (Mermaid nodes `B[Doc Writer]`, `D[Doc Reviewer]` and edge `commits doc updates`)
- `skills/radical-pipelines/reference/conventions/setup.md` (the `doc-plan.md` artifact list and guardrail prose listing `doc-writer`/`doc-reviewer`)
- `skills/radical-pipelines/reference/pipeline-versioning.md` (the completion predicate, which must read `3-plan/docs-plan-review-approved.md`)

**Derived copies of the names:**
- `.rp.md` — the Agent models table (lines 90/91/94/95). The orchestrator resolves each agent's model by an exact `name:` match, so the table must carry the plural names.
- `website/demo.js` — the pipeline demo's task / reads / writes / completion arrays use the agent and plan-artifact names. (Its `document.*` DOM calls are protected by the `(?!ument)` guard.)
- `README.md` (line 112) — the Pi-package install list enumerates every shipped agent profile and currently names the four agents singular. Brought into scope by an owner-approved spec amendment. README's already-plural mentions stay untouched: the "Docs" phase label (line 32) and `docs-summary.md` (line 157).

**Pending changeset:**
- `.changeset/agent-scoped-guardrails.md` (line 5) — refers to `doc-writer`, `doc-reviewer`, and the compound `doc-phase`; the substitution makes all three plural (`docs-writer`, `docs-reviewer`, `docs-phase`, parallel to `code-phase`).

**Protected, untouched components:** the phase-2 `design-doc` concept everywhere it appears (identifiers, files, frontmatter, artifacts, Mermaid labels, prose); the long word "documentation"/"document"; already-plural `docs`/`Docs`/`docs-*`; `.pipelines/**` historical records; published `CHANGELOG.md`; and files with no concept reference (`AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `package.json`, `.claude-plugin/`, `.pi/`, `.github/`, `scripts/`, the rest of `website/`). The discovery contract has no manifest: `.claude-plugin/plugin.json` and `marketplace.json` list no agents, so the `git mv`s are the only touchpoint a rename must address.

## Interfaces and Data Flow

**The naming rule (formal).** A `doc` word-token is rewritten to `docs` iff it is (a) not preceded by `design-`/`design␣` (case-insensitive), (b) immediately followed by a hyphen or space, and (c) not already `docs`/`document…`. The leading token's case is preserved (`doc-` → `docs-`, `Doc␣` → `Docs␣`).

**Step 1 — the four manual rewords**, each anchored on a unique literal span (the spaced path is quoted):

```
perl -i -pe 's/\bthe doc faithfully reflects\b/the design doc faithfully reflects/' agents/design-doc-reviewer.md
perl -i -pe 's/\bwho the doc is for\b/who the surface is for/' "skills/radical-pipelines/reference/assisted-phases/3 - plan.md"
perl -i -pe 's/\ba reference doc may\b/a reference page may/' agents/doc-writer.md
perl -i -pe 's/\binto a reader-facing doc\b/into a reader-facing page/' agents/doc-writer.md
```

After step 1 the oracle reads 157 — three rewords each removed one leading-token match; the fourth ("a reader-facing doc") is a bare end-of-token `doc` the oracle never matched, so it does not change the count (it matters only for the separate "no bare singular concept token remains" guarantee).

**Step 2 — the single substitution**, iterated null-safely so the two space-named phase files are handled correctly:

```
PAT='(?<![Dd]esign[- ])\b([Dd]oc)(?![Ss])(?!ument)\b(?=[- ])'
find skills agents .rp.md website .changeset README.md -type f -print0 | while IFS= read -r -d '' f; do
  perl -i -pe "s/$PAT/\${1}s/g" "$f"
done
```

Pattern by clause:
- `(?<![Dd]esign[- ])` — case-insensitive lookbehind; leaves `design-doc`/`Design Doc` (and the `doc-writer`/`doc-reviewer` substrings inside `design-doc-writer`/`design-doc-reviewer`) unmatched.
- `\b([Dd]oc)` — captures the leading token, preserving its case in `$1`.
- `(?![Ss])` — leaves already-plural `docs`/`Docs` unmatched; this is also the idempotency guard.
- `(?!ument)` — leaves `document`/`documentation` (and JS `document.*`) unmatched.
- `\b(?=[- ])` — the token must be immediately followed by a hyphen or space; the lookahead does **not** consume it, so the trailing punctuation and the following word survive verbatim.
- Replacement `${1}s` appends `s` to the case-correct captured token: `doc-writer` → `docs-writer`, `Doc Plan` → `Docs Plan`.

After step 2 the oracle reads 0. The Mermaid nodes/edges and every title-case label (`Docs Plan`, `Docs Plan Review`, `Docs Plan Topics`, `Docs Writer`, `Docs Reviewer`, `Docs Plan Writer`, `Docs Plan Reviewer`, the plan title `# Docs Plan: <feature name>`, the edge `commits docs updates`) are produced here as ordinary `[D]oc␣`-led tokens — no separate Mermaid or label step is needed.

**Step 3 — the four renames** (`git mv` preserves history and stages each as a rename-with-modification, `RM`):

```
git mv agents/doc-plan-writer.md   agents/docs-plan-writer.md
git mv agents/doc-plan-reviewer.md agents/docs-plan-reviewer.md
git mv agents/doc-writer.md        agents/docs-writer.md
git mv agents/doc-reviewer.md      agents/docs-reviewer.md
```

**Data flow / ordering dependency.** Step 1 → Step 2 → Step 3 is the required order. Step 1 must precede step 2 (the rewords remove tokens the substitution would otherwise corrupt). Step 2 must precede step 3 because the substitution's file list targets the old `doc-*.md` filenames; renaming first would leave them outside the file loop. The four phase/space-named files are never renamed (their stems are phase numbers, not the concept); spaces matter only for quoting the substitution's file list.

## Key Decisions

### Decision: A single anchored substitution, not per-form edits

- **Choice:** One regex anchored on the leading `doc`/`Doc` token, applied uniformly across the in-scope files, rather than enumerating and editing each compound/phrase form.
- **Alternatives:** A list of literal find-replace pairs per form (`doc-plan` → `docs-plan`, `doc tasks` → `docs tasks`, …); manual editing file by file.
- **Trade-offs:** Enumeration risks missing a form (especially trailing inflections like `-writers`/`tasks`) and drifts from the oracle. Anchoring on the leading noun and never reading the trailing word catches every form by construction and makes the substitution pattern the oracle pattern plus a replacement — so the change set provably equals the oracle's count set. The cost is reliance on a non-trivial regex with lookbehind/lookahead, mitigated by the verification suite.
- **Traces to:** Requirements 1, 3, 4, 5; Acceptance criterion on the zero-match oracle.

### Decision: Rewords-before-substitution ordering

- **Choice:** Apply the four Requirement-8 rewords first, then run the substitution; no carve-out in the pattern.
- **Alternatives:** Add lookarounds to the substitution to exclude the four single-document phrases; reword after substituting and fix collateral damage.
- **Trade-offs:** A dry run proved the hazard: substituting `doc-writer.md` without rewording first turned "a reference doc may" into "a reference **docs** may". Special-casing those phrases in the pattern would complicate it and couple it to specific prose. Rewording first removes the offending token cleanly so the substitution never sees it — ordering alone suffices, keeping the pattern minimal.
- **Traces to:** Requirement 8; Acceptance criterion on the four disambiguated rewords.

### Decision: `perl -i -pe`, not `sed`

- **Choice:** Execute both reword and substitution steps with `perl`.
- **Alternatives:** `sed -i` (the more common in-place editor).
- **Trade-offs:** The pattern's lookbehind/lookahead require Perl-compatible regex; macOS/BSD `sed` does not support them. `perl` is present on macOS and Linux and matches the oracle's `grep -P` dialect exactly, so the substitution and the verification share one regex engine. Verified this machine's `perl` runs the pattern correctly.
- **Traces to:** Requirements 1, 3, 5; the oracle uses `grep -P`.

### Decision: Null-safe `find -print0` file iteration

- **Choice:** Iterate the file list with `find … -print0 | while IFS= read -r -d ''`.
- **Alternatives:** `for f in $(grep -l …)` or a glob.
- **Trade-offs:** Two phase files contain literal `" - "` (space-hyphen-space) and carry the bulk of the matches; a word-splitting loop would split on those spaces and corrupt the loop, silently skipping or mangling files. Null-delimited iteration handles the spaces correctly. The cost is a slightly more verbose loop.
- **Traces to:** Requirements 3, 4, 5 (the bulk of matches live in the space-named files).

### Decision: `git mv` the four agent files

- **Choice:** Rename each concept agent's file so its stem equals its plural `name:`, using `git mv`.
- **Alternatives:** Edit `name:` without renaming; rename without editing `name:`; plain `mv`.
- **Trade-offs:** Agents are discovered purely by filename, with no manifest to update; a stem that disagrees with `name:` leaves the agent mismatched and undiscoverable. `git mv` preserves history and stages the rename as `R`, keeping the change auditable; the substitution already flipped `name:` and the body while the files still had their old names.
- **Traces to:** Requirement 2; Acceptance criteria on matching `name:`, on the old files being gone, and on positive existence of the new files.

### Decision: Bring `README.md:112` into scope

- **Choice:** Pluralize the four agent names in README's Pi-package install list and extend the oracle scope to include `README.md`.
- **Alternatives:** Leave README out of scope (its original classification as "no concept references").
- **Trade-offs:** That classification was factually wrong — line 112 names all four concept agents singular. Leaving it would re-create the exact singular-vs-plural contradiction this change exists to eliminate, in the most-read file, and the original oracle scope would not catch it. Including README applies the same rule by the same substitution at no extra mechanism. The owner amended the spec to adopt this; the baseline restates as 164 (160 + the four README tokens at line 112).
- **Traces to:** Requirement 6; the spec amendment; Acceptance criterion on the derived-copies check and the README-inclusive oracle.

## Dependencies

No new internal or external dependencies. The change uses tools already required by the repo: `perl` (for the in-place edits and the substitution) and `git mv` (for the renames). Verification uses `grep -P` and shell `test`/`for`. All are present on macOS and Linux.

## Failure Modes and Observability

- **Over-pluralization (`docss`) or `design-doc` corruption (`design-docs`):** prevented by the `(?![Ss])` and `(?<![Dd]esign[- ])` guards, which are evaluated per-match, not per-line, so a protected token never shields an adjacent in-scope token and vice versa. Detected by the scope-independent invariants `grep -roiP 'docss' … | wc -l` → 0 and `grep -roiP '[Dd]esign[- ]docs' … | wc -l` → 0.
- **A concept token missed:** detected by the zero-match oracle. Because the substitution mirrors the oracle, a non-zero post-run oracle count points directly at any straggler.
- **"Satisfied by deletion":** the absence oracle alone could be passed by deleting files, so positive existence is checked separately — each of `agents/docs-{plan-writer,plan-reviewer,writer,reviewer}.md` must exist with a matching `name:`.
- **Stale straggler greps:** any ad-hoc straggler check must use the per-match oracle (the `(?<![Dd]esign[- ])` lookbehind), never a line-level `grep -v 'design-doc'` filter — README:112 carries concept names and `design-doc-*` names on the same line, so a line-level filter would wrongly drop the line and hide the stragglers (the bug that originally masked README).
- **No runtime observability needs:** this is a static prose change; correctness is observed entirely through the verification suite at change time, plus the agents remaining discoverable (their stems match their `name:`).

## Verification

The acceptance suite, dry-run-verified end-to-end (164 → 0):

```
# 1. Zero leading-noun matches (the oracle, README in scope):
grep -roiP '(?<![Dd]esign[- ])\b[Dd]oc(?![Ss])(?!ument)\b[- ]' skills agents .rp.md website .changeset README.md   # → 0 (164 before)

# 2. Positive existence (guards against satisfied-by-deletion):
for n in docs-plan-writer docs-plan-reviewer docs-writer docs-reviewer; do
  test -f "agents/$n.md" && grep -qE "^name: $n\$" "agents/$n.md" && echo "$n OK"; done

# 3. Old names gone:
for o in doc-plan-writer doc-plan-reviewer doc-writer doc-reviewer; do
  test ! -e "agents/$o.md" && echo "$o removed"; done

# 4. No corruption (scope-independent):
grep -roiP 'docss' skills agents .rp.md website .changeset README.md | wc -l             # → 0
grep -roiP '[Dd]esign[- ]docs' skills agents .rp.md website .changeset README.md | wc -l  # → 0
```

Non-corruption counts (in-scope: `skills agents .rp.md website .changeset`): `design-doc`/`Design Doc` 239 → 240 (the single Requirement-8 disambiguation in `design-doc-reviewer.md` adds one "design doc" reference; none is consumed); `document`/`documentation` 118 → 118 (unchanged). The robust, scope-independent invariant is zero `docss` and zero `design-docs`.

## Risks and Open Questions

- **Regex portability.** The pattern requires Perl-compatible regex; the recipe must use `perl` (not macOS/BSD `sed`) and `grep -P`. Mitigated by the verified `perl` recipe and the matching oracle; called out so the implementer does not substitute `sed`.
- **Shell-quoting of the replacement.** With the pattern in a shell variable and a double-quoted perl program (`perl -i -pe "s/$PAT/.../g"`), the replacement must be `\${1}s` so the shell does not expand `$1` before perl. With a single-quoted program, write `${1}s`. The spaced path in step 1 must be quoted. Mitigated by the recipe above using the correct form.
- **Idempotency.** A second run is a no-op via the `(?![Ss])` guard (verified: oracle stays 0, `docss` stays 0), so re-running the substitution is safe.
- **Experiment leftover.** The research applied the recipe in place then reverted; a shelved copy remains as `git stash@{0}` ("wip-134-substitution-experiment") because the safety-net blocks `git stash drop`. It is harmless (not on the tree); the implementation reproduces the result from the recipe, not the stash.
- No open questions remain — the approach is fully settled and dry-run-verified.
