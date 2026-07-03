'use strict';

function getRandomCode() {
  const digits = [];
  while (digits.length < 3) {
    const d = Math.floor(Math.random() * 10);
    if (!digits.includes(d)) digits.push(d);
  }
  return digits;
}

// Strike / Ball 判定（重複あり対応）
function evaluate(secret, guess) {
  const sUsed = [false, false, false];
  const gUsed = [false, false, false];
  let strikes = 0, balls = 0;
  for (let i = 0; i < 3; i++) {
    if (guess[i] === secret[i]) { strikes++; sUsed[i] = gUsed[i] = true; }
  }
  for (let i = 0; i < 3; i++) {
    if (gUsed[i]) continue;
    for (let j = 0; j < 3; j++) {
      if (sUsed[j]) continue;
      if (guess[i] === secret[j]) { balls++; sUsed[j] = true; break; }
    }
  }
  return { strikes, balls };
}

// ===== i18n =====
let LANG = navigator.language.startsWith('ja') ? 'ja' : 'en';

const TRANSLATIONS = {
  ja: {
    howto_btn:        '遊び方',
    subtitle:         'ブラック企業の出口暗証番号を解読して帰ろう',
    legend_s:         'S = 数字・位置ともに正解',
    legend_b:         'B = 数字は含まれるが位置が違う',
    btn_delete:       '⌫ 消す',
    btn_submit:       '解読！',
    memo_header:      '🗒️ メモ',
    memo_digit_label: '数字の状態',
    memo_digit_hint:  'タップ: 不明 → <span class="chip-out-eg">✕ない</span> → <span class="chip-in-eg">◯ある</span>',
    memo_pos_label:   '位置メモ',
    memo_pos_hint:    'タップで数字を設定',
    win_title:        '脱出成功！',
    win_msg:          '回で暗証番号を解読！',
    win_answer:       '答え:',
    btn_share:        '𝕏 でシェア',
    picker_possible:  '確定にする',
    picker_confirmed: '✓ 確定済み',
    picker_clear:     'クリア',
    picker_pos_title: pos => `位置${['①','②','③'][pos]}の候補`,
    share_title:      '🔒 定時退社ロック',
    share_count:      n => `${n}回で脱出！`,
    share_url:        'teiji-tango.com/lock/',
    link_tango:       '🎵 定時退社タンゴ',
    link_escape:      '🕹️ 定時退社エスケープ',
  },
  en: {
    howto_btn:        'How to Play',
    subtitle:         'Crack the exit code and escape the black company',
    legend_s:         'S = right digit & position',
    legend_b:         'B = right digit, wrong position',
    btn_delete:       '⌫ Del',
    btn_submit:       'Decode!',
    memo_header:      '🗒️ Notes',
    memo_digit_label: 'Digit Status',
    memo_digit_hint:  'Tap: Unknown → <span class="chip-out-eg">✕ out</span> → <span class="chip-in-eg">◯ in</span>',
    memo_pos_label:   'Position Notes',
    memo_pos_hint:    'Tap to set digit',
    win_title:        'Escaped!',
    win_msg:          ' tries to crack the code!',
    win_answer:       'Answer:',
    btn_share:        'Share on 𝕏',
    picker_possible:  'Mark as confirmed',
    picker_confirmed: '✓ Confirmed',
    picker_clear:     'Clear',
    picker_pos_title: pos => `Position ${['①','②','③'][pos]} candidates`,
    share_title:      '🔒 Teiji Lock',
    share_count:      n => `Escaped in ${n} ${n === 1 ? 'try' : 'tries'}!`,
    share_url:        'teiji-tango.com/lock/',
    link_tango:       '🎵 Teiji Tango',
    link_escape:      '🕹️ Teiji Escape',
  },
};

const HOWTO_HTML = {
  ja: `
<div class="howto-header"><h2>🔒 定時退社ロックの遊び方</h2></div>
<div class="howto-section">
  <h3>📖 ストーリー</h3>
  <p>仕事を終えたが、帰るためにはブラック企業の出口暗証番号を解読しなければならない、、、<br>3桁のコードを解読して、定時に帰ろう！</p>
</div>
<div class="howto-section">
  <h3>🎮 基本ルール</h3>
  <p>3桁の数字（0〜9、各桁は全て異なる）を入力して「解読！」を押すと、ヒントが表示されます。</p>
  <ul class="howto-list">
    <li>① 〜 ③ の3桁の数字を当てるゲームです</li>
    <li>数字だけでなく、<strong>位置まで正確に</strong>当てる必要があります</li>
    <li>入力後のヒント: 位置も含めて正解なら <span class="s">S（ストライク）</span>、数字は含まれるが位置が違えば <span class="b">B（ボール）</span></li>
    <li>3桁の数字は全て異なります（同じ数字は使われません）</li>
  </ul>
  <div class="howto-example">
    <div class="ex-answer">正解: <strong>3 &nbsp;5 &nbsp;9</strong> の場合</div>
    <div class="ex-row">
      <span class="ex-guess">3 5 7</span>
      <span class="ex-result"><span class="s">2S</span> <span class="b">0B</span></span>
      <span class="ex-desc">① 3・② 5 が正しい位置、7 は含まれない</span>
    </div>
    <div class="ex-row">
      <span class="ex-guess">1 2 3</span>
      <span class="ex-result"><span class="s">0S</span> <span class="b">1B</span></span>
      <span class="ex-desc">3 は含まれるが位置が違う（③ではなく①）</span>
    </div>
    <div class="ex-row">
      <span class="ex-guess">4 6 8</span>
      <span class="ex-result"><span class="s">0S</span> <span class="b">0B</span></span>
      <span class="ex-desc">4・6・8 はすべて含まれない</span>
    </div>
  </div>
  <p><span class="s">3S</span> <span class="b">0B</span> で脱出成功！試行回数に制限はありません。</p>
</div>
<div class="howto-section">
  <h3>🗒️ メモ機能</h3>
  <p><strong>数字の状態（0〜9チップ）:</strong> タップで状態を切り替え。<br>
  初期（灰）→ <span style="color:var(--error)">✕ない（赤）</span> → <span style="color:var(--beer-color)">◯ある（黄）</span></p>
  <p><strong>位置メモ（①②③）:</strong> タップして候補数字を選択。複数選択可能。<br>
  「確定にする」を押すと1つに絞って確定（緑）表示。</p>
</div>`,
  en: `
<div class="howto-header"><h2>🔒 How to Play Teiji Lock</h2></div>
<div class="howto-section">
  <h3>📖 Story</h3>
  <p>You've finally wrapped up work for the day — time to head home!<br>But this black company locks its exit with a secret passcode. Crack the 3-digit code to make your escape!</p>
</div>
<div class="howto-section">
  <h3>🎮 Basic Rules</h3>
  <p>Enter a 3-digit number (0–9, all digits unique) and press "Decode!" to get a hint.</p>
  <ul class="howto-list">
    <li>Guess the correct 3-digit code for positions ①②③</li>
    <li>Both the <strong>digit AND its position</strong> must be correct</li>
    <li>After each guess: <span class="s">S (Strike)</span> = right digit, right position; <span class="b">B (Ball)</span> = right digit, wrong position</li>
    <li>All 3 digits are different — no repeats in the code</li>
  </ul>
  <div class="howto-example">
    <div class="ex-answer">Example: Answer is <strong>3 &nbsp;5 &nbsp;9</strong></div>
    <div class="ex-row">
      <span class="ex-guess">3 5 7</span>
      <span class="ex-result"><span class="s">2S</span> <span class="b">0B</span></span>
      <span class="ex-desc">① 3 and ② 5 correct; 7 not in code</span>
    </div>
    <div class="ex-row">
      <span class="ex-guess">1 2 3</span>
      <span class="ex-result"><span class="s">0S</span> <span class="b">1B</span></span>
      <span class="ex-desc">3 is in code but wrong position (①, not ③)</span>
    </div>
    <div class="ex-row">
      <span class="ex-guess">4 6 8</span>
      <span class="ex-result"><span class="s">0S</span> <span class="b">0B</span></span>
      <span class="ex-desc">4, 6, 8 are not in the code</span>
    </div>
  </div>
  <p><span class="s">3S</span> <span class="b">0B</span> = Success! No limit on attempts.</p>
</div>
<div class="howto-section">
  <h3>🗒️ Notes Feature</h3>
  <p><strong>Digit Status (0–9 chips):</strong> Tap to cycle through states.<br>
  Default (grey) → <span style="color:var(--error)">✕ out (red)</span> → <span style="color:var(--beer-color)">◯ in (yellow)</span></p>
  <p><strong>Position Notes (①②③):</strong> Tap to select candidate digits. Multiple selections allowed.<br>
  Press "Mark as confirmed" to lock in a single digit (shown in green).</p>
</div>`,
};

function applyLang() {
  const T = TRANSLATIONS[LANG];
  document.documentElement.lang = LANG;
  document.getElementById('lang-btn').textContent = LANG === 'ja' ? 'EN' : 'JA';
  document.getElementById('howto-body').innerHTML = HOWTO_HTML[LANG];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const val = T[el.dataset.i18n];
    if (typeof val !== 'string') return;
    if (val.includes('<')) el.innerHTML = val;
    else el.textContent = val;
  });
}

// ===== State =====
const SECRET = getRandomCode();
let current = [];
let history = [];
let won     = false;

// digitState: 'unknown' | 'out' | 'in'
const digitState = new Array(10).fill('unknown');
// posState: { digits: number[], confirmed: boolean }
const posState = [
  { digits: [], confirmed: false },
  { digits: [], confirmed: false },
  { digits: [], confirmed: false },
];
let pickerTargetPos = null;

// ===== DOM refs =====
const boxes     = [0, 1, 2].map(i => document.getElementById(`d${i}`));
const historyEl = document.getElementById('history');
const winModal  = document.getElementById('win-modal');
const submitBtn = document.getElementById('submit-btn');
const deleteBtn = document.getElementById('delete-btn');
const posPicker = document.getElementById('pos-picker');

// ===== ゲームコア =====
function refreshDisplay() {
  boxes.forEach((box, i) => {
    const v = current[i];
    box.textContent = v !== undefined ? v : '_';
    box.classList.toggle('filled', v !== undefined);
  });
}

function addRow(guess, result) {
  const { strikes, balls } = result;
  const row = document.createElement('div');
  row.className = 'history-row';
  let resultHtml;
  if (strikes === 3) {
    resultHtml = `<span class="result-open">🔓 OPEN!</span>`;
  } else {
    resultHtml = `<span class="strike-num">${strikes}S</span> <span class="ball-num">${balls}B</span>`;
  }
  row.innerHTML = `
    <span class="history-guess">${guess.join(' ')}</span>
    <span class="history-result">${resultHtml}</span>
  `;
  historyEl.insertBefore(row, historyEl.firstChild);
}

function showWin() {
  document.getElementById('attempt-count').textContent = history.length;
  document.getElementById('secret-display').textContent = SECRET.join(' - ');
  winModal.classList.remove('hidden');
}

function inputDigit(n) {
  if (won || current.length >= 3) return;
  current.push(n);
  refreshDisplay();
}

function deleteDigit() {
  if (won || current.length === 0) return;
  current.pop();
  refreshDisplay();
}

function getHint(strikes, balls) {
  const l = LANG;
  if (strikes === 3) return '';
  if (strikes === 0 && balls === 0) {
    return l === 'en'
      ? 'None of these digits seem to be in the code...'
      : 'これらの数字はどこにも含まれないようだ...';
  }
  const lines = [];
  if (strikes > 0) {
    const msg = l === 'en'
      ? `${strikes} digit${strikes > 1 ? 's' : ''} seem${strikes === 1 ? 's' : ''} to be in the right position...`
      : `${strikes}つの数字の場所が正しいようだ...`;
    lines.push(`<span class="strike-num">${strikes}S</span>…${msg}`);
  }
  if (balls > 0) {
    const msg = l === 'en'
      ? `${balls} digit${balls > 1 ? 's' : ''} ${balls === 1 ? 'is' : 'are'} in the code, but in the wrong spot...`
      : `${balls}つの数字が答えに含まれるようだ...ただ場所が違う`;
    lines.push(`<span class="ball-num">${balls}B</span>…${msg}`);
  }
  return lines.join('<br>');
}

function closePopup() {
  document.getElementById('result-popup').classList.add('hidden');
}

function showResultPopup(guess, result) {
  const popup = document.getElementById('result-popup');
  const isWin = result.strikes === 3;

  document.getElementById('popup-digits').textContent =
    guess.map(d => NUM_EMOJI[d]).join(' ');

  document.getElementById('popup-result').innerHTML = isWin
    ? `<span class="result-open">🔓 OPEN!</span>`
    : `<span class="strike-num">${result.strikes}S</span>&nbsp;&nbsp;<span class="ball-num">${result.balls}B</span>`;

  document.getElementById('popup-hint').innerHTML = getHint(result.strikes, result.balls);

  popup.classList.remove('hidden');

  if (isWin) {
    setTimeout(closePopup, 1400);
  }
}

function submit() {
  if (won || current.length !== 3) return;
  const guess  = [...current];
  const result = evaluate(SECRET, guess);
  history.push({ guess, result });
  addRow(guess, result);
  showResultPopup(guess, result);
  current = [];
  refreshDisplay();
  if (result.strikes === 3) {
    won = true;
    submitBtn.disabled = true;
    deleteBtn.disabled = true;
    setTimeout(showWin, 1600);
  }
}

// ===== モーダル =====
document.getElementById('modal-close-btn').addEventListener('click', () => {
  winModal.classList.add('hidden');
});

const howtoModal = document.getElementById('howto-modal');
document.getElementById('howto-btn').addEventListener('click', () => {
  howtoModal.classList.remove('hidden');
});
document.getElementById('howto-close').addEventListener('click', () => {
  howtoModal.classList.add('hidden');
});

// ===== シェア =====
const NUM_EMOJI = ['0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'];

document.getElementById('share-btn').addEventListener('click', () => {
  const T = TRANSLATIONS[LANG];
  const lines = history.map(({ guess, result }) => {
    const digits = guess.map(d => NUM_EMOJI[d]).join('');
    return `${digits}: ${result.strikes}🏏 ${result.balls}⚾`;
  }).join('\n');
  const text = `${T.share_title}\n${T.share_count(history.length)}\n\n${lines}\n\n${T.share_url}`;
  window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
});

// ===== 言語切り替え =====
document.getElementById('lang-btn').addEventListener('click', () => {
  LANG = LANG === 'ja' ? 'en' : 'ja';
  applyLang();
});

// ===== キーボード =====
document.addEventListener('keydown', e => {
  if (posPicker && !posPicker.classList.contains('hidden')) return;
  if (e.key >= '0' && e.key <= '9') inputDigit(parseInt(e.key));
  else if (e.key === 'Backspace') deleteDigit();
  else if (e.key === 'Enter') submit();
});

submitBtn.addEventListener('click', submit);
deleteBtn.addEventListener('click', deleteDigit);
document.querySelectorAll('.num-btn').forEach(btn => {
  btn.addEventListener('click', () => { closePopup(); inputDigit(parseInt(btn.dataset.num)); });
});

document.getElementById('result-popup').addEventListener('click', closePopup);
document.getElementById('popup-close').addEventListener('click', e => { e.stopPropagation(); closePopup(); });

// ===== 数字チップ（メモ） =====
const chipContainer = document.getElementById('digit-chips');
const CHIP_STATES = ['unknown', 'out', 'in'];

for (let d = 0; d <= 9; d++) {
  const chip = document.createElement('button');
  chip.className = 'digit-chip';
  chip.textContent = d;
  chip.dataset.digit = d;
  chip.addEventListener('click', () => {
    const cur = CHIP_STATES.indexOf(digitState[d]);
    digitState[d] = CHIP_STATES[(cur + 1) % CHIP_STATES.length];
    renderChip(chip, d);
  });
  chipContainer.appendChild(chip);
}

function renderChip(chip, d) {
  chip.classList.remove('state-out', 'state-in');
  if (digitState[d] === 'out') chip.classList.add('state-out');
  if (digitState[d] === 'in')  chip.classList.add('state-in');
}

// ===== 位置メモ =====
function renderPosSlot(pos) {
  const slot  = document.querySelector(`.pos-slot[data-pos="${pos}"]`);
  const value = document.getElementById(`pv${pos}`);
  const st    = posState[pos];
  slot.classList.remove('state-possible', 'state-confirmed');
  if (st.digits.length === 0) {
    value.textContent = '?';
    value.style.fontSize = '';
  } else if (st.confirmed) {
    value.textContent = st.digits[0];
    value.style.fontSize = '';
    slot.classList.add('state-confirmed');
  } else {
    const sorted = [...st.digits].sort((a, b) => a - b);
    value.textContent = sorted.join(' ');
    value.style.fontSize = st.digits.length > 3 ? '0.8rem' : '1rem';
    slot.classList.add('state-possible');
  }
}

document.querySelectorAll('.pos-slot').forEach(slot => {
  slot.addEventListener('click', () => {
    pickerTargetPos = parseInt(slot.dataset.pos);
    openPicker(pickerTargetPos);
  });
});

// ===== ピッカー =====
const pickerDigitsEl  = document.getElementById('picker-digits');
const pickerToggleBtn = document.getElementById('picker-toggle');
const pickerTitleEl   = document.getElementById('picker-title');

for (let d = 0; d <= 9; d++) {
  const btn = document.createElement('button');
  btn.className = 'picker-digit-btn';
  btn.textContent = d;
  btn.dataset.d = d;
  btn.addEventListener('click', () => {
    if (pickerTargetPos === null) return;
    const st = posState[pickerTargetPos];
    if (st.confirmed) {
      st.digits = [d];
    } else {
      const idx = st.digits.indexOf(d);
      if (idx >= 0) st.digits.splice(idx, 1);
      else st.digits.push(d);
    }
    renderPickerDigits();
    renderPosSlot(pickerTargetPos);
  });
  pickerDigitsEl.appendChild(btn);
}

function renderPickerDigits() {
  if (pickerTargetPos === null) return;
  const st = posState[pickerTargetPos];
  document.querySelectorAll('.picker-digit-btn').forEach(btn => {
    const isSelected = st.digits.includes(parseInt(btn.dataset.d));
    btn.classList.toggle('selected', isSelected);
    btn.classList.toggle('confirmed-selected', isSelected && st.confirmed);
  });
}

function openPicker(pos) {
  const T = TRANSLATIONS[LANG];
  pickerTargetPos = pos;
  const st = posState[pos];
  pickerTitleEl.textContent = T.picker_pos_title(pos);
  const isConfirmed = st.confirmed;
  pickerToggleBtn.classList.toggle('picker-toggle-on', isConfirmed);
  pickerToggleBtn.textContent = isConfirmed ? T.picker_confirmed : T.picker_possible;
  renderPickerDigits();
  posPicker.classList.remove('hidden');
}

function closePicker() {
  posPicker.classList.add('hidden');
  pickerTargetPos = null;
}

pickerToggleBtn.addEventListener('click', () => {
  if (pickerTargetPos === null) return;
  const T = TRANSLATIONS[LANG];
  const st = posState[pickerTargetPos];
  st.confirmed = !st.confirmed;
  if (st.confirmed && st.digits.length > 1) {
    st.digits = [];
    renderPickerDigits();
    renderPosSlot(pickerTargetPos);
  }
  pickerToggleBtn.classList.toggle('picker-toggle-on', st.confirmed);
  pickerToggleBtn.textContent = st.confirmed ? T.picker_confirmed : T.picker_possible;
  renderPosSlot(pickerTargetPos);
});

document.getElementById('picker-clear').addEventListener('click', () => {
  if (pickerTargetPos === null) return;
  posState[pickerTargetPos] = { digits: [], confirmed: false };
  renderPosSlot(pickerTargetPos);
  closePicker();
});

document.getElementById('picker-close').addEventListener('click', closePicker);

// ===== Init =====
applyLang();
refreshDisplay();
