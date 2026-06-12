# Spec Research

## Rough Idea

# Role-scoped guardrails with reviewer fail-fast

> Source: GitHub issue [Automattic/radical-pipelines#121](https://github.com/Automattic/radical-pipelines/issues/121).
> This file is self-contained; agents do not need to open the source issue.

## Goal

Guardrails can express which role runs them within the code phase, so writers run cheap gates (lints, typechecks) on every commit while expensive suites run once per pipeline — on the code-reviewer's approving iteration — instead of every code-phase guardrail being mandatory for both roles on every writer commit and every review iteration.

## Constraints

- Guardrails without a level keep today's behavior (both roles run them) — existing `.rp.md` files must keep working unchanged.
- Docs-phase guardrails are untouched.

## Context

Today guardrails have exactly one scoping dimension: phase (`code`/`docs`). `load.md` makes them "mandatory within the phase(s)", `setup.md` captures only name/command/phase per gate, and both `code-writer.md` (step 5) and `code-reviewer.md` (step 2) must run every code-phase guardrail. An expensive suite declared as a `code` guardrail therefore runs on every task commit and every review iteration; the only alternative today is not declaring it at all, which makes it no gate for anyone.

Independent of the "Plan-driven test selection and reviewer-side behavior verification" work ([#122](https://github.com/Automattic/radical-pipelines/issues/122)), though both edit the writer/reviewer agent files, so the two should not be worked on in parallel.

## Assumptions / directions to explore

- Add a level dimension (writer/reviewer) to the guardrail definition and selection rule; unscoped means both.
- The reviewer may reject early on cheaper findings without running the reviewer-scoped suites; all reviewer gates must pass on the approving iteration — that's what makes "the full run happens once per pipeline when all goes well" literally true.
- Likely touches: `reference/conventions/load.md` (definition + selection rule), `reference/conventions/setup.md` (capture asks the level per gate), `agents/code-writer.md`, `agents/code-reviewer.md`.

## Q&A

### Q1: How are guardrails defined, captured, and consumed today?

Specifically: (a) the exact guardrail definition and selection rule in `reference/conventions/load.md`; (b) what `reference/conventions/setup.md` captures per gate and the resulting `.rp.md` format (quote a real or example guardrail entry); (c) the exact obligations in `agents/code-writer.md` step 5 and `agents/code-reviewer.md` step 2 (quote them); (d) how docs-phase guardrails are consumed and by which agents, so we know what "untouched" must preserve.

**A:**

**(a) Definition + selection rule — `reference/conventions/load.md`**

Definition (lines 26-28):

> "A guardrail is an exact command, judged pass/fail solely by its exit code (0 = pass, any non-zero = fail), mandatory within the phase(s) it applies to. 'Run the tests' is not a guardrail; `npm test` is. The only valid phase targets are `code` and `docs`; a guardrail may apply to one or both."
>
> "An absent or empty Guardrails declaration means no command gates — a valid, complete state, never a blocker and never a warning."

Selection rule (line 30):

> "To load the guardrails for a phase, select the guardrails whose phase(s) include the current phase; an empty selection means run none and proceed."

Also relevant — committed-only (line 46): "Guardrails is shared and committed-only; it is never taken from `.rp.local.md`." So a level dimension is never overridable per-developer.

**(b) Capture + `.rp.md` format — `reference/conventions/setup.md`**

"Capture per gate" (lines 179-183), verbatim:

> "- A **name** (e.g. `tests`, `lint`).
> - The **exact literal command** to run (e.g. `npm test`).
> - The applicable **phase(s)** — `code`, `docs`, or both. These are the only valid phase targets."

There is **no prescribed table/syntax** for the `.rp.md` guardrail entry — setup.md describes the three captured fields in prose but never shows a literal `.rp.md` block. This repo's own `.rp.md` declares no Guardrails section at all (absent = valid empty state), so there is no real fixture to quote. The format is effectively open for the spec to define. Validation logic (lines 187-204) is phase-agnostic ("did it execute?") and carries over to a level dimension unchanged.

**(c) Writer step 5 / reviewer step 2 — verbatim**

`agents/code-writer.md` step 5 (lines 44-49):

> "### 5. Run the code-phase guardrails
> Run every guardrail applicable to the code phase, exactly as its command is written. Each is mandatory. Behavior verification (step 3) is not a guardrail — it is a separate step you already performed.
> - Run **every** code-phase guardrail, exactly as its command is written. Do not invent commands. Do not omit any.
> - Every applicable guardrail must pass before you commit."

(Also step 1.2, line 14: "Read the guardrails applicable to the code phase — the code-tagged guardrails you must run before completing.")

`agents/code-reviewer.md` step 2, last bullet (line 32):

> "- **No regressions / verification gates pass** — run every guardrail applicable to the code phase, exactly as each command is written, recording each command and its result in the Checks table. Each is mandatory; do not bypass any (no `--no-verify`, no `skip`, no commented-out checks)."

(Also step 1.5, line 19, reads code-phase guardrails; and the Guidelines "Run the guardrails" bullet, lines 97-101, restates "run every guardrail applicable to the code phase.")

**(d) Docs-phase consumption (what "untouched" must preserve)**

Two agents consume docs-phase guardrails — the intent only named the two code agents, so these are additional touchpoints to keep frozen:

- `agents/doc-writer.md` step 4 "Run the docs-phase guardrails" (lines 38-47): "Run **every** docs-phase guardrail... Every applicable guardrail must pass before you commit." Same three-outcome model (empty / cannot-execute-blocker / non-zero-is-work) as the writer.
- `agents/doc-reviewer.md` step 2 (line 33) + Guidelines (lines 98-99): "run every guardrail applicable to the docs phase exactly as its command is written, and record each in the Checks table. Many projects tag none; in that case, the accuracy spot-check in step 3 is the sole gate."

Preserving "docs untouched" means: the docs phase keeps the flat "every docs guardrail is mandatory for both doc agents" model, with no level dimension. Open spec question: is a level marker on a `docs` guardrail invalid/ignored, or simply meaningless?

**Full touchpoint inventory (grep "guardrail", excluding `.pipelines/` artifacts):**

| File | Mentions | Role |
| --- | --- | --- |
| `agents/code-writer.md` | 11 | **Changes** — writer-scoped selection (steps 1.2, 5) |
| `agents/code-reviewer.md` | 9 | **Changes** — reviewer-scoped selection + fail-fast (steps 1.5, 2, Guidelines) |
| `reference/conventions/setup.md` | 6 | **Changes** — capture asks level per gate |
| `reference/conventions/load.md` | 6 | **Changes** — definition + selection rule |
| `agents/doc-writer.md` | 9 | **Freeze** — docs phase, must stay unchanged |
| `agents/doc-reviewer.md` | 3 | **Freeze** — docs phase, must stay unchanged |
| `README.md` | 2 | Likely-update — describes the convention (lines 147, 159) |
| `CHANGELOG.md` | 1 | Historical #118 entry — leave; a new changeset covers #121 |

Open spec question surfaced: the `.rp.md` storage syntax for the level is undefined today, so the spec must specify how level is written per gate and what an unscoped gate looks like — "unscoped means both" needs a concrete representation, not just a rule.

**Reasoning:** Direct quotes from the four named files plus a repo-wide grep to inventory every consumer of the guardrails convention.

**Sources:** `reference/conventions/load.md`, `reference/conventions/setup.md`, `agents/code-writer.md`, `agents/code-reviewer.md`, `agents/doc-writer.md`, `agents/doc-reviewer.md`, `README.md`, `CHANGELOG.md`, `.rp.md`

### Q2: How does the code-review iteration loop work today, and what does "approving iteration" mean in it?

The intent's fail-fast rule says the reviewer may reject early on cheaper findings without running reviewer-scoped suites, but all reviewer gates must pass on the approving iteration. To make that testable: (a) how does the code phase's review loop work — batches, verdicts, rejection/re-review flow (per `autonomous-phases/4 - code.md` and `code-reviewer.md`)? (b) Does review happen once per pipeline or once per batch? If per batch, the goal's "expensive suites run once per pipeline" would actually mean "once per batch's approving iteration" — confirm. (c) What is the Checks table and what must appear in it per iteration — could a skipped reviewer-scoped gate be recorded as "not run" on a rejecting iteration today, or does the format assume every gate has a result? (d) What is the ordering of the reviewer's checks in step 2 — do guardrails run before or after the judgment-based checks, and is there any existing fail-fast/early-exit behavior in the reviewer?

**A:**

**(a) The loop — batches, verdicts, rejection/re-review flow**

From `reference/autonomous-phases/4 - code.md`. The phase opener (line 3):

> "Advances the pipeline from phase 3 (plan) to phase 4 by dispatching the code tasks to a fresh `code-writer` per task, then reviewing the full batch with a single `code-reviewer`. On rejection, only the tasks the reviewer flagged are re-dispatched; the cycle repeats until the reviewer approves."

Steps 2-6 (lines 31-37), the mechanics:

> "2. Determine the **initial batch**: every task in `code-plan.md`, in the order specified.
> 3. For each task in the batch, in order: [launch a fresh code-writer per task, sequentially, waiting for each to commit]
> 4. After every code-writer in the batch has committed, launch a fresh `code-reviewer` with the list of task IDs in the batch, the base ref to diff against ... and the rejection iteration number N (starting at 1, incremented per rejection ...). On rejection the reviewer writes `code-review-N-rejected.md`; on approval it writes `code-review-approved.md` ...
> 5. On **rejected**, build the next batch from the deduplicated list of task IDs the reviewer reported. Go to step 3, with N incremented for the next rejection iteration.
> 6. On **approved**, verify the phase 4 completion predicate ..."

So: one writer per task (sequential, shared working tree) → one reviewer over the whole batch → approve ends the phase; reject re-dispatches only the flagged task IDs and loops back with N+1. Verdict is binary (approved | rejected), one fresh reviewer instance per iteration.

**(b) Once per pipeline vs. once per batch — correction to the goal's wording**

Review is **once per (re-)dispatch iteration**, not once per pipeline. A fresh `code-reviewer` runs on the initial batch and again on every rejection's re-dispatched batch (`agents/code-reviewer.md` line 9: "A fresh `code-reviewer` is spawned **once per batch**, after every code-writer in the batch has committed").

So the goal's "expensive suites run once per pipeline — on the code-reviewer's approving iteration" is more precisely: the reviewer-scoped suites run on whichever review iteration ends in approval, plus on any earlier iteration where the reviewer chose to run them before finding a cheaper rejection reason. The fail-fast rule is what keeps the expensive suites from running on every rejecting iteration. Net effect when all goes well: the expensive suites execute exactly once — on the approving iteration. **Recommendation: state the guarantee as "reviewer-scoped guardrails run to completion on the approving iteration; on a rejecting iteration the reviewer may skip them," rather than the literal "once per pipeline,"** which only holds in the zero-expensive-rejection case.

There is **no pipeline-level "run once" dedup mechanism** — nothing caches that a suite ran on a prior iteration. Each reviewer instance is fresh and stateless, so "once per pipeline" cannot be enforced by memory; it emerges only from the fail-fast skip rule. The spec should not assume any cross-iteration state.

**(c) The Checks table — and whether a skipped gate can be "not run"**

The Checks table is defined in `agents/code-reviewer.md` step 4's review template (lines 60-64): a `## Checks` section with columns `| Check | Command | Result |`. Step 2's guardrail bullet requires "recording each command and its result in the Checks table." Today every code-phase guardrail is mandatory and must pass, so the format implicitly assumes every gate ran and has a pass/fail Result — there is **no defined "not run"/"skipped" Result value**, and "ran a subset and deliberately skipped the rest" is not a current state; under today's rules skipping any applicable gate is non-compliant.

This is a direct gap the spec must close: fail-fast introduces a legitimate "skipped on this rejecting iteration" outcome for reviewer-scoped gates. The spec should define how a deliberately-skipped reviewer-scoped gate is represented in the Checks table on a rejecting iteration, and must require that on the approving iteration every reviewer-scoped gate has an actual pass Result. Without that, "skipped" is indistinguishable from "forgot to run."

**(d) Ordering of step-2 checks; existing fail-fast?**

Step 2 (`agents/code-reviewer.md` lines 22-32) lists eight checks in this order: per-task acceptance coverage → spec acceptance coverage → design alignment → plan adherence → test quality → inline documentation → convention compliance → "No regressions / verification gates pass" (the guardrails, **last**). But the list is a checklist of what to verify, not an enforced sequential pipeline with early-exit — there is **no existing fail-fast or early-exit semantics anywhere in the reviewer**. The reviewer assesses all checks and writes one consolidated verdict listing every issue (Guidelines line 93 "Every issue is must-fix"; line 94 "Reject liberally").

Implication: the fail-fast behavior is **new** — it doesn't exist to extend. Since guardrails are already last in the listed order, the natural framing is "run the judgment checks first; only run reviewer-scoped guardrails if otherwise heading toward approval." The spec needs to make that ordering load-bearing and explicit, because today the ordering is just presentational.

**Reasoning:** Quotes from the phase runbook and reviewer agent file; checked for any existing skip/cache/early-exit semantics and found none.

**Sources:** `reference/autonomous-phases/4 - code.md`, `agents/code-reviewer.md`

### Q3: What should the level-based selection rule be per role — in particular, does the reviewer run writer-leveled gates?

Three level states are on the table: `writer`, `reviewer`, unscoped (= both). Writer running writer+unscoped and skipping reviewer-leveled gates is clearly the point. The open question is the reviewer's side: (a) does the reviewer run writer-leveled gates too (re-verification), or only reviewer+unscoped ones? Evidence wanted: does the code-reviewer today independently re-verify other writer claims, or trust them (e.g., behavior verification, test runs)? Is there a stated design philosophy of independent verification? (b) Is it sound for the reviewer to skip writer-leveled gates — i.e., is the reviewed state always exactly the last writer commit, which already passed all writer gates, or can the tree state at review time differ? (c) Any evidence in the repo (conventions, prior issues/PRs like #118) about the intended semantics of "which role runs them"?

**A:** **Recommendation: reviewer runs "reviewer-leveled + unscoped" and does NOT run writer-leveled gates.**

**(a) Does the reviewer re-verify or trust writer claims?**

The reviewer is built to independently re-verify, not trust. From `agents/code-reviewer.md`: line 6: "You are **adversarial by design**." Step 2's guardrail bullet: the reviewer itself re-runs every code-phase gate rather than accepting the writer's pass claims. Step 3 (line 36): re-does behavior verification independently — "exercise it end-to-end yourself ... A verification claim without evidence is not a verification — either produce the evidence or reject the batch." Guidelines (line 97): "**Run the guardrails.** Don't just read the code. A review without verification evidence is not a review."

So today the reviewer re-runs all code-phase gates. This "trust nothing" philosophy is the strongest argument *for* "reviewer runs everything" — addressed in the recommendation below.

**(b) Is the review-time tree always the last writer commit (so skipping writer gates is sound)?**

Yes. The reviewer always diffs `base-ref → current HEAD` (`reference/pipeline-versioning.md` "Reviewer base ref", lines 21-28) and runs after every code-writer in the batch has committed. The tree at review time is exactly the tip of the last writer commit. Writers commit sequentially on a shared tree, and each writer runs all writer-scoped gates on the combined tree before its commit — so the final tree (= review tip) has had every writer-scoped gate pass against it by the last writer. Skipping them at review time is sound for the regression-detection purpose.

Edge case to be aware of: a flaky/environment-sensitive writer-scoped gate's pass isn't double-checked at review. That's inherent to writer-leveling a gate — the owner's explicit per-gate choice; an owner who wants double-checking leaves the gate unscoped.

**(c) Intended semantics evidence**

- #118 (the guardrails convention #121 extends) PR body confirms the current model is uniform: "The code- and doc-phase agents read the guardrails applicable to their phase by name and run every one as mandatory" — phase is the only dimension.
- #121's issue body (identical to intent.md) is the only statement of intended role semantics. Its goal contrasts "writers run cheap gates on every commit" with "expensive suites run once" — positioning writer-leveled and reviewer-leveled as a **partition of responsibility**, not nested scopes.

**Why reviewer + unscoped only (not all code gates):**

1. **The intent's own arithmetic requires it.** If the reviewer also ran writer-leveled gates, the cheap gates would run on every writer commit AND every review iteration — exactly the per-review-iteration cost the issue's Context calls out as the thing to eliminate.
2. **It makes the three level states a clean partition.** `writer` = run per writer commit, not at review. `reviewer` = run at review, not per commit. Unscoped = both. If the reviewer ran writer-leveled gates anyway, `writer` and unscoped would be identical from the reviewer's perspective, collapsing three states into two.
3. **Soundness is covered by (b)** — the reviewed tree already had all writer-scoped gates pass against it. The adversarial philosophy is preserved where it matters: the reviewer still independently runs reviewer + unscoped gates and re-does behavior verification.
4. **Symmetry with the writer side**: writer runs writer + unscoped; reviewer runs reviewer + unscoped; unscoped is the shared mandatory floor.

**Open question flagged:** does reviewer fail-fast permit skipping only `reviewer`-leveled gates on a rejecting iteration, or any not-yet-run gate of its selection (reviewer + unscoped)? The intent's "expensive suites" language points at reviewer-leveled specifically, but the cleaner rule is "on a rejecting iteration the reviewer may skip any not-yet-run gate of its selection; on the approving iteration the full selection must pass." Researcher leans toward the latter.

**Reasoning:** Quotes from agent files and pipeline-versioning convention; #118/#121 bodies via `gh`.

**Sources:** `agents/code-reviewer.md`, `agents/code-writer.md`, `reference/pipeline-versioning.md`, `reference/autonomous-phases/4 - code.md`, GitHub #118 PR body, #121 issue body

**Analyst decisions (from A3):**

1. **Selection rule adopted:** writer selection = {code-phase gates leveled `writer` or unscoped}; reviewer selection = {code-phase gates leveled `reviewer` or unscoped}. Neither role runs the other role's leveled gates.
2. **Fail-fast scope adopted (uniform rule):** on a rejecting iteration the reviewer may skip any not-yet-run gate of its selection once it has a rejection finding; on the approving iteration every gate in its selection must have run and passed. Rationale: the guarantee that matters ("nothing is approved without all reviewer-selection gates passing") is identical either way; a uniform rule avoids special-casing levels within the reviewer's selection; skipped cheap gates get covered on the next iteration or at approval anyway. Expensive suites are expected to be reviewer-leveled, so the intent's "reject early without running the reviewer-scoped suites" is satisfied as a consequence.

### Q4: How does setup capture gates today, and what happens with invalid or cross-phase declarations?

To spec "setup asks the level per gate" and the level's interaction with phase targets: (a) How does `setup.md`'s gate capture work — interactive Q&A with the owner, inference from the repo, or both? What's the observable outcome of capture (where do the fields land)? (b) Is there validation of declared gates at setup or load time — e.g., what happens today with an invalid phase target, and is there a defined error/blocker path a malformed level value could follow? (c) How would a gate spanning both phases (`code` + `docs`) interact with a level — given docs selection must stay purely phase-based, is "level applies only to code-phase selection; docs selection ignores it" coherent with how cross-phase gates are declared today? (d) Does setup need a default/recommendation when the owner doesn't state a level (absent = both is the constraint), and is there any existing "default when unstated" pattern in setup.md to mirror?

**A:**

**(a) How gate capture works; observable outcome**

Capture is **interactive owner Q&A, not repo inference**. `setup.md` step 2 (lines 27-30): "Ask for the required information in a clear sequence, one convention at a time." The Guardrails capture step (lines 171-204): "Ask the owner which of these the project runs and which ones a change must pass before it is considered complete" (line 177). The captured fields per gate (lines 179-183): name, exact literal command, applicable phase(s). The fields land in the committed `.rp.md` Guardrails section (step 5, lines 222-228: "Write `.rp.md` with the conventions and commit it to the main branch"); `load.md` reads it back each run. The level will need to (i) be asked in this same Q&A and (ii) land as a new per-gate field in `.rp.md`. No prescribed `.rp.md` table syntax exists today, so the spec defines how the level is represented.

**(b) Validation — and what happens with an invalid phase or malformed level**

Setup validates exactly one thing: **did the command execute?** (`setup.md` lines 187-204; line 192: "Never silently persist a known-unrunnable gate"). There is **no defined validation or error path for an invalid phase target**: both files state "The only valid phase targets are `code` and `docs`" but no step handles an invalid value. At load time an unrecognized phase simply never matches the selection rule, so the gate silently never runs — implicit, not defined.

Implication: a malformed `level` has no precedent handler. Choice: (i) mirror the implicit behavior — a malformed level matches neither role filter, gate selected for no code-phase role; or (ii) introduce an explicit validation/blocker. Researcher recommends (i): no new error path, consistent with phase and with the project's minimalist convention. Flagged as a decision.

**(c) Cross-phase gate (`code` + `docs`) interacting with a level**

A gate can already span both phases; selection is per-phase and independent. "Level applies only to code-phase selection; docs selection ignores it" is coherent — phase and level are orthogonal filters applied in sequence:

- Docs phase selects by phase only, exactly as today — level never consulted. A both-phase gate with a level still runs for both doc agents.
- Code phase selects by phase, then by role-level (writer: level ∈ {writer, unscoped}; reviewer: level ∈ {reviewer, unscoped}).

A both-phase gate marked `writer` runs for the code-writer and both doc agents, not the code-reviewer — well-defined. Rule to state: "level filters the code-phase selection only; the docs-phase selection is purely phase-based and never consults level." Level is inert within docs — it never removes a gate from docs selection.

**(d) Default-when-unstated**

No "default when unstated" pattern exists for guardrail fields (phase is asked, not defaulted). Closest patterns: "Suggested default:" interactive nudges (setup.md lines 44-157) and the `Agent models` `**Default:**` in-file fallback (line 92). The cleanest mirror is `load.md`'s own idiom for guardrails — "An absent or empty Guardrails declaration means no command gates — a valid, complete state" — i.e., *absence has a defined, non-error meaning*.

Recommendation: define "a gate with no level means unscoped (both roles)" as a load/definition rule in `load.md`; on the setup side make level an optional question with unscoped as the stated default. This makes backward compatibility free: existing `.rp.md` files have no level field, which resolves to unscoped (today's behavior) by the load rule — no migration, and the guarantee lives in `load.md`, not setup.

**Reasoning:** Quotes from setup.md and load.md; checked for any existing invalid-value handler and default-when-unstated patterns.

**Sources:** `reference/conventions/setup.md`, `reference/conventions/load.md`, `.rp.md`

**Analyst decisions (from A4):**

3. **Level representation:** a new optional per-gate field named `level` with valid values `writer` and `reviewer`; absent means unscoped (both roles). The exact `.rp.md` syntax stays open for the design phase (no syntax is prescribed for the existing fields either); the spec fixes the field, its vocabulary, and its absent-means-both semantics.
4. **No new error path for malformed level values:** the spec defines the valid values and the role-filtered selection; an out-of-vocabulary level matches neither role filter, mirroring how an out-of-vocabulary phase already behaves.
5. **Orthogonal filters:** level filters the code-phase selection only; the docs-phase selection is purely phase-based and never consults level — true also for cross-phase gates.
6. **Backward compatibility lives in `load.md`:** "absent level = unscoped = both roles" is a definition rule, so existing level-less `.rp.md` files keep today's behavior with no migration. Setup asks the level per code-applicable gate as an optional question with unscoped as the default.

### Q5: Does anything downstream consume the review verdict files or depend on the "every gate ran" invariant?

Fail-fast adds a legitimate "skipped" state to the reviewer's Checks table on rejecting iterations. Final sweep: (a) Does anything parse or programmatically consume `code-review-N-rejected.md` / `code-review-approved.md` (orchestrator steps, completion predicates, later phases like docs reading the review)? Could a "skipped" Result value or absent gate row break a consumer? (b) Do any other parts of the system (health monitoring, workflow conventions, phase runbooks) restate or depend on "the reviewer runs every code-phase guardrail"? (c) Is the README's guardrails prose specific enough that the level dimension would make it inaccurate (i.e., does updating it belong in scope)?

**A:** **Nothing programmatically parses the review files' contents**, so a "skipped" Result or an absent gate row breaks no consumer. The README guardrails prose is an optional touch deferred to the doc plan.

**(a) Consumers of `code-review-*.md`**

The only consumer is the **per-phase completion predicate**, which checks existence + committed, never content (`reference/pipeline-versioning.md` "Per-phase completion", lines 36-49: "A phase is complete when all of these are committed to the pipeline branch ... | 4 – Code | `4-code/code-review-approved.md` |"). The verdict is communicated out-of-band — the reviewer messages the orchestrator with approve/reject + task IDs (`code-reviewer.md` step 5, lines 83-86), and the orchestrator branches on that message, not by parsing the file. The filename (`-approved` vs `-N-rejected`) encodes the verdict; the body is human-inspectable only. Lineage derivation compares byte-identical folder tree SHAs — no special interaction with a "skipped" value. The docs phase does not read the code review; later phases don't read it.

The "every gate must pass on approval" invariant lives entirely inside `code-reviewer.md`'s own rules, consumed by no other file. Adjacent note: assisted mode produces no code-reviewer Checks table (the owner approves), so fail-fast / level scoping has no assisted-mode surface — out of scope.

**(b) Other restatements of "reviewer runs every code-phase guardrail"**

None beyond A1's inventory. Grepped `skills/`, `agents/`, `README.md`: the obligation lives only in the four agent files + `load.md`. `4 - code.md` orchestrates the loop but delegates all guardrail behavior to the agent files; health monitoring watches for stalls and message/login/network failures, not guardrail results. No hidden touchpoint.

**(c) README prose**

Line 147: "...an optional `Guardrails` convention declaring the deterministic verification gates (exact commands judged pass/fail by exit code) the code/doc phases must pass; see the [convention loader] and [setup conventions] for how to author them."
Line 159: lists "guardrails" as a shared-section item.

Line 159 stays accurate. Line 147 isn't false but under-describes the feature; the README's altitude already omits the existing phase-granularity detail, so omitting role-granularity is consistent, and it delegates authoring to `load.md`/`setup.md`, which the change does update. **Recommendation: name the README as a candidate touchpoint; defer the keep/edit call to the doc plan rather than mandate an edit.**

**Reasoning:** Grep across skills/, agents/, README; quotes from pipeline-versioning.md, code-reviewer.md, README.md.

**Sources:** `reference/pipeline-versioning.md`, `reference/autonomous-phases/4 - code.md`, `agents/code-reviewer.md`, `reference/assisted-workflow.md`, `README.md`

**Analyst decisions (from A5):**

7. **Skipped-gate visibility is a requirement:** on a rejecting iteration, a deliberately skipped gate is recorded as skipped in the Checks table — distinguishable from a gate that was forgotten. Safe to add: no parser, predicate, later phase, or lineage check depends on Checks table contents.
8. **README edit is not a spec requirement:** named as a candidate touchpoint, deferred to the docs phase. Assisted mode is out of scope (no reviewer Checks table exists there).

## Consolidated Requirements

1. **Level dimension.** A guardrail declaration may carry an optional **level** with exactly two valid values, `writer` and `reviewer`. A guardrail without a level applies to both roles. The level is part of the committed guardrail declaration (guardrails remain committed-only, never taken from `.rp.local.md`).
2. **Code-phase selection is role-filtered.** Within the code phase, the `code-writer` selects the code-phase guardrails leveled `writer` or unleveled; the `code-reviewer` selects the code-phase guardrails leveled `reviewer` or unleveled. Neither role runs the other role's leveled gates. An empty role selection means run none and proceed (existing rule).
3. **Docs-phase selection never consults level.** The docs-phase selection remains purely phase-based; `doc-writer` and `doc-reviewer` behavior is unchanged, including for gates that span both phases (a both-phase gate with a level still runs for both doc agents).
4. **Writer behavior unchanged in form.** The `code-writer` runs every gate in its role selection, exactly as each command is written, and all must pass before each commit — same obligations as today, over the narrowed selection.
5. **Reviewer fail-fast.** On a review iteration where the reviewer has already found at least one rejection finding, it may reject without running any not-yet-run gate of its role selection. Each deliberately skipped gate is recorded as skipped in the Checks table, distinguishable from a gate that was never considered.
6. **Approving iteration guarantee.** The reviewer approves only when every gate in its role selection has run and passed in that same iteration — no skips on approval. (Net effect: expensive reviewer-leveled suites execute once on the approving iteration when all goes well; the guarantee is per-iteration, with no cross-iteration caching or memory.)
7. **Setup captures the level.** During guardrail capture, setup asks the level for each code-applicable gate as an optional field alongside name, command, and phase(s); leaving it unset means both roles. The captured level lands in the committed `.rp.md` guardrail declaration. (Exact `.rp.md` syntax is a design-phase decision, as with the existing fields.)
8. **Backward compatibility by definition.** "Absent level = both roles" is a definition/load rule, so every existing `.rp.md` (level-less gates, or no Guardrails section) keeps today's behavior with no migration.
9. **No new validation path.** Level values outside the vocabulary follow the same implicit behavior as unrecognized phase targets: they match no role filter. No explicit error or blocker is introduced for malformed levels.

**Out of scope:**

- Any change to docs-phase guardrail semantics or the two doc agents.
- Cross-iteration state ("this suite already ran on iteration N-1") — each reviewer instance remains fresh and stateless.
- Assisted mode (no reviewer Checks table exists there).
- README prose update — candidate touchpoint deferred to the docs phase.
- Migration or rewriting of existing `.rp.md` files.
- The "Plan-driven test selection" work (#122) — independent, but must not be worked on in parallel since both edit the writer/reviewer agent files.

**Expected touchpoints (complete set of required edits):** `reference/conventions/load.md` (definition + role-filtered selection rule), `reference/conventions/setup.md` (capture asks the level), `agents/code-writer.md` (role selection), `agents/code-reviewer.md` (role selection + fail-fast + skipped-gate recording).

