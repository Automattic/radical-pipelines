# Design-doc research — review-3 (guardrail documentation split)

Running record of the design Q&A between `design-doc-analyst` and `design-doc-researcher`.

This run **re-baselines review-2's design doc to match the SHIPPED architecture**. Behavior is unchanged; this is a documentation-architecture change. The owner refactored the docs directly on the branch after review-2 shipped its "comprehensive single `guardrails.md`"; this run makes the pipeline's design describe that shipped split and supersede review-2's conflicting "comprehensive guardrails.md" / "Two references" decision.

## Established baseline (read before Q&A)

Files read directly to ground the design:

- `skills/radical-pipelines/reference/guardrails.md` — currently: gate kinds (fixed/scoped), the per-gate `.rp.md` block, the fill lifecycle. No validation, no resolve/`{scope}`-substitution, no spawn fields. Lone typo `docs-plan.md` at line 32.
- `skills/radical-pipelines/reference/conventions/passing.md` — `## Conventions` spawn block; owns `Guardrails:` and `Guardrail scopes to fill:` fields; the `Guardrails:` line currently *describes* the field content ("the resolved command after `{scope}` substitution") and points to `guardrails.md`, but does not *instruct* the orchestrator to perform that substitution.
- `skills/radical-pipelines/reference/conventions/setup.md` — Guardrails section: capture per the `.rp.md` block in `guardrails.md`; validate fixed by running the literal command, scoped by substituting a realistic made-up `{scope}` and running that ("did it execute?").
- `skills/radical-pipelines/reference/conventions/load.md` — catalog entry defers to guardrails (one-line summary).
- `skills/radical-pipelines/reference/autonomous-phases/3 - plan.md` — no guardrail/scope mention; plan-phase validation lives in the plan-reviewer profiles.
- `skills/radical-pipelines/reference/autonomous-workflow.md` — no guardrail/spawn-block mention (the spawn block lives wholly in `passing.md`).
- `AGENTS.md` — rule: "Agent profiles must not reference any skill file or `.rp.md`; an agent reads only its own profile and its initial prompt."
- Agent profiles (`agents/`):
  - `code-plan-writer.md:82`, `doc-plan-writer.md:68` — "Fill the guardrail scopes" (FILL is explicit).
  - `code-plan-reviewer.md:17`, `doc-plan-reviewer.md:18` — "Validate the `## Guardrail scopes`": substitute the recorded value into the template and execute (plan-phase VALIDATION).
  - `code-writer-tdd.md:35`, `doc-writer.md:38`, `code-reviewer.md:36` — "Run the guardrails": run each gate in the `Guardrails:` field exactly as written (RUN is explicit, operates purely on the received field).
  - Plan writers record the chosen scope value in the plan's `## Guardrail scopes` section (RECORD is explicit).

### The lifecycle gap (Requirement 6)

fill (plan-writer profiles) → record (`## Guardrail scopes`) → **resolve** → run (running-agent profiles). RESOLVE — substituting the recorded value into the `{scope}` template and placing the result in the running agent's `Guardrails:` field — exists today only as a passive *field-content description* in `passing.md`; no line instructs the orchestrator to perform it. Req 6 turns `passing.md`'s `Guardrails:` line into an active substitution instruction. Behavior-neutral: the orchestrator already had to produce that resolved field content.

## Open topics (driven one at a time with the researcher)

1. `guardrails.md` = the model only.
2. `passing.md` = the single home for how guardrails reach agents (spawn fields + resolved-command definition).
3. Validation homes: setup probe (`setup.md`) + plan-phase check (plan-reviewers / phase 3).
4. Single reading path, no duplication (`passing.md → guardrails.md` only).
5. `AGENTS.md` self-containment.
6. Resolve as an active orchestrator instruction in `passing.md` (the doc-gap fix).
7. Reframe the five review-2 spec/design statements; supersede "Two references, not one".
8. `doc-plan.md` artifact-name typo.

---

## Q&A record

### Topic 1 — `guardrails.md` = the model only (Req 1, AC 1)

**Resolved.** The shipped `skills/radical-pipelines/reference/guardrails.md` (33 lines) covers exactly the model and nothing else:

- `## Gate kinds` — fixed (literal command) / scoped (`{scope}` placeholder filled per pipeline).
- `## The .rp.md per-gate block` — the `### <name>` block with `command` / `agents` / optional `fill-guidance`; the note that absent `fill-guidance` the planning agent chooses `{scope}` from the spec and design.
- `## The fill lifecycle` — who fills (derived from who runs the gate: code-run gates by the code plan, doc-run gates by the doc plan); per-phase filling for spanning gates; the plan records the chosen scope **value** in `## Guardrail scopes`.

No validation content, no resolve / `{scope}`-substitution content, no spawn-field (`Guardrails:` / `Guardrail scopes to fill:`) content. Single reading-path direction already holds: `guardrails.md` references nothing back.

Lone defect: line 32 says `docs-plan.md` — the typo for Req 8 (Topic 8).

The opening sentence ("deterministic verification gates … judged pass/fail by exit code") is a **definition of the model**, not run/validation semantics — it states what a gate *is*. Keep it as the file's framing.

**Nuance (boundary clarification):** `guardrails.md`'s fill lifecycle legitimately names the plan-output section `## Guardrail scopes` and `gate → scope value` (line 32) — that is the *recording* step of the model, not spawn-field content. The spawn *field* is `Guardrail scopes to fill:` (an input the orchestrator passes the plan agents), which is absent from `guardrails.md` and lives only in `passing.md`. The design must keep these distinct: the plan-output section `## Guardrail scopes` belongs to the model (`guardrails.md`); the spawn fields `Guardrails:` / `Guardrail scopes to fill:` belong to `passing.md`.

**Design implication:** the `guardrails.md` component is described as "the guardrail model only: gate kinds, the per-gate `.rp.md` block, the fill lifecycle." This is the statement that supersedes review-2's design `guardrails.md` component (which listed "the spawn fields" in scope).

### Topic 2 — `passing.md` = the single home for how guardrails reach agents (Req 2, AC 2/3)

**Resolved.** `skills/radical-pipelines/reference/conventions/passing.md` (18 lines) is the `## Conventions` spawn block included at the top of each agent's initial prompt. It is the sole home for both guardrail spawn fields, with applicability and omit rules:

- `Guardrails:` (lines 10-12) → `code-writer-tdd`, `code-writer-e2e`, `code-reviewer`, `doc-writer`, `doc-reviewer`; "the gates naming this agent. For a scoped gate, that command is the resolved command after `{scope}` substitution. See `reference/guardrails.md`." Omit when not defined or the agent has no gates.
- `Guardrail scopes to fill:` (lines 13-17) → `code-plan-writer`/`code-plan-reviewer` for scoped code gates, `doc-plan-writer`/`doc-plan-reviewer` for scoped doc gates; "the scoped gates whose `{scope}` the plan must supply. See `reference/guardrails.md`." Omit when not defined or no scoped gates to fill.

Grep confirms sole home: `Guardrail scopes to fill:` (the input field) appears only here; assisted `3 - plan.md` references the *output* section `## Guardrail scopes`, not the input field. `passing.md` references `guardrails.md` exactly twice (lines 10, 13), both `See reference/guardrails.md`, and restates none of the model (no gate-kind definitions, no fill-lifecycle prose, no `.rp.md` block) — the field-content noun phrases ("the gates naming this agent", "the scoped gates whose `{scope}` the plan must supply") lean on model terms defined in `guardrails.md`, which is why each defers.

**Resolved-command definition vs. active resolve instruction — genuinely distinct (separates Topic 2 from Topic 6):**

- **Definition (Topic 2, present):** line 10's "that command is the resolved command after `{scope}` substitution" is a *copular definition* — it names WHAT the field content is (the post-substitution command). This is the resolved-command definition Req 2 wants in `passing.md`.
- **Active instruction (Topic 6, absent):** the line does NOT instruct anyone to perform the substitution — no imperative directed at the orchestrator, no "read the plan's `## Guardrail scopes` value, substitute, place the result here." That silent gap is exactly spec Req 6 / AC 6.

**Design implication:** the `passing.md` component is "how guardrails reach agents: the `Guardrails:` and `Guardrail scopes to fill:` spawn fields and the definition of a scoped gate's resolved command; references `guardrails.md` for the model." Req 6's realization (Topic 6) is a single upgraded `Guardrails:` line that both names the resolved command AND instructs the orchestrator to produce it — resolve documented in `passing.md` only, no second copy. This supersedes review-2's "Two references, not one" decision by re-splitting the concern: `guardrails.md` = model; `passing.md` = how guardrails reach agents (spawn fields + resolved-command definition + active resolve).

### Topic 3 — Validation homes: setup probe + plan-phase check (Req 3, AC 4)

**Resolved.** Validation is documented at its two performance moments, neither in `guardrails.md`:

1. **Setup (capture-time probe) — `setup.md`.** Line 179: "Validate a **fixed** gate by running its literal command; validate a **scoped** gate by substituting a realistic, made-up `{scope}` into its command and running that. Either way the only question is **did the command execute?** … for a scoped gate this confirms the runner resolves." The "did it execute?" (not exit-0) bar is spelled out at lines 181-184, and the side-effects rule the realistic-scope probe leans on at line 190. Setup owns the fixed/scoped probe in full.

2. **Plan phase (filled-command check) — the plan-reviewer profiles, mirrored by assisted phase 3.** Both `code-plan-reviewer.md` (step 2, line 19) and `doc-plan-reviewer.md` (step 2, line 20) carry the *identical* "Validate the `## Guardrail scopes`" instruction: substitute the recorded scope value into the gate's command template and execute the filled command — "did the command's runner resolve and terminate?" (a runner reporting zero/missing tests is legitimate; a runner that can't run is a rejection). They also carry the binding checks "Guardrail-scopes coverage" and "Guardrail-scopes bind" (step 3). The assisted `3 - plan.md` self-checks (line 118 = code-plan, line 211 = doc-plan) perform the **same** substitute-and-execute check in single-agent, human-in-the-loop shape — the assisted-mode mirror, not a third independent touchpoint.

**How the design names it:** validation lives in setup (the probe) and at the plan phase (the autonomous plan-reviewers, mirrored by the assisted phase-3 self-checks). The spec's "the plan-reviewers / phase 3" is the umbrella for that one plan-phase home across both modes.

**`guardrails.md` re-confirmed clean of validation:** no probe, no "did it execute / did the runner resolve", no validation sentence in the fill-lifecycle section (lines 27-32). The only exit-code mention is the line-3 model definition (Topic 1). Phrase it precisely: validation is simply **not the model's concern**, so `guardrails.md` carries none of it — it is not a "defer to a validation home" relationship (there is no validation reference-edge to draw).

### Topic 4 — Single reading path, no duplication (Req 4, AC 3)

**Resolved.** The invariant holds in the shipped skill.

**Inbound edges to `guardrails.md` — five, all defers, none restate the model:** `passing.md:10`, `passing.md:13`, `setup.md:177` ("Capture per gate as the per-gate block defined in `reference/guardrails.md`"), assisted `3 - plan.md:134` and `:228` (the `## Guardrail scopes` HTML comments, "the `.rp.md` template stays the source of truth per `guardrails.md`"). No edge from SKILL.md, `autonomous-workflow.md` (it references `passing.md:63`), or autonomous phases 4/5.

**Outbound from `guardrails.md` — zero.** No line points to another skill file; the only filenames it names are `.rp.md` (the config file) and `code-plan.md`/`docs-plan.md` (artifact filenames where the plan records the value, line 32 — the typo), not reference edges. The single-direction invariant (`guardrails.md` points back at nothing) holds.

**Duplication audit — clean:**
- Model (gate-kind definitions, fill-lifecycle prose, the `.rp.md` block fields `command`/`agents`/`fill-guidance`) appears ONLY in `guardrails.md`.
- Spawn fields and the resolved-command definition appear ONLY in `passing.md` (label `Guardrails:`/`Guardrail scopes to fill:`; definition at `passing.md:10`).
- `setup.md` DEFERS the block (line 177), does not re-show the `### <name>` template.

**Two things the design must NOT over-flag (avoid false positives):**
1. **Vocabulary reuse is not duplication.** "scoped/fixed gate" recurs in `passing.md`, `setup.md`, assisted `3 - plan.md` — these are *uses* of the model term, exactly what Req 4 intends and what the project rule "reuse the terms the skill already defines" requires. Not duplication.
2. **`load.md:22` is a catalog one-liner, not the model.** The conventions-catalog row ("Guardrails — exact commands judged pass/fail by exit code") is a load-time index gloss, outside the `passing.md → guardrails.md` model reading path. AC 3's "the model appears only in `guardrails.md`" is about the *model* (gate kinds / fill lifecycle / block), not a one-line catalog gloss. Req 4 deliberately does not list `load.md` among the defer-files. No edit warranted; do not flag it.

**Subtlety on AC 3 phrasing:** AC 3 says "`passing.md` references `guardrails.md`," but Req 4 explicitly lists setup among the files that "defer to these references." So `setup.md:177`'s inbound defer is compliant, not a path violation — the single-reading-path invariant is specifically that `guardrails.md` references nothing back, which holds. The design should describe the invariant as "`guardrails.md` is a sink (references nothing back); `passing.md` and the other defer-files point into it," not as "only `passing.md` may reference it."

**Only in-path defect:** the `docs-plan.md` typo at `guardrails.md:32` (Topic 8).

### Topic 5 — Agent profiles are self-contained (Req 5, AC 5)

**Resolved.** The rule and the property both already hold; this run *documents* the shipped state and edits nothing in `AGENTS.md` or the profiles.

**The rule's home is `AGENTS.md`** (top-level repo file, not under `skills/`). `AGENTS.md:14` verbatim: "Agent profiles must not reference any skill file or `.rp.md`; an agent reads only its own profile and its initial prompt." This already states both halves AC 5 wants; no wording change implied. The design treats `AGENTS.md` as a "document the shipped state" component — the self-containment home that makes the running-agent profiles' lack of any skill reference legitimate.

**Property holds:** a precise grep over `agents/` for `reference/`, `.rp.md`, `SKILL.md`, `guardrails.md`, `passing.md`, `skills/`, `setup.md`, `load.md` returns ZERO across all 18 profiles. (Profiles do name sibling agents and artifact filenames like `code-plan.md` — those are role/artifact references in the initial-prompt space, outside the rule's scope.)

**Faithful description of the running side (important nuance):** the "Run the guardrails" step says "Run every gate in **the guardrails convention**, exactly as its command is written" — `code-writer-tdd.md:37`, `doc-writer.md:40`, `code-reviewer.md:42`. The profiles do NOT name "the `Guardrails:` field"; they call the handed-down gates "the guardrails convention," and the empty case is "No guardrails convention — proceed" (`code-writer-tdd.md:42`, `doc-writer.md:45`, `code-reviewer.md:44`). All three reference no skill file. So the design must describe the running side as: each running agent runs every gate in the **guardrails convention it received** (the resolved commands handed in at spawn), exactly as written, referencing no skill file — and must NOT claim the profiles say "`Guardrails:` field." The orchestrator makes the link between `passing.md`'s `Guardrails:` field (orchestrator-facing label) and the agent's "guardrails convention" (agent-facing name for the same content) at spawn; the agent never needs to know `passing.md` exists. This is exactly *why* self-containment holds and why resolve (Topic 6) must complete entirely on the orchestrator side before spawn.

**Out-of-scope flag (record so the reviewer isn't surprised):** the project `CLAUDE.md` rule-set does not contain this self-containment bullet, though `AGENTS.md:14` does; the two rule-files otherwise share the list. This run's spec scopes the rule to `AGENTS.md` only (spec.md:14, AC 5), so the divergence is consistent with the spec and out of scope to reconcile here.

### Topic 6 — Resolve as an active orchestrator instruction in `passing.md` (Req 6, AC 6)

**Resolved.** This is the one wording change in the run. The lifecycle is fill → record → resolve → run; fill (plan-writer profiles), record (`## Guardrail scopes`), and run (running-agent profiles) are explicit, and resolve is the only step documented today as a passive field-content *definition* (`passing.md:10`) rather than an instruction.

**Gap confirmed precisely.** Phases 4/5 spawn running agents with only generic task-block wording — `4 - code.md:34` (writer with "the verbatim task block (Goal / Files / Changes / Type / …)"), `4 - code.md:36` (`code-reviewer` with task IDs + base ref), `5 - docs.md:34` (`doc-writer` with the verbatim task block) — none mention `Guardrails:`, `## Guardrail scopes`, or substitution. The `Guardrails:` field reaches running agents solely via the cross-cutting hook `autonomous-workflow.md:63` ("Each time you spawn an agent, include the `## Conventions` block at the top of its initial prompt per `reference/conventions/passing.md`"). And `passing.md:10` only *describes* the field's content. No imperative resolve sentence exists in phases 4/5, in `passing.md`, or anywhere — `passing.md:10`'s passive definition is the sole allusion.

**One home, `passing.md`; phases 4/5 untouched.** Because the `## Conventions` block (carrying `Guardrails:`) is injected in BOTH phases through the single `autonomous-workflow.md:63` hook, one active resolve imperative on the `passing.md` `Guardrails:` bullet covers phases 4 and 5 uniformly with zero per-phase duplication. Adding resolve lines to `4 - code.md`/`5 - docs.md` would duplicate across path files AND split resolve across homes — both violations (and against Req 6's "exactly one home"). Resolve fits `passing.md`'s charter precisely: it is the orchestrator's act of turning the recorded scope value into the ready-to-run command it hands the agent — the last hop of "how guardrails reach agents."

**Behavior-neutral, truthfully.** Running agents receive no template and no scope value and act only on what they receive (Topic 5), so for any scoped gate to run at all the substitution MUST already happen orchestrator-side before spawn, today. Req 6 only writes that existing duty down as an imperative: no new artifact, field, or phase step; no change to who resolves (orchestrator), when (before spawn), or what the agent receives (the resolved command). The only change is implicit → explicit. spec.md:28 and spec.md:43 state this; no reading of Req 6 adds behavior.

**Shape of the upgraded `Guardrails:` bullet (recommendation):** keep ONE bullet; make the imperative its own sentence and FOLD the Topic-2 resolved-command definition INTO it — the resolved command is *what the instruction produces*, so a separate definitional sentence becomes redundant (this collapses the Topic-2 double-duty into a single non-redundant active sentence). Guard the imperative to scoped gates only (fixed gates pass literally — no read/substitute). Keep "See `reference/guardrails.md`". Illustrative shape (writer to refine, not mandated):

> **Guardrails:** the gates naming this agent, each with its command. For a scoped gate, substitute the plan's `## Guardrail scopes` value into the `{scope}` command template and pass the resolved command. See `reference/guardrails.md`.

This satisfies: active imperative ("substitute … and pass"); the read step via the exact existing identifier `## Guardrail scopes` (no new notation, per the project rule); the substitute+place steps; "resolved command" carries the definition implicitly; deference to `guardrails.md` preserved; one bullet, ~2 sentences, minimalist.

**Design implication:** this supersedes review-2's design Flow line (which placed `{scope}` substitution as a phase-4/5 step). The new design's flow documents resolve in `passing.md`'s `Guardrails:` line as an active instruction the orchestrator follows at spawn, inherited by both phases through the conventions-block hook — not as a step inside phases 4/5.

### Topic 7 — Reframe review-2's contradicting spec/design statements (Req 7, AC 7)

**Resolved.** All five targets verified verbatim against the review-2 files; line numbers current (no drift): review-2 `1-spec/spec.md:9` and `:37`; review-2 `2-design-doc/design-doc.md:18`, `:57`, `:61-66`.

**Deliverable mechanics (decided): supersede via review-3 design decisions, NOT edits to review-2 artifact files.** AC 7 ("Given the pipeline's review-2 spec and design, when they are read after this run, then no statement claims…") is satisfied by the *current-run* artifacts reframing those statements: the review-3 spec already does the spec-side reframe (its Req 7 IS the reframe), and the review-3 design (this artifact) carries explicit "supersedes review-2 X" decisions. Editing a prior run's committed artifacts would rewrite history and conflicts with the project rule "describe the system as designed, not historical situations" and the spec's "never revert" (spec.md:44). **Recommended structure:** a "Supersedes review-2" section (or one Key Decision per target) in the review-3 design that quotes the old statement and states the corrected shipped truth, each tracing to review-3 spec Req 7 — making AC 7 mechanically checkable.

**The five reframes:**

1. **Review-2 Req 1 (review-2 spec.md:9)** — "A single dedicated reference explains the guardrail model end-to-end: the gate kinds, the per-pipeline fill lifecycle, **and how guardrails reach agents.**" Reframe: DROP "and how guardrails reach agents" from the first sentence — that concern now lives in `passing.md`; the guardrails reference covers the model only (gate kinds + fill lifecycle). **STAYS:** the second sentence ("The orchestrator→agent convention-passing … is documented in its own reference" — became `passing.md`) and the third ("Other files … defer").

2. **Review-2 AC 1 (review-2 spec.md:37)** — "…it explains the gate kinds, the fill lifecycle (setup → plan → resolve → run), and how guardrails reach agents, without their needing to read setup, the workflow, or the agent files." Reframe (three moves): (a) the guardrails reference is checked for the MODEL — gate kinds + fill lifecycle **as shipped**; (b) "how guardrails reach agents" is checked against `passing.md`, validation against `setup.md` + the plan-reviewers; (c) REMOVE the "without their needing to read setup, the workflow, or the agent files" claim — it is now false (the split deliberately distributes those concerns). **Sharp catch:** the shipped `guardrails.md` fill lifecycle is "who fills / per-phase spanning / plan-records-value," NOT review-2's "setup → plan → resolve → run" four-arrow chain — that old chain conflated the model with validation+resolve (now in setup/passing). The reframed AC must describe the lifecycle **as shipped**, not reproduce the four-step chain.

3. **Review-2 design `guardrails.md` component (review-2 design-doc.md:18)** — "`reference/guardrails.md` — orchestrator-facing model: gate kinds, the fill lifecycle, **the spawn fields.** Other files defer to it." Reframe: REMOVE "the spawn fields" — `guardrails.md` is the model (gate kinds, per-gate `.rp.md` block, fill lifecycle); spawn fields belong to `passing.md`.

4. **Review-2 design Decision "Two references, not one" (review-2 design-doc.md:61-66)** — choice "`guardrails.md` (model) + `conventions/passing.md` (spawn block)." Reframe to the shipped split: `guardrails.md` = the guardrail MODEL; `passing.md` = HOW GUARDRAILS REACH AGENTS — the `Guardrails:` and `Guardrail scopes to fill:` spawn fields, the resolved-command definition, AND the active resolve instruction (Topic 6). This is sharper than review-2's "model + generic spawn block": `passing.md` is specifically the home of the guardrail-passing fields and resolved-command definition, not merely a generic spawn block sitting elsewhere. (The `pipeline-versioning.md` separation trade-off still holds.)

5. **Review-2 design Flow line (review-2 design-doc.md:57)** — "…→ **in phase 4/5 the orchestrator substitutes each value into the `.rp.md` template** → the resolved command rides in the running agent's `Guardrails:` field → the agent runs it." Reframe per Req 6 / Topic 6: relocate resolve's DOCUMENTATION to `passing.md`'s `Guardrails:` line as an active instruction; remove "in phase 4/5 the orchestrator substitutes…" as a phase-located step. Behavior unchanged — fill → record → resolve (orchestrator, at spawn, per `passing.md`) → run.

**Confirmed STAYS INTACT (review-3 spec Req 7, last paragraph):** review-2 Req 1's SECOND sentence (convention-passing in its own reference — became `passing.md`) and the EXISTENCE of `passing.md`. Neither is reframed.

### Topic 8 — Artifact-name correctness: `docs-plan.md` → `doc-plan.md` (Req 8, AC 8)

**Resolved.** A single, isolated one-word fix.

`guardrails.md:32` verbatim: "The plan records the chosen scope **value** (gate → scope value) in its `## Guardrail scopes` section of either `code-plan.md` and/or `docs-plan.md`." The fix: `docs-plan.md` → `doc-plan.md` (`code-plan.md` is already correct).

A grep of the whole `skills/` tree for `docs-plan.md` returns exactly ONE hit — `guardrails.md:32`. The singular `doc-plan.md` is the established convention (19 occurrences across `assisted-phases/3 - plan.md`, `autonomous-phases/3 - plan.md`, `autonomous-phases/5 - docs.md`, `conventions/setup.md`, plus the artifact name in phase-3 output lists and the doc-plan agent profiles). Line 32 is the lone plural outlier. After the edit, a skill-wide search for `docs-plan.md` returns nothing — AC 8 satisfied.

---

## Design summary (for the design-doc-writer)

This run re-baselines review-2's design to the SHIPPED architecture; behavior is unchanged. Every component below is verified against the shipped files.

**Components (all already shipped except the noted edits):**

- **`guardrails.md` = the model only** — gate kinds (fixed/scoped), the per-gate `.rp.md` block, the fill lifecycle (who fills / per-phase spanning / plan-records-value). No validation, resolve, or spawn-field content. Edit: fix the `docs-plan.md → doc-plan.md` typo (line 32).
- **`passing.md` = how guardrails reach agents** — sole home of the `Guardrails:` and `Guardrail scopes to fill:` spawn fields and the resolved-command definition; references `guardrails.md` for the model. Edit: upgrade the `Guardrails:` bullet into an ACTIVE resolve instruction (Topic 6) — one bullet, imperative folds in the definition, guarded to scoped gates, keeps the `guardrails.md` deference.
- **Validation homes** — `setup.md` (the fixed/scoped capture-time probe, "did it execute?") and the plan phase (autonomous plan-reviewers, mirrored by the assisted `3 - plan.md` self-checks). `guardrails.md` carries none; validation is not the model's concern. Document-only.
- **`AGENTS.md` self-containment** — `AGENTS.md:14` states an agent reads only its own profile + initial prompt and references no skill file or `.rp.md`; running-agent profiles run "the guardrails convention" they received. Already correct; document-only.

**Architecture invariants:**

- Single reading path: `guardrails.md` is a sink (references nothing back); `passing.md` and the other defer-files (`setup.md`, assisted `3 - plan.md`) point into it. Model only in `guardrails.md`; spawn fields + resolved-command definition only in `passing.md`. Vocabulary reuse and the `load.md:22` catalog gloss are NOT duplication — do not flag them.
- Resolve in exactly one home (`passing.md`), inherited by phases 4/5 through the `autonomous-workflow.md:63` conventions-block hook — no per-phase resolve line.

**Key decisions to record in the design (each traces to a review-3 spec requirement):**

1. **`guardrails.md` = model; `passing.md` = how guardrails reach agents** (the shipped split) — SUPERSEDES review-2's "Two references, not one" and review-2 design `guardrails.md` component (drop "the spawn fields"). Traces Req 1, 2, 4, 7.
2. **Resolve as one active instruction on `passing.md`'s `Guardrails:` line** — behavior-neutral; SUPERSEDES review-2's Flow line (no phase-4/5 substitution step). Traces Req 6, 7.
3. **Validation documented at its performance moments** (setup + plan phase), not in `guardrails.md`. Traces Req 3, 7.
4. **Agent self-containment via `AGENTS.md`** — running agents act on the received guardrails convention, never on a skill file. Traces Req 5.
5. **Supersede review-2 via review-3 design decisions, not edits to review-2 artifact files** — a "Supersedes review-2" section quoting each of the five statements and the corrected truth, tracing to Req 7. NOTE the Target-2 catch: describe the fill lifecycle AS SHIPPED ("who fills / per-phase spanning / plan-records-value"), NOT review-2's "setup → plan → resolve → run" four-arrow chain.

**Out of scope / not flagged:** the `CLAUDE.md` vs `AGENTS.md` self-containment-bullet divergence (spec scopes the rule to `AGENTS.md`); structural tests over skill prose (project rule forbids).
