---
"@automattic/radical-pipelines": minor
---

BREAKING: Remove Pi as a supported agentic coding tool. The repository is now solely a Claude Code plugin and a standalone agent skill: the root `package.json` is no longer a Pi manifest (its `pi` block, the bundled `pi-teams` and `@pi-agents/loop` dependencies, the Pi peer dependencies, and the `pi-package` keyword are gone), the Pi convention file and the Pi-specific setup, README, and website sections are removed, and the setup convention table lists only Claude Code.
