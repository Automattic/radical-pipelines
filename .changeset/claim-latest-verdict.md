---
"@automattic/radical-pipelines": patch
---

A claim is pending only while it is its lane's latest verdict: a lane that reviews again supersedes its earlier `unsatisfiable`. `rp check` no longer treats a historical wave as closed without a rejection, so a claim held by a rejected lane ends with the wave that approved instead of resurfacing as pending.
