# Build Review

## Verdict: rejected

## Scope

Delta-reviewed resolution commit `99bc585` and rechecked the prior branch behavior.

## Summary

Finding 1 is resolved: concurrent cold callers share one defended read, agree on the result, and honor an event that lands during the read. Finding 2 is not safely resolved. The fixed-size cache evicts live subagents, and the documented unreachable-server fallback then grants an evicted child full access. A pending successful read can also recreate an entry after `session.deleted` removed it.

## Checks

| Check | Result |
| --- | --- |
| `npm test` | passed: 346/346 |
| `npm run test:opencode` | passed: 38/38 against CLI/plugin `0.0.0-dev-17711` |
| Changeset validation | passed |
| Version sync | passed |
| `git diff --check` | passed |

## Resolution verification

### Finding 1: concurrent cold reads — resolved

- Twenty-five simultaneous callers shared one read and received one verdict.
- A rejected read was shared, converted to the documented unknown result, removed from the pending map, and retried by the next call.
- A caller attached as the successful read settled received the cached verdict without starting another read; the pending entry was removed.
- A `session.created` event arriving during an unanswered read remained authoritative.
- Production reads have the existing ten-second request timeout, so the shared promise has a bounded wait.

### Finding 2: unbounded growth — failed resolution

Deletion and the cap bound the map's size, but they do not preserve the access boundary. See the finding below.

## Prior behavior verification

- The pinned integration suite still passes all 38 checks.
- The prior live pinned checks established that subagents are denied, root and forked sessions retain full access, missed creation events are recovered from durable storage, and dead-target loops retire once.
- The retention test's last-in-file ordering is deterministic under the suite's default serial execution. Its global-state coupling is not itself a blocker, though restoring the shared symbol would make the test more isolated.

## Finding

### Oldest-first eviction can grant a live subagent full access

**Where:** `opencode/plugin.mjs:206-233`, `opencode/plugin.mjs:316-349`, `scripts/test/opencode/tool-access.test.mjs:300-320`

The claim that eviction “costs correctness nothing” depends on the replacement read succeeding. The accepted fallback for an unreadable parentage server is `full`. Because cached access does not refresh insertion order, any old live subagent is evicted after 4,096 later session creations. If the self-read is then unavailable, that child receives the complete orchestration tool set.

This is reachable in the pinned runtime, not merely synthetic. I started the pinned server without a self-address override, created a real `general` subagent, confirmed `rp_status` returned `SubagentNotPermitted`, then created 4,200 root sessions through the session API without deleting them. The same still-live child then called `rp_status` successfully and received the plugin status payload. The server supports this session count and imposes no invariant that keeps live sessions below the cap.

The retention test masks the unsafe branch by making the evicted child's replacement read return `true`; it needs coverage for an unreadable replacement read. A retention strategy must not turn session volume plus a parentage-read outage into broader access.

Deletion reclamation also races with an in-flight cold read. In a throwaway test, `session.created` and then `session.deleted` landed while the read was pending; the read subsequently returned `true` and `resolveToolAccess` inserted the deleted entry again. `rp_terminate` can produce the same ordering when it deletes a session during a cold lookup. Deletion must prevent an older in-flight answer from resurrecting the entry.
