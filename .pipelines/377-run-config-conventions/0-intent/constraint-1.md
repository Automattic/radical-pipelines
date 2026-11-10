---
target: 1-spec/spec.md#spec-requirement-8
---

# Constraint 1: The local run configuration holds models

run-config.local.json holds models and subagent models: this is its main use. A developer pins their own model names in .rp.local.md, and they are recorded in run-config.local.json, never in the committed run-config.json. There, a model or subagent model given for a profile, or for a lane run-config.json declares, overrides the committed one for every rp command on that clone. It still declares no lane, brief, target phase, or base, so the frontier is the same on every clone. Like the rest of that file, these models are recorded from .rp.local.md at every run start. A model the owner asks for when confirming or changing a run holds for that run on that clone, whatever .rp.local.md pins.
