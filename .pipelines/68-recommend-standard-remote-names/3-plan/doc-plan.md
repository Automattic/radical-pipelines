# Doc plan — Recommend standard remote names when setting up artifacts-in-fork mode

## What shipped (the change this plan documents)

The code phase makes a single-file documentation/instruction change to one shipped reference document:

- **`skills/radical-pipelines/reference/conventions/setup.md`** — the `artifacts-in-fork` branch of the **Artifact storage (required)** convention.

The new behavior: when an owner sets up `artifacts-in-fork` mode, the orchestrator now (1) recommends the GitHub-standard remote naming scheme — fork remote `origin`, canonical/upstream remote `upstream`; (2) presents it as a decline-able recommendation with example wording; (3) never renames a remote without explicit owner approval (because `git remote rename` mutates the owner's local git config); (4) records the resolved (post-decision) remote names into the captured config, with the recorded `name` per role made explicitly authoritative for downstream role→name resolution; (5) attempts `gh` fork/parent auto-detection to propose the role assignment, always falling back to owner confirmation; (6) applies renames with free-target-first ordering; and (7) detects and skips the already-standard no-op case. (See `1-spec/spec.md` R1–R9 and `3-plan/code-plan.md` Tasks 1–4.)

This is a behavior-adding change to a SHIPPED reference document. That distinction matters for the doc plan: the changed file is itself the product surface a consumer reads, so the code phase already authored the user-facing instruction text. This doc plan covers the OTHER surfaces in the repository that describe, summarize, announce, or cross-reference this behavior and would fall out of sync — not a re-documentation of `setup.md` itself.

## Sweep result — surfaces examined and verdicts

A repository-wide sweep was performed for any text referencing the affected behavior (the `artifacts-in-fork` setup flow, remote naming, the identify-the-remotes step, the conventions/setup process, or literal `origin`/`upstream` remote names tied to setup). Findings:

| Surface | Verdict | Why |
| ------- | ------- | --- |
| `README.md` | **Needs a follow-on check (Task D1)** | Describes the setup flow generically (the interactive setup, the merged `.rp.md`, "push behavior" as a `.rp.md` topic). Does NOT currently describe remote naming or the identify-the-remotes step. AGENTS.md mandates README updates on code change, so a deliberate accuracy check is required even though it is expected to be a light or no-op touch. |
| `.changeset/<entry>.md` (new) | **Required (Task D2)** | AGENTS.md mandates a committed changeset for every repository change, and the Changeset Gate workflow (`.github/workflows/changeset-gate.yml`) FAILS the PR when a release-relevant change (matching `changedFilePatterns`, which includes `skills/**`) lacks a changeset. The code change lives under `skills/`, so a changeset is mandatory, not optional. |
| `website/` (`index.html` and the rest) | **No change** | Marketing content describing phases and artifacts at a conceptual level. Contains no fork-mode, remote-naming, setup-flow, or `.rp.md` prose. Nothing drifts. |
| `AGENTS.md` | **No change** | States the cross-agent mandates (update README on code change; record a changeset). It is the SOURCE of two doc obligations below, not itself a surface describing remote naming. Nothing in it drifts. |
| `CONTRIBUTING.md` | **No change** | Its only remote references are maintainer release/changeset instructions (`git push origin trunk`, `changeset status --since=origin/<base>`). These are radical-pipelines' own release mechanics, unrelated to the orchestrator's fork-mode remote handling (spec O3). Nothing drifts. |
| Other `skills/.../reference/` docs (`conventions/load.md`, `conventions/pi.md`, `pipeline-versioning.md`) and the dogfood `.rp.md` | **No change** | They reference fork mode by logical ROLE (`upstream` / `fork`) or generically ("the remote", "the fork's main", "push the pipeline branch to the remote"). None hardcode a literal remote name keyed to setup's naming, so none drift when setup's recommended names change. `load.md` points at `setup.md` only to invoke the setup flow; `pi.md` references `artifacts-in-fork` only for agent install placement. Confirmed: no shipped doc outside `setup.md` hardcodes `origin`/`upstream` as a push target. |

Two surfaces therefore need documentation work: the changeset (mandatory) and a README accuracy check (mandated by AGENTS.md, light). No other surface is invented; no real reference is silently skipped.

## Conventions

- Artifact folder: `.rp/pipelines/68-recommend-standard-remote-names/`. This plan lives at `3-plan/doc-plan.md`.
- Commit format: imperative mood, sentence case, no trailing period, agent name in parentheses — e.g. `Add doc plan (doc-plan-writer)`.
- The doc-writer (phase 5) fills in exact wording by reading the SHIPPED `setup.md` change. This plan specifies files, sections, audiences, and acceptance criteria only. It does NOT prescribe final prose, command flags, or line numbers.
- Hard fence (inherited from the code plan's D-SCOPE / AC9): the doc-writer must not edit `setup.md` itself, any other shipped reference document, agent definitions, `.rp.md`, `pi.md`, `pipeline-versioning.md`, `CONTRIBUTING.md`, the website, or application code. The doc surfaces in scope are exactly the changeset entry and (if warranted) `README.md`.

---

## Task D1 — Verify and, if needed, update `README.md` for the new fork-mode setup behavior

**File:** `README.md`

**Audience:** Prospective and current Radical Pipelines users and contributors evaluating or operating the skill — readers who learn what the setup flow does and how artifact storage / fork mode works from the README, without opening the reference docs.

**Why this task exists:** AGENTS.md states "Whenever any task is performed that changes the code in this repository, the README.md must be updated to keep it up to date." The shipped change adds user-visible behavior to the setup flow (remote-name recommendation, opt-in rename, resolved-name capture). This task is the deliberate AGENTS.md-mandated check that the README does not now describe the setup/artifact-storage flow in a way that is incomplete or contradicted by the shipped behavior.

**What to do:**
1. Read the shipped `setup.md` change (the source of truth for what actually shipped) and the spec overview, so the README's claims can be checked against real behavior.
2. Locate every README passage that describes the interactive setup flow, the `.rp.md` conventions, artifact storage, fork mode, or push behavior (notably the "conventions / setup flow" prose and the `.rp.md` shared-section description that lists "push behavior"). Confirm each remains accurate after the change.
3. The README currently describes setup and artifact storage at a level ABOVE remote naming (it does not enumerate the identify-the-remotes step). Preserve that altitude. Only add or adjust text where the README would otherwise be inaccurate or misleadingly incomplete about the shipped behavior. Do NOT lift `setup.md`'s step-level remote-naming mechanics into the README — that would duplicate the reference and create a new drift surface.
4. If, after this check, the README needs no change to stay accurate, make no edit and record that conclusion (in the PR / changeset narrative), satisfying the AGENTS.md mandate by deliberate verification rather than a cosmetic edit.

**Acceptance criteria (observable, drift-resistant):**
- The README has been checked against the shipped `setup.md` behavior; no README statement about the setup flow, artifact storage, fork mode, or push behavior contradicts or misrepresents the shipped change.
- Any edit made stays at the README's existing altitude (conceptual overview), and does NOT reproduce `setup.md`'s remote-naming procedure, command flags, or the identify-the-remotes mechanics.
- The README's structure, headings, and unrelated content are otherwise unchanged.
- The outcome (edited, or verified-no-change-needed) is explicitly recorded so the AGENTS.md README mandate is demonstrably satisfied.

**Traces to:** AGENTS.md README mandate; spec R1–R9 (the shipped behavior the README is checked against); code-plan Tasks 1–3.

---

## Task D2 — Add a Changesets entry for the change

**File:** a new `.changeset/<descriptive-name>.md` (Changesets-format Markdown with YAML front matter).

**Audience:** Two audiences. (1) The release tooling and reviewers — the Changeset Gate workflow validates the changeset's shape and requires its presence for release-relevant changes; the entry becomes a `CHANGELOG.md` line at version time. (2) Future readers of the changelog / GitHub Release — users and contributors who want to know what changed and why in this release.

**Why this task exists:** AGENTS.md mandates a committed changeset for every repository change, and `.github/workflows/changeset-gate.yml` fails the PR when a change touching `changedFilePatterns` (which includes `skills/**`, where this change lives) has no changeset. This is a required surface, not optional.

**What to do:**
1. Read the shipped `setup.md` change and confirm the package name and bump conventions:
   - Package name keyed in the front matter is `@automattic/radical-pipelines` (match the exact name used in the existing `.changeset/*.md` entries and `package.json`).
   - Choose the semver bump per AGENTS.md / CONTRIBUTING (pre-1.0 policy): this is a backward-compatible behavior addition to the setup flow (new recommendation + opt-in rename + resolved-name capture; no existing convention removed, `artifacts-in-repo` untouched), which is a feature, not a behavior-preserving fix. Select the bump type the project's pre-1.0 policy assigns to a backward-compatible feature, consistent with how the existing `.changeset/*.md` entries are typed.
2. Write the changeset body as a user-facing summary of WHAT changed and WHY, in the register of the existing entries (`automate-releases.md`, `restructure-repository-layout.md`): a short prose paragraph, not a task list. It should convey that `artifacts-in-fork` setup now recommends the standard `origin`/`upstream` remote names, offers an opt-in rename (never silent, explicit approval required), and records the resolved remote names as authoritative for downstream pushes — at a user-outcome altitude, not a line-by-line diff recap.
3. Keep it scoped to THIS change. Do not describe unrelated features.
4. Name the file descriptively (consistent with the existing human-named changeset files, e.g. a slug like `recommend-standard-remote-names.md`), not a random Changesets-generated id, matching the repo's existing convention of hand-named entries.

**Acceptance criteria (observable, drift-resistant):**
- A single new `.changeset/*.md` file exists with valid Changesets front matter keying `@automattic/radical-pipelines` to a bump type, and passes the repo's changeset shape validator (`scripts/validate-changesets.mjs`) and the Changeset Gate.
- The bump type matches the project's pre-1.0 policy for a backward-compatible feature and is consistent with the typing of the existing `.changeset/*.md` entries.
- The body accurately and concisely summarizes the shipped behavior change (standard remote-name recommendation, opt-in non-silent rename, resolved-name capture) at a user-outcome altitude, in the prose register of the existing changeset entries.
- The entry is scoped to this change only and references no unrelated work.
- No existing changeset file is modified.

**Traces to:** AGENTS.md changeset mandate; `.github/workflows/changeset-gate.yml`; spec R1–R9 (the change being announced).

---

## Ordering

D1 and D2 are independent and may be done in either order. Both depend only on the shipped `setup.md` change from phase 4 being present so their claims can be verified against real behavior. Recommended order: D1 (README accuracy check) then D2 (changeset), so the changeset body and any README phrasing stay consistent.

## Out of scope for the doc phase (do NOT document)

- **`setup.md` itself** — authored by the code phase; re-documenting it here would duplicate the product and create drift. The doc-writer reads it as source of truth but does not edit it.
- **`website/`** — no fork-mode / remote / setup prose exists to drift; do not add any.
- **`CONTRIBUTING.md`** — its `git push origin` lines are maintainer release mechanics (spec O3), unrelated to orchestrator fork-mode; untouched.
- **Other shipped reference docs and the dogfood `.rp.md`** — they reference fork mode by ROLE or generically and do not drift; untouched (this matches code-plan AC9's containment fence).
- **The latent upstream-write-access gap (O2) and fork-of-a-fork chains (O5)** — explicitly out of scope per the spec; do not add prose addressing them anywhere.

## Traceability summary

| Doc task | Surface | Driven by | Verified against |
| -------- | ------- | --------- | ---------------- |
| D1 | `README.md` | AGENTS.md README mandate | shipped `setup.md`; spec R1–R9 |
| D2 | new `.changeset/*.md` | AGENTS.md changeset mandate + Changeset Gate | shipped `setup.md`; spec R1–R9; existing `.changeset/*.md` register |

Every required surface uncovered by the sweep is covered: the mandatory changeset (D2) and the AGENTS.md-mandated README accuracy check (D1). Surfaces that genuinely do not drift (website, CONTRIBUTING, other reference docs, `.rp.md`, AGENTS.md) are recorded as no-change with the reason, not silently skipped and not invented into tasks.
