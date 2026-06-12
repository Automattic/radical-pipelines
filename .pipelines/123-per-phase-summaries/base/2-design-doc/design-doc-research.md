# Design Research: Per-phase summaries for the code and docs phases

## Research

<!-- Non-trivial findings from the design-doc-researcher, with sources cited. -->

### How artifact formats are defined today

The spec and design-doc formats live inline in their writer agents (`agents/spec-writer.md`, `agents/design-doc-writer.md`) as fenced markdown templates. Requirement 6 calls for a single definition shared by both the code and docs phases, but the two summaries are authored by two different agents (`code-reviewer`, `doc-reviewer`), so an inline template in one agent file cannot serve both. Precedent: the superseded #101 run-summary change created a standalone reference file (`skills/radical-pipelines/reference/run-summary-format.md`) and the orchestrator passed the resolved format to the writer in its launch prompt.

### Run isolation is structural

The orchestrator passes each agent `<artifacts-folder>/<run>/` as its artifact folder; agents are run-agnostic and never see the run name (`skills/radical-pipelines/reference/autonomous-workflow.md:64`). The reviewers already write their approval markers into the current run's phase folder this way, so a summary written to `4-code/` / `5-docs/` is automatically isolated to the current run. Acceptance criterion 5 (prior runs byte-unchanged) needs no extra mechanism.

### Reviewers already hold the full-run scope

The `code-reviewer` reviews the base-ref → HEAD diff for the whole run (covering all rejected iterations), not just the final batch. Requirement 3 / acceptance criterion 4 can be served by reusing the base ref the reviewer already receives — no new input is needed.

### Footprint of the superseded #101 implementation

The #101 (run-level summary) implementation still exists in the `101-run-summary` worktree. Its footprint: a `run-summary-format.md` reference file, a new `run-summary-writer` agent, a phase 5 docs procedure step, a project-overridable convention in `load.md`/`setup.md`, a completion-predicate entry in `pipeline-versioning.md`, fork-pipeline seeding, review-pipeline feeding summaries into review intents, and a SKILL.md "produces" cell. #123 drops: the new agent, the overridable convention, the run-level file, and the review-intent feeding. It keeps conceptually: a format reference file, completion-predicate entries, and fork seeding (now per-phase rather than run-level).

### Reviewer approval flow today (exact wording)

Both reviewer agents have the same shape. `agents/code-reviewer.md`: step 4 "Write the review" (L40–44) — decide the verdict first, then pick the filename: rejected → `<artifacts-folder>/4-code/code-review-N-rejected.md` (N from the launch prompt); approved → `<artifacts-folder>/4-code/code-review-approved.md` ("only one ever exists"). The review file has a fixed structure (L47–80). Step 5 "Commit and report" (L82–86): commit the file using the host commit format, then message the orchestrator ("batch approved" on approval; the deduplicated set of task IDs with issues on rejection). Guideline L95: the reviewer writes only the review file ("Do NOT rewrite code or tests"). `agents/doc-reviewer.md` is identical in structure (step 4 at L41–44, step 5 at L83–87, files under `5-docs/`).

### Base ref mechanics (full-run scope)

The base ref arrives in the reviewer's launch prompt as batch metadata (`code-reviewer.md` L14: "the list of task IDs in this batch, the base ref to diff against, and the rejection iteration number N"; L19: "Inspect the diff for the batch (base ref → current HEAD)"; same in `doc-reviewer.md` L14/L20). Per `pipeline-versioning.md` L22–28 ("Reviewer base ref"), the orchestrator captures the base ref once at run start (base run → merge-base with main; review run → tip of the previous run) and passes it unchanged to every reviewer invocation across all rejection iterations. So the reviewer's diff is already whole-run scope, not per-batch — acceptance criterion 4 is satisfied by reusing this existing input.

### Completion predicates today

`pipeline-versioning.md` "Per-phase completion" table (L42–49) lists `4-code/code-review-approved.md` for phase 4 and `5-docs/docs-review-approved.md` for phase 5. The phase refs' step 6 prose lists a fuller set (`4 - code.md` L37: "all code changes, unit tests, end-to-end tests, every code-review-N-rejected.md, and code-review-approved.md are committed"; `5 - docs.md` L38 analogous). Both the table rows and the step 6 prose must gain the summary files.

### Phases 4–5 are autonomous-only

`assisted-workflow.md` L21–22: phases 4 (Code) and 5 (Docs) "can't be run in assisted workflow"; assisted covers phases 1–3 only. Summaries are therefore only ever produced on the autonomous path — no assisted-phase file changes.

### Commit and format-passing mechanics (exact wording)

The reviewer's step 5 commits only the single review file ("Commit the file you wrote in step 4 using the host project's commit format", `code-reviewer.md` L82–86; identical in `doc-reviewer.md` L83–87). The commit format is a convention the orchestrator passes to every spawned agent (`autonomous-workflow.md` L65, L67: "Agents commit their own artifacts following the Commit format convention. The orchestrator does not commit on their behalf."). Artifact paths are hardcoded in the agent files (`<artifacts-folder>/4-code/code-review-approved.md` inline at `code-reviewer.md` L43); `<artifacts-folder>` is the only variable, passed per spawn (`autonomous-workflow.md` L64). The review-file structure is an inline fenced template in each agent file — not passed in, not a skill reference.

### Agents never read skill reference paths

A grep for `reference/` across all of `agents/` finds zero skill-path citations — agents are decoupled from skill-side paths. The orchestrator reads skill references and hands agents resolved content via the launch prompt. Confirming precedent from #101: `run-summary-writer.md` L12 "Read the resolved summary format from the orchestrator's launch prompt", L41 "The format... is handed to you in the launch prompt. Apply it exactly." The agent never read `run-summary-format.md` itself.

### The superseded #101 format (full content)

`run-summary-format.md` (worktree `101-run-summary`) defines a self-contained record "read by a later review run with no other prior-run context, so it must stand alone", with an omit-empty rule ("Render these sections and omit any that are empty — no `N/A` placeholders") and six sections: What / Why / How / Key decisions / Rejected approaches / Known limitations. No explicit audience or length guidance beyond "concisely" in the What comment; no mention of assets. Requirement 6's direction lists five sections (it drops Rejected approaches). The skeleton is fully phase-agnostic; only the framing prose is run-specific and needs rewording (run → phase), and the "read by a later review run" rationale no longer holds — #123 keeps review-input changes out of scope, so the audience is the human reader of the artifact folder and projects building run-level outputs.

### Format-file precedent: `intent-format.md`

`reference/intent-format.md` is the in-skill model for a standalone format reference: an H1 ("# The Intent Format"), a one-line purpose, "## Schema and rendering" with the same omit-empty rule, and "## Authoring discipline". It is referenced by three orchestrator-side skill files (`create-pipeline.md`, `manage-issues.md`, `review-pipeline.md`) — confirming format references are consumed orchestrator-side while agents get content via launch prompts. Naming pattern: `<artifact>-format.md`.

### Assets precedent

The skill already has the exact convention requirement 4 wants, twice: `create-pipeline.md` L33 "Download screenshots or other assets into `<artifacts-folder>/base/0-intent/` and reference them in intent.md by relative path", and `review-pipeline.md` L40 (same convention for review intents). Additionally, the code-reviewer already captures evidence during behavior verification (`code-reviewer.md` L36: "capture it (screenshots, transcripts, output samples, response diffs)"), so the code summary's assets are a natural byproduct of review — no new capture work.

### Integration points (researcher's survey)

Files #123 must touch: `agents/code-reviewer.md` and `agents/doc-reviewer.md` (write-summary-on-approve step), `skills/radical-pipelines/reference/autonomous-phases/4 - code.md` and `5 - docs.md` (outputs and approval step), `pipeline-versioning.md` per-phase completion table, a new shared format reference, and the SKILL.md phase-outputs table. Assisted phases cover only phases 1–3, so phases 4–5 are always autonomous and no assisted-phase file changes are needed. Review-pipeline needs nothing added (the #101 summary-feeding step stays out per the spec's out-of-scope list). Whether fork-pipeline seeding needs an explicit change is open — its per-phase copy may already carry the whole phase folder, summary included.

### The per-phase completion table and the multi-file row precedent

`pipeline-versioning.md` L42–49 verbatim: phase 0 → `0-intent/intent.md`; phase 1 → `1-spec/spec-review-approved.md`; phase 2 → `2-design-doc/design-doc-review-approved.md`; phase 3 → "`3-plan/code-plan-review-approved.md` and `3-plan/doc-plan-review-approved.md`"; phase 4 → `4-code/code-review-approved.md`; phase 5 → `5-docs/docs-review-approved.md`. The phase 3 row is the precedent for a row listing two files joined by "and" — rows 4 and 5 extend the same way.

### SKILL.md produces cells

SKILL.md L39–40: phase 4 produces "Code changes, unit and end-to-end tests, behavior verification"; phase 5 produces "Documentation (both internal and external)". Appending the summary to both cells is the only SKILL.md touch.

### Fork seeding and resume inherit the change for free

`fork-pipeline.md` step 5 (L42) seeds a fork by recursively copying whole phase folders ("`cp -r <parent-worktree>/<parent-artifact-folder>/base/<phase> <artifacts-folder>/base/<phase>`"). Because the summaries live inside `4-code/` and `5-docs/`, they ride along automatically — no fork edit. (#101's run-level `base/run-summary.md` sat outside the phase folders, which is exactly why it needed a dedicated fork step; per-phase placement dissolves that problem.) `resume-pipeline.md` step 3 (L18–23) confirms state "against the **Per-phase completion** predicate in `pipeline-versioning.md`" rather than restating file lists, and `review-pipeline.md` L11 gates on the same predicate — both inherit the extended rows with no edit.

### Exhaustive sweep of phase-4/5 output mentions

A repo-wide grep for the approval markers and summary names finds every hit either inside the seven-file edit set (see the completion-predicates topic) or in phase 1–3 / assisted-phase material that this change does not touch. Mentions of the `4-code`/`5-docs` folders elsewhere (`fork-pipeline.md` L14 folder-name list, `pipeline-versioning.md` L100–114 tree-rendering examples, `autonomous-workflow.md` L47–48 phase→reference map, `assisted-workflow.md` L21–22) describe phase nodes, not phase-folder contents, and need no touch.

### Predicate failure handling and the monitor's blind spot

Phase-ref step 6 is an assertion, not a recovery routine: no branch exists for a missing or uncommitted file. The generic path is `autonomous-workflow.md` L55 (predicate satisfied → report and continue) and L58 ("If a phase fails, stop and report to the owner"). The blocker protocol (`autonomous-workflow.md` L69–83) covers an agent self-reporting a missing input, not an agent silently omitting its own output. `health-monitoring.md` (L17–24, L32–37) watches liveness and transport only — a reviewer that approves, commits the approval marker, and messages the orchestrator but forgets the summary looks healthy to the monitor. The orchestrator's step 6 predicate check is the sole backstop for that case.

### Reviewer lifecycle

Both reviewers are non-persistent — "One fresh instance per batch" (`4 - code.md` L26, `5 - docs.md` L27). After one finishes there is no handle to message it back; the recovery primitive is relaunching a fresh instance, which can re-derive everything from the stable base-ref → HEAD scope.

### Behavior-verification captures today

The code-reviewer's captured evidence (screenshots, transcripts, output samples — `code-reviewer.md` L36) is recorded within the review markdown's "## Behavior verification" section (template L66–68); no convention exists today for saving captures as standalone files in `4-code/`. Requirement 4's asset clause is therefore a new, additive affordance for reviewers, modeled on the intent-side convention — the reviewer already holds the captures and gains a place to persist and link them.

## Topics

### Topic: Where the summary-writing step attaches to the approval flow

- **Spec link:** Requirements 1, 2 / Acceptance criteria 1, 2
- **Options:**
  1. Graft into the reviewer's existing approve path: on an approved verdict the reviewer also writes the summary file, and the existing "Commit and report" step commits the approval marker and the summary together (one commit) before messaging the orchestrator.
  2. Same graft, but commit the review file and the summary as two separate commits.
  3. Have the orchestrator drive a separate post-approval summary step (relaunching the reviewer or another agent).
- **Trade-offs:** Option 1 leaves no window where `*-review-approved.md` is committed without its summary, satisfies "committed alongside" in acceptance criteria 1–2 literally, and changes the reviewer's step structure minimally (step 4 gains a write-on-approved instruction; step 5 is unchanged in shape). Option 2 adds a gap state the completion predicate would have to catch routinely, for no benefit. Option 3 adds an orchestration step and contradicts the spec's "no new phase and no new agents" framing.
- **Decision:** Option 1. In both `agents/code-reviewer.md` and `agents/doc-reviewer.md`, the approved branch of the "Write the review" step also writes the summary (`4-code/code-summary.md` / `5-docs/docs-summary.md`), and the "Commit and report" step commits the review file and the summary together, then messages the orchestrator as today. Rejected branch is untouched — no summary on rejection.
- **Rationale:** The reviewers already write a file into the phase folder and commit on approval; adding a second file to that same path is the smallest graft that satisfies requirements 1–2. The single commit makes the "alongside" guarantee structural rather than predicate-enforced.

### Topic: Where the shared summary format lives and how the reviewers learn it

- **Spec link:** Requirement 6
- **Options:**
  1. Inline the format as a fenced template in both reviewer agent files (the pattern used by every other artifact format).
  2. A single standalone skill reference file; the orchestrator reads it and passes the format content in the reviewer's launch prompt (the #101 mechanism, minus its project-override machinery).
  3. A standalone reference file that the reviewer agents read directly by path.
- **Trade-offs:** Option 1 matches the dominant inline pattern but duplicates the definition across two files — spec/design-doc formats stay inline only because each has a single author agent, and the project's no-duplication rule requires repeated instructions to move to a shared file. Option 3 breaks a hard architectural boundary: no agent file cites a skill `reference/` path; agents receive resolved content via launch prompts. Option 2 keeps the single definition, respects the boundary, and follows the #101 precedent exactly; its cost is small launch-prompt plumbing in the two phase refs.
- **Decision:** Option 2. A new skill reference file holds the single summary format definition. The phase 4 and phase 5 refs instruct the orchestrator to include the format in every reviewer launch prompt (the verdict isn't known in advance, so it is passed on every launch). Both reviewer agent files instruct: on approval, write the summary following the format from the launch prompt. No override resolution — the spec puts a project-overridable format convention out of scope, so the orchestrator passes the skill's definition as is.
- **Rationale:** Requirement 6 demands a single definition shared by both phases and "defined by the skill"; with two author agents, inline templates would be a literal duplication, and direct agent reads of skill paths have no precedent. The #101 mechanism is proven and gets simpler here without override resolution.
- **Sub-question (resolved below):** the reference file is `skills/radical-pipelines/reference/summary-format.md`, shaped after `intent-format.md` — see the format topic.

### Topic: The summary format — sections and wording

- **Spec link:** Requirements 3, 4, 6
- **Options:**
  1. Reuse the #101 six-section set verbatim: What / Why / How / Key decisions / Rejected approaches / Known limitations.
  2. The five sections requirement 6 names: What / Why / How / Key decisions / Known limitations, with rejected alternatives folded into Key decisions where worth recording.
- **Trade-offs:** Rejected approaches earned its place in #101's run-level summary because a later review run read it with no other context. Per phase, that rationale is gone (review-input changes are out of scope) and rejected directions largely mirror the rejection iterations already visible in the phase folder; a separate section would mostly duplicate them. The omit-empty rule makes either choice cheap, but a section that is usually empty or duplicative doesn't earn its definition.
- **Decision:** Option 2. The format lives in a new `skills/radical-pipelines/reference/summary-format.md`, shaped after `intent-format.md`: an H1 and one-line purpose, then a schema with the established omit-empty rule ("Render these sections and omit any that are empty — no `N/A` placeholders") and five sections — What / Why / How / Key decisions / Known limitations. The framing prose defines a summary as a self-contained, human-friendly record of what its phase produced in the current run as a whole — phase wording, not #101's run wording, and no "read by a later review run" rationale (the audience is the reader of the artifact folder and projects building run-level outputs from per-phase summaries). The coverage statement ("the current run as a whole") lives here, in the single shared definition, serving requirement 3 without repeating it in both agent files. One line states the asset convention, mirroring the existing intent convention: screenshots or other assets live in the same phase folder and are referenced by relative path. The rendered file's H1 names its artifact (Code Summary / Docs Summary); the section skeleton is identical for both.
- **Rationale:** Requirement 6 names the five-section direction explicitly; the sixth section's justification was specific to the superseded run-level design. `summary-format.md` follows the established `<artifact>-format.md` naming, and "summary" is the term the spec and file names (`code-summary.md`, `docs-summary.md`) already use. Reusing the omit-empty discipline and the intent-format shape keeps the skill consistent.

### Topic: Completion predicates and downstream output enumerations

- **Spec link:** Requirement 5 / Acceptance criteria 3, 6
- **Options:** No real alternatives — requirement 5 dictates the predicate extension, and the question was which downstream files restate phase 4/5 outputs and therefore need the same addition.
- **Decision:** Extend the `pipeline-versioning.md` "Per-phase completion" rows following the phase 3 two-file precedent: phase 4 → "`4-code/code-review-approved.md` and `4-code/code-summary.md`"; phase 5 → "`5-docs/docs-review-approved.md` and `5-docs/docs-summary.md`". In the phase refs, add the summary to the Outputs list and to the step 6 completion prose, and extend the reviewer-launch step (step 4) so the launch prompt includes the summary format (resolved content from `reference/summary-format.md` — per the boundary, agents receive content, never skill paths). Append the summary to the SKILL.md phase 4 and 5 produces cells. Everything else inherits: fork seeding copies whole phase folders so summaries ride along; resume and review-pipeline gate on the predicate by reference. The full edit set is seven files — (1) new `reference/summary-format.md`, (2) `pipeline-versioning.md` rows 4–5, (3) `autonomous-phases/4 - code.md`, (4) `autonomous-phases/5 - docs.md`, (5) `agents/code-reviewer.md`, (6) `agents/doc-reviewer.md`, (7) SKILL.md.
- **Rationale:** The predicate table is the single source of truth that resume and review-pipeline already delegate to, so extending its two rows propagates completion gating everywhere (acceptance criterion 3). Per-phase placement inside the phase folders is what keeps fork seeding untouched — a concrete simplification over the superseded run-level design.

### Topic: Failure modes and observability

- **Spec link:** Requirement 5 / Acceptance criterion 3 (the predicate as the safety net)
- **Options:**
  1. Rely on the existing mechanisms: the single-commit coupling makes the approved-without-summary state require the reviewer to deviate from its instructions, and the orchestrator's step 6 predicate check catches it — handled by the existing generic path (phase not complete → stop and report to the owner), with a fresh reviewer relaunch as the natural fix since the base-ref → HEAD scope is stable.
  2. Add an explicit recovery branch to the skill: on a missing summary, the orchestrator re-dispatches a fresh reviewer to produce it.
- **Trade-offs:** Option 2 hardens a gap the health monitor cannot see (it watches liveness, not artifacts). But the same gap already exists for `code-review-approved.md` itself, and the skill defines no special recovery for it — the system's design is agent-writes-its-output + predicate check + generic failure path. A summary-specific recovery branch would be a special-case restatement the skill's rules discourage.
- **Decision:** Option 1. No new recovery mechanism. The design notes for the writer: the failure surface is "reviewer approves but omits the summary"; the monitor is blind to it; the extended step 6 predicate is the detection point, after which the existing failure path applies, and a fresh reviewer can be relaunched because reviewers are non-persistent and the run scope is re-derivable.
- **Rationale:** Consistency with how the equally critical approval marker is already protected. The single commit from the attachment topic minimizes the window; the predicate extension (requirement 5) is precisely the detection requirement the spec asks for, and nothing more is needed.

### Topic: Approach, components, and data flow (synthesis)

- **Spec link:** All requirements; acceptance criterion 6
- **Decision (end-to-end mental model):** When the orchestrator launches a `code-reviewer` or `doc-reviewer`, the launch prompt — which already carries the batch task IDs, the base ref, and the iteration number — also carries the summary format, resolved by the orchestrator from `reference/summary-format.md`. On a rejected verdict nothing changes. On an approved verdict the reviewer writes two files into its phase folder: the approval marker (as today) and the summary, written per the format and covering the run's whole base-ref → HEAD output; any assets it wants to reference sit beside them in the same folder. It commits them together and messages the orchestrator. The orchestrator's phase-completion check now requires both files, and every consumer of phase folders (fork seeding, resume, review gating) inherits the new artifact with no changes. Components: two modified agents (`code-reviewer`, `doc-reviewer`), one new reference file (`summary-format.md`), three modified skill files (two phase refs, `pipeline-versioning.md`), one table-cell touch (SKILL.md). Untouched but load-bearing: `autonomous-workflow.md` launch conventions, `fork-pipeline.md` seeding, `resume-pipeline.md`, `review-pipeline.md`, `health-monitoring.md`, all assisted-phase files.
- **Dependencies:** None new — no external libraries, services, or tools. The change is entirely prompt/markdown-level within the skill and agent definitions, and stays agnostic to git hosting and trackers (the summary consumers are out of scope).

## Open Questions

<!-- Unresolved sub-questions deferred to the implementation phases. -->

- The final prose of `summary-format.md` (purpose line, section comments, asset line) — the sections, omit-empty rule, coverage statement, and asset clause are fixed here; the exact minimalist wording is writer/implementation work.
- The exact wording of the phase-ref reviewer-launch step item that carries the format (e.g. as a named launch-prompt item alongside the base ref and iteration number) — an implementation-phase wording choice within the decided mechanism.

## Risks

<!-- Anything worth flagging to the design-doc-writer and downstream phases. -->

- The health monitor cannot detect a reviewer that approves without writing the summary; detection rests solely on the orchestrator's step 6 predicate check. Mitigated by coupling the summary into the same write-and-commit step as the approval marker.
- The summary is written by the reviewer right after it forms its verdict on the final batch, so it may skew toward the final batch's content. Mitigated by the format's coverage statement ("what the phase produced in the current run as a whole") and by the reviewer's diff already spanning base ref → HEAD; the design-doc and code-plan should preserve that statement verbatim.
- Skill edits must honor the project's minimalist writing rules (fewest words, no duplication across reading paths); the format content deliberately lives only in `summary-format.md` and is referenced — never restated — by the phase refs and agent files.
