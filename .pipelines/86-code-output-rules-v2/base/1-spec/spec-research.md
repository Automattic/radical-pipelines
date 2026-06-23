# Spec Research: Default output rules for generated code

# Generated code should never edit unchanged comments or reference Radical Pipelines artifacts

> Source: GitHub issue [#86](https://github.com/Automattic/radical-pipelines/issues/86).
> This file is self-contained; agents do not need to open the source issue.

## Goal

Code produced by a pipeline follows two output rules by default, without the owner having to restate them each run:

1. Comments on code that wasn't changed are left untouched.
2. The product code never mentions or references Radical Pipelines artifacts (pipelines, phases, specs, design docs, plans, etc.).

## Context

- Both are guidelines that were hand-passed to the Skillsmith pipeline (issue #37, v2); the intent is to promote them into the Radical Pipelines tool so every pipeline gets them for free.
- The "no RP-artifact references" rule comes from an observed leak where generated code carried a comment narrating the pipeline process — a plan task and the pipeline itself: https://github.com/Automattic/skillsmith/blob/25dd6b4246d1d3c426e9c3f066b754f5844cc35f/src/improvement/improver.ts#L106-L109
- Team discussion concluded both rules "should be included in the tool's general prompts."

## Assumptions / directions to explore (open)

- Proposed home is the tool's general prompts, so the rules apply across phases — recorded as a direction, not a requirement; the spec and design phases decide the actual mechanism and scope.

## Q&A

### Q1 — Surfaces/phases in scope

The intent frames the rules as living in "the tool's general prompts" so they "apply across phases." Which generated surfaces must the two rules govern? Options I can see: (a) source code only (the Code phase); (b) source code **and** external documentation (the Docs phase); (c) (b) plus the commit messages each phase produces; (d) something else. Which scope do you want?

**A1:** **Code + docs + commits** — broadest coverage. Both rules apply to source code (incl. identifiers, string literals, log/error messages, comments, inline docs), external documentation produced by the Docs phase (READMEs, guides, changelogs, examples), and the commit messages each phase produces. (Note: Rule 1 concerns pre-existing comments, of which commit messages have none, so Rule 1 is vacuous for commit messages; Rule 2 applies to all surfaces including commits.)

### Q2 — Enforcement strength

The intent defers the *mechanism* to design, but the *requirement level* is a spec decision: when a run produces output that violates Rule 1 or Rule 2, what must happen? (a) The agents are instructed to follow the rules — best-effort guidance in the prompts, no active detection. (b) Compliance is enforced — violations are detected and the producing phase cannot reach "complete" until they are resolved. (c) Something in between. Which do you want?

**A2:** **Enforced — blocks completion.** A violation of either rule is detected and the producing phase (Code/Docs) cannot reach its complete/approved state until the violation is resolved. The spec requires detection + a completion-blocking gate; the *mechanism* (deterministic check, reviewer-style check, or hybrid) is deferred to the design phase.

### Q3 — Rule 1's exact boundary (comments on changed vs. unchanged code)

The intent says "comments on code that wasn't changed are left untouched." I want to pin the boundary. When a change modifies a piece of code and that code's own comment is now inaccurate (or naturally updated by the change), should the agent be free to update *that* comment — i.e. Rule 1 targets only comments on code the change did **not** touch? Options: (a) Yes — Rule 1 forbids only gratuitous tidying of comments on untouched code; updating a comment that belongs to the code being changed is fine, and Rule 1 adds **no** requirement to preserve a still-valid comment next to changed code. (b) Stricter — also constrain edits to comments near changed code. (c) Other.

**A3:** **Untouched-code comments only.** Rule 1 forbids gratuitous rewording/reflowing/reformatting of comments on code the change did not touch. It does not constrain comments belonging to the code being changed, and it imposes no duty to preserve a still-valid comment next to changed code (→ Out of Scope).

### Q4 — Rule 2's boundary (this run's process vs. a vocabulary ban)

Rule 2 forbids the generated product from referencing the pipeline process or this run's artifacts. But a host project legitimately uses words like "spec," "plan," "design doc," "pipeline," even "Radical Pipelines" — and the RP repo itself is a host project that builds itself, so its own product contains those terms. Should Rule 2 target **only** references to *this run's* pipeline process and artifacts (so legitimate host content, including RP's own source, is never flagged), or be a broader ban on that vocabulary? Options: (a) This run's process/artifacts only — never flag legitimate host vocabulary. (b) Broader vocabulary ban. (c) Other.

**A4:** **This run's process only.** Rule 2 targets references to this pipeline's process and this run's own artifacts — artifact pointers (e.g. `spec.md`, `code-plan.md`, paths under the artifacts folder), references to phases or plan tasks ("implements task 4.2 of the code plan"), narration of the agent's own process/reasoning, and any "produced by Radical Pipelines/its agents" statement. It is **not** a vocabulary ban: legitimate host content using words like "spec," "plan," "design doc," "pipeline," or "Radical Pipelines" — including the RP repo's own source, which builds itself — is never a violation.

### Q5 — Override / opt-out

The intent says the rules apply "by default, without the owner having to restate them." Should there be any way to turn them off — a per-project or per-run override/opt-out — or are both rules always-on and unconditional for every run? Options: (a) Always-on, no opt-out. (b) On by default but an owner can disable/override (per project or per run). (c) Other.

**A5:** **Always-on, no opt-out.** Both rules are unconditional for every run and project; there is no per-run or per-project override (→ Out of Scope).

### Q6 — Consolidate the existing narrower statement

There is already a narrower version of Rule 2 in `agents/code-writer-tdd.md:33` ("Comments must be self-contained — never reference the spec, the plan, or any other artifact"). Should this change require that the rules are stated **once and consistently**, replacing/superseding that pre-existing narrower statement so there are not two overlapping versions that could drift? Options: (a) Yes — require a single consistent statement; the old narrower one is replaced. (b) No — leave the existing statement as-is and add the new one alongside. (c) Other.

**A6:** **Single consistent statement.** The two rules are stated once and consistently across the producing agents; the pre-existing narrower statement (`code-writer-tdd.md:33`) is replaced/folded in so no two overlapping versions remain to drift (→ requirement + acceptance criterion).

### Q7 — Rule 1's reach into edited documentation

Rule 1 is phrased about "comments on code that wasn't changed," but the Docs phase edits prose, not code comments. When an agent edits a documentation file, should Rule 1 also forbid gratuitously rewording/reflowing **prose sections it didn't change** (the same diff-hygiene applied to doc prose), or is Rule 1 limited to **code comments and inline API docs only** (leaving external-doc prose governed by Rule 2 alone)? Options: (a) Extend Rule 1 to unrelated prose in edited docs. (b) Limit Rule 1 to code comments / inline API docs only. (c) Other.

**A7:** **Extend to unrelated doc prose.** When an agent edits a documentation file, Rule 1 also forbids gratuitously rewording/reflowing prose sections the change didn't touch — the same diff-hygiene as code comments. Rule 1 thus reads: leave untouched comments and unrelated prose in any file the change edits.

### Q8 — Rule 2 vs. a project's commit-message provenance convention

Self-check tension: Q1 puts commit messages in Rule 2's scope and A5 allows no opt-out, but this project's **Commit format convention** (`.rp.md`) deliberately requires naming the producing agent in every commit, e.g. `Support for X (implementer)` / `Fix bug Y (assisted)` — a reference to the pipeline's agents. How should Rule 2 treat a project-mandated provenance tag? Options: (a) Rule 2 targets the **narrative/content** of commit messages (no "implements task 4.2 of the code plan", no "written by the pipeline"), but a project's deliberately-chosen structured provenance tag is that project's own convention and **outside** Rule 2's leakage target. (b) Rule 2 applies fully, including provenance tags — a project must not name the pipeline/agents in commit messages at all (would require changing this project's own commit convention). (c) Other.

**A8 (refines A1 for commits):** The unit of exemption is **what a commit changes**, not who authored it.

- A commit that introduces **host-project product** — source code or external documentation — must satisfy Rule 2 in its message: no references to this run's pipeline process or artifacts (no phase/task narration, no "produced by the pipeline", and no provenance tag that names the pipeline or its agents). Rationale: in fork mode these are the commits cherry-picked into an upstream PR, and anything that reaches that PR must not mention Radical Pipelines.
- A commit that changes **only pipeline artifacts** (files under the artifacts folder, e.g. `.pipelines/…`) is **exempt** from Rule 2 — it may carry the project's `(agent-name)`/`(assisted)` provenance tag and reference phases/artifacts freely.
- This holds the same whether the pipeline keeps its artifacts in a separate fork (`artifacts-in-fork`) or directly in the upstream repo (`artifacts-in-repo`).
- Consequence (for design/plan, not this spec): this project's **Commit format convention** currently mandates the `(agent-name)`/`(assisted)` suffix on *all* commits; reconciling it so product commits comply with Rule 2 is downstream work, surfaced here so the design phase resolves it. Rule 1 is unaffected by this distinction — commit messages carry no pre-existing comments/prose.

### Coverage self-check (private, step 3)

- **Completeness** — surfaces (Q1/A8), enforcement strength (Q2), both rule boundaries (Q3, Q4, Q7), opt-out (Q5), consolidation (Q6), commit nuance (Q8) all settled. No open area.
- **Clarity** — each rule has an explicit in/out boundary two implementers could read the same way.
- **Feasibility** — host-output producers and the existing narrower statement are identified; enforcement attaches to the Code and Docs phase completion gates; mechanism deferred to design.
- **Consistency** — the commit-convention tension (Q8) is resolved; Rule 2's "no vocabulary ban" (Q4) keeps RP-builds-itself valid.
- **Scope** — exclusions collected for step 4: adjacent-still-valid-comment preservation; vocabulary ban; per-run/project opt-out; choosing the enforcement mechanism.

### Clarification (post-Q8) — Rule 2 reach over all product content

Owner emphasis for the record: Rule 2's ban is **not** limited to commit messages. Any change that introduces host-project product must keep that product **totally transparent to Radical Pipelines** — no reference to the pipeline, its phases, its artifacts, or its agents anywhere in the shipped content: code comments, variable/function/identifier names, string literals, log/error messages, inline API docs, and external documentation, in addition to the governed commit message. The A8 distinction governs only *which commit messages* are in scope; it does not narrow the content ban, which is unconditional for every piece of host-project product the run ships.

## Research

Pre-Q&A grounding (codebase as of branch base `2d57460`):

- **An existing, narrower version of Rule 2 already exists.** `agents/code-writer-tdd.md:33`: "Comments must be self-contained — never reference the spec, the plan, or any other artifact." It is scoped to the TDD code-writer and to *comments* only — narrower than the intent's Rule 2 (whole product, all artifact/process references). The intent's "promote into the tool's general prompts" implies consolidating this so there are not two overlapping statements.
- **Rule 1 (leave unchanged comments untouched) has no existing statement** in `agents/` or `skills/` — it is net-new.
- **Host-output–producing agents:** `agents/code-writer-tdd.md`, `agents/code-writer-e2e.md`, `agents/docs-writer.md`. Their reviewers: `agents/code-reviewer.md`, `agents/docs-reviewer.md`. Plan/spec/design agents produce only pipeline artifacts, not host-project output.
- **Agent-profile isolation constraint (CLAUDE.md):** "Agent profiles must not reference any skill file or `.rp.md`; an agent reads only its own profile and its initial prompt." So a single shared statement of the rules can reach the agents only by living in each relevant profile or by being injected into their initial prompt — a mechanism question deferred to design, but it bounds feasibility.
- The cited leak (`skillsmith/.../improver.ts#L106-L109`) is a **code comment** narrating pipeline concepts ("KD5/Task 3", "threaded in from the pipeline") — confirms Rule 2 targets process/artifact leakage in shipped output, including comments.

## Out of Scope

1. Preserving still-valid comments adjacent to changed code — Rule 1 forbids only tidying comments on untouched code (A3).
2. A general ban on the Radical Pipelines vocabulary — legitimate host use of "spec", "plan", "design doc", "pipeline", "Radical Pipelines", including the RP repo's own source, is not a violation (A4).
3. Any per-run or per-project override / opt-out — the rules are always-on (A5).
4. Choosing the enforcement mechanism — deterministic check vs. reviewer-style vs. hybrid is a design-phase decision; the spec requires only that violations are detected and block phase completion (A2).
5. Rule 2 over pipeline-artifact-only commit messages — commits that change only files under the artifacts folder are exempt; they may carry the project's provenance tag and reference phases/artifacts (A8).

## Consolidated Requirements

1. The tool applies both output rules to the output of every pipeline run automatically, with no action from the owner and no override or opt-out.
2. **Rule 1 (leave unchanged comments/prose untouched):** a change must not reword, reflow, reformat, or otherwise tidy comments on code it did not modify, nor unrelated prose in a documentation file it edits. It targets only content the change did not touch; it does not constrain comments/prose belonging to the changed content, and adds no duty to preserve a still-valid comment beside changed code.
3. **Rule 2 (host-project product transparent to the pipeline):** the shipped product must not reference this run's pipeline, its phases, its artifacts, its agents, or narrate the agent's own process — anywhere in the content: code comments, identifiers/names, string literals, log/error messages, inline API docs, and external documentation.
4. Rule 2 targets *this run's* process and artifacts, not a vocabulary: legitimate host content (including the Radical Pipelines repository's own source, which builds itself) using those words must never be flagged.
5. Surfaces — both rules cover source code (including tests, identifiers, string literals, log/error messages), code comments and inline API docs, and external documentation produced by the Docs phase.
6. Commit messages — Rule 2 applies to the message of any commit that introduces host-project product (code or docs); commits that change only pipeline artifacts are exempt. This holds the same whether artifacts live in a fork or directly in the upstream repo. (Rule 1 does not apply to commit messages — they carry no pre-existing comments/prose.)
7. The rules govern every phase that produces host-project output — the Code phase and the Docs phase — consistently. The tool states them once, replacing the pre-existing narrower statement (`agents/code-writer-tdd.md`) so no two overlapping versions remain.
8. Enforcement — a violation of either rule is detected and the producing phase cannot reach its complete/approved state until it is resolved. The detection mechanism is left to the design phase.
