---
"@automattic/radical-pipelines": patch
---

Reframe project `.rp.md` terminology so "configuration" is the umbrella concept (the `.rp.md` title) and "Conventions" becomes one flat section within it, alongside a future Guardrails sibling. The skill docs folder moves `reference/conventions/` to `reference/configuration/` with all inbound links updated. This is not a breaking change: existing project `.rp.md` files remain valid with zero modification, and there is no behavioral or loader change.
