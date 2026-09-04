---
"@automattic/radical-pipelines": patch
---

Retire an opencode health loop whose target session no longer exists. A dead target is terminal — no later tick can find it — but every tick failed and re-armed, so one abandoned loop filled `recentErrors` with the same 404 for as long as the daemon ran, burying the failures worth reading. The loop now records `loop.retired` once and stops.
