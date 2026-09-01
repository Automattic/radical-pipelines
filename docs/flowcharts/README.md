# Flowcharts

The v3 architecture as a navigable set of Mermaid flowcharts. Big picture first, details one box away: a node drawn as `[[double bracket]]` expands into the chart of the same name.

Shape legend: `([stadium])` entry/exit · `{diamond}` decision · `[[double bracket]]` expandable box with its own chart · `{{hexagon}}` lifecycle hook point.

Design record: [#273](https://github.com/Automattic/radical-pipelines/issues/273).

## Index

| Chart | Expands from | Reference file |
| --- | --- | --- |
| `skill-entry.md` | — | `SKILL.md` |
| `load-conventions.md` | skill-entry | `reference/conventions/load.md` |
| `manage-issues.md` | skill-entry | `reference/entries/manage-issues.md` |
| `triage.md` | skill-entry | `reference/entries/triage.md` |
| `convergence-loop.md` | skill-entry, triage | `reference/run/loop.md` |
| `review-wave.md` | convergence-loop | `reference/run/loop.md` (section) |
| `request-ladder.md` | convergence-loop | `reference/run/loop.md` (section) |

Pending charts: `report`, `close-out`, `setup`/`migrate`, and the phase runbook internals.

## Known drift

These charts were drawn during the design conversation; later decisions supersede details in them. Pending redraws:

- Insufficiency declarations now surface as verdicts and adjudication dispositions (`unsatisfiable`, contradicts-input), pair-certified — not as free-standing messages.
- "Request ladder" is an internal design name; the skill prose names only its rungs (research request, blocker, unsatisfiable routing, owner escalation).
