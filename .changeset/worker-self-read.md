---
"@automattic/radical-pipelines": patch
---

Have the build worker read its tests as their reviewer would before it reports. Every task ends by consolidating cases that exercise the same mechanism with the same kind of input, including cases within a single test, while preserving their claimed outcomes, and repairing or removing tests that cannot detect a claimed outcome's violation. The economy rule reached the worker only as a rule with no moment to apply it, and finished builds kept the same behavior proven at several layers, loops over inputs that take one path, and checks that cannot fail.
