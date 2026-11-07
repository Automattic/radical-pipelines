#!/bin/sh
# For every commit that changed a thread file: status before and after, headings added,
# and the role named in the commit subject, against the thread's opener and owner.
for f in $(git log --all --format= --name-only -- '.pipelines/*/threads/*.md' | sort -u); do
  git log --all --reverse --format='%H' -- "$f" | while read c; do
    subj=$(git log -1 --format=%s $c)
    before=$(git show "$c^:$f" 2>/dev/null | grep -m1 '^status:' | awk '{print $2}')
    after=$(git show "$c:$f" 2>/dev/null | grep -m1 '^status:' | awk '{print $2}')
    added=$(git diff "$c^" "$c" -- "$f" | grep -cE '^\+## ')
    echo "$(echo $f | cut -d/ -f2 | cut -c1-3) $(basename $f .md) | ${before:-new}->${after:-gone} +${added}msg | $(echo $c | cut -c1-8) $subj"
  done
done
