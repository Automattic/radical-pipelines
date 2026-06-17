# Code Plan: Unify the documentation concept on plural "docs"

## Overview

This change renames the documentation-phase concept from singular `doc` to plural `docs` across the skill, agent definitions, and the derived copies that ship alongside those names (`.rp.md`, `website/demo.js`, `.changeset/agent-scoped-guardrails.md`, and `README.md`). It is a careful rename of markdown prose, not a code change, governed by one naming rule (the leading concept noun is `docs`; every compound or phrase that leads with the concept noun changes only that leading `doc` → `docs` and preserves the rest exactly) and proven complete by a per-match grep oracle whose count goes from 164 to 0.

The design settled a **fixed three-step procedure**, dry-run-verified end-to-end, with a strict ordering dependency: (1) four manual rewords of single-document "doc" occurrences, then (2) one anchored case-preserving substitution across the in-scope files, then (3) four `git mv` renames of the concept agent files. The tasks below execute those three steps in order, followed by a verification task that runs the design's acceptance suite. Two concepts are deliberately protected and stay singular: the phase-2 `design-doc` concept and the long word "documentation"/"document".

This plan contains no documentation tasks (those belong to the separate docs plan) and no committed structural tests over skill prose (per project rule, the skill is prose, not software). Verification is the one-time grep-based acceptance suite run at change time.

## Tasks

### Task 1: Apply the four single-document rewords

- **Goal:** Reword the four occurrences that use the bare short form "doc" to mean a single document (not the documentation-phase concept) so they no longer carry a bare singular concept token. This must run before the substitution: three of the four sit on a `doc␣`-leading token that the Task 2 substitution would otherwise wrongly pluralize, and the fourth must not be pluralized either.
- **Files to change:**
  - `agents/design-doc-reviewer.md`
  - `skills/radical-pipelines/reference/assisted-phases/3 - plan.md`
  - `agents/doc-writer.md` (two occurrences)
- **Changes:** Apply exactly these four reword commands, each anchored on a unique literal span (the space-named path is quoted):
  ```
  perl -i -pe 's/\bthe doc faithfully reflects\b/the design doc faithfully reflects/' agents/design-doc-reviewer.md
  perl -i -pe 's/\bwho the doc is for\b/who the surface is for/' "skills/radical-pipelines/reference/assisted-phases/3 - plan.md"
  perl -i -pe 's/\ba reference doc may\b/a reference page may/' agents/doc-writer.md
  perl -i -pe 's/\binto a reader-facing doc\b/into a reader-facing page/' agents/doc-writer.md
  ```
  Use `perl` (not `sed`); the rest of the procedure relies on Perl-compatible regex. Do not rename `agents/doc-writer.md` in this task — it is still referenced by its old name in Tasks 2 and 3.
- **Depends on:** none
- **Traces to:** Spec Requirement 8; Spec Acceptance criterion on the four disambiguated rewords; Design "Decision: Rewords-before-substitution ordering"; Design "Step 1 — the four manual rewords".
- **Acceptance:**
  - `agents/design-doc-reviewer.md` reads "the design doc faithfully reflects" where it previously read "the doc faithfully reflects".
  - `skills/radical-pipelines/reference/assisted-phases/3 - plan.md` reads "who the surface is for" where it previously read "who the doc is for".
  - `agents/doc-writer.md` reads "a reference page may" where it previously read "a reference doc may".
  - `agents/doc-writer.md` reads "into a reader-facing page" where it previously read "into a reader-facing doc".
  - The leading-noun oracle (`grep -roiP '(?<![Dd]esign[- ])\b[Dd]oc(?![Ss])(?!ument)\b[- ]' skills agents .rp.md website .changeset README.md | wc -l`) reads **157** — the three reworded leading-token occurrences are removed; the fourth ("a reader-facing doc") was a bare end-of-token `doc` the oracle never matched, so it does not change the count.
  - No other text in these files changes; the substitution token count for `design-doc`/`Design Doc` is unchanged except the single net addition from the `design-doc-reviewer.md` disambiguation.

### Task 2: Run the single anchored, case-preserving substitution

- **Goal:** Rewrite every leading `doc`/`Doc` concept token to `docs`/`Docs` across the in-scope files in one uniform pass, protecting `design-doc`, `document`/`documentation`, and already-plural `docs` per-match. This produces all renamed identifiers, prose forms, display labels, template headings, and Mermaid node/edge labels at once — no separate label or Mermaid step is needed.
- **Files to change:** every file under the in-scope list that carries the leading-noun token. The substitution iterates this exact file list: `skills agents .rp.md website .changeset README.md`. Among them, the seventeen files the design enumerates as carrying the token include:
  - The four concept agent files (still at their old names this task): `agents/doc-plan-writer.md`, `agents/doc-plan-reviewer.md`, `agents/doc-writer.md`, `agents/doc-reviewer.md` — each gets its `name:` frontmatter and every body self-reference (e.g. ``You are the `doc-writer` agent``, the `description:` line) rewritten.
  - The two cross-referencing agents (body reference only, no rename): `agents/code-plan-writer.md` and `agents/code-plan-reviewer.md` — both say "planned separately as `doc-plan.md`"; the artifact reference becomes `docs-plan.md`.
  - Skill reference files: `skills/radical-pipelines/SKILL.md`, `skills/radical-pipelines/reference/assisted-phases/3 - plan.md`, `skills/radical-pipelines/reference/autonomous-phases/3 - plan.md`, `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md` (the Mermaid nodes `B[Doc Writer]`, `D[Doc Reviewer]` and edge `commits doc updates`), `skills/radical-pipelines/reference/conventions/setup.md`, `skills/radical-pipelines/reference/pipeline-versioning.md` (the completion predicate, which must read `3-plan/docs-plan-review-approved.md`).
  - Derived copies: `.rp.md` (Agent models table, lines ~90/91/94/95), `website/demo.js` (the task/reads/writes/completion arrays; its `document.*` DOM calls are protected by the `(?!ument)` guard), `README.md` (line 112 Pi-package install list).
  - Pending changeset: `.changeset/agent-scoped-guardrails.md` (`doc-writer`, `doc-reviewer`, and the compound `doc-phase` → `docs-writer`, `docs-reviewer`, `docs-phase`).
- **Changes:** Run exactly this substitution, iterated null-safely so the two space-named phase files are handled correctly:
  ```
  PAT='(?<![Dd]esign[- ])\b([Dd]oc)(?![Ss])(?!ument)\b(?=[- ])'
  find skills agents .rp.md website .changeset README.md -type f -print0 | while IFS= read -r -d '' f; do
    perl -i -pe "s/$PAT/\${1}s/g" "$f"
  done
  ```
  Notes the code-writer must not deviate from:
  - Use the null-safe `find … -print0 | while IFS= read -r -d ''` loop. A word-splitting loop (`for f in $(…)`) would split on the literal `" - "` in the two phase filenames and corrupt the iteration.
  - With the pattern in a shell variable inside a double-quoted perl program, the replacement must be `\${1}s` (escaped `$`) so the shell does not expand `$1` before perl sees it.
  - Do not modify the pattern. It mirrors the oracle by construction: the `(?<![Dd]esign[- ])` lookbehind leaves `design-doc`/`Design Doc` unmatched (including the `doc-writer`/`doc-reviewer` substrings inside `design-doc-writer`/`design-doc-reviewer`); `(?![Ss])` leaves already-plural `docs`/`Docs` unmatched (also the idempotency guard); `(?!ument)` leaves `document`/`documentation` unmatched; `\b(?=[- ])` requires a trailing hyphen or space without consuming it, so the following word survives verbatim; `${1}s` preserves the captured token's case.
  - Do not run `git mv` in this task; the file list still targets the old `doc-*.md` filenames.
- **Depends on:** Task 1
- **Traces to:** Spec Requirements 1, 3, 4, 5, 6, 7; Spec Acceptance criteria on the zero-match oracle, display/heading/Mermaid labels, plan-artifact identifiers, derived-copies check, and the changeset; Design "Decision: A single anchored substitution, not per-form edits", "Decision: `perl -i -pe`, not `sed`", "Decision: Null-safe `find -print0` file iteration", "Step 2 — the single substitution".
- **Acceptance:**
  - The leading-noun oracle (`grep -roiP '(?<![Dd]esign[- ])\b[Dd]oc(?![Ss])(?!ument)\b[- ]' skills agents .rp.md website .changeset README.md | wc -l`) reads **0**.
  - Each of the four concept agent files (still at old names) has plural `name:` frontmatter: `agents/doc-plan-writer.md` → `name: docs-plan-writer`, `agents/doc-plan-reviewer.md` → `name: docs-plan-reviewer`, `agents/doc-writer.md` → `name: docs-writer`, `agents/doc-reviewer.md` → `name: docs-reviewer`.
  - The phase-3 plan-artifact identifiers read `docs-plan.md`, `docs-plan-review-N-rejected.md`, and `docs-plan-review-approved.md` everywhere the skill and agents read or write them, including the completion predicate `3-plan/docs-plan-review-approved.md` in `skills/radical-pipelines/reference/pipeline-versioning.md` and the cross-references in `agents/code-plan-writer.md` and `agents/code-plan-reviewer.md`.
  - Display labels, template headings, and Mermaid labels are plural: `Docs Plan`, `Docs Plan Review`, `Docs Plan Topics`, `Docs Writer`, `Docs Reviewer`, `Docs Plan Writer`, `Docs Plan Reviewer`, the plan title `# Docs Plan: <feature name>`, the Mermaid nodes `B[Docs Writer]`/`D[Docs Reviewer]`, and the edge `commits docs updates`.
  - `.rp.md`'s Agent models table lists the four agents as `docs-plan-writer`, `docs-plan-reviewer`, `docs-writer`, `docs-reviewer`; `website/demo.js` uses the plural agent names and plural plan-artifact names; `README.md:112` names the four agents `docs-plan-writer`, `docs-plan-reviewer`, `docs-writer`, `docs-reviewer`.
  - `.changeset/agent-scoped-guardrails.md` reads `docs-writer`, `docs-reviewer`, and `docs-phase`.
  - No corruption: `grep -roiP 'docss' skills agents .rp.md website .changeset README.md | wc -l` reads **0** and `grep -roiP '[Dd]esign[- ]docs' skills agents .rp.md website .changeset README.md | wc -l` reads **0**.
  - The phase-2 `design-doc` concept and the word "documentation"/"document" are unchanged (no `design-doc` identifier, file, frontmatter, artifact, Mermaid label, or "design doc" prose altered, beyond the single Task 1 disambiguation).

### Task 3: Rename the four concept agent files with `git mv`

- **Goal:** Rename each concept agent's definition file so its filename stem equals its now-plural `name:`. Agents are discovered purely by filename with no manifest, so this rename is load-bearing for discoverability. It must run after the substitution, which already flipped each file's `name:` and body while the files still had their old names.
- **Files to change (renames):**
  - `agents/doc-plan-writer.md` → `agents/docs-plan-writer.md`
  - `agents/doc-plan-reviewer.md` → `agents/docs-plan-reviewer.md`
  - `agents/doc-writer.md` → `agents/docs-writer.md`
  - `agents/doc-reviewer.md` → `agents/docs-reviewer.md`
- **Changes:** Run exactly these four renames with `git mv` (which preserves history and stages each as a rename-with-modification):
  ```
  git mv agents/doc-plan-writer.md   agents/docs-plan-writer.md
  git mv agents/doc-plan-reviewer.md agents/docs-plan-reviewer.md
  git mv agents/doc-writer.md        agents/docs-writer.md
  git mv agents/doc-reviewer.md      agents/docs-reviewer.md
  ```
  Do not edit file contents in this task — the bodies and `name:` lines were already rewritten in Task 2.
- **Depends on:** Task 2
- **Traces to:** Spec Requirement 2; Spec Acceptance criteria on matching `name:`, on the old files being gone, and on positive existence of the new files; Design "Decision: `git mv` the four agent files", "Step 3 — the four renames".
- **Acceptance:**
  - Each new file exists with a matching `name:`: for `n` in `docs-plan-writer docs-plan-reviewer docs-writer docs-reviewer`, `agents/$n.md` exists and contains `^name: $n$`.
  - Each old file is gone: for `o` in `doc-plan-writer doc-plan-reviewer doc-writer doc-reviewer`, `agents/$o.md` does not exist.
  - `git status` shows the four files staged as renames (`R`/`RM`), preserving history.

### Task 4: Run the full acceptance suite to confirm completeness

- **Goal:** Confirm the change is complete and non-corrupting by running the design's dry-run-verified acceptance suite. This is the verification gate for the whole change; it is a one-time check run at change time, not a committed test.
- **Files to change:** none (verification only).
- **Changes:** Run the four checks from the design's Verification section and confirm the expected results. Any straggler check must use the per-match oracle (the `(?<![Dd]esign[- ])` lookbehind), never a line-level `grep -v 'design-doc'` filter — `README.md:112` carries concept names and `design-doc-*` names on the same line, so a line-level filter would wrongly drop the line and hide stragglers.
  ```
  # 1. Zero leading-noun matches (the oracle, README in scope):
  grep -roiP '(?<![Dd]esign[- ])\b[Dd]oc(?![Ss])(?!ument)\b[- ]' skills agents .rp.md website .changeset README.md   # → 0

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
- **Depends on:** Task 3
- **Traces to:** Spec Acceptance criteria on the zero-match oracle, positive existence, old names gone, and no corruption; Design "Verification" and "Failure Modes and Observability".
- **Acceptance:**
  - Check 1 (oracle) reads **0**.
  - Check 2 prints `OK` for all four of `docs-plan-writer`, `docs-plan-reviewer`, `docs-writer`, `docs-reviewer`.
  - Check 3 prints `removed` for all four of `doc-plan-writer`, `doc-plan-reviewer`, `doc-writer`, `doc-reviewer`.
  - Check 4 reads **0** for `docss` and **0** for `[Dd]esign[- ]docs`.
  - If any check fails, the change is incomplete or corrupting; the failing oracle match points directly at the straggler. Do not consider the change done until all four checks pass.
