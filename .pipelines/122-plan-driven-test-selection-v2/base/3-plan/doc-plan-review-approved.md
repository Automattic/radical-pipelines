# Doc Plan Review — Approved

The doc plan is complete, drift-resistant, and free of overlap with the code plan. I reviewed it adversarially against the spec, the design doc, the approved code plan, and the **actual current docs in this worktree** (v2, based on current `trunk` with #121 merged), and verified every claim against the real files.

## What the doc plan must cover, and does

The doc plan covers exactly the human-facing surfaces the agent-split / behavior-verification-relocation touches that fall **outside** the code plan: the feature's changeset (Task 1) and the marketing website (Task 2). I built the full inventory of such surfaces and confirmed each is either covered here, covered by the code plan, or correctly excluded:

- `.changeset/agent-scoped-guardrails.md` — a historical record of #121; correctly left untouched (editing it is migration/historical churn, contrary to AC8). Matches the code plan's divergence-A reasoning.
- `README.md` roster (line 112) — covered by **code-plan Task 7**, so correctly excluded from the doc plan (no duplication).
- `website/demo.js` (phase-4 `code-writer` task + commit trailer, lines 96/103) — covered by **doc-plan Task 2**.
- `website/index.html` "agents shipped" count (line 108) — covered by **doc-plan Task 2**.
- `AGENTS.md` — verified it carries no `code-writer`, roster, or agent-count reference, so it is correctly not a surface.
- `SKILL.md:39` "behavior verification" phase-4 row — correctly excluded: it names verification as a phase-4 *output* (agent-agnostic), which is still true after the move from writer to reviewer (both phase 4). The design doc's "Untouched (confirmed)" list agrees.
- The new feature's own changeset — covered by **doc-plan Task 1**.

No doc surface is left to drift, and no gap exists.

## No duplication with the code plan

I read all eight code-plan tasks. The code plan touches skill/agent/reference files and `README.md`; it touches **neither** `.changeset/` **nor** `website/`. The doc plan covers exactly that complement. The boundary is clean — no doc task restates or re-does a code task. (Note: this issue deliberately splits website + changeset to the doc phase, unlike issue #107's rename, which handled both in its code phase; both are valid house patterns, and here the code plan's task list confirms the split.)

## Drift-resistance — the website count, probed hardest

The "15 agents shipped" stat does not match the current 17-file roster, so I traced it. Commit `e5fef2a` set it ("Correct the hero stat to 15 agents shipped") when there were exactly 15 agent files; the roster has since grown to 17 without the stat being bumped, so "15" is genuinely **stale**, lagging by 2. This is decisive in the plan's favor:

- The stat is, by its own established convention, the **literal count of shipped agent files**.
- Task 2 ties the new count to the source of truth — "reads the actual shipped agent set (the `agents/` directory after the code phase) ... rather than assuming a delta" (→ 18 post-split) — and explicitly **forbids** the fragile `15+1` delta approach.
- Computing from the directory is the only drift-resistant method; it incidentally corrects the pre-existing staleness, but that is unavoidable, not scope creep: the spec does not authorize shipping a wrong number, and the website is outside the spec's explicit acceptance criteria (spec R10 names only the README and assisted references), which is precisely why it correctly lands here as a doc-plan drift-prevention surface.

Task 2's `demo.js` instruction is likewise executable and drift-resistant: the phase-4 demo step writes a unit test (`orchestrator.test.ts`), so a single representative `code-writer-tdd` is the natural coherent fit, exactly as the plan anticipates. The plan correctly leaves the unrelated "14 artifacts" summary line alone (the split adds no artifact).

## Changeset task is sound

Task 1 defers the bump type to `CONTRIBUTING.md`'s authoritative table and the pre-1.0 policy (precedent: the sibling guardrails changeset is `minor`), names `node scripts/validate-changesets.mjs` as the gate, summarizes the three user-visible shifts at changelog altitude, and forbids editing `CHANGELOG.md` or any existing changeset. Correct.

## Verdict

**Approved.** The plan's two tasks are complete, non-duplicative, drift-resistant, and have verifiable acceptance criteria. No revisions required.
