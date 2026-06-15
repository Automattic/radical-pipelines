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
- The skill must describe the system only as it is designed to work, not transient, historical, or speculative situations. A case earns a place in the skill only when it is a durable part of the design — not a one-off (like a migration leftover) or a future need that doesn't yet exist.
- Reuse the terms and identifiers the skill already defines instead of introducing new notation for the same concept.
