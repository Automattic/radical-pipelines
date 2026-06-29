# Design Research: Default output rules for pipeline-produced code

This document is the running record of the design Q&A for the feature specified in
`1-spec/spec.md`: promoting two output rules into always-on rules of the Radical
Pipelines tool.

- **Rule 1** — a change leaves untouched comments and unrelated prose exactly as they were.
- **Rule 2** — the shipped host-project product is transparent to the pipeline that produced it.

Enforcement is by the existing per-phase review gate; a violation is a must-fix issue.

## Research

<!-- Non-trivial findings from the design-doc-researcher, with sources cited. -->

### How instructions reach agents today (researcher-confirmed)

Two delivery channels exist for an agent's instructions, per CLAUDE.md ("an agent reads
only its own profile and its initial prompt"):

1. **Agent profile** (`agents/<name>.md`) — a self-contained Markdown file that becomes
   the agent's standing instructions. Profiles do **not** include/reference skill files or
   `.rp.md` (CLAUDE.md rule: a shared instruction is *duplicated* into each profile, never
   extracted to a referenced file). Example: `agents/code-writer-tdd.md`,
   `agents/code-reviewer.md`.
2. **Initial prompt** — composed by the orchestrator at spawn time. The orchestrator
   injects a `## Conventions` block at the top of every agent's initial prompt
   (`skills/radical-pipelines/reference/conventions/passing.md:1-3`), with per-field
   targeting (`Agents: all` or a named list). This is the live mechanism by which the
   **commit-format** convention and **guardrails** reach agents.

**Cross-cutting-rule precedent (most important input).** The strongest existing precedent
for "one rule, many agents" is the `## Conventions` block. `passing.md:4-9` shows
`Artifact folder` and `Commit format` are passed to **all** agents; guardrails are passed to
the named producing/reviewing agents. The convention *values* live in the project's
`.rp.md` (`reference/conventions/load.md:5`), which the orchestrator reads at workflow start
and copies into each agent's prompt. So there are two precedent-shapes for a shared rule:
(a) duplicate the prose into each relevant profile; (b) state it once in a skill/convention
file the orchestrator reads and inject it via the initial prompt.

### The pre-existing narrower Rule 2 (the single-source target of Req 11)

Located: `agents/code-writer-tdd.md:33` — *"Comments must be self-contained — never
reference the spec, the plan, or any other artifact."* It sits in the inline-documentation
subsection (step 2). **Researcher-confirmed:** this is the *only* occurrence of the narrower
Rule 2 anywhere in `agents/` or `skills/` — it is NOT in `code-writer-e2e.md` (tests only,
no inline-docs step) or `docs-writer.md`, and no reviewer enforces it. So today the rule is
under-propagated: one of three host-product producers carries it, no reviewer enforces it.
Req 11 requires this narrower statement to no longer exist as a separate, overlapping
version (replaced by the canonical Rule 2).

### Commit-format provenance today (Reqs 7-9)

`.rp.md:49-58` (Commit format convention): *"Include the name of the agent in parenthesis
or `assisted`…"* with examples including product-shaped commits like `Support for X
(implementer)`. This agent-name provenance tag is exactly what Req 7 forbids on **product
commits**. The convention is delivered to all agents via the `## Conventions` block's
`Commit format` field. Today the tag is unconditional; the design must make product commits
drop it while artifact-only commits keep it (Reqs 8, 9), keyed by file path
(none of the changed paths under the artifacts folder ⇒ product commit).

### Enforcement / review-gate wiring today (Req 12)

- Each producing phase ends in a review gate. For the code phase
  (`reference/autonomous-phases/4 - code.md:37-40,49`), the orchestrator marks the phase
  complete **only** on an approved `code-reviewer` verdict; rejection re-dispatches the
  flagged tasks. The review gate is the sole route to completion (no bypass) — matches Req 12.
- `agents/code-reviewer.md` step 2 ("Review the changes") is the checklist the reviewer
  applies; it has no output-rules item today. "Every issue is must-fix"
  (`code-reviewer.md:109`) and "reject liberally" already give the right enforcement shape —
  a recorded violation blocks approval. Adding Rule 1 / Rule 2 to the review checklist of
  each producing phase's reviewer is the natural enforcement hook.

## Topics

### Topic 1: Where the canonical output rules live and how they reach every producing/reviewing agent

- **Spec link:** Req 1 (always-on, no owner action / no opt-out), Req 10 (governs every host-product phase), Req 11 (stated once and consistently; narrower version gone), Req 12 (enforced at the review gate). Acceptance: "Always-on application", "Single source and consistency".

- **Constraints from the codebase (researcher-confirmed):**
  - An agent reads only its own profile (`agents/<name>.md`) and its initial prompt; profiles cannot reference a skill/convention file (CLAUDE.md). So the rules can reach an agent through exactly two channels: (a) baked into the profile, (b) injected into the initial prompt by the orchestrator.
  - There is no shared file that agents include. Every existing cross-cutting rule (commit-format, guardrails) is delivered by *per-spawn injection of the per-run value via the `## Conventions` block* **plus** *duplication of the static behavior into each relevant profile*. This value/behavior split is the binding precedent (`passing.md`, `autonomous-workflow.md:63`, and the guardrails step duplicated across the five run-agent profiles).
  - The rules are tool-defined and always-on, so — unlike commit-format/guardrails — their *text* is fixed by the tool, not supplied per-project via `.rp.md`. Nothing about them is per-run or owner-configurable (Req 1).

- **Options:**
  1. **H1 — Conventions-block-style injection only.** Define the canonical rules once in a new skill `reference/` file; orchestrator injects them verbatim at the top of every producing/reviewing agent's initial prompt at spawn. Literal single-source; no profile duplication. But reviewers still need an in-profile instruction to *enforce* (injected text states the rule; it does not by itself make the reviewer treat a violation as must-fix and block). And an injected block is per-run runtime text, not the agent's standing checklist.
  2. **H2 — Duplicate the canonical rules into each producing + reviewing profile.** Matches the dominant pattern; CLAUDE.md endorses duplication over extraction for shared profile instructions; reviewers naturally gain an enforce/checklist item. "Stated once" (Req 11) is satisfied in spirit — the canonical wording is physically repeated and must be kept identical.
  3. **H3 — Hybrid (mirrors guardrails exactly): the rules' *statement* is the tool-fixed canonical text, and the *enforcement behavior* is duplicated into the reviewer profiles' review checklist.** Producers are told the rules; reviewers are told the rules *and* to treat a violation as a must-fix blocker.

- **Trade-offs:** H1 alone under-delivers enforcement (Req 12) and puts the standing rule in transient runtime text. H2 delivers enforcement cleanly but repeats wording across ~5+ profiles, raising the drift risk Req 11 explicitly worries about. H3 takes the best of both but must reconcile "stated once" with the duplication CLAUDE.md mandates.

- **Decision:** **Adopt H2 as realized through the H3 framing, but resolve the single-source question against the codebase's actual rule.** Because CLAUDE.md forbids extracting a shared profile instruction to a referenced file and mandates duplicating it into each profile, the *physical home of the canonical rules for agents is each relevant profile*, written once in identical canonical wording and duplicated. "Stated once and consistently" (Req 11) is satisfied as the skill satisfies it everywhere else: one canonical wording, duplicated verbatim, with no surviving narrower/overlapping variant. The injection channel (H1) is **not** used for the rule text, because the rules are tool-fixed (not a per-run/per-project value) and putting them in the per-spawn conventions block would (a) wrongly model them as a configurable convention and (b) leave the standing reviewer checklist without them. The conventions block stays reserved for per-run resolved values (artifact folder, commit format string, guardrail commands).
  - **Producing agents** that emit host-project product — `code-writer-tdd`, `code-writer-e2e`, `docs-writer` — each carry the canonical Rule 1 + Rule 2 statement in-profile, scoped to what they produce (code/tests/inline docs for the code writers; external docs for the docs writer).
  - **Reviewing agents** for those phases — `code-reviewer`, `docs-reviewer` — each carry the canonical rules **and** an enforcement instruction: a Rule 1/Rule 2 violation is a must-fix issue (the existing "every issue is must-fix" / "reject liberally" shape already blocks approval, so this slots into the step-2 review checklist).
  - The pre-existing narrower line `code-writer-tdd.md:33` is **replaced** by the canonical Rule 2 (Req 11) — no separate overlapping version survives.
  - Artifact-only producers (spec/design/plan agents and the analysts/researchers/consolidators) are **not** given the rules: their output is pipeline artifacts, exempt by definition. (See Topic on scope/boundary.)

- **Rationale:** Honors the hard constraint that agents read only profile + initial prompt and that shared profile instructions are duplicated, not referenced (CLAUDE.md). Reuses the exact precedent the tool already trusts for guardrails enforcement (must-pass gate behavior duplicated into each reviewer). Keeps the rules always-on and owner-invisible (they are tool text, never in `.rp.md`, no opt-out — Req 1). Leaves the conventions/injection channel for genuinely per-run values, avoiding mis-modeling a fixed rule as a configurable convention.

- **Open sub-question logged:** whether to *also* surface a one-line pointer to the rules in the phase references / the orchestrator's per-spawn payload as a backstop. Deferred — the profile home is sufficient and authoritative; see Open Questions.

### Topic 2: Product commits drop pipeline-naming provenance; artifact-only commits keep it

- **Spec link:** Req 7 (product commit carries no pipeline-naming provenance / no agent-name tag, regardless of artifact storage mode and host format), Req 8 (artifact-only commit is exempt; boundary by file path), Req 9 (rule and host commit format do not contradict — rule forbids one property on one commit class, never needs the host's specific format). Acceptance: "Rule 2 — commit messages and provenance".

- **Research (researcher-confirmed):**
  - The agent-name provenance tag (`(<agent-name>)`) comes purely from the **commit-format string** delivered in the `## Conventions` block; no separate profile text appends it. Each agent substitutes its own name into the format. Default format: `<commit-description> (<agent-name>)` (`setup.md:54-60`, `.rp.md:49-58`).
  - Provenance is added **at authoring time** by every agent following the format, on every commit it makes.
  - **Producers vs. reviewers split cleanly by path and author:** host-product producers (`code-writer-tdd`, `code-writer-e2e`, `docs-writer`) commit **only product** files (code/tests/inline docs; external docs) — never artifacts. Reviewers (`code-reviewer`, `docs-reviewer`) commit **only artifact** files (the review + summary files, which live under the artifacts folder). So product commits and artifact-only commits are already separable per-commit, by author and by path, in today's design.
  - The **only** place provenance is stripped today is the `artifacts-in-fork` **PR-time** rewrite (`setup.md:124-160`): at upstream-PR time the orchestrator cherry-picks only code commits (excludes artifact commits) and rewrites messages to the upstream format (default `<commit-description>`, no agent attribution). This affects only the upstream PR's cherry-picked branch, NOT the commits as authored on the fork/pipeline branch. In `artifacts-in-repo` mode there is **no rewrite ever** — commits land and push as authored.

- **Decision:** Express the constraint as a **format-agnostic property on product commits, applied at authoring time**: *a product commit's message carries no pipeline-naming provenance — in particular no agent-name provenance tag.* The host commit format governs product commits in full, **except** that it contributes no pipeline-naming provenance to them. Mechanically:
  - The producing agents (`code-writer-tdd`, `code-writer-e2e`, `docs-writer`) — which by design commit only product — author their commit messages following the host commit format **but omit the pipeline-naming provenance** (the `(<agent-name>)` tag and any phase/artifact naming). This is stated in each producing profile's commit step, layered on top of "use the host commit format."
  - Reviewers (`code-reviewer`, `docs-reviewer`) commit only artifact files (review/summary, under the artifacts folder) → artifact-only commits → they **keep** the full host format including the agent-name tag (unchanged from today).
  - The boundary is **by changed path**: a commit is a *product commit* when at least one changed path is **not** under the pipeline's artifacts folder (equivalently, "none of its changed paths under the artifacts folder ⇒ ... " is the artifact-only test; a commit is product iff not artifact-only). The artifacts-folder location is the **Artifact folder** convention (default `.pipelines/<slug>/`), so "under the artifacts folder" is well-defined per run.
  - Because today's producers commit only product and reviewers only artifacts, each agent's commit class is statically known from its role — so a producing agent can be told plainly "omit pipeline-naming provenance from your commits" without per-commit path inspection, while the *path-based definition* remains the authoritative classifier (and the safe fallback if any commit ever mixed classes — see Risks: a mixed commit is classified product and goes untagged, which is the Rule-2-safe outcome).

- **Storage-mode independence (Req 7) and non-contradiction (Req 9):**
  - Authoring-time omission is **required** for `artifacts-in-repo` (no later rewrite exists) and is **sufficient and mode-independent**: it makes the product commit untagged as authored in either mode.
  - It **coexists with** the fork-mode PR rewrite without contradiction, as two **layered** mechanisms (not competing): (a) the new always-on Rule 2 product-commit constraint is tool-fixed, authoring-time, both modes; (b) the pre-existing **Upstream commit format** convention is per-project, PR-time, fork-mode only. With authoring-time omission in place, the PR rewrite already targets a clean attribution-free upstream format (`setup.md:160`), so it becomes a no-op on the provenance axis for product commits while still reshaping the description to upstream's contribution guidelines. The pre-existing convention is **not removed** — it remains for upstream description formatting. The rule never needs the host's specific format — it forbids one property (pipeline-naming provenance) on one commit class (product), satisfying Req 9.
  - The spec's path predicate (product commit ⇔ no changed path under the artifacts folder) is a strict **generalization** of the fork cherry-pick's existing "code commits vs artifact commits" split (`setup.md:131`): same boundary (the artifacts folder), now stated explicitly and applied in **both** modes at **authoring** time, not just fork-mode PR time. This is the only commit-classification site in the skill today, and it is implicit (relies on the producer/reviewer division of labor); our design makes the boundary explicit and reuses it, rather than introducing a second notion.

- **Rationale:** Puts the fix where the provenance is actually added (authoring time, by the producing agent following the format), which is the only mode-independent point — the fork-mode PR rewrite cannot satisfy Req 7 for `artifacts-in-repo`. Keeps the conventions block and the host commit format untouched (no need to change `.rp.md` or teach the rule the host format), honoring Req 9. Reuses the clean producer/reviewer path separation that already exists, so no per-commit path-classification machinery is needed in the common case, while preserving the spec's path-based definition as the authoritative discriminator.

- **Alternatives considered:**
  1. *Strip provenance only via a post-hoc rewrite (extend the fork-mode cherry-pick to repo mode).* Rejected: repo mode pushes commits as authored with no PR-time rewrite step; a new rewrite pass would be a larger, fragile mechanism (rewriting already-pushed/shared history) and would still leave the as-authored commit tagged on the pipeline branch. Authoring-time omission is simpler and correct in both modes.
  2. *Change the commit-format convention default to drop the tag globally.* Rejected: that would strip provenance from artifact-only commits too (Req 8 wants them tagged), and would make the rule depend on/alter the host's configured format (violates Req 9). The property must be scoped to product commits only.
  3. *Make the orchestrator rewrite product commit messages after each producing agent commits.* Rejected: adds an orchestrator post-processing step and history rewriting on the live branch; the producing agent is already the message author, so having it omit the tag at authoring is strictly simpler.

### Topic 6: Expressing and enforcing Rule 1 (leave untouched comments/prose alone)

- **Spec link:** Req 2 (no tidying of comments on unmodified code, or prose sections of an edited doc the change doesn't otherwise touch), Req 3 (updating a comment/prose naturally as part of changing its code is permitted; no duty to preserve a still-valid comment beside changed code; Rule 1 does not apply to commit messages). Acceptance: "Rule 1". Out-of-Scope #1, #6.

- **Research / reasoning:**
  - Rule 1 is a content-discipline rule with no real mechanism alternatives — it does not need injection, tooling, or a commit-classification step. It is expressed as profile prose for the agents that edit files containing comments/prose: `code-writer-tdd` (code + inline docs), `code-writer-e2e` (test code), `docs-writer` (external docs + non-symbol inline narrative). It is **not** relevant to commit messages (Req 3) and so does not touch the commit step.
  - **Detectability at the gate:** the reviewers already inspect the **batch diff** (`code-reviewer.md` step 1.6; `docs-reviewer.md` step 1.8). A Rule 1 violation surfaces directly in the diff as a changed comment/prose hunk whose surrounding code is unchanged — i.e. a diff touching a comment line with no functional change beside it, or reflowed prose in a doc section the change otherwise leaves alone. This is reviewable without any new tooling.
  - The decisive line for Rule 1 (analogous to Topic 3's referent test) is the **touched-vs-untouched** axis: did the change modify the code/prose to which this comment belongs? If yes, updating its comment/prose is permitted (Req 3); if the comment/prose belongs to content the change did not touch, leave it exactly as it was (Req 2). The `docs-writer.md:64` "natural adaptation vs drift" precedent is again the phrasing model: name the rule, give the decisive criterion, give the *permitted* example (naturally updating a changed line's own comment) and the *forbidden* example (reflowing an untouched comment), state the action.

- **Decision:** State Rule 1 in the three producing profiles as a one-paragraph rule using the `docs-writer.md:64` template: *"Do not reword, reflow, reformat, or tidy a comment attached to code your change does not modify, or a prose section of a doc your change edits but does not otherwise touch — leave it exactly as it was. Updating a comment or prose that belongs to content you are changing is fine; there is no duty to preserve a still-valid comment beside code you changed."* Enforce it via the same review-checklist mechanism as Rule 2 (Topic 4): a Rule 1 violation seen in the batch diff is a must-fix issue. No injection and no commit-step change (Rule 1 does not apply to commit messages, Req 3).

- **Rationale:** Rule 1 is purely a content rule, so the profile-home + review-gate-enforcement design from Topics 1 and 4 carries it with no additional mechanism. The touched-vs-untouched criterion is exactly the spec's distinction (Reqs 2, 3) and is diff-visible, so the reviewer can enforce it from artifacts it already inspects. Stating the permitted and forbidden examples prevents the over-correction the spec rules out in Out-of-Scope #1 (no duty to preserve still-valid comments).

### Topic 3: Expressing Rule 2's referent-based discriminator to the agents

- **Spec link:** Req 4 (total content reach), Req 5 (external docs), Req 6 (referent-based: flags only references to *this run's* concrete instance, never vocabulary). Out-of-Scope #2 (no token/keyword/path scan, no vocabulary ban). Acceptance: "Rule 2 — content", "Rule 2 — referent-based discriminator".

- **Research (researcher-confirmed, with catalog drawn from this repo's real product):**
  - The whole discriminator is a single axis: **is the pipeline reference the *subject matter / type / placeholder* the product is about (clears), or a *pointer back at the concrete run that authored this very text* (flags)?** Every legitimate use in the self-hosting repo (phase-folder names, `spec.md`/`design-doc.md` filename literals, illustrative `.pipelines/<slug>/…` paths, methodology prose in README/website/CHANGELOG) is subject-matter; a real leak points at this run.
  - **This-run-instance signals** (the observable *tells* of the violating referent — examples, never a token checklist):
    1. Names a writing **agent as the author/actor** of this output ("generated by the design-doc-writer").
    2. Names a specific **plan task / phase iteration / decision of this run** ("per Task 3 of the plan", "review iteration 2 flagged…").
    3. Points at **this run's actual, live artifacts path** (a concrete real slug like `.pipelines/86-code-output-rules-v2/base/…`) — as opposed to a `<slug>`/`issue-1234` illustrative path.
    4. **Narrates the writing agent's own process** ("I first wrote the failing test, then…").
    5. **Claims the pipeline or its agents produced this output** (provenance attribution in product content or product commit messages).
  - The crucial wording constraint: phrase the test as "*identifies the actual run that wrote this*" with the signals as illustrations — never as "mentions an agent name / a task / a path," which would re-create the forbidden keyword scan and wrongly flag the legitimate catalog.
  - **Precedent phrasing model:** `docs-writer.md:64` (drift-vs-natural-adaptation) is the house template — a named category, a one-line decisive criterion, a concrete *negative* example of what is NOT in the category, and the action. Also the "X, not Y + parenthetical example" mold of `code-writer-tdd.md:57,63`. Reviewer enforcement uses the adversarial/must-fix voice of `code-reviewer.md:106,109`.

- **Decision:** Express Rule 2 in each carrying profile using the **`docs-writer.md:64` template**: name the rule, give the **decisive referent test as one sentence**, follow with a concrete **"this is NOT a violation"** example (a `spec.md` literal / an illustrative `.pipelines/<slug>/…` path / methodology prose — explicitly including the self-hosting repo), then the action. The canonical decisive test (to be finalized as the single wording, per the Open Question on exact prose):
  > A reference violates Rule 2 only if it identifies the concrete pipeline run that produced this output — its phases, artifacts, plan tasks, or agents as the authors of this work. A reference that merely uses pipeline vocabulary, documents the methodology, names an artifact type, or shows an illustrative path is the product's subject matter, not a reference to this run, and is never a violation — including in the Radical Pipelines repository itself.

  with the **mental check** stated beside it: *"Is this reference about the subject matter of the product, or about the process that produced this artifact?"* The five signals appear as *examples* of the violating referent, never as a checklist of tokens.
  - This same wording is what the **reviewers** apply when enforcing (Topic 4), so producers and reviewers share one referent test — no divergent second statement.

- **Rationale:** The subject-matter-vs-producing-process axis is the sharpest discriminator and is self-hosting-safe *by construction* (a doc *about* pipelines is subject matter; a doc *betraying that this run wrote it* is producing-process), directly realizing Req 6 and the two referent-based acceptance criteria. Framing the test by *referent* (not tokens) is what keeps it out of the Out-of-Scope #2 keyword-scan trap and lets it survive in the self-hosting repo, whose product is saturated with the vocabulary. Reusing the `docs-writer.md:64` template matches the tool's existing way of stating a fine semantic line with a negative example, so the rule reads natively and resists misapplication.

- **Alternatives considered:**
  1. *List the signals as the rule ("a comment must not name an agent / a task / a path").* Rejected: that is a token checklist by another name — it would flag the legitimate catalog (filename literals, illustrative paths, methodology prose) and violate Out-of-Scope #2. The signals must stay as illustrations under a referent-based test.
  2. *State Rule 2 only abstractly (the referent definition) with no examples.* Rejected: without the concrete negative example (esp. the self-hosting carve-out), agents over-flag legitimate vocabulary; the `docs-writer.md:64` precedent shows the tool relies on a negative example to pin a fine line.

### Topic 4: Enforcement — how a Rule 1 / Rule 2 violation blocks phase completion at the review gate

- **Spec link:** Req 12 (a violation blocks its producing phase; the review gate is the only route to completion, no bypass; enforcement guarantees a *seen* violation cannot be approved, not that detection is mechanically exhaustive), Req 10 (governs every host-product phase). Acceptance: "Enforcement".

- **Research (confirmed first-hand):**
  - Each host-product phase ends in a review gate, and the orchestrator marks the phase complete **only** on an approved reviewer verdict (`reference/autonomous-phases/4 - code.md:37-40,49`; `5 - docs.md:37-40,49`). On rejection only the flagged tasks are re-dispatched; the cycle repeats until approval. The completion predicate (`pipeline-versioning.md:40-49`) requires the `*-review-approved.md` artifact — which only exists on an approve verdict — so the gate is the sole route to completion. No bypass exists.
  - The reviewer's verdict machinery already has exactly the right shape: step 2 is the review checklist (`code-reviewer.md:22-32`, `docs-reviewer.md:24-34`); "Every issue is must-fix" and "Reject liberally" (`code-reviewer.md:109-110`, `docs-reviewer.md:110-111`); each issue must name the task it belongs to so the orchestrator can re-dispatch (`code-reviewer.md:108`).

- **Decision:** Enforcement is realized by **adding Rule 1 and Rule 2 to the review checklist (step 2) of `code-reviewer` and `docs-reviewer`**, framed as a must-fix check: a Rule 1 or Rule 2 violation found in the batch's product is an issue, recorded in the rejection's `## Issues` (tagged to the offending task), which forces a `rejected` verdict, no `*-review-approved.md` is written, the phase-completion predicate is not satisfied, and the affected task(s) are re-dispatched until the violation is resolved. This reuses the existing must-fix/reject-liberally machinery unchanged — the only addition is naming Rule 1/Rule 2 as inspectable checklist items. No new gate, no orchestrator change, no bypass introduced.
  - The reviewer must also honor the **referent-based discriminator** when applying the check (Topic 3): it flags only this-run-instance references, and must NOT reject legitimate vocabulary — otherwise it would manufacture false rejections, especially in the self-hosting repo.
  - The **commit-message provenance** check (Topic 2) likewise belongs in the reviewer's inspection: a product commit in the batch that carries an agent-name/pipeline-naming tag is a Rule 2 violation (the reviewer already inspects the batch diff and "Convention compliance" at `code-reviewer.md:31`). So the reviewer enforces both the in-content rules and the product-commit-message rule.

- **Rationale:** The spec's enforcement requirement is precisely "a seen violation cannot be approved," which is exactly what "every issue is must-fix + reject blocks the approval artifact" already guarantees. Detection is a semantic judgment the reviewer performs (matching Req 12's explicit non-guarantee of mechanical exhaustiveness and Out-of-Scope #4). Adding to the existing checklist is the minimal, precedent-aligned wiring; inventing a separate mechanical check would contradict Out-of-Scope #2 (no token/keyword/path scan).

- **Alternatives considered:**
  1. *A deterministic guardrail gate (a script that scans for violations).* Rejected: Out-of-Scope #2 forbids token/keyword/path scans; Rule 2 is referent-based and Rule 1 is semantic — neither is mechanically decidable. Guardrails are for deterministic exit-code checks; these rules are judgment. (A reviewer MAY use tooling to *aid* its judgment per Out-of-Scope #4, but the gate is the reviewer's verdict, not a script.)
  2. *Enforce in the producing agent only (self-check, no reviewer item).* Rejected: the producer self-checking does not block completion (Req 12 requires the gate to block); and the producer is the party most likely to have introduced the leak. The reviewer is the independent gate. (Producers still carry the rules so they avoid violations in the first place — both layers exist.)

### Topic 5: Scope boundary — which agents/phases the rules apply to, and what counts as host-project product vs. pipeline artifact

- **Spec link:** Req 1 (every run), Req 10 (governs every phase that produces host-project output), Req 6/8 (product vs. artifact boundary by path under the artifacts folder), the Overview's product-vs-artifact distinction. Acceptance: "Always-on application", commit-classification criteria.

- **Decision (boundary):**
  - **Host-project product** = source code, tests, inline and external documentation, and the commit messages that ship them — i.e. everything a run writes that is **not** under the pipeline's artifacts folder (`.pipelines/<slug>/` per the Artifact folder convention). Produced by `code-writer-tdd`, `code-writer-e2e`, `docs-writer`. Subject to Rule 1 + Rule 2.
  - **Pipeline artifacts** = specs, design docs, plans, reviews, summaries — every file under the artifacts folder. Produced by spec/design/plan agents and by reviewers (review/summary files). **Exempt** from Rule 2; their commits keep the provenance tag.
  - **Agents that carry the rules:** the three producing profiles (in-content + product-commit constraint) and the two reviewer profiles (enforcement + referent discriminator). Earlier-phase agents (spec/design/plan writers, analysts, researchers, consolidators, their reviewers) do **not** carry the rules — they emit only artifacts.
  - The **inline vs. external documentation** split is already owned cleanly: code writers own inline API docs (symbol-level), docs-writer owns external docs and non-symbol inline narrative (`code-writer-tdd.md:59`, `docs-writer.md:62`). Rule 1 and Rule 2 apply to both kinds; the profiles scope each agent's statement of the rules to the surfaces that agent produces.

- **Rationale:** Directly realizes the Overview's product/artifact distinction and Reqs 6/8/10. The path-under-artifacts-folder boundary is the same one used for the commit discriminator (Topic 2), giving a single consistent notion of "product" across content and commits. Not loading the rules into artifact-only agents avoids both wasted instruction and the wrong outcome (their artifacts are *supposed* to reference the pipeline freely — Req 8).

### Topic 7: Approach, components, interfaces/data flow, dependencies, observability (synthesis)

- **Spec link:** whole spec — this consolidates the cross-cutting view for the design-doc-writer.

- **End-to-end approach (the implementer's mental model):** This feature ships **no code and no runtime mechanism** — it is a change to the tool's *instructions* (agent profiles), realized as edits to Markdown files under `agents/`. The output rules become standing text in the profiles of the agents that produce host-project product and the agents that review it. Producers honor the rules while writing; reviewers enforce them at the existing review gate, where a violation is a must-fix issue that blocks phase completion (the same path guardrails and every other review finding already take). The product-commit provenance rule is a one-line constraint layered on each producing profile's existing "use the host commit format" step. Nothing in the orchestrator, the conventions/`.rp.md`, or the guardrails changes.

- **Components:**
  - *Modified — producing profiles:* `agents/code-writer-tdd.md`, `agents/code-writer-e2e.md`, `agents/docs-writer.md` — each gains the canonical Rule 1 + Rule 2 statement (with the referent test and negative examples) and, in its commit step, the product-commit no-provenance constraint. `code-writer-tdd.md:33`'s narrower line is **replaced** by canonical Rule 2.
  - *Modified — reviewing profiles:* `agents/code-reviewer.md`, `agents/docs-reviewer.md` — each gains the canonical rules **and** a must-fix review-checklist item enforcing them (referent test included), plus inspection of product-commit messages for provenance leaks.
  - *Untouched but relevant:* the `## Conventions` block / `passing.md` (still delivers the full commit-format string; producers apply the subtraction) — unchanged; `.rp.md` commit-format convention — unchanged; the fork-mode **Upstream commit format** convention (`setup.md:152-160`) — unchanged, now layered with the new authoring-time rule; the orchestrator phase references (`4 - code.md`, `5 - docs.md`) and completion predicate (`pipeline-versioning.md`) — unchanged (the gate already blocks on rejection); spec/design/plan agents and their reviewers — untouched (artifact-only).

- **Interfaces / data flow:** The only "interface" is profile prose → agent behavior. Data flow at a producing phase: producer reads its profile (now carrying the rules) + initial prompt (conventions block with the full commit format) → writes product honoring Rule 1/Rule 2 → commits with the format minus pipeline-naming provenance → reviewer reads its profile (rules + enforcement) + batch diff + product commit messages → if a violation is seen, writes a `*-review-N-rejected.md` with the violation as a tagged must-fix issue → orchestrator re-dispatches the flagged task(s); else writes `*-review-approved.md` and the phase completes. The product/artifact commit boundary is the changed-path test against the artifacts folder (`.pipelines/<slug>/`).

- **Dependencies:** No new external libraries, services, or tools. Internal dependencies the design leans on, all pre-existing: the per-phase review gate and its must-fix/reject machinery; the commit-format convention and conventions-block delivery; the artifacts-folder convention (defines the product/artifact path boundary); the fork-mode PR rewrite (coexists). The design adds **no** dependency and changes **no** convention.

- **Failure modes & observability:**
  - *Missed detection (primary failure mode):* enforcement is semantic judgment, so a reviewer can miss a violation (spec Req 12 explicitly does not guarantee mechanical exhaustiveness). Mitigation: producers carry the rules too (first line of defense), and the reviewer is adversarial/reject-liberally. Residual risk accepted per spec.
  - *Over-flagging legitimate vocabulary (false positive):* most acute in the self-hosting repo. Mitigation: the referent-based test + the explicit "not a violation" negative examples in the canonical wording (Topic 3) — the design's main guard against this.
  - *Drift between the duplicated copies (Req 11 risk):* the canonical wording is duplicated across ~5 profiles; if copies diverge, the "stated once and consistently" guarantee erodes. Mitigation: one canonical wording copied verbatim; CLAUDE.md accepts duplication as the deliberate cost of the no-references rule. Flagged in Risks.
  - *Observability:* a caught violation is visible in the committed `*-review-N-rejected.md` (the tagged issue) and in the re-dispatch — the normal, inspectable review-artifact trail. No new logging surface is needed or appropriate (this is an instruction change, not running code).

### Topic 8: How THIS feature's own Code phase dispatches and verifies its prose-only profile-edit tasks

- **Spec link:** This topic is internal to *this feature's own* phase-4 (Code) execution — the path by which the deliverable (Markdown edits to `agents/` profiles) is dispatched and its Acceptance verified. It serves the whole spec's realizability: every requirement is realized as prose edits to profiles, so unless the Code phase can accept and verify a prose-only task, none of Reqs 1–12 can actually ship. It is also the concrete instantiation of Topic 7's "ships no code and no runtime mechanism… verification by reading the profiles" claim, which the Plan phase flagged as having no executable home.

- **The gap (Plan-phase blocker, restated):** The Code phase accepts task `Type` from a fixed set `tdd | e2e` (`agents/code-plan-writer.md:54`), routed strictly by type (`skills/radical-pipelines/reference/autonomous-phases/4 - code.md:3,35.1`) — there is no third type and no inspection-only path. Both writer profiles impose a passing-test contract (`code-writer-tdd.md` "every Acceptance criterion covered by a passing test"; `code-writer-e2e.md` "add an automated e2e test to the suite"). The only test that could "cover" a prose profile edit is a structural assertion over agent-file content, which `AGENTS.md:17` / `CLAUDE.md:17` forbids ("The skill is prose, not software. Do not write structural tests that assert the content of skill or agent files"). So a literal reading routes any assigned type into a forbidden test.

- **Question to settle:** Reconcile the `tdd|e2e` type set, the writers' passing-test contract, and the no-structural-tests rule into a concrete, executable verification path for a prose-only profile edit — **decided on how prior prose-only pipelines in THIS repo were actually dispatched and verified through the Code phase**, not on assumption.

- **Research — precedent for prose-only Code phases in this self-hosting repo (researcher-confirmed, with first-hand cross-check this session):**
  - **The forbidden path that triggered the ban — `122-plan-driven-test-selection-v2`.** This is the very pipeline that *introduced* the `Type: tdd | e2e` field and the `code-writer` → `code-writer-tdd`/`code-writer-e2e` split (split commit `9009152`, 2026-06-13; its own product diff edited only prose: `agents/**`, `skills/**`, `AGENTS.md`, `README.md`, `website/*`). It assigned `Type: tdd` to **every** task; its plan (`122/.../3-plan/code-plan.md:109`) reasoned *"for pure-prose edits the RED phase reduces to the structural-content assertions the task Acceptance describes."* Its `4-code/code-review-approved.md` summary: *"`npm test` passes (115), including 93 new structural-check assertions across the 7 added test files"* — i.e. **it DID add structural tests asserting agent-file content** (e.g. `scripts/test/phase-4-writer-split.test.mjs`). The repo then **deliberately reversed and banned exactly this**: commit `433578b "Remove skill-prose structural tests and forbid them in AGENTS.md (assisted)"` (2026-06-16) **both deleted** those 7 prose-asserting test files (−1132 lines) **and** added the `AGENTS.md:17`/`CLAUDE.md:17` rule in one commit (the trunk-landing copy `0e5aa25`/`352de3d`, 2026-06-16/17, carries the byte-identical rule line). This landed **after** `122`'s code review (2026-06-15). (Verified: current `scripts/test/` contains only runtime version-sync/changeset tests — zero prose-asserting tests remain.) Following 122's structural test is precisely what `AGENTS.md:17` now prohibits.
  - **The de-facto correct verification mode — `123` (pre-ban), `134` and `137` (post-ban).** Chronology (researcher-confirmed): `123-per-phase-summaries` code phase (review approved 2026-06-12) → `122` code review (06-15) → ban + test deletion `433578b` (06-16) → `134-unify-docs-naming` & `137-managing-issues-mid-session` (06-17). `123`'s `3-plan/code-plan.md` Overview calls it *"a pure prompt- and markdown-level change inside the skill and agent definitions… There is no code, no test framework, no build step, and no runtime"*; its `4-code/code-review-approved.md` `## Behavior verification`: *"The deliverable is prompt/markdown content with no runtime; the observable behavior is the file content itself, verified directly above (full base-ref → HEAD diff inspection, byte comparisons, repository-wide greps…)"* (and Checks line 18: *"Code-phase guardrails — None declared; ran none and proceeded"*; the only suite run was the pre-existing 22-test baseline, unchanged). The genuinely **post-ban** prose precedents are `137` — review (`4-code/code-review-approved.md`) *"It is behavioral-only prose — no test files, no structural assertions over skill content… behavioral verification (reading the reading paths) is the correct and only verification mode"* — and `134` (which edits `agents/` profiles, our exact case) — review *"No structural tests over skill prose were added, correctly per the project rule; verification is the one-time grep oracle."* (Pre-split `90-per-agent-model-config`'s review similarly: *"No unit tests apply."*) In every one, **no content-assertion test is added**; acceptance is verified by reading + grep at the review gate. This is the verification mode the design commits to — well-trodden both before and after the ban.
  - **CRITICAL — the post-ban prose pipelines that DROPPED `Type` ran under the *pre-split* `code-writer`, so their "omit Type" approach is NOT available in our autonomous regime.** `134`/`137` (and older `90`, `91`, `95`, `121`) have `0` `Type:` lines in their plans. But `134`'s product commits are authored by **`(code-writer)`** (e.g. `4c21de3 "Apply single-document rewords (code-writer)"`) — the *old, unsplit* agent, before the `tdd|e2e` routing existed/was enforced. So "drop the `Type` field" was viable only because dispatch wasn't yet strictly Type-routed to two writers. In the **current autonomous** Code phase that THIS pipeline runs (`reference/autonomous-phases/4 - code.md:3,35` route *strictly* by `Type ∈ {tdd,e2e}` to two named writers; no third writer, no Type-less route), a task with no `Type` has **no route**. The only precedent that ran a prose-only change *with* the current `Type` field under the split writers is `122` — which typed every task `tdd`. (`145-package-lock-version-sync-v2` also uses the current `Type` field but is NOT prose — it ships real runtime code `scripts/check-version-sync.mjs` with genuine `spawnSync` behavioral tests; not a counterexample.) Net: under our regime the prose task **must** carry a `Type`, and `tdd` is the route (122's choice), but its contract must be satisfied by inspection (123/137/134's mode), not by 122's banned structural test.
  - **The contradiction is confined to the writer/planner profiles; the reviewer already supports inspection.** `agents/code-reviewer.md` step 3 "Behavior verification" already covers *"generated files… anything a user or downstream consumer can see"* by direct exercise with captured evidence, and step 4 (line 45) states *"If there is no guardrails convention, there are no gates to run and your step-2/3 judgment stands."* So the **reviewer side can already verify a prose-only change by inspection with no test** (exactly what 123/137/134 did). The gap is purely upstream: `agents/code-writer-tdd.md` (lines 19, 45, 56 — "every per-task Acceptance criterion must be covered by a passing test"; "You write unit tests only") and `agents/code-writer-e2e.md` (lines 21, 24, 36, 47 — "add it to the project's e2e suite") impose the test contract **unconditionally** — researcher-confirmed there is **NO** escape hatch, no "if the change has no testable behavior" branch; their only "proceed without running" branch is *"No guardrails convention"* for GATES. And `agents/code-plan-writer.md:54` `Type: tdd | e2e` offers **no** inspection-only third type. **Visibility gap (researcher-confirmed):** the no-structural-tests rule lives ONLY in repo-root `AGENTS.md`/`CLAUDE.md` — a broad grep of `skills/` and `agents/` for inspection/no-test/prose wording returns ZERO hits. It reaches the agents only because this self-hosting repo loads its root `AGENTS.md`/`CLAUDE.md` into agent context; a non-self-hosting host project's root files carry no such rule. So today the executable path is established by precedent + the root rule, not by anything in the writer profiles or the phase-4 reference. (All cross-checked first-hand this session against the cited lines.)

- **Options considered:**
  1. **Type a prose task `tdd` (or `e2e`) and write a structural test asserting the profiles' content.** This is the `122` path. Rejected hard: `AGENTS.md:17`/`CLAUDE.md:17` explicitly forbids it (*"Do not write structural tests that assert the content of skill or agent files — their sections, wording, or ordering. Such tests merely restate the skill and break on every legitimate edit."*); the repo banned this after 122. Choosing it makes the dispatched writer satisfy its contract only by writing a forbidden test — the exact contradiction the blocker names.
  2. **Type a prose task `tdd`/`e2e` and have the writer write some unrelated runnable test to nominally satisfy the contract.** Rejected: the rules have no runtime behavior to exercise (they are instructions read by future agents), so any "passing test" would be vacuous or a disguised content assertion (still the banned anti-pattern). The writers themselves forbid vacuous tests (`code-writer-e2e.md:22` "a test that passes without exercising the flow is worthless").
  3. **Change the spec to add a runtime mechanism so there IS testable behavior.** Out of bounds: the spec (Topics 1–7) deliberately and correctly realizes the rules as profile prose with no runtime (matching how every cross-cutting agent instruction is delivered in this repo — see Topic 1). Adding a runtime mechanism would contradict the approved spec and Out-of-Scope #2/#4, and would be a prior-phase change, not a design decision.
  4. **Omit the `Type` field and add a dedicated inspection-verification task (the 134/137 plan shape).** Rejected for our regime: 134/137 ran under the *pre-split, unsplit* `code-writer` (134's product commits are tagged `(code-writer)`), where dispatch was not strictly Type-routed. Our pipeline runs the **current autonomous** Code phase, which routes *strictly* by `Type ∈ {tdd,e2e}` (`4 - code.md:3,35`) — a Type-less task has **no route**. So "omit Type" is not executable for us, even though it is the dominant *post-ban* precedent. We keep its *verification mode* (inspection/grep, no test) but must give the task a `Type`.
  5. **Chosen — the autonomous-compatible synthesis: type prose tasks `tdd` (the only viable route, per 122), verify by inspection at the gate (the post-ban mode, per 134/137/123), add no test, AND close the writer/planner profiles' unconditional-test-contract gap — which is in-scope precisely because those profiles ARE this feature's own deliverable surface.** See Decision.

- **Decision:** **This feature's Code phase types its prose profile-edit tasks `tdd`, ships the edits, and verifies them by `code-reviewer` inspection at the existing review gate adding no test (the verification mode every prose-only pipeline in this repo has used) — and the same change that ships the output rules ALSO closes the writer/planner test-contract gap that produced the blocker, because the writer/planner profiles are this feature's own deliverable surface.** Concretely:
  1. **Dispatch (planner side).** The `code-plan-writer` keeps the existing `Type: tdd | e2e` field, and a prose-only profile-edit task is dispatched as a **`tdd` task** — the only route available under strict Type-routing (`4 - code.md:3,35`), and the choice `122` made for its own prose tasks. Its Acceptance is written as **observable, inspectable properties of the shipped profile prose** (e.g. "`code-writer-tdd.md` carries the canonical Rule 2 statement and the narrower `code-writer-tdd.md:33` line no longer exists"), NOT as runtime behavior. No new `Type` value and no third writer is introduced — the routing machinery (`4 - code.md` step 3.1) is unchanged.
  2. **Execution (writer side) — close the unconditional-contract gap.** The `code-writer-tdd` profile's test contract is amended to add an **inspection-only branch** parallel to its existing "No guardrails convention — proceed" branch: *when a task's Acceptance describes prose/instruction content with no runnable behavior to exercise (e.g. a skill or agent-profile edit), the writer satisfies the contract by making the edit and confirming each Acceptance criterion holds by inspection of the shipped prose — it does NOT write a content-assertion test, because `AGENTS.md`/`CLAUDE.md` forbid structural tests over skill/agent files.* This is the minimal wording change that reconciles the three constraints; it is itself a prose profile edit, so it lives inside this feature's deliverable. (Mirror branch added to `code-writer-e2e` for completeness, though prose tasks route to `tdd`.) The existing guardrail gates (`npm test`, etc.) still run unchanged on every commit — the inspection branch removes only the *acceptance-must-have-a-test* requirement for non-behavioral tasks, never the guardrail gates.
  3. **Verification (reviewer side) — already supported, made explicit.** The `code-reviewer` verifies each prose task's Acceptance by **direct inspection of the shipped profile prose** (diff inspection, greps, byte comparison) with captured evidence in `## Behavior verification`, and runs the pre-existing guardrail suite unchanged — the mode `123`/`134`/`137` used and that `code-reviewer.md` step 3 (line 35, "anything a user or downstream consumer can see") + step 4 (line 45, "no guardrails convention → your step-2/3 judgment stands") already authorize. No reviewer-profile change is needed for the verification path itself. The output-rules enforcement items added to `code-reviewer`/`docs-reviewer` (Topic 4) are themselves verified the same inspection way.

- **Rationale (why this is a design decision, not a blocker to escalate):** Decided on this repo's own history, not assumption. The repository has run this exact situation repeatedly: it tried the forbidden structural-test path (`122`, 06-13/15), then **deleted those tests and forbade them** (`433578b`, 06-16, which is the origin of `AGENTS.md:17`/`CLAUDE.md:17`), and every prose-only Code phase before and after that ban (`123`, `134`, `137`, `90`) shipped by reviewer inspection with **zero** test files. So the verification mode is settled and repeatedly exercised, and the reviewer profile already supports it (`code-reviewer.md` step 3 + line 45) — verification is concrete and evidence-bearing, satisfying the spec's enforcement model (Req 12: a *seen* property is checked at the gate; detection is judgment, not a mechanical scan — consistent with Out-of-Scope #2/#4). The genuine gap the Plan phase flagged is real but **narrow and local**: the two writer profiles and the plan-writer `Type` set, read literally, leave no test-less branch — the no-structural-tests rule that makes the path work lives only in repo-root `AGENTS.md`/`CLAUDE.md`, not where the writer reads its contract. Closing that gap does **not** require changing the spec (the rules are correctly prose with no runtime — Topic 1) or the tool's routing/mechanism (no new `Type`, no third writer, no orchestrator change). It requires one paragraph of profile prose — an inspection-only branch on the writer's test contract — and **the writer/planner profiles are themselves part of this feature's deliverable surface** (this feature already edits `code-writer-tdd.md`, `code-writer-e2e.md`, and adjacent profiles for Rule 1/Rule 2). So the fix is a profile edit this design owns, not a prior-phase artifact change — hence a decision, not an escalated blocker. It removes a false coupling (*acceptance ⇒ a runnable test*) that the codebase's own `AGENTS.md:17` rule already proves cannot hold for prose deliverables, and it surfaces the prohibition where the tempted agent actually reads it.

- **Self-consistency with Topics 1, 4, 7:** Topic 7's "ships no code and no runtime mechanism… verification by reading the profiles" is now backed by a concrete executable path (123 precedent + the writer-side inspection branch), closing the Plan-phase blocker. The writer-side inspection-branch edit is an **additional in-scope edit to `code-writer-tdd.md` (and `code-writer-e2e.md`)** beyond the Rule 1/Rule 2 statements Topic 1/7 already place there — the design-doc-writer and code-plan-writer must include it. It does not alter Topics 1–7's decisions; it adds the execution-path component they implicitly assumed.

## Open Questions

<!-- Unresolved sub-questions deferred to the implementation phases. -->

- **Exact canonical wording of Rule 1 and Rule 2.** The design fixes the *home* (in each producing/
  reviewing profile, duplicated verbatim) and the *substance* (per spec). The single authoritative
  prose — including the referent-based discriminator phrasing (Topic 3) and the product-commit
  provenance constraint — is to be written by the design-doc-writer / settled at implementation,
  using the precedent phrasings identified. The constraint here is: one canonical wording, copied
  identically into every profile that carries it, with no surviving narrower variant (Req 11).
- **Whether to scope each producing profile's statement to its own surfaces, or state the full rule
  identically everywhere.** Leaning: state Rule 1 + Rule 2 with one canonical wording everywhere
  (to keep them byte-identical and drift-free per Req 11), and let each profile's surrounding
  context make clear which surfaces that agent produces. Deferred to implementation; either way the
  wording is identical across profiles.
- **Optional orchestrator/phase-reference backstop pointer.** Whether to also mention the output
  rules in the phase references (`4 - code.md`, `5 - docs.md`) or the per-spawn payload as a
  redundant reminder. Not required — the profile home is authoritative and sufficient. Deferred;
  if added it must not become a second, drift-prone statement of the rules (Req 11) — a pointer,
  not a restatement.
- **`code-writer-e2e` and inline docs.** The e2e writer commits tests only and has no inline-docs
  step today (no narrower-Rule-2 line). It still emits product (test code, including any test
  comments/strings/identifiers), so it carries the rules — but the implementer should confirm the
  rules are phrased to fit an agent whose product is test code, not API docs.
- **(Topic 8) Exact wording and placement of the writer-side inspection-only branch.** The design fixes
  that `code-writer-tdd.md` (and, mirrored, `code-writer-e2e.md`) gains a branch admitting a test-less,
  inspection-verified acceptance for prose/instruction tasks, citing the `AGENTS.md`/`CLAUDE.md`
  no-structural-tests rule. The exact prose is for the design-doc-writer / code-plan-writer, modeled on
  the existing "No guardrails convention — proceed" branch (`code-writer-tdd.md:42`) and the precedent
  review language (134/137). Constraint: it must scope the branch to *acceptance with no runnable
  behavior* (not a general license to skip tests), and must keep the guardrail-gate obligation intact.
- **(Topic 8) Whether the plan-writer `Type` field needs an explicit note for prose tasks.** The design
  routes prose tasks as `tdd` without adding a `Type` value. Open: whether `code-plan-writer.md` should
  also gain a one-line note that a prose/instruction-only task is typed `tdd` and verified by inspection
  (so future planners don't re-discover this), or whether the writer-side branch alone suffices.
  Deferred to the design-doc-writer; either way no new `Type` value is introduced.

## Risks

<!-- Anything worth flagging to the design-doc-writer and downstream phases. -->

- **Mixed-content commit (product + artifact in one commit).** The path-based product/artifact
  discriminator (Reqs 8, 9) assumes a commit is cleanly one class or the other. Researcher-confirmed:
  in today's design writers commit product only and reviewers commit artifacts only, so the two are
  always separable. If a future agent ever commits product and artifact files together, the
  "none of the changed paths under the artifacts folder ⇒ product commit" rule classifies it as a
  *product* commit (at least one path outside the artifacts folder), so it goes untagged — the
  Rule-2-safe outcome (no provenance leaks into a product-bearing commit). Flagging in case the
  division of labor changes.

- **Drift between the duplicated canonical wordings (Req 11).** The rules are duplicated verbatim into
  ~5 profiles (CLAUDE.md mandates duplication over a shared referenced file). If a future edit changes
  one copy and not the others, the "stated once and consistently" guarantee erodes and a narrower/
  divergent variant could re-appear — the exact failure Req 11 guards against. Mitigation: treat the
  canonical wording as a single block copied identically; any future change touches every copy. The
  design-doc-writer should make the canonical wording explicit so copies are verifiably identical.

- **Referent-test over-flagging in the self-hosting repo.** Because RP's own product is saturated with
  pipeline vocabulary, a reviewer applying Rule 2 too literally could reject legitimate content
  (filename literals, illustrative paths, methodology prose). Mitigation: the referent-based test plus
  the explicit "not a violation" examples in the canonical wording (Topic 3). This is the most likely
  false-positive source; the wording's negative examples are load-bearing.

- **Enforcement is judgment, not mechanical (accepted per spec).** Detection can miss a violation
  (Req 12 explicitly does not guarantee exhaustiveness; Out-of-Scope #4 leaves tooling optional). Not a
  defect to fix — recorded so downstream phases don't try to add a forbidden mechanical scan
  (Out-of-Scope #2). The guarantee is only that a *seen* violation cannot be approved.

- **e2e writer fit.** `code-writer-e2e` produces test code (comments/strings/identifiers in tests), so it
  carries the rules, but it has no inline-API-docs step today; the canonical wording must read sensibly
  for an agent whose product is test code, not API docs. Minor; flagged for implementation.

- **(Topic 8) The writer-side inspection branch is a *general* tool change, not output-rules-specific.**
  Adding the inspection-only branch to `code-writer-tdd.md`/`code-writer-e2e.md` changes how the tool
  handles *any* future prose/instruction-only code task, beyond this feature's output rules. This is
  arguably broader than the spec's subject (the output rules) — but it is **load-bearing for this
  feature's own realizability**: without it, this feature's own Code phase cannot execute (the blocker).
  It is also a pure generalization of behavior the repo already practices (every prose-only pipeline
  verifies by inspection) and that `AGENTS.md:17` already mandates; the edit makes an existing, banned-
  test-implied affordance explicit where the writer reads it. The design-doc-reviewer/orchestrator should
  confirm this in-scope reasoning: it is the minimum change that makes the deliverable shippable, and it
  edits the same profile family this feature already edits. If the orchestrator judges it out of scope,
  the alternative is to escalate a tool-level blocker — but the evidence (the de-facto path + the root
  rule) shows the change is small, precedented, and necessary, so settling it here is preferred.

- **(Topic 8) Reviewer must not demand a test for the prose tasks during enforcement.** Since the
  `code-reviewer` now also enforces Rule 1/Rule 2 (Topic 4), it inspects this feature's own batch. The
  reviewer must verify the prose tasks' Acceptance by inspection (its already-supported mode) and must
  **not** reject them for lacking a test — the same no-structural-tests rule binds the reviewer. Low risk
  (the reviewer profile already authorizes the inspection mode and the repo's reviews consistently do
  this), but worth stating so the enforcement additions of Topic 4 do not accidentally re-introduce a
  test demand on this very feature.
