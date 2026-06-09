# Design research: Guardrails convention

Running record of grounded design decisions for issue #51 (Guardrails
convention). Each topic traces to one or more spec requirements / acceptance
criteria and is resolved against the real codebase. The design-doc-writer
synthesizes `design-doc.md` from this record.

## Inputs

- Spec: `.pipelines/51-guardrails-convention/1-spec/spec.md` (authoritative).
- Prompt: `.pipelines/51-guardrails-convention/0-prompt/prompt.md`.

## Codebase facts established (pre-research grounding)

These are confirmed by direct inspection of the worktree and anchor every
decision below.

- **Root config is a single file.** `.rp.md` lives at the repo root (not the
  `.claude/.rp.md` + `.pi/.rp.md` split the prompt assumed). It currently has a
  title (`# Radical Pipelines project conventions`) and a single `## Shared
  conventions` section holding all content. Its intro paragraph claims "the
  per-tool sections add conventions specific to Claude Code and Pi," but **no
  per-tool sections actually exist in the file** — that intro is aspirational
  / stale. This matters for Requirement 7 (preserve all convention content) and
  Acceptance 1.
- **The four agents** are `agents/code-writer.md`, `agents/code-reviewer.md`,
  `agents/doc-writer.md`, `agents/doc-reviewer.md`. Every occurrence of "the
  host project's verification convention" across them is enumerated in Topic 4.
- **The conventions loader** is
  `skills/radical-pipelines/reference/conventions/load.md`: a "Conventions"
  table (with a Required? column), a "Missing conventions" completeness check,
  and a "Local overrides" step.
- **The setup flow** is
  `skills/radical-pipelines/reference/conventions/setup.md`: step 2 "Collect
  required conventions" lists one capture sub-section per item (slug, artifact
  folder, commit format, issues, worktrees, branch names, teams, agent models,
  health monitoring, artifact storage).
- **This repo's real command gates** (Requirement 17, Acceptance 12): `npm test`
  (runs `node --test 'scripts/test/**/*.test.mjs'`) and `node
  scripts/validate-changesets.mjs`. Both are real, already wired into CI:
  `.github/workflows/changeset-gate.yml` runs both; `.github/workflows/release.yml`
  runs `npm test`. No new tooling is invented.

## Topics

<!-- One section per design topic. Each: Question → Findings → Decision →
     Spec trace → Open questions. Filled in as the Q&A with the researcher
     proceeds. -->

### Topic 1 — Restructure root `.rp.md` into `## Conventions` + `## Guardrails`; guardrail entry format; this repo's worked example

**Question.** How does the single-section root `.rp.md` become `## Conventions` +
`## Guardrails` without redesigning the per-tool layout (out of scope)? What
concrete format should a guardrail entry use? Which phase(s) does each of this
repo's two real gates apply to?

**Findings (grounded).**

- *Current structure of `/Users/darerodz/Code/radical-pipelines/.rp.md`.* Title
  `# Radical Pipelines project conventions` (L1), intro paragraph (L3), then a
  single `## Shared conventions` section (L5) holding ALL content: Managing tasks
  (L7, with `####` Creating/Modifying/Orchestrator-updates subheads), Pipeline
  slugs (L41), Artifact folders (L45), Commit format (L49), Worktrees (L58),
  Branch names (L64), Team spawning (L68), Health monitoring (L72). There is
  exactly one `##` section. **No per-tool sections exist** despite the intro at
  L3 claiming "the per-tool sections add conventions specific to Claude Code and
  Pi." That intro sentence is **stale** — per-tool rules actually live in
  separate reference files (`conventions/claude-code.md`, `conventions/pi.md`),
  loaded conditionally, never inline in `.rp.md`.

- *House formatting style.* Two registers in use: **tables** for at-a-glance
  enumerations (the conventions catalog in `load.md` L11-21 uses
  `Convention | What it covers | Required?`), and **`###`-titled prose blocks**
  for per-item detail (`setup.md`, and the `###` convention blocks inside
  `.rp.md`). No tables currently exist inside `.rp.md` itself.

- *Real gates (worked example).* Confirmed by CI:
  `.github/workflows/changeset-gate.yml:31` runs `npm test`, `:34` runs
  `node scripts/validate-changesets.mjs` (on every PR to `trunk`);
  `release.yml:29` also runs `npm test`. `package.json` declares only `test`
  and `release:version` scripts — **no `lint`, `typecheck`, or `build`**, and
  `CONTRIBUTING.md:19-20` states outright "There is no `lint` or `typecheck`
  step — this repo has none." So the worked example is exactly the two gates the
  spec names (R17); no others are invented.

- *Phase mapping of `validate-changesets`.* The validator only checks the shape
  of `.changeset/*.md` (`scripts/validate-changesets.mjs:1-20`); it does not
  author changesets. A changeset is required whenever a PR touches a
  release-relevant path. From `.changeset/config.json` `changedFilePatterns` and
  `CONTRIBUTING.md:56-71`, those paths are `skills/**`, `agents/**`,
  `.claude-plugin/**`, root `package.json`, and **`README.md`**. The **code
  phase** edits `skills/**`, `agents/**`, `.claude-plugin/**`; the **docs phase**
  edits `README.md` — both release-relevant. Therefore `validate-changesets`
  legitimately applies to **both `code` and `docs`**. (`website/**` and
  `scripts/**` are non-release-relevant per `CONTRIBUTING.md:69-71`.) `npm test`
  exercises `scripts/*.mjs` code with no doc-tests wired in → **`code` only**.

**Decisions.**

1. **Restructure:** rename the existing `## Shared conventions` heading to
   `## Conventions` (a one-line heading change; all `###` children move with it,
   copied verbatim — R7 "no change to meaning"). Add a new sibling `##
   Guardrails` section after it (R6, guardrail-as-sibling). Do NOT wrap existing
   content in a new `## Conventions` > `## Shared conventions` nesting — that
   re-introduces the "shared vs per-tool" framing R6 doesn't want.
2. **Reconcile the stale intro (L3):** rewrite it to describe the file as holding
   this project's **conventions** and its **guardrails**, dropping the false
   "per-tool sections" claim (optionally pointing readers to the per-tool
   reference files instead). This is a meaning-preserving fix to an
   already-incorrect sentence — inside R6/R7, outside the out-of-scope "redesign
   per-tool layout."
3. **Guardrail entry format:** a markdown table with columns
   `Name | Command | Phases`, one row per guardrail, command in backticks.
   Chosen because: it matches the table register `load.md` already uses; every
   row visibly carries all three required attributes (A2); there is structurally
   no place for a per-tool variant, making tool-agnosticism self-evident (A3 /
   AC3 "looks for tool-specific variants, finds none"); it is the most scannable
   "run every row whose Phases includes mine" shape for the consuming agents; and
   a table is still prose read by eye, needing no parser (honors the
   out-of-scope "no parser/validator/schema"). Bullet-list-per-guardrail is an
   acceptable fallback but wordier and makes tool-agnosticism less visually
   obvious.
4. **Worked-example `## Guardrails` table for this repo:**

   | Name | Command | Phases |
   | --- | --- | --- |
   | Unit tests | `npm test` | code |
   | Changeset shape | `node scripts/validate-changesets.mjs` | code, docs |

5. **Show the empty state.** The design must document the empty/absent
   `## Guardrails` state explicitly (R5/R8/AC4: "absent or empty == valid,
   complete, never a blocker") — e.g. an empty section or a one-line "This
   project declares no guardrails."

**Spec trace.** R6, R7, R8, R17; Acceptance 1, 2, 3, 12 (and supports R5/AC4 via
the empty-state note).

**Open questions / caveats carried forward.**

- *Changeset authoring is not wired into the agents.* `grep` finds no mention of
  "changeset" anywhere in `agents/` or `skills/`; the authoring obligation lives
  only in `CONTRIBUTING.md`/`README.md`/`AGENTS.md` for human contributors.
  Declaring `validate-changesets` as a guardrail makes the *validation*
  mandatory, but the validator passes vacuously when zero changeset files exist,
  so it is honest and non-blocking. Wiring changeset *authoring* into agents is a
  separate concern the spec does not ask for (R17 only declares the existing
  gate). **Record as a known limitation; do not expand scope.**
- CI's third changeset check `npx changeset status --since=origin/<base>`
  (`changeset-gate.yml:37`) is PR-base-relative — it has no fixed exact command
  judged by its own exit code, so it does NOT fit the guardrail shape and is
  correctly excluded from the worked example (R17 names only the two gates).

### Topic 2 — Conventions loader (`load.md`): documenting guardrails, keeping the completeness check guardrails-free, local-override interaction

**Question.** Where and how does `load.md` document that `.rp.md` holds
conventions AND guardrails and how an agent loads the guardrails for a phase,
without adding a Guardrails table row or putting guardrails in the
required-completeness check? Are guardrails locally overridable?

**Findings (grounded).** File:
`/Users/darerodz/Code/radical-pipelines/skills/radical-pipelines/reference/conventions/load.md`.

- Current shape: `# Load Conventions` (L1); intro (L3-7, "Project-specific
  conventions are stored in the `.rp.md` file… load and verify it before
  starting any workflow"); `## Conventions` + table (L9-21, columns
  `Convention | What it covers | Required?`); `## Missing conventions`
  completeness check (L23-29, keyed purely on "required conventions"); `##
  Local overrides` (L31-37).
- The completeness check (L25-29) operates only on "required conventions,"
  which are defined solely by the table's `Required?` column. Guardrails are
  never a table row, so they have no `Required?` cell and cannot count as a
  missing required convention → AC4 satisfied by construction, no edit to `##
  Missing conventions` needed.
- *Local overrides has no allowlist.* L33-37 permits overriding "a restricted
  subset of conventions" with a merge rule that is **per-named-unit** ("where it
  names a convention its value wins, where it is silent the committed value is
  inherited") — i.e. override-whatever-you-name, not a closed list. A search of
  `skills/` and `agents/` found NO enumeration of which conventions are in the
  "restricted subset"; the only descriptions (load.md L33-37, README.md:149, the
  `.changeset/local-convention-overrides.md` changeset) all assert "restricted
  subset" without listing it. Because the mechanism reads the same `.rp.md` and
  wins per named unit, a dev could drop a `## Guardrails` section into
  `.rp.local.md` and silently weaken or null out a mandatory gate in their
  working copy — a real loophole that defeats the backpressure purpose.

**Decisions.**

1. **Add a `## Guardrails` section to `load.md`, sibling to `## Conventions`,
   placed right after `## Missing conventions`** (reading order: load conventions
   → check completeness → understand guardrails → apply local overrides). Keeping
   it out of the table makes AC6 ("does NOT list Guardrails as a row in the
   conventions table") self-evident.
2. **Broaden the intro by one clause** so the opening is honest that `.rp.md`
   holds this project's conventions AND guardrails. Keep it to a clause; do not
   rewrite the paragraph.
3. **`## Guardrails` section content (three short sentences, prose not schema):**
   (a) `.rp.md` also declares the project's guardrails — mandatory verification
   gates, each an exact command judged by exit code (0 = pass), applicable to the
   code and/or docs phase; (b) to get the guardrails for a phase, read the `##
   Guardrails` section of `.rp.md` and select the entries whose phase(s) include
   that phase; (c) guardrails are optional — a project may declare none, and an
   absent or empty `## Guardrails` section means the project has no command gates,
   which is valid and never a blocker.
4. **Do NOT edit `## Missing conventions`.** Keep the required-convention logic
   exactly as today; the optionality guarantee lives in the new Guardrails
   section (decision 3c), which is proportionate and avoids touching the check.
5. **Phase-selection phrasing confirmed accurate** against Topic 1's
   `Name | Command | Phases` table: applicable guardrails for a phase = rows
   whose Phases column includes that phase. `load.md` should NOT describe how to
   *run* gates — that is the agents' job (Topic 4); `load.md` covers loading and
   selecting only.
6. **Guardrails are committed-only / not locally overridable** — state this in
   one sentence (in the new `## Guardrails` section, or as a half-sentence in
   `## Local overrides`). Justification: a guardrail is a *project verification
   command*, not a convention (spec Overview: guardrails are deliberately NOT a
   convention), and the override mechanism is explicitly about *conventions*;
   letting a dev locally remove a mandatory exit-code gate defeats backpressure.
   The design doc should explicitly note that the "restricted subset" is nowhere
   enumerated today, so this is the first pinned-down statement about it — and
   should be scoped to guardrails only (defining the full convention allowlist is
   out of scope).

**Spec trace.** R9, R10; Acceptance 4, 6. Decision 6 protects R13's "mandatory,
must not be bypassed" against a local-override end-run; spec is silent on it, so
recorded as a design-resolved ambiguity.

**Open questions / caveats carried forward.**

- `README.md:161` (and :149) still describe `.rp.md` as having "a per-tool
  section" — another stale user-facing description, consistent with the stale
  `.rp.md` intro (Topic 1). README is user-facing docs, **out of scope for the
  code phase** (docs-phase responsibility per spec Out of Scope). Note for the
  docs phase; do not change here.

### Topic 3 — Setup flow (`setup.md`): an optional guardrails capture step, distinct from conventions

**Question.** Where in `setup.md` does the guardrails capture step go, what
heading level, what does it collect, and how do the write steps change — all
keeping guardrails optional and distinct from conventions?

**Findings (grounded).** File:
`/Users/darerodz/Code/radical-pipelines/skills/radical-pipelines/reference/conventions/setup.md`.

- Current top-level steps: `## 1. Read the specific agentic coding tool rules`
  (L15); `## 2. Collect required conventions` (L27) with `###` per-item
  sub-blocks (Pipeline base slug L32, Artifact folder L46, Commit format L54,
  Issues L62, Worktrees L68, Branch names L74, Spawning teams L82, Agent models
  L88, Health monitoring L100, Artifact storage L106); `## 3. Apply agentic
  coding tool setup actions` (L171); `## 4. Confirm writes before changing files`
  (L179); `## 5. Write human-readable Markdown` (L188); `## 6. Set up git ignore`
  (L196); `## 7. Finish safely` (L203).
- The collection step is literally titled "Collect required **conventions**" —
  nesting guardrails under it contradicts "distinct from the conventions."
- The house already supports optional items: L30 says "Specify if they are
  required or optional," and Commit format / Spawning teams / Agent models are
  captured with no `(required)` marker.
- **Renumbering hazard (the key finding).** `pi.md:45` reads "Step 3 of
  `setup.md` installs them after conventions have been collected," pointing at
  the current `## 3. Apply agentic coding tool setup actions`. Inserting a new
  `## 3` for guardrails pushes that step to `## 4` and makes pi.md's "Step 3"
  stale. A repo-wide check confirms this is the **only** external reference to a
  setup.md step number: `claude-code.md` has none; `README.md:147` links to the
  whole file (anchorless, survives); all other "step N" hits are file-local
  self-references. Blast radius is one line.

**Decisions.**

1. **Add a new top-level step `## 3. Capture guardrails (optional)`, sibling to
   step 2**, inserted between the end of step 2 (L170) and the current `## 3`
   (L171). Renumber the trailing steps: Apply tool setup actions → 4, Confirm
   writes → 5, Write Markdown → 6, Set up git ignore → 7, Finish safely → 8.
   Chosen over a `###` sub-block inside step 2 because a guardrail is not a
   convention (spec Overview) and step 2's heading says "conventions"; a sibling
   top-level step makes the "distinct concept" status structural (AC7). `(optional)`
   in the heading satisfies AC7's "marked optional" at a glance.
2. **Fix the renumber hazard at `pi.md:45` by making the reference number-free** —
   refer to "the **Apply agentic coding tool setup actions** step of `setup.md`"
   rather than "Step 4," so future insertions never break it again (more durable
   than bumping 3→4). This one-line edit is in scope as a direct consequence of
   the renumbering and must be named in the design doc / plan.
3. **Capture-step content (mirrors house pattern):** short prose intro stating
   guardrails are the project's mandatory verification gates and that this step is
   **optional** — "none" is a complete, valid answer (R5/AC4/AC7); one sentence on
   what a guardrail is (exact command, pass/fail solely by exit code 0 = pass,
   applies to **code** and/or **docs** phase — R1-R3); an elicitation paragraph
   asking the owner, for each gate, a **name/label**, the **exact command**, and
   the **phase(s)** it applies to, prompting them to consider lint/typecheck/unit/
   e2e/build and project-specific validators but only capturing gates that exist
   (no invention); and a `Suggested default:` line reworked to "none — guardrails
   are project-specific; capture each gate's name, exact command, and applicable
   phase(s), or record that the project has no command gates" (keeps the house
   affordance while being honest the default is empty).
4. **Prompt tool-agnosticism in one clause** (R4/A3): note a guardrail is the same
   command regardless of the active agentic coding tool, captured once with no
   per-tool variant. Worth stating because several *conventions* in this same file
   ARE per-tool (Worktrees, Branch names, Team spawning, Health monitoring, Agent
   models), so a reader might wrongly expect per-tool guardrail variants.
5. **Write-step edits.** Step 5 "Write human-readable Markdown" (L188-194):
   broaden "Write `.rp.md` with the conventions" to "…with the conventions **and
   any guardrails captured above**" — the "any … captured above" phrasing keeps
   it optional (zero guardrails → nothing to write, still valid). Do NOT mandate a
   `## Guardrails` heading here; let structure live in load.md / the worked
   example. Step 4 "Confirm writes" (L179-186): guardrails are already part of
   "the proposed `.rp.md` content," so no edit is strictly required; optionally add
   a half-clause "…conventions and any guardrails…" for symmetry.
6. **Do not let "no guardrails" trip the missing-required-answer guard.** L186
   ("If any required answer is missing, do not create a misleading complete
   conventions file…") keys off *required* answers; guardrails are optional, so a
   project with none has no missing required answer. The step-4/5 edits must use
   "any guardrails captured above" so absence is never treated as unresolved — note
   this so the code phase does not over-tighten it.

**Spec trace.** R11; Acceptance 7 (and supports R1-R5, R4/A3, R5/AC4 via the
content/optionality decisions).

**Open questions / caveats carried forward.** None new beyond the pi.md
number-free-reference edit (decision 2), which is fully resolved here.

### Topic 4 — The four phase agents: replace the command-gate "verification convention," preserve behavior/accuracy verification, update the blocker rule

**Question.** Per file and per occurrence, classify every reference to the
command-gate role and recommend the replacement; preserve behavior verification
as a self-contained step (R15); update the blocker rule (R14); leave the other
"host project's X convention" references intact (R16).

**Classification roles.** (A) command-gate role → "the project's Guardrails for
this phase" / "run the applicable guardrails"; (B) behavior/accuracy-verification
dependency → make self-contained, evidence-based, no named convention; (C)
blocker-rule statement → no applicable guardrails is not a blocker, remove the
missing-convention blocker; (R16) other "X convention" → leave intact.

**Critical findings (re-verified directly against the files).**

1. **Three command-gate lines do NOT contain the literal string "verification
   convention"** but carry the role via back-reference and MUST be edited too, or
   AC8/R12 leaves dangling references:
   - `code-writer.md:48` — "Run every gate documented **in the convention**…"
   - `code-reviewer.md:97` — "**Run the verification gates.** … A review without
     verification evidence is not a review."
   - `doc-writer.md:42` and `:44` — "If **the convention** enumerates doc gates…"
     / "If **the convention** enumerates no doc gates…"
   (Verified via `sed`/`grep`; all four lines confirmed present and back-reference
   the verification convention.)
2. **`code-writer.md:46` lists "behavior verification" AS one of the gates** —
   "defines a set of gates — unit tests, end-to-end tests, type checks, lints,
   build, **behavior verification**, anything else…". Under R15 behavior
   verification is NOT a guardrail, so the edit must do TWO things on this line:
   convert to guardrails (A) AND remove "behavior verification" from the
   enumeration. **This is the single most important and easiest-to-miss R15
   edit.** (Verified present.)
3. **Mixed-role adjacency `code-reviewer.md:31↔32`:** L31 (host project's coding,
   testing, build, and commit conventions — R16 LEAVE) sits directly above L32
   (verification gates — role A CHANGE). A careless sweep could alter L31's
   "build… conventions" thinking it is gate-related. Keep separate. (Verified.)
4. **`code-writer.md:42`** ("per the host project's **testing** convention," for
   adding e2e tests) is the *testing* convention, R16-LEAVE — easy to mis-sweep
   because it sits right next to the behavior-verification/e2e step. (Verified.)

**Per-file decisions (replacement shapes).**

- *code-writer.md:* L13 (A) "Read the project's Guardrails (the guardrails
  applicable to the code phase)." L36 (B) drop "using the host project's
  verification convention / whichever evidence the convention requires"; keep the
  inline evidence list — "exercise end-to-end before completion; capture evidence
  (screenshots, transcripts, output samples, response diffs)." L44 heading (A,
  optional) "Validate against the project's guardrails." L46 (A + R15) "The
  project's Guardrails for the code phase are the mandatory verification gates for
  this phase. Treat each as mandatory." — and DROP "behavior verification" from
  the list; keep it generic (don't hard-code lint/typecheck/build — this repo has
  none). L48 (A) "Run every guardrail applicable to the code phase, exactly as
  written. Do not invent commands. Do not omit guardrails." L49/L50 (A, R13 core)
  swap gate→guardrail, otherwise verbatim — L50 IS R13's no-bypass language,
  preserve it. L51 (C) DELETE the "missing or unrunnable = blocker" line; replace
  with optionality "If the project declares no guardrails for the code phase, run
  none and proceed — that is not a blocker." L70 (C) strike the "or the
  verification convention is missing" clause from the blocker example list. R16
  LEAVE: L29 (inline API-doc), L38 (UI), L42 (testing), L56 (commit).

- *code-reviewer.md:* L18 (A) "Read the project's Guardrails (applicable to the
  code phase)." L32 (A) "**No regressions / guardrails pass** — run every
  guardrail applicable to the code phase exactly as written; record each
  guardrail's command and result." L36 (B) remove named-convention dependency,
  name evidence inline (mirror code-writer L36); keep the "claim without evidence
  is not a verification — produce it or reject" sentence. L68 (B, review template)
  "Evidence of the observed behavior." L97 (A) "**Run the guardrails.** … A review
  without guardrail evidence is not a review." L98 (C) strike "the verification
  convention is undefined" from the broken-input blocker list; other broken-input
  blockers (missing/unreadable plan/spec/design, missing batch metadata) stay.
  R16 LEAVE: L30 (inline API-doc), L31 (coding/testing/build/commit list), L84
  (commit).

- *doc-writer.md:* L35 (B, accuracy) reframe without the named convention —
  "Runnable examples actually run — exercise them if a doc-test guardrail exists,
  otherwise trace by hand." L38 heading (A) "Validate against the project's
  guardrails." L40 (A, hedge→optionality) "The project's Guardrails for the docs
  phase are the verification gates that apply to documentation — possibly none.
  Examples a project might declare: link checking, markdown linting, render check,
  doc tests, spelling." L42 (A) "If the docs phase has applicable guardrails, run
  every one exactly as written…" L43 (A, R13) swap gate→guardrail, keep otherwise.
  L44 (A + optionality, the docs-side AC4/R5 statement — KEEP) "If the docs phase
  has no applicable guardrails, the accuracy verification in step 3 is your only
  validation, and that is acceptable." L45 (C) DELETE the "missing or unrunnable =
  blocker" line. L65 (C) strike the "or the verification convention is missing"
  clause; keep the other doc-writer blockers (nonexistent Files paths, unpopulated
  surface, design↔code drift). R16 LEAVE: L17 (documentation convention read), L27
  (documentation conventions), L50 (commit).

- *doc-reviewer.md:* L33 (A) "**Guardrails** — run every guardrail applicable to
  the docs phase exactly as written and record each in the Checks table. If the
  docs phase has none, the accuracy spot-check in step 3 is the sole gate." L37
  (B) already self-contained — LEAVE. L98 (A) "**Run the guardrails if any
  apply.** … If the docs phase has applicable guardrails, a review without their
  evidence is not a review. If none apply, the accuracy spot-check is your only
  evidence — produce it." L99 (C) strike "the verification convention is
  undefined" clause; other broken-input blockers stay. R16 LEAVE: L19
  (documentation convention read), L32 (documentation conventions), L85 (commit).

**Phase targeting (decision).** Canonical agent phrasing across all four files:
**"run every guardrail applicable to the code/docs phase"** — matches Topic 2's
load.md row-filter phrasing and maps 1:1 to AC9 ("runs every guardrail applicable
to that phase"). code-* select rows including `code`; doc-* select rows including
`docs`.

**Doc hedge (decision).** The current "MAY enumerate doc gates… many projects
enumerate none" hedge becomes a precise, deterministic statement under guardrails:
docs-phase guardrails = `## Guardrails` rows whose Phases include `docs`, which may
be zero. "Zero applicable guardrails → accuracy verification is the only
validation" (doc-writer L44, doc-reviewer L33) is the clean restatement. The
guardrails model REMOVES the vagueness while preserving the meaning — flag as a
genuine improvement.

**Behavior verification, R15 (decision).** Code behavior verification stays a
separate step (code-writer step 3, code-reviewer step 3), is NOT reclassified as a
guardrail (and "behavior verification" is removed from the code-writer L46 gate
list), and names its own evidence (the inline parenthetical already does). Only
change: delete the "using the host project's verification convention / whichever
evidence the convention requires" clause. **Doc accuracy verification** (doc-writer
step 3, doc-reviewer L37) is the docs-phase analog — a self-contained,
evidence-based step (verify symbols/paths/keys/cross-links against shipped code,
trace examples), preserved under R15, never a guardrail; any *runnable doc-test*
gate moves to the guardrails step (step 4), cleanly separating accuracy (always
done) from guardrails (may be zero).

**Blocker rule, R14 (decision).** DROP the "verification convention
missing/undefined" clause everywhere (code-writer L51+L70, code-reviewer L98,
doc-writer L45+L65, doc-reviewer L99). Standalone lines (code-writer L51, doc-writer
L45) are deleted and replaced with the positive optionality statement; in-list
clauses are struck, leaving the surrounding genuine-broken-input blockers intact.
**"Can't even run" edge case:** treat as work-to-fix, NOT a reintroduced blocker —
a guardrail is "an exact command judged by exit code (0 = pass, non-zero = fail)"
(R1), so a command that can't run exits non-zero → it is a FAIL → R13 says a
failing guardrail is work to fix. Reintroducing an "unrunnable = blocker" rule
would resurrect what R14 removes and hand agents a loophole to dodge a red gate by
calling it "unrunnable." Conceptual justification to state in the design doc: the
OLD missing-convention blocker existed because a missing verification convention
meant the agent didn't know what to run (genuine under-specification);
post-guardrails, "no guardrails declared" is a deliberate, valid state
(optionality), so that justification no longer applies — optionality does not
weaken rigor.

**Post-edit invariants to assert (acceptance check).** After all edits: (i) `grep
"verification convention"` across the four files returns ZERO hits (AC8); (ii)
behavior/accuracy verification remains a separate evidence-based step naming its
own evidence (R15/AC11); (iii) every command-gate reference selects the agent's
phase guardrails (R12/AC9); (iv) R13's fail-is-work / no-bypass language preserved
verbatim except gate→guardrail (AC10); (v) no-guardrails-is-not-a-blocker replaces
the old blocker (R14/AC5/AC10); (vi) all R16-protected other-convention references
untouched (R16/AC11).

**Spec trace.** R12, R13, R14, R15, R16; Acceptance 5, 8, 9, 10, 11.

**Open questions / caveats carried forward.** The "run every guardrail exactly as
written, do not invent commands" discipline (code-writer L48, etc.) now points at
the `## Guardrails` table commands — the worked-example commands must be exact and
copy-pasteable (Topic 1 decision 3 satisfies this with backticked commands). No
open blocker.

### Topic 5 — Cross-cutting consistency, the empty-guardrails end-to-end path, and consolidated risks

**Question.** Stitch the five surfaces together: mandate consistent vocabulary,
trace the empty/absent-guardrails path end-to-end, check the self-referential
dogfooding bootstrap, and re-sweep the repo for missed references.

**Findings (grounded).**

- *Terminology.* The spec's own casing is the rule to follow: **"Guardrails"
  (capital G)** for the named concept and section headings (the `## Guardrails`
  section in `.rp.md` and load.md, "the project's Guardrails for this phase");
  **"guardrail" (lowercase)** for an individual entry/row and in running prose
  ("each guardrail," "run every guardrail applicable to…," "a guardrail that
  fails"). Matches spec.md Overview/R12 (capital) and R1-R3/R13 (lowercase).
- *Definition placement.* AGENTS.md L11 has a strict anti-duplication rule
  ("an instruction repeated in multiple files must be moved to a separate file
  the others reference"). The full canonical definition should live ONCE in
  **load.md** (the file every workflow reads at start, load.md:5), with short
  one-line echoes where a file may be read independently.
- *Empty-set property.* The canonical phrase "run every guardrail **applicable
  to** the [code|docs] phase" is a filter over a set; it yields ∅ identically
  whether the `## Guardrails` section is absent (no rows) or present-but-no-rows-
  for-this-phase. The wording does not branch on *why* the set is empty → both
  optionality cases (AC4/AC5) collapse to "run none, proceed."
- *Empty-path re-sweep.* The only surfaces that could mistreat an absent
  `## Guardrails` section as a gap are setup.md L186 (handled in Topic 3) and
  load.md `## Missing conventions` (handled in Topic 2). A grep for "guardrail …
  required/missing/blocker" coupling across `skills/` and the agents found
  nothing else. Confirmed clean.
- *Self-referential bootstrap.* `git status` shows this pipeline has made NO
  source edits yet; the 7 existing `.changeset/*.md` are all from prior pipelines
  — **none covers #51.** This pipeline WILL edit release-relevant paths:
  `agents/**` and `skills/**` (code phase) and `README.md` (docs phase) are all in
  `.changeset/config.json` `changedFilePatterns`, so per CONTRIBUTING.md:54-57 the
  #51 PR **requires a changeset** (the CI presence check `npx changeset status`
  fails without one). No circularity: this pipeline's agents run TODAY's
  definitions to PRODUCE the new contract; the new `.rp.md`/`agents` are artifacts
  being written, not instructions followed mid-run. But changeset *authoring* is
  no agent's documented job today (no "changeset" string in `agents/` or
  `skills/`), so the PLAN must assign a task to author the #51 changeset (likely a
  `minor` bump, matching prior feature changesets). The newly-declared
  `validate-changesets` guardrail only checks SHAPE
  (`scripts/validate-changesets.mjs:1-20`), which `@changesets/write` satisfies —
  no deadlock, but the authoring task is required.
- *Completeness sweep.* Repo-wide grep (excluding node_modules and `.pipelines/`)
  for "verification convention"/"verification gate"/"the gates"/"gate
  documented"/"exercised end-to-end": every editable-source hit is in exactly the
  four agent files — no fifth file. **`skills/` and the orchestrator have ZERO
  references**; the autonomous phase-reference files describe completion
  *predicates* (what must be COMMITTED, e.g. `autonomous-phases/4 - code.md:37`),
  not a verification convention. So the orchestrator needs NO change and no
  inconsistency is left behind — the spec correctly scoped the behavior change to
  the four code/docs agents.

**Decisions.**

1. **Mandate the vocabulary** above: capital-G concept/section, lowercase
   instance/verb; the single selection phrase "the guardrails applicable to the
   [code|docs] phase" used verbatim in load.md, setup.md, and all four agents (so
   AC9 maps 1:1 and is greppable).
2. **Centralize the definition in load.md**; `.rp.md`'s `## Guardrails` section
   carries the table + a one-line echo; setup.md carries a one-line self-contained
   echo (setup may run before load.md's model is established); the four agents
   reference "the project's Guardrails for this phase" without re-defining. (A
   stricter reading of AGENTS.md L11 would make `.rp.md`/setup.md *point to*
   load.md instead of echo — recorded as a minor design-doc choice; the
   recommendation is one-line echoes for readability.)
3. **The two code agents must GAIN the positive optionality sentence** where the
   deleted blocker line was: "If no guardrails apply to this phase, run none and
   proceed — that is not a blocker." (The two doc agents already have an
   equivalent at doc-writer L44 / doc-reviewer L33.) This is the one spot to shore
   up for AC5 across both empty cases.
4. **Orchestrator: no change.** Loading/selecting guardrails is described in
   load.md (the orchestrator may pass role-specific context per README.md:158);
   running guardrails is the agents' job. Division stays consistent.
5. **Naming-surface awareness:** "guardrail" is the agent-facing term; "gate"
   persists in CI workflow names ("Changeset Gate") and user docs. Those are out
   of scope (spec excludes user-facing docs and CI). The code phase must NOT
   over-reach into renaming CI/README "gate" language.

**Spec trace.** Cross-cutting — supports R4/A3 (terminology), R5/AC4/AC5
(empty-path), R12/AC9 (selection phrase), R17 (worked example exactness), and
scopes-out confirmation for the orchestrator and `skills/`.

**Open questions / caveats carried forward.** The changeset-authoring task is the
single actionable risk — consolidated below.

## Open questions and risks

This section consolidates everything carried forward from Topics 1-5. None is a
spec blocker; each is either a plan-level task to assign or a design choice to
record.

### Risks / required follow-through

1. **This pipeline must author its own changeset (PLAN must assign a task).**
   #51 edits release-relevant paths (`agents/**`, `skills/**`, `README.md`), so
   the PR requires a `.changeset/*.md` (likely `minor`). Changeset authoring is
   currently no agent's documented responsibility (Topics 1 & 5), so it will not
   happen automatically — the code/docs plan must include an explicit
   author-the-changeset task, or the CI presence gate (and, once dogfooded, the
   `validate-changesets` guardrail) blocks the PR. **Highest-priority
   follow-through; surface prominently in the design doc.**

2. **Guardrails are committed-only / not locally overridable (design-resolved
   ambiguity).** The local-override "restricted subset" is nowhere enumerated;
   the override mechanism wins per named unit on the same `.rp.md`. Without a
   statement, a dev could drop `## Guardrails` into `.rp.local.md` and silently
   null out a mandatory gate, defeating backpressure. Decision: one sentence in
   load.md scoping local overrides to conventions only (Topic 2, decision 6). Spec
   is silent on this; recorded as a deliberate design resolution.

3. **`code-writer.md:46` lists "behavior verification" as a gate — the
   easiest-to-miss R15 edit.** Must be removed from the gate enumeration when the
   line is converted to guardrails, or R15/AC11 is violated (Topic 4, finding 2).

4. **Three command-gate back-references lack the literal "verification
   convention" string** (code-writer L48, code-reviewer L97, doc-writer L42/L44)
   and must be edited too, or a `grep "verification convention"` passes while
   dangling "the convention"/"verification gates" references remain (Topic 4,
   finding 1). The plan/code phase must use the full surface list, not a literal
   grep.

5. **Mixed-role adjacencies / mis-sweep traps:** code-reviewer L31 (R16-leave)
   directly above L32 (change); code-writer L42 "testing convention" (R16-leave)
   beside the e2e/behavior step. Editors must not sweep the protected lines
   (Topic 4, findings 3-4).

6. **pi.md:45 step-number cross-reference breaks on setup.md renumbering.** Fix by
   making it a number-free reference ("the Apply agentic coding tool setup actions
   step of setup.md"). One-line edit, in scope as a consequence of adding the
   guardrails step (Topic 3, decision 2).

### Out-of-scope notes (for the docs phase, not this pipeline's code phase)

- `README.md:149, :161` still describe `.rp.md` as having "a per-tool section"
  (stale, like the `.rp.md` intro). User-facing docs → docs-phase responsibility
  per spec Out of Scope (Topic 2).
- "gate" persists in CI workflow names and user docs; do not rename (Topic 5).

### Design choices to record (minor)

- Whether `.rp.md`/setup.md echo load.md's guardrail definition (recommended,
  readability) or point to it (stricter AGENTS.md L11 reading) — Topic 5,
  decision 2.
- Heading rename "Validate against the project's gates" →
  "…guardrails" in the agents (recommended for vocabulary consistency; "gates" is
  tolerable) — Topic 4.

## Spec coverage matrix

Every spec requirement (R) and acceptance criterion (AC) is served by a decision
in the topics above.

| Spec item | Served by |
| --- | --- |
| R1 guardrail = exact command, exit-code pass/fail | Topic 1 (def), Topic 5 (centralized in load.md) |
| R2 declares name, command, phase(s) | Topic 1 decision 3 (table columns) |
| R3 phase targets = code and/or docs only | Topic 1, Topic 4 (selection phrasing) |
| R4 tool-agnostic, no per-tool variants | Topic 1 decision 3 (no tool column), Topic 3 decision 4 |
| R5 optional; absent/empty is valid, never a blocker | Topic 2 (loader), Topic 3 (setup), Topic 4/5 (agents) |
| R6 `.rp.md` two sections, guardrails a sibling | Topic 1 decision 1 |
| R7 all convention content preserved, meaning unchanged | Topic 1 decision 1 (verbatim move) |
| R8 Guardrails section lists name/command/phases; may be empty | Topic 1 decisions 3-5 |
| R9 load.md documents both; how to load per phase | Topic 2 decisions 1, 3, 5 |
| R10 not a table row, not in completeness check | Topic 2 decisions 1, 4 |
| R11 setup.md captures guardrails, optional, distinct | Topic 3 decisions 1, 3 |
| R12 agents refer to Guardrails by name; no "verification convention" for that role | Topic 4 (all A-role edits + back-references) |
| R13 run all applicable, mandatory, fail=work, no bypass | Topic 4 (L50/L43 preserved gate→guardrail) |
| R14 no-guardrails not a blocker; remove missing-convention blocker | Topic 4 (C-role edits), Topic 5 decision 3 |
| R15 behavior verification preserved, not a guardrail, self-contained | Topic 4 (B-role edits + L46 fix) |
| R16 other "X convention" refs unchanged | Topic 4 (R16-leave list per file) |
| R17 this repo's real gates as worked example | Topic 1 decision 4 |
| AC1 `## Conventions` + `## Guardrails`, prior content preserved | Topic 1 decisions 1-2 |
| AC2 each entry states name, command, phase(s) | Topic 1 decision 3 |
| AC3 no tool-specific variants | Topic 1 decision 3 |
| AC4 no-guardrails passes completeness check | Topic 2 decisions 1, 4 |
| AC5 agent runs none, no blocker, proceeds | Topic 4 (C-role), Topic 5 decision 3 |
| AC6 load.md explains both, how to load, not a table row | Topic 2 decisions 1, 3 |
| AC7 setup.md captures guardrails, optional, distinct | Topic 3 decision 1 |
| AC8 no "verification convention" naming the command gates | Topic 4 (full surface incl. back-references) |
| AC9 runs every applicable guardrail, mandatory, completes only when all pass | Topic 4 (selection phrasing, L48/L32) |
| AC10 failing guardrail = work to fix, not bypassed | Topic 4 (L50/L43 preserved) |
| AC11 behavior verification + other conventions intact | Topic 4 (B-role + R16-leave) |
| AC12 root `.rp.md` uses new structure, real gates declared | Topic 1 decisions 1, 4 |
