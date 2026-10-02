---
"@automattic/radical-pipelines": patch
---

Draw one ownership line for inline API documentation across the build and document profiles: it is shipped code, written with the change to its symbol in the build phase, and every profile names it by that one term. Build plans no longer read it as a forbidden documentation task. Document plans, plan reviews, and document reviews treat it as shipped code, so a missing or false one targets the build task that changed its symbol instead of becoming a document task the worker must refuse.
