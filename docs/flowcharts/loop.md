# Autonomous loop

This chart mirrors [`reference/run/loop.md`](../../skills/radical-pipelines/reference/run/loop.md): each step runs `rp check`, wakes the roles its frontier names, waits for their turns to end, lands them, and repeats until the frontier is `complete` or `escalate`.

```mermaid
flowchart TD
    START["Enter from triage; start health monitoring"] --> A["Run rp check"]
    A --> C{"Frontier"}
    C -->|INVALID| AUTHOR["Wake the file's author to fix it — a reviewer through rp review — or fix it when you wrote it"]
    C -->|escalate thread| OE["Owner escalation"]
    C -->|lane artifact id| LANE["Give each lane its branch and worktree at the pipeline tip; wake its producer"]
    C -->|consolidate artifact| CON["Terminate the lane instances; remove their worktrees and branches; wake a fresh producer"]
    C -->|produce artifact| PRODUCE["Wake its owner"]
    C -->|respond artifact| RESPOND["Wake its owner"]
    C -->|review lane| REVIEW["rp review builds each lane's branch from the pipeline tip; give it a worktree; wake its reviewer"]
    C -->|complete| CLOSE["Close-out"]
    OE --> CLOSE
    LANE --> ASSIGN
    CON --> ASSIGN
    PRODUCE --> ASSIGN
    RESPOND --> ASSIGN
    REVIEW --> ASSIGN
    AUTHOR --> ASSIGN
    ASSIGN["For each woken role, rp assign writes its assignment and prints its model; spawn or wake it on that model, resolved for the tool"] --> WAIT
    WAIT["End the turn; resume on role reports and health ticks"] --> ENDED{"Every woken role ended its turn?"}
    ENDED -->|No| WAIT
    ENDED -->|Yes| LAND["For each role, at the turn commit its assignment names: a production lane or role stamps in its worktree; a review lane's commits after its change are cherry-picked onto the pipeline branch first and its approvals stamped at that change, the one the reviewer's last heading names, the pipeline worktree's HEAD becoming the approved commit, whose code must be the change's; commit the certifications; then merge a production lane's branch"]
    LAND --> PC["Fire phase-completed for each phase that became complete; report one line per role to the owner"]
    PC --> A
```
