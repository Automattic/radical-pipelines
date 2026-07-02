# Design Research: Default output rule — host-project output never references the run that produced it

This record drives the design for spec `1-spec/spec.md` (R1–R10, AC1–AC7). The change is entirely a prose edit to five agent profiles under `agents/`: three producers (`code-writer-tdd`, `code-writer-e2e`, `docs-writer`) get a standing Guidelines disposition; two reviewers (`code-reviewer`, `docs-reviewer`) get a detection checklist item. No code, no new machinery.

## Research

<!-- Non-trivial findings from the design-doc-researcher, with sources cited. -->

### R1 — Current state of the five target profiles and existing precedent

Confirmed by the design-doc-researcher (dd-researcher) and by direct reads of the profiles.

**Producers — where the Guidelines disposition attaches (R7):**
- `agents/code-writer-tdd.md` — `## Guidelines` bulleted section starts at line 52. **Existing precedent:** line 33 (inside Workflow step 2, "Implement with TDD", under "Document every public symbol…") reads: *"Comments must be self-contained — never reference the spec, the plan, or any other artifact."* This is the closest existing thing to the new rule, but it is (a) scoped only to comments/inline docs, (b) placed in a workflow step rather than Guidelines, and (c) narrower than the spec's referent-based rule (no task/criterion numbers, no other-agent-as-author, no commit content).
- `agents/code-writer-e2e.md` — `## Guidelines` starts at line 43. No existing reference-avoidance line.
- `agents/docs-writer.md` — `## Guidelines` starts at line 55. No existing reference-avoidance line. Line 62 already defines this agent's output surface (external docs) vs phase-4 code's surface — useful for scoping the disposition.

**Reviewers — where the detection checklist item attaches (R8):**
- `agents/code-reviewer.md` — the review checklist is the bulleted list under `### 2. Review the changes` → "Check, for the tasks in this batch:" (lines 24–32): Per-task Acceptance coverage, Spec acceptance coverage, Design alignment, Plan adherence, Test quality, Inline documentation, Convention compliance. A new detection bullet slots in here.
- `agents/docs-reviewer.md` — same structure, checklist under `### 2. Review the changes` (lines 26–33).
- Both reviewers' `## Guidelines` sections (code-reviewer ~line 104, docs-reviewer ~line 105) hold posture rules ("Every issue is must-fix", "Reject liberally") — the enforcement wording (R9) rides on these existing dispositions, so no new gate text is needed.

**Conventions (R6/R10, AC3/AC7):**
- `<artifacts-folder>` is an established placeholder already used throughout the reviewer/writer profiles (e.g. `code-reviewer.md:15-17`, `docs-writer.md:13-14`). It is a required convention ("Artifact folder", `conventions/load.md`) passed to every agent via `conventions/passing.md`. So R10's "take the location from the `<artifacts-folder>` convention" is already the idiom — no hardcoded path needed, and the token to reuse is literally `<artifacts-folder>`.
- Commit-format agent-name tag (AC3): convention default `<commit-description> (<agent-name>)` (`conventions/setup.md`). In this self-hosting repo, `.rp.md` mandates: *"Include the name of the agent in parenthesis."* So the tag (e.g. `(code-writer-tdd)`) is convention-added and the rule must exempt it. Profiles reference "the host project's commit format" generically — they do not hardcode the tag, which is correct for R10.

**Testing surface:** No structural tests assert agent-file content (only version-sync/changeset tooling under `scripts/test/`), consistent with the CLAUDE.md rule forbidding tests that restate skill/agent prose. Adding Guidelines/checklist lines will not break tests, and none should be added.

### R2 — Exhaustive precedent sweep and verbatim house style

**Precedent (dd-researcher, grep across all 18 profiles):** Exactly ONE existing line is a true "output must not reference the run's artifacts" rule:
- `code-writer-tdd.md:33` (verbatim): *"Comments must be self-contained — never reference the spec, the plan, or any other artifact."* Narrower than the new rule: scoped to comments only; names spec/plan/"any other artifact" but not another-agent-as-author, not numbered task/requirement pointers, not commit messages; and it sits in a workflow step (the placement R7 moves away from). **The new Guidelines disposition should absorb this — remove line 33 and let the broader bullet cover it, so the two cannot diverge.**

Two other "self-contained" lines are about the agent's **inputs/sourcing**, not its output — leave them alone: `code-writer-tdd.md:55` ("The task block is self-contained by design… you should not need to read the intent, spec…" — what to READ) and `docs-writer.md:26` ("Every concrete claim comes from the shipped code, not from memory and not from the docs-plan" — fact sourcing). No reviewer profile has any precedent line — the detection item is net-new in both reviewers.

**Producer Guidelines house style (verbatim tails):** uniform `- **Short imperative lead-in.** One or two sentences of explanation.` e.g. `code-writer-tdd.md:61` *"**Follow project conventions.** Existing patterns, naming, code style, testing style."*; the new disposition matches this shape.

**Reviewer checklist house style (verbatim):** uniform `- **Bold noun phrase** — a question/predicate that surfaces the defect.` e.g. `code-reviewer.md:25` *"**Per-task Acceptance coverage** — does each task in the batch satisfy its per-task Acceptance criteria, with passing tests covering each criterion?"* and `code-reviewer.md:32` *"**Convention compliance** — host project's coding, testing, build, and commit conventions."* A detection-phrased item (R8) fits this list natively.

**`<artifacts-folder>` usage inside the five targets (R10/AC7):**
- `docs-writer.md` uses the token (reads `<artifacts-folder>/1-spec/spec.md`, `…/2-design-doc/design-doc.md`). Both reviewers use it heavily (e.g. `code-reviewer.md:52` `<artifacts-folder>/4-code/code-review-approved.md`).
- **`code-writer-tdd.md` and `code-writer-e2e.md` do NOT use the token today** — they work only from the launch-prompt task block by design. So for the two code-writers, the disposition must introduce the boundary concept itself in referent terms (e.g. "your task's own artifacts / the artifacts of this run" rather than a raw path), while still able to name the `<artifacts-folder>` placeholder generically. This is consistent with R4/AC5: name concrete referents, not "the pipeline."
- Canonical token to reuse: the literal angle-bracketed placeholder `<artifacts-folder>`; in prose "the artifacts folder." No profile hardcodes a path or carries tool-specific references today.

### R3 — Discriminator pressure-test (the mechanical proof that the rule is referent-based, not a scan)

Pressure-tested by dd-researcher against R3, R5, R6, AC2, AC4, in *this self-hosting repo* where the vocabulary (spec, plan, task, phase, pipeline, agent, review) is itself the product's subject matter.

| # | String (host-project output) | Verdict | Reason (R3 discriminator) |
|---|---|---|---|
| a | commit subject `Add parser per R9` | VIOLATION | "R9" pins the change to this run's requirement/task. R6: descriptive commit content is in scope. |
| b | identifier `task3Helper` | VIOLATION | "task3" points at this run's task #3 by number. |
| c | comment `// as the design doc specifies` | VIOLATION | Names an artifact behind *this* change as the authority for the code. |
| d | symbol `spec` in code implementing a spec feature | ALLOWED | Bare domain vocabulary as the product's own subject matter (R3). No pointer to this run. |
| e | doc `The spec-writer produces spec.md` | ALLOWED | Describes the product's own feature; the nouns are subject matter, not references to this run's artifacts. |
| f | test name `rejects empty pipeline slug` | ALLOWED | "pipeline"/"slug" are domain terms naming product behavior (AC2 names "pipeline" as allowed). |
| g | comment `// the code-reviewer flagged this` (crediting the agent that reviewed *this* change) | VIOLATION | Another agent named as author/origin of *this* work (R3 3rd clause). |
| h | changelog `Add phase-2 output rule` | VIOLATION (context-dependent) | "phase-2" is a run-artifact pointer. Flips to ALLOWED only if the *product* genuinely has a user-facing feature literally named "phase 2." The judgment-heavy boundary. |
| i | variable `reviewApproved` in review-gate code | ALLOWED | "review" is the product's subject matter; no number/artifact/agent pinning to this run. |
| j | string literal `"R5"` as an EXAMPLE artifact-id in a doc documenting the rule itself | ALLOWED | Illustrative/example artifact reference (R5: examples are never violations). A specimen of the rule's subject matter, not a claim this doc was produced per R5. |
| k | doc line `This feature was added per the design doc` | VIOLATION | Names an artifact behind *this* change as the reason it exists. |
| l | symbol/file `designDoc` in code implementing a design-doc-authoring feature | ALLOWED | Domain vocabulary as subject matter; the product IS a design-doc tool. |

**The mechanical proof (why no scan can work):** the *same literal token* lands on both sides of the line — `design doc` is a violation in row c but allowed in row j; `spec` is allowed in row d but the pointer-form is a violation in row a/k; `phase-2` flips on referent (row h). Since identical strings have opposite verdicts, no token set, keyword list, or path pattern can separate them (R5). Only a judgment about the *referent* — "does this point back at THIS run?" — can. This is the design's core, and it survives the self-hosting case with no carve-out.

**The single intent test (reviewer applies by judgment):**
> "Does this token point at a specific piece of THIS run's own paperwork — a number that pins it to this run's task, flow, requirement, or review; a named artifact behind THIS change (the spec, plan, design doc, or review that drove it); or another agent credited as having done this work — as opposed to the same word used as the product's own subject matter or as an illustrative example?" YES → violation; domain vocabulary / example → allowed.

**Four wording risks the writer must guard against (from dd-researcher):**
1. *Biggest:* any phrasing that lists banned WORDS ("don't use 'spec', 'task', 'R'-numbers, agent names") instantly false-positives rows d/e/f/i/l and breaks R5/AC2. The text must speak in referent terms, never give the reviewer a word-list.
2. The number clause must say "a number that pins to THIS run's task/requirement," not "any R\d+ / task N pattern" — else row j and any product that numbers its own domain objects false-positive.
3. The "named artifact" clause must mean "an artifact of THIS run cited as the authority/origin behind the change," not "the words spec/plan/design doc appear" — else rows e/l false-positive. Rows e and l are the canonical self-hosting trap.
4. The agent-as-author clause must be "another agent named as the author of THIS work," not "an agent name appears" — else a doc "the code-reviewer reviews the batch" or a symbol `codeReviewer` false-positives. It must also carve out the commit-format agent-tag (AC3), which is a convention-added authorship marker, not a claim.

## Topics

### Topic 1: Overall approach — the implementer's mental model

- **Spec link:** R1, R7, R8, R9, R10 (whole-feature framing).
- **Options:**
  1. **Prose-only edit to the five profiles.** Add one Guidelines disposition bullet to each of the three producers; add one detection checklist bullet to each of the two reviewers. No new files, no shared referenced file, no code, no scanner. Enforcement rides on the existing per-phase review gate.
  2. Extract the rule into a shared referenced file that all five profiles link to. *(Rejected outright — the project's CLAUDE.md forbids agent profiles from referencing any skill file or `.rp.md`; a shared instruction must be duplicated into each profile, not extracted.)*
  3. Add a deterministic scanner/gate that greps for run-pointers. *(Rejected — spec Out of Scope explicitly forbids new enforcement machinery; R5 forbids token/keyword/path scanning.)*
- **Trade-offs:** Option 1 keeps the change minimal and honors every project constraint (no cross-file references between profiles, no scanning, no new machinery). Its cost is that the same idea is stated in five places and must be kept consistent by hand — but that is exactly the project's stated convention for shared agent instructions (duplication, not extraction). Because producers and reviewers phrase it differently (disposition vs detection) they are not verbatim copies anyway (AC6).
- **Decision:** Option 1 — a prose-only edit to the five profiles: a Guidelines disposition in each producer, a detection checklist item in each reviewer, enforcement at the existing review gate.
- **Rationale:** It is the only option compatible with the project's hard constraints (CLAUDE.md forbids profile-to-file references; spec forbids scanning and new machinery). The mental model for the implementer: "the rule is a piece of standing guidance that already has a home in every target profile — producers hold a Guidelines bullet telling them what not to write; reviewers hold a checklist bullet telling them what to catch. Nothing else changes."

### Topic 2: Which components change and how (and what stays untouched)

- **Spec link:** R7 (producers), R8 (reviewers), Out of Scope (earlier-phase agents untouched).
- **Decision — the five components that change:**
  1. `agents/code-writer-tdd.md` — add a Guidelines disposition (R7). Also reconcile the pre-existing narrower line 33 (see Topic 6).
  2. `agents/code-writer-e2e.md` — add a Guidelines disposition (R7).
  3. `agents/docs-writer.md` — add a Guidelines disposition (R7).
  4. `agents/code-reviewer.md` — add a detection item to the `### 2. Review the changes` checklist (R8).
  5. `agents/docs-reviewer.md` — add a detection item to the `### 2. Review the changes` checklist (R8).
- **Untouched but relevant (do NOT edit):**
  - Earlier-phase agents (spec-*, design-doc-*, *-plan-*): they write only artifacts under `<artifacts-folder>`, so the rule does not apply (spec Out of Scope). Not modified.
  - The skill files and `.rp.md`: the rule lives in profiles only; CLAUDE.md forbids profiles referencing them, and the commit-format/artifact-folder conventions already exist there unchanged.
  - Guardrails/gates: R9 uses the *existing* gate; no gate config changes.
- **Rationale:** The spec names exactly these three producers and two reviewers. Every other agent either writes only artifacts (exempt) or is out of scope. The change surface is exactly five Markdown files.

### Topic 3: Interfaces — where the rule text lives in each profile and in what voice

- **Spec link:** R7, R8, AC6 (role-appropriate, not the same block duplicated), R2/R3 (scope + discriminator must be expressed), R10/AC7 (generic wording).
- **Producer interface (disposition):** one new bullet in each producer's `## Guidelines` list, in the section's established style: bold lead-in phrase + explanation. It states the standing rule in the *writing* voice — "what you write into the host project carries no pointer back to this run" — names the scope by exclusion (everything outside `<artifacts-folder>`) and the discriminator (a task/criterion by number, a named artifact, or another agent as author), and calls out the commit-message content + agent-tag exemption.
- **Reviewer interface (detection):** one new bullet in each reviewer's `### 2. Review the changes` → "Check, for the tasks in this batch:" list, in that list's style (bold label + "— does …?" detection phrasing). It states the rule in the *finding* voice — "does any host-project output in this batch point at this run?" — with the same discriminator, and ties into the existing must-fix posture (R9): a hit blocks approval.
- **Why the two are not the same block (AC6):** producers get "do not write X"; reviewers get "flag X if present, block approval." Different grammatical mood, different placement, different surrounding posture. They share the discriminator vocabulary but are not copy-paste.
- **Decision:** Producer text → Guidelines disposition bullet; reviewer text → checklist detection bullet. Both reuse `<artifacts-folder>` as the scope boundary token and name concrete referents only.
- **Rationale:** Matches R7/R8 placement exactly and satisfies AC6 by construction. Exact wording is Topic 5.

### Topic 4: Detection mechanism — how the reviewer catches a violation without scanning

- **Spec link:** R3 (discriminator), R5 (no token/keyword/path scan, no carve-out), AC1 (a run-pointer is caught), AC2 (domain vocabulary is not), AC4 (artifacts may reference the run).
- **Options for the reviewer's method:**
  1. **Referent judgment (intent test).** The reviewer asks, of any candidate token in the batch's host-project output: "does this point at a specific piece of THIS run's paperwork (a number pinning it to this run's task/requirement/review, an artifact of this change cited as its authority/origin, or another agent credited as author)?" — vs. the same word used as the product's subject matter or an example.
  2. A pattern list the reviewer greps for (R\d+, taskN, "design doc", agent names). *(Rejected — this is the token/keyword scan R5 forbids, and the borderline table proves it produces false positives on rows d/e/f/i/j/l and false negatives on paraphrases.)*
- **Decision:** Option 1 — the reviewer detects by referent judgment, using the intent test above, as a standing checklist item worded for finding violations. A hit is a must-fix that blocks approval (rides on the existing "Every issue is must-fix" / "Reject liberally" posture, R9).
- **Rationale:** Only referent judgment can separate the identical-token cases (design doc as authority-for-this-change vs. design doc as subject matter; "R5" as this-run's requirement vs. "R5" as an example). It is inherently un-greppable — which is precisely how it satisfies R5's "not a scan" — and it needs no self-hosting carve-out because it never keys on vocabulary. AC2's allowed cases pass because none satisfies any of the three referent clauses; AC4 passes because the reviewer only inspects *host-project* output, not artifacts. The judgment-heavy boundary (row h, run-phase-number vs. product-feature-named-"phase-2") is carried by the same test ("does the number pin to THIS run?").

### Topic 5: Wording strategy — pipeline-free, referent-based, generic, role-differentiated

- **Spec link:** R4/AC5 (no "pipeline", names only referents the agent holds), R3 (discriminator), R10/AC7 (generic, no hardcoded path, no tool refs), R7/R8/AC6 (disposition vs detection, not the same block).
- **Strategy (the decided constraints; exact strings are a Plan/Code concern):**
  - **Name only concrete referents the agent already holds:** its *task*, the *spec / plan / design doc / review* it followed, and the *other agents*. Never the word "pipeline", never "the run" as a concept the agent must understand, never "the pipeline that produced this." (R4/AC5, R-2.)
  - **State scope by exclusion using the existing token:** everything the agent writes *outside `<artifacts-folder>`* is host-project output and carries no run-pointer; the artifacts folder is the one place references are allowed. For the two code-writers, which have no existing `<artifacts-folder>` line, phrase the boundary in referent terms ("your task's own artifacts / this run's artifacts") and may name the `<artifacts-folder>` placeholder generically; never a concrete path (R10/AC7).
  - **Express the discriminator, not a word-list:** a violation is a *pointer at this run* — a number pinning it to this run's task/requirement/review, an artifact of this change cited as its authority, or another agent credited as author. Explicitly note that bare domain vocabulary as subject matter and illustrative/example artifact references are *not* violations (guards rows d/e/f/i/j/l; R5, R-1).
  - **Commit content + tag:** descriptive commit content is in scope; the convention's agent-name tag is exempt (R6/AC3).
  - **Role differentiation (AC6):** producer text is a *disposition* ("what you write into the host project carries no pointer back to this run…"); reviewer text is a *detection predicate* ("does any host-project output in this batch point at this run? — if so, must-fix, block approval"). Same discriminator vocabulary, different mood/placement — not the same block.
- **Illustrative sketches (NON-binding; the code-writer drafts the final prose):**
  - *Producer disposition (Guidelines bullet):* "**No run-pointers in host-project output.** Everything you write outside the artifacts folder — code, identifiers, comments, string and test names, messages, docs, files you create, and commit descriptions — reads as if written by hand: it never points at this run's paperwork. A pointer is a number tying it to your task or a requirement/review (`task3Helper`, "per R9"), a named artifact behind this change cited as its authority ("as the design doc specifies"), or another agent credited as author. The domain's own vocabulary used as subject matter (a symbol `spec`, a doc about a spec-writing feature, the words task/plan/phase) is not a pointer, nor is an example artifact reference. The commit format's agent-name tag stays."
  - *Reviewer detection (checklist bullet):* "**No run-pointers in host-project output** — does anything the batch writes outside the artifacts folder point at this run: a number tying it to a task or requirement/review, a named artifact of this change cited as its authority, or another agent credited as author? Domain vocabulary used as subject matter and example artifact references are not violations, and the commit's agent-name tag is allowed. A real pointer is a must-fix that blocks approval."
- **Decision:** Adopt the strategy above; the sketches show shape and voice, not frozen text. Producers get the disposition form, reviewers the detection form; both are referent-based and pipeline-free.
- **Rationale:** This is the only formulation that simultaneously satisfies R4/AC5 (no "pipeline", referents only), R5/AC2 (referent-based, no word-list, survives self-hosting), R10/AC7 (generic, `<artifacts-folder>` token, no tool refs), R6/AC3 (commit content in, tag out), and AC6 (two distinct forms). The four wording risks in R3 above are the review criteria for the writer.

### Topic 6: Reconciling the pre-existing narrower rule (code-writer-tdd line 33)

- **Spec link:** R7 (disposition placement, not a workflow step), R2/R3 (broader scope than the old line), CLAUDE.md ("when a general rule already covers a case, state it once at that general level; don't add special-case restatements").
- **Situation:** `code-writer-tdd.md:33` already carries a narrower version of the rule (*"Comments must be self-contained — never reference the spec, the plan, or any other artifact"*) inside a Workflow step. Leaving it would (a) duplicate the idea, (b) contradict R7's "not in a numbered workflow step", and (c) create a divergence risk — the narrow line could drift from the new broad disposition.
- **Options:**
  1. Remove line 33 entirely; the new Guidelines disposition (which covers comments as one of many surfaces) absorbs it.
  2. Keep line 33 and add the disposition too. *(Rejected — violates the CLAUDE.md "state it once at the general level, no special-case restatement" rule and creates drift risk.)*
  3. Keep line 33's comment-specific angle but reword to defer to the disposition. *(Rejected — still a restatement; unnecessary.)*
- **Decision:** Remove `code-writer-tdd.md:33` and let the new Guidelines disposition cover comments as part of "everything outside `<artifacts-folder>`."
- **Rationale:** The new disposition strictly supersedes the old line (comments ⊂ all host-project output; artifacts ⊂ named referents). One statement at the general level, per CLAUDE.md. This makes code-writer-tdd consistent with code-writer-e2e and docs-writer, which get only the disposition. **Note for the implementation plan:** this is the one *deletion* in the change; the other four profiles are pure additions. The context around line 33 ("Document every public symbol…") must still read correctly after the removal — the surrounding bullets about documenting symbols stay. **The plan should make this deletion an explicit task/step of its own**, so a downstream reviewer does not later flag the removed line as a missing-precedent leftover or the retained-then-removed duplicate as an oversight.

### Topic 7: Commit messages — scope and the agent-tag exemption

- **Spec link:** R6, AC3.
- **Findings:** The commit-format convention (`.rp.md`, `conventions/setup.md`) adds an agent-name tag, e.g. `(code-writer-tdd)`. Producers always commit host-project paths (code/docs), so their commits are always subject to the rule (R6). Reviewers commit only artifact files under `<artifacts-folder>` (review/summary `.md`), so a reviewer's artifact-only commit is exempt (R6). The profiles already reference "the host project's commit format" generically and do not hardcode the tag — correct for R10.
- **Decision:** The producer disposition explicitly names commit-message *descriptive content* as in-scope, and explicitly exempts the convention's agent-name tag. It does not restate the changed-path test as machinery (producers always change host paths, so "always subject" is simply true for them); the reviewer detection item covers commit subjects among the surfaces it inspects. Reviewers need no special "your own artifact commit is exempt" clause because they only ever commit artifacts and the rule is about *host-project* output by definition — but the reviewer item should make clear it inspects the batch's commit subjects (a producer surface), not the reviewer's own commit.
- **Rationale:** AC3 requires the tag never be flagged; the cleanest way is for the producer disposition to name the exemption and for the reviewer detection to be worded about *the batch's* host-project output (which includes producer commit subjects). This keeps the rule referent-based: "descriptive content is subject; the agent-tag the commit format adds is not." No changed-path predicate needs to appear in the profile text — it is implicit in "output outside the artifacts folder," and the reviewer already only reviews producer batches.

### Topic 8: Dependencies

- **Spec link:** R9 (existing gate), R10 (generic).
- **Decision / findings:**
  - **Existing per-phase review gate** — the rule depends entirely on the already-present review step and its must-fix/reject-liberally posture (`code-reviewer.md` §2 and Guidelines; `docs-reviewer.md` §2 and Guidelines). No new dependency is introduced.
  - **`<artifacts-folder>` convention** — the scope boundary depends on this existing required convention, passed to every agent (`conventions/passing.md`, `conventions/load.md`). Reused, not extended.
  - **Commit-format convention** — the agent-tag exemption depends on this existing convention (`.rp.md`, `conventions/setup.md`). Reused, not extended.
  - **No new external libraries, services, tools, or files.** No scanner, no gate config, no shared referenced file.
- **Rationale:** By design the feature is pure prose in five profiles riding on machinery that already exists. Zero new dependencies is a positive signal that the approach matches the spec's Out-of-Scope constraints.

### Topic 9: Failure modes and observability

- **Spec link:** R3/R5 (discriminator errors), R9 (enforcement), AC1/AC2.
- **Failure modes:**
  1. **False negative (miss)** — a reviewer fails to spot a run-pointer and approves it; the leak ships. This is the failure the whole feature is designed to reduce. Detection is human-judgment at the gate; there is no deterministic backstop by design (spec forbids one). Mitigation: the detection item is a standing checklist bullet the adversarial reviewer must apply every batch; the must-fix posture blocks approval once caught.
  2. **False positive (over-flag)** — a reviewer flags domain vocabulary as a violation (AC2 breach), especially acute in this self-hosting repo where the vocabulary is the subject matter. Mitigation: the referent-based discriminator (Topic 4) — the reviewer flags only pointers at *this run's* paperwork, never the vocabulary itself; the wording explicitly lists the "not a violation" cases (vocabulary as subject matter, example artifact paths, artifact-type names).
  3. **Drift between the five copies** — the duplicated disposition/detection text diverges over time as profiles are edited independently. Mitigation is inherent to the project's chosen model (duplication over extraction, per CLAUDE.md); the shared discriminator vocabulary should be kept identical across the five where it is the same clause.
- **Observability:** The only surfaced signal is the reviewer's rejection artifact — a flagged violation appears as a must-fix Issue in `code-review-N-rejected.md` / `docs-review-N-rejected.md`, tagged to the producing task, which blocks approval until removed. There is no log/metric beyond the review record, and the spec does not ask for one.
- **Rationale:** The design accepts human judgment as the detector (spec mandates no machinery). The dominant risk is the false positive in the self-hosting repo, which Topic 4's referent-based wording is specifically built to prevent.

## Open Questions

<!-- Unresolved sub-questions deferred to the implementation phases. -->

- **Exact final wording of each of the five bullets** is a Plan/Code-phase concern. This design fixes the *strategy* (referent-based, pipeline-free, `<artifacts-folder>` boundary, discriminator = number/named-artifact/agent-as-author, commit-tag exemption) and the *placement*; the code-writer drafts the literal sentences within that strategy. The design-doc should hand down illustrative sketches, not frozen strings.
- **Whether the two code-writers should name the `<artifacts-folder>` placeholder at all** vs. referring only to "your task's own artifacts / this run's artifacts." They have no existing `<artifacts-folder>` line to lean on. Leaning to referent phrasing ("this run's artifacts") for the code-writers to stay maximally R4/AC5-aligned, with the placeholder available if a concrete boundary token reads more clearly. Deferred to wording.

## Risks

<!-- Anything worth flagging to the design-doc-writer and downstream phases. -->

- **R-1 (primary): False positives in the self-hosting repo.** This repo's own product vocabulary (spec, plan, task, phase, pipeline, agent, review) is exactly the vocabulary the rule discusses. A reviewer who reads the rule as vocabulary-based rather than referent-based will over-flag legitimate domain usage (AC2 breach). The wording must be unmistakably referent-based and should carry explicit "not a violation" examples. This is the single most important wording constraint and the design-doc-reviewer should scrutinize it.
- **R-2: The word "pipeline" leaking into the rule text itself.** R4/AC5 forbid the rule's wording from using "pipeline" or assuming the agent knows what one is. The natural way to describe the rule ("what the pipeline writes…") is exactly what's banned. The wording must name only referents the agent already holds (its task, the spec/plan/design-doc/review it followed, the other agents). Easy to violate by reflex; flag for the writer and reviewer.
- **R-3: Divergence of the five duplicated statements.** Accepted by the project's duplication-over-extraction model, but worth a note so future edits keep the shared discriminator clause consistent.
- **R-4: Removal of code-writer-tdd line 33 leaving dangling context.** The deletion must leave the surrounding "Document every public symbol" bullets coherent. Low risk, but it is the only deletion and touches a different section than the addition.
- **R-5: Reviewer detection phrased as scanning.** If the reviewer item is worded as "search for tokens like R\d+, taskN, 'design doc'," it becomes the token-scan R5 forbids. It must be phrased as a judgment about intent/referent, not a pattern to grep. Flag for the writer.

## Coverage map — every spec requirement/criterion → decision

| Spec item | Served by |
|---|---|
| R1 (single always-on default) | Topic 1 (prose in profiles, no per-run restatement), Topic 2 (five components). |
| R2 (scope by exclusion = outside `<artifacts-folder>`) | Topic 5 (scope-by-exclusion wording), R1/R2 research (token reuse). |
| R3 (violation discriminator) | Topic 4 + R3 research (borderline table, intent test). |
| R4 (no dependence on "pipeline") | Topic 5 (referents only), Risk R-2. |
| R5 (uniform, referent-based, no scan/carve-out) | Topic 4 (referent judgment, un-greppable), R3 research (mechanical proof), Risk R-1. |
| R6 (commit messages) | Topic 7 (commit content in-scope, tag/changed-path handling). |
| R7 (producers: Guidelines disposition) | Topic 2, Topic 3, Topic 5 (disposition form), Topic 6 (absorb line 33). |
| R8 (reviewers: detection checklist item) | Topic 2, Topic 3, Topic 4, Topic 5 (detection form). |
| R9 (enforcement at existing gate) | Topic 4 (must-fix rides existing posture), Topic 8 (no new gate). |
| R10 (generic: no path, no tool refs) | R1/R2 research (`<artifacts-folder>` idiom), Topic 5, Topic 8. |
| AC1 (run-pointer caught) | Topic 4, R3 table rows a/b/c/g/k. |
| AC2 (domain vocabulary not caught) | Topic 4, R3 table rows d/e/f/i/l; Risk R-1. |
| AC3 (agent-name tag allowed) | Topic 7, Topic 5 (tag exemption); R3 wording-risk 4. |
| AC4 (artifacts may reference the run) | Topic 4 (reviewer inspects host-project output only, not artifacts). |
| AC5 (rule text pipeline-free) | Topic 5, Risk R-2. |
| AC6 (role-appropriate, not the same block) | Topic 3, Topic 5 (disposition vs detection). |
| AC7 (generic wording) | R1/R2 research, Topic 5, Topic 8. |

Every requirement and criterion is served. Open items (exact final wording; whether code-writers name the `<artifacts-folder>` placeholder) are wording-level and deferred to Plan/Code, not load-bearing design decisions.
