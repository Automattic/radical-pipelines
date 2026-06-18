# Spec Research

## Rough Idea

> Source: GitHub issue Automattic/radical-pipelines#150 — https://github.com/Automattic/radical-pipelines/issues/150 (mirrored in Linear as BILLOW-87).
> This file is self-contained; agents do not need to open the source issue.

### Goal

Guardrails are prose. Every guardrail is expressed as prose, and the exit-code (`exit 0`) machinery is removed.

### Context

Passing prose rules to the agents is sometimes more useful than runnable commands. A concrete example from the Radical Pipelines project itself: adding guardrails for the code reviewer and the docs reviewer with specific rules similar to those in `agents.md`.

### Assumptions / directions to explore

- When a guardrail *is* a command, express it as prose too — e.g. *"run this command and check that it doesn't fail: [command]"*.

## Q&A

### Q1: What does "guardrail" become once it is prose, and does the binary pass/fail enforcement survive?

Today the skill defines a guardrail as a *deterministic verification gate judged pass/fail by exit code*. The whole enforcement model rests on that: writers must make "every gate pass" before committing, and reviewers approve only when "every gate runs and passes," recording pass/fail/skipped in a Checks table. The intent says every guardrail becomes prose and the `exit 0` machinery is removed, and gives a command example as prose — *"run this command and check that it doesn't fail: [command]"*.

I need to understand what a guardrail fundamentally **is** after this change, to know whether requirements describe (a) the same gate model where the command is merely *worded* as prose but still mechanically run and judged by exit code, (b) a looser model where a guardrail is any prose rule the agent must satisfy by judgment (e.g. "the reviewer must check X"), with no mechanical pass/fail, or (c) both kinds coexisting.

Concretely, investigate against the current codebase:

1. Where does the skill/agents define guardrails as command + exit code, and which behaviors depend on a *mechanical* pass/fail signal (writers gating commits, reviewers' Checks table, the "gate exits non-zero ⇒ rejection" rule)? Enumerate the load-bearing spots.
2. The intent's motivating example is "guardrails for the code reviewer and the docs reviewer with specific rules similar to those in `agents.md`." What kind of rules live in `AGENTS.md` (the project's own)? Are they runnable commands or prose judgment rules? This tells us whether the owner wants guardrails to carry *non-command* prose rules, which (b)/(c) would allow but (a) would not.
3. Does the issue thread (#150 on GitHub, or the Linear mirror BILLOW-87) contain any further discussion clarifying whether prose guardrails keep a hard pass/fail gate or become judgment-based? Use `gh` for GitHub.

Give me the evidence; I'll decide the requirement.

**A:** The change is **(c) — both kinds coexist, unified under one prose representation**, and the hard accept/reject outcome survives; what is removed is the *exit-code framing/notation*, not the binary gate.

- **Tooling correction (important):** the ground truth is the **worktree HEAD** (`worktree-150-make-guardrails-prose`), not `trunk`. The worktree already carries the latest guardrail generation: a dedicated `skills/radical-pipelines/reference/guardrails.md`, `reference/conventions/passing.md`, fixed-vs-scoped gates with a `{scope}` placeholder, and split writers `agents/code-writer-tdd.md` / `agents/code-writer-e2e.md`. The older model (`plan-completed-for`, unsplit `code-writer.md`, no `{scope}`) is the `trunk` copy and is NOT what pipeline 150 edits.
- **Command guardrails are re-expressed, not removed.** The intent's own example keeps the mechanical check but words it as prose: *"run this command and check that it doesn't fail: [command]."* The command still runs and its non-failure still matters; only the `exit 0` vocabulary/framing is stripped.
- **A genuinely new non-command kind is added.** The motivating example — "rules similar to those in `agents.md`" for the code reviewer and docs reviewer — points at pure prose judgment rules. The project's own root `AGENTS.md` contains zero runnable commands; it is all prose rules like "The skill must be written in a minimalist way…", "must not contain negative phrases…", "is prose, not software. Do not write structural tests…". These are satisfied by a reviewer's **judgment**, not an exit code.
- **The binary outcome survives.** A reviewer still approves/rejects (`code-reviewer.md:109` already makes every issue must-fix on judgment, independent of any command). The intent removes the *exit-code machinery* (the `guardrails.md:3` "judged pass/fail by exit code" definition, setup's "it executed, not exit 0" validation vocabulary, the reviewers' "exits non-zero ⇒ rejection" wording), not the gate itself.

**Reasoning:** The issue text both (i) keeps the command case as a run-and-don't-fail check expressed in prose and (ii) introduces a non-command judgment rule via the `agents.md` example, so neither pure-(a) nor pure-(b) fits — it is (c). The thing explicitly named for removal is the "exit-code (`exit 0`) machinery," i.e. the framing of a guardrail as *necessarily* a command judged by exit code, not the binary accept/reject result of a review.

**Load-bearing spots (worktree files):**
- *Definition / command-shaped core:* `reference/guardrails.md:3,5-11,12-24,26-32`; `reference/conventions/load.md:22`; `reference/conventions/setup.md:171-190`; `reference/conventions/passing.md:10,13-17`; `reference/autonomous-workflow.md:66` (spawn-time Guardrails block: "one per line as a name and its exact command").
- *Behaviors depending on a mechanical pass/fail signal:* (a) **writer commit-gating** — `code-writer-tdd.md:36-49`, `code-writer-e2e.md` mirror, `doc-writer.md:38-52` ("every gate must pass before you commit"; trichotomy: no convention ⇒ proceed / cannot execute ⇒ **blocker** / runs non-zero ⇒ fix); (b) **reviewer Checks table** — `code-reviewer.md:37-45,69-79`, `doc-reviewer.md:39-47,71-79` (columns Check | Command | Result ∈ {pass|fail|skipped}); (c) **"non-zero ⇒ rejection"** — same reviewer sections; (d) **"cannot execute ⇒ blocker"** branch — writers above + reviewer Guidelines `code-reviewer.md:113-114`, `doc-reviewer.md:114`.
- *Command-only pieces (no obvious meaning for a non-command rule):* setup's "did it execute?" validation (`setup.md:179,183-184,190`) and the scoped `{scope}` fill lifecycle (`guardrails.md:26-32`, `passing.md:13-17`, the plan agents, `assisted-phases/3 - plan.md`).

**Sources:** worktree files `skills/radical-pipelines/reference/guardrails.md:3,5-32`, `reference/conventions/{load.md:22,setup.md:171-190,passing.md:10,13-17}`, `reference/autonomous-workflow.md:66`, `agents/code-writer-tdd.md:36-49`, `agents/code-writer-e2e.md`, `agents/doc-writer.md:38-52`, `agents/code-reviewer.md:37-45,69-79,109,113-114`, `agents/doc-reviewer.md:39-47,71-79,114`, root `AGENTS.md`; GitHub #150 body (0 comments); Linear BILLOW-87 (0 comments, URL-only); GitHub #121 body.

### Q2: Does the fixed/scoped distinction, the `{scope}` fill lifecycle, and setup-time command validation survive — and if so, do they apply to all guardrails or only command ones?

Q1 settled that guardrails become prose, two kinds coexist (command-as-prose and non-command judgment rules), and the binary accept/reject survives. The deepest design seam is that several pieces of today's machinery are *intrinsically command-shaped* and have no obvious meaning for a non-command judgment rule:

- **fixed vs scoped gate kinds** and the `{scope}` placeholder (`guardrails.md:5-11`),
- the **`{scope}` fill lifecycle** — plan agents choosing a scope value, the `## Guardrail scopes` plan section, the plan reviewers executing the filled command (`guardrails.md:26-32`, `passing.md:13-17`, `assisted-phases/3 - plan.md`),
- **setup-time command validation** — "did the command execute?" (`setup.md:179,183-190`).

I need to decide how far the prose change reaches into this machinery. Investigate and report evidence — do NOT decide:

1. Is `{scope}` substitution a *command*-level mechanism (literal string interpolation into a shell command) that is meaningless for a prose rule with no command — OR could a prose rule also carry a per-pipeline scope (e.g. "review that the *new endpoint code* follows the API convention", where the scope is which code)? In other words, is the fixed/scoped distinction inherently tied to commands, or is it orthogonal to the command/judgment split?
2. Does the intent ("remove the exit-code machinery") give any signal about whether the *whole* scoped/fill apparatus is in scope to be removed/simplified, or only the exit-code judgment? Re-read the intent's exact words. The intent names `exit 0` specifically — does it name fixed/scoped or `{scope}` at all?
3. For setup validation: today's "did it execute?" check is explicitly command-only. For a non-command prose rule there is nothing to execute. What does setup do for a prose rule — is there any analogous validation (e.g. "is this rule clear/checkable?"), or does validation simply not apply? Is there prior art in the skill for capturing a convention that is prose and unvalidatable?
4. Crucially: is there a real risk that trying to keep BOTH the command machinery (fixed/scoped, `{scope}`, fill lifecycle, command validation) AND add non-command prose rules makes the model MORE complex, contradicting the project's minimalism rule (`AGENTS.md`/`CLAUDE.md`: "minimum amount of information possible")? Or does the command machinery sit cleanly *inside* the prose representation (a command guardrail is just a prose rule whose text happens to say "run X and check it doesn't fail", optionally with a `{scope}`)? Assess which framing the current files support with least churn.

Report what the code shows and the trade-offs; I'll decide the requirement.

**A:** `{scope}` is intrinsically **command-bound** in every consuming site; the intent names only `exit 0`, never fixed/scoped/`{scope}`; the skill already has prior art for prose-and-unvalidated conventions (Commit format); and the core requirement call is a **narrow vs broad** scope fork.

1. **`{scope}` is command-level, not orthogonal as built.** It is literal string interpolation into a *command template*, then execute the *filled command* and check the *runner* resolved/terminated — at every site: definition (`guardrails.md:7-11,19` "a command containing a `{scope}` placeholder"), fill (`code-plan-writer.md:82`, `doc-plan-writer.md:68` record a value, not a command), resolve (`passing.md:10` "substitute … place the resolved command"), validate (`code-plan-reviewer.md:19`, `doc-plan-reviewer.md:20`, `assisted-phases/3 - plan.md:118,211` "substitute … into the gate's command template and execute the filled command … did the command's runner resolve and terminate?"). A judgment rule has no template, no filled command, no runner. A prose rule *could* in the abstract carry a per-pipeline scope ("which code to judge"), but the skill never models `{scope}` that way — it is spliced into a shell command and executed. So fixed/scoped is inherently tied to commands.

2. **The intent names only `exit 0`.** "fixed," "scoped," "`{scope}`," "fill," "Guardrail scopes" appear nowhere in the intent (`0-intent/intent.md:6-16`). The assumption line *keeps* the command ("when a guardrail *is* a command … [command]") — it re-words the pass check, it doesn't delete the command concept. Literal reading: the scoped/fill apparatus is not named in scope; whether removing the exit-code framing *forces* changes to it is a derived question.

3. **Prior art for a prose, unvalidated convention: Commit format.** `setup.md:54-60` captures it ("Ask the owner for the format and capture at least one concrete example"), writes it to `.rp.md`, passes it verbatim — never validates or executes it. Same for Artifact folder, Issues, Worktrees, Branch names. The general capture instruction (`setup.md:28-30`) has no validation step; execution-validation is a special add-on that **only Guardrails** carries, precisely because gates were commands. So the established pattern for a prose guardrail is: capture (optionally with an example), write verbatim, do not validate.

4. **Minimalism / entanglement.** The command-as-prose guardrail nests cleanly (a fixed gate collapses to one prose sentence; the binary outcome already survives on judgment per `code-reviewer.md:109`). But the fixed/scoped + `{scope}` + `## Guardrail scopes` plan section + plan-reviewer execution + setup execution-validation is a substantial multi-file apparatus justified *only* by "a guardrail is a command you execute." `{scope}` *substitution itself* (which command runs) is independent of the exit-code judgment and could survive untouched; but the scoped lifecycle's *validation* (setup "did the command execute?" `setup.md:179`; plan review "did the command's runner resolve and terminate?" `code-plan-reviewer.md:19`) is the same execute-and-check-it-ran family as the `exit 0` machinery — entangled.

**The decision fork (researcher-framed, I will decide / escalate):**
- **Narrow** — guardrails become prose, exit-code wording stripped; a command guardrail keeps fixed/scoped + `{scope}` + fill lifecycle + setup/plan execution-validation unchanged (they simply don't apply to non-command rules). Lowest churn; but the model keeps two conceptions, arguably against "state the general rule once."
- **Broad** — guardrails uniformly prose; command guardrails are just prose sentences ("run X, check it doesn't fail," optionally scoped in prose); the structured fixed/scoped/`{scope}`/fill/validation apparatus collapses into that prose. Best minimalism alignment; but removes real capability (per-pipeline command scoping for expensive suites — the #121/#122 lineage that *built* this) and touches the most files.

The intent's literal words (only `exit 0`) lean **narrow**; the minimalism + "prose, not software" ethos lean **broad**. This is the core requirement call.

### Q3: Is there a coherent middle, and does the setup execution-validation directly contradict "guardrails are prose"?

Before I take the narrow/broad fork to the owner, I want to sharpen it and check whether a clean middle removes the dilemma. Investigate and report:

1. **Does setup-time execution-validation directly contradict "guardrails are prose"?** Setup today says "Validate a fixed gate by running its literal command … did the command execute?" (`setup.md:179,183-190`). If guardrails are authored as prose ("run X and check it doesn't fail"), can the owner still meaningfully run the embedded command at capture time, or does "guardrails are prose" make the embedded command no longer a first-class, machine-extractable field to validate? I.e. is the validation step *compatible* with prose authoring (owner reads the prose, runs the command it mentions) or *incompatible* (the skill can no longer point at a `command:` field)? This determines whether validation must be dropped or merely reworded.

2. **Does the `{scope}` capability survive as prose without the exit-code/execution framing?** Concretely: could a scoped command guardrail be authored as prose like "run the test suite for {scope} and check it doesn't fail," with the plan still choosing the `{scope}` value in `## Guardrail scopes`, and the writer/reviewer running the resolved command — all WITHOUT any "exit 0 / pass-by-exit-code" wording? Is the `{scope}` placeholder genuinely separable from the exit-code framing, such that "remove the exit-code machinery" can be satisfied while `{scope}` stays? Look at whether anything in the fill lifecycle references exit codes specifically vs. just "the command ran."

3. **Does the owner's actual example need scoping at all?** The motivating use case is reviewer prose rules like those in `AGENTS.md` (minimalism, no-negatives, prose-not-software). Are those rules per-pipeline scoped, or fixed/global (apply to every pipeline identically)? If the new non-command guardrails the owner wants are inherently fixed/global, then the `{scope}` machinery is irrelevant to the owner's stated need — it only matters for the *command* guardrails that already exist. This tells me whether removing/keeping `{scope}` even affects the owner's goal.

4. **Heritage check:** confirm via git/issues whether the fixed/scoped + `{scope}` apparatus was a deliberate, recently-shipped capability (the #121/#122 lineage) that real projects depend on, vs. speculative/unused. If it shipped and is used, removing it is a regression the owner must explicitly accept; if it's unused/speculative, the project's own "describe the system only as designed, not speculative" rule might favor dropping it. Use `gh` and `git log`.

Report evidence; I'll then either decide or escalate a sharpened choice to the owner.

**A:** A coherent middle exists and the fork dissolves. (1) Validation is compatible with prose for command guardrails (reworded, not contradicted), or droppable to match prior art. (2) `{scope}` is **cleanly separable** from the exit-code framing — the fill lifecycle has *zero* exit-code references. (3) The owner's actual need is **fixed/global**, needs no scoping. (4) `{scope}` is a deliberate, days-old capability (#122 / PR #127) with **no in-repo consumer**, and is orthogonal to the exit-code removal the intent asks for. So: remove the exit-code framing (the only thing the intent names), express command guardrails as prose, add fixed non-command judgment rules, and leave `{scope}` intact.

1. **Validation does not contradict prose; it depends on a `command:` field.** Today validation reads the structured `command:` line (`guardrails.md:12-24`) and runs it — "did the command execute?" (`setup.md:179`), already any-exit-code (`setup.md:183`), so not exit-code-based to begin with. For a command guardrail authored as prose ("run `npm test` and check it doesn't fail"), the command is still lexically present, so validation stays — reworded from "extract the `command:` field and run it" to "run the command the guardrail's prose names." For a non-command judgment rule there is nothing to run, so validation simply doesn't apply (matching the commit-format prior art: capture verbatim, never validate). What "guardrails are prose" removes is reliance on a structured `command:` field as the thing the skill points at — not the validation concept itself.

2. **`{scope}` is independent of exit codes.** Grep for "exit" across the whole guardrail subsystem returns exactly one hit outside the writer/reviewer steps: the definition line `guardrails.md:3` ("judged pass/fail by exit code"). The entire fill lifecycle is exit-code-free: `guardrails.md:26-32` (chooses/records the scope value), `passing.md:10,13-17` (substitute, place resolved command), `code-plan-writer.md:82` / `doc-plan-writer.md:68` (choose value, record), and the plan-reviewer validation `code-plan-reviewer.md:19` / `doc-plan-reviewer.md:20` / `assisted-phases/3 - plan.md:118,211` which explicitly asks "did the command's runner resolve and terminate?" and states it is NOT a pass/exit check ("a runner that runs but reports zero or missing tests … is NOT a rejection"). So "run the test suite for {scope} and check it doesn't fail" works with no exit-code wording. `{scope}` is bound to *commands* (Q2) but not to *exit codes* — only the latter coupling is what the intent targets. Removing `exit 0` from `guardrails.md:3` leaves the fill lifecycle untouched and coherent.

3. **The owner's example needs no scoping.** The `AGENTS.md`-style reviewer rules (minimalism, no-negatives, prose-not-software) are fixed, global properties of the project — identical for every pipeline, no "which code" parameter to fill. So `{scope}` is irrelevant to the owner's stated new need; it only ever mattered for *command* guardrails narrowing an expensive suite to a feature.

4. **Heritage: deliberate, recent, but unexercised in-repo.** Fixed/scoped + `{scope}` is the direct output of the #122 lineage, landed via PR #127 (commits `8ae67f0,b210029,05eea39,51b6257,b7e7c29`), explicitly chosen by the owner to replace the earlier "hard to understand" `plan-completed-for` model with self-contained scoped guardrails — not a migration leftover. BUT the repo's only `.rp.md` (root) declares **no Guardrails section at all** (its sections end at Health monitoring) — nothing in-repo uses any gate, scoped or fixed. So dropping `{scope}` would discard a deliberately-designed, days-old capability; the project's "don't describe speculative/future" rule does *not* favor dropping it (it is designed and shipped, not speculative). Conclusion: removing it would be a real regression the owner must consciously accept, and since it is orthogonal to the exit-code removal the intent asks for, the faithful minimal reading is to **keep** it. The only countervailing pull is pure minimalism (two conceptions coexisting), which does not outweigh discarding a just-shipped, intent-orthogonal capability.

**Resolution of the narrow/broad fork:** take the **narrow** reading, which research shows is also internally coherent and low-churn: remove the exit-code framing wherever it appears (the `guardrails.md:3` definition; writers' commit-gating exit-code wording; reviewers' "exits non-zero ⇒ rejection" and the Checks table's exit-code semantics; setup's "it executed, not exit 0" vocabulary), express every guardrail — command and non-command — as prose, support fixed non-command judgment rules, and preserve the fixed/scoped `{scope}` fill lifecycle for command guardrails (it is exit-code-free already). This is faithful to the intent's literal words, serves the owner's stated example, and does not regress a just-shipped capability. No blocker required.

**Sources (worktree files unless noted):** `guardrails.md:3,12-24,26-32`; `passing.md:10,13-17`; `setup.md:179,183`; `code-plan-writer.md:82`; `doc-plan-writer.md:68`; `code-plan-reviewer.md:19`; `doc-plan-reviewer.md:20`; `assisted-phases/3 - plan.md:118,211`; repo-root `.rp.md` (no Guardrails section); root `AGENTS.md`; `.pipelines/122-plan-driven-test-selection-v2/review-2-scoped-guardrails/0-intent/intent.md`; git commits `8ae67f0,b210029,05eea39,51b6257,b7e7c29` via PR #127; GitHub #122 body; grep "exit" across fill lifecycle → only `guardrails.md:3`.

### Q4: Who checks a non-command judgment guardrail, and how is each guardrail's outcome recorded?

With the narrow reading fixed, I need the observable behavior of the new non-command (judgment) guardrails, and how the existing artifacts change shape. Investigate and report — do NOT decide:

1. **Reviewer Checks table.** Today: columns Check | Command | Result ∈ {pass|fail|skipped} (`code-reviewer.md:69-79`, `doc-reviewer.md:71-79`). A non-command judgment rule has no command to put in the Command column. What is the minimal change so the table records BOTH kinds — does the Command column become optional/blank for judgment rules, get renamed, or get dropped? Does the reviewer still record a per-guardrail pass/fail outcome for a judgment rule (by its own assessment), and does a failed judgment rule cause rejection the same way a failing command does? Show exactly which lines presuppose a command per row.

2. **Writers and non-command guardrails.** Today writers "run every gate … exactly as its command is written … every gate must pass before you commit" (`code-writer-tdd.md:36-49`, `doc-writer.md:38-52`) — built around running a command. The owner's example guardrails target the code reviewer and docs reviewer. Question: do non-command judgment guardrails apply to writers at all, or only to reviewers? Look at the `agents:` field of the per-gate block (`guardrails.md:19-21`) — it already lets a gate name which agents run it (code-writer-tdd, code-writer-e2e, code-reviewer, doc-writer, doc-reviewer). So can the owner simply scope a judgment rule to reviewers-only via that existing field, meaning writers never see it? Confirm whether the `agents:` mechanism already handles this with no new structure, or whether writers need explicit handling for "a guardrail I cannot run as a command."

3. **The per-gate `.rp.md` block.** Today the block is name + `command:` + `agents:` + optional `fill-guidance:` (`guardrails.md:12-24`). For a non-command judgment rule there is no command — the rule *is* the prose. What is the minimal block shape that expresses both kinds? Does `command:` become a generic prose body (the rule text), with `fill-guidance`/`{scope}` only meaningful when that body contains a command? Is there a single unified block, or two block shapes? Report what the current structure most naturally accommodates.

4. **The spawn-time Guardrails block passed to agents.** `autonomous-workflow.md:66` / `passing.md:10` pass "the gates that name this agent — one per line as a name and its exact command." For a judgment rule the line is prose, not a command. Confirm this is purely a wording change (pass the prose instead of "the exact command") with no structural impact.

Report the load-bearing lines and the minimal shape each artifact takes; I'll decide the requirements.

**A:** The new capability nests cleanly. Judgment guardrails are checked by the agents their `agents:` field names (owner's case: reviewers), recorded as ordinary rows in the existing Checks table (fail-by-judgment instead of fail-by-exit-code), reject via the existing must-fix path, never reach writers when scoped to reviewers, live in **one unified `.rp.md` block** (the old `command:` line generalizes to a prose body), and reach agents via the existing spawn block with only "command" → "rule" broadened.

1. **Checks table — three per-row command presuppositions.** (i) the `Command` column header (`code-reviewer.md:76-78`, `doc-reviewer.md:77-79`); (ii) the skipped-row rendering "shows the gate's literal command" (`code-reviewer.md:71-74`, `doc-reviewer.md:73-76`); (iii) the result source "run … exactly as each command is written … a gate that exits non-zero is itself a rejection finding" (`code-reviewer.md:43`, `doc-reviewer.md:45`). Minimal change: keep one row per gate and the Result column (pass|fail|skipped); make the `Command` cell apply only to command guardrails (rename to a kind-neutral `Guardrail` holding the gate's prose, or leave blank/"—" for judgment rows); broaden the fail signal from "the command's exit code" to "the command's exit (command rule) OR the reviewer's own assessment (judgment rule)." A violated judgment rule is an ordinary `fail` row and rejects via the existing must-fix path (`code-reviewer.md:109`, `doc-reviewer.md:110` "every issue is must-fix"). No new structure — the reviewer already records per-gate results and already rejects on judgment.

2. **Writers need no new handling.** The `agents:` field (`guardrails.md:20`) already names which agents run each gate; the spawn machinery places only "the gates naming this agent" and omits the Guardrails field when the agent has none (`passing.md:10-12`). A reviewer-only judgment rule (`agents: code-reviewer, doc-reviewer`) is never placed in a writer's prompt, so the writers' command-shaped steps (`code-writer-tdd.md:33-49`, `code-writer-e2e.md:29-36`, `doc-writer.md:38-52`) never encounter it. The only scenario requiring new writer handling — a judgment rule deliberately placed *on* a writer — is **not** the owner's need, and `agents:` already makes "reviewers-only" expressible. So judgment rules naturally tend to name reviewers, and writers are unaffected.

3. **One unified `.rp.md` block, least churn.** Generalize the `command:` line into a **prose body** holding the guardrail's rule text. Command guardrail ⇒ body is the command (or "run X and check it doesn't fail"), with `{scope}`/`fill-guidance` meaningful because the body holds a command with a placeholder. Judgment guardrail ⇒ body is the rule prose, and `fill-guidance`/`{scope}` simply don't apply (they are already "optional; scoped gates only" at `guardrails.md:22`, so a judgment rule omits them exactly as a fixed command gate does today). `name:` and `agents:` are kind-neutral and carry over. The fixed/scoped distinction (`guardrails.md:7-11`) becomes a property of *command* guardrails only; a judgment guardrail is a third, simpler case carrying no command. One block shape with optional fields — consistent with `fill-guidance` already being optional-and-sometimes-present.

4. **Spawn block — pure wording change, confirmed.** `autonomous-workflow.md:66` / `passing.md:10` place, per gate, name + the gate's text, one line per gate, built only for gates addressed to that agent, omitted when none. For a judgment rule the per-line content is the rule prose instead of a command; "its exact command" / "the resolved command" broadens to "its rule." No new field, section, or inclusion logic (a scoped command still gets `{scope}` resolved first).

**Sources (worktree):** `agents/code-reviewer.md:41,43,71-79,109`; `agents/doc-reviewer.md:43,45,73-79,110`; `agents/code-writer-tdd.md:33-49`; `agents/code-writer-e2e.md:29-36`; `agents/doc-writer.md:38-52`; `skills/radical-pipelines/reference/guardrails.md:7-11,16-22`; `reference/conventions/passing.md:10,11-12`; `reference/autonomous-workflow.md:66`.

### Q5: The writer trichotomy as prose, and the out-of-scope boundary

Two loose ends before I consolidate. Report evidence — do NOT decide:

1. **Writer trichotomy under prose.** Writers today sort each gate into: no convention ⇒ proceed; command **cannot execute** (missing binary, renamed script) ⇒ **blocker**; runs and **exits non-zero** ⇒ work, fix it (`code-writer-tdd.md:42-44`, `code-writer-e2e.md:33-35`, `doc-writer.md:45-47`). The "exits non-zero" branch is exit-code framing to remove. But the cannot-execute-vs-failing distinction is still meaningful for a command-as-prose guardrail (a missing tool is a different situation from a failing test). Question: can this trichotomy be re-expressed in prose without exit-code vocabulary — e.g. "if the command can't run at all (missing tool, renamed script), that's a blocker; if it runs but the check it describes isn't satisfied, fix the underlying issue" — preserving both branches by *meaning* rather than by exit code? Confirm the distinction survives as prose and identify the exact lines to reword.

2. **Out-of-scope / preserved-behavior boundary.** I want to state explicitly what this change does NOT touch, so the spec has clear edges. Confirm from the code which of these are genuinely *unchanged* by "make guardrails prose": (a) the `{scope}` fill lifecycle and `## Guardrail scopes` plan sections (Q3: exit-code-free, kept); (b) the binary approve/reject review outcome and must-fix model (`code-reviewer.md:109`); (c) which agents exist and the phase structure; (d) the setup flow for non-guardrail conventions; (e) the `agents:` per-gate field semantics; (f) the no-guardrails-convention path ("proceed, not a blocker"). For each, confirm it is untouched or name the minimal incidental edit (e.g. a wording tweak where exit-code language happens to appear).

3. **Completeness sweep.** Re-grep the worktree for any *remaining* exit-code / `exit 0` / "pass/fail by exit code" / "exits non-zero" phrasing I haven't already catalogued across Q1/Q4 (skill reference files, all five guardrail-running agents, setup, load, passing, autonomous-workflow, assisted-phases). Give me the complete list of spots that must lose exit-code framing, so the acceptance criterion "no exit-code framing remains" is checkable. Note any spot where exit-code language is load-bearing in a way the prose rewrite must carefully preserve (not just delete).

This should let me consolidate. Cite lines.

**A:** The trichotomy survives as prose (only branch 3 is exit-code framing); the out-of-scope items are all preserved; and the complete exit-code-framing inventory is below, grouped by treatment.

**1. Writer trichotomy survives.** Three identical copies (`code-writer-tdd.md:42-44`, `code-writer-e2e.md:33-35`, `doc-writer.md:45-47`). Only **branch 3** ("a gate runs and **exits non-zero**") carries exit-code vocabulary. The cannot-execute (branch 2) vs. failing (branch 3) distinction is exit-code-independent — "the tool/script isn't there to run" vs. "it ran but the check it describes isn't satisfied." Reword branch 3 by meaning, e.g. "A gate runs but the check it describes isn't satisfied — the command ran but the gate's condition isn't met: that's work, not a blocker — fix the underlying issue." Exact lines to reword: `code-writer-tdd.md:44`, `code-writer-e2e.md:35`, `doc-writer.md:47`. Branch 2 already has no exit-code language. (The writers' blocker-Guidelines contrast — `code-writer-tdd.md:63` "Failing tests or broken builds are not blockers" — is already exit-code-free, fine as-is.)

**2. Out-of-scope / preserved-behavior boundary.**
- (a) **`{scope}` fill lifecycle + `## Guardrail scopes`** — substantively untouched. The only borderline lines are the plan-reviewer / assisted validation ("did the command's **runner resolve and terminate**? — not whether tests exist or pass": `code-plan-reviewer.md:19`, `doc-plan-reviewer.md:20`, `assisted-phases/3 - plan.md:118,211`). These are *execution* checks, not *exit-code* checks; under the narrow reading they **stay**.
- (b) **Binary approve/reject + must-fix** (`code-reviewer.md:109`, `doc-reviewer.md:110`) — untouched (the per-gate fail *source* broadens; the verdict machinery is preserved).
- (c) **Which agents exist + phase structure** — untouched.
- (d) **Setup flow for non-guardrail conventions** (`setup.md:32-170`) — untouched; only the Guardrails subsection `setup.md:171-190` is affected.
- (e) **`agents:` field semantics** — untouched; judgment rules reuse it (gains a use, not new mechanics).
- (f) **No-guardrails-convention path** ("proceed, not a blocker": `code-writer-tdd.md:42`, `code-writer-e2e.md:33`, `doc-writer.md:45`; reviewers `code-reviewer.md:45`, `doc-reviewer.md:47`) — untouched, exit-code-free already.

**3. Complete exit-code-framing inventory, grouped by treatment:**

*Group A — pure exit-code framing, straight rewrite to drop the exit-code words:*
1. `guardrails.md:3` — "judged **pass/fail by exit code**" (the definition).
2. `load.md:22` — convention-table cell, same phrase.
3. `code-writer-tdd.md:44`; 4. `code-writer-e2e.md:35`; 5. `doc-writer.md:47` — branch 3 "exits non-zero."
6. `code-reviewer.md:43`; 7. `doc-reviewer.md:45` — "a gate that **exits non-zero** is itself a rejection finding."
8. `code-reviewer.md:114`; 9. `doc-reviewer.md:115` — blocker-Guideline contrast "runs and exits non-zero."

*Group B — load-bearing, PRESERVE the meaning (careful rewrite, not deletion):*
10. `setup.md:183` — "Any **exit code** counts… The bar is **'it executed,' not 'exit 0.'**" Deliberately accepts a runnable-but-currently-failing gate at capture time; the rewrite must keep "accept a command that runs even if its check currently fails; reject only one that can't run."
11. `setup.md:184` — "the error **and exit code**" — drop "and exit code," keep "the error."
12. `setup.md:179` — "the only question is **did the command execute?** — whether it _passes_ is the agents' concern." Preserve the execution-not-pass meaning; for judgment rules there is nothing to execute (Q3).

*Group C — command-presupposing framing that must BROADEN so judgment rules (no command) fit:*
13. `code-reviewer.md:72` / `doc-reviewer.md:74` — "skipped row shows the gate's **literal command**."
14. `code-reviewer.md:74` / `doc-reviewer.md:76` — "a run gate is a present pass/fail row."
15. `code-reviewer.md:76-78` / `doc-reviewer.md:77-79` — the `| Check | Command | Result |` header.
16. `code-writer-tdd.md:37` / `code-writer-e2e.md:28` / `doc-writer.md:40` — "Run every gate … exactly as **its command is written**."
17. `code-reviewer.md:43` / `doc-reviewer.md:45` — "run every gate … exactly as each **command** is written … every gate must **run and pass**."
18. `autonomous-workflow.md:66` — spawn block "a name and **its exact command**."
19. `passing.md:10` — "place the **resolved command**; a fixed gate's **command** passes literally" (broaden "command" → "rule"; keep scoped-command resolution).

*Group D — NOT exit-code framing, leave alone (named so over-deletion is avoided):*
- `setup.md:72` — "`to exit and remove`" (worktree removal; the word "exit" is unrelated).
- `setup.md:175` — "which ones a change must **pass** before complete" (generic "pass").
- `code-plan-reviewer.md:19` / `doc-plan-reviewer.md:20` / `assisted-phases/3 - plan.md:118,211` — "runner resolve and terminate … not whether tests pass" (execution check, explicitly not exit-code; preserved under narrow reading).
- No-convention path (f) and writers' "Failing tests … are not blockers" Guidelines — exit-code-free, preserved.

**Scoping line for the acceptance criterion (my call):** the intent states BOTH "every guardrail is expressed as prose" AND "the exit-code machinery is removed." So the change covers **A + B + C**: drop exit-code words (A), preserve the run-not-pass meaning where load-bearing (B), and broaden command-presupposing framing so judgment rules fit (C). Group D is explicitly preserved.

**Sources (worktree):** `guardrails.md:3`; `load.md:22`; `setup.md:72,175,179,183-184`; `passing.md:10`; `autonomous-workflow.md:66`; `assisted-phases/3 - plan.md:118,211`; `code-writer-tdd.md:37,42-44,63`; `code-writer-e2e.md:28,33-35`; `doc-writer.md:40,45-47`; `code-reviewer.md:43,45,72,74,76-78,109,113-114`; `doc-reviewer.md:45,47,74,76,77-79,110,114-115`; `code-plan-reviewer.md:19`; `doc-plan-reviewer.md:20`.

## Consolidated Requirements

Each requirement is an observable outcome — something an owner or a running agent can see by using the system after the change. The subject is the Radical Pipelines skill and agent profiles themselves.

### Guardrail definition and kinds

1. A guardrail is defined as a **prose rule** an agent must satisfy, not as "an exact command judged pass/fail by exit code." The skill's guardrail definition reads as prose with no exit-code framing.
2. Two kinds of guardrail are expressible: a **command guardrail**, whose prose tells the agent to run a command and confirm its check is satisfied (e.g. "run this command and check that it doesn't fail: [command]"), and a **judgment guardrail**, a prose rule the named agent satisfies by its own assessment with no command to run (e.g. a reviewer rule like those in the project's `AGENTS.md`).
3. An owner can author a judgment guardrail with no command — the guardrail's body is the rule prose alone — and the system accepts it without requiring a command.

### The `.rp.md` per-gate block

4. A single, unified per-gate block shape expresses both kinds: a name, the guardrail's prose body (a command-bearing instruction or a rule), the agents it applies to, and an optional fill-guidance. A judgment guardrail simply omits the command-only fields (`{scope}`, fill-guidance), the way a fixed command gate already omits fill-guidance.
5. The `agents:` field continues to determine which of the five guardrail-running agents (code-writer-tdd, code-writer-e2e, code-reviewer, doc-writer, doc-reviewer) a guardrail applies to. An owner can confine a judgment guardrail to reviewers (e.g. code-reviewer, doc-reviewer) so writers never receive it.

### Per-pipeline command scoping is preserved

6. The fixed-vs-scoped distinction and the `{scope}` fill lifecycle remain in force **for command guardrails**: a scoped command guardrail still carries a `{scope}` placeholder, the planning agent of the phase whose agents run it still chooses the `{scope}` value and records it in the plan's `## Guardrail scopes` section, and the orchestrator still resolves it before passing the guardrail to the agent. None of this carries exit-code framing. The fixed/scoped distinction is a property of command guardrails only; a judgment guardrail is neither fixed nor scoped.

### Reviewer behavior

7. A reviewer records a per-guardrail result for both kinds in its Checks table. A command guardrail's result comes from running its command and seeing whether its check is satisfied; a judgment guardrail's result comes from the reviewer's own assessment of whether the rule is satisfied. The table's command-presupposing shape broadens so a judgment guardrail (which has no command) fits — a guardrail with no command produces a valid row.
8. A guardrail the reviewer finds unsatisfied — a command guardrail whose check fails or a judgment guardrail the reviewer assesses as violated — is a rejection finding that drives the verdict to reject, through the existing must-fix review machinery. The binary approve/reject outcome is preserved.
9. The reviewer's gate-running step, its skipped-row semantics, and the spawn-time guardrail block read as prose without "exact command" / "exits non-zero" / "pass/fail by exit code" framing, while still covering both kinds.

### Writer behavior

10. A writer runs each command guardrail it receives and confirms the check it describes is satisfied before committing, expressed in prose without exit-code vocabulary. The distinction between a guardrail that **cannot run at all** (missing tool, renamed script — a blocker) and one that **runs but is not satisfied** (work to fix, not a blocker) is preserved by meaning, stated without "exits non-zero."
11. The no-guardrails-convention path is unchanged: with no guardrails declared, the writer or reviewer proceeds on its other validation; this is not a blocker and warrants no warning.

### Setup / capture

12. Setup captures guardrails as prose. For a command guardrail, the owner is still asked to confirm the command runs at capture time (it is accepted if it runs, even when its check currently fails; it is rejected only if it cannot run) — stated without "exit 0" / "exit code" vocabulary. For a judgment guardrail there is no command to run, so this run-time validation does not apply, matching how other prose conventions (e.g. commit format) are captured verbatim and not validated.

### Exit-code framing removed everywhere

13. No exit-code framing — "exit 0", "exit code", "exits non-zero", "judged pass/fail by exit code" — remains anywhere guardrails are defined, captured, passed, run, or reviewed: the guardrails reference, the convention loader and setup and passing files, the autonomous-workflow spawn block, the assisted plan phase, the two writers, the e2e writer, the doc writer, and the two reviewers. (Concrete inventory: groups A, B, C in Q5. Group B spots keep their underlying meaning — notably setup's "a runnable command is accepted even if its check currently fails.")

### Constraints (project rules the change must honor)

14. The change keeps the skill minimalist and generic: no new structure beyond what both kinds genuinely need (one unified block, the existing `agents:` field), no tool-specific or issue-tracker-specific mentions, no negative phrasing unless strictly necessary, and shared instructions stated once rather than duplicated across reading paths.

### Out of scope (candidates)

- The `{scope}` fill lifecycle, the `## Guardrail scopes` plan sections, and the plan-reviewer / assisted "did the command's runner resolve and terminate?" validation are **execution** checks, not exit-code checks — they are preserved, not removed.
- The set of agents and the six-phase pipeline structure are unchanged.
- The binary approve/reject verdict and the must-fix review model are unchanged (only the per-guardrail fail *source* broadens).
- The setup flow for non-guardrail conventions is unchanged.
- Adding any actual guardrails to this project's own `.rp.md` is the owner's motivating use case but is enabled by, not part of, this change — the change makes such authoring possible; it does not itself populate `.rp.md`.