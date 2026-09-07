# Load conventions

This chart mirrors [`reference/conventions/load.md`](../../skills/radical-pipelines/reference/conventions/load.md), including its migration and setup handoffs before lifecycle hooks are loaded.

```mermaid
flowchart TD
    A["Resolve the main root worktree-aware"] --> B["Load the active tool file"]
    B --> C["Read .rp.md and its active tool section"]
    C --> H{"Version stamp status"}
    H -->|No .rp.md| I["Offer Fresh setup"]
    H -->|Older or absent stamp| J["Offer Migration"]
    H -->|conventions: 1| D{"Required active-tool section present?"}
    H -->|Newer than 1| L["Stop and update the skill"]
    D -->|No| E["Offer setup for the active tool"]
    E --> F{"Owner accepts setup?"}
    F -->|No| STOP["Stop and report what is missing"]
    F -->|Yes| SETUP["Run setup"]
    SETUP --> WRITE["Write confirmed conventions"]
    WRITE --> C
    D -->|Yes| K{"Required conventions complete?"}
    I --> M{"Owner accepts setup?"}
    J --> M
    M -->|No| STOP
    M -->|Yes| SETUP
    K -->|No| N["Offer setup for missing conventions"]
    N --> O{"Owner accepts setup?"}
    O -->|No| STOP
    O -->|Yes| SETUP
    K -->|Yes| G["Merge .rp.local.md overrides"]
    G --> P["Load lifecycle hooks"]
    P --> Q["Continue"]
```
