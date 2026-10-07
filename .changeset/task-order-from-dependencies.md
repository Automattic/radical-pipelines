---
"@automattic/radical-pipelines": patch
---

Remove the plan's Order section. A task's `depends-on` is the only declaration of sequence: it names every task that must be done before it. The section repeated every dependency and listed tasks in a position the frontier never read, so a plan could place a task before another without declaring the dependency. Plan reviewers check that dependencies name exactly each task's prerequisites and are acyclic.
