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
const MODE_LABELS_EN = {
  normal: 'Standard',
  wall:   '🧱 Walls',
  region: '🗂️ Regions',
  x:      'X-Tango',
  killer: '🔪 Killer',
};
function getModeLabel(mode) {
  return MODE_LABELS[mode] || mode; // 常に日本語（シェアテキスト用）
}
function getModeDisplayLabel(mode) {
  return LANG === 'ja' ? (MODE_LABELS[mode] || mode) : (MODE_LABELS_EN[mode] || mode);
}
function getDiffDisplayLabel(diff) {
  if (LANG === 'ja') return diff;
  if (diff === '初級') return t('diff_easy');
  if (diff === '中級') return t('diff_mid');
  if (diff === '上級') return t('diff_hard');
  return diff;
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

// ─── フィーチャーフラグ：機能の一時オフ ─────────────────
// 段階公開（上）とは別に、「実装済みだが初回リリースでは隠したい」機能を on/off するためのフラグ。
// false の機能はUIから完全に隠れるが、コードはそのまま残るので true に戻すだけで再有効化できる。
const FEATURE_FLAGS = {
  themeSwitcher: false, // 寿司・狐テーマはグローバル展開時用に用意したもの。初回はシンプルにするため非表示
  tentativeMode: false, // 仮置き機能。ソルバー改善でロジックだけで解けるパズルが作れるようになり出番が減ったため一旦オフ
};

// ─── 多言語対応 ─────────────────────────────────
const LANG = (typeof navigator !== 'undefined' ? (navigator.language || 'ja') : 'ja').startsWith('ja') ? 'ja' : 'en';

const I18N = {
  subtitle:       { ja: '今日もバランスよく定時退社しよう', en: 'Balance work and fun — clock out on time!' },
  streak_label:   { ja: '日連続', en: ' day streak' },
  mode_normal:    { ja: '通常', en: 'Standard' },
  mode_wall:      { ja: '🧱 壁あり', en: '🧱 Walls' },
  mode_region:    { ja: '🗂️ エリア', en: '🗂️ Regions' },
  mode_x:         { ja: 'Xタンゴ', en: 'X-Tango' },
  mode_killer:    { ja: '🔪 キラータンゴ', en: '🔪 Killer' },
  diff_easy:      { ja: '初級', en: 'Easy' },
  diff_mid:       { ja: '中級', en: 'Medium' },
  diff_hard:      { ja: '上級', en: 'Hard' },
  legend1:        { ja: '出社', en: 'Work' },
  legend2:        { ja: '退社', en: 'Beer' },
  rules_hint:     { ja: '2種類の記号は<strong>3連続はNG</strong>・各行列は<strong>同数</strong>', en: 'No <strong>3 in a row</strong> · Equal count per row &amp; column' },
  btn_reset:      { ja: 'リセット', en: 'Reset' },
  btn_undo:       { ja: '↩ 戻す', en: '↩ Undo' },
  btn_hint:       { ja: '💡 ヒント', en: '💡 Hint' },
  btn_check:      { ja: '確認する', en: 'Check' },
  btn_next:       { ja: '次のパズルへ', en: 'Next Puzzle' },
  btn_share_x:    { ja: 'Xでシェア', en: 'Share on X' },
  btn_share_fb:   { ja: 'Facebookでシェア', en: 'Share on Facebook' },
  btn_share_copy: { ja: '📋 コピー', en: '📋 Copy' },
  btn_copied:     { ja: '✅ コピーしました！', en: '✅ Copied!' },
  hint_penalty:   { ja: '+5秒', en: '+5 sec' },
  hint_default:   { ja: '💡 ヒント', en: '💡 Hint' },
  result_win:     { ja: '定時退社！', en: 'Clocked Out! 🏃' },
  result_lose:    { ja: '残業確定...', en: 'Overtime... 😢' },
  result_win_msg: {
    ja: (time, hints) => `お疲れ様でした！ ${time} でクリア${hints > 0 ? `（ヒント${hints}回使用）` : ''}`,
    en: (time, hints) => `Well done! Solved in ${time}${hints > 0 ? ` (${hints} hint${hints > 1 ? 's' : ''})` : ''}`,
  },
  result_lose_msg: { ja: 'どこかバランスが崩れています。もう一度確認してみよう！', en: "Something's off — check your grid!" },
  result_new_best: { ja: (t) => `🏆 新記録！ ${t}`, en: (t) => `🏆 New best! ${t}` },
  result_best:     { ja: (t) => `ベストタイム ${t}`, en: (t) => `Best: ${t}` },
  clue_count:      { ja: (n) => `手がかり${n}個`, en: (n) => `Clues: ${n}` },
  cage_count:      { ja: (n) => `枠${n}個`, en: (n) => `Cages: ${n}` },
  done_label:      { ja: '✅ クリア済み', en: '✅ Done!' },
  new_ach_label:   { ja: '🏅 新しい実績', en: '🏅 New Achievement' },
  howto_title:     { ja: '遊び方', en: 'How to Play' },
  ach_title:       { ja: '🏅 実績', en: '🏅 Achievements' },
};

function t(key) {
  const entry = I18N[key];
  if (!entry) return key;
  return entry[LANG] !== undefined ? entry[LANG] : entry.ja;
}

function applyHowtoI18n() {
  const S = document.querySelectorAll('#howto-modal .howto-section');
  const setText = (el, txt) => { if (el) el.textContent = txt; };
  const setHTML = (el, html) => { if (el) el.innerHTML = html; };

  setText(S[0]?.querySelector('h3'), '🎯 Goal');
  setText(S[0]?.querySelector('p'), 'Fill all cells using 👔 and 🍺 following three rules!');

  setText(S[1]?.querySelector('h3'), '👆 Controls');
  setText(S[1]?.querySelector('p'), 'Tap a cell to cycle through symbols');

  setText(S[2]?.querySelector('h3'), 'Rule 1: Balance');
  setHTML(S[2]?.querySelector('p'), 'Each row and column must have exactly <strong>3 👔 and 3 🍺</strong>');
  setText(S[2]?.querySelector('.demo-ng'), '❌ Unbalanced');

  setText(S[3]?.querySelector('h3'), 'Rule 2: No 3 in a Row');
  setHTML(S[3]?.querySelector('p'), 'No <strong>3 identical symbols</strong> in a row (horizontally or vertically)');

  setText(S[4]?.querySelector('h3'), 'Rule 3: Constraints');
  setText(S[4]?.querySelector('p'), 'Follow the markers between cells');
  const descs = S[4]?.querySelectorAll('.demo-con-desc');
  if (descs) {
    setHTML(descs[0], '<strong>=</strong> Same symbol');
    setHTML(descs[1], '<strong>×</strong> Different symbol');
  }

  setText(S[5]?.querySelector('h3'), '🧱 Walls Mode (extra rule)');
  setText(S[5]?.querySelector('p'), 'Thick borders block the chain — three-in-a-row does NOT count across a wall.');
  setText(S[5]?.querySelector('.demo-ok'), '✅ OK across a wall');
  setText(S[5]?.querySelector('.demo-ng'), '❌ 3 in a row (no wall)');

  const killer = document.getElementById('howto-killer');
  setText(killer?.querySelector('h3'), '🔪 Killer Mode');
  setText(killer?.querySelector('p'), 'Cells are grouped into cages. The number shows how many 🍺 are inside.');
  setText(killer?.querySelector('.demo-ok'), '✅ 2 🍺 inside');
  setText(killer?.querySelector('.howto-note'), 'No given cells — start from a blank grid!');

  const xMode = document.getElementById('howto-x');
  setText(xMode?.querySelector('h3'), 'X-Tango Mode (extra rule)');
  setText(xMode?.querySelector('p'), 'The two diagonals (purple) must also have 3 👔 and 3 🍺 each, with no 3 in a row!');

  const region = document.getElementById('howto-region');
  setText(region?.querySelector('h3'), '🗂️ Regions Mode (extra rule)');
  setText(region?.querySelector('p'), 'The grid is split into 6 regions. Each region must also have exactly 3 👔 and 3 🍺!');

  setText(S[9]?.querySelector('h3'), '💡 Hint');
  setText(S[9]?.querySelector('p'), 'Press 💡 Hint to reveal the next move and the reason.');
  setText(S[9]?.querySelector('.howto-note'), '⚠️ +5 sec penalty per hint used');

  setText(S[10]?.querySelector('h3'), '⏱ Timer & Share');
  setText(S[10]?.querySelector('p'), 'Timer starts on your first tap. Share your grid after solving!');
}

function applyI18n() {
  if (LANG === 'ja') return;

  document.querySelector('.subtitle').textContent = t('subtitle');
  document.getElementById('streak-label').textContent = t('streak_label');

  document.querySelector('[data-mode="normal"]').textContent  = t('mode_normal');
  document.querySelector('[data-mode="wall"]').textContent    = t('mode_wall');
  document.querySelector('[data-mode="region"]').textContent  = t('mode_region');
  document.querySelector('[data-mode="x"]').textContent       = t('mode_x');
  document.querySelector('[data-mode="killer"]').textContent  = t('mode_killer');

  document.querySelector('[data-diff="初級"]').textContent = t('diff_easy');
  document.querySelector('[data-diff="中級"]').textContent = t('diff_mid');
  document.querySelector('[data-diff="上級"]').textContent = t('diff_hard');

  document.getElementById('legend-label1').textContent = t('legend1');
  document.getElementById('legend-label2').textContent = t('legend2');
  document.querySelector('.rules-hint p').innerHTML = t('rules_hint');

  document.getElementById('btn-clear').textContent  = t('btn_reset');
  document.getElementById('btn-undo').textContent   = t('btn_undo');
  document.getElementById('btn-hint').textContent   = t('btn_hint');
  document.getElementById('btn-check').textContent  = t('btn_check');
  document.getElementById('btn-next').textContent   = t('btn_next');
  document.getElementById('btn-share-x').textContent   = t('btn_share_x');
  document.getElementById('btn-share-fb').textContent  = t('btn_share_fb');
  document.getElementById('btn-share-copy').textContent = t('btn_share_copy');

  document.querySelector('#howto-modal h2').textContent = t('howto_title');
  document.querySelector('#ach-modal h2').textContent   = t('ach_title');

  applyHowtoI18n();
}

function gaEvent(name, params) {
  if (typeof gtag === 'function') gtag('event', name, params || {});
}

// タイマー
let timerSecs = 0;
let timerInterval = null;
let hintsUsed = 0;
let puzzleStarted = false;

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
  // テーマ切替がフラグでオフの間は、過去に選択保存されたテーマ（例: 検証中の寿司・狐）が
  // 残っていても無視し、常にデフォルト（👔🍺）に固定する
  if (!FEATURE_FLAGS.themeSwitcher) return THEMES[0];
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
  { id: 'first_clear', icon: '🎯', name: LANG==='ja'?'はじめての定時退社':'First Clear',   desc: LANG==='ja'?'初めてクリア':'Complete your first puzzle' },
  { id: 'no_hint',     icon: '🎖️', name: LANG==='ja'?'ノーヒント退社':'No-Hint Clear',   desc: LANG==='ja'?'ヒントなしでクリア':'Solve without hints' },
  { id: 'speed_easy',  icon: '⚡',  name: LANG==='ja'?'スピード退社':'Speed Clear',        desc: LANG==='ja'?'初級を2分以内でクリア':'Solve Easy in under 2 min' },
  { id: 'clear_mid',   icon: '🧠',  name: LANG==='ja'?'中堅社員':'Mid-level Staff',        desc: LANG==='ja'?'中級をクリア':'Solve a Medium puzzle' },
  { id: 'clear_hard',  icon: '👑',  name: LANG==='ja'?'エース社員':'Ace Employee',          desc: LANG==='ja'?'上級をクリア':'Solve a Hard puzzle' },
  { id: 'streak_3',    icon: '🔥',  name: LANG==='ja'?'3日連続':'3-Day Streak',             desc: LANG==='ja'?'3日連続でプレイ':'Play 3 days in a row' },
  { id: 'streak_7',    icon: '💫',  name: LANG==='ja'?'7日連続':'7-Day Streak',             desc: LANG==='ja'?'7日連続でプレイ':'Play 7 days in a row' },
  { id: 'all_diff',    icon: '⭐',  name: LANG==='ja'?'三冠達成':'Triple Crown',            desc: LANG==='ja'?'1日で3難易度全てクリア':'Clear all 3 difficulties in one day' },
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
  el.innerHTML = `<div class="result-ach-label">${t('new_ach_label')}</div>` +
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
    const unlocked = isModeUnlocked(mode);
    btn.classList.toggle('flag-hidden', !unlocked);
    btn.classList.toggle('mode-locked', !unlocked);
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
  puzzleStarted = false;

  game = new TangoGame(currentPuzzle);

  const done = isCompletedToday(currentMode, difficulty);
  if (done) {
    // 本日クリア済み: 再プレイによるタイマー/記録の汚染を防ぐため、正解を表示して操作不可にする
    game.grid = currentPuzzle.solution.map(row => [...row]);
  }

  const initialCount = currentPuzzle.initial.flat().filter(v => v !== 0).length;
  document.getElementById('puzzle-day').textContent = `Day ${puzzleDay}`;
  document.getElementById('difficulty').textContent = currentMode === 'killer'
    ? t('cage_count')(currentPuzzle.cages.length)
    : t('clue_count')(initialCount);

  renderDifficultyTabs();
  renderBestTime(currentMode, difficulty);
  hideHintPanel();
  updateUndoButton();
  renderGrid();
  setControlsLocked(done);

  if (!done) {
    startTimer();
  } else {
    document.getElementById('timer').textContent = t('done_label');
  }
}

function setControlsLocked(locked) {
  ['btn-clear', 'btn-undo', 'btn-tentative', 'btn-hint', 'btn-check'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = locked;
  });
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
  if (!FEATURE_FLAGS.tentativeMode) return;
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
  if (isCompletedToday(currentMode, currentDifficulty)) return;
  hintTargetCell = null;

  if (!game.toggle(r, c)) return;

  if (!puzzleStarted) {
    puzzleStarted = true;
    gaEvent('puzzle_start', { mode: currentMode, difficulty: currentDifficulty });
  }
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

  modeLabelEl.textContent = `${getModeDisplayLabel(currentMode)}・${getDiffDisplayLabel(currentDifficulty)}`;

  if (won) {
    gaEvent('puzzle_complete', { mode: currentMode, difficulty: currentDifficulty, time_seconds: timerSecs, hints_used: hintsUsed });
    emoji.textContent = '🎉';
    title.textContent = t('result_win');
    msg.textContent = t('result_win_msg')(formatTime(timerSecs), hintsUsed);

    const isNewBest = tryUpdateBestTime(currentMode, currentDifficulty, timerSecs);
    renderBestTime(currentMode, currentDifficulty);
    const bestEl = document.getElementById('result-best');
    if (isNewBest) {
      bestEl.textContent = t('result_new_best')(formatTime(timerSecs));
      bestEl.className = 'result-best new-record';
    } else {
      const best = getBestTime(currentMode, currentDifficulty);
      bestEl.textContent = t('result_best')(formatTime(best));
      bestEl.className = 'result-best';
    }

    saveStreak();
    const newAchs = checkAndEarnAchievements(currentDifficulty, timerSecs, hintsUsed);
    renderResultAchievements(newAchs);
    const text = game.buildShareText(puzzleDay, timerSecs, hintsUsed, currentTheme.sym1, currentTheme.sym2, getModeDisplayLabel(currentMode), getDiffDisplayLabel(currentDifficulty), LANG);
    shareText.textContent = text;
    document.getElementById('share-buttons').style.display = 'flex';
  } else {
    emoji.textContent = '😢';
    title.textContent = t('result_lose');
    msg.textContent   = t('result_lose_msg');
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

  if (!FEATURE_FLAGS.themeSwitcher) {
    document.querySelector('.theme-switcher')?.classList.add('flag-hidden');
  }
  if (!FEATURE_FLAGS.tentativeMode) {
    document.getElementById('btn-tentative')?.classList.add('flag-hidden');
  }

  // モード解禁日になったらhowtoの該当説明を表示（HTMLではflag-hiddenがデフォルト）
  [['region', 'howto-region'], ['x', 'howto-x'], ['killer', 'howto-killer']].forEach(([mode, id]) => {
    if (isModeUnlocked(mode)) document.getElementById(id)?.classList.remove('flag-hidden');
  });

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
    gaEvent('hint_used', { mode: currentMode, difficulty: currentDifficulty, hint_count: hintsUsed });
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
    gaEvent('share_clicked', { method: 'x', mode: currentMode, difficulty: currentDifficulty });
    const text = game.buildShareText(puzzleDay, timerSecs, hintsUsed, currentTheme.sym1, currentTheme.sym2, getModeDisplayLabel(currentMode), getDiffDisplayLabel(currentDifficulty), LANG);
    window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text), '_blank');
  });

  document.getElementById('btn-share-fb').addEventListener('click', () => {
    gaEvent('share_clicked', { method: 'facebook', mode: currentMode, difficulty: currentDifficulty });
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent('https://teiji-tango.com'), '_blank');
  });

  document.getElementById('btn-share-copy').addEventListener('click', () => {
    gaEvent('share_clicked', { method: 'copy', mode: currentMode, difficulty: currentDifficulty });
    const text = game.buildShareText(puzzleDay, timerSecs, hintsUsed, currentTheme.sym1, currentTheme.sym2, getModeDisplayLabel(currentMode), getDiffDisplayLabel(currentDifficulty), LANG);
    const btn = document.getElementById('btn-share-copy');
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = t('btn_copied');
        setTimeout(() => { btn.textContent = t('btn_share_copy'); }, 2000);
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

  applyI18n();
});
