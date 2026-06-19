# Docs Phase Summary — Managing Issues mid-session

## What

A single new changeset, `.changeset/manage-issues-mid-session.md` (bump `patch`), recording the user-facing behavioral change: the orchestrator now follows the Managing Issues workflow (the owner-led capture Q&A routed through the project's Issues convention) whenever it creates or modifies an issue — mid-session and mid-pipeline included — not only at session start. No other documentation surface was edited.

## Why

`skills/**` is a release-relevant path and this is a behavioral change, so the project's standing "every change records a changeset" rule requires a non-empty changeset. It tells package consumers and changelog readers how the orchestrator's behavior changed between releases and why (a mid-run decision to author an issue no longer risks an ad-hoc issue authored outside the workflow), and it lands in `CHANGELOG.md` at the next release via `changeset version`.

## How

The changeset front matter carries exactly the `"@automattic/radical-pipelines"` key with a `patch` bump; the body is a one-paragraph imperative-mood summary in the style of the existing changesets. It states both the behavioral change and its rationale, stays within the spec's five Out-of-Scope items (no new recognition triggers, no run-time tracker metadata, no spawned-agent changes, no reference to the absent merge/close files), uses generic wording (no tracker-platform or agentic-tool names), and coins no new proper noun. It validates clean (`node scripts/validate-changesets.mjs` exits 0).

## Key decisions

- **Only a changeset, no other doc edits.** Every documentation surface was investigated. `CHANGELOG.md` is generated from the changeset and must not be hand-edited. README.md, CONTRIBUTING.md, AGENTS.md, and `website/` describe none of the affected surfaces (the Entry-points table, the session-start framing, the Managing Issues workflow), so none is made stale; inventing notes there would be fabricated work and would violate the spec's minimalism. The skill prose itself (`SKILL.md`, `manage-issues.md`) is the code phase's output, not a doc task.
- **`patch`, not `minor`.** Per CONTRIBUTING's bump table and pre-1.0 policy, this is a backwards-compatible strengthening of existing behavior that closes a gap — the Managing Issues workflow already existed and now applies in more situations, adding no new feature surface — so it reads as a fix (`patch`) rather than a feature addition (`minor`). No `BREAKING:` prefix; nothing breaks for existing consumers.
