# Code Summary — Make guardrails prose

## What

A coordinated prose edit across the nine in-scope skill and agent-profile Markdown files that redefines a guardrail from "an exact command judged pass/fail by exit code" into **a prose rule an agent must satisfy**, expressed in two kinds: a **command guardrail** (its body tells the agent to run a command and confirm the check it describes is satisfied) and a **judgment guardrail** (a prose rule the named agent satisfies by its own assessment, with no command). All exit-code framing is removed. The files changed:

- `skills/radical-pipelines/reference/guardrails.md` — the canonical model.
- `skills/radical-pipelines/reference/conventions/load.md` — the convention-table gloss.
- `skills/radical-pipelines/reference/conventions/passing.md` — the spawn-time Guardrails placement.
- `skills/radical-pipelines/reference/conventions/setup.md` — the Guardrails capture section.
- `agents/code-writer-tdd.md`, `agents/code-writer-e2e.md`, `agents/doc-writer.md` — the writers' guardrail step.
- `agents/code-reviewer.md`, `agents/doc-reviewer.md` — the reviewers' guardrail step, Checks table, and blocker guideline.

No runtime, parser, or application is involved; the skill "executes" only when a human owner or an LLM agent reads the prose.

## Why

The old exit-code definition limited a guardrail to a runnable command and forced every consuming behavior (writers gating commits, reviewers recording results, setup validating capture) to speak in exit-code terms. The most useful rules a project may want to enforce — style or content rules an agent satisfies by judgment — are not commands at all. This change makes authoring such rules possible while preserving the binary approve/reject verdict and the per-pipeline `{scope}` command-scoping lifecycle unchanged.

## How

- **One concept, two kinds, one block.** `guardrails.md` defines the guardrail positively, introduces the two kinds as labelled bullets, demotes fixed/scoped to nested sub-bullets under command-guardrail (stated in exactly one place), and renames the `command:` field to a single kind-neutral `rule:` body field — no second field, no kind flag. The discriminator between kinds is the presence or absence of a command in the body, not a structural flag.
- **Consuming behaviors broadened asymmetrically.** Reviewers evaluate **both** kinds and record a per-guardrail result (Checks table generalized to `| Check | Guardrail | Result |` with satisfied/unsatisfied/skipped). Writers stay **command-focused**: they run command guardrails, gate the commit on each guardrail's check, and use a three-way sort whose two failure entries are named "a command guardrail …" so a received judgment body matches neither and raises no spurious blocker. Setup validates a command guardrail by running it (accepted even if its check currently fails; rejected only if it cannot run) and captures a judgment guardrail verbatim via the commit-format analogy.
- **Exit-code framing removed, meaning preserved.** Every "exit 0" / "exit code" / "exits non-zero" / "pass/fail by exit code" phrase is gone, while the two load-bearing meanings survive in kind-neutral prose: setup accepting a runnable-but-currently-failing command, and the writer/reviewer "the command ran but the check it describes is not satisfied" outcome.
- **Edited in place.** The writer/reviewer guardrail sections were rewritten in their profiles rather than factored into a shared reference file, matching the profiles' self-contained design; no new cross-path duplication or structure was added.

## Key decisions

- **No structural tests.** The project authoring rule "the skill is prose, not software" forbids tests asserting the content, sections, wording, or ordering of skill or agent files. Verification is by reading the edited prose against the acceptance criteria — the means of verification the design prescribes. The empty E2E plan is correct.
- **`{scope}` lifecycle and the plan agents untouched.** A judgment guardrail is structurally never scoped, so it never reaches the `{scope}` machinery; no guard clause is needed. The four plan agents and `reference/assisted-phases/3 - plan.md` are deliberately not edited and retain "gate"/"scoped gate" terminology and the `| Gate | Scope |` header — a deliberate scope boundary, not a missed edit.
- **The two code writers stay byte-identical.** Their `### 3. Run the guardrails` sections were byte-identical before and remain byte-identical after the rewrite (verified).
- **Each reviewer's two pre-existing intentional differences preserved** — code-reviewer's "To finally approve" / "your step-2/3 judgment stands" vs doc-reviewer's "To approve" / "the step-3 accuracy spot-check is your only evidence".
- **Generic judgment example.** The judgment-guardrail prompt added to setup is generic ("a style or content rule an agent satisfies by its own assessment, with no command to run") and names no project- or tool-specific thing.

## Known limitations

- **Writer-side judgment gating is intentionally out of scope.** Writers do not formally gate on judgment guardrails; the reviewer remains the agent that gates on them. A judgment guardrail an owner confines to a writer is followed as guidance only. This matches the spec's command-only writer acceptance criteria.
- **Scope-boundary terminology mismatch is deliberate.** After this change the in-scope files say "guardrail" while the out-of-scope `{scope}` plan machinery still says "gate"/"scoped gate". Aligning that terminology is possible future work, explicitly out of scope here.
