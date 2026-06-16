# Design Doc Review 1 — REJECTED

Design doc: `2-design-doc/design-doc.md`
Spec: `1-spec/spec.md`
Research: `2-design-doc/design-doc-research.md`

## Verdict

Rejected. The design's target end-state is sound and satisfies the spec's requirements, but its **§3 "Grounded file state (verified against the live tree)"** is materially false for two of the six in-scope files — `code-writer.md` and `code-reviewer.md`. Because design decisions D3 and D4 are written against that false grounding, their edit instructions point at source text that does not exist and mischaracterize the text that does. A code-writer executing D3/D4 literally against the real files would find no matching "from" strings and would miss the `leveled writer/reviewer or unscoped` vocabulary that actually has to be replaced. The grounding must be corrected and D3/D4 re-anchored before the plan phase builds on this.

This was verified against the live worktree (branch `worktree-121-role-scoped-guardrails`, `git diff --stat trunk...HEAD`, and `git show HEAD:<file>`), the same baseline the design claims.

## Blocking findings

### B1 — §3.3 misstates `code-writer.md`: it is already level-keyed, not phase-keyed

§3.3 states: _"step 5 'Run the **code-phase guardrails**' (`:44-55`) … The file's selection is keyed to **phase** ('code-phase'), never to level — the base run narrowed the *reviewer*, leaving the writer phrased by phase."_

The live file contradicts every load-bearing clause:

- `code-writer.md:13` is `Read the code-phase guardrails **leveled `writer` or unscoped** — the gates you must run before completing.` The design quotes it as `"the code-tagged guardrails you must run before completing"` — a phrase that does not occur in the file, and it omits the `leveled `writer` or unscoped` qualifier entirely.
- `code-writer.md:44` is already titled `### 5. Run the **writer guardrail selection**`, not "Run the code-phase guardrails." Step 5's body uses "writer guardrail selection" at `:46`, `:48`, `:52`.
- `:53` and `:73` already speak of "the writer's selection" / "a gate of your selection."

`git diff --stat trunk...HEAD` shows `agents/code-writer.md | 20 ++++` — the base run **did** restructure code-writer to the writer-level vocabulary. The claim that the base "left the writer phrased by phase" is false.

Consequence for **D3**: D3 instructs (a) retitling step 5 to "Run the writer guardrail selection" — but it already carries that title, so there is nothing to retitle; and (b) re-keying "from 'code-phase' to 'the gates that name `code-writer` or name no agents'" — but the actual text to replace is `code-phase guardrails leveled `writer` or unscoped`, which D3 never quotes. D3's "from" anchors do not match the file. Fix: re-ground §3.3 to the real text and rewrite D3 so its replacement targets the `code-phase guardrails leveled `writer` or unscoped` phrasing at `:13` (and the writer-selection phrasing already in step 5), making clear the step title is unchanged and only the selection-defining clause re-keys to agent name.

### B2 — §3.4 misstates `code-reviewer.md`: it is already restructured to a dedicated step 4, not a step-2 bullet

§3.4 and its "Note" state: _"step 2 still carries a guardrail bullet (`:32`, 'No regressions / verification gates pass — run every guardrail …')"_ and _"the worktree `code-reviewer.md` **still places the guardrail run inside the step-2 checklist bullet (`:32`)** rather than in its own numbered step … the realized file keeps it as a checklist bullet."_

The live file contradicts this:

- `code-reviewer.md:32` is `- **Convention compliance** — host project's coding, testing, build, and commit conventions.` There is **no** guardrail bullet in step 2; the "No regressions / verification gates pass" bullet the design quotes does not exist anywhere in the file.
- The guardrail run is a **dedicated numbered step**: `code-reviewer.md:37` `### 4. Run the reviewer guardrail selection`, with the bridge ¶ (`:39`), run ¶ (`:41`), fail-fast/skipped ¶ (`:43`), and approval/stateless ¶ (`:45`) all present.
- `:18` is `Read the code-phase guardrails **leveled `reviewer` or unscoped** — the gates you must run during review.` (the design quotes it as "Read the guardrails applicable to the code phase — the code-tagged guardrails …", which is not the file's text).
- The Checks comment block + table are at `:71-77` (not `:60-64`), and the Guidelines guardrail bullet is at `:110`, the two-question outcome model at `:111-114`, the blocker bullet at `:115` (not `:97` / `:98-101`).

`git diff --stat trunk...HEAD` shows `agents/code-reviewer.md | 37 +++++` — the base run fully restructured code-reviewer into the level-keyed, dedicated-step, fail-fast/skipped/approval/stateless shape. The §3.4 "Note" hedging that "the realized file and the R7 target structure diverge" is built on a false reading; they do not diverge — the realized code-reviewer **already matches** the R7 target structure, which is exactly why it is a clean template for the doc-reviewer.

Consequence for **D4**: D4's end-state conclusion ("the base run already gave this file the reviewer structure … fail-fast, skipped, approving-iteration, pass/fail/skipped vocab") is correct for the real file, but its line anchors are all wrong (`:32`, `:97-102`) and it instructs re-keying "every 'guardrail applicable to the code phase' / 'code-phase guardrails' occurrence" without ever quoting the actual `leveled `reviewer` or unscoped` text that must be dropped. Fix: re-ground §3.4 to the real structure (step 4 at `:37-45`, Checks at `:71-77`, Guidelines at `:110-115`), delete the fabricated "Note" about a step-2 bullet, and rewrite D4's re-key anchors to target the `code-phase guardrails leveled `reviewer` or unscoped` phrasing at `:18`, `:41`, and `:110`.

### B3 — §3.4 is the declared doc-reviewer template; the false reading undermines D5's premise

§2 row 6 and D5 state the doc-reviewer is "templated on the base run's `code-reviewer.md`." §3.6 (doc-reviewer, accurately grounded as pre-base) is fine, and the D5 6-step target structure is itself correct and matches the *real* code-reviewer. But D5 inherits the §3.4 mischaracterization: the doc-reviewer restructure is framed as promoting guardrails "out of the mid-review bullet into their own step" mirroring "what the base run did to `code-reviewer.md`" — yet §3.4 wrongly claims code-reviewer never got a dedicated step. The D5 target is right; the framing that justifies it via §3.4 is broken. Correct §3.4 (B2) and confirm D5's "mirror the realized code-reviewer step 4" instruction points at the real `:37-45` four-¶ step (which it should, since the doc-reviewer step-4 four-¶ shape in D5 already matches the real code-reviewer step 4).

## Non-blocking observations (fix while addressing the above)

- **N1 — `.rp.md` omitted from the base-run touch list.** §3 (intro) and §3.4 say the base run "touched four non-`.pipelines` files … plus the changeset." The live `git diff --stat trunk...HEAD` also shows `.rp.md | 16 +++++-----`. `.rp.md` is out of the six in-scope files (and the design correctly leaves it untouched per §6 and Out-of-Scope #2), so this does not change any decision — but the "four files plus the changeset" tally is inaccurate and should be corrected to keep §3 trustworthy.
- **N2 — `code-reviewer.md:39` bridge ¶ names "behavior verification".** The real `:39` reads "after the step-2 review checks and the step-3 **behavior verification**." D5's bridge-¶ instruction for doc-reviewer correctly substitutes "step-3 accuracy spot-check" and flags this as "the one doc-specific deviation." This is consistent with the real file — no change needed, just confirming D5's deviation note survives the §3.4 correction.

## What is correct (so the rework stays scoped)

- The model in §4 (single agents dimension, explicit four-agent enumeration, name-membership selection, absent-means-all, inert forward declaration, two archetypes with the commits-vs-reviews mapping, fail-fast/approval halves, the bare-gate-leak + setup mitigation) fully and correctly encodes spec R1–R8 and AC1–AC6.
- **D1** (load.md ¶1–¶4 reshape, including the ¶4 archetype home, the ¶1/¶2 scope distinction, the loader-table row de-phasing, and the committed-only line left untouched) is accurately grounded against the real `load.md` (verified: `:22`, `:26`, `:28`, `:30`, `:46` all match) and satisfies AC1–AC6. The altitude-rise justification is sound.
- **D2** (setup.md 4→3 capture bullets, the surfaced default, the re-anchored criterion, the `Name | Command | Agents` three-row table, the untouched validation block / "None is valid" line / illustrative framing) is accurately grounded against the real `setup.md` (verified: `:181-184`, `:188-192`, `:194`, `:196-213` all match) and satisfies AC11.
- **§3.5 (doc-writer)** is accurately grounded — doc-writer genuinely is pre-base/phase-keyed (`:38` "Run the docs-phase guardrails", `:40` "tagged for documentation", `:45` empty-selection, `:67` blocker), so D5's doc-writer re-key ("from 'the docs-phase guardrails' to agent name") has correct "from" anchors.
- **§3.6 (doc-reviewer)** is accurately grounded (5-step, `:33` guardrail bullet, `:63` Checks, `:67-69` Accuracy spot-check, `:98`/`:99` Guidelines), and the D5 doc-reviewer 6-step target, four-¶ step 4, cloned Checks comment block, and three-bullet Guidelines reconciliation are correct and satisfy AC9/AC10.
- §6 confinement, §7 AC mapping, §8 out-of-scope, and §9 deliverable map are otherwise consistent with the six-file scope (AC13) and the docs-phase changeset obligation (AC12) — subject to the §3.3/§3.4/D3/D4 corrections above flowing into §9's per-file deliverables for code-writer and code-reviewer.

## Required for approval

1. Rewrite **§3.3** to the real `code-writer.md` state: it is already level-keyed (`:13` "code-phase guardrails leveled `writer` or unscoped"; step 5 already titled "Run the writer guardrail selection"). Remove the false "keyed to phase, never to level" claim.
2. Rewrite **§3.4** to the real `code-reviewer.md` state: dedicated step 4 "Run the reviewer guardrail selection" (`:37-45`) with all four ¶, Checks at `:71-77`, Guidelines at `:110-115`, read item at `:18` ("leveled `reviewer` or unscoped"). Delete the fabricated step-2-bullet "Note."
3. Re-anchor **D3** and **D4** (and their §9 deliverable entries) so the re-key "from" targets the actual `leveled `writer`/`reviewer` or unscoped` phrasing, not a non-existent "code-phase" / "code-tagged" phrasing, and so D3 does not instruct retitling a step that already has its title.
4. Confirm **D5**'s "mirror the realized code-reviewer" framing rests on the corrected §3.4 (the real file already has the dedicated step-4 shape D5 mirrors).
5. Optionally fix **N1** (add `.rp.md` to the base-run touch tally) for §3 accuracy.
