---
"@automattic/radical-pipelines": minor
---

Add an optional `Resources` convention: what a project makes available to its agents — environments, services, accounts, data, tools — and how to use them, delivered by profile in a new **Resources** Seat slot alongside **Guardrails**. Guardrails remain the rules an agent must satisfy; a resource is something it may use within its **Execution** line, and no reviewer evaluates it. The orchestrator resolves the values a guardrail's or resource's prose leaves to it, such as a worktree's port, before passing it on, and a helper shares its requester's whole Seat. New `before-removing-worktree` and `after-removing-worktree` lifecycle hooks bracket the removal of a worktree, so a project can stop what it started for a lane's worktree when the lane finishes. Conventions format 4 adds the section; migration offers to move what a guardrail describes as available into a resource.
