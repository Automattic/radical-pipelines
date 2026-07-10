# Design Research: Codex support

## Research

### Existing tool boundary and pipeline contract

- Pipeline state is already tool-neutral: branch parsing and version relationships are deterministic, while phase state comes from committed artifacts. Sources: `skills/radical-pipelines/reference/pipeline-versioning.md:5-64,77-84`.
- The orchestrator already supplies worktree seating, role prompts, model settings, and prior evidence at an abstract spawn boundary. The standard prompt shape is defined separately. Sources: `skills/radical-pipelines/reference/autonomous-workflow.md:35-40,63-70`; `skills/radical-pipelines/reference/conventions/passing.md:1-26`.
- Role lifetimes are phase contracts: analyst/researcher pairs persist through their Q&A; writer/reviewer iterations use fresh instances. Sources: `skills/radical-pipelines/reference/autonomous-phases/1 - spec.md:22-40`; `skills/radical-pipelines/reference/autonomous-phases/2 - design-doc.md:29-46`; `skills/radical-pipelines/reference/autonomous-phases/3 - build.md:24-47`; `skills/radical-pipelines/reference/autonomous-phases/4 - document.md:26-48`.
- Assisted mode runs in the orchestrator without spawning agents. Source: `skills/radical-pipelines/reference/assisted-workflow.md:1-23`.
- Branch/worktree/lane isolation belongs to the shared workflow, so a tool adapter only seats and addresses agents. Sources: `skills/radical-pipelines/reference/autonomous-workflow.md:35-40`; `skills/radical-pipelines/reference/pipeline-versioning.md:26-40`.

### Configuration and distribution seams

- The documented and current project model is one `.rp.md` containing shared conventions and tool-specific sections. Sources: `README.md:104-118`; `.rp.md:5-113`.
- Convention loading blocks before pipeline mutation and offers setup; setup already dispatches by tool and has a tool-specific action hook. Sources: `skills/radical-pipelines/reference/conventions/load.md:20-26`; `skills/radical-pipelines/reference/conventions/setup.md:15-29,183-200`.
- Claude Code packaging points directly at the canonical root skill and profiles. A Codex-native package can do the same without copying their contents. Sources: `README.md:95-102`; `.claude-plugin/plugin.json:1-10`; `.claude-plugin/marketplace.json:8-13`.
- The repository has canonical `skills/radical-pipelines/` and `agents/` sources but no tracked Codex adapter. Exact Codex metadata names and schema are an implementation detail not established by repository evidence.

### Runtime capability boundary

- Monitoring is currently required by completeness, start, close-out, and resume flows. Sources: `skills/radical-pipelines/reference/conventions/load.md:14-18`; `skills/radical-pipelines/reference/autonomous-workflow.md:35-39,88-94`; `skills/radical-pipelines/reference/resume-pipeline.md:7-10`.
- To satisfy optional first-release monitoring while preserving Claude behavior, monitoring must be a tool capability: Claude conventions continue to require it; Codex conventions may omit it; shared start, cancel, and resume steps invoke it only when configured.
- Detached recovery adds no required first-release path.

### Feasibility constraints

- Profiles require their working directory to be inside the assigned worktree before their first write, while the orchestrator assumes seating at spawn. Sources: `agents/design-doc-analyst.md:8-10`; `agents/build-writer-tdd.md:6-8`; `skills/radical-pipelines/reference/autonomous-workflow.md:40,63-67`.
- Persistent instances need returned opaque identities for their lifetime; each fresh iteration needs a new identity. Team-addressing semantics currently belong to the selected spawning conventions. Sources: `skills/radical-pipelines/reference/conventions/load.md:14`; `skills/radical-pipelines/reference/conventions/setup.md:71-75`.
- Bounded native concurrency can queue isolated lanes without changing parity: timing is runtime machinery; isolation, artifacts, and outcomes remain unchanged. The default lane count is one. Sources: `skills/radical-pipelines/reference/autonomous-phases/1 - spec.md:18-20`; `skills/radical-pipelines/reference/autonomous-phases/2 - design-doc.md:19-27`.
- The change requires a changeset and behavior-altering README updates. Release synchronization currently names only the Claude manifest. Sources: `AGENTS.md:19-22`; `CONTRIBUTING.md:21`.

### Component inventory

New components:

- `skills/radical-pipelines/reference/conventions/codex.md`: the only skill file describing Codex profile discovery, spawn/follow-up/address behavior, returned-ID lifetime, worktree seating, native model settings, setup actions, and optional capabilities. It parallels `conventions/claude-code.md` and plugs into the existing setup dispatch. Sources: `skills/radical-pipelines/reference/conventions/claude-code.md:1-21`; `skills/radical-pipelines/reference/conventions/setup.md:15-29,183-189`; `AGENTS.md:11`.
- Codex-native distribution/configuration metadata: expose the canonical skill and logical profiles to desktop, CLI, and IDE surfaces without copying their bodies. The exact native path/schema is confined to implementation because current repository evidence does not establish it.
- One feature changeset. Sources: `AGENTS.md:19-22`; `CONTRIBUTING.md:62-75`.

Required modifications:

- `reference/conventions/load.md`: select shared plus active-tool `.rp.md` sections, load the active tool rule file, apply active capability completeness, and retain the local overlay. Source: `skills/radical-pipelines/reference/conventions/load.md:1-34`.
- `reference/conventions/setup.md`: dispatch Codex setup, merge only the selected tool section into `.rp.md`, preserve all other sections, and run confirmed native setup actions. Source: `skills/radical-pipelines/reference/conventions/setup.md:15-29,77-89,183-224`.
- `reference/autonomous-workflow.md` and `reference/resume-pipeline.md`: conditionally start or cancel monitoring when the active adapter provides it; keep all artifact-based orchestration unchanged. Sources: `skills/radical-pipelines/reference/autonomous-workflow.md:35-39,63-70,88-94`; `skills/radical-pipelines/reference/resume-pipeline.md:7-30`.
- Root `.rp.md`: preserve shared and Claude sections and add the repository's Codex Team spawning/model conventions. Sources: `.rp.md:1-113`; `README.md:104-118`.
- `README.md`, `package.json`, `.changeset/config.json`, and `CONTRIBUTING.md`: describe and classify Codex support and its native metadata. Sources: `README.md:63-118`; `package.json:1-17`; `.changeset/config.json:12`; `CONTRIBUTING.md:19-56`.
- If Codex metadata is version-bearing, extend `scripts/sync-version.mjs`, `scripts/check-version-sync.mjs`, their behavior tests, and release documentation to propagate and verify that version. Sources: `scripts/sync-version.mjs:29-37,75-100`; `scripts/check-version-sync.mjs:43-74`.

Deliberately unchanged:

- `skills/radical-pipelines/SKILL.md`, autonomous and assisted phase references, prompt passing, pipeline creation/versioning/fork/revision, guardrails, artifact formats, and phase predicates remain the generic contract. Sources: `skills/radical-pipelines/SKILL.md:6-45`; `skills/radical-pipelines/reference/conventions/passing.md:1-26`; `skills/radical-pipelines/reference/pipeline-versioning.md:5-84`.
- Canonical `agents/*.md` profiles remain shared and preferably unchanged. The adapter must start each child in its assigned worktree and route it by returned ID. If any required surface cannot set child cwd, change every profile's generic startup invariant to validate and operate against the absolute Worktree path; never duplicate Codex profiles. Sources: `agents/design-doc-analyst.md:8-10`; `agents/build-writer-tdd.md:6-8`; `skills/radical-pipelines/reference/autonomous-workflow.md:35-40,63-67`.
- Claude Code rules and plugin metadata retain existing behavior. `health-monitoring.md` remains the procedure for adapters that provide the capability. Sources: `skills/radical-pipelines/reference/conventions/claude-code.md:1-21`; `skills/radical-pipelines/reference/health-monitoring.md:13-21,69-78`.
- Tests cover executable metadata/release behavior when applicable, not prose headings, order, or profile wording. Cross-surface and cross-tool acceptance is verified behaviorally. Sources: `AGENTS.md:17`; `CONTRIBUTING.md:11-17`.

### Normalized interfaces

These are prose contracts interpreted by the orchestrator, not new code APIs.

```text
loadConventions(repoRoot, activeTool)
  -> CompleteConventions
  | MissingSetup { conventions[], prerequisites[] }
```

- Load `.rp.md` as `Shared conventions + section(activeTool)`, require the committed selection to be complete, then apply permitted `.rp.local.md` overrides. Exactly one tool section is selected; tool sections cannot override shared branch/artifact contracts. Sources: `skills/radical-pipelines/reference/conventions/load.md:1-34`; `.rp.md:1-113`.
- Shared required units remain Issues, Branch name base, Pipeline family folder, Artifact storage, and Worktree root. Team spawning and profile/config availability are active-tool prerequisites. Commit format, Agent models, and Guardrails remain optional. Health monitoring is required only when the selected tool declares it.

```text
setup(activeTool, existingRp)
  -> ProposedWrite { sharedEdits?, selectedToolSection, setupActions[] }
  -> OwnerConfirm
  -> UpdatedRp | Cancelled
```

- Setup reports found and missing items before pipeline mutation, preserves unselected tool sections byte-for-byte, confirms native setup actions, then reloads through the canonical loader. Sources: `skills/radical-pipelines/reference/conventions/load.md:20-26`; `skills/radical-pipelines/reference/conventions/setup.md:1-29,183-224`.

```text
resolveProfile(logicalAgentName)
  -> NativeProfileRef { canonicalInstructions: agents/<logicalAgentName>.md }
  | MissingPrerequisite

resolveModel(logicalAgentName, runChoice, agentModels?)
  -> NativeSpawnSettings | ToolDefault
```

- Logical profile names and role lifetimes are the stable interface; native filenames, fields, installed identifiers, and model strings remain adapter details. Model values are opaque, resolved per spawn, and never persisted in pipeline artifacts. Sources: `skills/radical-pipelines/reference/conventions/setup.md:77-89`; autonomous phase references 1–4.

```text
spawnAgent({
  logicalAgentName, nativeProfileRef, nativeSpawnSettings?,
  worktreePath: absolute, branchName, initialPrompt
}) -> AgentHandle { id: opaque }
```

- Preconditions: the worktree exists with the assigned branch; the child uses that worktree; the canonical profile and standard prompt are loaded. The returned ID uniquely addresses only that instance. Sources: `skills/radical-pipelines/reference/autonomous-workflow.md:35-40,63-70`; `skills/radical-pipelines/reference/conventions/passing.md:1-26`.
- Keep an in-session map from opaque ID to logical role, phase, lane, worktree, branch, and lifetime. Persistent pairs retain IDs for their phase; fresh writer/reviewer iterations get fresh IDs. IDs never enter conventions, artifacts, commits, trackers, or plans. Resume spawns fresh instances after reconstructing state from Git. Sources: `skills/radical-pipelines/reference/resume-pipeline.md:11-30`; `skills/radical-pipelines/reference/pipeline-versioning.md:49-64`.

```text
HealthMonitoring? {
  start(runPrompt) -> MonitorHandle?,
  list?() -> MonitorHandle[],
  cancel(MonitorHandle)
}
```

- Absence passes Codex completeness and skips start/cancel/resume handling. Presence preserves the existing monitor procedure. Monitor handles are runtime state, never pipeline artifacts. Sources: `skills/radical-pipelines/reference/health-monitoring.md:7-24,39-78`; `.rp.md:107-113`.

### End-to-end data flow

- **Autonomous:** load selected conventions; stop or set up before mutation; derive issue and pipeline state from Git; collect run choices; create branches/worktrees; optionally start monitoring; resolve profile/model per logical role; spawn and route by opaque ID; agents commit prescribed artifacts; merge/consolidate lanes; evaluate the committed phase predicate; immediately update the tracker; close out on every outcome by optionally cancelling monitoring, pushing branches, updating the tracker, and releasing handles. Sources: `skills/radical-pipelines/reference/autonomous-workflow.md:1-94`; `.rp.md:26-39`.
- **Assisted:** pass the same completeness gate; derive the next phase from committed predicates; create the artifact with the owner; obtain explicit approval; commit the artifact and approval marker; evaluate completion; update/push/close out. No profiles, handles, models, or monitor participate. Source: `skills/radical-pipelines/reference/assisted-workflow.md:1-28`.
- **Incomplete setup:** report found/missing conventions and prerequisites; setup only after confirmation; stop without pipeline mutation on decline or cancellation. Sources: `skills/radical-pipelines/reference/conventions/load.md:20-26`; `skills/radical-pipelines/reference/conventions/setup.md:1-29,183-224`.
- **Cross-tool continuation:** the new tool loads the same Shared section plus its own section, parses unchanged branches, derives state from required committed files, and spawns fresh native agents. No migration or handle import occurs. Source: `skills/radical-pipelines/reference/pipeline-versioning.md:5-84`.
- **Results:** runtime messages carry completion, review issues, or blockers; commits carry durable prescribed files. The orchestrator advances only after evaluating committed state. Sources: `skills/radical-pipelines/reference/autonomous-workflow.md:50-59,72-86`; `skills/radical-pipelines/reference/pipeline-versioning.md:49-64`.

### Dependency and release boundary

- Required internal assets are the canonical generic skill/reference tree, canonical root profiles, the new Codex conventions file, thin native metadata, and project `.rp.md`. Native metadata resolves canonical sources; setup never copies their bodies. Sources: `skills/radical-pipelines/SKILL.md:41-54`; `README.md:95-102`; `AGENTS.md:8-16`.
- Required external capabilities are direct local filesystem/shell/Git access; native skill/profile discovery; subagent spawn, follow-up, wait, opaque-ID routing, model settings, and assigned-worktree operation; owner confirmation; and project-selected issue access. Sources: `skills/radical-pipelines/reference/create-pipeline.md:15-18`; `skills/radical-pipelines/reference/conventions/setup.md:51-89,183-200`; `skills/radical-pipelines/reference/autonomous-workflow.md:63-70`.
- Tracker tools and MCP are selected by shared project conventions, not Codex adapter dependencies. The current repository's concrete requirements apply equally to both tools. Source: `.rp.md:7-39`.
- No new library, hosted service, daemon, scheduler, or execution engine is required. The repository remains prose/config plus native agent and Git behavior; release scripts use Node built-ins. Sources: `package.json:9-17`; `scripts/sync-version.mjs:16-24`; `scripts/check-version-sync.mjs:17-25`.
- Distribution bundles canonical sources and native adapter metadata. Per-project setup merges the shared/Codex `.rp.md` content and writes a minimal native reference only if the native convention requires one and the owner confirms it. Setup never stores cache paths or profile bodies. Source: `skills/radical-pipelines/reference/conventions/setup.md:31-128,183-200`.
- Root `package.json.version` remains the single product version and Git remains the release channel. Add native metadata to release-relevant paths and record a feature changeset. Sources: `CONTRIBUTING.md:1-5,19-21,37-77`; `.changeset/config.json:12`.
- If native metadata is version-bearing, propagate the root version to it and extend drift/release behavior tests and documentation. If it is not, Git tags version the bundled file and version-sync code remains unchanged. Never introduce an independent adapter version. Sources: `scripts/sync-version.mjs:29-37,85-100`; `scripts/check-version-sync.mjs:43-74`; `scripts/test/release-version-script.test.mjs:19-38`.
- Optional monitoring may use a native scheduler when available. Detached recovery, restored agent handles, a runtime daemon/database, and mandatory scheduling are excluded.

### Failure and observability matrix

- **Incomplete conventions or native prerequisites:** detect before issue/pipeline mutation; report found and missing shared/selected-tool items and unresolved logical profiles; offer confirmed setup; stop on decline. No pipeline close-out is needed because no run started. Sources: `skills/radical-pipelines/reference/conventions/load.md:7-34`; `skills/radical-pipelines/reference/conventions/setup.md:1-13,183-224`.
- **Profile/model resolution:** preflight required logical roles; use the native default when optional Agent models are absent; surface logical role, configured tier/settings with secrets redacted, and native error for invalid configuration/authentication. Never fall back to an unprofiled agent. Sources: autonomous phase references 1–4; `skills/radical-pipelines/reference/conventions/setup.md:77-89`.
- **Spawn/worktree seating:** verify the worktree and checked-out branch before spawn and again in the child before its first write. On a clean failure, repair/recreate the worktree and use a fresh instance; if writes may exist, inspect Git first. Report expected and observed path/branch and any created ID. Sources: `skills/radical-pipelines/reference/autonomous-workflow.md:35-40`; `agents/design-doc-analyst.md:8-10`.
- **Routing/wait:** observe spawn/send/wait results, native status, messages, and commits. Resend only after an explicit not-delivered result; for ambiguous delivery, inspect status and durable state before acting. A dead instance may be replaced with a fresh one after verifying commits/artifacts. Silent-stall detection is optional monitoring behavior. Source: `skills/radical-pipelines/reference/health-monitoring.md:17-37`.
- **Agent blocker:** surface the missing/conflicting input, approved artifact to revise, smallest revision, and partial artifact verbatim; close out and direct the owner to fork below the affected phase. Source: `skills/radical-pipelines/reference/autonomous-workflow.md:72-86`.
- **Reviewer rejection:** treat committed rejection artifacts as normal iteration, pass issues verbatim to a fresh writer/consolidator, and inspect every third consecutive rejection for non-convergence. Close out only when the same pattern would continue indefinitely. Sources: `skills/radical-pipelines/reference/autonomous-workflow.md:59-61`; autonomous phase references 1–4.
- **Guardrail failure:** record the literal gate and result in the review artifact. Non-zero results drive iteration; an unrunnable required gate is a blocker; missing optional Guardrails is valid. Sources: `skills/radical-pipelines/reference/conventions/passing.md:19-26`; `agents/build-reviewer.md:72-97`.
- **Completion/commit mismatch:** compare the agent message with Git status/log/tree and the exact committed predicate. Missing, uncommitted, wrong-branch, or wrong-folder files keep the phase in progress; do not advance or update phase tracker state. Let the responsible live agent finish only when safe; otherwise close out for later resume. Sources: `skills/radical-pipelines/reference/autonomous-workflow.md:50-59`; `skills/radical-pipelines/reference/pipeline-versioning.md:49-64`.
- **Lane/merge/consolidation failure:** verify every lane approval and path scope before merge. Continue missing lane reviews normally; fail fast on topology/conflict errors, preserve lane refs/worktrees and partial merge evidence, and report exact refs/conflicts. Cleanup occurs only after successful merge. Sources: autonomous phase references 1–2; `skills/radical-pipelines/reference/pipeline-versioning.md:26-40`.
- **Tracker failure:** surface issue, intended state, exact connector error, and local predicate state. A start failure stops before agents; a phase-update failure after a complete Git predicate stops before the next phase; an end-cleanup failure does not suppress remaining push/report steps. Retry only explicitly transient idempotent state-setting operations. Source: `.rp.md:26-39`.
- **Close-out/push failure:** on success, blocker, cancellation, or failure, independently attempt optional monitor cancellation, branch pushes, tracker cleanup, handle release, and owner report. Report final local commits, successful/failed steps, unpushed refs, and pending external state. Sources: `skills/radical-pipelines/reference/autonomous-workflow.md:88-94`; `.rp.md:32-39`.
- **Cross-tool resume:** parse branches and predicates, inspect active artifacts/commits/diff, and follow existing clean restart or task-level resume rules. Runtime IDs/models are never imported. Sources: `skills/radical-pipelines/reference/resume-pipeline.md:11-30`; `skills/radical-pipelines/reference/pipeline-versioning.md:5-84`.
- **Optional monitor failure:** absence is valid. When present, use its existing two-retry table and escalation payload; report start/cancel failure without invalidating committed phase state. Source: `skills/radical-pipelines/reference/health-monitoring.md:26-48,71-78`.

Without monitoring, observability still includes native operation results; agent completion, rejection, and blocker messages; Git refs/worktrees/status/log/diff/merge state; inspectable artifacts and predicates; guardrail tables; phase reports; tracker/push responses; and resume reconstruction. Automatic time-based silent-stall detection and background retry are not guaranteed, consistent with optional monitoring.

A terminal runtime report includes outcome; phase/lane/logical role and live opaque ID when applicable; branch/worktree/artifact path; operation/error; last message/commit/artifact; predicate state and missing files; close-out results; and a safe setup, retry, resume, or fork action. IDs aid live diagnosis only.

### Coverage audit

- **Requirement 1 / AC 1 and 7:** one native adapter exposes canonical sources and normalizes discovery, spawn, addressing, models, and worktree operation across desktop, CLI, and IDE. Surface controls and concurrency may differ while outcomes remain identical. Sources: `spec.md:9-11,41-42,59-60`; `spec-research.md:116-121`.
- **Requirement 2 / AC 2 and 3:** assisted flow remains direct; autonomous flow retains every logical role/lifetime, review gate, worktree/lane, commit, tracker hook, predicate, and close-out. Optional monitoring is outside required normal execution. Sources: `spec.md:13-18,44-48`; `skills/radical-pipelines/reference/assisted-workflow.md:1-28`; `skills/radical-pipelines/reference/autonomous-workflow.md:31-94`.
- **Requirement 3 / AC 4 and 5:** runtime IDs, models, and metadata never enter durable state. Both tools use exact existing branches, paths, artifacts, and predicates; list/resume/revise/fork remain raw Git workflows. Sources: `spec.md:19-21,50-54`; `skills/radical-pipelines/reference/pipeline-versioning.md:5-84`; `skills/radical-pipelines/reference/resume-pipeline.md:11-30`.
- **Requirement 4 / AC 6:** `.rp.md` stays canonical; runtime selects Shared plus one tool section; setup preserves every unselected section; the restricted local overlay stays post-completeness. Sources: `spec.md:23-25,56-57`; `README.md:104-118`; `.rp.md:1-113`.
- **Requirement 5 / AC 8 and 10:** active-tool conventions and profile prerequisites fail before mutation. Claude rules/metadata stay intact, and selected capability requiredness preserves its existing monitor behavior. Sources: `spec.md:27-29,62-63,68-69`; `skills/radical-pipelines/reference/conventions/load.md:20-26`; `skills/radical-pipelines/reference/conventions/claude-code.md:1-21`.
- **AC 9:** monitoring is an absent-valid capability for Codex; start/cancel/resume calls are conditional; no scheduler, no-op monitor, detached recovery, or persisted handles are required. Sources: `spec.md:31-37,65-66`; `skills/radical-pipelines/reference/health-monitoring.md:1-78`.
- **All phase outcomes:** shared branch grammar, artifact formats, approval markers, completion predicates, phase boundaries, and owner gates remain unchanged. Source: `skills/radical-pipelines/reference/pipeline-versioning.md:5-64` and autonomous/assisted phase references.
- **Approved premises:** parity is outcome-based, not machinery identity; native Codex conventions may ship/discover canonical profiles and configuration. Exact native syntax is therefore an implementation question, not a design blocker.

## Topics

### Topic: End-to-end approach

- **Spec link:** Requirements 1–5 / Acceptance criteria 1–10
- **Question:** What tool adapter and configuration model can drive the unchanged pipeline contracts across every local Codex surface while preserving Claude Code behavior?
- **Options:**
  1. Add a thin Codex adapter while keeping one `.rp.md` with shared, Claude Code, and Codex sections; add a dedicated shipped Codex conventions file; reference canonical skill/profile sources from Codex-native metadata.
  2. Turn `.rp.md` into a router for separate `.rp.claude.md` and `.rp.codex.md` files.
  3. Copy the skill and profiles into a Codex-specific distribution tree.
- **Trade-offs:** Option 1 matches the current loader and project layout and minimizes migration, but one file grows with each tool section. Option 2 separates ownership but changes the canonical loading, setup, confirmation, and completeness paths and risks older Claude installations reading only the router. Option 3 offers physical isolation but duplicates generic semantics and creates drift.
- **Decision:** Use one shared pipeline contract plus a thin Codex adapter. Keep `.rp.md` canonical, select shared plus active-tool sections, then apply `.rp.local.md`. Add a dedicated `reference/conventions/codex.md` and Codex setup dispatch. Codex-native metadata references the canonical skill and agent profiles. The adapter maps logical roles to native profiles, spawns them in assigned worktrees, captures returned opaque IDs, passes the standard conventions prompt, and waits for outcomes. Queue isolated work when native capacity is bounded. Treat monitoring as an optional adapter capability; omit detached recovery.
- **Rationale:** This confines tool differences to distribution, convention selection, spawning, addressing, model arguments, and optional runtime capabilities. Git grammar, pipeline layout, artifacts, approval points, commits, and completion predicates remain unchanged, giving every local surface and both workflows the required outcomes without altering Claude Code behavior.

### Topic: Component boundaries and responsibilities

- **Spec link:** Requirements 1–5 / Acceptance criteria 1–10
- **Question:** Which concrete components are new, modified, or deliberately unchanged, and what responsibility belongs to each without duplicating generic behavior?
- **Options:**
  1. Keep one generic core and profile set; put Codex mechanics in a conditionally loaded conventions file and thin native metadata; modify only shared selection/setup and monitoring call sites.
  2. Formalize a new generic team-spawning interface file and broaden every profile to operate against an absolute worktree path.
  3. Add Codex branches to each phase reference or duplicate Codex-specific profiles.
- **Trade-offs:** Option 1 preserves the existing abstraction and minimizes shared edits, but the adapter must guarantee initial worktree seating. Option 2 tolerates native runtimes without child-cwd control, but adds indirection and repeats a broad safety change across every self-contained profile. Option 3 makes mechanics explicit at each use but couples generic contracts to a tool and creates semantic duplication.
- **Decision:** Use option 1. Add `reference/conventions/codex.md` and native distribution/configuration metadata. Modify convention loading/setup for active-tool section selection and capability completeness; modify autonomous start/close-out and resume only to gate monitoring. Keep generic workflow, phase, state, artifact, and prompt components unchanged. Keep canonical profiles unchanged when native seating meets their invariant; otherwise make the shared profiles operate against the absolute Worktree path. Extend release scripts/tests only if the native metadata is version-bearing.
- **Rationale:** The existing Team spawning seam already owns seating, model selection, prompts, and lifecycle. Keeping opaque IDs and Codex mechanics behind it preserves canonical profiles and cross-tool contracts. Behavioral checks target executable release metadata and end-to-end outcomes, satisfying repository test rules without encoding prose structure.

### Topic: Interfaces and data flow

- **Spec link:** Requirements 1–5 / Acceptance criteria 1–10
- **Question:** What normalized convention, spawn, lifecycle, setup, and state interfaces connect the Codex adapter to the unchanged workflow, and how does data move through them?
- **Options:**
  1. Normalize one selected tool section into shared conceptual load/setup/spawn/lifecycle interfaces; keep opaque IDs session-local and Git artifacts durable.
  2. Merge all tool sections with precedence and persist runtime IDs for recovery.
  3. Encode Codex-native manifest and spawn schema in shared workflow files.
- **Trade-offs:** Option 1 prevents incompatible tool commands from leaking across adapters and makes continuation runtime-independent, but each new runtime must implement the normalized spawn contract. Option 2 appears to simplify selection/recovery but creates convention collisions and stores nonportable handles. Option 3 makes one implementation concrete but couples durable workflow contracts to a changing native schema.
- **Decision:** Use option 1. Select exactly `Shared + active tool`; require committed completeness before local overrides; merge setup changes only into shared and selected sections. Resolve logical profiles and opaque model values per spawn. Pass absolute worktree/branch and existing convention fields in the launch prompt. Route exclusively by the returned opaque ID during that instance's lifetime. Persist only existing commits/artifacts and re-derive phase state on resume. Model monitoring as an optional capability.
- **Rationale:** The interface preserves one interoperable source of durable truth while allowing each surface to implement discovery and spawning natively. It also makes incomplete setup fail before mutations and keeps assisted mode on the same configuration/state contracts without imposing autonomous runtime machinery.

### Topic: Dependencies and release integration

- **Spec link:** Requirements 1, 4, and 5 / Acceptance criteria 1, 6, 8, and 10
- **Question:** What internal and external dependencies does the adapter require, how should native distribution metadata participate in installation and release, and which dependency choices preserve coexistence and compatibility?
- **Options:**
  1. Bundle thin native metadata that references canonical sources; generate only project-specific conventions/references during confirmed setup; use the existing single release/version.
  2. Generate repo-local native references during setup whenever discovery needs them.
  3. Copy skill/profile bodies per project or introduce a separate adapter package/runtime/version.
- **Trade-offs:** Option 1 keeps releases atomic and instructions canonical, but relies on the accepted native discovery premise. Option 2 is a valid fallback for a required native repo-local reference, but adds file ownership and stale-reference risks. Option 3 isolates installation state but creates drift, extra dependencies, and split compatibility.
- **Decision:** Use option 1, allowing option 2 only when mandated by the native schema. Add no library or service. Treat native lifecycle/discovery and local Git access as prerequisites checked by completeness. Keep one root product version; include native metadata in release scope; synchronize it only when its schema is version-bearing. Keep tracker access project-selected. Exclude detached recovery and mandatory scheduling.
- **Rationale:** The feature can reuse all existing semantic and release machinery. Conditional handling of the unknown native metadata schema avoids inventing a second contract while still defining atomic installation, setup, compatibility, and release behavior.

### Topic: Failure modes and observability

- **Spec link:** Requirements 2, 3, and 5 / Acceptance criteria 2–5 and 7–10
- **Question:** How should setup, discovery, spawn, routing, worktree, phase, merge, tracker, and optional-monitor failures be detected, surfaced, recovered, and closed out without detached recovery or new durable runtime state?
- **Options:**
  1. Fail fast on deterministic faults, preserve Git evidence, perform best-effort close-out, and recover through existing resume/fork flows; allow narrow idempotent retries and optional monitor retries.
  2. Add broad automatic per-operation retries.
  3. Persist runtime handles/messages for detached recovery.
- **Trade-offs:** Option 1 may stop more often on transient faults without a monitor, but keeps behavior inspectable and interoperable. Option 2 absorbs some transients but lacks delivery/idempotency guarantees and risks duplicate messages or writes. Option 3 could reconnect sessions but adds tool-specific durable state, storage, cleanup, and runtime machinery outside first-release requirements.
- **Decision:** Use option 1. Preflight configuration/discovery; validate worktree/branch and committed predicates; route and diagnose by live opaque ID; treat rejection loops as phase flow; preserve branches/artifacts on failure; close out every started-run outcome with independent best-effort steps. Retry only when non-application and idempotency are explicit. Resume from Git with fresh agents. Skip monitor operations when absent and use the existing monitor policy when present.
- **Rationale:** This preserves normal-success parity and actionable observability without turning optional monitoring or detached recovery into prerequisites. It also keeps Git artifacts as the only cross-tool recovery substrate.

### Topic: Coverage, risks, and open questions

- **Spec link:** Requirements 1–5 / Acceptance criteria 1–10
- **Question:** Does the chosen design serve every requirement and acceptance criterion, remain feasible against repository evidence, and leave only implementation-detail questions? What residual risks and open questions must downstream phases carry?
- **Options:**
  1. Proceed with the normalized adapter design and carry native schema/seating as implementation questions plus an explicit behavioral conformance matrix.
  2. Delay design until exact native metadata and spawn result syntax are known.
  3. Broaden first release with mandatory monitoring or persisted runtime recovery to compensate for uncertainty.
- **Trade-offs:** Option 1 completes every product decision while confining volatile syntax to the adapter; it requires verification on real surfaces. Option 2 would turn implementation details already covered by approved premises into an artificial blocker. Option 3 adds runtime machinery outside required parity and contaminates cross-tool state.
- **Decision:** Use option 1. The design covers Requirements 1–5 and Acceptance Criteria 1–10. Carry only native metadata/versioning and assigned-worktree seating as open implementation questions. Verify all local surfaces, coexistence, cross-tool continuation, incomplete setup, no-monitor success, lane scheduling, and unchanged Claude behavior. Add no required monitor or detached recovery path.
- **Rationale:** All durable components, interfaces, data flows, dependencies, failure behavior, and compatibility boundaries are decided from repository evidence. Remaining unknowns choose native syntax or the generic seating implementation without changing outcomes or artifacts.

## Open Questions

1. **Codex metadata and versioning:** What native manifest/config path, fields, source-reference mechanism, and install scope expose the canonical skill/profiles? Does the schema carry a semantic version that must join root-version propagation, drift checks, tests, and release documentation?
2. **Assigned-worktree seating:** Can desktop, CLI, and IDE start every child with its cwd inside the assigned worktree? If any cannot, update every canonical profile's startup invariant to validate and operate against the absolute Worktree path while retaining pre-write branch verification.

## Risks

- **Cross-surface native divergence:** Profile discovery, spawn/follow-up, cwd, or configuration visibility may differ across desktop, CLI, and IDE. Verify the same normal-success matrix independently on each surface.
- **Worktree seating mismatch:** A child in the orchestrator checkout will stop under current profiles or could write to the wrong branch if validation weakens. Require native seating or the generic absolute-path fallback and retain branch checks.
- **Capacity-aware lane scheduling:** Native agent limits may be lower than requested isolated lanes. Queue blind lanes in bounded batches without reducing lane count or sharing sibling inputs; verify disjoint branches, worktrees, artifacts, and outcomes.
- **Setup merge safety:** Whole-file edits could overwrite an existing Claude section. Show the exact selected-section diff, preserve unselected sections byte-for-byte, require confirmation, and recheck both tool configurations in coexistence verification.
- **Claude regression:** Capability selection or a fallback profile edit could weaken existing behavior. Claude must still require/use its monitor; run existing install/setup plus assisted/autonomous smoke tests and compare committed predicates.
- **Native metadata drift:** Metadata could carry a stale copy/reference/version. Point only at canonical sources, classify it as release-relevant, and join version sync only when its schema is version-bearing.
- **Opaque-ID misrouting:** Logical names collide across lanes and fresh iterations. Route only by returned ID with an in-memory role/lane/worktree map; never persist or resume handles.
- **Verification gaps:** Repository tests cover release software, not prose orchestration. Use behavioral conformance runs for autonomous-through-Document, assisted approval, operations, bidirectional continuation, incomplete setup, no-monitor Codex, and unchanged Claude.
