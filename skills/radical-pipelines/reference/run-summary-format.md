# Run Summary Format

The run summary is a self-contained record of a single run, written once at run completion. It is read by a later review run with no other prior-run context, so it must stand alone.

## Structure

Render these sections and **omit any that are empty** — no `N/A` placeholders:

```markdown
# Run Summary

## What
<!-- What this run changed: the shipped change, concisely. -->

## Why
<!-- Why the change was made: the problem and the goal it serves. -->

## How
<!-- How the change was realized: the approach the run took. -->

## Key decisions
<!-- Decisions taken during the run that a later review benefits from knowing. -->

## Rejected approaches
<!-- Approaches considered and not taken, and why. -->

## Known limitations
<!-- Limitations of what this run shipped. -->
```
