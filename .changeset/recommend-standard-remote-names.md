---
"@automattic/radical-pipelines": minor
---

Recommend the standard `origin`/`upstream` remote names during `artifacts-in-fork` setup. After confirming which remote is the fork and which is the canonical repository — using `gh` fork/parent auto-detection to propose the assignment, and always falling back to asking the owner when detection is ambiguous or unavailable — setup now recommends naming the fork `origin` and the canonical `upstream`, matching GitHub's documented fork convention. The recommendation is decline-able and the orchestrator never renames a remote without the owner's explicit approval; already-standard remotes are left untouched. Whatever names end up in use — renamed or kept — are recorded as the resolved, authoritative remote names, which downstream operations resolve through when pushing the pipeline branch to the fork and the clean PR branch to the upstream. `artifacts-in-repo` mode is unaffected.
