---
"@automattic/radical-pipelines": patch
---

Leave the intent's leading origin lines out of its identity: provenance is not an input obligation. A pipeline seeded with an earlier pipeline's intent and approved spec no longer computes that spec stale because the intent gained an `origin:` line, so it no longer re-converges and re-reviews a spec whose obligations did not change.
