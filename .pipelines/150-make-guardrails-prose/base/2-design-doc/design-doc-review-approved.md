# Design Doc Review: Make guardrails prose

## Verdict: approved

The design doc is complete, sound, traceable to every spec requirement and acceptance
criterion, faithful to the decisions recorded in `design-doc-research.md`, and feasible
against the real worktree files. It honors the project authoring rules (minimalist,
generic, no new shared structure, "prose, not software"). No blocking issues found.

## What I verified

Read `design-doc.md`, `spec.md`, and `design-doc-research.md`, then checked the design
against the actual files **in this worktree** (the change's real target), not the root
repo.

**File targets all exist and match.** All nine in-scope files the design names exist at
the cited paths in the worktree: `guardrails.md`, `load.md`, `passing.md`, `setup.md`,
`code-writer-tdd.md`, `code-writer-e2e.md`, `doc-writer.md`, `code-reviewer.md`,
`doc-reviewer.md`. The worktree's agent files use the **singular** `doc-writer` /
`doc-reviewer` naming — exactly what the spec (`spec.md:22`) and the design doc use, and
exactly how the worktree skill enumerates the running agents (`guardrails.md:20`,
`passing.md:11`). No naming discrepancy.

**Exit-code framing scan matches the in-scope set.** Exit-code phrasing survives only in
the in-scope files — `guardrails.md:3`, `load.md:22`, `setup.md:183,184`,
`code-writer-tdd.md:44`, `code-writer-e2e.md:35`, `doc-writer.md:47`,
`code-reviewer.md:43,114`, `doc-reviewer.md:45,115`. None leaks into out-of-scope files;
`assisted-phases/3 - plan.md` carries the execution check but no exit-code framing, so it
is correctly excluded. (The research's parenthetical "exactly 10 lines" is actually 11
distinct locations — `setup.md:183` carries two exit-code phrases on one line, and the
research's own enumeration sums to 11 — but the design doc never repeats that count; it
says "strip every exit-code phrase from the nine in-scope files," which is correct and
unaffected.)

**Cited line references are accurate.** `guardrails.md:3` definition, `load.md:22` table
cell, `doc-writer.md:35` ("If a gate covers doc tests", inside step-3), `doc-writer.md:47`
("exits non-zero"), the writer three-way sort, the reviewer gate-running steps, the Checks
tables, and the blocker guidelines all sit where the design says.

**Claimed idioms and precedents are real.** The nested-sub-bullet precedent
(`pipeline-versioning.md` "Pipeline versioned slug"), the `_(optional)_` model-file tag
(`summary-format.md`, `intent-format.md`), and the commit-format verbatim-capture
precedent (`setup.md` "Ask the owner for the format and capture at least one concrete
example") all exist as described.

**Pre-existing structure confirmed.** The two code writers' guardrail sections are
byte-identical (the design's "keep them identical" constraint is well-founded). The two
reviewers' two intentional differences are real — "finally approve" vs "approve"
(`code-reviewer.md:43` / `doc-reviewer.md:45`) and "step-2/3 judgment stands" vs "accuracy
spot-check" (`code-reviewer.md:45` / `doc-reviewer.md:47`). This worktree's `.rp.md`
declares no guardrails, so there is nothing to migrate — matching the design's framing
that the change enables authoring without performing any.

## Adversarial assessment

- **Coverage.** Every spec requirement (R1–R14) and every acceptance criterion maps to a
  Key Decision (D1–D10) with explicit traceability. The judgment-guardrail "neither fixed
  nor scoped / no `{scope}`" AC is covered by D2/D4 and the Interfaces data-flow (step 3).
  The reviewer/writer asymmetry (reviewer gates both kinds; writer stays command-focused)
  correctly mirrors the spec's own AC asymmetry — the spec has both a command and a
  judgment reviewer AC but only command writer ACs.
- **Feasibility.** The body-field rename (`command:` → kind-neutral, recommended `rule:`)
  provably does not break `{scope}` resolution: resolution is keyed by guardrail name and
  performed by textual token substitution, indifferent to whether `{scope}` sits in a
  dedicated field or inside a backticked command in prose. The "no machine-readable kind
  flag needed" claim holds — every consumer keys on the body's content, the guardrail
  name, or `agents:`.
- **Scope discipline.** No creep: the four plan agents and `assisted-phases/3 - plan.md`
  are deliberately untouched, with a sound structural argument (a judgment guardrail is
  never scoped, so it never reaches the scope machinery). The surviving "Gate" terminology
  in those out-of-scope files is correctly flagged as a deliberate scope boundary, not a
  missed edit — pre-empting a downstream false-positive.
- **Authoring rules.** Generic-ness is actively defended (Risk: never name `AGENTS.md` or
  the project; describe judgment examples generically). Minimalism is defended (options B —
  a second body field — and C — a distinguishing convention — are rejected; no new field,
  no new shared reference file). The redefinition stays positive (no needless negatives).
  "Prose, not software" is honored — verification is by reading, no structural tests.
- **No-new-duplication.** The decision to edit the writer/reviewer guardrail sections in
  place rather than factor a shared reference file is well-reasoned: agent profiles are
  self-contained by design (zero `reference/` references), already tolerate heavy verbatim
  duplication that pre-dates this change, and a new shared file would be exactly the new
  structure constraint 14 forbids. Reading "states shared instructions once" as "adds no
  new cross-path duplication" is the correct reading given the authoring rule about
  describing the system as designed rather than retrofitting historical state.

## Non-blocking notes (for the plan/code phases, not defects)

- The `setup.md` "prompt for a judgment guardrail vs only accept one" question is correctly
  left to the plan phase as a minimalism/wording call; both branches satisfy the ACs and
  the design recommends the fuller prompt. Acceptable as an open question.
- The `rule:` field label is flagged non-load-bearing and finalizable by the writer; the
  block structure is fixed regardless. Acceptable.
- Whichever judgment-guardrail example lands in `guardrails.md` or `setup.md` must be
  generic and must never name `AGENTS.md` or this project — the design already raises this
  as a risk the code-writers must hold. Worth carrying forward verbatim into the plan.
