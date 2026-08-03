---
"@automattic/radical-pipelines": patch
---

Accept both of opencode's service-record filenames (`service-<hash>.json` and `service.json`), preferring the most recently written when a stale record from the other name lingers. opencode renamed the record after the pinned build, and matching only the old name left the plugin unable to resolve the running server — silently disabling `rp_send`, the health monitor's idle check, and `rp_status`, including the very pin-mismatch warning meant to flag that the running build is outside the verified surface.
