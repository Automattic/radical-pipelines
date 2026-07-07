# Glossary

The canonical vocabulary of Radical Pipelines. Terms are used exactly as defined here — no
synonyms, no alternate notation. Updated whenever the architecture evolves.

## Core concepts

- **Issue** — the tracked unit of work a pipeline realizes; its body is the intent.
- **Intent** — the phase-0 input: goal, constraints, context, open assumptions.
- **Pipeline** — one attempt at an issue: a chain of runs sharing an artifact folder and a
  version.
- **Pipeline version** — `v1`, `v2`, … One per fork of the same issue; `v1` is implicit in
  names.
- **Run** — one pass of the phase flow: `base` (always first, implicit in names) or
  `rev-<N>-<desc>` (a revision).
- **Revision** — a run layered on a complete previous run, driven by a revision intent.
- **Phase** — one stage of a run: `0-intent`, `1-spec`, `2-design-doc`, `3-build`,
  `4-document`.
- **Artifact folder** — the single folder holding all of an issue-pipeline family's
  artifacts, produced by the Artifact folder convention; identical across forks (no version
  in its name). Artifacts live at `<artifact-folder>/<run>/<phase>`.
- **`pipeline.md`** — one-line identity file at the artifact-folder root recording the
  pipeline version; a fork's first commit updates it (fork marker; version recovery for
  merged, branch-deleted pipelines).
- **Owner** — the human running the pipeline. Talks only to the orchestrator.
- **Orchestrator** — the top-level agent executing the skill: loads conventions, creates
  topology, spawns agents, verifies predicates, reports to the owner.

## Branches and topology

- **Branch-base** — the per-pipeline-family stem produced by the Branch names convention;
  must not contain `_`.
- **Branch grammar** — `<branch-base>[_v<N>][_rev-<N>-<desc>][_<phase>-lane-<K>]`;
  underscore separates segments, `v1` and `base` are implicit, segments have reserved
  shapes so parsing is deterministic.
- **Run branch** — the branch holding one run's commits. Run branches chain: each starts at
  the previous run's tip. There is no pipeline-level branch; the pipeline's tip is its
  latest run branch, which is what merges to main.
- **Lane branch** — a branch forked from the run branch at phase start for one lane of a
  multilane phase. Never merged; permanent record; writes the same canonical artifact paths
  as the run branch (lane identity lives only in the ref).
- **Start ref** — where a base run's branch begins: the project's main branch (default),
  another pipeline's run-branch tip (stacking), or a cut commit (fork).
- **Stacking** — starting a pipeline on top of an unmerged pipeline's run tip.
- **Fork** — a new pipeline version created by branching at a cut commit in a parent
  pipeline's history; inherited history carries the inherited work itself.
- **Cut commit** — the commit that added the inherited phase's terminal artifact; the fork
  point.
- **Worktree** — a `git worktree` checkout of one branch. The orchestrator creates and
  removes all branches and worktrees and never changes its own working directory; agents
  only occupy worktrees prepared for them.
- **Anchors** — the absolute Worktree path and Branch passed to every agent; verified
  before the first write and before every commit.

## Phase artifacts

- **`1-spec`** — `spec-research.md`, `spec.md`, `spec-review-N-rejected.md`,
  `spec-review-approved.md`.
- **`2-design-doc`** — `design-doc-research.md`, `design-doc.md`,
  `design-doc-review-N-rejected.md`, `design-doc-review-approved.md`.
- **`3-build`** — `build-plan.md`, `build-plan-review-N-rejected.md`,
  `build-plan-review-approved.md`, code + tests on the run branch,
  `build-review-N-rejected.md`, `build-review-approved.md`, `build-summary.md`.
- **`4-document`** — `document-plan.md`, `document-plan-review-N-rejected.md`,
  `document-plan-review-approved.md`, documentation on the run branch,
  `document-review-N-rejected.md`, `document-review-approved.md`, `document-summary.md`.
- **Completion predicate** — the per-phase set of committed artifacts (primary artifact +
  approval markers) that marks a phase complete, evaluated in the run folder on the run
  branch.
- **Inner gate** — the plan-approval checkpoint inside Build/Document: plan approved, tasks
  pending marks the phase in progress at a known point.
- **Summary** — the human-readable record of what Build or Document produced
  (`build-summary.md`, `document-summary.md`), written by the phase reviewer on approval.

## Agents

- **Spec phase** — `spec-analyst`, `spec-researcher` (persistent pair), `spec-writer`,
  `spec-reviewer`, `spec-consolidator`.
- **Design doc phase** — `design-doc-analyst`, `design-doc-researcher` (persistent pair),
  `design-doc-writer`, `design-doc-reviewer`, `design-doc-consolidator`.
- **Build phase** — `build-plan-writer`, `build-plan-reviewer`, `build-writer-tdd`,
  `build-writer-e2e`, `build-reviewer`.
- **Document phase** — `document-plan-writer`, `document-plan-reviewer`, `document-writer`,
  `document-reviewer`.
- **Writer / reviewer loop** — a fresh writer per iteration produces the artifact; an
  adversarial reviewer rejects (numbered rejection file) or approves (singleton approval
  file).
- **Consolidator** — merges approved lane artifacts into the consolidated artifact and
  consolidated research on the run branch; plays the writer role against the final
  reviewer.

## Workflows

- **Autonomous workflow** — the orchestrator collects the run plan up-front (target phase,
  per-phase decisions) and runs phases end-to-end with teams of agents, without further
  questions.
- **Assisted workflow** — the orchestrator drives one phase directly with the owner (spec
  and design-doc only); no agents spawned; the owner's explicit approval produces the
  approval file.
- **Decisions** — per-phase choices collected at run start; currently lane count (spec,
  design-doc) and lane mode (design-doc).
- **Target phase** — the highest phase an autonomous run executes before stopping.
- **Blocker** — an agent's stop-and-report when required input is missing, contradictory,
  or would force a prior phase's decision; payload: what is missing/contradictory, which
  prior-phase artifact must change, the smallest unblocking revision.
- **Self-sizing** — no phase is skipped and nobody sizes work up-front; artifact depth
  follows what research finds, and reviewers reject minimal conclusions not backed by a
  recorded, empty-handed investigation.

## Multilane

- **Lane** — one independent execution of a phase's full machinery on its own lane branch,
  producing a lane-approved artifact.
- **Lane count (N)** — a per-phase decision. At N=1 the lane branch is the run branch and
  consolidation is skipped (the degenerate case).
- **Isolated mode** — lanes run in parallel, mutually blind (spec always; design-doc
  optionally).
- **Divergent mode** — design-doc lanes run sequentially; each reads the previous lanes'
  approved designs and must produce a different one.

## Lineage

- **Ancestry** — the primary lineage record: fork points derived with `git merge-base`;
  answers "what did this pipeline start from", permanently.
- **Content annotation** — per-phase comparison of tree SHAs over the uniform artifact
  paths: `inherited-identical`, `inherited-modified`, `parent-diverged`; answers "what is
  still identical now".
- **Merged** — a run tip that is an ancestor of main (`git merge-base --is-ancestor`).

## Verification

- **Guardrails** — the project's deterministic verification gates: exact commands judged
  pass/fail by exit code.
- **Fixed / scoped gate** — a literal command, or one with a `{scope}` placeholder filled
  by the phase's plan.
- **Behavior verification** — the phase reviewer exercising changed behavior end-to-end and
  capturing evidence before approval.
