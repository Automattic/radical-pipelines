---
"@automattic/radical-pipelines": patch
---

Fix the opencode permission mediator never firing: subscribe to the `permission.asked` event type, which renamed opencode's former `permission.v2.asked`. Blocked asks are again redirected or announced to the spawner instead of surfacing only through `rp_status` polling.
