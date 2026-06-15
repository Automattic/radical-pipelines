# Spec Review 1 — REJECTED

Issue 122: Plan-driven test selection and reviewer-side behavior verification (BASE run, stacked on #121).

## Verdict

REJECTED. One blocking traceability defect (a). Two minor advisory notes (b, c) that the spec-writer may fix at the same time but are not, on their own, rejection-grounds.

The spec is otherwise excellent: R1–R10 faithfully capture the intent's goal and the research's settled requirements at requirements altitude; the four fixed constraints, the scope decisions (assisted phase-3 in scope, `.rp.md` self-edit as an operational follow-up, unit-test selection left to TDD writers, CI matrix and evidence requirement intact), and the lockstep obligations (load.md enumeration + setup.md Agents field; the "Do NOT plan tests" inversion across three files) are all present and correct. I verified every load-bearing claim about current file state and all hold (load.md gate-running enumeration still names `code-writer`; setup.md option list at :183 and example at :189 name `code-writer`; the "derived from browser verification" phrase exists in exactly `agents/code-plan-writer.md` and `agents/code-plan-reviewer.md`; the assisted phase-3 test-planning rules exist). No design/implementation leaks. So the rejection is narrow.

## (a) BLOCKING — AC7 mandates a change no requirement authorizes (README.md)

AC7 reads: "no live skill file (excluding `.pipelines/` artifacts and the project `.rp.md`) still names `code-writer` in a way that contradicts the split."

The repo's root `README.md:112` lists `code-writer` in the human-facing roster of shipped phase agents:

> `...`code-plan-writer`, `code-plan-reviewer`, `doc-plan-writer`, `doc-plan-reviewer`, `code-writer`, `code-reviewer`, ...`

After the split, a roster that lists `code-writer` as a shipped agent genuinely **contradicts the split** — so AC7, read literally, requires `README.md` to be updated. But `README.md` appears in **no requirement**: R9 scopes phase-4 (`4 - code.md`), R10 scopes the assisted phase-2/3 references, and neither R1–R8 nor Out of Scope mention `README.md`. An acceptance criterion that demands a change no requirement covers makes the spec internally inconsistent and AC7 not cleanly traceable.

The spec research already settled this: its Q7 edit map (section b, "NAMING-CONSISTENCY ONLY") explicitly lists `README.md:112` as an in-scope naming edit. The spec dropped that surface from its requirements while AC7 still sweeps it in. (I confirmed `README.md:112` does list `code-writer` as claimed, and that the root `README.md` is the skill's human-facing doc, not a `.pipelines/` artifact.)

Fix — pick one:
- **Preferred (matches research):** extend a requirement to cover the human-facing roster. Either add `README.md` to R10's "incidental singular-`code-writer` mentions … reconciled with the two-writer reality," or add a short naming-consistency requirement covering README's agent roster. Then AC7 traces.
- **Alternative:** narrow AC7's blanket clause to the files the requirements actually name, so it no longer reaches `README.md`. (Less faithful to the research, which deemed README in-scope.)

Either way the requirements and AC7 must agree on whether `README.md` is in scope.

## (b) ADVISORY — AC7's blanket clause is a judgment call, not a mechanical check

AC7's "in a way that contradicts the split" saving clause is doing real work: it correctly **excludes** the purely illustrative `agents/doc-writer.md:64` mention (which the research flagged Q7c as incidental, not requiring a change) while **including** roster-style mentions. That is the right intent, but it turns AC7 from a grep into a reviewer judgment. This is acceptable at requirements altitude; flagging only so the design/plan phase keeps the distinction (roster/role mentions change; incidental examples that don't contradict the split may stay). No change strictly required, but a one-clause example in AC7 (e.g., "a purely illustrative example that does not present `code-writer` as a current agent is not a violation") would remove ambiguity and pairs naturally with the fix for (a).

## (c) ADVISORY — path shorthand vs. actual repo layout

The spec uses path shorthand (`load.md`, `setup.md`, `4 - code.md`, `assisted-phases/3 - plan.md`, `agents/code-writer.md`) inherited from the research. The actual layout is `agents/` at repo root and `skills/radical-pipelines/reference/{conventions,autonomous-phases,assisted-phases}/…`. This is fine for a spec (requirements altitude doesn't need exact paths, and the names are unambiguous), and the design/plan phases will resolve them. No change required; noted so the spec-writer knows the shorthand is intentional and the design phase owns the literal paths.

## What is NOT wrong (checked, holds)

- All ten requirements trace to the intent and research; constraints and scope decisions intact.
- Lockstep obligations captured: R8 (load.md enumeration ⇄ setup.md Agents field) and R3 (inversion across code-plan-writer.md, code-plan-reviewer.md, assisted-phases/3 - plan.md).
- The single-most-important consistency edit (inverting "Do NOT plan tests" / removing "derived from browser verification") is present in R3 and AC1, correctly scoped to exclude unit-test planning.
- Behavior-verification relocation (R6/R7), evidence requirement intact-and-relocated, plan-reviewer's plan-time "runs not passes" discipline (R4) all faithful.
- `.rp.md` self-edit correctly recorded as an operational follow-up in Out of Scope, not an AC.
- ACs 1–6 and 8 each trace cleanly to R1–R9; AC7's first clause traces to R10. Only AC7's blanket second clause is orphaned (finding a).

Re-submit with (a) resolved; addressing (b)/(c) at the same time is welcome but optional.
