# Build Review

## Verdict: rejected

## Scope

Reviewed the two branch commits, `2221565` and `e701dec`, against their parent `fd60b30`, including both rebase conflict resolutions.

## Summary

The dead-target loop fix, tool-access roles, durable missed-event fallback, fork treatment, documentation, and changesets work in the pinned runtime. The second-round parentage cache is not concurrency-safe, however: concurrent cold calls can issue duplicate reads and classify the same subagent differently, allowing one call through with full access. The cache also retains every observed session for the daemon's lifetime, including deleted sessions.

## Checks

| Check | Result |
| --- | --- |
| `npm test` | passed: 341/341 |
| `npm run test:opencode` | passed: 38/38 against CLI/plugin `0.0.0-dev-17711` |
| Changeset validation | passed |
| Version sync | passed |
| `git diff --check` | passed |
| Rebase conflict: trunk `buildSpawnTool` signature | satisfied; the sole caller passes only `resolveRepoRootFn` |
| Rebase conflict: opencode convention prose | satisfied; concise, canonical-path-specific, and non-structurally tested |

## Behavior verification

- A real pinned `general` subagent was denied `rp_status` with `SubagentNotPermitted`; a root session retained full access.
- After restarting the pinned server so creation events were absent from memory, the durable read still denied the child while root and forked sessions retained full access.
- A live pinned fork had no `parentID` before or after restart and successfully called `rp_status`. This confirms the earlier fork finding was inapplicable.
- A live pinned loop whose target was deleted removed its registry entry, recorded one `loop.retired`, and produced no further ticks. The earlier failure seen while the original seat was switching branches did not reproduce in the stable seat.
- The setup-level registry-failure test confirms the second-round disarm-before-delete ordering.
- The tool-scope changeset now uses the required pre-1.0 `BREAKING:` prefix.

## Findings

### 1. Concurrent cold parentage reads can fail the access boundary open

**Where:** `opencode/plugin.mjs:261-273`, `scripts/test/opencode/tool-access.test.mjs:116-123`

`resolveToolAccess` memoizes only a completed boolean. Concurrent first calls all observe an empty map and independently invoke `readParentage`; the test covers only sequential calls. A 100-call throwaway race issued 100 reads, contradicting the documented “at most once” guarantee.

More importantly, each call classifies from its local result without re-reading the map after `await`. In a controlled mixed-result race, one lookup returned `undefined` and received `full` while a concurrent successful lookup returned `none` for the same child. In a second race, `session.created` recorded the child while its read was pending, but the read returned `undefined` and that call still received `full`; only the next call was denied.

The cold lookup must be shared per session, and classification after it settles must not ignore authoritative parentage recorded concurrently. Add concurrent tests for duplicate suppression, mixed read outcomes, and an event arriving during the read.

### 2. The process-wide parentage cache grows without bound

**Where:** `opencode/plugin.mjs:171-213`

Every `session.created` adds an entry, including roots, but `recordSessionParent` ignores `session.deleted` and there is no pruning. A throwaway run recorded 10,000 creations followed by their deletion events; all 10,000 entries remained. A long-lived daemon therefore retains every session ID it has ever observed.

Tie entries to session deletion or use a lifecycle-safe bounded retention policy, and cover reclamation with a test without weakening the missed-event boundary.
