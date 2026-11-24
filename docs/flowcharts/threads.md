# A thread's lifecycle

This chart mirrors [`reference/run/state.md`](../../skills/radical-pipelines/reference/run/state.md) § Threads and the thread rules in the agent profiles: a role that consumes an artifact opens a thread to its owner, the thread's recipient, each message ends its author's turn, and the frontier wakes whichever party the thread awaits. A reviewer opens threads to the implementer only; the implementer carries a finding that questions a requirement or a design decision to that clause's owner in a thread of its own.

```mermaid
flowchart TD
    OPEN["A consuming role finds a problem and opens a thread to the artifact's owner with rp thread open, its findings the body"] --> AW1["The thread awaits its recipient; rp check names respond artifact"]
    AW1 --> OWNER["The orchestrator wakes the recipient, which reads its artifact, inputs, and the thread"]
    OWNER --> OWNS{"Does the finding concern what it owns?"}
    OWNS -->|No| NAME["It replies naming the role that owns it"]
    NAME --> REOPEN["The opener reopens the finding in a thread to the role named"]
    REOPEN --> AW1
    OWNS -->|Yes| ANSWER["It judges each finding, commits the artifact changes for those that convince it, and replies with rp thread reply to each: what changed and in which commit, or why it stands, with its evidence or reason"]
    ANSWER --> AW2["The thread awaits its opener; the orchestrator wakes it"]
    AW2 --> READ{"The opener judges each answer: a finding is resolved by a change, dropped when the reason it stands convinces, or held"}
    READ -->|Every finding resolved or dropped| CLOSED["The opener closes it with rp thread close: approved for a review thread, resolved for any other, or withdrawn"]
    READ -->|Findings held for the first time, or new ones| AGAIN["It replies"]
    AGAIN --> AW1
    READ -->|A finding held without new evidence| DIS{"What does it dispute? The recipient asks before answering it again; the opener, when that answer is that it stands"}
    DIS -->|What the software does, or whether intended use produces a case| OBS{"Which side rests only on what could happen?"}
    OBS -->|The recipient's| REVISE["The recipient changes the artifact"]
    REVISE --> AW2
    OBS -->|The opener's| DROP["The opener drops the finding"]
    DIS -->|Anything else, such as how a case is handled| LAST["The recipient's second answer that it stands is final"]
    LAST --> DROP
    DROP --> READ
    DIS -->|What the intent means or demands, turning on its words| ESC["Either party (the implementer, on a review thread) escalates with rp thread escalate, quoting the intent's words and citing this thread: a thread to owner about intent, status escalated"]
    ESC --> OE["Owner escalation"]
    CLOSED --> HIST["The closed thread stays as history; a refuted case gains a line under Considered and not required"]
    CLOSED -->|"A review thread's approval goes stale"| STALE["Once no review thread is open, the orchestrator wakes its reviewer on the same thread"]
    STALE --> READ
```
