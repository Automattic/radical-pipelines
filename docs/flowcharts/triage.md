# Triage

This chart mirrors [`reference/entries/triage.md`](../../skills/radical-pipelines/reference/entries/triage.md), from issue normalization and tree scanning through first-match routing, preparation, and run dispatch.

```mermaid
flowchart TD
    A["Normalize the request into an issue"] --> B["Scan every matching live and merged pipeline"]
    B --> C{"Apply the first matching route"}
    C --> R1["Record an answer to a pending owner escalation"]
    C --> R2["Continue the matching live pipeline"]
    C --> R3["Create an external amendment"]
    C --> R4["Start a pipeline from an unmerged tip"]
    C --> R5["Start a new re-attempt"]
    C --> R6["Start a new pipeline from main"]
    R1 --> D["Confirm workflow, target phase, lanes, and charters"]
    R2 --> D
    R3 --> D
    R4 --> D
    R5 --> D
    R6 --> D
    D --> E{"Prepare the selected route"}
    E --> P1["Create branch, worktree, and intent"]
    E --> P2["Write the amendment"]
    E --> P3["Continue without preparation"]
    P1 --> F["Fire run-started"]
    P2 --> F
    P3 --> F
    F --> G{"Confirmed workflow"}
    G --> H["Run the autonomous loop"]
    G --> I["Run the assisted phase"]
```
