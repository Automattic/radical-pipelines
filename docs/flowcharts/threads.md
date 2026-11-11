# A thread's lifecycle

This chart mirrors [`reference/run/state.md`](../../skills/radical-pipelines/reference/run/state.md) § Threads and the thread rules in the agent profiles: a role that consumes an artifact opens a thread to its owner, each message ends its author's turn, and the frontier wakes whichever party the thread awaits. A reviewer opens threads to the implementer only; the implementer carries a finding that questions a requirement or a design decision to that clause's owner in a thread of its own.

```mermaid
flowchart TD
    OPEN["A consuming role finds a problem and opens a thread to the owner with rp thread open, its findings the body"] --> AW1["The thread awaits its owner; rp check names respond artifact"]
    AW1 --> OWNER["The orchestrator wakes the owner, which reads its artifact, inputs, and the thread"]
    OWNER --> OWNS{"Does the finding concern what it owns?"}
    OWNS -->|No| NAME["It replies naming the owner"]
    NAME --> REOPEN["The opener reopens the finding in a thread to the role named"]
    REOPEN --> AW1
    OWNS -->|Yes| ANSWER["It commits the artifact changes and replies with rp thread reply to each finding: what changed and in which commit, or why it stands"]
    ANSWER --> AW2["The thread awaits its opener; the orchestrator wakes it"]
    AW2 --> READ{"The opener reads the reply"}
    READ -->|Resolved| CLOSED["The opener closes it approved or withdrawn with rp thread close"]
    READ -->|New findings or evidence| AGAIN["It replies"]
    AGAIN --> AW1
    READ -->|A position repeated without new evidence| DIS{"What is disputed?"}
    DIS -->|A derived requirement or a design decision| OBS{"Does its defense cite an input observed in intended use?"}
    OBS -->|Yes| CLOSED
    OBS -->|No| REVISE["The clause falls: its owner revises the artifact"]
    REVISE --> AW2
    DIS -->|What the intent means or demands| ESC["Either party (the implementer, on a review thread) escalates with rp thread escalate, citing this thread: a thread to owner about intent, status escalated"]
    ESC --> OE["Owner escalation"]
    CLOSED --> HIST["The closed thread stays as history; a refuted case gains a line under Considered and not required"]
```
