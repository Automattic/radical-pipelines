# Spec — Recommend standard remote names when setting up artifacts-in-fork mode

## Overview

Radical Pipelines can store its artifacts either in the project's own repository (`artifacts-in-repo` mode) or in a separate fork (`artifacts-in-fork` mode). The setup flow that captures this choice lives in the shipped reference document `skills/radical-pipelines/reference/conventions/setup.md`, under the **Artifact storage (required)** convention.

In `artifacts-in-fork` mode, setup must identify two git remotes — the **fork** (where all artifact-bearing pipeline work happens) and the **canonical/upstream** repository (where the eventual PR is opened) — and record them so later phases can push and open PRs against the right place.

Today, the "Identify the remotes" step only asks the owner to confirm which existing remote plays which role and then records whatever names already exist. It offers a soft, non-binding hint that `origin` is "usually" the fork and `upstream` "usually" the canonical, but it never recommends a naming scheme and never offers to rename anything.

This feature changes that setup step so the orchestrator:

1. **Recommends the GitHub-standard naming scheme** — fork remote named `origin`, canonical/upstream remote named `upstream` — which matches GitHub's documented fork convention, matches `gh repo fork`'s own default, and is the safest mapping for artifact-branch pushes.
2. **Presents it as a recommendation the owner can decline**, with concrete example wording. The owner stays in control of their local git configuration.
3. **Never renames a remote silently.** Because `git remote rename` mutates the owner's local git config, the orchestrator must obtain explicit owner approval before any rename.
4. **Records the resolved (final) remote names** — whatever names end up in use after the owner's decision — into the captured fork-mode config, so downstream steps reference them unambiguously.

To make the recommendation concrete, the orchestrator attempts to auto-detect which remote is the fork and which is the canonical (using `gh` fork/parent data), and in every ambiguity or failure case falls back to asking the owner — preserving today's "always confirm the role assignment" guarantee.

**Scope of the change.** This is a documentation/instruction change to a single shipped reference document: `skills/radical-pipelines/reference/conventions/setup.md`, specifically the `artifacts-in-fork` branch of the **Artifact storage (required)** convention — the "Identify the remotes" block (currently lines 127–134) and the "Capture" block (currently lines 148–156). It is not application code. No agent definitions, no other reference documents, and no application code change. (Every downstream reference to a remote already uses the logical ROLE — `upstream` / `fork` — and resolves through the captured config; there are no hardcoded literals in the pipeline logic that would break on non-standard names. The role abstraction already exists.)

`artifacts-in-repo` mode is unaffected — it records no remotes.

## Requirements

### R1 — Recommend the GitHub-standard naming scheme

During `artifacts-in-fork` setup, after identifying which configured remote plays which role, the setup document instructs the orchestrator to recommend the conventional scheme: **the fork remote → `origin`, the canonical/upstream remote → `upstream`.**

### R2 — Phrase it as a decline-able recommendation

The setup document presents the scheme as a recommendation the owner can accept or decline, including concrete example wording such as: *"By default we recommend naming them this way. Do you want us to rename them, or leave them as they are?"* The owner stays in control.

### R3 — Never rename silently; always confirm first

Because `git remote rename` changes the owner's local git configuration, the setup document instructs the orchestrator to obtain explicit owner approval before renaming any remote. It never renames on its own.

### R4 — Record the resolved (final) remote names

Whatever names end up in use after the owner's decision — whether the owner accepted the rename (so the remotes become `origin` / `upstream`) or declined (so they keep their existing names) — are written into the captured `artifacts-in-fork` config so downstream steps reference them unambiguously. The captured config keys remotes by ROLE (`upstream`, `fork`) and stores a `name` + URL per role; the recorded `name` field is the resolved remote name.

### R5 — Make the recorded `name` field explicitly authoritative downstream

The setup document makes clear that the recorded `name` per role is the source of truth that downstream operations resolve through — in particular the clean-PR-branch push to the upstream remote (the "Pushes the clean branch directly to `upstream`" step) and the run-close-out push of the pipeline branch to the fork remote. Downstream prose continues to refer to remotes by ROLE (`upstream` / `fork`), resolving the role to the recorded name; pushes in fork mode are always explicit-by-remote (`git push <remote> <branch>`), never relying on a default remote.

### R6 — Attempt role auto-detection, with owner-confirmation as the guaranteed floor

To make the recommendation concrete, the setup document instructs the orchestrator to attempt to auto-detect which remote is the fork and which is the canonical, using `gh` fork/parent data (querying each remote's URL, e.g. `gh repo view <remote-url> --json isFork,parent`, and composing the parent identity as `parent.owner.login` + `/` + `parent.name`; `gh` normalizes raw remote URLs itself, so no manual URL parsing is required). The fork is the remote whose `isFork == true` and whose parent equals the other remote's `owner/repo`; the canonical is that parent.

- If exactly one unambiguous fork↔canonical pairing is found, the orchestrator presents a concrete recommendation naming which remote is which and the proposed renames.
- In EVERY ambiguity or failure case, the orchestrator falls back to asking the owner which remote is which. It never guesses. The fallback cases include at least:
  - neither remote is a fork of the other (unrelated repos, or both forks of a third);
  - both remotes point at the same repository;
  - a non-GitHub host (GitLab, Bitbucket, unauthenticated self-hosted, etc.);
  - offline, no `gh` auth, API error, or any other nonzero `gh` exit;
  - the fork's parent is a third repository not among the configured remotes;
  - more than two remotes with no single clear pairing.

### R7 — Apply the rename safely, respecting name-collision ordering

When the owner accepts the recommendation, the setup document instructs the orchestrator to apply the renames safely. Because `git remote rename` ERRORS (exit status 3) if the target name already exists, the orchestrator must **free the target name first**. In the common inverted state (`origin` = canonical, the fork under another name), applying the scheme is a two-rename swap and order matters: rename the canonical `origin` → `upstream` BEFORE renaming the fork → `origin`. More generally, whenever any rename's target name is currently taken, the orchestrator frees that name first. The document may note that `git remote rename` is otherwise comprehensive (it migrates remote-tracking refs, `branch.<name>.remote` tracking config, and the entire `remote.<old>.*` section), so push/pull keep working with no further action.

### R8 — Detect and skip the no-op case

When the remotes already match the recommended scheme (fork = `origin`, canonical = `upstream` — the state produced by `gh repo fork` and by the common "clone your own fork, add upstream" flow), the setup document instructs the orchestrator to recognize it, make no rename recommendation, and simply record the names.

### R9 — Replace the soft naming hint, preserving the confirm-the-role guarantee

The existing non-binding sentence ("By default `origin` is usually the fork and `upstream` the canonical repo, but do not assume — always confirm") is superseded by the recommend-and-(optionally-)rename flow above. The "always confirm the role assignment with the owner" guarantee is retained — now expressed as the auto-detection fallback floor (R6).

## Out of Scope

- **O1 — Parameterizing downstream literal references.** Unnecessary; the role abstraction already exists. No agent definitions, `pi.md`, `pipeline-versioning.md`, or application code change.
- **O2 — The latent upstream-write-access assumption.** Fork mode's PR flow (push the clean branch directly to `upstream`) silently assumes the owner has write access to the canonical repository. This is a pre-existing documentation gap, independent of this feature, neither introduced nor resolved here. Surfaced only as an observation for a separate issue.
- **O3 — `CONTRIBUTING.md`'s literal `git push origin` references.** These are radical-pipelines' own maintainer release/changeset instructions, unrelated to the orchestrator's fork-mode handling. Not touched.
- **O4 — `artifacts-in-repo` mode.** Unchanged. It records no remotes.
- **O5 — Fork-of-a-fork chains.** Handling multi-level fork networks (the ultimate root of a fork network vs. the immediate parent) is beyond this feature; auto-detection targets the single-level fork↔parent relationship and otherwise falls back to asking the owner (R6).

## Acceptance Criteria

The artifact produced by this pipeline is the edited `skills/radical-pipelines/reference/conventions/setup.md`. The criteria below are checkable against that produced document.

### AC1 — Recommends the standard scheme (R1)

- **Given** the `artifacts-in-fork` "Identify the remotes" section of `setup.md`,
- **When** a reader follows it after identifying which remote plays which role,
- **Then** it instructs the orchestrator to recommend naming the fork remote `origin` and the canonical/upstream remote `upstream`.

### AC2 — Decline-able recommendation with example wording (R2)

- **Given** the recommend step in `setup.md`,
- **When** a reader reads how the recommendation is presented to the owner,
- **Then** it is phrased as a recommendation the owner can accept or decline, including concrete example wording (e.g. an offer to rename the remotes or leave them as they are).

### AC3 — Never renames silently; explicit approval required (R3)

- **Given** the recommend-and-rename flow in `setup.md`,
- **When** a reader reaches the point where a rename would occur,
- **Then** the document states the orchestrator must obtain explicit owner approval before any rename and never renames silently.

### AC4 — Records the resolved names, with `name` authoritative (R4, R5)

- **Given** the "Capture" block of the `artifacts-in-fork` config in `setup.md`,
- **When** the owner has either accepted or declined the rename,
- **Then** the document instructs recording the resolved (post-decision) remote names, keyed by role (`upstream`, `fork`) with a `name` + URL per role, and makes clear that the recorded `name` field is the authoritative value that downstream operations (notably the clean-branch push to the upstream remote and the run-close-out push of the pipeline branch to the fork remote) resolve through.

### AC5 — Auto-detection with owner-confirmation fallback floor (R6)

- **Given** the "Identify the remotes" section of `setup.md`,
- **When** a reader reads how the orchestrator determines which remote is the fork and which is the canonical,
- **Then** the document describes attempting `gh`-based fork/parent auto-detection to produce a concrete recommendation when exactly one unambiguous fork↔canonical pairing exists, and falling back to asking the owner in every ambiguity or failure case (at least: neither remote is a fork of the other; both point at the same repo; a non-GitHub host; offline / no auth / any nonzero `gh` exit; the fork's parent is not among the configured remotes; more than two remotes with no single clear pairing), and states the orchestrator never guesses.

### AC6 — Safe rename ordering for the swap (R7)

- **Given** the rename step in `setup.md`,
- **When** the owner accepts the recommendation from the common inverted state (canonical = `origin`, fork under another name),
- **Then** the document specifies freeing the target name first (rename canonical `origin` → `upstream` before fork → `origin`) and notes that `git remote rename` errors if the target name already exists.

### AC7 — No-op case handled (R8)

- **Given** remotes that already match the recommended scheme (fork = `origin`, canonical = `upstream`),
- **When** the orchestrator runs "Identify the remotes,"
- **Then** the document instructs it to recognize the already-standard state, propose no rename, and simply record the names.

### AC8 — Old soft hint superseded, confirm-the-role guarantee retained (R9)

- **Given** the produced `setup.md`,
- **When** compared against the current line "By default `origin` is usually the fork and `upstream` the canonical repo, but do not assume — always confirm,"
- **Then** that soft hint is replaced/superseded by the recommend-and-(optionally-)rename flow, while the guarantee that the orchestrator always confirms the role assignment with the owner is preserved (as the auto-detection fallback floor).

### AC9 — Scope is contained (O1, O3, O4)

- **Given** the full diff produced by this pipeline,
- **When** the changed files are inspected,
- **Then** only `skills/radical-pipelines/reference/conventions/setup.md` is modified for this feature; `artifacts-in-repo` mode is unchanged; and no other reference document, agent definition, `CONTRIBUTING.md`, or application code is modified.

### Edge cases the produced document must account for

- **E1 — Already-standard (State A):** fork = `origin`, canonical = `upstream` → no-op, just record (AC7).
- **E2 — Inverted (State B):** canonical = `origin`, fork under another name → recommend the two-rename swap with safe ordering (AC6).
- **E3 — Both non-standard names** (e.g. `mine` / `theirs`) → recommend renaming each to its standard name, applying free-target-first ordering for any collision.
- **E4 — Owner declines the rename** → record the existing actual names as the resolved names; downstream resolves through the recorded `name` field. Nothing breaks, because all downstream references are role-based.
- **E5 — No fork exists yet / single remote** → the existing "create a fork" branch still applies; a fork created via `gh repo fork` lands already-standard (no-op), while a fork added manually afterward may land inverted (State B) and gets the recommendation.
- **E6 — Auto-detection cannot conclude** (non-GitHub host, offline / no auth, no fork relationship, parent not among remotes, more than two ambiguous remotes) → fall back to asking the owner (AC5).
- **E7 — Non-default hand-edited fetch refspec** pointing outside `refs/remotes/<old>/*` → `git remote rename` warns and leaves it stale (exit 0). Rare and benign; the orchestrator need not block on it and should not treat the warning as an error.
