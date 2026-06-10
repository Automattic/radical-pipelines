# Adopt the prompt → intent rename in the reviews feature

## Goal

PR #106 (the reviews feature) is fully consistent with the phase-0 rename that landed on trunk via PR #109: everything this branch introduces or touches refers to the phase-0 artifact as **intent** (`intent.md`, `0-intent/`, phase "Intent"), so the feature merges cleanly onto trunk with no stale "prompt" terminology.

## Context

- PR #109, merged into trunk on 2026-06-10, renamed the pipeline's phase-0 artifact from "prompt" to "intent" across the skill, agent profiles, README, and website: https://github.com/Automattic/radical-pipelines/pull/109
- This pipeline's branch predates that rename, and the reviews feature it introduces still uses the old naming (for example the new `prompt-format.md` reference and the `0-prompt/prompt.md` paths in the review procedure).
- PR #109 deliberately kept the generic sense of "prompt" (LLM prompts, agent launch/spawn prompts, the `cc-prompt` CSS class); that distinction should be preserved.

## Assumptions / directions to explore

- (Open) Merging trunk into this branch may be the natural way to pick up the rename before adapting the feature's own additions, or the rename may instead be applied directly to this branch's files — research should determine which.

## Origin

Owner review request, verbatim: "In this other PR: https://github.com/Automattic/radical-pipelines/pull/109/. Prompt was renamed to intent. I want to adapt whatever is needed in #106."

Source: https://github.com/Automattic/radical-pipelines/pull/109
