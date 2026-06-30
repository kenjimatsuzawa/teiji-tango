'use strict';

(function () {
  const SHIRT = 1, BEER = 2, EMPTY = 0;
  const sym = v => v === SHIRT ? '👔' : '🍺';

  const TECH_NAMES = {
    ja: { 1: '①バランス完了', 2: '②ダブルブロック', 3: '③サンドイッチ', 4: '④制約マーカー', 5: '⑤端点バランス' },
    en: { 1: '① Balance', 2: '② Two in a Row', 3: '③ Sandwich', 4: '④ Constraint Marker', 5: '⑤ End Point' },
  };

  let steps = [];
  let current = 0;
  let puzzle = null;
  let busy = false;

  function lang() {
    return document.documentElement.lang === 'en' ? 'en' : 'ja';
  }

  function init() {
    // 全5手法(techId 1-5)が含まれるパズルを使用
    puzzle = PUZZLES.find(p => p.id === 101) || PUZZLES[1];
    if (!puzzle) return false;

    const allSteps = TangoSolver.computeSolveSteps(
      puzzle.initial, puzzle.size, puzzle.constraints, [], false, false, []
    );

    const seen = new Set();
    const selected = [];

    for (const s of allSteps) {
      if (s.techId >= 1 && s.techId <= 5 && !seen.has(s.techId)) {
        seen.add(s.techId);
        // このステップの直前の盤面状態を再現
        const board = puzzle.initial.map(r => [...r]);
        for (const prev of allSteps) {
          if (prev === s) break;
          board[prev.r][prev.c] = prev.value;
        }
        selected.push({ ...s, boardBefore: board });
      }
      if (seen.size === 5) break;
    }

    selected.sort((a, b) => a.techId - b.techId);
    steps = selected;
    return steps.length > 0;
  }

  function renderGrid(step) {
    const wrap = document.getElementById('tut-grid');
    wrap.innerHTML = '';

    const size = puzzle.size;
    const grid = document.createElement('div');
    grid.className = 'tut-grid-inner';

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const val = step.boardBefore[r][c];
        const isTarget = r === step.r && c === step.c;
        const isFixed = puzzle.initial[r][c] !== EMPTY;

        const cell = document.createElement('div');
        cell.className = 'tut-cell';
        if (isFixed) cell.classList.add('fixed');
        if (val === SHIRT) cell.classList.add('shirt');
        if (val === BEER)  cell.classList.add('beer');
        if (isTarget)      cell.classList.add('target');
        if (val !== EMPTY) cell.textContent = sym(val);
        cell.dataset.r = r;
        cell.dataset.c = c;

        if (isTarget) {
          cell.addEventListener('click', () => onTargetTap(step, cell));
        }
        grid.appendChild(cell);
      }
    }

    wrap.appendChild(grid);

    // 制約マーカー（レイアウト確定後に配置）
    requestAnimationFrame(() => {
      grid.style.position = 'relative';
      puzzle.constraints.forEach(con => {
        const el1 = grid.querySelector(`[data-r="${con.r1}"][data-c="${con.c1}"]`);
        const el2 = grid.querySelector(`[data-r="${con.r2}"][data-c="${con.c2}"]`);
        if (!el1 || !el2) return;
        const gr = grid.getBoundingClientRect();
        const b1 = el1.getBoundingClientRect();
        const b2 = el2.getBoundingClientRect();
        const mx = ((b1.left + b1.right + b2.left + b2.right) / 4) - gr.left;
        const my = ((b1.top + b1.bottom + b2.top + b2.bottom) / 4) - gr.top;
        const marker = document.createElement('div');
        marker.className = `tut-con ${con.type === 'eq' ? 'eq' : 'neq'}`;
        marker.textContent = con.type === 'eq' ? '＝' : '×';
        marker.style.left = `${mx}px`;
        marker.style.top  = `${my}px`;
        grid.appendChild(marker);
      });
    });
  }

  function onTargetTap(step, cell) {
    if (busy) return;
    busy = true;

    cell.classList.remove('target');
    cell.classList.add(step.value === SHIRT ? 'shirt' : 'beer', 'tut-filled');
    cell.textContent = sym(step.value);

    const instr = document.getElementById('tut-instruction');
    instr.textContent = lang() === 'en' ? '✅ Correct!' : '✅ 正解！';
    instr.classList.add('success');

    setTimeout(() => {
      busy = false;
      if (current < steps.length - 1) show(current + 1);
      else finish();
    }, 900);
  }

  function show(idx) {
    current = idx;
    const step = steps[idx];
    const l = lang();
    const total = steps.length;

    document.getElementById('tut-progress').style.width = `${(idx / total) * 100}%`;
    document.getElementById('tut-step-count').textContent = `${idx + 1} / ${total}`;
    document.getElementById('tut-title').textContent = TECH_NAMES[l][step.techId] || step.techName;
    document.getElementById('tut-reason').textContent = l === 'en' ? step.reasonEn : step.reason;

    const instr = document.getElementById('tut-instruction');
    instr.classList.remove('success');
    instr.textContent = l === 'en' ? '✨ Tap the glowing cell!' : '✨ 光っているマスをタップ！';

    document.getElementById('tut-prev').disabled = idx === 0;
    document.getElementById('tut-next').textContent = idx === total - 1
      ? (l === 'en' ? '🎮 Start Playing!' : '🎮 プレイ開始！')
      : (l === 'en' ? 'Next →' : '次へ →');

    renderGrid(step);
  }

  function finish() {
    document.getElementById('tutorial-modal').classList.add('hidden');
  }

  function open() {
    if (steps.length === 0 && !init()) return;
    document.getElementById('tutorial-modal').classList.remove('hidden');
    show(0);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-tutorial').addEventListener('click', () => {
      document.getElementById('howto-modal').classList.add('hidden');
      open();
    });
    document.getElementById('tut-close').addEventListener('click', finish);
    document.getElementById('tut-prev').addEventListener('click', () => {
      if (!busy && current > 0) show(current - 1);
    });
    document.getElementById('tut-next').addEventListener('click', () => {
      if (busy) return;
      if (current < steps.length - 1) show(current + 1);
      else finish();
    });
  });

  window.TangoTutorial = { open };
})();
