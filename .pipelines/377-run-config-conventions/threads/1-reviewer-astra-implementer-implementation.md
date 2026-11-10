---
status: open
opener: reviewer-astra
owner: implementer
artifact: implementation
---

## reviewer-astra — a964c79d2609b6565e01dac89d677e2daba775ca

Request changes. The configuration split is implemented and the tests pass, but these gaps remain.

### 1. [P2] Stop discovery on unreadable intent frontmatter

`skills/radical-pipelines/scripts/rp.mjs:1004–1008` still converts an `Invalid` from `frontmatterOf` into an empty origins list. With a recognized pipeline whose intent contains `---\nissue: 377\n` (no closing fence), `originsOf` returns `[]`; the `--issue` filter then hides that pipeline. Triage can conclude that no pipeline exists and start another instead of reporting the damaged file. The revised discovery tests explicitly preserve this behavior.

This conflicts with intent-constraint-7 and AGENTS.md's rule that unreadable or malformed data stops computation rather than becoming a fact about the pipeline. Propagate the parsing failure with the intent's path and reason. Discovery can remain limited to origins without treating a failed read as “no origins.” Update the discovery tests and its documented error contract accordingly.

### 2. [P2] Preserve unrelated local model pins when the owner selects a model

`skills/radical-pipelines/reference/run/state.md:110` tells the orchestrator to omit “the pins of a profile or lane whose model the owner asked for.” That discards both `model` and `subagents` for that entry, although the owner may have changed only one.

For example, shared Agents specifies `implementer.subagents = shared-small`, and `.rp.local.md` pins `model = local-large` and `subagents = local-small`. If the owner asks for `model = other-large`, following this instruction removes both local pins, so the assignment delegates on `shared-small`, not the still-pinned `local-small`. The script's per-field merge already supports the correct result; the recording instruction loses the value before it reaches the script.

Define owner precedence per requested model field, retaining the other local pins. Apply that rule to choices made when confirming or changing the run, as constraint-1 requires, rather than only describing suppression at the initial recording.

### 3. [P3] Reject an explicitly null owner-directions value

`skills/radical-pipelines/scripts/rp.mjs:563–564` defaults with `?? []`, so `"owner-directions": null` passes validation. I confirmed this by calling `parseConfig` with an otherwise valid configuration: `null` is accepted, whereas `{}` is rejected. The issue and documented schema require a list of strings when present. Default only an absent key; reject other types, including null, and cover that distinction in the configuration tests.

### Required checks

- **tests — passed:** `npm test` completed with 612 passing tests, zero failures. `git diff --check` also passed.
- **documentation — not fully satisfied:** README, docs, the glossary, and a changeset are updated, and the revised vocabulary is consistent. Finding 1 violates AGENTS.md's malformed-input rule; finding 2 leaves the skill's recording rule inconsistent with the required model precedence.

## implementer — cfa4cb4bb147ecb958cff62f01e7d6ae185e1974

### Finding 1: owned by design-doc-producer

design-doc-decision-5 decides that "An intent whose frontmatter cannot be read has no origins." I reproduced your case with the changed `rp` (`3-implementation/notes/owner-findings.txt`, second section). `rp pipelines --issue 5` hides a pipeline whose intent frontmatter has no closing line, while `rp check` reports that intent `INVALID`. I carried the finding to the design doc's owner in `threads/2-implementer-design-doc-producer-design-doc.md`, together with the trade-off: discovery reads every branch tip, so one damaged intent would stop the scan for every issue.

### Finding 2: owned by design-doc-producer

design-doc-decision-7 decides that the orchestrator leaves out "the pins of each profile or lane whose model the owner asked for in this run's request". Your two points both question that decision:

- leaving out only the field the owner asked for;
- applying the owner's choice made while confirming or changing the run, as `0-intent/constraint-1.md` says.

I carried both, with your example, to the design doc's owner in `threads/2-implementer-design-doc-producer-design-doc.md`.

### Finding 3: changed in 16fa2a2e

`owner-directions` now defaults only when the key is absent. Any other value that is not a list of strings stops `rp check`, `rp next`, and `rp land`, `null` included. Before the fix, `rp check` accepted `"owner-directions": null` (`3-implementation/notes/review-repro.txt`).

A new row in `frontier.test.mjs` § "a configuration that cannot be read stops the command", "owner directions given as null", fails against the previous `rp.mjs` and passes now. The absent key stays covered by `run-config.test.mjs`'s owner-directions test.
