---
"@automattic/radical-pipelines": patch
---

Have the build worker read its tests as their reviewer would before it reports. Every task ends by removing any test, case, or parameter row that exercises a mechanism another test already exercises with the same kind of input, and any test that cannot fail when its outcome is violated. The economy rule reached the worker only as a rule with no moment to apply it, and finished builds kept the same behavior proven at several layers, loops over inputs that take one path, and checks that cannot fail.
