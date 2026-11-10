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
