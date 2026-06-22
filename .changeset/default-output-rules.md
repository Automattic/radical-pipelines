---
"@automattic/radical-pipelines": minor
---

BREAKING: apply two always-on output rules to every run's host-project product, with no owner action and no opt-out. Rule 1 leaves comments and prose untouched on content a change did not modify — no gratuitous rewording, reflowing, or reformatting. Rule 2 keeps the shipped product transparent to the pipeline — code, identifiers, string literals, log and error messages, inline and external documentation, and commit messages carry no reference to the run's pipeline, its phases, its artifacts, or its agents, so the output reads as if written by hand. The Code and Docs phase reviewers enforce both rules and block their phase from completing while a violation stands. As part of Rule 2, the agent-name provenance tag is now confined to artifact-only commits — commits that introduce code or external documentation carry no provenance tag. A host whose configured commit format tags every commit must update it so product commits go untagged.
