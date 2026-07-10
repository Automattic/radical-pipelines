# Design Doc Review

## Verdict: rejected

## Summary

The shared plugin and Git-state direction is well traced, but the selected runtime does not yet define how the existing persistent-agent topology works through `codex exec`, enforce the permissions needed for autonomous workers, or coordinate monitor ownership across clones. The component map also places tool-specific cancellation behavior in a generic skill file contrary to repository rules. These gaps are load-bearing for autonomous parity, cross-tool continuation, surface parity, and Claude Code compatibility.

## Issues

### Issue 1: Persistent-role messaging has no executable contract

**What's wrong:** The design disables multi-agent tools inside every worker and says the root relays persistent-role questions and answers, while also keeping the phase workflows and agent profiles unchanged. Those profiles require the analyst to send each question directly to the researcher and the researcher to report directly back. `launch`, `resume`, and `follow` describe process and thread control, but no message envelope or turn state tells the root that an output is a question, names its recipient, distinguishes it from completion or a blocker, or defines the exact resume delivery. JSONL lifecycle events do not supply those workflow semantics.
**Where in design doc:** Session and worktree execution; Components — Unchanged but relevant components; Interfaces and Data Flow — Prompt and session interface
**Suggestion:** Define the Codex-specific persistent-role routing protocol end to end: prompt overlay, typed turn outcomes, recipient and delivery identity, root routing loop, verbatim resume payload, completion/blocker handling, and recovery of an interrupted delivery. Show how it realizes the analyst/researcher Q&A without direct agent tools. If unchanged profiles cannot express that contract, list the required profile or workflow changes and reconcile them with Claude Code compatibility.
**Why it matters:** The analyst/researcher exchange is mandatory in the spec and design phases. Without a deterministic mapping, two implementers will build different runtimes and the autonomous workflow cannot satisfy AC2.

### Issue 2: Worker permissions and approvals are inherited rather than enforced

**What's wrong:** The documented launch binds model, effort, working directory, and `features.multi_agent`, but leaves sandbox mode, approval policy, writable roots, network access, rules/hooks, and strict-config enforcement to ambient user configuration. The workers and supervisor must write the assigned worktree, Git common directory, and user-local registry, and non-interactive workers cannot rely on an owner answering an approval prompt. A readiness probe can observe one ambient configuration but does not define or preserve the authority used by every launch and resume. The command also omits `--strict-config` despite strict validation being a readiness claim.
**Where in design doc:** Distribution and configuration; Session and worktree execution; Interfaces and Data Flow — Convention interface and Prompt and session interface
**Suggestion:** Decide the execution-authority contract: which sandbox/permission profile and approval policy apply, every required writable or network resource, which user/project settings may be inherited, and how rules and hooks are handled. Pass and record the enforced configuration on both launch and resume, validate it strictly, and define the setup failure when a surface cannot grant it.
**Why it matters:** Ambient settings vary across desktop, CLI, and IDE sessions. Without an enforced authority boundary, the same configured project can hang or fail on one surface, weakening AC1, AC2, and AC7.

### Issue 3: The monitor lease cannot provide the claimed cross-clone exclusion

**What's wrong:** The lease is stored under the canonical Git common directory, which is shared by worktrees of one clone but not by separate clones. A monitor in another clone cannot observe a new generation or cancellation request. An active supervisor that outlives its root can keep renewing its own clone-local lease indefinitely, so expiry does not make it lose authority when another clone continues the run. This contradicts the explicit claim that an abandoned monitor in another clone self-cancels and the research record's mitigation for stale workers across clones.
**Where in design doc:** Cross-tool continuation; Interfaces and Data Flow — State and event interface; Risks and Open Questions — Stale workers across tools or clones
**Suggestion:** Either select an ownership authority visible to every supported continuation location, or explicitly scope lease exclusion to one Git common directory and design the safe continuation and conflict behavior for another clone. Reconcile the acceptance-coverage and risk claims with that chosen scope.
**Why it matters:** Two monitors can otherwise act concurrently on what the design presents as one protected run, invalidating AC5's continuation safety and the close-out guarantee.

### Issue 4: Tool-specific lease behavior is assigned to shared guidance

**What's wrong:** The component map says shared health-monitoring guidance will define Claude Code cancellation acknowledgment. Repository rules require generic skill files to contain no tool-specific content except files dedicated to that tool and loaded conditionally. The design also says shared workflow prose remains tool-neutral, so its own component ownership is inconsistent.
**Where in design doc:** Overview; Cross-tool continuation; Components — Modified components
**Suggestion:** Keep the tool-neutral lease obligation in one generic location and place each adapter's acquisition, cancellation, and acknowledgment mechanics in its dedicated convention file, including `conventions/claude-code.md` and `conventions/codex.md`. Update the component map and compatibility decision accordingly.
**Why it matters:** The current allocation would violate the repository's skill architecture and makes the shared path tool-aware, creating the regression risk AC9 forbids.
