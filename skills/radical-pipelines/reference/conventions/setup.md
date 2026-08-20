# Setup Conventions

Use this setup flow when required conventions are missing before a workflow starts.

Do not continue the workflow. Tell the owner:

- Radical Pipelines requires project conventions before it can run.
- Which conventions were found.
- Which required conventions are still missing.

Ask whether the owner wants to run setup now. If they decline or cancel, stop and summarize the missing conventions.

To run the setup, follow these steps:

## 1. Read the specific agentic coding tool rules

Determine the active agentic coding tool used in this conversation and read the relevant file first.

Radical Pipelines supports the following agentic coding tools:

| Tool        | Read             |
| ----------- | ---------------- |
| Claude Code | `claude-code.md` |
| opencode    | `opencode.md`    |

## 2. Collect required conventions

Ask for the required information in a clear sequence, one convention at a time. Specify if they are required or optional, and provide examples or suggestions when possible.

If a convention must be of a specific form due to the agentic coding tool's rules and does not require user input, simply inform the owner with a message explaining that convention and proceed to the next one.

### Branch name base (required)

The format of the `<branch-base>` — the stem every branch of an issue's pipeline family starts with. The skill's branch grammar appends every other segment.

The format must be:

- **Deterministic from the issue** — given an issue, the orchestrator can enumerate the family's branches from the base alone.
- **A valid git ref** — it may contain slashes for namespacing, and must not contain `_` (reserved as the grammar's segment separator).
- **Robust against collisions** — one family's branches can never be confused with another's, even for similar issues.

Suggested default: `<issue-id>-<short-description>`.

### Pipeline family folder (required)

The single folder holding the artifacts of all of an issue's pipelines, identical across forks. Like the branch base, it must be deterministic from the issue and robust against collisions.

Ask the owner for the location and naming pattern.

Suggested default: `.pipelines/<branch-base>/`.

### Issues (required)

Where the project tracks issues. Each pipeline pulls its initial intent from an issue, so the orchestrator needs a way to read them in full — body and all comments — comment on, and update them.

Ask the owner where issues are tracked and how to access them (a CLI, an API, files in a repository folder, etc.).

### Worktree root (required)

The root path under which the orchestrator creates one worktree per branch with raw `git worktree`, and from which it removes each worktree when its work is done.

Suggested default: `.worktrees/`.

### Commit format

The project's commit message format. Passed verbatim to every spawned agent so all commits in a pipeline match the project's style.

Ask the owner for the format and capture at least one concrete example.

Suggested default: `<commit-description> (<agent-name>)`.

### Team spawning (required)

How agents are spawned, addressed, seated in their assigned worktree, and terminated when their work ends.

This is highly dependent on the agentic coding tool but you can document the existing tools and store them as a convention so the research doesn't need to be done on each run.

### Agent models

Which model — and optional settings such as reasoning `effort` — each spawned agent runs on.

- A reserved `**Default:**` bullet expresses the project-wide default.
- Each configured agent is a `**<agent-name>:**` bullet keyed by the exact agent name (e.g. `spec-reviewer`, `build-reviewer`).

Values are tool-native and opaque — the orchestrator passes them to the spawn mechanism verbatim, so the same logical choice may need a different string per tool:

- A bare alias or first-party ID: `<alias>`.
- A provider-qualified form: `<provider>/<model>`.

Alternatively, a project may key models by a difficulty tier the owner picks at run start — a table of agent × tier — resolved to the tool-native value before spawning.

### Health monitoring (required)

How the orchestrator launches a recurring monitor in the autonomous workflow to detect stalls, message failures, login errors, network errors, and so on.

This is highly dependent on the agentic coding tool but you can document the existing tools and store them as a convention so the research doesn't need to be done on each run. Try to document the commands to start, list, and cancel this monitoring.

### Guardrails

**Why they matter.** Guardrails are backpressure: rules that reject incomplete work, so an agent has to produce concrete evidence instead of "I think it works," and keeps iterating until every rule it is named by is satisfied. Without them, "done" is a claim; with them, it is a verified state.

**What to consider.** Rules that run a check — unit tests, lint, typecheck, build, format, audit, e2e — and judgment rules the project wants enforced on any agent's work. Ask the owner which rules the project's work must satisfy. Offer to investigate.

**Capture per guardrail** as the per-guardrail block defined in `../guardrails.md`, asking the owner for each field.

**Offer to help test each guardrail** and ensure it is well written.

### Lifecycle hooks

The hook points, execution rules, and the per-hook block live in `../lifecycle-hooks.md`. Show the owner the hook points and ask which need instructions; capture each as its per-hook block.

### Artifact storage (required)

How this project stores Radical Pipelines artifacts.

Running Radical Pipelines creates three kinds of files that need a home:

- The project-level `.rp.md` config file (the conventions captured during this setup).
- The pipeline family folder containing the run folders and their phase artifacts.
- A `.gitignore` entry for the worktree root.

They can live either in the project's repository alongside the code, or in a separate fork. The fork option is used when the project does not accept these kinds of commits, or when the owner wants to keep the pipeline workflow private.

Explain this and ask the owner:

> Can `.rp.md`, the pipeline family folder, and any related `.gitignore` entries be committed directly to this repository?

**If yes**, the mode is `artifacts-in-repo`. Everything lives in a single repository — no further information needed for this convention.

**If no** (the repository belongs to someone else, or upstream does not accept non-code changes), the mode is `artifacts-in-fork`. Before asking for any further information, explain how this mode works:

- A fork of the repository is required. All artifact-bearing pipeline work happens on branches in the fork.
- `.rp.md`, the pipeline family folder, and per-phase commits live in the fork only. They are never pushed to `upstream`.
- The upstream PR is never opened without explicit owner approval.
- When the owner approves opening a PR, the orchestrator performs the upstream PR transformation in `../closure-actions.md`: only code commits reach `upstream`, on a clean branch — viewers of the PR never see the fork, and if the fork is private, its existence is hidden entirely.

Then collect the information needed to operate in fork mode:

**Identify the remotes.** Run `git remote -v` to list the configured remotes.

- If two or more remotes are configured, ask the owner to confirm which one is the upstream (canonical) repository and which one is the fork (where Radical Pipelines work happens).
- If only one remote is configured or no fork exists, a fork must be created. Ask the owner two things in sequence:
  - Whether the fork should be **public** or **private**. A private fork keeps the artifact-bearing branches out of public view; the PR itself reveals nothing about the fork either way.
  - To create the fork on the repository's hosting platform (private if that was chosen) and add it as a remote.

Wait for confirmation, then re-run `git remote -v` and confirm the assignment.

**Recommend the standard remote names.** Recommend naming the fork remote `origin` and the canonical repository's remote `upstream`, unless they already are. Never rename a remote without the owner's explicit approval; if they decline, record the current names.

**Define the upstream PR transformation.** Ask the owner for:

- **Upstream branch format**: the name of the cherry-pick branch pushed to `upstream` as the PR source. Can be derived from the `<branch-base>`.
- **Upstream commit format**: the message format used for the cherry-picked clean commits. Should follow upstream's contribution guidelines. Can be derived from the fork's commit format.

These are consulted by the orchestrator only, at PR time. They are never passed down to agents.

Suggested defaults:

- Upstream branch: `<branch-base>`.
- Upstream commit: `<commit-description>` (no agent attribution).

Capture:

- `mode`: `artifacts-in-repo` or `artifacts-in-fork`
- For `artifacts-in-fork`:
  - `upstream`: name and URL of the upstream remote
  - `fork`: name and URL of the fork remote
  - Upstream branch format
  - Upstream commit format

## 3. Apply agentic coding tool setup actions

Some agentic coding tools require setup actions beyond conventions.

Consult the active tool's rules file (read in Step 1) for a **Setup actions** section. If it has one, perform the actions described.

Do not create or copy files without explicit confirmation from the owner.

## 4. Confirm writes before changing files

Before writing anything, summarize the proposed `.rp.md` content and ask for explicit confirmation.

The file holds only the conventions this setup defines. Anything beyond them — project-specific facts discovered along the way, extra instructions for the orchestrator — is written only when the owner explicitly asks for it to be captured; under-specifying is the safe default.

- If `.rp.md` does not exist, ask before creating it.
- If it exists, ask before overwriting it. Offer to merge or append only when the owner explicitly chooses that approach.

If any required answer is missing, do not create a misleading complete conventions file. Either stop and explain what is unresolved, or, only if the owner explicitly asks for a draft, write a file that clearly marks unresolved items and state that setup is incomplete.

## 5. Write human-readable Markdown

Write `.rp.md` with the conventions and commit it to the main branch:

- `artifacts-in-repo`: the project's main branch.
- `artifacts-in-fork`: the fork's main branch only — never push it to upstream.

## 6. Set up git ignore

Add the worktree root to `.gitignore` so local working copies are not tracked. This is the only entry Radical Pipelines requires.

Ask the owner for permission, append the entry, and commit it alongside `.rp.md` in the main branch.

Remind the owner that for `artifacts-in-fork`, the `.gitignore` change lives on the fork.

## 7. Finish safely

After setup completes, tell the owner:

- That `.rp.md` was created or updated.
- That future Radical Pipelines runs should read `.rp.md` and skip setup if all required conventions are present.

If setup was cancelled or incomplete, stop the pipeline and clearly list what remains missing.
