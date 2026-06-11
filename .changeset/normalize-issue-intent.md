---
"@automattic/radical-pipelines": minor
---

When creating a pipeline from an issue, the orchestrator now reads the full picture — the issue body, all of its comments, one-level in-tracker cross-references, and linked external pages — and synthesizes that material into the canonical intent format, showing the draft to the owner for explicit approval before writing the file; a standard two-line provenance header (source reference and self-containment assertion) is prepended to every issue-derived base intent in both the synthesis and passthrough cases; a fast-path passthrough skips synthesis and the confirmation gate when the issue body is already in the canonical format, there are no comments, no cross-references, no external links, and no binary attachments.
