# Design Doc: Default output rule — host-project output never references the run that produced it

## Overview

Today, when an autonomous run writes code, tests, docs, and commit messages into a host project, nothing stops it from leaving a pointer back at the run itself — a comment "// per R5", an identifier `task3Helper`, a doc line "as the design doc specifies", or a commit subject "Add parser per R9". The run owner must restate "don't reference the run" every time, and leaks still slip through. The output should read as if written by hand, carrying no trace of the specific run that produced it.

This design promotes that expectation into a single, always-on rule that lives in the five agent profiles that produce and review host-project output. The rule is **referent-based**: it targets pointers to *this* run — a number pinning output to the run's task or a requirement/review, a named artifact behind the change cited as its authority, or another agent credited as author — never the vocabulary of the domain. Because it keys on the referent and not on words, it applies uniformly to every host project including this self-hosting one (whose product vocabulary — spec, plan, task, phase, pipeline — is exactly the vocabulary the rule discusses) with no carve-outs. Producers carry it as a standing disposition telling them what not to write; reviewers carry it as a detection check telling them what to catch; enforcement rides on the existing per-phase review gate. The change is entirely prose in five Markdown files — no code, no scanner, no new machinery.

## Approach

The feature is realized end-to-end as a prose edit to five agent profiles under `agents/`, riding on machinery that already exists.

The mental model for the implementer:

- The rule is a piece of standing guidance that gets a home in every target profile. It is stated **twice in two voices**, not once and referenced — the project forbids agent profiles from referencing any shared file, so a shared instruction is duplicated into each profile rather than extracted.
- **Producers** (`code-writer-tdd`, `code-writer-e2e`, `docs-writer`) hold the rule as a **Guidelines disposition** — a "what you write never points back at this run" bullet, in the writing voice, sitting among the other standing dispositions rather than inside a numbered workflow step.
- **Reviewers** (`code-reviewer`, `docs-reviewer`) hold the rule as a **detection checklist item** — a "does any host-project output in this batch point at this run?" bullet, in the finding voice, sitting in the "Review the changes" checklist alongside the other per-batch checks.
- **Scope** is defined by exclusion: everything the run writes *outside the artifacts folder* is host-project output and is governed; the artifacts folder is the one place references to the run are allowed, because the artifacts are the record of the run.
- **Detection** is a human judgment about the referent, applied by the reviewer per batch — never a token/keyword/path scan. The same literal token (`design doc`, `spec`, `phase-2`) lands on both sides of the line depending on whether it points back at this run or is used as the product's own subject matter, so only a judgment about the referent can separate the cases. This is why the rule is inherently un-greppable, and why it needs no self-hosting carve-out.
- **Enforcement** is the existing per-phase review gate: a reviewer treats a real pointer as a must-fix that blocks approval, riding on the reviewers' existing "every issue is must-fix / reject liberally" posture. No new gate, script, or tool is introduced.

The rule's *wording* names only concrete referents an agent already holds — its **task**, the **spec / plan / design doc / review** it followed, and the **other agents** — and never the word "pipeline" nor any concept the agent must be taught. The exact final sentences are a downstream (planning/coding) concern; this design fixes the strategy, the placement, and the discriminator, and hands down illustrative sketches rather than frozen strings.

## Components

Five profiles change; everything else is deliberately untouched.

**Changed — producers (add a Guidelines disposition, R7):**

- `agents/code-writer-tdd.md` — add one bullet to the `## Guidelines` list. Additionally, **remove the pre-existing narrower line** (currently in Workflow step 2, "Implement with TDD": *"Comments must be self-contained — never reference the spec, the plan, or any other artifact."*). That line is a narrower version of the same rule sitting in a workflow step; the new disposition strictly supersedes it (comments are one of many host-project surfaces; spec/plan are among the named referents). Keeping it would duplicate the idea, contradict R7's "not in a numbered workflow step," and risk drift. The surrounding "Document every public symbol…" bullets stay and must still read coherently after the removal.
- `agents/code-writer-e2e.md` — add one bullet to the `## Guidelines` list. No pre-existing line to reconcile.
- `agents/docs-writer.md` — add one bullet to the `## Guidelines` list. No pre-existing line to reconcile. This agent already scopes its output surface (external docs) versus phase-4 code's surface, which the disposition can lean on.

**Changed — reviewers (add a detection checklist item, R8):**

- `agents/code-reviewer.md` — add one bullet to the `### 2. Review the changes` → "Check, for the tasks in this batch:" list (which already holds Per-task Acceptance coverage, Spec acceptance coverage, Design alignment, Plan adherence, Test quality, Inline documentation, Convention compliance). The new item slots in as a peer detection check.
- `agents/docs-reviewer.md` — add one bullet to the same-shaped `### 2. Review the changes` checklist.

The reviewers' enforcement wording rides on their existing `## Guidelines` posture ("every issue is must-fix," "reject liberally"); no new gate text is added there.

**Untouched but relevant (do not edit):**

- **Earlier-phase agents** (spec-*, design-doc-*, *-plan-* writers/reviewers/analysts). They write only artifacts under the artifacts folder, so the rule — which governs host-project output — does not apply to them (spec Out of Scope). Not modified.
- **The skill files and run configuration.** The rule lives in profiles only; the project forbids profiles from referencing those files, and the commit-format and artifacts-folder conventions already exist there unchanged.
- **The review gate / guardrails config.** Enforcement uses the *existing* gate (R9); no gate configuration changes.

## Interfaces and Data Flow

The "interfaces" here are the prose slots in each profile and the voice each uses. There is no runtime data flow; the "flow" is how the rule moves through a run.

**Producer interface — the disposition bullet.** One new bullet per producer, in the `## Guidelines` list's established house style: a bold imperative lead-in followed by one or two sentences of explanation (matching, e.g., the existing "**Follow project conventions.** Existing patterns, naming, code style, testing style."). It states the rule in the **writing voice**: everything the agent writes outside the artifacts folder — code, identifiers, comments, string and test names, log/error messages, inline and external docs, files it creates, and commit descriptions — reads as if written by hand and carries no pointer back to this run. It names the discriminator (a number tying output to the task or a requirement/review; a named artifact behind this change cited as its authority; or another agent credited as author), states the not-a-violation cases (domain vocabulary as subject matter, illustrative/example artifact references), and notes that descriptive commit content is in scope while the commit format's agent-name tag stays.

Illustrative sketch (NON-binding — shows shape and voice, not frozen text):

> **No run-pointers in host-project output.** Everything you write outside the artifacts folder — code, identifiers, comments, string and test names, messages, docs, files you create, and commit descriptions — reads as if written by hand: it never points at this run's paperwork. A pointer is a number tying it to your task or a requirement/review (`task3Helper`, "per R9"), a named artifact behind this change cited as its authority ("as the design doc specifies"), or another agent credited as author. The domain's own vocabulary used as subject matter (a symbol `spec`, a doc about a spec-writing feature, the words task/plan/phase) is not a pointer, nor is an example artifact reference. The commit format's agent-name tag stays.

**Reviewer interface — the detection bullet.** One new bullet per reviewer, in the checklist's house style: a bold noun-phrase label followed by a "— does …?" predicate that surfaces the defect (matching, e.g., "**Convention compliance** — host project's coding, testing, build, and commit conventions."). It states the rule in the **finding voice**: does anything the batch writes outside the artifacts folder point at this run? — using the same discriminator, naming the same not-a-violation cases, exempting the commit's agent-name tag, and tying into the must-fix posture so a real pointer blocks approval.

Illustrative sketch (NON-binding):

> **No run-pointers in host-project output** — does anything the batch writes outside the artifacts folder point at this run: a number tying it to a task or requirement/review, a named artifact of this change cited as its authority, or another agent credited as author? Domain vocabulary used as subject matter and example artifact references are not violations, and the commit's agent-name tag is allowed. A real pointer is a must-fix that blocks approval.

**Why the two are not the same block (AC6).** Producers get "do not write X"; reviewers get "flag X if present, block approval." Different grammatical mood (imperative disposition vs. detection predicate), different placement (Guidelines list vs. review checklist), different surrounding posture. They deliberately share the *discriminator vocabulary* (number / named artifact / agent-as-author, and the not-a-violation cases) so the five copies stay consistent, but they are not copy-paste.

**The scope boundary token.** The scope is "outside the artifacts folder." Both reviewers and `docs-writer` already use the `<artifacts-folder>` placeholder in their prose, so they express the boundary with that established token. The two code-writers (`code-writer-tdd`, `code-writer-e2e`) do **not** use the token today — they work solely from the launch-prompt task block by design — so their disposition introduces the boundary in referent terms ("this run's artifacts" / "your task's own artifacts") and may name the `<artifacts-folder>` placeholder generically if a concrete boundary token reads more clearly. Neither ever hardcodes a path.

**Data flow of the rule through a run:**

1. A producer writes host-project output. Its Guidelines disposition constrains what it writes: no pointer back at this run leaves the artifacts folder. The producer commits with descriptive content subject to the rule and the convention's agent-name tag appended.
2. The reviewer reviews the producer batch. Its detection checklist item asks, of the batch's host-project output (including producer commit subjects), whether anything points at this run.
3. A real pointer is recorded as a must-fix Issue in the reviewer's rejection artifact, tagged to the producing task, and blocks approval until removed. Clean output is approved. The reviewer inspects only *host-project* output, never the run's own artifacts.

## Key Decisions

### Decision: Prose-only edit to the five profiles; no shared file, no scanner

- **Choice:** Realize the rule entirely as prose — one Guidelines disposition in each of the three producers and one detection checklist item in each of the two reviewers — with enforcement on the existing per-phase review gate. No new files, no shared referenced file, no code, no scanner.
- **Alternatives:** (a) Extract the rule into a single shared file all five profiles link to. (b) Add a deterministic scanner/gate that greps for run-pointers.
- **Trade-offs:** Alternative (a) is rejected because the project forbids agent profiles from referencing any shared skill/config file — a shared instruction must be duplicated into each profile. Alternative (b) is rejected because the spec explicitly forbids new enforcement machinery and forbids token/keyword/path scanning. The chosen option's cost is that the same idea is stated in five places and must be kept consistent by hand — but that is the project's stated model for shared agent instructions (duplication, not extraction), and because producers and reviewers phrase it differently they are not verbatim copies anyway.
- **Traces to:** R1 (single always-on default), R7, R8, R9, R10; and the spec's Out-of-Scope prohibition on new enforcement machinery.

### Decision: Referent-based detection by reviewer judgment, not a token scan

- **Choice:** The reviewer detects a violation by judging the **referent** — asking whether a token points at a specific piece of *this run's* paperwork (a number pinning it to this run's task/requirement/review; an artifact of this change cited as its authority/origin; or another agent credited as author) versus the same word used as the product's subject matter or as an illustrative example. This is worded as a standing detection item, not as a pattern to grep.
- **Alternatives:** A pattern list the reviewer scans for (`R\d+`, `taskN`, "design doc", agent names).
- **Trade-offs:** The pattern-list alternative is the very scan the spec forbids, and it demonstrably fails: the *same literal token* has opposite verdicts depending on referent — `design doc` is a violation when cited as the authority for a change but allowed as the subject matter of a design-doc-authoring feature; `spec` is allowed as a domain symbol but a violation in pointer form ("per R9"); `phase-2` flips on whether the number pins to this run or names a genuine product feature. Since identical strings land on both sides of the line, no token set, keyword list, or path pattern can separate them. Only referent judgment can — which is exactly what makes the rule un-greppable and lets it survive the self-hosting case with no carve-out. Its cost is that detection is human judgment with no deterministic backstop, which the spec explicitly accepts.
- **Traces to:** R3 (the violation discriminator), R5 (uniform, referent-based, no scan, no carve-out); AC1, AC2, AC4.

### Decision: Wording names only concrete referents and never uses "pipeline"

- **Choice:** The rule's wording names only referents the agent already holds — its task, the spec/plan/design doc/review it followed, and the other agents — and states scope by exclusion relative to the artifacts folder. It never uses the word "pipeline" nor assumes the agent knows what a pipeline (or "the run") is as a concept.
- **Alternatives:** The natural phrasing "what the pipeline writes into the host project must not reference the pipeline" — which is precisely what R4/AC5 forbid.
- **Trade-offs:** An agent reads only its own profile and its launch prompt, so it does not necessarily hold the concept "pipeline." Wording the rule around concrete referents it *does* hold keeps it self-contained and generic across host projects; the cost is that "pipeline" is the reflexive way to describe the rule, so the wording must be written carefully to avoid it (a primary review criterion for downstream phases).
- **Traces to:** R4 (rule must not depend on the concept "pipeline"), AC5 (rule text is pipeline-free).

### Decision: Commit descriptive content is in scope; the agent-name tag is exempt

- **Choice:** A commit message's descriptive content is subject to the rule; the agent-name tag the commit-format convention appends (e.g. `(code-writer-tdd)`) is not a violation and remains. The producer disposition names the commit content as in-scope and the tag as exempt; the reviewer detection item inspects the batch's commit subjects among its surfaces.
- **Alternatives:** Restate a "commit is subject only when it changes a path outside the artifacts folder" predicate as explicit machinery in the profile text.
- **Trade-offs:** Producers always commit host-project paths, so "always subject" is simply true for them and the changed-path predicate need not appear as machinery — it is implicit in "output outside the artifacts folder." Reviewers commit only artifact files, so a reviewer's own artifact-only commit is exempt by definition, and the reviewer item is worded about *the batch's* host-project output (a producer surface), not the reviewer's own commit. Keeping the tag exempt is required so a convention-added authorship marker is never mistaken for an authored claim.
- **Traces to:** R6 (commit messages), AC3 (the commit agent-name tag is allowed).

### Decision: Remove the pre-existing narrower comment rule in code-writer-tdd

- **Choice:** Delete the existing narrower line in `code-writer-tdd.md` (*"Comments must be self-contained — never reference the spec, the plan, or any other artifact."*) and let the new broad Guidelines disposition absorb it.
- **Alternatives:** (a) Keep the line and add the disposition too. (b) Keep the line but reword it to defer to the disposition.
- **Trade-offs:** Both alternatives are rejected: the new disposition strictly supersedes the old line (comments ⊂ all host-project output; spec/plan ⊂ the named referents), so keeping it duplicates the idea, contradicts R7 (the rule must not live in a numbered workflow step), and creates drift risk between the narrow and broad statements. Removing it states the rule once at the general level and makes `code-writer-tdd` consistent with the other two producers. The one risk is leaving dangling context: the removal must leave the surrounding "Document every public symbol…" bullets coherent.
- **Traces to:** R7 (producers carry the rule as a standing Guidelines disposition, not a workflow step); and the project's "state a general rule once, no special-case restatement" convention.

### Decision: Distinct role-appropriate forms — disposition vs. detection

- **Choice:** Producers carry the rule as a Guidelines *disposition* (writing voice: "what you write never points back at this run"); reviewers carry it as a checklist *detection* item (finding voice: "does any host-project output in this batch point at this run? — if so, must-fix, block approval"). The two share the discriminator vocabulary but are not the same block.
- **Alternatives:** Paste one identical block into all five profiles.
- **Trade-offs:** The identical-block alternative would violate AC6's "not the same block duplicated" and would place a detection predicate in a producer (wrong voice) or a writing disposition in a reviewer's checklist (wrong voice). The chosen forms match each profile's existing house style natively and satisfy AC6 by construction. The cost — two variants of shared discriminator text to keep aligned — is accepted under the duplication-over-extraction model.
- **Traces to:** R7, R8, AC6 (role-appropriate placement, not the same block).

### Decision: Take the scope boundary from the `<artifacts-folder>` convention; no hardcoded path, no tool references

- **Choice:** Express the scope boundary via the existing `<artifacts-folder>` placeholder (in the reviewers and `docs-writer`, which already use it) or in referent terms ("this run's artifacts") for the two code-writers that do not. No profile hardcodes an artifacts-folder path and none carries tool-specific references.
- **Alternatives:** Write a concrete artifacts-folder path into the profiles.
- **Trade-offs:** A hardcoded path would break genericity across host projects and tie the profiles to a specific layout; the placeholder is already the established idiom passed to every agent. The chosen approach is generic by construction.
- **Traces to:** R10 (generic profiles), AC7 (generic wording — no hardcoded path, no tool-specific reference).

## Dependencies

All dependencies are existing; the feature introduces none.

- **The existing per-phase review gate** — the rule's enforcement depends entirely on the already-present review step and the reviewers' must-fix / reject-liberally posture (in each reviewer's `### 2. Review the changes` and `## Guidelines`). Reused, not extended.
- **The `<artifacts-folder>` convention** — the scope boundary depends on this existing required convention, which is passed to every agent. Reused, not extended.
- **The commit-format convention** — the agent-name-tag exemption depends on this existing convention that appends the tag. Reused, not extended.
- **No new external libraries, services, tools, or files** — no scanner, no gate configuration, no shared referenced file. Zero new dependencies is the expected signal that the approach matches the spec's Out-of-Scope constraints.

## Failure Modes and Observability

**Failure modes:**

1. **False negative (a leak ships).** A reviewer fails to spot a run-pointer and approves it. This is the failure the whole feature is designed to reduce. Detection is human judgment at the gate; by design there is no deterministic backstop (the spec forbids one). Mitigation: the detection item is a standing checklist bullet the adversarial reviewer applies every batch, and the must-fix posture blocks approval once a pointer is caught.
2. **False positive (over-flag).** A reviewer flags domain vocabulary as a violation — most acute in this self-hosting repo, where spec/plan/task/phase/pipeline/agent/review are the product's own subject matter. This is the single most important risk. Mitigation: the referent-based discriminator — the reviewer flags only pointers at *this run's* paperwork, never the vocabulary itself — plus the wording explicitly listing the not-a-violation cases (vocabulary as subject matter, illustrative/example artifact references, artifact-type names). The wording must be unmistakably referent-based and never present the reviewer a word-list; a vocabulary-based reading would breach AC2.
3. **Drift between the five copies.** The duplicated disposition/detection text may diverge as profiles are edited independently over time. This is inherent to the project's duplication-over-extraction model; mitigation is to keep the shared discriminator clause identical across the five where it is the same clause.

**Observability:** The only surfaced signal is the reviewer's rejection artifact — a flagged violation appears as a must-fix Issue in the reviewer's rejection record under the artifacts folder, tagged to the producing task, and blocks approval until removed. There is no log or metric beyond the review record, and the spec does not ask for one.

## Risks and Open Questions

**Risks (flagged to downstream phases):**

- **Primary — false positives in the self-hosting repo.** The repo's own product vocabulary is exactly what the rule discusses. A reviewer (or a writer drafting the wording) who reads the rule as vocabulary-based rather than referent-based will over-flag legitimate domain usage (AC2 breach). The wording must be unmistakably referent-based and carry explicit not-a-violation examples. This is the single most important wording constraint and should be scrutinized in review.
- **"pipeline" leaking into the rule text.** The reflexive way to describe the rule uses the word "pipeline," which R4/AC5 forbid. The wording must name only referents the agent already holds. Easy to violate by reflex; a review criterion.
- **Reviewer detection phrased as scanning.** If the reviewer item is worded as "search for tokens like `R\d+`, `taskN`, 'design doc'," it becomes the token-scan R5 forbids. It must be phrased as a judgment about the referent, not a pattern to grep.
- **Divergence of the five duplicated statements.** Accepted under the project's duplication-over-extraction model; noted so future edits keep the shared discriminator clause consistent.
- **Dangling context from the code-writer-tdd deletion.** Removing the pre-existing narrower line is the only deletion; it must leave the surrounding "Document every public symbol…" bullets coherent. Low risk, and it touches a different section than the addition.

**Open questions (deferred to planning/coding — wording-level, not load-bearing design decisions):**

- **The exact final wording of each of the five bullets.** This design fixes the strategy (referent-based, pipeline-free, `<artifacts-folder>` boundary, discriminator = number / named-artifact / agent-as-author, commit-tag exemption) and the placement; the literal sentences are drafted downstream within that strategy. The sketches above show shape and voice, not frozen text.
- **Whether the two code-writers name the `<artifacts-folder>` placeholder at all** versus referring only to "this run's artifacts / your task's own artifacts." They have no existing `<artifacts-folder>` line to lean on. The leaning is toward referent phrasing to stay maximally aligned with R4/AC5, with the placeholder available if a concrete boundary token reads more clearly.

## Coverage of acceptance criteria

- **AC1 (a run-pointer is caught).** The producer disposition forbids writing it and the reviewer detection item catches it as a must-fix that blocks approval — covering the number-pointer (`task3Helper`, "per R9"), named-artifact ("as the design doc specifies"), and agent-as-author cases, and producer commit subjects.
- **AC2 (domain vocabulary is not caught).** The referent-based discriminator flags only pointers at this run; bare vocabulary as subject matter satisfies none of the three referent clauses, so it passes — in any repo including this one. The wording explicitly names the not-a-violation cases.
- **AC3 (the commit agent-name tag is allowed).** The producer disposition names the tag as exempt and the reviewer detection item allows it; only descriptive commit content is in scope.
- **AC4 (artifacts may reference the run).** The reviewer inspects only *host-project* output (outside the artifacts folder), never the run's own artifacts, so an artifact referencing its tasks/phases/agents is never flagged.
- **AC5 (rule text is pipeline-free).** The wording names only concrete referents (task, spec, plan, design doc, review, agents) and never uses "pipeline" or assumes the agent knows what one is.
- **AC6 (role-appropriate placement).** Producers carry a Guidelines disposition; reviewers carry a detection checklist item; the two are distinct forms in distinct voices and placements, not the same block.
- **AC7 (generic wording).** The scope boundary comes from the `<artifacts-folder>` convention (or referent phrasing for the two code-writers); no profile hardcodes a path or carries tool-specific references.
