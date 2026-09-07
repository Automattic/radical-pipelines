# Triage

This chart mirrors [`reference/entries/triage.md`](../../skills/radical-pipelines/reference/entries/triage.md), from issue normalization and tree scanning through first-match routing, preparation, and run dispatch.

```mermaid
flowchart TD
    A["Normalize the request into an issue"] --> B{"Declared dependencies?"}
    B -->|No| SCAN["Scan every matching live and merged pipeline"]
    B -->|Yes| C{"Dependencies reportable?"}
    C -->|No| SCAN
    C -->|Yes| D{"Any dependency open?"}
    D -->|No| SCAN
    D -->|Yes| E{"Owner chooses"}
    E -->|Wait| WAIT["Wait"]
    E -->|Proceed| SCAN
    SCAN --> MANY{"Several live pipelines match?"}
    MANY -->|Yes| PICK["Pick the one whose frontier the request advances"]
    MANY -->|No| ROUTE{"Apply the first matching route"}
    PICK --> ROUTE
    ROUTE --> R1["Record an answer to a pending owner escalation"]
    ROUTE --> R2["Continue the matching live pipeline"]
    ROUTE --> R3["Create an external amendment"]
    ROUTE --> R4["Start a pipeline from an unmerged tip"]
    ROUTE --> R5["Start a new re-attempt"]
    ROUTE --> R6["Start a new pipeline from the artifact base branch"]
    ROUTE -->|No predicate decides| QUESTION["Ask the one deciding question"]
    QUESTION --> ROUTE
    R1 --> CONFIRM["Confirm route, workflow, target phase, lanes, and all questions"]
    R2 --> CONFIRM
    R3 --> CONFIRM
    R4 --> CONFIRM
    R5 --> CONFIRM
    R6 --> CONFIRM
    CONFIRM --> PREP{"Prepare the selected route"}
    PREP --> P1["Create the branch at its start ref and create the worktree"]
    P1 --> P1A["Synthesize, approve, commit, and stamp the intent"]
    PREP --> P2["Select or create the amendment branch and worktree"]
    P2 --> P2A["Write decisions and amendment; commit and stamp"]
    PREP --> P3["Ensure the continuation branch and worktree exist"]
    P1A --> DIRECTIONS["Record run directions as intent decisions; stamp and commit"]
    P2A --> DIRECTIONS
    P3 --> DIRECTIONS
    DIRECTIONS --> START["Fire run-started"]
    START --> MODE{"Confirmed workflow"}
    MODE --> AUTO["Run the autonomous loop"]
    MODE --> ASSISTED["Run the assisted phase"]
```
