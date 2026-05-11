#!/usr/bin/env node
// 壁ありパズル自動生成スクリプト
// Usage: node scripts/generate-wall-puzzles.js
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
  if (grid[r].filter(v => v === val).length >= 3) return false;
  if (grid.map(row => row[c]).filter(v => v === val).length >= 3) return false;
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

// ─── 壁生成 ───────────────────────────────────────────────────

function createsTinySegment(walls, newWall) {
  const test = [...walls, newWall];
  if (newWall.r1 === newWall.r2) {
    const r = newWall.r1;
    const pos = test.filter(w => w.r1===r && w.r2===r).map(w => Math.min(w.c1,w.c2)).sort((a,b)=>a-b);
    let prev = -1;
    for (const p of [...pos, SIZE-1]) { if (p - prev < 2) return true; prev = p + 1; }
  } else {
    const c = newWall.c1;
    const pos = test.filter(w => w.c1===c && w.c2===c).map(w => Math.min(w.r1,w.r2)).sort((a,b)=>a-b);
    let prev = -1;
    for (const p of [...pos, SIZE-1]) { if (p - prev < 2) return true; prev = p + 1; }
  }
  return false;
}

function generateWalls(count) {
  const candidates = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE-1; c++)
      candidates.push({r1:r, c1:c, r2:r, c2:c+1});
  for (let c = 0; c < SIZE; c++)
    for (let r = 0; r < SIZE-1; r++)
      candidates.push({r1:r, c1:c, r2:r+1, c2:c});
  const walls = [];
  for (const cand of shuffle(candidates)) {
    if (walls.length >= count) break;
    if (!createsTinySegment(walls, cand)) walls.push(cand);
  }
  return walls;
}

// ─── 壁対応ソルバー ───────────────────────────────────────────

function makeHW(walls) {
  return (r,c) => walls.some(w => w.r1===r && w.r2===r && Math.min(w.c1,w.c2)===c);
}
function makeVW(walls) {
  return (r,c) => walls.some(w => w.c1===c && w.c2===c && Math.min(w.r1,w.r2)===r);
}

function applyBalance(grid) {
  let used = false;
  for (let r = 0; r < SIZE; r++)
    for (const v of [SHIRT, BEER])
      if (grid[r].filter(x=>x===v).length === SIZE/2)
        for (let c = 0; c < SIZE; c++)
          if (grid[r][c]===EMPTY) { grid[r][c]=opp(v); used=true; }
  for (let c = 0; c < SIZE; c++)
    for (const v of [SHIRT, BEER])
      if (grid.filter(row=>row[c]===v).length === SIZE/2)
        for (let r = 0; r < SIZE; r++)
          if (grid[r][c]===EMPTY) { grid[r][c]=opp(v); used=true; }
  return used;
}

function applyDoubleBlock(grid, hw, vw) {
  let used = false;
  for (let r = 0; r < SIZE; r++)
    for (let i = 0; i < SIZE-1; i++) {
      if (hw(r,i)) continue;
      const v = grid[r][i];
      if (v===EMPTY || grid[r][i+1]!==v) continue;
      if (i>0 && !hw(r,i-1) && grid[r][i-1]===EMPTY) { grid[r][i-1]=opp(v); used=true; }
      if (i+2<SIZE && !hw(r,i+1) && grid[r][i+2]===EMPTY) { grid[r][i+2]=opp(v); used=true; }
    }
  for (let c = 0; c < SIZE; c++)
    for (let i = 0; i < SIZE-1; i++) {
      if (vw(i,c)) continue;
      const v = grid[i][c];
      if (v===EMPTY || grid[i+1][c]!==v) continue;
      if (i>0 && !vw(i-1,c) && grid[i-1][c]===EMPTY) { grid[i-1][c]=opp(v); used=true; }
      if (i+2<SIZE && !vw(i+1,c) && grid[i+2][c]===EMPTY) { grid[i+2][c]=opp(v); used=true; }
    }
  return used;
}

function applySandwich(grid, hw, vw) {
  let used = false;
  for (let r = 0; r < SIZE; r++)
    for (let i = 0; i < SIZE-2; i++) {
      if (hw(r,i) || hw(r,i+1)) continue;
      const v = grid[r][i];
      if (v===EMPTY || grid[r][i+1]!==EMPTY || grid[r][i+2]!==v) continue;
      grid[r][i+1]=opp(v); used=true;
    }
  for (let c = 0; c < SIZE; c++)
    for (let i = 0; i < SIZE-2; i++) {
      if (vw(i,c) || vw(i+1,c)) continue;
      const v = grid[i][c];
      if (v===EMPTY || grid[i+1][c]!==EMPTY || grid[i+2][c]!==v) continue;
      grid[i+1][c]=opp(v); used=true;
    }
  return used;
}

function solve(initial, walls) {
  const hw = makeHW(walls), vw = makeVW(walls);
  const grid = copyGrid(initial);
  let changed = true;
  while (changed && !isFilled(grid)) {
    changed = false;
    if (applyBalance(grid))           changed = true;
    if (applyDoubleBlock(grid,hw,vw)) changed = true;
    if (applySandwich(grid,hw,vw))    changed = true;
  }
  return isFilled(grid);
}

// ─── セル削除（目標givens数まで削る） ────────────────────────

function removeToTarget(solution, walls, minGiven, maxGiven) {
  const positions = shuffle(
    Array.from({length: SIZE}, (_,r) => Array.from({length: SIZE}, (_,c) => [r,c])).flat()
  );
  let initial = copyGrid(solution);

  for (const [r, c] of positions) {
    const given = initial.flat().filter(v => v !== EMPTY).length;
    if (given <= minGiven) break;
    const saved = initial[r][c];
    initial[r][c] = EMPTY;
    if (!solve(initial, walls)) initial[r][c] = saved;
  }

  const given = initial.flat().filter(v => v !== EMPTY).length;
  if (given > maxGiven) return null; // 削れなさすぎ
  return initial;
}

// ─── パズル生成 ───────────────────────────────────────────────

const DIFF_PARAMS = {
  '初級': { wallCount: 3, minGiven: 16, maxGiven: 22 },
  '中級': { wallCount: 4, minGiven: 12, maxGiven: 16 },
  '上級': { wallCount: 5, minGiven:  8, maxGiven: 12 },
};

function tryGeneratePuzzle(diff, id) {
  const { wallCount, minGiven, maxGiven } = DIFF_PARAMS[diff];
  for (let attempt = 0; attempt < 300; attempt++) {
    const solution = generateGrid();
    if (!solution) continue;
    const walls = generateWalls(wallCount);
    const initial = removeToTarget(solution, walls, minGiven, maxGiven);
    if (!initial) continue;
    return { id, difficulty: diff, size: SIZE, walls, initial, solution, constraints: [] };
  }
  return null;
}

// ─── メイン ───────────────────────────────────────────────────

const DIFFS = ['初級', '中級', '上級'];
const COUNT = 30;
const puzzles = [];
let id = 1001;

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
  "// 壁ありパズル (自動生成)",
  `// 生成日: ${new Date().toISOString().slice(0,10)}`,
  "const WALL_PUZZLES = " + JSON.stringify(puzzles, null, 2) + ";",
  "",
  "function getWallPuzzleByDifficulty(difficulty) {",
  "  const day = Math.floor((new Date() - new Date('2025-01-01')) / 86400000);",
  "  const pool = WALL_PUZZLES.filter(p => p.difficulty === difficulty);",
  "  return pool[day % pool.length];",
  "}",
];

process.stdout.write(lines.join('\n') + '\n');
