# Autonomous loop

This chart mirrors [`reference/run/loop.md`](../../skills/radical-pipelines/reference/run/loop.md): each check selects the first frontier item, dispatches its resolver, stamps landed work, and repeats until close-out, owner escalation, or the valve.

```mermaid
flowchart TD
    A["Run rp check"] --> B{"Complete through the target phase?"}
    B --> C["Close-out"]
    B --> D["Take the first reported item"]
    D --> E{"Item kind"}
    E --> T["Unresolved trigger"]
    E --> P["Pending claim"]
    E --> M["Missing artifact"]
    E --> PL["Production lanes open"]
    E --> S["Stale artifact"]
    E --> W{"Review-wave state"}
    E --> K["Task outside the done-set"]
    E --> R["Missing or stale phase review"]
    E --> N{"Convergence counter"}
    T --> T1["Dispatch the target producer in Adjudicate mode"]
    P --> P1{"Claim target status"}
    P1 --> P2["Dispatch the target producer in Adjudicate mode"]
    P1 --> P3["Resolve the higher claim first"]
    P1 --> P4["Owner escalation"]
    M --> M1["Dispatch the producer in Synthesize mode"]
    PL --> PL1["Each lane: its own frontier, in parallel"]
    PL1 --> PL2["Every lane approved and fresh: Consolidate, then a Consolidation review"]
    PL2 --> L
    S --> S1["Dispatch Synthesize with input changes"]
    W --> W1["Dispatch a review wave"]
    W --> W2["Dispatch the producer after rejection"]
    W --> W3["All lanes approved"]
    W --> W4["An unsatisfiable verdict becomes a trigger"]
    K --> K1["Dispatch the next worker in dependency order"]
    R --> R1["Dispatch the phase reviewer"]
    N --> N1["Audit recurrence or three waves"]
    N --> N2["Valve at six waves"]
    T1 --> L["Land the reported work"]
    P2 --> L
    M1 --> L
    S1 --> L
    W1 --> L
    W2 --> L
    K1 --> L
    R1 --> L
    L --> H["Stamp on landing"]
    H --> A
    P3 --> A
    W3 --> A
    W4 --> A
    N1 --> A
```
