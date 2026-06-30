'use strict';

// ─── i18n ────────────────────────────────────────────────────
const LANG = (navigator.language || 'ja').startsWith('ja') ? 'ja' : 'en';

const I18N = {
  subtitle:    { ja: 'マウスで操作 — 飛んでくる敵を避け続けろ！', en: 'Mouse to move — dodge everything flying at you!' },
  diffLabel:   { ja: '難易度', en: 'Difficulty' },
  diffNames:   { ja: ['', 'かんたん', 'やさしい', 'ふつう', 'むずかしい', 'げきむず'],
                 en: ['', 'Easy', 'Normal', 'Medium', 'Hard', 'Extreme'] },
  bestScore:   { ja: 'ベストスコア', en: 'Best' },
  startHint:   { ja: 'WASD / 矢印キーも可　|　SPACE でスタート', en: 'WASD / Arrow keys  |  SPACE to start' },
  overtime:    { ja: '残業確定...', en: 'Overtime confirmed...' },
  survived:    { ja: '生存時間', en: 'Survived' },
  prevBest:    { ja: 'ベストスコア', en: 'Best' },
  restartHint: { ja: 'SPACE でも再スタート', en: 'SPACE to restart' },
  shareX:      { ja: '𝕏 でシェア', en: 'Share on 𝕏' },
  shareLine:   { ja: 'LINE でシェア', en: 'Share on LINE' },
  btnHowto:    { ja: '遊び方', en: 'How to<br>Play' },
  howtoTitle:  { ja: '遊び方', en: 'How to Play' },
  howtoS1t:    { ja: 'ゲーム概要', en: 'Overview' },
  howtoS1:     { ja: '👔 シャツ（あなた）が定時退社を目指して逃げ続けるドッジゲーム。上司（ハゲ）・炎上案件・緊急メールなどを避けながら生存時間を伸ばそう！',
                 en: '👔 You are the shirt, trying to leave work on time. Dodge the bald boss, flaming projects, urgent emails, and more for as long as you can!' },
  howtoS2t:    { ja: '操作方法', en: 'Controls' },
  howtoS2:     { ja: 'マウス移動でシャツが追従します。スマホはドラッグ操作（指の動きに合わせてシャツが動く）。WASD・矢印キーでも動かせます。SPACEキーでスタート・リスタート。',
                 en: 'Move your mouse and the shirt follows. On mobile, drag your finger (relative movement). WASD/arrow keys also work. SPACE to start or restart.' },
  howtoS3t:    { ja: '定時退社を阻む敵', en: 'Your Enemies' },
  eNormal:     { ja: '上司、、、いつも色んな方向から無茶苦茶言ってくる。', en: 'Boss... always demanding unreasonable things from every direction.' },
  eFire:       { ja: '炎上案件 — 大きくて速い。要注意！', en: 'Flaming Project — big and fast. Watch out!' },
  eMail:       { ja: '緊急メール — 小さくてやや速い', en: 'Urgent Email — small and slightly fast' },
  eDoc:        { ja: '大量書類 — 大きくて遅い', en: 'Stack of Docs — big and slow' },
  eBeer:       { ja: 'ビール — 触れると +10点！ 積極的に取ろう', en: 'Beer — touch for <strong>+10 points</strong>! Go get it' },
  howtoS4t:    { ja: 'スコアとコツ', en: 'Score & Tips' },
  howtoS4:     { ja: 'スコア = 生存秒数 + ビール取得点数。時間が経つほど敵が速く・多くなり、シャツも大きくなって避けにくくなる。端に追い詰められないよう、中央付近で動き続けよう！',
                 en: 'Score = seconds survived + beer bonus. Over time, enemies get faster and more frequent, and your shirt grows larger. Stay near the center to avoid getting cornered!' },
  howtoNote:   { ja: '<strong>ヒント:</strong> ビールを狙いすぎて親父に突っ込まないように！',
                 en: '<strong>Tip:</strong> Don\'t chase beer into a pack of bosses!' },
  tangoLink:   { ja: '📐 定時退社タンゴも遊ぶ', en: '📐 Play Teiji-Tango' },
};
function t(key) { return I18N[key]?.[LANG] ?? I18N[key]?.ja ?? key; }
function tDiff(i) { return (I18N.diffNames[LANG] ?? I18N.diffNames.ja)[i]; }

const HOWTO_VERSION = 1;

function gaEvent(name, params) {
  if (typeof gtag === 'function') gtag('event', name, params || {});
}

const canvas        = document.getElementById('gameCanvas');
const ctx           = canvas.getContext('2d');
const W             = canvas.width;   // 600
const H             = canvas.height;  // 600
const btnHowto      = document.getElementById('btn-howto');
const modalHowto    = document.getElementById('howto-modal');
const btnHowtoClose = document.getElementById('btn-howto-close');

// ─── Constants ───────────────────────────────────────────────
const STATE = { START: 'start', PLAYING: 'playing', OVER: 'over' };

const COLORS = ['#ff3333', '#ff6600', '#ff0077', '#ff9900', '#cc1100'];

const BTN_W = 180;
const BTN_H = 52;
const BTN_START   = { x: W/2 - BTN_W/2, y: H/2 + 90, w: BTN_W, h: BTN_H };
const BTN_RESTART = { x: W/2 - BTN_W/2, y: H/2 + 90, w: BTN_W, h: BTN_H };

// ─── Difficulty ───────────────────────────────────────────────
const DIFF = [
  null,
  { speedMult: 0.65, spawnRate: 0.55, growthMult: 0.7  }, // ★1 かんたん
  { speedMult: 0.82, spawnRate: 0.75, growthMult: 0.85 }, // ★2 やさしい
  { speedMult: 1.0,  spawnRate: 1.0,  growthMult: 1.0  }, // ★3 ふつう
  { speedMult: 1.3,  spawnRate: 1.35, growthMult: 1.2  }, // ★4 むずかしい
  { speedMult: 1.75, spawnRate: 1.85, growthMult: 1.5  }, // ★5 げきむず
];
const DIFF_NAMES = ['', 'かんたん', 'やさしい', 'ふつう', 'むずかしい', 'げきむず'];
const STAR_SPACING = 48;
const STAR_Y = H/2 + 40;

// ─── Share buttons (game over screen) ────────────────────────
const BTN_SHARE_X    = { x: W/2 - 138, y: H/2 + 150, w: 126, h: 38 };
const BTN_SHARE_LINE = { x: W/2 + 12,  y: H/2 + 150, w: 126, h: 38 };

// ─── Tango cross-link (start / game-over screens) ────────────
const BTN_TANGO_LINK      = { x: W/2 - 130, y: H/2 + 152, w: 260, h: 30 };
const BTN_TANGO_LINK_OVER = { x: W/2 - 130, y: H/2 + 196, w: 260, h: 28 };

// ─── Mutable state ───────────────────────────────────────────
let gameState = STATE.START;
let elapsed   = 0;
let lastTime  = 0;
let lastSpawn = 0;
let rafId     = null;
let enemies   = [];

const player = { x: W/2, y: H/2, size: 20 };
const mouse  = { x: W/2, y: H/2, active: false };
const keys   = {};
// タッチ相対操作用（指を置いた起点からの差分でプレーヤーを動かす）
const drag   = { active: false, startX: 0, startY: 0, curX: 0, curY: 0, px: 0, py: 0 };

let highScore        = parseInt(localStorage.getItem('teiji-escape-highScore') || '0', 10);
let isNewHigh        = false;
let difficulty       = 3;
let theme            = 'hage';
let beerScore        = 0;
let effects          = []; // { x, y, text, startTime } floating score popups

// ─── Input ───────────────────────────────────────────────────
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * (W / r.width);
  mouse.y = (e.clientY - r.top)  * (H / r.height);
  mouse.active = true;
});
canvas.addEventListener('mouseleave', () => { mouse.active = false; });

canvas.addEventListener('click', e => {
  const r = canvas.getBoundingClientRect();
  onPointer(
    (e.clientX - r.left) * (W / r.width),
    (e.clientY - r.top)  * (H / r.height)
  );
});
document.addEventListener('touchstart', e => {
  if (e.target.closest('.te-modal') || e.target.closest('.btn-howto') || e.target.closest('.te-footer')) return;
  e.preventDefault();
  const r  = canvas.getBoundingClientRect();
  const cx = (e.touches[0].clientX - r.left) * (W / r.width);
  const cy = (e.touches[0].clientY - r.top)  * (H / r.height);
  if (gameState === STATE.PLAYING) {
    // 相対ドラッグ開始: 指の起点とそのときのプレーヤー位置を記録
    drag.active = true;
    drag.startX = cx; drag.startY = cy;
    drag.curX   = cx; drag.curY   = cy;
    drag.px = player.x; drag.py = player.y;
  } else {
    onPointer(cx, cy);
  }
}, { passive: false });
document.addEventListener('touchmove', e => {
  if (e.target.closest('.te-modal-content')) return;
  e.preventDefault();
  if (!drag.active) return;
  const r   = canvas.getBoundingClientRect();
  drag.curX = (e.touches[0].clientX - r.left) * (W / r.width);
  drag.curY = (e.touches[0].clientY - r.top)  * (H / r.height);
}, { passive: false });
document.addEventListener('touchend',    () => { drag.active = false; });
document.addEventListener('touchcancel', () => { drag.active = false; });

document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === ' ') {
    if (gameState === STATE.START || gameState === STATE.OVER) begin();
  }
});
document.addEventListener('keyup', e => { delete keys[e.key]; });

function onPointer(x, y) {
  if (gameState === STATE.START) {
    if (hit(x, y, BTN_START)) { begin(); return; }
    if (hit(x, y, BTN_TANGO_LINK)) { window.location.href = '/'; return; }
    // 難易度の星をクリックした場合
    for (let i = 0; i < 5; i++) {
      const sx = W/2 - STAR_SPACING * 2 + i * STAR_SPACING;
      if (Math.abs(x - sx) < 26 && Math.abs(y - STAR_Y) < 26) {
        difficulty = i + 1;
        drawStart();
        return;
      }
    }
  }
  if (gameState === STATE.OVER) {
    if (hit(x, y, BTN_RESTART))        begin();
    if (hit(x, y, BTN_SHARE_X))        shareScore('x');
    if (hit(x, y, BTN_SHARE_LINE))     shareScore('line');
    if (hit(x, y, BTN_TANGO_LINK_OVER)) { window.location.href = '/'; return; }
  }
}
function hit(x, y, b) {
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

// ─── Game control ────────────────────────────────────────────
function begin() {
  const now    = performance.now();
  gameState    = STATE.PLAYING;
  elapsed      = 0;
  isNewHigh    = false;
  lastTime     = now;
  lastSpawn    = now;
  enemies      = [];
  beerScore    = 0;
  effects      = [];
  player.x     = W / 2;
  player.y     = H / 2;
  player.size  = 20;
  mouse.x      = W / 2;
  mouse.y      = H / 2;
  mouse.active = false;
  drag.active  = false;
  gaEvent('escape_start', { difficulty });
  canvas.style.cursor = 'none'; // プレイ中はカーソル非表示
  btnHowto.style.display = 'none';
  if (rafId) cancelAnimationFrame(rafId);
  // 開始直後に1体即出現させ、次の出現を300ms後に設定
  spawnEnemy();
  lastSpawn = now - 300;
  rafId = requestAnimationFrame(loop);
}

function rand(a, b) { return a + Math.random() * (b - a); }
function currentScore() { return Math.floor(elapsed) + beerScore; }

// ─── Enemy types ─────────────────────────────────────────────
// sizeMin/Max: 出現サイズ, sMult: 基本速度への倍率
const ENEMY_TYPES = {
  normal: { sizeMin: 15, sizeMax: 45, sMult: 1.0,  hitMult: 1.0  },
  fire:   { sizeMin: 36, sizeMax: 58, sMult: 1.65, hitMult: 0.65 }, // 炎は細長いので判定を小さめに
  mail:   { sizeMin: 13, sizeMax: 26, sMult: 1.15, hitMult: 1.0  },
  doc:    { sizeMin: 30, sizeMax: 52, sMult: 0.58, hitMult: 1.0  },
  beer:   { sizeMin: 18, sizeMax: 36, sMult: 0.9,  hitMult: 1.0  },
};
// 出現確率: normal(親父) 65% / beer 10% / mail 12% / fire 7% / doc 6%
function pickType() {
  const r = Math.random();
  if (r < 0.10) return 'beer';
  if (r < 0.17) return 'fire';
  if (r < 0.29) return 'mail';
  if (r < 0.35) return 'doc';
  return 'normal'; // 親父
}

// ─── Enemy spawning ──────────────────────────────────────────
function spawnEnemy() {
  const type  = pickType();
  const props = ENEMY_TYPES[type];
  const size  = rand(props.sizeMin, props.sizeMax);
  const edge  = Math.floor(Math.random() * 4);
  let sx, sy;
  if      (edge === 0) { sx = rand(0, W); sy = -size;   }  // top
  else if (edge === 1) { sx = W + size;   sy = rand(0, H); } // right
  else if (edge === 2) { sx = rand(0, W); sy = H + size; }  // bottom
  else                 { sx = -size;      sy = rand(0, H); } // left

  const base = Math.atan2(H/2 - sy, W/2 - sx);
  const edgePos = (edge === 0 || edge === 2) ? sx / W : sy / H;
  const outerThird = edgePos < 1/3 || edgePos > 2/3;
  const maxDev = outerThird ? (Math.PI / 8) : (Math.PI / 4);
  const angle = base + (Math.random() - 0.5) * maxDev * 2;
  const d = DIFF[difficulty];
  const speed = rand((100 + elapsed * 1.5) * d.speedMult, (200 + elapsed * 2) * d.speedMult) * props.sMult;

  enemies.push({
    x: sx, y: sy,
    w: size, h: size,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    type,
    hitMult: props.hitMult,
  });
}

// ─── Update ──────────────────────────────────────────────────
function update(dt) {
  // タッチ: 相対ドラッグ（指の移動量だけプレーヤーを動かす）
  if (drag.active) {
    const half = player.size / 2;
    player.x = Math.max(half, Math.min(W - half, drag.px + (drag.curX - drag.startX)));
    player.y = Math.max(half, Math.min(H - half, drag.py + (drag.curY - drag.startY)));
  } else if (mouse.active) {
    // PC: マウス追従
    const half = player.size / 2;
    player.x = Math.max(half, Math.min(W - half, mouse.x));
    player.y = Math.max(half, Math.min(H - half, mouse.y));
  }

  // Keyboard movement
  const spd  = 300 * dt;
  const half = player.size / 2;
  if (keys['w'] || keys['W'] || keys['ArrowUp'])    player.y = Math.max(half,     player.y - spd);
  if (keys['s'] || keys['S'] || keys['ArrowDown'])  player.y = Math.min(H - half, player.y + spd);
  if (keys['a'] || keys['A'] || keys['ArrowLeft'])  player.x = Math.max(half,     player.x - spd);
  if (keys['d'] || keys['D'] || keys['ArrowRight']) player.x = Math.min(W - half, player.x + spd);

  // Player grows over time (難易度倍率適用)
  player.size = 20 + elapsed * 0.75 * DIFF[difficulty].growthMult;

  // Move enemies, remove those far off-screen
  const M = 400;
  enemies = enemies.filter(e => {
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    return e.x > -M && e.x < W + M && e.y > -M && e.y < H + M;
  });

  // Spawn new enemy on interval that shortens with time (難易度でスケール)
  const interval = Math.max(250, 550 - elapsed * 6) / DIFF[difficulty].spawnRate;
  const now = performance.now();
  if (now - lastSpawn >= interval) {
    spawnEnemy();
    lastSpawn = now;
  }

  // プレーヤーAABB
  const px = player.x - player.size / 2;
  const py = player.y - player.size / 2;
  const ps = player.size;

  // ビール取得（接触 = 取得、enemies配列から除去）
  enemies = enemies.filter(e => {
    if (e.type !== 'beer') return true;
    const contact = px < e.x + e.w/2 && px + ps > e.x - e.w/2 &&
                    py < e.y + e.h/2 && py + ps > e.y - e.h/2;
    if (contact) {
      beerScore += 10;
      effects.push({ x: e.x, y: e.y, text: '+10🍺', startTime: now });
      return false;
    }
    return true;
  });

  // 衝突判定: ハゲモードのnormal(丸顔)だけ円判定、それ以外はAABB
  for (const e of enemies) {
    if (e.type === 'beer') continue;
    let collision = false;
    if (theme === 'hage' && e.type === 'normal') {
      const clampX = Math.max(px, Math.min(e.x, px + ps));
      const clampY = Math.max(py, Math.min(e.y, py + ps));
      const dx = e.x - clampX, dy = e.y - clampY;
      collision = (dx * dx + dy * dy) < (e.w / 2) * (e.w / 2);
    } else {
      const hw = e.w * e.hitMult / 2;
      const hh = e.h * e.hitMult / 2;
      collision = px < e.x + hw && px + ps > e.x - hw &&
                  py < e.y + hh && py + ps > e.y - hh;
    }
    if (collision) {
      gameState = STATE.OVER;
      canvas.style.cursor = 'default';
      btnHowto.style.display = '';
      gaEvent('escape_game_over', {
        score: currentScore(),
        elapsed_seconds: Math.floor(elapsed),
        beer_score: beerScore,
        difficulty,
        is_new_high: isNewHigh,
      });
      const finalScore = currentScore();
      if (finalScore > 0 && finalScore > highScore) {
        highScore = finalScore;
        isNewHigh = true;
        localStorage.setItem('teiji-escape-highScore', String(highScore));
      }
      return;
    }
  }
}

// ─── Draw helpers ────────────────────────────────────────────
function clear() {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, W, H);
}

function drawBtn(b, label, col) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  ctx.strokeRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = col;
  ctx.shadowColor = col;
  ctx.shadowBlur = 14;
  ctx.font = 'bold 22px "Courier New"';
  ctx.textAlign = 'center';
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + 8);
  ctx.restore();
}

// ─── Howto modal ─────────────────────────────────────────────

function applyI18n() {
  document.getElementById('btn-howto').innerHTML       = t('btnHowto');
  if (LANG === 'ja') return;
  document.getElementById('howto-title').textContent   = t('howtoTitle');
  document.getElementById('howto-s1-title').textContent = t('howtoS1t');
  document.getElementById('howto-s1-text').textContent  = t('howtoS1');
  document.getElementById('howto-s2-title').textContent = t('howtoS2t');
  document.getElementById('howto-s2-text').textContent  = t('howtoS2');
  document.getElementById('howto-s3-title').textContent = t('howtoS3t');
  document.getElementById('enemy-normal').textContent   = t('eNormal');
  document.getElementById('enemy-fire').textContent     = t('eFire');
  document.getElementById('enemy-mail').textContent     = t('eMail');
  document.getElementById('enemy-doc').textContent      = t('eDoc');
  document.getElementById('enemy-beer').innerHTML       = t('eBeer');
  document.getElementById('howto-s4-title').textContent = t('howtoS4t');
  document.getElementById('howto-s4-text').textContent  = t('howtoS4');
  document.getElementById('howto-note').innerHTML       = t('howtoNote');
}

function showHowto() {
  modalHowto.classList.remove('hidden');
}

function closeHowto() {
  modalHowto.classList.add('hidden');
  localStorage.setItem('teiji-escape-howto-seen', String(HOWTO_VERSION));
}

btnHowto.addEventListener('click', showHowto);
btnHowtoClose.addEventListener('click', closeHowto);
modalHowto.addEventListener('click', e => { if (e.target === modalHowto) closeHowto(); });

// ─── Share ───────────────────────────────────────────────────

function shareScore(platform) {
  const score = currentScore();
  const stars = '★'.repeat(difficulty) + '☆'.repeat(5 - difficulty);
  const text = LANG === 'en'
    ? `👔 Overtime confirmed...\n\nSurvived: ${elapsed.toFixed(1)}s  Score: ${score.toLocaleString()}\n${stars}\n\n#TeijiEscape\nteiji-tango.com/escape`
    : `👔 残業確定...\n\n生存: ${elapsed.toFixed(1)}秒　スコア: ${score.toLocaleString()}点\n${stars}\n\n#定時退社エスケープ\nteiji-tango.com/escape`;
  gaEvent('escape_share', { method: platform, score: currentScore(), difficulty });
  if (platform === 'x') {
    window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text), '_blank');
  } else {
    window.open('https://line.me/R/msg/text/?' + encodeURIComponent(text), '_blank');
  }
}

function drawEmoji(emoji, cx, cy, size, glowColor) {
  ctx.save();
  ctx.font = `${Math.max(18, size)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 14;
  ctx.fillText(emoji, cx, cy);
  ctx.restore();
}

// ─── Theme draw ──────────────────────────────────────────────
function drawShirt(cx, cy, size) {
  ctx.save();
  ctx.font = `${size * 1.1}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255,255,120,0.7)';
  ctx.shadowBlur = 14;
  ctx.fillText('👔', cx, cy);
  ctx.restore();
}

function drawHageFace(cx, cy, size) {
  const r = size * 0.5;
  ctx.save();

  // 顔（ハゲ頭）
  ctx.fillStyle = '#f5c49a';
  ctx.strokeStyle = '#c8855a';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // ツルツル光沢
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.beginPath(); ctx.ellipse(cx - r * 0.22, cy - r * 0.38, r * 0.22, r * 0.14, -0.5, 0, Math.PI * 2); ctx.fill();

  // 両サイドの残り毛（ピンと立つ）
  ctx.strokeStyle = '#4a2e10';
  ctx.lineWidth = Math.max(1.2, r * 0.09);
  ctx.lineCap = 'round';
  const hairs = [
    [cx - r * 0.92, cy - r * 0.18, cx - r * 1.18, cy - r * 0.55],
    [cx - r * 0.82, cy - r * 0.42, cx - r * 1.0,  cy - r * 0.78],
    [cx - r * 0.65, cy - r * 0.58, cx - r * 0.72, cy - r * 0.9 ],
    [cx + r * 0.92, cy - r * 0.18, cx + r * 1.18, cy - r * 0.55],
    [cx + r * 0.82, cy - r * 0.42, cx + r * 1.0,  cy - r * 0.78],
    [cx + r * 0.65, cy - r * 0.58, cx + r * 0.72, cy - r * 0.9 ],
  ];
  for (const [x1, y1, x2, y2] of hairs) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  // 眉毛（驚き上がり）
  ctx.strokeStyle = '#3a1e08';
  ctx.lineWidth = Math.max(1.5, r * 0.11);
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - r * 0.48, cy - r * 0.32); ctx.quadraticCurveTo(cx - r * 0.3, cy - r * 0.52, cx - r * 0.12, cy - r * 0.42); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + r * 0.48, cy - r * 0.32); ctx.quadraticCurveTo(cx + r * 0.3, cy - r * 0.52, cx + r * 0.12, cy - r * 0.42); ctx.stroke();

  // 白目
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(cx - r * 0.28, cy - r * 0.08, r * 0.16, r * 0.2,  0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + r * 0.28, cy - r * 0.08, r * 0.16, r * 0.2,  0, 0, Math.PI * 2); ctx.fill();
  // 瞳（逃げる方向を見る）
  ctx.fillStyle = '#2a1005';
  ctx.beginPath(); ctx.arc(cx - r * 0.24, cy - r * 0.1,  r * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + r * 0.24, cy - r * 0.1,  r * 0.09, 0, Math.PI * 2); ctx.fill();

  // 鼻
  ctx.strokeStyle = '#c07848';
  ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.beginPath(); ctx.moveTo(cx, cy + r * 0.0); ctx.lineTo(cx - r * 0.1, cy + r * 0.2); ctx.lineTo(cx + r * 0.1, cy + r * 0.2); ctx.stroke();

  // 口ひげ（定番ハゲ親父）
  ctx.fillStyle = '#3a2010';
  ctx.beginPath(); ctx.ellipse(cx - r * 0.2, cy + r * 0.3, r * 0.22, r * 0.1, -0.25, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + r * 0.2, cy + r * 0.3, r * 0.22, r * 0.1,  0.25, 0, Math.PI * 2); ctx.fill();

  // 口（驚き「あ」）
  ctx.fillStyle = '#7a1a10';
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.58, r * 0.18, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

// ─── Screens ─────────────────────────────────────────────────
function drawStart() {
  clear();

  // Subtle grid
  ctx.save();
  ctx.strokeStyle = '#16213e';
  ctx.lineWidth = 1;
  for (let i = 0; i <= W; i += 40) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';

  // Title
  ctx.font = 'bold 44px "Courier New"';
  ctx.fillStyle = '#4A90D9';
  ctx.shadowColor = '#4A90D9';
  ctx.shadowBlur = 28;
  ctx.fillText('定時退社エスケープ', W/2, H/2 - 88);
  ctx.shadowBlur = 0;

  // Subtitle
  ctx.font = '15px "Courier New"';
  ctx.fillStyle = '#a0a0b0';
  ctx.fillText(t('subtitle'), W/2, H/2 - 42);

  // Difficulty label
  ctx.font = '14px "Courier New"';
  ctx.fillStyle = '#a0a0b0';
  ctx.fillText(t('diffLabel'), W/2, H/2 + 8);

  // Stars (★/☆)
  ctx.font = '32px sans-serif';
  for (let i = 0; i < 5; i++) {
    const sx = W/2 - STAR_SPACING * 2 + i * STAR_SPACING;
    const filled = i < difficulty;
    ctx.fillStyle   = filled ? '#F5A623' : '#2a2a44';
    ctx.shadowColor = filled ? '#F5A623' : 'transparent';
    ctx.shadowBlur  = filled ? 12 : 0;
    ctx.fillText(filled ? '★' : '☆', sx, STAR_Y);
  }
  ctx.shadowBlur = 0;

  // Difficulty name
  ctx.font = '14px "Courier New"';
  ctx.fillStyle = '#a0a0b0';
  ctx.fillText(tDiff(difficulty), W/2, STAR_Y + 30);

  ctx.restore();

  drawBtn(BTN_START, 'START', '#4A90D9');

  // Cross-link to teiji-tango
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '13px "Courier New"';
  ctx.fillStyle = '#4A90D9';
  ctx.fillText(t('tangoLink'), W/2, H/2 + 170);
  ctx.restore();

  // Best score
  if (highScore > 0) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '13px "Courier New"';
    ctx.fillStyle = '#a0a0b0';
    ctx.fillText(`${t('bestScore')}: ${highScore.toLocaleString()}`, W/2, H - 42);
    ctx.restore();
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '12px "Courier New"';
  ctx.fillStyle = '#2a2a4a';
  ctx.fillText(t('startHint'), W/2, H - 22);
  ctx.restore();
}

function drawPlay() {
  clear();

  // Enemies & beers
  for (const e of enemies) {
    if      (e.type === 'beer')   drawEmoji('🍺', e.x, e.y, e.w, '#F5A623');
    else if (e.type === 'fire')   drawEmoji('🔥', e.x, e.y, e.w, '#ff6600');
    else if (e.type === 'mail')   drawEmoji('✉️',  e.x, e.y, e.w, '#66aaff');
    else if (e.type === 'doc')    drawEmoji('📄', e.x, e.y, e.w, '#cccccc');
    else if (theme === 'hage')    drawHageFace(e.x, e.y, e.w);
    else {
      ctx.save();
      ctx.fillStyle = e.color;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 10;
      ctx.fillRect(e.x - e.w/2, e.y - e.h/2, e.w, e.h);
      ctx.restore();
    }
  }

  // Player
  if (theme === 'hage') {
    drawShirt(player.x, player.y, player.size);
  } else {
    ctx.save();
    ctx.fillStyle = '#4A90D9';
    ctx.shadowColor = '#4A90D9';
    ctx.shadowBlur = 18;
    ctx.fillRect(player.x - player.size/2, player.y - player.size/2, player.size, player.size);
    ctx.restore();
  }

  // 取得エフェクト（+10🍺 が上に浮かんで消える）
  const nowMs = performance.now();
  const effectDur = 900;
  effects = effects.filter(ef => {
    const age = nowMs - ef.startTime;
    if (age > effectDur) return false;
    const alpha = 1 - age / effectDur;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#F5A623';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#F5A623';
    ctx.shadowBlur = 8;
    ctx.fillText(ef.text, ef.x, ef.y - age * 0.045);
    ctx.restore();
    return true;
  });

  // HUD
  ctx.save();
  ctx.font = '14px "Courier New"';
  ctx.fillStyle = '#a0a0b0';
  ctx.textAlign = 'left';
  ctx.fillText(`TIME  ${elapsed.toFixed(1)}s`, 12, 24);
  ctx.fillText(`SCORE ${currentScore()}`, 12, 44);
  ctx.textAlign = 'right';
  ctx.fillText(`SIZE ${player.size.toFixed(0)}px`, W - 12, 24);
  ctx.restore();
}

function drawOver() {
  const score = currentScore();

  // オーバーレイ
  ctx.save();
  ctx.fillStyle = isNewHigh ? 'rgba(26,26,46,0.88)' : 'rgba(26,26,46,0.82)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';

  // GAME OVER
  ctx.font = 'bold 50px "Courier New"';
  ctx.fillStyle = '#e74c3c';
  ctx.shadowColor = '#e74c3c';
  ctx.shadowBlur = 28;
  ctx.fillText('GAME OVER', W/2, H/2 - 90);
  ctx.shadowBlur = 0;

  // テーマテキスト（通常時のみ）
  if (!isNewHigh) {
    ctx.font = '16px "Courier New"';
    ctx.fillStyle = '#a0a0b0';
    ctx.fillText(`${t('overtime')}👔`, W/2, H/2 - 56);
  }

  if (isNewHigh) {
    // ★ ハイスコア更新バナー ★
    ctx.font = 'bold 20px "Courier New"';
    ctx.fillStyle = '#F5A623';
    ctx.shadowColor = '#F5A623';
    ctx.shadowBlur = 20;
    ctx.fillText('★  NEW HIGH SCORE！  ★', W/2, H/2 - 50);
    ctx.shadowBlur = 0;
  }

  // スコア
  ctx.font = 'bold 28px "Courier New"';
  ctx.fillStyle = isNewHigh ? '#F5A623' : '#e8e8e8';
  ctx.shadowColor = isNewHigh ? '#F5A623' : 'transparent';
  ctx.shadowBlur = isNewHigh ? 14 : 0;
  ctx.fillText(`SCORE  ${score.toLocaleString()}`, W/2, H/2 - 10);
  ctx.shadowBlur = 0;

  // 生存時間
  ctx.font = '17px "Courier New"';
  ctx.fillStyle = '#a0a0b0';
  ctx.fillText(`${t('survived')}: ${elapsed.toFixed(2)}s`, W/2, H/2 + 26);

  // 前回ベスト（非更新時のみ）
  if (!isNewHigh && highScore > 0) {
    ctx.font = '14px "Courier New"';
    ctx.fillStyle = '#a0a0b0';
    ctx.fillText(`${t('prevBest')}: ${highScore.toLocaleString()}`, W/2, H/2 + 52);
  }

  ctx.restore();

  drawBtn(BTN_RESTART, 'RESTART', isNewHigh ? '#F5A623' : '#4A90D9');

  // シェアボタン
  ctx.save();
  // X (Twitter)
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(BTN_SHARE_X.x, BTN_SHARE_X.y, BTN_SHARE_X.w, BTN_SHARE_X.h);
  ctx.strokeStyle = '#e7e7e7'; ctx.lineWidth = 1.5;
  ctx.strokeRect(BTN_SHARE_X.x, BTN_SHARE_X.y, BTN_SHARE_X.w, BTN_SHARE_X.h);
  ctx.fillStyle = '#e7e7e7';
  ctx.font = '15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(t('shareX'), BTN_SHARE_X.x + BTN_SHARE_X.w / 2, BTN_SHARE_X.y + BTN_SHARE_X.h / 2 + 5);
  // LINE
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(BTN_SHARE_LINE.x, BTN_SHARE_LINE.y, BTN_SHARE_LINE.w, BTN_SHARE_LINE.h);
  ctx.strokeStyle = '#00c300'; ctx.lineWidth = 1.5;
  ctx.strokeRect(BTN_SHARE_LINE.x, BTN_SHARE_LINE.y, BTN_SHARE_LINE.w, BTN_SHARE_LINE.h);
  ctx.fillStyle = '#00c300';
  ctx.fillText(t('shareLine'), BTN_SHARE_LINE.x + BTN_SHARE_LINE.w / 2, BTN_SHARE_LINE.y + BTN_SHARE_LINE.h / 2 + 5);
  ctx.restore();

  // Cross-link to teiji-tango
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '13px "Courier New"';
  ctx.fillStyle = '#4A90D9';
  ctx.fillText(t('tangoLink'), W/2, H/2 + 212);
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '12px "Courier New"';
  ctx.fillStyle = '#2a2a4a';
  ctx.fillText(t('restartHint'), W/2, H - 22);
  ctx.restore();
}

// ─── Main loop ───────────────────────────────────────────────
function loop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05); // cap delta at 50ms
  lastTime  = ts;
  elapsed  += dt;

  update(dt);
  drawPlay();

  if (gameState === STATE.PLAYING) {
    rafId = requestAnimationFrame(loop);
  } else {
    drawOver();
  }
}

// Initial render
applyI18n();
drawStart();

// Show howto on first visit (or after version bump)
if (Number(localStorage.getItem('teiji-escape-howto-seen') || 0) < HOWTO_VERSION) {
  showHowto();
}
