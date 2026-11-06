# Owner escalation

This chart mirrors [`reference/run/loop.md`](../../skills/radical-pipelines/reference/run/loop.md) § Owner escalation and [`reference/run/state.md`](../../skills/radical-pipelines/reference/run/state.md) § Owner territory: only a disagreement about what the intent means or demands, or evidence that every kind of approach fails an intent goal or constraint, reaches the owner, and the answer returns as later input.

```mermaid
flowchart TD
    A["A thread to owner about intent has status disagreement and a cites: line"] --> B["rp check names escalate thread"]
    B --> C["Fire escalation-raised"]
    C --> D["Close-out: stop the run with the dossier — the thread and what its cites: line names, verbatim, and the intent items and artifact clauses they cite"]
    D --> E["Explain the choice and its consequences to the owner"]
    E --> F["The owner answers; a later triage routes the answer to this pipeline"]
    F --> G{"The owner rules the answer"}
    G -->|Binding| H["Write a constraint"]
    G -->|Open to investigation| I["Write a proposal"]
    H --> J["origin names the thread; target names the disputed artifact or clause; commit"]
    I --> J
    J --> K["Append a message headed owner with that commit, naming the input; set status answered; commit"]
    K --> L["The target is stale; the loop continues"]
```
