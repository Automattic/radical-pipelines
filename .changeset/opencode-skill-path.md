---
"@automattic/radical-pipelines": minor
---

BREAKING: Target stable opencode v2 and remove pre-release skill registration support and the runtime pin comparison. Register skills with the required path and supported autoinvoke metadata, use the released CLI and package names, and install and update through an unpinned Git source.

Update session titles and inbox delivery through the released PATCH endpoints, and resume interrupted health-loop targets with the supported resume query parameter.
