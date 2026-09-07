# Autonomous loop

This chart mirrors [`reference/run/loop.md`](../../skills/radical-pipelines/reference/run/loop.md): each check selects the first frontier item, dispatches its resolver, stamps landed work, and repeats until close-out or owner escalation.

```mermaid
flowchart TD
    A["Run rp check"] --> STATUS["Treat complete-through-phase as status; read frontier"]
    STATUS --> B["Take the first frontier item"]
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
    C -->|build or document review| PR["Run the review-wave procedure with the phase reviewer"]
    C -->|no task files| NOTASK["Re-dispatch the plan producer"]
    C -->|INVALID REVIEW or REPORT| ATTEMPT["Have the attempt's agent finish the same file"]
    C -->|INVALID FRONTMATTER| FRONTMATTER["Orchestrator repairs the frontmatter, then re-stamps the file"]
    C -->|INVALID LINE| LINE["Have the file's author fix it"]
    C -->|invalid plan| INVALIDPLAN["Dispatch the plan producer: Adjudicate"]
    C -->|tasks held| HELD["Dispatch the plan producer: Adjudicate with failed reports"]
    C -->|adjudicated triggers or claims awaiting approval| AWAITING["Run a review wave for each named artifact"]
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
    ATTEMPT --> LAND
    FRONTMATTER --> A
    LINE --> LAND
    INVALIDPLAN --> LAND
    HELD --> LAND
    AWAITING --> LAND
    LAND --> STAMP["Stamp before publication; repair frontmatter or return other INVALID results to the author; merge lane branches; fire phase hooks"]
    STAMP --> A
    ST --> A
    UNCLAIMED --> A
```
