---
"@automattic/radical-pipelines": minor
---

Add an optional per-agent model configuration convention. A project can now pin, per spawned agent and/or as a project-wide default, which model and model settings (such as reasoning `effort`) each agent runs on. The convention is authored per active tool — values are tool-native and passed verbatim to that tool's spawn mechanism with no translation — and is fully optional: a project that configures nothing keeps today's behavior in both the Claude Code and Pi runtimes. Configuration rides the spawn channel only, never editing an agent's profile, and the health monitor's recovery model swaps stay transient — applied only to the recovery re-spawn, never written back and never re-selecting the just-failed model — so the next fresh spawn runs on the configured model again. Setup, the README convention catalog, and this repository's dogfood `.rp.md` document and demonstrate the new `Agent models` block.
