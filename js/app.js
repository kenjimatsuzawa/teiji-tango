// UIとインタラクション

let game;
let currentPuzzle;
let puzzleDay;
let currentDifficulty = '初級';
let currentMode = 'normal'; // 'normal' | 'wall' | 'region' | 'x' | 'killer'

const MODE_LABELS = {
  normal: '通常',
  wall:   '🧱 壁あり',
  region: '🗂️ エリア',
  x:      'Xタンゴ',
  killer: '🔪 キラータンゴ',
};
function getModeLabel(mode) {
  return MODE_LABELS[mode] || mode;
}

// ─── フィーチャーフラグ：モードの段階公開 ──────────────
// LAUNCH_DATE を起点に、MODE_UNLOCK_DAYS に載っているモードだけ何日後に解禁するかを管理する。
// 載っていないモード（通常・壁あり = 初期リリース分）は常時解禁。
// 公開日が決まったら LAUNCH_DATE だけ更新すれば段階公開モードの解禁日が連動してずれる。
const LAUNCH_DATE = '2026-06-20';
const MODE_UNLOCK_DAYS = {
  region: 14, // 公開2週間後
  x:      28, // 公開4週間後
  killer: 42, // 公開6週間後
};
function isModeUnlocked(mode) {
  if (!(mode in MODE_UNLOCK_DAYS)) return true;
  const unlockTime = new Date(LAUNCH_DATE).getTime() + MODE_UNLOCK_DAYS[mode] * 24 * 60 * 60 * 1000;
  return Date.now() >= unlockTime;
}

// タイマー
let timerSecs = 0;
let timerInterval = null;
let hintsUsed = 0;

// ヒントハイライト中のセル
let hintTargetCell = null;

// 仮置きモード
let tentativeMode = false;
let tentativeSnapshot = null;
let tentativeHistoryLength = 0;

// ─── テーマ ──────────────────────────────────
const THEMES = [
  { id: 'work',  sym1: '👔', sym2: '🍺', label1: '出社', label2: '退社' },
  { id: 'sushi', sym1: '🍣', sym2: '🍵', label1: '寿司', label2: 'お茶' },
  { id: 'fox',   sym1: '🦊', sym2: '⛩️', label1: '狐',   label2: '鳥居' },
];

function loadCurrentTheme() {
  const saved = localStorage.getItem('theme');
  return THEMES.find(t => t.id === saved) || THEMES[0];
}

let currentTheme = loadCurrentTheme();

function getSymbols() {
  return { 0: '', 1: currentTheme.sym1, 2: currentTheme.sym2 };
}

function applyTheme(theme) {
  currentTheme = theme;
  localStorage.setItem('theme', theme.id);
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('theme-active', btn.dataset.theme === theme.id);
  });
  document.getElementById('legend-sym1').textContent = theme.sym1;
  document.getElementById('legend-label1').textContent = theme.label1;
  document.getElementById('legend-sym2').textContent = theme.sym2;
  document.getElementById('legend-label2').textContent = theme.label2;
  renderGrid();
}

// ─── 実績 ────────────────────────────────────
const ACHIEVEMENTS = [
  { id: 'first_clear', icon: '🎯', name: 'はじめての定時退社', desc: '初めてクリア' },
  { id: 'no_hint',     icon: '🎖️', name: 'ノーヒント退社',    desc: 'ヒントなしでクリア' },
  { id: 'speed_easy',  icon: '⚡', name: 'スピード退社',       desc: '初級を2分以内でクリア' },
  { id: 'clear_mid',   icon: '🧠', name: '中堅社員',           desc: '中級をクリア' },
  { id: 'clear_hard',  icon: '👑', name: 'エース社員',         desc: '上級をクリア' },
  { id: 'streak_3',    icon: '🔥', name: '3日連続',            desc: '3日連続でプレイ' },
  { id: 'streak_7',    icon: '💫', name: '7日連続',            desc: '7日連続でプレイ' },
  { id: 'all_diff',    icon: '⭐', name: '三冠達成',           desc: '1日で3難易度全てクリア' },
];

function getEarnedIds() {
  try { return new Set(JSON.parse(localStorage.getItem('achievements') || '[]')); }
  catch { return new Set(); }
}

function earnAchievement(id) {
  const earned = getEarnedIds();
  if (earned.has(id)) return false;
  earned.add(id);
  localStorage.setItem('achievements', JSON.stringify([...earned]));
  return true;
}

// クリア直後に呼ぶ。今回新たに解除された実績を返す
function checkAndEarnAchievements(difficulty, secs, hints) {
  const streak = parseInt(localStorage.getItem('streak') || '0');
  const candidates = [
    { id: 'first_clear', cond: true },
    { id: 'no_hint',     cond: hints === 0 },
    { id: 'speed_easy',  cond: difficulty === '初級' && secs <= 120 },
    { id: 'clear_mid',   cond: difficulty === '中級' },
    { id: 'clear_hard',  cond: difficulty === '上級' },
    { id: 'streak_3',    cond: streak >= 3 },
    { id: 'streak_7',    cond: streak >= 7 },
    { id: 'all_diff',    cond: DIFFICULTIES.every(d => isCompletedToday(currentMode, d)) },
  ];
  return candidates
    .filter(({ cond }) => cond)
    .map(({ id }) => earnAchievement(id) ? ACHIEVEMENTS.find(a => a.id === id) : null)
    .filter(Boolean);
}

function renderAchievementsModal() {
  const earned = getEarnedIds();
  document.getElementById('ach-grid').innerHTML = ACHIEVEMENTS.map(a => `
    <div class="ach-item ${earned.has(a.id) ? 'earned' : 'locked'}">
      <div class="ach-icon">${earned.has(a.id) ? a.icon : '🔒'}</div>
      <div class="ach-name">${a.name}</div>
      <div class="ach-desc">${earned.has(a.id) ? a.desc : '？？？'}</div>
    </div>
  `).join('');
}

function renderResultAchievements(achs) {
  const el = document.getElementById('result-achievements');
  if (!achs || achs.length === 0) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="result-ach-label">🏅 新しい実績</div>` +
    achs.map(a => `<div class="result-ach-item">${a.icon} ${a.name}</div>`).join('');
}

// ─── ベストタイム ────────────────────────────
function getBestTime(mode, diff) {
  const v = localStorage.getItem(`bestTime_${mode}_${diff}`);
  return v !== null ? parseInt(v, 10) : null;
}

// 更新できたとき true を返す
function tryUpdateBestTime(mode, diff, secs) {
  const current = getBestTime(mode, diff);
  if (current === null || secs < current) {
    localStorage.setItem(`bestTime_${mode}_${diff}`, secs);
    return true;
  }
  return false;
}

function renderBestTime(mode, diff) {
  const best = getBestTime(mode, diff);
  const el = document.getElementById('best-time');
  el.textContent = best !== null ? `ベスト ${formatTime(best)}` : '';
}

// ─── 完了トラッキング ─────────────────────────
function getTodayKey(mode, diff) {
  return `done_${mode}_${diff}_${new Date().toDateString()}`;
}

function markCompleted(mode, diff) {
  localStorage.setItem(getTodayKey(mode, diff), '1');
}

function isCompletedToday(mode, diff) {
  return localStorage.getItem(getTodayKey(mode, diff)) === '1';
}

// ─── 難易度タブ ───────────────────────────────
function renderModeTabs() {
  document.querySelectorAll('.mode-tab').forEach(btn => {
    const mode = btn.dataset.mode;
    btn.classList.toggle('mode-locked', !isModeUnlocked(mode));
    btn.classList.toggle('mode-active', mode === currentMode);
  });
}

function loadMode(mode) {
  if (!isModeUnlocked(mode)) return;
  currentMode = mode;
  renderModeTabs();
  loadDifficulty(currentDifficulty);
}

function renderDifficultyTabs() {
  document.querySelectorAll('.diff-tab').forEach(btn => {
    const diff = btn.dataset.diff;
    btn.classList.toggle('diff-active', diff === currentDifficulty);
    btn.classList.toggle('diff-done', isCompletedToday(currentMode, diff));
  });
}

function loadDifficulty(difficulty) {
  currentDifficulty = difficulty;
  currentPuzzle = currentMode === 'wall'   ? getWallPuzzleByDifficulty(difficulty)
               : currentMode === 'region' ? getRegionPuzzleByDifficulty(difficulty)
               : currentMode === 'x'      ? getXPuzzleByDifficulty(difficulty)
               : currentMode === 'killer' ? getKillerPuzzleByDifficulty(difficulty)
               : getPuzzleByDifficulty(difficulty);
  puzzleDay = getDayNumber();

  stopTimer();
  hintsUsed = 0;
  hintTargetCell = null;
  tentativeMode = false;
  tentativeSnapshot = null;

  game = new TangoGame(currentPuzzle);

  const initialCount = currentPuzzle.initial.flat().filter(v => v !== 0).length;
  document.getElementById('puzzle-day').textContent = `Day ${puzzleDay}`;
  document.getElementById('difficulty').textContent = currentMode === 'killer'
    ? `枠${currentPuzzle.cages.length}個`
    : `手がかり${initialCount}個`;

  renderDifficultyTabs();
  renderBestTime(currentMode, difficulty);
  hideHintPanel();
  updateUndoButton();
  renderGrid();

  if (!isCompletedToday(currentMode, difficulty)) {
    startTimer();
  } else {
    document.getElementById('timer').textContent = '−:−−';
  }
}

function init() {
  puzzleDay = getDayNumber();
  loadStreak();
  renderModeTabs();
  loadDifficulty('初級');
}

function getDayNumber() {
  return getDayIndex() + 1; // 共通ロジック（puzzles.js で定義、JST16:00リセット）
}

// ─── タイマー ───────────────────────────────────
function startTimer() {
  timerSecs = 0;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timerSecs++;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function addHintPenalty() {
  timerSecs += 5;
  updateTimerDisplay();
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updateTimerDisplay() {
  document.getElementById('timer').textContent = formatTime(timerSecs);
}

// ─── 仮置きモード ──────────────────────────────
function enterTentativeMode() {
  tentativeMode = true;
  tentativeSnapshot = game.grid.map(row => [...row]);
  tentativeHistoryLength = game.history.length;
  document.getElementById('tentative-panel').classList.remove('hidden');
  document.getElementById('btn-tentative').classList.add('tentative-on');
  renderGrid();
}

function confirmTentative() {
  tentativeMode = false;
  tentativeSnapshot = null;
  document.getElementById('tentative-panel').classList.add('hidden');
  document.getElementById('btn-tentative').classList.remove('tentative-on');
  renderGrid();
  if (game.isFilled()) {
    setTimeout(() => {
      if (game.isComplete()) {
        stopTimer();
        markCompleted(currentMode, currentDifficulty);
        renderDifficultyTabs();
        showResult(true);
      }
    }, 150);
  }
}

function discardTentative() {
  game.grid = tentativeSnapshot.map(row => [...row]);
  game.history = game.history.slice(0, tentativeHistoryLength);
  tentativeMode = false;
  tentativeSnapshot = null;
  document.getElementById('tentative-panel').classList.add('hidden');
  document.getElementById('btn-tentative').classList.remove('tentative-on');
  updateUndoButton();
  renderGrid();
}

// ─── グリッド描画 ──────────────────────────────
function renderGrid() {
  const gridEl = document.getElementById('grid');
  gridEl.innerHTML = '';
  gridEl.style.gridTemplateColumns = `repeat(${game.size}, 1fr)`;

  const errors = new Set(); // リアルタイムのミス表示は行わない（ゲームが簡単になりすぎるため）

  for (let r = 0; r < game.size; r++) {
    for (let c = 0; c < game.size; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;

      const val = game.grid[r][c];
      cell.textContent = getSymbols()[val];

      if (val !== EMPTY) cell.classList.add(val === SHIRT ? 'shirt' : 'beer');
      if (game.fixed[r][c]) cell.classList.add('fixed');
      if (errors.has(`${r},${c}`)) cell.classList.add('error');
      if (hintTargetCell && hintTargetCell.r === r && hintTargetCell.c === c) {
        cell.classList.add('hint-target');
      }
      if (tentativeMode && tentativeSnapshot && val !== tentativeSnapshot[r][c]) {
        cell.classList.add('tentative');
      }
      if (game.puzzle.hasX && (r === c || r + c === game.size - 1)) {
        cell.classList.add('diag-cell');
      }

      cell.addEventListener('click', () => onCellClick(r, c));
      gridEl.appendChild(cell);
    }
  }

  renderConstraints();
  renderWalls();
  renderRegionBorders();
  renderKillerCages();
}

function renderConstraints() {
  const gridEl = document.getElementById('grid');
  gridEl.querySelectorAll('.constraint').forEach(el => el.remove());

  requestAnimationFrame(() => {
    game.constraints.forEach(con => {
      const cell1 = gridEl.querySelector(`[data-r="${con.r1}"][data-c="${con.c1}"]`);
      const cell2 = gridEl.querySelector(`[data-r="${con.r2}"][data-c="${con.c2}"]`);
      if (!cell1 || !cell2) return;

      const r1 = cell1.getBoundingClientRect();
      const r2 = cell2.getBoundingClientRect();
      const gr = gridEl.getBoundingClientRect();

      const midX = (r1.left + r1.right + r2.left + r2.right) / 4 - gr.left;
      const midY = (r1.top  + r1.bottom + r2.top  + r2.bottom) / 4 - gr.top;

      const marker = document.createElement('div');
      marker.className = `constraint ${con.type === 'eq' ? 'eq' : 'neq'}`;
      marker.textContent = con.type === 'eq' ? '＝' : '×';
      marker.style.left = `${midX}px`;
      marker.style.top  = `${midY}px`;
      gridEl.appendChild(marker);
    });
  });
}

function renderWalls() {
  const gridEl = document.getElementById('grid');
  gridEl.querySelectorAll('.wall-marker').forEach(el => el.remove());
  if (!game.walls || game.walls.length === 0) return;

  requestAnimationFrame(() => {
    const gr = gridEl.getBoundingClientRect();
    for (const w of game.walls) {
      const c1 = gridEl.querySelector(`[data-r="${w.r1}"][data-c="${w.c1}"]`);
      const c2 = gridEl.querySelector(`[data-r="${w.r2}"][data-c="${w.c2}"]`);
      if (!c1 || !c2) continue;
      const r1 = c1.getBoundingClientRect();
      const r2 = c2.getBoundingClientRect();
      const marker = document.createElement('div');
      marker.className = 'wall-marker';
      if (w.r1 === w.r2) {
        // 同行 → 縦の壁線
        marker.classList.add('wall-v');
        marker.style.left = `${(r1.right + r2.left) / 2 - gr.left}px`;
        marker.style.top  = `${r1.top - gr.top}px`;
        marker.style.height = `${r1.height}px`;
      } else {
        // 同列 → 横の壁線
        marker.classList.add('wall-h');
        marker.style.top  = `${(r1.bottom + r2.top) / 2 - gr.top}px`;
        marker.style.left = `${r1.left - gr.left}px`;
        marker.style.width = `${r1.width}px`;
      }
      gridEl.appendChild(marker);
    }
  });
}

function renderRegionBorders() {
  const gridEl = document.getElementById('grid');
  gridEl.querySelectorAll('.region-border').forEach(el => el.remove());
  if (!game.puzzle.hasRegions) return;

  requestAnimationFrame(() => {
    const gr = gridEl.getBoundingClientRect();

    // 水平境界線: row 1の下（row 2の上）, row 3の下（row 4の上）
    for (const r of [1, 3]) {
      const topCell  = gridEl.querySelector(`[data-r="${r}"][data-c="0"]`);
      const botCell  = gridEl.querySelector(`[data-r="${r+1}"][data-c="0"]`);
      const endCell  = gridEl.querySelector(`[data-r="${r}"][data-c="5"]`);
      if (!topCell || !botCell || !endCell) continue;
      const tr = topCell.getBoundingClientRect();
      const br = botCell.getBoundingClientRect();
      const er = endCell.getBoundingClientRect();
      const marker = document.createElement('div');
      marker.className = 'region-border region-border-h';
      marker.style.top   = `${(tr.bottom + br.top) / 2 - gr.top}px`;
      marker.style.left  = `${tr.left - gr.left}px`;
      marker.style.width = `${er.right - tr.left}px`;
      gridEl.appendChild(marker);
    }

    // 垂直境界線: col 2の右（col 3の左）
    const leftCell = gridEl.querySelector('[data-r="0"][data-c="2"]');
    const rgtCell  = gridEl.querySelector('[data-r="0"][data-c="3"]');
    const endRow   = gridEl.querySelector('[data-r="5"][data-c="2"]');
    if (leftCell && rgtCell && endRow) {
      const lr = leftCell.getBoundingClientRect();
      const rr = rgtCell.getBoundingClientRect();
      const er = endRow.getBoundingClientRect();
      const marker = document.createElement('div');
      marker.className = 'region-border region-border-v';
      marker.style.left   = `${(lr.right + rr.left) / 2 - gr.left}px`;
      marker.style.top    = `${lr.top - gr.top}px`;
      marker.style.height = `${er.bottom - lr.top}px`;
      gridEl.appendChild(marker);
    }
  });
}

function renderKillerCages() {
  const gridEl = document.getElementById('grid');
  const existingSvg = gridEl.querySelector('.cage-svg-overlay');
  if (existingSvg) existingSvg.remove();
  gridEl.querySelectorAll('.cage-label').forEach(el => el.remove());
  if (!game.puzzle.hasKiller || !game.puzzle.cages) return;

  const cages = game.puzzle.cages;
  const size  = game.size;

  requestAnimationFrame(() => {
    const gr = gridEl.getBoundingClientRect();

    // セル座標をキャッシュ
    const rects = {};
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++) {
        const el = gridEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
        if (el) rects[`${r},${c}`] = el.getBoundingClientRect();
      }

    // 枠IDルックアップ
    const cageGrid = Array.from({ length: size }, () => Array(size).fill(-1));
    for (const cage of cages)
      for (const { r, c } of cage.cells) cageGrid[r][c] = cage.id;

    // SVGオーバーレイ作成
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.className = 'cage-svg-overlay';
    svg.setAttribute('width', gr.width);
    svg.setAttribute('height', gr.height);
    svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:15;overflow:visible;';

    const stroke = '#c084fc';
    const sw = '2.5';
    const dash = '5,3';

    function makeLine(x1, y1, x2, y2) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1); line.setAttribute('y1', y1);
      line.setAttribute('x2', x2); line.setAttribute('y2', y2);
      line.setAttribute('stroke', stroke);
      line.setAttribute('stroke-width', sw);
      line.setAttribute('stroke-dasharray', dash);
      line.setAttribute('stroke-linecap', 'round');
      return line;
    }

    // 水平境界線（行r-1と行rの間、またはグリッド上下端）
    for (let r = 0; r <= size; r++) {
      for (let c = 0; c < size; c++) {
        const aboveCid = r > 0    ? cageGrid[r-1][c] : -2;
        const belowCid = r < size ? cageGrid[r][c]   : -2;
        if (aboveCid === belowCid) continue;

        const refCell = rects[r < size ? `${r},${c}` : `${r-1},${c}`];
        if (!refCell) continue;
        let y;
        if (r === 0)    y = refCell.top    - gr.top;
        else if (r === size) y = refCell.bottom - gr.top;
        else {
          const above = rects[`${r-1},${c}`], below = rects[`${r},${c}`];
          y = (above.bottom + below.top) / 2 - gr.top;
        }
        svg.appendChild(makeLine(refCell.left - gr.left, y, refCell.right - gr.left, y));
      }
    }

    // 垂直境界線（列c-1と列cの間、またはグリッド左右端）
    for (let r = 0; r < size; r++) {
      for (let c = 0; c <= size; c++) {
        const leftCid  = c > 0    ? cageGrid[r][c-1] : -2;
        const rightCid = c < size ? cageGrid[r][c]   : -2;
        if (leftCid === rightCid) continue;

        const refCell = rects[c < size ? `${r},${c}` : `${r},${c-1}`];
        if (!refCell) continue;
        let x;
        if (c === 0)    x = refCell.left  - gr.left;
        else if (c === size) x = refCell.right - gr.left;
        else {
          const left = rects[`${r},${c-1}`], right = rects[`${r},${c}`];
          x = (left.right + right.left) / 2 - gr.left;
        }
        svg.appendChild(makeLine(x, refCell.top - gr.top, x, refCell.bottom - gr.top));
      }
    }

    gridEl.appendChild(svg);

    // 枠ラベル（各枠の左上セルに🍺数を表示）
    for (const cage of cages) {
      const topLeft = cage.cells.reduce((min, cell) =>
        cell.r < min.r || (cell.r === min.r && cell.c < min.c) ? cell : min
      , cage.cells[0]);
      const cr = rects[`${topLeft.r},${topLeft.c}`];
      if (!cr) continue;
      const label = document.createElement('div');
      label.className = 'cage-label';
      label.textContent = cage.beerCount;
      label.title = `${currentTheme.sym2}×${cage.beerCount}`;
      label.style.left = `${cr.left - gr.left + 3}px`;
      label.style.top  = `${cr.top  - gr.top  + 2}px`;
      gridEl.appendChild(label);
    }
  });
}

function updateUndoButton() {
  const canUndo = tentativeMode
    ? game.history.length > tentativeHistoryLength
    : game.canUndo();
  document.getElementById('btn-undo').disabled = !canUndo;
}

function onCellClick(r, c) {
  hintTargetCell = null;

  if (!game.toggle(r, c)) return;
  updateUndoButton();
  renderGrid();

  if (!tentativeMode && game.isFilled()) {
    setTimeout(() => {
      if (game.isComplete()) {
        stopTimer();
        markCompleted(currentMode, currentDifficulty);
        renderDifficultyTabs();
        showResult(true);
      }
    }, 150);
  }
}

// ─── ヒントパネル ──────────────────────────────
function showHintPanel(hint) {
  const panel = document.getElementById('hint-panel');
  const badge = panel.querySelector('.hint-penalty-badge');
  const SYM = { 1: currentTheme.sym1, 2: currentTheme.sym2 };

  if (hint) {
    panel.querySelector('.hint-tech-name').textContent = hint.techName;
    panel.querySelector('.hint-cell-label').textContent =
      `行${hint.r + 1}・列${hint.c + 1} → ${SYM[hint.value]}`;
    panel.querySelector('.hint-reason-text').textContent = hint.reason;
    badge.style.display = 'inline';
  } else {
    panel.querySelector('.hint-tech-name').textContent = '💡 ヒント';
    panel.querySelector('.hint-cell-label').textContent = 'あと一息！';
    panel.querySelector('.hint-reason-text').textContent = 'すでに全ての手筋は適用済みです。';
    badge.style.display = 'none';
  }

  panel.classList.remove('hidden');
}

function hideHintPanel() {
  const panel = document.getElementById('hint-panel');
  panel.classList.add('hidden');
  hintTargetCell = null;
}

// ─── 結果モーダル ──────────────────────────────
function showResult(won) {
  const modal = document.getElementById('result-modal');
  const emoji = document.getElementById('result-emoji');
  const title = document.getElementById('result-title');
  const modeLabelEl = document.getElementById('result-mode-label');
  const msg   = document.getElementById('result-message');
  const shareText = document.getElementById('share-text');

  modeLabelEl.textContent = `${getModeLabel(currentMode)}・${currentDifficulty}`;

  if (won) {
    emoji.textContent = '🎉';
    title.textContent = '定時退社！';
    const hintNote = hintsUsed > 0 ? `（ヒント${hintsUsed}回使用）` : '';
    msg.textContent = `お疲れ様でした！ ${formatTime(timerSecs)} でクリア${hintNote}`;

    const isNewBest = tryUpdateBestTime(currentMode, currentDifficulty, timerSecs);
    renderBestTime(currentMode, currentDifficulty);
    const bestEl = document.getElementById('result-best');
    if (isNewBest) {
      bestEl.textContent = `🏆 新記録！ ${formatTime(timerSecs)}`;
      bestEl.className = 'result-best new-record';
    } else {
      const best = getBestTime(currentMode, currentDifficulty);
      bestEl.textContent = `ベストタイム ${formatTime(best)}`;
      bestEl.className = 'result-best';
    }

    saveStreak();
    const newAchs = checkAndEarnAchievements(currentDifficulty, timerSecs, hintsUsed);
    renderResultAchievements(newAchs);
    const text = game.buildShareText(puzzleDay, timerSecs, hintsUsed, currentTheme.sym1, currentTheme.sym2, getModeLabel(currentMode), currentDifficulty);
    shareText.textContent = text;
    document.getElementById('share-buttons').style.display = 'flex';
  } else {
    emoji.textContent = '😢';
    title.textContent = '残業確定...';
    msg.textContent   = 'どこかバランスが崩れています。もう一度確認してみよう！';
    document.getElementById('result-best').textContent = '';
    document.getElementById('result-achievements').innerHTML = '';
    shareText.textContent = '';
    document.getElementById('share-buttons').style.display = 'none';
  }

  modal.classList.remove('hidden');
}

// ─── ストリーク ────────────────────────────────
function loadStreak() {
  const streak = parseInt(localStorage.getItem('streak') || '0');
  document.getElementById('streak-count').textContent = streak;
}

function saveStreak() {
  const lastPlayed = localStorage.getItem('lastPlayed');
  const today = new Date().toDateString();
  let streak = parseInt(localStorage.getItem('streak') || '0');

  if (lastPlayed === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (lastPlayed === yesterday.toDateString()) {
    streak += 1;
  } else {
    streak = 1;
  }

  localStorage.setItem('streak', streak);
  localStorage.setItem('lastPlayed', today);
  document.getElementById('streak-count').textContent = streak;
}

// ─── イベントリスナー ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init();

  document.querySelectorAll('.mode-tab').forEach(btn => {
    btn.addEventListener('click', () => loadMode(btn.dataset.mode));
  });

  document.querySelectorAll('.diff-tab').forEach(btn => {
    btn.addEventListener('click', () => loadDifficulty(btn.dataset.diff));
  });

  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = THEMES.find(t => t.id === btn.dataset.theme);
      if (theme) applyTheme(theme);
    });
  });

  applyTheme(currentTheme);

  document.getElementById('btn-clear').addEventListener('click', () => {
    if (tentativeMode) discardTentative();
    game.reset();
    stopTimer();
    hintsUsed = 0;
    hideHintPanel();
    updateUndoButton();
    renderGrid();
    if (!isCompletedToday(currentMode, currentDifficulty)) startTimer();
  });

  document.getElementById('btn-undo').addEventListener('click', () => {
    if (tentativeMode && game.history.length <= tentativeHistoryLength) return;
    if (!game.undo()) return;
    hintTargetCell = null;
    updateUndoButton();
    renderGrid();
    // 仮置きが全部消えたら自動でモード終了
    if (tentativeMode && game.history.length === tentativeHistoryLength) {
      confirmTentative();
    }
  });

  document.getElementById('btn-tentative').addEventListener('click', () => {
    if (tentativeMode) confirmTentative();
    else enterTentativeMode();
  });

  document.getElementById('btn-tentative-confirm').addEventListener('click', () => confirmTentative());
  document.getElementById('btn-tentative-discard').addEventListener('click', () => discardTentative());

  document.getElementById('btn-hint').addEventListener('click', () => {
    const hint = game.getNextHint();
    if (!hint) {
      showHintPanel(null);
      return;
    }
    hintsUsed++;
    addHintPenalty();
    hintTargetCell = { r: hint.r, c: hint.c };
    renderGrid();
    showHintPanel(hint);
  });

  document.getElementById('btn-hint-close').addEventListener('click', () => {
    hideHintPanel();
    renderGrid();
  });

  document.getElementById('btn-check').addEventListener('click', () => {
    if (!game.isFilled()) {
      showResult(false);
      return;
    }
    if (game.isComplete()) {
      stopTimer();
      markCompleted(currentMode, currentDifficulty);
      renderDifficultyTabs();
      showResult(true);
    } else {
      showResult(false);
    }
  });

  document.getElementById('btn-share-x').addEventListener('click', () => {
    const text = game.buildShareText(puzzleDay, timerSecs, hintsUsed, currentTheme.sym1, currentTheme.sym2, getModeLabel(currentMode), currentDifficulty);
    window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text), '_blank');
  });

  document.getElementById('btn-share-fb').addEventListener('click', () => {
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent('https://teiji-tango.com'), '_blank');
  });

  document.getElementById('btn-share-copy').addEventListener('click', () => {
    const text = game.buildShareText(puzzleDay, timerSecs, hintsUsed, currentTheme.sym1, currentTheme.sym2, getModeLabel(currentMode), currentDifficulty);
    const btn = document.getElementById('btn-share-copy');
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = '✅ コピーしました！';
        setTimeout(() => { btn.textContent = '📋 コピー'; }, 2000);
      });
    }
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    document.getElementById('result-modal').classList.add('hidden');
  });

  const howtoModal = document.getElementById('howto-modal');
  document.getElementById('btn-howto').addEventListener('click', () => {
    howtoModal.classList.remove('hidden');
  });
  document.getElementById('btn-howto-close').addEventListener('click', () => {
    howtoModal.classList.add('hidden');
  });
  howtoModal.addEventListener('click', e => {
    if (e.target === howtoModal) howtoModal.classList.add('hidden');
  });

  const achModal = document.getElementById('ach-modal');
  document.getElementById('btn-ach').addEventListener('click', () => {
    renderAchievementsModal();
    achModal.classList.remove('hidden');
  });
  document.getElementById('btn-ach-close').addEventListener('click', () => {
    achModal.classList.add('hidden');
  });
  achModal.addEventListener('click', e => {
    if (e.target === achModal) achModal.classList.add('hidden');
  });

  window.addEventListener('resize', () => { renderConstraints(); renderWalls(); renderRegionBorders(); renderKillerCages(); });
});
