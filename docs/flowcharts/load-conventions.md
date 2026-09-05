# Load conventions

This chart mirrors [`reference/conventions/load.md`](../../skills/radical-pipelines/reference/conventions/load.md), including its migration and setup handoffs before lifecycle hooks are loaded.

```mermaid
flowchart TD
    A["Resolve the main repository root"] --> B["Load the active tool file"]
    B --> C["Merge .rp.md and its active tool section"]
    C --> D["Merge .rp.local.md overrides"]
    D --> E{"Version stamp status"}
    E --> F["No .rp.md"]
    E --> G["Older or unstamped .rp.md"]
    E --> H["conventions: 1"]
    E --> I["Newer than 1"]
    F --> J["Fresh setup"]
    G --> K["Migrate conventions"]
    H --> L{"Required conventions complete?"}
    K --> M["Write confirmed conventions"]
    L --> N["Complete"]
    L --> O["Complete missing conventions in setup"]
    J --> M
    O --> M
    M --> P["Load lifecycle hooks"]
    N --> P
    P --> Q["Continue"]
    I --> R["Stop and update the skill"]
```
