---
"@automattic/radical-pipelines": patch
---

Send a permission reply under the key the route's body names, so adjudicating a pending request works again: every reply was rejected as malformed, leaving the asking agent blocked until the request expired and its turn ended interrupted — both through the reply tool and through the automatic redirect of a read that resolves inside the agent's own worktree. The integration suite now adjudicates real pending requests against the running server, which is the only place a request body can be told apart from the one the server accepts.
