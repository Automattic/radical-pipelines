## Seat

- Worktree: <home>/Code/radical-pipelines/.worktrees/369-conventions-as-data-spec-demands
- Branch: 369-conventions-as-data-spec-demands
- Turn commit: 40939f94bac67942ff3b20ac3d4d3022158716b1
- Supporting folder: <home>/Code/radical-pipelines/.worktrees/369-conventions-as-data-spec-demands/.pipelines/369-conventions-as-data/1-spec/lanes/demands/spec/
- Subagent model: claude-agent/sonnet#xhigh

## Mode

Produce

## Brief

Read the intent for what it demands: every outcome it asks for, and each input intended use produces that an outcome must handle.

## Materials

- Intent: <home>/Code/radical-pipelines/.worktrees/369-conventions-as-data-spec-demands/.pipelines/369-conventions-as-data/0-intent/intent.md

## Threads addressed to you

none

## Write to

<home>/Code/radical-pipelines/.worktrees/369-conventions-as-data-spec-demands/.pipelines/369-conventions-as-data/1-spec/lanes/demands/spec.md

## Guardrails

none

## Resources

### test suite and scripts

- resource: The repository's test suite and scripts. `npm test` runs the unit tests; `npm run test:rp`, `npm run test:opencode-unit`, and `npm run test:release` run parts of them, and `npm run test:opencode` runs the opencode integration suite. `node skills/radical-pipelines/scripts/rp.mjs` runs `rp`, and every script under `scripts/` may be run directly.

## Commit format

Use imperative mood, sentence case, no period at the end. End with the profile name in parentheses, or `(assisted)` for a commit a person made with an agent outside a pipeline.

Examples:

- `Add intent (orchestrator)`
- `Add spec (spec-producer)`
- `Support for X (implementer)`
- `Open review thread (reviewer)`
- `Fix bug Y (assisted)`
