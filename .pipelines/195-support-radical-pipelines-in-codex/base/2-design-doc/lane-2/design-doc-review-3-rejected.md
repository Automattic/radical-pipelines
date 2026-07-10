# Design Doc Review

## Verdict: rejected

## Summary

The revision removes the unavailable native per-spawn controls and replaces configuration inference with a child-process probe, but the replacement is not yet an implementable three-surface contract. It treats the interactive Codex TUI as a stable message API, omits outer sandbox and model-setting requirements, leaves the distribution contract undecided, and contradicts the committed research record.

## Issues

### Issue 1: The child-process contract treats the interactive TUI as a message API

**What's wrong:** The launch contract is `codex --model ... --cd ...`, which starts the interactive TUI, yet the design treats stdin/stdout as framed agent messages and polling as a turn-completion signal. It defines no PTY requirement, prompt-submission sequence, renderer parsing, turn-completion event, approval/onboarding handling, or deterministic payload extraction. Nonces prevent cross-process attribution but do not turn rendered terminal output into a stable protocol. Current Codex exposes documented machine-oriented paths through [`codex exec`/`codex exec resume`](https://learn.chatgpt.com/docs/developer-commands#codex-exec) and the [app-server thread/turn API](https://learn.chatgpt.com/docs/app-server#api-overview); the design neither selects one nor records evidence that a TUI bridge works on desktop, CLI, and IDE. Its release fallback—return to design if any surface fails—defers the architecture's feasibility rather than safely verifying an implementation detail.

**Where in design doc:** Overview; Approach; Interfaces and Data Flow — Codex agent execution contract and Effective-capability preflight; Key Decisions — Run Codex agents as CLI child processes; Risks and Open Questions — CLI availability across surfaces and Terminal protocol robustness

**Suggestion:** Select a documented structured execution interface and define its session identity, turn submission, event/output parsing, completion, cancellation, and cleanup contract. If retaining the TUI, specify and validate the complete PTY protocol on all three required surfaces before approval.

**Why it matters:** Requirements 1 and 2 require normal autonomous execution on all three surfaces. A preflight can detect that an undefined transport failed, but cannot make the transport implementable; acceptance criteria 1, 2, 4, and 7 remain unproven.

### Issue 2: The preflight omits the invoking Codex sandbox and credential-state prerequisites

**What's wrong:** Every nested CLI is launched as a shell subprocess of the invoking Codex session. Its API traffic, credential access, and session/config writes remain constrained by the outer session's filesystem, network, and approval policy. The [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference#configtoml) separately gates workspace-write networking, and a child cannot relax its parent's sandbox. The design lists authentication, trust, CLI availability, and terminal control, but not outbound subprocess networking, readable credentials, writable required Codex state, or an approval-free way to sustain autonomous child sessions. The probe may surface a generic launch failure, while setup has no specified evidence or supported action for these causes.

**Where in design doc:** Approach; Components — Tool adapters and Codex process adapter; Interfaces and Data Flow — Effective-capability preflight; Dependencies; Failure Modes and Observability — Executable or authentication failure, Trust or repository-access failure, and Terminal-contract failure; Acceptance Verification — criterion 8

**Suggestion:** Define the outer permission contract for each surface, including network, credential/config/session-state access, approvals, and PTY control. Make preflight distinguish each failure and name its setup action. Verify that the standard supported configuration can launch two working children on every required surface; otherwise choose an execution path outside the shell sandbox boundary.

**Why it matters:** Requirement 5 and acceptance criterion 8 require missing prerequisites to enter a supported setup path before mutation. The current design can reject ordinary secure sessions without explaining how they become conforming, and may make autonomous parity impossible under a required surface's normal sandbox.

### Issue 3: Agent model settings were dropped from the launch contract

**What's wrong:** Existing conventions allow each role to select a model plus tool-native settings such as reasoning effort, and shared autonomous orchestration applies both at spawn. The design resolves only a model string and passes only `--model`; the process record, preflight, failure evidence, and acceptance matrix likewise cover models but no settings. The committed research explicitly required resolved model/settings, so the revision silently narrows the decision while requirement 2 includes agent model configuration.

**Where in design doc:** Approach; Components — Codex process adapter; Interfaces and Data Flow — Codex agent execution contract and Effective-capability preflight; Key Decisions — Run Codex agents as CLI child processes; Failure Modes and Observability — Model failure; Acceptance Verification — criteria 2 and 7

**Suggestion:** Define the `.rp.codex.md` model/settings value shape, precedence, exact CLI or structured-API mapping, process record, preflight validation, and diagnostics for every supported setting.

**Why it matters:** Two implementations cannot infer the same per-role runtime configuration from this design, and normal workflow parity omits an explicit requirement.

### Issue 4: The Codex distribution contract remains undecided

**What's wrong:** The design says unspecified “native Codex metadata” exposes the skill and conditionally wires a version-bearing manifest “if selected.” Current [Codex plugin distribution](https://learn.chatgpt.com/docs/build-plugins#plugin-structure) has a concrete version-bearing `.codex-plugin/plugin.json` entry point with a `skills` path and marketplace/install behavior across the desktop app, CLI, and IDE. The design does not decide whether this repository is a plugin or repository-local skill, name the files and paths, explain installation/invocation on each surface, or settle mandatory version-sync and release changes. This is a component boundary, not incidental build syntax.

**Where in design doc:** Components — Codex distribution and Release and documentation surfaces; Key Decisions — Keep one shared protocol behind runtime adapters and Keep repository runtime dependencies unchanged; Dependencies; Acceptance Verification — criteria 1, 6, 8, and 10

**Suggestion:** Choose the native distribution form and specify its manifest, canonical skill path, marketplace/install route, surface discovery behavior, version ownership, validation, and coexistence with the Claude plugin.

**Why it matters:** Requirements 1, 4, and 5 cannot be implemented or verified consistently while the mechanism that makes Radical Pipelines discoverable on Codex is unresolved.

### Issue 5: The committed research record contradicts the revised architecture

**What's wrong:** The research decision still specifies in-session opaque agent IDs, analyst-owned researcher spawning, native model/settings propagation, and nesting/thread-capacity gates. Its open questions and risks still gate release on nested spawning. The design instead selects root-owned CLI child processes and declares native multi-agent, depth, and thread settings irrelevant. The rejection explains why the old choice failed, but neither artifact records a researched comparison or supersession for the new choice, including the TUI, sandbox, and distribution risks above.

**Where in design doc:** Approach; Interfaces and Data Flow — Codex agent execution contract and Effective-capability preflight; Key Decisions — Run Codex agents as CLI child processes and Keep Codex persistent-pair transport root-owned; Risks and Open Questions

**Suggestion:** Reconcile the committed design research with the selected execution architecture: record the new options, evidence, decision, trade-offs, dependencies, and residual risks, then make the design doc faithfully reflect that record.

**Why it matters:** The design is not traceable to its required research artifact, and load-bearing choices introduced during rejection repair have no committed feasibility evidence.
