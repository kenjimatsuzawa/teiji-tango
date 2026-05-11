#!/usr/bin/env node
// エリアパズル自動生成スクリプト
// Usage: node scripts/generate-region-puzzles.js
'use strict';

const SIZE = 6;
const SHIRT = 1, BEER = 2, EMPTY = 0;
const opp = v => v === SHIRT ? BEER : SHIRT;

// エリア: 2行×3列のブロック6つ
// ri=行グループ(0-2), ci=列グループ(0-1)
function getRegionCells(ri, ci) {
  const cells = [];
  for (let r = ri * 2; r < ri * 2 + 2; r++)
    for (let c = ci * 3; c < ci * 3 + 3; c++)
      cells.push([r, c]);
  return cells;
}

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

// ─── グリッド生成（エリアバランスも考慮）──────────────────

function canPlace(grid, r, c, val) {
  // 行バランス
  if (grid[r].filter(v => v === val).length >= SIZE / 2) return false;
  // 列バランス
  if (grid.map(row => row[c]).filter(v => v === val).length >= SIZE / 2) return false;
  // 3連続行
  if (c >= 2 && grid[r][c-1] === val && grid[r][c-2] === val) return false;
  // 3連続列
  if (r >= 2 && grid[r-1][c] === val && grid[r-2][c] === val) return false;
  // エリアバランス
  const ri = Math.floor(r / 2), ci = Math.floor(c / 3);
  let areaCount = 0;
  for (let ar = ri * 2; ar < ri * 2 + 2; ar++)
    for (let ac = ci * 3; ac < ci * 3 + 3; ac++)
      if (grid[ar][ac] === val) areaCount++;
  if (areaCount >= SIZE / 2) return false;
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

// ─── エリア対応ソルバー ──────────────────────────────────

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

function applyRegionBalance(grid) {
  let used = false;
  for (let ri = 0; ri < SIZE / 2; ri++)
    for (let ci = 0; ci < SIZE / 3; ci++)
      for (const v of [SHIRT, BEER]) {
        let count = 0;
        const emptyCells = [];
        for (let r = ri * 2; r < ri * 2 + 2; r++)
          for (let c = ci * 3; c < ci * 3 + 3; c++) {
            if (grid[r][c] === v) count++;
            if (grid[r][c] === EMPTY) emptyCells.push([r, c]);
          }
        if (count === SIZE / 2) {
          for (const [r, c] of emptyCells) { grid[r][c] = opp(v); used = true; }
        }
      }
  return used;
}

// エリアバランス手筋あり（中級・上級用）
function solve(initial) {
  const grid = copyGrid(initial);
  let changed = true;
  while (changed && !isFilled(grid)) {
    changed = false;
    if (applyBalance(grid))        changed = true;
    if (applyDoubleBlock(grid))    changed = true;
    if (applySandwich(grid))       changed = true;
    if (applyRegionBalance(grid))  changed = true;
  }
  return isFilled(grid);
}

// エリアバランス手筋なし（初級用: この手筋なしで解けるか確認）
function solveWithoutRegion(initial) {
  const grid = copyGrid(initial);
  let changed = true;
  while (changed && !isFilled(grid)) {
    changed = false;
    if (applyBalance(grid))      changed = true;
    if (applyDoubleBlock(grid))  changed = true;
    if (applySandwich(grid))     changed = true;
  }
  return isFilled(grid);
}

// ─── セル削除（目標givens数まで削る）──────────────────────

function removeToTarget(solution, minGiven, maxGiven, solverFn) {
  const positions = shuffle(
    Array.from({ length: SIZE }, (_, r) => Array.from({ length: SIZE }, (_, c) => [r, c])).flat()
  );
  let initial = copyGrid(solution);

  for (const [r, c] of positions) {
    const given = initial.flat().filter(v => v !== EMPTY).length;
    if (given <= minGiven) break;
    const saved = initial[r][c];
    initial[r][c] = EMPTY;
    if (!solverFn(initial)) initial[r][c] = saved;
  }

  const given = initial.flat().filter(v => v !== EMPTY).length;
  if (given > maxGiven) return null;
  return initial;
}

// ─── パズル生成 ──────────────────────────────────────────

// needsRegion=false → エリア手筋なしで解ける（初級）
// needsRegion=true  → エリア手筋がないと解けない（中級・上級）
const DIFF_PARAMS = {
  '初級': { minGiven: 14, maxGiven: 22, needsRegion: false },
  '中級': { minGiven: 10, maxGiven: 16, needsRegion: true  },
  '上級': { minGiven:  6, maxGiven: 11, needsRegion: true  },
};

function tryGeneratePuzzle(diff, id) {
  const { minGiven, maxGiven, needsRegion } = DIFF_PARAMS[diff];

  // 初級: エリア手筋なしで削れるだけ削る
  // 中級・上級: エリア手筋ありで削り、かつエリア手筋なしでは解けないことを確認
  const solverFn = needsRegion ? solve : solveWithoutRegion;

  for (let attempt = 0; attempt < 800; attempt++) {
    const solution = generateGrid();
    if (!solution) continue;
    const initial = removeToTarget(solution, minGiven, maxGiven, solverFn);
    if (!initial) continue;

    if (needsRegion) {
      // エリア手筋なしでは解けないことを確認（そうでないと初級レベル）
      if (solveWithoutRegion(initial)) continue;
    }

    return {
      id, difficulty: diff, size: SIZE,
      hasRegions: true,
      initial, solution, constraints: [], walls: [],
    };
  }
  return null;
}

// ─── メイン ──────────────────────────────────────────────

const DIFFS = ['初級', '中級', '上級'];
const COUNT = 30;
const puzzles = [];
let id = 2001;

for (const diff of DIFFS) {
  let generated = 0;
  let totalAttempts = 0;
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
  "// エリアパズル (自動生成)",
  `// 生成日: ${new Date().toISOString().slice(0, 10)}`,
  "const REGION_PUZZLES = " + JSON.stringify(puzzles, null, 2) + ";",
  "",
  "function getRegionPuzzleByDifficulty(difficulty) {",
  "  const day = Math.floor((new Date() - new Date('2025-01-01')) / 86400000);",
  "  const pool = REGION_PUZZLES.filter(p => p.difficulty === difficulty);",
  "  return pool[day % pool.length];",
  "}",
];

process.stdout.write(lines.join('\n') + '\n');
