# Spec — Adopt the prompt → intent rename in the reviews feature

## Overview

PR #109 (merged to trunk on 2026-06-10) renamed the pipeline's phase-0 artifact from **prompt** to **intent** across the skill, agent profiles, README, and website. This branch — the reviews feature (PR #106) — predates that rename and still refers to the phase-0 input as "prompt" (e.g. the new `prompt-format.md` reference and `0-prompt/prompt.md` paths in the review procedure).

This review makes PR #106 fully consistent with that rename: everything the feature introduces or touches refers to the phase-0 artifact as **intent** (`intent.md`, `0-intent/`, phase "Intent"), so the feature carries no stale phase-0 "prompt" terminology and will merge cleanly onto trunk.

The rename is applied **directly to this branch's files**. This review run does **not** run `git merge trunk` (nor rebase onto trunk), because the framework's review model reuses the existing branch, never touches trunk, syncs with main only at pipeline creation/fork, and diffs a review against the prior-run tip (`review-pipeline.md:3,25-31`; `pipeline-versioning.md:3,21-28,32`). Reconciling the branch with the rest of trunk is the human's action at PR-merge time, not this review's. Consequently, applying the rename directly means **aligning each phase-0 occurrence to trunk's actual post-#109 wording** (so the eventual human merge re-introduces no divergence) — not performing a blind token substitution.

The governing rule is **per-occurrence, not per-file**. For any single phase-0 "prompt" occurrence: if #106 did not touch that line (it is byte-identical to its pre-rename form), bring it to **trunk's actual post-#109 text** — a clean token swap *except* the four non-mechanical edits enumerated in requirement 9; if #106 added or rewrote that line, apply #109's rename *boundary* to #106's content, preserving #106's structure. A single file can contain occurrences of **both** kinds. `README.md` is the example: its three phase-0 lines (27, 56, 112) are #106-untouched and take trunk's text, while #106's expanded run-folder paragraph (~line 152, which carries no phase-0 token) is left exactly as #106 wrote it. The "Group C / Group D" headings below organize files by where the *bulk* of their phase-0 occurrences fall; they do not override the per-occurrence rule.

The rename is scoped strictly to the **phase-0 sense** of "prompt" (the input artifact a pipeline run starts from). The **generic sense** of "prompt" that #109 deliberately preserved — LLM/launch/spawn/loop prompts, the `cc-prompt` CSS class, and SEO copy — is left untouched.

## Requirements

### Terminology

- **Phase-0 sense of "prompt"**: the input artifact a pipeline run starts from (the phase label "Prompt", the `0-prompt` folder token, the `prompt.md` file token, and prose naming the phase-0 input such as "the prompt" / "the base prompt" / "the review prompt" / "the review's prompt"). This is what gets renamed to "intent".
- **Generic sense of "prompt"**: LLM prompts, agent launch/spawn prompts, the health-monitor "loop prompt" / "self-contained prompt" / `/loop <prompt>` template, the `cc-prompt` CSS class, the website "Same prompt, different run" copy, and the `prompt engineering` SEO keyword. This is **not** renamed (it matches #109's deliberately-preserved boundary).

### The rename boundary

1. Rename only the **phase-0 sense** of "prompt" to "intent":
   - phase label "Prompt" → "Intent",
   - folder token `0-prompt` → `0-intent`,
   - file token `prompt.md` → `intent.md`,
   - phase-0 input prose: "the prompt" → "the intent", "the base prompt" → "the base intent", "the review prompt" → "the review intent", "the review's prompt" → "the review's intent".
2. Preserve the **generic sense** of "prompt" verbatim. Do not touch LLM/launch/spawn prompts ("orchestrator's launch/spawn prompt", "orchestrator's prompt cited a review file", "initial prompt"), the health-monitor loop/self-contained prompt and `/loop <prompt>` template, the `cc-prompt` CSS class, the website "Same prompt, different run" copy, or the `prompt engineering` SEO keyword.
3. For every file that #109 already covered, bring each phase-0 occurrence to **trunk's actual post-#109 wording**, not a mechanical swap. The four known non-mechanical exceptions are specified in requirement 9.

### Group C — phase-0 occurrences #106 did not touch (bring to trunk's exact text)

The phase-0 occurrences in these files are pre-rename staleness #106 never touched, so each is brought to trunk's exact post-#109 text. These occurrences are clean token swaps **except** for the non-mechanical edits enumerated in requirement 9 — two of which fall in Group C files (`SKILL.md`'s phase-0 row and `README.md:112`). Where a Group C file's non-phase-0 content was touched by #106 (e.g. README's run-folder paragraph), that content is left alone per the per-occurrence rule.

4. Apply the phase-0 rename, matching trunk verbatim, to:
   - **Agent profiles**: `agents/spec-analyst.md`, `agents/spec-consolidator.md`, `agents/spec-reviewer.md`, `agents/spec-writer.md` (their diff vs. trunk is purely phase-0 terminology).
   - `skills/radical-pipelines/SKILL.md` — description "(Prompt → …)" → "(Intent → …)"; phase-0 table row per requirement 9.
   - `skills/radical-pipelines/reference/assisted-phases/1 - spec.md`, `2 - design-doc.md`, `3 - plan.md` — the `prompt.md` references in their input / standalone-reader lists.
   - `skills/radical-pipelines/reference/autonomous-phases/1 - spec.md` — phase-0 input path and "phase 0 (prompt)".
   - `skills/radical-pipelines/reference/assisted-workflow.md` and `autonomous-workflow.md` — phase-0 table row "0 - Prompt / 0-prompt" → "0 - Intent / 0-intent". The autonomous-workflow "initial prompt" spawn line is generic — keep it.
   - `skills/radical-pipelines/reference/conventions/setup.md` — the `prompt.md` artifact-list entries and the "initial prompt" / "pulls its initial prompt from an issue" phase-0 prose → intent, per trunk. (Its overrides-related divergence from trunk is out of scope — see requirement 12.)
   - `README.md` — **only its three phase-0 lines** (README's #106-touched run-folder paragraph at ~line 152 is left untouched per the per-occurrence rule): line 27 heading "Phase 0. Prompt." → "Phase 0. Intent."; line 56 completion-rate "from prompt to" → "from intent to"; line 112 agent-profile parenthetical — **non-mechanical, see requirement 9** (trunk DROPS "raw").
   - `website/index.html` — `<span class="file done">prompt.md</span>` → `intent.md`. Keep the "Same prompt…" copy (line 153) and the "prompt engineering" SEO keyword (line 12).
   - `website/demo.js` — `reads:` arrays (lines 12, 23), tree entry (line 140), captured-issue log line (276) `→ prompt.md` → `→ intent.md`, comment (281) "Phase 0 is the raw prompt" → "raw intent". Keep the `cc-prompt` class (line 271).

### Group D — files where trunk's rename is applied ONTO #106's own additions

For these files, both #109 (rename) and #106 (reviews feature) edited overlapping content. The end-state **combines** trunk's intent terminology with #106's additions and must **not** discard #106's structure to "take trunk".

5. `skills/radical-pipelines/reference/create-pipeline.md` — keep #106's `base/` run-folder path and its reference to the shared format file, with intent naming. Rename every phase-0 token in the file: the description on line 3 ("writes `prompt.md`" → "writes `intent.md`", matching trunk's line-3 rename); the heading "Generate the initial prompt" (this "initial" prompt is the phase-0 input being created — rename to "Generate the initial intent"); the path "write the prompt to `<artifacts-folder>/base/0-prompt/prompt.md`" → "write the intent to `<artifacts-folder>/base/0-intent/intent.md`"; the folder creation "`base/0-prompt/`" → "`base/0-intent/`"; and the asset-reference line "place them in `<artifacts-folder>/base/0-prompt/`. Reference them explicitly in `prompt.md`" → "…`base/0-intent/`. Reference them explicitly in `intent.md`". Apply trunk's rephrased bullet (requirement 9) within #106's structure.
6. `skills/radical-pipelines/reference/fork-pipeline.md` — every phase-folder token `0-prompt` → `0-intent` (including `base/0-prompt` → `base/0-intent`); "only the prompt is inherited" → "only the intent is inherited". Keep #106's `base/` run-folder phrasing.
7. `skills/radical-pipelines/reference/pipeline-versioning.md` — phase-folder table row `| 0 – Prompt | 0-prompt/prompt.md |` → `| 0 – Intent | 0-intent/intent.md |`; ASCII-tree root and `base/0-prompt` tokens → intent; review-run prose "the review's prompt", "the prompt commit", "base prompt", "its prompt is the input to phase 1" (all phase-0 sense) → intent. Keep #106's `base/` run-folder model.
8. `skills/radical-pipelines/reference/manage-issues.md` — **this is the one file where "match trunk" and "preserve #106's design" actively conflict** (it is the fourth non-mechanical #109 edit, requirement 9), so it is **not** a routine union. Trunk both reworded the agent clause AND **inlined** the schema; #106 instead **extracted** the schema into the shared `intent-format.md` and references it. The resolution is **naming-from-#109, structure-and-paths-from-#106**: take #109's *intent* naming but keep #106's extracted-format architecture (do **not** re-inline the schema as trunk did) and #106's `base/0-intent/intent.md` run-folder path (trunk's flat `0-intent/intent.md` does not have the `base/` prefix, so #106's path wins regardless). Target wording: "The issue body _is_ the phase-0 intent — `create-pipeline.md` turns the issue into `base/0-intent/intent.md`. Author the issue using the shared schema, rendering rules, and authoring discipline in `intent-format.md`." and "The authoring discipline in `intent-format.md` applies across all steps below." **Open phase-2 wording call:** whether to also adopt trunk's rewording of the agent clause ("When the pipeline is created, the orchestrator turns the issue into…") in place of #106's "`create-pipeline.md` turns the issue into…" is a phase-2 decision (the research leaves it open); the target above keeps #106's phrasing pending that call. Keeping the shared file is a reviewed #106 design decision (the three prompt-authoring sites the feature introduces; `base/2-design-doc/design-doc.md:158-161`); collapsing to trunk's inline shape would undo it and is out of scope.

### The four non-mechanical #109 edits

9. #109 **rewrote** (did not just retoken) in four places. A blind `prompt → intent` swap is wrong in each, so apply trunk's **actual wording**, not a substitution:
   - **`SKILL.md` phase-0 table row** (#106-untouched → take trunk verbatim): branch `| 0 | Prompt | 0-prompt | The raw request (input, not something to create) |` → trunk `| 0 | Intent | 0-intent | The input |` (description rewritten; column widths re-aligned to match trunk).
   - **`README.md:112`** (#106-untouched → take trunk verbatim): "(phase 0 is the **raw prompt**, an input rather than an agent-produced artifact…" → "(phase 0 is the **intent**, an input rather than an agent-produced artifact…" — trunk **DROPS the word "raw"** (the result is "the intent", **not** "the raw intent"). A clean token swap of "the raw prompt" would yield "the raw intent" and diverge from trunk, which is why this is a non-mechanical edit and not a Group C clean swap. Contrast `website/demo.js:281`, where trunk **KEEPS** "raw" ("Phase 0 is the raw intent" — see requirement 4's demo.js entry): the two files genuinely differ, so follow each file's actual trunk text rather than a uniform "raw" rule.
   - **`create-pipeline.md` "adapt the issue content" bullet** (#106-structured → naming from trunk, structure from #106): "Adapt the issue content into the phase-0 prompt directed at the agents that will run subsequent phases, following the schema and authoring discipline in `prompt-format.md`." → trunk's intent phrasing "Adapt the issue content into the intent that seeds the subsequent phases." plus keep the reference to the shared format file as `intent-format.md` (#106's structure). Whether to also adopt trunk's added bullet ("Do not add requirements, technical directions, or implementation details — agents do their own research in later phases.") is a downstream (phase-2) decision — its substance overlaps with the authoring discipline already centralized in `intent-format.md`, so phase 2 decides whether to add the bullet or rely on the format-file reference (avoiding duplication of the discipline).
   - **`manage-issues.md:14`** (the conflict case — naming from #109, **structure and paths from #106**; do **not** take trunk's text): trunk both reworded the agent clause ("`create-pipeline.md` turns the issue into …" → "When the pipeline is created, the orchestrator turns the issue into `0-intent/intent.md`") **and** inlined the schema ("So this is both the issue template and the intent format. Render these sections…"). This branch applies ONLY #109's *naming* onto #106's *extracted-file* sentence — keep "Author the issue using the shared schema, rendering rules, and authoring discipline in `intent-format.md`." and do **not** re-inline. #106's `base/0-intent/intent.md` run-folder path wins over trunk's flat `0-intent/intent.md`. The "When the pipeline is created, the orchestrator turns…" rewording is an open phase-2 wording call (see requirement 8). This is the one file where "match trunk" and "preserve #106 design" actively conflict.

### Group E — new #106 files renamed by hand (no trunk counterpart)

These two files exist only on this branch; trunk has nothing to merge into them, so they are renamed by hand.

10. **Rename the file** `skills/radical-pipelines/reference/prompt-format.md` → `skills/radical-pipelines/reference/intent-format.md`. Retitle "# The Prompt Format" → "# The Intent Format". Rewrite the body's three phase-0 prose occurrences:
   - line 3: "This describes a prompt — whether a tracker issue body, a base prompt, or a review prompt. The prompt is the input to phase 1." → "This describes an intent — whether a tracker issue body, a base intent, or a review intent. The intent is the input to phase 1.";
   - line 15: "That is a complete, valid prompt." → "That is a complete, valid intent.";
   - line 21 (the "No requirements, design, or implementation." authoring-discipline bullet): "Putting them in **the prompt** pre-empts the phase that exists to produce them." → "Putting them in **the intent** pre-empts the phase that exists to produce them." This "the prompt" is the phase-0 sense (it names the phase-0 input artifact), confirmed by #109's parallel inlined rename of the same bullet on trunk: `manage-issues.md:30` reads "Putting them in **the issue** pre-empts…" (the artifact there is the issue body). In the standalone format file the parallel rename is "the intent".

   The other three authoring-discipline bullets — "Capture, don't converge." (line 19), "Lead with the goal, then invite…" (line 20), and "Reflect hypotheses back as open." (line 22) — carry no phase-0 "prompt" token and are left unchanged. (Only the "No requirements, design, or implementation." bullet in that section is renamed.) The target name `intent-format.md` is unconstrained by any artifact; it is chosen to mirror trunk's "the intent format" phrasing and the `0-intent` / `intent.md` tokens.
11. `skills/radical-pipelines/reference/review-pipeline.md` — rename every phase-0 use to intent:
   - step-5 heading "Author and commit the review prompt" → "Author and commit the review intent";
   - path `review-N-<short-description>/0-prompt/prompt.md` → `review-N-<short-description>/0-intent/intent.md`;
   - "the base prompt is orchestrator-authored" → "the base intent is orchestrator-authored";
   - "a fresh review prompt" → "a fresh review intent";
   - "before the review prompt is committed" → "before the review intent is committed";
   - "issue and base prompts have none" → "issue and base intents have none";
   - "this review run's `0-prompt/` folder" → "this review run's `0-intent/` folder";
   - "issue and base prompts" → "issue and base intents";
   - "`base/0-prompt` are never rewritten" → "`base/0-intent` are never rewritten";
   - "The review prompt is phase 0" → "The review intent is phase 0";
   - "following the schema and authoring discipline in `prompt-format.md`" → "…in `intent-format.md`".
   - Generic "orchestrator-authored" stays.

## Out of Scope

- **`git merge trunk` / rebasing onto trunk** within this review run. The framework reconciles a branch with trunk at PR-merge time (the human's action), not mid-pipeline.
- **Catching the branch up on unrelated trunk drift** — specifically the local-convention-overrides feature (PR #91), e.g. trunk's `## Local overrides` section in `conventions/load.md` and the `.rp.local.md` line in `.gitignore`. This review changes only what the rename requires; the human's eventual merge resolves the rest. (`load.md` and `.gitignore` carry no phase-0 token and are left untouched here.)
- **`.rp.md` — left entirely untouched, no rename.** Its `0 - Prompt` reference (line 35) names a **live external Linear workflow state** (verified on team Billow, state id `6a5b291f-2df2-41ac-8c32-a21be017c9ec`, the team behind issue BILLOW-56); the orchestrator sets the issue to the state whose name equals that string, so renaming the reference without renaming the live state would break the phase-0 status-set at runtime — a behavior change forbidden by a pure rename. The example commit `Add prompt (orchestrator)` (line 54) is likewise kept (generic sense, plus whole-file consistency). #109 left `.rp.md` untouched for the same reasons. The reviews feature's own `.rp.md` additions (the review-run status clause on line 35, "or reviewing" on line 36) stay as-is. Renaming the live Linear state is a separate, optional workspace operation, not part of this review.
- **Frozen prior-run artifact content.** The content of this branch's committed `base/` run artifacts (`base/1-spec/spec.md`, `base/2-design-doc/design-doc.md`, `base/3-plan/code-plan.md`, etc.) and of any other historical `.pipelines/` run records is left as historical record. Precedent: #109 rewrote zero pre-existing `.pipelines/` artifacts and did not even rewrite its own frozen run record (`.pipelines/107-rename-prompt-to-intent/1-spec/spec.md` retains 92 "prompt" mentions on trunk); `pipeline-versioning.md:19` treats run artifacts as immutable. (This branch's `base/0-intent/intent.md` folder/file was already renamed by orchestrator commit `2d6cbe9`; this review neither extends nor undoes that.)
- **Files with only generic "prompt" or no phase-0 token** — left untouched:
  - `conventions/claude-code.md`, `conventions/pi.md`, `health-monitoring.md` (only generic loop/template "prompt").
  - `autonomous-phases/4 - code.md`, `5 - docs.md`, `resume-pipeline.md`, `work-on-an-issue.md` (#106-changed, #109-untouched, zero "prompt" tokens).
  - The 6 reviewer agents (`code-reviewer`, `doc-reviewer`, `code-plan-reviewer`, `doc-plan-reviewer`, `design-doc-reviewer`; note `spec-reviewer` is in Group C because #109 did touch it) — #106-changed, #109-untouched, no phase-0 token.
  - `.changeset/pipeline-reviews.md` — no phase-0 "prompt" term.
- **Any behavior change to the reviews feature itself.** This review only adjusts phase-0 terminology; the reviews mechanics, run-folder model, and agent profiles are otherwise unchanged.

## Acceptance Criteria

1. A grep over the **shipped files** (`skills/`, `agents/`, `README.md`, `website/`) finds **zero** phase-0 path tokens (`0-prompt`, `prompt.md`).
2. The same grep finds **zero** phase-0 label and prose forms: `Phase 0. Prompt`, `Prompt →` / `(Prompt →`, `| 0 | Prompt`, `0 - Prompt` (outside `.rp.md`), `phase 0 (prompt)`, "the/a base prompt", "the/a review prompt", "the review's prompt", and the bare phase-0 form "in the prompt" (the `intent-format.md:21` authoring-discipline occurrence — see requirement 10). The only bare "the prompt" allowed to remain anywhere in shipped files is the generic one on trunk at `agents/code-writer.md:62` ("should not need to read the prompt, spec, design doc…"), which #109 left as "prompt" and this review does not touch.
3. The only remaining "prompt" occurrences in shipped files are **generic-sense**: `cc-prompt`, `/loop <prompt>`, launch / spawn / initial / loop / self-contained prompt, "prompt engineering", and "Same prompt". `.rp.md`'s `0 - Prompt` (line 35) and `Add prompt (orchestrator)` (line 54) also remain.
4. `skills/radical-pipelines/reference/prompt-format.md` no longer exists; `skills/radical-pipelines/reference/intent-format.md` exists; and no shipped file references `prompt-format.md`. The three referencing docs — `create-pipeline.md`, `manage-issues.md`, `review-pipeline.md` — all point to `intent-format.md`. A grep over `intent-format.md` finds **zero** "prompt" tokens (all three phase-0 occurrences — lines 3, 15, 21 of the pre-rename file — are renamed; the new file carries no generic-sense "prompt").
5. `manage-issues.md` still references a shared external format file (the extracted-file architecture is preserved, not re-inlined).
6. Every renamed phase-0 occurrence that #106 did not touch matches trunk's exact post-#109 wording (so the eventual human merge introduces no divergence). In particular, all four non-mechanical edits are correct:
   - `SKILL.md`'s phase-0 row reads `| 0 | Intent | 0-intent | The input |`;
   - `README.md:112` reads "phase 0 is the **intent**, an input rather than an agent-produced artifact…" — **"raw" is removed** (it is **not** "the raw intent"), while `website/demo.js:281` independently reads "Phase 0 is the raw intent" (keeps "raw");
   - `create-pipeline.md`'s "adapt the issue content" bullet uses trunk's "into the intent that seeds the subsequent phases" phrasing;
   - `manage-issues.md:14` keeps #106's extracted-`intent-format.md` reference and `base/0-intent/intent.md` path (not trunk's inlined schema or flat path).
7. The Group D files preserve #106's structure: `create-pipeline.md`, `fork-pipeline.md`, and `pipeline-versioning.md` retain the `base/` run-folder model with intent naming, and `manage-issues.md` retains the shared `intent-format.md` reference rather than trunk's inlined schema.
8. `.rp.md`, `.gitignore`, `conventions/load.md`, the generic-only convention/health-monitoring files, the #106-only no-token files, the 6 reviewer agents, `.changeset/pipeline-reviews.md`, and all frozen `base/` / `.pipelines/` artifact content are unchanged by this review.
