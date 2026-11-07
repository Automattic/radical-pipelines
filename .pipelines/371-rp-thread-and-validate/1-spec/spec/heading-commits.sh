#!/bin/sh
# For every message heading added to a thread file in this repository's history,
# compare the commit it names with the parent of the commit that added it.
for f in $(git log --all --format= --name-only -- '.pipelines/*/threads/*.md' | sort -u); do
  git log --all --reverse --format='%H %s' -- "$f" | while read c subj; do
    git diff "$c^" "$c" -- "$f" 2>/dev/null | grep -E '^\+## [^ ]+ — [0-9a-f]+' | while read -r line; do
      named=$(printf '%s\n' "$line" | awk '{print $NF}')
      parent=$(git rev-parse "$c^")
      full=$(git rev-parse --verify -q "$named^{commit}" || echo unresolved)
      if [ "$full" = "$parent" ]; then rel=parent
      elif [ "$full" = unresolved ]; then rel=unresolved
      elif git merge-base --is-ancestor "$full" "$parent" 2>/dev/null; then rel="ancestor-of-parent($(git rev-list --count $full..$parent) behind)"
      else rel="not-ancestor-of-parent (msg: $(git log -1 --format=%s $full))"; fi
      author=$(printf '%s\n' "$line" | awk '{print $2}')
      echo "$(echo $f | cut -d/ -f2 | cut -c1-3) $(basename $f) | ${c%${c#????????}} $subj | $author ${named%${named#????????}} | $rel"
    done
  done
done
