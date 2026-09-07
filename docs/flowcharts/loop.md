# Autonomous loop

This chart mirrors [`reference/run/loop.md`](../../skills/radical-pipelines/reference/run/loop.md): each check selects the first frontier item, dispatches its resolver, stamps landed work, and repeats until close-out or owner escalation.

```mermaid
flowchart TD
    A["Run rp check"] --> B["Take the first frontier item"]
    B --> C{"Frontier"}
    C -->|trigger| T["Dispatch target producer: Adjudicate"]
    C -->|claim: owner escalation| OE["Surface the dossier and pause"]
    C -->|claim| CL["Dispatch target producer: Adjudicate"]
    C -->|synthesize artifact| S["Dispatch producer: Synthesize"]
    C -->|stamp file| ST["Stamp its pins or mirrors"]
    C -->|re-synthesize artifact| RS["Dispatch producer: Synthesize with input changes"]
    C -->|review wave| RW["Run the review-wave procedure"]
    C -->|adjudicate artifact| ADJ["Dispatch producer: Adjudicate with every review lane"]
    C -->|consolidate artifact| CON["Dispatch producer: Consolidate"]
    C -->|task| TASK["Dispatch its worker"]
    C -->|blocked task| BLOCKED["Restore what the report names; dispatch its worker"]
    C -->|build or document review| PR["Dispatch the phase reviewer"]
    C -->|no task files| NOTASK["Re-dispatch the plan producer"]
    C -->|invalid target| TARGET["Re-dispatch the file's author"]
    C -->|INVALID REVIEW or REPORT| ATTEMPT["Have the attempt's agent finish the same file"]
    C -->|invalid plan or reports| INVALID["Dispatch the plan producer: Adjudicate"]
    C -->|unclaimed commits| UNCLAIMED["Tell the owner: claim them in a report or revert them"]
    C -->|undeclared lane or symlink| DEFECT["Stop and tell the owner"]
    C -->|complete| CLOSE["Close-out"]
    T --> LAND["Verify and land agent commits"]
    CL --> LAND
    S --> LAND
    RS --> LAND
    RW --> LAND
    ADJ --> LAND
    CON --> LAND
    TASK --> LAND
    BLOCKED --> LAND
    PR --> LAND
    NOTASK --> LAND
    TARGET --> LAND
    ATTEMPT --> LAND
    INVALID --> LAND
    LAND --> STAMP["Stamp; merge lane branches; fire phase hooks"]
    STAMP --> A
    ST --> A
    UNCLAIMED --> A
```
