#!/usr/bin/env node
// キラータンゴパズル自動生成
// 任意形状の枠 + 枠内の🍺数ヒント
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

// ─── グリッド生成 ─────────────────────────────────────────────

function canPlace(grid, r, c, val) {
  if (grid[r].filter(v => v === val).length >= SIZE / 2) return false;
  if (grid.map(row => row[c]).filter(v => v === val).length >= SIZE / 2) return false;
  if (c >= 2 && grid[r][c-1] === val && grid[r][c-2] === val) return false;
  if (r >= 2 && grid[r-1][c] === val && grid[r-2][c] === val) return false;
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

// ─── 枠生成（BFS成長法）──────────────────────────────────────

function generateCages(solution, targetCount, maxCageSize) {
  const cageId = Array.from({ length: SIZE }, () => Array(SIZE).fill(-1));
  const cages = Array.from({ length: targetCount }, (_, i) => ({ id: i, cells: [] }));

  // ランダムにシードを配置
  const allCells = shuffle(
    Array.from({ length: SIZE * SIZE }, (_, i) => [Math.floor(i / SIZE), i % SIZE])
  );
  for (let i = 0; i < targetCount; i++) {
    const [r, c] = allCells[i];
    cageId[r][c] = i;
    cages[i].cells.push({ r, c });
  }

  // BFSで各枠を拡張
  const queue = shuffle(
    allCells.slice(0, targetCount).map(([r, c]) => ({ id: cageId[r][c], r, c }))
  );

  const DIRS = [[-1,0],[1,0],[0,-1],[0,1]];
  while (queue.length > 0) {
    const { id, r, c } = queue.shift();
    if (cages[id].cells.length >= maxCageSize) continue;
    for (const [dr, dc] of shuffle(DIRS)) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
      if (cageId[nr][nc] !== -1) continue;
      if (cages[id].cells.length >= maxCageSize) break;
      cageId[nr][nc] = id;
      cages[id].cells.push({ r: nr, c: nc });
      queue.push({ id, r: nr, c: nc });
    }
  }

  // 未割当セルを隣接枠に吸収（maxCageSize無視）
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (cageId[r][c] !== -1) continue;
        for (const [dr, dc] of shuffle(DIRS)) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
          if (cageId[nr][nc] === -1) continue;
          const adjId = cageId[nr][nc];
          cageId[r][c] = adjId;
          cages[adjId].cells.push({ r, c });
          changed = true;
          break;
        }
      }
    }
  }

  // 空枠を除去してID再割当、🍺数を設定
  return cages
    .filter(cage => cage.cells.length > 0)
    .map((cage, i) => ({
      id: i,
      cells: cage.cells,
      beerCount: cage.cells.filter(({ r, c }) => solution[r][c] === BEER).length,
    }));
}

// ─── 枠対応ソルバー ──────────────────────────────────────────

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

function applyKillerCage(grid, cages) {
  let used = false;
  for (const cage of cages) {
    let beerCount = 0, shirtCount = 0;
    const emptyCells = [];
    for (const { r, c } of cage.cells) {
      if (grid[r][c] === BEER) beerCount++;
      else if (grid[r][c] === SHIRT) shirtCount++;
      else emptyCells.push([r, c]);
    }
    if (emptyCells.length === 0) continue;
    const beerNeeded  = cage.beerCount - beerCount;
    const shirtNeeded = (cage.cells.length - cage.beerCount) - shirtCount;
    if (beerNeeded < 0 || shirtNeeded < 0) continue;
    if (beerNeeded === 0)  { emptyCells.forEach(([r,c]) => { grid[r][c] = SHIRT; used = true; }); }
    if (shirtNeeded === 0) { emptyCells.forEach(([r,c]) => { grid[r][c] = BEER;  used = true; }); }
  }
  return used;
}

function solve(initial, cages) {
  const grid = copyGrid(initial);
  let changed = true;
  while (changed && !isFilled(grid)) {
    changed = false;
    if (applyBalance(grid))          changed = true;
    if (applyDoubleBlock(grid))      changed = true;
    if (applySandwich(grid))         changed = true;
    if (applyKillerCage(grid, cages)) changed = true;
  }
  return isFilled(grid);
}

// ─── パズル生成 ───────────────────────────────────────────────

const DIFF_PARAMS = {
  '初級': { targetCount: 12, maxCageSize: 4 },
  '中級': { targetCount:  9, maxCageSize: 5 },
  '上級': { targetCount:  7, maxCageSize: 6 },
};

function tryGeneratePuzzle(diff, id) {
  const { targetCount, maxCageSize } = DIFF_PARAMS[diff];
  for (let attempt = 0; attempt < 500; attempt++) {
    const solution = generateGrid();
    if (!solution) continue;
    const cages = generateCages(solution, targetCount, maxCageSize);
    const initial = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
    if (!solve(initial, cages)) continue;
    return { id, difficulty: diff, size: SIZE, hasKiller: true, cages, initial, solution, constraints: [], walls: [] };
  }
  return null;
}

// ─── メイン ───────────────────────────────────────────────────

const DIFFS = ['初級', '中級', '上級'];
const COUNT = 30;
const puzzles = [];
let id = 4001;

for (const diff of DIFFS) {
  let generated = 0, totalAttempts = 0;
  while (generated < COUNT && totalAttempts < COUNT * 30) {
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
  "// キラータンゴパズル (自動生成)",
  `// 生成日: ${new Date().toISOString().slice(0, 10)}`,
  "const KILLER_PUZZLES = " + JSON.stringify(puzzles, null, 2) + ";",
  "",
  "function getKillerPuzzleByDifficulty(difficulty) {",
  "  const day = Math.floor((new Date() - new Date('2025-01-01')) / 86400000);",
  "  const pool = KILLER_PUZZLES.filter(p => p.difficulty === difficulty);",
  "  return pool[day % pool.length];",
  "}",
];
process.stdout.write(lines.join('\n') + '\n');
