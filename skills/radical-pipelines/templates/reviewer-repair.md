Your worktree is on branch `{{branch}}`, at `{{turn-commit}}`. `rp check` rejects these files you wrote, at these paths in `{{pipeline-folder}}`:

{{malformed-files}}

Fix each file, changing only what its reason names and keeping every message it holds. This turn asks for nothing else. Before ending your turn, run this command and fix each file it reports:

```
{{rp}} validate {{pipeline-folder-arg}} --role {{role}}
```

Commit your fix with this commit format:

{{commit-format}}
{{#facts}}

A name in braces left in this request is a placeholder: replace it with the value it stands for, from these values of your turn:

{{facts}}
{{/facts}}

When your worktree, your branch, or a file this assignment names is broken or missing, report what failed and stop.

End your turn only after every command and subagent you started has finished, and end it with the exact statement "Completion declared: no work remains."
