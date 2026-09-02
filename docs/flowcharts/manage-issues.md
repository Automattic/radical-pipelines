# Manage issues

This chart mirrors [`reference/entries/manage-issues.md`](../../skills/radical-pipelines/reference/entries/manage-issues.md): the orchestrator conducts a short Q&A, obtains approval, and writes through the Issues convention.

```mermaid
flowchart TD
    A["Frame the short Q&A"] --> B{"Modify an existing issue?"}
    B --> C["Read and show the current issue"]
    B --> D["Ask for the goal as an outcome"]
    C --> D
    D --> E["Invite constraints, context, and hunches once"]
    E --> F["Sort the extra information"]
    F --> G["Reflect hypotheses back as open"]
    G --> H{"Create a new issue?"}
    H --> I["Search for related issues"]
    H --> K["Render the draft"]
    I --> J["Owner chooses duplicate, modify, or link"]
    J --> K
    K --> L{"Owner approves?"}
    L --> M["Revise the draft"]
    M --> L
    L --> N["Write through the Issues convention"]
    N --> O["Report the issue reference"]
```
