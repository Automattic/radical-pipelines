# Design Research: Fresh, working team per run

## Research

Sites in the skill that reference the team name (all must stay consistent under per-creation naming):

1. **`reference/conventions/claude-code.md:27`** — the canonical `.rp.md` block: *"Every autonomous workflow that spawns agents must use exactly one Claude Code team using `TeamCreate({ name: "<pipeline-slug>" })`."* This is the single source of the slug-as-team-name rule.
2. **`reference/review-pipeline.md:54`** — *"…with the pipeline slug and team unchanged…"* — must be corrected (spec req 5 / AC4).
3. **`reference/health-monitoring.md:57`** — monitor prompt template: *"Check pipeline at `<artifact-folder>`, team `<pipeline-slug>`."* — the monitor is handed the team name; under per-creation naming it must receive the *actual* created team name, not the slug.

Other relevant facts:

- The generic layer only references the convention by name: `autonomous-workflow.md:37` ("Create the pipeline's team per the **Team spawning** convention") and `:62`. No team name appears there, so the generic layer likely needs no change. Source: `reference/autonomous-workflow.md`.
- The live project file `.rp.md` "Team spawning" section currently says only *"Use `TeamCreate`."* — it does not restate the slug-name rule. The slug name originates in the canonical block in `claude-code.md`. Source: `.rp.md`.
- Agents address each other and are spawned by **agent name**, not team name; the team name is used only at `TeamCreate` and where the monitor is told which team to watch. So within a session the orchestrator only needs to hold the name it generated. Source: `reference/conventions/claude-code.md:29`, `reference/health-monitoring.md`.
- Worktree (`EnterWorktree({ name: "<pipeline-slug>" })`) and branch (`worktree-<pipeline-slug>`) remain slug-keyed and reused across runs — out of scope to change. Source: `reference/conventions/claude-code.md` (Worktrees, Branch names).

## Topics

### Topic: Files the change touches (skill canonical text vs deployed `.rp.md`)

- **Spec link:** Requirements 4, 5; Acceptance criteria 1, 4.
- **Context:** The naming rule's canonical home is `reference/conventions/claude-code.md` (the `.rp.md` block). Two consumers reference the name: `review-pipeline.md` (correct the "team unchanged" wording) and `health-monitoring.md` (monitor prompt must use the actual team name). Separately, this repo's deployed `.rp.md` currently says only "Use `TeamCreate`." and does not carry the slug-name rule at all.
- **Options:**
  1. **Skill only** — update the canonical block in `claude-code.md` + the two consumer references. Leave the deployed `.rp.md` as-is (it imposes no name today, so it doesn't contradict; re-sync is a separate setup concern).
  2. **Skill + re-sync `.rp.md`** — also update this repo's `.rp.md` Team spawning section so the new rule actually governs radical-pipelines' own runs.
- **Trade-offs:** (1) stays strictly within "the skill" per spec scope; risk that this repo's own runs don't pick up the rule until `.rp.md` is re-synced. (2) makes the rule effective here immediately, but edits a deployed config file that the spec arguably scoped out.
- **Decision:** Option 2 — update the canonical block in `claude-code.md` + the two consumers (`review-pipeline.md`, `health-monitoring.md`) **and** re-sync this repo's deployed `.rp.md` Team spawning section.
- **Rationale:** Owner wants the new naming rule to govern radical-pipelines' own runs immediately, not just future re-syncs. The canonical block and the deployed `.rp.md` must agree.

### Topic: Team-name shape and the unique component

- **Spec link:** Requirements 1, 2, 3; Acceptance criteria 2, 3.
- **Options:**
  1. `<pipeline-slug>-<random-token>` — slug prefix + a short random alphanumeric token (e.g. 4–6 chars) the orchestrator generates at `TeamCreate` time.
  2. `<pipeline-slug>-<timestamp>` — slug prefix + a compact creation timestamp.
  3. Unprescribed — instruct "keep the slug as a prefix and append a short unique token", leaving the token's form to the orchestrator.
- **Trade-offs:**
  - (1) Matches spec req 2 ("random component") directly; collision effectively impossible; short and greppable by slug prefix. Orchestrator must produce a random token (trivial).
  - (2) Unique-per-creation and encodes *when*, but a timestamp is not "random" (diverges from spec wording), is longer, and two creations within the same resolution tick could theoretically clash.
  - (3) Most minimal, but under-specified: leaves room for a non-unique or non-random choice, weakening the guarantee the spec asks for.
- **Decision:** `<pipeline-slug>-<random-token>` (option 1) — slug prefix + a short random alphanumeric token generated at `TeamCreate` time.
- **Rationale:** Honors the committed spec (Requirement 2 / Acceptance Criterion 2 require a random component). Collision is effectively impossible, the name stays greppable by its slug prefix, and no clash-detection is needed. The owner initially preferred a timestamp but, when the spec conflict was surfaced, chose to keep the spec's random component rather than amend the spec.

### Topic: How the generated name propagates within a run

- **Spec link:** Requirement 4; Acceptance criterion 1.
- **Decision:** The orchestrator generates the team name once at `TeamCreate` and holds it for the run. The only other place that needs it is the health-monitor prompt (`health-monitoring.md:57`), where the literal `team <pipeline-slug>` becomes the actual created team name. Agents are addressed by agent name, not team name, so no agent prompt changes. No name is persisted across sessions — each run/session generates its own, which is what guarantees no collision.
- **Rationale:** Keeps the change minimal and confines name-handling to creation + monitoring. No real alternative.

## Open Questions

None. (The timestamp-vs-random scope conflict was raised and resolved in favor of the spec's random component.)

## Risks

- **Random collision (residual).** A random token can in theory repeat. With sufficient entropy this is astronomically unlikely; the spec accepts probabilistic uniqueness and requires no clash-detection. If it ever happened, `TeamCreate` would error exactly as today — no worse than the status quo.
- **Orphan accumulation persists.** This change stops collisions but does not remove dead teams from disk; they keep accumulating until the separate teardown/cleanup follow-up lands. Out of scope here by decision.
- **Canonical/deployed drift.** The rule lives in two places now (canonical block in `claude-code.md` and the deployed `.rp.md`); both must be updated together or they diverge.
