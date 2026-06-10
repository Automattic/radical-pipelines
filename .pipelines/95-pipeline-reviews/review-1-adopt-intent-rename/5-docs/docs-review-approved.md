# Docs Review — APPROVED

**Phase:** 5 (Docs) — phase gate
**Verdict:** APPROVED
**Reviewed change:** the shipped documentation edits in commit `d96e033` ("Adopt prompt to
intent rename in reviews feature (code-writer)"), code-reviewer-approved in `200e00e`.
**Base ref diffed against:** `23d4892fa7d05d04c94689bbb87faf275b0efe86` (the run's constant
reviewer base — prior-run tip).

## What this gate is

The doc plan defines no doc-writer authoring tasks: in this repo the docs **are** the product
and were edited in the code phase. The doc plan's item 2 is the gate — independently re-run the
documentation-facing verification (greps + the four non-mechanical wordings + out-of-scope
guardrails), not trusting the prior reports. All checks below were re-run from scratch.

## Results

### 1. No stale phase-0 "prompt" anywhere in shipped docs — PASS

- `grep -rnE '0-prompt|prompt\.md' skills/ agents/ README.md website/` → zero matches.
- `grep -rniE 'Phase 0\. Prompt|\(Prompt →|\| 0 +\| Prompt|0 - Prompt|phase 0 \(prompt\)|base prompt|review prompt|review.s prompt|the raw prompt' skills/ agents/ README.md website/`
  → zero matches.
- `grep -rn 'in the prompt' skills/ agents/ README.md website/` → zero matches.

### 2. Every residual "prompt" is generic-sense (per the closed allowed list) — PASS

`grep -rniE 'prompt' skills/ agents/ README.md website/` returns only generic-sense hits, each
on the allowed list:

- `cc-prompt` CSS class (`website/styles.css:795`, `website/demo.js:271`).
- `/loop <prompt>` template (`conventions/claude-code.md:37`, `conventions/pi.md:36`).
- health-monitor loop / self-contained prompt (`health-monitoring.md:52,54,70`).
- agent launch / spawn / initial prompt (`autonomous-workflow.md:61` spawn line; the
  `agents/*.md` launch/spawn-prompt references; `code-writer.md:62` "read the prompt", the one
  bare generic form acceptance criterion 2/3 explicitly allows).
- "prompt engineering" SEO keyword (`index.html:12`) and "Same prompt" (`index.html:153`).
- "The same prompt" LLM-nondeterminism prose (`README.md:13`); "what prompted it" verb
  (`review-pipeline.md:41`).

No phase-0-sense "prompt" remains.

### 3. Format-file cross-reference graph intact — PASS

- `prompt-format.md` no longer exists; `intent-format.md` exists.
- `grep -rln 'prompt-format' skills/ agents/ README.md website/` → zero (no dangling reference).
- `grep -rln 'intent-format' …` → exactly three referencers: `create-pipeline.md`,
  `manage-issues.md`, `review-pipeline.md` — all repointed in lockstep.
- `grep -nE 'prompt' intent-format.md` → zero (all three phase-0 prose occurrences renamed; no
  generic "prompt" introduced).

### 4. The four non-mechanical wordings read as trunk/design specify — PASS

- **SKILL.md** phase-0 row: `| 0 | Intent | 0-intent | The input |` (trunk's rewritten
  description, not a token swap). Description reads "(Intent → …)".
- **README.md:112** reads "phase 0 is the **intent**, an input rather than an agent-produced
  artifact…" — **"raw" dropped** — while **website/demo.js:281** independently reads "Phase 0 is
  the raw intent" — **"raw" kept**. The genuine per-file difference is preserved correctly.
- **create-pipeline.md** adapt bullet: "Adapt the issue content into the intent that seeds the
  subsequent phases, following the schema and authoring discipline in `intent-format.md`." —
  trunk's verb phrasing with #106's format-file pointer retained; trunk's added "Do not add
  requirements…" bullet correctly NOT adopted (per the design doc decision).
- **manage-issues.md:14** keeps #106's `base/0-intent/intent.md` run-folder path and the
  `intent-format.md` reference (schema NOT re-inlined). The orchestrator clause reads "when the
  pipeline is created, the orchestrator turns the issue into…", which is the design doc's
  explicit resolution of the spec's open phase-2 wording call (design-doc.md:103–129). The doc
  plan gate quotes the spec's earlier pending phrasing ("`create-pipeline.md` turns the issue
  into…"); the governing later artifact (the approved design doc) decided in favor of trunk's
  orchestrator clause, and the shipped text matches it. The two load-bearing constraints both
  gate text and design doc require — the `base/0-intent/intent.md` path and the extracted
  `intent-format.md` reference — are satisfied. Not a defect.

### 5. Out-of-scope doc surfaces unchanged — PASS

Diffed against the base ref, each is unchanged: `.changeset/pipeline-reviews.md`, `AGENTS.md`,
`CONTRIBUTING.md`, `.rp.md`, `.gitignore`, `conventions/load.md`. The changeset carries zero
"prompt" tokens (so the rename does not make it stale), and **no new rename changeset was
added** (`.changeset/` holds only the pre-existing `pipeline-reviews.md` plus unrelated trunk
changesets). Frozen `base/` and `.pipelines/` artifact *content* is untouched — the only
`.pipelines/` churn vs. the base ref is this run's own added artifacts and the prior-run folder
restructure, not edits to shipped docs.

The shipped-doc commit `d96e033` touches exactly the expected 20 files (19 modified + the
`prompt-format.md` → `intent-format.md` rename) and nothing else.

## Conclusion

The documentation surface is complete and consistent: no phase-0 "prompt" survives anywhere in
the shipped docs, every residual "prompt" is generic-sense, the format-file cross-reference graph
is intact with no dangling references, the four non-mechanical wordings match trunk/design, and
all out-of-scope guardrails are untouched. The docs phase gate passes.
