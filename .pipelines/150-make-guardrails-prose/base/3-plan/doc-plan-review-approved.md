# Doc Plan Review

## Verdict: approved

## Summary

The doc plan is correct, complete, traceable, drift-resistant, and minimal. I reproduced the writer's documentation sweep across the entire worktree independently and reached the same conclusion: outside the nine in-scope *code* files (which are `code-plan.md`'s territory, not doc tasks), the only published documentation surface that carries the old "deterministic verification gate / exact command judged pass/fail by exit code" framing this change removes is the `Configuration` section sentence in the root `README.md` (line 147). The plan's single task targets exactly that sentence, keeps it at the README's summary altitude, preserves the existing links and the surrounding convention enumeration, and explicitly defers field names / block shape to `reference/guardrails.md` (read in phase 5) so it introduces no drift hooks. The plan also correctly identifies the README's *other* guardrail mention (line 159, naming `guardrails` as a section of the `.rp.md` shared layout) as already accurate under the new model and scopes it to verify-and-leave rather than rewrite. Every deliberately-excluded surface is justified and I confirmed each one against the actual files. `## Guardrail scopes` is the valid `None` rendering — this project declares no Guardrails convention (its `.rp.md` has no guardrails block), so there is nothing to execute in scope-validation.

## Coverage verification (independent sweep)

I swept the worktree end-to-end for every surface that names guardrails or the exit-code framing, then confirmed each is either the plan's one task, an in-scope *code* file, or a justified exclusion:

- **`README.md:147`** — carries "deterministic verification gates (exact commands judged pass/fail by exit code)". This is the plan's Task 1. Correctly the only external doc surface needing a rewrite.
- **`README.md:159`** — lists `guardrails` only as a named section of the `.rp.md` shared layout; carries no exit-code framing. The plan correctly verifies-and-leaves it. (Side note, not a gap for this change: this line enumerates `guardrails` in `.rp.md`'s shared section even though this repo's actual `.rp.md` has no guardrails block — a pre-existing README inaccuracy unrelated to exit-code framing, correctly outside this change's scope.)
- **`README.md:13`** — "non-deterministic" is unrelated copy about agent output, not a guardrail characterization. Correctly untouched.
- **The nine in-scope skill/agent files** — these are this change's *code* (`guardrails.md`, `conventions/load.md`, `conventions/passing.md`, `conventions/setup.md`, the two code writers, doc-writer, the two reviewers), fully covered by `code-plan.md`. Confirmed they are not re-planned here and that documentation *about* them is not duplicated. Each writer's deliberate exclusion is justified — they are edited as code, not documented as a surface.
- **`CHANGELOG.md` (#118, #124, #127)** — released entries that record past releases as they shipped; an immutable, Changesets-generated historical record. Rewriting them to reflect a later redefinition would misstate what those releases contained. The new change's own changeset is a contributor deliverable handled by the repository's changeset rule (no pending changeset names guardrails), not a doc surface this plan owns. Exclusion justified.
- **`website/index.html`** — its only matching line is `<h3>Non-deterministic</h3>` (unrelated agent-output copy); no guardrail or exit-code characterization. Exclusion justified.
- **`CONTRIBUTING.md`** — all "gate" references are the CI "Changeset Gate" workflow, unrelated to guardrails. Exclusion justified.
- **`pr-description.md`** — a scratch working file from an earlier pipeline (the #122 scoped-guardrails run); not published documentation. Exclusion justified.
- **`.rp.md`** — its only "exit" match is an `ExitWorktree` command; it carries no guardrail characterization. Exclusion justified.
- **`reference/assisted-phases/3 - plan.md`** — the only `skills/` guardrail mentions outside the four in-scope reference files live here; it is the out-of-scope `{scope}` plan machinery that deliberately retains "gate"/"scoped gate" terminology (design "Deliberately not changed" and the "Scope-boundary terminology mismatch" risk), and it carries **no** exit-code framing. Not a guardrails-exit-code surface; correctly not a doc task.

No surface that references the framing the code phase changes is left out of sync by this plan.

## Dimension checks

- **Traceability** — Task 1 traces to Spec R1, R13, the acceptance criterion "describes a guardrail as a prose rule … contains no exit-code framing", and Code tasks 1 and 4. All valid and specific.
- **Per-task acceptance** — Five evaluable, reader-facing acceptance criteria framed as what the reader leaves with and what the prose must (and must not) contain. They are drift-resistant: they enumerate the framing to remove and defer all field names / block shape to `reference/guardrails.md`, hard-coding no wording that could break before phase 5.
- **Drift-resistance** — Stays at *what / where / for whom*. Keys on the meaning of the existing parenthetical, not its exact words, and explicitly bars introducing detail beyond what `reference/guardrails.md` defines. No function names, parameter lists, or return shapes.
- **Audience clarity** — Concrete: project owners and contributors reading the top-level README to understand declarable conventions.
- **Granularity** — One small, single-surface, single-audience task. Trivially completable by one doc-writer in phase 5.
- **Ordering / dependencies** — One task, no dependencies; no cycles.
- **Feasibility** — `README.md` exists; the `Configuration` section, the target sentence (line 147), and the `.rp.md`-layout sentence (line 159) all exist as described.
- **No code planning** — Contains no code task; the nine in-scope skill/agent files are correctly left to `code-plan.md`.
- **Scope** — Within spec and design; no documentation for unrequested features.
- **`## Guardrail scopes`** — Rendered as `None` (`| None | — |`), the valid rendering when no scoped guardrail is passed; this project defines no Guardrails convention. Nothing to execute.

The plan is ready for the docs phase.
