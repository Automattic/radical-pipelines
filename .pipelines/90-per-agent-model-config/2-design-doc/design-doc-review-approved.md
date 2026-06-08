# Design Doc Review — APPROVED

Reviewed: `2-design-doc/design-doc.md` for issue [#90](https://github.com/Automattic/radical-pipelines/issues/90) — "Optional convention for per-agent model configuration".

Inputs cross-checked: `2-design-doc/design-doc-research.md` (decisions the doc must reflect), `1-spec/spec.md` (15 requirements, 16 ACs), and the live `radical-pipelines` codebase.

## Verdict

**Approved.** The design is complete against the spec, faithful to the research's decisions, internally consistent, feasible against the verified codebase, and honest about what it could not verify. No blocking defect found.

## What I verified (adversarially, against the real repo)

Every load-bearing factual claim in the design was independently re-checked and held:

- **`.rp.md` is table-free** — `grep -c '^|' .rp.md` → `0`. Confirms the "match the table-free house style" rationale (Section 4.1) and the rejection of a Markdown-table shape.
- **No structured-data blocks** anywhere under `skills/radical-pipelines/reference/` — `grep -rn '```yaml|```toml|```json'` → none. Confirms the "foreign idiom" rejection of a fenced structured block.
- **All 17 agent profiles carry only `name` + `description`** — no `model:` frontmatter key on any of them (`grep -l '^model:' agents/*.md` → none; frontmatter key union across all 17 is exactly `{name, description}`). This validates the AC11 premise that adding `model:` would be a *new* edit to a generic profile, and that the profiles are currently untouched.
- **The 17 agent names match the design's list exactly**, and **none is named `default`**, so the reserved `Default` label cannot collide (Section 2, 4.1).
- **Claude Code spawn surface (probed live, `claude` present):** `--effort <level>` enumerates exactly `(low, medium, high, xhigh, max)`; `--model <model>` accepts an alias (`sonnet`/`opus`) or a full name (`claude-opus-4-8`); `claude agents` exposes `--model`/`--effort`/`--agent` as "Default … for sessions dispatched from agent view." This matches the spec's CC value forms and the design's verified-facts section precisely.
- **Pi binary absent** (`which pi` → not found), so the Pi spawn surface is correctly flagged as *inferred, not verified* — handled honestly, not papered over.
- **Cited line numbers are accurate** for the edits the design proposes: `load.md:24-28` (stop keys only off required), the two existing `Required? = No` rows (`load.md:15,19`); `health-monitoring.md:30-39` (recovery table, 2-retry budget) and `:43-48` (escalation payload); `autonomous-workflow.md:56-62` (the `Important:` block and the prompt-channel step `:59-61`); `pi.md:30` (compressed canonical recovery line); `.rp.md:121-130` (the 6-step Pi recovery, with steps at `:123/:126/:127` as cited); `setup.md:54-60` (Commit format, prompted-optional), `:82-86` (Spawning teams, document-once), `:159-166` (step 3 → Setup actions), `:176-182` (step 5 → "Write `.rp.md` with the conventions"); `claude-code.md:3-7` ("forced … the tools constrain the answer … canonical content") and `pi.md:5` ("Canonical `.rp.md` content for Pi").

## Completeness against the spec (all 16 ACs mapped to concrete design elements)

- **AC1–AC4, AC8** → Section 5 resolution algorithm (exact entry → `Default` → today's behavior), with **per-key** resolution for AC4.
- **AC5** → persistence-by-location: the block lives in `.rp.md`, which `load.md:5-7` re-reads every run; no new machinery (Section 4.5).
- **AC6, AC7** → one `load.md` row marked `Required? = No`; the missing-conventions stop keys only off `Required? = Yes`, so absence is inert by construction (Section 4.5).
- **AC9, AC10** → verbatim, per-tool, no-translation, no-pre-validation pass-through (Sections 5.1, 6).
- **AC11** → spawn-parameter channel kept textually distinct from the prompt channel; profiles untouched; the frontmatter `model:` channel explicitly forbidden (Sections 6, 7).
- **AC12** → a conditional **Rejected configured value** field in the escalation payload, plus a no-retry recovery row for deterministic rejections (Section 8).
- **AC13–AC16** → the four failure-recovery invariants, with the Pi recovery disambiguation applied to **both** `.rp.md` and `pi.md` to prevent drift (Sections 9, 10).

## Soundness of the subtle points

- **AC12 (surface an unauthenticated provider) vs AC14 (swap-and-retry on auth failure)** — these two ACs prescribe different behaviors for the same "unauthenticated provider" trigger. The design resolves this coherently: route the *recoverable* unauthenticated case to the existing Login/API-key row (swap → re-spawn → escalate only if the 2-retry budget is exhausted, with the new escalation field then carrying the rejected value), and route only *deterministic* bad-effort / mistyped-model rejections to the new escalate-immediately row. Neither AC is contradicted; the discriminator (auth-rejection → swap; value-invalid → escalate now) is exactly the AC12-vs-AC14 split.
- **Per-key vs whole-entry settings resolution (Section 5.2)** — the one place the spec is genuinely silent (AC4). The design surfaces the choice explicitly, picks per-key with a defensible rationale (most literal reading of "the same precedence as the model itself"; more expressive; no surprising effort-stripping), and flags it as a review point (Risk 5) rather than assuming it. Correct way to handle a spec gap.
- **Channel separation (Sections 6–7)** — the prompt channel (Artifact folder + Commit format) and the new spawn-parameter channel are kept distinct, and editing `agents/*.md`/frontmatter `model:` is explicitly forbidden, pre-empting the most likely "helpful shortcut" a plan/code phase might take.

## Open questions / risks — handled honestly

The four open questions (exact CC tool-parameter name vs CLI flag; Pi per-teammate model/settings argument names; settings vocabulary beyond `effort`; final exact wording) are genuinely unverifiable in this environment (CC tool not introspectable here, Pi binary absent) and are flagged as deferred-to-implementation, not glossed. The design stays at "apply via the active tool's spawn mechanism" and names the verified CC surface only as a concrete example — the right altitude. The five risks (tool-block conflation, recovery-copy drift, frontmatter shortcut, dogfood/seed divergence, per-key contestability) are real and each carries a structural mitigation. None is papered over.

## Minor, non-blocking notes (for the plan phase, not defects)

- The dual README citation `README.md:157` and `:167` is correct: both lines are per-tool content catalogs (the research had cited only `:167`; the design's addition of `:157` is more complete, not an error). Both should gain the "Agent models" mention so the catalog stays consistent.
- Proposed wordings throughout (the `load.md` row, recovery-step rewrites, the new `autonomous-workflow.md` step, the `setup.md` subsection) are explicitly labelled "starting points, not frozen strings" (Open Question 4) — appropriate for handoff; the plan/code phases finalize exact prose.

No real issue rises to the level of a rejection. Approved.
