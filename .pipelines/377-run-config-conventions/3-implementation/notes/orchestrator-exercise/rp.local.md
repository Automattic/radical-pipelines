# Local overrides

### Artifact storage

`artifacts-in-repo`: `.rp.md` and the pipelines folder live in this repository. The artifact base branch is `v4`.

### Guardrails

#### tests

- profiles: implementer, reviewer

Run `npm run test:rp` and confirm it passes.

### Agents

#### implementer

- model: `local-opus`

#### reviewer

##### astra

- model: `local-astra`
- subagents: `local-luna`
