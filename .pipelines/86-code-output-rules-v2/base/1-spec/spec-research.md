# Spec Research

## Rough Idea

> Source: GitHub issue [#86](https://github.com/Automattic/radical-pipelines/issues/86).

### Goal

Code produced by a pipeline follows two output rules by default, without the owner having to restate them each run:

1. Comments on code that wasn't changed are left untouched.
2. The product code never mentions or references Radical Pipelines artifacts (pipelines, phases, specs, design docs, plans, etc.).

### Context

- Both are guidelines that were hand-passed to the Skillsmith pipeline (issue #37, v2); the intent is to promote them into the Radical Pipelines tool so every pipeline gets them for free.
- The "no RP-artifact references" rule comes from an observed leak where generated code carried a comment narrating the pipeline process — a plan task and the pipeline itself: https://github.com/Automattic/skillsmith/blob/25dd6b4246d1d3c426e9c3f066b754f5844cc35f/src/improvement/improver.ts#L106-L109
- Team discussion concluded both rules "should be included in the tool's general prompts."

### Assumptions / directions to explore (open)

- Proposed home is the tool's general prompts, so the rules apply across phases — recorded as a direction, not a requirement; the spec and design phases decide the actual mechanism and scope.

## Q&A

### Q1: Where do cross-cutting instructions that govern pipeline-produced code currently live, what are the candidate homes for these default rules, and is there relevant prior art?

**A:** There is a **complete, finished v1 implementation of this exact feature** in the sibling worktree `/Users/darerodz/Code/radical-pipelines/.claude/worktrees/86-code-output-rules` (branch `worktree-86-code-output-rules`), **not merged to trunk** (29 commits ahead, 1 behind; confirmed unmerged via `git merge-base --is-ancestor`). v2 is re-running the same issue from scratch on current trunk.

Architecture on trunk:
- `SKILL.md` is the generic orchestrator entry point; per-phase agent behavior lives under `reference/`.
- Cross-cutting tool constants live as **dedicated named reference files** under `reference/` (e.g. `summary-format.md`, `pipeline-versioning.md`, `guardrails.md`), referenced by name — the dominant established pattern.
- `reference/conventions/` holds the host-overridable layer sourced from `.rp.md` (`load.md`, `passing.md`, `setup.md`). The `## Conventions` block (`passing.md`) is injected into each agent's launch prompt but is entirely host-sourced/overridable.
- **Guardrails** are deterministic exit-code gates, host-declared in `.rp.md`, optional — there is no tool-shipped mandatory gate, and these rules are semantic, not command-decidable.
- Only three agents write host-project product: `code-writer-tdd`, `code-writer-e2e` (Code phase), `docs-writer` (Docs phase). `code-reviewer` and `docs-reviewer` gate each producing phase; the phase completes only when the reviewer writes `*-review-approved.md`.
- Agent profiles read only themselves + their launch prompt; a shared instruction is **restated in each profile under a name-handle** (worked precedent: "the workflow's blocker protocol," restated in ~14 profiles). Orchestrator-needed content can instead be **inlined into the launch prompt** (precedent: the orchestrator passes "the resolved content of `summary-format.md`" to each reviewer).
- The only pre-existing wording of either rule on trunk is `agents/code-writer-tdd.md:33`: "Comments must be self-contained — never reference the spec, the plan, or any other artifact." It is narrower than the intent (comments only) and lives in only one writer profile. Nothing on trunk states Rule 1.

v1's chosen mechanism (candidate home, fully designed): (1) one canonical statement in a new `skills/radical-pipelines/reference/output-rules.md`, referenced **by name only from the phase files**; (2) restated "Obey the output rules" obligation in the 3 writer profiles + an "Output rules" checklist entry in the 2 reviewer profiles (with the reviewer also gathering batch commit messages via base→HEAD `git log`, since the diff carries none); (3) phase files `4 - code.md` / `5 - docs.md` pass "the resolved content of `output-rules.md`" to the reviewer at dispatch; (4) a commit-format reconciliation so the agent-name provenance tag is confined to artifact-only commits (product commits untagged) — needed because trunk's `.rp.md` currently tags every commit. Enforcement reused the existing reviewer reject→re-dispatch loop; no new gate, artifact, completion predicate, or runtime code.

**Reasoning:** The researcher read the trunk skill/agents and the entire v1 worktree (spec, design, the canonical `output-rules.md`, profile diffs) and ran git to confirm v1's unmerged state. Conventions and guardrails were both available but rejected by v1 because conventions are host-overridable (the rules must be always-on, no opt-out) and guardrails are deterministic command gates (the rules require semantic judgment). A token/keyword scan was explicitly rejected in v1 because the self-hosting RP repo legitimately contains every flaggable token, so the discriminator must be referent-based.

**Sources:** `skills/radical-pipelines/SKILL.md`, `reference/conventions/{load,passing,setup}.md`, `reference/guardrails.md`, `reference/autonomous-phases/{4 - code,5 - docs}.md`, `agents/code-writer-tdd.md:33`; v1 worktree `.../86-code-output-rules/` — `.changeset/default-output-rules.md`, `skills/radical-pipelines/reference/output-rules.md`, `.pipelines/86-code-output-rules/base/1-spec/spec.md` and `2-design-doc/design-doc.md`; `git merge-base --is-ancestor` (this session). The one unverified item: *why* v1 is unmerged (abandoned / in-flight / superseded).

### Q2: Should v2's Rule 2 reach commit messages (as v1 did), and does that pull in a coupled requirement about the agent-name provenance tag?

**A:** The evidence points to scoping Rule 2's *mandatory* reach at code/docs **content**, with commit-message coverage being a v1 extrapolation, not something the observed leak or the intent demonstrates.

1. **Trunk commit-format convention** (`/Users/darerodz/Code/radical-pipelines/.rp.md`, "Commit format"): "Use imperative mood, sentence case, no period at the end. Include the name of the agent in parenthesis or `assisted` …" — every example carries the tag. So trunk mandates an agent-name provenance tag on **every** commit, with no product-vs-artifact distinction; still true today. The tool's suggested default (`setup.md:54-60`) likewise suggests `<commit-description> (<agent-name>)` for all commits. The three writer profiles just say "use the host project's commit format" (`code-writer-tdd.md:49`, `code-writer-e2e.md:40`, `docs-writer.md:52`) — so a writer faithfully following trunk **would emit a tagged product commit** like `Add login form (code-writer-tdd)`.

2. **What leaked:** the cited Skillsmith permalink is a **code comment**, not a commit message — it narrates a plan task ("Task 3") and a key decision ("KD5") of the pipeline. So the motivating incident is evidence for covering **code content/comments**, not commit messages. The intent's own wording ("comments on code," "the product code never mentions … artifacts") points at code, not commits.

3. **Is a commit message "product"?** Nothing on trunk classifies commit messages as shipped product; they are framed as process metadata, and the agent-name tag is explicitly a provenance/attribution device (it names which pipeline agent produced the commit — pipeline-process info by design). v1 is the only place that introduced a product-vs-artifact classification for commits. Genuine scoping decision: *for* covering — a `(code-writer-tdd)` tag is a visible pipeline reference in `git log`/PRs, contradicting "reads as if written by hand"; *against* — trunk treats the tag as desirable provenance, and covering commits reverses that default and pulls in a coupled requirement.

4. **Downstream cost of covering commit messages** (all still in pre-reconciliation/tagging state on trunk): would force (a) editing the repo's own `.rp.md` so the tag is confined to artifact-only commits, else the tool flags its own product commits and every run is rejected; (b) editing `setup.md`'s suggested default; (c) rewording all three writer commit steps (since a profile reads only itself); (d) adding to both reviewers a new gather-context input — the batch's commit messages via base→HEAD `git log` (a diff carries no commit messages) — plus the commit-message half of the check. So commit-message coverage is **not self-contained**: it couples a provenance-tag reconciliation across `.rp.md` + `setup.md` + 3 writer profiles + 2 reviewer profiles.

**Reasoning:** The researcher read the trunk commit-format convention, setup default, and the three writer commit steps; fetched the Skillsmith permalink to confirm the leak was a code comment; and confirmed each reconciliation site is still in its tagging state on trunk. Neither trunk text settles whether commit messages must "read as if written by hand," so it is a real analyst decision rather than a determined fact.

**Sources:** `/Users/darerodz/Code/radical-pipelines/.rp.md` (Commit format); `skills/radical-pipelines/reference/conventions/setup.md:54-60`; `agents/{code-writer-tdd:49,code-writer-e2e:40,docs-writer:52}.md`; WebFetch of the Skillsmith `improver.ts` permalink (this session).

### Q3: How should the commit-message rule interact with an arbitrary host's commit-format convention so the requirement generalizes, what actually binds, and is the product-vs-artifact commit boundary clean?

**A:**

1. **Precedence framing (format-agnostic):** Do not state it as "the rule overrides the host format." State it as a scoping of where the host format's provenance applies: the host commit format governs product commits in full **except** it contributes no pipeline-naming provenance to them; it applies fully to artifact-only commits. This generalizes to any host — a host that doesn't tag is already compliant (no-op); a host that tags has the tag suppressed on product commits only. The rule never needs to know the host's specific format; it forbids one *property* (pipeline-naming provenance) on one *class* of commit (product). Trunk precedent for a non-overridable tool element exists (guardrails are committed-only, never taken from `.rp.local.md`, per `load.md:38`), but this is the **first** place a tool constant constrains a host convention's output — conventions are otherwise host-supreme.

2. **What binds vs. what merely guides:**
   - **Writer behavior at commit time — BINDS.** A profile reads only itself + its launch prompt, so the binding instruction is whatever the writer profile's commit step says. The bare trunk wording ("use the host project's commit format") tags by default; to keep product commits untagged the writer profile's commit step must say so directly.
   - **Reviewer check — BINDS (this is the enforcement).** No approval file is written while a violation stands.
   - **`setup.md` suggested default — does NOT bind agents.** It is owner-facing setup guidance (`setup.md:58`: "Ask the owner for the format…"); only the captured `.rp.md` value is "Passed verbatim to every spawned agent" (`setup.md:56`). Editing the default only changes what a *new* host is *advised* to configure. Keep it coherent for consistency, but it is not the load-bearing requirement.

3. **The product-vs-artifact commit boundary is clean.** The three producing writers commit **only** product, never artifacts (`code-writer-tdd.md:49` "Commit the code, tests, and inline documentation"; `code-writer-e2e.md:40` "Commit the tests"; `docs-writer.md:52` "Commit the documentation changes"); they only *read* artifacts, never write them. Artifact files are written in separate commits by *other* agents — planners, analysts, and the reviewers' own approval commits (`code-reviewer.md:100`, `docs-reviewer.md:101`), made after/ outside the Code/Docs batch the reviewer inspects. So within a producing batch (base→HEAD) **every commit is a product commit**; no mixed product+artifact commit arises and the reviewer needs no per-commit discriminator inside its batch. Cleanest global phrasing: a commit that introduces host-project product carries no pipeline-naming provenance; a commit whose changed paths are all under the pipeline's artifacts folder may. Defining "product commit" by path (no changed path under the artifacts folder) makes the check unambiguous; the distinction is by file path, not by repo (in `artifacts-in-repo` mode both live in the same repo).

4. **Cannot rely on the fork PR-time transform.** `artifacts-in-fork` mode strips agent attribution at upstream-PR time (`setup.md:131-132,160`), but those transforms run in the orchestrator at PR time only, are never passed to agents (`setup.md:155`), and **do not exist in `artifacts-in-repo` mode** — where the tagged product commit is permanent in shipped history. Even in fork mode the fork branch carries the tag. So the rule must bind at writer-commit time, confirming the writer+reviewer (not orchestrator PR-step) home.

**Reasoning:** The researcher traced the override model (`load.md`), the binding chain (writer profile → reviewer check → `setup.md` guidance), the three writers' commit steps and the reviewers' artifact-only commit steps, and the fork/repo storage-mode transforms — all on trunk this session.

**Sources:** `skills/radical-pipelines/reference/conventions/load.md:34,38`; `setup.md:54-60,116,122,131-132,155,160`; `agents/{code-writer-tdd:49,code-writer-e2e:40,docs-writer:52,code-reviewer:100,docs-reviewer:101}.md`; CLAUDE.md ("an agent reads only its own profile and its initial prompt").

### Q4: How is a violation made observable and blocking (given enforcement is reviewer judgment), and what is the precise over-reach discriminator (with pass/fail examples)?

**A:**

**Thread A — enforcement is observable and has no bypass:**
- Observable chain (Code; Docs identical): the per-batch reviewer's verdict picks the filename — rejected → `4-code/code-review-N-rejected.md`, approved → `4-code/code-review-approved.md` (+ `code-summary.md`) (`code-reviewer.md:49-52,96`). Every reported issue is must-fix (`code-reviewer.md:109`), so a found violation forces a rejected verdict and the approval file is not written. On rejection the orchestrator re-dispatches only the flagged task IDs and loops until approval (`4 - code.md:38` step 5; `code-reviewer.md:102-103`).
- Completion predicate (`pipeline-versioning.md:40-49`): Phase 4 complete ⇔ `4-code/code-review-approved.md` **and** `4-code/code-summary.md` committed; Phase 5 ⇔ `5-docs/docs-review-approved.md` **and** `5-docs/docs-summary.md` committed. "Folder existence alone does not imply completion — only the predicate does" (L38); same predicate "regardless of workflow mode" (L40).
- No bypass: `*-review-approved.md` is written **only** by the reviewer on approval; the predicate admits no substitute/skip; Code/Docs are autonomous-only (no assisted shortcut). So "the reviewer gates it" ≡ "the phase is gated." Therefore "a run cannot reach phase-complete for Code/Docs while a known violation stands" is exact and citable.
- Enforced vs. instructed split: the writers' self-check is *instructed* (prevention, best-effort) — nothing about writer behavior is part of the predicate. The reviewer check is what *enforces* (gates completion). The AC must attach to the reviewer/phase-completion, and must not over-promise determinism: enforcement is "the gate is instructed to detect and reject, and a violation cannot be approved once seen," matching the semantic/adversarial nature of the check.
- **Testable AC shape:** "Given an output that violates Rule 1 or Rule 2 present when the Code/Docs phase reaches the point it would be marked complete, the phase does not complete (no `*-review-approved.md` is written) until the violation is resolved." Checkable from committed artifacts: violation present ⇒ a `*-review-N-rejected.md` naming it ⇒ no approval file ⇒ predicate unsatisfied.

**Thread B — the over-reach discriminator (referent-based):**
- Sharpest form: Rule 2 flags a reference only when its referent is *this run's own* pipeline process, artifacts, or agents — the text points at the concrete pipeline that produced this very output (this run's artifact files/paths, its phases or plan tasks, the writing agent's own process, or a claim the pipeline/its agents produced this). It never flags the mere vocabulary ("spec", "plan", "design doc", "pipeline", "phase", "artifact", agent names) used to describe pipeline concepts or artifact *types* in general. Decisive test: does the reference identify the actual instance that wrote this output? Process/provenance narration always fails (it is intrinsically this-run).
- PASS fixtures (real, still on trunk): RP `README.md:5` ("…pipeline of defined phases… inspectable artifacts"); `README.md:43` ("a wrong assumption in **the spec**, a missing constraint in **the design doc**"); `README.md:31` ("Phase 4. Code…"); `website/demo.js:13,23,142-146` (literal artifact-type filenames `'spec.md'`, `'design-doc.md'`, `'code-plan.md'` as product data); `website/index.html:118-123` (an illustrative `.pipelines/issue-1234/base/` path rendered as docs); plus a generic identifier/string like `pipelinePhase` or `"Run the spec phase"` in a tool that models these concepts.
- FAIL examples: the actual leak `// …(KD5/Task 3)…` (this run's plan task + decision); a pointer to *this run's* concrete `.pipelines/86-code-output-rules-v2/base/1-spec/spec.md` in product code; `// implements task 4.2 of the code plan`; an agent-name provenance tag on a **product** commit (`Add login form (code-writer-tdd)`) — contrast the same tag on an artifact commit (`Add spec (spec-reviewer)`) which PASSES; a comment narrating the agent's own process (`// generated by the docs-writer`); a docstring claiming "produced by the Radical Pipelines code phase" as *this* product's origin.
- Token/keyword/path scan was considered and **rejected** by v1 (design doc "Decision: Referent-based discriminator for Rule 2 over-reach"): it over-reaches on the self-hosting repo, whose README/website legitimately contain every flaggable token (incl. literal `.pipelines/` in `website/index.html`); none reference *this run's* artifacts, so all must pass, and a token check cannot tell them apart from a real violation. The spec's out-of-scope must record that a blanket vocabulary ban / token scan is NOT the rule.

**Reasoning:** Thread A predicate, reviewer-verdict-to-filename mapping, re-dispatch loop, and the no-bypass property were read from trunk `pipeline-versioning.md`, the phase files, and the reviewer profiles. Thread B PASS fixtures are real trunk lines (verified present this session); the token-scan rejection is quoted from the v1 design doc.

**Sources:** `pipeline-versioning.md:38-49`; `agents/code-reviewer.md:8,49-52,96,102-103,109`; `reference/autonomous-phases/4 - code.md:37-49`; RP `README.md:5,31,43`, `website/demo.js:13,23,142-146`, `website/index.html:118-123`; v1 design doc over-reach decision; the Skillsmith leak permalink.

## Research

### Prior art: the v1 attempt (worktree `86-code-output-rules`)

This issue (#86) was already taken through a full pipeline once, in the sibling worktree `.claude/worktrees/86-code-output-rules/`. That run produced a complete, reviewed spec, design doc, plan, code, and docs — including a new skill file `skills/radical-pipelines/reference/output-rules.md` and edits to `code-writer`, `docs-writer`, `code-reviewer`, `docs-reviewer`, and the README. **It was never merged to trunk**: `output-rules.md` does not exist on current trunk, and `agents/code-writer-tdd.md` on trunk still carries the old narrow line `Comments must be self-contained — never reference the spec, the plan, or any other artifact.` (line 33). So v2 is a fresh build on current trunk; v1 is prior art, not a baseline to inherit verbatim.

Key v1 design decisions (from v1 `output-rules.md`, `spec.md`, and changeset) — candidate requirements to validate for v2:

- **Two always-on rules, no override/opt-out**, applied to every run's "host-project product."
- **Host-project product** defined as: source code, tests, inline and external documentation, and the commit messages a run ships into the host repo — as distinct from the pipeline's own artifacts (specs, design docs, plans, reviews).
- **Rule 1 (leave unchanged comments/prose untouched):** a change must not reword/reflow/reformat/tidy comments on code it did not modify, or prose sections of a doc file it edits but did not touch. Content the change itself touched is exempt; no duty to preserve a still-valid comment beside changed code. Does not apply to commit messages.
- **Rule 2 (product transparent to the pipeline):** shipped product must not reference this run's pipeline, phases, artifacts, or agents, nor narrate the writing agent's process — total reach: comments, identifiers/names, string literals, log/error messages, inline API docs, external docs, and commit messages. Reads as if written by hand.
- **"This-run discriminator":** Rule 2 flags only references whose referent is *this run's* process/artifacts/agents — not the vocabulary. The self-hosting RP repo's legitimate use of "spec/design doc/plan/pipeline/phase/artifact" and agent names as product documentation passes.
- **Commit messages:** Rule 2 applies to messages of commits that introduce host-project product (including suppressing any agent-name provenance tag); commits touching only pipeline-artifact files are exempt and may reference the pipeline freely.
- **Enforcement:** the Code and Docs phase reviewers (`code-reviewer`, `docs-reviewer`) gate on the rules; a violation is a must-fix that blocks its phase from completing.
- **Replaces** the pre-existing narrower Rule 2 statement in `agents/code-writer-tdd.md` so no two overlapping versions can drift.

### Existing trunk architecture relevant to "where the rules live"

- `skills/radical-pipelines/SKILL.md` is generic; per-project conventions live in `.rp.md`, loaded via `reference/conventions/load.md`.
- `reference/conventions/passing.md` defines the `## Conventions` block the orchestrator prepends to each spawned agent's initial prompt (Artifact folder, Commit format, Guardrails, Guardrail scopes to fill). This is the existing channel for cross-cutting per-agent instructions.
- **Guardrails** (`reference/guardrails.md`) are deterministic exit-code gates declared in `.rp.md`. The output rules are behavioral, not exit-code-checkable, so they are not a natural fit for the guardrail mechanism.
- Agents that write host-project product: `code-writer-tdd`, `code-writer-e2e` (Code phase), `docs-writer` (Docs phase). Reviewers: `code-reviewer`, `docs-reviewer`. Per CLAUDE.md, agent profiles cannot reference skill files; a shared instruction is duplicated into each profile.

## Consolidated Requirements

Each requirement is phrased as an observable outcome of a pipeline run. "Host-project product" = the source code, tests, inline and external documentation, and the commit messages a run ships into the host repository — as distinct from the pipeline's own artifacts (specs, design docs, plans, reviews, summaries, and any file under the pipeline's artifacts folder). The two rules are **Rule 1** and **Rule 2**, collectively **the output rules**.

### Always-on application

1. **Both output rules are in force for every run, with no owner action and no opt-out.** On any host project where the owner has said nothing about comments or pipeline references, a run's code, docs, and commit messages are still subject to both Rule 1 and Rule 2. The owner never restates them per run; there is no per-run or per-project override or opt-out.

### Rule 1 — leave unchanged comments and prose untouched

2. **A change does not reword, reflow, reformat, or otherwise tidy comments attached to code the change did not modify, or prose sections of a documentation file the change edits but did not otherwise touch.** Given a file containing comments on code (or prose sections) that a change does not modify, when an agent changes other parts of the file, those untouched comments and unrelated prose are left byte-for-byte as they were.

3. **Rule 1 does not over-reach onto touched content.** When a change modifies a piece of code or documentation whose own comment or prose is naturally updated as part of that change, updating that comment/prose is not a violation. The rule targets only content the change did not touch, and imposes no duty to preserve a still-valid comment beside changed code. Rule 1 does not apply to commit messages (they carry no pre-existing comments or prose).

### Rule 2 — the host-project product is transparent to the pipeline

4. **No part of the shipped product references this run's pipeline, its phases, its artifacts, or its agents, or narrates the writing agent's own process.** Given generated source code, tests, or inline documentation, when its comments, identifiers/names, string literals, and log/error messages are inspected, they contain no pointer to a this-run artifact, no reference to a phase or plan task of this run, no narration of the agent's own process, and no claim that the output was produced by the pipeline or its agents. The product reads as if written by hand. This reach is total across product content; it is not limited to comments.

5. **External documentation produced by the Docs phase carries no this-run pipeline references.** Given READMEs, guides, changelogs, and examples generated by the Docs phase, when inspected, none reference this run's pipeline, phases, artifacts, or agents as the origin of the work.

6. **Rule 2 targets references whose referent is *this run's* process/artifacts/agents — never the vocabulary.** Given a host project (including the self-hosting Radical Pipelines repository) whose own source legitimately uses words like "spec", "plan", "design doc", "pipeline", "phase", or "artifact", or that documents the methodology or names artifact *types* (e.g. an illustrative `.pipelines/issue-1234/…/spec.md` path in docs, or a `'spec.md'` string literal as product data), when Rule 2 is evaluated, that content is not flagged — because it does not point at the concrete pipeline instance that produced this output. The decisive test is whether the reference identifies the actual instance that wrote this code/doc.

### Commit messages and the provenance tag

7. **A commit that introduces host-project product carries no pipeline-naming provenance in its message — including no agent-name provenance tag.** Given a commit that introduces code or external documentation, when its message is inspected, it names no pipeline, phase, artifact, or agent. This holds in both storage modes (`artifacts-in-repo` and `artifacts-in-fork`) and is independent of the host's specific commit format: the host commit format governs product commits in full **except** it contributes no pipeline-naming provenance to them.

8. **A commit that changes only pipeline-artifact files is exempt from Rule 2 and may reference the pipeline freely**, including carrying the host's agent-name provenance tag. The boundary is by file path: a product commit is one none of whose changed paths are under the pipeline's artifacts folder. (In normal operation the boundary is clean — the producing-phase writers commit only product and never artifacts, and artifact files are committed separately by other agents and by the reviewers' own approval commits — so no mixed product+artifact commit arises.)

9. **The rule and the host's commit-format convention do not contradict each other.** A host whose configured commit format would otherwise tag every commit with provenance is reconciled so the tag is confined to artifact-only commits and product commits go untagged. This binds at the points an agent actually obeys — the writer's commit-time behavior and the reviewer's check — both of which are tool-resident and not host-overridable. The tool's owner-facing setup guidance for the commit-format convention is kept consistent with this (product commits untagged, artifact-only commits tagged), but that guidance is advisory and is not the binding mechanism.

### Surfaces, single source, and consistency

10. **Both rules govern every phase that produces host-project output — the Code phase (`code-writer-tdd`, `code-writer-e2e`) and the Docs phase (`docs-writer`) — and the commit messages each produces.** Rule 1 applies wherever comments or unrelated prose exist in a file the change edits; Rule 2 applies to all product content (code, tests, identifiers/names, string literals, log/error messages, inline API docs, external docs) and to product commit messages.

11. **The rules are stated once and consistently, and no narrower or conflicting prior version survives.** After this change, the pre-existing narrower statement of Rule 2 in `agents/code-writer-tdd.md` ("Comments must be self-contained — never reference the spec, the plan, or any other artifact") no longer exists as a separate, conflicting version, so no two overlapping statements can drift apart.

### Enforcement

12. **A violation of either rule blocks its producing phase from completing until resolved.** Given generated output that violates Rule 1 or Rule 2, present when the Code or Docs phase reaches the point it would be marked complete, the phase does not complete — the phase reviewer (`code-reviewer` / `docs-reviewer`) treats the violation as a must-fix issue, no `*-review-approved.md` is written, the phase-completion predicate is not satisfied, and the affected tasks are re-dispatched — until the violation is resolved. Enforcement is the reviewer gate (which is the only route to phase completion; there is no bypass), not the writers' self-check; the writers are instructed to comply and self-check, but compliance is what is enforced at the reviewer gate. Because the check is a semantic judgment, enforcement guarantees that a *seen* violation cannot be approved, not that detection is mechanically exhaustive.

## Out of Scope

1. **Preserving still-valid comments adjacent to changed code.** Rule 1 forbids only tidying comments/prose on content the change did not touch; it adds no duty to keep an accurate comment beside code that was changed.
2. **A general ban on the Radical Pipelines vocabulary, and any token/keyword/path scan.** A host's legitimate use of words like "spec", "plan", "design doc", "pipeline", "phase", or "artifact" — including the self-hosting RP repo's README, website, and skill files, and literal artifact-type filenames or illustrative `.pipelines/` paths used as documentation — is not a violation. A blanket vocabulary ban or any token/keyword/path scan that would flag such content is explicitly NOT the rule; Rule 2 is referent-based.
3. **Any per-run or per-project override or opt-out.** The rules are always-on.
4. **Choosing the enforcement mechanism's internals.** Whether the reviewer's check is purely judgment, aided by tooling, or hybrid is a design-phase decision; the requirement is only that a violation is detected at the gate and blocks completion.
5. **Rule 2 over pipeline-artifact-only commit messages.** Commits that change only files under the pipeline's artifacts folder are exempt and may reference the pipeline and carry the provenance tag.
6. **Rule 1 over commit messages.** Commit messages carry no pre-existing comments or prose.

## Open decisions recorded (for the design phase)

- **Commit-message scope of Rule 2 was a deliberate analyst decision, not an inherited default.** The motivating leak was a code comment, and the v2 intent frames the rules around "code"; covering product commit messages is a generalization of "reads as if written by hand," justified because the host's default provenance tag literally names a pipeline agent in permanent git history and cannot be relied upon to be stripped at PR time (no transform in `artifacts-in-repo` mode). Requirements 7–9 carry this scope and its coupled provenance-tag reconciliation. If the owner prefers to scope Rule 2 to product *content* only (dropping requirements 7–9), the feature shrinks substantially and no commit-format reconciliation is needed — flagging this as the single most reversible scope choice in the spec.
- **Why v1 is unmerged** (abandoned / in-flight / superseded) was not determined; it does not block these requirements, since v2 builds on current trunk and v1 is treated as corroborating prior art only.
