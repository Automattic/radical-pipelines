---
"@automattic/radical-pipelines": patch
---

Scope each plan's coverage to the work its phase performs: every acceptance criterion and decision has the implementation it requires served by a build task and the documentation it requires served by a document task. The build plan had to serve every criterion with a task while carrying no documentation task, and the document plan's coverage never claimed a criterion's documentation, so a spec whose criteria required documentation could not get an approved build plan.
