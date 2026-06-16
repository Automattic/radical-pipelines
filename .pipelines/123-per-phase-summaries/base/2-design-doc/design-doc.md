# Design Doc: Per-phase summaries for the code and docs phases

## Overview

Today a Radical Pipelines run leaves a human-readable record for every phase except code and docs: phases 1–3 are represented by the spec, the design doc, and the plans, but phases 4 and 5 leave only review-approval markers, so the artifact folder alone never says what those two phases actually produced. This change has each of them leave a summary inside its phase folder — `4-code/code-summary.md` and `5-docs/docs-summary.md` — written by the reviewer that approves the phase. After this change, a run's artifact folder tells the whole story of the run, and a project can build run-level outputs (such as a PR description) from the per-phase summaries while Radical Pipelines itself stays agnostic to git, GitHub, and trackers.

The chosen approach grafts the summary onto the existing reviewer approval flow rather than adding a phase or an agent. The two reviewers (`code-reviewer`, `doc-reviewer`) already write a file into the phase folder and commit it on approval; on an approved verdict each now writes a second file — the summary — and commits it in the same commit as the approval marker. The summary format is defined once in a new skill reference file and reaches both reviewers through the orchestrator's launch prompt. The per-phase completion predicates are extended so a phase is complete only when both its approval marker and its summary are committed.

## Approach

The mental model end to end:

1. **Format defined once, in the skill.** A new reference file, `skills/radical-pipelines/reference/summary-format.md`, holds the single summary format shared by both phases. It is shaped after the existing `reference/intent-format.md`: an H1, a one-line purpose, a schema with the established omit-empty rule, and authoring discipline. The format is phase-agnostic; only the rendered file's H1 differs (Code Summary vs. Docs Summary).

2. **Format reaches the reviewer through the launch prompt.** Agents never read skill `reference/` paths — the orchestrator reads skill references and hands agents resolved content. The phase 4 and phase 5 reference files instruct the orchestrator to include the resolved summary format in every reviewer launch prompt, alongside the batch metadata it already passes (task IDs, base ref, iteration number). The format is included on every launch because the verdict is not known in advance.

3. **Reviewer writes the summary on approval only.** Each reviewer's "Write the review" step gains an instruction: on an approved verdict, in addition to writing the approval marker, write the summary file to the same phase folder, following the format from the launch prompt. The summary covers what the phase produced in the current run as a whole — the reviewer's existing base-ref → HEAD diff scope, which already spans every rejected iteration, not just the final batch. On a rejected verdict nothing changes; rejected iterations produce no summary.

4. **Both files committed together.** The reviewer's "Commit and report" step commits the review file and the summary together in one commit, then messages the orchestrator exactly as today. The single commit makes the "summary committed alongside the approval marker" guarantee structural — there is never a committed state where the approval marker exists without its summary.

5. **Completion gating requires both files.** The "Per-phase completion" table in `pipeline-versioning.md` gains the summary file in the phase 4 and phase 5 rows, joined by "and" exactly like the existing phase 3 two-file row. The phase 4 and phase 5 reference files add the summary to their Outputs list and to the step 6 completion prose. Every downstream consumer of the predicate — resume, review gating — inherits the extended rows because both already delegate to the predicate by reference rather than restating file lists.

6. **Everything else inherits for free.** Fork seeding copies whole phase folders recursively, so a summary living inside `4-code/` or `5-docs/` rides along with no fork edit. This per-phase placement is the key simplification over the superseded run-level approach (#101), whose run-level file sat outside the phase folders and therefore needed dedicated fork, review-feeding, and override machinery.

Run isolation is structural and needs no new mechanism. The orchestrator passes each agent `<artifacts-folder>/<run>/` as its artifact folder; agents are run-agnostic and never see the run name. A reviewer writing to `4-code/` or `5-docs/` is therefore writing into the current run's own folder, so a review run's summaries land under its own run folder and a prior run's summaries are never touched.

## Components

**New components**

- `skills/radical-pipelines/reference/summary-format.md` — the single shared definition of the summary format. The sole place the format, its coverage statement, the omit-empty rule, and the asset convention are stated.

**Modified components**

- `agents/code-reviewer.md` — step 4 ("Write the review") gains a write-the-summary-on-approval instruction; step 5 ("Commit and report") commits the review file and the summary together.
- `agents/doc-reviewer.md` — the same two changes, mirrored for the docs phase.
- `skills/radical-pipelines/reference/autonomous-phases/4 - code.md` — adds `4-code/code-summary.md` to the Outputs list, extends the reviewer-launch step (step 4) to carry the resolved summary format in the launch prompt, and adds the summary to the step 6 completion-predicate prose.
- `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md` — the same three changes, mirrored for the docs phase.
- `skills/radical-pipelines/reference/pipeline-versioning.md` — the "Per-phase completion" table rows for phase 4 and phase 5 each gain their summary file.
- `skills/radical-pipelines/SKILL.md` — the phase 4 and phase 5 "Produces" cells each gain the summary.

**Untouched but load-bearing**

These carry the change with no edit; they are listed so the implementer knows not to touch them:

- `reference/autonomous-workflow.md` — the launch conventions (the orchestrator passes each agent its `<artifacts-folder>`; agents commit their own artifacts following the Commit format convention) already cover how the format reaches the reviewer and how the reviewer commits.
- `reference/fork-pipeline.md` — seeding recursively copies whole phase folders, so summaries inside `4-code/` and `5-docs/` ride along.
- `reference/resume-pipeline.md` and `reference/review-pipeline.md` — both gate on the "Per-phase completion" predicate by reference, so they inherit the extended rows.
- `reference/health-monitoring.md` — watches liveness and transport only; out of this change's scope (see Failure Modes).
- All assisted-phase files — the assisted workflow covers only phases 1–3; phases 4 and 5 are autonomous-only, so summaries are only ever produced on the autonomous path and no assisted-phase file changes are needed.

## Interfaces and Data Flow

**The summary file format.** `summary-format.md` defines a self-contained, human-friendly record of what its phase produced in the current run as a whole. It is shaped after `intent-format.md`: an H1 (`# The Summary Format`), a one-line purpose, a "Schema and rendering" section carrying the established omit-empty rule ("Render these sections and **omit any that are empty** — no `N/A` placeholders"), and an authoring-discipline section. The schema is five sections:

- **What** — what the phase produced in this run, as a whole.
- **Why** — the purpose it serves.
- **How** — how it was realized.
- **Key decisions** _(optional)_ — notable decisions, including rejected alternatives worth recording, folded in here.
- **Known limitations** _(optional)_ — gaps or caveats a reader should know.

The coverage statement ("what its phase produced in the current run as a whole") lives in this single shared definition, serving requirement 3 without being repeated in either agent file. One line states the asset convention, mirroring the existing intent convention: screenshots or other assets live in the same phase folder and are referenced by relative path. The rendered file's H1 names its artifact — `# Code Summary` for `4-code/code-summary.md`, `# Docs Summary` for `5-docs/docs-summary.md`; the section skeleton is identical for both.

**The launch-prompt contract.** The orchestrator's reviewer launch prompt already carries the batch task IDs, the base ref to diff against, and the rejection iteration number N. It gains one item: the resolved content of `summary-format.md`. The reviewer reads the format from the launch prompt — never from a skill path. This mirrors the proven mechanism by which every other resolved-content item reaches an agent.

**The on-disk artifacts.** On an approved verdict the reviewer writes two files into `<artifacts-folder>/<phase>/`:

- the approval marker — `code-review-approved.md` / `docs-review-approved.md` (unchanged from today), and
- the summary — `code-summary.md` / `docs-summary.md` (new),

plus any assets it chooses to reference, sitting beside them in the same folder. The two markdown files (and any assets) are committed together in one commit using the host project's commit format.

**The completion predicate.** Phase 4's predicate becomes "`4-code/code-review-approved.md` and `4-code/code-summary.md` committed"; phase 5's becomes "`5-docs/docs-review-approved.md` and `5-docs/docs-summary.md` committed". The predicate is the single source of truth that resume and review gating already delegate to.

## Key Decisions

### Decision: Graft the summary onto the reviewer's approval path, in one commit

- **Choice:** On an approved verdict, the reviewer writes the summary file in its existing "Write the review" step and commits it together with the approval marker in its existing "Commit and report" step — one commit, then the same orchestrator message as today. The rejected branch is untouched.
- **Alternatives:** (a) Commit the review file and the summary as two separate commits. (b) Have the orchestrator drive a separate post-approval summary step, relaunching the reviewer or another agent.
- **Trade-offs:** The single commit leaves no window where the approval marker is committed without its summary, so the "committed alongside" guarantee is structural rather than something the predicate must routinely catch. Two commits would add a gap state for no benefit. A separate orchestration step would add a phase or an agent, contradicting the spec's "no new phase and no new agents" framing. The chosen graft changes the reviewer's step structure minimally: step 4 gains a write-on-approved instruction, step 5 is unchanged in shape.
- **Traces to:** Requirements 1, 2 / Acceptance criteria 1, 2.

### Decision: Define the format once in a skill reference file, deliver it via the launch prompt

- **Choice:** A single standalone reference file, `summary-format.md`, holds the format. The orchestrator reads it and passes the resolved content in every reviewer launch prompt. Both reviewer agents read the format from the launch prompt and apply it on approval.
- **Alternatives:** (a) Inline the format as a fenced template in both reviewer agent files (the pattern the spec and design-doc formats use). (b) A standalone reference file that the reviewer agents read directly by path.
- **Trade-offs:** The spec/design-doc formats stay inline only because each has a single author agent; the summary has two author agents, so inlining would duplicate the definition across two files and violate the project's no-duplication-across-reading-paths rule. Direct agent reads of a skill `reference/` path have no precedent and would break a hard architectural boundary — no agent file cites a skill path; agents receive resolved content via launch prompts. The chosen option keeps a single definition, respects the boundary, and follows proven precedent; its only cost is small launch-prompt plumbing in the two phase reference files.
- **Traces to:** Requirement 6.

### Decision: Five-section summary format, no separate "Rejected approaches" section

- **Choice:** The format carries five sections — What / Why / How / Key decisions / Known limitations — with rejected alternatives folded into Key decisions where worth recording. The framing prose uses phase wording (what the phase produced in the current run as a whole), with no "read by a later review run" rationale; the audience is the human reader of the artifact folder and projects building run-level outputs from the per-phase summaries.
- **Alternatives:** Reuse the superseded run-level set verbatim — six sections, adding a standalone "Rejected approaches".
- **Trade-offs:** A separate "Rejected approaches" section earned its place in the superseded run-level design because a later review run read that summary with no other context. Per phase that rationale is gone — feeding summaries into review input is out of scope here — and rejected directions largely mirror the rejection iterations already visible in the phase folder, so a separate section would mostly duplicate them. The omit-empty rule makes either choice cheap on disk, but a usually-empty or duplicative section does not earn its definition.
- **Traces to:** Requirements 3, 4, 6.

### Decision: Extend the completion predicate; let downstream consumers inherit

- **Choice:** Add the summary file to the phase 4 and phase 5 rows of the "Per-phase completion" table (joined by "and", following the phase 3 two-file precedent), and add it to each phase reference file's Outputs list and step 6 completion prose. Make no edit to fork seeding, resume, or review gating.
- **Alternatives:** Restate the extended file lists in resume / review / fork instead of (or in addition to) extending the single table.
- **Trade-offs:** The predicate table is the single source of truth resume and review gating already delegate to, so extending its two rows propagates completion gating everywhere with no restatement. Per-phase placement inside the phase folders is what keeps fork seeding untouched — the recursive whole-folder copy carries the summary automatically. Restating file lists elsewhere would reintroduce duplication the project's rules forbid.
- **Traces to:** Requirement 5 / Acceptance criteria 3, 6.

### Decision: Run isolation by structural placement, no new mechanism

- **Choice:** Rely on the existing run-scoped artifact folder. The reviewer writes to `<artifacts-folder>/<phase>/`, which the orchestrator has already resolved to the current run's folder, so each run's summaries land under its own run folder.
- **Alternatives:** Add an explicit guard that a review run does not edit a prior run's summaries.
- **Trade-offs:** Agents are run-agnostic and only ever receive their own run's folder, so a review run physically cannot write into a prior run's folder through this path — an explicit guard would restate a property the architecture already enforces. The reviewers already isolate their approval markers this exact way.
- **Traces to:** Requirement 7 / Acceptance criterion 5.

## Dependencies

None new. The change is entirely prompt- and markdown-level within the skill and agent definitions — no external libraries, services, or tools, and no new internal modules. It depends only on existing skill mechanics already in place: the orchestrator's launch-prompt delivery of resolved content, the Commit format convention, the run-scoped `<artifacts-folder>` resolution, and the "Per-phase completion" predicate. It stays agnostic to git hosting and trackers; the summary consumers are out of scope.

## Failure Modes and Observability

**Reviewer approves but omits the summary.** This is the one new failure surface. The health monitor cannot see it — the monitor watches liveness and transport, not artifacts, so a reviewer that approves, commits the approval marker, and messages the orchestrator but forgets the summary looks healthy. The single-commit coupling minimizes the window: producing the approved-without-summary state requires the reviewer to deviate from its instructions, since both files are written and committed together. The detection point is the orchestrator's extended step 6 completion-predicate check, which now requires both files; if the summary is missing the phase is not complete, and the existing generic failure path applies (a phase that fails → stop and report to the owner). Because the reviewers are non-persistent and the base-ref → HEAD run scope is stable and re-derivable, the natural recovery is relaunching a fresh reviewer.

**No summary-specific recovery branch is added.** The same gap already exists for the approval marker itself, and the skill defines no special recovery for it — the system's design is agent-writes-its-output, plus the predicate check, plus the generic failure path. A summary-specific recovery branch would be a special-case restatement of a rule the skill already covers generally, which the project's writing rules discourage. Consistency with how the equally critical approval marker is protected is the deciding factor.

## Risks and Open Questions

**Risks**

- The health monitor cannot detect a reviewer that approves without writing the summary; detection rests solely on the orchestrator's step 6 predicate check. Mitigated by coupling the summary into the same write-and-commit step as the approval marker, so the omission requires a deviation from instructions.
- The summary is written by the reviewer right after it forms its verdict on the final batch, so it could skew toward the final batch's content. Mitigated by the format's coverage statement ("what the phase produced in the current run as a whole") and by the reviewer's diff already spanning base ref → HEAD across every rejected iteration. The code plan must preserve that coverage statement verbatim in `summary-format.md`.
- Skill edits must honor the project's minimalist writing rules — fewest words, no duplication across reading paths. The format content lives only in `summary-format.md` and is referenced, never restated, by the phase reference files and the agent files. The coverage statement in particular lives once, in `summary-format.md`, and must not be echoed into either agent file.

**Open questions (deferred to implementation)**

- The final minimalist prose of `summary-format.md` — purpose line, section comments, asset line. The sections, the omit-empty rule, the coverage statement, and the asset clause are fixed by this design; the exact wording is writing work for the code plan / implementation.
- The exact wording of the phase reference files' reviewer-launch step item that carries the format — for example, naming it as a launch-prompt item alongside the base ref and iteration number. The mechanism is decided; the wording is an implementation choice.
