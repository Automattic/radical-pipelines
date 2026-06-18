# Doc Plan — Managing Issues mid-session

## Nature of this change, for documentation

The shipped change is **skill-prose only**: three small edits across
`skills/radical-pipelines/SKILL.md` (one new `## Rules` bullet; a de-exclusivized
Entry-points preamble) and `skills/radical-pipelines/reference/manage-issues.md`
(mid-session-safe framing and a situation-neutral close-out). **Those skill edits
are the code phase's output, not doc tasks** — this plan does not re-plan them.

This plan covers only **separate documentation** that must reflect the change or
convey its rationale to its audience. I investigated every documentation surface
in the repo; the findings below are explicit about what needs work and what does
not, so the doc-writer does not invent work.

### Documentation surfaces investigated

| Surface | Describes the affected behavior? | Action |
| --- | --- | --- |
| `.changeset/*.md` (Changesets) | Is the project's published record of every user-facing change | **Task 1 — required.** `skills/**` is release-relevant and this is a behavioral change, so a non-empty changeset must ship. |
| `CHANGELOG.md` | Generated from changesets by `changeset version`; never hand-edited | **No task.** It is regenerated at release time from the Task 1 changeset (see README:163-190). Editing it by hand is wrong. |
| `README.md` | No. It documents phases, install, configuration, and the changelog flow; it never describes the Entry-points table, the session-start framing, or the Managing Issues workflow. | **No task.** Nothing in it is made stale by this change; inventing a note would be fabricated work and would violate the spec's minimalism intent. |
| `CONTRIBUTING.md` | No. It documents the changeset/release mechanics only. | **No task.** Unaffected. |
| `AGENTS.md` | No. It holds the skill-authoring rules only. | **No task.** Unaffected. |
| `website/` (`index.html` etc.) | No. High-level marketing (problem, phases, install). It mentions "issues" only as folder-name examples and a "Browse issues" link. | **No task.** Unaffected; and `website/**` is explicitly non-release-relevant (CONTRIBUTING.md). |
| `agents/*.md`, other `skills/**/*.md` (phase files, workflows, `review-pipeline.md`, `conventions/`) | These are the skill itself. | **No task.** Per the spec they either change in the code phase or are untouched-but-load-bearing; they are not separate documentation. |

**Net:** the only genuine documentation deliverable is the changeset (Task 1).
Everything else is either generated downstream of it, or describes nothing this
change touches.

### Rules that bind every task

- Respect the project's `CLAUDE.md`/`AGENTS.md` authoring rules where they apply
  to prose: minimalist, generic (no agentic-tool and **no issue-tracker-platform**
  specifics — no GitHub/Linear), reuse the project's existing terms.
- Respect all five spec Out-of-Scope items. In particular, the changeset describes
  only the in-scope guarantee (the Managing Issues workflow now applies whenever
  the orchestrator creates or modifies an issue, mid-session included); it must not
  imply new recognition triggers, run-time tracker-metadata handling, spawned-agent
  changes, or the absent `merge-pipeline.md`/`close-pipeline.md` files are part of
  this change.
- The skill's own term discipline carries into user-facing prose: do not coin a new
  capitalized proper noun. The literal "Managing Issues workflow" string is a spec
  term; the changeset may describe the behavior plainly (the issue
  create/modify workflow) without minting a new handle.

---

## Task 1 — Add a changeset recording the change

**Goal:** Ship the project's required published record of this user-facing change,
so it lands in `CHANGELOG.md` at the next release and tells package consumers what
changed and why: the orchestrator now follows the issue create/modify workflow
whenever it creates or modifies an issue — mid-session and mid-pipeline included —
not only at session start, closing the gap where it could otherwise author an issue
ad hoc.

**Audience:** Consumers of the `@automattic/radical-pipelines` package and project
maintainers reading the changelog — people who adopt the skill and need to know how
the orchestrator's behavior changed between releases. (Not the orchestrator/agents;
this is external release documentation, not skill prose.)

**Files:**
- A new `.changeset/<slug>.md` (e.g. `.changeset/manage-issues-mid-session.md`),
  matching the kebab-case-slug convention of the existing changesets
  (`per-phase-summaries.md`, `fresh-team-per-run.md`, `agent-scoped-guardrails.md`).
  Created via `npx changeset` from the repo root, or hand-written in the same
  canonical front-matter form.

**Sections-scope:**
- Front matter: the single package key `"@automattic/radical-pipelines"` with its
  bump type.
- Body: a one-paragraph imperative-mood summary of the behavioral change and its
  rationale.

**Content guidance:**
- **A non-empty changeset is required, not an empty one.** Per CONTRIBUTING.md,
  `skills/**` is a release-relevant path and an empty changeset is reserved for
  *prose-only* edits to a release-relevant file. This change alters orchestrator
  behavior (the workflow now applies mid-session), so it is behavioral, not
  prose-only — it must carry a real summary and a real bump.
- **Bump type:** decide per the authoritative bump table and pre-1.0 policy in
  `CONTRIBUTING.md` (`#bump-types`, `#pre-10-policy`) — do not restate that table
  here. This is a **backwards-compatible** strengthening of existing behavior that
  closes a gap (the orchestrator previously had no standing rule to re-enter the
  workflow mid-session and could author ad hoc). Recommended: `patch` (a
  backwards-compatible fix that adds no new feature surface). If the writer judges
  the new standing guarantee reads as a feature addition, `minor` is the fallback;
  either way the choice must be justified against the bump table, and pre-1.0 it is
  never `major`. No `BREAKING:` prefix — nothing breaks for existing consumers.
- **Summary:** imperative mood, one line/paragraph in the style of the existing
  changesets. State the behavior and the rationale: the orchestrator follows the
  issue create/modify workflow (the owner-led capture Q&A routed through the
  project's Issues convention) whenever it creates or modifies an issue — including
  mid-session and mid-pipeline — rather than only at session start, so a mid-run
  decision to author an issue no longer risks an ad-hoc issue.
- **Scope discipline (spec Out-of-Scope):** describe only the in-scope guarantee.
  Do not claim the change adds new triggers for *when* the orchestrator decides to
  file an issue, do not mention run-time tracker metadata (status/labels/assignee/
  version/branch push), do not imply spawned-agent behavior changed, and do not
  reference the absent merge/close files.
- **Generic wording:** no GitHub/Linear or other tracker-platform names; no
  agentic-tool specifics. Describe the behavior in the project's own generic terms.

**Depends on:** none. (It can be authored from the spec/design; it does not require
the skill edits to be committed first. It should be committed alongside this
change's branch so the changeset gate is satisfied.)

**Traces to:** the spec's R1–R5 (the changeset summarizes the R1 guarantee and its
mid-session scope) and the project's standing "every change records a changeset"
rule (README:167; CONTRIBUTING.md `#when-a-changeset-is-required`).

**Acceptance:**
- A new `.changeset/*.md` exists with valid front matter: exactly the
  `"@automattic/radical-pipelines"` package key and a single bump type that is
  valid pre-1.0 (`patch` or `minor`, never `major`); it passes
  `node scripts/validate-changesets.mjs`.
- The bump is non-empty (carries a real summary), and the chosen bump type is
  consistent with the CONTRIBUTING.md bump table and pre-1.0 policy.
- The summary is imperative-mood and states both the behavioral change (workflow
  applies whenever an issue is created/modified, mid-session included) and its
  rationale (no longer only at session start; no ad-hoc authoring mid-run).
- The summary stays within scope: it does not assert new recognition triggers,
  run-time tracker-metadata handling, spawned-agent changes, or the absent
  merge/close files are part of this change.
- The summary is generic: no issue-tracker-platform names and no agentic-tool
  specifics; it does not coin a new capitalized proper noun for the workflow.
- `CHANGELOG.md` is **not** hand-edited (it is generated from this changeset at
  release time).

---

## Out of scope for the Docs phase

These are recorded so the doc-writer does not pick them up:

- **The skill-prose edits** (`SKILL.md`, `manage-issues.md`) — code-phase output.
- **`CHANGELOG.md`** — generated from the Task 1 changeset; never hand-edited.
- **`README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `website/`** — none describes the
  affected behavior; no edit is warranted.
- **`review-pipeline.md` and all other reference/agent/phase files** — left
  unchanged by the design; not documentation to author here.
