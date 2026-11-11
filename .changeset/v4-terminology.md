---
"@automattic/radical-pipelines": minor
---

BREAKING: Give each v4 concept one name, used the same way everywhere.

- **Pipeline configuration.** `run-config.json` and `run-config.local.json` become `config.json` and `config.local.json`, the pipeline configuration. Its `base` becomes `base-branch`, `landing-commit` becomes `landing-commit-format`, a guardrail's `rule` and a resource's `resource` become `text`, and each `subagents` becomes `subagent-model`. Setup ignores `<pipelines folder root>/*/config.local.json` instead of every `run-config.local.json`.
- **Conventions.** In `.rp.md`, `Landing commit` becomes `Landing commit format`, each Agents entry's `subagents` becomes `subagent-model`, and the lifecycle hooks `before-merging-lanes` and `after-merging-lanes` become `before-landing-lane` and `after-landing-lane`. The conventions version stays 7, and its migration applies these renames.
- **Artifact names.** Later inputs, threads, and the frontier name the artifacts `spec`, `design-doc`, and `implementation` instead of by path: a later input's `target` is `spec#spec-requirement-3, design-doc`, and the frontier says `produce implementation`. Candidates are not artifacts, so "root artifact" is gone.
- **Threads.** A thread's header is `status`, `opener`, `recipient`, and `about`, and its file `<n>-<opener>-<recipient>-<about>.md`; `rp thread open` takes `--about`. A review thread closes `approved`, and any other thread `resolved`. A thread to the owner opens `escalated`, instead of `disagreement`, and still closes `answered`.
- **Frontier and plan.** A malformed file is `malformed <path>: <reason>` instead of `INVALID`. A production lane's work is `produce <artifact> <lane>` or `respond <artifact> <lane>` instead of `lane <artifact> <lane>`, and a review entry carries its lane in `lane`. A consolidation needs `wake <role> new` instead of `fresh`. `rp check --json` uses kebab-case keys — `target-phase`, `net-change`, `code-changed`, `approved-commit` — and its phases carry their number, the artifact's name, and its path.
- **Review lanes and certification.** The commit a review lane reads is the review head, `rp review head`, on the review base; `create-branch` and `move-branch` name it `review-head`. An approval's certification records `approved-commit` instead of `reviewed`.
- **Base and facts.** The base branch is `config.json`'s `base-branch`, and the merge-base is the merge-base of the tip with it; the placeholder `{base}` becomes `{merge-base}`, and an assignment lists the pipeline facts in `facts` instead of `vocabulary`.
- **Records.** The step record becomes the turn record, `rp/turns.json`, in a worktree's assignment folder.
- **Profiles.** `notes.md`'s `status: in progress` becomes `in-progress`, and producers close their own threads `resolved`.
