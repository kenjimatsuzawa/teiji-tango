// UIとインタラクション

let game;
let currentPuzzle;
let puzzleDay;
let currentDifficulty = '初級';

// タイマー
let timerSecs = 0;
let timerInterval = null;
let hintsUsed = 0;

// ヒントハイライト中のセル
let hintTargetCell = null;

const SYMBOLS = { 0: '', 1: '👔', 2: '🍺' };

// ─── ベストタイム ────────────────────────────
function getBestTime(diff) {
  const v = localStorage.getItem(`bestTime_${diff}`);
  return v !== null ? parseInt(v, 10) : null;
}

// 更新できたとき true を返す
function tryUpdateBestTime(diff, secs) {
  const current = getBestTime(diff);
  if (current === null || secs < current) {
    localStorage.setItem(`bestTime_${diff}`, secs);
    return true;
  }
  return false;
}

function renderBestTime(diff) {
  const best = getBestTime(diff);
  const el = document.getElementById('best-time');
  el.textContent = best !== null ? `ベスト ${formatTime(best)}` : '';
}

// ─── 完了トラッキング ─────────────────────────
function getTodayKey(diff) {
  return `done_${diff}_${new Date().toDateString()}`;
}

function markCompleted(diff) {
  localStorage.setItem(getTodayKey(diff), '1');
}

function isCompletedToday(diff) {
  return localStorage.getItem(getTodayKey(diff)) === '1';
}

// ─── 難易度タブ ───────────────────────────────
function renderDifficultyTabs() {
  document.querySelectorAll('.diff-tab').forEach(btn => {
    const diff = btn.dataset.diff;
    btn.classList.toggle('diff-active', diff === currentDifficulty);
    btn.classList.toggle('diff-done', isCompletedToday(diff));
  });
}

function loadDifficulty(difficulty) {
  currentDifficulty = difficulty;
  currentPuzzle = getPuzzleByDifficulty(difficulty);
  puzzleDay = getDayNumber();

  stopTimer();
  hintsUsed = 0;
  hintTargetCell = null;

  game = new TangoGame(currentPuzzle);

  const initialCount = currentPuzzle.initial.flat().filter(v => v !== 0).length;
  document.getElementById('puzzle-day').textContent = `Day ${puzzleDay}`;
  document.getElementById('difficulty').textContent = `手がかり${initialCount}個`;

  renderDifficultyTabs();
  renderBestTime(difficulty);
  hideHintPanel();
  updateUndoButton();
  renderGrid();

  if (!isCompletedToday(difficulty)) {
    startTimer();
  } else {
    document.getElementById('timer').textContent = '−:−−';
  }
}

function init() {
  puzzleDay = getDayNumber();
  loadStreak();
  loadDifficulty('初級');
}

function getDayNumber() {
  const start = new Date('2025-01-01');
  const today = new Date();
  return Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
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

// ─── グリッド描画 ──────────────────────────────
function renderGrid() {
  const gridEl = document.getElementById('grid');
  gridEl.innerHTML = '';
  gridEl.style.gridTemplateColumns = `repeat(${game.size}, 1fr)`;

  const errors = game.getErrors();

  for (let r = 0; r < game.size; r++) {
    for (let c = 0; c < game.size; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;

      const val = game.grid[r][c];
      cell.textContent = SYMBOLS[val];

      if (val !== EMPTY) cell.classList.add(val === SHIRT ? 'shirt' : 'beer');
      if (game.fixed[r][c]) cell.classList.add('fixed');
      if (errors.has(`${r},${c}`)) cell.classList.add('error');
      if (hintTargetCell && hintTargetCell.r === r && hintTargetCell.c === c) {
        cell.classList.add('hint-target');
      }

      cell.addEventListener('click', () => onCellClick(r, c));
      gridEl.appendChild(cell);
    }
  }

  renderConstraints();
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

function updateUndoButton() {
  document.getElementById('btn-undo').disabled = !game.canUndo();
}

function onCellClick(r, c) {
  hintTargetCell = null;

  if (!game.toggle(r, c)) return;
  updateUndoButton();
  renderGrid();

  if (game.isFilled()) {
    setTimeout(() => {
      if (game.isComplete()) {
        stopTimer();
        markCompleted(currentDifficulty);
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
  const SYM = { 1: '👔', 2: '🍺' };

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
  const msg   = document.getElementById('result-message');
  const shareText = document.getElementById('share-text');

  if (won) {
    emoji.textContent = '🎉';
    title.textContent = '定時退社！';
    const hintNote = hintsUsed > 0 ? `（ヒント${hintsUsed}回使用）` : '';
    msg.textContent = `お疲れ様でした！ ${formatTime(timerSecs)} でクリア${hintNote}`;

    const isNewBest = tryUpdateBestTime(currentDifficulty, timerSecs);
    renderBestTime(currentDifficulty);
    const bestEl = document.getElementById('result-best');
    if (isNewBest) {
      bestEl.textContent = `🏆 新記録！ ${formatTime(timerSecs)}`;
      bestEl.className = 'result-best new-record';
    } else {
      const best = getBestTime(currentDifficulty);
      bestEl.textContent = `ベストタイム ${formatTime(best)}`;
      bestEl.className = 'result-best';
    }

    saveStreak();
    const text = game.buildShareText(puzzleDay, timerSecs, hintsUsed);
    shareText.textContent = text;
    document.getElementById('btn-share').style.display = 'block';
  } else {
    emoji.textContent = '😢';
    title.textContent = '残業確定...';
    msg.textContent   = 'どこかバランスが崩れています。もう一度確認してみよう！';
    document.getElementById('result-best').textContent = '';
    shareText.textContent = '';
    document.getElementById('btn-share').style.display = 'none';
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

  document.querySelectorAll('.diff-tab').forEach(btn => {
    btn.addEventListener('click', () => loadDifficulty(btn.dataset.diff));
  });

  document.getElementById('btn-clear').addEventListener('click', () => {
    game.reset();
    stopTimer();
    hintsUsed = 0;
    hideHintPanel();
    updateUndoButton();
    renderGrid();
    if (!isCompletedToday(currentDifficulty)) startTimer();
  });

  document.getElementById('btn-undo').addEventListener('click', () => {
    if (!game.undo()) return;
    hintTargetCell = null;
    updateUndoButton();
    renderGrid();
  });

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
      markCompleted(currentDifficulty);
      renderDifficultyTabs();
      showResult(true);
    } else {
      showResult(false);
    }
  });

  document.getElementById('btn-share').addEventListener('click', () => {
    const text = game.buildShareText(puzzleDay, timerSecs, hintsUsed);
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text).then(() => {
        document.getElementById('btn-share').textContent = '✅ コピーしました！';
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

  window.addEventListener('resize', () => renderConstraints());
});
