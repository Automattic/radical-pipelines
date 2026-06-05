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

Where each pipeline's artifacts (`prompt.md`, `spec.md`, `design-doc.md`, `code-plan.md`, `doc-plan.md`, etc.) are stored. One folder per pipeline.

Ask the owner for the location and naming pattern.

Suggested default: `.rp/pipelines/<pipeline-slug>/`.

### Commit format

The project's commit message format. Passed verbatim to every spawned agent so all commits in a pipeline match the project's style.

Ask the owner for the format and capture at least one concrete example.

Suggested default: `<commit-description> (<agent-name>)`.

### Issues (required)

Where the project tracks issues. Each pipeline pulls its initial prompt from an issue, so the orchestrator needs a way to read, comment on, and update them.

Ask the owner which tracker is used (GitHub Issues, Linear, Jira, GitLab, plain Markdown files in a folder, etc.) and how to access it (CLI like `gh`, MCP server, API token, etc.).

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

### Health monitoring (required)

How the orchestrator launches a recurring monitor in the autonomous workflow to detect stalls, message failures, login errors, network errors, and so on. Context-window limits are handled by each tool's own auto-compaction, not by the monitor.

This is highly dependent on the agentic coding tool but you can document the existing tools and store them as a convention so the research doesn't need to be done on each run. Try to document the commands to start, list, and cancel this monitoring.

### Artifact storage (required)

How this project stores Radical Pipelines artifacts.

Running Radical Pipelines creates three kinds of files that need a home:

- The project-level `.rp.md` config file (the conventions captured during this setup).
- A per-pipeline artifact folder containing `prompt.md`, `spec.md`, `design-doc.md`, etc. — one folder per pipeline run, per the **Artifact folder** convention.
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

**Recommend the standard remote names.** Both paths above arrive here once the remotes and their URLs are known (each runs `git remote -v` first). This single step runs after the two-remote path and after the create-fork path, so a manually added fork that landed in a non-standard ("inverted") state is caught here too.

First establish which remote plays which role:

- Attempt `gh`-based auto-detection to _propose_ the assignment, running it per remote against that remote's URL — e.g. `gh repo view <remote-url> --json isFork,parent`. `gh` normalizes the raw remote URL itself, so no manual URL parsing is required; the detected parent identity is `parent.owner.login` + `/` + `parent.name`.
- Decide on identity, not on names: the fork is the remote whose `isFork` is `true` and whose parent equals the _other_ configured remote's `owner/repo`, and the canonical is that parent. Act only when this fork↔canonical pairing is exactly one and unambiguous.
- In any ambiguity or failure, fall back to asking the owner which remote is which, and never guess. This includes: (1) neither remote is a fork of the other; (2) both remotes point at the same repository; (3) a remote is not on GitHub (GitLab, Bitbucket, unauthenticated self-hosted, etc.); (4) `gh` is offline, unauthenticated, errors, or exits nonzero for any reason; (5) the fork's parent is a repository not among the configured remotes; (6) more than two remotes with no single clear pairing.
- Either way — auto-detected then confirmed, or asked cold — by the end of this step the roles are known and owner-confirmed. Auto-detection only upgrades "ask the owner cold" into "here is our detected assignment, confirm or correct"; it is never a gate.

Then decide on names, evaluated over the resolved roles:

- If the remote that _is_ the fork is already named `origin` and the remote that _is_ the canonical is already named `upstream`, make no rename recommendation and proceed straight to recording the names. This check runs against the resolved roles, not the raw names: a remote literally named `origin` can point at the canonical repository, and in that confusingly-named inverted case the names look standard but the roles are wrong, so the correct action is a rename recommendation, not a no-op.
- Otherwise, recommend renaming the fork to `origin` and the canonical to `upstream`, as a decline-able recommendation. For example: "By default we recommend naming the fork `origin` and the canonical `upstream`. Do you want us to rename them, or leave them as they are?"

The orchestrator must never run `git remote rename` without the owner's explicit approval, and never renames on its own initiative, because the rename mutates the owner's local git config. On approval, apply the renames; on decline, keep the existing remote names.

On explicit approval, apply the rename(s) following one rule: before any rename whose target name is currently taken, free that name first. For the inverted case where the canonical is named `origin` and the fork is named `upstream`, this means renaming the canonical `origin` → `upstream` first (to free `origin`), then renaming the fork → `origin`. The ordering matters because `git remote rename` errors (exit status 3) if the target name already exists and makes no change on failure.

No follow-up steps are needed: `git remote rename` migrates the remote-tracking refs, the `branch.<name>.remote` tracking config, and the entire `remote.<old>.*` section, so fetch/push/pull keep working with no further action. If a remote has a hand-edited fetch refspec pointing outside `refs/remotes/<old>/*`, git prints a warning and exits 0, leaving that one refspec stale; if git prints this warning, it is benign — proceed without treating it as an error.

On either branch — no-op, accepted rename, or declined — proceed to record the resolved remote names via the Capture block.

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

For `artifacts-in-fork`, the `name` recorded per role is the **resolved** (post-decision) name, not the logical role: `origin` for the fork and `upstream` for the canonical when the owner accepted the rename recommendation, or the existing actual names when the owner declined.

This recorded `name` is authoritative: downstream operations resolve the logical role (`upstream` / `fork`) to the recorded `name` rather than assuming a literal. For example, the clean-branch push targets the upstream remote by its recorded `name`, and the run-close-out push of the pipeline branch targets the fork remote by its recorded `name`. Fork-mode pushes are always explicit-by-remote (`git push <remote> <branch>`) using the recorded `name`, never relying on a default remote.

Worked example (owner declined the rename, so the roles and resolved names differ): role `fork` resolves to name `myfork`, and role `upstream` resolves to name `canonical`. Downstream operations then push to `myfork` and `canonical` respectively — the literal names recorded for those roles — even though the roles are still called `fork` and `upstream`.

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
