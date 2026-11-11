---
status: approved
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

## design-doc-producer — 3fcd2c5008c743cd78ff3712925437c223c077db

### Finding 1: changed in 3fcd2c50

Yes. design-doc-decision-5 now has `rp pipelines` read each listed pipeline's intent through the file grammar, the check `rp check` and `rp validate` make of the intent alone. A listed folder whose intent is missing, is not a regular file, or is rejected by that grammar stops the command, naming the intent and the reason, with or without `--issue`. "An intent whose frontmatter cannot be read has no origins" is gone, and is recorded under Alternatives.

- I reproduced the case with the changed `rp` (`2-design-doc/design-doc/probe-respond.txt`): `rp pipelines` lists the pipeline, `--issue 5` lists nothing, and `rp check` reports `INVALID 0-intent/intent.md: frontmatter has no closing --- line`.
- Intended use produces this input. An unquoted issue reference such as `issue: #368` is outside the grammar (`state.md` § Frontmatter), and a run can stop before its `fix` line is acted on.
- The stop uses the file grammar rather than a second, looser "readable frontmatter" criterion. An intent with a key outside the grammar stops discovery too. The existing test "malformed files discovery does not read" keeps its other files, but its intent with `status: x` now stops.
- The trade-off you raised is recorded under Trade-offs and Risks. One malformed intent at any branch tip stops discovery for every issue until its pipeline's branch repairs it, as a missing intent already does.

### Finding 2: changed in 3fcd2c50

(a) Only the field the owner asked for is left out. design-doc-decision-7 now reads: a model or subagent model the owner asks for, for a profile or lane, holds on this clone for the rest of that run. `run-config.json`'s agents record it, and `run-config.local.json` holds no override of that field for that profile or lane. Every other override stays, the other field of the same entry included. With the changed `rp`, a local file that keeps only the subagent override gives the role the committed model and the local subagent model (`probe-respond.txt`, third section). Your example therefore delegates on `local-small`.

(b) The rule follows `0-intent/constraint-1.md`'s "when confirming or changing a run", not "this run's request":
- A model asked for while confirming is left out when the run start records the file.
- A model asked for during the run is recorded in `run-config.json`, as `state.md` already has every configuration change written and committed before acting on it. Its field's override is removed from `run-config.local.json` then, and the file is removed when nothing remains.
- This is not a rewrite from `.rp.local.md`. The next run start records `.rp.local.md` again, so the override returns for the next run.
- A role already running keeps its model until it is spawned again. This is noted under Trade-offs.

design-doc-assumption-1 and the inspection entry in § Verification now carry both moments and the per-field rule. One case stays uncovered, and Risks records it: the owner asks for a profile's model while the local file overrides that field for a lane that would inherit it. No observed `.rp.local.md` produces it, and the confirmation now shows that lane's override.

### Finding 3: changed in 3fcd2c50

Yes. design-doc-decision-8 now has triage step 4's confirmation show, under each profile, each model and subagent model the run gives. Beside each one, it shows the value `.rp.local.md` overrides on this clone, marked as this clone's. `run-config.json` still records only `.rp.md`'s Agents or the owner's choice, and the overrides go to `run-config.local.json` alone. Your exercise is the evidence: `confirmation.md` lists `astra` on `astra` while `rp next` names `local-astra`. Showing only the committed models is recorded under Alternatives.

### Also revised in 3fcd2c50

- design-doc-decision-3 now defines the lanes the local file may name as the lanes the run has: those `run-config.json` declares, and `default` while it declares no `reviewer` lane. This matches your 01c4208b.
- Local models are called "overrides", not "pins", to match `docs/glossary.md`.
- design-doc-decision-8's taken-branch alternative follows the changed spec line. Git refuses a name a local branch takes, and rejects pushing a new branch whose name only a remote branch takes.

## implementer — 6bba36d0e6e8a3f6ffe373d016776d6bb46fcc5e

Each revision of 3fcd2c50 is now in the change:

- Discovery reads each listed pipeline's intent through the file grammar, and stops on one that is missing, not a regular file, or rejected, naming the intent and the reason, with or without `--issue` (efb5f0ed, e574786b, 6bba36d0).
- A model the owner asks for, while confirming or during the run, removes only that field's local override, and every other override stays (30b94889). A test proves that an override of one field keeps the other committed (41588946).
- The run confirmation shows, under each profile and lane, each model with this clone's override beside it (34f67907).
- A local file may override the lanes the run has, and `rp` names any other "a lane the run does not have" (706fc428).
