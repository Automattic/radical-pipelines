# Radical Pipelines

An agent orchestrator that runs teams of agents autonomously through a pipeline of defined phases, where each phase produces concrete, inspectable artifacts.

## Rules when modifying the skill

- The skill must be written in a minimalist way with the minimum amount of information possible to convey the same meaning. Every word must serve a purpose. State the instruction, not the reasoning behind it. After writing something, ask yourself: "Can I say this in fewer words without losing meaning?" If the answer is yes, rewrite it. The skill must be concise and to the point.
- The skill must not contain duplicate information in the current reading path. For example, if a file can only be accessed through another and that one already contains certain information, there is no need to repeat it again.
- When a general rule already covers a case, state it once at that general level. Don't add special-case restatements of it, even correct ones.
- The skill must not contain negative phrases (don't do this, don't do that) unless that information is strictly necessary for its operation. That is, if by default the orchestrator or any of the agents have no reason to do something, there is no need to tell them not to do it.
- The skill must remain generic and must not contain any mention, even in examples, of things that are specific to any agentic coding tool (with the only exception of the files specifically dedicated to documenting these tools and that the orchestrator loads conditionally depending on the tool in question).
- The skill must remain generic and must not contain any mention, even in examples, of issue tracking platforms, like GitHub or Linear.
- On different paths, the skill must remain free of all duplication: if there is an instruction that is repeated in multiple files, that instruction must be moved to a separate file that the other files reference.
- Agent profiles must not reference any skill file or `.rp.md`; an agent reads only its own profile and its initial prompt. A shared instruction is duplicated into each profile, not extracted to a referenced file.
- The skill must describe the system only as it is designed to work, not transient, historical, or speculative situations. A case earns a place in the skill only when it is a durable part of the design — not a one-off (like a migration leftover) or a future need that doesn't yet exist.
- Reuse the terms and identifiers the skill already defines instead of introducing new notation for the same concept.
- The skill is prose, not software. Do not write structural tests that assert the content of skill or agent files — their sections, wording, or ordering. Such tests merely restate the skill and break on every legitimate edit.

## Rules when fixing a finding

These apply to the skill, the agent profiles, and the script alike.

- Before fixing, name the general rule that would resolve the finding. If that rule exists, the defect is a deviation from it or a copy of it; if it is missing, the model has a gap. Fix the rule or the model, never the case.
- A fix changes the general rule in its one place and removes what the finding exposed as special — an exception, an enumerated case, a label, a branch in the script. Nothing is added on top of the existing rule.
- Recognize a patch: an exception added for one finding; cases enumerated where a rule covers them; a rule that exists only for a situation the system no longer produces; a new term or label for a concept that already has one; wording that only makes sense knowing the finding behind it.
- When the same concept breaks across two fixes, the rule is implemented in more than one place. Unify the places first; the fix follows.
- A finding from an agent that ran while the skill changed mid-run yields no rule. Rules come from fresh runs or reproduced defects.

## Rules for the script

- The script implements the prose. Each concept the prose defines is one function, and every predicate derives from it; a criterion lives in one place.
- What cannot be read, or is malformed, is an error that stops the computation — never a fact about the pipeline.
- A test builds the recorded state directly and asserts the script's output over the rule's conditions: the matrix of the rule, not the case that was reported.

## Repository rules

- Every change to the repository records a changeset (authoring guidance in CONTRIBUTING.md).
- README.md is updated when a change alters behavior it describes.
