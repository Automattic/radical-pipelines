# Design doc review — APPROVED

**Artifact:** `2-design-doc/design-doc.md` (commit `7e4043a`)
**Spec:** `1-spec/spec.md`
**Verdict:** APPROVED
**Iteration:** N=1

This is a pure mechanical rename ("prompt" → "intent"), no behavior change. I reviewed the
design doc adversarially against the approved spec and verified every load-bearing claim
directly against the live tree (raw command output reproduced below). The design is faithful,
correct, self-contained, and ready for the code phase.

## What I verified against the tree

### 1. No `git mv` — text-only edits (design "Approach", spec criterion 9) ✓

`git ls-files | grep -E '0-prompt|prompt\.md'` returns **only** `.pipelines/` paths; excluding
`.pipelines/` returns nothing. There is genuinely no in-scope `0-prompt/` directory or
`prompt.md` file on disk — every such token in the skill/agents/README/website is text inside a
file. The design's "in-file text edits only, no `git mv`, no path moves" is correct and
evidence-grounded. The code phase must not attempt a folder move.

### 2. The three acceptance greps reproduce exactly ✓

| Grep | Doc claims | Tree returns |
|---|---|---|
| `git grep -nIE "0-prompt\|prompt\.md" -- ':!.pipelines'` | 42 | 42 |
| `git grep -nIE "0 [-–] Prompt\|Phase 0\. Prompt\|\(Prompt " -- ':!.pipelines' ':!.rp.md'` | 5 | 5 |
| `git grep -nIi "prompt" -- ':!.pipelines' ':!.rp.md'` | 81 | 81 |

### 3. The 56-RENAME / 25-KEEP partition is arithmetically sound ✓

Building the exact 25-KEEP line set from spec R3 and subtracting from grep 3 (81 lines):
grep3 − 25 KEEP = **56 RENAME**, and all 25 KEEP lines are present in grep 3 (none missing).
The 25-keep breakdown matches the doc exactly: **agents 14 + skills 6 + website 4 + README 1**.
The residual after removing path-token and label lines is 37 lines = **12 SOFT renames + 25
KEEP**, which is internally consistent with the partition. The post-rename grep-3 residual will
be exactly those 25 KEEP lines.

### 4. The `create-pipeline.md:25` clause rewrite is correct, not a token swap ✓

Verified the section: line 25 is the crux ("Adapt the issue content **as a prompt directed at
the agents** that will run subsequent phases"); **line 26 is a separate bullet** ("Do not add
requirements, technical directions, or implementation details — agents do their own research in
later phases") that contains **no "prompt" token** and stays verbatim. The proposed rewrite
("Adapt the issue content into the intent that seeds the subsequent phases") (a) says "intent",
(b) does not assert "intent directed at the agents", and (c) reads coherently before the
untouched line 26. The line-25 rewrite correctly carries only the "adapt the issue content"
half; the "no requirements" half stays on line 26. Faithful to spec R1's CLAUSE REWRITE and
criterion 6.

### 5. Mixed-file per-occurrence KEEP boundaries are correct ✓

- `spec-writer.md:15` — "If the orchestrator's prompt cited a review file…" is the launch
  message; correctly **KEEP**. Lines 6/12/56/61 rename. Confirmed present as a KEEP in the
  residual.
- `spec-consolidator.md:8` — "Your spawn prompt includes…" is the spawn message; correctly
  **KEEP**. Lines 14/61/80 rename.
- `spec-analyst.md` — no generic "prompt"; all-rename. `spec-reviewer.md` — single
  `0-prompt/prompt.md` path token only. Both confirmed.
- `code-writer.md:62` ("should not need to read the prompt, spec, design doc…") is correctly
  treated as a pure-KEEP file (the code-writer never reads the phase-0 artifact); it is one of
  the 13 untouched files. Confirmed.

### 6. Both execution-risk flags are real and correctly described ✓

- **En-dash flag (flag 1).** `pipeline-versioning.md:27` is `| 0 – Prompt | …` with a genuine
  **U+2013 en-dash** (matched by `\x{2013}`; no hyphen form exists in that file). The doc
  correctly instructs preserving the en-dash (`0 – Intent`) for byte-consistent column alignment
  and renaming the same-line `0-prompt/prompt.md` path token separately. The ASCII-tree
  `0-prompt` occurrences (including lines carrying the token twice — verified lines 89, 90) are
  flagged "rename every instance."
- **demo.js string-consistency (flag 2).** The three `'prompt.md'` literals are at lines 12, 23
  (in `reads` arrays) and 140 (in `pendingTree`) — confirmed; they must rename together so the
  string-equality tree-commit matching still resolves. The log line "→ prompt.md" is at line 276
  (FILE), `cc-prompt` at line 271 (KEEP), the comment at line 281 (SOFT). The doc notes line
  numbers are illustrative and the per-occurrence class is authoritative; the classes are
  correct.

### 7. Edit set = exactly 19 files, complete, no orphaned SOFT file ✓

The union of (path-token files) ∪ (label files) computed from the tree is exactly the 19 files
the doc lists — identical set. Critically, every SOFT-rename file (README.md, spec-analyst.md,
spec-writer.md, autonomous-phases/1 - spec.md, conventions/setup.md, create-pipeline.md,
demo.js) is contained in that union — **no SOFT-only file is orphaned outside the edit set**.
The 13 pure-KEEP files left untouched are correctly enumerated.

### 8. Changeset guidance passes the real gate ✓

`.changeset/config.json` `changedFilePatterns` is exactly
`["skills/**","agents/**",".claude-plugin/**","package.json","README.md"]` as claimed; the change
touches `skills/`, `agents/`, `README.md`, so a changeset is mandatory. The doc's prescribed
frontmatter form (`"@automattic/radical-pipelines": minor` + summary) matches existing changesets
and **passes the shape validator** (`scripts/validate-changesets.mjs`: quoted key, known package
name, valid bump, non-empty body, no pre-1.0 `major`). `minor` is valid and pre-1.0-safe.

### 9. Out-of-scope items are correct ✓

- This run's own `.pipelines/107-.../0-prompt/prompt.md` and the other seven `.pipelines/`
  artifacts (six foldered + two flat-layout) are historical data, left byte-for-byte — confirmed
  on disk.
- `.rp.md` untouched; it has no path token (its `0 - Prompt` is the label form of a live Linear
  workflow state), so it does not affect grep 1; greps 2 and 3 exclude it.
- The Linear workflow states are not renamed (separate operational change).

## Minor, non-blocking observations (not defects)

These do not affect correctness, completeness, or faithfulness; flagged for the code-phase
implementer's awareness only.

1. **The Changeset Gate runs three steps, not one.** `.github/workflows/changeset-gate.yml` runs
   `npm test`, then `node scripts/validate-changesets.mjs`, then `npx changeset status`. The doc
   (and spec R6) describe only `changeset status`. This is not a gap that changes any edit: the
   prescribed changeset shape passes the validator, and `npm test` is unaffected — there is **no
   "prompt" token anywhere in `scripts/`** (verified), so no test references the phase-0 artifact
   name. The code-phase verification could optionally run the validator and `npm test` too, but
   the design's verification plan is sufficient to ship.
2. **"intent" already exists as legitimate prose.** Several in-scope files already use the word
   "intent" in unrelated prose (e.g. `design-doc-analyst.md:26` and
   `assisted-phases/2 - design-doc.md:66` "the authoritative statement of intent for this
   phase"; `manage-issues.md:58` "the stated intent"). The rename's new "intent" tokens will
   coexist with these; there is no acceptance grep for "intent", so no false-positive risk and no
   collision. No action needed.

## Conclusion

The design carries the spec's full in-scope edit set and the RENAME/KEEP partition faithfully —
nothing dropped, nothing invented. The approach (text edits only, no `git mv`) is correct and
evidence-grounded. The one non-mechanical edit is handled precisely. The task decomposition
(6 groups: Skill core, agents, README, website, changeset, verification) is adequate and
unambiguous for the code phase, and the verification plan (three greps to 0/0/25-keep +
`changeset status`) is the right backbone. **APPROVED.**
