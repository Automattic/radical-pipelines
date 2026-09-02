# Triage

The front door for work. The owner brings a request — an issue, PR feedback, a CI failure, a bug, a correction — and you route it. Judgment is allowed here.

## 1. Normalize

Every pipeline traces to an issue. If the request has none, create one first via `manage-issues.md`, then continue.

Resolve the canonical issue reference through the Issues convention.

## 2. Scan

Derive the state of existing work from the tree and branches, per `../run/state.md`:

- Pipelines whose origins reference the issue (and pipelines they reference).
- Each pipeline's state: live or merged, freshness frontier, amendments in flight, pending owner escalations.

If the request answers a pending escalation, record the answer (verbatim, attributed `owner`) and route as **continue**.

## 3. Route

Check the predicates in order; take the first that holds:

| Predicate | Route |
| --- | --- |
| A live pipeline's intent and amendments already call for this work | **Continue** — no new records; enter the loop |
| The work corrects what an existing pipeline's artifacts claim or its shipped code does | **Amendment** — on its branch if live; on a new branch from main if merged |
| New intent whose starting point is another pipeline's unmerged tip | **New pipeline, stacked** |
| New intent explicitly re-attempting an existing pipeline differently | **New pipeline, forked-from** |
| Otherwise | **New pipeline from main** |

When the predicates cannot decide, ask the owner the one deciding question — batched with everything else you need to ask.

## 4. Collect the run policy

Mode (autonomous or assisted), target phase, review lanes and charters, escalation gate mode — defaults from the Policy defaults convention, overrides from the owner. Ask once, together.

## 5. Create the records

**New pipeline:**

1. Derive the branch base and the pipeline folder per the names in `../run/state.md`.
2. Create the branch from the start ref (main, the stacked tip, or the fork cut).
3. Write `0-intent/intent.md`: the issue body verbatim, in the intent format.
4. Stamp the origin frontmatter (`issue`, and `stacked-on`/`forked-from` when they apply); commit.

**Amendment:**

1. On the pipeline's branch (or a new branch from main when it is merged), write `0-intent/amendment-<n>.md` per the intent format — Origin carries the trigger verbatim.
2. Stamp `target` and `origin`; commit.

## 6. Hand off

Announce the route and why. Then enter the loop: `../run/loop.md`.
