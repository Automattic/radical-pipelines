# Doc Plan Review — Approved

Reviewed: `3-plan/doc-plan.md` (commit `6b48ab2`), against `3-plan/code-plan.md` (approved, `7d3a9f9`), `2-design-doc/design-doc.md`, and `1-spec/spec.md`, with the repository verified directly.

**Verdict: Approved.**

The doc plan correctly scopes the docs phase to the two surfaces the code plan deferred — the README per-tool convention catalog (Task 1) and the mandatory CI changeset (Task 2) — with no overlap with the code phase, accurate file references, the canonical shape referenced rather than restated, and verifiable acceptance criteria. No doc surface the feature needs is silently dropped.

## What I verified against the repository

### The flagged open item is resolved: no conventions docs-site page exists
The repo has a `website/` directory, but `website/index.html` (341 lines) is a marketing/landing page (hero, problem, proposal, demo, unlocks/status, install, CTA). It enumerates **zero** project conventions — a case-insensitive search for `convention | commit format | team spawning | health monitoring | artifact folder | per-agent` returns nothing; the only `model` hit is the tagline "The gap is process, not model," and `worktrees` appears once as a generic capability line, not as the `.rp.md` convention catalog. The doc plan reached the same conclusion (Overview, line 16) and — importantly — did **not** create a conditional "docs-site reference page (skip if none exists)" task. It resolved the website question in prose and moved on. There is no unactionable or empty task left in the plan. Correct.

### The two deferred hand-offs are covered, and there is zero overlap with the code plan
- The code plan touches only `setup.md`, `load.md`, `autonomous-workflow.md`, `claude-code.md`, `pi.md`, `health-monitoring.md`, and `.rp.md` (verified each task's "Files to change"). It touches **neither** `README.md` nor `.changeset/`, and it explicitly defers both to the doc plan (code-plan Overview line 13; Task 9 line 184 excludes `README.md`; line 187 says the README mention "is owned by the doc plan ... in phase 5, not here").
- The doc plan's Task 1 owns `README.md` and Task 2 owns `.changeset/*.md`. The mapping is exact and the file sets are disjoint. No responsibility is duplicated and none is dropped.

### README insertion points are accurate
- `README.md:157` is the complete per-tool catalog ("Claude Code conventions add worktree commands ... team spawning (`TeamCreate`), and the bundled `/loop` health monitor. Pi conventions add ... the `@pi-agents/loop` health monitor, and Pi agent discovery rules"). The doc plan's quoted fragment matches.
- `README.md:167` is the `.rp.md`-structure sentence ("a per-tool section covering only what depends on the active tool (worktrees, branch names, team spawning, health monitoring)"). The doc plan's quoted fragment matches.
- These are the two enumerations that would read as out-of-sync if `Agent models` were omitted; targeting exactly them is correct.

### Changeset task is correct against the real release mechanics
- Format: front matter `"@automattic/radical-pipelines": <bump>` then a prose body — matches all four existing changesets verbatim.
- Bump type: `minor` for a backwards-compatible new feature is correct per `CONTRIBUTING.md` "Bump types" (line 88) and the Pre-1.0 policy ("Feature → `minor`", line 100). The project is at `0.1.1` (pre-1.0).
- Requirement trigger: `skills/**` and `README.md` are release-relevant `changedFilePatterns` (`CONTRIBUTING.md:59-64`, `.changeset/config.json`); this feature touches both, so a changeset is mandatory.
- Gate checks named correctly: Shape (`validate-changesets.mjs`) and Presence (`changeset status`) (`CONTRIBUTING.md:43-47`).
- Not the empty-changeset form: empty changesets are for prose-only edits that should not bump (`CONTRIBUTING.md:124-136`); this is a real feature, so a content changeset is right. The doc plan explicitly and correctly distinguishes this (Task 2 lines 44, 52).
- Imperative-mood body matching existing changesets — correct convention (`CONTRIBUTING.md:138-149`).

### Anti-drift / no-duplication is correctly applied
`AGENTS.md:8` and `:10` carry the real no-duplication-across-reading-paths rule the doc plan invokes. Both tasks and the writer notes enforce "reference, do not restate" the canonical `### Agent models` shape (owned by `setup.md` per code-plan Task 1) in the README and changeset. The single canonical shape stays in `setup.md`; the README points at it. Correct.

### Completeness sweep — no other surface dropped
Outside `.pipelines/`, the only files that maintain the per-tool convention catalog are `README.md` (doc-plan Task 1) and `.rp.md` (code-plan Tasks 8/9). Other skill-reference files that mention "health monitoring"/"team spawning" reference those conventions individually in workflow prose; they are not catalogs and would be wrong to amend with "Agent models." Nothing is silently dropped.

### Acceptance criteria are verifiable
The doc-plan task acceptances are checkable ("`Agent models` appears in both `:157` and `:167` using the canonical name"; "a single well-formed `.changeset/*.md` with valid front matter naming `@automattic/radical-pipelines` and a `minor` bump"; "satisfies the gate's Shape and Presence checks"). The plan correctly states that every spec AC's *behavior* is realized by the code phase, and the docs phase adds only discoverability and release-completeness.

## Non-blocking observations (guidance for the doc-writer; not defects)
1. `README.md:153` is a **third**, deliberately illustrative ("each project defines its own conventions for things like ...") convention list. Unlike `:157`/`:167` it does not claim completeness, so omitting it from the doc plan is acceptable. The writer may optionally add `agent models` there if it reads naturally; Task 1's catch-all acceptance ("the catalog still reads as a complete, accurate enumeration") already covers the judgment.
2. `README.md:175` states the changeset rule lives "alongside the README-update rule ... in `AGENTS.md`," but `AGENTS.md` contains no README-update rule or changeset rule (only the four skill-modification rules). This is a pre-existing inconsistency in the repo's own README, not introduced or relied upon by this doc plan (which correctly grounds the changeset requirement in `CONTRIBUTING.md`/`config.json`). Out of scope here; flagged so a future cleanup can address it.

Neither observation affects correctness, completeness, or releasability of the planned work. Approved.
