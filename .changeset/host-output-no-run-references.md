---
"@automattic/radical-pipelines": minor
---

Make every run, by default, produce host-project output that reads as if written by hand — code, tests, documentation, and commit messages that carry no reference to the run that produced them, such as a task number, a requirement or acceptance-criterion ID, a named artifact cited as their source, or another agent credited as their author. The rule is always on with no owner action, and the reviewer enforces it at the existing per-phase review gate, treating a leaked reference as a must-fix that blocks approval until it is removed.
