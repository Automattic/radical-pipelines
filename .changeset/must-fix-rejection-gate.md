---
"@automattic/radical-pipelines": minor
---

Gate review rejections on must-fix issues. Every reviewer rejects only for an issue that leaves the artifact unable to do its job — wrong or unserved behavior, requirements, or decisions, a claim its check does not establish, or a failing gate — and records every other real finding under a new `## Non-blocking findings` review section, on either verdict. Re-reviews reject over material unchanged since a prior review only for a must-fix issue, and findings that are instances of one defect are reported once as the defect, covering every instance.
