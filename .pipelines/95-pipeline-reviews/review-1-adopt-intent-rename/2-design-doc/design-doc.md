# Design Doc: Adopt the prompt → intent rename in the reviews feature

## Overview

PR #109 (merged to trunk on 2026-06-10) renamed the pipeline's phase-0 artifact from **prompt** to
**intent** across the skill, agent profiles, README, and website. This branch — the reviews feature
(PR #106) — predates that rename and still calls the phase-0 input "prompt" (the new
`prompt-format.md` reference, the `0-prompt/prompt.md` paths in the review procedure, etc.).

This review makes #106 fully consistent with the rename: everything the feature introduces or touches
refers to the phase-0 artifact as **intent**, so the branch carries no stale phase-0 "prompt"
terminology and the eventual human PR-merge re-introduces no divergence.

The spec (`../1-spec/spec.md`) enumerates the complete per-file / per-occurrence rename end-state.
This design doc does not restate that enumeration; it records the **two design decisions the spec
deferred to phase 2** (and explicitly only those two), the architecture they preserve, and the
coverage check against the spec's acceptance criteria. The rename itself is a
mechanical-with-named-exceptions transformation — there is no new component, interface, dependency,
or runtime behavior. The design work is entirely about (a) keeping #106's reviewed architecture
intact through the rename and (b) resolving the two deferred wording calls so the result is
trunk-consistent without regressing a #106 design decision.

## Approach

Apply the rename **directly to this branch's files** — no `git merge trunk`, no rebase (spec req 2;
`review-pipeline.md:3,25-31`; `pipeline-versioning.md:3,21-28,32`). The transformation is governed by
two rules already fixed in the spec:

- **Per-occurrence, not per-file.** For any single phase-0 "prompt" occurrence: if #106 did not touch
  that line, bring it to trunk's actual post-#109 text (a clean token swap except the four
  non-mechanical edits); if #106 added or rewrote that line, apply #109's rename *boundary* to #106's
  content, preserving #106's structure.
- **Phase-0 sense only.** Only the input artifact a run starts from is renamed; the generic sense of
  "prompt" (LLM/launch/spawn/loop prompts, the `cc-prompt` CSS class, SEO copy, the live `.rp.md`
  Linear state) is preserved verbatim, matching #109's deliberately-kept boundary.

The reviews feature's reviewed architecture — the `base/` run-folder model and the extracted shared
format file — is **preserved through the rename**, never collapsed to trunk's flat-path /
inline-schema shape. This design doc's two decisions are the only places where "match trunk" and
"preserve #106" had to be adjudicated; both are resolved in favor of preserving #106's design while
taking #109's naming and (where it does not conflict) #109's wording.

## Components

No code components. The affected surface is documentation and static assets:

- **New #106 files renamed by hand** (no trunk counterpart): `prompt-format.md` → `intent-format.md`
  (file rename + content rename); `review-pipeline.md` (phase-0 prose → intent).
- **Group D union files** (rename boundary applied onto #106's content, structure preserved):
  `create-pipeline.md`, `fork-pipeline.md`, `pipeline-versioning.md`, `manage-issues.md`.
- **Group C take-trunk files** (occurrences #106 did not touch): the four `spec-*` agents, `SKILL.md`,
  the assisted/autonomous phase docs, the two workflow docs, `conventions/setup.md`, `README.md`'s
  three phase-0 lines, `website/index.html`, `website/demo.js`.
- **Untouched**: `.rp.md`, `.gitignore`, `conventions/load.md`, generic-only convention /
  health-monitoring files, the #106-only no-token files, the 6 reviewer agents,
  `.changeset/pipeline-reviews.md`, and all frozen `base/` / `.pipelines/` artifact content.

## Interfaces and Data Flow

The only "interface" affected is the cross-reference graph among the docs:

- The shared format file is referenced by exactly three authoring sites — `create-pipeline.md`,
  `manage-issues.md`, `review-pipeline.md` — and is renamed `prompt-format.md` → `intent-format.md`.
  All three references must repoint to `intent-format.md` in lockstep so no dangling reference
  remains.
- The phase-0 path token changes shape from `0-prompt/prompt.md` to `0-intent/intent.md`; under
  #106's run-folder model the base run's path is `base/0-intent/intent.md` (the `base/` prefix is a
  #106 addition that trunk's flat `0-intent/intent.md` lacks, so #106's path is retained wherever the
  two meet).

## Key Decisions

The spec settled everything except two wording calls. Both are decided below, each grounded in #106's
binding requirements (R11, R13) and verified against trunk and the merge-base. The supporting
evidence trail is in `design-doc-research.md`.

### Decision: create-pipeline.md relies on the `intent-format.md` reference; trunk's added discipline bullet is NOT adopted

- **Choice:** In `create-pipeline.md` step 4, the "adapt the issue content" bullet takes trunk's verb
  phrasing **with #106's format-file pointer retained**:
  "Adapt the issue content into the intent that seeds the subsequent phases, following the schema and
  authoring discipline in `intent-format.md`."
  Trunk's separate second bullet — "Do not add requirements, technical directions, or implementation
  details — agents do their own research in later phases." — is **not** added.
- **Alternatives:** (a) Add trunk's "Do not add requirements…" bullet alongside the pointer — rejected;
  it restates the authoring discipline that `intent-format.md` already centralizes (its "No
  requirements, design, or implementation." bullet), duplicating the discipline in two locations.
  (b) Take trunk's first bullet verbatim ("…that seeds the subsequent phases.") and drop the pointer
  clause — rejected; `create-pipeline.md`'s bullet is the file's SOLE reference to the format file, so
  dropping the clause would orphan the file from the discipline and fail the acceptance criterion that
  `create-pipeline.md` "only points to" the format file.
- **Trade-offs:** The file diverges from trunk's literal text on this bullet, so the eventual human
  merge sees a wording difference — but that difference is exactly #106's reviewed extracted-format
  architecture, not incidental noise. The pointer clause is lighter than an inline duplicate and is
  what the single-source rule mandates.
- **Traces to:** R13 (single-sourced format — MUST; `base/1-spec/spec.md:154-169`), the verified-PASS
  no-duplication acceptance criterion that names `create-pipeline.md` as pointer-only
  (`base/4-code/code-review-approved.md:46`), and the named "Single-source the prompt format" decision
  (`base/2-design-doc/design-doc.md:158-162`). Reconciles spec req 12 (whose quoted target sentence
  omitted the pointer clause) against spec req 10/12's explicit instruction to keep the reference.
  Spec acceptance criteria 4, 5, 7.

### Decision: manage-issues.md:14 adopts trunk's orchestrator agent clause, keeping #106's extracted-file architecture and `base/` path

- **Choice:** Line 14 reads:
  "The issue body _is_ the phase-0 intent — when the pipeline is created, the orchestrator turns the
  issue into `base/0-intent/intent.md`. Author the issue using the shared schema, rendering rules, and
  authoring discipline in `intent-format.md`."
  This adopts #109's reworded agent clause ("when the pipeline is created, the orchestrator turns…")
  in place of #106's inherited "`create-pipeline.md` turns the issue into…", while keeping #106's
  `base/0-intent/intent.md` run-folder path and #106's extracted-file pointer. It does **not** pick up
  trunk's inlined-schema continuation ("So this is both the issue template and the intent format.
  Render these sections…").
- **Alternatives:** (a) Keep #106's "`create-pipeline.md` turns the issue into…" filename-as-actor
  clause, retoken only — rejected; that phrasing predates #106 (it exists in merge-base `3f39bee`,
  inherited by inertia, never authored or defended by #106), it is the lone file-as-actor outlier in
  the shipped docs, and it diverges from #106's own orchestrator-as-actor vocabulary (R11;
  review-pipeline.md:39). (b) Take trunk's full line including the inlined schema — rejected; that
  would re-inline the schema #106 deliberately extracted (out of scope; the settled, not-in-question
  part of the spec) and would also use trunk's flat `0-intent/intent.md` path, losing #106's `base/`
  prefix.
- **Trade-offs:** None of consequence. B is more accurate (phase 0 is orchestrator-authored; no agent
  is spawned — the orchestrator executes create-pipeline.md step 4), matches the dominant house style
  (orchestrator-as-actor, file-as-procedure), aligns with #106's own R11 and review-pipeline.md:39, and
  reduces human-merge divergence to only where #106's design genuinely differs from trunk.
- **Traces to:** R11 (orchestrator authors the prompt; `base/1-spec/spec.md:136-141`), R13 (the
  extracted format file is preserved, not re-inlined). Verified provenance: merge-base `3f39bee`
  manage-issues.md:14 (the filename-as-actor phrasing predates #106) and a repo-wide grep confirming
  manage-issues.md:14 is the only file-as-actor instance. Spec req 8, 12; acceptance criteria 5, 6, 7.

## Dependencies

- **Internal cross-references only.** `intent-format.md` (renamed from `prompt-format.md`) is the
  single source referenced by `create-pipeline.md`, `manage-issues.md`, and `review-pipeline.md`; the
  rename and the three repoints must land together. No external libraries, services, or new
  dependencies. No build or runtime dependency is affected.

## Failure Modes and Observability

The risk surface is incomplete or incorrect rename, detectable by grep (the spec's acceptance
criteria are themselves the verification procedure):

- **Stale phase-0 token left behind** — caught by a grep over shipped files (`skills/`, `agents/`,
  `README.md`, `website/`) for `0-prompt`, `prompt.md`, and the phase-0 label/prose forms; expected
  count zero (spec acceptance criteria 1, 2).
- **Generic "prompt" wrongly renamed** — caught by confirming the allowed generic-sense occurrences
  remain (`cc-prompt`, `/loop <prompt>`, launch/spawn/initial/loop/self-contained prompt, "prompt
  engineering", "Same prompt") and `.rp.md`'s `0 - Prompt` / `Add prompt` are unchanged (acceptance
  criteria 3, 8).
- **Dangling format-file reference** — caught by confirming `prompt-format.md` no longer exists,
  `intent-format.md` exists, no shipped file references `prompt-format.md`, and all three referencing
  docs point to `intent-format.md` (acceptance criterion 4).
- **Architecture regression** — caught by confirming `manage-issues.md` still references the shared
  external format file (not re-inlined) and the Group D files retain the `base/` run-folder model
  (acceptance criteria 5, 7).

There is no runtime observability concern; this change ships documentation and static assets only.

## Risks and Open Questions

- **No open questions remain.** The two deferred wording calls are resolved above. Both were
  cross-checked with `design-doc-researcher` and verified against trunk, the merge-base, and #106's
  base artifacts.
- **Spec-text wrinkle reconciled, not a blocker:** spec req 12's *quoted* target sentence for the
  create-pipeline.md bullet omitted the "following … in `intent-format.md`" pointer clause, which —
  taken literally — would orphan the file. The surrounding spec intent (req 10/12: "keep #106's
  reference … reference `intent-format.md`") is unambiguous that the pointer stays, so the design
  resolves it by retaining the clause on the rephrased bullet. No spec revision is required; the
  decision record documents the reconciliation so the plan phase implements the pointer-bearing form.
- **Frozen-artifact and `.rp.md` boundaries** are settled in the spec (out of scope) and unaffected by
  either decision.
