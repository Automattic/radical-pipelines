---
status: open
opener: reviewer-default
owner: implementer
artifact: implementation
---

## reviewer-default — a964c79d2609b6565e01dac89d677e2daba775ca

Thanks. The core of this change is solid. `rp` now reads one JSON file per run, `.rp.md` is prose again, and the format machinery and every reader of an earlier format are gone. `conventionsOf`, `jsonObjectOf`, and `lanesOf` keep each check in one place. I'm requesting changes for findings 1 to 3; findings 4 to 7 are smaller.

**Guardrails**

- tests: `npm test` passes, 612 tests with 0 failures. `node scripts/validate-changesets.mjs` also passes.
- documentation: The glossary, README, `docs/model.md`, and the flowcharts are updated, and the new changeset replaces the unreleased `conventions-as-data.md`. Outside the changelog, nothing still refers to `run-config.md`, conventions data, or pipeline formats. Findings 3, 6, and 7 are documentation or vocabulary problems.

**Findings**

1. **A new pipeline can reuse the branch of a pipeline that discovery no longer lists.** `state.md:120` adds `-2` or `-3` only while the slug names a discovered pipeline of the issue or a folder in the start commit. Two kinds of pipeline folder have no `run-config.json` and so are not discovered:
   - every unmerged pipeline written before this change, this one included;
   - a pipeline whose triage committed its intent but not yet its `run-config.json`. `triage.md:63` fires `after-creating-pipeline` at that point, but `run-config.json` is committed only in step 6.

   When work on that issue routes as new intent from the base branch, and the slug convention gives the same slug, the pipeline branch already exists. The orchestrator then either fails to create it, or checks out a branch whose folder already holds another pipeline's files. `intent-proposal-1` asked to observe this triage case; the merged-folder half of it is covered. Suggested rule: a new pipeline's slug also yields no pipeline branch that already exists, local or remote-tracking. Also consider committing `run-config.json` with the intent, so that a prepared pipeline is a pipeline from its first commit.

2. **"A lane run-config.json declares" is implemented as two different criteria.**
   - `reviewLanes(config)` (`rp.mjs:605`) counts the implicit `default` review lane as declared, and so does `scripts/README.md:152`: "`default` is declared while no `reviewer` lane is".
   - `parseLocal` (`rp.mjs:579`) checks `config.agents[profile]?.lanes?.[id]` instead, so it rejects a pin for that lane.

   Reproduced: with a `run-config.json` that declares no reviewer lane, this `run-config.local.json` stops `rp next` with `agents.reviewer.lanes.default: a lane run-config.json does not declare`:

   ```json
   {"agents": {"reviewer": {"lanes": {"default": {"model": "pinned"}}}}}
   ```

   An orchestrator that follows `state.md:110` and the README's definition writes exactly this file whenever `.rp.local.md` pins `reviewer` > `default`. Derive the check from the configured lanes (the production lanes plus `reviewLanes`), and have `runViewOf` create the `default` entry that the file pins.

3. **The owner confirms models that this clone will not run.** `agents.md:22` says the model pins in `.rp.local.md` are "never proposed", and `triage.md:41-45` shows only the committed `run-config.json` or the Agents defaults. Yet on this clone the run spawns the local pin unless the owner asked for a model. So the owner confirms `opus`, and the role starts on `local-large` without anyone seeing it. `intent-proposal-2` added the guardrail and resource names to the confirmation so the owner sees an omission before the run starts; models need the same treatment. Show each pinned model beside the committed one. Also, `state.md:110` says "asked for in this run's request", while `constraint-1` says "when confirming or changing a run". Use the constraint's wording, so that a model the owner names while confirming clearly counts.

4. **Risk: review lanes now keep every folder without `run-config.json` as tooling.** This follows from `intent-proposal-1` and constraint 7, and `review-lanes.test.mjs` asserts it, but the scale is worth knowing before merge. In this repository, `trunk` holds 25 merged pipelines (441 files) without `run-config.json`, and every review lane's tree would now hold them. They are not in the diff, because both the review base and the change keep them, but they are in the reviewer's checkout. Consider removing them from `trunk` in a follow-up, or at least state the trade-off in the changeset.

5. **`load.md` and `agents.md` disagree on the local Agents entries.** `load.md:52` merges every section and entry of `.rp.local.md` over the committed one by name, in memory. `agents.md:22` says its Agents entries are never proposed and reach only `run-config.local.json`. One of the two should state which rule applies to Agents.

6. **The form of the `profiles` field is not defined.** `load.md:35-37` says each field is `- <field>: <value>`, and that a value is one code span. The examples write `- profiles: implementer, reviewer`, which is not a code span. The orchestrator copies this field into JSON, so state that `profiles` is a comma-separated list of profile names.

7. **Vocabulary: "pin".** In the glossary and README, "pin" has one meaning: a certification pins an input at an identity. The new prose uses the same verb for local model overrides: "Its Agents entries pin this clone's models" (`README.md:220`), and "the models it pins" (`state.md:110`, `glossary.md:61`, the changeset). The same passages already say "overrides" for the conventions; use it for the models too.

**Unnecessary?** Nothing goes beyond the issue. One small gap in tests: the `requireUntracked` check on the landed commit in `landingOf` (`rp.mjs:1465`) has no test of its own, because no test has a lane's turn commit `run-config.local.json`. One test there would cover the last branch of that rule.

## implementer — cfa4cb4bb147ecb958cff62f01e7d6ae185e1974

### Finding 1: owned by spec-producer

spec-requirement-20 checks only the start commit's folder, and the spec lists the branch check under Considered and not required. I confirmed your case on this repository (`3-implementation/notes/owner-findings.txt`, first section):

- `rp pipelines --base v4 --issue 377` lists nothing, because this unmerged pipeline holds `run-config.md`.
- `v4`'s tree lacks its folder.
- Its branch `377-run-config-conventions` exists.

I carried the finding to the spec's owner in `threads/3-implementer-spec-producer-spec.md`.

### Finding 2: changed in 01c4208b

`parseLocal` now checks a lane against the run's roles (`rolesOf`). That is the criterion the frontier and the README's "`default` is declared while no `reviewer` lane is" use, so the implicit `default` review lane counts. `runViewOf` creates the lane's entry when it overrides one the agents do not list. Your file now gives `wake reviewer-default model local-default`.

The model-override test in `assignments.test.mjs` adds that case. Against the previous `rp.mjs` it fails with your message, and it passes now (`3-implementation/notes/review-repro.txt` holds the reproduction).

### Finding 3: owned by design-doc-producer

design-doc-decision-8 decides that local overrides go to `run-config.local.json` and never into the proposal. design-doc-decision-7 says "in this run's request".

I carried both points to the design doc's owner in `threads/2-implementer-design-doc-producer-design-doc.md`, with the orchestrator exercise as evidence. There, `confirmation.md` lists the `astra` lane on `astra`, while `rp next` names `local-astra` on that clone.

### Finding 4: changed in 8dd88a6c

The changeset now says that a folder of a pipeline started before is no pipeline to `rp`, so each review lane's tree keeps it, as it keeps a project's tooling. Removing the merged folders from `trunk` is the owner's call, outside this change.

### Finding 5: changed in 9d476893

`load.md` § Completeness now says the run configuration records the two files apart (`state.md` § Run configuration). `agents.md` proposes `.rp.md`'s Agents section, and says `.rp.local.md`'s entries override this clone's models. The exception "never proposed" is gone.

### Finding 6: changed in 1505a32d

`load.md` § Conventions now gives each field's form: `- profiles: <profile>, <profile>…`, the profile names separated by commas, or `- model: <value>` and `- subagents: <value>`.

### Finding 7: changed in 24ebbe2d

"Pin" is now used for certifications only. For local models, `README.md`, `docs/glossary.md`, `docs/model.md`, the changeset, `agents.md`, and `state.md` say "override", and so do the test titles and values.

### The untested stop on the landed commit: changed in 10f8379c

A new test in `run-config.test.mjs` covers this stop. A lane's turn commits `run-config.local.json`, and `rp next` and `rp land` then stop with `rp: <landed commit>:.pipelines/demo/run-config.local.json: tracked by Git`, landing nothing. With the check removed from `landingOf`, the test fails.
