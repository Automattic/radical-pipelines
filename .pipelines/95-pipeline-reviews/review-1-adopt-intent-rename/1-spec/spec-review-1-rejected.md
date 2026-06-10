# Spec review 1 — REJECTED

**Spec:** `1-spec/spec.md` — "Adopt the prompt → intent rename in the reviews feature"
**Verdict:** Rejected (iteration 1)
**Reviewer:** spec-reviewer

## Summary

The spec is excellent overall: the strategy (direct rename, no `git merge trunk`) is well-grounded in the framework's review model, the four non-mechanical #109 edits are each verified against trunk's actual wording, the `.rp.md` live-Linear-state out-of-scope call is correct, the `manage-issues.md` extracted-vs-inlined design decision is preserved with the right rationale, and the per-occurrence (not per-file) rule is the right framing. I re-verified every load-bearing claim against the repo and trunk; they hold.

It is rejected for **one concrete, actionable omission**: the spec misses a third phase-0 "prompt" occurrence in the file it renames by hand (`prompt-format.md` → `intent-format.md`), and its current wording would actively steer the implementer into leaving that occurrence as stale "prompt". Because this file is renamed by hand from the spec's enumeration (it has no trunk counterpart to copy), an un-enumerated occurrence will be missed, and the acceptance criteria as written will not catch it.

## Blocking issue

### B1. Requirement 10 omits the phase-0 "prompt" in `prompt-format.md` line 21, and its "unchanged" clause mis-classifies it

**The occurrence.** `skills/radical-pipelines/reference/prompt-format.md:21` (the "No requirements, design, or implementation" authoring-discipline bullet) reads:

> "- **No requirements, design, or implementation.** Acceptance criteria belong to phase 1, architecture to phase 2, task breakdown to phase 3. Putting them in **the prompt** pre-empts the phase that exists to produce them."

"the prompt" here names the phase-0 input artifact — by the spec's own terminology definition (`spec.md:17`, "prose naming the phase-0 input such as 'the prompt'"), this is the **phase-0 sense** that must be renamed to "the intent".

**Trunk confirms it is phase-0, not generic.** PR #109 inlined this exact authoring-discipline bullet into `manage-issues.md`, and it renamed this token. Trunk's `manage-issues.md:30` reads:

> "...task breakdown to phase 3. Putting them in **the issue** pre-empts the phase that exists to produce them."

So #109 treated this token as phase-0 (it became "the issue" because in `manage-issues.md` the artifact is the issue body). In the standalone `intent-format.md`, the parallel rename is **"the intent"**: "Putting them in the intent pre-empts the phase that exists to produce them."

**Why the spec is wrong, not just silent.** Requirement 10 (`spec.md:64`) enumerates exactly two body edits (line 3 and line 15's "valid prompt") and then states: "Generic authoring-discipline prose that carries no phase-0 'prompt' token is unchanged." Line 21 IS in the authoring-discipline section, so the natural reading lumps it under "unchanged" — yet it DOES carry a phase-0 token. The qualifier "that carries no phase-0 'prompt' token" technically excludes line 21 from the "unchanged" set, but the requirement never affirmatively tells the implementer to rename it. The net effect is a directive that points the wrong way: the implementer renders the authoring-discipline section verbatim and leaves "the prompt" stale. (Requirement 11 in the Consolidated Requirements section, `spec.md:226`, repeats the same two-edit enumeration and the same "unchanged" clause, so the omission appears in both.)

**Why acceptance criteria won't catch it.** Acceptance criterion 2 (`spec.md:95`) lists specific forbidden phase-0 prose forms — "the/a base prompt", "the/a review prompt", "the review's prompt" — but NOT bare "the prompt". Acceptance criterion 3 (`spec.md:96`) allow-lists the surviving generic uses (`cc-prompt`, `/loop <prompt>`, launch/spawn/initial/loop/self-contained prompt, "prompt engineering", "Same prompt"); "Putting them in the prompt" is in neither list. So a residual "the prompt" on line 21 falls into a blind spot: not forbidden by AC2, not sanctioned by AC3. The spec's correctness rests on being an exhaustive per-occurrence enumeration; this is the one occurrence the enumeration misses.

**Required fix (small and unambiguous):**

1. In requirement 10 (`spec.md:64`) and requirement 11 (`spec.md:226`), add the third body edit: `prompt-format.md:21` "Putting them in **the prompt** pre-empts the phase that exists to produce them." → "Putting them in **the intent** pre-empts the phase that exists to produce them." Cite trunk's parallel inlined rename (`manage-issues.md:30`, "in the issue") as the evidence that this token is phase-0, so the implementer understands why it changes.
2. Reword the trailing "Generic authoring-discipline prose ... is unchanged" clause so it cannot be read to cover line 21 — e.g. name the specific generic lines that stay (the "Capture, don't converge", "Lead with the goal", and "Reflect hypotheses back" bullets carry no phase-0 token and are unchanged), making explicit that the "No requirements..." bullet IS renamed.
3. Optionally tighten acceptance criterion 2 to forbid a bare phase-0 "the prompt" form (or add a targeted check that `intent-format.md` contains zero "prompt" tokens), so the verification step would catch a regression here.

## Non-blocking observations (not required for approval)

- **`create-pipeline.md:3`** ("Creates a new pipeline through phase 0 — ... writes `prompt.md`, and commits.") is a `prompt.md` file token not separately enumerated in requirement 5, but it is swept by the general file-token rule and would be caught by acceptance criterion 1 ("zero `prompt.md`"). Trunk renames it to "writes `intent.md`". No spec change strictly required, but enumerating it in requirement 5 alongside the line-23 path would make the file's end-state fully explicit and consistent with the per-occurrence discipline the spec adopts elsewhere.
- **`agents/code-writer.md:62`** ("should not need to read the prompt, spec, design doc...") retains "the prompt" on trunk — #109 did NOT rename it. The spec correctly excludes `code-writer` from the rename, and AC2/AC3 correctly do not forbid this bare "the prompt", so the spec is internally consistent here. Flagging only to confirm I checked it: leaving it is correct, and matches trunk.

## What I verified (all confirmed against repo/trunk)

- Branch is `worktree-95-pipeline-reviews`; merge-base with trunk is `3f39bee` (predates #109); trunk has 56 commits not in HEAD. Matches the research.
- All four non-mechanical #109 edits match trunk verbatim: `SKILL.md:35` = `| 0 | Intent | 0-intent | The input |`; `README.md:112` drops "raw" ("phase 0 is the intent, an input"); `website/demo.js:281` keeps "raw" ("Phase 0 is the raw intent"); `create-pipeline.md` bullet = "Adapt the issue content into the intent that seeds the subsequent phases."; trunk's `manage-issues.md` inlined the schema (which the spec correctly directs NOT to take).
- `.rp.md:35` on trunk still reads `0 - Prompt` (the Linear state name) and `:54` still reads `Add prompt (orchestrator)`; the branch's only `.rp.md` diff is the reviews feature's review-run clause, which itself uses `0 - Prompt` consistently. The "leave `.rp.md` untouched" decision is sound.
- `prompt-format.md` exists on the branch; `intent-format.md` does not exist on trunk; the three inbound references are exactly `create-pipeline.md:25`, `manage-issues.md:14` & `:18`, `review-pipeline.md:39` — matching the spec's repoint list.
- The four `spec-*` agents are renamed wholesale on trunk (e.g. "Treat the intent as a hypothesis", "Understand the intent", "synthesize the intent"); Group C's "take trunk's exact text" covers them.
- The exhaustive shipped-file sweep (`git grep` over `skills/ agents/ README.md website/`) surfaced no phase-0 prose occurrence outside the spec's enumeration **other than** `prompt-format.md:21` (B1).
