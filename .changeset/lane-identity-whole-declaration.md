---
"@automattic/radical-pipelines": minor
---

BREAKING: a lane's identity is its whole declaration. `rp fingerprint <id> [--brief <text>] [--materials <list>] [--after <lane+lane>]` fingerprints id, brief, materials, and `after` together; the orchestrator stamps a named lane's artifact and reviews with `--set lane=<fingerprint>`, and `rp check --lanes` validates the fingerprint of every lane that declares one — production and review lanes alike — marking a file stamped under another declaration stale. A lane folder or review the declaration lacks is reported as `undeclared lane <path>`, never treated as an implicit lane; reserved names such as `tasks` are refused as lane ids.
