# Code review — Optional convention for per-agent model configuration (APPROVED)

Phase 4 (code). Reviewer: `code-reviewer`. Iteration: N/A (approved on first review).

Base ref: `ed8bf98` (last phase-3 commit). Reviewed `git diff ed8bf98..HEAD` — 7 source/convention files, +89/−4, no artifact files. Tasks 1–9 of `3-plan/code-plan.md`.

This is a **documentation-as-implementation** feature: the "code" is orchestration prose an LLM reads at runtime. Review judged whether the shipped prose, read literally, produces the spec/design-required behavior; correctness, completeness against the plan/spec/design, internal consistency (anti-drift), and scope discipline. No unit tests apply.

## Verdict: APPROVED

Every task's per-task Acceptance criteria are literally satisfied, all 16 spec ACs are realized, the canonical shape and recovery wording are consistent across all files, and scope discipline holds exactly.

## Per-task acceptance — all satisfied (verified independently against the files)

- **T1 — `setup.md`.** Subsection (`setup.md:90-127`) documents the `### Agent models` shape: reserved `**Default:**`, per-agent `**<agent-name>:**` bullets, the **inline** form and the **nested sub-bullet** form for multiple settings. Lead-in (`:125`) states "entry, else `Default`, else today's behavior" and pins it to the active tool. Per-key rule (`:127`) states a model-only entry **inherits** the `Default`'s `effort` ("it does not strip it"). Collection flow gains exactly one mentioned-but-skipped sentence (`:32`) pointing at the shape, with no per-agent Q&A loop. `effort` is the worked example with "any other runtime-supported setting follows the exact same inline-or-nested form" (`:121`).
- **T2 — `load.md`.** New row (`load.md:20`) `| Agent models | Which model/settings each spawned agent runs on | No |`; `Required? = No`; Convention cell matches the `.rp.md` heading name; `## Missing conventions` text unchanged (keys only off `Required? = Yes`), so absent/empty config never trips the stop. Voice/alignment consistent with surrounding rows.
- **T3 — `autonomous-workflow.md`.** Additive sibling bullet (`:62-68`) resolves via the named **Agent models** convention by the two-step lookup; states per-key resolution (model-only inherits `Default`'s `effort`); exactly two key kinds, no glob; apply as **parameters of the spawn itself, not in the initial prompt**, explicitly contrasted with the Artifact folder / Commit format prompt channel; verbatim pass-through, no translation, no capability-matrix pre-validation; configuring a model never edits any profile file or behavior instructions and introduces no frontmatter `model:` key. The existing prompt-channel (`:59-61`) and commit (`:69`) bullets are intact.
- **T4 — `claude-code.md`.** Forced canonical fence (`:9-42`) is byte-for-byte unchanged — confirmed by diffing: every addition is **below** the closing fence. Below-fence breadcrumb (`:44`) points to the `setup.md` shape, scoped to `## Claude Code`. Spawn-surface note (`:46`) describes `--model` (bare alias / first-party ID) and `--effort {low,medium,high,xhigh,max}` applied verbatim on the spawn, with a confirm-against-live-tool caveat (`TeamCreate`/agent-launch field vs. `claude agents` CLI), kept at the verified level. No login/recovery/swap text added.
- **T5 — `pi.md`.** Fence unchanged **except** the single permitted recovery sentence at `pi.md:30` (confirmed: the only in-fence diff line). Below-fence breadcrumb (`:43`) and spawn-surface note (`:45`): `provider/model` (+ any settings) on `spawn_teammate` / `create_predefined_team`, verbatim, with the binary-absent "unconfirmed argument names" caveat and the "model-only if Pi has no settings knob" fallback. The `pi.md:30` AC16 disambiguation matches the dogfood `.rp.md` wording.
- **T6 — `health-monitoring.md`.** Conditional **Rejected configured value** bullet (`:52`) sits between **Error verbatim** (`:51`) and **Last-known progress** (`:53`); qualifier scopes it to rejected model/settings configs; names the **Agent models** convention and references the configured model string or `effort` level. The four existing payload fields are otherwise unchanged.
- **T7 — `health-monitoring.md`.** New `Rejected configured value (non-auth)` recovery row (`:38`) with no retries that escalates immediately; the four existing rows are unchanged (auth swap stays in `Login / API-key error`, AC14). Under-table note (`:42`) distinguishes the deterministic non-auth case from the recoverable auth case. Tool-agnostic transience invariant (`:44`): a recovery swap is never written back to `.rp.md`; the next fresh spawn re-reads the **Agent models** convention.
- **T8 — `.rp.md`.** `### Agent models` block under `## Claude Code` (`:86-96`) and a structurally identical one under `## Pi` (`:160-168`); CC block uses bare alias / first-party ID forms (incl. the nested multi-setting form for `code-writer`), Pi block uses `provider/model` forms (model-only). Block lead-in is byte-identical to the canonical lead-in. Pi recovery: step 1 (`:135`) excludes the **model** that just failed; step 4 (`:138`) drops the ambiguous "configured default" phrasing, names the choice a fallback preference distinct from the **Agent models** config, and says not to re-select the failed model; step 5 (`:139`) carries the transience clause; the provider-neutral closer (`:142`) is unchanged. No `agents/*.md` edited; no frontmatter `model:` introduced.
- **T9 — consistency pass.** Verification task; made no edits, which is correct because Tasks 1–8 were already drift-free. Confirmed below.

## Spec AC coverage — all 16 realized

AC1–AC3 (agent / default / override) — `autonomous-workflow.md:62-63` resolution step + `setup.md` shape + `.rp.md` blocks. AC4 (settings, per-key) — `setup.md:127`, `autonomous-workflow.md:64`. AC5 (persistence) — `load.md` re-read each run + block in `.rp.md`. AC6/AC7 (no/absent config, no stop) — `load.md:20` `Required? = No`. AC8 (partial config) — two-step fall-through to today's behavior. AC9/AC10 (per-tool form, verbatim) — `autonomous-workflow.md:67`, `claude-code.md:46`, `pi.md:45`. AC11 (spawn channel, not prompt; profiles unchanged) — `autonomous-workflow.md:66,68`; `grep -rn '^model:' agents/` returns nothing. AC12 (rejected value escalates) — `health-monitoring.md:52` field + `:38` no-retry row. AC13 (configured model at initial spawn) — resolution step. AC14 (swap re-spawn-scoped) — `Login / API-key error` row unchanged + `.rp.md:139` clause. AC15 (swap not persisted) — `health-monitoring.md:44` transience invariant. AC16 (recovery never loops on failed model) — paired Pi edit in `.rp.md:135/138` and `pi.md:30`.

## Anti-drift consistency (this feature's primary risk) — clean

- **Convention name / heading.** `Agent models` and `### Agent models` are consistent across `.rp.md` (both blocks), `setup.md`, `load.md`, `autonomous-workflow.md`, `health-monitoring.md`, `claude-code.md`, `pi.md`.
- **Lead-in sentence.** Byte-identical across `setup.md:125`, `.rp.md:88` (CC), `.rp.md:162` (Pi).
- **Per-key rule.** Semantically identical across `setup.md:127`, `autonomous-workflow.md:64`, and both `.rp.md` block lead-ins; the "model-only inherits `Default`'s `effort`, does not strip it" gloss is stated in the two documentation sites; the `.rp.md` blocks state the same most-specific-wins core with no contradiction.
- **Nested sub-bullet form.** 2-space indentation byte-identical between `setup.md:115-118` and `.rp.md:93-96`.
- **AC16 recovery.** Both Pi sites exclude the just-failed model and state recovery's fallback is distinct from the **Agent models** config; the CC `.rp.md` section and `claude-code.md` carry no recovery/login/swap text, as required.

## Scope discipline — exact

- `git diff --name-only ed8bf98..HEAD` = exactly the 7 planned files. No artifact files.
- `claude-code.md` fence unchanged; `pi.md` fence unchanged except the one permitted `pi.md:30` recovery line.
- No `agents/*.md` modified in the batch; `grep -rn '^model:' agents/` returns nothing — the frontmatter `model:` prohibition (design §7 / AC11) holds.
- `README.md` not touched (correctly deferred to phase 5 / doc plan).

## Honestly-deferred open questions — documented at the verified level

- Exact CC spawn-parameter field name — `claude-code.md:46` flags "confirm against the live tool," keeps the note at the verified `--model`/`--effort` level. Honest.
- Exact Pi per-teammate model/settings argument names — `pi.md:45` flags "unconfirmed … Pi binary was absent during design," keeps the note at the `provider/model` level. Honest.
- Pi settings knob possibly absent — `pi.md:45` and `.rp.md:164` state Pi entries are model-only if no per-teammate settings knob exists, which the opaque-pass-through design tolerates. Honest.

No issues found.
