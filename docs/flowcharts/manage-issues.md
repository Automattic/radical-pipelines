# Manage issues

This chart mirrors [`reference/entries/manage-issues.md`](../../skills/radical-pipelines/reference/entries/manage-issues.md): the orchestrator conducts a short Q&A with the owner and writes the issue through the Issues convention.

```mermaid
flowchart TD
    A["Frame the short Q&A"] --> B{"Modify an existing issue?"}
    B -->|Yes| C["Read the current issue and show it"]
    B -->|No| D
    C --> D["Ask for the goal, pressing until it is an outcome rather than a solution"]
    D --> E["Invite constraints, context, and hunches once"]
    E --> F["Sort the answer into Constraints, Context, and Proposals"]
    F --> H{"Create a new issue?"}
    H -->|Yes| I["Search for related issues"]
    I --> IA["Annotate matches with their pipelines and state"]
    IA --> J{"Owner chooses"}
    J -->|Proceed| N
    J -->|Link a match| LINK["Add it to Context"]
    LINK --> N
    J -->|Modify an existing issue| C
    H -->|No| N["Write through the Issues convention"]
    N --> O["Report the issue reference"]
```
