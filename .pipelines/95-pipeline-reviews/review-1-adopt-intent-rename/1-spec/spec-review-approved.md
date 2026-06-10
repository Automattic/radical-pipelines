# Spec review — APPROVED

**Spec:** `1-spec/spec.md` — "Adopt the prompt → intent rename in the reviews feature"
**Verdict:** Approved
**Reviewer:** spec-reviewer

## Summary

Approved. The spec is an accurate, internally consistent, and complete per-occurrence specification of the phase-0 "prompt → intent" rename for PR #106. Every finding from my prior reviews is resolved, and I re-verified each load-bearing claim against trunk and the branch. An implementer following this spec literally produces a result that is byte-consistent with trunk on every #109-covered occurrence and preserves #106's design where the two overlap.

> **State note (must be acted on):** the approved content is in the **working tree but uncommitted** — the last spec.md commit (`8f03bf3`) predates this correction. The orchestrator must commit the current working-tree `spec.md` so the approved spec is the one on the branch. This approval is for the working-tree content read in full at review time.

## How prior findings were resolved

- **Review 1 — B1 (missed `prompt-format.md:21`):** Requirement 10 now enumerates all three body edits (lines 3, 15, 21), names the trunk evidence for line 21 (`manage-issues.md:30` = "in the issue"), and explicitly lists the three authoring-discipline bullets that stay unchanged. AC4 adds a zero-"prompt"-tokens check over `intent-format.md`. Resolved.
- **Review 2 — B2 (`README.md:112` mis-filed as a clean swap):** Promoted to requirement 9 as a non-mechanical edit with the explicit "trunk DROPS 'raw'" instruction and the `demo.js:281` contrast. Group C's README entry (line 43) flags line 112 as "non-mechanical, see requirement 9," and the Group C heading/intro (lines 32, 34) is reworded to "phase-0 occurrences #106 did not touch," naming the two Group-C non-mechanical edits (SKILL row, README:112). The line-32-vs-line-41 contradiction from the prior version is gone. Resolved.
- **Review 2 — B3 (count "two" vs "four"):** The count is now consistently "four" — requirement 3, the section heading, requirement 9's opener, and AC6. No "two non-mechanical" claim remains anywhere. Resolved.
- **Review 2 — B4 (`manage-issues.md:14` mislabeled):** Requirement 8 now flags it as "the one file where 'match trunk' and 'preserve #106's design' actively conflict … the fourth non-mechanical #109 edit," states the naming-from-#109 / structure-and-paths-from-#106 resolution, and marks trunk's "When the pipeline is created, the orchestrator turns…" rewording as an **open phase-2 wording call** (reverting to #106's "`create-pipeline.md` turns the issue into…" phrasing pending that call) rather than silently adopting it. Added as the fourth item in requirement 9. Resolved.
- **Review 2 — B5 (per-occurrence rule / "both kinds in one file"):** New Overview paragraph (line 11) states the rule is "per-occurrence, not per-file," uses README as the example of a file with both a take-trunk set (lines 27/56/112) and a left-alone #106 paragraph (~line 152), and clarifies the Group C/D headings organize by bulk and do not override the rule. Resolved.
- **Review 2 non-blocking — `create-pipeline.md:3`:** Folded into requirement 5, which now enumerates every phase-0 token in the file (line-3 description, the "Generate the initial prompt" heading, the path, the folder creation, and the asset-reference line). Resolved.

## What I verified against trunk/repo this round (all confirmed)

- **The four non-mechanical edits match trunk's actual #109 wording:**
  - `SKILL.md:35` → `| 0 | Intent | 0-intent | The input |`.
  - `README.md:112` → "phase 0 is the intent, an input rather than an agent-produced artifact…" — **"raw" removed** (not "the raw intent").
  - `create-pipeline.md` bullet → "Adapt the issue content into the intent that seeds the subsequent phases." (heading → "Generate the initial intent"; line 3 → "writes `intent.md`").
  - `manage-issues.md` on trunk both reworded the agent clause and inlined the schema; the spec correctly keeps #106's extracted `intent-format.md` reference and the `base/0-intent/intent.md` path, taking only #109's naming.
- **The deliberate contrast holds:** `README.md:112` drops "raw"; `website/demo.js:281` keeps it ("Phase 0 is the raw intent"). The spec follows each file's actual trunk text — no uniform "raw" rule. Correct.
- **`intent-format.md` body:** the pre-rename file (`prompt-format.md`) has exactly three phase-0 occurrences (lines 3, 15, 21); the three other authoring-discipline bullets (lines 19, 20, 22) carry no phase-0 token. The spec's enumeration is exhaustive and correct.
- **Internal consistency:** the count is "four" everywhere; Group C's "two of which fall in Group C files (SKILL row, README:112)" + the two structured edits (create-pipeline bullet, manage-issues:14) cleanly partition the four. AC2/AC4/AC6 align with the requirements.
- **Out-of-scope decisions remain sound:** `.rp.md` left untouched (the `0 - Prompt` Linear state and the `Add prompt` example commit match trunk; the branch's only diff is the reviews-feature review-run clause); frozen `base/`/`.pipelines/` content out of scope; overrides drift (#91) left to the human merge; generic-only and #106-only-no-token files untouched.
- **Completeness:** a `git grep` of phase-0 prose/token forms over `skills/ agents/ README.md website/` lands entirely within the spec's enumeration. No phase-0 occurrence falls outside a requirement.

## Notes for downstream phases (not blocking)

- Two items are explicitly deferred to phase 2 as wording calls and should be picked up there: (a) whether `create-pipeline.md` also adopts trunk's added "Do not add requirements…" bullet (vs. relying on the centralized `intent-format.md` discipline, per R13); (b) whether `manage-issues.md:14` adopts trunk's "When the pipeline is created, the orchestrator turns…" rewording vs. keeping #106's "`create-pipeline.md` turns the issue into…". The spec correctly leaves both open rather than pre-deciding them.
