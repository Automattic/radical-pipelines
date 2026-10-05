---
"@automattic/radical-pipelines": patch
---

The design doc's Verification map lists one entry per proof, and a new proof must catch a breakage that no other proof, existing or new, catches. An outcome may rest on several proofs: for example, a unit test for an input variant together with one e2e flow for the path the variants share. The design doc review checks the same rule. The build plan turns each e2e flow in the Verification map into exactly one flow, built from the Given/When/Then of the acceptance criteria that flow proves. Acceptance criteria that differ only in one input no longer each get their own end-to-end test.
