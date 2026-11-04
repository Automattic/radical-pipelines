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
6. **Review the result, not the process.** One review, at the end, of the diff against the intent, by a reviewer who has not seen the discussion. Upstream artifacts are reviewed by the roles that consume them, while consuming them.
7. **Redundancy by design, the same for every pipeline.** Where a second independent reading pays, the project configures it once for all its pipelines. Nobody estimates a task's difficulty.
8. **Every turn starts from files.** A role reads its artifact, its inputs, and its threads, works, writes, and ends its turn. A role that dies is replaced by one that reads the same files.

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

Every requirement carries its origin: `from-intent`, when the intent states it, with the intent item it cites; or `derived`, when the producer inferred it, with the input observed in intended use that makes the case material. A derived requirement without an observed input is written as an assumption, not a requirement.

The section **Considered and not required** lists, one line each, the cases the producer examined and left out because no intended use produces them. It is the spec's negative space: a consumer or reviewer who wonders about a case finds it there before raising it.

Every claim is `observed: <how>` or `assumed: <what will confirm it>`. A claim about current behavior that could have been observed by running the software and was not is a finding against the spec.

Acceptance criteria state the input, where the outcome is observed, and the outcome. They never prescribe fixtures, sequences, or variants.

### Design doc

The v3 format and altitude rules are kept: Overview, Architecture, Decisions, Interfaces, Dependencies, Failure modes and observability, Verification, Risks, Open assumptions. The design doc binds component responsibilities and their contracts with consumers: signatures, schemas, the behavior a caller observes. How a component satisfies its contract is the implementer's: control flow, call sequences, names, literal values, and test cases, whether written as prose or as code.

Every decision names the requirements it serves. Every option set includes the simplest option that could satisfy the spec. A mechanism, guard, or proof serves a requirement in proportion to how much it matters to the intent; one that serves none is removed, and the case a proportionate mechanism leaves uncovered is recorded under Risks with its consequence. The Verification section names each proof once, with what it proves and at which boundary, never its inputs or steps.

### Implementation

The implementer receives the spec and the design doc and builds the change in the pipeline worktree, as a developer would: it runs the software, writes the code, its tests, and its documentation, and uses its tool's subagents for bounded work it can hand over whole. It integrates and judges everything a subagent returns. Subagents run in parallel only for work that writes nothing.

Order of work: first the smallest change that satisfies the intent's from-intent requirements; then each derived requirement in its own commit. When the intent describes a bug, the implementer fixes its general cause, not the case the spec enumerates.

Boundaries: a new component, abstraction, dependency, or configuration surface that the design doc does not decide is a design change. The implementer opens a thread to the design doc's owner before writing it.

Tests follow the classical school: a test exercises the delivered path from the public interface whose outcome it proves; a test double replaces only what the test cannot run. A new test proves something no other test proves. Documentation states what readers can now do, must now do, or no longer need to do, at the depth they act on it; it restates nothing readers already assume.

`notes.md` is the implementer's resumption file: the identity of the design doc and spec it started from, what is done, what remains, the decisions it took within its boundaries that a successor should know, and the approaches that failed. It is updated at milestones and when a turn ends. `status: done` on its first lines declares the implementation complete. It carries no discussion.

### Review

Each configured review lane spawns a `reviewer` with its brief. The reviewer reads the intent, the spec, the net change, and the implementer's notes. It does not read the design doc or any thread before its first message: it judges what shipped as a developer outside the pipeline would. It runs the suite and the build, drives the changed behavior, and records the evidence.

Its findings are proportion and correctness against the intent: behavior the intent asked for that is missing or wrong; a mechanism, guard, test, or documentation passage that no intent outcome needs; a bug fixed for the enumerated case rather than its cause; a convention of the project broken. A finding that a case is uncovered names the input that produces it in intended use.

Each finding is addressed to the owner of what it questions: the implementer for code; the spec's owner for a requirement, cited by id; the design doc's owner for a decision, cited by id. After the first message the reviewer may read the design doc and the threads.

A review lane approves by closing its thread `approved` at a named commit. The implementation is approved when every review lane's thread is closed `approved` at the current net change.

## Roles

- **Orchestrator.** The session that runs the skill. It triages with the owner, creates the pipeline branch and worktree, records phase 0, wakes the role the frontier names, watches health, carries disagreements on owner territory to the owner, and opens the pull request. It judges no content and relays no message.
- **`spec-producer`.** Owns `spec.md`. Modes: produce, respond, consolidate.
- **`design-doc-producer`.** Owns `design-doc.md`. Modes: produce, respond, consolidate.
- **`implementer`.** Owns the code, tests, documentation, and `notes.md`. Modes: implement, respond.
- **`reviewer`.** Owns its review thread. One mode.

There is no helper profile. Every role delegates bounded work to its tool's subagents, in its own worktree, and remains responsible for the result.

Roles persist within a phase when the tool allows it and are replaced by a fresh instance when it does not. A fresh instance reads the same files and continues. Roles are fresh across phases: the design doc's producer is never the spec's.

## Observation

Every role runs with full execution: it reads, runs, builds, drives the software, starts the environments the project's **Resources** convention names, and reproduces failures. The line that v2 and v3 drew between reading and running is replaced by the line between present and future:

- A claim about the present is observed, and the artifact states how.
- A claim about the solution is assumed, and the artifact states what will confirm it.

A producer writes no solution code. A probe that answers "what does X do today" is observation; a spike that answers "would my approach work" is building, and belongs to the implementer.

## Threads

A thread is the conversation between two roles about one artifact, recorded as one file. It replaces review waves, adjudication records, help requests, and claims.

**File.** `threads/<n>-<opener>-<owner>-<artifact>.md`. Its first lines declare `status`, `opener`, `owner`, and `artifact`. Roles are `spec-producer`, `design-doc-producer`, `implementer`, `reviewer-<lane>`, and `owner`, the person; artifacts are `intent`, `spec`, `design-doc`, and `implementation`, each paired with its owner. `<n>` is one more than the highest number in `threads/` when the thread opens; threads opened in parallel may share a number, and the opener in the name keeps paths unique. Statuses are `open`, `closed: approved`, `closed: withdrawn`, `closed: answered`, and `disagreement`. The body is a sequence of messages, each headed by its author and the commit it refers to. A message is a batch: a list of findings, or a response to each finding of the previous message, as long as it needs to be.

**Who opens.** A role opens a thread to the owner of an artifact it consumes when it finds a problem while consuming: the design doc's producer to the spec's owner; the implementer to the design doc's or the spec's owner. The reviewer opens one thread per owner it addresses. Nobody opens a thread downstream: what an upstream artifact's change means for its consumers reaches them through the artifact and its pins.

**Turns.** A message ends its author's turn. The orchestrator wakes the addressee, who reads its artifact, its inputs, and the thread, works, commits the artifact changes the response requires, and replies: for each finding, what changed and in which commit, or why it stands. The opener reads the reply and closes the thread, replies again with new findings or new evidence, or marks disagreement.

**Redirection.** A finding about something the addressee does not own is answered by naming the owner. The opener closes it there and reopens it with that owner.

**Disagreement.** A reply that repeats a position without new evidence is a disagreement. Resolution depends on what is disputed:

- A derived requirement or a design decision: resolved by observation, inside the thread. A clause whose defense cites an input observed in intended use stands, and the opener closes the finding; a clause defended by what could happen falls, and its owner revises the artifact. No status marks this.
- What the intent means or demands: owner territory. Either party opens a thread to `owner` about `intent`, with status `disagreement`, stating the question and citing the thread it comes from. `disagreement` is the only status that reaches the owner, and only a thread addressed to `owner` carries it. The orchestrator carries it to the owner, records the answer as later input targeting the disputed artifact, and closes the thread `closed: answered`. If a clause stands by observation and the reviewer still holds that satisfying it is disproportionate to the intent, the question is about the intent's scope and takes this route.

**What reaches the artifact.** Only the result: the artifact changes, or it does not. When a refutation establishes that a case is not material, the spec's **Considered and not required** gains a line, so the case is not raised again. Threads are never cited from artifacts.

**Lifetime.** Threads stay in the pipeline folder. A closed thread is history.

## State

Everything about a pipeline is computed from its tree at any commit, as in v3, with far less to compute.

- **Identity** is the first twelve hexadecimal characters of the blob hash of a file's body below its frontmatter. The orchestrator writes frontmatter; roles never do.
- **Pins.** An artifact's frontmatter lists `inputs`: each file it consumed with its identity. The spec pins the intent and every later input that targets it; the design doc pins the spec and every later input that targets it; `notes.md` pins the spec, the design doc, and every later input that targets it. A consolidated root also pins the candidates it merged, as a record; candidates are required only while the root is missing. A review thread closed `approved` carries `reviewed`: the patch id of the net change it approved, the diff from the base to the tip outside the pipelines folder, which a merge from the base does not alter.
- **Stale.** An artifact whose required input is unpinned or has a different identity now. A review lane is approved when its latest thread to the implementer is closed `approved` with `reviewed` equal to the current net change's id.
- **Missing.** An absent artifact; `notes.md` is also missing until its first body line is `status: done`.
- **Awaiting.** An `open` thread awaits its opener when its owner wrote the last message, and its owner otherwise.
- **Frontier.** `rp check` prints the first that holds:
  1. a malformed frontmatter, thread header, or `target:` line: `INVALID <path>: <reason>`; nothing is computed from a malformed file;
  2. a thread with status `disagreement`: `escalate <thread>`;
  3. the lowest phase through the target whose role has work, where work is a thread awaiting the role, or its artifact missing or stale:
     - a phase with production lanes and a missing root: `lane <artifact> <id>` for each candidate missing or stale, else `consolidate <artifact>`;
     - a missing artifact: `produce <artifact>`;
     - a stale artifact, or a thread awaiting its owner: `respond <artifact>`;
     - phase 4: `review <lane>` for each lane not approved or with a thread awaiting its reviewer;
  4. `complete`.

  One line per action. Below the frontier, `rp check` lists the threads awaiting each woken role and the inputs that changed for each stale artifact. Because threads only run upstream, the lowest phase with work is always the party whose turn it is, and a role waiting on a thread it opened is never woken for its missing artifact.
- **Script.** `rp` keeps three commands: `check`, `stamp`, and `pipelines <repo path> [--issue <ref>]` (discovery by the intent's origin, as v3). `run-config.md` carries `target-phase`, `base`, and `lanes` with `profile`, `id`, and `brief`; models live in its body, which `rp` ignores. Without a `reviewer` lane, one lane named `default` runs. Nothing else is computed.

The orchestrator stamps on landing, as in v3. There are no mirrors, packages, waves, episodes, lane packages, or task reports.

## Production lanes

A project may configure production lanes for the spec and the design doc: named lanes, each with a brief and a model, that produce a candidate in `lanes/<id>/` in parallel. When every candidate exists, the producer runs in consolidate mode and writes the root artifact.

Consolidation treats divergence as evidence. A case or decision every lane reached is kept. A case or decision only one lane reached is a question, answered by observing whether intended use produces its input; it is never kept by default. Where lanes chose differently on the same question, the consolidator decides from the observed evidence and records the alternative in one line. Lanes run on different models when the project configures them so.

Lanes replace the v3 spec and design doc reviewers. Two independent readings of the intent show both what one reading missed and what one reading added; a reviewer shows only the first.

There are no production lanes for the implementation. Review lanes are the reviewer's: each is one reviewer with its brief, and all must approve.

## The owner

The owner talks only to the orchestrator and is asked three kinds of question: to approve the synthesis of an intent or later input before it is written, to decide a disagreement on owner territory, and to confirm the run when its configuration or routing is not settled. The owner may read and edit any artifact at any time; a change goes stale downstream through pins and the loop converges on it.

A pipeline may target an earlier phase so the owner can read the spec or the design doc before implementation. That is a choice about what the owner wants to see, not an estimate of difficulty.

## Conventions and tools

Each project records its conventions in `.rp.md`: issues, pipeline slug, pipeline branch format, pipelines folder root, artifact storage, worktree folder root, commit format, pull-request format, guardrails, resources, lifecycle hooks, agents (models and lanes per profile), and health monitoring. Guardrails bind the implementer and the reviewer evaluates them. Resources name what every role may run.

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

**A merge from the base branch during review.** The implementer merges the base into the pipeline branch. The net change's patch id is unchanged, so every review approval stays fresh. If the merge touched a file the change also touched, the conflict resolution is part of the net change and the approval goes stale on that alone, and the reviewer sees only that diff.
