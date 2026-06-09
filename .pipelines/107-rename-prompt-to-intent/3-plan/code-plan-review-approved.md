# Code-plan review — APPROVED

**Artifact:** `3-plan/code-plan.md` (commit `b7d95d9`)
**Reviewer:** `code-plan-reviewer` · iteration N=1
**Verdict:** **APPROVED**

This is a pure mechanical rename ("prompt" → "intent", phase-0 artifact sense only), in-file text
edits plus one clause rewrite plus one new changeset. I reviewed the plan adversarially against the
approved spec (`1-spec/spec.md`, R1–R6 + AC#1–AC#9) and approved design (`2-design-doc/design-doc.md`),
and verified every load-bearing claim against the live tree. The plan is faithful, fully traceable,
correctly partitioned, and every flagged anchor is accurate. No findings block approval.

## What I verified (all against the live tree at `b7d95d9`)

### 1. Before-counts match the plan's premises exactly
- Grep 1 `git grep -nIE "0-prompt|prompt\.md" -- ':!.pipelines'` → **42** (plan says was 42).
- Grep 2 `git grep -nIE "0 [-–] Prompt|Phase 0\. Prompt|\(Prompt " -- ':!.pipelines' ':!.rp.md'` →
  **5**, and the 5 sources are exactly `README.md:27`, `SKILL.md:3`, `assisted-workflow.md:17`,
  `autonomous-workflow.md:39`, `pipeline-versioning.md:27` — matching spec AC#2's named set.
- Grep 3 `git grep -nIi "prompt" -- ':!.pipelines' ':!.rp.md'` → **81** (plan says was 81 = 56
  renames + 25 keeps).

### 2. File partition is exact, complete, and disjoint
The live tree has **32** token-bearing files (excluding `.pipelines/` and `.rp.md`). I confirmed by
set arithmetic that the plan's **19 edited** files and **13 pure-KEEP** files are disjoint and their
union is exactly those 32 — no file dropped, added, double-counted, or mis-assigned. Task file-count
math checks out: Task 1 (12) + Task 2 (4) + Task 3 (1) + Task 4 (2) = 19 edited; + 1 changeset (Task 5)
= 20 touched.

### 3. The 25-KEEP breakdown is correct (agents 14 + skills 6 + website 4 + README 1)
Enumerated from grep-3 output against R3:
- **Agents 14**: code-plan-writer:15; code-reviewer:14,42; code-writer:12,62; design-doc-researcher:8;
  design-doc-writer:15; doc-plan-writer:18; doc-reviewer:14,43; doc-writer:12; spec-researcher:8;
  spec-consolidator:8; spec-writer:15. (code-reviewer / doc-reviewer two lines each, and code-writer:62
  "should not need to read the prompt…" correctly KEPT as the generic launch message — never reads the
  phase-0 artifact.)
- **Skills 6**: autonomous-workflow:59 ("agent's initial prompt"); claude-code:37, pi:36 (`/loop 5m
  <prompt>`); health-monitoring:52,54,70 (loop-prompt template).
- **Website 4**: demo.js:271 (`cc-prompt`); index.html:12 ("prompt engineering"); index.html:153
  ("Same prompt, different run"); styles.css:795 (`.cc-prompt` selector).
- **README 1**: README.md:13 ("The same prompt, the same context").

### 4. Citation hygiene — no dangling or invented IDs (the flagged high-risk area)
Every "Traces to" reference resolves:
- **Spec**: R1–R6 all exist (spec.md §§30,72,101,117,125,136); AC#1–AC#9 all exist (9 numbered
  criteria). Every cited R/AC is real.
- **Design sections** — each citation maps verbatim to a real heading:
  "Per-occurrence specification → Skill" (§§147,149); "Two execution-risk flags" (§125);
  "The one non-mechanical edit: `create-pipeline.md:25` clause rewrite" (§55, exact incl. `:25`);
  "Edit set" (§77); "→ Agent profiles" (§190); "→ README" (§217); "→ Website" (§227);
  "Changeset (mandatory)" (§238); "Verification" (§282). No fabricated anchors.

### 5. Anchor accuracy (each inspected on disk)
- **`create-pipeline.md`**: line 25 is the "Adapt the issue content as a prompt directed at the agents"
  bullet (clause rewrite target); line 26 is the "Do not add requirements…" bullet (KEEP verbatim) —
  exactly as the plan specifies. All 5 grep-3 occurrence lines (3, 21, 23, 25, 27) are covered.
- **`pipeline-versioning.md:27`**: hexdump confirms `e2 80 93` (U+2013 EN DASH), and the line carries
  the path token `0-prompt/prompt.md` on the same line — the plan's en-dash + same-line double-rename
  flag is accurate. The trie/ASCII-tree FOLDER occurrences (lines 61, 66, 70, 75, 89×2, 90×2) are
  covered by "rename every instance," and lines 89/90 do carry the token twice as the plan states.
- **`demo.js`**: three `'prompt.md'` literals at lines 12, 23, 140 (rename together); log line 276;
  comment 281 (SOFT); `cc-prompt` + `'> work on issue #1234'` at line 271 (KEEP) — all confirmed.
- **`index.html`**: line 119 = `<span class="file done">prompt.md</span>` (rename); line 120 =
  `requirements.md` (untouched) — confirmed adjacent and correctly partitioned.
- Multi-occurrence lines confirmed: `manage-issues.md:14` (SOFT×2 + FOLDER + FILE on one line);
  `setup.md` (FILE×2 at lines 48/113 + SOFT at 64); `spec-analyst.md:18` (SOFT + same-line FOLDER+FILE);
  `fork-pipeline.md:14` (two FOLDER + one SOFT).

### 6. Out-of-scope correctly respected
- `.rp.md`: exactly 3 occurrences (line 35 `0 - Prompt` Linear-state label, line 54 "Add prompt
  (orchestrator)" commit example, line 76 `/loop 15m <prompt>`) — plan's "all three" claim is accurate
  and all left untouched.
- This run's own `.pipelines/107-rename-prompt-to-intent/0-prompt/` exists and is correctly left as
  historical data; all `.pipelines/` artifacts excluded.
- `requirements.md` (index.html:120) explicitly preserved.

### 7. Verification task is concrete and non-vacuous
The three Task-6 greps are byte-identical to spec AC#1–AC#3, with correct exclusions (grep 1 omits the
`':!.rp.md'` exclusion, correctly justified because `.rp.md` carries no path token — verified: its
three lines are label/prose, not path tokens). `@changesets/cli` is in `package.json`, so `npx
changeset status` is real; the proposed `.changeset/rename-prompt-to-intent.md` has no collision; and
`.changeset/config.json` `changedFilePatterns` matches the spec/design quote exactly, confirming the
changeset is genuinely mandatory.

## Non-blocking observations (no action required)
- The spec's Out-of-Scope #1 header says `.rp.md` has "both occurrences" while the design and plan more
  accurately say "all three occurrences." The plan/design refinement is correct against the live tree
  and the intent (leave `.rp.md` whole) is identical — not a defect.

## Conclusion
The plan faithfully realizes the approved design, every task is a coherent single-code-writer unit with
Goal / Files / Changes / Depends on / Traces to / Acceptance, ordering on the shared branch is sound
(Tasks 1–5 independent, Task 6 last), and the acceptance is concrete and provable. **APPROVED.**
