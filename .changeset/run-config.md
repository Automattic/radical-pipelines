---
"@automattic/radical-pipelines": minor
---

BREAKING: the run configuration — workflow, target phase, lanes — is recorded in the pipeline's `run-config.md`, which `rp check` reads; `--lanes`, `--target-phase`, `rp fingerprint`, and `--set lane=` are removed, `rp stamp` derives a file's lane from its path, and the Agents convention becomes free-form defaults.
