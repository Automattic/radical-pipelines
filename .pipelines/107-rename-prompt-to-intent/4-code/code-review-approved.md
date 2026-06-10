# Code review — APPROVED

**Batch:** Tasks 1–5 (Groups A–E) of issue #107, "rename the phase-0 artifact prompt → intent".
**Range reviewed:** `dddf0d7..HEAD` (commits `fdbe1b3`, `157b847`, `3810a2e`, `6e5accc`, `8b58c53`).
**Verdict:** APPROVED. Group F verification executed in full against the live tree; every acceptance
check and spot-check passes.

## Group F verification results

### Acceptance greps (the verifiability backbone)

1. **Path tokens → 0.** `git grep -nIE "0-prompt|prompt\.md" -- ':!.pipelines'` → **0** hits. PASS.
2. **Phase-label forms → 0.** `git grep -nIE "0 [-–] Prompt|Phase 0\. Prompt|\(Prompt " -- ':!.pipelines' ':!.rp.md'` → **0** hits. PASS.
3. **Residual "prompt" = the 25 KEEP lines.** `git grep -nIi "prompt" -- ':!.pipelines' ':!.rp.md'` →
   **26** occurrences, fully accounted for:
   - **25 KEEP** = agents 14 + skills 6 + website 4 + README 1 — every one a legitimately-generic
     KEEP (launch/spawn/orchestrator's/loop prompts, `cc-prompt` CSS class + its `website/styles.css`
     selector, "prompt engineering" SEO, "same prompt, the same context" + "Same prompt, different
     run" non-determinism copy). Exactly matches the spec's R3 list. None changed.
   - **+1** = `.changeset/rename-prompt-to-intent.md:5`, the changeset summary that *describes* the
     rename ("…from \"prompt\" to \"intent\""). This file did not exist when the spec's 25-count was
     computed, so it is an expected, legitimate new occurrence — not a missed rename. PASS.

### Changeset gate (authoritative)

`npm ci` succeeded (321 packages, 0 vulnerabilities), then `npx changeset status` exited 0:
`@automattic/radical-pipelines` bumped at **minor**. The changeset file has valid frontmatter, the
real package name, and a non-empty rename summary — structurally identical to existing changesets
(e.g. `per-agent-model-config.md`). PASS.

### Spot-checks

- **No old-name trace in the skill.** `git grep -iE "formerly prompt|backward.?compat|dual.?name|migrat|legacy.{0,20}prompt|previously called|renamed from"` over `skills/ agents/ README.md website/` → 0 hits. PASS.
- **`create-pipeline.md` clause rewrite.** The crux bullet now reads "Adapt the issue content into
  the intent that seeds the subsequent phases." — says "intent", does NOT assert "intent directed at
  the agents". The following "Do not add requirements, technical directions, or implementation
  details…" bullet is byte-unchanged (context line, no +/- in the diff). PASS.
- **demo.js string-consistency.** All three `'prompt.md'` literals (the two `reads` arrays + the
  `pendingTree` array) renamed to `'intent.md'` together; the log line and SOFT comment renamed; the
  `cc-prompt` class + its `> work on issue #1234` literal untouched. String-equality tree-commit
  animation stays consistent. PASS.
- **No behavior change.** The diff is text/string renames + the one clause rewrite + the changeset
  only. Diff stat: 20 files, 61 insertions / 56 deletions (the +5 net is the new 5-line changeset).
  No logic, control-flow, or file-read-order edits. PASS.
- **Out-of-scope untouched.** `git diff --name-only dddf0d7..HEAD` = exactly the 19 edited files + 1
  new changeset (20 total). None of `.rp.md`, anything under `.pipelines/` (0 files, incl. this run's
  own `0-prompt/`), the 13 pure-KEEP files, `website/styles.css`, or `requirements.md` (its
  `index.html` span is a byte-unchanged context line). PASS.

### Byte-structure / integrity

- All four phase tables (`SKILL.md`, `assisted-workflow.md`, `autonomous-workflow.md`,
  `pipeline-versioning.md`) keep column alignment — same-length swaps as designed.
- `pipeline-versioning.md:27` keeps the en-dash: `| 0 – Intent | `0-intent/intent.md` |` (– U+2013).
  Every `0-prompt` instance in the trie / ASCII tree (incl. two-per-line) renamed.
- No path mixups (`0-intent/prompt`, `0-prompt/intent`) anywhere in scope.

## Per-group sign-off

- **Group A (skill core + 12 files)** — every FOLDER/FILE/LABEL/SOFT renamed; clause rewrite correct;
  the autonomous-workflow "agent's initial prompt" KEEP preserved. APPROVED.
- **Group B (4 agent profiles)** — spec-analyst fully renamed; spec-writer keeps its
  orchestrator's-prompt line; spec-reviewer single path token renamed; spec-consolidator keeps its
  spawn-prompt line. APPROVED.
- **Group C (README)** — LABEL + two SOFT renamed; non-determinism KEEP preserved. APPROVED.
- **Group D (website)** — demo.js three-literal + log + comment; index.html `ls` span; CSS/SEO/copy
  KEEPs and `requirements.md` preserved. APPROVED.
- **Group E (changeset)** — minor bump, valid, gate passes. APPROVED.
