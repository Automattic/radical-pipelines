(() => {
  const logEl = document.getElementById('live-log');
  const treeEl = document.getElementById('live-tree');
  if (!logEl || !treeEl) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const phases = [
    {
      phase: 'phase 1',
      task: 'spec-analyst',
      reads: ['intent.md'],
      writes: ['spec-research.md'],
      runMs: 1500,
      sec: 128,
      tokens: '21.3k',
      treeIdx: [1],
    },
    {
      phase: 'phase 1',
      task: 'spec-writer',
      reads: ['intent.md', 'spec-research.md'],
      writes: ['spec.md'],
      runMs: 1400,
      sec: 84,
      tokens: '12.4k',
      treeIdx: [2],
    },
    {
      phase: 'phase 1',
      task: 'spec-reviewer',
      reads: ['spec.md', 'spec-research.md'],
      writes: ['spec-review-approved.md'],
      runMs: 1100,
      sec: 41,
      tokens: '7.8k',
      treeIdx: [3],
      verdict: 'approved',
    },
    {
      phase: 'phase 2',
      task: 'design-doc-analyst',
      reads: ['spec.md', 'spec-research.md'],
      writes: ['design-doc-research.md'],
      runMs: 1500,
      sec: 146,
      tokens: '24.6k',
      treeIdx: [4],
    },
    {
      phase: 'phase 2',
      task: 'design-doc-writer',
      reads: ['spec.md', 'design-doc-research.md'],
      writes: ['design-doc.md'],
      runMs: 1400,
      sec: 112,
      tokens: '18.9k',
      treeIdx: [5],
    },
    {
      phase: 'phase 2',
      task: 'design-doc-reviewer',
      reads: ['design-doc.md', 'spec.md'],
      writes: ['design-doc-review-approved.md'],
      runMs: 1000,
      sec: 47,
      tokens: '9.2k',
      treeIdx: [6],
      verdict: 'approved',
    },
    {
      phase: 'phase 3',
      task: 'build-plan-writer',
      reads: ['spec.md', 'design-doc.md'],
      writes: ['build-plan.md'],
      runMs: 1300,
      sec: 74,
      tokens: '11.7k',
      treeIdx: [7],
    },
    {
      phase: 'phase 3',
      task: 'build-plan-reviewer',
      reads: ['build-plan.md', 'design-doc.md'],
      writes: ['build-plan-review-approved.md'],
      runMs: 900,
      sec: 38,
      tokens: '6.4k',
      treeIdx: [8],
      verdict: 'approved',
    },
    {
      phase: 'phase 3',
      task: 'build-writer-tdd',
      reads: ['build-plan.md'],
      writes: ['src/orchestrator.ts (+218)', 'src/orchestrator.test.ts (+162)'],
      runMs: 1900,
      sec: 412,
      tokens: '64.1k',
      treeIdx: [9],
      bash: ['npm test', 'git commit -m "Add orchestrator (build-writer-tdd)"'],
    },
    {
      phase: 'phase 3',
      task: 'build-reviewer',
      reads: ['src/orchestrator.ts', 'build-plan.md'],
      writes: ['build-review-approved.md', 'build-summary.md'],
      runMs: 1100,
      sec: 96,
      tokens: '14.3k',
      treeIdx: [10, 11],
      verdict: 'approved',
    },
    {
      phase: 'phase 4',
      task: 'document-plan-writer',
      reads: ['build-summary.md', 'spec.md'],
      writes: ['document-plan.md'],
      runMs: 1100,
      sec: 61,
      tokens: '9.4k',
      treeIdx: [12],
    },
    {
      phase: 'phase 4',
      task: 'document-plan-reviewer',
      reads: ['document-plan.md', 'build-summary.md'],
      writes: ['document-plan-review-approved.md'],
      runMs: 850,
      sec: 33,
      tokens: '5.6k',
      treeIdx: [13],
      verdict: 'approved',
    },
    {
      phase: 'phase 4',
      task: 'document-writer',
      reads: ['document-plan.md', 'README.md'],
      writes: ['README.md (updated)', 'docs/orchestrator.md'],
      runMs: 1200,
      sec: 89,
      tokens: '8.7k',
      treeIdx: [14],
    },
    {
      phase: 'phase 4',
      task: 'document-reviewer',
      reads: ['README.md', 'docs/orchestrator.md'],
      writes: ['document-review-approved.md', 'document-summary.md'],
      runMs: 800,
      sec: 31,
      tokens: '4.9k',
      treeIdx: [15, 16],
      verdict: 'approved',
    },
  ];

  const pendingTree = [
    '0-intent/intent.md',
    '1-spec/spec-research.md',
    '1-spec/spec.md',
    '1-spec/spec-review-approved.md',
    '2-design-doc/design-doc-research.md',
    '2-design-doc/design-doc.md',
    '2-design-doc/design-doc-review-approved.md',
    '3-build/build-plan.md',
    '3-build/build-plan-review-approved.md',
    'src/orchestrator.ts + test',
    '3-build/build-review-approved.md',
    '3-build/build-summary.md',
    '4-document/document-plan.md',
    '4-document/document-plan-review-approved.md',
    'README.md, docs/',
    '4-document/document-review-approved.md',
    '4-document/document-summary.md',
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
    await spinFor(spinLine, p.runMs, '  ' + (p.verdict ? 'Reviewing…' : 'Writing ' + p.writes[0]));

    // Replace spinner with done writes
    spinLine.remove();
    for (const w of p.writes) {
      line(logEl, 'cc-sub done', '  ⎿  Wrote ' + w);
    }
    if (p.bash) {
      for (const b of p.bash) {
        const lb = line(logEl, 'cc-sub bash', '');
        await spinFor(lb, 350, '  $ ' + b);
        lb.textContent = '  ⎿  $ ' + b;
        lb.className = 'cc-sub done';
      }
    }
    if (p.verdict) {
      line(logEl, 'cc-sub verdict', '  ⎿  Verdict: ' + p.verdict);
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
      line(logEl, 'cc-spacer', '');

      // Tree header
      pendingTree.forEach((f, i) => addPendingFile(f, i));
      // Phase 0 is the raw intent — an input, already in place, not produced by an agent.
      commitPending(0);

      await sleep(reduced ? 50 : 800);

      for (const p of phases) {
        await runPhase(p);
      }

      line(
        logEl,
        'cc-summary',
        '● Pipeline complete · 5 phases · 17 artifacts · 23m 12s total'
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
