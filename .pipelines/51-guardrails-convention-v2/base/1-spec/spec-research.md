# Spec Research — Add a Guardrails convention to formalize deterministic code-phase verification

_Source: GitHub issue [Automattic/radical-pipelines#51](https://github.com/Automattic/radical-pipelines/issues/51)._
_Pipeline: `51-guardrails-convention-v2` (v2 — starts over from intent; nothing inherited from the prior pipeline)._

## Rough idea

The code phase has a formally declared, deterministic, machine-checkable set of **guardrails** it must
pass before it can complete — each an exact command, judged pass/fail by exit code, and mandatory.
Guardrails is added as **one more convention** (an **optional**, not required, one) alongside the existing
project conventions: discoverable in the conventions loader, captured at setup, and referenced by name by
the code-phase agents — instead of the implicit "host project's verification convention" the agents reach
for today.

Open directions from the intent (to confirm or revise):

- Declare Guardrails as a new **optional** convention in the conventions loader
  (`reference/conventions/load.md` table) and the setup capture step.
- At **setup**, the orchestrator should (a) explain *why* guardrails matter (backpressure) and *what
  kinds* to add (tests, lint, typecheck, build, format, audit, …), and (b) **validate each command before
  writing it** — confirm it actually runs, is accessible/runnable by the agents in their environment, and
  exits cleanly — rather than recording commands blindly.
- Update `code-writer.md` and `code-reviewer.md` (and the doc-phase agents, if applicable) to read the
  **Guardrails** convention by name instead of the host project's verification convention.

## Key facts established from the codebase (before Q&A)

### The "verification convention" the agents reach for today

Repo-wide grep for `verification convention` (`agents/`, `skills/`) returns occurrences **only** in the
four phase agents — confirming the orchestrator's note:

- **`agents/code-writer.md`**: step 1.2 "Read the host project's verification convention"; step 3
  (behavior verification "using the host project's verification convention"); step 5 "Validate against the
  project's gates" — "The host project's verification convention defines a set of gates — unit tests,
  end-to-end tests, type checks, lints, build, behavior verification…"; step 5 bullet "If the verification
  convention itself is missing or unrunnable, that **is** a blocker"; blocker guideline lists "the
  verification convention is missing" as a blocker trigger.
- **`agents/code-reviewer.md`**: step 1.5 "Read the host project's verification convention"; step 2
  "No regressions / verification gates pass — run the host project's verification convention exactly as
  documented"; step 3 behavior verification; review template comment; blocker guideline ("the verification
  convention is undefined").
- **`agents/doc-writer.md`**: step 3 "If the host project's verification convention supports doc tests…";
  step 4 "Validate against the project's documentation gates" — "The host project's verification convention
  may enumerate gates relevant to documentation — link checking, markdown linting, render check, doc tests,
  spelling. Many projects rely on human review and enumerate none." + "If the verification convention
  itself is missing or unrunnable, that **is** a blocker"; blocker guideline.
- **`agents/doc-reviewer.md`**: step 2 "Doc gates — if the host project's verification convention
  enumerates documentation gates…"; guideline "Run the gates if any exist"; blocker guideline ("the
  verification convention is undefined").

Asymmetry to note: code-phase agents treat a **missing** verification convention as a blocker (they assume
gates exist); doc-phase agents already treat **enumerating none** as normal ("Many projects rely on human
review and enumerate none") — only a *missing/unrunnable* convention is a blocker for them too. The new
optional-guardrails model aligns the code agents toward the doc agents' "none is valid" stance.

### Conventions loader (`skills/radical-pipelines/reference/conventions/load.md`)

- Opens: "Project-specific conventions are stored in the `.rp.md` file. Read it at the start of any
  workflow."
- A `## Conventions` table with columns **Convention | What it covers | Required?**. Rows: Pipeline base
  slug (Yes), Artifact folder (Yes), Commit format (No), Issues (Yes), Worktrees (Yes), Branch names (Yes),
  Team spawning (No), Agent models (No), Health monitoring (Yes).
- `## Missing conventions`: if required ones are missing, route to `setup.md`; optional ones never block.
- `## Local overrides`: `.rp.local.md` git-ignored file overrides a restricted subset of conventions
  per labeled unit (from pipeline #91, already merged).

### Setup flow (`skills/radical-pipelines/reference/conventions/setup.md`)

- Numbered steps: 1 read tool rules; 2 collect required conventions (one capture sub-section per
  convention: slug, artifact folder, commit format, issues, worktrees, branch names, team spawning, agent
  models, health monitoring, artifact storage); 3 apply tool setup actions; 4 confirm writes; 5 write
  `.rp.md`; 6 set up git ignore; 7 finish safely.
- Each convention capture sub-section states required/optional and gives a suggested default.

### This repo's own `.rp.md` (the dogfood / reference example)

- Title `# Radical Pipelines project conventions`; a `## Shared conventions` section + per-tool sections.
- No `## Guardrails` section today, and no Agent-models block (optional, unused).
- Real command gates this repo runs (from `CONTRIBUTING.md`): `npm test` (the `node --test
  'scripts/test/**/*.test.mjs'` suite). CONTRIBUTING explicitly states "There is no `lint` or `typecheck`
  step — this repo has none." A changeset-shape validator also exists: `node scripts/validate-changesets.mjs`.

### Per-tool rules (`claude-code.md`, `pi.md`) and README

- `claude-code.md` declares the three tool-FORCED conventions (worktrees, branch names, team spawning,
  health monitoring) — canonical `.rp.md` block content. Guardrails are NOT tool-forced.
- README `## Configuration` section (lines ~141-159) documents the convention model for human readers,
  including the `.rp.local.md` local-overrides paragraph.

### Changeset convention (relevant because this PR touches release-relevant paths)

- `agents/**`, `skills/**`, `README.md` are release-relevant (`.changeset/config.json` `changedFilePatterns`).
  `.rp.md` and `.pipelines/**` are NOT release-relevant. So changes here DO require a changeset.
- Pre-1.0: a new feature is a `minor` bump (per `CONTRIBUTING.md`).

## Prior art — closed PR #112 (the v1 attempt)

PR [#112](https://github.com/Automattic/radical-pipelines/pull/112) ran a full pipeline for issue #51 and
was **closed without merging**. The close reason (luisherranz) is load-bearing for this v2:

> It bundles two separable changes: (1) renaming the umbrella concept "conventions" → "configuration"
> (conventions becoming a subsection), and (2) adding guardrails as part of that new structure. The rename
> is broad and was underspecified inside the guardrails PR. We're splitting it: the conventions →
> configuration rename is extracted into #113 and lands first; **Guardrails (#51) is re-scoped to be
> rebuilt as a new section within configuration, on top of that rename.**

**But then the re-scope was reversed again** (issue #51 comment, luisherranz):

> Re-scoped: dropping the 'configuration umbrella / section within configuration' framing and the
> dependency on #113 (now closed). **Guardrails will be added simply as one more convention** alongside
> the existing project conventions.

And DAreRodz's earlier "separate section within a configuration file" comment is marked **"EDIT:
dismissed."**

Additional confirmation (spec-researcher): the rename was extracted into issue **#113** and **PR #115**,
and **both were then closed unmerged**. luisherranz on #115: "Closing because for now it doesn't add any
benefit and only adds complexity." So the rename is dead twice over — once as bundled-and-extracted, once
as a standalone attempt rejected on its own merits.

**Net:** #113 and #115 are CLOSED, the configuration-umbrella rename is DEAD, and the v1 spec's central
premise — "Guardrails are deliberately **not** a convention" + restructure `.rp.md` into `## Conventions` +
`## Guardrails` siblings + retitle to "project configuration" — is **explicitly contradicted** by the
final re-scope. This v2 must implement guardrails as **one more (optional) convention**, NOT as a sibling
section and NOT with any `.rp.md` retitle.

### What PR #112 actually changed (still useful as mechanism reference, modulo the framing reversal)

Files it touched: `.rp.md`, `README.md`, all four phase agents, `load.md`, `setup.md`, `pi.md`, and a
changeset. Reusable mechanism details that survive the reframe:

- **Guardrail definition** (kept): "a mandatory verification gate defined as an exact command whose
  pass/fail is judged solely by its exit code: exit 0 = pass, any non-zero = fail. 'Run the tests' is not a
  guardrail; `npm test` is." Each declares **name**, **exact command**, **phase(s)** — valid phases `code`
  and/or `docs`. Tool-agnostic (no per-tool variants). Optional (absent/empty = "no command gates", never
  a blocker). Committed-only / not locally overridable.
- **Agent edits** (kept in spirit): the four agents read "the guardrails applicable to the phase" by name
  instead of "the host project's verification convention"; "no applicable guardrails" is explicitly not a
  blocker; the old "missing verification convention is a blocker" rule is removed; **behavior verification
  is preserved as a separate evidence-based step**, NOT reclassified as a guardrail.
- **Reference example** (kept): this repo's `.rp.md` declares its real gates (`npm test`, and the v1 PR
  also listed `node scripts/validate-changesets.mjs`).
- **What must change vs #112:** #112 restructured `.rp.md` into `## Conventions` + `## Guardrails` and
  retitled the file to "project configuration", and `load.md` said guardrails are "a sibling of
  `## Conventions`". The v2 re-scope kills all of that — guardrails should instead be a normal convention
  (its own capture step in setup, a row or equivalent in the conventions story), authored in `.rp.md` like
  any other convention.

NEW in this v2 intent (NOT present in #112): the setup step must **validate each guardrail command before
writing it** (run it, confirm it's accessible/runnable in the agents' environment, exits cleanly). #112's
setup step captured commands but did not require pre-write validation.

## Q&A

### Q1 — Concrete shape of "guardrails as one more convention" (loader row, value location, data model)

**Question:** (a) Does guardrails become a literal optional row in `load.md`'s `## Conventions` table?
(b) Is the value authored as a `### Guardrails` subsection inside the conventions area of `.rp.md` (no
file retitle, no top-level sibling)? (c) Does each guardrail still need (name, command, phase), and does
the convention carry a code/docs phase dimension at all — or scope to code-phase only?

**Answer (spec-researcher):** Confirmed on all three.

- **(a) Loader row — clean fit.** New row `Guardrails | <what it covers> | No` in the existing
  `| Convention | What it covers | Required? |` table (`load.md:11-21`), matching the optional-row pattern
  already set by Commit format / Team spawning / Agent models. Because the `## Missing conventions` logic
  (`load.md:23-29`) keys off **required** conventions, an optional Guardrails row correctly never blocks
  the pipeline when absent — consistent with the intent's "optional, not required." Suggested "What it
  covers" wording: "The project's deterministic verification gates (exact commands, judged by exit code)
  that code/doc phases must pass."
- **(b) Value location — confirmed, no rename.** Author guardrails as a `### Guardrails` subsection
  alongside the other `###` convention subsections under `## Shared conventions` (e.g. `### Commit format`
  `.rp.md:50`, `### Agent models` `:74`, `### Health monitoring` `:94`). File title `# Radical Pipelines
  project conventions` (`.rp.md:1`) stays; NO top-level `## Guardrails` sibling. This is the exact line
  #112 crossed (retitle to "…configuration" + `## Conventions`/`## Guardrails` split). The TODAY-dated
  (2026-06-10) re-scope is binding: "added simply as one more convention … This supersedes the earlier
  comment above that proposed a separate, non-convention section."
- **(c) Data model — keep (name, exact command, applicable phase(s)); keep the phase dimension; do NOT
  narrow to code-only.** Three reasons to keep docs in scope:
  1. The intent itself keeps docs in scope (`intent.md:22` "and the doc-phase agents, if applicable").
     Dropping docs would leave `doc-writer.md`/`doc-reviewer.md` pointing at a "verification convention"
     that no longer formally exists — reintroducing the exact "agents reach for something that doesn't
     formally exist" problem the intent kills (`intent.md:9`).
  2. The four agents already split along a code/docs line with different semantics (code = mandatory &
     usually present; docs = "many projects enumerate none", `doc-writer.md:40-44`, `doc-reviewer.md:33`).
     A per-guardrail phase tag (code vs docs) expresses "these gate code, these gate docs, a project may
     have only code gates" — matches reality.
  3. #112 already converged on `Name | Command | Phases` (phases ∈ {code, docs}); that model was NOT the
     reason it was closed (the rename was). Tried and not objected to.
  Researcher's recommendation: carry a phase dimension, with code gates the common case and docs gates
  expressible-but-optional. Flagged tension if we narrow to code-only: the spec would then have to
  explicitly say the doc agents' "verification convention" is intentionally left informal — which sits
  awkwardly against the intent's stated goal. Recommends surfacing this as a decision rather than silently
  narrowing.

**Q1 refinements (second pass):**

- **Table-cell phrasing:** no special table mechanics; the "What it covers" cell is a terse one-liner like
  every other row, but should SIGNAL the executable/exit-code nature so a reader knows the value is
  executable not advisory — e.g. "The deterministic verification gates (exact commands, judged pass/fail by
  exit code) the code/doc phases must pass." The fuller "what a guardrail is" definition (exact command,
  exit 0 = pass) belongs in `setup.md`'s capture step and/or the `### Guardrails` body, NOT crammed into
  the table cell — consistent with how the table stays terse while setup.md carries detail (cf. the long
  Agent models / Artifact storage setup entries vs their terse table rows).
- **Three fields all earn their place:** **command** is the guardrail (exact string run, judged by exit
  code); **name** is needed because the intent's core ask is "referenced by name" and the review template
  records "each gate's command and result" — without names you can't say "the lint gate failed";
  **phase** is needed because the four agents split code vs docs. "Just a convention" changes the
  *packaging* (a row + a subsection), not the information content.
- **Optional 4th field — flagged, NOT mandated:** an "expected evidence" field for behavioral/subjective
  gates (intent line 10 mentions "behavioral/AI-as-judge gates for subjective criteria"). Enhancement, not
  v1-required. Note this couples with the separate decision that **behavior verification stays its own
  evidence-based step and is NOT a guardrail** — so a v1 guardrail is purely a deterministic exit-code
  command; subjective/AI-judge gates are explicitly out of the v1 guardrail data model. (Confirm in Q2c.)
- **Phase field = YES (definitive).** Word everything assuming a phase dimension. If later narrowed to
  code-only, the ONLY data-model change is dropping the phase field and leaving doc-writer/doc-reviewer
  wording untouched.

**Concrete grounding — this repo's real gates** (it's the reference example): `node
scripts/validate-changesets.mjs` (researcher ran it: exit 0, clean), `npm test` (node --test on
`scripts/test/**`), `npx changeset status --since=<base>` — all three are the CI gates in
`.github/workflows/changeset-gate.yml`, each an exact command judged by exit code → fits (name, command,
phase=code). **Live caveat for the setup-validation question:** running `npm test` from the worktree shell
exited non-zero due to a glob-expansion quirk (`scripts/test/**/*.test.mjs` not expanding as `node --test`
wanted in zsh at that cwd), while `validate-changesets.mjs` ran clean. Direct evidence that "validate each
command before writing" is environment-sensitive and non-trivial.

**Spec-analyst independently reproduced and characterized the `npm test` failure** (motivating evidence for
the setup-validation requirement; itself a tangential pre-existing repo bug, NOT in this spec's scope):

- `package.json` `test` script = `node --test 'scripts/test/**/*.test.mjs'`. The glob is **single-quoted**,
  so the shell passes it literally to `node --test`.
- On Node **v20.19.4** (the version in this environment), `node --test` does NOT expand `**` globs itself.
  Result: `npm test` → `Could not find '…/scripts/test/**/*.test.mjs'` → **exit 1**.
- The underlying tests are fine: `node --test scripts/test/*.test.mjs` (shell-expanded single-star glob)
  runs **22/22 pass, exit 0**.
- Takeaway for THIS spec: the command a project believes is its gate (`npm test`) does not actually exit
  cleanly in the agents' worktree environment on this Node version. This is the textbook case the intent's
  "validate each command before writing it" requirement is meant to catch — a blindly-recorded `npm test`
  guardrail would be a gate the agents can never pass. (Separately worth flagging to maintainers as a repo
  bug, but fixing the npm script is out of scope for the guardrails feature.)

### Q2 — Per-agent rewrite contract: doc-agent scope, blocker semantics, behavior verification, leave-alone

**Question:** (a) all four agents or only the two code agents, and do doc agents read docs-tagged
guardrails specifically? (b) does the code agents' "missing verification convention = blocker" rule get
removed/inverted so absent guardrails is non-blocking for all four? (c) does behavior verification survive
as a separate, non-guardrail, de-coupled step? (d) the leave-alone list of other "host project's X
convention" references — any ambiguity?

**Answer (spec-researcher):**

- **(a) All four agents in; doc agents read DOCS-tagged guardrails only.** code-writer (lines 13, 46) and
  code-reviewer (lines 18, 32) read **code-phase** guardrails; doc-writer (lines 35, 40-44) and
  doc-reviewer (line 33) read **docs-phase** guardrails. A code-tagged guardrail never runs in docs and
  vice versa — this is the entire reason the phase field exists. Repo-wide grep (`agents/`, `skills/`,
  `AGENTS.md`, `README.md`) confirms **only these four files** reference "verification convention" — there
  is no hidden fifth consumer, so the four-agent rewrite is the complete surface.
- **(b) The blocker-semantics flip — YES, intended, and the subtle heart of the rewrite. Two tangled
  notions must be SPLIT.** Today the agents conflate (1) convention **absent/empty** → blocker, and (2) a
  declared command **unrunnable** → blocker. Under optional guardrails these separate:
  - **Absent/empty guardrails for a phase = valid, non-blocker; run none and proceed — for ALL four
    agents.** This removes: code-writer line 51 ("missing or unrunnable … is a blocker") and line 70's
    "verification convention is missing" blocker example; code-reviewer line 98's "undefined" example;
    doc-writer line 45 and line 65's clause; doc-reviewer line 99's example. **Net: there is no longer ANY
    "guardrails missing = blocker" path.**
  - **Keep a RESIDUAL blocker for the declared-but-unrunnable case:** if a guardrail IS declared and its
    command can't run / errors in a way that isn't a normal test failure (binary doesn't exist, script
    missing), that's still a real blocker — a declared gate the agent can't honor. Distinct from "no gates
    declared." Setup's "validate each command before writing it" prevents this at authoring time, but the
    agent still needs the residual guard for drift. Word it as: *absent guardrails = proceed; a
    declared-but-unrunnable guardrail = blocker* — NOT the conflated "missing or unrunnable = blocker."
    **This two-way split is the single easiest thing to get wrong; the spec must state it explicitly.**
    (Note: a guardrail that runs and exits non-zero = normal failing gate = WORK to fix, never a blocker —
    same as today. The residual blocker is only for "the command itself cannot execute.")
- **(c) Behavior verification survives as its own step, de-coupled, NOT a guardrail.** Today it lives in
  code-writer step 3 (line 36) and code-reviewer step 3 (line 36), both phrased "using the host project's
  verification convention" — the dangling reference. Behavior verification is **evidence-based and
  subjective** (screenshots/transcripts/output samples/response diffs, judged by a human/agent looking);
  guardrails are **deterministic exit-code commands**. Categorically different — folding it in would break
  the intent's own definition ("each an exact command, judged pass/fail by exit code"). The intent itself
  separates them (line 10: "deterministic gates" vs "behavioral/AI-as-judge gates for subjective
  criteria"). So v2 must (i) keep it as its own step in both code agents; (ii) NOT make it a guardrail;
  (iii) re-word it to stand alone ("exercise the changed user-observable behavior end-to-end yourself and
  capture the evidence"), dropping the convention anchor. **Subtlety:** behavior verification currently
  *sources* its "how to exercise / what evidence" from the verification convention; after de-coupling that
  guidance must live in the step itself (the agent drives the behavior and decides appropriate evidence) —
  the spec must say so, since there's no convention to defer to anymore.
- **(d) Leave-alone list — guardrails replaces ONLY verification/command-gate refs.** Untouched (NOT
  guardrails, must stay): inline API-documentation convention (code-writer 29, code-reviewer 30); testing
  convention (code-writer 42); UI conventions (code-writer 38); coding/build conventions (code-reviewer
  31); commit format (code-writer 56, code-reviewer 84, doc-writer 50, doc-reviewer 85); **documentation
  convention** = voice/structure/formatting/cross-linking (doc-writer 17 & 27, doc-reviewer 19 & 32).
  - **Genuine ambiguity resolved — the naming-collision trap:** doc-writer step 4 "documentation **gates**"
    (lines 40-44) and doc-reviewer "Doc **gates**" (line 33) ARE guardrail targets, NOT doc-convention
    targets — proven by both sourcing the gates from "the host project's **verification** convention"
    (link-check, markdown-lint, render-check, doc tests, spelling). Rewrite these to "docs-phase
    guardrails." Do NOT confuse with doc-writer 17/27's "documentation **convention**" (voice/structure),
    which is leave-alone. The spec MUST name these distinctly ("documentation convention" vs "docs-phase
    guardrails") — this collision is the trap. Also: doc-writer line 35 ("if the verification convention
    supports doc tests, exercise them") is a guardrail reference → rephrase to "if a docs-phase guardrail
    covers doc tests."

**Rewrite-contract summary:** 4 agents, ~14 line-level edits, three buckets — (1) replace "host project's
verification convention" → "guardrails applicable to the {code|docs} phase" (the read step + the
run-the-gates step); (2) flip absent-guardrails to a non-blocker proceed-state while keeping a residual
declared-but-unrunnable-command blocker; (3) de-couple behavior verification's wording while keeping it as
its own step. Everything else (inline-doc, testing, UI, coding, commit, documentation conventions)
untouched.

**Spec-analyst note for Q3 (setup timing constraint, established from `setup.md`):** setup runs "when
required conventions are missing **before a workflow starts**" (`setup.md:3`). At setup time **no pipeline
worktree exists yet** — the worktree is created later by `EnterWorktree`/`/worktree create` when a workflow
begins. So the orchestrator runs setup in the **main checkout**, not in `.claude/worktrees/<slug>`.
Consequence for the "validate in the agents' environment" requirement: it cannot literally mean "run it in
the worktree" at setup time. The realistic parity is "the same machine / repo / shell the agents will
inherit" — which still catches command-not-found, not-installed, and bad-invocation errors (the live
`npm test` glob failure would still be caught). Worth stating the achievable bar explicitly so the
requirement is testable rather than aspirational.

### Q3 — "Validate each guardrail command before writing it" at setup: semantics, pass criterion, failure handling

**Question:** (a) what does "validate" concretely mean — exit 0, or "resolves and runs"? (b) environment
parity — explicit requirement or best-effort? (c) failure handling? (d) per-command scope and "none" still
valid? (e) does setup-time validation make the agent-side residual blocker unnecessary, or are they
complementary?

**Answer (spec-researcher) — backed by a live three-outcome experiment in this worktree:**

Experiment (captured exit codes): `nonexistent-linter --check` → **exit 127** (not found = UNRUNNABLE);
`node -e "process.exit(1)"` → **exit 1** (resolved, executed, "failed the gate"); `node
scripts/validate-changesets.mjs` → **exit 0** (resolved, executed, passed). Plus the earlier `npm test`
glob case = "didn't actually run as intended." → **Three distinguishable outcomes:** (i) **unrunnable**
(127 not-found / 126 not-executable / wrong cwd-shell so it never really executes), (ii)
**runs-but-exits-nonzero** (gate legitimately fails right now), (iii) **runs-and-exits-0**.

- **(a) Pass bar = "resolves and actually executes in the agents' environment," NOT "exit 0." Be firm.**
  "Exits cleanly"/"actually runs" means outcome (i) is absent — found, executable, runs to completion in
  the right context — regardless of whether the gate passes. The killer counter-example (analyst's, agreed):
  a brand-new or mid-development project legitimately has failing tests, so `npm test` exits nonzero TODAY
  yet is a perfectly valid guardrail; if the bar were "exit 0," setup would refuse to record valid gates
  exactly when the project most needs them (red tests are the whole point of backpressure — the agent loops
  until green). So outcome (ii) "runs but fails" is a **PASS** for validation (proves it's a real runnable
  gate; the failing result is just today's code). **Caveat to keep in the spec, not gloss:** exit codes are
  a *heuristic*, not proof — 127/126 are strong "unrunnable" signals but a wrapper script can exit 127 for
  internal reasons, and some tools print "not found"-style errors while exiting 0. Frame validation as "the
  orchestrator runs the command and, with the owner, confirms it actually executed (vs errored as
  unrunnable)" — exit code is the primary signal, owner judgment arbitrates ambiguous cases. Do NOT
  over-mechanize into "exit code must be N."
- **(b) Environment parity = REAL requirement with a stated floor, not best-effort.** The `npm test` repro
  is the proof: the SAME command behaved differently by cwd/shell. Agents execute inside the worktree via
  the same tool surface; validating in "the orchestrator's convenient shell" gives false confidence.
  Recommend setup runs validation **in the context the agents will use** — worktree cwd, agents' shell/tool
  surface — so "validated" means "validated where it'll actually run." This is the single most valuable
  thing the new requirement buys over #112 (which had no validation). **Pragmatic honesty:** perfect parity
  is impossible (env vars, secrets, network differ), so word it as "validate in a context matching the
  agents' execution environment as closely as the orchestrator can — at minimum the worktree working
  directory and the project's standard shell." Explicit goal + stated floor, not an absolute. _(Analyst
  caveat, reconciled: setup runs before any worktree exists per `setup.md:3` — so the realistic floor is
  "same machine/repo/standard shell"; if a worktree-equivalent context is reachable at validation time use
  it, otherwise the main-checkout standard shell is the floor. The point is parity-as-close-as-possible,
  not a specific directory.)_
- **(c) Validation failure → do NOT write that command; surface it; owner corrects/replaces/drops. Loop,
  don't hard-stop.** Aligns with `setup.md:186` ("do not create a misleading complete conventions file") —
  an unrunnable command is a misleading entry — and step 4's confirm-before-write. Shape: validate each
  captured command; if it errors as unrunnable, tell the owner exactly how it failed (error + exit code)
  and offer (a) fix/replace, (b) drop that guardrail, (c) keep only if the owner explicitly insists it's
  correct and the environment is the issue (escape hatch; default is don't-write-unvalidated). NOT "write
  anyway but warn" (recreates the broken-gate problem). NOT "hard-stop setup" (guardrails is OPTIONAL — one
  bad command shouldn't kill the whole conventions capture; drop it and finish). Per-command correction
  loop, graceful, never silently persists a known-broken gate.
- **(d) Per-command, only over what the owner provides; zero guardrails = nothing to validate = valid.**
  Confirmed. "None" is a complete valid answer (like Commit format being absent) — don't manufacture a
  failure from emptiness. Validation is **per-row, independent**: one unrunnable command doesn't void the
  others or block writing the good ones; mirrors how each guardrail is an independent gate at run time.
- **(e) Complementary, NOT redundant — frame as a pair.** Setup-time validation = **authoring-time gate**
  (catches typo / wrong command / tool-not-installed before it's ever written; reduces but can't eliminate
  bad gates). Agent-side residual blocker = **run-time drift guard** (a command validated once can rot:
  dependency removed, script renamed, tool uninstalled, different machine). Different time windows (author
  vs run) and failure sources (bad input vs drift); neither subsumes the other. **The conceptual spine:**
  BOTH use the SAME A2b distinction — *unrunnable = problem* (blocker at run / refuse-to-write at setup),
  *runs-but-exits-nonzero = legitimate work, not a problem*. "Did it execute?" vs "did the gate pass?" is
  the single distinction tying Q2b and Q3 together; state it explicitly so the two requirements read as one
  coherent model.

**Net (researcher's one-sentence framing):** "The orchestrator runs each captured guardrail command in a
context matching the agents', confirms it actually executes (not that it passes), and refuses to write any
command that errors as unrunnable — surfacing the failure for the owner to fix, replace, or drop; zero
guardrails is a valid empty state; this authoring-time check complements, and does not replace, the agent's
run-time unrunnable-guardrail blocker."

**Spec-analyst groundwork for Q4 (verified before the researcher's answer):**

- **Candidate gate commands for the reference example** (run in this worktree):
  - `node scripts/validate-changesets.mjs` → **exit 0**, clean. Fixed command, no parameters. Best
    reference gate.
  - `npx changeset status --since=trunk` → **exit 0**; `npx changeset status` (no `--since`) → **exit 0**.
    BUT this gate is **parameterized** — CI passes `--since=origin/<base>` where `<base>` is the PR's base
    branch (`.github/workflows/changeset-gate.yml`). A guardrail is a *fixed* exact command; a base-ref that
    varies per run makes `changeset status` awkward to declare as a single guardrail string. Note for Q4a.
  - `npm test` → **exit 1 / unrunnable** (the Node-v20 quoted-`**`-glob bug; tests pass 22/22 when invoked
    as `node --test scripts/test/*.test.mjs`). Under Q3's rule, setup would REFUSE to write `npm test` here.
- **Local-overrides mechanism as #91 actually shipped** (`load.md` `## Local overrides`, `.pipelines/91`
  spec): the current `load.md` section is GENERIC — "override a restricted subset of conventions" — and does
  NOT enumerate which conventions are overridable. #91's spec gives two relevant rules: (rule 12/13) only
  conventions governing the developer's **local runtime behavior** that don't flow into committed artifacts
  or shared naming are overridable; an attempt to override a shared-output convention is **ignored + warned**.
  (rule 14/15) a project may **explicitly mark** a convention/unit non-overridable, and a conflicting local
  value is **ignored + warned, naming the unit**. So guardrails-non-overridability could be conveyed either
  by general principle (it's a shared mandatory contract, like commit format → already on the ignore side) or
  by an explicit marker. Either way the resolution behavior (#91 rule 15) already exists: ignore + warn.

### Q4 — Reference example gates (the dogfood `.rp.md`) + local-overrides interaction

**Question:** (a) which command(s) should this repo's reference `### Guardrails` declare, given the `npm
test` failure, and is fixing the npm script in-scope? (b) is Guardrails excluded from the locally-overridable
subset, what happens if a developer overrides one, and does it need any new mechanism?

**Answer (spec-researcher), with a finding that reframes (a):**

- **(a) CRITICAL CORRECTION: `npm test` is NOT broken — it is ENVIRONMENT-DEPENDENT, and this is the
  single best live illustration of the whole feature.** Tested on Node v20.19.4:
  - `npm test` script = `node --test 'scripts/test/**/*.test.mjs'` (quoted `**` glob). `node --test` gained
    **built-in glob support in Node 21**; **CI runs Node 22** (`changeset-gate.yml:26` `node-version: 22`,
    verified by analyst). On Node 21+/22 the quoted glob expands and tests run green → `npm test` PASSES in
    CI and on any Node ≥21. It fails ONLY on a stale local Node 20. No `engines` pin (verified) so the
    working version isn't enforced.
  - `node --test scripts/test/*.test.mjs` → exit 0 (shell-expanded; works on 20 too). `node --test
    scripts/test/` (directory form) → exit 0 (works on 20+, analyst verified). `npx changeset status` → exit
    0. `node scripts/validate-changesets.mjs` → exit 0.
  - **This is the perfect Q3(b) parity proof:** the SAME `npm test` is a valid passing guardrail in the
    agents' likely env (Node 22 = CI) and "unrunnable" on a stale local Node 20. Whether setup "refuses to
    write `npm test`" depends ENTIRELY on validating in the agents' actual environment — exactly why parity
    must be a real requirement.
  - **Researcher's call on what the dogfood `### Guardrails` declares:** (1) declare the REAL intended
    commands — `npm test`, `node scripts/validate-changesets.mjs`, `npx changeset status --since=<base>` —
    because those are literally this project's CI gate steps; a dogfood should show real gates, not
    artificially simplified ones. (2) Do NOT substitute a deliberately-different "working invocation"
    (`node --test scripts/test/*.test.mjs`) to dodge the Node-20 issue — it would diverge from the project's
    real `npm test` entry point and hide the parity lesson. (3) **Fixing the npm script is OUT OF SCOPE** for
    this feature — bundling an unrelated build-script fix is exactly the scope-creep that closed #112. If the
    team wants `npm test` robust across Node versions (e.g. directory form, or pin `engines.node >=21`),
    file a separate tiny issue. (4) **Spec-writer note:** the dogfood `.rp.md` must be authored to validate in
    the environment the maintainers actually run (Node ≥21 for `npm test`); in a CI-parity (Node 22) env all
    three validate clean today, so there's no blocker to dogfooding the real gates.
  - **Open decision for the spec-writer (analyst):** `npx changeset status --since=<base>` is
    **parameterized** — the base ref varies per run (CI passes `origin/<base>`). A guardrail is a *fixed*
    exact command. So `changeset status` is awkward to declare as a single literal guardrail string; the spec
    should either (i) declare it with a concrete default base (e.g. `--since=origin/trunk`), (ii) omit it from
    the dogfood gates in favor of the two unambiguous ones (`npm test`, `validate-changesets.mjs`), or
    (iii) note that some gates are inherently parameterized and how guardrails handles that. Flag, don't
    silently pick.
- **(b) Guardrails is NON-overridable for FREE — no new mechanism, pure documentation.** Confirmed against
  the shipped #91 spec:
  - **#91 requirement 12** (the overridable subset) is exactly Agent models, Health-monitoring cadence,
    Issues access-mechanism — "conventions whose value governs the developer's local runtime behaviour and
    does not flow into committed artifacts or shared naming." **Guardrails is NOT in that set** — a mandatory
    gate is a must-hold-for-everyone contract, the antithesis of local-runtime-only. So guardrails is
    non-overridable by default, no special-casing.
  - **#91 requirement 16** already specifies the behavior for a unit not in the overridable subset: "the
    attempt is ignored, the committed value is used, and the run output warns, naming the unit and stating
    that it is not locally overridable because it is shared across collaborators." Guardrails inherits this
    **for free**, identical to commit format / slug / branch names. A developer who puts a guardrail in
    `.rp.local.md` gets ignore + warn — defined behavior, zero code to add.
  - **Belt-and-suspenders (optional, NOT recommended to rely on):** #91 requirement 14 lets a project
    explicitly mark a convention non-overridable. Guardrails doesn't NEED it (already out via req 12);
    staying out of the req-12 set is sufficient and cleaner.
  - **Pure documentation matter:** #91 requirement 20 already mandates the loader docs state the
    "overridable-versus-shared guidance." This feature's only local-overrides obligation is a **one-line
    addition** to `load.md`'s `## Local overrides` (or the overridable-vs-shared guidance) noting guardrails
    sits on the shared/non-overridable side — so a developer isn't surprised it can't be locally weakened.
    #112's bespoke "guardrails are committed-only and not locally overridable" rule was needed only because
    guardrails was a SIBLING then; as a convention now, the outcome is automatic via the req-12 dividing
    line — don't restate a bespoke rule, just place it on the correct side.

### Q5 — Docs surfaces, changeset, definitive out-of-scope list, acceptance-criteria spine

**Question:** (a) Is the README/website update deferred to the docs phase (out of scope for this spec)?
(b) Is a `minor` changeset required and is the changeset itself a guardrail? (c) Is the proposed 10-item
out-of-scope list complete? (d) Is the 9-point acceptance-criteria spine complete and testable?

**Answer (spec-researcher) — all four confirmed, with two additions to (c) and three refinements to (d):**

- **(a) README/website = DOCS PHASE; out of scope for THIS spec. Agreed.** Spec surface = `load.md` +
  `setup.md` + the four agents + this repo's `.rp.md`. README `## Configuration` prose (incl. the
  local-overrides paragraph) is phase-5 territory — #112 did exactly this. **Precision:** `.rp.md` IS in the
  spec's scope (it's config + the worked example, not human docs); only the human-facing README/website
  prose defers to docs.
- **(b) `minor` changeset required — confirmed, config verified.** `changedFilePatterns` (verified by
  analyst) = `skills/**`, `agents/**`, `.claude-plugin/**`, `package.json`, `README.md`. The spec's edits to
  `agents/**` (four agents) and `skills/**` (load.md, setup.md) are release-relevant → changeset required.
  `.rp.md` and `.pipelines/**` are NOT release-relevant (a `.rp.md`-only change would need none, but this
  touches agents/skills). Bump = **`minor`** (CONTRIBUTING: minor = new feature/backwards-compatible
  addition; `validate-changesets.mjs` hard-forbids `major` pre-1.0; version `0.2.0`). **The changeset is
  AUTHORED, not a gate — it is NOT itself a guardrail.** Subtlety worth noting: `npx changeset status` and
  `node scripts/validate-changesets.mjs` ARE this repo's guardrails (A4) and are what enforce the
  changeset's presence/shape at gate time — so the changeset is the *thing the gate checks*, not a gate. No
  circularity.
- **(c) Out-of-scope list — the 10 are correct; ADD two for airtightness:**
  - (11) **No retroactive back-filling** of guardrails into existing/other pipelines or other consuming
    projects' `.rp.md`. The feature ships the convention + this repo's dogfood declaration only; it does not
    go declare guardrails elsewhere (no migration).
  - (12) **No changes to the phase-reference docs** (`reference/autonomous-phases/4 - code.md`, `5 -
    docs.md`, and assisted equivalents) or the orchestrator's phase-loop behavior. More specific than item 6
    (don't redesign the loop) — names the files so nobody rewires them. **Analyst verified:** those phase
    docs reference neither "verification convention" nor "guardrails" today (grep clean), so they need no
    edit. The agents read guardrails; the dispatch orchestration is unchanged.
  - **Scope-IN flip side of OOS item 4:** the `### Guardrails` subsection lives in the **shared /
    tool-agnostic** area of `.rp.md` (NOT a per-tool section), because a guardrail is a command judged by
    exit code with nothing tool-specific (unlike worktrees/team-spawning which ARE per-tool in
    `claude-code.md`/`pi.md`). State this explicitly.
- **(d) Acceptance spine — all nine testable; two sharpenings + one addition + a grep-negative:**
  - **(v) sharpen to the explicit THREE-WAY split** (the Q2b/Q3 spine; assert all three branches): absent/
    empty guardrails for the phase ⇒ run none and proceed (NOT a blocker); a *declared* guardrail whose
    command does not resolve/execute (unrunnable) ⇒ blocker; a guardrail that runs and exits nonzero ⇒ work
    (agent loops/fixes), not a blocker.
  - **(vii) make the parity bar concrete + include the runs-but-fails-IS-WRITTEN clause:** setup runs each
    captured command in a context matching the agents' execution environment (at minimum the worktree
    working directory and the project's shell) and writes it only if it resolves-and-executes (not
    127/126-style unrunnable); an unrunnable command is surfaced to the owner and NOT written; **a command
    that runs but exits nonzero IS written (it's a valid gate)** — this last clause is the one most likely to
    be omitted and is the `npm test`/red-tests case.
  - **ADD (x): optionality is end-to-end.** A project/phase with zero guardrails flows through setup (capture
    accepts "none"), load (no missing-required block), and all four agents (proceed, run none) with NO
    blocker and NO warning anywhere. Spans setup+load+agents; (i) alone only covers the load.md row. Without
    (x) a spec could satisfy (i)-(ix) yet have a setup step that refuses to finish on empty guardrails.
  - **ADD (xi): the grep-negative** — after the change, no agent contains "verification convention" for the
    command-gate role. Distinct from (iv): "references guardrails" and "no longer references verification
    convention" are two checks; a sloppy edit can pass the first while failing the second (e.g. doc-writer
    line 35's "if the verification convention supports doc tests" straggler). Analyst confirmed grep: the
    string lives in exactly the four agents today and nowhere else in-scope.

**Researcher's net:** spine sound; added (x) end-to-end optionality + (xi) grep-negative, sharpened (v) to
the three-way split and (vii) to the runs-but-fails-is-written clause, extended OOS with (11) no-backfill +
(12) phase-docs-untouched. Tightenings, not corrections.

**Final scope confirmation (analyst grep):** `"verification convention"` appears in EXACTLY the four phase
agents (`agents/code-writer.md`, `code-reviewer.md`, `doc-writer.md`, `doc-reviewer.md`) and nowhere else
outside `.pipelines/`. The phase-reference docs are clean. The four-agent rewrite is the complete code
surface for the string replacement.

## Consolidated Requirements

Each requirement is an observable outcome. **Scope of this spec:** the conventions loader
(`skills/radical-pipelines/reference/conventions/load.md`), the setup flow
(`skills/radical-pipelines/reference/conventions/setup.md`), the four phase agents
(`agents/{code-writer,code-reviewer,doc-writer,doc-reviewer}.md`), and this repository's own committed
`.rp.md` (the dogfood worked example). Guardrails is a **product capability of Radical Pipelines** that
applies in every consuming project; this repo is the dogfood instance. **Guardrails is added as one more
OPTIONAL convention** — not a sibling section, not a config-umbrella rename (both dead per #113/#115).

### The Guardrails concept

1. A **guardrail** is a mandatory verification gate defined as an **exact command** whose pass/fail is
   judged **solely by its exit code** (exit 0 = pass, any non-zero = fail). "Run the tests" is not a
   guardrail; `npm test` is.
2. Each guardrail declares three things: a human-readable **name/label**, the **exact command** to run, and
   the **phase(s)** it applies to. The only valid phase targets are **`code`** and **`docs`**; a guardrail
   may apply to one or both.
3. Guardrails are **tool-agnostic**: the same guardrail applies regardless of the active agentic coding tool
   (Claude Code, Pi, …). There are no per-tool guardrail variants, and the guardrails declaration lives in
   the shared / tool-agnostic area of `.rp.md`, not a per-tool section.
4. Guardrails are **optional**. A project may declare none. An absent or empty guardrails declaration means
   "this project has no command gates" and is a valid, complete state — never a blocker and never a warning.
5. **Behavior verification is NOT a guardrail.** Exercising user-observable behavior and capturing
   subjective evidence (screenshots, transcripts, output samples, response diffs) is a separate,
   evidence-based agent responsibility, distinct from a deterministic exit-code command. (An optional
   "expected evidence" field for behavioral/AI-judge gates is explicitly deferred — not part of v1.)

### Guardrails as a convention (loader, `.rp.md` shape)

6. `load.md`'s `## Conventions` table gains a new row for **Guardrails**, marked **`No`** in the Required?
   column (optional). The "What it covers" cell is a terse one-liner that signals the executable / exit-code
   nature (e.g. "The deterministic verification gates — exact commands judged pass/fail by exit code — the
   code/doc phases must pass").
7. Because the table's `## Missing conventions` logic keys off **required** conventions, an absent Guardrails
   convention never blocks the pipeline and never triggers the setup-required flow. A project with no
   guardrails still passes the required-completeness check.
8. `load.md` documents what a guardrail is (exact command, judged by exit code, mandatory within its
   phase(s), optional/absent = no command gates) and how an agent loads the guardrails applicable to a phase
   (select the guardrails whose phase(s) include the current phase; an empty selection = run none, proceed).
9. The project's guardrails are authored in `.rp.md` as a **`### Guardrails` subsection** alongside the
   other `###` convention subsections, in the shared/tool-agnostic area. The file title (`# Radical
   Pipelines project conventions`) is unchanged, and there is NO top-level `## Guardrails` sibling section
   and NO retitle of the file to "configuration".

### Setup capture with command validation (new in v2)

10. `setup.md` gains an **optional** guardrails-capture step, presented as a distinct convention consistent
    with the existing one-capture-step-per-convention pattern. It explains *why* guardrails matter (the
    backpressure rationale) and *what kinds* to consider (tests, lint, typecheck, build, format, audit,
    e2e, project-specific validators), and captures per gate a **name**, the **exact command**, and the
    applicable **phase(s)**. "None" is a complete, valid answer.
11. Before writing a captured command to `.rp.md`, the orchestrator **validates** it: it runs the exact
    command in a context matching the agents' execution environment (at minimum the worktree working
    directory and the project's shell — as close to the agents' environment as the orchestrator can reach)
    and confirms the command **resolves and actually executes** (it is found, is executable, and runs to
    completion — not a 127/126-style "unrunnable" error). The **pass bar is "it executed," NOT "exit 0."**
12. A command that **runs but exits non-zero** (the gate legitimately fails right now — e.g. red tests in a
    mid-development project) **IS written**: it is a valid guardrail; the failing result is just today's
    state of the code.
13. A command that **errors as unrunnable** is **NOT written**: the orchestrator surfaces the failure to the
    owner (the error and exit code) and offers to fix/replace the command, drop that guardrail, or — only if
    the owner explicitly insists it is correct and the environment is the discrepancy — keep it as an escape
    hatch. The default is "do not write an unvalidated command." Validation never silently persists a
    known-unrunnable gate.
14. Validation is **per-command and independent**: each captured command is validated on its own; one
    unrunnable command does not void or block writing the others. Zero captured guardrails = nothing to
    validate = valid complete state (no manufactured failure from emptiness).
15. Exit codes are the **primary signal but a heuristic, not a proof** (a wrapper can exit 127 for internal
    reasons; some tools print "not found"-style errors while exiting 0). For ambiguous cases the orchestrator
    confirms with the owner whether the command actually executed; the requirement is "confirm it executed,"
    not "exit code must be a specific number."

### Agent behavior — the four phase agents (code + docs)

16. `code-writer.md` and `code-reviewer.md` read **the guardrails applicable to the code phase** (the
    code-tagged guardrails) by name where they currently read "the host project's verification convention"
    for the command-gate role; `doc-writer.md` and `doc-reviewer.md` read **the guardrails applicable to the
    docs phase** (the docs-tagged guardrails) likewise. A code-tagged guardrail never runs in the docs phase
    and vice versa.
17. Each such agent runs **every** guardrail applicable to its phase, treats each as **mandatory**, does not
    complete while any of them fails, and does not bypass any (no `--no-verify`, no `skip`, no commented-out
    checks). A guardrail that runs and exits non-zero is **work to fix, not a blocker**.
18. **Absent/empty guardrails for the phase is a valid, non-blocker state for all four agents:** the agent
    runs none and proceeds. The previous rule that treated a missing verification convention as a blocker is
    removed — there is **no longer any "guardrails missing = blocker" path** in any of the four agents.
19. A **declared** guardrail whose command **does not resolve/execute** (unrunnable — binary missing, script
    renamed, etc.) remains a **blocker** (a declared gate the agent cannot honor). This residual run-time
    blocker is distinct from "no guardrails declared" (proceed) and from "guardrail runs and fails" (work).
    Setup-time validation (req 11-15) and this run-time residual blocker are **complementary**: setup catches
    bad commands at authoring time; the residual blocker catches drift (a once-valid command that later
    became unrunnable). The shared distinction across both is **"did the command execute?" vs "did the gate
    pass?"**
20. **Behavior verification is preserved as its own step** in both code agents, de-coupled from the
    verification-convention wording: the agent exercises the changed user-observable behavior end-to-end
    itself and captures the appropriate evidence. The guidance on how to exercise and what evidence to
    capture lives in the step itself (there is no convention to defer to). Behavior verification is NOT
    reclassified as a guardrail.
21. After the change, **no agent contains the string "verification convention" for the command-gate role**
    (grep-negative). All other "host project's X convention" references are **unchanged**: inline
    API-documentation convention, testing convention, UI conventions, coding/build conventions, commit
    format, and the **documentation convention** (voice/structure/formatting/cross-linking). The "doc
    **gates**" in `doc-writer.md`/`doc-reviewer.md` (link-check, markdown-lint, render-check, doc tests,
    spelling) ARE docs-phase guardrails and are rewritten accordingly — distinct from the leave-alone
    "documentation **convention**".

### Local overrides

22. Guardrails is **not locally overridable**. It is not in the `.rp.local.md` overridable subset (it is a
    shared, must-hold-for-everyone contract, not a developer-local-runtime convention). A guardrail placed
    in `.rp.local.md` is **ignored, the committed value is used, and the run output warns** — the behavior
    the local-overrides mechanism (pipeline #91) already provides for shared/non-overridable conventions; no
    new mechanism is added. The loader's overridable-vs-shared guidance is updated to note guardrails sits on
    the shared/non-overridable side.

### Reference example (this repository)

23. This repository's own committed `.rp.md` gains a `### Guardrails` subsection declaring its **real**
    command gates as the worked example, drawn from what the project actually runs (its CI gates:
    `npm test`, `node scripts/validate-changesets.mjs`, and the changeset-presence check). The declared
    commands must validate (resolve-and-execute) in the environment the maintainers run — note `npm test`
    requires Node ≥21 (CI uses Node 22) because the `test` script's quoted `**` glob relies on `node --test`
    built-in glob support added in Node 21. No new gate tooling is invented for this purpose.

### End-to-end optionality (the central "optional" guarantee)

24. A project (or a phase) with **zero applicable guardrails** flows cleanly through the whole system with
    **no blocker and no warning anywhere**: setup's capture step accepts "none" as complete; the loader's
    required-completeness check passes; and all four agents run none and proceed. This guarantee spans
    setup + load + agents, not just the loader row.

### Required project mechanics

25. Because the change edits release-relevant paths (`agents/**`, `skills/**`), the PR carries a **`minor`**
    changeset (pre-1.0 feature). The changeset is authored, not a guardrail. (`.rp.md` and `.pipelines/**`
    are not release-relevant; the changeset is required by the agents/skills edits regardless.)

### Explicitly out of scope

26. **The conventions → "configuration" umbrella rename**, any `.rp.md` retitle, and any top-level
    `## Guardrails` sibling section. Dead per #113 and #115 (both closed; "doesn't add benefit, only adds
    complexity") and the final #51 re-scope ("one more convention").
27. **Fixing the `npm test` Node-portability wart** (the quoted-`**`-glob reliance on Node ≥21). A real but
    separate concern; bundling an unrelated build-script fix is the scope-creep that closed #112. File
    separately if desired.
28. **Reclassifying behavior verification as a guardrail**, and the optional 4th "expected evidence"
    guardrail field (deferred enhancement).
29. **Per-tool guardrail variants** (guardrails are tool-agnostic, one shared declaration) and **any
    parser/validator/schema** for the guardrails section (it is prose the agents read, like every other
    `.rp.md` entry).
30. **Redesigning the code/docs phase loop or backpressure mechanics** (they already exist; this formalizes
    the contract only) and **any change to the phase-reference docs** (`reference/autonomous-phases/4 -
    code.md`, `5 - docs.md`, assisted equivalents — verified they reference neither the verification
    convention nor guardrails today).
31. **Guardrails for phases other than code and docs.**
32. **Any new mechanism for local overrides** (guardrails is non-overridable for free via #91's existing
    rules) and **README/website human-facing documentation** (owned by the pipeline's docs phase, not this
    spec).
33. **Retroactively back-filling guardrails** into existing/other pipelines or other consuming projects'
    `.rp.md`. The feature ships the convention plus this repo's own dogfood declaration only.
