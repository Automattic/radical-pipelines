# Spec Research — Issue #71: Normalize issue content into the standard prompt format when creating a pipeline

This is the running record of the spec-phase Q&A and research. Each entry captures one focused question, the evidence the `spec-researcher` returned, and the requirement(s) it grounds. The `## Consolidated Requirements` section at the end is the authoritative output.

## Source of truth

- **Prompt:** `.pipelines/71-normalize-prompt-format/0-prompt/prompt.md`
- **Primary code under change:** `skills/radical-pipelines/reference/create-pipeline.md` (step 4 "Generate the initial prompt").
- **Canonical format defined in:** `skills/radical-pipelines/reference/manage-issues.md` ("The issue format").
- **Issues convention:** `.rp.md` shared section — GitHub is source of truth, accessed via `gh` CLI; Linear mirrors for status only.

## Q&A Log

### Q1 — What precisely is the "standard / canonical" prompt format?

**Evidence (spec-researcher, grounded in repo):**

- The canonical format is defined in `skills/radical-pipelines/reference/manage-issues.md:13-23` ("The issue format"). Sections, in order:
  - **Title** — concise.
  - **Goal** — always present; stated as an _outcome_, not a solution.
  - **Constraints** _(optional)_ — binding must/must-not the owner owns.
  - **Context** _(optional)_ — links, prior decisions, motivation only the owner holds.
  - **Assumptions / directions to explore** _(optional)_ — owner's hypotheses, **labeled open**.
- Rendering rule (`manage-issues.md:14`): "Render these sections and **omit any that are empty** — no `N/A` placeholders."
- "A vague idea yields just a Title and a Goal. That is a complete, valid issue." (`manage-issues.md:23`)
- Authoritative link to phase 0 (`manage-issues.md:14`): "The issue body _is_ the phase-0 prompt — `create-pipeline.md` turns the issue into `0-prompt/prompt.md`. So this is both the issue template and the prompt format."
- Our own `0-prompt/prompt.md` already follows this format: headings `## Goal`, `## Constraints`, `## Context`, `## Assumptions / directions to explore` (plus a `# Prompt` H1 and a source blockquote).
- Grep confirmed: **outside `manage-issues.md`, nothing else in the skill defines the prompt/issue format**. There is no separate template file. `create-pipeline.md` step 4 does not name the format at all.

**Open gap surfaced by the researcher (rendering of `prompt.md` itself):** The literal shape of `prompt.md` as a FILE — the top `# Prompt` heading, the `> Source: …` attribution blockquote, and the "This file is self-contained; agents do not need to open the issue" note — is established only by EXAMPLE in our own `0-prompt/prompt.md`. It is NOT written down in any reference. `manage-issues.md` describes the ISSUE BODY's shape (where Title = the issue's title field), not the prompt FILE's shape. So "normalize into the canonical format" has two layers: (1) the section taxonomy (documented), and (2) the prompt-file rendering convention (undocumented). Issue #71's goal — "`prompt.md` should always be written in the canonical format" — implies the rendering layer should be pinned too. Carried into Q-rendering below.

**Grounds:** R1 (canonical format is the single source defined in `manage-issues.md`), R2 (the format is exactly Title + Goal/Constraints/Context/Assumptions; optional sections omitted when empty, no placeholders), and a candidate requirement on the prompt-file rendering (top heading + source attribution + self-contained note) pending Q-rendering.

### Q2 — The owner-confirmation contract (ordering, precedent, revision loop, what is shown)

**Evidence (spec-researcher, grounded in repo):**

- **No contradiction with autonomous mode.** Every "no further questions" clause is textually gated on the autonomous run having STARTED, and the run starts at dispatch (`work-on-an-issue.md` step 4), strictly after pipeline creation (step 2):
  - `autonomous-workflow.md:11`: "Once the autonomous run starts, do not ask the owner additional questions until the target phase finishes."
  - `SKILL.md:24`: "Once the autonomous workflow starts, it runs each phase end-to-end without further questions…"
  - `work-on-an-issue.md` control flow: step 2 "create the pipeline per `create-pipeline.md`, and continue to step 3" → step 3 "Pick the workflow mode" → step 4 "Dispatch". Creation/synthesis/confirmation is upstream of mode selection and upstream of the run.
  - Phase 0 is an INPUT, not an agent-driven phase: `SKILL.md:35` "The raw request (input, not something to create)"; `autonomous-workflow.md` phase table starts execution at phase 1, phase-0 row = "Already in place". The no-questions rule governs phases 1→target only.
  - **Conclusion:** requiring confirmation always — even for runs that will be autonomous — contradicts no existing rule.
- **Closest precedent (mirror this idiom):** `manage-issues.md` step 5 "Draft, confirm, write" — the orchestrator renders the SAME Goal/Constraints/Context/Assumptions format and gates the write on owner approval:
  - `manage-issues.md:62`: "Render the issue in the format above (omitting empty sections) and show it to the owner. Do not write to the tracker until the owner explicitly approves. On approval, create the new issue…"
  - `manage-issues.md:32` (hard constraint): "Do not write to the tracker until the owner approves the rendered draft."
- **Supporting precedent:** `assisted-workflow.md:3` "The owner reviews and explicitly approves the artifacts before anything is committed." (Note: assisted mode persists approval as a committed `-review-approved.md` file — `assisted-workflow.md:28` — but that is assisted-only.)
- **Revision-loop precedent:** `autonomous-workflow.md:29`: "If the owner accepts, proceed. If they want changes, revise and confirm again."
- **What is shown — full render precedent:** `manage-issues.md:62`/:32 show the owner the actual RENDERED draft text in the exact format ("rendered draft"), not a summary. This is the close match for #71 ("confirm the synthesized prompt").

**Decisions resolved (analyst, grounded):**

- **D2.1 — Confirmation is always required, regardless of mode.** Grounded: no rule conflict (above); the prompt states it as the single hard constraint and as an unconditional outcome ("The owner confirms the synthesis before `prompt.md` is written"). → R3.
- **D2.2 — Transient confirmation, NO new approval file.** Phase 0 has no reviewer/approval artifact today; the manage-issues precedent treats the same format's confirmation as transient (gate-only). The prompt's constraint asks only that the owner "confirm before it is committed," not that approval be persisted. Introducing a `0-prompt` approval file would invent mechanism the prompt does not request. → captured as a NON-requirement / out-of-scope note for the design phase. → R3.
- **D2.3 — Owner is shown the FULL rendered `prompt.md` text** (the exact content that will be written), mirroring `manage-issues.md:62` "rendered draft" — not a summary. → R4.
- **D2.4 — Explicit revise-and-re-confirm loop** mirroring `autonomous-workflow.md:29`: if the owner requests changes, the orchestrator revises and re-shows until the owner approves; nothing is committed until then. → R5.

**Grounds:** R3 (confirmation always required before commit, regardless of mode; transient — no approval file), R4 (owner is shown the full rendered prompt.md, not a summary), R5 (explicit revise-and-re-confirm loop; no commit until approval).

### Q3 — Synthesis inputs: scope and access mechanics

**Evidence (spec-researcher, grounded in repo + verified with `gh`):**

- **Comments are an EXPANSION.** The Issues convention (`.rp.md:9, :11, :24`) is body/description-level only — the word "comment" appears nowhere in `.rp.md` (grep-verified). `create-pipeline.md:25` says only "Adapt the issue content"; `work-on-an-issue.md:15` says only "capture its content". Nothing today requires reading comments.
  - Mechanism (verified): a single `gh issue view <n> --json body,comments,title` returns the body plus every comment, each comment object carrying `author.login`.
- **"Participants' conversation" is NOT a separate input.** Verified `gh issue view --json` field list has no `timeline`, `cross-references`, or `review threads` field; the only cross-ref field is `closedByPullRequestsReferences` (unused by the skill). Review/inline threads exist only on PRs, and pipelines are created from ISSUES (slug keys off the GitHub issue number, `.rp.md:42`). So the issue's "participants' conversation" = its body (author's opening) + its comments (each tagged with its author). It is a gloss on "all comments," not a new scope item. → fold into "all comments."
- **Linked/external references are a PURE EXPANSION.** Grep across `skills/` and `agents/` found NO instruction in any flow to follow GitHub-internal links or fetch external URLs. The only web-fetch capability documented is in the LATER research agents (`agents/spec-researcher.md:15`, `agents/design-doc-researcher.md:15`: "Web — search and fetch documentation, references, discussions, and prior art") — not the orchestrator, not phase 0. `create-pipeline.md:27` covers downloading binary ASSETS (screenshots), not reading linked content.
- **Depth/boundary is entirely UNDEFINED today.** No "one hop", "transitive", "reachable", or any depth language anywhere (grep-verified). #71 must set the boundary itself. Anchors that exist: the self-contained-folder rule (`create-pipeline.md:28`: "the phase 0 subfolder must be self-contained — once committed, agents must not need to reach back to the issue source") and the no-over-specification principle (`create-pipeline.md:26`; `manage-issues.md:28-30` "Capture, don't converge"), reinforced by the fact that deep external research is the later research agents' job.

**Decisions resolved (analyst, grounded):**

- **D3.1 — Required inputs = the issue body + ALL of its comments.** "Participants' conversation" is captured by reading all comments; it adds no separate input. → R6.
- **D3.2 — The synthesis fetches and reads references DIRECTLY cited in the body/comments (one hop), only to inform the synthesis** — GitHub links via `gh`, other URLs via WebFetch/WebSearch (per the user's global rule + the researcher agents' existing pattern). It does NOT recursively follow links found inside those references; that transitive/deep research belongs to phases 1-2. Grounded by `create-pipeline.md:28` (self-contained, but not a web mirror) and `create-pipeline.md:26` / researcher-agent division of labor. → R7.
- **D3.3 — Reference-following is best-effort, not a hard guarantee.** External URLs may be unreachable/gated; an inaccessible reference must not block pipeline creation. The synthesis proceeds on what is accessible and the owner confirms the result. (No repo rule forces fetching to succeed; the binding constraint is owner confirmation, R3-R5.) → R7 (best-effort qualifier).

**Grounds:** R6 (synthesis reads the issue body and all comments), R7 (synthesis fetches/reads directly-cited references — one hop, best-effort — to inform the prompt; no transitive crawling).

### Q4 — Scope preservation, rendering, format-definition location, idempotency

**Evidence (spec-researcher, grounded in repo):**

- **No-converge doctrine already exists — mirror it, don't invent.** `create-pipeline.md:26`: "Do not add requirements, technical directions, or implementation details — agents do their own research in later phases." The rich doctrine lives in `manage-issues.md`:
  - `:28` "Capture, don't converge. … Do NOT probe toward a complete or testable requirements set; that is the `spec-analyst`'s job in phase 1."
  - `:30` "No requirements, design, or implementation. Acceptance criteria belong to phase 1, architecture to phase 2, task breakdown to phase 3."
  - `:31` "Reflect hypotheses back as open."
  - `:40` "under-specifying is safe; over-specifying narrows the work prematurely."
  - `:58` "the owner's best current understanding, not ground truth … never silently substitute a different goal."
  - Applying these to a synthesized THIRD-PARTY issue + expanded inputs is a faithful extension, not novel.
- **Conflicting / evolving comments — no existing specific guidance** (grep for conflict/contradict/revise/supersede: none). Only `manage-issues.md:58` ("never silently substitute … surface evidence") pre-exists. Resolve via the confirmation gate (already established): surface conflicts to the owner in the draft rather than silently choosing.
- **Assets + self-containment must be RETAINED:** `create-pipeline.md:27` (download screenshots/assets into `0-prompt/`, reference with relative paths) and `:28` (phase-0 folder self-contained — agents must not reach back to the issue source). With comments/links now inputs, "the issue source" expands to include them, so self-containment faithfully extends: prompt.md (+ downloaded assets) must capture everything from body, comments, and one-hop links that an agent needs.
- **Rendering is undocumented; codifying it is a new (small) decision.** The prompt-file wrapper (top `# Prompt` heading, `> Source: …` attribution blockquote, "self-contained; agents do not need to open the issue" note) exists ONLY by example in our own `0-prompt/prompt.md:1-5`; no spec defines it. The section STRUCTURE it must use already exists in `manage-issues.md`. "Always written in canonical format" is only checkable if the rendering is written down.
- **Format definition lives in ONE place; cross-link is one-directional today.** `manage-issues.md:14` already points to create-pipeline ("`create-pipeline.md` turns the issue into `0-prompt/prompt.md` … both the issue template and the prompt format"). `create-pipeline.md` does NOT mention `manage-issues.md` (grep: zero hits). Repo cross-link idiom: "per `X.md`" / "read `X.md`" / named-section citations (e.g. `work-on-an-issue.md:19, :30, :39`) and "following the **Name** convention" (`create-pipeline.md:9,:13,:19,:27,:32`). So create-pipeline.md should REFERENCE the format defined in `manage-issues.md` rather than duplicate it; the back-link is new but uses existing idiom.
- **Already-canonical issues: confirmation ALWAYS, no pass-through.** The prompt text forecloses a carve-out: `prompt.md:9-11` "always … regardless of the issue's original shape"; `:13-16` "synthesizes … The owner confirms the synthesis before `prompt.md` is written" (unconditional); `:24-25` "not written silently"; `:18-20` names both the in-our-format case and the free-form third-party case as flowing through the same path. An already-canonical issue still goes synthesize→confirm→write; the synthesis may be a near-identity reformat, but the owner still confirms.

**Decisions resolved (analyst, grounded):**

- **D4.1 — Synthesis is NORMALIZATION, not convergence.** It reorganizes body + comments + one-hop references into the canonical sections, preserving the participants' stated intent in substance, filing hypotheses/proposed directions under **Assumptions / directions to explore** labeled open, and adding NO requirements, design, or implementation detail. Mirrors `create-pipeline.md:26` + `manage-issues.md:28-31,40,58`. → R8.
- **D4.2 — Conflicts/evolution are surfaced, never silently resolved.** When body and comments conflict or a later comment appears to revise the original ask, the synthesis does not silently pick one; it reflects the current best reading and surfaces the conflict to the owner at the confirmation step (rides the R3-R5 gate; grounded in `manage-issues.md:58`). → R9.
- **D4.3 — Retain assets + self-containment, extended to the new inputs.** Keep `create-pipeline.md:27` (assets) and `:28` (self-contained) unchanged in spirit; self-containment now also covers comments and one-hop references — prompt.md plus downloaded assets must let downstream agents understand the issue without reaching back to the issue, its comments, or its links. → R10.
- **D4.4 — Codify the canonical format for `prompt.md`, in one place, referenced (not duplicated).** The canonical section structure is defined once (in `manage-issues.md`); `create-pipeline.md` references that definition using the repo's cross-link idiom. The prompt-file wrapper (top heading, source attribution, self-contained note) is documented so "written in the canonical format" is checkable. → R11, R12.
- **D4.5 — Confirmation is unconditional; no pass-through for already-canonical issues.** Already covered by R3; restated here as an explicit no-carve-out. The synthesis may be a near-identity reformat, but synthesize→confirm→write runs every time. → R3 (reaffirmed).

**Grounds:** R8 (synthesis normalizes/preserves intent, hypotheses labeled open, no requirements/design/impl), R9 (conflicts/evolution surfaced at confirmation, never silently resolved), R10 (assets + self-containment retained and extended to comments/one-hop links), R11 (single-source canonical format referenced not duplicated), R12 (prompt.md rendering codified for checkability), R3 reaffirmed (confirmation always, no pass-through).

## Premise check

No researched fact contradicts a premise the prompt depends on. The central risk — that an owner-confirmation step would conflict with the autonomous workflow's "no further questions" rule — was resolved as NOT a conflict: pipeline creation (and thus synthesis + confirmation) runs at `work-on-an-issue.md` step 2, upstream of mode selection (step 3) and the autonomous run, whose no-questions window opens only after dispatch/run-start (`autonomous-workflow.md:11`, `SKILL.md:24`); phase 0 is an input, not an agent-driven phase. No blocker is warranted; the prompt's goal, constraint, and assumptions are all confirmed (assumptions promoted to requirements where validated).

## Consolidated Requirements

Each requirement is an observable outcome of the NEW pipeline-creation behavior. "The flow" = the pipeline-creation flow that produces `0-prompt/prompt.md` (primarily `skills/radical-pipelines/reference/create-pipeline.md` step 4, reachable via `work-on-an-issue.md` step 2). Implementation detail (exact wording, which file holds which sentence) is deferred to the design/plan phases; these state WHAT must be observably true.

### Canonical format

- **R1 — Single canonical format, single source of truth.** `prompt.md` is written in one canonical format whose definition lives in exactly one place in the skill (today: `manage-issues.md`, "The issue format"). The creation flow does not define its own competing format.
  - _Acceptance:_ There is exactly one place defining the prompt/issue section taxonomy; the creation-flow reference points to it rather than restating it.
  - _Grounds:_ `manage-issues.md:14` (already designates itself "both the issue template and the prompt format"); Q1, Q4(c).

- **R2 — The format is Title + Goal / Constraints / Context / Assumptions, with omit-empty.** The canonical body sections, in order, are: **Goal** (always present; stated as an outcome, not a solution), **Constraints** (optional), **Context** (optional), **Assumptions / directions to explore** (optional, labeled open). The Title maps to the issue title. Empty optional sections are omitted — no `N/A` placeholders. A minimal valid prompt is Title + Goal alone.
  - _Acceptance:_ A produced `prompt.md` contains `## Goal` and only those of `## Constraints` / `## Context` / `## Assumptions / directions to explore` that have content; no placeholder/empty sections appear; Goal reads as an outcome.
  - _Grounds:_ `manage-issues.md:16-23`; Q1.

- **R11 — Format is referenced, not duplicated.** The creation-flow reference cites the canonical-format definition (using the repo's existing cross-link idiom — e.g. "the format defined in `manage-issues.md`") instead of copying the section list, so the two cannot drift.
  - _Acceptance:_ The creation-flow reference contains a pointer to the canonical-format definition and does not re-enumerate the full section spec.
  - _Grounds:_ one-directional link `manage-issues.md:14`; cross-link idiom `work-on-an-issue.md:19,:30,:39`; Q4(c).

- **R12 — Prompt-file rendering is codified.** The literal shape of `prompt.md` as a file is documented so "always written in the canonical format" is checkable: a top heading identifying it as the prompt, a source-attribution line pointing to the originating issue, a note that the file is self-contained, then the canonical body sections. (Exact wording/heading text is a design decision; the requirement is that the rendering is specified somewhere, not left to example.)
  - _Acceptance:_ A reference documents the prompt-file wrapper (heading + source attribution + self-contained note + canonical sections); a produced `prompt.md` matches it.
  - _Grounds:_ rendering is currently by-example only (`0-prompt/prompt.md:1-5`, undocumented); Q1, Q4(c). _(New, small decision — flagged.)_

### Synthesis inputs

- **R6 — Synthesis reads the issue body and ALL of its comments.** The flow reads the full issue conversation — the body plus every comment (each carrying its author) — not just the body. "Participants' conversation" is satisfied by reading all comments; it is not a separate input.
  - _Acceptance:_ The flow's input set explicitly includes all issue comments (e.g. via `gh issue view <n> --json body,comments,title` or equivalent), not body alone.
  - _Grounds:_ Issues convention is body-only today (`.rp.md:9,:11,:24`; "comment" absent); `gh issue view --json` exposes no timeline/cross-reference/review-thread field; Q3(a),(b). _(Expansion — flagged.)_

- **R7 — Directly-cited references are fetched and read (one hop, best-effort).** Links and references cited directly in the body or comments are fetched and read to inform the synthesis — GitHub links via `gh`, other URLs via web fetch. Following stops at one hop: references found inside those references are NOT recursively crawled (that transitive/deep research belongs to phases 1-2). Reference-following is best-effort: an unreachable or gated reference does not block pipeline creation.
  - _Acceptance:_ The flow fetches/reads directly-cited references and uses them in the synthesis; it does not recurse into second-hop links; an inaccessible reference is noted but creation still proceeds.
  - _Grounds:_ no link-following documented today (pure expansion); boundary undefined in repo, anchored by `create-pipeline.md:26,:28` and the later research agents owning deep research (`agents/spec-researcher.md:15`); Q3(c),(d). _(Expansion + new boundary — flagged.)_

### Synthesis behavior (normalize, don't converge)

- **R8 — Synthesis normalizes; it does not converge.** The flow reorganizes the gathered material into the canonical sections while preserving the participants' stated intent in substance. It files hypotheses, proposed directions, and beliefs about cause/state under **Assumptions / directions to explore**, labeled open. It adds NO requirements, acceptance criteria, technical directions, design, or implementation detail.
  - _Acceptance:_ A produced `prompt.md` reflects the source intent (no goal substitution), carries proposed directions under Assumptions (not as requirements), and contains no requirements/design/impl content beyond what the source held.
  - _Grounds:_ `create-pipeline.md:26`; `manage-issues.md:28,:30,:31,:40,:58`; Q4(a). _(Grounded; applied to third-party issue — flagged as faithful extension.)_

- **R9 — Conflicts and revisions are surfaced, never silently resolved.** When the body and comments conflict, or a later comment appears to revise the original ask, the synthesis does not silently choose one reading; it reflects its best current reading and surfaces the conflict/evolution to the owner at the confirmation step.
  - _Acceptance:_ Given an issue whose comments revise/contradict the body, the draft shown to the owner notes the conflict rather than silently dropping or substituting content.
  - _Grounds:_ `manage-issues.md:58` ("never silently substitute … surface evidence"); rides the R3-R5 confirmation gate; Q4(a). _(Ours to state — flagged.)_

### Owner confirmation

- **R3 — Owner confirmation is required before commit, always, regardless of mode; confirmation is transient.** The synthesized `prompt.md` is never written/committed silently. The owner must confirm it first. This holds for every run, including those that will proceed in autonomous mode (creation precedes mode selection, so no conflict). There is NO pass-through for already-canonical issues: synthesize → confirm → write runs every time (the synthesis may be a near-identity reformat). Confirmation is transient — it does NOT introduce a new committed approval file for phase 0.
  - _Acceptance:_ `prompt.md` is committed only after explicit owner confirmation; an already-canonical issue still requires confirmation; no `0-prompt` approval-file artifact is created.
  - _Grounds:_ prompt Constraint + Goal (`prompt.md:9-25`); no autonomous conflict (`autonomous-workflow.md:11`, `SKILL.md:24`, `work-on-an-issue.md` step order); transient precedent `manage-issues.md:32,:62`; Q2, Q4(d).

- **R4 — The owner is shown the full rendered prompt.** Confirmation presents the actual rendered `prompt.md` text (the exact content that will be written), not a summary.
  - _Acceptance:_ The confirmation step shows the complete rendered prompt content in the canonical format.
  - _Grounds:_ `manage-issues.md:62,:32` ("Render … show it to the owner", "rendered draft"); Q2(d).

- **R5 — Explicit revise-and-re-confirm loop.** If the owner requests changes, the flow revises the prompt and re-shows it; nothing is committed until the owner approves.
  - _Acceptance:_ Owner-requested changes produce a revised draft shown again for approval; commit happens only on approval.
  - _Grounds:_ `autonomous-workflow.md:29` ("If they want changes, revise and confirm again"); `manage-issues.md:62`; Q2(c).

### Preserved behaviors (no regression)

- **R10 — Assets and self-containment are preserved and extended to the new inputs.** The flow still downloads issue screenshots/assets into `0-prompt/` and references them with relative paths. The phase-0 folder remains self-contained — once committed, downstream agents need not reach back to the issue source. Because comments and one-hop references are now inputs, self-containment extends to them: whatever from the body, comments, and directly-cited references an agent needs to understand the issue must be captured into `prompt.md` (and assets into `0-prompt/`).
  - _Acceptance:_ Issue assets appear in `0-prompt/` with relative-path references; the committed `prompt.md` + assets are sufficient for a downstream agent without opening the issue, its comments, or its links.
  - _Grounds:_ `create-pipeline.md:27,:28`; Q4(b).

## Out of scope / non-requirements (for the design phase)

- **No phase-0 approval file.** Confirmation is transient; do NOT invent a committed `0-prompt`-approval artifact (assisted mode's `-review-approved.md` is assisted-only and is not phase 0). _(D2.2)_
- **No transitive / deep external research at phase 0.** One hop only; deep web/codebase research is the spec-researcher's (phase 1) and design-doc-researcher's (phase 2) job. _(D3.2, R7)_
- **No PR review-thread ingestion.** Pipelines are created from issues; `gh issue view` exposes no review threads, and following the closing-PR cross-reference is out of scope. _(Q3(b))_
- **No requirements/acceptance-criteria/design/architecture/task-breakdown in `prompt.md`.** Those belong to phases 1-3; the synthesis must not pre-empt them. _(R8)_
- **No goal substitution.** The synthesis must preserve the source intent; it may not silently replace the goal. _(R8, R9)_
