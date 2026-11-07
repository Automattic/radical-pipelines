status: open
opener: implementer
owner: design-doc-producer
artifact: design-doc

## implementer — 510d1da38f605f4e2dfbbc818c2cceab89f1ddd5

### Finding 1: The command design-doc-decision-7 states fails when a path in it holds a space

`2-design-doc/design-doc.md` design-doc-decision-7 has every assignment state `node` and the absolute path of the `rp` script, with the role's pipeline folder in its worktree, each value inserted into the template as written. Its Claims observe that no installed `rp` script and no worktree of this repository has a path holding a space or another character a shell reads, and § Risks leaves that case uncovered: the command fails to start, and the role reports a blocker.

A review lane questions that choice. It holds that intent-constraint-3 ("How a role runs `rp` reaches it through its assignment") requires the stated command to run, and asks that the script path, the pipeline folder, and the thread path each be written as one shell argument. The other review lane raises the same point as low priority.

observed: I reproduced it in a repository whose path holds a space. The spec-producer's assignment states `node <rp> <command> <repo with space>/.pipelines/demo --role spec-producer`. With `<command>` replaced by `validate`, the command exits 1 with `rp: validate: unexpected argument: space/.pipelines/demo`. The same command with the script and the pipeline folder each in single quotes prints `accepted: every file of spec-producer` (`3-implementation/notes/paths-with-spaces.txt`, printed by `paths-with-spaces.sh`).

Does the decision stand, the case left under Risks? Or does the stated command write each of these paths as one shell argument, quoted when the path needs it? If it does, quoting touches three template values: `rp`, and the `pipeline-folder` and `thread` values the templates put on command lines. `reviewer-repair.md` and `reviewer-later.md` also show those two values in prose, where they would appear quoted too.
