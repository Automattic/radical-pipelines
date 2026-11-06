status: open
opener: reviewer-default
owner: implementer
artifact: implementation

## reviewer-default — 3e7cf7b4c04444444b20925d89d890366cf8ea05

The scope matches the intent. Commit format, guardrails, resources, agents, and variables are now validated data. `rp assign` computes the turn and writes the whole assignment. Model names travel as written, and the assignment comes out byte-identical whatever the active tool is. The repository's `.rp.md` is migrated from version 6. Profiles still reference no skill file. I ran `rp assign` against a scratch repository built from this repo's `.rp.md`, through every turn up to a review lane. The output reads well. I'd change the points below before merging.

### Guardrails

- **tests**: `npm test` passes: 553 tests, 0 failures. `npm run test:rp` passes too: 437 tests, including the whole `assign` suite.
- **documentation**: mostly followed. Two exceptions are findings 3 and 5 below.

### Findings

1. **A lane's brief is never expanded (intent-constraint-3).** The constraint says "A convention's text may contain variables". A lane's brief is a text of the Agents convention, and for a review lane it is the whole review request. But `brief: laneEntry?.brief ?? ""` (`rp.mjs:1308`) skips `expand`, and `scripts/README.md:295` limits placeholders to guardrail, resource, and commit-format texts. I reproduced it with a `default` reviewer lane whose brief was `Review {branch} for {agent}.`, with `agent` declared as a variable. The assignment printed the brief unchanged. Its Placeholders paragraph says only "a name in braces left in these rules, in what you can use, or in the commit format", which leaves the brief out. When no other text keeps a placeholder, the vocabulary isn't listed at all. In either case `{agent}` can't be substituted, because the vocabulary lists facts, not variables. The general rule is that every convention text an assignment carries is expanded and tracked. Briefs should go through `expand` like the other carried texts, and the README and the Placeholders wording should name them.

2. **On an `INVALID` turn, a reviewer is told to write a fresh review into its existing review thread.** `requestOf` (`rp.mjs:1257`) picks `reviewer-later` only when the thread parses as open and awaits the reviewer. Every other case gets `reviewer-first`, which includes two situations an `INVALID` frontier produces:
   - The review thread is open and awaits the implementer, and the malformed file is the lane's `owner-intent` thread. I reproduced this one. The assignment says "fix them first", then "Write your review … to `threads/1-reviewer-default-implementer-implementation.md`, starting with these lines", with a new header and a new turn commit, aimed at a thread that already has the reviewer's findings.
   - The review thread itself is the malformed file, so `parsed` is undefined. The test at `assign.test.mjs` "lists under Malformed files…" asserts that this thread becomes the review thread in `reviewer-first`.

   Both invite the reviewer to overwrite thread history. On a turn that only repairs files, the request should ask for the repair and leave the review thread as it is. More generally, `reviewer-first` should only apply when the review thread is new.

3. **`{base}` contradicts the canonical vocabulary.** `docs/glossary.md:10` and `state.md` § Terms define **Base** as the merge-base of the tip with run-config's `base`, which is a commit. The vocabulary fact `base` is run-config's `base` itself, a branch name (`scripts/README.md:305`). In one review assignment this produces "against `8bc1a49…`" next to `` `{base}`: main ``. Either value the fact as the defined Base, or name it after what it holds. Either way, the glossary's **Vocabulary** entry should define it.

4. **Criteria live in more than one place (AGENTS.md § Rules for the script).**
   - The lane branch name is built at `rp.mjs:1056` (`${branch}-review-${laneId}`) and again at `rp.mjs:1284`. One `laneBranchOf` function should serve both `review` and `assign`.
   - A lane's latest review thread is chosen by `approvalOf` (`rp.mjs:739`, over parsed threads), by `requestOf` (`rp.mjs:1258`, by a file-name regex), and by `review`'s `own` regex (`rp.mjs:1054`). `requestOf` needs file names because a malformed thread isn't in `state.threads`. That's a reason to define the concept once over file names and derive `approvalOf` from it, not to keep a second definition.

5. **The `assign` tests assert the templates' structure (AGENTS.md: "Do not write structural tests that assert the content of skill or agent files — their sections, wording, or ordering").** Examples are `PROFILE_HEADINGS` (`assign.test.mjs:81`), asserted in order on every producer turn, the Seat field names and order (`:98`, `:498`), and the Materials keys. Renaming or reordering a heading in a template and its profile would break these tests even though `rp` is unchanged. `partOf` already avoids hard-coded wording for the reviewer. The suite also already shows how to run `rp` from a copied skill folder with substituted templates. Two changes would fix this. First, test `fill` and the values `assign` computes against fixture templates, which own their headings. Second, keep one check that each real template fills for each turn kind without leftover `{{`.

6. **Risk: a `.rp.local.md` that wasn't migrated is silently ignored.** A `.rp.local.md` without frontmatter overrides no data, which is tested and documented. So a developer's local Guardrails, Resources, or Commit format written as prose, the only form before version 8, stops reaching assignments without any error. Meanwhile `load.md` still tells the orchestrator to merge "matching project facts" from it. Migration step 4 warns about this once. Consider having `load.md` treat a prose section of `.rp.local.md` that names one of the data conventions as needing migration, rather than as an override.

7. **Observation, accepted by intent-constraint-2 but worth stating in the project's files.** Subagent models no longer pass through the project's tool mapping. In this repository, `.rp.opencode.md` maps `sonnet` to `claude-agent/sonnet#xhigh`. A role now delegates on whatever the model search returns for `sonnet`, so the `#xhigh` variant is lost. `.rp.opencode.md`'s "Model names in `Agents` map to these opencode models" now holds only for the models roles are spawned on. Worth saying so there.

8. **Nit:** `Its later inputs: {{later-inputs}}` and `- Later inputs: {{later-inputs}}` leave a trailing space before the nested list when there are several items. `fill` could trim `before` when it starts a nested list.

## implementer — 54487fd763a80f9ec20da10494d7a219f786eb86

### 1. A lane's brief is never expanded: owned by spec-producer

spec-requirement-10 limits expansion to "guardrail, resource, and commit-format text". The spec's Considered and not required rules out a placeholder in a brief because no intended use produces one. Your finding questions that reading of intent-constraint-3. I carried it to its owner in `threads/2-implementer-spec-producer-spec.md`, and I will answer here with the result.

### 2. On an `INVALID` turn, a reviewer is told to write a fresh review into its existing review thread: owned by design-doc-producer

`requestOf` implements design-doc-decision-9 and design-doc-decision-10 as written. Your finding questions those decisions. I carried it to their owner in `threads/3-implementer-design-doc-producer-design-doc.md`, with evidence for your second case. A reviewer given that request for its own rejected review thread replaced the whole file with a new first review, and its earlier message was lost (`3-implementation/notes/reviewer-run.md`). I will answer here with the result.

### 3. `{base}` contradicts the canonical vocabulary: owned by spec-producer

spec-requirement-10 values the fact as "`run-config.md`'s `base`" and does not take the merge-base reading. I carried the conflict with **Base** to the spec in `threads/2-implementer-spec-producer-spec.md`. The glossary's Vocabulary entry will define the fact once its name and value are settled.

### 4. Criteria live in more than one place: changed in 250e3652

`laneBranchOf` builds a lane's branch for both `review` and `assign`. `laneThreadOf` reads a review lane's threads from their file names. From it:

- `reviewThreadOf` picks the lane's review thread for both `check`'s approval and `assign`'s request;
- `review`'s lane view keeps the threads it names.

### 5. The `assign` tests assert the templates' structure: changed in 0009b0f5

- **Fixture templates.** The tests run `rp` from a copied skill folder beside templates they own. Those templates echo every value `assign` computes, and the tests assert those values. The heading, Seat-field, and Materials-key assertions are gone.
- **The renderer.** Its syntax and its stops are tested on their own fixture templates.
- **The delivered templates.** One test fills each of them for every kind of turn, and asserts only the values each turn carries.
- **The profiles' names.** Whether the templates keep the names the profiles refer to is now an inspection: `3-implementation/notes/profile-names.txt`.

### 6. A `.rp.local.md` that wasn't migrated is silently ignored: stands

The case exists only until a developer moves their local overrides, once, after the migration to version 8. That makes it a migration leftover. AGENTS.md admits a case into the skill "only when it is a durable part of the design — not a one-off (like a migration leftover)".

The migration already covers it in two places:

- `setup.md` § Migration step 4 warns that `.rp.local.md` is not rewritten.
- `changelog.md` § 8 states the move: "In `.rp.local.md`, the same conventions move into its frontmatter, without `conventions`."

The only `.rp.local.md` observed overrides Artifact storage, a prose convention that keeps working (`1-spec/spec/rp-local-md.txt`).

### 7. Subagent models no longer pass through the project's tool mapping; say so in the project's files: changed in 27476405

`.rp.opencode.md` now says the orchestrator spawns roles on the models its table maps. It also says a role finds its subagent model by name through opencode's model search, without those variants. `.rp.claude-code.md` said "use `sonnet` for both" `astra` and `luna`. It now keeps that mapping for `astra`, which a role is spawned on. It says a role whose subagent model is `luna` runs its subagents on its own model.

### 8. A trailing space before a nested list: changed in 77193c04

`fill` ends the line before a nested list without trailing whitespace. A test on a fixture template pins the rendering.

`npm test` passes: 560 tests.
