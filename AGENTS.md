# Radical Pipelines

An agent orchestrator that runs teams of agents autonomously through a pipeline of defined phases, where each phase produces concrete, inspectable artifacts.

## Rules

- The skill must be written in a minimalist way with the minimum amount of information possible to convey the same meaning. Every word must serve a purpose. Read the current skill to get the tone. After writing something, ask yourself: "Can I say this in fewer words without losing meaning?" If the answer is yes, rewrite it. The skill must be concise and to the point.
- The skill must not contain duplicate information in the current reading path. For example, if a file can only be accessed through another and that one already contains certain information, there is no need to repeat it again.
- On different paths, the skill must remain free of all duplication: if there is an instruction that is repeated in multiple files, that instruction must be moved to a separate file that the other files reference.
- Whenever a change is made to this repository, a changeset must be recorded: a committed `.changeset/*.md` that declares the change and its bump type, travelling with the pull request. Choose the bump type by semver — behavior-preserving fix → patch; backward-compatible feature → minor; breaking change → major (see [CONTRIBUTING.md#pre-10-policy](./CONTRIBUTING.md#pre-10-policy) for the pre-1.0 policy). See [CONTRIBUTING.md#adding-a-changeset](./CONTRIBUTING.md#adding-a-changeset) for how to author one.
