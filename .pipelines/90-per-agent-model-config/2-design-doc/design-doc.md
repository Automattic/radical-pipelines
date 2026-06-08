# Design Doc — Optional convention for per-agent model configuration

Source issue: [Automattic/radical-pipelines#90](https://github.com/Automattic/radical-pipelines/issues/90) — "Optional convention for per-agent model configuration"

Inputs: `1-spec/spec.md` (15 requirements, 16 ACs), `2-design-doc/design-doc-research.md` (full Q&A record + decided topics).

## 1. Summary

This feature lets a project decide, once, which model each spawned phase agent runs on — and tune model settings such as reasoning `effort` — and have those choices honored on every subsequent autonomous pipeline run, without baking any model or settings choice into the generic agent profile files. A project that configures nothing is completely unaffected and keeps today's behavior in both supported runtimes.

This is a **documentation-as-implementation** feature. Radical Pipelines has no executable orchestration code: the "code" is the prose in the project's `.rp.md` config file and the reference Markdown files under `skills/radical-pipelines/reference/` that the orchestrator — an LLM agent — reads and follows at runtime. There is nothing to compile, no parser, no schema validator. "Components" are reference files and `.rp.md` sections; "interfaces" are the conventions table, the per-tool `.rp.md` blocks, and the spawn-time instructions the orchestrator follows. Designing this feature therefore means deciding **what prose to add and where**, so that an LLM reading it behaves the way the spec requires.

The design is **purely additive**. A project optionally records, in `.rp.md`, an `### Agent models` block under each per-tool section (`## Claude Code`, `## Pi`). The block is a bold-label bullet list: a reserved `**Default:**` bullet plus one `**<agent-name>:**` bullet per configured agent, each carrying a tool-native model string and optional settings. At the start of every run the orchestrator already reads `.rp.md`. In the autonomous spawn loop, for each agent it spawns, the orchestrator resolves — under the active tool, **per key** (the model and each setting independently) — the agent's entry → else the `Default` → else today's behavior, and applies the resolved model/settings as **parameters of the spawn itself** (a different channel than the prompt-embedded conventions), passing values **verbatim** with no translation and no pre-validation. The runtime is the authority on validity: a rejected value surfaces through the existing escalation path (now carrying the rejected configured value); an unauthenticated provider flows through the existing login/API-key recovery swap, which is transient, never written back to `.rp.md`, and must never re-select the model that just failed auth.

## 2. Background: how spawning works today (verified)

Understanding the existing mechanism is necessary because the feature attaches to it rather than replacing it.

- **The orchestrator reads `.rp.md` at the start of every workflow.** `conventions/load.md:5-7`: "Project-specific conventions are stored in the `.rp.md` file. Read it at the start of any workflow … you must load and verify it before starting any workflow." Anything in `.rp.md` is therefore re-read every run with zero extra machinery.
- **Conventions are optional or required via one column.** `load.md` holds a conventions table with a `Required?` column (`load.md:11-20`). The "missing → stop and offer setup" branch (`load.md:24-28`) triggers **only** when "one or more **required** conventions are missing." Two existing rows are `Required? = No` (`Commit format` `load.md:15`, `Team spawning` `load.md:19`), confirming optional conventions can be absent without ever tripping the stop.
- **The autonomous spawn loop lives in `autonomous-workflow.md`.** Its `## 5. Execute the planned phases` section ends with an `Important:` block (`autonomous-workflow.md:56-62`) that today does two relevant things:
  - References the **Team spawning** convention by name for how to launch teams (`:58`) — it never names a tool primitive like `TeamCreate`.
  - Lists the conventions placed in **each agent's initial prompt** (`:59-61`): **Artifact folder** and **Commit format**. This is the **prompt channel**.
- **Tool primitives live only in the per-tool convention files.** `conventions/claude-code.md` and `conventions/pi.md` each hold a canonical ` ```markdown ` block that is the seed for a project's `.rp.md` per-tool section, plus (for Pi) a `## Setup actions` section. The generic workflow refers to conventions by name; the concrete mechanism (e.g. `TeamCreate`, `pi-teams` `spawn_teammate`) lives only here. This generic-vs-tool-specific split is the established house pattern.
- **Health monitoring and recovery live in `health-monitoring.md`** (tool-agnostic) plus a Pi-only recovery procedure duplicated in two places: the dogfood `.rp.md` (`### Pi team spawning`, `.rp.md:119-130`) and the canonical seed `conventions/pi.md:30`. `health-monitoring.md:30-39` is a recovery table with a 2-retry budget per issue; the `Login / API-key error` row (`:36`) already does swap → re-spawn → escalate. `health-monitoring.md:43-48` is the escalation payload: Agent name / Error verbatim / Last-known progress / Suggested next step.
- **The configuration is `.rp.md`-only and re-read each run; the recovery swap is in-session and never persisted.** No current text writes a swapped recovery model back to any file. This boundary — config read only from `.rp.md`, recovery swap never written back — is what makes the persistence and transience invariants hold (Sections 8–9).

Verified facts about the spawn surface, per tool:

- **Claude Code — verified.** `claude --help` and `claude agents --help` (CC v2.1.168) expose `--model <model>` ("alias for the latest model e.g. 'sonnet'/'opus', or a model's full name e.g. 'claude-opus-4-8'" — exactly the spec's CC value forms), `--effort <level>` with the enumerated set `{low, medium, high, xhigh, max}`, and `--fallback-model <model>`, all as per-dispatched-agent defaults. A real prior subagent run was observed executing on `claude-opus-4-8`, so per-agent model-at-spawn is real and observable.
- **CC frontmatter `model:` exists and works — but is the wrong channel.** Two real files carry a `model:` frontmatter key (this repo's `agents-examples/spec-writer.md` → `model: opus`; the official CC `feature-dev/code-reviewer.md` → `model: sonnet`). This project's own `agents/*.md` deliberately carry **no** `model:` key (verified: `grep -l '^model:' agents/*.md` → none across all 17). Using frontmatter `model:` would change the agent's generic profile file — exactly what R10/AC11 forbid. See Section 7.
- **Pi — inferred, not verified (binary absent: `which pi` → not found).** Repo docs give the convention: `pi-teams` with `create_predefined_team` preferred, else `team_create` + `spawn_teammate`, spawning with provider-qualified `provider/model` (`conventions/pi.md:24,30`; `.rp.md:115-130`). The repeated "prefer provider-qualified `provider/model`" guidance only makes sense if the spawn call accepts a per-teammate model argument, so a per-teammate model is almost certainly supported — but the exact argument name, and whether Pi exposes a per-teammate effort/settings knob at all, are model knowledge, not verified here. See Open Questions.

The 17 agent names (verified from `agents/*.md` frontmatter): `spec-researcher`, `spec-analyst`, `spec-consolidator`, `spec-writer`, `spec-reviewer`, `design-doc-analyst`, `design-doc-researcher`, `design-doc-writer`, `design-doc-reviewer`, `code-plan-writer`, `code-plan-reviewer`, `code-writer`, `code-reviewer`, `doc-plan-writer`, `doc-plan-reviewer`, `doc-writer`, `doc-reviewer`. None is named `default`, so the reserved `Default` label cannot collide with a real agent name.

## 3. Architecture overview

Five interfaces, in data-flow order. Each maps to specific requirements/ACs (cited inline).

1. **Authoring interface — project → `.rp.md`.** The optional `### Agent models` block under each per-tool `##` heading. Keys are exact agent names plus the reserved `Default`; values are tool-native and opaque (R1–R3, R8; ACs 1–4, 9).
2. **Conventions interface — `load.md` table.** One new row marking the convention `Required? = No`, so the missing-conventions stop never fires on it (R5, R6; ACs 6, 7).
3. **Resolution interface — orchestrator, per spawn.** `(active tool, agent name) → {model?, settings?}` by per-key most-specific-wins: agent entry → Default → nothing (R1–R3; ACs 1–4, 8). Lives as a new tool-agnostic step in `autonomous-workflow.md`.
4. **Application interface — orchestrator → runtime.** The resolved values become **spawn parameters** (CC `--model`/`--effort`-equivalent; Pi `provider/model` + any settings), distinct from the prompt channel (Artifact folder + Commit format), passed verbatim with no translation and no pre-validation (R9, R10; ACs 9, 10, 11). The concrete per-tool surface lives in `conventions/claude-code.md` / `pi.md`.
5. **Failure interface — runtime → owner.** A rejected value surfaces through the existing escalation payload plus the rejected configured value (R11; AC12); an auth failure flows through the existing recovery swap — transient, never written back, excluding the just-failed model (R12–R15; ACs 13–16). Lives in `health-monitoring.md` plus the Pi recovery text in `.rp.md`/`pi.md`.

### Files touched

All Markdown; the "code" is prose the LLM orchestrator follows.

| File | Change | Serves |
| --- | --- | --- |
| `.rp.md` (this repo's dogfood copy) | New optional `### Agent models` block under `## Claude Code` and `## Pi`; disambiguate the Pi recovery steps (`.rp.md:123/126/127`) | R1–R3, R8; R15 (recovery) |
| `skills/radical-pipelines/reference/conventions/load.md` | One new optional row `Agent models … No` in the conventions table | R5, R6 / ACs 6, 7 |
| `skills/radical-pipelines/reference/conventions/setup.md` | Document the `### Agent models` shape (so the orchestrator can write it on opt-in) + one mentioned-but-skipped sentence in the collection flow | R4–R6 (discoverability/optionality) |
| `skills/radical-pipelines/reference/conventions/claude-code.md` | Forced canonical block **unchanged**; add a one-line breadcrumb below it pointing to the `setup.md` shape; add a one-line concrete CC spawn-surface note (`--model`/`--effort`-equivalent at spawn) | R8, R10 |
| `skills/radical-pipelines/reference/conventions/pi.md` | Forced canonical block **unchanged**; add a one-line breadcrumb; add a one-line concrete Pi spawn-surface note (`provider/model` + settings on `spawn_teammate`/`create_predefined_team`); mirror the AC16 recovery disambiguation (`pi.md:30`) | R8, R10, R15 |
| `skills/radical-pipelines/reference/autonomous-workflow.md` | New tool-agnostic step in the spawn loop (near `:59-62`): resolve via the **Agent models** convention and apply via the active tool's spawn mechanism, verbatim, not in the prompt | R1–R3, R9, R10 / ACs 1–4, 9–11 |
| `skills/radical-pipelines/reference/health-monitoring.md` | Conditional **Rejected configured value** escalation bullet; one new no-retry recovery row for deterministic configured-value rejection; one transience-invariant line after the table | R11, R14 / ACs 12, 15 |
| `README.md` | One-clause addition to the per-tool-section catalog (`:157`, `:167`) mentioning the optional `Agent models` block | documentation completeness |
| `agents/*.md` | **Untouched** — no `model:` frontmatter, no behavior-instruction edits | R10 / AC11 (explicit non-change) |

## 4. The configuration shape and its placement

### 4.1 Shape: a bold-label bullet list under a per-tool `###` heading

`.rp.md` has a deliberate, verified, **table-free** voice: every convention in the project-authored config is expressed as prose, a bold-label bullet list, or a fenced code block (`grep -c '^|' .rp.md` → 0). The tables that exist in the repo (the `load.md` conventions table, the "Required agents" tables in the phase references) are documentation *about* the system, not project-authored config — so they are not the precedent to mirror here. No YAML/TOML/JSON fenced block exists anywhere under `skills/.../reference/`; a structured-data block would be a foreign idiom, and the worst fit for an LLM reader (it invites mis-parsing of a block that is never actually parsed).

**Decision:** the convention is a **bold-label bullet list under a per-tool `###` heading named `### Agent models`**, one such block under `## Claude Code` and one under `## Pi`. This matches `.rp.md`'s house style exactly and is unambiguous for the orchestrator: each agent is its own bold key, and the reserved `Default` label cannot collide with any of the 17 real agent names.

- The **project-wide default** is a reserved `**Default:**` bullet at the top of each tool block.
- Each configured agent is a `**<agent-name>:**` bullet.
- An entry that carries only a model gives the model **inline** after the bold label. The common single-setting case adds the setting inline as well (`effort \`high\``). An entry that carries **multiple settings** uses **nested sub-bullets** under the agent's bold label (one for the model, one per setting), so the block scales to "other runtime-supported settings" without changing idiom.
- A one-sentence lead-in states the resolution rule the orchestrator executes and pins the per-tool scoping: *for the active tool, use the agent's entry if present, else the `Default`, else today's behavior (no override).*

Rejected alternatives: a **Markdown table per tool** (most scannable, mirrors the agent-name-keyed tables elsewhere, but would be the *first ever table in `.rp.md`* and breaks the file's table-free voice); a **fenced structured block** (foreign idiom, worst for an LLM reader). Both were rejected to avoid importing an idiom into the one file that has consistently avoided it. The tool-conflation risk (Section 10) is identical across all shapes and is handled structurally by the per-tool headings, not by the bullet/row choice.

### 4.2 Illustrative shape

Claude Code block (Pi block is identical in structure, with `provider/model` values):

```markdown
### Agent models

Optional. For the active tool, spawn each agent on the model/settings of its entry below; an agent with no entry uses **Default**; with no applicable default it keeps today's behavior (no model/settings override).

- **Default:** `sonnet`, effort `medium`
- **spec-writer:** `claude-opus-4-8`, effort `high`
- **code-reviewer:** `opus`
```

Pi equivalent: `**Default:** anthropic/claude-sonnet-4-6, effort medium`, `**spec-writer:** anthropic/claude-opus-4-8, effort high`, etc. The exact value strings and settings keys are project-authored and opaque pass-through — this design fixes the *shape*, not the value vocabulary.

An entry carrying multiple settings takes the nested form:

```markdown
- **code-writer:**
  - model `claude-opus-4-8`
  - effort `high`
  - <other-runtime-setting> `<value>`
```

### 4.3 Placement: where the shape is documented and seeded (canonical-template tension)

The per-tool canonical ` ```markdown ` blocks in `claude-code.md`/`pi.md` are framed as **tool-forced**: `claude-code.md:3-7` says "three project conventions are **forced** by Claude Code's tool surface … Do not ask the owner to choose alternatives for these, the tools constrain the answer. The block below is the canonical content for `.rp.md`." Pi's block (`pi.md:5`) is "Canonical `.rp.md` content for Pi." These blocks document the *forced shape*, the opposite of a project-taste choice. Adding an *optional, project-chosen* `### Agent models` stanza inside them would be a semantic mismatch — and risks an "example, delete if unused" stanza being copied into a fresh project's `.rp.md` as dead scaffolding, violating "absence = zero footprint."

A key enabling fact removes the pressure to inline it: the canonical blocks are **read as reference templates, not copy-pasted verbatim by setup** (verified `setup.md:176-182` says only "Write `.rp.md` with the conventions"; step 3, `setup.md:159-166`, consults the tool rules only for a `## Setup actions` section). So the optional convention does **not** have to live inside the forced block to be writable.

**Decision:** keep the forced canonical blocks **exactly as they are**. Document the `### Agent models` shape — lead-in sentence + `Default`/per-agent bullet form + the resolution rule — in a new short subsection of `setup.md` (the file that already documents the other optional, project-chosen conventions, Commit format and Spawning teams). Add a **one-line prose breadcrumb below each canonical block** (outside the fence) noting that a project may add an optional `### Agent models` block per the `setup.md` documentation. This recovers inline discoverability with a one-line pointer without polluting the forced fence.

### 4.4 Setup-flow handling: mentioned-but-skipped

The spec repeatedly emphasizes that absence must be truly inert and frictionless (R5, R6, AC7). A prompted setup step (like Commit format, `setup.md:54-60`) would force every setup to answer a question the common case ("defaults are fine") does not need; a documented-only-but-unmentioned approach loses discoverability.

**Decision:** **mentioned-but-skipped.** Setup does not run a per-agent Q&A loop. It states, in one sentence in the collection flow, that per-agent models can optionally be pinned and points to the `### Agent models` shape documentation, then moves on. The shape itself **is** documented (non-optional) in `setup.md` so the orchestrator can produce a correct block when the owner opts in. This keeps setup frictionless while still telling the owner the capability exists — the best balance between the existing prompted-optional (Commit format) and document-once (Spawning teams) precedents.

### 4.5 Optionality and persistence wiring

- **Optionality (AC6, AC7):** add one row to the `load.md` conventions table, `Required? = No`:

  `| Agent models      | Which model/settings each spawned agent runs on               | No        |`

  Key the `Convention` cell to the same name as the `.rp.md` heading (`Agent models`) so the table and the file agree. Because the missing-conventions stop keys only off `Required? = Yes` (`load.md:24-28`), an absent or empty `### Agent models` block is inert by construction — AC6/AC7 hold with no special-casing, exactly like the existing `Commit format`/`Team spawning` optional rows. The `What it covers` cell mirrors the terse present-tense voice of the other rows.
- **Persistence (R4, AC5):** no new machinery. Persistence holds by location alone — the block lives in `.rp.md`, which `load.md:5-7` re-reads at the start of every workflow. The one invariant to keep explicit: the per-agent config is read **only** from `.rp.md`, and the transient failure-recovery swap is **never** written back to it, so each fresh spawn returns to the configured model (feeds Section 9).
- **README catalog (documentation completeness):** README's per-tool-contents catalog (`README.md:157`, `:167`) enumerates worktrees, branch names, team spawning, health monitoring; add an "Agent models" mention so the catalog stays complete regardless of the canonical-template decision.

## 5. Per-spawn resolution algorithm

This is the core mechanism. It is added as **one new tool-agnostic step** to the spawn loop in `autonomous-workflow.md`, a sibling of the existing prompt-channel step (`autonomous-workflow.md:59-62`). The step names the **Agent models** convention by name (not a tool primitive), states the algorithm, and says to apply the result via the active tool's spawn mechanism, verbatim, with no translation and no pre-validation. This matches the verified generic-vs-tool-specific split: the generic workflow owns the algorithm and the channel; the per-tool convention files own the concrete mechanism. Putting the whole instruction in the per-tool files only was rejected because it would duplicate the tool-independent algorithm into two files and invite drift.

### 5.1 Two-step lookup (per agent, under the active tool)

For the agent being spawned, under the **active tool's** `### Agent models` block:

1. If the agent has an entry → use that entry's model and settings.
2. Else if a project-wide **Default** is configured → use the Default's model and settings.
3. Else → spawn with **today's behavior**: no model/settings override, inheriting the runtime/session model and that model's default settings.

Configured values are passed **verbatim** to the spawn mechanism — no translation between tools, no pre-validation against any capability matrix. This realizes AC1 (agent-specific), AC2 (default for unconfigured), AC3 (agent overrides default), AC8 (partial config), AC6/AC7 (no config → today's behavior), and AC9/AC10 (per-tool form, verbatim pass-through).

There are exactly **two key kinds**: an exact agent name, and the reserved `Default`. No prefix/glob keys (`spec-*`, etc.) are interpreted — name-pattern grouping is out of scope (Section 11).

### 5.2 Per-key resolution (the AC4 precision point)

AC4 (`spec.md:82-85`) says settings "use the same name-keying and the same 'agent-specific overrides default' precedence as the model itself." The spec does not pin down how a partial entry combines with the Default. Consider an agent entry that sets a **model** but no `effort`, while the **Default** sets an `effort`. There are two readings:

- **Per-key:** the agent's model combines with the Default's effort.
- **Whole-entry:** the agent's entry fully replaces the Default for that agent, so it gets the agent's model and *no* effort.

**Decision: per-key resolution.** The model and each named setting resolve **independently**, each by the same most-specific-wins rule. For a given key (the model, `effort`, or any other runtime setting): use the agent entry's value if it specifies that key, else the Default's value for that key, else nothing for that key (today's behavior for that dimension). An agent entry that pins only a model therefore **inherits the Default's `effort`**.

Rationale: this is the most literal reading of AC4 — "settings use the same name-keying and the same precedence **as the model itself**" frames each setting as a parallel, independently-keyed dimension that resolves exactly like the model, not as a bundle whose presence overrides wholesale. It is also more expressive (the common "everything on the Default effort, but agent X on a bigger model" case works without restating effort on X) and never produces the surprising whole-entry result where adding a model to an agent silently strips its effort.

This is a design choice the spec did not pin, so it is stated here explicitly (rather than assumed) and flagged as a review point (Section 12, risk 5). The lead-in sentence in the `### Agent models` block and the `autonomous-workflow.md` step must both state the per-key rule unambiguously.

## 6. Application channel: spawn parameters, not the prompt

Two distinct channels exist in the spawn loop; the design keeps them separate (R10, AC11):

1. **Prompt channel (unchanged).** The orchestrator places convention *instructions* in each agent's initial prompt — **Artifact folder** and **Commit format** (`autonomous-workflow.md:59-61`). Model/settings are **not** added here.
2. **Spawn-parameter channel (new).** The orchestrator applies the resolved model/settings as **parameters of the spawn itself**: CC `--model`/`--effort`-equivalent on the agent spawn; Pi `provider/model` + any settings on `spawn_teammate`/`create_predefined_team`.

The new `autonomous-workflow.md` step is worded as a sibling of the prompt-channel step and explicitly says "apply as parameters of the spawn itself, not in the agent's initial prompt." This realizes AC11's first clause (model/settings ride the spawn, separate from prompt-embedded conventions) and prevents the orchestrator from conflating "configured model" with "a thing to write into the prompt."

The concrete spawn surface is documented as **one line each** in the per-tool files, next to the existing team-spawning convention:

- `conventions/claude-code.md`: the CC `--model`/`--effort`-equivalent applied at the agent spawn.
- `conventions/pi.md`: the `provider/model` and any settings on `spawn_teammate` / `create_predefined_team`.

These name the verified CC surface and the inferred Pi surface as concrete examples; the exact tool-parameter name is finalized at implementation (Open Questions 1–2).

## 7. Profiles untouched; the frontmatter `model:` channel is forbidden

The generic `agents/*.md` profiles are **untouched** — no `model:` frontmatter, no behavior-instruction edits — realizing AC11's second clause (the agent's behavior instructions and generic profile file are unchanged).

The design **explicitly forbids** using the CC agent-frontmatter `model:` key (or any edit to `agents/*.md`) to carry the configured model. Although that channel is verified to exist and work, using it would change the agent's generic profile file, violating R10/AC11. The model/settings must ride the **spawn-parameter channel only**. This prohibition is stated explicitly so the plan/code phases do not "helpfully" add `model:` to the profiles as a shortcut (Section 12, risk 3).

## 8. Error and escalation on runtime rejection of a configured value

When the active runtime rejects a configured value at spawn — a bad `effort` for the chosen model, an unknown/mistyped model string, or an unauthenticated provider — the orchestrator must not silently ignore or silently substitute, and the failure must surface to the owner via the existing escalation path identifying the affected agent, the rejected configured value, and the runtime's verbatim error (R11, AC12).

### 8.1 Escalation payload gains a conditional field

Add one **conditional** bullet to the escalation payload (`health-monitoring.md:43-48`), between **Error verbatim** and **Last-known progress**:

> **Rejected configured value** *(when the failure is a rejected model/settings configuration)* — the exact configured value the runtime rejected (the agent's configured model string or `effort` level), as written in the **Agent models** convention.

Rationale: AC12 requires the escalation to identify the affected agent + the rejected configured value + the verbatim error. **Agent name** and **Error verbatim** already exist in the payload; the rejected configured value does not. Folding it into an existing field is a category error — it is a *fact about the failure*, not a *suggested action* (so it does not belong in "Suggested next step"), and the runtime's verbatim error may not echo the exact configured string the orchestrator sent. The "(when…)" qualifier keeps it from cluttering the four non-config escalation types (stall, message failure, login, network).

### 8.2 Deterministic configured-value rejection escalates without retries

The recovery table's 2-retry budget (`health-monitoring.md:30-39`) assumes **transient** failures where a retry can succeed. Two of the three AC12 rejection cases are **deterministic**: a bad `effort` for the chosen model and an unknown/mistyped model string fail identically on re-spawn, so burning the budget on an identical re-spawn is pure waste and delays the owner's fix. The third case — an **unauthenticated provider** — is recoverable via model swap and stays in the existing `Login / API-key error` row (that is AC14, Section 9).

**Decision:** add **one new row** to the recovery table for the deterministic case (no retries, escalate immediately):

> `| Rejected configured value (non-auth) | — (deterministic; re-spawning the same value fails identically) | — | Report to owner immediately, do not retry |`

plus a one-line note under the table: a configured-value rejection that is **not** an auth error is deterministic — escalate without spending the retry budget on an identical re-spawn.

Rationale: the new row is additive (touches none of the four existing rows) and uses the table's existing Retry 1 / Retry 2 / Escalate columns. The discriminator — "did the runtime reject *authentication* (→ swap, AC14) or reject the *value as invalid* (→ escalate immediately, AC12)" — is exactly the AC12-vs-AC14 split, so the two rows keep the two ACs from colliding. A single sentence under the table was the alternative; the row was chosen because it matches how the other failure classes are modeled and is more scannable. This honors the spec's "no silent ignore, no silent substitute, runtime is the authority, no pre-validation."

## 9. Interaction with the existing failure-recovery model swap

The four recovery invariants (R12–R15, ACs 13–16): the configured model takes effect at the initial spawn; a recovery swap applies only to the recovery re-spawn; the swap is transient and never mutates `.rp.md`; recovery never re-selects the exact model that just failed auth.

The Pi login/API-key recovery procedure is duplicated in **two places that must stay consistent**: the dogfood `.rp.md:119-130` (`### Pi team spawning`) and the canonical seed `conventions/pi.md:30`. Both are **Pi-only** — `conventions/claude-code.md` and `.rp.md`'s CC section carry zero login/recovery/model-swap text, because CC auth is interactive `/login`, not provider-qualified model selection. Any AC16 disambiguation must edit **both** files to avoid drift.

### 9.1 AC13 — configured model at the initial spawn (no recovery-text change)

All recovery text is gated on a failure having already occurred (`.rp.md:121` "**If** a spawned Pi teammate fails…"; the recovery row is a *retry* action) and says nothing about the initial spawn. AC13 is owned entirely by the Section 5 resolution step. No recovery-text change is needed for it.

### 9.2 AC14 — a swap applies only to the recovery re-spawn

Already scoped correctly (`.rp.md:123` already says "Treat the failed provider as unavailable **for this retry**"). Append one clause to the "Retry the spawn" step (`.rp.md:127`):

> — this replacement model applies only to this recovery re-spawn, not to the agent's configured model.

This makes the retry-scoping explicit at the point of action and sets up the transience invariant (9.3) without redesigning recovery.

### 9.3 AC15 — the swap is transient; no `.rp.md` mutation

No current text writes a swapped model back (recovery is entirely in-session: `pi --list-models` → pick → retry, `.rp.md:125-127`), so AC15 holds today. The spec wants it stated as an explicit invariant to guard against a future reader persisting the swap. Add one tool-agnostic one-liner immediately after the recovery table (`health-monitoring.md`, ~`:39`):

> A recovery model swap is **transient**: it applies only to the recovery re-spawn and is **never written back to `.rp.md`**. The next fresh spawn of any agent re-reads the **Agent models** convention and runs on the configured model again.

`health-monitoring.md` is the tool-agnostic home of recovery semantics and covers both runtimes from one place, avoiding duplication into the Pi-only `.rp.md`/`pi.md`. The 9.2 clause at the Pi site doubles as local reinforcement.

### 9.4 AC16 — recovery never re-selects the just-failed model

**The collision:** `.rp.md:126` reads "Prefer the owner's configured default provider/model when present." With this feature, "configured default provider/model" is ambiguous between (intended) the owner's *environment/Pi* default fallback preference and (newly colliding) the per-agent **Agent models** entry — which may be exactly the model that just failed auth. The second reading would re-pick the failed model and loop.

**Decision:** revise the Pi recovery steps so recovery's fallback is explicitly distinct from the per-agent config and excludes the just-failed model:

- **Step 1 (`.rp.md:123`):** broaden the exclusion to the *model*, not just the provider — "Treat **the model that just failed authentication** as unavailable for this retry (and the failed provider, unless the owner explicitly asked to use it)."
- **Step 4 (`.rp.md:126`):** replace the ambiguous phrase — "Choose a provider-qualified replacement model from authenticated providers, **excluding the model that just failed authentication**. This recovery choice is a **fallback preference**, distinct from the per-agent **Agent models** configuration (which governs the initial spawn): prefer the owner's **environment/Pi default** authenticated provider/model when present; otherwise the closest suitable authenticated model for coding work. **Do not re-select the per-agent configured model that just failed.**"
- **Step 5 (`.rp.md:127`):** append the transience clause from 9.2.
- **`conventions/pi.md:30`:** mirror the compressed version — "…pick an authenticated provider-qualified model **other than the one that just failed**, and retry — this recovery fallback is distinct from the per-agent **Agent models** config and must not re-select the failed model…"
- Keep `.rp.md:130` ("Keep this recovery provider-neutral. Do not hardcode any provider as the fallback default") **unchanged** — the fallback stays "among authenticated providers," no provider hardcoded.

This satisfies AC16's three sub-requirements: (a) per-agent **Agent models** governs the initial spawn (stated as the distinction); (b) recovery's fallback explicitly excludes the just-failed model; (c) the ambiguous "configured default" phrase now unambiguously means recovery's fallback preference among authenticated providers, not "re-read the Agent models entry." Editing **both** `.rp.md` and `pi.md` keeps the dogfood copy and the canonical seed consistent. No recovery *mechanism* is redesigned — only the invariant wording the spec fixes (R12–R15).

**CC `--fallback-model` is an explicit non-mechanism for AC16.** Verified via `claude --help`: it is an *automatic, in-CLI* fallback for when a model is **overloaded or unavailable** (capacity, HTTP-529-class), **not** an *authentication* failure, and it is CC-only. It does not know which model "just failed auth" in the orchestrator's sense and is not provider-qualified-model recovery. Note it as a non-mechanism so a future reader does not conflate the two paths.

## 10. Failure-recovery interaction invariants (summary)

Pulled together for the implementer, since these four invariants span multiple files and must stay mutually consistent:

1. **Initial spawn uses the configured model** (Section 5; AC13). Owned by the resolution step; recovery text never touches the initial spawn.
2. **A recovery swap is re-spawn-scoped** (Section 9.2; AC14). Stated at the Pi retry step and reinforced by the transience invariant.
3. **A recovery swap is transient and never persisted** (Section 9.3; AC15). The config is read only from `.rp.md`; the swap is never written back. Each fresh spawn re-reads the config.
4. **Recovery excludes the just-failed model** (Section 9.4; AC16). The per-agent config (initial spawn) and recovery's fallback preference (post-auth-failure) are kept distinct in the prose, so recovery cannot loop on the failed model. The Pi recovery text is edited in both `.rp.md` and `pi.md` to prevent drift.

## 11. Scope decision: no name-pattern / glob grouping

The `### Agent models` block has exactly two key kinds: an exact agent name and the reserved `Default`. No prefix/glob keys (`spec-*`, etc.) are interpreted. The two-step resolution (exact entry → Default → today's behavior) is the whole rule.

The spec explicitly defers name-pattern grouping ("considered and deferred; it may be revisited in the design phase but is not a requirement") and does not require it. Excluding it keeps the resolution rule maximally simple and unambiguous for the LLM orchestrator (one exact-match lookup plus a single reserved default), which is the safest reading behavior. It is a clean future extension: a later revision could add an intermediate "name-pattern" tier between exact-match and `Default` (precedence: exact > pattern > default > unset) without disturbing the file shape or the exact/Default entries already in use. Recorded as a deliberate scope exclusion with a forward path, not an open question.

## 12. Risks and mitigations

1. **Tool-block conflation by the orchestrator (LLM-reader risk).** The CC and Pi `### Agent models` blocks carry the *same agent names* with *different value strings*; the biggest risk is the orchestrator reading the wrong tool's block and passing a Pi `provider/model` to Claude Code or vice-versa. **Mitigation:** entries live strictly under the existing per-tool `## Claude Code` / `## Pi` headings; both the `autonomous-workflow.md` step and the block's lead-in say "use the block for the **active tool**." The verbatim pass-through + runtime-rejection path is the backstop — a cross-tool value is rejected at spawn and escalated (AC12), not silently mis-run.
2. **AC16 recovery-loop regression if the two Pi recovery copies drift.** The disambiguation must land in **both** `.rp.md:119-130` and `conventions/pi.md:30`. If only one is edited, a project seeded from the canonical block could still read "prefer the configured default" and loop on the just-failed model. **Mitigation:** the design lists both files as a paired edit; the plan phase should treat them as a single change.
3. **Plan/code phase "helpfully" using the frontmatter `model:` channel.** The CC frontmatter `model:` key is verified to exist and work, making it a tempting shortcut that would violate R10/AC11. **Mitigation:** the design explicitly forbids editing `agents/*.md` and names the spawn-parameter channel as the only allowed one (Sections 6–7).
4. **Dogfood `.rp.md` vs. seeded `.rp.md` divergence.** This repo is the unusual multi-CLI consumer whose `.rp.md` carries both tool sections and is hand-maintained (`README.md:167`). The `### Agent models` block, the `load.md` row, the `setup.md` shape doc, and the `pi.md`/`claude-code.md` seeds must all describe the **same** shape, or a fresh project's seeded `.rp.md` will not match what the orchestrator expects to read. **Mitigation:** the design keeps one canonical shape and routes all documentation to it; the README catalog update is the cross-check.
5. **Per-key settings resolution is a design choice the spec did not pin.** If a downstream reviewer expected whole-entry override, the per-key decision (Section 5.2) could be challenged. It is defensible (most literal reading of AC4, more expressive, no surprising effort-stripping) and is stated explicitly with rationale so it is reviewed on its merits rather than assumed.

## 13. Open questions (carried forward; resolve in plan/code phases)

These do not block the design — it is feasible and complete against the spec — but the implementation phases must resolve them concretely. They are recorded honestly here because they could **not** be verified in this environment.

1. **Exact CC spawn-parameter name for per-agent model/effort.** Verified: CC supports per-agent `--model` and `--effort {low,medium,high,xhigh,max}` at session and dispatched-agent scope, and per-agent model application is real and observed. **Not verifiable here:** whether the orchestrator sets these via a field on the team-create/agent-launch tool call, via the `claude agents` CLI surface, or another path. The design stays at "apply via the active tool's spawn mechanism"; the implementer must confirm the concrete `TeamCreate`/`Agent` (or CLI) parameter against the live tool and write it into `conventions/claude-code.md`.
2. **Pi per-teammate model and settings arguments.** The Pi binary was absent (`which pi` → not found), so the exact `spawn_teammate` / `create_predefined_team` argument for a per-teammate `provider/model`, and whether Pi exposes any per-teammate `effort`/settings knob at all, are inferred-but-unverified. The implementer must confirm against a live Pi and write the concrete surface into `conventions/pi.md`. If Pi has **no** per-teammate settings knob, the `effort`/settings portion of the Pi `### Agent models` block is simply inapplicable for Pi (model-only) — which the opaque-pass-through design already tolerates, but the Pi docs should say so.
3. **Settings vocabulary beyond `effort`.** The spec allows "other runtime-supported settings" but only names `effort`. The design keeps settings opaque, so the file shape (inline or nested sub-bullets) already accommodates unknown keys. The implementer need not enumerate them; the `setup.md` shape documentation should show `effort` as the worked example and state that other runtime-supported settings follow the same form.
4. **Exact final wording of every edited line.** This design fixes the *content and placement* of each edit and gives proposed wording; the plan/code phases finalize exact prose (the `load.md` row text, the recovery-step rewrites, the new `autonomous-workflow.md` step, the `setup.md` subsection). The wordings here are starting points, not frozen strings.
