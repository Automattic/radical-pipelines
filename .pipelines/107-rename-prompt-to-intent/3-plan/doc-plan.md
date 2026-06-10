# Doc plan: rename the phase-0 artifact "prompt" → "intent"

## How to use this plan

Read together with `../1-spec/spec.md`, `../2-design-doc/design-doc.md`, and the
sibling `code-plan.md`. This is the **documentation-phase** breakdown for issue #107.

**Bottom line: there is no additional documentation work.** This change is a pure
mechanical rename ("prompt" → "intent") for the phase-0 artifact / folder / phase
label, with no behavior change. The CODE phase (`code-plan.md`, Tasks 1–6) already
performs **every** edit that touches a user-facing or contributor-facing doc surface:

- `README.md` — phase-0 LABEL and the two artifact-naming SOFT occurrences (code-plan Task 3).
- `website/demo.js`, `website/index.html` — the file-token + SOFT-comment edits (code-plan Task 4).
- The mandatory changeset under `.changeset/` (code-plan Task 5) — this repo's
  changesets-based release notes are the only "changelog" surface, and it is a
  code-phase artifact, not a separate doc task.

This doc-plan therefore contains **no edit tasks** — adding any would either duplicate
the code phase or invent work the rename does not require. It contains **one read-only
verification task** (Task D1) that confirms no documentation surface exists beyond what
the code phase already covers. That confirmation is the genuine, honest outcome here.

## Why there is no additional doc work (verification record)

The following was checked against the current tree before concluding:

1. **No `docs/` directory and no `CHANGELOG.md`.** `find` for `docs/` directories
   returned nothing; the only `CHANGELOG*` match is `.changeset/changelog-and-version-sync.md`
   (an existing *changeset*, not a hand-maintained changelog). The repo's release notes
   are generated from changesets, so the only changelog action is the changeset itself —
   already code-plan Task 5.

2. **`CONTRIBUTING.md` and `AGENTS.md` carry no phase-naming tokens.**
   `git grep -nIi "prompt" -- CONTRIBUTING.md AGENTS.md` returns **0 hits** (exit 1).
   They were *not* in the rename's in-scope file set precisely because they contain
   neither the `prompt.md` / `0-prompt` path tokens nor the "Prompt" phase label.
   - `AGENTS.md:3` describes "a pipeline of defined phases" generically — it never
     names phase 0 and uses no "prompt"/"intent" token, so it reads identically after
     the rename. Nothing to change.
   - `CONTRIBUTING.md` mentions "phase" only in unrelated changeset/changelog *examples*
     (`--phase` flag rename at line 144; "Add the new phase" at line 164). Neither
     refers to the pipeline's phase-0 name. Nothing to change.

3. **No prose reads oddly after the rename.** Every passage that narrates the phase-0
   name *uses the "prompt" token* and is therefore already rewritten by the code phase
   (the `README.md` lines, the `website/demo.js` comment, and — the one non-mechanical
   edit — the `create-pipeline.md` clause rewrite, all in `code-plan.md`). The remaining
   phase-narrating prose that avoids the token (`website/index.html` "Six phases…" lines
   9 / 97 / 173, and `AGENTS.md:3`) never names phase 0, so the rename leaves it coherent.
   There is no surviving guide or explanatory passage that would read oddly.

4. **The 81-hit in-scope residual matches the spec exactly**, and the full file list
   (`git grep -lIi "prompt" -- ':!.pipelines' ':!.rp.md'`) is identical to the code
   plan's 19-edited + 13-KEEP set (32 files). No documentation file falls outside the
   code plan's scope.

---

## Task D1 — Verify no documentation surface exists beyond the code phase (read-only, no edits)

**Goal.** Confirm — after the code phase (`code-plan.md` Tasks 1–6) lands — that there
is no documentation work left to do: no doc surface narrates the phase-0 name in a way
the code phase did not already rewrite, and no contributor/internal doc or changelog
surface needs a manual phase-name edit. This task **edits nothing**; it is a guard
against missed or invented doc work.

**Audience.** Doc-phase reviewer / orchestrator — the gate that the docs phase is
genuinely a no-op for this rename.

**Files.** None edited. Read-only inspection of:
- `CONTRIBUTING.md`, `AGENTS.md` (contributor/internal docs).
- The repo root and `.changeset/` (changelog/release-notes surface).
- `README.md`, `website/` (already edited by the code phase — confirm no *residual*
  phase-narrating prose was missed).

**Sections-scope.** Whole-file token checks (no specific section); the phase-narrating
prose passages in `README.md`, `website/index.html`, and `AGENTS.md`.

**Depends on.** Code-plan Tasks 1–6 (all code-phase edits, including the changeset, must
be in place first — this task verifies against the *finished* tree). It does **not**
re-run the code phase's three acceptance greps (those are code-plan Task 6); it only
confirms the *documentation* surface specifically.

**Traces to.** Spec "Out of Scope" items 1–6 (nothing added beyond the enumerated
rename); spec AC#5 (no old-name trace in the skill) and AC#9 (no behavior change) as they
bear on prose; design "Out of scope". This task adds **no** new requirement — it asserts
the rename's doc footprint is fully contained in the code phase.

**Acceptance.**
- `git grep -nIi "prompt" -- CONTRIBUTING.md AGENTS.md` returns **0** (these files
  carry no phase-naming token and need no edit).
- No `CHANGELOG.md` and no `docs/` directory exist at the repo root; the only changelog
  surface is changesets, and the required changeset is already present from code-plan
  Task 5 (`changeset status` passing is verified in code-plan Task 6).
- No documentation file outside the code plan's 19-edited set contains a residual phase-0
  "prompt" reference: `git grep -lIi "prompt" -- ':!.pipelines' ':!.rp.md'` lists only the
  expected KEEP files (generic-sense "prompt"), with no doc surface needing a further edit.
- Phase-narrating prose that avoids the token (`website/index.html` "Six phases…" lines,
  `AGENTS.md:3` "pipeline of defined phases") reads coherently and is left untouched.
- **Outcome to record:** documentation phase is a verified no-op for this rename — no
  doc edits required, none invented.
