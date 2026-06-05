# Code plan — Recommend standard remote names when setting up artifacts-in-fork mode

## Scope and ground rules

The deliverable of this pipeline is a single-file documentation/instruction change to the shipped reference document:

- **Target file (absolute):** `/Users/luisherranz/Code/radical-pipelines/.claude/worktrees/68-recommend-standard-remote-names/skills/radical-pipelines/reference/conventions/setup.md`
- **Target file (repo-relative):** `skills/radical-pipelines/reference/conventions/setup.md`

There is no application source code to change. The orchestrator's fork-mode push/PR logic is expressed entirely in this Markdown reference, so the implementation tasks below ARE edits to this file. The "code" here is the content of that document.

All edits land inside the `artifacts-in-fork` branch of the **Artifact storage (required)** convention (the block that begins at line 112, `**If no** ...`). The decision spine, wording contract, safe-rename ordering, no-op detection, the E7 caveat, the capture-block additive edits, and the scope fences are already settled by the spec and design doc. Do NOT re-open them. Implement exactly what is specified; make no new design decisions.

### Hard scope fences (D-SCOPE; AC9) — do NOT touch

These regions are referenced by the new content but must remain byte-for-byte unchanged. Treat any edit to them as a defect:

- The fork-mode explanation block, lines 112–123, **including line 121** ("Pushes the clean branch directly to `upstream`."). Line 121 must stay ROLE-based; hardcoding a remote name there contradicts R5.
- The create-fork sub-path, lines 130–134 (the "If only one remote is configured or no fork exists" bullet and its sub-bullets, ending at "re-run `git remote -v` and confirm the assignment.").
- "Define the upstream PR transformation." and its body, lines 136–146.
- `artifacts-in-repo` mode (line 110 and everywhere else). It records no remotes; unchanged.
- Every other file: no other reference document, no agent definition, no `.rp.md`, no `pi.md`, no `pipeline-versioning.md`, no `CONTRIBUTING.md`, no application code. Only `setup.md` may be modified.

The latent upstream-write-access gap (O2) and fork-of-a-fork chains (O5) are explicitly out of scope; do not add prose addressing them.

### Altitude convention to follow (from the design doc)

A git/`gh` command is written **illustratively** ("e.g." / "for example") when it is a MEANS to a behavior, and written **literally** only when the command IS the action. This matches the existing document: `git remote -v` (the listing IS the instruction) is literal; `gh repo fork` at line 132 is illustrative. Apply this register to all new content. Render the worked example format-light/illustrative (prose register), not as a mandated schema.

### Line numbers are pre-edit anchors

All line numbers in this plan refer to the file's CURRENT (pre-edit) state, verified against the on-disk file. Because Task 2 inserts content, perform the tasks in the order given and re-locate edit points by their surrounding TEXT (quoted below), not by absolute line number, once an earlier task has shifted later lines. Each task states its text anchors explicitly.

---

## Task 0 — Read the target file in-conversation (prerequisite)

**Type:** Prerequisite (no file change).

**Action:** Read `skills/radical-pipelines/reference/conventions/setup.md` in full so the subsequent exact-string edits can be made. Confirm the three anchor regions are present as quoted in this plan:

- Line 129 begins `- If two or more remotes are configured, ...` and contains the sentence `By GitHub convention \`origin\` is usually the fork and \`upstream\` the canonical repo, but do not assume — always confirm.`
- Line 135 is the blank line between the create-fork sub-path (ending line 134 `Wait for confirmation, then re-run \`git remote -v\` and confirm the assignment.`) and line 136 `**Define the upstream PR transformation.** Ask the owner for:`.
- The Capture block at lines 148–155 begins `Capture:` and lists `mode`, then under `For \`artifacts-in-fork\`:` the `upstream`, `fork`, Upstream branch format, and Upstream commit format bullets.

**Acceptance criteria:**
- The file has been read in this conversation (required before any Edit).
- All three anchor regions are confirmed present with the exact wording above. If any anchor does not match (the file has drifted from the design doc's line geography), STOP and report a blocker; do not improvise new insertion points.

**Traces to:** Enables all tasks; D-SCOPE.

---

## Task 1 — Thin the 2-remote role line to a bare role-confirmation (C1 / D-THIN)

**File:** `skills/radical-pipelines/reference/conventions/setup.md`

**Location:** Line 129, the first bullet under `**Identify the remotes.**`. Text anchor (the sentence to remove): `By GitHub convention \`origin\` is usually the fork and \`upstream\` the canonical repo, but do not assume — always confirm.`

**Action:** Edit the line-129 bullet so it asks the owner to confirm which remote plays which role (upstream/canonical vs. fork) and STOPS there. Remove the literal-name soft hint sentence entirely ("By GitHub convention `origin` is usually the fork and `upstream` the canonical repo, but do not assume — always confirm."). Keep the confirm-the-role guarantee in the thinned wording (the owner still confirms which remote is which). Do not move the literal-name naming convention here; it now lives solely in the new step added by Task 2.

**Acceptance criteria (observable in the produced file):**
- The line-129 bullet still instructs the orchestrator to ask the owner to confirm which configured remote is the upstream/canonical and which is the fork.
- The exact sentence "By GitHub convention `origin` is usually the fork and `upstream` the canonical repo, but do not assume — always confirm." no longer appears anywhere in the file (the soft hint is superseded, AC8).
- No literal recommendation of `origin`/`upstream` names is introduced on this line; the role-confirmation guarantee is retained.
- The create-fork sub-path (lines 130–134) is untouched, so the "always confirm the role assignment" guarantee remains present in both paths.

**Traces to:** R9; AC8; D-THIN, D-SCOPE.

---

## Task 2 — Insert the shared "Recommend the standard remote names" step (C2 / D-INSERT, D-FLOW, D-WORDING, D-AUTO, D-RENAME, D-E7)

**File:** `skills/radical-pipelines/reference/conventions/setup.md`

**Location:** The blank-line seam at line 135 — AFTER the end of the entire "Identify the remotes" block (i.e., after line 134 `Wait for confirmation, then re-run \`git remote -v\` and confirm the assignment.`) and BEFORE line 136 `**Define the upstream PR transformation.**`. Text anchors: insert between the line that ends `...re-run \`git remote -v\` and confirm the assignment.` and the line that begins `**Define the upstream PR transformation.**`.

**Action:** Insert ONE new peer step, at the same structural level as the sibling bold-led steps ("Identify the remotes." at 127, "Define the upstream PR transformation." at 136, "Capture:" at 148). Lead it with a bold label such as `**Recommend the standard remote names.**`. Both role-identification paths (the thinned 2-remote path and the create-fork sub-path) fall through to this single shared step once roles are known. The step must contain the full decision flow below, in this order. Each numbered item names exactly what the content must assert; the code-writer writes the prose at the document's altitude.

The step must, in order:

1. **State the inputs / convergence.** The configured remotes and their URLs are already available (both upstream paths run `git remote -v` before reaching this step). This single step runs after BOTH the 2-remote path and the create-fork path, so a manually added fork that landed in a non-standard ("inverted") state is also caught here.

2. **Establish roles — owner-confirmed floor plus optional `gh` auto-detection accelerant (D-AUTO).**
   - Describe attempting `gh`-based fork/parent auto-detection to PROPOSE which remote is the fork and which is the canonical. Render the `gh` invocation ILLUSTRATIVELY (it is a means): e.g. `gh repo view <remote-url> --json isFork,parent`, run per-remote on the remote's URL. Note that `gh` normalizes raw remote URLs itself, so no manual URL parsing is required. Include the compose detail: the parent identity is `parent.owner.login` + "/" + `parent.name`.
   - State the BINDING decision rule: detection is on each remote's URL/repo IDENTITY (not its name); the fork is the remote whose `isFork == true` and whose parent equals the OTHER configured remote's `owner/repo`, and the canonical is that parent. The fork↔canonical pairing must be EXACTLY ONE and unambiguous to act on.
   - Lead the fallback with the binding universal: in ANY ambiguity or failure case, fall back to asking the owner which remote is which, and NEVER guess. Then list, as "including" examples (to meet AC5's coverage floor), all six cases: (1) neither remote is a fork of the other; (2) both remotes point at the same repository; (3) a remote is not on GitHub (GitLab, Bitbucket, unauthenticated self-hosted, etc.); (4) `gh` is offline, unauthenticated, errors, or exits nonzero for any reason; (5) the fork's parent is a repository not among the configured remotes; (6) more than two remotes with no single clear pairing.
   - State that EITHER WAY — auto-detected-then-confirmed, or asked cold — by the end of this step the roles are known AND owner-confirmed. Auto-detection only upgrades "ask the owner cold" into "here is our detected assignment, confirm or correct"; it is never a gate.

3. **No-op check, evaluated over RESOLVED ROLES (D-FLOW; AC7; E1).** Check whether the remote that IS the fork is named `origin` AND the remote that IS the canonical is named `upstream`. If yes, make NO rename recommendation and proceed straight to recording the names. State explicitly that this check runs against the resolved ROLES, not raw names, because a remote literally named `origin` can point at the canonical repository; in that confusingly-named inverted case the names look standard but the roles are wrong, and the correct action is a rename recommendation, not a no-op.

4. **Recommend the rename(s) (D-WORDING; AC1, AC2; R1).** Otherwise, recommend renaming to bring the fork → `origin` and the canonical → `upstream`. Phrase it as a decline-able recommendation including ONE literal quoted example utterance, modeled lightly on the spec's phrasing, e.g.: "By default we recommend naming the fork `origin` and the canonical `upstream`. Do you want us to rename them, or leave them as they are?"

5. **Hard approval gate (D-WORDING; AC3; R3).** Pair the recommendation with a binding rule stated as a constraint, not merely implied by the question: the orchestrator must NEVER run `git remote rename` without the owner's explicit approval, and never renames on its own initiative. Include a brief because-clause: the rename mutates the owner's local git config. State both decline branches symmetrically: on approval, apply the renames (Task-2 item 6); on decline, keep the existing remote names.

6. **Apply renames safely with free-target-first ordering (D-RENAME; AC6; E2, E3).** On explicit approval, apply the rename(s) with one general rule: before any rename whose target name is currently taken, free that name first. Give the inverted State-B case as the literal worked instance: rename the canonical `origin` → `upstream` FIRST (to free `origin`), THEN rename the fork → `origin`. State the reason: `git remote rename` errors (exit status 3) if the target name already exists and makes no change on failure. Do NOT add per-edge-state prose for the both-names-non-standard case (E3) where both target names are already free — the general "free the target first" rule already degenerates to "no special ordering" there.

7. **Comprehensiveness reassurance (D-RENAME).** Add a reassurance so the orchestrator does not invent follow-up steps: `git remote rename` migrates the remote-tracking refs, the `branch.<name>.remote` tracking config, and the entire `remote.<old>.*` section, so fetch/push/pull keep working with no further action.

8. **E7 benign-exception caveat (D-E7; E7).** Attach to the comprehensiveness note a brief REACTIVE caveat: a non-default, hand-edited fetch refspec pointing outside `refs/remotes/<old>/*` is not rewritten — git prints a warning and exits 0, leaving that refspec stale; it is rare and benign, so do not treat the warning as an error or block on it. Phrase it conditionally ("if git prints this warning, it's benign; proceed"). Do NOT phrase it as an instruction to inspect refspecs first; never induce a defensive pre-scan.

9. **Hand off to recording.** On either branch (no-op, accepted rename, or declined), proceed to record the resolved (post-decision) remote names via the Capture block.

**Acceptance criteria (observable in the produced file):**
- A single new bold-led peer step exists between the end of "Identify the remotes" (line 134's content) and "Define the upstream PR transformation." (line 136's content). It is NOT duplicated into either upstream path.
- The step instructs recommending the fork → `origin` and canonical → `upstream` naming scheme (AC1).
- It presents the recommendation as decline-able with a concrete example utterance offering to rename or leave the remotes as-is (AC2).
- It states the orchestrator must obtain explicit owner approval before any rename and never renames silently / on its own initiative, with the because-clause that the rename mutates local git config (AC3).
- It describes `gh`-based fork/parent auto-detection (illustrative command `gh repo view <remote-url> --json isFork,parent`, the no-manual-URL-parsing note, and the `parent.owner.login` + "/" + `parent.name` compose detail) producing a concrete recommendation only when exactly one unambiguous fork↔canonical pairing exists, and falling back to asking the owner in every ambiguity/failure case — explicitly covering at least all six listed cases — and states the orchestrator never guesses (AC5).
- The no-op check is stated to run over resolved ROLES (fork-role named `origin` AND canonical-role named `upstream` → no rename, just record), with the canonical-named-`origin` trap explicitly called out (AC7, E1).
- The safe-rename instruction specifies freeing the target name first, with the State-B swap (canonical `origin` → `upstream` BEFORE fork → `origin`) as the literal instance, and notes `git remote rename` errors if the target name already exists (AC6, E2).
- The comprehensiveness reassurance (migrates remote-tracking refs, `branch.<name>.remote`, and the `remote.<old>.*` section) is present, and the E7 caveat is phrased reactively/conditionally with NO instruction to pre-scan refspecs (E7).
- Illustrative commands use "e.g."/"for example" register; `git remote -v` style literal-action commands are not introduced where the command is only a means.
- Lines 112–123 (incl. 121), 130–134, and 136–146 are unchanged.

**Traces to:** R1, R2, R3, R6, R7, R8; AC1, AC2, AC3, AC5, AC6, AC7; E1, E2, E3, E6, E7; D-INSERT, D-FLOW, D-WORDING, D-AUTO, D-RENAME, D-E7.

---

## Task 3 — Additive Capture-block edits, authority statement, and worked example (C3 / D-CAPTURE)

**File:** `skills/radical-pipelines/reference/conventions/setup.md`

**Location:** The Capture block, lines 148–155 (post-Task-2 these lines have shifted down; re-locate by text). Text anchors: the `Capture:` line; under `For \`artifacts-in-fork\`:` the bullets `\`upstream\`: name and URL of the upstream remote` and `\`fork\`: name and URL of the fork remote`.

**Action (additive only — do NOT restructure the existing role-keyed schema):** The Capture block already keys remotes by role (`upstream`, `fork`) with a name and URL each, which satisfies AC4's structural half. Make three additive changes:

1. **Clarify "resolved" (R4; AC4; E4).** Make clear that the recorded `name` per role is the RESOLVED (post-decision) name: `origin`/`upstream` if the owner accepted the rename, or the existing actual names if the owner declined.

2. **Add the authority statement (R5; AC4).** Add a statement with two coupled clauses:
   - The recorded `name` per role is AUTHORITATIVE: downstream operations resolve the logical role (`upstream` / `fork`) to that recorded `name`. Name as notable downstream consumers (a) the clean-branch push to the upstream remote and (b) the run-close-out push of the pipeline branch to the fork remote. Describe the fork-push consumer GENERICALLY (prose) rather than cross-referencing any `.rp.md` path or file, keeping the shipped doc self-contained.
   - Fork-mode pushes are ALWAYS explicit-by-remote (`git push <remote> <branch>`), never relying on a default remote.

3. **Add one format-light worked example (E4).** Add a single illustrative worked example using the DECLINED / non-standard case, where the role key and the resolved name are VISIBLY different — e.g. role `fork` → name `myfork`, role `upstream` → name `canonical` — so the role-vs-literal distinction is unmissable. Render it format-light in the existing prose register, NOT as a mandated schema or structured data block.

**Acceptance criteria (observable in the produced file):**
- The Capture block still keys fork-mode remotes by role (`upstream`, `fork`) with a `name` + URL per role (existing structure preserved, AC4 structural half).
- The recorded `name` per role is described as the RESOLVED (post-decision) value (accepted → `origin`/`upstream`; declined → existing names) (R4; E4).
- An authority statement is present asserting both that the recorded `name` is the source of truth downstream operations resolve the role to (naming the clean-branch push to upstream and the run-close-out push of the pipeline branch to the fork as examples), AND that fork-mode pushes are always explicit-by-remote `git push <remote> <branch>` (R5; AC4).
- The fork-push consumer is described generically with no `.rp.md`/file path cross-reference.
- One format-light worked example using the declined/non-standard case shows a role key differing from its resolved name (e.g. `fork` → `myfork`, `upstream` → `canonical`) (E4).
- Line 121 is NOT edited and remains role-based; `.rp.md` is not edited.
- The `artifacts-in-repo` Capture entry (`mode` and the repo-mode behavior) is unchanged.

**Traces to:** R4, R5; AC4; E4; D-CAPTURE, D-SCOPE.

---

## Task 4 — Whole-file scope and consistency verification (AC9, AC8)

**Type:** Verification (no new file change unless a defect is found).

**Action:** After Tasks 1–3, verify the produced state:

1. **Containment (AC9).** Confirm the pipeline's diff touches ONLY `skills/radical-pipelines/reference/conventions/setup.md`. No other reference doc, agent definition, `.rp.md`, `pi.md`, `pipeline-versioning.md`, `CONTRIBUTING.md`, or application code is modified. (The pipeline's own `.rp/...` artifact files are expected and are not part of the product diff.)
2. **Fences intact.** Confirm lines 112–123 (including line 121 "Pushes the clean branch directly to `upstream`."), the create-fork sub-path (original lines 130–134), and "Define the upstream PR transformation." (original lines 136–146) are byte-for-byte unchanged.
3. **Old hint gone (AC8).** Confirm the sentence "By default `origin` is usually the fork and `upstream` the canonical repo, but do not assume — always confirm." (and the equivalent "By GitHub convention `origin` is usually..." current wording) no longer appears, and that the confirm-the-role guarantee survives (in the thinned line 129 and the untouched create-fork path's "confirm the assignment").
4. **`artifacts-in-repo` unchanged (AC9, O4).** Confirm repo mode still records no remotes and is otherwise untouched.

**Acceptance criteria:**
- Exactly one product file changed: `skills/radical-pipelines/reference/conventions/setup.md`.
- All three fenced regions unchanged.
- The superseded soft hint is absent; the confirm-the-role guarantee is present.
- `artifacts-in-repo` mode is unchanged.
- If any check fails, fix the offending task's output (do not loosen the fences) and re-verify.

**Traces to:** O1, O2, O3, O4, O5; AC8, AC9; D-SCOPE.

---

## Traceability summary

| Task | Spec requirements | Acceptance criteria | Design decisions | Edge cases |
| ---- | ----------------- | ------------------- | ---------------- | ---------- |
| 0    | (prerequisite)    | —                   | D-SCOPE          | —          |
| 1    | R9                | AC8                 | D-THIN, D-SCOPE  | —          |
| 2    | R1, R2, R3, R6, R7, R8 | AC1, AC2, AC3, AC5, AC6, AC7 | D-INSERT, D-FLOW, D-WORDING, D-AUTO, D-RENAME, D-E7 | E1, E2, E3, E6, E7 |
| 3    | R4, R5            | AC4                 | D-CAPTURE, D-SCOPE | E4       |
| 4    | O1, O2, O3, O4, O5 | AC8, AC9           | D-SCOPE          | —          |

Every spec AC is covered: AC1/AC2/AC3/AC5/AC6/AC7 by Task 2, AC4 by Task 3, AC8 by Tasks 1 and 4, AC9 by Task 4. Every edge case E1–E7 is covered: E1 (Task 2 no-op), E2/E3 (Task 2 rename ordering), E4 (Task 3 declined worked example), E5 (handled by the untouched create-fork path falling through to Task 2's shared step — no new task needed), E6 (Task 2 fallback floor), E7 (Task 2 caveat).
