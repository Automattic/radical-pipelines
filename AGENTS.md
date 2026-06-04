# Radical Pipelines

An agent orchestrator that runs teams of agents autonomously through a pipeline of defined phases, where each phase produces concrete, inspectable artifacts.

- Repository: https://github.com/Automattic/radical-pipelines
- All tasks, bugs, and feature requests are tracked in the repository's GitHub Issues.
- Whenever any task is performed that changes the code in this repository, the README.md must be updated to keep it up to date.
- Whenever a change is made to this repository, a changeset must be recorded: a committed `.changeset/*.md` that declares the change and its bump type, travelling with the pull request. Choose the bump type by semver — behavior-preserving fix → patch; backward-compatible feature → minor; breaking change → major (see [CONTRIBUTING.md#pre-10-policy](./CONTRIBUTING.md#pre-10-policy) for the pre-1.0 policy). See [CONTRIBUTING.md#adding-a-changeset](./CONTRIBUTING.md#adding-a-changeset) for how to author one.
