(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= intro overlay ================= */
  const intro = $('#intro');
  if (intro) {
    if (RM) {
      intro.remove();
      document.body.classList.add('ready');
    } else {
      setTimeout(() => document.body.classList.add('ready'), 1500);
      setTimeout(() => intro.classList.add('lift'), 1800);
      setTimeout(() => intro.remove(), 2900);
    }
  } else {
    document.body.classList.add('ready');
  }

  /* ================= nav ================= */
  const nav = $('#nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 24);
  }, { passive: true });

  /* ================= scroll reveal ================= */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  $$('.reveal').forEach((el) => io.observe(el));

  /* ================= hero orb parallax ================= */
  const hero = $('#hero');
  if (hero && !RM) {
    hero.addEventListener('mousemove', (e) => {
      const dx = e.clientX / window.innerWidth - 0.5;
      const dy = e.clientY / window.innerHeight - 0.5;
      $$('.orb', hero).forEach((o, i) => {
        const f = (i + 1) * 9;
        o.style.transform = `translate(${dx * f}px, ${dy * f}px)`;
      });
    });
  }

  /* ================= demo engine ================= */
  const logEl = $('#log');
  const runBtn = $('#runBtn');
  const resetBtn = $('#resetBtn');
  const caseStatus = $('#caseStatus');
  const caseframe = $('#caseframe');
  const stepChips = $$('.stepchip');
  const agents = ['scout', 'smith', 'judge'];
  const pills = {}, cards = {}, snips = {};
  agents.forEach((a) => {
    pills[a] = $('#pill-' + a);
    cards[a] = $('#card-' + a);
    snips[a] = $('#snip-' + a);
  });
  const verdictEmpty = $('#verdictEmpty');
  const verdictBody = $('#verdictBody');
  const diffwrap = $('#diffwrap');
  const diffToggle = $('#diffToggle');
  const diffState = $('#diffState');

  const PILL_TEXT = { idle: 'IDLE', thinking: 'THINKING', done: 'DONE' };
  const TAG_LABEL = { system: 'SYSTEM', scout: 'SCOUT', smith: 'SMITH', judge: 'JUDGE' };
  const MODEL = { scout: 'qwen-groq', smith: 'gpt-oss-groq', judge: 'nemotron-ultra' };

  let running = false;
  let speed = 1;
  let vtime = 0;
  let councilCalls = [];

  const sleep = (ms) => new Promise((r) => setTimeout(r, RM ? Math.min(ms, 60) : ms / speed));
  const fmtT = (s) =>
    'T+' + String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  function logCall(agent, role, extra = {}) {
    councilCalls.push({ agent: agent[0].toUpperCase() + agent.slice(1), model: MODEL[agent], role, at: fmtT(vtime), ...extra });
  }

  function setStep(n) {
    stepChips.forEach((c, i) => {
      c.classList.toggle('active', i === n - 1);
      c.classList.toggle('done', i < n - 1);
    });
  }

  function setPill(agent, state) {
    pills[agent].className = 'pill ' + state;
    pills[agent].textContent = PILL_TEXT[state];
    cards[agent].classList.toggle('thinking', state === 'thinking');
  }

  function setSnippet(agent, text) { snips[agent].textContent = text; }

  function dim(agent, on) { cards[agent].classList.toggle('dimmed', on); }

  function scrollLog() { logEl.scrollTop = logEl.scrollHeight; }

  function addEntry({ tag = 'system', title = '', cls = '' }) {
    const entry = document.createElement('div');
    entry.className = 'entry' + (cls ? ' ' + cls : '');
    entry.innerHTML =
      `<div class="entry-meta"><span class="t">${fmtT(vtime)}</span><span class="tag tag-${tag}">${TAG_LABEL[tag]}</span>` +
      (title ? `<span class="entry-title">${title}</span>` : '') +
      `</div><p class="entry-text"></p>`;
    logEl.appendChild(entry);
    scrollLog();
    return $('.entry-text', entry);
  }

  async function typeText(el, text) {
    if (RM) { el.textContent = text; scrollLog(); return; }
    const caret = document.createElement('span');
    caret.className = 'caret';
    el.appendChild(caret);
    const step = Math.max(1, Math.round(speed));
    for (let i = 0; i < text.length; i += step) {
      caret.before(document.createTextNode(text.slice(i, i + step)));
      scrollLog();
      await new Promise((r) => setTimeout(r, 14));
    }
    caret.remove();
  }

  function addStatic({ tag = 'system', title = '', text = '', cls = '', html = false }) {
    const el = addEntry({ tag, title, cls });
    if (html) el.innerHTML = text; else el.textContent = text;
    scrollLog();
    return el;
  }

  async function addTyped({ tag = 'system', title = '', text = '', cls = '' }) {
    const el = addEntry({ tag, title, cls });
    await typeText(el, text);
  }

  /* ---- fuzz counter effect ---- */
  async function fuzzCounter() {
    const el = addEntry({ tag: 'system', title: 'Mutation loop' });
    el.innerHTML = 'iteration <b id="fuzzN">0</b> &middot; no crash yet&hellip;';
    const n = $('#fuzzN');
    const target = 1342;
    if (RM) { n.textContent = target.toLocaleString(); return; }
    const dur = 1700 / speed;
    const t0 = performance.now();
    await new Promise((res) => {
      (function tick(now) {
        const p = Math.min(1, (now - t0) / dur);
        n.textContent = Math.floor(p * target).toLocaleString();
        if (p < 1) requestAnimationFrame(tick); else res();
      })(t0);
    });
  }

  /* ---- verify checklist effect ---- */
  async function verifyChecklist() {
    const el = addEntry({ tag: 'system', title: 'Ground truth — real execution' });
    const box = document.createElement('div');
    el.appendChild(box);
    const rows = [
      ['Rebuild patched binary', 'ok'],
      ['Re-run minimized crash input', 'no crash'],
      ['Regression corpus', 'count'],
      ['Replay determinism (5×)', '5/5 consistent'],
    ];
    for (const [label, result] of rows) {
      const row = document.createElement('div');
      row.className = 'vrow';
      row.innerHTML = `<span class="vspin"></span><span class="vlabel">${label}</span><span class="vres"></span>`;
      box.appendChild(row);
      scrollLog();
      await sleep(result === 'count' ? 1100 : 700);
      $('.vspin', row).outerHTML = '<span class="vcheck">✓</span>';
      const res = $('.vres', row);
      if (result === 'count') {
        const total = 24;
        if (RM) { res.textContent = `${total}/${total} passed`; }
        else {
          const t0 = performance.now();
          await new Promise((r2) => {
            (function tick(now) {
              const p = Math.min(1, (now - t0) / (700 / speed));
              res.textContent = `${Math.floor(p * total)}/${total} passed`;
              if (p < 1) requestAnimationFrame(tick); else r2();
            })(t0);
          });
        }
      } else {
        res.textContent = result;
      }
      scrollLog();
    }
  }

  /* ---- verdict fill ---- */
  function fillVerdict() {
    verdictEmpty.classList.add('hidden');
    verdictBody.classList.remove('hidden');
    $('#v-status').textContent = 'VERIFIED';
    $('#v-regress').textContent = '24 / 24 passed';
    $('#v-det').textContent = '5 / 5 consistent';
    $('#v-risk').textContent =
      'Fix scoped to read_u32. Sibling parsers (read_u16, read_u64) share the pattern — not yet scanned.';
    $$('.vfield').forEach((f, i) => (f.style.animationDelay = `${0.25 + i * 0.18}s`));
  }

  /* ---- reset ---- */
  function reset() {
    logEl.innerHTML =
      '<div class="entry"><div class="entry-meta"><span class="t">T+00:00</span><span class="tag tag-system">SYSTEM</span></div>' +
      '<p class="entry-text">Case file opened. Press <strong>Run campaign</strong> to begin the hunt.</p></div>';
    agents.forEach((a) => { setPill(a, 'idle'); setSnippet(a, 'Standing by.'); dim(a, false); });
    stepChips.forEach((c) => c.classList.remove('active', 'done'));
    verdictEmpty.classList.remove('hidden');
    verdictBody.classList.add('hidden');
    diffwrap.classList.remove('open');
    diffToggle.classList.remove('ready');
    diffToggle.setAttribute('aria-expanded', 'false');
    diffState.textContent = 'available after certification';
    caseframe.classList.remove('certified');
    caseStatus.textContent = 'STANDBY';
    caseStatus.className = 'st-standby';
    councilCalls = [];
    vtime = 0;
    runBtn.textContent = 'Run campaign';
    runBtn.disabled = false;
  }

  /* ---- the campaign ---- */
  async function run() {
    if (running) return;
    reset();
    running = true;
    runBtn.disabled = true;
    runBtn.textContent = 'Running…';
    caseStatus.textContent = 'RUNNING';
    caseStatus.className = 'st-running';

    /* Step 1 — Twin build */
    setStep(1);
    addStatic({ title: 'Twin build', text: 'Spinning up Docker twin — gcc 13.2, AddressSanitizer enabled.' });
    await sleep(1100);
    vtime += 4;
    addStatic({ text: 'Target compiled: parser.c → parser_asan · seed + regression corpora mounted (12 files).' });
    await sleep(900);

    /* Step 2 — Plan (Judge) */
    setStep(2);
    setPill('judge', 'thinking');
    setSnippet('judge', 'Drafting campaign plan…');
    await sleep(1500);
    vtime += 7;
    await addTyped({ tag: 'judge', title: 'Plan', text: 'Task plan locked — invariant: “no out-of-bounds access”. Budget: 200 fuzz attempts · 120s.' });
    setPill('judge', 'done');
    setSnippet('judge', 'Plan locked · budget 200 attempts');
    logCall('judge', 'plan');
    await sleep(700);

    /* Step 3 — Fuzz */
    setStep(3);
    setPill('judge', 'idle');
    await fuzzCounter();
    vtime += 38;
    await sleep(350);
    addStatic({ cls: 'crash', html: '⚠ CRASH — heap-buffer-overflow · READ of size 4 at <b>parser.c:214</b>' });
    await sleep(900);
    vtime += 6;
    addStatic({ text: 'Delta-debug: crashing input shrunk 4,096 B → 9 B minimal reproducer.' });
    await sleep(900);

    /* Step 4 — Triage (Scout) */
    setStep(4);
    setPill('scout', 'thinking');
    setSnippet('scout', 'Structuring ASan dump…');
    await sleep(1400);
    vtime += 3;
    await addTyped({ tag: 'scout', title: 'Triage', text: 'Bounds violation in read_u32() · memcpy without length check · risk HIGH.' });
    setPill('scout', 'done');
    setSnippet('scout', 'parser.c:214 · risk HIGH');
    logCall('scout', 'triage');
    await sleep(700);

    /* Step 5 — Patch attempt 1 (Smith) */
    setStep(5);
    setPill('smith', 'thinking');
    setSnippet('smith', 'Drafting unified diff…');
    await sleep(1700);
    vtime += 9;
    await addTyped({ tag: 'smith', title: 'Patch · attempt 1', text: 'Draft ready — 3 lines changed in read_u32().' });
    setPill('smith', 'done');
    setSnippet('smith', 'Patch drafted · 3 lines');
    logCall('smith', 'patch', { attempt: 1 });
    await sleep(700);

    /* Step 6 — Cross-exam round 1 (Judge) → REJECT */
    setStep(6);
    setPill('judge', 'thinking');
    setSnippet('judge', 'Cross-examining diff — blind…');
    dim('smith', true);
    await sleep(2100);
    vtime += 12;
    const r1 = addEntry({ tag: 'judge', title: 'Cross-exam · round 1' });
    r1.innerHTML = '<span class="chip chip-reject">REJECT</span> — bounds check is present but placed <strong>after</strong> the memcpy. The overflow still occurs. Fix the ordering.';
    scrollLog();
    setSnippet('judge', 'REJECT — check after the copy');
    logCall('judge', 'cross_exam', { verdict: 'REJECT' });
    await sleep(1000);

    /* Retry routing */
    vtime += 2;
    addStatic({ title: 'Retry routing', text: 'Rejection + counterexample packaged back to Smith — attempt 2 of 2. Logged in the evidence ledger.' });
    await sleep(1100);

    /* Step 5 — Patch attempt 2 */
    setStep(5);
    dim('smith', false);
    setPill('smith', 'thinking');
    setSnippet('smith', 'Revising diff with counterexample…');
    await sleep(1700);
    vtime += 10;
    await addTyped({ tag: 'smith', title: 'Patch · attempt 2', text: 'Revised — length check moved before memcpy, early return on short buffer.' });
    setPill('smith', 'done');
    setSnippet('smith', 'Check before copy · early return');
    logCall('smith', 'patch', { attempt: 2 });
    await sleep(700);

    /* Step 6 — Cross-exam round 2 → APPROVE */
    setStep(6);
    setPill('judge', 'thinking');
    setSnippet('judge', 'Re-examining revised diff…');
    dim('smith', true);
    await sleep(2000);
    vtime += 11;
    const r2 = addEntry({ tag: 'judge', title: 'Cross-exam · round 2' });
    r2.innerHTML = '<span class="chip chip-approve">APPROVE</span> — addresses root cause · no scope creep · no sanitizer silencing detected.';
    scrollLog();
    setSnippet('judge', 'APPROVE — root cause fixed');
    logCall('judge', 'cross_exam', { verdict: 'APPROVE' });
    dim('smith', false);
    await sleep(1000);

    /* Step 7 — Verify (real, no LLM) */
    setStep(7);
    setPill('judge', 'idle');
    vtime += 19;
    await verifyChecklist();
    await sleep(900);

    /* Step 8 — Certify (Judge) */
    setStep(8);
    setPill('judge', 'thinking');
    setSnippet('judge', 'Writing residual-risk note…');
    await sleep(1600);
    vtime += 5;
    await addTyped({ tag: 'judge', title: 'Certify', text: 'Certified. Residual risk: sibling parse functions share the pattern — flagged for next campaign.' });
    setPill('judge', 'done');
    setSnippet('judge', 'proof_status: VERIFIED');
    logCall('judge', 'certify');
    stepChips.forEach((c) => { c.classList.add('done'); c.classList.remove('active'); });
    await sleep(700);

    /* Final state */
    addStatic({ html: 'Campaign complete in <b>2m 17s</b> — proof bundle written to <b>evidence/campaign-001.json</b>.' });
    caseStatus.textContent = 'CERTIFIED ✓';
    caseStatus.className = 'st-certified';
    caseframe.classList.add('certified');
    fillVerdict();
    scrollLog();
    await sleep(900);

    diffToggle.classList.add('ready');
    diffState.textContent = 'accepted · 5 additions, 1 deletion';
    diffwrap.classList.add('open');
    diffToggle.setAttribute('aria-expanded', 'true');

    runBtn.textContent = 'Re-run campaign';
    runBtn.disabled = false;
    running = false;
  }

  /* ================= controls ================= */
  runBtn.addEventListener('click', run);
  resetBtn.addEventListener('click', () => { if (!running) reset(); });
  $$('.speedbtn').forEach((b) => {
    b.addEventListener('click', () => {
      speed = parseFloat(b.dataset.speed);
      $$('.speedbtn').forEach((x) => x.classList.toggle('active', x === b));
    });
  });

  diffToggle.addEventListener('click', () => {
    const open = diffwrap.classList.toggle('open');
    diffToggle.setAttribute('aria-expanded', String(open));
  });

  $('#downloadBtn').addEventListener('click', () => {
    const ledger = {
      campaign_id: '001',
      target: 'parser.c:read_u32',
      council_calls: councilCalls,
      reproducer: { input_b64: 'A7cDAA==', minimized_size_bytes: 9 },
      patch_diff:
        '--- a/parser.c\n+++ b/parser.c\n@@ -211,6 +211,10 @@\n-    memcpy(&v, b->ptr + b->pos, 4);\n+    if (b->pos + 4 > b->len) {\n+        parser_error(b, ERR_SHORT_READ);\n+        return 0;\n+    }\n+    memcpy(&v, b->ptr + b->pos, 4);',
      regression: { total: 24, passed: 24 },
      replay_determinism: { runs: 5, consistent: true },
      residual_risk_note: 'Fix scoped to read_u32. Sibling parse functions (read_u16, read_u64) share the pattern — not yet scanned.',
      proof_status: 'VERIFIED',
    };
    const blob = new Blob([JSON.stringify(ledger, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'kavach-rex-case-001-evidence.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });

  /* hero CTA → scroll to demo and start */
  $('#heroRun').addEventListener('click', () => {
    $('#demo').scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
    if (!running) setTimeout(run, RM ? 150 : 900);
  });
})();
