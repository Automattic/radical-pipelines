---
"@automattic/radical-pipelines": patch
---

A phase review covers every current authored change except those a later phase's reports record, so Document work no longer reopens an approved Build review. The change checkpoint leaves review packages; occurrence pins alone govern coverage. `rp diff --phase <build|document>` renders a Fresh phase review's changes. Existing phase-review approvals need one new review wave.
