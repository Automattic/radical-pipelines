(() => {
  const logEl = document.getElementById('live-log');
  const treeEl = document.getElementById('live-tree');
  if (!logEl || !treeEl) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const phases = [
    {
      phase: 'phase 0',
      task: 'prompt-writer',
      reads: [],
      writes: ['prompt.md'],
      runMs: 900,
      sec: 4,
      tokens: '1.1k',
      treeIdx: [0],
    },
    {
      phase: 'phase 1',
      task: 'spec-writer',
      reads: ['prompt.md', 'requirements.md'],
      writes: ['spec.md'],
      runMs: 1400,
      sec: 84,
      tokens: '12.4k',
      treeIdx: [1, 2],
      reqFirst: true,
    },
    {
      phase: 'phase 1',
      task: 'spec-reviewer',
      reads: ['spec.md', 'prompt.md'],
      writes: ['spec-review-approved.md'],
      runMs: 1100,
      sec: 41,
      tokens: '7.8k',
      treeIdx: [3],
      verdict: 'approved',
    },
    {
      phase: 'phase 2',
      task: 'design-writer',
      reads: ['spec.md'],
      writes: ['design-doc.md'],
      runMs: 1400,
      sec: 112,
      tokens: '18.9k',
      treeIdx: [4],
    },
    {
      phase: 'phase 2',
      task: 'design-reviewer',
      reads: ['design-doc.md', 'spec.md'],
      writes: ['design-doc-review-approved.md'],
      runMs: 1000,
      sec: 47,
      tokens: '9.2k',
      treeIdx: [5],
      verdict: 'approved',
    },
    {
      phase: 'phase 3',
      task: 'code-plan-writer',
      reads: ['spec.md', 'design-doc.md'],
      writes: ['code-plan.md'],
      runMs: 1300,
      sec: 74,
      tokens: '11.7k',
      treeIdx: [6],
    },
    {
      phase: 'phase 3',
      task: 'code-plan-reviewer',
      reads: ['code-plan.md', 'design-doc.md'],
      writes: ['code-plan-review-approved.md'],
      runMs: 900,
      sec: 38,
      tokens: '6.4k',
      treeIdx: [7],
      verdict: 'approved',
    },
    {
      phase: 'phase 4',
      task: 'code-writer',
      reads: ['code-plan.md', 'design-doc.md'],
      writes: ['src/orchestrator.ts (+218)', 'src/orchestrator.test.ts (+162)'],
      runMs: 1900,
      sec: 412,
      tokens: '64.1k',
      treeIdx: [8],
      bash: ['npm test', 'git commit -m "Add orchestrator (code-writer)"'],
    },
    {
      phase: 'phase 4',
      task: 'code-reviewer',
      reads: ['src/orchestrator.ts', 'code-plan.md'],
      writes: ['code-review-approved.md'],
      runMs: 1100,
      sec: 96,
      tokens: '14.3k',
      treeIdx: [9],
      verdict: 'approved',
    },
    {
      phase: 'phase 5',
      task: 'doc-writer',
      reads: ['README.md', 'spec.md'],
      writes: ['README.md (updated)', 'docs/orchestrator.md'],
      runMs: 1200,
      sec: 89,
      tokens: '8.7k',
      treeIdx: [10],
    },
    {
      phase: 'phase 5',
      task: 'doc-reviewer',
      reads: ['README.md', 'docs/orchestrator.md'],
      writes: ['docs-review-approved.md'],
      runMs: 800,
      sec: 31,
      tokens: '4.9k',
      treeIdx: [11],
      verdict: 'approved',
    },
  ];

  const pendingTree = [
    'prompt.md',
    'requirements.md',
    'spec.md',
    'spec-review-approved.md',
    'design-doc.md',
    'design-doc-review-approved.md',
    'code-plan.md',
    'code-plan-review-approved.md',
    'src/orchestrator.ts + test',
    'code-review-approved.md',
    'README.md, docs/',
    'docs-review-approved.md',
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
      line(logEl, 'cc-bullet', '● Bash(git worktree add .pipelines/worktrees/issue-1234 -b issue/1234)');
      line(logEl, 'cc-sub done', '  ⎿  Preparing worktree (new branch \'issue/1234\')');
      line(logEl, 'cc-sub done', '  ⎿  HEAD is now at eda5064');
      line(logEl, 'cc-spacer', '');

      // Tree header
      pendingTree.forEach((f, i) => addPendingFile(f, i));

      await sleep(reduced ? 50 : 800);

      for (const p of phases) {
        await runPhase(p);
      }

      line(
        logEl,
        'cc-summary',
        '● Pipeline complete · 6 phases · 12 artifacts · 17m 8s total'
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
