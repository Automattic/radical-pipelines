# Autonomous loop

This chart mirrors [`reference/run/loop.md`](../../skills/radical-pipelines/reference/run/loop.md): each step runs `rp next` for its plan, fires the plan's hooks around `rp next --apply`, wakes the roles the plan names, lands each turn with `rp land`, and repeats until the frontier is `complete` or `escalate`.

```mermaid
flowchart TD
    START["Enter from triage; start health monitoring"] --> PLAN["Run rp next: the frontier and the step's plan"]
    PLAN --> TOLAND{"Turns to land?"}
    TOLAND -->|Yes| LANDFIRST["Land each named turn (below)"]
    LANDFIRST --> PLAN
    TOLAND -->|No| TERM["Terminate each role the plan names, between its terminating hooks"]
    TERM --> APPLY["Fire the before- worktree hooks; rp next --apply creates, moves, and removes lane branches and worktrees and writes each assignment; fire the after- worktree hooks and phase-started"]
    APPLY --> C{"Frontier"}
    C -->|escalate thread| OE["Owner escalation"]
    C -->|complete| CLOSE["Close-out"]
    OE --> CLOSE
    C -->|"fix: a phase-0 file rp check rejects"| FIX["Fix it as phase 0 records it, outside the step"]
    FIX --> PLAN
    C -->|every other line| WAKE["Spawn or wake each role the plan names, in its worktree, on its model resolved for the tool: Read your assignment: path"]
    WAKE --> WAIT["End the turn; resume on role reports and health ticks"]
    WAIT --> ENDED{"A role ended its turn?"}
    ENDED -->|No| WAIT
    ENDED -->|"Blocker"| REPAIR["Repair what it names; it is not landed"]
    ENDED -->|Done| LAND["rp land --role: a lane's role between the merging hooks; it validates, merges or cherry-picks, certifies, and commits"]
    LAND --> PC["Fire phase-completed for each phase it prints; report one line to the owner"]
    PC --> ALL{"Every woken role landed or blocked?"}
    REPAIR --> ALL
    ALL -->|No| WAIT
    ALL -->|Yes| PLAN
```
