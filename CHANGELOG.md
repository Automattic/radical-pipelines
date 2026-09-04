# @automattic/radical-pipelines

## 0.16.0

### Minor Changes

- [#277](https://github.com/Automattic/radical-pipelines/pull/277) [`dcfcfaf`](https://github.com/Automattic/radical-pipelines/commit/dcfcfaf7d24ee3663d8b013004634dc16cb8ad6f) Thanks [@luisherranz](https://github.com/luisherranz)! - Add liveness facts to each `rp_status` ledger row — `run`, `activity` (the latest of `updated`, which the pinned opencode build moves only when the session receives input, the session's last observed tool or model progress event, and its last raw provider byte), `lastTurn` (succeeded, failed, or interrupted) and `turns`, `lastSend`, and `lastText` (the newest assistant text, or how deep a textless transcript was searched) — so an orchestrator can tell a working, a waiting, and a stopped agent apart; per-session status reads now cover only the sessions RP recognizes. The protocol `rp_spawn` appends now also tells each agent that an ended turn is a stop only a message resumes — a reply it awaits, or the completion notice of a background command it gave a `timeout` — and to hold its turn for anything else, waiting with foreground commands that have a timeout and comparing progress between checks

- [#283](https://github.com/Automattic/radical-pipelines/pull/283) [`df0c64a`](https://github.com/Automattic/radical-pipelines/commit/df0c64abd367a9bcdb42ba9f6ed88a0367be8bbb) Thanks [@luisherranz](https://github.com/luisherranz)! - Register every RP tool as directly invocable on opencode, so an agent calls `rp_spawn`, `rp_send`, `rp_terminate`, `rp_loop_start`, `rp_loop_list`, `rp_loop_cancel`, `rp_status`, and `rp_permission_reply` by name. opencode routes a registered tool by its `options.codemode` and defaults to Code Mode, so tools that declared no option were reachable only inside the `execute` wrapper; each one now declares the direct form, as opencode's own built-in tools do. `setup` also awaits its tool and skill registrations — each returns a promise opencode resolves to a disposable, and `setup` is what the plugin API waits on before treating a location as live, so returning early could serve a session a catalogue RP had not finished contributing to. The pin moves to opencode build `0.0.0-dev-19093`

### Patch Changes

- [#280](https://github.com/Automattic/radical-pipelines/pull/280) [`80bb7f6`](https://github.com/Automattic/radical-pipelines/commit/80bb7f6da70dec3b24b6e2d16955be67b3efdea9) Thanks [@luisherranz](https://github.com/luisherranz)! - Bound opencode health-loop server requests and ticks so one unanswered request cannot stop a loop or wedge `rp_loop_cancel`

## 0.15.0

### Minor Changes

- [#259](https://github.com/Automattic/radical-pipelines/pull/259) [`ce7d63e`](https://github.com/Automattic/radical-pipelines/commit/ce7d63e60d8dba0d689ad4583426a14b9e9f07e7) Thanks [@luisherranz](https://github.com/luisherranz)! - Agents declare their own completion instead of it being inferred from turn activity. Every agent profile directs the agent, when its work ends, to declare completion to its spawner with the exact statement "Completion declared: no work remains." — at the end of its final report for agents that report to the spawner, as its own message for those that report to a requester — and the orchestrator terminates a session only on that declaration. The opencode plugin's first-turn success notification is dropped, and every failed turn — not just the first — is announced to the spawner with its cause.

### Patch Changes

- [#262](https://github.com/Automattic/radical-pipelines/pull/262) [`be42aa1`](https://github.com/Automattic/radical-pipelines/commit/be42aa19414c7a5dff70637258f7c18efe01cc11) Thanks [@luisherranz](https://github.com/luisherranz)! - Make the opencode health loop flood-proof and self-recovering: a tick never duplicates a prompt whose predecessor is still undelivered or unanswered (a parked queue copy facing a running session is promoted to steer delivery in place); each injection is evaluated against the turn that responded to it — anchored on the admitted input's message ID — and an injection answered only by a failing turn (network outage, provider quota exhaustion) triggers an exponential backoff, capped at ~8 intervals, that suppresses injections but never inspection and ends on the first successful turn; and a stale target on a dead provider stream — a frozen tool call, with no tool executing anywhere in the message, whose own response (identified by its provider call id in the bytes teed via each location's `http.response` hook) produced no bytes and no progress events for a wall-clock confirmation window, one hour by default (an accepted, documented heuristic — silence cannot prove death) — is interrupted with `continue=true`, serialized and deduplicated per target across loops, after promoting any parked monitor copy so the freed session receives it and revalidating at the last moment (the interrupt is session-scoped; the pinned API offers nothing tighter). Under the single-observer assumption, a stream whose response identity is established is never interrupted while it produces bytes, and traffic whose identity cannot be established — never observed, or its projected tool id unmatched in the observed bytes — has unknown coverage and is never escalated. The plugin's `setup` now returns a per-location cleanup that disposes its own observer and releases the shared supervision by reference count.

- [#269](https://github.com/Automattic/radical-pipelines/pull/269) [`2034bdf`](https://github.com/Automattic/radical-pipelines/commit/2034bdf9b775211906426bc221f4774f80970683) Thanks [@luisherranz](https://github.com/luisherranz)! - Deliver inter-agent messages with steer so they reach a recipient that is still working, and stop reporting a deliberate `rp_terminate` as a failed turn.

## 0.14.0
### Minor Changes



- [#253](https://github.com/Automattic/radical-pipelines/pull/253) [`d9fe18a`](https://github.com/Automattic/radical-pipelines/commit/d9fe18a952928e27d2cd49372c901b29926164d1) Thanks [@luisherranz](https://github.com/luisherranz)! - Convert the action lifecycle hooks to `before-`/`after-` pairs — `pipeline-created`, `branch-created`, `worktree-created`, and `lanes-merged` become `before-creating-pipeline-family`/`after-creating-pipeline-family`, `before-creating-branch`/`after-creating-branch`, `before-creating-worktree`/`after-creating-worktree`, and `before-merging-lanes`/`after-merging-lanes` — and remove `phase-rolled-back`.



- [#221](https://github.com/Automattic/radical-pipelines/pull/221) [`c75162a`](https://github.com/Automattic/radical-pipelines/commit/c75162afe683d739827404db34f606ed0ea06ec9) Thanks [@luisherranz](https://github.com/luisherranz)! - BREAKING: redefine guardrails as prose rules any agent can be named by — the `.rp.md` block becomes `rule:` + `agents:`, and the exit-code and `{scope}` fill machinery is removed



- [#219](https://github.com/Automattic/radical-pipelines/pull/219) [`38e9060`](https://github.com/Automattic/radical-pipelines/commit/38e90602690583477978a3e9bf80581c988d7d50) Thanks [@luisherranz](https://github.com/luisherranz)! - Add the Lifecycle hooks convention — prose instructions the orchestrator runs at defined pipeline moments — and owner-invoked closure actions bracketed by before/after hooks, in which the orchestrator opens the pipeline's PR in both artifact-storage modes (title and description per an optional PR format convention) and merges it on request. Generalize the assisted close-out to fire on any stop, and migrate this repository's Linear sync onto the mechanism.



- [#221](https://github.com/Automattic/radical-pipelines/pull/221) [`d736622`](https://github.com/Automattic/radical-pipelines/commit/d7366221b9e980ab3a103b3aa64450de88ee4c73) Thanks [@luisherranz](https://github.com/luisherranz)! - Allow `.rp.local.md` to override any convention, removing the Guardrails committed-only restriction



- [#255](https://github.com/Automattic/radical-pipelines/pull/255) [`d57be8e`](https://github.com/Automattic/radical-pipelines/commit/d57be8e676844992ef611ed5004dbcd236827df6) Thanks [@luisherranz](https://github.com/luisherranz)! - Let spec and design-doc leads batch independent research questions in one message; the orchestrator launches one fresh researcher per question, in parallel



- [#249](https://github.com/Automattic/radical-pipelines/pull/249) [`710e2b5`](https://github.com/Automattic/radical-pipelines/commit/710e2b578d72acbed6c182fb976a4a99cb8e8890) Thanks [@luisherranz](https://github.com/luisherranz)! - Terminate finished agent sessions across supported tools, add `rp_terminate` for opencode, and update its verified pin to `0.0.0-dev-17711`.


### Patch Changes



- [#251](https://github.com/Automattic/radical-pipelines/pull/251) [`cadedcb`](https://github.com/Automattic/radical-pipelines/commit/cadedcb75d6bf1c40b8c5dbee5bdf3dc138e6166) Thanks [@luisherranz](https://github.com/luisherranz)! - Keep launches scoped to their workflow steps and require requested work to finish and be accounted for before handoff.



- [#252](https://github.com/Automattic/radical-pipelines/pull/252) [`1b44caa`](https://github.com/Automattic/radical-pipelines/commit/1b44caa004a22cc36e83fe61e690f80b728f8c34) Thanks [@luisherranz](https://github.com/luisherranz)! - Make health-loop ticks observable, steer prompts into stale opencode sessions, and avoid blocking on Claude Code shutdown.



- [#257](https://github.com/Automattic/radical-pipelines/pull/257) [`5143308`](https://github.com/Automattic/radical-pipelines/commit/514330875f5e7bafc6545edae74fcd4ea8771482) Thanks [@luisherranz](https://github.com/luisherranz)! - Fix the opencode permission mediator never firing: subscribe to the `permission.asked` event type, which renamed opencode's former `permission.v2.asked`. Blocked asks are again redirected or announced to the spawner instead of surfacing only through `rp_status` polling.



- [#253](https://github.com/Automattic/radical-pipelines/pull/253) [`b58a6a0`](https://github.com/Automattic/radical-pipelines/commit/b58a6a068cff48db935a3bf1bf3403f6ee9afe15) Thanks [@luisherranz](https://github.com/luisherranz)! - Refresh the project's main branch from its remote before creating a base run branch from it.



- [#253](https://github.com/Automattic/radical-pipelines/pull/253) [`2f26b13`](https://github.com/Automattic/radical-pipelines/commit/2f26b13be8b722087c7b68b8b0b7fa4dd2f0f7b0) Thanks [@luisherranz](https://github.com/luisherranz)! - Describe worktree removal as it works: the orchestrator removes lane worktrees and branches when their lanes are done; run branches and worktrees remain.

## 0.13.0
### Minor Changes



- [#245](https://github.com/Automattic/radical-pipelines/pull/245) [`85c09dd`](https://github.com/Automattic/radical-pipelines/commit/85c09ddce97bdc3f1ccb97ecfe5c8387c214fb12) Thanks [@luisherranz](https://github.com/luisherranz)! - Route no-behavior changes to a dedicated `edit` writer instead of forcing tests on them. The build plan's `Type` field gains `edit` for changes with no behavior to test (a docblock correction, a dead-code deletion, a behavior-preserving mechanical refactor), executed by the new `build-writer-edit`: it applies the change, verifies acceptance by inspection, runs the guardrail gates, and introduces no new tests. The task-type taxonomy is now stated explicitly: `tdd` and `edit` are the two routes for changing the product; an `e2e` task realizes planned flows as tests over behavior prior tasks built and does not implement the behavior under test. The `Type` is a reviewed claim: the `build-plan-reviewer` rejects a `tdd` task whose acceptance asserts no observable behavior change, an `e2e` task whose changes implement or alter the behavior under test, and an `edit` task whose changes imply a behavior change; the `build-reviewer` flags an `edit` task whose diff introduces new tests or changes observable behavior. E2E planning now covers the criteria and edge cases with behavior to test, so an all-`edit` plan legitimately records `None`. Upgrade note: guardrail gates in an existing `.rp.md` name agents explicitly — add `build-writer-edit` to each gate that should also run for `edit` tasks (typically every gate naming `build-writer-tdd`); until then, `edit` tasks run without writer-level gates.



- [#243](https://github.com/Automattic/radical-pipelines/pull/243) [`4590e34`](https://github.com/Automattic/radical-pipelines/commit/4590e34318cf0b40db2028df05747e0efd23045d) Thanks [@luisherranz](https://github.com/luisherranz)! - Route decisions no lane made to a scoped lead instead of blocking the run. When consolidation — initial, or while adjudicating a final-review rejection — needs a requirement or design decision no lane settled (a gap every lane missed or, in the spec phase, a normative divergence nothing in the intent selects), the consolidator now sends the orchestrator a **decision request**: a fresh lead scoped to the question researches it, decides, records the decision first-hand in the consolidated research record — Q&A entries in the spec phase, a topic in the design-doc phase — and answers the consolidator directly; the consolidator carries the decision into the consolidated artifacts, with the record naming the request's entries as provenance, and the consolidated re-review verifies it as fresh content. Blockers keep their original meaning — a choice that belongs to a prior phase — and a scoped lead that finds the choice belongs to the intent still reports one.


### Patch Changes



- [#241](https://github.com/Automattic/radical-pipelines/pull/241) [`8ff5d23`](https://github.com/Automattic/radical-pipelines/commit/8ff5d233c2b48ecc46184078f15a6b156ee3387a) Thanks [@luisherranz](https://github.com/luisherranz)! - Fix opencode coordination and update the verified pin to `0.0.0-beta-17595`. The plugin now addresses only its own server process, surfaces failed state reads, handles the build's `/inbox` queue contract, forwards permission asks when an automatic reject fails, and reports `rp_send` queue admission plus observed target state instead of claiming receipt. `rp_spawn` also appends an opencode messaging protocol with the authoritative spawner ID to every child prompt, directing required reports through `rp_send` to the requester when present or the spawner otherwise.

## 0.12.0
### Minor Changes



- [#237](https://github.com/Automattic/radical-pipelines/pull/237) [`5a97403`](https://github.com/Automattic/radical-pipelines/commit/5a97403b6f4582df6a0bc5ce41dbf9ca928e445b) Thanks [@luisherranz](https://github.com/luisherranz)! - End agent persistence across waits. Researchers are launched per question — the orchestrator passes each research request verbatim to a fresh `spec-researcher`/`design-doc-researcher`, whose **Requester identifier** convention (replacing **Researcher identifier**) names the agent it answers — and the spec and design-doc leads end when they report their artifact ready for review; each rejection is adjudicated by a fresh lead instance launched on the rejection file, and the consolidators follow the same shape, ending at the consolidated commit with a fresh instance per rejection. Re-reviews are launched with the revision's commit range (plus, in the spec and design-doc phases, the producer's adjudication report) so prior logged checks are reused; a relaunched planner revises where the issues require and keeps the other tasks unchanged; committed evidence is relayed by path; the build and document task-list step is removed (the commits and the diff are the record of task progress); and the health monitor's defaults move to a 15-minute interval and a 30-minute no-activity threshold, with the Claude Code convention block taking the interval from the reference instead of embedding it.



- [#240](https://github.com/Automattic/radical-pipelines/pull/240) [`ad25a13`](https://github.com/Automattic/radical-pipelines/commit/ad25a13edcf1416470b3840b73ccce00aa842a38) Thanks [@luisherranz](https://github.com/luisherranz)! - Converge review loops: a first review still rejects for any real issue, and a re-review rejects only for a prior finding whose resolution fails or for a must-fix issue — one that leaves the artifact unable to do its job, defined per reviewer. A new re-review finding that is not must-fix joins the rejection's issues when the review rejects anyway and is recorded under a new `## Non-blocking findings` approval section otherwise, findings that are instances of one defect are reported once as the defect covering every instance, and the reviewers drop the "Reject liberally", "A first-pass approval should be rare", and "no severity ladder" bars in favor of the shared "Never manufacture findings" one.



- [#236](https://github.com/Automattic/radical-pipelines/pull/236) [`5b1dec5`](https://github.com/Automattic/radical-pipelines/commit/5b1dec51182c95048a83f7698b3e35750993c6c3) Thanks [@luisherranz](https://github.com/luisherranz)! - Resuming a pipeline now rolls the active phase back only to the latest committed state whose next action follows from the record alone, instead of restarting the whole phase whenever its plan was not yet approved. A full phase restart remains only as the fallback when no such state exists, and lane branches are deleted only for lanes rolled back to their start.

## 0.11.0
### Minor Changes



- [#220](https://github.com/Automattic/radical-pipelines/pull/220) [`6a8802e`](https://github.com/Automattic/radical-pipelines/commit/6a8802e5a79cd9dabc2a5e208a26c02bf665192b) Thanks [@luisherranz](https://github.com/luisherranz)! - Add opencode v2 support: a plugin exposing the `rp_*` tools — including permission mediation that redirects an agent's external read to its worktree copy or forwards the request to the spawner for adjudication via `rp_permission_reply`, and an `rp_status` ledger reporting each session's current tool and pending permission requests — a per-tool convention file with the opencode Team spawning and Health monitoring blocks, and a pinned, hermetic integration suite that exercises the plugin against the pinned opencode build.



- [#232](https://github.com/Automattic/radical-pipelines/pull/232) [`81aaccf`](https://github.com/Automattic/radical-pipelines/commit/81aaccf78af4f2768b215a85d9e239a6ba981e0c) Thanks [@luisherranz](https://github.com/luisherranz)! - Migrate the opencode plugin to the current plugin API tool contract and advance the pinned build to `0.0.0-next-16573`. Tool descriptors now declare `input` rather than `jsonSchema` and an output schema, and results are returned as `{output, content}` with `output` round-tripped through JSON so a session record's absent fields cannot fail opencode's output validation. Owners must move to the newly pinned opencode build: the previous pin's contract and this one are mutually incompatible, so the plugin's tools return no result on builds older than the new pin.


### Patch Changes



- [#230](https://github.com/Automattic/radical-pipelines/pull/230) [`7cc8638`](https://github.com/Automattic/radical-pipelines/commit/7cc8638bc79e725f1bd5353f6dcfcbabea901df6) Thanks [@luisherranz](https://github.com/luisherranz)! - Accept both of opencode's service-record filenames (`service-<hash>.json` and `service.json`), preferring the most recently written when a stale record from the other name lingers. opencode renamed the record after the pinned build, and matching only the old name left the plugin unable to resolve the running server — silently disabling `rp_send`, the health monitor's idle check, and `rp_status`, including the very pin-mismatch warning meant to flag that the running build is outside the verified surface.

## 0.10.1
### Patch Changes



- [#215](https://github.com/Automattic/radical-pipelines/pull/215) [`a37932b`](https://github.com/Automattic/radical-pipelines/commit/a37932b34bf93a4aa6db26d0a927b601796a5086) Thanks [@luisherranz](https://github.com/luisherranz)! - Align multilane terminology, convention fields, and design consolidation context.



- [#227](https://github.com/Automattic/radical-pipelines/pull/227) [`6646efb`](https://github.com/Automattic/radical-pipelines/commit/6646efba1fb2f252de3346e76d10a23ce0bb298d) Thanks [@luisherranz](https://github.com/luisherranz)! - Seat agents at every send on Claude Code: a message restarts its target in the sender's shell working directory, so the orchestrator and the health monitor `cd` into an agent's worktree before every spawn or message, and generic files no longer assert when an agent's working directory is fixed.

## 0.10.0
### Minor Changes



- [#213](https://github.com/Automattic/radical-pipelines/pull/213) [`fd8cac1`](https://github.com/Automattic/radical-pipelines/commit/fd8cac1c422e0c28191684718379234c53a90a4b) Thanks [@luisherranz](https://github.com/luisherranz)! - Capture the post-change coherence question across phases: the spec treats existing tests as evidence rather than outcomes, the design lead re-derives surviving code from narrowed contracts, and the design and build reviewers flag stranded survivors kept without a recorded decision.

## 0.9.0
### Minor Changes



- [#209](https://github.com/Automattic/radical-pipelines/pull/209) [`4d84e7b`](https://github.com/Automattic/radical-pipelines/commit/4d84e7b4759437c3110e55492628d056917e8b65) Thanks [@luisherranz](https://github.com/luisherranz)! - Give the multilane consolidator the lead pattern. The `spec-consolidator` and `design-doc-consolidator` are now persistent through the consolidation review loop: they answer for the consolidated artifacts, back every judgment of their own — selections, transformations, omissions, combinations — with recorded evidence, adjudicate the final review's findings (adopt, refute with evidence, or propose as residual), and can request a researcher (the researcher supplies evidence; the consolidator adjudicates) — a decision no lane made stays a blocker. Factual divergences resolve on the strongest evidence, never lane count, and a normative divergence nothing in the intent selects is a blocker. Consolidators read the lanes' review files as merge signal and record per-decision lane provenance. The final reviewer audits completeness — every material lane contribution inherited or explicitly dispositioned — and reuses lane verification for what the consolidated record inherits unchanged.



- [#210](https://github.com/Automattic/radical-pipelines/pull/210) [`6905573`](https://github.com/Automattic/radical-pipelines/commit/6905573d2744cc3d1d7b6762169b8dc9c02c7b5a) Thanks [@luisherranz](https://github.com/luisherranz)! - Direct the divergence in the design-doc phase's divergent mode. Each lane works a positional **Lane mandate** — the first designs from the spec alone, each subsequent lane but the last differs from the previous designs in at least one load-bearing decision, and the last instead challenges a load-bearing premise they all share, designing without it where a credible alternative survives — with optional owner-named lane angles replacing the defaults. Every lane records its mandate verbatim, so it survives into what the consolidator reads; lanes after the first also read the previous lanes' designs, records, and approved reviews, and declare the divergence as a decision in their record — what the previous designs chose, what theirs chooses, and why that serves the mandate — or how the mandate was pursued and why the convergence is legitimate. The orchestrator resolves each mandate once and passes it identically to the lane's lead and reviewers, so the reviewer adjudicates the recorded mandate and the declaration against an independent copy.

## 0.8.0
### Minor Changes



- [#198](https://github.com/Automattic/radical-pipelines/pull/198) [`c29a626`](https://github.com/Automattic/radical-pipelines/commit/c29a626b44a368cccfd0786f7fb7ea66e6099680) Thanks [@luisherranz](https://github.com/luisherranz)! - BREAKING: Redesign the autonomous design-doc phase. A persistent `design-doc-lead` replaces the `design-doc-analyst` + `design-doc-writer` pair: it owns `design-doc-research.md` and `design-doc.md`, records how every load-bearing claim was checked, and adjudicates review findings itself (adopt, refute with evidence, or propose as residual). The review now gates the decision record — `design-doc.md` is checked for fidelity to it — and the `design-doc-reviewer` adjudicates the record's declared chains: a compliance audit, a check-adequacy audit, re-execution of declared checks, and a negative-space sweep, logging every check it performs in the review file so re-reviews confirm resolutions instead of re-verifying everything.



- [#206](https://github.com/Automattic/radical-pipelines/pull/206) [`9711137`](https://github.com/Automattic/radical-pipelines/commit/9711137dc76d0b88f14b79182228634bb932cf3c) Thanks [@luisherranz](https://github.com/luisherranz)! - BREAKING: Rename the plan producers — `build-plan-writer` → `build-planner` and `document-plan-writer` → `document-planner`. "Writer" now names one role across the pipeline: the task-scoped agents that write the shipped product (`build-writer-tdd`, `build-writer-e2e`, `document-writer`), while a planner plans the phase's work. Project conventions that name agents (such as agent-model tables) must rename these two entries.



- [#206](https://github.com/Automattic/radical-pipelines/pull/206) [`9456eea`](https://github.com/Automattic/radical-pipelines/commit/9456eea0a5de8216d61263ae44c5bba36b245f4a) Thanks [@luisherranz](https://github.com/luisherranz)! - BREAKING: Redesign the autonomous spec phase. A persistent `spec-lead` replaces the `spec-analyst` + `spec-writer` pair: it owns `spec-research.md` and `spec.md`, grounds every consolidated requirement in the recorded Q&A and research, synthesizes the spec itself, and adjudicates review findings (adopt, refute with evidence, or propose as residual). The review now gates the requirements record — `spec.md` is checked for fidelity to it — and the `spec-reviewer` adjudicates the record's declared chains: a compliance audit with an altitude check (requirements, exclusions, and acceptance criteria state observable behavior, never code disposition), an adequacy audit, re-execution of declared checks, and a negative-space sweep, logging every check it performs in the review file so re-reviews confirm resolutions instead of re-verifying everything.


### Patch Changes



- [#200](https://github.com/Automattic/radical-pipelines/pull/200) [`ca7c001`](https://github.com/Automattic/radical-pipelines/commit/ca7c00147500e58748ac5f3849715ebb95ef1d6b) Thanks [@luisherranz](https://github.com/luisherranz)! - Address inter-agent messages by spawn identifier: every spawned agent gets a run-unique name, a researcher spawns before its requester and its identifier is passed as the requester's **Researcher identifier** convention, so messages reach the intended agent when several agents of the same type are alive (parallel lanes, review-scoped researchers).

## 0.7.0
### Minor Changes



- [#181](https://github.com/Automattic/radical-pipelines/pull/181) [`120697b`](https://github.com/Automattic/radical-pipelines/commit/120697bc28e1bbbfc4ec0134f0f514affa1b754b) Thanks [@luisherranz](https://github.com/luisherranz)! - Architecture v2. The pipeline is now five phases (Intent → Spec → Design doc → Build → Document): the standalone Plan phase is gone, folded into Build and Document as an inner plan-approval gate. Pipelines are chains of run branches with lane branches, and forks are new pipeline versions created by branching at cut commits — inherited history carries the inherited work itself, with no copying. The spec and design-doc phases run as N independent lanes consolidated into one artifact by new consolidator agents (N=1 is the default single flow), each lane writing its artifacts in a `lane-<K>` subfolder of the phase folder so the full lane record lands on the run branch. Design-doc lanes support isolated and divergent modes: isolated lanes run in parallel on lane branches merged back on approval; divergent lanes run sequentially on the run branch itself. Worktrees are raw `git worktree` checkouts, one per branch, with all branch and worktree topology owned by the orchestrator, which seats each agent in its worktree at spawn per the now-required per-tool Team spawning convention. Agents are renamed to the phase-prefixed set: `build-plan-writer`/`build-plan-reviewer`, `build-writer-tdd`/`build-writer-e2e`/`build-reviewer`, `document-plan-writer`/`document-plan-reviewer`, `document-writer`/`document-reviewer`, plus the new `design-doc-consolidator`.



- [#181](https://github.com/Automattic/radical-pipelines/pull/181) [`e6d20b4`](https://github.com/Automattic/radical-pipelines/commit/e6d20b45f1dae71fb21d9c5612cc9c1fd3d2b9ac) Thanks [@luisherranz](https://github.com/luisherranz)! - BREAKING: Remove Pi as a supported agentic coding tool. The repository is now solely a Claude Code plugin and a standalone agent skill: the root `package.json` is no longer a Pi manifest (its `pi` block, the bundled `pi-teams` and `@pi-agents/loop` dependencies, the Pi peer dependencies, and the `pi-package` keyword are gone), the Pi convention file and the Pi-specific setup, README, and website sections are removed, and the setup convention table lists only Claude Code.


### Patch Changes



- [#191](https://github.com/Automattic/radical-pipelines/pull/191) [`70f6822`](https://github.com/Automattic/radical-pipelines/commit/70f6822397a787c675853493b0130143d66103e4) Thanks [@luisherranz](https://github.com/luisherranz)! - Gate failures are never classified as pre-existing or environmental without proof. Reviewers require reproducing the identical failure on the run's diff base before treating a failure as ambient; writers fix the failure or report a blocker instead of committing around it; the untouched-test heuristic is forbidden for both.



- [#181](https://github.com/Automattic/radical-pipelines/pull/181) [`408555a`](https://github.com/Automattic/radical-pipelines/commit/408555a040e1dc422a2c50db35c938cb27f12770) Thanks [@luisherranz](https://github.com/luisherranz)! - Fix architecture-v2 consistency leftovers: drop the revision flow's dangling `pipeline.md` step, align the glossary's lane entries and Conventions-block fields with the lane-scoped folder model, replace the nonexistent `/loop-list`/`/loop-kill` commands with Claude Code's `CronList`/`CronDelete` tools, remove duplicated and undefined workflow instructions, generalize the blocker payload to name the approved artifact that must change, make cross-folder references and the reviewer/researcher profiles symmetric across phases, update the website to the five-phase architecture and current agent set, and remove the leftover Pi settings file and stale working documents.



- [#181](https://github.com/Automattic/radical-pipelines/pull/181) [`4d914c4`](https://github.com/Automattic/radical-pipelines/commit/4d914c426c3840651aa48f79fe2afc34f2baf6fb) Thanks [@luisherranz](https://github.com/luisherranz)! - Spawn Claude Code agents as teammates, matching Claude Code's current agent-teams model where each session has one implicit team and named teammates message each other and the orchestrator directly.



- [#184](https://github.com/Automattic/radical-pipelines/pull/184) [`b2c05cb`](https://github.com/Automattic/radical-pipelines/commit/b2c05cbfb0b7a87acc39ea759414666edafa87db) Thanks [@luisherranz](https://github.com/luisherranz)! - The revision intent is always rendered to the owner and explicitly approved before it is written and the revision run starts.



- [#186](https://github.com/Automattic/radical-pipelines/pull/186) [`c2a57c9`](https://github.com/Automattic/radical-pipelines/commit/c2a57c967a41ccc77045d8d6cd1bbc6ca6a1be0e) Thanks [@luisherranz](https://github.com/luisherranz)! - Before starting work on an issue, open dependencies are surfaced and the owner explicitly chooses to proceed or wait; issues without declared dependencies proceed unchanged.



- [#181](https://github.com/Automattic/radical-pipelines/pull/181) [`c0d88e5`](https://github.com/Automattic/radical-pipelines/commit/c0d88e52c5f20061248db666f54359c59a856597) Thanks [@luisherranz](https://github.com/luisherranz)! - Inline the per-phase summary format into the `build-reviewer` and `document-reviewer` profiles instead of holding it in a standalone `reference/summary-format.md` that the orchestrator resolved and passed in each reviewer's launch prompt. The reviewer is the only agent with the whole-phase view and already authors the summary, so the format now lives at its point of use in each profile and the orchestrator no longer couriers it.



- [#190](https://github.com/Automattic/radical-pipelines/pull/190) [`0a2994e`](https://github.com/Automattic/radical-pipelines/commit/0a2994e9eea52aea8c1eabb0fc435c44134e3152) Thanks [@luisherranz](https://github.com/luisherranz)! - Reviewers reject artifacts whose correctness rests on an unverified hedge: each load-bearing hedged risk is verified, sent back, or recorded as an accepted residual with justification before approval.



- [#192](https://github.com/Automattic/radical-pipelines/pull/192) [`1367096`](https://github.com/Automattic/radical-pipelines/commit/13670969517f8352b07de955e3f2d29bdce68dd2) Thanks [@luisherranz](https://github.com/luisherranz)! - Require analysts to send a new load-bearing claim — especially a known rule's premise — to the researcher before it sways a requirement or decision.



- [#183](https://github.com/Automattic/radical-pipelines/pull/183) [`955166d`](https://github.com/Automattic/radical-pipelines/commit/955166d3ab04daa7757b8cf1055de3003e6449ae) Thanks [@luisherranz](https://github.com/luisherranz)! - Rejection loops are checkpointed: every three consecutive rejections the orchestrator inspects their cause and stops the run only when the same pattern repeats and could perpetuate indefinitely.



- [#185](https://github.com/Automattic/radical-pipelines/pull/185) [`6be9e74`](https://github.com/Automattic/radical-pipelines/commit/6be9e7449e6144498e1fd84352762f250c8fbfe3) Thanks [@luisherranz](https://github.com/luisherranz)! - Before creating an issue, the orchestrator searches the tracker for related or duplicate issues and presents them with the draft so the owner can proceed, modify the existing issue, or link it.



- [#187](https://github.com/Automattic/radical-pipelines/pull/187) [`5848919`](https://github.com/Automattic/radical-pipelines/commit/58489191250a1980ec64f757c23fd7d4fb7cdc77) Thanks [@luisherranz](https://github.com/luisherranz)! - Setup writes only the defined conventions into `.rp.md` — anything beyond them, like orchestrator instructions or setup-time discoveries, is captured only on explicit owner request. The Claude Code conventions keep only their tool-specific values; the orchestrator instructions they held move into the workflow and health-monitoring references or drop where those already state them.



- [#189](https://github.com/Automattic/radical-pipelines/pull/189) [`860c78c`](https://github.com/Automattic/radical-pipelines/commit/860c78ca81d09c0da7aaca5d42cf33b88ce8966f) Thanks [@luisherranz](https://github.com/luisherranz)! - Stop bundling `@zenobius/pi-worktrees`: worktree handling is raw `git worktree` owned by the orchestrator, so the extension is no longer used.



- [#182](https://github.com/Automattic/radical-pipelines/pull/182) [`a274928`](https://github.com/Automattic/radical-pipelines/commit/a274928cc4e34dfeb6ff6660332869fc38e2c4bd) Thanks [@luisherranz](https://github.com/luisherranz)! - When a launch prompt carries prior-phase evidence — such as a rejection's issues — the orchestrator passes it verbatim, never interpreted or framed.

## 0.6.0
### Minor Changes



- [#168](https://github.com/Automattic/radical-pipelines/pull/168) [`b9a31dc`](https://github.com/Automattic/radical-pipelines/commit/b9a31dcc623888c58553db529f0251b9c009e283) Thanks [@luisherranz](https://github.com/luisherranz)! - Make every run, by default, produce host-project output that reads as if written by hand — code, tests, documentation, and commit messages that carry no reference to the run that produced them, such as a task number, a requirement or acceptance-criterion ID, or a named artifact cited as their source. The rule is always on with no owner action, and the reviewer enforces it at the existing per-phase review gate, treating a leaked reference as a must-fix that blocks approval until it is removed.

## 0.5.0
### Minor Changes



- [#161](https://github.com/Automattic/radical-pipelines/pull/161) [`b438113`](https://github.com/Automattic/radical-pipelines/commit/b4381136e4751eb2f6340ef20250050c101a6ece) Thanks [@SantosGuillamot](https://github.com/SantosGuillamot)! - Rename the runs that follow a pipeline's `base` run from `review-N` to `revision-N`, and the activity that creates them from "review"/"reviewing" to "revise"/"revising", so "review" denotes the phase-auditing activity only. `base` keeps its name, and the phase-audit "review" terms (reviewer agents, `*-review-approved.md`, `*-review-N-rejected.md`) are preserved. The command file `reference/review-pipeline.md` is renamed to `reference/revision-pipeline.md` and the `Reviewer base ref` heading to `Revision base ref`. This is a going-forward convention change — existing on-disk `review-N` run folders are not migrated.



- [#135](https://github.com/Automattic/radical-pipelines/pull/135) [`5f13308`](https://github.com/Automattic/radical-pipelines/commit/5f133087f61e21e991d07f3186a1abb9cf6be0e5) Thanks [@luisherranz](https://github.com/luisherranz)! - BREAKING: rename the four documentation-phase agents from the singular `doc-*` to the plural `docs-*` (`docs-plan-writer`, `docs-plan-reviewer`, `docs-writer`, `docs-reviewer`), unifying the documentation concept on `docs` across the skill, agents, and plugin. Any reference to the old singular agent names must be updated.


### Patch Changes



- [#139](https://github.com/Automattic/radical-pipelines/pull/139) [`c1c284f`](https://github.com/Automattic/radical-pipelines/commit/c1c284f140f1b680446cdad9c5058dd885f0d531) Thanks [@luisherranz](https://github.com/luisherranz)! - Follow the issue create/modify workflow — the owner-led capture Q&A routed through the project's Issues convention — whenever the orchestrator creates or modifies an issue, including mid-session and mid-pipeline, rather than only at session start. A mid-run decision to author or revise an issue now re-enters that workflow instead of risking an ad-hoc issue authored outside it.



- [#148](https://github.com/Automattic/radical-pipelines/pull/148) [`24fb66b`](https://github.com/Automattic/radical-pipelines/commit/24fb66b57460009d4366e459bcf7c19c7d51222c) Thanks [@SantosGuillamot](https://github.com/SantosGuillamot)! - Keep `package-lock.json`'s version fields in sync with the root package version: the release version step now also runs `npm install --package-lock-only` to reconcile the lockfile, the existing drift in the committed lockfile is corrected, and a CI drift check guards against future divergence.

## 0.4.0
### Minor Changes



- [#124](https://github.com/Automattic/radical-pipelines/pull/124) [`d019d49`](https://github.com/Automattic/radical-pipelines/commit/d019d496a6a357fb23251012bab42975aad1320c) Thanks [@luisherranz](https://github.com/luisherranz)! - A code- or doc-phase guardrail can now name the agents that run it — one or more of `code-writer`, `code-reviewer`, `doc-writer`, and `doc-reviewer` — so a project can scope an expensive gate to the agents where it pays off. A guardrail that names no agents runs for every gate-running agent.



- [#133](https://github.com/Automattic/radical-pipelines/pull/133) [`5690a1a`](https://github.com/Automattic/radical-pipelines/commit/5690a1a45cdbfacf192ecaaf047c74536a5e5796) Thanks [@SantosGuillamot](https://github.com/SantosGuillamot)! - Add per-phase summaries for the code and docs phases: on approval the reviewer writes a human-friendly `code-summary.md` / `docs-summary.md` into the phase folder, so a run's artifact folder records what every phase produced.



- [#127](https://github.com/Automattic/radical-pipelines/pull/127) [`985ce53`](https://github.com/Automattic/radical-pipelines/commit/985ce53e198c940fd2e10916c1e20135ed46043e) Thanks [@luisherranz](https://github.com/luisherranz)! - A guardrail gate is now either fixed or scoped: a fixed gate is a literal command run as-is, while a scoped gate carries a `{scope}` placeholder filled per pipeline by the plan of the phase whose agents run the gate — applying the same way to the code and docs phases. Test selection is a planning duty: the plan turns the spec's acceptance criteria and edge cases into an explicit e2e test plan — so the suite a change must pass is decided up front rather than per writer. Behavior verification moves to the code-reviewer, which re-drives the planned e2e flows when reviewing a batch. The single `code-writer` agent is split into `code-writer-tdd` and `code-writer-e2e`, dispatched by a task's `Type`, so each task runs the writer suited to its work.


### Patch Changes



- [#129](https://github.com/Automattic/radical-pipelines/pull/129) [`4b47422`](https://github.com/Automattic/radical-pipelines/commit/4b47422c783b51aef4acfdf471cef01e81889412) Thanks [@luisherranz](https://github.com/luisherranz)! - Give each run its own uniquely named team. A new run no longer collides with a stale team left over from a prior run or session, and you no longer have to manually clean up leftover team state before starting a run.

## 0.3.0
### Minor Changes



- [#118](https://github.com/Automattic/radical-pipelines/pull/118) [`b40934a`](https://github.com/Automattic/radical-pipelines/commit/b40934af21bf332ee3c06f1e0a403f6165101980) Thanks [@luisherranz](https://github.com/luisherranz)! - Add a Guardrails convention: a project may now declare deterministic verification gates — each an exact command judged pass/fail solely by its exit code — that the code and doc phases must pass. Guardrails are optional and tool-agnostic: the conventions loader documents them, setup captures them per gate (name, exact command, applicable phase) and validates each command before writing, and the four phase agents read the guardrails applicable to their phase and run every one as mandatory. A declared command that cannot execute is a blocker; an absent or empty declaration runs nothing and never blocks or warns.



- [#119](https://github.com/Automattic/radical-pipelines/pull/119) [`c1ad0d6`](https://github.com/Automattic/radical-pipelines/commit/c1ad0d67c3a528295c4e58772d4b8e81e6233e7d) Thanks [@luisherranz](https://github.com/luisherranz)! - When creating a pipeline from an issue, the orchestrator now reads the full picture — the issue body, all of its comments, one-level in-tracker cross-references, and linked external pages — and synthesizes that material into the canonical intent format, showing the draft to the owner for explicit approval before writing the file; a standard two-line provenance header (source reference and self-containment assertion) is prepended to every issue-derived base intent in both the synthesis and passthrough cases; a fast-path passthrough skips synthesis and the confirmation gate when the issue body is already in the canonical format, there are no comments, no cross-references, no external links, and no binary attachments.



- [#106](https://github.com/Automattic/radical-pipelines/pull/106) [`45b4837`](https://github.com/Automattic/radical-pipelines/commit/45b4837ab7099caca316b6a41a642967b1afc7bc) Thanks [@SantosGuillamot](https://github.com/SantosGuillamot)! - Add pipeline reviews: layer an incremental change onto a complete, unmerged pipeline by re-running the phases as an additional run on the same branch. Phase folders now live under run folders: the original run is recorded as `base/` at pipeline creation and is never rewritten, and each review adds a sibling `review-N-<short-description>/` run.

## 0.2.0
### Minor Changes



- [#85](https://github.com/Automattic/radical-pipelines/pull/85) [`9e8ae47`](https://github.com/Automattic/radical-pipelines/commit/9e8ae47eae620485fc713fe39ee231bdefb2f594) Thanks [@luisherranz](https://github.com/luisherranz)! - Automate releases with GitHub Actions. A PR-time **changeset gate** (`.github/workflows/changeset-gate.yml`) validates changeset shape and requires a changeset for release-relevant changes, and a post-merge **release** workflow (`.github/workflows/release.yml`) uses `changesets/action@v1` to open a "Version Packages" PR and, on merge, create a `v<version>` git tag and a GitHub Release. Adopts `@changesets/changelog-github` for richer changelog entries and adds a dependency-free changeset shape validator (`scripts/validate-changesets.mjs`) with tests. No npm publish; the package stays private and consumed direct-from-git. A new `CONTRIBUTING.md` documents the contributor and maintainer release mechanics.



- [#82](https://github.com/Automattic/radical-pipelines/pull/82) [`b9a72c7`](https://github.com/Automattic/radical-pipelines/commit/b9a72c7343d2fe589ffe48de0fafac68334ad5ec) Thanks [@luisherranz](https://github.com/luisherranz)! - Adopt Changesets to track every repository change in a generated `CHANGELOG.md` and keep the project version synchronized across all version-bearing files. The bundled version step propagates the root `package.json` version to `.claude-plugin/plugin.json`, so the version stays consistent everywhere.



- [#102](https://github.com/Automattic/radical-pipelines/pull/102) [`c180681`](https://github.com/Automattic/radical-pipelines/commit/c1806818f2ca089b850469b4dd36a12f6d6c38cf) Thanks [@luisherranz](https://github.com/luisherranz)! - Add local, per-developer overrides of a project's conventions. A developer can place a git-ignored `.rp.local.md` alongside the committed `.rp.md` to override a restricted subset of conventions for their own working copy: the local file wins per named unit and the committed file is inherited wherever the local file is silent. Because the file is git-ignored, it is never committed and never affects other contributors. The capability ships as skill documentation — a `Local overrides` step in the convention loader (`load.md`), a `README.md` note, and a `.gitignore` entry.



- [#97](https://github.com/Automattic/radical-pipelines/pull/97) [`b20cb8d`](https://github.com/Automattic/radical-pipelines/commit/b20cb8d936099c10540019be09829a384ef4f195) Thanks [@luisherranz](https://github.com/luisherranz)! - Add an optional per-agent model configuration convention. A project can now pin, per spawned agent and/or as a project-wide default, which model and model settings (such as reasoning `effort`) each agent runs on. The convention is authored per active tool — values are tool-native and passed verbatim to that tool's spawn mechanism with no translation — and is fully optional: a project that configures nothing keeps today's behavior in both the Claude Code and Pi runtimes. Configuration rides the spawn channel only, never editing an agent's profile, and the health monitor's recovery model swaps stay transient — applied only to the recovery re-spawn, never written back and never re-selecting the just-failed model — so the next fresh spawn runs on the configured model again. Setup, the README convention catalog, and this repository's dogfood `.rp.md` document and demonstrate the new `Agent models` block.



- [#93](https://github.com/Automattic/radical-pipelines/pull/93) [`0f402f0`](https://github.com/Automattic/radical-pipelines/commit/0f402f081b235be006ae59771ee10bfd494395f5) Thanks [@luisherranz](https://github.com/luisherranz)! - Recommend the standard `origin`/`upstream` remote names during `artifacts-in-fork` setup. After confirming which remote is the fork and which is the canonical repository — using `gh` fork/parent auto-detection to propose the assignment, and always falling back to asking the owner when detection is ambiguous or unavailable — setup now recommends naming the fork `origin` and the canonical `upstream`, matching GitHub's documented fork convention. The recommendation is decline-able and the orchestrator never renames a remote without the owner's explicit approval; already-standard remotes are left untouched. Whatever names end up in use — renamed or kept — are recorded as the resolved, authoritative remote names, which downstream operations resolve through when pushing the pipeline branch to the fork and the clean PR branch to the upstream. `artifacts-in-repo` mode is unaffected.



- [#109](https://github.com/Automattic/radical-pipelines/pull/109) [`8b58c53`](https://github.com/Automattic/radical-pipelines/commit/8b58c531893b8e72cb4bdc8963ca9f1a3cf0cc91) Thanks [@luisherranz](https://github.com/luisherranz)! - Rename the phase-0 pipeline artifact, folder, and phase label from "prompt" to "intent".



- [#84](https://github.com/Automattic/radical-pipelines/pull/84) [`d1e5b65`](https://github.com/Automattic/radical-pipelines/commit/d1e5b65bd4a9b8d4fe91d18af69c47a79c7994e3) Thanks [@luisherranz](https://github.com/luisherranz)! - Restructure the repository to a flat, root-served layout. The skill now lives at its real path `skills/radical-pipelines/` and agents under `agents/`, served directly from the repository root with no install-time copying. A single root Pi manifest describes the plugin, project conventions live in a single `.rp.md`, and pipeline run state is consolidated under `.rp/pipelines/`. The previous install paths, symlinks, and duplicate manifest have been removed, along with the inert `teams.yaml` source file (no Pi tooling read it from the repository; `pi-teams` loads predefined teams only from `~/.pi/teams.yaml` or `.pi/teams.yaml`).
