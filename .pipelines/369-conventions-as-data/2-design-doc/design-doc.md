---
{
  "inputs": [
    "1-spec/spec.md@ec82362ba8e6"
  ]
}
---
# Design Doc: Project conventions as data, and `rp` writes each role's assignment

## Overview

Today the orchestrator fills every assignment by hand. It fills the profile's template from `templates/`, copies the guardrail and resource blocks whose `agents` include the profile, copies the commit format, resolves the subagent model for its tool, computes the paths, and copies `rp check`'s threads, changed inputs, and `INVALID` lines. `rp` never reads the conventions.

After the change, every convention an assignment carries is a named entry in the JSON frontmatter of `.rp.md`, the object that already holds `conventions`: the commit format, guardrails, resources, agents, and declared variables. The run configuration records the run's agents in the same schema. A new command, `rp assign <pipeline folder> --role <role>`, does four things:

- It computes the frontier the way `rp check` does and takes the turn the frontier gives the role.
- It seats the role and fills the role's template with the pipeline facts, the run's model names as written, and the conventions from the main checkout's `.rp.md` and `.rp.local.md`.
- It expands placeholders in the texts it carries.
- It writes the assignment where the role reads it, then prints that path and the role's model name.

The orchestrator runs `rp assign` before every spawn and wake, then sends the one-line message. It copies nothing into the assignment. The orchestrator resolves a model name with its tool when it spawns a role, and a role resolves its subagent model name with its tool. Setup writes and migrates the data. The conventions version and the pipeline format become 8.

## Architecture

```
orchestrator ── rp check ──▶ frontier
     │  for each role the frontier wakes (reviewer: rp review, then its worktree)
     ├── rp assign <pipeline folder> --role <role>
     │      reads: pipeline worktree (run-config.md, pipeline files, certifications)
     │             role's worktree (HEAD, branch, git directory)
     │             main checkout's .rp.md and .rp.local.md (frontmatter only)
     │             the skill's templates/
     │      writes: <role's worktree git directory>/rp/<profile>.md (+ a later-turn reviewer's diff)
     │      prints: assignment <path>, model <name>
     └── spawn or wake on <name> resolved by tools/<tool>.md ── "Read your assignment: <path>."
                                         role ── reads its assignment, resolves its Subagent model name with its tool
```

New:

- `rp assign`, a command of `rp.mjs`. Its responsibilities:
  - Conventions: finds the repository's main checkout, reads the frontmatter of `.rp.md` and `.rp.local.md`, validates all of it, and merges the local entries by name.
  - Turn: computes the same state and frontier `rp check` reports, and maps the frontier action that wakes the role to its turn. The turn is the mode or the reviewer's request, the materials, threads, changed inputs, lane candidates, and Malformed files.
  - Seat: finds the role's worktree, branch, turn commit, Write to, and Supporting folder. For a reviewer it also finds the review base and the change.
  - Expansion: fills placeholders in the carried texts from the vocabulary and the declared variables.
  - Writing: fills the template, writes the assignment and, on a reviewer's later turn, its diff, then prints the path and the model.

Modified:

- `rp.mjs`. The pipeline format it reads becomes 8. `run-config.md` replaces `lanes` with `agents` (design-doc-decision-2), and production lanes and review lanes are derived from `agents`.
- `templates/*.md` and `templates/README.md`. The templates become machine-fillable: they mark their slots, optional parts, and mode lines. They gain the vocabulary listing, and the reviewer's requests gain the subagent-model rule. A reviewer's repair request joins them (design-doc-decision-10). The README defines the template syntax for `rp` instead of instructing the orchestrator.
- The skill prose:
  - `reference/run/loop.md`: Waking a role, Review lanes, and the `INVALID` row.
  - `reference/run/state.md`: the new command, Run configuration, Assignment, Prepared files, and the commit at which landing stamps an approval (§ Certification).
  - `reference/entries/triage.md`: steps 4 and 6 write the run's `agents`.
  - `reference/conventions/load.md`, `setup.md`, `changelog.md` (new § 8), `agents.md`, `guardrails.md`, and `resources.md`.
  - `tools/claude-code.md` and `tools/opencode.md` § Models.
  - `scripts/README.md`: the `assign` grammar and the data schema.
- `agents/spec-producer.md`, `design-doc-producer.md`, and `implementer.md`: the Subagent model rule (design-doc-decision-8), and who writes the assignment.
- `.rp.md`: migrated to version 8.
- `README.md`, `docs/glossary.md`, `docs/model.md` ("`rp` never reads the conventions"), and `docs/flowcharts/`.
- A changeset.
- `scripts/test/rp/`.

Untouched but relevant:

- `rp check`, `stamp`, `pipelines`, and `review` keep their behavior and output. They do not read the conventions (spec-exclusion-4).
- The Issues, Pipeline slug, Pipeline branch format, Pipelines folder root, Artifact storage, Worktree folder root, PR format, Lifecycle hooks, and Health monitoring sections and the tool sections stay prose. The orchestrator reads them as today (intent-constraint-1, spec-exclusion-2).
- `.rp.opencode.md` and `.rp.claude-code.md` stay prose. The orchestrator uses them to resolve the model it spawns a role on.
- The opencode plugin still materializes the profiles verbatim.

## Decisions

design-doc-decision-1: The conventions data is `.rp.md`'s JSON frontmatter

**Serves:** spec-requirement-3, spec-requirement-13, spec-requirement-20, spec-acceptance-criterion-18, spec-acceptance-criterion-25

**Decision:** `.rp.md`'s frontmatter is the JSON object that holds `conventions` today. It also holds every convention an assignment carries, as named entries (schema under Interfaces):

- `commit-format`.
- `guardrails` and `resources`, keyed by name.
- `agents`, keyed by profile.
- `variables`, keyed by name.

Every prose value is a **text**: a JSON string, or a list of strings that are its lines. The prose values are a guardrail's rule, a resource's description, the commit format, and a brief. A list of strings lets multi-line prose read line by line.

The body keeps every convention that is not data as prose. The Commit format, Guardrails, Resources, and Agents prose sections leave the body. `rp` reads the frontmatter with Node's built-in JSON parser and never reads the body.

**Alternatives:**

- A JSON file beside `.rp.md` (intent-proposal-1's other option) loses because the spec puts the data in `.rp.md`, and two files would split one project's conventions.
- Fenced data blocks under the body's headings lose because the version stays in the frontmatter, so the data would sit in two places of one file, and `rp` would have to scan Markdown.
- A stricter grammar of data under Markdown headings is the approach intent-context-2 reverted.
- A YAML frontmatter with nested maps and block scalars reads best as prose. It loses because `rp`'s YAML reader accepts only flat single-line values, and a nested YAML parser is a large addition to a zero-dependency script for one file.
- A text as a single JSON string only: this repository's commit format is nine lines, and as one string it reads as one line full of `\n`, against intent-constraint-4.

**Trade-offs:** A person reads quotes and commas around the prose, and multi-line prose as a list of lines. In exchange the data needs Node alone, is validated exactly, and has one location. An object keyed by name cannot hold two entries with one name (Risks).

**Claims:**

- observed: reading `.rp.md`, whose frontmatter is a JSON object holding only `"conventions": 6`, and `load.md` § Schema stamp, which reads the version there.
- observed: reading `rp.mjs`, which already parses a JSON frontmatter for `run-config.md` (lines 263–271) and imports only `node:` modules (lines 5–10).
- observed: running `JSON.parse` on Node 24.22.2, which keeps the last of two equal keys and reports a parse failure as an excerpt without a line number (`2-design-doc/design-doc/observations.txt`).
- observed: running `grep` over `.rp.md`, `.rp.opencode.md`, and `.rp.claude-code.md`, which finds no brace outside the frontmatter (`2-design-doc/design-doc/observations.txt`).

design-doc-decision-2: The run records its agents in the conventions' schema, and the pipeline format becomes 8

**Serves:** spec-requirement-6, spec-requirement-7, spec-requirement-14, spec-acceptance-criterion-8, spec-acceptance-criterion-10, spec-acceptance-criterion-11

**Decision:**

- **Shape.** `run-config.md`'s JSON frontmatter replaces `lanes` with `agents`, which has exactly the schema of `.rp.md`'s `agents`. One set of validation rules covers both files. `agents` holds the models, subagent models, lanes, and briefs the owner confirmed.
- **Triage.** Triage proposes `.rp.md`'s `agents`, after `.rp.local.md`'s overrides, and writes what the owner confirms.
- **Body.** The body keeps only prose, such as the target in words and the owner's directions. `rp` reads no model from it.
- **Lanes.** `rp check`, `stamp`, and `review` derive the production lanes and review lanes from `agents`, as they derive them from `lanes` today. A profile's `lanes` are its lanes, and `reviewer` without lanes has one lane, `default`.
- **Models.** A role's model is its lane's `model`, else its profile's. Its subagent model is its lane's `subagents`, else its profile's. Either may be none.
- **Format.** The conventions version and the pipeline format are one number, 8. `rp` stops on a `run-config.md` of another format as it does today, so format-7 pipelines become history.

**Alternatives:**

- Keep the `lanes` list, add `model` and `subagents` to each lane, and add a per-profile models map. This changes `rp check` and its tests less, and keeps the duplicate-lane check. It loses because the run configuration and the Agents convention would be two shapes of one set of facts, and triage would convert one into the other by hand.
- `rp assign` reading models from `.rp.md`'s Agents loses because the owner sets a run's models when confirming it (spec-requirement-6).
- The run configuration storing each role's models already inherited loses because the inheritance would move into triage's hand copy, and the schema would differ from the convention's.
- Keeping format 7 loses because two run-configuration schemas would share one format number.

**Trade-offs:** Every `rp` test that writes a `run-config.md` changes with the schema. Lane ids as object keys lose the duplicate-lane check (Risks).

**Claims:**

- observed: reading `rp.mjs`. `parseConfig`, the production- and review-lane derivations, and the thread and candidate lane checks are the only readers of `lanes` (lines 448–476, 584, 592). `check`, `stamp`, and `review` stop on another format (lines 441–445).
- observed: reading this pipeline's `run-config.md` and `state.md` § Run configuration. The body holds each profile's and lane's models, already resolved for the tool, and `rp` ignores the body.
- observed: the spec's `1-spec/spec/run-config-formats.txt` shows that no pipeline of format 7 exists.

design-doc-decision-3: `rp assign` writes a role's whole assignment and prints its path and model

**Serves:** spec-requirement-1, spec-requirement-2, spec-requirement-7, spec-requirement-17, spec-requirement-20, spec-acceptance-criterion-2, spec-acceptance-criterion-3, spec-acceptance-criterion-4, spec-acceptance-criterion-21

**Decision:** A fifth command, `rp assign <pipeline folder> --role <role>` (Interfaces). It takes the pipeline folder in the pipeline worktree and a role `<profile>[-<lane>]`, and does the following:

- **Frontier.** It computes, from the pipeline worktree, exactly the state and frontier `rp check` reports. When no frontier action wakes the role, it stops.
- **Turn.** It maps the action that wakes the role to the role's turn:

  | Frontier action | Turn |
  | --- | --- |
  | `produce` | Produce; Implement for the implementer |
  | `respond` | Respond |
  | `consolidate` | Consolidate |
  | `lane` | Produce when the candidate is missing, else Respond |
  | `review` | design-doc-decision-9 |
  | `INVALID` | design-doc-decision-10 |

- **Seat.** A role without a lane sits in the pipeline worktree. A production lane sits in the worktree that has `<pipeline branch>-<artifact>-<lane>` checked out, and a review lane in the one that has `<pipeline branch>-review-<lane>`. The pipeline branch is the branch the pipeline worktree has checked out. When that worktree is missing, or the pipeline worktree has no branch checked out, it stops.
- **Slots.** It fills each slot with the value spec-requirement-2 gives it:
  - Turn commit: the `HEAD` of the role's worktree.
  - Materials, Write to, and Supporting folder: absolute paths in the role's worktree. Lane candidates are paths in the pipeline worktree, where consolidation runs.
  - Changed inputs: each with the last commit in the role's worktree's history that changed the role's artifact.
  - Base branch: `run-config.md`'s `base`.
  - Brief: the lane's brief, as written, its placeholders expanded (design-doc-decision-7).
- **Write.** It validates everything it reads before it writes anything. It then writes the assignment at `git rev-parse --git-path rp/<profile>.md` in the role's worktree, replacing the previous turn's.
- **Output.** It prints the assignment's absolute path and the role's model name as the run writes it. It prints no model when the run gives the role none.

`rp check`, `stamp`, `pipelines`, and `review` neither read the conventions nor change their output.

**Alternatives:**

- `rp check` writing every woken role's assignment loses because `check` describes state and writes nothing, and a lane's worktree may not exist yet when `check` runs.
- The orchestrator passing the worktree, branch, review base, and change as arguments loses because it copies slot values by hand (spec-requirement-17).
- `rp review` writing the reviewer's assignment loses because the lane may have no worktree when `review` runs (`loop.md` § Review lanes step 1), and building branches is `review`'s only job.
- The orchestrator reading the model from `run-config.md` instead of `rp` printing it loses because the lane-else-profile rule would then live both in the skill's prose and in `rp`.

**Trade-offs:** `rp` gains a command. `rp assign` repeats the computation `rp check` just made, once per woken role, including the merge check at target phase 4.

**Claims:**

- observed: reading `rp.mjs` lines 979–1010. `rp review` finds the pipeline branch checked out where the pipeline folder is, and finds a lane's worktree with `git worktree list --porcelain`. `state.md` § Names gives a production lane's branch as `<pipeline branch>-<artifact>-<lane>`.
- observed: running `git rev-parse --path-format=absolute --git-path rp/design-doc-producer.md` in this worktree resolves inside the worktree's git directory (`2-design-doc/design-doc/observations.txt`).
- observed: reading `agents/*.md` § Role. Each profile reads its assignment at that path and refers to its sections by name.

design-doc-decision-4: The templates stay the wording of every assignment, and `rp` fills them

**Serves:** spec-requirement-1, spec-requirement-2, spec-requirement-11, spec-requirement-18

**Decision:** `templates/` keeps one file per assignment: the three profile templates, and the reviewer's first-turn, later-turn, and repair requests. These files are the only source of an assignment's headings, field names, and request prose. `rp` reads them at run time from the skill folder beside its script.

- **Syntax.** Each template marks its slots, its optional parts, and its mode-specific material lines in a syntax `rp` parses. The syntax is the implementer's, defined in one place. Two rules bind it:
  - A value `rp` inserts is never read again as template syntax, so a convention text that contains the syntax reaches the role as written.
  - A slot left unfilled stops `rp` before it writes anything.
- **Vocabulary listing.** The profile templates gain an optional section, and the reviewer's requests an optional sentence. Either lists the vocabulary (design-doc-decision-7) and tells the role to replace the placeholders left in its carried texts from that list.
- **Empty values.** A list with nothing reads `none` where the assignment reads `none` today: Threads addressed to you, Guardrails, Resources, and the material lines of the mode. An optional part with nothing is dropped. The optional parts are the Brief, Malformed files, the vocabulary listing, and the reviewer's sentences for later inputs, guardrails, and resources.

**Alternatives:**

- Building the assignment in `rp.mjs` code and deleting `templates/` loses because the reviewer's request would become JavaScript strings, and `docs/model.md` § Review ties that wording to measured review outcomes.
- Generating the profile sections in code while filling the reviewer's requests from files loses because it gives one concept two mechanisms.
- Putting the vocabulary rule in each profile loses because the reviewer's profile holds only what must survive without its assignment (`docs/model.md` § Review), so the reviewer's request would need it anyway. In each template it sits beside the listing it explains.

**Trade-offs:** `rp` parses a small template syntax, and an edit that breaks a template stops `rp assign`.

**Claims:**

- observed: reading `templates/*.md` and `templates/README.md` for the slots and the rules for each.
- observed: `loop.md` § Waking a role already depends on `templates/` being installed in the skill's folder, and `opencode/skills.mjs` reads the packaged `skills/` folder in place.
- observed: this turn's assignment reads `Later inputs: none` for an empty material line.

design-doc-decision-5: Which conventions an assignment carries, read from the main checkout

**Serves:** spec-requirement-4, spec-requirement-19, spec-acceptance-criterion-1, spec-acceptance-criterion-6, spec-acceptance-criterion-7, spec-acceptance-criterion-23

**Decision:** `rp assign` reads `.rp.md`, and `.rp.local.md` when it exists, from the repository's main checkout, whatever worktree the role sits in.

- **Local overrides.** `.rp.local.md`'s frontmatter, when it has one, holds the same data keys as `.rp.md` except `conventions`, every one optional. Each entry it names replaces the committed entry or adds a new one: a guardrail, a resource, or a variable by name, a profile's agents entry by profile, and the commit format. Every other entry keeps its committed value. A `.rp.local.md` without frontmatter overrides no data, so its prose overrides stay the orchestrator's.
- **What the assignment carries:**
  - Every guardrail and every resource whose `profiles` include the role's profile, each under its name with its text expanded (design-doc-decision-7). The set is the same in every lane of the profile. With no such entry, the section reads `none`.
  - The commit-format text, or an imperative subject line when the project sets none.
  - The lane's brief from the run configuration, as written, its placeholders expanded (design-doc-decision-7).

**Alternatives:**

- Reading the `.rp.md` of the role's own worktree loses because the loader reads the main checkout's (`load.md` § Sources), and a pipeline branch may carry a `.rp.md` the orchestrator never loaded, as this change's branch does.
- Merging field by field inside an entry loses because the spec overrides entries by name. A field merge would let a local file change a guardrail's profiles without its text, a case no source shows.

**Trade-offs:** The source is the main checkout's working tree, not a commit, so an uncommitted edit there reaches the next assignment. This is the same file the loader reads.

**Claims:**

- observed: running `git worktree list --porcelain` from a linked worktree. The main checkout is its first record, on branch `v4`, and its `.rp.md` is at version 6 while this worktree's differs (`2-design-doc/design-doc/observations.txt`).
- observed: the spec's `1-spec/spec/rp-local-md.txt` shows that only the main checkout holds a `.rp.local.md`, which overrides Artifact storage in prose.

design-doc-decision-6: `rp assign` validates all the conventions data before it writes

**Serves:** spec-requirement-12, spec-acceptance-criterion-17

**Decision:** Every run of `rp assign` validates the whole data of `.rp.md` and `.rp.local.md` before it computes or writes anything. That is every entry, whichever roles it concerns.

- **Parse failure.** Data that does not parse stops it, naming the file and where parsing failed.
- **Malformed data.** Each of these stops it, naming the file, the entry, and what is malformed:
  - `.rp.md` is missing, or its `conventions` is not the current version.
  - A key is unknown, at any level.
  - An entry has no text.
  - A `profiles` list is empty or names anything but the four profiles.
  - A model, subagent model, or brief is not a non-empty string or text.
  - `implementer` has `lanes`, or a `lanes` object is empty.
  - A lane id does not match `[a-z0-9][a-z0-9-]*`.
  - A variable breaks a rule of design-doc-decision-7.
- **How it stops.** It prints `rp: <reason>` to stderr, exits 1, and writes no assignment, so the previous turn's file stays.

The run configuration's `agents` is checked by the same rules, and stops the command as an invalid `run-config.md` does today.

**Alternatives:**

- Validating only the entries the role's assignment uses loses because a malformed entry for another profile would surface only when that profile is woken, in the middle of the run.
- Accepting unknown keys loses because a misspelled key, such as `profile` for `profiles`, would silently carry nothing.
- Skipping the version check loses because a version-6 `.rp.md` parses as valid data with no entries, and every assignment would carry Guardrails `none` and the default commit format with no error.

**Trade-offs:** A project cannot add keys of its own to the frontmatter.

**Claims:**

- observed: reading `scripts/README.md` § Decisions ("Strict keys") and `rp.mjs`. `rp` stops the same way on its other inputs and rejects unknown keys.
- observed: reading the main checkout's `.rp.md`. A version-6 frontmatter is a valid JSON object holding only `conventions` (`2-design-doc/design-doc/observations.txt`).

design-doc-decision-7: Placeholders, the vocabulary, and declared variables

**Serves:** spec-requirement-10, spec-requirement-11, spec-requirement-15, spec-acceptance-criterion-14, spec-acceptance-criterion-15, spec-acceptance-criterion-16

**Decision:**

- **Where.** Placeholders exist only in the convention texts an assignment carries: each guardrail's and resource's text, the commit format, and the lane's brief.
- **Grammar.** A placeholder is `{<name>}`, where `<name>` matches `[a-z][a-z0-9-]*`. Any other brace is plain text.
- **Vocabulary.** The vocabulary is a fixed set of facts, each valued for the role and its turn (Interfaces): `pipeline-slug`, `role`, `profile`, `lane`, `worktree`, `branch`, and `base`. `base` is the skill's **Base**: the merge-base of the role's turn commit with the branch `run-config.md`'s `base` names. A branch that does not resolve, or has no merge-base with the turn commit, stops `rp assign`, as it stops `rp check` and `rp review`.
- **Declared variables.** `.rp.md`'s `variables` maps a name to a template: a string whose placeholders name vocabulary facts only. A variable named like a vocabulary fact, or whose template names anything else, is malformed (design-doc-decision-6).
- **Expansion.** Expansion is a single pass. Each placeholder that names a vocabulary fact or a variable becomes its value, and the result is not scanned again.
- **Unknown placeholders.** A placeholder that names neither stays as written. The assignment then lists every vocabulary fact with its value (design-doc-decision-4), and lists them only then.

**Alternatives:**

- Names with spaces, as the skill writes `<pipeline slug>`, lose because the looser grammar would read more braces in code or JSON inside a resource text as placeholders.
- Variables whose templates use other variables or conditionals lose because no intended use produces them (spec, Considered and not required). `role` already carries the optional lane.
- Expanding model names loses because spec-requirement-5 has them reach the assignment exactly as written.
- `base` as the branch name loses because the skill's canonical vocabulary defines the Base as the merge-base (`state.md` § Terms), and the implementer's Base branch slot already names the branch.

**Trade-offs:** A text that writes `{Agent}` or `{agent_name}` is neither expanded nor followed by the listing, and reaches the role as written.

**Claims:**

- observed: reading the intent. intent-context-3's `{agent}` is defined as `<pipeline slug>-<profile>[-<lane>]`, which is the template `{pipeline-slug}-{role}`.
- observed: a reviewer spawned on opencode, whose guardrail wrote `config/{ticket}.json`, reported `config/42.json`, taken from the listed vocabulary (`3-implementation/notes/reviewer-run.md`).
- observed: reading `state.md` § Terms, which defines **Base** as the merge-base of the inspected tip with `run-config.md`'s `base`. A review lane's change sits on the review base, whose parent is that merge-base (`scripts/README.md` § `review`).

design-doc-decision-8: Model names travel as written, and the orchestrator and each role resolve them

**Serves:** spec-requirement-5, spec-requirement-7, spec-requirement-8, spec-requirement-9, spec-requirement-18, spec-acceptance-criterion-9, spec-acceptance-criterion-11, spec-acceptance-criterion-12, spec-acceptance-criterion-13

**Decision:**

- **`rp`.** `rp assign` takes no tool as input and reads no tool section, neither `## <Tool>` in `.rp.md`'s body nor `.rp.<tool>.md`. The Subagent model and the printed model are the run's names as written. When the run gives the role no subagent model, the assignment's Subagent model tells the role to use its own model.
- **Orchestrator.** The orchestrator spawns and wakes a role on the model `rp assign` printed, resolved as `tools/<tool>.md` § Models states: through the project's tool section when it maps the name, else through the tool's own lookup. When no model is printed, it uses its own model. `tools/<tool>.md` § Models drop "Fill the **Subagent model** …" and describe resolving a name.
- **Roles.** The producers' and the implementer's profiles, and the reviewer's requests, tell a role to run its subagents on the model its tool finds by the Subagent model name. When the assignment names none, or the tool finds none, the subagents run on the role's own model.

**Alternatives:**

- `rp` resolving names through the tool sections loses because of intent-constraint-2.
- A role stopping with a blocker when its tool finds no model loses because the spec considered it and did not take it: `.rp.claude-code.md` keeps lane `astra` delegating under Claude Code.
- The orchestrator always using its tool's lookup, ignoring the tool section, loses the variants the project's tool section pins, such as `claude-agent/opus#xhigh`, and no requirement asks for it.

**Trade-offs:** A role's subagents run on the variant the tool's lookup gives a bare name, which may differ from the variant the tool section mapped them to before (Risks).

**Claims:**

- observed: the spec's `1-spec/spec/assignment-today.md` shows that today the Subagent model arrives resolved for the tool, as `claude-agent/sonnet#xhigh`. `tools/claude-code.md` and `tools/opencode.md` § Models define those forms.
- observed: this session's opencode subagent tool takes `provider/model[#variant]` and directs looking a name up with the models tool, the caller's own provider first (also the spec's `1-spec/spec/opencode-models-lookup.json`).
- observed: from a `claude-agent` session on opencode, the models lookup finds `claude-agent/sonnet` by `sonnet` in the caller's own provider. Subagents, and a reviewer spawned from the printed `sonnet`, ran on it (`3-implementation/notes/opencode-models-lookup.json`, `setup-migration.md`, `reviewer-run.md`).
- assumed: a role delegating with `sonnet` on Claude Code runs Sonnet (spec-assumption-1).

design-doc-decision-9: A reviewer's request: first or later turn, review base, change, and diff

**Serves:** spec-requirement-2, spec-acceptance-criterion-5

**Decision:**

- **Order.** For any frontier action, the orchestrator wakes a reviewer only after running `rp review` for the lane and giving the lane its worktree.
- **Branch and base.** `rp assign --role reviewer-<lane>` stops unless the HEAD of the lane worktree is the change `rp review` built, whose parent is the review base. The request's branch is the lane branch, its base is the review base, and its turn commit is the change.
- **Request.** On a frontier other than `INVALID`, the request is the later-turn one, naming the lane's open review thread, when the lane has one. Otherwise it is the first-turn one, naming a new thread whose number is one more than the highest in the pipeline's `threads/` (`state.md` § Threads). On such a frontier, a woken reviewer's open review thread always awaits it: a thread awaiting the implementer gives phase 3 work, which the frontier reaches before review. An `INVALID` frontier gives the repair request (design-doc-decision-10).
- **Paths.** The intent and every later input are paths in the lane worktree.
- **Diff.** On a later turn, `rp assign` also writes, beside the assignment, the diff from the commit the reviewer's last message names to the change, outside the pipelines folder root. The request names that file.

**Alternatives:**

- The orchestrator saving the diff at a path `rp` names loses because the path would have to agree in two places, and step 2 of `loop.md` § Review lanes would stay mechanical work for the orchestrator.
- Taking the review base and the change as arguments loses because of spec-requirement-17.

**Trade-offs:** `rp assign` writes one prepared file beside the assignment, the only one it writes.

**Claims:**

- observed: reading `rp.mjs`'s `cmdReview`. `rp review` resets the lane worktree, or moves the lane branch, to the change: a commit whose message is `rp review change` and whose parent is the review base, `rp review base`. It proceeds once the lane's commits have landed by cherry-pick, because `git cherry` marks them as already on the pipeline branch.
- observed: reading `scripts/README.md` § `review`. The lane's tree holds the pipeline's `0-intent/` and the lane's own threads at their paths in the pipeline.
- observed: reading `rp.mjs`'s `phaseActions` and `frontier`. A thread awaiting a phase's owner gives that phase a `respond` action whatever the target, and the frontier takes the lowest phase with work, so `review` actions appear only when no thread awaits the implementer.

design-doc-decision-10: Malformed files, and the repair turn an `INVALID` frontier gives

**Serves:** spec-requirement-2, spec-acceptance-criterion-3, spec-acceptance-criterion-24

**Decision:**

- **Files a role writes.** A role writes its artifact or candidate, and every thread whose file name names it as opener or owner. Malformed files lists exactly the frontier's `INVALID` lines for those files, each as `rp check` prints it.
- **Who is woken.** On an `INVALID` frontier, `rp assign` wakes only a role that writes a rejected file, and stops for any other role.
- **The turn is a repair.** An `INVALID` frontier computes nothing beyond its `INVALID` lines, so the woken role's turn is the repair of its files:
  - A producer or the implementer is woken in Respond. Threads addressed to you and Changed inputs read `none`.
  - A reviewer gets the repair request, a template of its own. The request lists the `INVALID` lines of the reviewer's files. It tells the reviewer to change in each file only what its reason names and to keep every message, and it carries the turn commit and the commit format, with the vocabulary listing when the commit format keeps a placeholder. It names no thread to write, no diff, and no review to do.
- **Other frontiers.** On any other frontier, no file is rejected, so Malformed files is dropped. The first-turn and later-turn requests carry no part for rejected files.
- **Landing an approval.** Landing stamps each approval the turn closed `--at` the commit its reviewer's last heading names, the commit `rp stamp` already requires. On a review turn, that commit is the change. On a repair that turns a rejected review thread into an approval, it is the change the reviewer's last message reviewed. The approval then certifies the code its reviewer read.
- **Orchestrator.** It maps `INVALID` lines to their authors as today, and wakes a reviewer through § Review lanes.

**Alternatives:**

- The first-turn request naming the rejected review thread loses because, observed, the reviewer replaced the whole thread with a new first review, and its earlier message was lost.
- The later-turn request loses because it tells the reviewer that the author answered, which is false on a repair turn. Its diff also starts at the reviewer's last message, which `rp` cannot read from a thread it rejects.
- The first-turn request naming a new thread loses because the lane would get a second review thread beside the rejected one.
- Waking the author in the mode the rest of the frontier would give loses because nothing is computed from a malformed file (`state.md` § The frontier).
- A repair mode for the producers and the implementer loses because their Respond, with nothing changed and no thread, already is a repair turn. A new mode would change three profiles without changing what the role does.

**Trade-offs:** The reviewer gains a third request template. In Respond, a producer or the implementer also runs its turn's other steps, such as the re-read and the guardrails, on an artifact that has not changed. This is harmless, and the next frontier gives the real turn.

**Claims:**

- observed: a reviewer spawned on opencode with the first-turn request naming its rejected review thread (`status: pending`) replaced the file with a new first review, and its earlier message is gone (`3-implementation/notes/reviewer-run.md`).
- observed: reading `scripts/README.md` § Output and the frontier table in `loop.md`. On `INVALID`, `rp check` prints only the frontier lines, and the orchestrator wakes the file's author.
- observed: reading `state.md` § Certification and `rp.mjs`'s `cmdStamp`. `rp stamp` stops on an approval unless `--at` is the commit its reviewer's last heading names, and unless `HEAD`'s code equals that commit's.
- assumed: a reviewer given the repair request changes only what the reasons name and keeps its messages (design-doc-assumption-3).

design-doc-decision-11: The orchestrator runs `rp assign` and copies nothing

**Serves:** spec-requirement-17, spec-requirement-18, spec-acceptance-criterion-11, spec-acceptance-criterion-21, spec-acceptance-criterion-22

**Decision:**

- **Waking a role.** In `loop.md` § Waking a role, before every spawn and every wake, the orchestrator runs `rp assign <pipeline worktree's absolute pipeline folder> --role <role>`. It then spawns or wakes the role on the printed model (design-doc-decision-8), or on its own model when none is printed, with exactly `Read your assignment: <printed path>.`. It never writes or edits the assignment file.
- **When `rp assign` stops:**
  - A stop that names its own missing step, such as a missing worktree or a reviewer worktree not at a review change: the orchestrator does that step and runs `rp assign` again.
  - Any other stop: it reports the message to the owner, and the run stops through close-out.
- **What the skill loses.** These steps are left without a purpose, and the skill removes them:
  - building assignments from templates;
  - computing Turn commit, Write to, and Supporting folder;
  - listing threads and changed inputs;
  - copying guardrail and resource blocks and filling their values;
  - filling the Subagent model in a tool's form;
  - step 2 of `loop.md` § Review lanes.
- **What stays.**
  - Landing still reads the turn commit from the assignment file.
  - Triage writes the run's `agents` (design-doc-decision-2).
  - The profiles still name only their assignment's path and sections, and no skill file or `.rp.md`.

**Alternatives:** The orchestrator writing the file from `rp`'s output loses because it is one more copy.

**Trade-offs:** When `rp assign` fails, the run stops. Today the orchestrator would have improvised.

**Claims:** observed: reading `loop.md` lines 34–46 and 59–61, and `agents/*.md` § Role.

design-doc-decision-12: Setup writes and migrates the data, and this change commits this repository's migrated `.rp.md`

**Serves:** spec-requirement-14, spec-requirement-15, spec-requirement-16, spec-acceptance-criterion-18, spec-acceptance-criterion-19, spec-acceptance-criterion-20

**Decision:**

- **Version.** The current conventions version is 8.
- **`changelog.md` § 8, migrating from 7:**
  - Move Commit format, Guardrails (each block's `agents` becomes `profiles`), Resources, and Agents into the frontmatter's entries, with values and texts unchanged, and remove their prose sections.
  - Offer variables.
  - A pipeline whose `run-config.md` carries no format 8 is history.
  - `.rp.local.md` overrides of those conventions move to its frontmatter, under setup's existing warning.
- **Older files.** A version-6 file walks § 7, then § 8.
- **`setup.md`.** Setup says once, for Fresh setup and Migration alike, that the conventions an assignment carries are written as entries in the frontmatter. It also says that setup offers to declare as a variable any placeholder in a guardrail, resource, commit-format, or brief text that names no vocabulary fact. The proposed template is the definition another section of `.rp.md` gives that placeholder in prose.
- **Other references.** `load.md`, `agents.md`, `guardrails.md`, and `resources.md` describe the entries.
- **This repository.** The change commits this repository's `.rp.md`, migrated that way: version 8, with its two guardrails, its resource, its commit format, and its Agents as data, and every other section unchanged.

**Alternatives:** Setup writing data only at migration and prose at Fresh setup loses because `rp` could not write those projects' assignments (spec-requirement-16).

**Trade-offs:** The owners of existing projects edit JSON for those four conventions.

**Claims:** observed: reading `setup.md` § Migration and § Write, `changelog.md` § 7, and `.rp.md` § Commit format, § Agents, § Guardrails, and § Resources.

## Interfaces

**`.rp.md` frontmatter, version 8** (a JSON object):

```
{
  "conventions": 8,
  "commit-format": <text>,
  "guardrails": { "<name>": { "rule": <text>, "profiles": [<profile>, …] }, … },
  "resources":  { "<name>": { "resource": <text>, "profiles": [<profile>, …] }, … },
  "agents": {
    "<profile>": {
      "model": "<model name>", "subagents": "<model name>",
      "lanes": { "<lane id>": { "brief": <text>, "model": "<model name>", "subagents": "<model name>" }, … }
    }, …
  },
  "variables": { "<variable name>": "<template>", … }
}
```

- **Required.** Only `conventions` is required. Every other key and member is optional, and no other key exists at any level.
- **Text.** A `<text>` is a non-empty string, or a non-empty list of strings that are its lines.
- **Profile.** A `<profile>` is `spec-producer`, `design-doc-producer`, `implementer`, or `reviewer`. A `profiles` list is non-empty.
- **Model name.** A model name is a non-empty string, as the project writes it.
- **Lanes.** `lanes` appears only under `spec-producer`, `design-doc-producer`, and `reviewer`. It is non-empty, and its ids match `[a-z0-9][a-z0-9-]*`.
- **Variables.** A variable name matches `[a-z][a-z0-9-]*` and is not a vocabulary name. Its template's placeholders name vocabulary facts only.
- **Body.** The body is prose `rp` never reads.

**`.rp.local.md` frontmatter**, optional: the same keys except `conventions`. Each entry it names replaces or adds the main checkout's committed entry: a guardrail, a resource, or a variable by name, an `agents` entry by profile, and `commit-format`.

**`run-config.md` frontmatter, format 8:** `{ "format": 8, "target-phase": <1–4>, "base": "<branch>", "agents": <the agents schema above> }`.

- `agents` is optional, and `lanes` no longer exists.
- Without `reviewer` lanes, there is one review lane, `default`.
- A role's model is its lane's `model`, else its profile's. Its subagent model is its lane's `subagents`, else its profile's.

**`rp assign`:**

```text
node rp.mjs assign <pipeline folder> --role <role>
```

- `<pipeline folder>` is in the worktree that has the pipeline branch checked out.
- `<role>` is one of `spec-producer`, `design-doc-producer`, `implementer`, `spec-producer-<lane>`, `design-doc-producer-<lane>`, or `reviewer-<lane>`.
- It writes the assignment at the path `git rev-parse --git-path rp/<profile>.md` gives in the role's worktree. On a reviewer's later turn it also writes the diff beside the assignment.
- It prints `assignment <absolute path>`, then `model <name>` when the run gives the role a model, and exits 0.
- On every stop it prints `rp: <reason>` to stderr, exits 1, and writes nothing.

**Vocabulary**, valued for the role and its turn:

| Name | Value |
| --- | --- |
| `pipeline-slug` | the pipeline folder's name |
| `role` | `<profile>` or `<profile>-<lane>` |
| `profile` | the role's profile |
| `lane` | the lane id; empty for a role without a lane |
| `worktree` | the absolute path of the role's worktree |
| `branch` | the role's branch |
| `base` | the merge-base of the role's turn commit with the branch `run-config.md`'s `base` names |

**Assignment.** It is the profile's template, or the reviewer's first-turn, later-turn, or repair request, filled as `templates/README.md` defines:

- The Subagent model is the run's name for the role. When the run gives none, it tells the role to use its own model.
- The vocabulary listing appears only when a carried text keeps a placeholder.
- The headings and field names stay those the profiles refer to.

## Dependencies

- Node's built-in modules only: the data is read with `JSON.parse`. The repository and worktrees are read through Git 2.38 or later, as today. No package is added.
- Internal:
  - `rp`'s state and frontier functions and its role grammar, shared with `check`.
  - The lane branches `rp review` builds.
  - The skill's `templates/`.
- The orchestrator's tool resolves the model it spawns a role on: Claude Code aliases, and opencode's `provider/model[#variant]` strings and its models lookup. Each role's tool resolves its subagent model name.

## Failure modes and observability

- **Malformed or unparseable conventions data**, in `.rp.md` or `.rp.local.md`. `rp assign` stops naming the file and the entry, or the place parsing failed. The orchestrator reports it to the owner, and the run stops through close-out. The owner fixes the file, or setup does.
- **`.rp.md` missing, or at another version.** `rp assign` stops naming the file and the version. The loader's migration runs before any run, so this surfaces only when the main checkout changed after loading.
- **The role's worktree is missing, or a reviewer's worktree is not at a review change.** `rp assign` stops naming the branch, or the commit at the worktree's HEAD. The orchestrator creates the worktree, or runs `rp review`, and runs `rp assign` again.
- **The frontier does not wake the role.** `rp assign` stops naming the frontier, which exposes an orchestrator dispatch error.
- **A template cannot be read or parsed, or a slot stays unfilled.** `rp assign` stops naming the template, which exposes a broken install or a template defect.
- **A carried text keeps an unknown placeholder.** The assignment lists the vocabulary, and the role substitutes the placeholder. Both are visible in the assignment file.
- **A role's tool finds no model by its subagent model name.** The role's subagents run on the role's own model, which is visible in the role's tool session.

## Verification

- new test at the `rp assign` CLI — design-doc-decision-3, design-doc-decision-4, spec-acceptance-criterion-2, spec-acceptance-criterion-3, spec-acceptance-criterion-4 — For every frontier action that wakes a producer or the implementer, the file at the role's assignment path holds that turn only: the profile's headings, the mode design-doc-decision-3 maps, only that mode's material lines as absolute paths in the role's worktree, every slot filled with its spec-requirement-2 value, the worktree's tip as Turn commit, and optional parts with nothing dropped. It replaces the previous turn's file, and `rp assign` stops for a role the frontier does not wake or whose worktree is missing.
- new test at the `rp assign` CLI — design-doc-decision-9, spec-acceptance-criterion-5 — A review lane gets the later-turn request naming its open review thread when it has one, else the first-turn request naming a new thread, each naming the branch, review base, and change `rp review` built, the intent, the later inputs, and the brief or the default request; on a later turn the diff it names holds what changed since the reviewer's last message; `rp assign` stops when the lane worktree is not at a review change.
- new test at the `rp assign` CLI — design-doc-decision-10, spec-acceptance-criterion-3, spec-acceptance-criterion-24 — Malformed files lists exactly the `INVALID` lines of the files each role writes. An `INVALID` frontier wakes a producer or the implementer in Respond with nothing else listed, and a reviewer with the repair request, which names no thread to write and no diff.
- new test at the `rp assign` CLI — design-doc-decision-5, spec-acceptance-criterion-6, spec-acceptance-criterion-7, spec-acceptance-criterion-23 — Guardrails and resources follow `profiles`, the same in every lane, or read `none`; the commit format is the project's text or the imperative default; the main checkout's `.rp.local.md` overrides and adds entries by name for a role seated in a linked worktree.
- new test at the `rp assign` CLI — design-doc-decision-2, design-doc-decision-8, spec-acceptance-criterion-8, spec-acceptance-criterion-9, spec-acceptance-criterion-10, spec-acceptance-criterion-11 — The Subagent model and the printed model are the run's lane-else-profile names as written, or none, with the own-model wording and no model line; the assignment is byte-identical whatever the conventions' tool sections map.
- new test at the `rp assign` CLI — design-doc-decision-4, design-doc-decision-7, spec-acceptance-criterion-14, spec-acceptance-criterion-15, spec-acceptance-criterion-16 — Vocabulary facts, `base` as the merge-base of the role's turn commit, and declared variables expand to the role's values in every carried text, a lane's brief included; a placeholder that names neither stays as written and brings the vocabulary listing, which appears in no other case; text outside the placeholder grammar, the templates' syntax included, reaches the assignment as written.
- new test at the `rp assign` CLI — design-doc-decision-6, spec-acceptance-criterion-17 — Every malformation design-doc-decision-6 names, in `.rp.md` or `.rp.local.md` and for any profile, stops `rp assign` with exit 1 and a message naming the file and the entry or where parsing failed, leaving the previous assignment as it was.
- new test at the `rp check` CLI — design-doc-decision-2 — A `run-config.md` whose `agents` breaks the schema stops `rp check`, and production and review lanes, `default` included, follow `agents`.
- existing tests `scripts/test/rp/*.test.mjs` — design-doc-decision-2, design-doc-decision-3 — `check`, `stamp`, `pipelines`, and `review` behave as before under format-8 configurations.
- new test at the `rp assign` CLI — design-doc-decision-1, design-doc-decision-12, spec-acceptance-criterion-1, spec-acceptance-criterion-8, spec-acceptance-criterion-18 — This repository's committed `.rp.md` and a run confirmed with its Agents defaults yield every role's assignment, and spec-producer lane `demands`' holds what spec-acceptance-criterion-1 states.
- inspection of the migrated `.rp.md` against its version-6 text — design-doc-decision-1, design-doc-decision-12, spec-acceptance-criterion-18 — Version 8; every value and text spec-acceptance-criterion-18 lists is unchanged as data, each under its name; the sections it lists as prose are unchanged.
- end-to-end flow of setup — design-doc-decision-7, design-doc-decision-12, spec-acceptance-criterion-19, spec-acceptance-criterion-20 — A migration following `setup.md` and `changelog.md`, and a Fresh setup, write `.rp.md` files from which `rp assign` writes the assignments those criteria state.
- end-to-end flow on opencode — design-doc-decision-10, spec-acceptance-criterion-24 — A reviewer woken through `rp assign` on an `INVALID` frontier to repair its rejected review thread repairs it and keeps its messages, and after landing, `rp check` reads the lane as the repaired thread states, an approval included.
- inspection of `loop.md`, `triage.md`, `state.md`, and `templates/README.md` — design-doc-decision-11, spec-acceptance-criterion-11, spec-acceptance-criterion-21 — The orchestrator's procedure runs `rp assign`, sends the printed path, spawns on the printed model or its own, and gives it no convention, model name, brief, or path to copy into an assignment.
- inspection of `agents/*.md` — design-doc-decision-8, design-doc-decision-11, spec-acceptance-criterion-22 — No profile references a skill file or `.rp.md`, and the producers and the implementer carry the subagent-model rule.
- end-to-end flow on opencode — design-doc-decision-8, spec-acceptance-criterion-12, spec-acceptance-criterion-13 — A lane spawned on the name `rp assign` printed, and a role delegating on its Subagent model name, run on models opencode finds by those names.
- inspection of `rp.mjs`'s imports and `package.json` — design-doc-decision-1, design-doc-decision-3, spec-acceptance-criterion-25 — `rp` imports only `node:` modules, and the package declares no runtime dependency.

## Risks

- **Duplicate names.** In `.rp.md`, `.rp.local.md`, and `run-config.md`, two entries with one name under the same key are kept silently as the last. This applies to guardrails, resources, variables, profiles, and lanes. The consequence is an entry or lane missing from the run with no error. No intended use produces duplicate names: the spec observes distinct names, and `.rp.local.md` overrides by name.
- **A repair that goes beyond its reasons.** A reviewer given the repair request may still rewrite more of a thread than its reason names, and lose a message. Depends on design-doc-assumption-3.
- **A rejected thread whose file name names no role.** Such a thread is written by no role (design-doc-decision-10), so `rp assign` wakes no one to fix it. The orchestrator reports it to the owner.
- **Subagent variants.** On opencode, a bare subagent name resolves to the variant the tool's lookup gives. That may not be the `#xhigh` that `.rp.opencode.md` maps today, unless the project writes the variant into the name: observed, the lookup finds `claude-agent/sonnet` by `sonnet`, with no variant (`3-implementation/notes/opencode-models-lookup.json`).
- **Claude Code.** If Claude Code does not run Sonnet for a subagent passed `sonnet`, spec-acceptance-criterion-13 fails there. Depends on spec-assumption-1.

## Open assumptions

spec-assumption-1: On Claude Code, a role that passes `sonnet` as a subagent's model runs that subagent on Sonnet — assumed: a role delegating on Claude Code with Subagent model `sonnet`. `tools/claude-code.md` § Models documents the aliases, and this seat cannot run Claude Code.

design-doc-assumption-3: A reviewer given the repair request changes in each rejected file only what its reason names, and keeps every message — assumed: a reviewer woken through `rp assign` on an `INVALID` frontier for its rejected review thread.
