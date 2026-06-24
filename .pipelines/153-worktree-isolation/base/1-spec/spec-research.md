# Spec Research

## Rough Idea

# Agents sometimes edit files in the main checkout instead of the worktree

> Source: GitHub issue [#153](https://github.com/Automattic/radical-pipelines/issues/153).
> This file is self-contained; agents do not need to open the source issue.

## Goal

When a pipeline runs in a worktree, every file edit **and commit** an agent makes lands in the worktree's copy of the repository and on the pipeline's branch — never in the main checkout or on the main branch.

## Context

During runs, agents sometimes modify files in the main checkout instead of the worktree, and sometimes commit to the main branch (trunk) instead of the pipeline branch.

## Assumptions / directions to explore

_Owner's current understanding — for later research to confirm or revise, not ground truth._

- The worktree path is a sub-path of the main repo path. Agents run with their cwd set to the worktree and are given **relative** paths (e.g. `plugins/woocommerce/.../cart.ts`), which resolve correctly. But when an agent constructs an **absolute** path, it may reason "the repo is at `/Users/luisherranz/Code/woocommerce`" and write to `…/woocommerce/plugins/woocommerce/.../cart.ts` — the *main checkout's* copy — instead of the worktree's copy under `.claude/worktrees/…/plugins/…`. The edit tool happily writes to that absolute path, landing the change in the wrong tree.
- Possible fix: also pass agents the worktree path. Currently they only receive the artifacts folder, so they have no reliable absolute anchor for the worktree.
- Agents also sometimes commit to the main branch (trunk) instead of the pipeline branch. Possible fix: pass the branch name explicitly as well, so agents commit to the correct branch.

## Q&A

### Q1: How does the skill currently set up a worktree and pass paths to agents? (1) Where is the worktree created and what determines its path; (2) what path values does an agent receive in its initial prompt today; (3) is each agent's cwd set to the worktree, and is that enforced or assumed?

**A:**

1. **Worktree creation + path.** Not hardcoded in the skill body; comes from the **Worktrees** convention. For Claude Code, tool-forced to `.claude/worktrees/<pipeline-slug>` via `EnterWorktree({ name: "<pipeline-slug>" })`. Path is determined by the pipeline-slug = `<github-issue-number>-<short-description>`; the slug also drives the branch name and artifacts folder names. Created during pipeline creation; re-entered on resume, reused on review, freshly created on fork.

2. **Path values passed to an agent today = artifact folder only.** The only spawn-prompt contents are the `## Conventions` block in `passing.md`. Its only path-bearing field is `**Artifact folder:**` (passed to all agents). Other fields are non-path (commit format, guardrails, guardrail scopes). No worktree path and no repo root appear anywhere in spawn wiring. The artifact folder value passed is run-scoped (e.g. `.../base`).

3. **cwd.** For Claude Code, cwd is **inherited, not passed or set per-agent**: "All subsequent tool calls and spawned agents inherit the worktree as their working directory." No per-agent cwd parameter exists; profiles don't set or mention cwd. Guardrails ("never `cd`", "never modify files in the main working directory") protect cwd but are directed at the orchestrator, not enforced per agent. CONTRAST: the Pi harness DOES require cwd per-spawn — "Spawned teammates must use the Pi worktree as `cwd`, never the main checkout."

**Reasoning:** Worktree isolation today rests on (a) the orchestrator entering the worktree once and (b) all spawned agents inheriting that cwd, plus (c) agents being given relative paths that resolve against cwd. The artifact folder is the only path an agent receives, and it is the only reliable absolute anchor an agent has. There is no absolute worktree-root anchor and no branch name in the spawn wiring. The researcher flagged that claim (3) for Claude Code rests on one positive statement plus the absence of any other cwd instruction (verified by exhaustive grep) — weaker than Pi's explicit per-spawn cwd requirement.

**Sources:** `reference/conventions/claude-code.md:7-16`, `reference/conventions/passing.md:3-17`, `autonomous-workflow.md:62-64`, `create-pipeline.md:11-19`, `setup.md:38,68-72`, `reference/conventions/pi.md:16,24`, `load.md:36`, `pipeline-versioning.md:15`, `.rp.md:42-64`, profiles `code-plan-reviewer.md:19` / `docs-plan-reviewer.md:20`.

### Q2: Verify the absolute-path failure mechanics and the anchors available to an agent. (1) Is the worktree a literal subpath of the main root, with both copies coexisting on disk? (2) Can an agent derive the worktree root from the passed artifact folder, or is there no reliable anchor? (3) Where does an agent get the main repo root from, to wrongly anchor on it?

**A:**

1. **Worktree is a literal subpath of the main root — confirmed on disk.** Main = `/Users/.../radical-pipelines`; worktree = `/Users/.../radical-pipelines/.claude/worktrees/153-worktree-isolation` (nested). True for both tools: Claude Code `.claude/worktrees/<slug>`, Pi `.pi/worktrees` — both repo-relative, hence nested. The same tracked file coexists as **two distinct physical copies** (e.g. `SKILL.md` at both paths with different inodes — not links). A wrong absolute path anchored at the main root therefore resolves to a real, writable file and the edit lands silently in the wrong tree with no error. The failure mode is mechanically real.

2. **Worktree root is a strict prefix of the artifact folder — derivable but not skill-blessed.** Artifact folder = `<worktree-root>/.pipelines/<slug>/base`; trimming at `/.pipelines/` yields the worktree root. BUT (a) this only holds because the default artifact path sits under the worktree, and artifact location is owner-chosen (`.rp.md:47`, `setup.md:50,52`), so a project could break the prefix relationship; and (b) no instruction tells the orchestrator to pass the artifact folder as absolute or to derive the worktree root from it — whether the value arrives absolute or relative is incidental and unspecified. So an agent *could* derive the worktree root today, but there is **no reliable, skill-blessed worktree-root anchor**.

3. **The main repo root is never surfaced to a worker agent by the skill.** No hardcoded absolute main path exists anywhere in `skills/`, `agents/`, or `.rp.md`. The main checkout is referenced only conceptually, as a place to AVOID (`claude-code.md:12`, `create-pipeline.md:15`, `pi.md:16`, `setup.md:189`). The one path computation — `load.md:36` `dirname(git rev-parse --git-common-dir)` — is orchestrator-only (reading `.rp.local.md`) and not propagated to agents. So an agent that builds a main-root absolute path is anchoring on **its own git computation** (`git rev-parse --git-common-dir` → main `.git`; `--show-toplevel` → worktree root) or model world-knowledge — both trivially reachable from inside the worktree.

**Reasoning:** This pins the design space. A correct cwd alone is insufficient: even from inside the worktree, an agent can compute the main root via `git rev-parse --git-common-dir` and construct a main-anchored absolute path, and the edit will silently succeed against the main checkout's distinct copy. The artifact folder is not a guaranteed worktree-root anchor (owner-relocatable; absolute/relative unspecified). The fix space is therefore "provide a reliable worktree-root anchor AND instruct agents to use it / never construct main-anchored absolute paths," not either alone.

**Caveat:** Pi nesting and same-file coexistence are inferred from convention text only (no live `.pi/worktrees` on this machine); Claude Code mechanics were verified directly on disk.

**Sources:** `git worktree list` (live), inode check on `SKILL.md` (live), `reference/conventions/claude-code.md:12,14`, `reference/conventions/pi.md:12,16`, `create-pipeline.md:15`, `setup.md:50,52,189`, `.rp.md:47`, `load.md:36`.

### Q3: Is the wrong-branch commit the same root cause as the wrong-tree edit? (1) By what mechanisms can a commit land on trunk despite correct cwd; (2) is a wrong-tree edit the same event as a wrong-branch commit, or independent; (3) can an agent verify its branch before committing, and is the branch name passed today?

**A:**

1. **Mechanisms by which a commit lands on trunk despite correct cwd** (verified with live git experiments). From worktree cwd, `git commit` ALWAYS lands on `worktree-<slug>`. A commit reaches trunk only by actively targeting the main checkout:
   - (A) plain `git add <wt-path>` + commit from worktree → correct, lands on the pipeline branch.
   - (B) edit at main-root absolute path, then `git add <main-path>` from worktree cwd → **git refuses** (`fatal: … outside repository`, rc=128); nothing staged. NOT a path to a trunk commit.
   - (C) `git -C <main-root> add/commit` → lands on **trunk**. Reachable (`-C` bypasses cwd).
   - (D) `cd` out of the worktree into the main checkout, then plain commit → lands on **trunk**. Reachable only if the agent changes directory.
   - (E) `git --git-dir=<common .git>` → HEAD resolves to trunk. Reachable but requires explicitly naming the common dir.
   - Two realistically reachable mechanisms from a correct-cwd agent: **(C) `-C`/`--git-dir` redirection** and **(D) `cd`-out**. Both require actively targeting main; neither follows from a normal commit.

2. **Independent — each needs its own guard.** A wrong-tree edit does NOT auto-become a trunk commit: experiment B shows `git add <main-path>` from worktree cwd fails ("outside repository"), so the main-tree file never enters the worktree index and never commits. Turning a main-tree edit into a trunk commit requires a SECOND distinct action (C or D). Git itself firewalls the two. So the edit half (file path at write time) and the commit/branch half (git-command target / cwd at commit time) have distinct root causes; one guard does not cover the other.

3. **Branch is verifiable but never passed.** `git branch --show-current` from worktree cwd returns `worktree-<slug>` (verified live), so a pre-commit check "confirm current branch == `worktree-<slug>`" is feasible. The branch name is **NOT passed to agents through any channel** — the `worktree-<slug>` token appears only in convention-definition files (`.rp.md:68`, `claude-code.md:22`, `pi.md:13,20`), never in a per-agent passing path or profile. Every agent commit instruction is bare ("commit X using the commit format" — e.g. `code-writer-tdd.md:49`, `spec-writer.md:51`), relying entirely on inherited worktree cwd.

**Reasoning:** The goal's two halves are distinct problems. Git's "outside repository" firewall means a wrong-tree edit cannot silently become a trunk commit; the commit/branch half is its own failure with its own reachable mechanisms (`-C`/`--git-dir` redirection, `cd`-out). Therefore the spec needs at least two requirements: one anchoring file writes to the worktree tree, one anchoring commits to the pipeline branch/worktree. A branch verification (`git branch --show-current` == `worktree-<slug>`) before committing is a concrete, observable guard for the commit half, and it requires the branch name to be available to the agent — which it is not today.

**Caveat:** Tested `-C`, `cd`, `--git-dir` (the realistic redirections); other env-var redirections (e.g. `GIT_WORK_TREE`) exist in principle and behave analogously (model knowledge, not separately reproduced). No commits were made; the repo was not modified.

**Sources:** live git experiments (add/commit from worktree vs. main, `-C`, `cd`, `--git-dir`, `git branch --show-current`), `reference/conventions/passing.md:5-25`, `.rp.md:68`, `reference/conventions/claude-code.md:22`, `reference/conventions/pi.md:13,20`, profiles `code-writer-tdd.md:49`, `spec-writer.md:51`.

### Q4: Which agents must the fix cover? (1) Classify all 18 profiles by whether they edit and/or commit; (2) do reviewers write/commit or mutate the worktree by running commands; (3) does the orchestrator edit/commit, and is it in scope?

**A:**

1. **Effectively all 18 spawned agents edit-and-commit; no read-only subset.** Every profile has a commit step. Writers, analysts, the consolidator, and all reviewers write a file in the repo tree and commit it. The only near-exception is the two researchers (`spec-researcher`, `design-doc-researcher`): they write files only if asked and have no commit step, but both are told to "write small scripts, run commands, build minimal repros" (`spec-researcher.md:16`), so they still mutate the working tree during experiments. So "every file edit and commit an agent makes" maps to all spawned agents; there is no "writers + analysts only" subset to scope down to.

2. **Reviewers are not read-only.** All six reviewers write and commit a review artifact (spec-reviewer `:33-34,63`; design-doc-reviewer `:35-36,65`; code-plan-reviewer `:44-45,74`; docs-plan-reviewer `:44-45,74`; code-reviewer also writes `code-summary.md` `:51-52,100`; docs-reviewer also writes `docs-summary.md` `:53-54,101`). Beyond the review file, four mutate the worktree by running commands: both plan reviewers EXECUTE filled guardrail commands ("A command that writes, deploys, or destroys takes effect against the worktree" — `code-plan-reviewer.md:19`, `docs-plan-reviewer.md:20`); both batch reviewers run guardrails on the approve path; code-reviewer additionally does behavior verification ("exercise it end-to-end… re-drive each flow", `code-reviewer.md:35`). So running a guardrail/verification command is a working-tree mutation the "stays inside the worktree" discipline must cover, even when the reviewer's only commit is a review file. (Guardrails are project-optional and undefined for THIS project, but the skill is generic and must cover projects that define them.)

3. **The orchestrator also writes and commits, but is a distinct actor with deliberate main-branch exceptions.** Orchestrator writes/commits: `intent.md` + assets (`create-pipeline.md:23,33,38-40`); phase subfolders (`autonomous-workflow.md:52`); fork seeding `cp -r` + commit (`fork-pipeline.md:42,45-47`); review intent (`review-pipeline.md:35,42`); setup commits `.rp.md` + `.gitignore`. Crucial ordering: `EnterWorktree` happens BEFORE those pipeline writes (create-pipeline step 2 precedes steps 4–5), so the orchestrator's pipeline writes/commits already land in the worktree by construction. Deliberate exceptions that must stay OUT of the worktree/branch: `.rp.md` and `.gitignore` are committed to the project/fork MAIN branch by design (`setup.md:209-222`); pipeline-versioning READS tree SHAs from main for merged/deleted pipelines (`pipeline-versioning.md:65,73,86`) — reads, not writes. The skill separates "orchestrator" from "agents" ("you orchestrate teams of agents… you do not produce the artifacts yourself", `SKILL.md:23`; humans talk only to the orchestrator, `SKILL.md:14`).

**Reasoning / scope decision:** The cleanest scope boundary is **every spawned agent** keeps its file edits and commits inside the pipeline's worktree and on the pipeline branch. That covers all 18 roles (writers, analysts, consolidator, reviewers, researchers) and their command-driven worktree mutations, without disturbing the orchestrator's deliberate main-branch operations (`.rp.md`/`.gitignore` setup commits, lineage SHA reads). If the requirement were phrased broadly as "all pipeline work," it would have to explicitly carve out those orchestrator-on-main operations or it would contradict `setup.md` and `pipeline-versioning.md`. Scoping to spawned agents avoids that contradiction. The orchestrator's own writes already land in the worktree by construction (EnterWorktree precedes them), so the orchestrator is not the source of the reported problem and is out of scope for these requirements.

**Caveat:** Which commits land where is inferred from instruction ordering in the reference files (EnterWorktree precedes writes), not a runtime trace; treating the orchestrator as distinct from "agent" is a reading of the skill's terminology, settled here as the scope decision.

**Sources:** all 18 profiles in `agents/` (commit steps + write steps as cited above), `spec-researcher.md:16`, `code-plan-reviewer.md:19`, `docs-plan-reviewer.md:20`, `code-reviewer.md:35`, `create-pipeline.md:23,33,38-40`, `autonomous-workflow.md:52`, `fork-pipeline.md:42,45-47`, `review-pipeline.md:35,42`, `setup.md:209-222`, `pipeline-versioning.md:65,73,86`, `SKILL.md:14,23`.

### Q5: How should the requirement be expressed? (1) Are guardrails the right existing home for a worktree/branch check, or a different concern; (2) is there any existing precedent for an agent verifying its environment before acting?

**A:**

1. **Guardrails are NOT the right home — the requirement should stand alone.** Guardrails are "deterministic verification gates… exact commands judged pass/fail by exit code" (`guardrails.md:3`) that gate an agent's OWN OUTPUT before commit; they are project-defined, OPTIONAL (every consumer treats "no guardrails" as a non-blocker, e.g. `code-writer-tdd.md:42`), owner-authored at setup (`setup.md:171-179`), and run only by the five execution agents (`guardrails.md:20`, `passing.md:11`). Four mismatches with a worktree/branch check: (a) wrong question — guardrails ask "is output good?", a worktree check asks "am I in the right place before acting?" (an environment precondition, not a quality check); (b) wrong timing — guardrails run AFTER work as a pre-commit gate, but a worktree check only helps BEFORE acting (once files land in the wrong tree, a gate cannot help); (c) wrong optionality — guardrails are project opt-in, but worktree/branch correctness is a universal invariant of the system's own design (`claude-code.md:10-23`); (d) wrong authorship/scope — guardrails are per-project `{scope}`-filled commands, not a fixed structural property. There is in-skill precedent for keeping non-quality verification OUTSIDE guardrails: the code-reviewer's behavior verification is explicitly "not a guardrail — it is a step you perform here, separate from running the guardrails" (`code-reviewer.md:35`).

2. **"Verify before acting" is an entirely new behavior — zero precedent.** Environment correctness today is purely assumed-by-inheritance: asserted but never checked. `EnterWorktree` is called once at creation, then "All subsequent tool calls and spawned agents inherit the worktree as their working directory" (`claude-code.md:14`); the invariant is stated only as PROHIBITIONS ("never modify the main working directory… never `cd`", `claude-code.md:12`, `create-pipeline.md:15`). No agent profile or phase reference ever instructs anyone to confirm cwd/branch/worktree before writing — code-writers go straight from "Gather context" to "Implement" (`code-writer-tdd.md:10-21`). Grep: `git rev-parse` = 3 hits, all versioning/path-locating, none an env check (`pipeline-versioning.md:62,84`, `load.md:36`); `show-current` / `--show-toplevel` / `pwd` / `realpath` = 0 hits; `cwd` only in Pi spawn instructions (assert at spawn, not agent self-check); all `confirm`/`verify`/`check` hits concern plans/owner decisions/output-vs-source/test failures, never the environment.

**Reasoning:** The requirement should be its own concern — a pre-action worktree/branch correctness behavior — not an extension of guardrails. It introduces a new behavior class (anchor or verify the working location before editing/committing) with no current precedent, so the spec defines the observable outcome and the design defines the prose mechanism. Because the skill is prose, not software, these requirements become instructions in skill/agent prose, not a runtime enforcement layer; the strongest available guarantee is correct-by-construction wiring (a reliable worktree-root anchor and branch name passed to agents) plus clear instructions to use them and not target the main checkout.

**Caveat:** The guardrails-categorization in sub-question 1 is analysis offered to inform the decision; the grep in sub-question 2 covered the comprehensive requested term set over `skills/` and `agents/`.

**Sources:** `reference/guardrails.md:3,20`, `setup.md:171-179`, `passing.md:11`, `code-writer-tdd.md:42`, `code-reviewer.md:35`, `reference/conventions/claude-code.md:10-23`, `create-pipeline.md:15`, `code-writer-tdd.md:10-21`, `pipeline-versioning.md:62,84`, `load.md:36`.

## Research

### Spawn-time context surface (`passing.md`)

The single surface where the orchestrator passes context into an agent's initial prompt is the `## Conventions` block defined in `reference/conventions/passing.md`. Today it carries exactly four fields: **Artifact folder** (all agents), **Commit format** (all agents), **Guardrails** (code/docs writer & reviewer agents), and **Guardrail scopes to fill** (plan writer/reviewer agents). The only path-bearing field is **Artifact folder**. There is no worktree-root path and no branch name in this block. Any fix that adds a passed worktree-root anchor or branch name to spawn wiring would extend this block (and `passing.md`).

### Agent profiles carry no worktree/branch anchoring

Across all 18 profiles in `agents/`, an exhaustive grep for `branch`, `worktree`, `main checkout`, `main working`, `absolute path`, `cwd`, `current branch` returns only two incidental hits — both in reviewer profiles (`code-plan-reviewer.md:19`, `docs-plan-reviewer.md:20`) noting that a guardrail command "takes effect against the worktree." No profile tells an agent it is operating in a worktree, which branch to commit to, or to avoid constructing absolute paths into the main checkout. Worktree/branch isolation is therefore entirely an orchestrator-level concern today, inherited by agents via cwd, never restated per agent.

### How agents are told to commit

Writer profiles instruct: "Commit … using the host project's commit format" (`code-writer-tdd.md:49`, `docs-writer.md:52`), and analysts "Commit … using the **commit format**" (`spec-analyst.md:82`). None names a branch or asserts the agent must be on the pipeline branch. Branch correctness on commit relies solely on cwd being inside the worktree (whose HEAD is the pipeline branch). If an agent's effective working directory is the main checkout, a commit lands on the main branch.

### Claude Code vs. Pi isolation model

Claude Code: `EnterWorktree` is called once by the orchestrator; "All subsequent tool calls and spawned agents inherit the worktree as their working directory" (`claude-code.md:14`). Isolation is inheritance-based, never reasserted per spawned agent. Pi: spawned teammates are explicitly required to use the worktree as `cwd` per spawn — "Spawned teammates must use the Pi worktree as `cwd`, never the main checkout" and "Always spawn agents with the worktree as `cwd`" (`pi.md:16,24`). So the two harnesses already differ in how strongly per-agent cwd is guaranteed; any requirement must hold for both.

## Consolidated Requirements

Each requirement is an observable outcome of a pipeline run. "Spawned agent" means any of the skill's agent roles the orchestrator spawns for a pipeline (all spec, design-doc, plan, code, and docs roles, including writers, analysts, the consolidator, researchers, and reviewers). The subject is the radical-pipelines skill itself.

**Core isolation outcomes**

1. Every file an agent creates, edits, or deletes during a pipeline run lands in the pipeline's worktree copy of the repository, never in the main checkout's copy — including when the agent works from an absolute path rather than a path relative to its working directory.

2. Every commit an agent makes during a pipeline run lands on the pipeline branch (`worktree-<pipeline-slug>`), never on the main branch — including when a commit is the result of a git command that could otherwise target the main checkout.

3. Working-tree mutations an agent makes by running commands (for example a reviewer running a guardrail or behavior-verification command that writes, deploys, or destroys) take effect against the worktree, not the main checkout.

**What agents are given**

4. Every spawned agent receives a reliable, unambiguous anchor to the pipeline's worktree root that does not depend on the agent inferring it from the artifact folder, from git, or from prior knowledge of where the project lives. The anchor remains correct even when the artifact folder is configured to a location outside the worktree.

5. Every spawned agent that commits is given the pipeline branch name (`worktree-<pipeline-slug>`) so it can target and confirm the correct branch rather than relying solely on inherited working-directory state.

**Agent behavior**

6. Before editing files or committing, an agent establishes that it is acting against the pipeline's worktree and branch rather than assuming it by inheritance; an agent does not construct paths anchored on the main checkout and does not redirect git commands at the main checkout or its common git directory.

**Scope and compatibility**

7. The outcomes hold under every agentic-coding tool the skill supports (at minimum Claude Code and Pi); the mechanism that delivers the anchor and branch name, and any verification behavior, fits each tool's worktree and spawn model without relying on a runtime enforcement layer (the skill is prose).

8. The change preserves the orchestrator's existing, deliberate operations against the main checkout and main branch — committing `.rp.md` and `.gitignore` to the project/fork main branch during setup, and reading lineage tree SHAs from main during pipeline versioning. These remain correct and are not constrained by the agent worktree/branch discipline.

9. The change is expressed within the skill's existing structure (the spawn-time `## Conventions` block in `passing.md`, the per-tool worktree/branch conventions, and agent profiles) and respects the skill's authoring rules: minimalist, no cross-path duplication (a shared instruction lives in one referenced file, while a per-profile instruction is duplicated into each profile rather than referenced), tool-agnostic in generic files, and not framed as an optional project guardrail.

**Success criteria**

10. In a pipeline run, after agents have completed their phases, the main checkout's working tree shows no agent-made modifications and the main branch has gained no agent-made commits; all agent edits and commits are present only in the worktree and on the pipeline branch.

**Out of scope**

- Runtime enforcement, hooks, or tooling that mechanically blocks a wrong-tree write or wrong-branch commit (the skill is prose, not software).
- Changing where worktrees, branches, or artifact folders are located, or how they are named.
- Constraining or altering the orchestrator's own main-checkout operations listed in requirement 8.
- Automatic detection or recovery of a stray write/commit already made to the main checkout (cleanup of an already-misplaced change is not specified here).
