---
"@automattic/radical-pipelines": patch
---

Hold every new test and proof to proving something no other test or proof proves, whether that other proof already exists or is new in the same change. The design doc's Verification map lists one entry per proof and states what each proof proves. An outcome can rest on several proofs, such as a unit test for an input variant and one e2e flow for the path the variants share. The build plan turns each e2e flow in the map into exactly one flow, so acceptance criteria that differ only in one input no longer get one flow each by default.
