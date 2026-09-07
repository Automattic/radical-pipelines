# Load conventions

This chart mirrors [`reference/conventions/load.md`](../../skills/radical-pipelines/reference/conventions/load.md), including its migration and setup handoffs before lifecycle hooks are loaded.

```mermaid
flowchart TD
    A["Resolve the main root worktree-aware"] --> B["Load the active tool file"]
    B --> C["Read .rp.md and its active tool section"]
    C --> G["Merge .rp.local.md overrides"]
    G --> D{"Required active-tool section present?"}
    D -->|No| E["Offer setup for the active tool"]
    E --> F{"Owner accepts setup?"}
    F -->|No| STOP["Stop and report what is missing"]
    F -->|Yes| SETUP["Run setup"]
    SETUP --> WRITE["Write confirmed conventions"]
    WRITE --> C
    D -->|Yes| H{"Version stamp status"}
    H -->|No .rp.md| I["Offer Fresh setup"]
    H -->|Older or absent stamp| J["Offer Migration"]
    H -->|conventions: 1| K{"Required conventions complete?"}
    H -->|Newer than 1| L["Stop and update the skill"]
    I --> M{"Owner accepts setup?"}
    J --> M
    M -->|No| STOP
    M -->|Yes| SETUP
    K -->|No| N["Offer setup for missing conventions"]
    N --> O{"Owner accepts setup?"}
    O -->|No| STOP
    O -->|Yes| SETUP
    K -->|Yes| P["Load lifecycle hooks"]
    P --> Q["Continue"]
```
