#!/usr/bin/env node
// Xタンゴパズル自動生成スクリプト
// 通常ルール + 主対角線・副対角線も 3vs3 かつ 3連続NG
// Usage: node scripts/generate-x-puzzles.js
'use strict';

const SIZE = 6;
const SHIRT = 1, BEER = 2, EMPTY = 0;
const opp = v => v === SHIRT ? BEER : SHIRT;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function copyGrid(g) { return g.map(r => [...r]); }
function isFilled(g) { return g.every(r => r.every(v => v !== EMPTY)); }

// ─── グリッド生成（対角線制約込み）───────────────────────────

function canPlace(grid, r, c, val) {
  // 行バランス
  if (grid[r].filter(v => v === val).length >= SIZE / 2) return false;
  // 列バランス
  if (grid.map(row => row[c]).filter(v => v === val).length >= SIZE / 2) return false;
  // 行3連続
  if (c >= 2 && grid[r][c-1] === val && grid[r][c-2] === val) return false;
  // 列3連続
  if (r >= 2 && grid[r-1][c] === val && grid[r-2][c] === val) return false;

  // 主対角線 (r === c)
  if (r === c) {
    let cnt = 0;
    for (let k = 0; k < SIZE; k++) if (grid[k][k] === val) cnt++;
    if (cnt >= SIZE / 2) return false;
    if (r >= 2 && grid[r-1][r-1] === val && grid[r-2][r-2] === val) return false;
  }

  // 副対角線 (r + c === SIZE - 1)
  if (r + c === SIZE - 1) {
    let cnt = 0;
    for (let k = 0; k < SIZE; k++) if (grid[k][SIZE-1-k] === val) cnt++;
    if (cnt >= SIZE / 2) return false;
    // 副対角線の位置インデックスは r（順: (0,5),(1,4),...）
    if (r >= 2 && grid[r-1][SIZE-r] === val && grid[r-2][SIZE-r+1] === val) return false;
  }

  return true;
}

function fillGrid(grid, pos) {
  if (pos === SIZE * SIZE) return true;
  const r = Math.floor(pos / SIZE), c = pos % SIZE;
  for (const val of shuffle([SHIRT, BEER])) {
    if (canPlace(grid, r, c, val)) {
      grid[r][c] = val;
      if (fillGrid(grid, pos + 1)) return true;
      grid[r][c] = EMPTY;
    }
  }
  return false;
}

function generateGrid() {
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
  return fillGrid(grid, 0) ? grid : null;
}

// ─── Xタンゴ対応ソルバー ──────────────────────────────────────

function applyBalance(grid) {
  let used = false;
  for (let r = 0; r < SIZE; r++)
    for (const v of [SHIRT, BEER])
      if (grid[r].filter(x => x === v).length === SIZE / 2)
        for (let c = 0; c < SIZE; c++)
          if (grid[r][c] === EMPTY) { grid[r][c] = opp(v); used = true; }
  for (let c = 0; c < SIZE; c++)
    for (const v of [SHIRT, BEER])
      if (grid.filter(row => row[c] === v).length === SIZE / 2)
        for (let r = 0; r < SIZE; r++)
          if (grid[r][c] === EMPTY) { grid[r][c] = opp(v); used = true; }
  return used;
}

function applyDoubleBlock(grid) {
  let used = false;
  for (let r = 0; r < SIZE; r++)
    for (let i = 0; i < SIZE - 1; i++) {
      const v = grid[r][i];
      if (v === EMPTY || grid[r][i+1] !== v) continue;
      if (i > 0 && grid[r][i-1] === EMPTY) { grid[r][i-1] = opp(v); used = true; }
      if (i+2 < SIZE && grid[r][i+2] === EMPTY) { grid[r][i+2] = opp(v); used = true; }
    }
  for (let c = 0; c < SIZE; c++)
    for (let i = 0; i < SIZE - 1; i++) {
      const v = grid[i][c];
      if (v === EMPTY || grid[i+1][c] !== v) continue;
      if (i > 0 && grid[i-1][c] === EMPTY) { grid[i-1][c] = opp(v); used = true; }
      if (i+2 < SIZE && grid[i+2][c] === EMPTY) { grid[i+2][c] = opp(v); used = true; }
    }
  return used;
}

function applySandwich(grid) {
  let used = false;
  for (let r = 0; r < SIZE; r++)
    for (let i = 0; i < SIZE - 2; i++) {
      const v = grid[r][i];
      if (v === EMPTY || grid[r][i+1] !== EMPTY || grid[r][i+2] !== v) continue;
      grid[r][i+1] = opp(v); used = true;
    }
  for (let c = 0; c < SIZE; c++)
    for (let i = 0; i < SIZE - 2; i++) {
      const v = grid[i][c];
      if (v === EMPTY || grid[i+1][c] !== EMPTY || grid[i+2][c] !== v) continue;
      grid[i+1][c] = opp(v); used = true;
    }
  return used;
}

function applyDiagBalance(grid) {
  let used = false;
  // 主対角線
  for (const v of [SHIRT, BEER]) {
    const cnt = Array.from({ length: SIZE }, (_, k) => grid[k][k]).filter(x => x === v).length;
    if (cnt === SIZE / 2)
      for (let k = 0; k < SIZE; k++)
        if (grid[k][k] === EMPTY) { grid[k][k] = opp(v); used = true; }
  }
  // 副対角線
  for (const v of [SHIRT, BEER]) {
    const cnt = Array.from({ length: SIZE }, (_, k) => grid[k][SIZE-1-k]).filter(x => x === v).length;
    if (cnt === SIZE / 2)
      for (let k = 0; k < SIZE; k++)
        if (grid[k][SIZE-1-k] === EMPTY) { grid[k][SIZE-1-k] = opp(v); used = true; }
  }
  return used;
}

function applyDiagBlock(grid) {
  let used = false;
  function applyLine(cells) {
    for (let i = 0; i < cells.length - 1; i++) {
      const [r1,c1] = cells[i], [r2,c2] = cells[i+1];
      const v = grid[r1][c1];
      if (v === EMPTY || grid[r2][c2] !== v) continue;
      if (i > 0) {
        const [rp,cp] = cells[i-1];
        if (grid[rp][cp] === EMPTY) { grid[rp][cp] = opp(v); used = true; }
      }
      if (i+2 < cells.length) {
        const [rn,cn] = cells[i+2];
        if (grid[rn][cn] === EMPTY) { grid[rn][cn] = opp(v); used = true; }
      }
    }
    for (let i = 0; i < cells.length - 2; i++) {
      const [r1,c1] = cells[i], [r2,c2] = cells[i+1], [r3,c3] = cells[i+2];
      const v = grid[r1][c1];
      if (v === EMPTY || grid[r2][c2] !== EMPTY || grid[r3][c3] !== v) continue;
      grid[r2][c2] = opp(v); used = true;
    }
  }
  applyLine(Array.from({ length: SIZE }, (_, k) => [k, k]));
  applyLine(Array.from({ length: SIZE }, (_, k) => [k, SIZE-1-k]));
  return used;
}

function solve(initial) {
  const grid = copyGrid(initial);
  let changed = true;
  while (changed && !isFilled(grid)) {
    changed = false;
    if (applyBalance(grid))      changed = true;
    if (applyDoubleBlock(grid))  changed = true;
    if (applySandwich(grid))     changed = true;
    if (applyDiagBalance(grid))  changed = true;
    if (applyDiagBlock(grid))    changed = true;
  }
  return isFilled(grid);
}

// ─── セル削除 ────────────────────────────────────────────────

function removeToTarget(solution, minGiven, maxGiven) {
  const positions = shuffle(
    Array.from({ length: SIZE }, (_, r) => Array.from({ length: SIZE }, (_, c) => [r, c])).flat()
  );
  let initial = copyGrid(solution);
  for (const [r, c] of positions) {
    if (initial.flat().filter(v => v !== EMPTY).length <= minGiven) break;
    const saved = initial[r][c];
    initial[r][c] = EMPTY;
    if (!solve(initial)) initial[r][c] = saved;
  }
  const given = initial.flat().filter(v => v !== EMPTY).length;
  if (given > maxGiven) return null;
  return initial;
}

// ─── パズル生成 ───────────────────────────────────────────────

const DIFF_PARAMS = {
  '初級': { minGiven: 14, maxGiven: 22 },
  '中級': { minGiven: 10, maxGiven: 16 },
  '上級': { minGiven:  6, maxGiven: 12 },
};

function tryGeneratePuzzle(diff, id) {
  const { minGiven, maxGiven } = DIFF_PARAMS[diff];
  for (let attempt = 0; attempt < 800; attempt++) {
    const solution = generateGrid();
    if (!solution) continue;
    const initial = removeToTarget(solution, minGiven, maxGiven);
    if (!initial) continue;
    return { id, difficulty: diff, size: SIZE, hasX: true, initial, solution, constraints: [], walls: [] };
  }
  return null;
}

// ─── メイン ───────────────────────────────────────────────────

const DIFFS = ['初級', '中級', '上級'];
const COUNT = 30;
const puzzles = [];
let id = 3001;

for (const diff of DIFFS) {
  let generated = 0, totalAttempts = 0;
  while (generated < COUNT && totalAttempts < COUNT * 20) {
    totalAttempts++;
    const p = tryGeneratePuzzle(diff, id);
    if (p) {
      puzzles.push(p);
      id++;
      generated++;
      if (generated % 10 === 0) process.stderr.write(`${diff}: ${generated}/${COUNT}\n`);
    }
  }
  process.stderr.write(`${diff}: ${generated}/${COUNT} 完了\n`);
}

const lines = [
  "'use strict';",
  "// Xタンゴパズル (自動生成)",
  `// 生成日: ${new Date().toISOString().slice(0, 10)}`,
  "const X_PUZZLES = " + JSON.stringify(puzzles, null, 2) + ";",
  "",
  "function getXPuzzleByDifficulty(difficulty) {",
  "  const day = Math.floor((new Date() - new Date('2025-01-01')) / 86400000);",
  "  const pool = X_PUZZLES.filter(p => p.difficulty === difficulty);",
  "  return pool[day % pool.length];",
  "}",
];
process.stdout.write(lines.join('\n') + '\n');
