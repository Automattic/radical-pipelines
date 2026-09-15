# Triage

This chart mirrors [`reference/entries/triage.md`](../../skills/radical-pipelines/reference/entries/triage.md), from issue normalization and tree scanning through first-match routing, preparation, and run dispatch.

```mermaid
flowchart TD
    A["Normalize the request into an issue"] --> SCAN["Scan every matching live and merged pipeline"]
    SCAN --> B{"Declared dependencies?"}
    B -->|No| MANY{"Several live pipelines match?"}
    B -->|Yes| C{"Dependencies reportable?"}
    C -->|No| MANY
    C -->|Yes| D{"Any dependency open?"}
    D -->|No| MANY
    D -->|Yes| E{"Owner chooses"}
    E -->|Wait| WAIT["Wait"]
    E -->|Proceed| MANY
    MANY -->|Yes| PICK["The one the request identifies; otherwise the owner chooses"]
    MANY -->|No| ROUTE{"Route each statement by its first matching predicate"}
    PICK --> ROUTE
    ROUTE --> R1["Record an answer to a pending owner escalation"]
    ROUTE --> R2["Continue the matching live pipeline"]
    ROUTE --> R3["Create a correction"]
    ROUTE --> R3R["Rescope the live pipeline, or start from its tip"]
    ROUTE --> R4["Start a pipeline from an unmerged tip"]
    ROUTE --> R5["Start a new re-attempt"]
    ROUTE --> R6["Start a new pipeline from the artifact base branch"]
    ROUTE -->|No predicate decides| QUESTION["Collect the one deciding question"]
    QUESTION --> GROUP
    GROUP --> CONFIRM["Ask once: each route or the deciding question, each run's workflow, target phase, lanes, and remaining questions"]
    R1 --> GROUP["Group routes by pipeline into runs"]
    R2 --> GROUP
    R3 --> GROUP
    R3R --> GROUP
    R4 --> GROUP
    R5 --> GROUP
    R6 --> GROUP
    CONFIRM --> PREP{"Prepare every route of the next run"}
    PREP --> P1["Create the branch at its start ref and create the worktree"]
    P1 --> P1A["Synthesize, approve, commit, and stamp the intent"]
    PREP --> P2["Select or create the correction branch and worktree"]
    P2 --> P2A["Write decisions and correction; commit and stamp"]
    PREP --> P3["Ensure the continuation branch and worktree exist"]
    PREP --> P4["Modify the issue; re-synthesize the intent; commit and stamp"]
    P4 --> P3
    P1A --> DIRECTIONS["Record the run's directions as decisions in its intent; stamp and commit"]
    P2A --> DIRECTIONS
    P3 --> DIRECTIONS
    DIRECTIONS --> START["Fire run-started"]
    START --> MODE{"Confirmed workflow"}
    MODE --> AUTO["Run the autonomous loop"]
    MODE --> ASSISTED["Run the assisted phase"]
    AUTO --> NEXT{"Another run?"}
    ASSISTED --> NEXT
    NEXT -->|Yes| PREP
```
