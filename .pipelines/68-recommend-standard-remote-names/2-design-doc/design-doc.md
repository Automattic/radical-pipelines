# Design doc — Recommend standard remote names when setting up artifacts-in-fork mode

## Overview

Radical Pipelines stores its artifacts either in the project's own repository (`artifacts-in-repo` mode) or in a separate fork (`artifacts-in-fork` mode). The setup flow that captures this choice lives in the shipped reference document `skills/radical-pipelines/reference/conventions/setup.md`, under the **Artifact storage (required)** convention.

In `artifacts-in-fork` mode, setup must identify two git remotes — the **fork** (where all artifact-bearing pipeline work happens) and the **canonical/upstream** repository (where the eventual PR is opened) — and record them so later phases push and open PRs against the right place. Today the "Identify the remotes" step only asks the owner to confirm which existing remote plays which role and records whatever names already exist. It offers a soft, non-binding hint that `origin` is "usually" the fork and `upstream` "usually" the canonical, but it never recommends a naming scheme and never offers to rename anything.

This change reshapes that setup step so the orchestrator (1) recommends the GitHub-standard scheme — fork remote named `origin`, canonical remote named `upstream`; (2) presents it as a recommendation the owner can decline, with concrete example wording; (3) never renames a remote silently, requiring explicit owner approval first because `git remote rename` mutates the owner's local git config; and (4) records the resolved (final) remote names into the captured fork-mode config so downstream steps reference them unambiguously. To make the recommendation concrete, the orchestrator attempts to auto-detect which remote is the fork and which is the canonical using `gh` fork/parent data, and in every ambiguity or failure case falls back to asking the owner, preserving today's "always confirm the role assignment" guarantee.

The deliverable is a documentation/instruction change to a single shipped reference document. There is no fork-mode "application code" in this repository: the orchestrator's push/PR logic is expressed entirely in these Markdown references, and every downstream reference to a remote already resolves through the logical ROLE (`upstream` / `fork`). This is not a code change, not an agent-definition change, and not a change to any other reference document. `artifacts-in-repo` mode is unaffected — it records no remotes.

## Approach

The design treats `setup.md` as the component and makes three coordinated edits inside the `artifacts-in-fork` branch of the **Artifact storage (required)** convention. The guiding idea is to converge both existing role-identification paths into a single shared step that owns the new recommend-and-rename behavior, rather than duplicating that behavior in two places.

The current "Identify the remotes" block (lines 127–134) has two paths that do not share a convergence line: a 2-remote path (line 129, ending inline with "always confirm") and a create-fork path (lines 130–134, ending with "re-run `git remote -v` and confirm the assignment"). A manually added fork can land in a non-standard ("inverted") state, so the recommendation must run after BOTH paths. The approach therefore:

1. Reduces the 2-remote path's sentence to a bare role-confirmation, removing the literal-name soft hint while keeping the confirm-the-role guarantee.
2. Leaves the create-fork sub-path behaviorally intact.
3. Inserts ONE shared "Recommend the standard remote names" step at the blank-line seam (line 135) that both paths fall through to once roles are known. This single step owns auto-detection, the recommendation, the optional rename, and the hand-off to recording.
4. Makes additive clarifications to the Capture block (lines 148–155) and adds an authority statement establishing that the recorded `name` per role is what downstream operations resolve through.

The decision spine inside the new step is `roles → (no-op? or rename?)`. `gh` auto-detection is an optional accelerant that PROPOSES the role assignment; the owner always CONFIRMS. Auto-detection is never a gate: the flow remains valid and correct with auto-detection entirely removed, because owner confirmation is the guaranteed floor.

A consistent altitude convention governs the prose: a command is written as illustrative ("e.g." / "for example") when it is a MEANS to a behavior, and written literally only when the command IS the action. This matches the existing document, where `git remote -v` (the listing IS the instruction) is literal and `gh repo fork` (line 132, a means) is illustrative.

## Components

The single component is the shipped reference document `skills/radical-pipelines/reference/conventions/setup.md`, specifically the `artifacts-in-fork` branch of the **Artifact storage (required)** convention. Within it, three sub-areas change:

- **C1 — The 2-remote role-identification line (current line 129).** Thinned to a bare role-confirmation: the owner is asked to confirm which remote is the upstream/canonical and which is the fork. The literal-name soft hint ("`origin` is usually the fork and `upstream` the canonical repo, but do not assume — always confirm") is removed; the "always confirm which remote plays which role" guarantee is retained.

- **C2 — The new "Recommend the standard remote names" step (inserted at the line-135 seam).** A peer step, at the same structural level as the sibling bold-led steps ("Identify the remotes." at 127, "Define the upstream PR transformation." at 136, "Capture:" at 148), that both role-identification paths reach once roles are known. It contains the full decision flow described under Interfaces and Data Flow.

- **C3 — The Capture block and its adjacent authority statement (current lines 148–155).** Additive edits: clarify that the recorded name per role is the RESOLVED (post-decision) name; add the authority statement (recorded `name` is authoritative, downstream resolves the role to it, fork-mode pushes are always explicit-by-remote); and add one format-light worked example using the declined/non-standard case so that the role-vs-name distinction is visible.

Unchanged within the same file (referenced but never edited): the fork-mode explanation block (lines 112–123, including the 5-step PR flow and line 121 "Pushes the clean branch directly to `upstream`"), the create-fork sub-path (lines 130–134), and "Define the upstream PR transformation" (lines 136–146).

## Interfaces and Data Flow

The new step (C2) defines a single ordered decision flow. Its inputs are the configured remotes and their URLs, already produced by `git remote -v` in both upstream paths by the time control reaches line 135. Its output is the resolved role→name mapping handed to the Capture block.

1. **Inputs.** Configured remotes plus URLs (from `git remote -v`, already run by both paths).

2. **Establish roles — floor plus optional enhancement.** The orchestrator attempts `gh` auto-detection to PROPOSE which remote is the fork and which is the canonical (mechanics under D-AUTO). If exactly one unambiguous fork↔canonical pairing exists, it presents that concrete assignment for the owner to confirm. If detection is ambiguous or fails, it falls back to asking the owner cold. EITHER WAY, by the end of this step the roles are known AND owner-confirmed. Auto-detection only upgrades "ask the owner cold" into "here is our detected assignment, confirm or correct."

3. **No-op check, evaluated over RESOLVED ROLES.** Is the remote that IS the fork named `origin` AND the remote that IS the canonical named `upstream`? If yes, make NO rename recommendation and just record the names. The check runs against the resolved roles, not raw names, because a remote literally named `origin` can point at the canonical repository; in that confusingly-named inverted case the names look standard but the roles are wrong, and the correct action is a rename recommendation, not a no-op.

4. **Otherwise recommend the rename(s)** to bring fork→`origin` and canonical→`upstream`, phrased as a decline-able recommendation with one concrete example utterance, gated by a hard binding approval rule (D-WORDING).

5. **Apply or skip.** On explicit approval, apply the rename(s) with free-target-first ordering (D-RENAME). On decline, keep the existing remote names.

6. **Record resolved (post-decision) names** by forwarding to the Capture block (C3).

The data flow between the new step and downstream phases is mediated entirely by the captured config: the new step writes a resolved `name` per role, and downstream operations resolve a logical role (`upstream` / `fork`) to that recorded `name`, then push explicitly by remote (`git push <remote> <branch>`). No downstream prose is changed; it continues to refer to remotes by role and resolves through the recorded name. The two notable downstream consumers are the clean-branch push to the upstream remote (line 121) and the run-close-out push of the pipeline branch to the fork remote.

## Key Decisions

### D-INSERT — One shared recommend step at the line-135 seam
Insert a single "Recommend the standard remote names" step after the entire "Identify the remotes" block, at the blank-line seam (line 135), which both role-identification paths fall through to once roles are known. Reject inlining the step into each path separately: that duplicates the flow, creates two places to keep consistent, and the create-fork path's `gh repo fork` usually lands already-standard, so the duplicated text would mostly be dead there yet still required for the manual-add case. A single shared step is the convergence point that guarantees a manually added inverted fork is also caught.
**Traces to:** R1, R9; AC1, AC8.

### D-THIN — Thin the soft hint to a bare role-confirmation
Reduce the line-129 sentence to "confirm which remote plays which role," removing the literal-name hint ("`origin` is usually the fork…") and keeping the confirm-the-role guarantee. The literal-name convention then lives in exactly one place (the new step). The "always confirm the role assignment" guarantee is preserved in both branches (the thinned line 129 and the create-fork path's "confirm the assignment" at line 134) and is also expressed as the auto-detection fallback floor. This supersedes the soft hint without duplicating the naming convention.
**Traces to:** R9; AC8.

### D-FLOW — The roles-first decision spine, with gh as a non-gating accelerant
The flow is `establish roles → no-op check over resolved roles → recommend → confirm → optionally rename → record`. Auto-detection PROPOSES; the owner CONFIRMS; roles are known regardless of the `gh` outcome. The no-op predicate (step 3) is evaluated over resolved roles, not raw names, closing the canonical-named-`origin` trap. The flow remains valid with auto-detection entirely removed, because owner confirmation is the floor and is sufficient alone.
**Traces to:** R1, R6, R8; AC1, AC5, AC7; E1, E6.

### D-WORDING — Decline-able recommendation with a literal example plus a hard approval gate
Present the scheme as a decline-able recommendation including one literal quoted example utterance, modeled lightly on the spec's own phrasing, e.g. "By default we recommend naming the fork `origin` and the canonical `upstream`. Do you want us to rename them, or leave them as they are?" Pair it with a hard binding rule, because a question alone only implies that "no" is possible and does not assert the constraint: the orchestrator must never run `git remote rename` without the owner's explicit approval and never renames on its own initiative, with a brief because-clause (the rename mutates the owner's local git config). State both decline branches symmetrically: on approval, apply the renames; on decline, keep the existing remote names.
**Traces to:** R2, R3; AC2, AC3; E4.

### D-AUTO — Auto-detection as illustrative command plus binding behavior
Describe auto-detection as a BEHAVIOR with the `gh` command illustrative and the decision rule binding. Illustrative: the invocation `gh repo view <remote-url> --json isFork,parent`, the note that `gh` normalizes raw remote URLs itself (no manual URL parsing), and the compose detail `parent.owner.login` + "/" + `parent.name`. Binding: detection is per-remote on the remote's URL/repo IDENTITY (not its name); the fork is the remote that is a fork whose parent is the OTHER configured remote, and the canonical is that parent; the fork↔parent pairing must be EXACTLY ONE and unambiguous to act on; anything else falls back to asking the owner, and the orchestrator never guesses. Lead the fallback with the binding universal ("any ambiguity or failure → ask the owner; never guess"), then list all six cases as "including" examples to meet AC5's coverage floor: (1) neither remote is a fork of the other; (2) both remotes point at the same repository; (3) a remote is not on GitHub; (4) `gh` is offline, unauthenticated, errors, or exits nonzero for any reason; (5) the fork's parent is a repository not among the configured remotes; (6) more than two remotes with no single clear pairing.
**Traces to:** R6; AC5; E6.

### D-RENAME — Free-target-first ordering, with the State-B swap as the literal instance
Apply renames with one general rule: before any rename whose target name is currently taken, free that name first. Give the inverted State-B case as the literal worked instance — rename the canonical `origin` → `upstream` FIRST (to free `origin`), THEN rename the fork → `origin` — because `git remote rename` errors (exit status 3) if the target name already exists and makes no change on failure. When both remotes carry other names and both target names are free, the renames are independent and ordering is irrelevant; the general rule degenerates to "no special ordering," so no per-edge-state prose is needed. Include a comprehensiveness reassurance so the orchestrator does not invent follow-up steps: `git remote rename` migrates the remote-tracking refs, the `branch.<name>.remote` tracking config, and the entire `remote.<old>.*` section, so fetch/push/pull keep working with no further action (it does not change `branch.<name>.merge`, which is remote-agnostic).
**Traces to:** R7, R8; AC6, AC7; E1, E2, E3.

### D-E7 — Reactive benign-exception caveat on the comprehensiveness note
Surface the non-default-refspec edge case as a brief reactive caveat attached to the comprehensiveness note: a non-default, hand-edited fetch refspec pointing outside `refs/remotes/<old>/*` is not rewritten — git prints a warning and exits 0, leaving that refspec as-is; it is rare and benign, so do not treat the warning as an error or block on it. Phrase it conditionally ("if git prints this warning, it's benign; proceed"), never as an instruction to inspect refspecs first, so an LLM orchestrator does not induce a defensive pre-scan. There is no dedicated AC for this case, so a single benign-exception clause meets the "account for it" bar; a dedicated procedure would be disproportionate.
**Traces to:** E7.

### D-CAPTURE — Additive Capture changes plus authority statement plus worked example
The Capture block already keys by role (`upstream`, `fork`) with a name and URL each, satisfying AC4's structural half, so the edit is additive, not a restructure. Add three things: (1) clarify the recorded name per role is the RESOLVED (post-decision) name — `origin`/`upstream` if the owner accepted the rename, or the existing names if declined; (2) an authority statement with two coupled clauses — the recorded `name` is authoritative and downstream operations resolve the role to it (naming the clean-branch push to the upstream remote and the run-close-out push of the pipeline branch to the fork remote as notable examples), AND fork-mode pushes are always explicit-by-remote (`git push <remote> <branch>`), never relying on a default remote; (3) one format-light worked example using the DECLINED/non-standard case (e.g. role `fork` → name `myfork`, role `upstream` → name `canonical`) so the role key and the resolved name are VISIBLY different, making the role-vs-literal distinction unmissable. Describe the fork-push consumer generically rather than cross-referencing a `.rp.md` path, keeping the shipped doc self-contained. Do not edit line 121 (it must stay role-based, per R5) and do not edit `.rp.md`.
**Traces to:** R4, R5; AC4; E4.

### D-SCOPE — Containment to a single file with explicit fences
The only edits are within `setup.md`: thin line 129, insert the new step at line 135, and the additive Capture/authority/worked-example changes. Everything else is referenced but untouched: the fork-mode explanation block (lines 112–123, including line 121), "Define the upstream PR transformation" (lines 136–146), and the create-fork sub-path (lines 130–134) stay as-is; `artifacts-in-repo` mode, `.rp.md`, `pi.md`, `pipeline-versioning.md`, agent definitions, and `CONTRIBUTING.md` are not modified. The latent upstream-write-access gap and fork-of-a-fork chains are explicitly not addressed; they are observations only.
**Traces to:** O1, O2, O3, O4, O5; AC9.

## Dependencies

- **`setup.md` structure.** The design depends on the current line geography: the soft hint at line 129, the create-fork sub-path at lines 130–134, the clean blank-line seam at line 135, and the Capture block at lines 148–155. Both upstream paths run `git remote -v` before reaching line 135, so the new step has the remote URLs it needs in both branches.
- **`gh` CLI (optional, non-gating).** Auto-detection uses `gh repo view <remote-url> --json isFork,parent`. `gh` is an enhancement only; its absence, lack of auth, or any nonzero exit routes to the owner-confirmation floor, so the design carries no hard runtime dependency on it.
- **`git remote rename` semantics.** The rename ordering and comprehensiveness reassurance depend on documented git behavior: exit status 3 on target-name collision (no change made), and migration of remote-tracking refs, `branch.<name>.remote`, and the entire `remote.<old>.*` section on success, with a warning-and-exit-0 for a non-default hand-edited fetch refspec.
- **The role abstraction in downstream prose.** The "record resolved names, resolve role→name downstream" data flow depends on every downstream remote reference already being role-based (`upstream` / `fork`). This abstraction already exists, which is why no downstream prose or `.rp.md` edit is required.

## Failure Modes and Observability

This is a documentation/instruction change, so "failure modes" are the runtime conditions the produced instructions must steer the orchestrator through, and "observability" is the signal the orchestrator branches on.

- **Auto-detection inconclusive or unavailable (E6).** Non-GitHub host, offline, no auth, any nonzero `gh` exit, no fork relationship, parent not among the configured remotes, or more than two ambiguous remotes. Handling: fall back to asking the owner; never guess. Signal: a non-single/unambiguous pairing, or any nonzero `gh` exit.
- **Confusingly-named inverted remotes (no-op false positive).** A remote literally named `origin` pointing at the canonical repo. Handling: the no-op check runs over resolved roles, not raw names, so this routes to a rename recommendation rather than a silent no-op. Signal: resolved fork-role name ≠ `origin` despite a remote named `origin` existing.
- **Rename target-name collision (E2, State B).** `git remote rename` exits with status 3 and makes no change when the target name is taken. Handling: free the target first (rename canonical `origin` → `upstream` before fork → `origin`). Signal: exit status 3 with an `error: remote <name> already exists.` message.
- **Non-default fetch refspec warning (E7).** `git remote rename` warns and exits 0, leaving the hand-edited refspec stale. Handling: treat as benign; proceed. The normal success path (exit 0) already handles this with no extra branch; the caveat exists only to pre-empt misreading the warning as a failure. Signal: a `warning:` line on stderr with exit 0 (contrast the collision case's `error:` and exit 3).
- **Owner declines the rename (E4).** Handling: keep the existing remote names and record them as the resolved names; nothing breaks because all downstream references are role-based and resolve through the recorded `name`.

## Risks and Open Questions

Open questions: none. All design topics were resolved with verification during the design phase.

Risks (all low):

- **R-1 — Worked example mistaken for a mandated schema.** Mitigated by rendering it format-light/illustrative in the existing prose register, consistent with `.rp.md` being described as human-readable Markdown rather than a structured data file.
- **R-2 — Collateral edit to the adjacent line-121 / fork-mode explanation, or accidental removal of the create-fork sub-path or the confirm-role guarantee.** Mitigated by the three explicit fences in D-SCOPE; these areas are reference-only. Editing line 121 to hardcode a name would contradict R5, so leaving it role-based is required, not merely permitted.
- **R-3 — Over-specifying the `gh` command as a contract.** Mitigated by D-AUTO's illustrative-command plus binding-behavior altitude, matching the line-132 register.
- **R-4 — The E7 caveat inducing an unnecessary refspec pre-check.** Mitigated by D-E7's reactive-not-proactive framing (condition on the warning, never a pre-scan).
- **R-5 — No-op false positive via the canonical-named-`origin` trap.** Mitigated by D-FLOW evaluating the no-op over resolved roles, not raw names.
