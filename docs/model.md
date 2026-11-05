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

1. **The intent is the only authority.** Everything after it is chosen by an agent and is negotiable among agents. The owner decides only what the intent means or demands.
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
| 1 Spec | `1-spec/` | `spec.md`; production lanes in `lanes/<id>/spec.md` | `spec-producer` |
| 2 Design doc | `2-design-doc/` | `design-doc.md`; production lanes in `lanes/<id>/design-doc.md` | `design-doc-producer` |
| 3 Implementation | `3-implementation/` | `notes.md`; the code, tests, and documentation on the pipeline branch | `implementer` |
| 4 Review | `threads/` | Review threads, one per review lane, closed `approved` | `reviewer` |

Threads live in `threads/` at the pipeline folder root. Every pipeline folder also carries `run-config.md` with its target phase, base branch, and the lanes and models the project configured.

Build and document are one phase. The implementer delivers the code, its tests, and every piece of documentation the change needs. Planning is the implementer's own and is not an artifact.

### Intent

Unchanged from v3: the owner's goal, constraints, and proposals, synthesized by the orchestrator and approved by the owner before it is written. Later input is recorded as the owner gave it, in the fewest words that carry it, with `target:` and `origin:`.

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

Tests follow the classical school: a test exercises the delivered path from the public interface whose outcome it proves; a test double replaces only what the test cannot run. A new test proves something no other test proves. A failure is the implementer's when the change caused it or an intent outcome depends on it; one that reproduces on the base and that the change leaves untouched is recorded in the notes. Documentation states what readers can now do, must now do, or no longer need to do, at the depth they act on it; it restates nothing readers already assume.

`notes.md` is the implementer's resumption file: the identity of the design doc and spec it started from, what is done, what remains, the decisions it took within its boundaries that a successor should know, and the approaches that failed. It is updated at milestones and when a turn ends. `status: done` on its first lines declares the implementation complete. It carries no discussion.

### Review

Each configured review lane spawns a `reviewer`, with its brief when it has one. The reviewer reviews the change as a developer outside the pipeline reviews a pull request: it receives the intent and its later inputs — the issue — and the net change — the pull request — and nothing else. It does not know the spec, the design doc, or the notes exist: its worktree is a sparse checkout that leaves out the pipeline's `1-spec/`, `2-design-doc/`, and `3-implementation/` folders. Its assignment is the request a developer would get: review the code on this branch, which addresses this issue, and report anything wrong, missing, risky, or more than the issue needs, saying freely what is unnecessary. It writes its review as it would post it on the pull request and approves when it would merge the change as it stands. Its profile adds only how to continue the conversation and end a turn.

In experiments over 66 reviews, that request and its plain framing decided whether a review judged what is unnecessary and kept to the issue's scope; a profile that framed the review with rules, evidence, observation labels, or a structured seat suppressed it. Whether the reviewer ran the software made no difference.

A project runs two review lanes, without a brief, on models from different providers.

The reviewer talks only with the implementer, the author of the change. When a finding questions what a requirement or a design decision demands, the implementer does not defend the clause: it opens a thread to the clause's owner carrying the finding, and answers the reviewer with the result — the change revised, or the owner's evidence that the clause stands.

A review lane approves by closing its thread `approved` at the commit its turn started at. The implementation is approved when every review lane's approval is fresh.

## Roles

- **Orchestrator.** The session that runs the skill. It triages with the owner, creates the pipeline branch and worktree, records phase 0, wakes the role the frontier names, watches health, carries disagreements on owner territory to the owner, and opens the pull request. It judges no content, relays no message, and writes no solution code: when publishing needs the change to apply onto a moved base, the implementer merges the base first and the review covers the resolution.
- **`spec-producer`.** Owns `spec.md`. Modes: produce, respond, consolidate.
- **`design-doc-producer`.** Owns `design-doc.md`. Modes: produce, respond, consolidate.
- **`implementer`.** Owns the code, tests, documentation, and `notes.md`. Modes: implement, respond.
- **`reviewer`.** Owns its review thread. One mode.

There is no helper profile. Every role delegates bounded work to its tool's subagents, in its own worktree, on the subagent model its assignment names, and remains responsible for the result. The project's **Agents** convention sets that model per profile and lane; without one, it is the role's own model.

Roles persist within a phase when the tool allows it and are replaced by a fresh instance when it does not. A fresh instance reads the same files and continues. Roles are fresh across phases: the design doc's producer is never the spec's.

**Assignments.** A role's prompt is a file, not a message: the orchestrator writes the filled template to `git rev-parse --git-path rp/<profile>.md` in the role's worktree — the worktree's private git directory, outside the tree — before every spawn and wake, and every other file the orchestrator prepares for the role, such as the net change it reviews, lives beside the assignment, private to that worktree; the message that starts a turn is exactly `Read your assignment.`; at landing the orchestrator reads the turn commit from the assignment. The profile, which is the role's system prompt, names that path. A compaction summarizes a role's messages but keeps its system prompt and its working directory, so the role can always reread its seat, materials, rules, and subagent model. No two instances of one profile share a worktree.

## Observation

Every role runs with full execution: it reads, runs, builds, drives the software, starts the environments the project's **Resources** convention names, and reproduces failures. The line that v2 and v3 drew between reading and running is replaced by the line between present and future:

- A claim about the present is observed, and the artifact states how.
- A claim about the solution is assumed, and the artifact states what will confirm it.

A producer writes no solution code. A probe that answers "what does X do today" is observation; a spike that answers "would my approach work" is building, and belongs to the implementer.

## Threads

A thread is the conversation between two roles about one artifact, recorded as one file. It replaces review waves, adjudication records, help requests, and claims.

**File.** `threads/<n>-<opener>-<owner>-<artifact>.md`. Its first lines declare `status`, `opener`, `owner`, and `artifact`; a thread to `owner` adds `cites`. A role's name in threads is `<profile>[-<lane>]`: `spec-producer`, `design-doc-producer`, `implementer`, `owner`, the person, and `reviewer-<lane>` for a review lane. Production lanes open no threads; the grammar still accepts `spec-producer-<lane>` and `design-doc-producer-<lane>` so their closed threads from earlier runs stay readable, and an open or `disagreement` thread with such a party is a contradiction `rp check` reports. Thread roles are validated by that grammar, never against the current configuration, so a removed lane's threads stay readable history; the commit that drops a review lane also closes its open threads `closed: withdrawn`, and an open thread awaiting a review lane the configuration does not declare is a contradiction `rp check` reports. Artifacts are `intent`, `spec`, `design-doc`, and `implementation`, each paired with its owner. `<n>` is one more than the highest number in `threads/` when the thread opens; threads opened in parallel may share a number, and the opener in the name keeps paths unique. Statuses are `open`, `closed: approved`, `closed: withdrawn`, `closed: answered`, and `disagreement`. The body is a sequence of messages, each headed by its author and the commit it refers to. A message is a batch: a list of findings, or a response to each finding of the previous message, as long as it needs to be.

**Who opens.** A role opens a thread to the owner of an artifact it consumes when it finds a problem while consuming: the design doc's producer to the spec's owner; the implementer to the design doc's or the spec's owner. The reviewer opens threads to the implementer only, and the implementer carries a finding that questions a clause to that clause's owner. Nobody opens a thread downstream: what an upstream artifact's change means for its consumers reaches them through the artifact and its pins.

**Turns.** A message ends its author's turn. The orchestrator wakes the addressee, who reads its artifact, its inputs, and the thread, works, commits the artifact changes the response requires, and replies: for each finding, what changed and in which commit, or why it stands. The opener reads the reply and closes the thread, replies again with new findings or new evidence, or marks disagreement.

**Redirection.** A finding about something the addressee does not own is answered by naming the owner. The opener closes it there and reopens it with that owner.

**Disagreement.** A reply that repeats a position without new evidence is a disagreement. Resolution depends on what is disputed:

- A derived requirement or a design decision: resolved by observation, inside the thread. A clause whose defense cites an input observed in intended use stands, and the opener closes the finding; a clause defended by what could happen falls, and its owner revises the artifact. No status marks this.
- What the intent means or demands: owner territory. A question the intent's words leave open is not a disagreement: producers interpret it (§ Spec). A thread to `owner` about `intent`, with status `disagreement`, stating the question, exists for two cases only: two roles still disagree on what the intent demands after a reply that repeats a position without new evidence, and either party opens it citing that thread; or a role shows, with evidence, that every kind of approach fails an intent goal or constraint, and opens it citing that evidence. Its header line `cites:` names the thread or the evidence; `rp check` reports a thread to `owner` without it as `INVALID`. `disagreement` is the only status that reaches the owner, and only a thread addressed to `owner` carries it. The orchestrator carries it to the owner, records the answer as later input targeting the disputed artifact, and closes the thread `closed: answered`. A clause that stands by observation while the reviewer holds satisfying it disproportionate to the intent is a disagreement on the intent's scope and takes this route.

**What reaches the artifact.** Only the result: the artifact changes, or it does not. When a refutation establishes that a case is not material, the spec's **Considered and not required** gains a line, so the case is not raised again. Threads are never cited from artifacts.

**Lifetime.** Threads stay in the pipeline folder. A role writes only in a thread it opens or one that awaits it, editing only the status line and appending messages; a closed thread is history.

## State

Everything about a pipeline is computed from its tree at any commit, as in v3, with far less to compute.

- **Identity** is the first twelve hexadecimal characters of the blob hash of a file's body below its frontmatter. The orchestrator writes frontmatter; roles never do.
- **Turns.** A role's turn starts at a commit: the tip of its worktree when the orchestrator wakes it, which its assignment names. Everything the role read, it read at that commit. Landing records that commit: `rp stamp <file> --at <commit>`.
- **Pins.** An artifact's frontmatter lists `inputs`: each required input with its identity at the turn's commit. `rp stamp <artifact> --at <commit>` derives the required inputs from the artifact's kind and pins them at their identities in that commit's tree, whether or not the turn changed the artifact; the orchestrator stamps in the role's worktree before merging anything into it. At consolidation the orchestrator adds `--pin` for each candidate merged. The spec pins the intent and every later input that targets it; the design doc pins the spec and every later input that targets it; `notes.md` pins the spec, the design doc, and every later input that targets it. A candidate pins only what its lane read: the intent for a spec candidate, the spec for a design doc candidate. The later inputs that target a root are the root's; its consolidator reads them with the candidates, so a later input that arrives while lanes run reruns no lane. A consolidated root also pins the candidates it merged, as a record; candidates are required only while the root is missing. A review thread closed `approved` pins the intent and every later input, and records as `reviewed` the commit the turn started at: the code it approved.
- **Net change.** The diff from the base to the tip outside the pipelines folder: what the reviewer reads.
- **Stale.** An artifact or approval whose required input is unpinned or has a different identity now. An approval is also stale when the tip's code differs from the approved commit's by anything other than clean merges of the base: `rp check` merges the base, the merge-base of the tip and the base branch, into the approved commit with `git merge-tree` and compares the resulting tree with the tip's tree outside the pipelines folder; a conflict or a difference makes it stale. A review lane is approved when its latest thread to the implementer is closed `approved` and fresh.
- **Missing.** An absent artifact; `notes.md` is also missing until its first body line is `status: done`.
- **Awaiting.** An `open` thread awaits its opener when its owner wrote the last message, and its owner otherwise.
- **Frontier.** `rp check` prints the first that holds:
  1. a malformed frontmatter, thread header, or `target:` line: `INVALID <path>: <reason>`; nothing is computed from a malformed file, and the orchestrator wakes its author with the `INVALID` lines under **Malformed files** in its assignment, which the role fixes first;
  2. a thread with status `disagreement`: `escalate <thread>`;
  3. the lowest phase whose role has work, where work is a thread awaiting the role, in any phase, or its artifact missing or stale, in a phase through the target:
     - a phase with production lanes and a missing root: `lane <artifact> <id>` for each candidate missing or stale, else `consolidate <artifact>`;
     - a missing artifact: `produce <artifact>`;
     - a stale artifact, or a thread awaiting its owner: `respond <artifact>`;
     - phase 4: `review <lane>` for each lane not approved or with a thread awaiting its reviewer;
  4. `complete`.

  One line per action. Below the frontier, `rp check` lists the threads awaiting each woken role and the inputs that changed for each stale artifact. Because threads only run upstream, the lowest phase with work is always the party whose turn it is, and a role waiting on a thread it opened is never woken for its missing artifact. A thread counts as work whatever the target, so lowering the target never completes a pipeline with an open thread.
- **Script.** `rp` keeps four commands: `check`, `stamp`, `pipelines <repo path> [--issue <ref>]` (discovery by the intent's origin, as v3), and `blocks`, which prints the Guardrails and Resources blocks a role's assignment carries, filled for the role, so no orchestrator selects them by hand. `check` and `stamp` derive the pipelines folder root from the pipeline folder they are given; `pipelines` reads it from the project's conventions, the local override first, and takes the artifact base branch as an argument. Discovery reads only each pipeline's intent origins and its `run-config.md`'s `format`, so a pipeline of an earlier format is listed, never parsed: it is history, and work on its issue starts a new pipeline. `run-config.md` carries `format` (the conventions format it was written under, `6`), `target-phase`, `base`, and `lanes` with `profile`, `id`, and an optional `brief`; models live in its body, which `rp` ignores. A lane without a brief covers its profile's whole scope. Without a `reviewer` lane, one lane named `default` runs; a configuration may also declare `default` itself alongside other review lanes. `check` describes a live branch; a merged pipeline is history in the base branch's tree, and the entry points read it there instead of running `check` on it. `pipelines` reads the project's conventions from the main checkout, where the local override lives. A pipeline path of the wrong kind, such as a folder where a file belongs, stops every command. Nothing else is computed.

The orchestrator stamps on landing, as in v3. There are no mirrors, packages, waves, episodes, lane packages, or task reports.

## Production lanes

A project may configure production lanes for the spec and the design doc: named lanes, each with a model and an optional brief, that produce a candidate in `lanes/<id>/` in parallel. A lane decides every question by the same rules as any producer, so its candidate holds only its final reading, and it opens no thread. When every candidate exists, the producer runs in consolidate mode and writes the root artifact, resolving where lanes differ.

Consolidation treats divergence as evidence. A case or decision every lane reached is kept. A case or decision only one lane reached is a question, answered by observing whether intended use produces its input; it is never kept by default. Where lanes chose differently on the same question, the consolidator decides from the observed evidence and records the alternative in one line. Lanes run on different models when the project configures them so.

Lanes replace the v3 spec and design doc reviewers. Two independent readings of the intent show both what one reading missed and what one reading added; a reviewer shows only the first.

There are no production lanes for the implementation. Review lanes are the reviewer's: each is one reviewer, with its brief when it has one, and all must approve. A project runs two, on models from different providers (§ Review).

## The owner

The owner talks only to the orchestrator and is asked three kinds of question: to approve the synthesis of an intent or later input before it is written, to decide a disagreement on owner territory, and to confirm the run when its configuration or routing is not settled. The owner may read and edit any artifact at any time; a change goes stale downstream through pins and the loop converges on it.

A pipeline may target an earlier phase so the owner can read the spec or the design doc before implementation. That is a choice about what the owner wants to see, not an estimate of difficulty.

## Conventions and tools

Each project records its conventions in `.rp.md`: issues, pipeline slug, pipeline branch format, pipelines folder root, artifact storage, worktree folder root, commit format, pull-request format, guardrails, resources, lifecycle hooks, agents (models and lanes per profile), and health monitoring. Guardrails bind every role they name, and the reviewer evaluates them against the change. Resources name what every role may run.

The active tool's mechanics live in the skill's `tools/<tool>.md`: how to spawn a role on a model and profile, seat it in a worktree, wake it with a message, learn that it finished or failed, terminate it, and run health ticks. v4 prefers the tool's native primitives for every one of these and ships plugin code only where a tool lacks one.

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
