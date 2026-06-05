# Spec Research

## Rough Idea

> Source issue: Automattic/radical-pipelines#66
>
> ### Goal
>
> The pipeline generates a PR description as an inspectable artifact (for example `pr-description.md`), so that opening a pull request draws from that artifact rather than re-deriving the description from scratch.
>
> ### Assumptions / directions to explore
>
> These are the owner's current hunches, recorded as open directions, not requirements. Later phases should confirm or revise them based on their own research.
>
> - Produce the PR description as a **second artifact in the Docs phase**, since that phase already reviews everything that shipped. Leaving it to the orchestrator instead would force the orchestrator to examine all the changes, increasing its context burden. This is a gut feel only, with no strong opinion attached.
> - If the PR description becomes a Docs-phase artifact, the merge-pipeline guide (issue #57, `merge-pipeline.md`) will need to explain that this artifact is the source used to open the PR, whether the artifacts live in the repository itself (artifacts-in-repo) or upstream (artifacts-in-fork).
>
> ### Related
>
> - Issue #57 introduces `merge-pipeline.md`, the reference for merging a finished pipeline. Whatever shape this PR-description artifact takes, the merge guide is expected to reference it when opening the PR.

## Q&A

### Q1: Does anything in the current pipeline already reference a `pr-description.md` artifact, and does anything already produce it?

I need to ground the whole feature in the existing state. Specifically: (a) Is `pr-description.md` (or any PR-description artifact) referenced anywhere today — in conventions, references, or agent definitions? (b) Is it produced anywhere today? (c) Does `merge-pipeline.md` exist yet, given issue #57 is the guide that is supposed to consume this artifact? Please confirm the exact files and line numbers so we know whether this feature fills an existing dangling reference or introduces something entirely new.

**A:** A `pr-description.md` artifact is ALREADY referenced but nothing produces it. (a) The only reference is `skills/radical-pipelines/reference/conventions/setup.md:122` — in `artifacts-in-fork` mode, the "opening a PR" step 5 says the orchestrator "Opens the PR in `upstream` from that clean branch, using `pr-description.md` as the body." That reference has no path/folder qualifier and no producer. A repo-wide grep for `pr-description` finds only that one line (plus copies in other worktrees). (b) It is not produced, not committed, not listed in any phase's artifacts, and not in any completion predicate. The `artifacts-in-repo` PR path does not mention it at all. (c) `merge-pipeline.md` does NOT exist yet; `gh issue view 57` confirms #57 is open and unwritten; `work-on-an-issue.md:33` offers a "Merge" action that says "read `merge-pipeline.md`" but the file is absent. #57 lists #66 as related.

**Reasoning:** This feature fills a dangling reference: the consumer contract (the file name `pr-description.md` used as the PR body) already exists in `artifacts-in-fork` mode, but no phase or agent creates it. #66 can DEFINE/standardize the artifact (name, location, producer, contract); the merge guide that fully CONSUMES it (#57) is a separate, not-yet-written deliverable.

**Sources:** `setup.md:122`; repo-wide grep for `pr-description`; `gh issue view 57`; `work-on-an-issue.md:33`; absence of `merge-pipeline.md`.

### Q2: How is a PR opened today in BOTH modes, and what does the orchestrator currently do to produce the PR description?

I want to pin down the consumer side and what "re-deriving from scratch" concretely means. (a) In `artifacts-in-fork` mode, beyond `setup.md:122`, is there any current guidance on what the PR *body* contains or where its text comes from — or is `pr-description.md` simply named with no producer and no content contract? (b) In `artifacts-in-repo` mode, is there ANY documented PR-opening flow at all today (does the pipeline ever open a PR in repo mode, or is that also deferred to the unwritten `merge-pipeline.md`)? (c) Is there any existing instruction, anywhere, that tells the orchestrator (or any agent) to compose/derive a PR description by examining the diff or the shipped changes? I want to know what the "from scratch" derivation this issue wants to avoid actually looks like today, if it exists at all.

**A:** The only documented PR-opening procedure anywhere today is the 5-step list in the `artifacts-in-fork` setup convention (`setup.md:117-123`). It names `pr-description.md` as the body but specifies NOTHING about content or where the text comes from. There is NO PR-opening flow for `artifacts-in-repo` mode. There is NO instruction anywhere to compose/derive a description from the diff. (a) Fork mode: step 5 (`setup.md:122`) is the only mention of the body; no required sections, no producer, no "derive from X". (b) Repo mode: `setup.md:110` says artifacts-in-repo needs "no further information" and says nothing about PRs; `gh pr create`/`gh pr` has ZERO hits repo-wide; "open a PR" appears only at `setup.md:117`. The general open-a-PR flow for both modes is deferred to the missing `merge-pipeline.md` (#57); its sibling actions `review-pipeline.md` and `close-pipeline.md` (`work-on-an-issue.md:34-35`) are ALSO missing — the entire post-phase-5 action set is unwritten. (c) No derive-from-diff instruction exists anywhere. The only superficial matches are unrelated (`code-plan-writer.md:66`, `README.md:175` changeset rule).

**Reasoning:** The "re-deriving the description from scratch" cost is IMPLIED, not documented. Because no artifact exists and `setup.md:122` points at a nonexistent file, an orchestrator opening a PR today would have to read the full diff and compose a body on the spot — exactly the context burden the prompt's hunch (line 13) wants to avoid by moving that work into a phase that already reviewed everything. Risk: an orphaned artifact if #66 produces `pr-description.md` but neither `setup.md` nor the missing merge guide is updated to consume it in both modes.

**Sources:** `setup.md:110,117-123` (esp. 122); `work-on-an-issue.md:32-35`; `README.md:175`; `code-plan-writer.md:66`; grep results (`gh pr create`/`gh pr` zero hits; "open a PR" only at setup.md:117); absence of `merge-pipeline.md`, `review-pipeline.md`, `close-pipeline.md`.

### Q3: Can a pipeline ever reach "open a PR" without phase 5 having run? (assisted-mode gap, resumed/forked pipelines)

The prompt's central hunch is to produce the artifact in the Docs phase (phase 5). But you flagged that phases 4-5 can't run in assisted mode. I need to know whether placing the producer in phase 5 ever leaves the consumer (open-a-PR) without an artifact. Concretely: (a) Does the assisted workflow ever open a PR, or does it only run individual earlier phases and stop — i.e., is "open a PR / merge" exclusively reachable after an autonomous run that includes phase 5? (b) When `work-on-an-issue.md` offers the "Merge" action, what is the precondition? You said it's "completed phase is phase 5 with no active phase" — so is it structurally guaranteed that phase 5 has completed before Merge is offered? (c) Can a pipeline that completed phase 5 in autonomous mode later be resumed/forked such that someone opens a PR but the `5-docs/` folder (and any artifact in it) is present and inherited? In short: is "phase 5 completed" a reliable precondition of "open a PR", so that a phase-5 artifact is always present at PR time? Ground in `assisted-workflow.md`, `work-on-an-issue.md`, `resume-pipeline.md`, `fork-pipeline.md`, `pipeline-versioning.md`.

**A:** Yes — "phase 5 completed" is a RELIABLE precondition of "open a PR." (a) The assisted workflow runs exactly ONE phase and stops (`assisted-workflow.md:1,16-22,32`); it explicitly cannot run phases 4-5, and has NO PR/merge step at all. The "open a PR" decision lives only in `work-on-an-issue.md`. (b) The Merge action (`work-on-an-issue.md:32-33`) is offered only when "the pipeline's completed phase is the last phase (phase 5) and there is no active phase." "completed phase" = highest-numbered phase whose predicate is satisfied (`pipeline-versioning.md:34`), and phase-5 completion = `5-docs/docs-review-approved.md` committed (`pipeline-versioning.md:32`). So Merge is structurally unreachable unless the full committed `5-docs/` folder is present. (c) Resume re-attaches to the existing branch/worktree where `5-docs/` lives; a phase-5-complete pipeline has no active phase, so resume does no rollback and never touches `5-docs/` (`resume-pipeline.md:2,4,33,35`). Fork copies whole phase folders byte-for-byte up to and including the inherited phase and commits them (`fork-pipeline.md:5,42,6`); inheriting phase 5 carries the entire `5-docs/` (including any `pr-description.md`) verbatim, and the artifact participates cleanly in tree-SHA lineage (`pipeline-versioning.md:14`). Fork only inherits COMPLETE phases (`fork-pipeline.md:14`).

**Reasoning:** Placing the producer in phase 5 is a SAFE home: there is no reachable documented path to opening a PR without phase 5 having completed. Because assisted mode caps at phase 3 and has no PR step, it does not create a "PR without artifact" path — it simply cannot open a PR at all, so no documented consumer needs the artifact there.

**Nuances (do not break the conclusion):**
1. The guarantee currently rests on the `work-on-an-issue.md:32` gate, NOT on any check at the moment of `gh pr ...`. The canonical PR-opening procedure (`merge-pipeline.md`, #57) is unwritten, so its preconditions aren't yet fixed in text. The one concrete PR-opening step today (`setup.md:117-123`, fork mode) states no phase-5 precondition of its own; it just assumes `pr-description.md` exists. To make this airtight, the spec may (i) require the artifact as a phase-5 output so the completion predicate enforces its existence, and (ii) note that `merge-pipeline.md` should assert "phase 5 complete" as its precondition when written.
2. Assisted-mode consequence: a purely-assisted pipeline caps at phase 3 and can never reach Merge. No assisted CONSUMER gap exists. Residual open question: would anyone ever want a PR-description artifact for an assisted-only run? No documented consumer needs one there.

**Sources:** `assisted-workflow.md:1,16-22,32`; `work-on-an-issue.md:32-33`; `pipeline-versioning.md:14,32,34`; `resume-pipeline.md:2,4,33,35`; `fork-pipeline.md:5,6,14,42`; `setup.md:117-123`.

### Q4: What must `pr-description.md` contain, and should the contract be host-project-specific or hardcoded sections?

The Radical Pipelines pipeline is GENERIC — it runs against any host project, each with its own PR conventions, issue tracker, and template. (a) Is there a host-project PR-body convention captured anywhere in the conventions (`.rp.md`, `setup.md`, tool rules) today — e.g. a "PR template" or "PR body format" convention — or only the changeset/commit conventions? (b) Given the pipeline is generic, should the artifact's content contract be expressed as "a ready-to-use PR body that follows the host project's PR conventions and links the originating issue" (drift-resistant, like how `doc-plan-writer` avoids hardcoding wording), rather than mandating fixed sections like `## Summary`/`## Testing`? (c) Does the issue tracker convention (`setup.md:62-66`, GitHub/Linear/Jira/etc.) imply the artifact must include a tracker-appropriate issue link (e.g. `Closes #N` for GitHub) rather than a GitHub-specific keyword? I want the spec to require the artifact be a usable PR body grounded in the host project's conventions and the originating issue, without baking in GitHub- or this-repo-specific structure. Confirm whether any host-PR-template convention exists, and whether there's a natural place to add one if needed.

**A:** (a) There is NO host-project PR-body convention anywhere today. The full convention set (`setup.md` headers at 32,46,54,62,68,74,82,88,94) is: Pipeline base slug, Artifact folder, Commit format, Issues, Worktrees, Branch names, Spawning teams, Health monitoring, Artifact storage — none is a PR template/body/format. Notably, the "documentation convention" and "verification convention" that doc/code agents repeatedly read are NOT dedicated setup sections either; they are host conventions the agents discover at run-time. (b) Yes — expressing the contract as "a ready-to-use, self-contained PR body that follows the HOST project's PR conventions and links the originating issue" is idiomatically correct, with strong precedent: `doc-writer.md:17,27`, `doc-reviewer.md:19,32`, `code-writer.md:13,29,38,42`, `code-reviewer.md:31`, and "host project's commit format" everywhere. Drift-resistance precedent: `doc-plan-writer.md:8,62` (plan what/where/for-whom, not exact wording; explicit good/bad example). Hardcoding GitHub/this-repo sections would contradict the generic ethos (`SKILL.md:44` "This skill is generic; each project supplies its own conventions"). (c) Issue-linkage must be tracker-agnostic: the Issues convention (`setup.md:62-66`) is explicitly tracker-agnostic, so `Closes #N` is a GitHub-ism not to bake in. Nothing today standardizes how the pipeline references the originating issue in a PR (grep found none). The phase-0 prompt carries the source issue (`0-prompt/prompt.md:3` "Source issue: ...#66"), giving the producer a reliable tracker-neutral handle, but turning that into a PR-body link is new ground. Note: GitHub auto-close keywords only work when the PR targets the default branch in the same repo; in `artifacts-in-fork` mode the PR is on `upstream` (`setup.md:117-123`), so `Closes #N` would reference upstream numbering — another reason to keep linkage host/tracker-aware.

**Reasoning:** The spec should require an observable outcome — the artifact is a usable PR body conforming to the host's PR conventions and linking the originating issue — and leave the mechanism (implicit run-time discovery vs. an explicit optional convention section; exact producer agent) to the design phase. Two viable homes if an explicit convention is later warranted: (1) IMPLICIT — no new setup section; producer follows host PR conventions discovered at produce-time, exactly like doc/verification conventions work today (lowest friction). (2) EXPLICIT — an OPTIONAL "PR body" `###` section under `setup.md` step 2, captured into `.rp.md`, where owners can record a PR template path or required sections. Either way, the orphan-risk `setup.md:122` bare reference should be reconciled to the artifact's canonical location.

**Sources:** `setup.md:32,46,54,62-66,68,74,82,88,94,117-123,122`; `SKILL.md:44`; `doc-writer.md:17,27`; `doc-reviewer.md:19,32`; `code-writer.md:13,29,38,42`; `code-reviewer.md:31`; `doc-plan-writer.md:8,62`; `0-prompt/prompt.md:3`; grep (no PR-body/PR-linkage convention).

### Q5: At the observable level, what is the artifact's lifecycle — is it a REQUIRED, REVIEWED, completion-gated phase-5 output?

I want to set the success criteria without prescribing the exact agent (that's design's job). Three observable outcomes I want your read on, grounded in how phase 5 enforces quality today: (a) Should the artifact be a REQUIRED phase-5 output such that phase 5 cannot complete without it — i.e., the completion predicate (`pipeline-versioning.md:32`, today only `docs-review-approved.md`) should additionally require `pr-description.md` present and committed? (b) Should the artifact be REVIEWED for accuracy/quality before phase 5 completes, the way doc-writer output is gated by the doc-reviewer's approval (`5 - docs.md`, `doc-reviewer.md`)? Concretely, must the reviewer verify the PR description accurately reflects the shipped changes (not invented, not stale) and links the originating issue, with rejection sending it back like any other doc task? (c) The artifact must reflect what shipped across the WHOLE pipeline (spec intent, design rationale, code, docs), not just the docs phase — is the doc-reviewer already positioned to verify that (it reads spec/design/code, per `doc-reviewer.md:14-21`), so accuracy is checkable against real sources? I'm not asking which agent writes it; I'm asking whether "required + reviewed-for-accuracy + completion-gated" is the right observable success bar, consistent with how phase 5 already treats its outputs.

**A:** Yes — "required + reviewed-for-accuracy + completion-gated, reflecting the whole shipped change and linking the originating issue" is the right bar, consistent with phase-5 mechanics. (a) REQUIRED + completion-gated: adding "`pr-description.md` present and committed" to the phase-5 predicate (`pipeline-versioning.md:32`) is the natural enforcement point and closes the orphan risk — a phase-5 lacking it is incomplete, so Merge (gated on completed-phase==5) is unreachable without it. Lineage risk is minimal: `pr-description.md` in `5-docs/` is just another file in the folder's tree, forks/inherits cleanly (`pipeline-versioning.md:14,38-44`). CAVEAT: requiring TWO files in a phase predicate is a new shape — every other phase names a single `-approved.md` terminator (`pipeline-versioning.md:25-32`); not a problem but a deliberate deviation the spec should state. (b) REVIEWED: the existing approve/reject machinery is the right gate. The `doc-reviewer` is adversarial and accuracy-focused (`doc-reviewer.md:6`, spot-check at :36-37 "either produce the evidence or reject the batch"), exactly the bar for verifying the PR description reflects SHIPPED changes (not invented/stale) and links the issue, rejecting and re-dispatching like any task. (c) WHOLE pipeline: the phase-5 reviewer already reads `doc-plan.md`, `design-doc.md`, `spec.md`, and the shipped code (`doc-reviewer.md:14-21`); phase 5 is the FIRST and only point where everything shipped coexists and has been reviewed — confirming prompt.md:13. A doc-writer is equally positioned to PRODUCE it (`doc-writer.md:12-16` reads spec/design/code).

**Reasoning / KEY CONSTRAINT:** The doc-reviewer approves ONCE per batch and its verdict is filename-encoded — approval writes the singleton `docs-review-approved.md` (`doc-reviewer.md:8,43-44`), which IS the phase terminator (`pipeline-versioning.md:32`). So the PR-description accuracy check must live INSIDE that same single approval decision: the reviewer cannot write `docs-review-approved.md` while the PR description is missing/inaccurate; if wrong, that is a rejection that re-dispatches the PR-description task alongside others (`5 - docs.md:5,37`) until one clean pass approves the WHOLE batch including the PR description. This needs NO new gate and NO second terminator. The spec should steer AWAY from a second independent approval/terminator for the PR description (would create two competing "phase done" signals and break the single-`approved.md` invariant). Ordering subtlety (design's call, not spec's): the PR description summarizes the docs too, so the producer must run at/after the doc-writers; the spec should NOT require the PR description to be finalized BEFORE the docs it summarizes exist. Phrase the requirement as "reflects the full set of changes that shipped in the pipeline, including the phase-5 documentation" — keeping ordering implicit without prescribing mechanism.

**Sources:** `pipeline-versioning.md:14,25-32,38-44`; `doc-reviewer.md:6,8,14-21,36-37,43-44`; `doc-writer.md:12-16`; `5 - docs.md:5,12-16,36-37`; `prompt.md:13`.

### Q6: Where is the scope boundary between #66 (produce the artifact) and #57 (consume it when opening a PR)?

The orphan risk (A1/A2): #66 could produce `pr-description.md` but leave the consumer side untouched, since the canonical open-a-PR procedure lives in the unwritten `merge-pipeline.md` (#57). I need the spec's scope-exclusions to be explicit and the orphan risk consciously handled. (a) Of the existing CONSUMER touchpoints, which must #66 reconcile to avoid shipping an orphan, vs. which legitimately belong to #57? Specifically: the bare/fork-only `setup.md:122` reference (which already names `pr-description.md` as the body but with no path and only in fork mode) — should #66 fix that reference to point at the artifact's canonical location and make it mode-symmetric, or is even that #57's job? (b) Is there any consumer touchpoint that, if left unreconciled by #66, would make the produced artifact actively WRONG or misleading (e.g. `setup.md:122` continuing to imply a producerless file)? (c) Conversely, what clearly belongs to #57 and should be an explicit OUT-OF-SCOPE exclusion in this spec — e.g. writing the full merge/open-a-PR procedure, the repo-mode PR-opening flow, the `gh pr` invocation, the upstream cherry-pick transformation? I want the spec to (i) own producing + standardizing the artifact and reconciling any EXISTING reference that would otherwise be left dangling/misleading, and (ii) explicitly exclude authoring the merge procedure that consumes it. Confirm which touchpoints fall on each side, grounded in `setup.md`, `work-on-an-issue.md`, and the #57 issue text.

**A:** Instinct confirmed. (a) There is exactly ONE pre-existing consumer reference in the whole pipeline (`setup.md:122` — the only `pr-description` occurrence in pipeline source, per A1/A2), so the "reconcile pre-existing references" obligation has a single bounded target. #66 should reconcile it because it predates #57 and the artifact, and becomes a current inconsistency once the artifact is real. Minimal fix: make the reference resolve to the artifact's canonical location (e.g. `<artifacts-folder>/5-docs/pr-description.md`) instead of a bare path-less name. #66 should NOT add a new repo-mode PR-opening flow (that is procedure = #57); it should only keep the existing fork-mode reference honest. The reference lives inside the fork-mode setup CONVENTION (not a merge procedure file), which is why keeping it honest is #66's job — conventions should describe reality. (b) Yes — leaving it unreconciled makes it a DEFECT the moment #66 ships a canonical `5-docs/pr-description.md`: the bare, path-less, fork-only, producerless reference would actively mislead (a reader/orchestrator following it verbatim could look in the wrong place). This is the strongest argument for #66 owning the reconciliation. It is the ONLY such touchpoint; nothing else would become wrong. (c) All four candidates belong to #57 and should be explicit out-of-scope exclusions: authoring `merge-pipeline.md` / the open-a-PR/merge procedure (#57's literal title and Context); the repo-mode PR-opening flow (none exists; creating one is procedure); the `gh pr create` invocation; and the upstream cherry-pick/transformation (`setup.md:117-121` steps 1-4 — #66 only cares that step 5's body SOURCE is reconciled). The issue texts agree: #57 Related = "#66 — the PR description artifact that this guide must reference when opening the PR"; #66 Related = "#57 — `merge-pipeline.md` reference, which must reference this artifact when opening the PR." ADDITIONAL exclusions: the sibling missing guides `review-pipeline.md` / `close-pipeline.md`; and prescribing the producing/reviewing AGENT mechanics (which agent, exact sequencing — that is design's job, not a scope item).

**Reasoning / NET BOUNDARY:**
- #66 OWNS: (i) canonical name + location (`5-docs/pr-description.md`; the filename `pr-description.md` is already fixed by the existing `setup.md:122` reference); (ii) host-aware, tracker-agnostic, drift-resistant content contract (A4); (iii) required + reviewed-for-accuracy + completion-gated lifecycle within the single phase-5 gate (A5); (iv) updating the pipeline's OWN descriptions of phase-5 outputs so they are not stale — the `5 - docs.md` Outputs list (:12-16), the SKILL.md "Produces" table, and the `pipeline-versioning.md:32` predicate; (v) reconciling the single pre-existing consumer reference at `setup.md:122`.
- #66 EXPLICITLY EXCLUDES: authoring `merge-pipeline.md` / the open-a-PR/merge procedure; any new repo-mode PR-opening flow; the `gh pr create` invocation; the upstream cherry-pick/transformation (`setup.md:117-121` steps 1-4); the other missing post-phase-5 guides (`review-`/`close-pipeline.md`); and prescribing the producing/reviewing AGENT mechanics.
- FRAMING CAUTION: when #66 touches the `pipeline-versioning.md:32` predicate and the `5 - docs.md` Outputs list, that is #66 updating descriptions of its OWN output (in scope). The line NOT to cross is editing those files to add MERGE/PR-opening BEHAVIOR (that is #57). #66 touches the doc surfaces that ENUMERATE the artifact, not the procedure that CONSUMES it.

**Sources:** `setup.md:117-122` (esp. 122); `work-on-an-issue.md:33`; #57 issue text (title + Context + Related, via `gh issue view 57`); #66 issue Related; A1/A2 (single pre-existing reference); `5 - docs.md:12-16`; `pipeline-versioning.md:32`; `SKILL.md` Produces table.

### Q7: Body only, or also the PR title? And is the artifact a single self-contained file?

Two last scope-clarity points so the success criteria are unambiguous. (a) Does the artifact cover ONLY the PR body, or also the PR title? `setup.md:122` uses it "as the body." The merged-PR prior art shows titles are distinct one-liners. Should the spec scope the artifact to the PR BODY, and treat the PR title as either out of scope (left to #57/the orchestrator) or optionally derivable from the artifact's top heading? (b) Is the artifact a SINGLE self-contained Markdown file (`5-docs/pr-description.md`) that can be passed verbatim as the PR body, with no dependence on other artifacts or repo-relative links the upstream PR viewer can't resolve? I want to confirm "one file, usable verbatim as the body" is the right shape, especially given fork mode (upstream never sees the artifacts). Ground in `setup.md:117-123` and the prior-art PRs.

**A:** (a) The existing consumer contract needs ONLY the BODY. `setup.md:117-123` mentions a title NOWHERE — step 1 generates the upstream branch name, steps 2-4 cherry-pick/rewrite/push, step 5 uses `pr-description.md` "as the body." No "as the title" clause exists anywhere (consistent with A2: no `gh pr create` invocation is documented). Scope the artifact to the PR body; leave the title to #57/the orchestrator (the title is part of the open-a-PR PROCEDURE, which A6 placed in #57's scope). A title MAY be optionally derivable from the body's leading heading, but the spec should NOT require a separately-carried title field — that would pull title-composition mechanics into #66. No consumer reads a title today; requiring one over-specifies. (b) "One self-contained Markdown file, usable verbatim as the body" is exactly right: step 5 passes the singular file with no assembly/concatenation/templating. The no-unresolvable-links rule is a HARD correctness constraint in fork mode: `setup.md:119` excludes artifact commits from the upstream cherry-pick and `setup.md:123` says the upstream PR viewer never sees the fork — so the entire `.rp/` artifact tree (including `pr-description.md` itself) never exists on the upstream branch the PR is opened from. Any link to another artifact or a fork-relative path would be a BROKEN link in the published PR. This applies more mildly in artifacts-in-repo mode too (a body pointing at `.rp/pipelines/.../spec.md` re-couples the PR to internal artifacts, the very thing the issue wants to decouple). Prior art does not contradict: the merged-PR bodies stand alone with an issue link and no links into the artifact folder.

**Reasoning:** "Self-contained" means the body's MEANING and usability do not depend on any other artifact or on fork-only files — NOT "no links at all." It can and should carry its own tracker-appropriate issue link (A4c) and may link to public, upstream-resolvable targets. The prohibited class is specifically links/paths the published (possibly upstream) PR viewer cannot resolve — artifact-internal references and fork-relative paths.

**Sources:** `setup.md:117-123` (esp. :119, :122, :123); prior-art merged PR bodies (standalone with `Closes #N`, no artifact-folder links).

## Research

### Phase 5 docs mechanics and the "second Docs-phase artifact" hunch

- `autonomous-phases/5 - docs.md` drives phase 5: per-task fresh `doc-writer`s (sequential, sharing one working tree), then ONE `doc-reviewer` per batch, with a re-dispatch loop on rejection.
- Phase 5 outputs today: doc updates committed on the branch; `5-docs/docs-review-N-rejected.md` per rejected iteration; `5-docs/docs-review-approved.md` (singleton terminator). No PR-description output today.
- Phase 5 has NO per-phase decisions ("This phase has no per-phase decisions").
- CONSTRAINT: phases 4 and 5 cannot run in the assisted workflow — `assisted-workflow.md:22` says Docs "Can't be run in assisted workflow". Only the autonomous workflow runs Docs. So if the PR description is a Docs-phase artifact, assisted-only runs never produce it. The spec needs a position on this gap.

### Agents and where planning originates

- `doc-plan-writer.md` writes `3-plan/doc-plan.md` (the ordered doc tasks) — produced in PHASE 3, not phase 5. So if the PR description needs planning, that planning input originates in phase 3.
- `doc-writer.md` executes one task each; "Do NOT touch source code"; owns external doc surfaces.
- `doc-reviewer.md` runs one adversarial batch review.

### Completion predicate and enforcement

- `pipeline-versioning.md:32` — phase 5 is complete when `5-docs/docs-review-approved.md` is committed. If `pr-description.md` becomes a required phase-5 artifact, this predicate (and the doc-reviewer's approval gate) is the natural enforcement point.

### #66 vs #57 ownership boundary

- #66 can define/standardize the artifact (name, location, producer, contract). The merge guide (#57) that consumes it is separate and unwritten. Spec should decide how much #66 owns vs defers to #57.

### Doc-impact surfaces that would drift (if a new phase-5 artifact is added)

- `SKILL.md:33-40` — the per-phase "Produces" table (phase 5 row = "Documentation (both internal and external)").
- `autonomous-workflow.md:37-44` and `assisted-workflow.md:15-22` — phase/subfolder tables.
- `pipeline-versioning.md` per-phase completion table (line 32).

### Fork / versioning interaction

- `fork-pipeline.md` copies whole phase folders byte-for-byte; lineage is derived via tree SHAs. A `pr-description.md` placed in `5-docs/` would be part of that folder's tree, so it inherits/forks cleanly with the rest of phase 5 — no special handling needed, but worth a sentence in spec.

### setup.md:122 reference is bare and asymmetric

- The existing reference names only the bare filename `pr-description.md` — no `<artifacts-folder>/` or `5-docs/` path qualifier, and no statement of producer or timing. So even the consumer contract is underspecified.
- The reference is fork-only: the `artifacts-in-repo` PR path does not mention `pr-description.md` at all. The consumer contract is asymmetric across storage modes. The spec should decide whether the artifact is produced uniformly regardless of mode (it is the same Docs phase either way) and reconcile the bare/fork-only `setup.md:122` reference.

### External `pr-description` Claude Code skill (name collision, not in-repo)

- The researcher's Claude Code harness lists an external `pr-description` skill ("Generate PR description"). It is NOT part of this repo. It is a generic runtime skill, unrelated to the Radical Pipelines artifact. Noted only to avoid a name-collision surprise; could be inspected as prior art for a content contract if useful, but has no bearing on in-repo state.

### PR-body conventions in THIS repo (prior art for the content contract)

This repo's own recently-merged PRs share a consistent skeleton (spec-analyst inspected via `gh pr list --state merged`):
- A **summary / overview** — one paragraph of what the change does and why (headings seen: `## Summary`, `## What changed`, or a descriptive H2/H1 title line).
- An **issue link** — EVERY inspected PR includes `Closes #N` / `Fixes #N` (PR#85 "Closes #83", PR#84 "Closes #70", PR#82 "Closes #81", PR#79 "Closes #75", PR#77 "Closes #64"). This is a de-facto required element.
- A **change breakdown** — bulleted "What changed" list.
- A **verification / validation** section — `## Verification` / `## Validation` / `## Test plan` / inline "npm ci and npm test pass".
- Optional **scope / decisions / notes** — `## Out of scope`, `## Scope notes`, `## Decisions`, `## Note for #N`, maintainer notes.
- `CONTRIBUTING.md:138` "Summary format conventions" governs CHANGESET summaries (imperative mood, `BREAKING:` prefix), NOT PR bodies; there is no separate documented PR-body template, so the de-facto skeleton above is the only convention.

### #57 already-defined consumer mechanics (fork mode) the artifact must satisfy

- `setup.md:117-123` (fork mode) shows the body is consumed by `gh pr` as a single Markdown file used verbatim as the PR body. So `pr-description.md` must be self-contained, render correctly as a GitHub PR body, and not depend on artifact-internal cross-links the upstream PR viewer can't resolve (the upstream PR never sees the fork's artifacts).

## Consolidated Requirements

Each requirement is an observable outcome of the running pipeline/skill. "The artifact" means the PR-description artifact this feature introduces. Mechanism choices (which agent writes/reviews it, exact sequencing, implicit vs. explicit host-convention capture) are deliberately left to the design phase; the requirements below fix only observable behavior.

### Core artifact

1. After the Docs phase (phase 5) completes for a pipeline, an inspectable PR-description artifact named `pr-description.md` exists, committed on the pipeline branch, inside the phase-5 artifacts folder (`<artifacts-folder>/5-docs/pr-description.md`). The filename `pr-description.md` is fixed (it matches the pre-existing reference at `setup.md:122`).

2. The artifact is the content of a pull-request BODY: a single, self-contained Markdown file that can be used verbatim as the PR body when a PR is opened, with no assembly, concatenation, or templating step required.

3. The artifact is self-contained: its meaning and usability do not depend on any other pipeline artifact or on any fork-only file. It contains no links or paths that the published PR viewer cannot resolve — specifically no references into the pipeline's artifact folder and no fork-relative paths (in artifacts-in-fork mode the upstream PR never sees the fork's artifacts, so such links would be broken). It MAY link to publicly resolvable targets (e.g. the originating issue).

4. The artifact references the originating issue in a way appropriate to the host project's issue tracker (for example a GitHub `Closes #N` auto-close keyword where supported, or a plain issue link/identifier otherwise). The reference is tracker-agnostic — no GitHub-specific keyword is hard-coded into the generic contract.

5. The artifact's content and structure follow the host project's pull-request conventions (a PR template if the host provides one; otherwise the host's observed/de-facto PR conventions; otherwise a sensible generic PR body). The contract is drift-resistant: it does not mandate fixed section names (e.g. it does not hard-code `## Summary` / `## Testing`). This mirrors how doc/code agents already follow the host project's documentation, verification, and commit conventions.

6. The artifact summarizes the full set of changes that shipped in the pipeline — spec intent, design rationale, the code, and the phase-5 documentation — not only the documentation phase. Its claims reflect what actually shipped (not invented, not stale).

### Lifecycle and enforcement

7. The artifact is a REQUIRED phase-5 output: phase 5 cannot be considered complete unless `pr-description.md` is present and committed on the pipeline branch. The phase-5 completion predicate (today: `5-docs/docs-review-approved.md` committed) additionally requires the artifact. (This makes phase 5 the first and only point where everything that shipped coexists and has been reviewed, so the artifact is always present once phase 5 completes — and therefore always present at the points where opening a PR is offered.)

8. The artifact is REVIEWED for accuracy before phase 5 completes, using the phase's existing single approve/reject gate (the same pass that produces `docs-review-approved.md`). The review verifies the PR description accurately reflects the shipped changes and links the originating issue; an inaccurate or missing PR description is a rejection that re-dispatches the work alongside any other flagged phase-5 work, looping until one clean pass approves the whole batch including the PR description. There is NO second, independent approval or terminator file for the PR description (that would create a competing "phase done" signal and break the single-`docs-review-approved.md` invariant).

9. The artifact participates in pipeline fork/lineage like any other phase-5 file: forking a pipeline at phase 5 carries `pr-description.md` into the new pipeline verbatim, and resuming a phase-5-complete pipeline preserves it. (No special handling beyond living in `5-docs/`.)

### Consistency reconciliation (consumer reference)

10. The single pre-existing reference to the artifact (`setup.md:122`, which names `pr-description.md` as the PR body in artifacts-in-fork mode) resolves to the artifact's canonical location and does not misdescribe it (no longer implying a path-less, producer-less file). This prevents the feature from shipping a self-contradictory pipeline once the artifact becomes real.

11. The pipeline's own descriptions of phase-5 outputs are updated to enumerate the new artifact so they are not left stale — at minimum the phase-5 reference's Outputs list (`autonomous-phases/5 - docs.md`), the per-phase "Produces" table (`SKILL.md`), and the phase-5 completion predicate (`pipeline-versioning.md`). These updates describe what phase 5 now produces; they do not add any merge/PR-opening behavior.

### Out of scope (belongs to issue #57 or is otherwise excluded)

12. Authoring the merge / open-a-PR procedure itself (`merge-pipeline.md`, issue #57), including: any new artifacts-in-repo PR-opening flow; the actual `gh pr create` (or equivalent) invocation; the PR TITLE composition; and the artifacts-in-fork upstream transformation (clean-branch naming, code-only cherry-pick, commit-message rewrite, push — `setup.md:117-121` steps 1-4). #66 only ensures step 5's body SOURCE is the reconciled artifact.

13. The other missing post-phase-5 action guides `review-pipeline.md` and `close-pipeline.md` (`work-on-an-issue.md:34-35`).

14. Prescribing the producing/reviewing AGENT mechanics — which agent writes the artifact, which reviews it, the exact ordering, and whether host PR conventions are captured implicitly at produce-time or via a new optional setup convention. These are design-phase decisions; this spec fixes only the observable outcomes above.

15. Producing the artifact for assisted-only runs. The assisted workflow cannot run phase 5 (it caps at phase 3) and never opens a PR, so no documented consumer needs the artifact there; this spec does not require assisted-mode production.

### Notes for the design phase (not requirements)

- Requiring TWO files in the phase-5 completion predicate (`docs-review-approved.md` + `pr-description.md`) is a deliberate deviation from the current one-`-approved.md`-terminator-per-phase pattern; design should adopt it consciously.
- The PR-description producer must run at or after the phase-5 doc-writers (so it can summarize the documentation it must cover); the spec phrases requirement 6 to keep this ordering implicit without prescribing mechanism.
- A host PR-body convention does not exist today; design may either have the producer discover host PR conventions at produce-time (like documentation/verification conventions work today) or add an optional PR-body convention to setup. Either satisfies requirement 5.
- The externally-listed `pr-description` Claude Code runtime skill is unrelated to this in-repo artifact; it is not a dependency or a producer of `pr-description.md`.
