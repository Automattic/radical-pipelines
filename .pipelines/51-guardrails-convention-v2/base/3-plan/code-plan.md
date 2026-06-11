# Code Plan — Add a Guardrails convention to formalize deterministic code-phase verification

_Issue: [Automattic/radical-pipelines#51](https://github.com/Automattic/radical-pipelines/issues/51). Pipeline: `51-guardrails-convention-v2`. Inputs: the approved, binding `1-spec/spec.md` and the approved `2-design-doc/design-doc.md` (decisions D1–D6 + deliverable map §9), incorporating the three non-blocking observations from `2-design-doc/design-doc-review-approved.md`. This plan is the task list the code phase executes against._

## Orientation

This change is **prose / instruction text only** — no executable code, no module, no API, no schema, no parser (design §1, spec OOS 4). Guardrails are prose the agents read, exactly like every other `.rp.md` entry. The "implementation" is the exact wording added or rewritten across five files plus a `minor` changeset.

Because there is no executable surface, the TDD red/green loop and unit-test contract that `code-writer` normally runs do **not** apply here in the usual sense: there is nothing to unit-test. The acceptance evidence for every task is **mechanical and grep-based** — string presence/absence, heading placement, and the repo's own guardrail commands resolving-and-executing. Each task below states its acceptance as concrete, checkable assertions a reviewer (and the dogfood guardrails themselves) can confirm. The single hard mechanical gate spanning the agent tasks is **`grep -rn "verification convention" agents/` returns empty** after the rewrite.

The repository's own three guardrails apply to this change (it is the dogfood instance) and are this plan's effective verification gates: `npm test`, `node scripts/validate-changesets.mjs`, `npx changeset status --since=origin/trunk`. **`npm test` requires Node ≥21** (CI uses Node 22); on the local Node v20.19.4 in this worktree it errors as unrunnable (the `**`-glob parity case, design §3.5). The code phase must run these gates on a Node ≥21 environment to confirm green, and must **not** fix the `npm test` glob wart (spec OOS 2).

### Grounded state (re-verified in this worktree)

- `grep -rn "verification convention" agents/ skills/` matches in **exactly the four phase agents**, zero in `skills/` — the 17 occurrences the design lists (T2–T5 line map below). `skills/` and the phase-reference docs are clean. Greenfield.
- `load.md` has **no `###` headings** — its body is all `##`-level sections (`## Conventions`, `## Missing conventions`, `## Local overrides`). (Review observation 1.)
- `setup.md` signals optionality by the **absence of a `(required)` suffix** (e.g. `### Commit format`, `### Spawning teams of agents`), never an explicit `(optional)` tag. (Review observation 2.)
- `.rp.md` `## Shared conventions` holds tool-agnostic `###` subsections (`### Commit format`, `### Agent models` table, `### Health monitoring`). Title `# Radical Pipelines project conventions` unchanged.
- Package `@automattic/radical-pipelines` at `0.2.0`; `.changeset/config.json` `changedFilePatterns` includes `agents/**` and `skills/**`; `.changeset/pipeline-reviews.md` is the template (`---`-delimited frontmatter, single `"@automattic/radical-pipelines": minor` line, one-paragraph summary). `validate-changesets.mjs` forbids `major` pre-1.0, so `minor` is correct.
- Live dogfood-gate behavior on Node v20.19.4: `npm test` → exit 1 ("Could not find '…/scripts/test/**/*.test.mjs'", the glob/parity case); `node scripts/validate-changesets.mjs` → exit 0; `npx changeset status --since=origin/trunk` → exit 0.

## Task ordering and parallelism

The seven tasks are **mutually file-disjoint** except T7 (the changeset) which is independent of all. No task depends on another's output — each rewrites a distinct file against the spec/design, not against a sibling task's result. They may be executed in any order or in parallel. **T6 (`.rp.md` dogfood)** must be in place for the repo's own guardrails to be declared, but that declaration does not gate the other edits. The single cross-task invariant is the grep-negative gate, which only becomes assertable once **all four** agent tasks (T2–T5) have landed; whichever agent task commits last is where the reviewer runs the repo-wide `grep -rn "verification convention" agents/`.

| Task | File | Depends on |
| ---- | ---- | ---------- |
| T1 | `skills/radical-pipelines/reference/conventions/load.md` | — |
| T2 | `agents/code-writer.md` | — |
| T3 | `agents/code-reviewer.md` | — |
| T4 | `agents/doc-writer.md` | — |
| T5 | `agents/doc-reviewer.md` | — |
| T6 | `skills/radical-pipelines/reference/conventions/setup.md` | — |
| T7 | `.rp.md` + `.changeset/<name>.md` | — |

> **Note on T6/T7 grouping.** `.rp.md` and the changeset are paired in T7 because the `### Guardrails` declaration in `.rp.md` and the `minor` changeset are the two "dogfood / release-mechanics" deliverables and are naturally authored together; they touch no agent or skill prose. `setup.md` (the capture flow) is its own task (T6). If the code phase prefers, T7 may be split into a `.rp.md` task and a changeset task — they are independent — but they are small and cohesive enough to keep together.

---

## T1 — `load.md`: loader row + body definition + local-overrides carve-out

**Goal.** Make Guardrails discoverable in the conventions loader as an **optional** convention, define what a guardrail is and how an agent selects guardrails for a phase, and add the one-sentence local-overrides carve-out — without adding any required-completeness branch or any override mechanism.

**Files.** `skills/radical-pipelines/reference/conventions/load.md`.

**Traces to.** Spec req 7, 8, 9, 24; AC 1, 2, 11, 13. Design D1, D6; §6.

**Changes.**

1. **Table row (D1, spec req 7/8).** Add one row to the `## Conventions` table (`load.md:11-21`), marked **`No`** in `Required?`, matching the existing optional-row pattern (Commit format / Team spawning / Agent models are the models). The "What it covers" cell stays terse like every other row but must **signal the executable / exit-code nature** so a reader knows the value is a command to run, not advice to follow. Use the spec's model wording or a close paraphrase: _"The deterministic verification gates — exact commands judged pass/fail by exit code — the code/doc phases must pass."_ Re-pad the hand-aligned column so the table stays visually aligned.
   - **Hard constraint:** `No` is load-bearing. Do **NOT** add Guardrails to `## Missing conventions` (`load.md:23-29`) or any required-completeness check. The `No` row is structurally invisible to the missing-conventions gate, which is exactly how optionality-for-free is achieved (spec req 8 / AC 13). Leave `## Missing conventions` untouched.

2. **Body definition (D1, spec req 9 / AC 2).** The table cell cannot carry the definition. Add a short body addition documenting the three things below. **Use a `## Guardrails` body section placed after the `## Conventions` table** (or, if lighter, a short paragraph under the table) — **NOT a `### Guardrails`**: `load.md` has no `###` headings today, so a `###` would dangle without a parent `##` (review observation 1). Match load.md's existing prose density. The body must document:
   1. **What a guardrail is** — an exact command, judged pass/fail **solely by its exit code** (0 = pass, any non-zero = fail), **mandatory within the phase(s) it applies to**. "Run the tests" is not a guardrail; `npm test` is. The only valid phase targets are **`code`** and **`docs`**; a guardrail may apply to one or both.
   2. **Absent / empty = no command gates** — a valid, complete state, **never a blocker, never a warning**.
   3. **Phase-selection rule** — how an agent loads the guardrails for a phase: **select the guardrails whose phase(s) include the current phase; an empty selection means run none and proceed.**
   - This body text is the **single place** the code/docs phase dimension and the phase-selection rule are defined, so the four agents can say "the guardrails applicable to the {code|docs} phase" without re-deriving the selection. Keep it tight.

3. **Local-overrides carve-out (D6, spec req 24 / AC 11).** Add **exactly one sentence** to the existing `## Local overrides` stub (`load.md:31-37`), attached **after the `:37` merge rule** as a carve-out from it. Correct shape: _"Guardrails is shared and committed-only; it is never taken from `.rp.local.md`."_
   - **Hard constraint — phrasing is load-bearing.** Phrase it as a **scoping carve-out from the merge rule**, NOT as warn-on-override behavior. Do **NOT** write "a local guardrails override is ignored and the run warns" or any "ignored / committed-value-used / warn-on-override" enforcement — that machinery does not ship in this loader (it lives only in unshipped #91 artifacts; porting it re-opens #91 scope, spec OOS 7). Do **NOT** enumerate an overridable subset and do **NOT** add Guardrails to one. No other change to `## Local overrides`.

**Acceptance.**

1. `## Conventions` has a `Guardrails` row with `No` in `Required?`; the "What it covers" cell is terse and signals executable / exit-code semantics (mentions command and/or exit code). The table columns remain aligned.
2. `## Missing conventions` is unchanged — Guardrails appears in no required-completeness check anywhere in the file. `grep -n "Guardrails" load.md` shows it only in the table row, the body section, and the carve-out sentence — never in `## Missing conventions`.
3. The body documents all three: (a) guardrail = exact command judged by exit code, mandatory within its phase(s), valid targets `code`/`docs`; (b) absent/empty = no command gates, never a blocker/warning; (c) phase-selection rule (select where phase(s) include current phase; empty ⇒ run none and proceed).
4. The body heading, if any, is `##`-level — there is **no new `###` heading** in `load.md` (`grep -n "^### " load.md` returns nothing introduced by this change).
5. `## Local overrides` gains exactly one carve-out sentence after the merge rule stating guardrails is shared / committed-only / never from `.rp.local.md`; it contains **no** "ignored", "warn", or "warns" wording about overrides, **no** enumerated overridable subset, and **no** new override mechanism.

---

## T2 — `agents/code-writer.md`: read code-phase guardrails, three-way split, decouple behavior verification

**Goal.** Replace the "host project's verification convention" command-gate role with "the guardrails applicable to the code phase," encode the three-way blocker split (absent ⇒ proceed / declared-but-unrunnable ⇒ blocker / runs-but-nonzero ⇒ work), and reword behavior verification to stand alone — leaving every other convention reference verbatim.

**Files.** `agents/code-writer.md`.

**Traces to.** Spec req 18, 19, 20, 21, 22, 23; AC 7, 8, 9, 10. Design D2 (all three buckets); review observation 3.

**Changes** (line anchors are pre-edit; the listed leave-alone lines must remain verbatim):

1. **Bucket 1 — read code-phase guardrails (`:13`, `:46`).**
   - `:13` step 1.2 "Read the host project's verification convention." → read **the guardrails applicable to the code phase** (the code-tagged guardrails).
   - `:44-52` step 5 "Validate against the project's gates" — rewrite so it reads **the guardrails applicable to the code phase**, runs **every** one, treats each as **mandatory**, does not complete while any fails, bypasses none (no `--no-verify`, no `skip`, no commented-out checks), and does not invent commands. "The host project's verification convention defines a set of gates …" (`:46`) becomes "Run every guardrail applicable to the code phase, exactly as its command is written."

2. **Bucket 2 — three-way blocker split (`:50`, `:51`, `:70`).** Today's text conflates "absent → blocker" and "unrunnable → blocker." Split into three explicit outcomes inside step 5 and the blocker guideline:
   1. **Absent / empty code-phase guardrails ⇒ run none and proceed.** NOT a blocker, no warning. This **removes** the `:51` sentence ("If the verification convention itself is missing or unrunnable, that **is** a blocker…") as written and **removes** the "or … the verification convention is missing" clause from the blocker-guideline example at `:70`. After the change **no "guardrails missing = blocker" path remains** (spec req 20).
   2. **A declared code-phase guardrail whose command does not resolve / execute (unrunnable — binary missing, script renamed) ⇒ blocker.** Keep this residual run-time blocker (spec req 21), but reword it to trigger **only** on "a declared guardrail's command cannot execute," never on "no guardrails declared." Frame it as the drift guard.
   3. **A guardrail that runs and exits non-zero ⇒ work to fix, not a blocker.** Preserve the existing `:50` sentence "Failing gates are work, not blockers" — **re-anchor it** to the new wording rather than deleting it (review observation 3), so the surviving "failing gates are work" sentence sits coherently beside the new split and no orphaned wording remains.
   - State the spine — **"did the command execute?" vs "did the gate pass?"** (design §4.2) — so the three outcomes read as one model, not disconnected special cases. The `:70` blocker-guideline example keeps its other items (component does not exist, contradictory Acceptance) and its closing "Failing tests or broken builds are not blockers — they are work to do" — only the verification-convention clause changes.

3. **Bucket 3 — decouple behavior verification (`:36`).** Step 3 "Behavior verification" currently exercises behavior "using the host project's verification convention" and captures "whichever evidence the convention requires." Reword so the agent **exercises the changed user-observable behavior end-to-end itself** and **decides the appropriate evidence** (screenshots / transcripts / output samples / response diffs) — the how-to-exercise and what-evidence guidance now lives **in the step itself**, because there is no longer a convention to defer to. Behavior verification is explicitly **NOT** a guardrail and stays its own step (do not merge it into step 5).

4. **Leave-alone (do NOT touch) — spec req 23 / AC 10.** These are different conventions, not the command-gate role; keep verbatim:
   - `:29` inline API-documentation convention.
   - `:38` UI conventions.
   - `:42` testing convention.
   - `:56` commit format.
   - The step-4 end-to-end-test derivation flow (other than the `:42` testing-convention reference it already names).

**Acceptance.**

1. `grep -n "verification convention" agents/code-writer.md` returns **nothing**.
2. Step 1 reads "the guardrails applicable to the code phase" (or equivalent naming the code-tagged guardrails); step 5 runs **every** code-phase guardrail, mandatory, no bypass, no invented commands.
3. The three-way split is present and explicit in the agent: absent/empty code-phase guardrails ⇒ run none and proceed (no blocker, no warning); declared-but-unrunnable guardrail ⇒ blocker; runs-but-exits-nonzero ⇒ work to fix. **No "missing = blocker" path remains** (`grep` for "missing" near "blocker" shows no guardrails-missing-is-a-blocker sentence).
4. The "Failing gates are work, not blockers" idea survives, re-anchored beside the new split (not deleted, not orphaned).
5. The spine "did the command execute? vs did the gate pass?" (or equivalent phrasing distinguishing execution from passing) appears in the agent.
6. Behavior verification (step 3) stands alone: the agent drives the behavior and decides the evidence, with no reference to a verification convention, and it is **not** reclassified as a guardrail (still its own step).
7. The leave-alone references at `:29` (inline API doc), `:38` (UI), `:42` (testing), `:56` (commit format) are intact verbatim.

---

## T3 — `agents/code-reviewer.md`: read code-phase guardrails, three-way split, decouple behavior verification, template wording

**Goal.** Same three-bucket transformation as T2, applied to the reviewer's read step, run-the-gates step, blocker guideline, behavior-verification step, and the review-template comment.

**Files.** `agents/code-reviewer.md`.

**Traces to.** Spec req 18, 19, 20, 21, 22, 23; AC 7, 8, 9, 10. Design D2 (all three buckets).

**Changes** (pre-edit line anchors):

1. **Bucket 1 — read code-phase guardrails (`:18`, `:32`, `:68`).**
   - `:18` step 1.5 "Read the host project's verification convention." → read **the guardrails applicable to the code phase**.
   - `:32` step-2 check "No regressions / verification gates pass — run the host project's verification convention exactly as documented; record each gate's command and result." → run **the guardrails applicable to the code phase** exactly as each command is written, recording each command and its result in the Checks table. Runs every applicable guardrail, mandatory, no bypass.
   - `:68` review-template comment "Evidence as required by the host project's verification convention." → reword to the evidence wording for behavior verification that stands alone (see Bucket 3); strip the verification-convention anchor.

2. **Bucket 2 — three-way blocker split (`:98`).** The blocker guideline lists "the verification convention is undefined" among broken-input blockers. Apply the split:
   - Remove "the verification convention is undefined" as a blocker trigger (absent/empty guardrails is **not** a blocker — the reviewer runs none and proceeds; spec req 20).
   - Keep / add the residual run-time blocker: a **declared** code-phase guardrail whose command **cannot execute** (unrunnable) is a blocker the reviewer reports (spec req 21).
   - Keep the other broken-input blockers (`code-plan.md` / `spec.md` / `design-doc.md` missing or unreadable; batch metadata missing) verbatim.
   - State the spine ("did the command execute? vs did the gate pass?") so absent ⇒ proceed, unrunnable ⇒ blocker, runs-but-nonzero ⇒ a rejection finding (work), reads as one model. (A guardrail that runs and exits non-zero is a normal review finding / rejection, not a blocker — consistent with the existing "normal review findings go in a rejection verdict, not a blocker" framing.)

3. **Bucket 3 — decouple behavior verification (`:36`, `:68`).**
   - `:36` step 3 "verify it end-to-end using the host project's verification convention. Capture whichever evidence the convention requires." → the reviewer **exercises the changed user-observable behavior end-to-end itself** and **decides the appropriate evidence**; keep "A verification claim without evidence is not a verification — either produce the evidence or reject the batch." Behavior verification is **not** a guardrail.
   - `:68` template comment loses its "as required by the host project's verification convention" anchor (see Bucket 1).

4. **Leave-alone (do NOT touch) — spec req 23 / AC 10.** Keep verbatim:
   - `:30` inline API-documentation convention.
   - `:31` coding / testing / build conventions check.
   - `:84` commit format.

**Acceptance.**

1. `grep -n "verification convention" agents/code-reviewer.md` returns **nothing**.
2. Step 1 reads "the guardrails applicable to the code phase"; the step-2 "No regressions / verification gates pass" check runs **every** code-phase guardrail exactly as written and records each command + result in the Checks table.
3. The blocker guideline no longer lists "verification convention is undefined" (or "guardrails undefined / missing") as a blocker; a **declared-but-unrunnable** code-phase guardrail **is** a blocker; the other broken-input blockers (plan/spec/design missing, batch metadata missing) are intact.
4. The spine "did the command execute? vs did the gate pass?" (or equivalent) appears.
5. Step 3 behavior verification stands alone (reviewer drives the behavior, decides the evidence), keeps the "no evidence ⇒ reject" rule, and is not a guardrail.
6. The review-template "Behavior verification" comment (`:68`) no longer references a verification convention.
7. Leave-alone references at `:30` (inline API doc), `:31` (coding/testing/build), `:84` (commit format) intact verbatim.

---

## T4 — `agents/doc-writer.md`: read docs-phase guardrails, straggler fix, three-way split, naming-collision discipline

**Goal.** Replace the docs-phase command-gate role with "the guardrails applicable to the docs phase," fix the `:35` straggler, encode the three-way split, and rewrite the "documentation gates" wording to "docs-phase guardrails" — while leaving the distinct **documentation convention** (voice / structure) verbatim.

**Files.** `agents/doc-writer.md`.

**Traces to.** Spec req 18, 19, 20, 21, 23; AC 7, 8, 10. Design D2 (Buckets 1–2 + naming-collision trap; doc-writer has no behavior-verification step).

**Changes** (pre-edit line anchors):

1. **Bucket 1 — read docs-phase guardrails + straggler (`:35`, `:40`).**
   - `:35` step-3 straggler "If the host project's verification convention supports doc tests, exercise them; otherwise trace by hand." → "**If a docs-phase guardrail covers doc tests**, exercise them; otherwise trace by hand."
   - `:40` step-4 "The host project's verification convention may enumerate gates relevant to documentation — link checking, markdown linting, render check, doc tests, spelling. Many projects rely on human review and enumerate none." → reword to **the guardrails applicable to the docs phase**; **keep the enumerated examples** (link-check / markdown-lint / render-check / doc-tests / spelling) now framed as *examples of docs-phase guardrails*; keep "Many projects … enumerate none." The agent runs **every** docs-phase guardrail, mandatory, no bypass, no invented commands (the existing `:42` bullet already says this — re-anchor it to the guardrails wording).

2. **Bucket 2 — three-way blocker split (`:43`, `:44`, `:45`, `:65`).**
   - **Absent / empty docs-phase guardrails ⇒ run none and proceed.** The `:44` bullet ("If the convention enumerates no doc gates, the accuracy verification in step 3 is your only validation, and that is acceptable.") already encodes "none ⇒ proceed" — keep that meaning, reworded to "no docs-phase guardrails ⇒ step-3 accuracy verification is your only validation; proceed." **Remove** the `:45` sentence "If the verification convention itself is missing or unrunnable, that **is** a blocker…" and the "or … the verification convention is missing" clause from the `:65` blocker guideline. No "missing = blocker" path remains (spec req 20).
   - **Declared-but-unrunnable docs-phase guardrail ⇒ blocker** (residual drift guard, spec req 21). Add it where the removed `:45` sentence was, reworded to trigger only on "a declared guardrail's command cannot execute."
   - **Runs-but-exits-nonzero ⇒ work to fix.** Preserve the `:43` "Failing gates are work, not blockers" sentence and the `:65` tail "Failing doc gates are not blockers — they are work to do." — **re-anchor**, do not orphan (review observation 3).
   - State the spine ("did the command execute? vs did the gate pass?").

3. **Naming-collision discipline — leave the documentation convention alone (spec req 23, design "naming-collision trap").** The two "gates" that source from the **verification** convention (`:35` doc tests, `:40` documentation gates) ARE docs-phase guardrails → rewritten above. Do **NOT** touch the distinct **documentation convention** (voice / structure / formatting / cross-linking):
   - `:6` step-1.6 "Read the host project's documentation convention." — **leave verbatim**.
   - `:27` step-2 "Follow the host project's documentation conventions (voice, structure, formatting, cross-linking, examples format)." — **leave verbatim**.
   - `:50` commit format — **leave verbatim**.
   - The wording must keep the two distinct: "documentation **convention**" (voice/structure) stays; "documentation **gates** / doc tests" becomes "docs-phase guardrails."

**Acceptance.**

1. `grep -n "verification convention" agents/doc-writer.md` returns **nothing**.
2. `:35` straggler now reads "if a docs-phase guardrail covers doc tests" (no "verification convention"); step 4 reads "the guardrails applicable to the docs phase" and keeps the link-check / markdown-lint / render-check / doc-tests / spelling examples as examples of docs-phase guardrails.
3. Three-way split present: no docs-phase guardrails ⇒ step-3 accuracy verification is the only validation, proceed (not a blocker, no warning); declared-but-unrunnable docs-phase guardrail ⇒ blocker; runs-but-exits-nonzero ⇒ work to fix. No "missing = blocker" path remains.
4. The "Failing (doc) gates are work, not blockers" idea survives, re-anchored (not orphaned).
5. The spine "did the command execute? vs did the gate pass?" (or equivalent) appears.
6. The **documentation convention** references at `:6` and `:27` and the commit format at `:50` are intact verbatim — the rewrite touched only the gate role, never the voice/structure convention.

---

## T5 — `agents/doc-reviewer.md`: read docs-phase guardrails, naming-collision discipline, three-way split

**Goal.** Same docs-phase transformation as T4, applied to the reviewer's read step, the "Doc gates" check, the "run the gates" guideline, and the blocker guideline — keeping the distinct documentation convention verbatim.

**Files.** `agents/doc-reviewer.md`.

**Traces to.** Spec req 18, 19, 20, 21, 23; AC 7, 8, 10. Design D2 (Buckets 1–2 + naming-collision trap).

**Changes** (pre-edit line anchors):

1. **Bucket 1 — read docs-phase guardrails + "Doc gates" rewrite (`:33`, `:98`).**
   - `:33` step-2 "Doc gates — if the host project's verification convention enumerates documentation gates, run every one exactly as documented and record each in the Checks table. Many projects enumerate none; in that case, the accuracy spot-check in step 3 is the sole gate." → rewrite to **the guardrails applicable to the docs phase**: run every docs-phase guardrail exactly as its command is written, record each in the Checks table; if there are none, the step-3 accuracy spot-check is the sole gate. (This "Doc gates" check sources from the verification convention and IS a docs-phase guardrail — rewrite it.)
   - `:98` guideline "Run the gates if any exist. … If the host project's verification convention enumerates doc gates, a review without their evidence is not a review. If it enumerates none, the accuracy spot-check is your only evidence — produce it." → reword to docs-phase guardrails: run every docs-phase guardrail if any exist; a review without their evidence is not a review; if there are none, the accuracy spot-check is the only evidence.
   - There is no explicit step-1 "read the verification convention" line in doc-reviewer (it reads the **documentation** convention at `:19`, which stays). The reviewer learns the docs-phase guardrails via the loader's phase-selection rule (T1 body) — no new read line is required, but the rewritten `:33` / `:98` must make clear it runs the docs-phase guardrails.

2. **Bucket 2 — three-way blocker split (`:99`).** The blocker guideline lists "the verification convention is undefined" among broken-input blockers. Apply the split:
   - Remove "the verification convention is undefined" as a blocker trigger (absent/empty docs-phase guardrails ⇒ run none and proceed; the accuracy spot-check carries the review — not a blocker; spec req 20).
   - Add the residual run-time blocker: a **declared** docs-phase guardrail whose command **cannot execute** ⇒ blocker (spec req 21).
   - Keep the other broken-input blockers (`doc-plan.md` / `spec.md` / `design-doc.md` / shipped code missing or unreadable; batch metadata missing) verbatim.
   - State the spine ("did the command execute? vs did the gate pass?"). A docs-phase guardrail that runs and exits non-zero is a normal rejection finding (work), consistent with "normal review findings go in a rejection verdict, not a blocker."

3. **Naming-collision discipline — leave the documentation convention alone (spec req 23).** Do **NOT** touch:
   - `:19` step-1.6 "Read the host project's documentation convention." — **leave verbatim**.
   - `:32` step-2 "Convention compliance — host project's documentation conventions (voice, structure, formatting, cross-linking)." — **leave verbatim**.
   - `:85` commit format — **leave verbatim**.

**Acceptance.**

1. `grep -n "verification convention" agents/doc-reviewer.md` returns **nothing**.
2. The `:33` "Doc gates" check is rewritten to run the docs-phase guardrails (record each in the Checks table; none ⇒ accuracy spot-check is the sole gate); the `:98` "run the gates" guideline likewise references docs-phase guardrails.
3. Three-way split present: absent/empty docs-phase guardrails ⇒ proceed with the accuracy spot-check (not a blocker); declared-but-unrunnable docs-phase guardrail ⇒ blocker; runs-but-nonzero ⇒ rejection finding (work). The `:99` blocker guideline no longer lists "verification convention is undefined"; the other broken-input blockers are intact.
4. The spine "did the command execute? vs did the gate pass?" (or equivalent) appears.
5. The **documentation convention** references at `:19` and `:32` and the commit format at `:85` are intact verbatim.

---

## T6 — `setup.md`: optional Guardrails capture step with validate-as-you-capture

**Goal.** Add the optional guardrails-capture step to setup, placed last in Step 2, that explains the backpressure rationale and the kinds of gates, captures (name, exact command, phase(s)), accepts "None," and validates each command **as it is captured** with the three-way write/don't-write/nothing-to-validate outcome split, the main-checkout parity floor, the two edge-case caveats, and the spine.

**Files.** `skills/radical-pipelines/reference/conventions/setup.md`.

**Traces to.** Spec req 11, 12, 13, 14, 15, 16, 17; AC 4, 5, 6. Design D5; review observation 2.

**Changes.**

1. **Placement & heading (D5; review observation 2).** Add a new capture sub-section inside Step 2 "Collect required conventions," placed **last** — after `### Artifact storage (required)` (`setup.md:106-169`). Heading is a **bare `### Guardrails`** — **no `(required)` and no `(optional)` suffix**: in `setup.md` optionality is signalled by the *absence* of `(required)`, never by an explicit `(optional)` tag (review observation 2). This is the only capture step that *executes* commands, so trailing placement keeps the pure-Q&A steps together.

2. **Capture content (spec req 11 / AC 4).** The step must:
   1. Explain **why** guardrails matter — the **backpressure** rationale: objective gates that reject incomplete work so the agent produces concrete evidence (`tests: pass, lint: pass`) instead of "I think it works," and keeps iterating until every deterministic gate passes.
   2. Explain **what kinds** to consider — tests, lint, typecheck, build, format, audit, e2e, project-specific validators.
   3. Capture per gate: a **name**, the **exact literal command**, and the applicable **phase(s)** ∈ {`code`, `docs`} (one or both).
   4. State that **"None" is a complete, valid answer** (an absent/empty guardrails declaration is a valid, complete state — never a blocker, never a warning).
   - Note that a guardrail's command is a **fixed literal string** (no per-run parameters); where a real gate is inherently parameterized (e.g. a per-run base ref), pin it to a concrete default so it stays one exact command.

3. **Timing — validate as each guardrail is captured, BEFORE the Step-4 confirm (D5).** The validation action lives **inside** this capture step and runs **as each command is captured**, so an unrunnable command can be corrected or dropped before the owner reaches Step 4's confirm-before-write (`setup.md:179-186`). Do **NOT** defer validation to Step 4 (that would surface failures after the owner already approved the proposed file content).

4. **Three-way validation outcome (spec req 12–16 / AC 5).** State all three explicitly:
   - **Runs and exits non-zero ⇒ WRITE.** A valid guardrail; the failing result is just today's code state (red tests / mid-development). **The pass bar is "it executed," NOT "exit 0."** This clause is the one most likely to be omitted — it must be explicit.
   - **Errors as unrunnable (127/126-style) ⇒ do NOT write.** Surface the failure to the owner (the error and exit code) and offer to (a) fix / replace the command, (b) drop that guardrail, or (c) — only if the owner explicitly insists the command is correct and the validation environment is the discrepancy — keep it as an escape hatch. **Default: do not write an unvalidated command.** Never silently persist a known-unrunnable gate; never "write anyway but warn."
   - **Zero captured ⇒ nothing to validate**, a valid complete state; no failure is manufactured from emptiness.
   - Validation is **per-command and independent** — one unrunnable command does not void or block writing the others and does not abort the wider conventions capture (drop or correct it and finish).
   - Exit codes are the **primary signal but a heuristic, not a proof**: a wrapper can exit 127 for internal reasons; some tools print "not found"-style errors while exiting 0. For ambiguous cases the orchestrator **confirms with the owner whether the command actually executed**. The requirement is "confirm it executed," NOT "the exit code must be a specific number."

5. **Parity floor (spec req 17 / AC 6 — binding wording).** Setup runs **before any pipeline worktree exists** (`setup.md:3` — it runs in the main checkout; the worktree is created later). Word the floor **verbatim per spec req 17**: validate "in a context matching the agents' execution environment **as closely as the orchestrator can reach** — at minimum the **project's standard shell and working directory** [the main checkout]." This is **NOT** "the worktree working directory" (no worktree exists yet). Acknowledge perfect parity (env vars, secrets, network) is impossible — an explicit goal with a stated floor, not an absolute. Note this still catches the realistic failure modes (command-not-found, tool-not-installed, bad invocation / wrong-shell quoting).

6. **Two edge-case caveats (D5).**
   - **Hang / no-return ⇒ fold into the don't-write-and-surface branch.** A command that never returns yields no exit code, so the three-way split (which assumes a terminal exit) has no branch for it. One line: _"if a validation command does not return promptly, treat it as not-validated, stop it, and surface it to the owner — a guardrail must terminate on its own; a never-returning command isn't a deterministic gate."_ Do **NOT** mandate a timeout number (`timeout` is not even present on the macOS shell here). Interactive-prompt commands are absorbed by this same note.
   - **State-mutating command ⇒ confirm before running.** This step *executes* the captured command, so a gate that writes / deploys / destroys would take effect against the owner's checkout just to validate it. One caveat: _"validation runs the command, so a gate that writes, deploys, or destroys will take effect — confirm with the owner before running such a command (or accept their word it is correct: the escape hatch above)."_

7. **Spine (spec req 21 / complementarity).** State the shared spine — **"did the command execute?" vs "did the gate pass?"** — in `setup.md` too, so setup-time validation (authoring-time gate) and the agent-side run-time residual blocker (drift guard) read as one model across the two files.

8. **Do NOT touch** Steps 1, 3, 4, 5, 6, 7, the other Step-2 capture sub-sections, or the `### Artifact storage` content. The only addition is the new `### Guardrails` sub-section at the end of Step 2.

**Acceptance.**

1. A new `### Guardrails` sub-section exists in Step 2, placed **after** `### Artifact storage (required)`, with a **bare heading** (no `(required)`, no `(optional)` suffix).
2. The step explains the **backpressure why** and lists the **kinds** (tests, lint, typecheck, build, format, audit, e2e, project-specific validators), captures **(name, exact command, phase(s) ∈ {code, docs})** per gate, and states **"None" is complete and valid**.
3. Validation is documented to run **as each command is captured**, **before** the Step-4 confirm (not deferred to Step 4).
4. The three-way outcome split is all present and explicit: runs-but-nonzero ⇒ **WRITE** (pass bar is "executed," not "exit 0"); unrunnable 127/126-style ⇒ **do NOT write** + surface (error + exit code) + fix/drop/insist-escape-hatch, default don't-write, never "write anyway but warn"; zero captured ⇒ nothing to validate (valid complete state). Per-command independence and the exit-code-as-heuristic / owner-arbitrates-ambiguous clause are stated.
5. The parity floor is worded as the **main-checkout standard shell and working directory** (verbatim per spec req 17), acknowledging setup runs before any worktree exists and that perfect parity is impossible — **not** "the worktree working directory."
6. Both edge-case caveats are present: hang/no-return folded into don't-write+surface (no mandated timeout number); state-mutating command confirmed-before-running.
7. The spine "did the command execute? vs did the gate pass?" appears in `setup.md`.
8. Steps 1, 3–7 and the other Step-2 sub-sections are unchanged.

---

## T7 — `.rp.md` dogfood `### Guardrails` subsection + `minor` changeset

**Goal.** Declare this repository's three real code-phase gates as the worked `### Guardrails` example in `.rp.md`, and add the `minor` changeset the agents/skills edits require.

**Files.** `.rp.md`, a new `.changeset/<name>.md`.

**Traces to.** Spec req 3, 4, 10, 25, 27; AC 3, 12, 14. Design D3, D4.

**Changes.**

1. **`.rp.md` `### Guardrails` subsection (D3, spec req 3/4/10/25 / AC 3, 12).** Add a `### Guardrails` subsection under `## Shared conventions` (`.rp.md:5`), alongside `### Commit format` / `### Agent models` / `### Health monitoring` (tool-agnostic). **File title `# Radical Pipelines project conventions` unchanged; NO `## Guardrails` sibling section; NO "configuration" retitle** (spec OOS 1). Declare the three real code-phase gates, each with **name + exact literal command + phase**:

   | Name | Command | Phase |
   | ---- | ------- | ----- |
   | Test suite | `npm test` | code |
   | Changeset shape | `node scripts/validate-changesets.mjs` | code |
   | Changeset presence | `npx changeset status --since=origin/trunk` | code |

   - **Shape (spec OOS 4 — no schema/parser).** Author as **prose the agents read**, matching the surrounding `###` subsections. A small `Name | Command | Phase` Markdown table mirroring the `### Agent models` table (`.rp.md:75-92`) reads cleanly and is **recommended**; a bullet list is also acceptable if it matches the surrounding density. Either is "prose the agents read."
   - These are the repo's **actual CI gates** (`.github/workflows/changeset-gate.yml`), drawn from what the project really runs — **invent no new gate tooling**. The `--since=origin/trunk` pin makes the third a fixed exact command (CI varies the base per run; spec req 3).
   - **One-line Node ≥21 note (D3, spec req 25).** Add a single line next to the gates: `npm test` validates clean on **Node ≥21** (CI uses Node 22) because the `test` script's quoted `**` glob relies on `node --test` built-in glob support added in Node 21; on a stale local Node 20 the same command errors as unrunnable — the environment-parity lesson the validation requirement teaches. **Do NOT fix the `npm test` glob wart** (spec OOS 2).

2. **`minor` changeset (D4, spec req 27 / AC 14).** Add one new `.changeset/<name>.md` following the `.changeset/pipeline-reviews.md` template exactly: `---`-delimited frontmatter with the single line `"@automattic/radical-pipelines": minor`, then a one-paragraph feature summary describing the Guardrails convention.
   - `minor` is correct: pre-1.0 (`0.2.0`), backwards-compatible new feature; `validate-changesets.mjs` forbids `major` pre-1.0. The change edits release-relevant `agents/**` and `skills/**`, so the changeset is required regardless (`.rp.md` and `.pipelines/**` are not release-relevant).
   - **The changeset is authored, NOT declared as a guardrail.** `npx changeset status` and `node scripts/validate-changesets.mjs` are guardrails that *check* the changeset; the changeset is the thing checked — no circularity. Do **not** add the changeset to `.rp.md`'s `### Guardrails`.

**Acceptance.**

1. `.rp.md` has a `### Guardrails` subsection under `## Shared conventions` declaring the three gates (`npm test`, `node scripts/validate-changesets.mjs`, `npx changeset status --since=origin/trunk`), each with name + exact command + phase `code`, authored as prose the agents read (table or bullets).
2. The `.rp.md` file title is unchanged, there is **no** `## Guardrails` sibling section, and there is **no** "configuration" retitle (`grep -n "^# " .rp.md` shows only the original title; `grep -n "^## Guardrails" .rp.md` returns nothing).
3. A one-line Node ≥21 note accompanies `npm test`; the `npm test` script itself is **not** modified anywhere in the repo.
4. A new `.changeset/<name>.md` exists with `"@automattic/radical-pipelines": minor` frontmatter and a one-paragraph summary; it follows the `pipeline-reviews.md` template shape.
5. The changeset is **not** declared as a guardrail in `.rp.md`.
6. **Dogfood gates validate** on a **Node ≥21** environment: `npm test`, `node scripts/validate-changesets.mjs`, and `npx changeset status --since=origin/trunk` each resolve-and-execute (exit 0 on the green tree; the change adds no failing tests). `node scripts/validate-changesets.mjs` and `npx changeset status --since=origin/trunk` accept the new changeset.

---

## Cross-cutting acceptance (whole-change gates)

These confirm the change as a whole and map to the spec's acceptance criteria; the reviewer checks them after all tasks land.

1. **Grep-negative (spec AC 10 / req 23).** `grep -rn "verification convention" agents/` returns **nothing** (all four agents clean). The leave-alone convention references are intact: inline API-documentation (code-writer `:29`, code-reviewer `:30`), testing (code-writer `:42`), UI (code-writer `:38`), coding/build (code-reviewer `:31`), commit format (all four), and the **documentation convention** (doc-writer `:6`/`:27`, doc-reviewer `:19`/`:32`). The doc "gates" are rewritten to "docs-phase guardrails."
2. **End-to-end optionality (spec AC 13 / req 26; design §6).** A project (or phase) with **zero applicable guardrails** flows cleanly with **no blocker and no warning anywhere**: setup's capture accepts "None"; the loader's required-completeness check passes (the `No` row is invisible to `## Missing conventions`); all four agents run none and proceed. A reviewer walkthrough of all three stages shows no blocker and no warning.
3. **Out-of-scope respected (spec AC 15 / OOS 1–9).** No "configuration" rename/retitle/sibling section; no `npm test` script fix; no phase-reference-doc edits (`reference/autonomous-phases/`, `reference/assisted-phases/`); no per-tool guardrail variants; no parser/validator/schema for the guardrails section; no new local-overrides mechanism or warn-on-override text; no README / website prose; no back-fill into other `.rp.md` files; no change to phase-dispatch orchestration.
4. **Dogfood gates green (spec AC 12 / req 25).** On Node ≥21, the three declared guardrails resolve-and-execute and pass against the changed tree.
5. **Changeset present and not a guardrail (spec AC 14 / req 27).** One `minor` changeset; not declared in `.rp.md`'s `### Guardrails`.
