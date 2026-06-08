# Code Plan: Optional convention for per-agent model configuration

Source issue: [Automattic/radical-pipelines#90](https://github.com/Automattic/radical-pipelines/issues/90) — "Optional convention for per-agent model configuration"

Inputs: `1-spec/spec.md` (15 requirements, 16 ACs), `2-design-doc/design-doc.md`.

## Overview

This is a **documentation-as-implementation** feature: Radical Pipelines has no executable orchestration code. The "code" is the prose an LLM orchestrator reads and follows at runtime — the project's `.rp.md` config file and the reference Markdown under `skills/radical-pipelines/reference/`. So every task below is a prose edit to a source/convention/template file, and "acceptance" means the edited prose unambiguously makes an LLM reader behave as the spec requires. The design is **purely additive**: a project may optionally record an `### Agent models` block under each per-tool section of `.rp.md`; at spawn time the orchestrator resolves, per key, the agent's entry → else `Default` → else today's behavior, and applies the resolved model/settings as **spawn parameters** (not in the prompt), verbatim, with no translation and no pre-validation. A project that configures nothing is completely unaffected.

The tasks are ordered so the shared, tool-agnostic shape and resolution rule are fixed first (Tasks 1–3), the per-tool concrete surfaces and seeds follow (Tasks 4–5), then the error/recovery edits (Tasks 6–7), the dogfood `.rp.md` (Task 8, which depends on the canonical shape being settled), and finally the README catalog (Task 9). Task 10 is a final cross-file consistency verification — this feature's failure mode is documentation drift between the canonical shape and its seeds, so a dedicated reconciliation pass is warranted.

Two design choices the spec did not pin are carried forward and **must** be honored verbatim by every task that states the rule: (a) **per-key resolution** — the model and each setting resolve independently, so an agent entry that pins only a model inherits the `Default`'s `effort` (design §5.2); (b) the **frontmatter `model:` channel is forbidden** — `agents/*.md` profiles are never edited and the model never rides agent frontmatter (design §7). Two design open questions remain runtime-confirmable, not blockers: the exact CC spawn-parameter name and the exact Pi per-teammate model/settings argument (design §13 OQ1–2). Tasks that name those surfaces instruct the writer to confirm them against the live tool and otherwise keep the documented surface at the verified level.

A note on line anchors: the design cites approximate `.rp.md` line numbers (e.g. `:119-130`, step 1 at `:123`, step 4 at `:126`, step 5 at `:127`). In the current dogfood `.rp.md`, the Pi recovery procedure is the numbered list at lines 121–130: step 1 is `.rp.md:123`, step 4 is `.rp.md:126`, step 5 is `.rp.md:127`, and the provider-neutral closer is `.rp.md:130`. Tasks below cite the current file content (anchored on the exact text), not the design's approximate numbers.

## Tasks

### Task 1: Document the `### Agent models` shape and resolution rule in `setup.md`

- **Goal:** Establish the single canonical description of the optional `### Agent models` block — its lead-in sentence, its `Default`/per-agent bold-label bullet form, the inline and nested-sub-bullet variants, and the per-key resolution rule — in the file that already documents the other optional, project-chosen conventions (Commit format, Spawning teams). This is the shape every other file points at, so it is written first.
- **Files to change:** `skills/radical-pipelines/reference/conventions/setup.md`.
- **Changes:**
  - Add a new optional convention subsection under "## 2. Collect required conventions", as a sibling of `### Commit format` (`setup.md:54-60`) and `### Spawning teams of agents` (`setup.md:82-86`) — e.g. `### Agent models` — documenting the block shape so the orchestrator can write a correct block when the owner opts in. The subsection (not optional to *document*, even though the convention itself is optional) must specify:
    - The block is a bold-label bullet list under a per-tool `### Agent models` heading, one block under `## Claude Code` and one under `## Pi`.
    - A reserved `**Default:**` bullet expresses the project-wide default; each configured agent is a `**<agent-name>:**` bullet keyed by the exact agent name.
    - Values are tool-native and opaque (Claude Code bare alias / first-party ID such as `opus` / `claude-opus-4-8`; Pi provider-qualified `provider/model` such as `anthropic/claude-opus-4-8`), and the same logical choice may need a different string per tool.
    - The **inline** form for a model-only or single-setting entry (`` **spec-writer:** `claude-opus-4-8`, effort `high` ``) and the **nested sub-bullet** form for an entry carrying multiple settings (model + one sub-bullet per setting), so the block scales to other runtime-supported settings without changing idiom. Show `effort` as the worked example and state that other runtime-supported settings follow the same form (design §13 OQ3).
    - The one-sentence lead-in the block carries, stating the resolution rule and pinning per-tool scope: *for the active tool, use the agent's entry if present, else the `Default`, else today's behavior (no override)*.
    - The **per-key resolution** rule explicitly: the model and each named setting resolve independently by most-specific-wins, so an agent entry that pins only a model inherits the `Default`'s `effort` (design §5.2). This wording must not contradict the autonomous-workflow step (Task 3) or the block lead-in (Tasks 4, 5, 8).
  - In the collection flow, add **one sentence** (mentioned-but-skipped, design §4.4): state that per-agent models can optionally be pinned and point to this `### Agent models` shape documentation, then move on — do **not** add a per-agent Q&A loop or a prompted step.
- **Depends on:** none.
- **Traces to:** Spec requirements R1, R2, R3, R4, R5, R6, R8; ACs 1–5, 9; design §4.1, §4.2, §4.4, §5.2.
- **Acceptance:**
  - `setup.md` contains a subsection documenting the `### Agent models` block shape: the reserved `**Default:**` bullet, per-agent `**<agent-name>:**` bullets, the inline form, and the nested-sub-bullet form for multiple settings.
  - The documented lead-in sentence states "use the agent's entry, else `Default`, else today's behavior" and pins the rule to the active tool.
  - The per-key resolution rule is stated such that a reader concludes a model-only agent entry inherits the `Default`'s `effort` (not "strips it").
  - The collection flow gains exactly one mentioned-but-skipped sentence pointing at the shape doc, and introduces no prompted per-agent question or Q&A loop.
  - `effort` appears as the worked settings example, with a statement that other runtime-supported settings follow the same form.

### Task 2: Add the optional `Agent models` row to the `load.md` conventions table

- **Goal:** Make the convention loadable as **optional**, so an absent or empty `### Agent models` block is inert by construction and never trips the missing-conventions stop.
- **Files to change:** `skills/radical-pipelines/reference/conventions/load.md`.
- **Changes:**
  - Add one row to the conventions table (`load.md:11-20`) with `Required? = No`, keyed by the same name as the `.rp.md` heading so the table and the file agree:

    `| Agent models      | Which model/settings each spawned agent runs on               | No        |`
  - Match the terse present-tense voice of the existing rows in the `What it covers` cell; align the column padding with the surrounding rows.
  - Make no change to the "## Missing conventions" branch (`load.md:22-28`): it keys only off `Required? = Yes`, so adding a `No` row leaves the stop behavior untouched (this is the mechanism that satisfies AC6/AC7, not a new edit).
- **Depends on:** none. (Independent of Task 1, but the row name must match the heading name `Agent models` that Task 1 documents.)
- **Traces to:** Spec requirements R5, R6; ACs 6, 7; design §3 (interface 2), §4.5.
- **Acceptance:**
  - The `load.md` conventions table contains an `Agent models` row with `Required? = No`.
  - The row's `Convention` cell reads `Agent models`, matching the `.rp.md` heading name.
  - The "## Missing conventions" text is unchanged, so a missing/empty `### Agent models` block does not trigger the setup flow or a "missing convention" stop.
  - The new row's wording and column alignment match the style of the existing rows.

### Task 3: Add the per-spawn resolution-and-application step to `autonomous-workflow.md`

- **Goal:** Add the tool-agnostic instruction the orchestrator follows at each spawn: resolve the agent's model/settings via the **Agent models** convention (per-key, most-specific-wins) and apply the result as **parameters of the spawn itself**, verbatim, with no translation and no pre-validation — as a sibling of the existing prompt-channel step.
- **Files to change:** `skills/radical-pipelines/reference/autonomous-workflow.md`.
- **Changes:**
  - In the `## 5. Execute the planned phases` "Important:" block (`autonomous-workflow.md:56-62`), add a new tool-agnostic bullet (sibling of the existing "Each time you spawn an agent, include the following project conventions in its initial prompt" bullet at `:59-61`) that states:
    - For each agent being spawned, resolve under the **active tool's** `### Agent models` block by the two-step lookup: agent entry → else project-wide `Default` → else today's behavior (no model/settings override, inheriting the runtime/session model and its default settings). Name the **Agent models** convention by name; do **not** name a tool primitive (consistent with how `:58` references **Team spawning** by name).
    - Resolution is **per key**: the model and each named setting (e.g. `effort`) resolve independently by the same most-specific-wins rule, so an agent entry that pins only a model inherits the `Default`'s `effort` (design §5.2). The wording must match Task 1's per-key statement.
    - There are exactly two key kinds — an exact agent name and the reserved `Default`; no prefix/glob keys are interpreted (design §11).
    - Apply the resolved model/settings as **parameters of the spawn itself, not in the agent's initial prompt** — explicitly distinct from the Artifact folder / Commit format prompt-channel conventions in the adjacent bullet (design §6).
    - Pass configured values **verbatim** to the active tool's spawn mechanism: no translation between tools, no pre-validation against any model/effort/provider capability matrix (the runtime is the authority on validity).
    - State the guardrail that the model/settings ride the spawn channel only and that **configuring a model never requires or causes any edit to an agent's generic profile file or behavior instructions** (design §7; AC11 second clause). Do not introduce or reference any agent-frontmatter `model:` key.
  - Keep the existing prompt-channel bullet (`:59-61`) and the "Agents commit their own artifacts" bullet (`:62`) intact; this is an additive sibling bullet.
- **Depends on:** Task 1 (the per-key rule wording must be consistent), Task 2 (the convention is named `Agent models`).
- **Traces to:** Spec requirements R1, R2, R3, R7, R9, R10; ACs 1, 2, 3, 4, 8, 9, 10, 11, 13; design §3 (interfaces 3–4), §5, §6, §7, §11.
- **Acceptance:**
  - `autonomous-workflow.md` contains a spawn-loop step that resolves each agent's model/settings via the **Agent models** convention by the named two-step lookup (entry → `Default` → today's behavior).
  - The step states per-key resolution consistent with Task 1, including that a model-only entry inherits the `Default`'s `effort`.
  - The step says to apply resolved values as parameters of the spawn itself, explicitly not in the agent's initial prompt, and lists Artifact folder / Commit format as the prompt-channel counterpart.
  - The step says values are passed verbatim, with no cross-tool translation and no capability-matrix pre-validation.
  - The step states that configuring a model never edits any `agents/*.md` profile or behavior instructions, and introduces no agent-frontmatter `model:` key.
  - The existing prompt-channel and commit bullets are unchanged; the new content is an additive sibling.

### Task 4: Add the Claude Code spawn-surface note and breadcrumb in `claude-code.md`

- **Goal:** Document the concrete Claude Code spawn surface for the model/settings (`--model`/`--effort`-equivalent applied at the agent spawn) and add a one-line breadcrumb pointing to the `setup.md` shape — **without** modifying the tool-forced canonical block.
- **Files to change:** `skills/radical-pipelines/reference/conventions/claude-code.md`.
- **Changes:**
  - Leave the forced canonical ` ```markdown ` block (`claude-code.md:9-42`) **exactly as is** — no `### Agent models` stanza inside the fence (design §4.3: avoids dead "example, delete if unused" scaffolding being copied into a fresh project's `.rp.md`).
  - **Below the fence** (outside the canonical block), add:
    - A one-line prose breadcrumb noting that a project may optionally add an `### Agent models` block under `## Claude Code` per the `setup.md` shape documentation.
    - A one-line concrete spawn-surface note: Claude Code applies the resolved per-agent model and settings as parameters of the agent spawn — the `--model` (bare alias / first-party ID) and `--effort` (`{low, medium, high, xhigh, max}`)-equivalent at spawn — passed verbatim. Instruct the writer to confirm the exact spawn-parameter name/path against the live tool (`TeamCreate`/agent-launch field vs. `claude agents` CLI surface) and document it at that concrete level if confirmed, otherwise keep the note at the verified `--model`/`--effort`-equivalent level (design §13 OQ1).
  - Do not add any login/recovery/model-swap text here — Claude Code auth is interactive `/login`, not provider-qualified model selection (design §9).
- **Depends on:** Task 1 (breadcrumb points at the `setup.md` shape).
- **Traces to:** Spec requirements R8, R9, R10; ACs 9, 10, 11; design §3 (interface 4), §4.3, §6.
- **Acceptance:**
  - The forced canonical block in `claude-code.md` is byte-for-byte unchanged (no `### Agent models` stanza inside the fence).
  - Below the fence there is a one-line breadcrumb pointing to the `setup.md` `### Agent models` shape, scoped to `## Claude Code`.
  - Below the fence there is a one-line note describing the CC spawn surface as the `--model`/`--effort`-equivalent applied at the agent spawn, passed verbatim.
  - No login/recovery/model-swap text is added to `claude-code.md`.

### Task 5: Add the Pi spawn-surface note, breadcrumb, and AC16 recovery disambiguation in `pi.md`

- **Goal:** Document the concrete Pi spawn surface (`provider/model` + any settings on `spawn_teammate` / `create_predefined_team`), add the `setup.md` breadcrumb, and mirror the AC16 recovery disambiguation into the canonical Pi seed — **without** modifying the tool-forced canonical block.
- **Files to change:** `skills/radical-pipelines/reference/conventions/pi.md`.
- **Changes:**
  - Leave the canonical ` ```markdown ` block (`pi.md:7-41`) **unchanged** for the model-config additions — no `### Agent models` stanza inside the fence (design §4.3). (The recovery-line mirror in the next bullet is the one exception, and it edits the existing recovery sentence inside the canonical block; see the note below.)
  - **Below the canonical block / in the prose around it**, add:
    - A one-line breadcrumb noting that a project may optionally add an `### Agent models` block under `## Pi` per the `setup.md` shape documentation.
    - A one-line concrete spawn-surface note: Pi applies the resolved per-teammate model as a provider-qualified `provider/model` (and any settings) on `spawn_teammate` / `create_predefined_team`, passed verbatim. Instruct the writer to confirm the exact per-teammate model/settings argument names against a live Pi (binary was absent during design). If Pi exposes **no** per-teammate settings knob, state that the `effort`/settings portion of the Pi `### Agent models` block is simply inapplicable for Pi (model-only), which the opaque-pass-through design already tolerates (design §13 OQ2).
  - Mirror the AC16 recovery disambiguation into the existing Pi recovery sentence (`pi.md:30`, the canonical seed's "Prefer explicit provider-qualified models … run `pi --list-models`, pick an authenticated provider-qualified model, and retry …"). Revise to the compressed form: pick an authenticated provider-qualified model **other than the one that just failed**, and retry — and state that **this recovery fallback is distinct from the per-agent `Agent models` config and must not re-select the failed model** (design §9.4). This edit is the paired counterpart of the dogfood `.rp.md` recovery edit in Task 8; both must land together to prevent drift (design §12 risk 2).
- **Depends on:** Task 1 (breadcrumb). Must be kept consistent with Task 8's `.rp.md` recovery edit (paired AC16 change).
- **Traces to:** Spec requirements R8, R9, R10, R15; ACs 9, 10, 11, 16; design §3 (interfaces 4–5), §4.3, §6, §9.4.
- **Acceptance:**
  - The forced canonical block's worktree/branch/team/health text is unchanged except for the single recovery sentence at `pi.md:30`, which now says to pick an authenticated model **other than the one that just failed** and that recovery's fallback is distinct from the `Agent models` config and must not re-select the failed model.
  - There is a one-line breadcrumb pointing to the `setup.md` `### Agent models` shape, scoped to `## Pi`.
  - There is a one-line note describing the Pi spawn surface as `provider/model` (+ any settings) on `spawn_teammate` / `create_predefined_team`, passed verbatim, including the "model-only if Pi has no settings knob" fallback statement.
  - The AC16 disambiguation wording in `pi.md` is consistent with the dogfood `.rp.md` edit in Task 8.

### Task 6: Add the conditional "Rejected configured value" field to the escalation payload in `health-monitoring.md`

- **Goal:** Make a runtime rejection of a configured value surface through the existing escalation path carrying the exact rejected configured value, alongside the already-present agent name and verbatim error.
- **Files to change:** `skills/radical-pipelines/reference/health-monitoring.md`.
- **Changes:**
  - In the "## Escalation payload" list (`health-monitoring.md:43-48`), add one **conditional** bullet between **Error verbatim** (`:46`) and **Last-known progress** (`:47`):

    > **Rejected configured value** *(when the failure is a rejected model/settings configuration)* — the exact configured value the runtime rejected (the agent's configured model string or `effort` level), as written in the **Agent models** convention.
  - Keep the `(when …)` qualifier so the field does not clutter the non-config escalation types (stall, message failure, login, network).
  - Do not fold this into **Suggested next step** — it is a fact about the failure, not a suggested action (design §8.1).
- **Depends on:** Task 2/Task 1 (the convention is named **Agent models**).
- **Traces to:** Spec requirement R11; AC12; design §3 (interface 5), §8.1.
- **Acceptance:**
  - The escalation payload list contains a conditional **Rejected configured value** bullet positioned between **Error verbatim** and **Last-known progress**.
  - The bullet's qualifier scopes it to rejected model/settings configuration failures only.
  - The bullet names the source as the **Agent models** convention and references the configured model string or `effort` level.
  - The existing four payload fields (Agent name, Error verbatim, Last-known progress, Suggested next step) are otherwise unchanged.

### Task 7: Add the deterministic-rejection recovery row and the transience invariant in `health-monitoring.md`

- **Goal:** Make a deterministic configured-value rejection (bad `effort` for the model, unknown/mistyped model string) escalate immediately without spending the retry budget on an identical re-spawn; and state the tool-agnostic invariant that a recovery model swap is transient and never written back to `.rp.md`.
- **Files to change:** `skills/radical-pipelines/reference/health-monitoring.md`.
- **Changes:**
  - Add **one new row** to the recovery table (`health-monitoring.md:32-37`), using the existing Retry 1 / Retry 2 / Escalate columns, for the deterministic non-auth case (no retries, escalate immediately):

    > `| Rejected configured value (non-auth) | — (deterministic; re-spawning the same value fails identically) | — | Report to owner immediately, do not retry |`
  - Add a one-line note under the table: a configured-value rejection that is **not** an auth error is deterministic — escalate without spending the retry budget on an identical re-spawn; an **unauthenticated provider** stays in the existing `Login / API-key error` row (model swap, AC14), not this row.
  - Add the tool-agnostic transience invariant immediately after the recovery table / under-table note (around `health-monitoring.md:39`):

    > A recovery model swap is **transient**: it applies only to the recovery re-spawn and is **never written back to `.rp.md`**. The next fresh spawn of any agent re-reads the **Agent models** convention and runs on the configured model again.
  - Do **not** modify the four existing recovery rows (No-output stall, Message failure, Login / API-key error, Network failure); the `Login / API-key error` row remains the home of the recoverable auth-swap case (AC14).
- **Depends on:** Task 6 (same file; the escalation payload should already carry the rejected-value field these rejections rely on). Logically grouped with Task 6 — both edit `health-monitoring.md` and may be executed together.
- **Traces to:** Spec requirements R11, R13, R14, R15; ACs 12, 14, 15, 16; design §3 (interface 5), §8.2, §9.3, §10.
- **Acceptance:**
  - The recovery table has a new `Rejected configured value (non-auth)` row with no retries that escalates immediately, leaving the four existing rows unchanged.
  - A note under the table distinguishes the deterministic non-auth rejection (escalate immediately) from the recoverable `Login / API-key error` auth case (model swap).
  - A tool-agnostic transience invariant after the table states the recovery swap is never written back to `.rp.md` and that the next fresh spawn re-reads the **Agent models** convention and runs on the configured model again.

### Task 8: Add the `### Agent models` blocks and disambiguate Pi recovery in the dogfood `.rp.md`

- **Goal:** In this repo's hand-maintained dogfood `.rp.md`, add the optional `### Agent models` block under both `## Claude Code` and `## Pi` using the canonical shape, and apply the AC16 recovery disambiguation to the Pi recovery steps so recovery's fallback is explicitly distinct from the per-agent config and excludes the just-failed model.
- **Files to change:** `.rp.md` (this repo's dogfood copy).
- **Changes:**
  - Under `## Claude Code` (after the existing `### Health monitoring` subsection, around `.rp.md:84`), add an `### Agent models` block in the canonical shape from Task 1: the lead-in sentence (per-tool scope + per-key resolution rule), a `**Default:**` bullet, and per-agent bullets, using Claude Code value forms (bare alias / first-party ID). The block here is an illustrative dogfood example; keep it minimal and consistent with the documented shape (it may contain only a `**Default:**` bullet plus one or two example agent entries, or be present-but-illustrative — match whatever the owner's dogfood intent is, but the shape must be exactly the canonical one). Use the inline form for single-setting entries and the nested form only if an entry needs multiple settings.
  - Under `## Pi` (after the existing `### Pi health monitoring` subsection, around `.rp.md:146`), add a structurally identical `### Agent models` block using Pi provider-qualified `provider/model` value forms. If Pi has no per-teammate settings knob (Task 5 / design §13 OQ2), the Pi block is model-only.
  - Apply the AC16 recovery disambiguation to the Pi recovery list (`.rp.md:121-130`):
    - **Step 1 (`.rp.md:123`)** — broaden the exclusion to the *model*, not just the provider: "Treat **the model that just failed authentication** as unavailable for this retry (and the failed provider, unless the owner explicitly asked to use it)."
    - **Step 4 (`.rp.md:126`)** — replace the ambiguous "Prefer the owner's configured default provider/model when present" phrase: "Choose a provider-qualified replacement model from authenticated providers, **excluding the model that just failed authentication**. This recovery choice is a **fallback preference**, distinct from the per-agent **Agent models** configuration (which governs the initial spawn): prefer the owner's **environment/Pi default** authenticated provider/model when present; otherwise the closest suitable authenticated model for coding work. **Do not re-select the per-agent configured model that just failed.**"
    - **Step 5 (`.rp.md:127`)** — append the transience clause: "— this replacement model applies only to this recovery re-spawn, not to the agent's configured model."
    - Keep the provider-neutral closer (`.rp.md:130`, "Keep this recovery provider-neutral. Do not hardcode any provider as the fallback default") **unchanged**.
  - Do not edit any `agents/*.md` profile and do not add any agent-frontmatter `model:` key (design §7).
- **Depends on:** Task 1 (canonical shape), Task 5 (paired AC16 edit; the `pi.md` seed and this dogfood copy must use consistent disambiguation wording). Should run after the shape is settled.
- **Traces to:** Spec requirements R1, R2, R3, R8, R12, R13, R14, R15; ACs 1–5, 9, 13, 14, 15, 16; design §3 (interfaces 1, 5), §4.2, §9.2, §9.3, §9.4, §10, §12 risk 2.
- **Acceptance:**
  - `.rp.md` contains an `### Agent models` block under `## Claude Code` and a structurally identical one under `## Pi`, each matching the canonical shape documented in `setup.md` (lead-in + `**Default:**` + per-agent bullets), with Claude Code value forms in the CC block and provider-qualified `provider/model` value forms in the Pi block.
  - The block lead-in states the per-key resolution rule and pins it to the active tool, consistent with Tasks 1 and 3.
  - The Pi recovery step 1 excludes the model that just failed authentication (not only the provider).
  - The Pi recovery step 4 no longer contains the ambiguous "configured default provider/model" phrasing; it excludes the just-failed model, calls the choice a fallback preference distinct from the **Agent models** config, and says not to re-select the per-agent configured model that just failed.
  - The Pi recovery step 5 carries the transience clause; the provider-neutral closer is unchanged.
  - No `agents/*.md` file is modified and no agent-frontmatter `model:` key is introduced.

### Task 9: Add the `Agent models` mention to the README per-tool-section catalog

- **Goal:** Keep the README's per-tool conventions catalog complete by mentioning the optional `Agent models` block, so it stays accurate regardless of the canonical-template decision.
- **Files to change:** `README.md`.
- **Changes:**
  - In the "## Configuration" section, add a one-clause mention of the optional `Agent models` block to the per-tool catalog. Target the catalog sentences:
    - `README.md:157` ("Claude Code conventions add … the bundled `/loop` health monitor. Pi conventions add … the `@pi-agents/loop` health monitor, and Pi agent discovery rules.") — add the optional per-agent model configuration as a catalog item for the per-tool sections.
    - `README.md:167` ("a per-tool section covering only what depends on the active tool (worktrees, branch names, team spawning, health monitoring)") — extend the enumerated per-tool contents to include the optional agent-models block.
  - Keep the addition to a single clause/mention; do not restate the full shape (that lives in `setup.md`).
- **Depends on:** Task 1 (so the README mention matches the canonical name `Agent models`). Independent of the other tasks otherwise.
- **Traces to:** Documentation completeness (design "Files touched" → README row, §4.5, §12 risk 4). No new spec requirement; supports R5/R8 discoverability.
- **Acceptance:**
  - The README per-tool catalog (around `:157` and/or `:167`) mentions the optional `Agent models` block as part of the per-tool section contents.
  - The mention uses the canonical name `Agent models`, matching the `load.md` row and the `.rp.md` heading.
  - The addition is a single clause/mention and does not duplicate the full block shape.

### Task 10: Cross-file consistency verification of the canonical shape and paired recovery edit

- **Goal:** This feature's primary failure mode is documentation drift — the canonical `### Agent models` shape and the AC16 recovery disambiguation are described in several files that must agree, or a fresh project's seeded `.rp.md` will not match what the orchestrator expects (design §12 risks 2 and 4). Run a final reconciliation pass so all copies describe the same shape and the same recovery rule. This task makes no new design decisions; it only verifies and aligns wording already produced by Tasks 1–9.
- **Files to change:** Any of `setup.md`, `load.md`, `autonomous-workflow.md`, `claude-code.md`, `pi.md`, `health-monitoring.md`, `.rp.md`, `README.md` — edits here are corrective only (align wording), not new content.
- **Changes:**
  - Verify the **canonical shape** is described consistently across `setup.md` (Task 1), the `.rp.md` example blocks (Task 8), and the per-tool breadcrumbs (Tasks 4–5): same heading name `### Agent models`, same reserved `**Default:**` label, same per-agent bullet form, same inline-vs-nested settings rule.
  - Verify the **convention name** `Agent models` matches across the `load.md` row (Task 2), the `.rp.md` headings (Task 8), the README mention (Task 9), and every reference to the convention by name in `autonomous-workflow.md` (Task 3) and `health-monitoring.md` (Tasks 6–7).
  - Verify the **per-key resolution rule** is stated identically (no semantic divergence) in `setup.md` (Task 1), `autonomous-workflow.md` (Task 3), and the `.rp.md` block lead-in (Task 8): a model-only agent entry inherits the `Default`'s `effort` in all three.
  - Verify the **AC16 recovery disambiguation** is consistent between the dogfood `.rp.md` recovery steps (Task 8) and the canonical `pi.md:30` seed (Task 5): both exclude the just-failed model and both state recovery's fallback is distinct from the **Agent models** config. Confirm `claude-code.md` and the CC `.rp.md` section carry **no** recovery/model-swap text.
  - Verify the **frontmatter `model:` prohibition** held: `grep -l '^model:' agents/*.md` returns no files, and no task introduced an agent-frontmatter `model:` key anywhere.
  - Apply minimal corrective edits where any inconsistency is found.
- **Depends on:** Tasks 1–9.
- **Traces to:** Spec requirements R1–R3, R8, R10, R15 (consistency of their realizations); ACs 1–4, 9, 11, 16; design §10, §12 risks 2 and 4.
- **Acceptance:**
  - The `### Agent models` heading name, `**Default:**` label, per-agent bullet form, and inline/nested settings rule are identical across `setup.md`, the `.rp.md` blocks, and the per-tool breadcrumbs.
  - The convention name `Agent models` matches across `load.md`, `.rp.md`, `README.md`, `autonomous-workflow.md`, and `health-monitoring.md`.
  - The per-key resolution rule (model-only entry inherits `Default`'s `effort`) is stated consistently in `setup.md`, `autonomous-workflow.md`, and the `.rp.md` block lead-in.
  - The AC16 recovery disambiguation wording is consistent between `.rp.md` and `pi.md`, and `claude-code.md` / the CC `.rp.md` section carry no recovery/model-swap text.
  - `grep -l '^model:' agents/*.md` returns no files; no agent-frontmatter `model:` key was introduced.

## Acceptance criteria coverage

Every spec acceptance criterion is addressed by at least one task:

- **AC1, AC2, AC3** (agent-specific / default / override) — Task 3 (resolution step), Task 1 (documented shape), Task 8 (dogfood blocks).
- **AC4** (settings, same precedence; per-key) — Task 1 and Task 3 (per-key rule), Task 8 (block lead-in).
- **AC5** (persistence across runs) — Task 2 (`load.md` re-read each run, no new machinery) + Task 8 (block lives in `.rp.md`); design §4.5.
- **AC6, AC7** (no/absent config → today's behavior, no stop) — Task 2 (`Required? = No` row), reinforced by Task 3's "else today's behavior" branch.
- **AC8** (partial config) — Task 3 (two-step lookup falls through to today's behavior for unnamed agents).
- **AC9, AC10** (per-tool form, verbatim pass-through) — Task 3 (verbatim, no translation/pre-validation), Tasks 4–5 (per-tool surfaces), Task 1 (per-tool value forms).
- **AC11** (spawn channel, not prompt; profiles unchanged) — Task 3 (apply as spawn parameters, not prompt; no profile edit), Task 10 (frontmatter `model:` prohibition verified).
- **AC12** (rejected value escalates) — Task 6 (escalation field), Task 7 (deterministic no-retry row).
- **AC13** (configured model at initial spawn) — Task 3 (resolution at spawn).
- **AC14** (recovery swap only re-spawn-scoped) — Task 7 (`Login / API-key error` row unchanged) + Task 8 step 5 transience clause.
- **AC15** (swap not persisted) — Task 7 (transience invariant), Task 8 (transience clause).
- **AC16** (recovery never re-selects the just-failed model) — Task 5 (`pi.md` seed) + Task 8 (dogfood `.rp.md` steps 1/4), paired edit verified in Task 10.

## Carried-forward open questions (resolve during code phase, runtime-confirmable; not blockers)

1. **Exact CC spawn-parameter name** for per-agent model/effort (`TeamCreate`/agent-launch field vs. `claude agents` CLI). Task 4 instructs confirming against the live tool; otherwise documents at the verified `--model`/`--effort`-equivalent level (design §13 OQ1).
2. **Exact Pi per-teammate model/settings argument** on `spawn_teammate` / `create_predefined_team`, and whether Pi exposes any per-teammate settings knob at all. Task 5 instructs confirming against a live Pi; if no settings knob exists, the Pi block is model-only (design §13 OQ2).
3. **Settings vocabulary beyond `effort`** — kept opaque; the shape accommodates unknown keys. Task 1 documents `effort` as the worked example and states other runtime-supported settings follow the same form (design §13 OQ3).
4. **Exact final wording** of each edited line — this plan fixes content and placement and gives proposed wording; the code phase finalizes exact prose (design §13 OQ4).
