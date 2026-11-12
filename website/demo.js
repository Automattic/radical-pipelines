(() => {
  const logEl = document.getElementById('live-log');
  const treeEl = document.getElementById('live-tree');
  if (!logEl || !treeEl) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const phases = [
    {
      task: 'spec-producer',
      reads: ['intent.md'],
      bash: ['npm run dev  # reproduce the checkout bug'],
      writes: ['spec.md'],
      commit: 'Add spec (spec-producer)',
      runMs: 2000,
      sec: 236,
      tokens: '35.2k',
      treeIdx: [1],
    },
    {
      task: 'design-doc-producer',
      reads: ['spec.md'],
      writes: ['design-doc.md'],
      commit: 'Add design doc (design-doc-producer)',
      runMs: 1800,
      sec: 241,
      tokens: '41.8k',
      treeIdx: [2],
    },
    {
      task: 'implementer',
      reads: ['spec.md', 'design-doc.md'],
      writes: ['src/checkout.ts (+96)', 'src/checkout.test.ts (+71)', 'README.md (updated)', 'notes.md'],
      bash: ['npm test'],
      commit: 'Fix the checkout total (implementer)',
      runMs: 2200,
      sec: 498,
      tokens: '72.4k',
      treeIdx: [3, 4],
    },
    {
      task: 'reviewer default',
      reads: ['intent.md', 'spec.md', 'notes.md', 'net change'],
      action: 'Reviewing…',
      bash: ['npm test', 'npm run dev  # drive the checkout'],
      writes: ['threads/1-reviewer-default-implementer-implementation.md'],
      commit: 'Open review thread (reviewer)',
      runMs: 1400,
      sec: 133,
      tokens: '18.9k',
      treeIdx: [5],
      note: 'finding → implementer: a retry guard no intent outcome needs',
    },
    {
      task: 'implementer',
      reads: ['threads/1-reviewer-default-implementer-implementation.md'],
      writes: ['src/checkout.ts (−38)', 'notes.md'],
      bash: ['npm test'],
      commit: 'Remove the retry guard (implementer)',
      runMs: 1100,
      sec: 74,
      tokens: '9.6k',
      treeIdx: [],
      note: 'replied: changed in 7c1d9e2',
    },
    {
      task: 'reviewer default',
      reads: ['threads/1-reviewer-default-implementer-implementation.md', 'net change'],
      action: 'Verifying…',
      bash: ['npm test'],
      writes: [],
      commit: 'Approve the change (reviewer)',
      runMs: 900,
      sec: 41,
      tokens: '6.3k',
      treeIdx: [],
      note: 'status: closed: approved',
    },
  ];

  const pendingTree = [
    '0-intent/intent.md',
    '1-spec/spec.md',
    '2-design-doc/design-doc.md',
    'src/checkout.ts + test, README.md',
    '3-implementation/notes.md',
    'threads/1-reviewer-default-implementer-implementation.md',
  ];

  const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

  const sleep = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function line(parent, cls, text) {
    const n = el('span', cls, text);
    parent.appendChild(n);
    parent.appendChild(document.createTextNode('\n'));
    return n;
  }

  function fmtDuration(sec) {
    if (sec < 60) return sec + 's';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m + 'm ' + s + 's';
  }

  function addPendingFile(name, idx) {
    const t = el('span', 'tree muted');
    t.textContent = '  ' + name;
    t.dataset.idx = idx;
    treeEl.appendChild(t);
    treeEl.appendChild(document.createTextNode('\n'));
  }

  function commitPending(idx) {
    const t = treeEl.querySelector(`[data-idx="${idx}"]`);
    if (!t) return;
    t.className = 'tree';
    const name = t.textContent.replace(/^\s+/, '');
    t.textContent = '  ' + name;
    t.classList.add('committed');
  }

  async function spinFor(node, ms, suffix) {
    if (reduced) {
      node.textContent = suffix.replace(/^./, '✓');
      return;
    }
    const start = performance.now();
    let i = 0;
    while (performance.now() - start < ms) {
      node.textContent = spinnerFrames[i++ % spinnerFrames.length] + suffix;
      await sleep(80);
    }
  }

  async function runPhase(p) {
    // Header: ● Task(agent)
    line(logEl, 'cc-bullet', '● Task(' + p.task + ')');

    // Sub-lines for reads
    for (const r of p.reads) {
      const lr = line(logEl, 'cc-sub', '');
      await spinFor(lr, 250, '  Reading ' + r);
      lr.textContent = '  ⎿  Read ' + r;
      lr.className = 'cc-sub done';
      await sleep(120);
    }

    // Spinner line for the main action
    const spinLine = line(logEl, 'cc-sub running', '');
    await spinFor(spinLine, p.runMs, '  ' + (p.action || 'Writing ' + p.writes[0]));

    // Replace spinner with commands run and files written
    spinLine.remove();
    const runBash = async (cmds) => {
      for (const b of cmds) {
        const lb = line(logEl, 'cc-sub bash', '');
        await spinFor(lb, 350, '  $ ' + b);
        lb.textContent = '  ⎿  $ ' + b;
        lb.className = 'cc-sub done';
      }
    };
    if (p.bash) await runBash(p.bash);
    for (const w of p.writes) {
      line(logEl, 'cc-sub done', '  ⎿  Wrote ' + w);
    }
    await runBash(['git commit -m "' + p.commit + '"']);
    if (p.note) {
      line(logEl, 'cc-sub verdict', '  ⎿  ' + p.note);
    }

    // Done line with timing
    line(
      logEl,
      'cc-done',
      '  ✓ Done (' + fmtDuration(p.sec) + ' · ' + p.tokens + ' tokens)'
    );
    line(logEl, 'cc-spacer', '');

    // Mark tree
    for (const idx of p.treeIdx) commitPending(idx);

    autoScroll();
    await sleep(reduced ? 30 : 280);
  }

  function autoScroll() {
    logEl.scrollTop = logEl.scrollHeight;
    treeEl.scrollTop = treeEl.scrollHeight;
  }

  async function run() {
    while (true) {
      logEl.innerHTML = '';
      treeEl.innerHTML = '';

      // Header
      line(logEl, 'cc-prompt', '> work on issue #1234');
      line(logEl, 'cc-spacer', '');
      line(logEl, 'cc-bullet', '● Bash(git worktree add .worktrees/1234-fix-checkout -b 1234-fix-checkout)');
      line(logEl, 'cc-sub done', '  ⎿  Preparing worktree (new branch \'1234-fix-checkout\')');
      line(logEl, 'cc-sub done', '  ⎿  HEAD is now at eda5064');
      line(logEl, 'cc-sub done', '  ⎿  Captured issue #1234 → 0-intent/intent.md (phase 0 · intent)');
      line(logEl, 'cc-sub done', '  ⎿  Wrote config.json (target: review)');
      line(logEl, 'cc-spacer', '');

      // Tree header
      pendingTree.forEach((f, i) => addPendingFile(f, i));
      // Phase 0 is the intent the orchestrator records on the owner's approval, not produced by a role.
      commitPending(0);

      await sleep(reduced ? 50 : 800);

      for (const p of phases) {
        await runPhase(p);
      }

      line(
        logEl,
        'cc-summary',
        '● Pipeline complete · review approved · 1 thread · 20m 23s total'
      );
      autoScroll();

      if (reduced) return;
      await sleep(5500);
    }
  }

  let started = false;
  const startOnce = () => {
    if (started) return;
    started = true;
    run();
  };

  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            startOnce();
            obs.disconnect();
          }
        }
      },
      { rootMargin: '200px' }
    );
    obs.observe(logEl);
  } else {
    startOnce();
  }
})();
