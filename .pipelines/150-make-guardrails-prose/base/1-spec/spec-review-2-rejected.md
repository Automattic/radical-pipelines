# Spec Review 2 — Rejected

## Verdict: rejected

## Summary

The revision cleanly resolved both issues from `spec-review-1-rejected.md`: "the autonomous-workflow spawn block" is gone from requirement 13 and the final acceptance criterion, replaced by "the passing convention file (which carries the spawn-time Guardrails block)" in the singular. I verified against the worktree that `autonomous-workflow.md` carries no spawn-time Guardrails block (line 66 is the `## 6. Handle blockers` heading; line 63 delegates the `## Conventions` block to `passing.md`), and that the spawn-time Guardrails framing actually lives in `passing.md:10`. Those two prior issues are genuinely fixed, and the attribution is now accurate.

The spec also remains strong on the substance: the narrow/coherent reading (command guardrails re-expressed as prose, a new judgment-guardrail kind, the `{scope}` fill lifecycle and binary approve/reject preserved, exit-code framing stripped), WHAT-not-HOW discipline, and the unified-block / `agents:`-reuse design all match the worktree files I re-verified (`guardrails.md`, `passing.md`, `setup.md`, `load.md`, the writers and reviewers).

It is rejected for **one** remaining enumeration error of the *same defect class* the prior review caught for `autonomous-workflow.md` — a file named in the exit-code-removal list that has no exit-code framing to remove and whose only guardrail content the spec itself preserves. The prior review did not flag it (it only flagged `autonomous-workflow.md`), so it survived the revision. It is a surgical fix and reopens no design decision.

## Issues

### Issue 1 (must-fix): "the assisted plan phase" is enumerated as an exit-code-removal site, but it carries no exit-code framing — and its only guardrail content is preserved unchanged per the spec's own Out of Scope

**Where:** Requirement 13 (line 45) and the final acceptance criterion (line 75) both list "**the assisted plan phase**" inside the enumeration of guardrail-related files where "no exit-code framing … remains." Line 45: "…the passing convention file (which carries the spawn-time Guardrails block), **the assisted plan phase**, the two code writers…". Line 75 repeats it in the file list.

**What's wrong:** I read the assisted plan phase (`skills/radical-pipelines/reference/assisted-phases/3 - plan.md`) and grepped it. It contains **zero** of the four named exit-code phrases ("exit 0", "exit code", "exits non-zero", "judged pass/fail by exit code") — in fact no `exit` token at all. Its only guardrail-related content is the `## Guardrail scopes` execution validation at lines 118 and 211: *"substitute its value into the gate's command template and execute the filled command … did the command's runner resolve and terminate?"* The spec's own **Out of Scope** (line 53) correctly classifies exactly this as "execution checks, not exit-code checks. They are preserved, not removed."

So the assisted plan phase has nothing the change removes and nothing it broadens. This is unlike `passing.md`, which earns its place in the list despite carrying none of the four phrases: `passing.md:10` carries genuine command-presupposing framing ("place the **resolved command**; a fixed gate's **command** passes literally") that requirement 9 / requirement 13 must broaden so a judgment guardrail (no command) fits. The assisted plan phase has no such broadening work — its execution check is explicitly preserved, not touched.

This is the identical shape the prior review rejected for `autonomous-workflow.md`: a file listed as an exit-code-removal site that has nothing to remove there. For the assisted plan phase, the final acceptance criterion ("no exit-code framing … remains [across these files]") is **vacuously true already** — the change does nothing to that file — and listing it sits in surface tension with Out of Scope line 53, which names the same file's validation as "preserved, not removed."

**Why it matters (testability + consistency):** The final acceptance criterion is the spec's central verification gate, and its value is that it enumerates exactly the files the change must end up affecting. Including a file with no exit-code framing and no broadening work makes that entry untestable-by-doing-nothing and invites a misread: an implementer reconciling "no exit-code framing remains [in] the assisted plan phase" (line 75) against "the assisted-phase 'runner resolve and terminate' validation … is preserved, not removed" (line 53) faces the same file pulled two ways. The execution check ("did the command's runner resolve and terminate? — not whether tests exist or pass") is execution-shaped wording that a careless reader could mistake for pass/fail framing and strip. The spec should not name a preserved-unchanged file in its removal list.

**Expected:** Drop "the assisted plan phase" from the file enumeration in requirement 13 (line 45) and in the final acceptance criterion (line 75). The assisted plan phase is already, and only, an Out-of-Scope (preserved) item per line 53 — keep it there and remove it from the removal/broadening enumeration. Leave `passing.md` in the list (it carries real spawn-block broadening work). After this fix, every file the enumeration names will have actual exit-code-removal or command-presupposing-broadening work, and no preserved-unchanged file will appear in the removal list.

## Notes (not blocking)

- I re-verified the full exit-code-framing inventory against the worktree. The files that genuinely carry one or more of the four named phrases are exactly: `guardrails.md:3`, `load.md:22`, `setup.md:183-184`, `code-writer-tdd.md:44`, `code-writer-e2e.md:35`, `doc-writer.md:47`, `code-reviewer.md:43,114`, `doc-reviewer.md:45,115`. The spec enumerates all of these correctly. `passing.md` carries no named phrase but does carry command-presupposing framing to broaden (`passing.md:10`) and is correctly listed and attributed. The only enumeration defect is the assisted-plan-phase entry above.
- Requirement 12 / AC line 73 (setup accepts a command that runs even when its check currently fails; rejects only one that cannot run) preserves the load-bearing meaning at `setup.md:179,183-184` without the "exit 0"/"exit code" words. Verified accurate.
- Requirement 4 / AC line 64 (unified block; a judgment guardrail omits `{scope}` and fill-guidance the way a fixed command gate already omits fill-guidance) matches `guardrails.md:16-24` ("fill-guidance: <optional; scoped gates only>"). Accurate.
- Requirement 5 / AC line 65 (reviewer-only judgment guardrail never placed in a writer's prompt) is supported by the `agents:` field and `passing.md:11-12` ("Omit when … agent doesn't have any gates"). Accurate, no new mechanics required.
- Requirement 14 / AC line 76 correctly carry the project's "prose, not software — no structural tests assert the content … of skill or agent files" rule. Good.
