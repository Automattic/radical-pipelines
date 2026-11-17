# Load conventions

This chart mirrors [`reference/conventions/load.md`](../../skills/radical-pipelines/reference/conventions/load.md), including its migration and setup handoffs, the active tool's setup actions, and the lifecycle hooks loaded last.

```mermaid
flowchart TD
    A["Find the repository's main root, even from a worktree"] --> B["Read the skill's tools/tool.md"]
    B --> C["Read .rp.md"]
    C --> H{"Conventions version"}
    H -->|No .rp.md| I["Offer Fresh setup"]
    H -->|Absent or older| J["Offer Migration through the changelog"]
    H -->|Newer| L["Stop: the owner updates the skill"]
    H -->|Current, 7| K{"Required conventions complete?"}
    I --> M{"Owner accepts setup?"}
    J --> M
    K -->|No| N["Offer setup for the missing conventions"]
    N --> M
    M -->|No| STOP["Stop and explain what is missing"]
    M -->|Yes| SETUP["Run setup; write the confirmed .rp.md"]
    SETUP --> C
    K -->|Yes| G["Apply .rp.local.md's overrides"]
    G --> T{"tools/tool.md lists setup actions?"}
    T -->|Yes| TA["Perform them, confirming any action that writes files"]
    TA --> TR{"Every requirement met?"}
    TR -->|No| TSTOP["Tell the owner what to enable and stop"]
    TR -->|Yes| P
    T -->|No| P["Read the lifecycle hooks"]
    P --> Q["Continue"]
```
