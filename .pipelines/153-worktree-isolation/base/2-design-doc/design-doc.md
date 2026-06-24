# Design Doc: Keep agent edits and commits inside the pipeline worktree and branch

## Overview

When a radical-pipelines run executes in a worktree, the orchestrator enters that worktree once and every agent it spawns inherits the worktree as its working directory. Today that is the *only* thing keeping agent work isolated: no spawned agent is told it is in a worktree, which branch to commit to, or to avoid the main checkout. Because a worktree is a literal subpath of the main repository, the same tracked file exists as two distinct physical copies, so a main-anchored absolute path silently resolves to the wrong one; likewise a git invocation can be directed at the main checkout or its shared git directory and commit to the main branch. The result is that agents sometimes write to the main checkout's copy of a file or commit to the main branch instead of the pipeline branch `worktree-<pipeline-slug>`.

The chosen approach is a two-part, prose-only fix delivered entirely through the skill and agent prose, with no runtime layer that mechanically blocks a stray write or commit. First, **anchor**: the orchestrator injects two new values — an absolute worktree-root path and the pipeline branch name — into the spawn-time `## Conventions` block every spawned agent already receives, so each agent has a reliable, skill-blessed reference for where it is and what branch it owns. Second, **verify before acting**: agents are instructed to anchor every absolute path on the passed worktree root (never constructing a main-anchored path) and to confirm the current branch before committing, converting today's silent inheritance into a stated, checkable precondition. The guarantee is behavioral, not enforced; this design provides and instructs the strongest-available prose mechanism, which the spec accepts in place of runtime enforcement.

## Approach

The subject under design is the radical-pipelines skill itself, which is prose: these requirements become instructions in skill and agent prose. The fix is realized end-to-end as **provide a reliable anchor, then instruct its use**. Neither half suffices alone — a correct working directory is the status quo that already fails (an agent can compute the main root from inside the worktree and write a main-anchored absolute path that silently succeeds), and passing a value an agent is never told to use changes nothing.

The two failure halves — a wrong-tree *edit* and a wrong-branch *commit* — are mechanically independent. Git's "outside repository" firewall means a wrong-tree edit cannot silently become a main-branch commit; a wrong-branch commit requires a separate action that redirects git at the main checkout or its shared git directory. The design therefore covers both as distinct guards: a **write-time path anchor** and a **commit-time branch confirmation**.

Both new values are purely additive to the `## Conventions` block the orchestrator already hand-composes and attaches to the top of every spawned agent's initial prompt (`autonomous-workflow.md:62-64`). The block is the established channel by which per-pipeline content reaches an agent — the existing **Guardrails** field already delivers a *behavior* (runnable commands the agent is told to execute) through this same block, which is the precedent this design follows for carrying the verify-before-acting behavior centrally rather than duplicating it across profiles. The only genuinely new computation is deriving the absolute worktree root; the branch name is the literal `"worktree-" + slug` the orchestrator already holds.

The mental model for the implementer:

1. The orchestrator, running inside the worktree, derives the absolute worktree-root path (per-tool command) and assembles the branch name from the slug it already has.
2. It writes both as new labeled fields into the `## Conventions` block, scoped to the right agents, and injects the block at spawn — unchanged plumbing.
3. Each spawned agent reads the block (its only channel for this context, exactly as it reads `<artifacts-folder>` and Guardrails today), then anchors every absolute path on the passed worktree root and confirms its branch before committing.

This discipline targets spawned agents only. The orchestrator's own deliberate operations against the main checkout and main branch are untouched **by construction**, because the new fields live exclusively on the spawned-agent passing path, which the orchestrator never consumes.

## Components

- **`reference/conventions/passing.md` (MODIFIED — primary change).** Today its `## Conventions` block defines four labeled fields (Artifact folder, Commit format, Guardrails, Guardrail scopes to fill), each carrying an explicit `Agents:` recipient line. This change adds two fields:
  - A **worktree-root anchor** field — the absolute path of the pipeline's worktree root, with the declarative write-anchoring instruction; `Agents: all`.
  - A **branch** field — `worktree-<pipeline-slug>`, with the one-clause commit-confirm instruction; `Agents: committing agents`.

  The field states the anchor's value as "the absolute path of the pipeline's worktree root" and **defers** the derivation command to the active tool's convention, keeping `passing.md` free of any tool-specific mention. This file is the single authoring home for both the values and the behavior that operates on them.

- **`reference/conventions/claude-code.md` (MODIFIED).** States that, for injection, the orchestrator derives the absolute worktree root with `git rev-parse --show-toplevel` run from its own cwd (the worktree). Verified stable: from inside the worktree this returns the worktree root, and the orchestrator's existing main-root read (`load.md:36`, which deliberately reaches out to main via `git rev-parse --git-common-dir` to read a git-ignored file) does not drift the cwd.

- **`reference/conventions/pi.md` (MODIFIED).** States how the orchestrator obtains the absolute worktree root for injection: reuse the absolute Pi worktree path it already uses as the spawn `cwd`, captured from `/worktree create` if it surfaces an absolute path, otherwise resolved as `.pi/worktrees/<folder-name>` against the repo root. The exact wording depends on Pi-tooling specifics flagged under Risks and Open Questions; the design shape (orchestrator derives an absolute worktree root and injects it) is unaffected.

- **Agent profiles (~18) — UNTOUCHED for this behavior.** The verify-before-acting behavior rides in the injected block, not in profile prose, so no profile needs editing. No profile contains conflicting worktree/branch prose that would need reconciling.

- **`reference/autonomous-workflow.md` — UNTOUCHED, relevant.** Already instructs the orchestrator to include the `## Conventions` block at the top of every spawned agent's initial prompt (`:62-64`). The two new fields flow through this existing wiring with no change.

- **`reference/setup.md`, `reference/pipeline-versioning.md` — UNTOUCHED.** Home of the orchestrator's deliberate main-checkout operations (Requirement 7). Untouched by construction; see Key Decisions.

## Interfaces and Data Flow

The only interface that changes is the **shape of the spawn-time `## Conventions` block** — the contract between the orchestrator and every spawned agent. No new tool, runtime layer, or agent-to-agent protocol is introduced.

**Two new labeled fields**, following the existing `- **Label:**` style of `passing.md`, each with an `Agents:` line:

- **Worktree root** → the absolute path of the pipeline's worktree root. `Agents: all`. Carries the write-anchoring instruction: anchor every absolute path on this root; never construct a path into the main checkout.
- **Branch** → `worktree-<pipeline-slug>`. `Agents: committing agents` (every agent that has its own commit step — all roles except the two researchers, `spec-researcher` and `design-doc-researcher`, whose analysts commit). Carries the commit-confirm instruction: commit on this branch; confirm you are on it before committing (may name `git branch --show-current` inline).

The exact field labels are finalized by the implementer within the file's existing convention; the names above describe their content and scope.

**Data flow per spawn:**

1. The orchestrator (inside the worktree) derives the absolute worktree root once via the active tool's command (Claude Code: `git rev-parse --show-toplevel`; Pi: the absolute Pi worktree path it already uses for spawn `cwd`).
2. It fills the two fields — branch is `"worktree-" + slug`, already in hand — and applies the per-agent scoping.
3. It injects the assembled `## Conventions` block at the top of the agent's initial prompt (`autonomous-workflow.md:62-64`).
4. The agent reads the block — its only channel for this context, exactly as it consumes `<artifacts-folder>` and Guardrails today — and reads nothing external.
5. The agent anchors absolute paths on the passed worktree root and confirms the branch before committing.

The worktree root is derived **independently of the artifact folder**, so the anchor stays correct even when the artifact folder is configured to a location outside the worktree.

## Key Decisions

### Decision: Two-part design — provide a passed anchor *and* instruct verify-before-acting

- **Choice:** Inject two new values (absolute worktree root, pipeline branch) into the spawn-time `## Conventions` block, *and* instruct agents to anchor absolute paths on the passed root and confirm the branch before committing.
- **Alternatives:**
  - *Verify-only, no passed anchor* — instruct agents to self-derive the worktree root (e.g. via `git rev-parse --show-toplevel`).
  - *Anchor-only, no verify behavior* — pass the values and trust inherited cwd.
- **Trade-offs:** Verify-only violates the requirement that the anchor come from what the agent is *given*, and re-introduces the chance of reaching for the wrong primitive (the main-root read at `load.md:36` resolves to main, not the worktree). Anchor-only is inert: a value an agent is never told to use changes nothing, and inherited cwd is exactly the status quo that already fails. Only the combination both removes the need to guess the worktree root and instructs its use, closing both halves of the gap.
- **Traces to:** All requirements; directly Requirements 1, 2, 4, 5. Acceptance criteria on absolute-path writes, commits on `worktree-<pipeline-slug>`, and anchor-availability-at-spawn.

### Decision: Carry the behavior centrally in the injected block, not duplicated per-profile

- **Choice:** Both the anchor values and the verify/anchor behavior live as content the orchestrator injects into the `## Conventions` block, authored once in `passing.md`. Agent profiles are left untouched.
- **Alternatives:** Duplicate the behavior instruction as standing prose into each of ~18 profiles; or a hybrid (values in the block plus a restatement in every profile).
- **Trade-offs:** Both homes are authoring-rules-legitimate — the block is part of the agent's initial prompt, not a forbidden external reference an agent must go read. Centralizing keeps the whole feature in one authoring home, makes the passed values self-describing (a value with no instruction to use it is the rejected anchor-only failure), and exactly mirrors the Guardrails precedent, where the block carries per-pipeline content plus the expectation that it be acted on while the profile holds only minimal static control flow. The cost is that a reader of a single profile body does not see the behavior there — but they see it in the spawn prompt, and profiles already depend on the block this way for `<artifacts-folder>` and Guardrails. Per-profile duplication would copy a static instruction 18 times (high edit cost, drift risk) and split the feature across 18 files plus `passing.md`; the hybrid is the worst of both, with two homes that can disagree.
- **Traces to:** Requirements 1, 2, 3, 5, 6 (the behavior half); the authoring rules (minimalist, no cross-path duplication, self-contained profiles).

### Decision: Worktree-root anchor → all agents; branch confirm → committing agents only

- **Choice:** The worktree-root field and its write-anchoring instruction go to **all** agents (matching Artifact folder's scope). The branch field and its commit-confirm instruction go to **committing agents** — every role except the two researchers (`spec-researcher`, `design-doc-researcher`).
- **Alternatives:** Send both fields to all agents uniformly.
- **Trade-offs:** The two researchers have no own commit step (their analysts commit), so a commit-confirm line to them would be inert — paralleling how Guardrails omits non-gate agents. But researchers *do* mutate the working tree during experiments, so they still receive the worktree-anchor line. Per-agent field inclusion is already first-class in `passing.md` (every field has an explicit `Agents:` list), so this scoping uses the file's existing mechanism rather than a new one.
- **Traces to:** Requirement 3 (command-driven mutations by researchers/reviewers stay in the worktree → anchor to all); Requirements 1, 2.

### Decision: Asymmetric verify form — declarative anchoring for writes, one-clause confirmation for commits

- **Choice:** For writes (all agents): a declarative instruction to anchor every absolute path on the passed worktree root and never construct a main-checkout path — the passed value is the guard, with no per-write command. For commits (committing agents): a one-clause confirmation that the current branch matches the passed branch before committing, optionally naming `git branch --show-current` inline.
- **Alternatives:** A per-write observable command-check (e.g. `git rev-parse --show-toplevel` before every write); a full procedural "run X, capture stdout, string-compare, stop on mismatch" recipe for both.
- **Trade-offs:** A per-write command-check is impractical and disproportionate — writes are constant, there is no natural pre-write exit code, and a check would only catch a bad path *after* it was constructed; so for writes, anchoring at path-construction on the given value is the only realistic and strongest guard. A commit-time branch confirmation is near-free and is a new *instance* of the skill's established "run a command, compare to a fixed criterion, stop on mismatch" idiom (as used for guardrail exit codes and the TDD RED check), not a novel mechanism. A full procedural recipe over-specifies against the skill's minimalist house style; the in-idiom form is a single declarative clause that may name the command inline. Note that literal stdout string-equality comparison has no precedent in the skill (precedents compare exit codes / executed-or-not / observed behavior), so the phrasing reads as "confirm you are on branch X," not a scripted string-diff.
- **Traces to:** Requirement 5 (the agent establishes worktree/branch correctness rather than assuming it by inherited cwd); supports Requirements 1, 2, 3; Requirement 6 (prose, not runtime).

### Decision: Generic instruction in `passing.md`, tool-specific derivation deferred to the per-tool conventions

- **Choice:** `passing.md` states the field, its value ("the absolute path of the pipeline's worktree root"), and the inject instruction generically, with **no** tool-specific command. The derivation command is deferred to `claude-code.md` (`git rev-parse --show-toplevel` from the orchestrator's worktree cwd) and `pi.md` (reuse the absolute Pi worktree path used for spawn `cwd`).
- **Alternatives:** Put the derivation command directly in `passing.md`.
- **Trace context:** Putting a tool-specific command in `passing.md` would break the authoring rule that the skill stay tool-mention-free outside the conditionally-loaded `claude-code.md`/`pi.md`. The generic-instruction-plus-per-tool-derivation split is the skill's established pattern, with direct precedent in `health-monitoring.md:13`, which states the instruction generically and defers the exact slash command to the per-tool conventions. The branch name is tool-agnostic (`"worktree-" + slug`) and is stated generically in `passing.md`.
- **Traces to:** Requirement 6 (outcomes hold under every supported tool, fitting each tool's worktree/spawn model, prose-only); Requirement 4 (anchor available from what the agent is given).

### Decision: Requirement 7 — orchestrator main operations stay unconstrained by construction, with no carve-out language

- **Choice:** Add no defensive or carve-out language to `setup.md` or `pipeline-versioning.md`. The new discipline is scoped exclusively to the spawned-agent passing path and so cannot reach the orchestrator's own operations.
- **Alternatives:** Add explicit prose exempting the orchestrator's `.rp.md`/`.gitignore` main-branch setup commits and its lineage tree-SHA reads from the new discipline.
- **Trade-offs:** The `## Conventions` block is attached only to spawned-agent prompts and is never consumed by the orchestrator; `passing.md` is exclusively a spawn-instruction file (every field carries an `Agents:` recipient); and the orchestrator's main operations live in separate files that never reference `passing.md`. So Requirement 7 holds by construction. Adding an explicit carve-out would be a special-case restatement of a general rule, which the authoring rules forbid — it would also introduce a new place to drift.
- **Traces to:** Requirement 7 (the orchestrator's `.rp.md`/`.gitignore` main-branch setup commits and its lineage tree-SHA reads from main remain correct and unconstrained).

## Dependencies

The design introduces **no new external dependency, library, service, or runtime.**

- **Internal (all existing):** the spawn-time `## Conventions` block mechanism (`passing.md` + `autonomous-workflow.md:62-64`); the per-tool worktree/branch conventions (`claude-code.md`, `pi.md`); the generic-instruction-with-tool-defer pattern (`health-monitoring.md:13` precedent); and the slug/branch derivation the orchestrator already performs.
- **Tool primitives relied upon (all existing):** `git rev-parse --show-toplevel` for Claude Code (standard git, verified to return the worktree root from inside the worktree); the absolute Pi worktree path the orchestrator already uses as spawn `cwd` (`@zenobius/pi-worktrees`, an existing dependency — no new use beyond reading a path it already holds); and `git branch --show-current` for the inline commit confirmation (standard git, in the same family as the `git rev-parse` already used at `load.md:36`).

## Failure Modes and Observability

- **Residual failure mode.** Because the design is prose with no runtime enforcement (Requirement 6, and the spec's Out of Scope excludes hooks/tooling), the ultimate failure mode is an agent that disregards the instruction — constructs a main-anchored absolute path anyway, or commits without confirming the branch. The design cannot mechanically prevent this. It minimizes the probability by removing the need to guess the worktree root (a reliable anchor is now given) and by adding an explicit confirm-before-commit step where none existed, converting a silent assumption into a stated, checkable precondition.

- **Detection / observability.** The misplaced-write/commit problem is observable after the fact at the run boundary: the acceptance criteria themselves are the observable signal — the main checkout's working tree shows no agent-made modifications and the main branch has gained no agent-made commits. The branch-confirm step makes a wrong-branch commit self-evident to the agent *at commit time*, since it would observe a mismatched current branch. No new logging surface is introduced (consistent with prose-only scope); the existing health monitor and the orchestrator's post-phase reporting remain the operational surface.

- **Out of scope (per spec).** Automatic detection, cleanup, or recovery of a stray write or commit already made to the main checkout. This design prevents misplaced changes; it does not undo one that already happened.

## Risks and Open Questions

- **Pi worktree-root derivation is unverified against live tooling (open question for implementation).** The design assumes the orchestrator can obtain an absolute Pi worktree root — the same value it uses for spawn `cwd`. Three specifics must be confirmed against `@zenobius/pi-worktrees` at implementation time, and they pin the exact `pi.md` wording without changing the design shape:
  - (a) Does `/worktree create` emit the absolute worktree path the orchestrator can capture?
  - (b) The exact on-disk folder name — `.pi/worktrees/worktree-<slug>` vs `.pi/worktrees/<slug>` (the create argument is `worktree-<slug>` while `--name` is `<slug>`).
  - (c) Is Pi's spawn `cwd` value absolute or repo-relative?

  Mitigation: the deterministic fallback (resolve `.pi/worktrees/<folder-name>` against the repo root) works once the folder name is confirmed; the orchestrator-derives-and-injects shape is unaffected either way.

- **The guarantee is behavioral, not mechanical (inherent, accepted).** Per Requirement 6 and the spec's Out of Scope, there is no runtime layer; a sufficiently errant agent could still construct a main-anchored path or commit without confirming the branch. The design provides the strongest-available prose mechanism (a reliable given anchor plus an explicit confirm-before-commit) but cannot eliminate the possibility. This is an accepted property of the spec, not a design defect.

- **Authoring-rule adherence is an implementation-phase concern.** The exact wording must hold the line on: minimalism (one-clause declarative, no surrounding rationale); a tool-mention-free `passing.md` with the derivation command deferred to `claude-code.md`/`pi.md`; and no special-case restatement of the discipline into `setup.md`/`pipeline-versioning.md`. Flagged for the plan and code phases.
