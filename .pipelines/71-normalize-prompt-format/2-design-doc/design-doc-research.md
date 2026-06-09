# Design Research — Issue #71: Normalize issue content into the standard prompt format when creating a pipeline

This is the running record of the design-phase Q&A and the design decisions it grounds. Each entry captures one focused question, the evidence the `design-doc-researcher` returned, and the decision it grounds. The `## Design Decisions` section at the end is the authoritative output of this phase.

This is a **self-referential, documentation/instruction-design change** to the Radical Pipelines skill itself. There is no application code. "Architecture" here means:

1. **Placement** — which Markdown reference file each new piece of behavior lives in.
2. **Cross-linking** — how the creation flow points at the single canonical-format definition so the two cannot drift (R11), using the repo's existing cross-link idioms.
3. **Rendering convention** — how the literal `prompt.md` file shape is written down so "always in the canonical format" is checkable (R12).
4. **Flow wording** — how the synthesis inputs (R6, R7), normalize-don't-converge behavior (R8, R9), and the owner-confirmation gate (R3, R4, R5) are expressed in `create-pipeline.md` step 4, reusing existing idioms (the `manage-issues.md` "Draft, confirm, write" gate; the `autonomous-workflow.md` revise-loop).

## Source of truth

- **Spec (approved):** `.pipelines/71-normalize-prompt-format/1-spec/spec.md` — requirements 1–12, out-of-scope, AC1–AC15.
- **Primary file under change:** `skills/radical-pipelines/reference/create-pipeline.md` (step 4 "Generate the initial prompt", and possibly a new step for confirmation).
- **Canonical format definition (single source):** `skills/radical-pipelines/reference/manage-issues.md` ("The issue format", lines 12–22).
- **Confirmation-gate precedent:** `manage-issues.md` step 5 "Draft, confirm, write" (lines 60–62); revise-loop precedent `autonomous-workflow.md:29`.
- **Issues convention / access mechanism:** `.rp.md` shared section (GitHub via `gh`, source of truth; Linear mirrors status only).
- **Cross-link idioms (verified in repo):**
  - Bold-name convention citation: `the **Issues** convention`.
  - File cross-link: `` `manage-issues.md` `` / `per `create-pipeline.md``.
  - Named-section citation: `` `pipeline-versioning.md` ("Listing pipelines for an issue") `` (backtick filename + parenthesized quoted section title).
  - Existing forward link `manage-issues.md:14` → `create-pipeline.md`; no back-link exists today (the asymmetry R11 fixes).

## Q&A Log

### Q1 — Placement of the canonical-format definition and the new prompt-file rendering convention; AGENTS.md constraints; the four design tensions.

**Evidence (design-doc-researcher + analyst direct read, grounded in repo):**

- **Canonical taxonomy lives in `manage-issues.md` only.** "The issue format" (`manage-issues.md:12-22`) defines the section taxonomy as a **bullet list** (Title, Goal, Constraints, Context, Assumptions), with the omit-empty rule (`:14`) and the "vague idea → Title + Goal" minimal case (`:22`). It self-designates as "both the issue template and the prompt format" (`:14`) and already forward-links to `create-pipeline.md`. It describes the ISSUE BODY's sections (Title = the issue's title field); it says nothing about a FILE wrapper. Confirmed: taxonomy is here; file-rendering wrapper is NOT.
- **The prompt-file wrapper exists only by example.** The `# Prompt` H1, the `> Source: …` attribution blockquote, and the "self-contained; agents do not need to open the issue" note appear only in committed `0-prompt/prompt.md` artifacts (incl. this pipeline's own `0-prompt/prompt.md:1-5`); no reference file documents them. So "always in the canonical format" has two layers: (1) section taxonomy (documented in `manage-issues.md`), (2) prompt-file wrapper (undocumented — R12 closes this).
- **`create-pipeline.md` does not name the format today.** Step 4 (`:25`) says only "Adapt the issue content"; it never enumerates Goal/Constraints/Context/Assumptions.
- **`manage-issues.md` is NOT on `create-pipeline.md`'s reading path.** `work-on-an-issue.md` step 2 (`:39`) reads `create-pipeline.md`; neither reads `manage-issues.md`. The orchestrator reaches the issue via the **Issues** convention (`work-on-an-issue.md:15`), not via `manage-issues.md`. So a cross-link from `create-pipeline.md` → `manage-issues.md` ("The issue format") is the only thing that pulls the taxonomy in. This means the R11 cross-link does NOT create reading-path duplication — the two files are on different paths, so AGENTS.md rule 8 ("no duplication in the reading path") is satisfied by referencing rather than restating, and rule 11 ("no duplication across paths → extract to a shared referenced file") is satisfied because the taxonomy already lives in one referenced file (`manage-issues.md`) that `create-pipeline.md` will cite.
- **AGENTS.md "Rules when modifying the skill" (`AGENTS.md:5-11`) — hard design constraints:**
  - R-min (`:7`): minimalist; every word serves a purpose.
  - R-dup-path (`:8`): no duplicate info in the current reading path.
  - R-neg (`:9`): no negative phrasing unless strictly necessary.
  - R-generic (`:10`): no tool-specific mentions (no `gh`, no WebFetch) except in the conditionally-loaded tool files.
  - R-dup-cross (`:11`): instructions repeated across paths must be extracted to a separate referenced file.
- **Issues-convention capability is body-only today.** `.rp.md` Managing-tasks (`:9-24`) is body/description-level — "comment" never appears. `setup.md` "Issues (required)" (`:62-66`) frames the capability as "read, comment on, and update them" with access via "CLI like `gh`, MCP server, API token, etc." — no mention of reading comments or fetching cited references.
- **Cross-link idioms (verified):** `per \`file.md\` ("Section name")` for file+section refs; `following the **Convention Name** convention` for conventions.
- **No `Decisions` section in `create-pipeline.md`** (T4): the autonomous workflow reads per-phase `Decisions` only for phases 1-5 (`autonomous-workflow.md:25`); phase-0 creation predates the run. Confirmation is therefore an unconditional gate inside creation, not an autonomous per-phase decision — consistent with the spec's "always, regardless of mode."
- **Changesets:** skill changes ship a `minor` changeset (prose summary; pattern `.changeset/per-agent-model-config.md`). A phase-5/docs concern; flagged as part of "done".

**Design tensions surfaced (researcher), to resolve below:**
- **T1** — Where does "read all comments + fetch one-hop references" live: generic `create-pipeline.md` wording routed through the **Issues** convention, vs. also extending the Issues-convention capability text (`setup.md` + dogfood `.rp.md`)?
- **T2** — Confirm-loop placement vs. duplication with `manage-issues.md` step 5 ("Draft, confirm, write") for the same format.
- **T3** — Where to codify the prompt-file rendering wrapper (R12): `create-pipeline.md` vs. `manage-issues.md`.
- **T4** — Confirmation is an unconditional gate, not a per-phase `Decisions` item. (Already settled by spec; agreed.)

**Additional Q1 evidence (researcher, grep-verified) — the five committed `prompt.md` files DISAGREE on the wrapper.** This is the concrete drift R12/AC5 exists to kill, and is the motivating evidence for documenting the rendering:
- `8-research…`: `# Prompt` H1, prose, `## Context` — no `> Source:` line, **no Goal section** (uses inline "based on GitHub issue #8").
- `90-per-agent-model-config`: `# Prompt` H1, a plain `Source issue:` line (NOT a blockquote), then `## Goal`.
- `83-automate-releases`: H1 is the **issue title**, `> Source:` blockquote + self-contained note, then `## Goal`.
- `70-restructure…`: H1 is the **issue title**, `> Source:` blockquote, then `## Goal`.
- `71-normalize-prompt-format` (our own): `# Prompt` H1, `> Source:` blockquote, self-contained note, then `## Goal`.
So in practice: H1 is sometimes "Prompt", sometimes the issue title; the source line is sometimes a blockquote, sometimes plain, sometimes absent; the self-contained note is inconsistent; one file even omits Goal. "By example" demonstrably failed to produce a single shape. The design must pick ONE concrete rendering and document it.

**Reachability verified:** `manage-issues.md` is referenced nowhere in `skills/` except the `SKILL.md:55` entry-point table (a sibling to "Work on an issue"). It is NOT on the `work-on-an-issue.md → create-pipeline.md` reading path. So the R11 cross-link from `create-pipeline.md` is *load-bearing* (the only thing that pulls the taxonomy onto the path), which is exactly what makes "reference, don't duplicate" satisfy AGENTS.md rule 8.

**Decision resolved — D-T3 (rendering-doc location).** The prompt-file wrapper (H1 + source-attribution line + self-contained note) is documented in **`create-pipeline.md` step 4**, NOT in `manage-issues.md`.
- _Why:_ the wrapper is prompt-FILE-specific — an issue body has no `# Prompt` H1 and no `> Source:` line (those exist only because the prompt is a standalone file). `manage-issues.md` is about issue BODIES and owns the section taxonomy; the file wrapper has no meaning there. `create-pipeline.md` step 4 is the one place that writes the file and is already on the reading path. This keeps the two layers in exactly one home each: taxonomy → `manage-issues.md`; file-wrapper → `create-pipeline.md`. (~3 lines of spec; within AGENTS.md minimalism.)
- _Grounds:_ `manage-issues.md:12-22` (body-only taxonomy, bullets); wrapper absent from all references (grep); five inconsistent artifacts (above); AGENTS.md:7,:8. → R12, AC5.

### Q2 — Access capability scope for R6/R7 (T1) and confirm-loop placement (T2).

**Evidence (design-doc-researcher, grep/file-line verified):**

- **The Issues convention is tracker-only.** `setup.md:64`: orchestrator needs to "read, comment on, and update them" (them = tracker issues). Every call site is a tracker operation (`manage-issues.md:5` "Every tracker operation … goes through the **Issues** convention"; `work-on-an-issue.md:15`; `create-pipeline.md:27` uses it only to download the issue's own assets). An arbitrary external URL cited in a comment is NOT a tracker operation, so it does not fit under Issues. GitHub-internal links (issue/PR/file in the same tracker) CAN ride the Issues access mechanism; generic external URLs cannot.
- **The orchestrator has NO documented web-fetch capability anywhere.** Grep of `skills/` for web/fetch/URL/http/browse capability available to the orchestrator: zero hits. Web access is granted only to the spawned research agents.
- **The researcher-agent web idiom (the generic phrasing to mirror), identical in both `agents/spec-researcher.md:14-17` and `agents/design-doc-researcher.md:14-17`:**
  - `**Web** — search and fetch documentation, references, discussions, and prior art.`
  - So the generic, tool-free vocabulary is "search and fetch … references". `create-pipeline.md` phrases it as an instruction ("fetch and read the references the issue cites — GitHub-internal references via the **Issues** convention's access mechanism, other references via web fetch"), not as a capability bullet — same vocabulary, instruction grammar, no tool names (honors AGENTS.md:10). This split is exactly how the spec already frames R7 (`spec.md:37`).
- **Exact texts to extend (verbatim):**
  - `setup.md:64` — "…the orchestrator needs a way to **read, comment on, and update them**." Minimal additive: grant comment-reading ("read them and their comments, comment on, and update them"). External-URL fetch does NOT belong here (not a tracker capability).
  - `.rp.md:9-24` (Managing tasks) has "Creating an issue" and "Modifying an issue" subsections but **NO "Reading an issue" subsection** — reading is only implied by "accessed via the `gh` CLI" (`:11`). Cleanest dogfood edit: a short "Reading an issue" note that reading includes the issue's comments (naming `gh` here is allowed — `.rp.md` IS the tool-specific config; AGENTS.md:10's generic rule binds the *skill*, not `.rp.md`).
- **Confirm-loop pattern is stated in-place in 7+ files, NEVER extracted** (`SKILL.md:29`, `autonomous-workflow.md:29`, `assisted-workflow.md:3,:9,:28`, `manage-issues.md:32,:42,:62`, `assisted-phases/1 - spec.md:24,:118`, `assisted-phases/2 - design-doc.md:27,:142`, `assisted-phases/3 - plan.md:36,:158,:234`). Each occurrence is subject-specific prose. House style treats this as per-subject prose, not a verbatim-repeated instruction to extract.
  - `manage-issues.md:60-62` (step 5): "Render the issue in the format above (omitting empty sections) and show it to the owner. Do not write to the tracker until the owner explicitly approves. On approval, create the new issue — or apply the modification — through the **Issues** convention."
  - `autonomous-workflow.md:29` (revise-loop): "If the owner accepts, proceed. If they want changes, revise and confirm again."

**Decisions resolved (analyst, grounded):**

- **D-T2 (confirm-loop: in-place, not extracted).** `create-pipeline.md` step 4 carries a **compact in-place** render→confirm→revise→write loop, phrased for the prompt-FILE subject and including the R9 conflict/revision-surfacing clause. It references `manage-issues.md` only for the *format* (R11), not for the loop.
  - _Why:_ the pattern is house style (7+ in-place occurrences, zero extractions); `create-pipeline.md` and `manage-issues.md` are sibling entry points never co-loaded, so AGENTS.md:8 ("no duplication on the reading path") is satisfied; the two loops differ materially in subject (synthesis→file vs. issue→tracker) and in that only the new one surfaces conflicts (R9), so AGENTS.md:11 (extract verbatim-repeated cross-path instructions) is not triggered. Extraction would force parameterization that adds words, violating AGENTS.md:7. The design doc records this reasoning to preempt a reviewer.
  - _Grounds:_ `manage-issues.md:60-62,:32`; `autonomous-workflow.md:29`; 7+ in-place precedents; AGENTS.md:7,:8,:11. → R3, R4, R5, R9.

### Q3 — Orchestrator capability model; assets-in-comments; author attribution; confirmation sequencing.

**Evidence (design-doc-researcher, grep/file-line verified):**

- **The skill NEVER enumerates or gates the orchestrator's capabilities.** `SKILL.md:10` defines the orchestrator by ROLE only ("You are the orchestrator of a team of agents…"). No capability list anywhere in `SKILL.md`, `load.md`, `setup.md`, `claude-code.md`, `pi.md`. Every "the orchestrator" mention describes an ACTION taken by instruction (reads filesystem/git, starts `/loop`, relays messages, opens a PR), never a gated capability. Model: the orchestrator is the human-facing driver running the skill via whatever tool is active and simply has that tool's host capabilities; the skill instructs actions, never declares/restricts capabilities.
- **Asset-download is the precedent for "instruction without a capability bullet."** `create-pipeline.md:27` already instructs the orchestrator to "download" the issue's screenshots/assets (an external fetch) routed through "the access mechanism captured by the **Issues** convention" — with NO capability statement. Adding "fetch directly-cited references — GitHub-internal via the **Issues** convention's access mechanism, other URLs via web fetch" is the same kind of instruction (the GitHub-internal half literally reuses the asset-download idiom; the external-URL half is the same shape). Stating the fetch instruction in `create-pipeline.md` fully suffices; inventing a "the orchestrator can fetch the web" capability layer would be a novel out-of-style construct that violates AGENTS.md minimalism. R7's "best-effort, does not block creation" already covers a tool that lacks web access.
- **Asset-download is body-only today.** `create-pipeline.md:27`: "If **the issue** has screenshots or other assets…" — scoped to the issue body, no mention of comments. Broadening to "the issue, any comment, or a cited reference" is a real additive change (R10/AC15).
- **No existing author-attribution idiom.** Grep for author/attribut/commenter/participant/"by <name>": no house idiom for attributing content to its author (only unrelated hits: commit-message "no agent attribution" `setup.md:160`; "authoritative" `2 - design-doc.md:66`). R6's "each comment attributed to its author" is net-new phrasing; keep it minimal.
- **Today's flow is write-then-commit with NO gate.** `create-pipeline.md:23` step 4 writes `prompt.md` to disk; `:30-32` step 5 commits it. No confirmation anywhere. R3/AC11 say "never **written or committed** silently" (WRITTEN, not just committed), so the gate sits before the *write*, mirroring `manage-issues.md:62` (render the draft and show it before writing to the tracker; write only on approval). This keeps AC14 (no approval file) trivially satisfied. Sub-decision flagged: download assets BEFORE showing the draft so the draft's relative-path asset links resolve (assets are downloaded artifacts, not the synthesized prompt; AC14 only forbids an approval artifact, so assets-first violates nothing).

**Decisions resolved (analyst, grounded):**

- **D-T1 (access split — FINAL).** `create-pipeline.md` step 4 instructs the synthesis to read the issue body + every comment, and to fetch/read references cited directly in the body or any comment — GitHub-internal references via the **Issues** convention's access mechanism; other references via web fetch — one hop, best-effort (an unreachable/gated reference is noted, creation proceeds). This is a pure instruction (no capability layer), grounded in the asset-download precedent. The capability is made real for projects by a minimal additive grant: `setup.md` "Issues (required)" gains comment-reading in its capability sentence, and the dogfood `.rp.md` gains a short "Reading an issue" note (where naming `gh` is allowed). NO orchestrator web-capability construct is invented.
  - _Why:_ orchestrator has no capability layer (Q3a); asset-download precedent (`create-pipeline.md:27`); spec already splits the two access paths (`spec.md:37`); researcher-agent Web idiom gives the generic vocabulary ("search and fetch … references"); AGENTS.md:10 (generic — no tool names in the skill; `.rp.md` is exempt as tool-specific config).
  - _Grounds:_ `SKILL.md:10`; `create-pipeline.md:27`; `setup.md:64`; `.rp.md:9-24`; `agents/*-researcher.md:15`; `spec.md:37`; AGENTS.md:7,:10. → R6, R7.

- **D-T5 (assets extended to comments + references).** Broaden `create-pipeline.md:27` asset-download scope from "the issue" to "the issue, any comment, or a cited reference." Self-containment (`:28`) likewise extends: `prompt.md` + downloaded assets must let a downstream agent understand the issue without reaching back to the body, comments, OR one-hop references.
  - _Grounds:_ `create-pipeline.md:27,:28`; R10/AC15. → R10.

- **D-T6 (author attribution — net-new, minimal).** Step 4 instructs reading "the body and every comment, noting each comment's author," and the synthesis preserves who-said-what where it matters to intent (e.g. a later comment that revises the ask). Minimal phrasing; no idiom to mirror.
  - _Grounds:_ no existing idiom (grep); R6, R9. → R6.

- **D-T7 (confirmation sequencing — FINAL).** Sequence inside creation: (1) gather inputs (body + comments + one-hop references); (2) download assets into `0-prompt/`; (3) synthesize the rendered `prompt.md` content; (4) show the FULL rendered text to the owner and surface any conflicts/revisions (R4, R9); (5) on owner request, revise and re-show (R5); (6) on explicit approval, write `prompt.md` and commit (R3). Nothing of the synthesized prompt is written to disk before approval. Assets are downloaded before the draft is shown so its relative-path links resolve. No approval file (AC14).
  - _Why:_ R3/AC11 forbid writing before approval; mirrors `manage-issues.md:62`; today's silent write-then-commit (`:23`,`:30-32`) is the flow being interrupted.
  - _Grounds:_ `create-pipeline.md:23,:30-32`; `manage-issues.md:62,:32`; `autonomous-workflow.md:29`; R3,R4,R5,R9, AC11,AC12,AC13,AC14. → R3, R4, R5, R9.

## Design Decisions

This is the authoritative output of the design phase. The change is documentation-only and touches a small, deliberate set of files. "Architecture" = placement + cross-linking + rendering convention + flow wording, all under the AGENTS.md "Rules when modifying the skill" (minimalist; no reading-path duplication; no needless negative phrasing; generic — no tool names in the skill; extract only verbatim-repeated cross-path instructions).

### Files changed (the full surface)

| File | Change | Requirements / ACs |
| --- | --- | --- |
| `skills/radical-pipelines/reference/create-pipeline.md` | Rewrite step 4 ("Generate the initial prompt") to: name the canonical format by referencing `manage-issues.md` ("The issue format"); document the prompt-file rendering wrapper; instruct reading body + all comments and fetching one-hop references (generic, access-split); state normalize-don't-converge + surface-conflicts; broaden asset-download to comments/references; and gate the write+commit on owner confirmation with a revise loop. | R1,R2,R3,R4,R5,R6,R7,R8,R9,R10,R11,R12; AC1–AC15 |
| `skills/radical-pipelines/reference/manage-issues.md` | No structural change to "The issue format" (it stays the single source). Optional 1-line addition only if needed so the cross-reference target section title is stable. | R1, R11; AC1, AC4 |
| `skills/radical-pipelines/reference/conventions/setup.md` | "Issues (required)": extend the capability sentence to include reading an issue's comments (generic). | R6; AC6 |
| `.rp.md` (dogfood project config) | Add a short "Reading an issue" note granting comment-reading (and that reading an issue includes its comments); `gh` may be named here since `.rp.md` is tool-specific config. | R6; AC6 (dogfood) |
| `.changeset/<slug>.md` | New `minor` changeset (prose) describing the normalized-prompt behavior. | Docs/release hygiene (phase 5) |

Notes on scope discipline:
- `manage-issues.md` keeps owning the section taxonomy (R1). The design does NOT relocate it (relocating would break `manage-issues.md` step 5 which depends on it, and is churn for no gain) and does NOT duplicate it in `create-pipeline.md` (R11). The only edit there, if any, is to keep the cited section heading "The issue format" stable as a link target.
- No new reference file is created. The confirm-loop and the rendering wrapper live in-place in `create-pipeline.md` (D-T2, D-T3); extraction is neither required (different reading paths; not verbatim-identical) nor desirable (would add parameterization words, against minimalism).

### D1 — Single source + cross-link (R1, R11; AC1, AC4)

The canonical section taxonomy remains defined ONLY in `manage-issues.md` ("The issue format"). `create-pipeline.md` step 4 references it instead of re-listing the sections, using the repo's existing file+section idiom:

> Synthesize the gathered material into the canonical format defined in `manage-issues.md` ("The issue format").

This is load-bearing (Q1#4: `manage-issues.md` is not otherwise on `create-pipeline.md`'s reading path), so the reference both satisfies AC4 and pulls the taxonomy onto the path without duplication (AGENTS.md:8). create-pipeline.md does NOT enumerate Goal/Constraints/Context/Assumptions.

### D2 — Prompt-file rendering wrapper documented in create-pipeline.md (R12; AC5)

The literal `prompt.md` file shape is pinned in `create-pipeline.md` step 4 (D-T3). Chosen ONE rendering (resolving the 5-way artifact drift documented in Q1):

- A top `# Prompt` H1 identifying the file as the prompt. (Chosen over "H1 = issue title" because the file is the *prompt*, the issue title is captured in the body's Title/Goal; a fixed H1 makes the wrapper checkable. This matches the majority/most-recent artifacts and our own dogfood prompt.)
- A source-attribution line pointing to the originating issue, rendered as a `> Source:` blockquote (chosen over a plain line for consistency with the majority of recent artifacts).
- A self-contained note: the file is self-contained; downstream agents do not need to open the issue.
- Then the canonical body sections per the referenced format (Goal always present; Constraints/Context/Assumptions only when they have content; rendered as real `## ` headings).

Concrete rendering specimen (the documented shape; this is what "matches the documented rendering" in AC5 means):

```
# Prompt

> Source: <originating issue reference>. This file is self-contained; agents do not need to open the issue.

## Goal

<outcome>

## Constraints        ← only if present
## Context            ← only if present
## Assumptions / directions to explore   ← only if present
```

Minimal valid output = `# Prompt` + source line + `## Goal` (AC3).

### D3 — Synthesis inputs, generic + access-split (R6, R7; AC6, AC7, AC8)

Step 4 instructs (generic, no tool names per AGENTS.md:10):
- Read the issue body and every comment, noting each comment's author (D-T6).
- Fetch and read references cited directly in the body or any comment — GitHub-internal references via the **Issues** convention's access mechanism; other references via web fetch — one hop only (references found inside fetched references are not crawled), best-effort (an unreachable or gated reference is noted, and creation proceeds).

Routed as a plain instruction with no capability layer (D-T1; asset-download precedent). The **Issues** convention capability is extended for comment-reading in `setup.md` and dogfood `.rp.md` (D-T1).

### D4 — Normalize, don't converge; surface conflicts (R8, R9; AC9, AC10)

Step 4 keeps and extends the existing no-converge seed (`create-pipeline.md:26`): reorganize the gathered material into the canonical sections, preserving stated intent in substance; file hypotheses/proposed directions/beliefs under **Assumptions / directions to explore**, labeled open; add no requirements, acceptance criteria, design, or implementation detail; never substitute a different goal. When body and comments conflict, or a later comment appears to revise the original ask, reflect the best current reading and surface the conflict/revision to the owner at confirmation rather than silently choosing (rides the D5 gate). Phrasing favors positive form where possible (AGENTS.md:9); the few necessary "must not" clauses (no goal substitution, no added requirements) are retained because they are operationally load-bearing.

### D5 — Confirmation gate + revise loop, in-place (R3, R4, R5; AC11, AC12, AC13, AC14)

Step 4 ends with a compact in-place loop (D-T2, D-T7), mirroring the `manage-issues.md:62` idiom but for the prompt-FILE subject: show the owner the FULL rendered `prompt.md` text (not a summary) along with any surfaced conflicts; if the owner requests changes, revise and show again; on explicit approval, write `prompt.md` and commit. Nothing of the synthesized prompt is written to disk before approval. Sequence: gather → download assets into `0-prompt/` → synthesize → show rendered draft (+ conflicts) → revise/re-show until approved → write + commit. No phase-0 approval file (AC14). Unconditional, regardless of mode (creation runs upstream of mode selection — `work-on-an-issue.md` step 2 < step 3; no `Decisions` section, T4).

### D6 — Assets + self-containment extended (R10; AC15)

Broaden `create-pipeline.md:27` asset scope from "the issue" to "the issue, any comment, or a cited reference"; keep the relative-path reference rule and the self-contained-folder rule (`:28`), now covering body + comments + one-hop references (D-T5).

### Reconciling steps 4 and 5

Today step 5 is a standalone "Commit". Because the write must be gated on approval (D5), the cleanest structure is to fold the commit into step 4's approval branch (write + commit on approval), leaving step 5 either removed or reduced to a pointer to the **Commit format** convention used at the approval moment. Exact step renumbering is an implementation detail for the writer; the binding outcome is: synthesized `prompt.md` is written and committed only after explicit owner approval, in that order, with no separate silent commit step.

### AGENTS.md compliance check

- Minimalist (`:7`): all additions are short; the rendering wrapper is ~3 lines; no padding.
- No reading-path duplication (`:8`): taxonomy referenced not copied; confirm-loop and manage-issues loop are on different, never-co-loaded paths.
- No needless negatives (`:9`): positive phrasing preferred; only operationally-necessary "must not" clauses kept.
- Generic (`:10`): no tool names in the skill; access routed through the **Issues** convention + generic "web fetch"; `gh` appears only in `.rp.md` (tool-specific config, exempt).
- Extract only verbatim cross-path repeats (`:11`): not triggered (D-T2 reasoning recorded).

### Out of scope (carried from spec; design adds nothing)

No phase-0 approval file; no transitive/deep external research (one hop); no PR review-thread ingestion; no requirements/AC/design/architecture/task-breakdown in `prompt.md`; no goal substitution; no new prompt format (only the rendering wrapper is newly written down).

### Open items for later phases

- **Plan phase:** exact step renumbering of `create-pipeline.md` (fold-commit-into-step-4 vs. keep step 5), and the precise final wording (subject to AGENTS.md minimalism review).
- **Docs phase:** author the `minor` changeset; verify the produced `prompt.md` matches the documented rendering (AC5) — e.g. by re-rendering this pipeline's own prompt to the new shape if desired.
