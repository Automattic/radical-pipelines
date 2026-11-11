# The v4 model

This document states how Radical Pipelines v4 works and why it differs from v3. It is the explanatory layer: the skill and the agent profiles are the operative text, and this document explains the design they implement. Nothing in the skill's reading path depends on it.

## Why v4

v3 kept the promises that matter: requirements written before code, artifacts in the repository that the team reads, autonomy to the pull request, and corrections that land on the artifact where the work diverged. Its audited runs also showed four failures that no rule fixed, because they came from the structure:

- **Inflation.** Every phase was judged by fidelity to the previous one and every reviewer could only add. No finding ever removed a mechanism. A twenty-line change became five hundred lines to satisfy clauses nothing in intended use produced.
- **Blindness.** Producers could read but not run. A pipeline whose subject was a virtual machine never started it. Specs described imagined behavior.
- **Fragmentation.** Build and document were plans of sealed tasks executed by fresh workers that saw only their task. Nobody held the whole change until the reviewer, and the reviewer judged the change against the plan rather than against the software.
- **Weight.** Freshness, waves, packages, stamps, mirrors, and records grew to two thousand lines of script and forty thousand words of prose. A merge from the base branch could cost hours of review of nothing.

v4 keeps the promises and removes the structures that produced the failures.

## Principles

1. **The intent is the only authority.** Everything after it is chosen by a role and is negotiable among roles. The owner decides only what the intent means or demands.
2. **Observe the present, assume the future.** A claim about what the system does today is observed: read it, run it, drive it, reproduce it. A claim about what the solution will do is assumed and labeled, and the implementer verifies it. Nobody but the implementer writes solution code.
3. **Artifacts hold the final truth only.** Discussion, provenance, and superseded text live in threads and in history. An artifact is what a reader needs now.
4. **Each role owns one artifact and answers for it.** A finding is addressed to the owner of what it questions. Nobody defends what they do not own.
5. **The burden is on the clause.** A requirement or decision the owner did not state stands only with a trace to the intent and an input observed in intended use. In a dispute, observed stands and conceivable falls. A case dropped by mistake returns as a reported failure, as an observation; a mechanism kept by mistake stays forever.
6. **Review the result, not the process.** One review, at the end, of the diff against the intent, by a reviewer who sees only what a pull-request reviewer sees. Upstream artifacts are reviewed by the roles that consume them, while consuming them.
7. **Redundancy by design, the same for every pipeline.** Where a second independent reading pays, the project configures it once for all its pipelines. Nobody estimates a task's difficulty.
8. **Every turn starts from files.** A role reads its assignment, its artifact, its inputs, and its threads, works, writes, and ends its turn once every command and subagent it started has finished and it has acted on the result. A role that dies or compacts rereads the same files.

## Phases and artifacts

| Phase | Folder | Artifact | Owner |
| --- | --- | --- | --- |
| 0 Intent | `0-intent/` | `intent.md`; later input as `constraint-<n>.md`, `proposal-<n>.md`, `failure-<n>.md` | Orchestrator, on the owner's approval |
| 1 Spec | `1-spec/` | `spec.md`; production lanes in `lanes/<lane>/spec.md` | `spec-producer` |
| 2 Design doc | `2-design-doc/` | `design-doc.md`; production lanes in `lanes/<lane>/design-doc.md` | `design-doc-producer` |
| 3 Implementation | `3-implementation/` | `notes.md`; the code, tests, and documentation on the pipeline branch | `implementer` |
| 4 Review | — | Review threads in `threads/`, one per review lane, closed `approved` | `reviewer` |

Threads live in `threads/` at the pipeline folder root. Every pipeline folder also carries `config.json`, the pipeline configuration: its target phase; the branch it started from; the models, lanes, and briefs the owner confirmed for the run; the conventions the orchestrator copied from `.rp.md` at its last run start; and the owner's directions.

Build and document are one phase. The implementer delivers the code, its tests, and every piece of documentation the change needs. Planning is the implementer's own and is not an artifact.

### Intent

Unchanged from v3: the owner's goal, constraints, and proposals, synthesized by the orchestrator and approved by the owner before it is written. Later input is recorded as the owner gave it, in the fewest words that carry it, with `target` and `origin` in its frontmatter.

### Spec

Requirements, acceptance criteria, exclusions, and the cases considered and not required.

Every requirement carries its origin: `from-intent`, when the intent states it, with the intent item it cites; or `derived`, when the producer inferred it, with the intent item it serves and the input observed in intended use that makes the case material. A derived requirement without both is written as an assumption, not a requirement.

The producer interprets the intent. Where its words decide a question, the spec follows them. Where they leave it open, the producer chooses the reading the Goal and intended use support, writes the requirement as `derived`, and records the other reading in one line under Considered and not required. The owner corrects a reading by reading the artifact; the run never stops to ask what a phrase means.

The section **Considered and not required** lists, one line each, the cases the producer examined and left out because no intended use produces them. It is the spec's negative space: a consumer or reviewer who wonders about a case finds it there before raising it.

Every claim is `observed: <how>` or `assumed: <what will confirm it>`. A claim about current behavior that could have been observed by running the software and was not is a finding against the spec.

Every clause states observable behavior, never how the software is built or which code it touches. Acceptance criteria state the input, where the outcome is observed, and the outcome. They never prescribe fixtures, sequences, or variants.

### Design doc

The v3 format and altitude rules are kept: Overview, Architecture, Decisions, Interfaces, Dependencies, Failure modes and observability, Verification, Risks, Open assumptions. The design doc binds component responsibilities and their contracts with consumers: signatures, schemas, the behavior a caller observes. How a component satisfies its contract is the implementer's: control flow, call sequences, names, literal values, and test cases, whether written as prose or as code. Each producer's self-read names what it removes, as in v3.

Every decision names the requirements it serves. Where the intent leaves open a question a decision depends on, the producer interprets it as the spec's producer does and records the other reading in one line under the decision's Alternatives. Every option set includes the simplest option that could satisfy the spec. A mechanism, guard, or proof serves a requirement in proportion to how much it matters to the intent; one that serves none is removed, and the case a proportionate mechanism leaves uncovered is recorded under Risks with its consequence. The Verification section names each proof once, with what it proves and at which boundary, never its inputs or steps.

### Implementation

The implementer receives the spec and the design doc and builds the change in the pipeline worktree, as a developer would: it runs the software, writes the code, its tests, and its documentation, and uses its tool's subagents for bounded work it can hand over whole. It integrates and judges everything a subagent returns. Subagents run in parallel only for work that writes nothing.

Order of work: first the smallest change that satisfies the intent's from-intent requirements; then each derived requirement in its own commit. When the intent describes a bug, the implementer fixes its general cause, not the case the spec enumerates.

Boundaries: a new component, abstraction, dependency, or configuration surface that the design doc does not decide is a design change. The implementer opens a thread to the design doc's owner before writing it.

Tests follow the classical school: a test exercises the delivered path from the public interface whose outcome it proves; a test double replaces only what the test cannot run. A new test proves something no other test proves. A failure is the implementer's when the change caused it or an intent outcome depends on it; one that reproduces on the base branch and that the change leaves untouched is recorded in the notes. Documentation states what readers can now do, must now do, or no longer need to do, at the depth they act on it; it restates nothing readers already assume.

`notes.md` is the implementer's resumption file: the identity of the design doc and spec it started from, what is done, what remains, the decisions it took within its boundaries that a successor should know, and the approaches that failed. It is updated at milestones and when a turn ends. `status: done` in its frontmatter declares the implementation complete. It carries no discussion.

### Review

Each configured review lane spawns a `reviewer`, with its brief when it has one. The reviewer reviews the change as a developer outside the pipeline reviews a pull request: it receives the intent and its later inputs — the issue — and the net change — the pull request — and nothing else. It does not know the spec, the design doc, or the notes exist: each turn its view or code changed, `rp next --apply` builds its lane branch as two commits from the pipeline tip — a review base on the merge-base and a review head on it, both holding the tip's pipelines folder without its pipelines — so a project's tooling there stays — plus only the pipeline's `0-intent/` and the lane's own threads, so `git diff` against the review base is the net change and nothing else of the pipeline is in its tree or history. `rp land` cherry-picks its commits onto the pipeline branch, since merging the review head would delete the pipelines folder. Its assignment is the request a developer would get, one template per turn: review the code on this branch, which addresses this issue, and report anything wrong, missing, risky, or more than the issue needs, saying freely what is unnecessary. It writes its review as it would post it on the pull request and approves when it would merge the change as it stands, each through the `rp thread` command its assignment states; a later turn asks it to check the author's answers and what changed since its last message, and a turn that only repairs malformed files it wrote asks for that repair alone. Its profile is one sentence: reread the assignment at every turn and after a compaction. When it and the author disagree on what the issue means or demands, it says so in the thread, and the author takes the question to the owner.

In experiments over 66 reviews, that request and its plain framing decided whether a review judged what is unnecessary and kept to the issue's scope; a profile that framed the review with rules, evidence, and observation labels suppressed it. A second experiment, over 158 blind-graded reviews, found the same of the profile's content and structure. On one change, a review judged something unnecessary in 1 of 8 runs with a profile of eight paragraphs carrying the turns and the guardrails, and in 2 of 14 with the producers' sections — role, seat, turn, protocol, formats — against about half or more with a profile of one sentence or a few short paragraphs. A profile of one sentence measured no worse than none. Among the short designs — protocol in the profile or the assignment, in prose or through a command — the differences stayed within noise. Bugs found and protocol kept did not differ. The reviewer is therefore the one role whose profile does not carry every constant instruction: its request and its turn's instructions live in its templates. Whether the reviewer ran the software made no difference.

A project runs two review lanes, without a brief, on models from different providers.

The reviewer talks only with the implementer, the author of the change. When a finding questions what a requirement or a design decision demands, the implementer does not defend the clause: it opens a thread to the clause's owner carrying the finding, and answers the reviewer with the result — the change revised, or the owner's evidence that the clause stands.

A review lane approves by closing its thread `approved` at the commit its turn started at. The implementation is approved when every review lane's approval is fresh.

## Roles

- **Orchestrator.** The session that runs the skill. It triages with the owner, creates the pipeline branch and worktree, records phase 0, runs each step that `rp next` plans, firing its hooks and waking the roles it names, lands their turns with `rp land`, watches health, carries disagreements on owner territory to the owner, and opens the pull request. It judges no content, relays no message, and writes no solution code: when publishing needs the change to apply onto a moved base branch, the implementer merges the base branch first and the review covers the resolution.
- **`spec-producer`.** Owns `spec.md`. Modes: produce, respond, consolidate.
- **`design-doc-producer`.** Owns `design-doc.md`. Modes: produce, respond, consolidate.
- **`implementer`.** Owns the code, tests, documentation, and `notes.md`. Modes: implement, respond.
- **`reviewer`.** Owns its review thread. A first turn, later turns, and a repair turn, one assignment template each.

There is no helper profile. Every role delegates bounded work to its tool's subagents, in its own worktree, on the model its tool finds by the subagent model name its assignment gives, and remains responsible for the result. The pipeline configuration names that model per profile and lane, as the project's **Agents** convention writes it; without one, or when the tool finds none, it is the role's own model.

Roles persist within a phase when the tool allows it and are replaced by a new instance when it does not. A new instance reads the same files and continues. Each phase's roles are new instances: the design doc's producer is never the spec's.

**Assignments.** A role's prompt is a file, not a message: before every turn, `rp next --apply` fills the role's template from the pipeline and its configuration and writes it to `<profile>.md` in the assignment folder of the role's worktree, `git rev-parse --git-path rp/` — inside the worktree's private git directory, outside the tree — so the orchestrator copies nothing into it; every other file prepared for the role, such as the diff a reviewer reads on a later turn, lives beside the assignment, private to that worktree; the message that starts a turn is exactly `Read your assignment: <absolute path>.`, naming that file so whoever reads the role's conversation sees which one; applying also records each woken role's turn, which `rp land` reads, so the orchestrator reads no assignment. The profile, which is the role's system prompt, names that path and tells the role to reread it after a compaction: a compaction summarizes a role's messages but keeps its system prompt and its working directory, so the role can always reread its seat, materials, rules, and subagent model. No two instances of one profile share a worktree.

The producers and the implementer share one shape — Role, Seat, Turn, Rules, Protocol, Formats — under one rule: what is constant across a role's turns lives in its profile, what changes lives in its assignment. The reviewer's profile is one sentence, and its request lives in its assignment (§ Review).

## Observation

Every role runs with full execution: it reads, runs, builds, drives the software, starts the environments the project's **Resources** convention names, and reproduces failures. The line that v2 and v3 drew between reading and running is replaced by the line between present and future:

- A claim about the present is observed, and the artifact states how.
- A claim about the solution is assumed, and the artifact states what will confirm it.

A producer writes no solution code. A probe that answers "what does X do today" is observation; a spike that answers "would my approach work" is building, and belongs to the implementer.

## Threads

A thread is the conversation between two roles about one artifact, recorded as one file. It replaces review waves, adjudication records, help requests, and claims.

**File.** `threads/<n>-<opener>-<recipient>-<about>.md`. Its frontmatter declares `status`, `opener`, `recipient`, and `about`; a thread to `owner` adds `cites`. A role's name in threads is `<profile>[-<lane>]`: `spec-producer`, `design-doc-producer`, `implementer`, `owner`, the person, and `reviewer-<lane>` for a review lane. Production lanes open no threads, and a thread whose opener or recipient is `spec-producer-<lane>` or `design-doc-producer-<lane>` is a contradiction `rp check` reports. Thread roles are validated by that grammar, never against the current configuration, so a removed lane's threads stay readable history; the commit that drops a review lane also closes its open threads `withdrawn`, and an open thread awaiting a review lane the configuration does not declare is a contradiction `rp check` reports. A thread is about `intent`, `spec`, `design-doc`, or `implementation`, each paired with its owner as recipient. Roles write none of this by hand: `rp thread` writes the file name, the frontmatter, and each message heading around the body the role writes, numbering a new thread past the highest number in the role's `threads/`; threads opened in parallel may share a number, and the opener in the name keeps paths unique. Statuses are `open`, `approved` (a review thread) or `resolved` (any other), `withdrawn`, and, on a thread to `owner`, `escalated` and `answered`. The body is a sequence of messages, each headed by its author and the commit it refers to. A message is a batch: a list of findings, or a response to each finding of the previous message, as long as it needs to be.

**Who opens.** A role opens a thread to the owner of an artifact it consumes when it finds a problem while consuming: the design doc's producer to the spec's owner; the implementer to the design doc's or the spec's owner. The reviewer opens threads to the implementer only, and the implementer carries a finding that questions a clause to that clause's owner. Nobody opens a thread downstream: what an upstream artifact's change means for its consumers reaches them through the artifact and its pins.

**Turns.** A message ends its author's turn. The orchestrator wakes the recipient, who reads its artifact, its inputs, and the thread, works, commits the artifact changes the response requires, and replies: for each finding, what changed and in which commit, or why it stands. The opener reads the reply and closes the thread, replies again with new findings or new evidence, or escalates.

**Redirection.** A finding about something the addressee does not own is answered by naming the owner. The opener closes it there and reopens it with that owner.

**Disagreement.** A reply that repeats a position without new evidence is a disagreement. Resolution depends on what is disputed:

- A derived requirement or a design decision: resolved by observation, inside the thread. A clause whose defense cites an input observed in intended use stands, and the opener closes the finding; a clause defended by what could happen falls, and its owner revises the artifact. No status marks this.
- What the intent means or demands: owner territory. A question the intent's words leave open is not a disagreement: producers interpret it (§ Spec). A thread to `owner` about `intent`, with status `escalated`, stating the question, exists for two cases only: two roles still disagree on what the intent demands after a reply that repeats a position without new evidence, and either party opens it citing that thread — on a review thread, the implementer; or a role shows, with evidence, that every kind of approach fails an intent goal or constraint, and opens it citing that evidence. Its `cites` names the thread or the evidence; `rp check` reports a thread to `owner` without it as malformed. `escalated` is the only status that reaches the owner, and only a thread addressed to `owner` carries it. The orchestrator carries it to the owner, records the answer as later input targeting the disputed artifact, and closes the thread `answered`. A clause that stands by observation while the reviewer holds satisfying it disproportionate to the intent is a disagreement on the intent's scope and takes this route, opened by the implementer.

**What reaches the artifact.** Only the result: the artifact changes, or it does not. When a refutation establishes that a case is not material, the spec's **Considered and not required** gains a line, so the case is not raised again. Threads are never cited from artifacts.

**Lifetime.** Threads stay in the pipeline folder. A role writes only in a thread it opens or one that awaits it, and `rp thread` changes an existing thread only by appending a message or setting its status; a closed thread is history. Before it ends a turn, a role runs `rp validate`, which reports each of its files the file grammar rejects, so the role fixes it within that turn.

## State

Everything about a pipeline is computed from its tree at any commit, as in v3, with far less to compute.

- **Identity** is the first twelve hexadecimal characters of the blob id Git stores for the whole file, so the working tree and any commit agree, whatever line-ending conversion the repository applies.
- **One writer per file.** The values roles and the orchestrator write for `rp` — a thread's header, `notes.md`'s status, a later input's target and origin, the intent's origins — are a flat YAML frontmatter on the files they write. What `rp` certifies lives in files only `rp` writes, so a role never has to leave anything of `rp`'s untouched.
- **Turns.** A role's turn starts at a commit: the tip of its worktree when the orchestrator wakes it, which its assignment names. Everything the role read, it read at that commit. Landing certifies at that commit.
- **Pins.** Landing writes each landed file's certification, `certification/<its path>.json`, listing as `inputs` each required input with its identity at the turn's commit. `rp land` derives the required inputs from the artifact's kind and pins them at their identities in that commit's tree, whether or not the turn changed the artifact, and never writes the artifact. Each landed file has its own certification, so lanes landed in parallel merge into the pipeline branch, and it back into them, without conflict. The spec pins the intent and every later input that targets it; the design doc pins the spec and every later input that targets it; `notes.md` pins the spec, the design doc, and every later input that targets it. A candidate pins only what its lane read: the intent for a spec candidate, the spec for a design doc candidate. The later inputs that target an artifact are the artifact's; its producer reads them with the candidates when it consolidates, so a later input that arrives while lanes run reruns no lane. Candidates are required only while the artifact is missing. A review thread closed `approved` is certified at the review head its reviewer read: the intent and every later input at their identities there, so a later input that reached the pipeline branch while the reviewer worked leaves the approval stale. `rp land` certifies it at the review head the reviewer's last heading names. Its certification records as `approved-commit` the pipeline-branch commit its approval lands on, whose code must be the review head's, or it lands uncertified, so the approval stays readable on every clone of the pipeline branch after the lane branch is gone. A clone that lacks that commit, after a squash merge or a deleted branch, counts the approval as none, and the lane reviews again.
- **Net change.** The diff from the merge-base to the tip outside the pipelines folder: what the reviewer reads.
- **Stale.** An artifact or approval whose required input is unpinned or has a different identity now. An approval is also stale when the tip's code differs from the approved commit's by anything other than clean merges of the base branch: `rp check` merges the merge-base of the tip and the base branch into the approved commit with `git merge-tree` and compares the resulting tree with the tip's tree outside the pipelines folder; a conflict outside the pipelines folder or a difference makes it stale. A review lane is approved when its latest thread to the implementer is closed `approved` and fresh.
- **Missing.** An absent artifact; `notes.md` is also missing until its `status` is `done`.
- **Awaiting.** An `open` thread awaits its opener when its recipient wrote the last message, and its recipient otherwise.
- **Frontier.** `rp check` prints the first that holds:
  1. a malformed pipeline file: `malformed <path>: <reason>`; nothing is computed from a malformed file, and the orchestrator wakes its author with the `malformed` lines under **Malformed files** in its assignment, which the role fixes first;
  2. a thread with status `escalated`: `escalate <thread>`;
  3. the lowest phase whose role has work, where work is a thread awaiting the role, in any phase, or its artifact missing or stale, in a phase through the target:
     - a phase with production lanes and a missing artifact: `produce <artifact> <lane>` for each candidate missing and `respond <artifact> <lane>` for each stale, else `consolidate <artifact>`;
     - a missing artifact: `produce <artifact>`;
     - a stale artifact, or a thread awaiting its owner: `respond <artifact>`;
     - phase 4: `review <lane>` for each lane not approved or with a thread awaiting its reviewer;
  4. `complete`.

  `<artifact>` is the artifact's name. One line per action. Below the frontier, `rp check` lists the threads awaiting each woken role and the inputs that changed for each stale artifact. Because threads only run upstream, the lowest phase with work is always the party whose turn it is, and a role waiting on a thread it opened is never woken for its missing artifact. A thread counts as work whatever the target, so lowering the target never completes a pipeline with an open thread.
- **Script.** `rp` keeps four commands for the orchestrator: `check`, `pipelines <pipelines folder root> [--issue <ref>]` (discovery by the intent's origin, as v3), `next`, which plans the loop's next step and with `--apply` carries it out — lane branches and worktrees, a review lane's review head, each woken role's assignment — and `land`, which lands one role's turn: it merges or cherry-picks a lane, validates and certifies what the turn brings, commits, and reports the phases the landing completed. Roles run two more, `thread` and `validate`, from the file grammar alone — every check of a file that reads the file alone — so they work in a review lane's tree, which holds no `config.json`; each assignment states the command that runs them as its role, and a wrong use says what to run instead. `check`, `next`, and `land` derive the pipelines folder root from the pipeline folder they are given; `pipelines` is given it, as the orchestrator reads it from the project's conventions, and takes the artifact base branch as an argument. No command reads `.rp.md`: `check`, `next`, and `land` read the pipeline configuration, and `next` and `land` the clone's `config.local.json` over it. A folder of the pipelines folder root is a pipeline when it holds `config.json`, and discovery reads only each pipeline's intent, stopping on one the file grammar rejects. `config.json` carries `target-phase`, `base-branch`, the conventions copied from `.rp.md`, `agents` — each profile's model, subagent model, and lanes, each lane with an optional `brief` and its own models — and `owner-directions`, which `rp` ignores. A lane without a brief covers its profile's whole scope. Without a `reviewer` lane, one lane named `default` runs; a configuration may also declare `default` itself alongside other review lanes. `check` describes a live branch; a merged pipeline is history in the artifact base branch's tree, and the entry points read it there instead of running `check` on it. A pipeline path of the wrong kind, such as a folder where a file belongs, stops every command, as does a certification `rp` cannot read. Nothing else is computed.

A step is `rp` plus the tool: `rp next` plans it, the orchestrator fires the hooks the plan names, `rp next --apply` applies it, the orchestrator wakes the roles it names with its tool, and `rp land` lands each turn. The orchestrator runs no Git command in a step, computes no path, and reads no thread or assignment. There are no mirrors, packages, waves, episodes, lane packages, or task reports.

## Production lanes

A project may configure production lanes for the spec and the design doc: named lanes, each with a model and an optional brief, that produce a candidate in `lanes/<lane>/` in parallel. A lane decides every question by the same rules as any producer, so its candidate holds only its final reading, and it opens no thread. When every candidate exists, the producer runs in consolidate mode and writes the artifact, resolving where candidates differ.

Consolidation treats divergence as evidence. A case or decision every lane reached is kept. A case or decision only one lane reached is a question, answered by observing whether intended use produces its input; it is never kept by default. Where lanes chose differently on the same question, the producer decides from the observed evidence and records the alternative in one line. Lanes run on different models when the project configures them so.

Lanes replace the v3 spec and design doc reviewers. Two independent readings of the intent show both what one reading missed and what one reading added; a reviewer shows only the first.

There are no production lanes for the implementation. Review lanes are the reviewer's: each is one reviewer, with its brief when it has one, and all must approve. A project runs two, on models from different providers (§ Review).

## The owner

The owner talks only to the orchestrator and is asked three kinds of question: to approve the synthesis of an intent or later input before it is written, to decide a disagreement on owner territory, and to confirm the run when its configuration or routing is not settled. The owner may read and edit any artifact at any time; a change goes stale downstream through pins and the loop converges on it.

A pipeline may target an earlier phase so the owner can read the spec or the design doc before implementation. That is a choice about what the owner wants to see, not an estimate of difficulty.

## Conventions and tools

Each project records its conventions in `.rp.md`: issues, pipeline slug, pipeline branch format, pipelines folder root, artifact storage, worktree folder root, landing commit format, commit format, pull-request format, guardrails, resources, lifecycle hooks, agents (models and lanes per profile), variables, and health monitoring. Guardrails bind every role they name, and the reviewer evaluates them against the change. Resources name what every role may run.

`.rp.md` is prose a person reads and edits. At every run start the orchestrator copies the conventions `rp` reads — the worktree folder root, the landing commit format, and what an assignment carries: the commit format, guardrails, resources, and variables — verbatim into the pipeline's `config.json`, selecting entries and associating them with profiles, never rewording them, so `rp` can validate them, place lane worktrees, shape its commits, and fill every assignment. A developer's `.rp.local.md` overrides, models included, go to `config.local.json` beside it, which no commit holds. Editing `.rp.md` changes no run under way, and a merged pipeline keeps the conventions it ran under. Guardrail, resource, commit-format, and brief texts may name pipeline facts in braces, such as `{role}`, or variables the project declares over them, which `rp next --apply` expands for each role. Every other convention, which the orchestrator acts on with judgment, stays prose. Model names travel as the project writes them: the orchestrator resolves a role's model with its tool when it spawns it, and a role resolves its subagent model with its own.

The active tool's mechanics live in the skill's `tools/<tool>.md`: how to spawn a role on a model and profile, seat it in a worktree, resume it with a message, learn that it finished or failed, terminate it, and run health ticks. v4 prefers the tool's native primitives for every one of these and ships plugin code only where a tool lacks one.

## What v4 removes

| Removed | Why |
| --- | --- |
| Spec and design doc reviewers | Their only output was additive. Consumers review what they consume; production lanes give a second reading with both inclusions and omissions. |
| Build plan, tasks, workers, task reports | Sealed workers saw one task each and nobody held the change. The implementer holds it. |
| Document phase, plan, worker, reviewer | Documentation is part of the change; the reviewer judges it against the intent with the code. |
| Helper profile and help requests through the orchestrator | Roles observe for themselves and delegate to native subagents. |
| `inspection only` execution | Producers may observe the present. The line is present versus future, not reading versus running. |
| Research records | Observations are cited inline; discussion lives in threads; the second copy that could disagree with the artifact is gone. |
| Waves, packages, mirrors, lane packages, episodes, code delta | Threads and one pin per input carry what they carried. |
| Claims, `unsatisfiable` verdicts, `Contradicts-input` | A thread addressed to the owner of the clause, with the observed-versus-conceivable rule. |
| Owner-chosen lanes per run | Redundancy is configured per project, for every pipeline alike. |
| Round counters and stop thresholds | A disagreement is recognized by content, not by count. |

## Two traces

**A pipeline whose subject is a virtual machine.** The spec producer starts the machine, reproduces the reported behavior, and writes requirements with `observed:` claims and the inputs it saw. The design doc producer starts it again to check the interfaces it binds. The implementer builds, runs the machine, and verifies. The reviewer starts it and drives the change. Nobody writes about imagined behavior and nobody writes a plan.

**A merge from the base branch during review.** The implementer merges the base into the pipeline branch. The tip is the approved commit plus a clean merge of the base, so every review approval stays fresh. If the merge conflicted, the resolution is code the approval did not cover, the approval goes stale, and the reviewer sees the diff since the commit it approved.
