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
| Pi          | `pi.md`          |

## 2. Collect required conventions

Ask for the required information in a clear sequence, one convention at a time. Specify if they are required or optional, and provide examples or suggestions when possible.

If a convention must be of a specific form due to the agentic coding tool's rules and does not require user input, simply inform the owner with a message explaining that convention and proceed to the next one.

### Pipeline base slug (required)

The unique identifier for a pipeline.

This convention defines the **pipeline base slug** — the `v1` form. A fork extends it with a `-v<N>` suffix, producing the **pipeline versioned slug**; every name derived from the slug inherits that suffix.

This slug is incorporated into the worktree name, the branch name, the artifacts folder name, etc, so it must be a valid filesystem and git identifier (lowercase, hyphens, no spaces) — and must stay valid and unambiguous with `-v<N>` appended.

The relationship between the issue and the slug must be deterministic: given an issue, the orchestrator must be able to enumerate every pipeline created for it by inspecting slugs alone. This does not require regenerating the full slug from the issue — only a reliable way to find an issue's pipelines.

The slug format must also be robust against collisions between similar identifiers, so the pipelines of one issue can never be confused with those of another.

Suggested default: `<issue-id>-<short-description>`.

### Artifact folder (required)

Where each pipeline's artifacts (`intent.md`, `spec.md`, `design-doc.md`, `code-plan.md`, `doc-plan.md`, etc.) are stored. One folder per pipeline.

Ask the owner for the location and naming pattern.

Suggested default: `.pipelines/<pipeline-slug>/`.

### Commit format

The project's commit message format. Passed verbatim to every spawned agent so all commits in a pipeline match the project's style.

Ask the owner for the format and capture at least one concrete example.

Suggested default: `<commit-description> (<agent-name>)`.

### Issues (required)

Where the project tracks issues. Each pipeline pulls its initial intent from an issue, so the orchestrator needs a way to read them in full — body and all comments — comment on, and update them.

Ask the owner which issue tracker is used (GitHub, Linear, Jira, GitLab, plain Markdown files in a folder, etc.) and how to access it (CLI, MCP server, API token, etc.).

### Worktrees (required)

How worktrees are created, entered, and removed for each pipeline.

Suggested default: `git worktree add .worktrees/<pipeline-slug> && cd .worktrees/<pipeline-slug>` to create and enter, `cd .. && git worktree remove .worktrees/<pipeline-slug>` to exit and remove.

### Branch names (required)

How git branches are named per pipeline.

Ask the owner for the format.

Suggested default: `<pipeline-slug>`.

### Spawning teams of agents

How agents are organized into teams, spawned, and addressed across orchestrator sessions.

This is highly dependent on the agentic coding tool but you can document the existing tools and store them as a convention so the research doesn't need to be done on each run.

### Agent models

Which model — and optional settings such as reasoning `effort` — each spawned agent runs on.

- A reserved `**Default:**` bullet expresses the project-wide default.
- Each configured agent is a `**<agent-name>:**` bullet keyed by the exact agent name (e.g. `spec-writer`, `code-reviewer`).

Values are tool-native and opaque — the orchestrator passes them to the spawn mechanism verbatim, so the same logical choice may need a different string per tool:

- A bare alias or first-party ID, such as `opus` or `claude-opus-4-8`.
- A provider-qualified `provider/model`, such as `anthropic/claude-opus-4-8`.

### Health monitoring (required)

How the orchestrator launches a recurring monitor in the autonomous workflow to detect stalls, message failures, login errors, network errors, and so on. Context-window limits are handled by each tool's own auto-compaction, not by the monitor.

This is highly dependent on the agentic coding tool but you can document the existing tools and store them as a convention so the research doesn't need to be done on each run. Try to document the commands to start, list, and cancel this monitoring.

### Artifact storage (required)

How this project stores Radical Pipelines artifacts.

Running Radical Pipelines creates three kinds of files that need a home:

- The project-level `.rp.md` config file (the conventions captured during this setup).
- A per-pipeline artifact folder containing `intent.md`, `spec.md`, `design-doc.md`, etc. — one folder per pipeline run, per the **Artifact folder** convention.
- A `.gitignore` entry for the worktree folder used by the active agentic coding tool.

They can live either in the project's repository alongside the code, or in a separate fork. The fork option is used when the project does not accept these kinds of commits, or when the owner wants to keep the pipeline workflow private.

Explain this and ask the owner:

> Can `.rp.md`, the artifact folder, and any related `.gitignore` entries be committed directly to this repository?

**If yes**, the mode is `artifacts-in-repo`. Everything lives in a single repository — no further information needed for this convention.

**If no** (the repository belongs to someone else, or upstream does not accept non-code changes), the mode is `artifacts-in-fork`. Before asking for any further information, explain how this mode works:

- A fork of the repository is required. All artifact-bearing pipeline work happens on branches in the fork.
- `.rp.md`, the artifact folder, and per-phase commits live in the fork only. They are never pushed to `upstream`.
- The upstream PR is never opened without explicit owner approval.
- When the owner approves opening a PR, the orchestrator always:
  1. Generates a clean branch name for `upstream` (separate from the fork branch).
  2. Cherry-picks only the code commits from the fork branch — artifact commits are excluded.
  3. Rewrites the cherry-picked commit messages to an upstream-friendly format.
  4. Pushes the clean branch directly to `upstream`.
  5. Opens the PR in `upstream` from that clean branch, using `pr-description.md` as the body.
- The PR's source branch lives in `upstream`, not in the fork — viewers of the PR never see the fork. If the fork is private, its existence is hidden entirely.

Then collect the information needed to operate in fork mode:

**Identify the remotes.** Run `git remote -v` to list the configured remotes.

- If two or more remotes are configured, ask the owner to confirm which one is the upstream (canonical) repository and which one is the fork (where Radical Pipelines work happens).
- If only one remote is configured or no fork exists, a fork must be created. Ask the owner two things in sequence:
  - Whether the fork should be **public** or **private**. A private fork keeps the artifact-bearing branches out of public view; the PR itself reveals nothing about the fork either way.
  - To create the fork (e.g. via `gh repo fork`, then `gh repo edit <owner>/<repo> --visibility private` if private was chosen) and add it as a remote.

Wait for confirmation, then re-run `git remote -v` and confirm the assignment.

**Recommend the standard remote names.** Recommend naming the fork remote `origin` and the canonical repository's remote `upstream`, unless they already are. Never rename a remote without the owner's explicit approval; if they decline, record the current names.

**Define the upstream PR transformation.** Ask the owner for:

- **Upstream branch format**: the name of the cherry-pick branch pushed to `upstream` as the PR source. Can be derived from the fork's branch name format.
- **Upstream commit format**: the message format used for the cherry-picked clean commits. Should follow upstream's contribution guidelines. Can be derived from the fork's commit format.

These are consulted by the orchestrator only, at PR time. They are never passed down to agents.

Suggested defaults:

- Upstream branch: `<pipeline-slug>`.
- Upstream commit: `<commit-description>` (no agent attribution).

Capture:

- `mode`: `artifacts-in-repo` or `artifacts-in-fork`
- For `artifacts-in-fork`:
  - `upstream`: name and URL of the upstream remote
  - `fork`: name and URL of the fork remote
  - Upstream branch format
  - Upstream commit format

### Guardrails

**Why they matter.** Guardrails are backpressure. They are prose rules a change must satisfy, so the agent has to make "done" verified rather than claimed and keeps iterating until each rule holds. Without them, "done" is a claim; with them, it is met against rules the project chose.

**What kinds to consider.** Unit tests, lint, typecheck, build, format, audit, e2e, and any project-specific validators — and a style or content rule an agent satisfies by its own assessment, with no command to run. Ask the owner which of these the project runs and which ones a change must satisfy before it is considered complete. Offer to investigate.

**Capture per guardrail** as the per-guardrail block defined in `reference/guardrails.md`, asking the owner for each field.

**Validate each command guardrail as you capture it.** A judgment guardrail has no command to run; capture it verbatim, the way the commit format is asked for and captured with at least one concrete example rather than validated. Validating a command guardrail immediately lets an unrunnable one be corrected or dropped before the confirm-before-write. Validate a **fixed** command guardrail by running its literal command; validate a **scoped** one by substituting a realistic, made-up `{scope}` into its command and running that. Either way the only question is **did the command run?** — whether its check _passes_ is the agents' concern at run time, not yours; for a scoped command guardrail this confirms the runner resolves.

Sort each command into one of two outcomes:

- **It runs ⇒ write it.** A command whose check currently fails is just today's code state (red tests, mid-development work) and is still written. The bar is that the command runs, not that its check passes.
- **It does not run ⇒ do NOT write it.** Command-not-found, not-executable, or a command that never returns on its own (it hangs or waits for interactive input). Stop it, surface the error to the owner, and offer to (a) fix or replace it, (b) drop the guardrail, or (c) — only if the owner insists the command is correct and the validation environment is the discrepancy — keep it as an escape hatch.

Also:

- **Per-command and independent.** One unrunnable command does not block writing the others or abort the wider capture — drop or correct it and finish the rest.
- **Match the agents' environment as closely as you can reach.** Setup runs in the main checkout, since no worktree exists yet, so validate in at least the project's standard shell and working directory. Perfect parity is impossible but the floor still catches the realistic failures — command-not-found, tool-not-installed, bad invocation or wrong-shell quoting.
- **Validation has side effects.** Running a command guardrail that writes, deploys, or destroys takes effect on the owner's checkout — including a scoped command guardrail whose realistic scope runs real work. Confirm before running such a command, or accept the owner's word and use the escape hatch. Setup's interactive, one-time nature accommodates a bounded real run.

## 3. Apply agentic coding tool setup actions

Some agentic coding tools require setup actions beyond conventions.

Consult the active tool's rules file (read in Step 1) for a **Setup actions** section. If it has one, perform the actions described.

Do not create or copy files without explicit confirmation from the owner.

## 4. Confirm writes before changing files

Before writing anything, summarize the proposed `.rp.md` content and ask for explicit confirmation.

- If `.rp.md` does not exist, ask before creating it.
- If it exists, ask before overwriting it. Offer to merge or append only when the owner explicitly chooses that approach.

If any required answer is missing, do not create a misleading complete conventions file. Either stop and explain what is unresolved, or, only if the owner explicitly asks for a draft, write a file that clearly marks unresolved items and state that setup is incomplete.

## 5. Write human-readable Markdown

Write `.rp.md` with the conventions and commit it to the main branch:

- `artifacts-in-repo`: the project's main branch.
- `artifacts-in-fork`: the fork's main branch only — never push it to upstream.

## 6. Set up git ignore

Add the worktree folder to `.gitignore` so local working copies are not tracked. This is the only entry Radical Pipelines requires.

Ask the owner for permission, append the entry, and commit it alongside `.rp.md` in the main branch.

Remind the owner that for `artifacts-in-fork`, the `.gitignore` change lives on the fork.

## 7. Finish safely

After setup completes, tell the owner:

- That `.rp.md` was created or updated.
- That future Radical Pipelines runs should read `.rp.md` and skip setup if all required conventions are present.

If setup was cancelled or incomplete, stop the pipeline and clearly list what remains missing.
