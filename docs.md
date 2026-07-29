# Radical Pipelines — User Guide

Radical Pipelines is an agent orchestrator that takes a software engineering issue through a pipeline of defined phases — Intent → Spec → Design doc → Build → Document — where each phase produces concrete, inspectable artifacts, and teams of agents do the work autonomously.

This guide explains not just how to operate it, but *why* it is shaped the way it is — so you can recognize which of its options fits each situation and get the most out of it. It is organized the way you will encounter the tool: first the ideas, then setup, then your first run, a complete tutorial session, then reading results, then iterating, then the advanced machinery.

---

## Part I — The ideas behind the tool

### 1. Why this exists

Most people use coding agents in **assisted mode**: give the agent a rough idea, let it start, and sit next to it correcting course. That works, but it is a workaround for two structural gaps, not a deliberate workflow:

- **Missing requirements.** Without clear specs, the agent picks a direction and you steer in real time. But agents can already implement autonomously *when the requirements are well-defined*. Assisting is compensating for the missing spec, not for the agent.
- **Non-determinism.** The same prompt can produce a different result every time. So even when you know exactly what you want, you babysit the run in case it takes a bad path *this* time.

Assisted mode has two more costs that are easy to overlook:

- **No structure.** Whether tests, docs, or other assets get produced depends on you remembering to ask.
- **It's local.** The context, decisions, and intermediate output exist only on your machine. Your team sees the final PR and nothing else.

Radical Pipelines answers all four at once: it splits the work into phases with defined outputs, makes every phase commit reviewable artifacts to git, runs the phases autonomously with adversarial review built in, and lets any teammate inspect, correct, and relaunch from any point.

### 2. The core idea: review artifacts, not keystrokes

The mental shift the tool asks of you:

> Instead of supervising an agent while it works, you review what a team of agents produced when it's done — and when something is wrong, you fix it **at the phase where the assumptions diverged** and relaunch from there.

This changes what your time is spent on:

- **Parallel throughput.** You can have several pipelines running at once, because none of them needs you while it runs. The constraint shifts from "how many agents can I supervise" to "how many results can I review".
- **Compounding quality.** When a run produces a bad result, the cause lives in a specific artifact — a wrong assumption in the spec, a missing constraint in the design doc. You fix *that*, and the fix benefits every future run through the same pipeline, not just the failed one.
- **Guaranteed assets.** Tests, behavior verification, and documentation are phases and gates, not favors you remember to ask for.
- **Shareable work-in-progress.** Every phase's output is committed. A teammate can read the spec of a running pipeline, disagree with a requirement, and relaunch from there — long before a PR exists.

### 3. The trade: what it spends, what it buys

Another way to understand the whole tool in one sentence:

> Radical Pipelines is a machine for **maximizing the quality and determinism you can extract from a model** — or several models — while **minimizing the human time invested**, at the declared cost of **more tokens and more wall-clock time per issue**.

It's worth holding both sides of that exchange explicitly:

**What it buys.**

- *Quality extraction.* Structured phases, systematic self-interrogation (§6), evidence discipline, and adversarial review pull noticeably better output from the *same* model than a single prompt-and-hope session does. The model's capability is a ceiling; most direct use operates far below it. The pipeline is machinery for closing that gap.
- *Determinism.* One agent's output is a sample from a distribution; the pipeline narrows the distribution: fresh adversarial reviewers reject the bad tails, redundant lanes converge on what's solid (§23), and deterministic guardrails refuse unverified work. For critical issues you can spend more — more lanes, stronger reviewer models, even different models from different providers on the same surface — to converge on a more reliable output.
- *Your time back.* The human touchpoints are compressed to the edges: shape the intent, set the run plan, review the artifacts. Everything between is unattended.

**What it spends.**

- *Tokens.* Several agents research, derive, verify, and re-verify the same surface. Reviewers re-run checks producers already ran. Lanes multiply all of it. This redundancy is not waste — it's precisely what the quality and determinism are made of — but it is real cost.
- *Time to done.* An issue takes longer through the pipeline than through direct prompting. Crucially, though, it's **autonomous time**: nobody is sitting next to it. Three unattended hours cost you nothing if you were reviewing another pipeline, in a meeting, or asleep.

The corollary that should drive your decisions: **judge cost in human-minutes per task, not in tokens or hours.** An issue that burns heavy tokens across three autonomous hours but needs only twenty minutes of your review is cheaper — in the currency that's actually scarce — than ninety minutes of attended assisting. And the tool's dials (target phase, lane count, difficulty tier) are exchange-rate settings: per issue, you choose how many machine resources to spend buying certainty.

### 4. The five phases and their altitudes

| # | Phase | Produces | Altitude |
|---|-------|----------|----------|
| 0 | **Intent** | `intent.md` — the initial idea or request | *What you want* — a wish, possibly vague |
| 1 | **Spec** | Requirements, acceptance criteria, out-of-scope | **WHAT** — observable outcomes, no implementation |
| 2 | **Design doc** | Architecture, interfaces, key decisions with trade-offs | **HOW** — decisions, not code or task lists |
| 3 | **Build** | Build plan, code, unit + e2e tests, behavior verification, build summary | **DO** — plan first, then execution |
| 4 | **Document** | Document plan, internal + external documentation, document summary | **TELL** — planned against the code that actually shipped |

Planning is not a separate phase: Build and Document each begin by committing a plan and getting it approved before any execution starts.

**Altitude discipline is the load-bearing principle.** Each phase answers one kind of question and refuses to answer the next phase's:

- A spec requirement states an *observable outcome* ("Users can export their data as JSON"), never a mechanism ("add a `format` param to `ExportController`"). If a mechanism sneaks into a spec, the reviewer flags it as a design decision leaking upward.
- A design doc decides *how* — components, interfaces, trade-offs — but never sequences the work; that's the build plan's job.
- A build writer executes *exactly one task* from the plan, and if executing it would force a design decision, it stops and reports instead of improvising.

Why this matters to you: when you want to change something, the altitude tells you which artifact to change. Wrong behavior? The spec. Right behavior, wrong architecture? The design doc. Right design, sloppy execution? The build plan or a re-review. You correct the highest artifact where the divergence started, and everything below is re-derived from it.

### 5. How a phase does its work: produce → adversarially review → iterate

Every phase runs the same loop, with different casts:

1. A **producer** creates the artifact (a spec, a design, a plan, code, docs).
2. An **adversarial reviewer** — always a fresh agent with no attachment to the work — tries to find real problems. It writes its verdict as a committed file: `<artifact>-review-1-rejected.md`, `-2-rejected.md`, … for rejections, and a single `<artifact>-review-approved.md` on approval.
3. On rejection, the producer must answer **every** finding: *adopt* it (fix the artifact), *refute* it (with evidence), or *propose it as a residual* (a bounded, justified deferral). Then a fresh reviewer re-reviews. The loop runs until approval.

Three properties make this trustworthy rather than theatrical:

- **Evidence discipline.** Every load-bearing claim in a research record carries its check — the command, the file and line, the experiment, and its result. A claim that can't be checked is recorded as an assumption, never as fact. "No risks" or "no affected areas" are claims too: they need the recorded sweep that came back empty.
- **Reviewers verify, not vibe.** They re-run the declared checks, design their own checks when a result looks suspicious, and log every check performed. An approval without a verification log is illegitimate by definition.
- **Rejections are progress, not failures.** Reviewers are told to reject liberally for any real issue. The rejection files stay in git — they're part of the audit trail that tells you *how hard the artifact was tested* before you trust it.

In the thinking phases (spec and design doc), the producer is a **lead + researcher pair**: the lead asks one question at a time, the researcher investigates the codebase, the web, or runs experiments, and the lead decides on the evidence — writing the running Q&A record (`spec-research.md`, `design-doc-research.md`) in real time. The record, not just the polished artifact, is what the reviewer adjudicates.

### 6. The right questions, asked every time

Here is a fact that direct agent use obscures: most quality failures are not capability failures. They are **questions nobody asked**.

In assisted mode, the questions that get asked of the work are whichever ones the human happens to think of in that session: "does this break X?", "did you check Y?", "isn't this dead code now?" Coverage depends on your memory, your energy, and how much attention you had left that afternoon. Two sessions with the same agent and the same task get interrogated differently — and the output quality tracks the interrogation, not the model.

Radical Pipelines moves the questions out of the human's head and into the methodology. Every agent profile is, at its core, a battery of self-interrogations that fire systematically on every run:

- *Is this requirement an observable outcome, or a mechanism leaking upward?*
- *Does every load-bearing claim carry its check? What does the sweep behind each "none found" look like?*
- *What's in the negative space — behavior the feature must preserve that no requirement names?*
- *What does this change make **false**? Does it strand code, names, docs, or tests whose reason-to-exist it just removed?*
- *Did I verify the behavior end-to-end, or do I merely believe the tests?*

That last-but-one question has a story that shows the mechanism working. A real pipeline run once shipped a change that was fully *correct* — every test passed, every requirement met — but incoherent: the change made a helper's summing logic unreachable, and everyone left the dead logic in place. When the same change was put to three frontier models independently, they all blessed it too. The miss was structural, not a capability gap: every agent had checked the change for *compatibility*; no agent had been asked to re-derive the surviving code's *justification*. The fix was not a better model and not harder review — it was **adding the missing question to the methodology**, a couple of sentences in each profile at the exact point where it should have fired. Every run since asks it.

This is the deep version of "compounding quality" from §2 — it compounds at two levels:

- **Your pipeline's artifacts.** A wrong assumption in this issue's spec gets fixed, and every relaunch of this pipeline benefits.
- **The methodology itself.** A miss in any run becomes a postmortem question — *which question was never asked?* — and the answer gets added to the profiles, so every future run of every issue asks it.

Model upgrades raise the ceiling of what's extractable; the accumulated question bank raises the floor of what actually gets extracted. Assisted use gets neither systematically.

### 7. Your role: the owner

You are the **owner**. Two rules define your seat:

- **You only ever talk to the orchestrator** — the top-level agent running the skill. Agents never talk to you and you never talk to them; the orchestrator spawns them, relays between them, and reports to you.
- **In autonomous mode, all your decisions are collected up-front.** Once a run starts, it proceeds without asking you anything until it reaches its target or stops. Your involvement is at the edges: shape the intent, set the run plan, then review what came out.

---

## Part II — Installation and setup

### 8. Installing (Claude Code)

The repository ships a Claude Code plugin:

```text
/plugin marketplace add Automattic/radical-pipelines
/plugin install radical-pipelines@automattic
```

Then invoke it with `/radical-pipelines:radical-pipelines`, or just ask to "work on issue #123" / "run a pipeline" — the skill's description triggers on that.

For local development of the skill itself, load it straight from a checkout:

```bash
claude --plugin-dir ./radical-pipelines
```

### 9. Project setup: conventions and `.rp.md`

The skill is deliberately **generic** — it doesn't know where your project tracks issues, how you name branches, or how you run tests. Each project supplies that through **conventions** stored in a committed `.rp.md` file at the repo root.

The first time you start a workflow in a project without one, the orchestrator stops and offers an **interactive setup**. It walks you through each convention, one at a time, and writes `.rp.md` only after you confirm the proposed content. The conventions:

| Convention | What it defines | Required |
|---|---|---|
| **Issues** | Where issues live and how to read/comment/update them (a CLI, an API, files in a folder…) | Yes |
| **Branch name base** | The stem all of an issue's branches start from — deterministic from the issue, no `_` (e.g. `<issue-id>-<short-desc>`) | Yes |
| **Pipeline family folder** | The single folder holding all of an issue's pipeline artifacts (e.g. `.pipelines/<branch-base>/`) | Yes |
| **Worktree root** | Where git worktrees are created, one per branch (e.g. `.worktrees/`) | Yes |
| **Team spawning** | How agents are spawned, addressed, and seated in their worktrees (tool-specific) | Yes |
| **Health monitoring** | How the recurring run-health loop is started and cancelled (tool-specific) | Yes |
| **Artifact storage** | Whether artifacts live in the repo itself or in a fork | Yes |
| **Commit format** | The commit message style, passed verbatim to every agent | No |
| **Agent models** | Which model/settings each agent type runs on | No |
| **Guardrails** | The project's deterministic verification gates | No |

Three of these deserve a closer look, because they encode philosophy, not just configuration:

**Guardrails are backpressure.** They are exact commands judged pass/fail by exit code — `npm test`, `cargo clippy`, a typecheck, a build. Their purpose: an agent cannot declare work "done" as an opinion; it has to produce a verified state — `tests: pass, lint: pass` — and keeps iterating until every gate passes. Writers run them before every commit; the build and document reviewers run them before approving. A gate can be **fixed** (a literal command) or **scoped** (contains a `{scope}` placeholder that each phase's plan fills for the run — useful for "run the tests for {scope}" in large monorepos). During setup each command is validated by running it once — the bar is "it executed", not "it passed"; red tests today are just today's state.

**Artifact storage: repo or fork.** If your project welcomes pipeline artifacts in its history, everything lives in one repository (`artifacts-in-repo`). If it doesn't — an open-source upstream, or you want the workflow private — `artifacts-in-fork` keeps `.rp.md`, artifacts, and pipeline branches in a fork; when you approve opening the upstream PR, the orchestrator cherry-picks *only the code commits* onto a clean branch, rewrites their messages to upstream style, and pushes that branch to upstream. Viewers of the PR never see the fork.

**Agent models can encode a difficulty dial.** A project may define a table of agent × difficulty tier (e.g. low/medium/high → which model each agent runs on), so at run start you pick a tier once and the orchestrator resolves each agent's model. Spend cheap models on routine issues and strong models on the reviewers and leads of critical ones — this is one of the practical knobs for the exchange rate in §3: more capable checking where the cost of a bad artifact is highest.

Finally, an individual developer can override a restricted subset of conventions in a git-ignored `.rp.local.md` (e.g. point issues at a sandbox tracker while testing). Guardrails are committed-only — they're shared verification, never a personal preference.

---

## Part III — Your first pipeline

### 10. Start from an issue — and under-specify it

Every pipeline realizes an **issue** in your tracker. The issue's body becomes the pipeline's phase-0 intent, so the way you write it shapes everything downstream. The intent format has one required section and three optional ones:

- **Goal** *(required)* — the outcome you want, stated as an *outcome*, not a solution. "Users can export their data as JSON", not "add a `format` param to `ExportController`".
- **Constraints** *(optional)* — binding must/must-nots you actually own: "must not break existing CSV consumers", "don't touch billing".
- **Context** *(optional)* — links, prior decisions, motivation only you hold.
- **Assumptions / directions to explore** *(optional)* — your hypotheses, **explicitly labeled open** so later research may confirm or overturn them.

The authoring discipline is the opposite of what prompt-writing habits teach:

> **Under-specifying is safe; over-specifying narrows the work prematurely.** The agents do their own research in later phases. A vague idea with just a Title and a Goal is a complete, valid intent.

Why: the spec phase exists to *derive* requirements through research. If you hand it conclusions instead of a goal, you've pre-empted the phase that would have validated them. When you do have a hunch — "I think the bug is in the cache layer" — it goes under Assumptions as an open direction, and the pipeline treats it as a hypothesis to check, never silently as ground truth. Downstream phases must either satisfy your stated intent or surface evidence that a premise is false — never quietly substitute a different goal.

If the issue doesn't exist yet, ask the orchestrator to create it: it runs a short Q&A (one question: the goal, pressed only until it's an outcome; then one open invitation for anything else), searches the tracker for related or duplicate issues, shows you the rendered draft, and writes it only on your approval.

### 11. What pipeline creation does

Say it: *"work on issue #482"*. The orchestrator will:

1. **Read the issue in full** — body, all comments, cross-references, external links, attachments.
2. **Check declared dependencies** — if the issue depends on unclosed issues, you're asked whether to proceed or wait.
3. **Check for existing pipelines** for this issue (more on that in Part VII). If none exist, it creates one:
   - Derives the branch base (e.g. `482-export-json`) and the pipeline family folder (e.g. `.pipelines/482-export-json/`), both deterministic from the issue.
   - Creates the base run branch and its worktree.
   - **Authors `intent.md`**: if the issue body is already in the canonical format with no comments, it travels as-is; otherwise the orchestrator synthesizes the issue's whole conversation — folding in comments, fetched links, downloaded screenshots — into a draft, shows it to you, and writes it only on approval. The phase-0 folder is self-contained: agents never need to reach back to the tracker.
   - Commits it. Phase 0 is complete.

### 12. The run plan: your decisions, all up-front

Next, the orchestrator collects the **run plan** and confirms it back to you before starting:

1. **Mode** — autonomous (teams of agents run phases end-to-end) or assisted (you and the orchestrator drive one phase together; see §24).
2. **Target phase** — where this autonomous run stops. Defaults to the last phase.
3. **Per-phase decisions** — currently: how many **lanes** the spec phase runs (default 1), and how many lanes plus which **mode** (isolated/divergent) the design-doc phase runs (defaults: 1, isolated). See §23 before touching these.
4. Anything your project's conventions add — e.g. the difficulty tier if your `.rp.md` defines model tiers.

Two target-phase strategies worth internalizing:

- **Run everything** (default) — right for well-understood, well-scoped issues. Review the finished result once.
- **Stop after Spec (or Design doc)** — right for large, ambiguous, or risky work. You pay for the thinking, read `spec.md` / `design-doc.md` at your leisure, correct any diverged assumption *before* the build exists, then relaunch the autonomous sequence from there. This is dramatically cheaper than discovering a spec-level misunderstanding in a finished PR.

Once you confirm, the run is silent: no more questions until it stops.

### 13. While it runs

What the orchestrator is doing (all of it invisible unless you look):

- **Topology.** It owns every branch and worktree: it creates them, seats each agent inside its assigned worktree at spawn, and removes worktrees when work completes. Agents verify at startup they're in the right worktree on the right branch, and stop if not.
- **Spawning per phase.** Each phase's cast (see Part V) is spawned with a `## Conventions` block at the top of its prompt — its worktree, branch, artifact folder, commit format, and the guardrail gates that name it. Evidence like a rejection's findings is passed **verbatim, never paraphrased** — interpretation is a place for drift to creep in.
- **Health monitoring.** A recurring monitor (default: every 5 minutes) watches for stalls, lost messages, login/API errors, and network failures. Each issue gets a 2-retry auto-recovery budget (ping → restart, re-send → restart, model swap → re-spawn, retry → wait-and-retry) before it escalates to you with the agent name, the error verbatim, last-known progress, and a suggested smallest next step.
- **Progress reports.** As each phase completes, you get a short informational report — which phase, where its artifacts live, anything notable (e.g. "spec approved after 2 rejections") — with no questions attached.
- **Runaway protection.** Every three consecutive rejections in a review loop, the orchestrator inspects the rejection records; if the same pattern is repeating and could loop forever, it stops the run and surfaces the latest rejection to you.

### 14. Reading the results

When the run closes out (target reached, blocker, cancellation, or failure), the branch is pushed. Everything lives in two places:

**The artifact folder** — the pipeline family folder on the run branch, one subfolder per run, one per phase:

```
.pipelines/482-export-json/
└── base/
    ├── 0-intent/
    │   └── intent.md
    ├── 1-spec/
    │   ├── spec-research.md            ← the Q&A + evidence record
    │   ├── spec.md                     ← the spec (standalone)
    │   ├── spec-review-1-rejected.md   ← first review: rejected, findings inside
    │   └── spec-review-approved.md     ← final verdict + verification log
    ├── 2-design-doc/
    │   ├── design-doc-research.md      ← topics, options, trade-offs, decisions
    │   ├── design-doc.md               ← the design (standalone)
    │   └── design-doc-review-approved.md
    ├── 3-build/
    │   ├── build-plan.md               ← ordered tasks + e2e test plan
    │   ├── build-plan-review-approved.md
    │   ├── build-review-1-rejected.md
    │   ├── build-review-approved.md    ← incl. gate results + behavior-verification evidence
    │   └── build-summary.md            ← human-readable: what/why/how
    └── 4-document/
        ├── document-plan.md
        ├── document-plan-review-approved.md
        ├── document-review-approved.md
        └── document-summary.md
```

**The run branch itself** — the code, tests, and documentation, committed task by task with attributed messages (per your Commit format convention, e.g. `Support JSON export (build-writer-tdd)`).

How to review efficiently, in order:

1. **`build-summary.md` and `document-summary.md`** — the human-readable record of what the run produced, why, and how, including known limitations. Start here.
2. **`spec.md`** — is this *what you meant*? This is the highest-leverage check: everything else was derived from it.
3. **`design-doc.md` → Key Decisions** — each decision lists its alternatives, trade-offs, and which requirement it serves. Disagree with a choice? The alternatives you'd prefer are already analyzed there.
4. **The review files** — the approval's verification log tells you what was checked before approving; the rejection files tell you what was caught and fixed along the way. High rejection counts on an artifact are a signal to read it more carefully — or a signal the phase's inputs were shaky.
5. **The diff** — reviewed last, because by now you know what it's supposed to do and why.

The research records (`*-research.md`) are your deep audit trail: every requirement and decision names the Q&A entries and checks that ground it. You'll rarely read them end-to-end — you consult them when you want to know *why* something is the way it is.

Then merge the branch as you would any PR — or iterate (Part VII).

---

## Part IV — Tutorial: a complete session

A condensed but faithful walkthrough, so you can see what the concepts of Part III actually look like at the keyboard. The setting: a fictional web app called *Shopmate*; issues in the project's tracker; `.rp.md` already set up with `npm test` and `npm run lint` as guardrails and a low/medium/high difficulty table.

### Step 1 — Capture the issue

> **You:** I want users to be able to export their data. Create an issue for it.
>
> **Orchestrator:** This will be a short Q&A to capture the request. Add directions only if you're confident or think they're worth exploring — the agents do their own research later, so under-specifying is safe. First: what's the outcome you want?
>
> **You:** Users can download everything the app stores about them, in a machine-readable format.
>
> **Orchestrator:** Anything else worth telling the agents — a hard constraint, a hunch, context they couldn't discover?
>
> **You:** The existing CSV order export must keep working. And I *suspect* the report generator could be reused, but I'm not sure.

The orchestrator sorts what you gave it: the CSV compatibility is a **Constraint**; the report-generator idea goes under **Assumptions / directions to explore**, and it tells you so: *"I'll note that as something to explore, not a requirement — the agents may confirm or revise it."* It searches the tracker for related issues (none), shows you the rendered draft, and on your OK creates **issue #482**.

Notice what just happened to your hunch: it was captured *as a hypothesis*, so the spec phase will research it instead of obeying it. This is the intent discipline of §10 in action.

### Step 2 — Launch a run that stops at the design

> **You:** Work on #482. Autonomous, and stop after the design doc.
>
> **Orchestrator:** No pipelines exist for #482 — creating one. Branch `482-export-json`, artifacts in `.pipelines/482-export-json/`. Here's the intent I derived from the issue — approve? […] Committed. Now the run plan: target phase is the design doc, as you said. Spec lanes: default is 1 — keep? Design-doc lanes: default is 1, isolated — keep? Difficulty: low, medium, or high?
>
> **You:** Defaults are fine. Medium.
>
> **Orchestrator:** Confirming the plan: autonomous run, phases 1–2, stopping after the design doc; single lanes; medium difficulty. Starting — no more questions until it's done.

You close the laptop. The orchestrator spawns the spec team (a lead and a researcher iterating one question at a time, then a fresh adversarial reviewer), then the design team, with the health monitor watching the whole time. Two reports arrive while you're doing other things:

> ☑ **Spec complete** — artifacts at `.pipelines/482-export-json/base/1-spec/`. One review rejection (missing empty-account edge case), adopted and re-approved.
>
> ☑ **Design doc complete** — artifacts at `…/2-design-doc/`. Target phase reached; branch pushed. Run closed.

### Step 3 — Review the thinking (the cheap checkpoint)

You open `1-spec/spec.md`: requirements as observable outcomes, acceptance criteria in Given-When-Then, an Out of Scope section — and there it is, your report-generator hunch, *resolved*: the research record shows the researcher found the generator is coupled to PDF layout and the spec doesn't force its reuse. You skim `2-design-doc/design-doc.md` → Key Decisions: *"Decision: stream the export as NDJSON… Alternatives: buffer full JSON in memory… Trade-offs… Traces to: Requirement 3."* You read `spec-review-1-rejected.md` out of curiosity — the reviewer caught that nobody had asked what an export of a brand-new, empty account contains.

Everything matches what you meant. This checkpoint cost you ten minutes — and it's exactly where a wrong assumption would have been cheapest to fix (a fork cut below the diverged phase; §22).

### Step 4 — Relaunch to the end

> **You:** Continue #482 to the end.
>
> **Orchestrator:** Resuming — next phase is Build. Autonomous, target: Document. Same difficulty? [Yes.] Starting.

The build planner writes the ordered task plan and the e2e test plan; a fresh plan-reviewer approves it; one fresh writer per task implements with TDD, each running `npm test` and `npm run lint` before its commit. The phase report later notes the batch reviewer rejected once — task 4's failing-path acceptance criterion had no covering test — and re-dispatched just that task before approving, verifying the export behavior end-to-end, and writing `build-summary.md`. The document phase sweeps the repo for every surface that mentions exporting, updates the README and the config docs, and closes out.

### Step 5 — Review the result

You read in the §14 order: `build-summary.md` (what/why/how, one known limitation), then straight to the diff — you already trust the spec and design from Step 3. In `build-review-approved.md` you find the gate results table and the behavior-verification evidence: a transcript of the reviewer actually driving the export as a user and inspecting the produced file. You open the PR from the run branch.

### Step 6 — Iterate when feedback arrives

A teammate reviews the PR: *"rename the flag to `--format`, and the docs don't mention the rate limit."*

> **You:** Revise #482: rename the export flag to `--format`, and document the rate limit.
>
> **Orchestrator:** The latest run is complete and unmerged, so a revision applies. Two related changes — one revision or split into two? [One.] Here's the revision intent — note the Origin section quoting the PR feedback verbatim. Approve?

On approval, a new run branch `482-export-json_rev-1-format-flag` starts at the previous run's tip, and phases 1–4 re-run in the revision's own folder — a scoped pass that layers on the existing work. You review the (much smaller) result and merge the latest run branch.

**Total human touchpoints:** authoring the issue (~2 min), approving the intent and run plans (~2 min), the design checkpoint (~10 min), the final review (~15 min), the revision approval (~2 min). Everything else ran unattended — that's the exchange rate of §3, working in your favor.

---

## Part V — The phases in depth

You don't need this section to run the tool. You need it the first time you wonder "why did it do that?" — and to know what quality bar each artifact is held to.

### 15. Phase 1 — Spec

**Cast:** `spec-lead` + `spec-researcher` (persistent pair), fresh `spec-reviewer` per review round. With multiple lanes: a `spec-consolidator`.

The lead reads the intent and drives an iterative Q&A with the researcher — one question at a time, covering scope, users, constraints, success criteria, edge cases, integration, and data — recording everything in `spec-research.md` as it goes. It treats your intent as a *hypothesis*: your assumptions are validated through research, and one that fails validation surfaces rather than silently shaping requirements.

The bar the artifact is held to:

- **Requirements are observable outcomes** — something you could observe by using the running feature. A requirement that names code disposition is restated as the behavior it guarantees.
- **Acceptance criteria in Given-When-Then** — specific enough that tests can be written from them; they drive the build phase's tests.
- **Out-of-scope is explicit** — and exclusions are outcomes too ("X stays observably unchanged"), never "don't touch file Y".
- **Every claim carries its check; every requirement traces to recorded research.**

The reviewer adjudicates the *record* — re-running cheap checks, spot-checking expensive ones, hunting the negative space (existing behavior no requirement preserves, feasibility contradictions in the codebase) — and `spec.md` for fidelity to it.

### 16. Phase 2 — Design doc

**Cast:** `design-doc-lead` + `design-doc-researcher` (persistent pair), fresh `design-doc-reviewer` per round. With multiple lanes: a `design-doc-consolidator`.

The lead works topic by topic — approach, components, interfaces and data flow, key decisions, dependencies, failure modes, risks — building on the spec phase's research rather than re-digging it. For every real decision it generates the credible option space itself (always including the simplest option that could satisfy the spec), records options, trade-offs, decision, and rationale, and traces each to a spec requirement.

One topic is worth knowing by name because it shapes the code you'll review: **post-change coherence** — "what does this design make false?" A change that narrows what reaches surviving code *re-opens* that code: its name, contract, docs, and tests are re-derived from the narrowed reality, and keeping any stranded generality must be recorded as a deliberate decision, not a default. This is the systematized question from §6, standing guard in the design phase against codebases accumulating dead generality.

### 17. Phase 3 — Build

**Cast:** `build-planner` → `build-plan-reviewer` (loop to approval), then one fresh writer per task — `build-writer-tdd` or `build-writer-e2e` by task type — and a fresh `build-reviewer` per batch.

The approved `build-plan.md` contains ordered task blocks — Goal / Type / Files to change / Changes / Depends on / Traces to / Acceptance — each small enough to execute **without making a design decision**, plus an **E2E test plan** translating the spec's acceptance criteria into concrete flows. Task blocks are self-contained by design: a writer gets its block and nothing else, and if the block is incomplete or forces a design choice, that's a blocker (an under-specified plan), not something to improvise around.

- **TDD writers** run red/green/refactor: unit tests derived from the task's Acceptance first, confirmed failing, then minimum code to green, then refactor. Acceptance *is* the test contract. They document every public symbol they touch.
- **E2E writers** implement the plan's flow specs as automated end-to-end tests, confirming each genuinely drives the behavior.
- Writers execute sequentially (they share the run worktree), run every guardrail gate before committing, and never bypass one. A failing gate is work to fix, not a blocker — "it was already broken" doesn't fly; a regression is by definition a previously-passing test that now fails.

The **build reviewer** reviews the phase's *entire diff* after each batch (the batch scopes expected new work, not the review's boundaries), checking acceptance coverage, design alignment, plan adherence, post-change coherence, and test quality. Then, the step that distinguishes this from a paper review — **behavior verification**: if the batch changes anything user-observable, the reviewer exercises it end-to-end the way a user would and captures evidence (screenshots, transcripts, output samples), and manually re-drives every flow in the E2E test plan. *A verification claim without evidence is not a verification.* Only with a provisional approve does it run the guardrails — and any non-zero gate flips the verdict. On rejection, only the flagged tasks are re-dispatched to fresh writers. On approval, it writes `build-summary.md`.

### 18. Phase 4 — Document

**Cast:** `document-planner` → `document-plan-reviewer`, then one fresh `document-writer` per task, `document-reviewer` per batch.

The key property: documentation is planned **against the shipped code**, not against intentions. The planner reads what actually landed and *sweeps the entire repository* for any text referencing the changed behavior — READMEs at any level, examples, configuration descriptions, changelogs, contributor docs, inline narrative — recording the sweep (including searches that came back empty). Every surface found becomes a task, or it ships stale.

Each task names its **audience**, and writers synthesize three sources: the task block (*what, for whom*), the spec and design doc (*why it exists, why it's shaped this way* — translated into the audience's framing, never pasted), and the shipped code (*what actually exists* — every symbol, path, and example verified against it; runnable examples actually run). If the design doc and the shipped code disagree on a point the docs must cover, that's a blocker — the writer will not invent a rationale for behavior that doesn't match what shipped.

A quality rule that spans both build and document: agents **write about the software itself** — the code, commits, and docs never reference "task 3" or "acceptance criterion 2". Pipeline bookkeeping stays in the artifact folder; the deliverables read as if a careful human wrote them.

---

## Part VI — When things don't go straight

### 19. Blockers: agents refuse to guess

Any agent, in any phase, stops and reports a **blocker** — instead of inventing a missing decision — when a required input is missing, contradictory, or would force a choice that belongs to a prior phase. Examples: research disproves a premise the intent depends on; two lanes' specs leave a product decision open that nothing in the intent settles; a task block forces a design choice; a declared guardrail command doesn't exist.

Every blocker carries the same payload: **what** is missing or contradictory, **which approved artifact** must change to unblock it, and (when identifiable) **the smallest revision** that would do so.

A blocker stops the run, and the orchestrator surfaces it to you verbatim. This is the philosophy from §2 operating under stress: the pipeline would rather halt and have you fix the diverged artifact — via a fork cut below that phase (§22), re-running it with the blocker payload as input — than build confidently on a wrong assumption. A blocker is the system working, not failing.

### 20. Rejection loops

Producer/reviewer loops iterate until approval, with two safety valves: the orchestrator's every-three-rejections pattern check (§13), and you — the run branch holds every rejection file, so you can always read *why* an artifact keeps bouncing. A loop that repeats the same finding usually means the phase's *input* is ambiguous; the fix is one phase up, not another iteration.

### 21. Resuming an interrupted run

Ask to work on the issue again; the orchestrator detects the in-progress pipeline and offers **Resume**. It verifies actual state from the completion predicates (each phase is complete only when its required artifacts are committed on the run branch — never from memory or optimism), then:

- **Between phases** — continues cleanly with the next phase.
- **Mid build/document with an approved plan** — resumes investigatively: inspects the commits and the diff, reverts partial-task work, re-dispatches from the last complete task.
- **Mid any other phase** — the phase restarts clean (its commits reverted — with your explicit confirmation first; a fork is offered as the alternative that preserves partial state).

---

## Part VII — Iterating: runs, revisions, forks, and versions

This is where the pipeline model pays off. The vocabulary:

- A **pipeline** is one attempt at an issue: a chain of **runs**. The first run is `base`; each **revision** (`rev-1-<desc>`, `rev-2-…`) is a fresh pass of the phase flow layered on top of a complete previous run. Each run's branch starts at the previous run's tip; the latest run branch is what merges to main.
- An issue's pipelines form a **family** (`v1`, `v2`, …): each new version is a **fork** — a different approach tried from a chosen point in an existing pipeline's history.

When you ask to work on an issue that already has pipelines, the orchestrator shows you the family tree and the three same-issue actions:

| Action | When | What happens |
|---|---|---|
| **Resume** | The latest run is incomplete | Finish it (§21) |
| **Revise** | The latest run is complete (through phase 4) and unmerged | New run branch on top; a fresh **revision intent** (with a mandatory, self-contained *Origin* section recording what prompted it — e.g. the substance of PR feedback); phases 1–4 re-run in the new run's folder, building on the existing work |
| **Fork** | You want a different approach, from any point | New version `v<N+1>` branched at a **cut commit** |

Rules of thumb the orchestrator itself applies: a drastic change that wouldn't layer cleanly ("redo this differently", architecture rework) → it recommends a fork over a revision. Several unrelated changes at once → split into sequential revisions, one each. Feedback on an already-merged pipeline → that's a *new issue*, not a revision.

### 22. Forks: branch the thinking, inherit the work

A fork picks a parent pipeline, a run, and the highest phase to inherit. The **cut commit** is the commit that completed that phase; the new version's branch starts there, so the inherited history *carries the inherited work itself* — artifacts, code, and commits, no copying. Everything above the cut is simply absent, and the fork re-runs or continues from there.

This is the mechanism behind several situations:

- **"The spec is right but the design took the wrong direction"** → fork cutting at `1-spec`, re-run design onward.
- **A blocker names a diverged artifact** → fork cutting *below* that artifact's phase, fix, relaunch.
- **"Let me try a fundamentally different approach"** → fork cutting at `0-intent`: same intent, everything else fresh, and `v1` remains intact for comparison.

Because all forks of a family share one artifact folder (the version lives in the *branch*, not the path), comparing approaches is trivial: `git show <ref>:<family-folder>/base/2-design-doc/design-doc.md` for each version's ref.

The orchestrator renders the family as a tree — phases as nodes, forks hanging from their cut point, `(modified)` marking inherited artifacts a fork rewrote:

```
#482-export-json
├── v1: 0-intent → 1-spec
│   ├── v1: 2-design-doc → 3-build → 4-document
│   │   └── v1 rev-1-fix-naming: 0-intent → … → 4-document [merged]
│   └── v2: 2-design-doc (in progress)
└── v3: 0-intent → 1-spec (in progress)
```

One more start-ref option when *creating* a pipeline: **stacking** — starting a new pipeline's base run at another pipeline's unmerged tip, for dependent issues that can't wait for the first to merge.

### 23. Multilane: buying determinism with tokens

The Spec and Design-doc phases can run **N lanes** — N independent executions of the phase's full machinery (lead + researcher + adversarial review, each lane to its own approval), merged by a **consolidator** whose output passes one final adversarial review. N=1, the default, is the plain single flow. The two modes answer different worries:

**Isolated lanes** (spec always; design-doc optionally) run in parallel, mutually blind, and answer: *"can I trust this artifact?"* Blind repetition converges on the same answer where the answer is solid — agreements confirm it — and what one lane caught that the others missed completes it. The consolidator merges on evidence strength (never majority vote), takes the union of discovered edge cases, and escalates as a blocker any product decision the lanes leave genuinely open. Choose it for high-stakes work where one good answer likely exists and you want reliability: this is the direct antidote to the non-determinism problem from §1.

**Divergent lanes** (design-doc only) run *sequentially*, each reading the previous lanes' designs, and answer: *"is there a better design than the obvious one?"* Each lane works a **mandate**: lane 1 designs from the spec alone; middle lanes must differ in at least one load-bearing decision; the last lane challenges a load-bearing premise all previous designs share. You can replace any lane's mandate with your own **angle** (e.g. "the minimal design that satisfies the spec"). The consolidator judges the alternatives, keeps the strongest, and records the rejected ones — so even the roads not taken are documented. Choose it when several architectures could plausibly win, or when you suspect the obvious design is a local optimum. It costs sequential time, and lanes may legitimately converge in a narrow design space — a declared, justified convergence is a valid outcome, not a failure.

Rule of thumb: routine work, 1 lane. Critical spec correctness → isolated ×2–3. Open architectural question → divergent ×2–3 with the angles you care about. Combined with the difficulty dial (§9), this is how you spend more tokens on the same surface — even mixing models from different providers — to converge on a more reliable output.

### 24. Assisted mode: you as the counterpart

Assisted mode covers the two *thinking* phases — Spec and Design doc. No agents are spawned; the orchestrator drives the phase directly **with you**: in the spec phase you answer the one-at-a-time Q&A yourself (with the orchestrator reading the codebase to ground its questions); in the design phase it proposes options with trade-offs per topic and you decide. The same artifacts are produced to the same structure, nothing is committed until you explicitly approve, and your approval becomes the phase's approval file — satisfying the same completion predicate an autonomous reviewer's would, so the pipeline continues identically either way (Build and Document always run autonomous).

Choose assisted when the phase's decisions genuinely need you: requirements that live in your head rather than in any researchable source, product judgment calls, architectural taste on a system you know deeply, or politically sensitive scope. Choose autonomous when the answers are discoverable — which is more often than assisted-mode habits suggest. A useful middle path: run the spec assisted (yours are the requirements), then everything else autonomous.

---

## Part VIII — Quick reference

### Decision cheat sheet

| Decision | Default | Reach for the alternative when… |
|---|---|---|
| Mode | Autonomous | The phase's answers live in your head, not in any researchable source → **Assisted** (spec/design only) |
| Target phase | Run everything | Large/ambiguous/risky work → **stop after Spec or Design doc**, review, relaunch |
| Spec lanes | 1 | Correctness of requirements is critical → **isolated ×2–3** |
| Design lanes | 1, isolated | Trust in one likely design → **isolated ×N** · open architecture question → **divergent ×N** (+ your angles) |
| Same-issue action | — | Run incomplete → **Resume** · complete & unmerged, layer changes → **Revise** · different approach / fix an approved artifact → **Fork** · merged → **new issue** |
| Start ref | Main branch | Depends on unmerged work → **stack** on that pipeline's tip |
| Difficulty (if configured) | Project default | Critical issue → raise reviewers/leads; routine → lower writers |

### Vocabulary

| Term | Meaning |
|---|---|
| **Owner** | You. The human running the pipeline; talks only to the orchestrator. |
| **Orchestrator** | The top-level agent executing the skill: loads conventions, creates topology, spawns agents, verifies completion, reports. |
| **Intent** | The phase-0 input: goal, constraints, context, open assumptions. |
| **Pipeline** | One attempt at an issue: a chain of runs. |
| **Run** | One pass of the phase flow: `base`, or `rev-<N>-<desc>` layered on a complete run. |
| **Pipeline family** | All of an issue's pipelines (`v1`, `v2`, …), sharing one artifact folder and branch-base. |
| **Fork / cut commit** | A new pipeline version branched at the commit that completed the last inherited phase. |
| **Lane** | One independent execution of a phase's full machinery, when running multilane. |
| **Consolidator** | The persistent agent that merges lane-approved artifacts and answers for the result through review. |
| **Completion predicate** | The per-phase set of committed artifacts that marks it complete — how state is always verified. |
| **Blocker** | An agent's stop-and-report when input is missing, contradictory, or would force a prior phase's decision. |
| **Guardrails** | The project's deterministic verification gates — exact commands judged pass/fail by exit code. |
| **Behavior verification** | The build reviewer exercising changed behavior end-to-end and capturing evidence before approval. |
| **Conventions / `.rp.md`** | The project-specific configuration the generic skill runs on. |

### The one-paragraph philosophy, to keep

Write intents as outcomes and under-specify them. Let the pipeline derive, decide, build, and document — with every claim checked, every artifact adversarially reviewed, every right question asked systematically rather than when a human remembers to, and every step committed. Review the artifacts, top-down. When something is wrong, don't fix the output — fix the artifact where the assumptions diverged, and relaunch from there; when a *question* was missing, add it to the methodology and every future run asks it. Spend lanes, difficulty, and tokens where correctness matters most: the trade is always machine resources for quality, determinism, and your time. Your attention is the scarce resource; the pipeline's job is to spend it only on decisions that actually need a human.
