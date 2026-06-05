# Design-doc research — Recommend standard remote names when setting up artifacts-in-fork mode

This is the running record of the design phase. The deliverable is an instruction/document change to a single shipped reference file: `skills/radical-pipelines/reference/conventions/setup.md`, the `artifacts-in-fork` branch of the **Artifact storage (required)** convention. The "design" is therefore a set of structure-and-content decisions for that document, each tracing to a spec requirement (R1–R9) or acceptance criterion (AC1–AC9) and the edge cases (E1–E7).

Authoritative input: `1-spec/spec.md`. Supporting evidence: `1-spec/spec-research.md`, `1-spec/spec-review-approved.md`, `0-prompt/prompt.md`.

## How to read this document

- **Topics** are the design decisions to make. Each topic states the spec requirement(s)/AC(s) it traces to, the options considered, the decision, and the rationale.
- **Open questions** and **risks** are tracked at the bottom and resolved before the design is declared complete.
- Research requests sent to `design-doc-researcher` and their answers are recorded inline under the relevant topic.

## Spec-requirement → design-topic traceability matrix

| Spec item | Design topic |
| --- | --- |
| R1 / AC1 — recommend standard scheme | T2 (decision flow), T3 (wording) |
| R2 / AC2 — decline-able recommendation, example wording | T3 (wording contract) |
| R3 / AC3 — never rename silently, explicit approval | T2 (decision flow), T3 (wording) |
| R4 / AC4 — record resolved names, keyed by role | T5 (Capture block), T6 (worked example) |
| R5 / AC4 — `name` field authoritative downstream | T5 (Capture block), T7 (downstream authority) |
| R6 / AC5 — auto-detection + owner-confirmation floor | T2 (decision flow), T4 (auto-detect sub-design) |
| R7 / AC6 — safe rename ordering | T2 (decision flow), T8 (rename ordering) |
| R8 / AC7 — no-op case | T2 (decision flow), T8 (rename ordering) |
| R9 / AC8 — supersede soft hint, retain confirm-the-role | T1 (insertion point), T2 (decision flow) |
| E1 (already-standard no-op) | T2 (step 3), T8 (no-op over roles) |
| E2 (inverted State-B swap) | T8 (literal swap order), T2 |
| E3 (both non-standard) | T8 (general free-target-first, order-free) |
| E4 (owner declines) | T3 (decline bridge), T5 (record existing names) |
| E5 (no fork / create-fork path) | T1 (shared fall-through catches manual-add State-B) |
| E6 (auto-detection cannot conclude) | T4 (general fallback rule + six examples), T2 |
| E7 (benign refspec warning) | T9 (reactive caveat on comprehensiveness note) |
| AC9 — scope containment | T10 (scope guardrails) |

## Design topics

### T1 — Insertion point: where the recommend-and-rename flow attaches in the document

Status: DONE.
Traces to: R1, R9, AC1, AC8; spec-review non-blocking note (1) — both role-identification paths must converge before the recommend step.

**Problem.** R1 attaches the recommendation "after identifying which configured remote plays which role." The current "Identify the remotes" block has TWO paths: the 2-remote path (current line 129) and the create-fork path (current lines 130-134). The spec-review's non-blocking note (1) requires the recommend step to run after role identification in BOTH paths, so a manually-added fork that lands inverted (State B) is also caught, not just the 2-remote case.

**Key structural finding (from initial read).** The two paths do NOT currently share a single convergence line. The 2-remote path (129) ends with the inline soft hint "but do not assume — always confirm." The create-fork path ends at 134 "re-run `git remote -v` and confirm the assignment." These are separate. So a naive edit that only touches line 129 would miss the create-fork→manual-add→State-B case.

**Options.**
- Option A — Inline the recommend step into each path separately. Rejected: duplicates the flow, two places to keep consistent, and the create-fork path's `gh repo fork` auto-add usually lands State A (no-op) so the duplicated text would mostly be dead there, yet must still exist for the manual-add case.
- Option B — Add ONE shared "Recommend the standard remote names" step AFTER the entire "Identify the remotes" bulleted block (after current line 134, before "Define the upstream PR transformation" at 136), which both paths fall through to once roles are known. The 2-remote path's tail and the create-fork path's tail both end at "roles confirmed," then control reaches the single recommend step. This is the convergence point the spec-review asked for.

**DECISION (T1): Option B.** Insert ONE shared "Recommend the standard remote names" step at the blank-line seam (current line 135), after the entire "Identify the remotes" block (127-134) and before "Define the upstream PR transformation" (136). Both role-identification paths fall through to it once roles are known.

**Researcher verification (received).** Fresh read of `setup.md` confirms:
- The two paths do NOT share a convergence line today. Line 129 is a top-level `- ` bullet (2-remote path) ending inline with "always confirm." Line 134 is indented two spaces — a continuation of the create-fork bullet that begins at 130, belonging ONLY to the create-fork path. They confirm roles at two different places.
- Line 135 is a clean blank-line seam. A new bold-led paragraph inserted there sits at the same structural level as the sibling bold steps ("Identify the remotes." 127, "Define the upstream PR transformation." 136, "Capture:" 148), so it reads as a peer step both paths reach.
- By line 135, both paths have already produced the remote URLs via `git remote -v`, so the trailing step has the inputs auto-detection needs in both branches.
- E5 confirmed: `gh repo fork` lands State A (no-op), but a fork added manually afterward can land State B and must still hit the recommendation — the trailing shared step catches both.

**Consequential sub-decision (ACCEPTED, per researcher's flag): thin line 129's inline hint to a bare role-confirmation.** The soft hint at 129 is the ONLY place in the pipeline logic stating the literal-name convention (spec-research Q2). R9/AC8 require it superseded, not duplicated. Cleanest structure: make role IDENTIFICATION the thing both paths share at the floor level — reduce 129 to "ask the owner to confirm which remote plays which role" (no `origin`/`upstream` literal hint), keep 134 as "confirm the assignment," then have the SINGLE trailing step own (a) auto-detection, (b) the recommendation, (c) the optional rename, (d) recording. This:
- Removes the soft hint at 129 (satisfies AC8 "superseded").
- Preserves "always confirm the role assignment" as the guaranteed floor in BOTH branches (129 inline confirm + 134 confirm) — the floor R9/AC8 demands.
- Puts the recommend-and-rename flow in exactly one place, avoiding split/duplicated logic.

So T1 produces three edits to the produced `setup.md`: (1) thin line 129's hint to a bare role-confirmation; (2) leave 130-134 create-fork path intact (still ends "confirm the assignment"); (3) insert the new "Recommend the standard remote names" step at line 135. The new step's internal design is T2 (flow), T3 (wording), T4 (auto-detect), T8 (rename ordering / no-op).

### T2 — The decision flow (auto-detect → recommend → confirm → optionally rename → capture)

Status: DONE.
Traces to: R1, R2, R3, R6, R7, R8; AC1, AC3, AC5, AC6, AC7; E1–E6.

**DECISION (T2): the single ordered flow inside the new "Recommend the standard remote names" step.** The spine is `roles → (no-op? or rename?)`; gh auto-detection is an optional accelerant feeding the role step, NEVER a gate.

1. **Inputs.** Configured remotes + URLs (from `git remote -v`, already run by both paths).
2. **Establish roles (floor + optional enhancement).** Attempt gh auto-detection (T4 owns mechanics) to PROPOSE which remote is the fork and which is the canonical. If exactly one unambiguous fork↔canonical pairing → present that concrete assignment for the owner to confirm. If detection is ambiguous or fails (E6 / any nonzero gh exit) → fall back to asking the owner cold. EITHER WAY, by the end of this step the roles are known AND owner-confirmed (the guaranteed floor, R9/AC8). gh only upgrades "ask the owner cold" into "here is our detected assignment, confirm or correct."
3. **No-op check, evaluated over RESOLVED ROLES (not raw names).** Is the remote that IS the fork named `origin` AND the remote that IS the canonical named `upstream`? If yes → make NO rename recommendation, just record the names (R8/AC7/E1).
4. **Otherwise recommend the rename(s)** to bring fork→`origin`, canonical→`upstream`, phrased as a decline-able recommendation (T3 owns wording), with explicit owner approval required before any rename (R3/AC3).
5. **Apply or skip.** Approve → apply renames with free-target-first ordering (T8 owns this). Decline → keep existing names.
6. **Record resolved (post-decision) names** in Capture (T5).

**Researcher verification (received), two load-bearing clarifications:**
- **Q-A — the no-op (E1) depends on ROLES, not on names alone.** R8/AC7/E1 all phrase the no-op as "fork = `origin`, canonical = `upstream`" — role=name PAIRS, not a bare name check. A remote literally NAMED `origin` can point at the CANONICAL repo (researcher verified empirically: `git remote add origin <canonical-url>` then `git remote get-url origin` returns the canonical). In that "confusingly-named inverted" case the names look standard but the roles are wrong, and the correct action is a rename recommendation, NOT a no-op. So the no-op predicate must be evaluated against the resolved roles. Ordering: establish roles FIRST (step 2), then check no-op against resolved roles (step 3). The name comparison in step 3 is still a cheap string check — but it runs against the resolved roles, not raw names, so it is correct AND cheap (the always-confirm-the-role floor means roles are pinned regardless, at no extra cost).
- **Q-B — the no-op path does NOT hard-depend on gh.** Auto-detection is purely an enhancement that sharpens the recommendation; owner confirmation is the floor and is sufficient alone. If gh is unavailable, the orchestrator asks the owner; once the owner confirms "the one named `origin` is my fork and the one named `upstream` is the canonical," proposing no rename is correct even though gh never ran. The flow must remain valid with auto-detection entirely removed (spec-research Q3 conclusion; R6/AC5 "falls back to asking … never guesses"; E6 routes failures to the floor).

**Net flow refinements applied (vs. the original draft):** step 2 now makes explicit that auto-detection PROPOSES and the owner CONFIRMS (so roles are known regardless of gh outcome); step 3's no-op is phrased over resolved roles ("the fork-role remote is named `origin` AND the canonical-role remote is named `upstream`"), closing the canonical-named-`origin` trap.

### T3 — The wording contract (decline-able recommendation + example phrasing + approval gate)

Status: DONE.
Traces to: R2, R3; AC2, AC3.

**DECISION (T3): a literal quoted example utterance (modeled on R2) + a hard binding approval-gate rule + a one-line symmetric decline bridge.**

**Example wording (Q-A confirmed): include ONE literal quoted example, modeled on the spec's R2 sentence.** AC2's operative bar is "concrete example wording" — "concrete" + "wording" means an actual example utterance, not an abstract description. A literal quoted sentence is the lower-risk way to satisfy a checker. Reuse the spec's own R2 sentence lightly adapted (don't invent fresh): "By default we recommend naming them this way. Do you want us to rename them, or leave them as they are?" One adaptation: ensure "this way" has a clear referent by naming the concrete scheme right before the quoted line, OR fold the names into the utterance, e.g. "...we recommend naming the fork `origin` and the canonical `upstream`. Do you want us to rename them, or leave them as they are?" Register: keep it ONE illustrative example ("e.g." / "for example, say:"), consistent with the document's illustrative tier (T4) — the binding part is "present as a decline-able recommendation"; the quoted line is the concrete illustration.

**Approval gate (Q-B confirmed): two-part structure, gate stated as a HARD binding rule.** AC3 uses "states … must," so the document must contain an explicit affirmative rule — the decline-able question ALONE does not satisfy AC3 (a question only implies a "no" is possible; it does not assert the constraint). So: (a) the decline-able utterance asks permission (R2/AC2); (b) a hard binding rule gates the rename — the load-bearing half for AC3. Cleanest single rule covering both AC3 clauses ("explicit approval before any rename" + "never silently"): "The orchestrator must never run `git remote rename` without the owner's explicit approval; it never renames on its own initiative." Add a brief because-clause from R3's rationale (the rename mutates the owner's local git config) so the orchestrator understands WHY the gate is non-negotiable — reinforces "never silently" for an LLM that might treat a recommendation as license to act. Placement: the gate is the precondition on T8 step 5 — it sits BETWEEN the recommendation utterance (step 4) and the rename application (step 5); step 5 is reached only on explicit approval.

**Decline branch / E4 (Q-C confirmed): one-line symmetric bridge here; recording mechanics in T5.** E4 spans two responsibilities: the DECISION (on decline, keep the existing names — a step-4/5 outcome, lives HERE) and the RECORDING (write the kept names as resolved names — a Capture concern, lives in T5). State both branches symmetrically here: "If the owner approves, apply the renames [step 5]; if the owner declines, keep the existing remote names." Then T5 owns the recording detail and the authoritative-`name` framing (avoids duplicating the recording instruction in two places). Keep "resolved names" as the shared thread: T3 says "keep the existing names" (decision); T5 says "record the resolved names (post-decision: `origin`/`upstream` if renamed, or the existing names if declined)." T3 does not pre-empt T5's authoritative-`name` wording.

### T4 — Auto-detection sub-design (gh fork/parent detection, fallback floor)

Status: DONE.
Traces to: R6; AC5; E6.

**DECISION (T4): describe auto-detection as a BEHAVIOR, with the gh command illustrative and the decision rule binding.**

**Altitude (Q-A confirmed).** The document's command register is two-tier: illustrative ("e.g."/"Suggested default:") when the command is a MEANS, and bare/literal only when the command IS the action. The closest analog is line 132 (`e.g. via gh repo fork`) — the binding instruction is the behavior; `gh repo fork` is an example. `git remote -v` (127, 134) is the only literally-prescribed command (listing the remotes IS the instruction). Auto-detection is a MEANS, so it belongs in the illustrative tier, matching line 132.
- **Illustrative (float as "e.g."/"for example"):** the gh invocation `gh repo view <remote-url> --json isFork,parent`; the note that gh normalizes raw remote URLs itself (no manual URL parsing); the compose detail `parent.owner.login` + "/" + `parent.name` (kept because there is NO `parent.nameWithOwner` flat field — spec-research Q3 — so an implementer who reaches for that exact command isn't tripped).
- **Binding (state as behavior, NOT illustrative) — three load-bearing parts:** (a) detection is per-remote on its URL/repo IDENTITY, not on its name (spec-research.md:89); (b) the fork↔parent pairing must be EXACTLY ONE and unambiguous to act on; (c) anything else → ask the owner; never guess.
- **Resulting prose shape (model, not verbatim):** "For each configured remote, resolve its URL to a repo identity and its fork/parent relationship (for example via `gh repo view <remote-url> --json isFork,parent`; gh normalizes raw remote URLs itself). The fork is the remote that is a fork whose parent is the OTHER configured remote; the canonical is that parent. If exactly one such unambiguous pairing exists, propose it for the owner to confirm; otherwise ask."

**Failure-case enumeration (Q-B confirmed).** AC5's "(at least: …six…)" sets a coverage FLOOR on the examples; it permits general-rule + illustrative-list but does NOT permit dropping any of the six (a representative subset would fail "at least"). Structure:
- **Lead with the binding universal:** "any ambiguity or failure → ask the owner which remote is which; never guess." This catches novel/unlisted cases.
- **Then list all six as "including" examples** (meeting the floor): (1) neither remote is a fork of the other; (2) both remotes point at the same repository; (3) a remote is not on GitHub; (4) gh is offline, unauthenticated, errors, or exits nonzero for ANY reason; (5) the fork's parent is a repository not among the configured remotes; (6) more than two remotes with no single clear pairing.
- **Keep the "any nonzero gh exit" generalization** (R6:55) verbatim in spirit — it is load-bearing (robust to unforeseen gh errors) and doubles as a mini general-rule for the gh-exit family.
- Case-5 phrasing: AC5 says "parent is NOT among the configured remotes"; R6 says "a THIRD repository not among the configured remotes." Same case — either phrasing is faithful.

### T5 — Capture block changes (record resolved names, role-keyed, name authoritative)

Status: DONE.
Traces to: R4, R5; AC4.

**DECISION (T5): the Capture-block edit is ADDITIVE, not a restructure.** The current block (setup.md:150–155) already keys by role (`upstream`, `fork`) with "name and URL" each — which ALREADY satisfies AC4's structural half ("keyed by role … with a `name` + URL per role"). Two additive clarifications are what's missing:
1. **Resolved/post-decision:** clarify the recorded name per role is the RESOLVED (post-decision) name — `origin`/`upstream` if the owner accepted the rename, or the existing names if declined (ties Capture to the recommend-and-rename outcome; closes E4's recording half).
2. **Authoritative `name`:** add the authoritative-`name` framing (R5) — see T7 for where the authority statement lives.

**Wording nicety (optional, recommended):** render the field as an explicit `name` + URL (e.g. "`upstream`: the resolved remote name and its URL") so that R5's phrase "the recorded `name` field" has a concrete visible referent. Minor; either prose form satisfies AC4.

### T6 — Worked example of the captured block (non-blocking research observation)

Status: DONE.
Traces to: R4, R5; AC4; spec-research "open observation".

**DECISION (T6): INCLUDE a minimal worked example, and make it the DECLINED-rename (non-standard resolved names) case, rendered format-light/illustrative.**

**Include (Q-T6-A): YES.** Strongest reason: it resolves the role-vs-literal ambiguity that the T7 authority statement exists to establish — the "recorded `name` is what downstream resolves through" claim is only unmissable if the reader can SEE a case where the role key and the name DIFFER. Also low-cost/additive (lives in the Capture block, the area already being edited) and strengthens AC4. Counter (length / not required) is weak: ~2–4 short lines de-risking an ambiguity the spec-research flagged twice (spec-research.md:72 Q2 bottom-line #4, and :182 open observation).

**Shape (Q-T6-A): DECLINED-rename with NON-STANDARD names** (e.g. role `fork` → name `myfork`, role `upstream` → name `canonical`). This drives the role-vs-literal point HARDEST:
- A renamed-to-standard example (`fork: name=origin`, `upstream: name=upstream`) confusingly ALIGNS the role key and name in the obvious way, so the reader can't tell whether the stored value is the role or the literal name — the ambiguity stays alive, looks like redundant restating of the role.
- A declined/non-standard example makes role key and resolved name VISIBLY DIFFERENT: the KEY is the role (`fork`/`upstream`), the `name` is the literal remote, and they are distinct. This is the clearest way to show "the recorded name is authoritative and may not equal the role word." It also doubles as the concrete instantiation of E4 (owner declined → existing names recorded), reinforcing T3's decline branch.
- Use ONE example (the declined/non-standard one) — it carries the full lesson; a second standard example adds length without clarity. If gesturing at the standard case is wanted, a cheap parenthetical ("had the owner accepted, these would read `origin`/`upstream`") suffices.

**Register (Q-T6-B): FORMAT-LIGHT / illustrative, matching the Capture prose register.** The current Capture block is a PROSE bullet list, deliberately format-agnostic; the whole document is prose conventions, not a data schema; and `.rp.md` is described as "human-readable Markdown" (setup.md:174–176), NOT a structured data file. A YAML/JSON-looking block would introduce a new mandated-format register that conflicts with how `.rp.md` is described. Render the example as illustrative prose consistent with the existing bullet style (e.g. "a fork-mode capture might record the `fork` role with name `myfork` and URL …, and the `upstream` role with name `canonical` and URL …"). If a tiny structured snippet is used for scannability, prefix it explicitly as illustrative ("e.g., a sketch, not a required format:"). Consistent with the T4 illustrative tier.

### T7 — Downstream authority statement (name field is source of truth, explicit-by-remote pushes)

Status: DONE.
Traces to: R5; AC4.

**DECISION (T7): one additive authority statement, anchored at the Capture block, with two coupled clauses; NO edit to :121 or .rp.md.**

**Placement (Q-B.1):** state the authority ONCE, in/adjacent to the Capture block (where the `name` is DEFINED) — not duplicated in the recommend step, not copied next to :121. Name the two downstream consumers as the NOTABLE examples (general-rule + examples, mirroring T4): "downstream operations resolve the role to the recorded `name`," with the two named instances being (a) the clean-branch push to the upstream remote (setup.md:121) and (b) the run-close-out push of the pipeline branch to the fork remote. "notably" → phrase them as examples, not an exhaustive list.

**Explicit-by-remote rule (Q-B.2): YES, state it as the second coupled clause.** The authority statement has two clauses: (a) the recorded `name` is authoritative and downstream resolves through it (two consumers named); (b) fork-mode pushes are always explicit-by-remote (`git push <remote> <branch>`), never relying on a default remote. Clause (b) is WHY (a) matters operationally — you resolve role → recorded name, then push to that name explicitly. Grounded by spec-research Q4 (explicit `git push <remote> <branch>` routes by the named remote regardless of label; bare push falls back to tracking/`origin`).

**Scope (Q-C): the statement is purely ADDITIVE; do NOT edit :121, do NOT edit .rp.md.** Key fidelity insight: R5 explicitly says "Downstream prose continues to refer to remotes by ROLE … resolving the role to the recorded name." So :121's role-based "Pushes the clean branch directly to `upstream`" must STAY as-is — editing it to hardcode a name would CONTRADICT R5. Leaving :121 untouched is REQUIRED, not just permissible. O1 puts downstream literal-parameterizing out of scope; AC9 forbids editing any file other than setup.md (so .rp.md is out). Referencing a consumer is a reference, not an edit. The change stays contained to the new recommend step + the Capture block.

**Generic-consumer phrasing (researcher fidelity note):** setup.md is a SHIPPED reference describing general fork-mode behavior. The fork-push consumer lives in the owner's `.rp.md` (and in THIS repo, .rp.md is artifacts-in-repo with no fork-mode block). So the authority statement must describe the fork-push consumer GENERICALLY ("the run-close-out push of the pipeline branch to the fork remote"), NOT by cross-referencing a `.rp.md` path — keeps it self-contained in the shipped doc and reinforces AC9 containment.

### T8 — Rename ordering and no-op detection (free-target-first, two-rename swap, already-standard)

Status: DONE.
Traces to: R7, R8; AC6, AC7; E1, E2, E3.

**DECISION (T8): one general free-target-first rule + the State-B swap as the literal worked instance + the collision-error note + the no-op over resolved roles + the comprehensiveness reassurance.**

**Rename ordering (flow step 5) — AC6 (Q-A confirmed).** AC6 is a Given-When-Then scoped to State B; its "Then" demands TWO concrete artifacts in the produced setup.md, both required:
- The literal two-rename sequence for the swap, IN ORDER: rename canonical `origin` → `upstream` FIRST (to free `origin`), THEN rename the fork → `origin`. A bare general rule alone does NOT satisfy AC6.
- The collision-error note: `git remote rename` errors (exit status 3) if the target name already exists, and makes no change on failure.
Structure: state the GENERAL rule ("before any rename whose target name is currently taken, free that name first"), give the State-B swap as the literal worked instance, and include the collision-error note. Researcher re-verified the State-B mechanics fresh (git 2.50.1): wrong order (`fork`→`origin` first) → `error: remote origin already exists.`, exit 3, state unchanged; right order → exit 0, ends `origin`/`upstream`. Matches spec-research Q1 part 2.

**E3 (both non-standard) — same rule, no special case (Q-B confirmed empirically).** When both remotes carry other names (`mine`/`theirs`), the target names `origin` and `upstream` are BOTH free, so the two renames are independent and order is irrelevant. The general "free any taken target name first" rule degenerates to "no special ordering needed." Researcher verified both rename orders from `mine`/`theirs` exit 0 and end `origin`/`upstream`. **Unifying statement for the prose:** ordering matters ONLY when a target name is currently occupied by the WRONG remote (the State-B swap, E2); when neither target is taken (E3) or only one remote is misnamed and its target is free, the renames are independent. One rule covers E2, E3, and single-rename sub-cases uniformly — no per-edge-state prose needed.

**No-op (flow step 3) — E1/R8/AC7 (Q-C.1 confirmed).** Complete behavior: when the fork-ROLE remote is already named `origin` AND the canonical-ROLE remote is already named `upstream` (evaluated over the resolved/confirmed roles, not raw names — the T2 conclusion), propose no rename and just record the names. Step 3 references roles, not names, which keeps the canonical-named-`origin` trap routing to a rename. Nothing more needed.

**Comprehensiveness reassurance — R7's MAY (Q-C.2: INCLUDE).** Include a brief, accurate note: "`git remote rename` is comprehensive — it migrates the remote-tracking refs, the `branch.<name>.remote` tracking config, and the entire `remote.<old>.*` config section — so fetch/push/pull keep working with no further action." Rationale: reassures the orchestrator a rename is complete, so it does NOT invent unnecessary follow-up steps (re-setting upstreams, re-adding remotes, re-pushing) — a real risk-reduction for an LLM orchestrator. Low-cost, accurate (spec-research Q1 part 1, empirically verified). **Accuracy precision:** claim only `branch.<name>.remote` migrates; do NOT claim `branch.<name>.merge` changes — it correctly STAYS unchanged (holds `refs/heads/main`, remote-agnostic; spec-research.md:33). The one-sentence form above is already correct.

**Placement coupling with T9 (flagged by researcher).** Keep the comprehensiveness sentence in step 5 (rename application) and let T9 attach the E7 caveat as the ONE documented exception to it ("comprehensive, with one rare benign exception"), rather than splitting the reassurance from its exception. T9 owns the E7 wording.

### T9 — E7 surfacing decision (benign non-default-refspec warning)

Status: DONE.
Traces to: E7; spec-review non-blocking note (2).

**DECISION (T9): surface E7 as a brief, reactive benign-exception caveat attached to the comprehensiveness note in step 5.**

**Altitude/placement (Q-A confirmed).** E7 has no dedicated AC (the ACs are AC1–AC9; none reference the refspec case; E7 lives only in the "must account for" edge-case list at spec.md:145). So the bar is "the document accounts for it," not a checkable Given-When-Then. A single benign-exception clause meets that bar; a dedicated bullet/sub-procedure/pre-check would be disproportionate to a rare-and-benign case. Home it on the comprehensiveness sentence (T8) because E7 IS the one exception to "everything migrates" — exception next to the rule it qualifies.

**Model wording (not verbatim):** "(The one exception: a non-default, hand-edited fetch refspec pointing outside `refs/remotes/<old>/*` is not rewritten — git prints a warning and exits 0, leaving that refspec as-is. Rare and benign; do not treat the warning as an error or block on it.)"

**Mechanics accuracy (Q-B re-verified fresh, git 2.50.1):** exit code = 0 (NOT nonzero); it is a WARNING (`warning: Not updating non-default fetch refspec ...`), not an error (contrast the collision case's `error:` + exit 3); the non-default refspec is left stale (unchanged) while the default refspec migrates correctly and zero `remote.<old>.*` residue remains. The behavioral instruction rests on solid ground: an orchestrator branching on exit code sees success and proceeds with no special handling — the caveat exists only to pre-empt misreading the stderr warning as a failure.

**Reactive-not-proactive framing (Q-C confirmed).** E7 (spec.md:145, "need not block on it and should not treat the warning as an error") and R7 tail (61) are both REACTIVE — they describe reacting to the warning IF it appears, NOT inspecting refspecs first. The spec imposes NO proactive refspec inspection. Phrase the caveat CONDITIONALLY ("if git prints this warning, it's benign; proceed"), NOT as "non-default refspecs are left stale" (which an LLM could misread as "therefore check for non-default refspecs," inducing a defensive `git config --get-regexp` pre-scan). Because the rename exits 0, the normal success path already handles this correctly with no extra branch — the wording's sole job is to pre-empt a misread, arguing for the lightest possible touch (a reactive parenthetical, no procedure).

### T10 — Scope guardrails (what the edit must NOT touch)

Status: DONE.
Traces to: O1–O5; AC9.

**DECISION (T10): the change is contained to a single file with explicit fences.**

**In scope (the ONLY edits, all within `skills/radical-pipelines/reference/conventions/setup.md`):**
- Thin line 129's soft hint to a bare role-confirmation (T1).
- Insert the new "Recommend the standard remote names" step at the line-135 seam (T1, T2, T3, T4, T8, T9).
- Capture block (148–156): additive clarification (resolved + authoritative name) + the worked example (T5, T6).
- The authority statement adjacent to Capture (T7).

**Out of scope / NOT touched** (verified against AC9 and O1–O5):
- `artifacts-in-repo` mode (O4) — unchanged; records no remotes.
- `.rp.md` (O1/AC9) — not edited (and in this repo it is artifacts-in-repo, no fork-mode block anyway).
- `pi.md`, `pipeline-versioning.md`, agent definitions (O1) — not edited.
- `CONTRIBUTING.md` (O3) — its literal `git push origin` are maintainer release docs, untouched.
- Application code (O1) — not edited (near-empty category here; see precision below).
- Downstream role-based prose like setup.md:121 — left role-based (R5 requires it; editing it would CONTRADICT R5).
- O2 (latent upstream-write-access gap) and O5 (fork-of-a-fork chains) — explicitly NOT addressed; observations only.

**THREE explicit fences to state in the design (each implied but worth pinning so the writer/reviewer can't drift):**
1. **Adjacent fork-mode explanation untouched.** The fork-mode explanation block (setup.md:112–123, incl. the 5-step PR flow and :121 "Pushes the clean branch directly to `upstream`") and "Define the upstream PR transformation" (136–146) must stay as-is. The ONLY interaction with :121 is REFERENCING it from the authority statement (T7), never editing it. This is the nearest collateral-edit risk.
2. **Create-fork sub-path stays behaviorally intact.** Thinning line 129 and adding the trailing recommend step must NOT remove the create-fork branch (130–134) or its public/private + "re-run `git remote -v` and confirm the assignment" steps. The recommend step ADDS a shared fall-through after both paths (T1); it does not replace either. E5 depends on the create-fork branch surviving.
3. **Confirm-the-role guarantee preserved on thinning.** Thinning line 129 must KEEP "always confirm which remote plays which role"; only the literal-name hint ("origin is usually the fork…") is superseded (AC8/R9). Replace the hint, retain the guarantee (now expressed as the auto-detection fallback floor). Easy to over-delete.

**Precision:** there is no fork-mode "application code" in this repo — the orchestrator logic lives in these Markdown references (spec-research Q2: agents have zero remote references; the orchestrator owns all push/PR ops via the reference docs). So "no application code" is trivially satisfied; the real binding fence is "only `setup.md`, no OTHER reference doc or agent file changed" (AC9). Reviewers should focus there, not hunt for nonexistent code.

## Open questions

(none — all design topics resolved with researcher verification.)

## Risks

- **R-1 (low): worked example mistaken for a mandated schema.** Mitigated by T6's format-light/illustrative register decision (prose, prefixed "e.g." if structured). Consistent with setup.md:174–176 "human-readable Markdown."
- **R-2 (low): collateral edit to the adjacent :121 / fork-mode explanation or accidental removal of the create-fork sub-path / confirm-role guarantee.** Mitigated by T10's three explicit fences; the writer must treat these as reference-only.
- **R-3 (low): over-specifying the gh command as a contract.** Mitigated by T4's illustrative-command + binding-behavior altitude (matches the setup.md:132 register; spec-review note 3).
- **R-4 (low): E7 caveat inducing an unnecessary refspec pre-check.** Mitigated by T9's reactive-not-proactive framing (condition on the warning, never a pre-scan).
- **R-5 (very low): no-op false positive via the canonical-named-`origin` trap.** Mitigated by T2's "no-op evaluated over RESOLVED ROLES, not raw names."

## Synthesis guide for the design-doc-writer

The produced `setup.md` change is three coordinated edits inside the `artifacts-in-fork` branch of the **Artifact storage (required)** convention. Blueprint:

**Edit 1 — thin line 129 (T1).** Reduce the 2-remote path's sentence to a bare role-confirmation ("ask the owner to confirm which remote plays which role"). Remove the literal-name soft hint ("`origin` is usually the fork and `upstream` the canonical…"). KEEP the confirm-the-role guarantee (it migrates to the new step's fallback floor). Leave the create-fork sub-path (130–134) behaviorally intact.

**Edit 2 — new "Recommend the standard remote names" step at the line-135 seam (T1, T2, T3, T4, T8, T9).** One shared step both role-identification paths fall through to. Its internal sequence:
1. Inputs: remotes + URLs (already from `git remote -v`).
2. Establish roles (floor + optional enhancement) — gh auto-detection PROPOSES the fork↔canonical assignment; owner CONFIRMS. Detection is illustrative-command + binding-behavior (T4): name the gh fields/compose as "e.g.", make the decision rule binding (per-remote on identity not name; exactly one unambiguous pairing; else ask). Fallback: general rule "any ambiguity or failure → ask; never guess," then all six cases as "including" examples.
3. No-op check over RESOLVED ROLES (T2/T8): fork-role remote named `origin` AND canonical-role remote named `upstream` → no rename, just record.
4. Otherwise recommend fork→`origin`, canonical→`upstream` as a DECLINE-ABLE recommendation with one literal quoted example utterance modeled on R2 (T3). Hard binding approval gate: never run `git remote rename` without explicit owner approval, never silently (with the because-clause: it mutates the owner's local git config).
5. Apply (on approval) with the general free-target-first rule + the literal State-B swap (`origin`→`upstream` BEFORE fork→`origin`) + the exit-3 collision-error note (T8). E3 needs no special order. Then the comprehensiveness reassurance (migrates tracking refs, `branch.<name>.remote`, entire `remote.<old>.*`) with the ONE reactive E7 exception caveat (T9). On decline: keep existing names.
6. Forward to Capture for recording the resolved names.

**Edit 3 — Capture block (148–156) + adjacent authority statement (T5, T6, T7).** Additive: clarify the recorded name per role is the RESOLVED (post-decision) name; add the authority statement (two coupled clauses — recorded `name` is authoritative, downstream resolves the role to it, naming the two consumers as notable examples; AND fork-mode pushes are always explicit-by-remote `git push <remote> <branch>`). Add ONE format-light worked example using the DECLINED/non-standard case (role key ≠ name) to make role-vs-literal unmissable. Do NOT edit :121 or `.rp.md`; describe the fork-push consumer generically.

**Fences (T10):** only `setup.md` changes; the fork-mode explanation (112–123, incl. :121), "Define the upstream PR transformation" (136–146), and the create-fork sub-path stay as-is; `artifacts-in-repo`, `.rp.md`, other reference docs, agent definitions, `CONTRIBUTING.md`, and application code are untouched; O2/O5 not addressed.
