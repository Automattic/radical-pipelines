# Docs Review — APPROVED (review-1)

Batch: D1, D2 (all of `doc-plan.md`). Diffed `git diff 3adc5c9 HEAD`; verified
committed content with `git show HEAD:<path>`.

## D1 — Amend the v2 changeset to drop the floor framing — PASS

`.changeset/plan-driven-test-selection.md` is the only edited user-facing doc.
The summary now reads:

> Test selection is now a code-planning duty: a project can mark a guardrail as
> completed per pipeline by the code plan, which then supplies the
> feature-scoped command that completes that gate for the change at hand, and
> turns the spec's acceptance criteria and edge cases into an explicit e2e test
> plan — so the suite a change must pass is decided up front rather than per
> writer. Behavior verification moves to the code-reviewer, which re-drives the
> planned e2e flows when reviewing a batch. The single `code-writer` agent is
> split into `code-writer-tdd` and `code-writer-e2e`, dispatched by a task's
> `Type`, so each task runs the writer suited to its work.

- **No floor / two-command-set vocabulary.** Sweep for "required test command",
  "required-test-commands", "floor", "two command set" finds no match in the
  summary. (The only repo "floor" hit is `Math.floor` in `website/demo.js`,
  unrelated.) The old "sets a required-test-commands floor" clause is gone.
- **Accurate to shipped behavior, at feature altitude.** "A project can mark a
  guardrail as completed per pipeline by the code plan, which then supplies the
  feature-scoped command that completes that gate" matches the shipped model:
  `agents/code-plan-writer.md` authors feature-scoped commands for marked gates
  in `## Plan-completed guardrails`, and the spec overview frames the plan as
  carrying "the commands that complete the declared guardrails for this
  pipeline" (spec R4). No implementation detail leaks: no `plan-completed-for`
  field name, no resolution-step / spawn-line mechanics, no spawn fields.
- **Other two v2 shifts preserved and unchanged in substance.** The
  code-reviewer behavior-verification sentence and the `code-writer` split
  sentence are byte-for-byte unchanged from the base.
- **Front matter unchanged.** `@automattic/radical-pipelines` / `minor`; no
  `BREAKING:` prefix; no second changeset added; no migration/back-compat prose.
- **`node scripts/validate-changesets.mjs` passes** (exit 0).

## D2 — Verify the user-facing doc surface is otherwise unchanged — PASS

- **Floor-family sweep** across `README.md`, `CONTRIBUTING.md`, `website/`,
  `CHANGELOG.md`, `.changeset/` finds no token describing this behavior.
- **No other user-facing doc changed.** `git diff 3adc5c9 HEAD` restricted to
  `README.md CONTRIBUTING.md website/ CHANGELOG.md .changeset/` shows only
  `.changeset/plan-driven-test-selection.md` (1 line). README, CONTRIBUTING,
  website, and CHANGELOG are untouched.
- **Website agent count accurate.** `website/index.html` and `demo.js` state "18
  agents shipped"; `agents/` holds exactly 18 `.md` files at HEAD, and this
  review-1 change adds/removes no agent (no added/deleted agent files in the
  diff). The demo's `code-writer-tdd` name is accurate for the unchanged roster.

## CLAUDE.md authoring rules

The amended summary stays generic, feature-altitude, and free of
implementation/notation detail; no negative phrasing or duplication introduced.

Verdict: **APPROVED.**
