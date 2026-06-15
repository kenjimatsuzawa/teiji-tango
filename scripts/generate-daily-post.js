#!/usr/bin/env node
'use strict';
/**
 * 今日のパズルをX投稿用PNG画像として生成する
 * Usage: node scripts/generate-daily-post.js [--mode normal|wall] [--diff 初級|中級|上級]
 * 引数省略時はランダム選択（公開中モードのみ）
 * 出力: scripts/daily-post.png + キャプション文字列
 */

const fs    = require('fs');
const path  = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');

function src(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

// ─── パズルデータ読み込み ───────────────────────────────────
const { PUZZLES, getDayIndex, getPuzzleByDifficulty } = new Function(`
  ${src('js/puzzles.js')}
  return { PUZZLES, getDayIndex, getPuzzleByDifficulty };
`)();

const { WALL_PUZZLES, getWallPuzzleByDifficulty } = new Function(`
  ${src('js/puzzles.js')}
  ${src('js/wall-puzzles.js')}
  return { WALL_PUZZLES, getWallPuzzleByDifficulty };
`)();

// ─── 引数解析 ───────────────────────────────────────────────
const args = process.argv.slice(2);
const argMode = args[args.indexOf('--mode') + 1];
const argDiff = args[args.indexOf('--diff') + 1];

const MODES       = ['normal', 'wall'];
const DIFFS       = ['初級', '中級', '上級'];
const MODE_LABELS = { normal: '通常', wall: '🧱 壁あり' };

const mode = MODES.includes(argMode) ? argMode : MODES[Math.floor(Math.random() * MODES.length)];
const diff = DIFFS.includes(argDiff)  ? argDiff  : DIFFS[Math.floor(Math.random() * DIFFS.length)];

const puzzle = mode === 'wall'
  ? getWallPuzzleByDifficulty(diff)
  : getPuzzleByDifficulty(diff);

if (!puzzle) {
  console.error(`パズルが見つかりません: mode=${mode} diff=${diff}`);
  process.exit(1);
}

const dayNumber = getDayIndex() + 1;

// ─── SVG生成 ────────────────────────────────────────────────
const W = 1080, H = 1080;
const CELL = 100, GAP = 8;
const GRID_W = 6 * CELL + 5 * GAP;
const GOFFX = (W - GRID_W) / 2;
const GOFFY = 230;

const SHIRT_MAIN  = '#4A90D9';
const BEER_MAIN   = '#F5A623';
const EMPTY_FILL  = '#1e2a45';
const EMPTY_STROK = '#2a3a5a';
const BG1 = '#1a1a2e';
const BG2 = '#0f3460';

function cellX(c) { return GOFFX + c * (CELL + GAP); }
function cellY(r) { return GOFFY + r * (CELL + GAP); }

// グリッドセル
let cells = '';
for (let r = 0; r < 6; r++) {
  for (let c = 0; c < 6; c++) {
    const v = puzzle.initial[r][c];
    const x = cellX(c), y = cellY(r);
    const fill   = v === 1 ? 'url(#shirtFill)' : v === 2 ? 'url(#beerFill)' : EMPTY_FILL;
    const stroke = v === 1 ? SHIRT_MAIN        : v === 2 ? BEER_MAIN         : EMPTY_STROK;
    cells += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="14"
                    fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
    if (v === 1) {
      // 👔 → Tシャツ形（T字）
      const cx = x + CELL/2, cy = y + CELL/2;
      cells += `<rect x="${cx-22}" y="${cy-22}" width="44" height="14" rx="4" fill="${SHIRT_MAIN}" fill-opacity="0.9"/>`;
      cells += `<rect x="${cx-12}" y="${cy-22}" width="24" height="42" rx="4" fill="${SHIRT_MAIN}" fill-opacity="0.9"/>`;
      cells += `<rect x="${cx-6}"  y="${cy-22}" width="12" height="10" rx="2" fill="#16213e" fill-opacity="0.6"/>`;
    } else if (v === 2) {
      // 🍺 → ビールジョッキ形（円柱 + 取っ手）
      const cx = x + CELL/2, cy = y + CELL/2;
      cells += `<rect x="${cx-14}" y="${cy-18}" width="26" height="34" rx="5" fill="${BEER_MAIN}" fill-opacity="0.9"/>`;
      cells += `<rect x="${cx-14}" y="${cy-18}" width="26" height="10" rx="3" fill="#fff" fill-opacity="0.45"/>`;
      cells += `<path d="M${cx+12},${cy-8} Q${cx+24},${cy-8} ${cx+24},${cy+4} Q${cx+24},${cy+14} ${cx+12},${cy+14}" fill="none" stroke="${BEER_MAIN}" stroke-width="5" stroke-opacity="0.9" stroke-linecap="round"/>`;
    }
  }
}

// 制約マーカー（通常モード）
let markers = '';
if (mode === 'normal' && puzzle.constraints) {
  for (const con of puzzle.constraints) {
    const { r1, c1, r2, c2, type } = con;
    const mx = (cellX(c1) + CELL/2 + cellX(c2) + CELL/2) / 2;
    const my = (cellY(r1) + CELL/2 + cellY(r2) + CELL/2) / 2;
    markers += `<circle cx="${mx}" cy="${my}" r="16" fill="#16213e" stroke="#3a3a6a" stroke-width="1.5"/>`;
    markers += `<text x="${mx}" y="${my + 1}" font-size="20" font-weight="700" font-family="sans-serif"
                      fill="${type === '=' ? '#a0cfff' : '#ffcf80'}"
                      text-anchor="middle" dominant-baseline="middle">${type === '=' ? '=' : '×'}</text>`;
  }
}

// 壁（壁ありモード）
let walls = '';
if (mode === 'wall' && puzzle.walls) {
  for (const w of puzzle.walls) {
    const { r1, c1, r2, c2 } = w;
    const isHoriz = r1 !== r2; // r1≠r2 → 水平方向の壁（行の間）
    if (isHoriz) {
      // セル(r1,c1)の下辺 = セル(r2,c2)の上辺
      const row = Math.max(r1, r2);
      const col = Math.min(c1, c2);
      const wx = cellX(col) - 4;
      const wy = cellY(row) - GAP/2 - 3;
      walls += `<rect x="${wx}" y="${wy}" width="${CELL + 8}" height="6" rx="3" fill="#e05050"/>`;
    } else {
      // 垂直方向の壁（列の間）
      const col = Math.max(c1, c2);
      const row = Math.min(r1, r2);
      const wx = cellX(col) - GAP/2 - 3;
      const wy = cellY(row) - 4;
      walls += `<rect x="${wx}" y="${wy}" width="6" height="${CELL + 8}" rx="3" fill="#e05050"/>`;
    }
  }
}

const DIFF_EN = { '初級': 'Easy', '中級': 'Medium', '上級': 'Hard' };
const modeLabel = `${MODE_LABELS[mode]} · ${diff}`;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BG1}"/>
      <stop offset="100%" stop-color="${BG2}"/>
    </linearGradient>
    <linearGradient id="shirtFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="${SHIRT_MAIN}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${SHIRT_MAIN}" stop-opacity="0.25"/>
    </linearGradient>
    <linearGradient id="beerFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="${BEER_MAIN}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${BEER_MAIN}" stop-opacity="0.25"/>
    </linearGradient>
  </defs>

  <!-- 背景 -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="100"       cy="100"       r="300" fill="${SHIRT_MAIN}" fill-opacity="0.05"/>
  <circle cx="${W - 100}" cy="${H - 100}" r="300" fill="${BEER_MAIN}"  fill-opacity="0.05"/>

  <!-- タイトル -->
  <text x="${W/2}" y="90" font-family="Hiragino Kaku Gothic ProN, Noto Sans JP, sans-serif"
        font-size="42" font-weight="700" fill="#c8d8f0" text-anchor="middle" letter-spacing="3">
    定時退社タンゴ
  </text>

  <!-- Day + モード -->
  <text x="${W/2}" y="148" font-family="Hiragino Kaku Gothic ProN, Noto Sans JP, sans-serif"
        font-size="30" fill="#7090b0" text-anchor="middle">
    Day ${dayNumber}　${modeLabel}
  </text>

  <!-- 区切り線 -->
  <rect x="${GOFFX}" y="180" width="${GRID_W}" height="2" rx="1" fill="#2a3a5a"/>

  <!-- グリッド -->
  ${cells}
  ${markers}
  ${walls}

  <!-- 下部テキスト -->
  <text x="${W/2}" y="${GOFFY + 6 * CELL + 5 * GAP + 52}"
        font-family="Hiragino Kaku Gothic ProN, Noto Sans JP, sans-serif"
        font-size="24" fill="#506080" text-anchor="middle">
    今日も定時退社しよう
  </text>

  <!-- URL バッジ -->
  <rect x="${W/2 - 180}" y="${H - 95}" width="360" height="52" rx="26"
        fill="${SHIRT_MAIN}" fill-opacity="0.15" stroke="${SHIRT_MAIN}" stroke-opacity="0.4" stroke-width="1.5"/>
  <text x="${W/2}" y="${H - 63}" font-family="Hiragino Kaku Gothic ProN, Noto Sans JP, sans-serif"
        font-size="26" fill="${SHIRT_MAIN}" text-anchor="middle" letter-spacing="1">
    teiji-tango.com
  </text>
</svg>`;

// ─── PNG出力 ─────────────────────────────────────────────────
const outPath = path.join(__dirname, 'daily-post.png');
sharp(Buffer.from(svg))
  .png()
  .toFile(outPath)
  .then(() => {
    console.log(`✅ 画像生成: ${outPath}`);
    console.log(`📋 モード: ${modeLabel} (Day ${dayNumber})`);
    console.log('');
    console.log('─── Xキャプション（コピペ用）────────────────────────────');
    console.log(`定時退社タンゴ Day ${dayNumber}（${modeLabel}）🧩`);
    console.log('');
    console.log('今日のパズルに挑戦しよう！');
    console.log('他のモード・難易度は→ https://teiji-tango.com');
    console.log('#定時退社タンゴ #パズル #論理パズル');
    console.log('──────────────────────────────────────────────────────────');
  })
  .catch(err => { console.error(err); process.exit(1); });
