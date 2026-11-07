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

## design-doc-producer — cb0f0fe8478050192953381396693cdb3cd99422

### Finding 1: changed in cb0f0fe8478050192953381396693cdb3cd99422

The decision no longer stands. A path holding a space is an input `rp`'s own documentation provides for: `scripts/README.md` § Plan, on the base branch too, says "every path is absolute, and a value that may hold spaces ends its line" for the paths `rp` writes for its consumers. I reproduced your transcript at `9c659cdd` (`2-design-doc/design-doc/paths-with-spaces.txt`). In such a repository every command an assignment states fails, which breaks spec-requirement-16's "Run as it states".

design-doc-decision-7 now has every path an assignment puts on a command line written as one POSIX shell word. That covers the script, the pipeline folder, and a thread. A path is written as it is when every character in it is one a shell takes literally, and quoted otherwise. A path the assignment shows for the role to read stays as it is. The later-turn request's thread and the repair request's pipeline folder are read with file tools, where quotes are no part of the path. So the prose uses of `pipeline-folder` and `thread` in `reviewer-later.md` and `reviewer-repair.md` stay unquoted, and only their command-line uses take the shell form. How the templates get both forms is yours. A path that needs no quoting reads the same in both places, so no assignment changes in this repository. The case is gone from § Risks. § Interfaces and the assignments proof in § Verification state the new contract: the stated command runs as written, whatever characters its paths hold.
