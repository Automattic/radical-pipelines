# Doc Plan Review — APPROVED

**Artifact reviewed:** `3-plan/doc-plan.md` (commit `7d5bb6b`, "Add doc plan (doc-plan-writer)")
**Verdict:** Approved (iteration 1)
**Reviewer:** doc-plan-reviewer

## Summary

The doc plan is correct, complete, and drift-resistant for this review. Because this repo's docs **are** the
product, the rename's documentation surface is fully enumerated as concrete edits in the code plan's 14 tasks;
the doc plan correctly does not restate those edits and instead records only the documentation work that lives
*outside* the shipped-file edits — the changelog stance (a verified no-op), the doc-facing verification gate,
and the deliberately-untouched out-of-scope surfaces. That deliberate thinness is the right call here, not a
gap. Every load-bearing factual claim in the plan was independently verified against the repo and holds.

## What I verified (adversarial pass)

### 1. Changelog stance is factually correct (item 1)
- `.changeset/pipeline-reviews.md` contains **zero** "prompt" matches (`grep -in prompt` → no matches), so the
  rename does not make it stale. The plan's claim is exact.
- Trunk's rename changeset (`.changeset/rename-prompt-to-intent.md`) is quoted verbatim and accurately:
  "Rename the phase-0 pipeline artifact, folder, and phase label from 'prompt' to 'intent'."
- The branch carries **no** parallel `rename-prompt-to-intent.md` changeset (confirmed by listing `.changeset/`),
  so the plan's "do not add a second changeset / avoid double-announcing in the merged changelog" reasoning is
  sound and the recommended no-op is correct.

### 2. Out-of-scope surfaces are real and correctly characterized (item 3)
- `AGENTS.md` and `CONTRIBUTING.md` both exist and carry **zero** `prompt|intent|phase 0|0-prompt|0-intent`
  tokens. Recording that they were checked (so a later reviewer does not "fix" them, and so their absence from
  the code plan reads as intentional rather than an oversight) is exactly the drift-prevention move this plan
  exists to make.
- The `.rp.md`, `.changeset`, frozen `base/`/`.pipelines/`, and generic-only documentation entries match the
  spec's Out of Scope and the code-plan guardrails.

### 3. Coverage table is complete — nothing falls between the doc plan and the code plan (Coverage section)
- The full phase-0 token surface on the branch (`git grep -lE '0-prompt|prompt\.md'` over `skills/ agents/
  README.md website/`) is exactly the set of files the coverage table maps to Tasks 1–13: the four `spec-*`
  agents, `SKILL.md`, the assisted/autonomous phase docs, both workflow docs, `setup.md`, `create-pipeline.md`,
  `fork-pipeline.md`, `manage-issues.md`, `pipeline-versioning.md`, `review-pipeline.md`, README, and the two
  website files. The three `prompt-format` referrers resolve to `create-pipeline.md`, `manage-issues.md`,
  `review-pipeline.md` (Task 1 renames the file itself). No shipped doc surface is left over for a separate
  doc-writer pass — the plan's central claim holds.
- Note worth recording for the implementer/reviewer: README's phase-0 occurrences are **prose-only**
  (`Phase 0. Prompt` L27, `from prompt to` L56, `raw prompt` L112) — README has no `0-prompt`/`prompt.md` path
  token. The coverage table still correctly maps README to Task 12; this is just why README does not appear in
  a path-token grep.

### 4. The verification gate is sound and drift-resistant (item 2)
- The gate is the documentation-facing subset of the code-plan acceptance suite, independently re-run by the
  doc-reviewer. Its targeted prose/label grep does **not** enumerate every phase-0 prose form (e.g. it omits
  `from prompt to`, the README:56 form) — but the plan also includes the **exhaustive residual inspection**
  ("Every remaining 'prompt' in shipped docs is generic-sense": `grep -rniE 'prompt' skills/ agents/ README.md
  website/`, confirming each hit against a **closed** allowed-generic list). A stale `from prompt to` is not in
  that allowed list, so it would be caught by the catch-all even though the targeted grep misses it. This is the
  same belt-and-suspenders structure the code plan uses (Task 14 checks 2 + 3), and it is what makes the gate
  drift-resistant: any future phase-0 "prompt" form is flagged regardless of whether it was pre-enumerated.
- The gate also covers the failure mode unique to renaming a referenced doc (dangling cross-reference): it
  confirms `prompt-format.md` is gone, `intent-format.md` exists, zero shipped files reference `prompt-format`,
  and exactly the three expected files reference `intent-format`.
- The four non-mechanical wordings are re-checked as documentation accuracy (not a token swap), including the
  intentional README:112 ("raw" dropped) vs `demo.js:281` ("raw" kept) split — both verified against trunk's
  actual text (`README.md:112` → "the intent"; `demo.js:281` → "Phase 0 is the raw intent").

### 5. Audience coverage is complete
- Internal reference docs (`skills/.../reference/`), agent profiles (`agents/`), front-page docs (`README.md`),
  and external website (`website/`) are all inside the gate's grep roots (`skills/ agents/ README.md website/`).
  No documentation audience is unaddressed.

## Alignment with spec and code plan

- The phase-0-only rename boundary, the preserved generic-sense occurrences (`cc-prompt`, loop/spawn/initial
  prompts, "prompt engineering", "Same prompt", `.rp.md` Linear state), and the two resolved deferred decisions
  are all consistent with the spec's Terminology/Requirements and the design doc's Approach/Key Decisions.
- The "who does what" split is correct: code-writer performs the shipped-doc edits and runs the acceptance
  suite (which doubles as the doc-completeness check); doc-writer has nothing to author (the docs are the
  product and were edited in the code phase, and the changelog already exists and is correct); doc-reviewer
  independently re-runs the doc-facing gate. This matches a docs-are-the-product repo where there is no separate
  "now document the code" deliverable.

## Conclusion

No actionable defects. The plan's thinness is correct and complete: it adds exactly the documentation work the
review needs beyond the code-plan edits (a verified no-op changeset, a drift-resistant doc-facing verification
gate, and recorded out-of-scope surfaces), with full audience coverage and a complete coverage map back to the
code plan. Approved.
