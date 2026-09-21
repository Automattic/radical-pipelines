# Autonomous loop

This chart mirrors [`reference/run/loop.md`](../../skills/radical-pipelines/reference/run/loop.md): each check selects the first frontier item, dispatches its resolver, stamps landed work, and repeats until close-out or owner escalation.

```mermaid
flowchart TD
    A["Run rp check"] --> STATUS["Treat complete-through-phase as status; read frontier"]
    STATUS --> B["Take the first frontier item"]
    B --> C{"Frontier"}
    C -->|claim: owner escalation| OE["Surface the dossier and pause"]
    C -->|converge artifact| S["Dispatch producer: Converge with its input changes, the closed wave's reviews, and its pending challenges"]
    C -->|stamp file| ST["Stamp its pins or mirrors"]
    C -->|review wave| RW["Run the review-wave procedure"]
    C -->|consolidate artifact| CON["Dispatch producer: Consolidate"]
    C -->|task| TASK["Dispatch its worker"]
    C -->|blocked task| BLOCKED["Restore what the report names; dispatch its worker"]
    C -->|build or document review| PR["Run the review-wave procedure with the phase reviewer"]
    C -->|no task files| NOTASK["Re-dispatch the plan producer"]
    C -->|INVALID REVIEW or REPORT| ATTEMPT["Have the attempt's agent finish the same file"]
    C -->|INVALID FRONTMATTER| FRONTMATTER["Orchestrator repairs the frontmatter, then re-stamps the file"]
    C -->|INVALID LINE or IDS| LINE["Have the file's author fix it"]
    C -->|invalid plan| INVALIDPLAN["Dispatch the plan producer: Converge"]
    C -->|adjudicated challenges or claims awaiting approval| AWAITING["Run a review wave for each named artifact"]
    C -->|unclaimed commits| UNCLAIMED["Tell the owner: claim them in a report or revert them"]
    C -->|undeclared lane or symlink| DEFECT["Stop and tell the owner"]
    C -->|complete| CLOSE["Close-out"]
    S --> LAND["Verify and land agent commits"]
    RW --> LAND
    CON --> LAND
    TASK --> LAND
    BLOCKED --> LAND
    PR --> LAND
    NOTASK --> LAND
    ATTEMPT --> LAND
    FRONTMATTER --> A
    LINE --> LAND
    INVALIDPLAN --> LAND
    AWAITING --> LAND
    LAND --> STAMP["Stamp before publication; repair frontmatter or return other INVALID results to the author; merge lane branches; fire phase hooks"]
    STAMP --> A
    ST --> A
    UNCLAIMED --> A
```
