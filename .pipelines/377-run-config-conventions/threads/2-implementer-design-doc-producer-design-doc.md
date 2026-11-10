---
status: open
opener: implementer
owner: design-doc-producer
artifact: design-doc
---

## implementer — cfa4cb4bb147ecb958cff62f01e7d6ae185e1974

The review lanes raised three findings that question design decisions. Evidence paths are relative to the pipeline folder.

### Finding 1: Discovery reads an intent whose frontmatter cannot be read as having no origins

design-doc-decision-5, Decision: "An intent whose frontmatter cannot be read has no origins." reviewer-astra's finding 1 questions it.

Observed (`3-implementation/notes/owner-findings.txt`, second section): a pipeline folder holding `run-config.json`, whose intent's frontmatter has no closing line. `rp pipelines --base main` lists it. `rp pipelines --base main --issue 5` lists nothing. `rp check` reports `INVALID 0-intent/intent.md: frontmatter has no closing --- line`. Triage's scan runs `--issue`, so it finds no pipeline for the issue and routes the work as new intent while the pipeline exists.

- intent-constraint-7: "what it cannot read stops it, naming the file and the reason".
- `AGENTS.md` § Rules for the script: "What cannot be read, or is malformed, is an error that stops the computation — never a fact about the pipeline."
- Before this change, the tolerance served intents of earlier formats, which named their origins in body lines. With `run-config.json` as the mark, the current skill wrote every folder discovery lists.
- Trade-off: discovery reads every local and remote-tracking branch tip, so stopping on one damaged intent stops the scan for every issue.

Question: does `rp pipelines` stop on a listed pipeline whose intent's frontmatter cannot be read, naming the intent and the reason, as it stops on one without a regular intent?

### Finding 2: Leaving out a local model override drops a field the owner did not ask for, and only at a run start

design-doc-decision-7, `run-config.local.json`: "It leaves out the pins of each profile or lane whose model the owner asked for in this run's request." reviewer-astra's finding 2 questions it, and so does the second half of reviewer-default's finding 3.

- (a) The decision drops both `model` and `subagents` of the entry, though the owner may ask for only one. Example: the Agents defaults give the implementer `subagents: shared-small`. `.rp.local.md` overrides `model: local-large` and `subagents: local-small`. The owner asks for model `other-large`. Following the decision, the local file holds neither override, so the assignment's subagent model is `shared-small`, not `local-small`. `0-intent/constraint-1.md` speaks of "a model the owner asks for". `rp` overlays field by field (design-doc-decision-3: "Each model and subagent model replaces the committed one of the same profile or lane"), so leaving out only the field asked for would keep the other override.
- (b) `0-intent/constraint-1.md` says "A model the owner asks for when confirming or changing a run holds for that run on that clone", while the decision says "in this run's request".
  - A model the owner names while confirming is not in the request.
  - A change during a run comes after the run start, the one moment the orchestrator writes `run-config.local.json` (design-doc-decision-7, intent-constraint-6). The decision does not say what happens to the local file then, so this clone keeps running the local override until the next run start.

Question: which model fields does the orchestrator leave out of `run-config.local.json`, and how does a model the owner asks for, while confirming or during the run, reach the roles on this clone?

### Finding 3: The run confirmation shows models this clone does not run

design-doc-decision-8: "`.rp.local.md`'s pins go to `run-config.local.json`, never into the proposal." reviewer-default's finding 3 questions it. The confirmation proposes the committed models or the Agents defaults. On a clone with local overrides, though, the roles run on those overrides unless the owner asks otherwise.

Observed in the orchestrator exercise:
- `3-implementation/notes/orchestrator-exercise/confirmation.md` lists the reviewer lane `astra` on model `astra`.
- `3-implementation/notes/orchestrator-exercise/rp-run.txt` shows that `rp next` names `wake reviewer-astra model local-astra` on that clone.

`0-intent/constraint-1.md` lets the owner overrule a local model when confirming a run. To do that, the owner has to see it.

Question: does the confirmation show each local override beside the committed model?
