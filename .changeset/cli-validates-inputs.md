---
"@automattic/radical-pipelines": patch
---

`rp` validates its inputs and fails aloud: `--target-phase` is an integer from 1 to 4, `--audit` and `--valve` positive integers, every option that takes a value gets one, and an unknown option is an error — a malformed threshold no longer disables the gate silently.
