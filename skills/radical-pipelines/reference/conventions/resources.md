# Resources

Resources are what a project makes available to its agents — environments, services, accounts, data, tools — and how to use them. A rule an agent must satisfy is a guardrail, not a resource. A resource's text is written for agents; anything you, the orchestrator, must start, reset, or stop belongs in Lifecycle hooks.

## Format

Each resource is an entry of the Resources section (`load.md` § Conventions): a heading naming it, its `profiles` field listing the profiles it serves, and its text — what it is, how to reach it, what agents may do with it.
