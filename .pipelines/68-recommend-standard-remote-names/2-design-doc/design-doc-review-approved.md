# Design-doc review — APPROVED

**Design doc:** `2-design-doc/design-doc.md` — "Recommend standard remote names when setting up artifacts-in-fork mode"
**Reviewer:** design-doc-reviewer
**Iteration:** 1
**Verdict:** APPROVED

## Summary

The design fully realizes the spec's WHAT with feasible, well-traced decisions. It correctly frames the work as a documentation/instruction change to a single shipped reference document (`skills/radical-pipelines/reference/conventions/setup.md`, the `artifacts-in-fork` branch of the **Artifact storage (required)** convention), with no code or other-file changes. Every spec requirement (R1-R9), acceptance criterion (AC1-AC9), and edge case (E1-E7) is served by a traced decision; every key decision traces back to a spec item; the approach is feasible against the real codebase and the actual git/gh behavior it leans on (all verified empirically); scope stays contained with explicit fences; and the three non-blocking spec-review design notes are genuinely resolved. I recommend proceeding to the plan phase.

## Verification performed

**Line geography (all confirmed against the real `setup.md`).**
- Line 127 `**Identify the remotes.**`; line 129 the 2-remote path with the soft hint; lines 130-134 the create-fork sub-path (134 indented, belonging only to the create-fork bullet); line 135 a clean blank-line seam; line 136 `**Define the upstream PR transformation.**`; lines 148-156 the Capture block keyed by role with name+URL each; line 121 "Pushes the clean branch directly to `upstream`"; line 132 the illustrative `gh repo fork`. All match the design's cited geography. The convergence-seam architecture is structurally sound: both role-identification paths terminate at a "confirm" (inline at 129, at 134 for create-fork), and a new bold-led step at the line-135 seam sits as a peer to the sibling bold steps that both paths fall through to once roles are known.

**git behavior (empirically verified, git 2.50.1, matching the research).**
- Rename collision: `git remote rename theirs origin` with `origin` taken → `error: remote origin already exists.`, exit status 3, state unchanged. Confirms D-RENAME / AC6 / E2.
- State-B swap order: from (`origin`=canonical, `myfork`=fork), `rename origin upstream` (exit 0) then `rename myfork origin` (exit 0) yields the correct `origin`=fork / `upstream`=canonical layout. Confirms the literal worked instance in D-RENAME.
- Comprehensiveness: a rename migrates `branch.<name>.remote` (myfork→origin), the entire `remote.<old>.*` section (url + fetch refspec), and correctly leaves `branch.<name>.merge` as `refs/heads/main` (remote-agnostic). Confirms D-RENAME's comprehensiveness reassurance AND its accuracy precision (claim only `branch.<name>.remote` migrates, not `.merge`).
- E7 non-default refspec: an added `+refs/heads/special:refs/custom/special` triggers `warning: Not updating non-default fetch refspec`, exit 0, default refspec migrated, non-default left stale. Confirms D-E7's behavior and its sharp contrast with the collision case (`error:` + exit 3). The reactive-not-proactive framing is well-grounded.

**gh behavior (verified).**
- `gh repo view <repo> --json isFork,parent` (gh 2.78.0) returns `{"isFork":false,"parent":null}` for a root repo; `parent` is an object-or-null. The exact invocation is treated as illustrative (D-AUTO), so the precise `parent.owner.login`+`/`+`parent.name` compose path is guidance, not a contract — already confirmed feasible by the spec reviewer's own run.

**Role-abstraction premise (verified).** A repo-wide search for remote/push references confirms every downstream consumer resolves through a logical role, never a hardcoded literal: `setup.md:121` ("Pushes the clean branch directly to `upstream`", role-based) and `.rp.md:34` ("push the pipeline branch to the remote", role-neutral; this repo is `artifacts-in-repo` so it carries no fork block). The two named authority-statement consumers in D-CAPTURE map exactly to these. `pi.md:63`'s upstream/fork mention is about agent-file placement, correctly out of scope. This validates R5/R9's premise and AC9 containment.

**Iteration.** Only `design-doc.md` and `design-doc-research.md` exist in the folder — first iteration, no prior rejection.

## Requirement / AC / edge-case coverage

- **R1 / AC1** recommend standard scheme → D-INSERT + D-FLOW (step 4 recommends fork→`origin`, canonical→`upstream`). Served.
- **R2 / AC2** decline-able recommendation, example wording → D-WORDING (one literal quoted example utterance modeled on the spec's own phrasing). Served.
- **R3 / AC3** never rename silently, explicit approval → D-WORDING (hard binding gate, correctly reasoned as necessary beyond the decline-able question alone, with the because-clause). Served.
- **R4 / AC4** record resolved names keyed by role → D-CAPTURE (additive, block already keys by role with name+URL). Served.
- **R5 / AC4** `name` authoritative downstream → D-CAPTURE authority statement (two coupled clauses; explicit-by-remote pushes), with line 121 correctly left role-based. Served.
- **R6 / AC5** auto-detect + owner-confirmation floor → D-AUTO + D-FLOW (all six fallback cases enumerated under a leading binding universal). Served.
- **R7 / AC6** safe rename ordering → D-RENAME (general free-target-first rule + literal State-B swap + exit-3 collision note). Served.
- **R8 / AC7** no-op case → D-FLOW step 3, evaluated over RESOLVED ROLES. Served.
- **R9 / AC8** supersede soft hint, retain confirm-the-role → D-THIN (literal-name hint removed, confirm-role guarantee retained in both branches and as the fallback floor). Served.
- **AC9** scope containment → D-SCOPE (single-file edit, explicit fences, O1-O5 untouched). Served.
- **E1-E7** all mapped: E1→D-FLOW step 3; E2→D-RENAME State-B swap; E3→D-RENAME order-free degeneration; E4→D-WORDING decline branch + D-CAPTURE recording; E5→D-INSERT shared fall-through catching the manual-add inverted case; E6→D-AUTO six cases; E7→D-E7 benign caveat. Served.

No invented functionality, no out-of-scope collapse. The worked example in D-CAPTURE (the spec-research's non-blocking observation, left out of mandatory scope by the spec reviewer) is included as an additive, format-light illustration that clarifies R5's "make clear" without adding behavior or implying a mandated schema — acceptable design latitude, not scope creep.

## Spec-review design notes — all genuinely resolved

1. **Recommend step across both role-identification paths.** D-INSERT places ONE shared step at the line-135 seam that both the 2-remote path and the create-fork path fall through to once roles are known, explicitly so a manually-added inverted fork (State B) is also caught. Verified structurally sound against the real file. Resolved.
2. **E7 has no dedicated AC.** D-E7 surfaces it as a single reactive benign-exception caveat, correctly calibrated to the "account for it" bar rather than a disproportionate procedure. Resolved.
3. **`gh` invocation is illustrative, not a contract.** D-AUTO uses the document's illustrative tier ("e.g."), matching the line-132 register, with the binding part being the behavior (per-identity detection, exactly-one-unambiguous-pairing, else ask). Resolved.

## Strengths worth noting

- The roles-first decision spine with `gh` as a non-gating accelerant is the correct architecture: the flow remains valid and correct with auto-detection entirely removed, because owner confirmation is the guaranteed floor.
- The no-op check evaluated over resolved roles (not raw names) closes the genuine "canonical-named-`origin`" inverted trap — a subtle correctness point the design caught and surfaced as a failure mode.
- The design correctly recognizes that editing line 121 to hardcode a name would CONTRADICT R5, making "leave it role-based" required rather than merely permitted.
- The altitude convention (illustrative when a command is a means, literal when the command IS the action) is consistent with the existing document and prevents over-specifying `gh`/git commands as contracts.

## Minor, non-blocking observations (no action required)

- The Capture block is annotated as "148-155" in the Overview and "148-156" in the synthesis guide; the actual block spans 148-156 (line 156 is the trailing blank). This is a trivial prose off-by-one in line annotation, not a design defect — the edit target is unambiguous regardless of whether the trailing blank line is counted.

## Conclusion

The design doc is ready. It is approved for the plan phase.
