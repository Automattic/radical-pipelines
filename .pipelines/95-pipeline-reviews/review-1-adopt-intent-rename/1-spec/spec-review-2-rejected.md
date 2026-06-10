# Spec review 2 — REJECTED

**Spec:** `1-spec/spec.md` — "Adopt the prompt → intent rename in the reviews feature"
**Verdict:** Rejected (iteration 2)
**Reviewer:** spec-reviewer
**Reviewed against:** current `spec-research.md` (through commit `5ed0632` / `9055b72`, the refined per-occurrence record). NB: `spec.md` was written at `0c52652` (10:32:58), 36s **before** the research refinement `5ed0632` (10:33:34), so the spec lags the research record. I reviewed the spec content as it stands in the working tree (the text a downstream agent would read), which carries an **uncommitted** edit to requirement 10 (the `prompt-format.md` line-21 fix from review 1 — now correctly addressed).

## Summary

The previous blocking issue (B1: the missed `prompt-format.md:21` occurrence) is **resolved** in the current working-tree spec — requirement 10 now enumerates all three body edits, names the trunk evidence (`manage-issues.md:30` "in the issue"), and lists the three generic bullets left unchanged. Good.

The spec is still strong on strategy, the `.rp.md` decision, and the extracted-format preservation. It is rejected for a **new blocking issue the refined research now establishes**: the spec recognizes only **two** non-mechanical #109 edits, but there are **four**. The two it misses (`README.md:112` and `manage-issues.md:14`) are not merely under-labeled — for `README.md:112` the spec's own governing rule actively instructs a result that **diverges from trunk**, defeating the spec's central goal that "the eventual human merge introduces no divergence."

## Blocking issue

### B2. `README.md:112` is a non-mechanical edit mis-filed as a "clean token swap" — the spec's rule and its target text contradict each other

**The contradiction.** Group C's governing rule (`spec.md:32`) states: "All occurrences are clean token swaps **except** the two non-mechanical edits in requirement 9." Requirement 9 (`spec.md:56-58`) lists exactly two: `SKILL.md` row 0 and the `create-pipeline.md` bullet. `README.md:112` is a Group C occurrence (`spec.md:41`) **not** in requirement 9, so the spec classifies it as a clean token swap.

But it is not a clean swap. Trunk's actual #109 result drops the word "raw":

- Branch: "(phase 0 is the **raw prompt**, an input rather than an agent-produced artifact…"
- Trunk (`README.md:112`, verified): "(phase 0 is the **intent**, an input rather than an agent-produced artifact…" — **"raw" is removed**.

A clean token swap of "the raw prompt" yields "the raw **intent**" (keeps "raw"), which is **wrong** — it diverges from trunk. So `spec.md:32`'s rule, applied to this occurrence, produces the wrong text, while `spec.md:41`'s inline target ("phase 0 is the intent, an input…") happens to specify the right text. The spec contradicts itself: the rule says "clean swap (keep all words)," the target says "drop 'raw'." An implementer who trusts the stated rule — or who batch-applies the "clean token swap" instruction to Group C — produces "the raw intent" and reintroduces divergence.

**The acceptance criteria will not catch it.** AC1/AC2 (`spec.md:99-100`) grep for path tokens and label forms; "raw intent" matches none. AC6 (`spec.md:104`) requires "matches trunk's exact post-#109 wording" but only spot-checks the two edits it already names (SKILL row, create-pipeline bullet) — README:112 is invisible to it. So the divergence ships silently.

**Contrast that the spec must preserve (it currently gets this right, keep it):** `website/demo.js:281` is the mirror case where trunk **keeps** "raw" — trunk reads "Phase 0 is the raw intent." `spec.md:43` correctly renders demo.js:281 → "raw intent." So the two files genuinely differ: README:112 drops "raw," demo.js:281 keeps it. There is no uniform "raw" rule — each follows its own trunk text. The refined research states this explicitly (`spec-research.md`, A4: "README:112 trunk = '…the intent, an input' (drops 'raw'); demo.js:281 trunk = '…the raw intent' (keeps 'raw'). Follow each file's trunk text; do not generalize.").

### B3. The spec says "two" non-mechanical #109 edits; the refined research establishes **four**

`spec.md` asserts "two" non-mechanical edits in five places: lines 28, 32, the heading at 54, 56 ("in exactly these two places"), and AC6 at 104. The refined research (`spec-research.md`, A4: "Four non-mechanical #109 edits (was tracking two)") establishes four:

1. `SKILL.md` row 0 — present in req 9 ✓
2. `create-pipeline.md` bullet — present in req 9 ✓
3. **`README.md:112`** (drops "raw") — **missing from req 9; mis-filed in Group C** (B2)
4. **`manage-issues.md:14`** (reworded + inlined by #109 — take naming only, keep #106 structure) — **missing from req 9** (B4)

The count and the requirement-9 enumeration must be corrected to four, and the two missing edits called out as non-mechanical so the implementer does not treat them as clean swaps / routine unions.

## Non-blocking issues (fix recommended, but would not alone block)

### B4. `manage-issues.md:14` should be flagged as the non-mechanical edit where "match trunk" and "preserve #106 design" conflict

The spec's req 8 (`spec.md:52`) gives a **correct end-state**: it keeps #106's `base/0-intent/intent.md` path and the extracted `intent-format.md` reference (not trunk's inline schema), with intent naming. That resolution (naming-from-#109, structure-and-paths-from-#106) is right. So this is not an end-state error.

Two refinements, though:
- It is presented in Group D as a routine "union," with no signal that this is the one file where trunk's text and #106's design **actively conflict** — the very point the refined research highlights (A4: "the one file where 'match trunk' and 'preserve #106 design' actively conflict; the resolution is naming-from-#109, structure-and-paths-from-#106"). Flagging it as such guards phase 2/3 against "just take trunk."
- The spec's target adopts trunk's "**when the pipeline is created, the orchestrator turns** the issue into…" rewording. The research records this specific rewording (vs. keeping #106's "`create-pipeline.md` turns the issue into…") as an **open phase-2 wording call** (A4 / Consolidated req 12: "Whether to also adopt trunk's 'When the pipeline is created, the orchestrator turns…' rewording … is a phase-2 wording call"). The spec silently decides it. That may be fine, but the spec should either (a) flag it as a settled decision with rationale, or (b) leave it open as the research does — not resolve a deferred call without saying so.

### B5. State the rename rule per-occurrence, and note that one file can hold both kinds (README is the example)

The spec uses occurrence-level language in the prose ("aligning each phase-0 occurrence," `spec.md:9`; "bring each phase-0 occurrence," `spec.md:28`), which is good. But its structure is organized **per-file** (Group C "take trunk verbatim" vs. Group D "apply onto #106"), which is exactly the framing the refined research warns against (A4: "The rule is PER-OCCURRENCE, not per-file … A file can hold both kinds"). The concrete consequence is missed for README: `README.md` is placed only in Group C, but #106 also expanded README's run-folder paragraph (~line 152, verified via `git diff 3f39bee HEAD -- README.md`). That paragraph carries no phase-0 token, so leaving it untouched is correct and no end-state breaks here — but the spec never states "README has both kinds: take trunk for its three phase-0 lines; leave #106's expanded paragraph alone," which is the clarity the per-occurrence rule is meant to provide and which prevents a future implementer from "taking trunk" wholesale on README and clobbering #106's paragraph.

## Required fixes (for approval)

1. **B2/B3:** Promote `README.md:112` and `manage-issues.md:14` to non-mechanical edits. Renumber/retitle "The two non-mechanical #109 edits" → four; update the count at `spec.md:28`, `:32`, `:54`, `:56`, and AC6 (`:104`). For README:112 specifically, remove it from the "clean token swap" set and state its target as "phase 0 is the **intent**, an input…" with an explicit note that trunk **drops "raw"** (contrast demo.js:281, which keeps it).
2. **B2:** Reconcile `spec.md:32`'s "clean token swap except req 9" rule with the now-four exceptions so the rule and the per-occurrence targets no longer contradict.
3. **B4 (recommended):** In req 8, flag manage-issues.md:14 as the non-mechanical conflict case, and either flag-or-defer the "when the pipeline is created, the orchestrator turns…" rewording rather than silently adopting it.
4. **B5 (recommended):** Add a one-line per-occurrence statement and note README as the example of a file with both kinds.

## What I re-verified (all confirmed against repo/trunk)

- Timeline: `spec.md` committed `0c52652` 10:32:58; research refined `5ed0632` 10:33:34 (36s later) and `9055b72`. The spec predates the refinement.
- `spec.md` has an **uncommitted** working-tree edit (only req 10, the line-21 `prompt-format.md` fix). I reviewed the working-tree content. The line-21 fix is correct (target "the intent"; trunk evidence `manage-issues.md:30` = "in the issue").
- README:112 trunk = "phase 0 is the intent, an input…" — **drops "raw"** (so a clean swap would be wrong). demo.js:281 trunk = "Phase 0 is the raw intent" — **keeps "raw."** The two genuinely differ.
- The other two non-mechanical edits already in req 9 match trunk: `SKILL.md:35` = `| 0 | Intent | 0-intent | The input |`; create-pipeline bullet = "Adapt the issue content into the intent that seeds the subsequent phases."
- manage-issues.md:14 — trunk both reworded ("When the pipeline is created, the orchestrator turns the issue into `0-intent/intent.md`") and inlined the schema; the spec correctly keeps #106's extracted-file structure and `base/` path. End-state correct; classification/flagging is the gap.
- #106 expanded README's run-folder paragraph (~line 152), confirming README holds both a #106-touched section and #106-untouched phase-0 lines.
