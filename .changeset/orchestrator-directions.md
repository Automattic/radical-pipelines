---
"@automattic/radical-pipelines": minor
---

BREAKING: Rename `owner-directions` to `orchestrator-directions` in the pipeline configuration, and state what it holds and who reads it.

`orchestrator-directions` holds what the owner tells the orchestrator about how to do its own part of the pipeline's runs that no other key and no convention records, such as to keep the pipeline branch local. Only the orchestrator reads it, when a run starts and when its context was compacted, and an entry stays until the owner withdraws it. Whatever a role must act on goes through triage, which records it as later input the targeted role's assignment lists.

`rp` reports `owner-directions` in `config.json` as an unexpected key: rename it in an existing pipeline's `config.json`, moving any entry a role must act on to a later input.
