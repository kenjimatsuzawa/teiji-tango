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

// ─── グリッド生成（壁対応：壁をまたぐ3連続を許可）──────────────
// 壁モードでは「壁をまたぐ同じ記号の連続」はルール違反にならない。
// 標準ルールで解を作ると壁が無くても同じ解が一意に求まり「飾り」になるため、
// 解生成自体に壁の位置を反映させ、壁をまたぐ3連続が起こり得るようにする。

function canPlace(grid, r, c, val, hw, vw) {
  if (grid[r].filter(v => v === val).length >= 3) return false;
  if (grid.map(row => row[c]).filter(v => v === val).length >= 3) return false;
  // 行3連続（同一セグメント内のみ）
  if (c >= 2 && !hw(r, c-2) && !hw(r, c-1) && grid[r][c-1] === val && grid[r][c-2] === val) return false;
  // 列3連続（同一セグメント内のみ）
  if (r >= 2 && !vw(r-2, c) && !vw(r-1, c) && grid[r-1][c] === val && grid[r-2][c] === val) return false;
  return true;
}

function fillGrid(grid, pos, hw, vw) {
  if (pos === SIZE * SIZE) return true;
  const r = Math.floor(pos / SIZE), c = pos % SIZE;
  for (const val of shuffle([SHIRT, BEER])) {
    if (canPlace(grid, r, c, val, hw, vw)) {
      grid[r][c] = val;
      if (fillGrid(grid, pos + 1, hw, vw)) return true;
      grid[r][c] = EMPTY;
    }
  }
  return false;
}

function generateGrid(hw, vw) {
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
  return fillGrid(grid, 0, hw, vw) ? grid : null;
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

// 解の中に「壁をまたぐ3連続」が実在するか（壁が解の構造に効いているか）
function wallsShapeSolution(solution, walls) {
  const hw = makeHW(walls), vw = makeVW(walls);
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c + 2 < SIZE; c++)
      if ((hw(r, c) || hw(r, c+1)) &&
          solution[r][c] === solution[r][c+1] && solution[r][c+1] === solution[r][c+2]) return true;
  for (let c = 0; c < SIZE; c++)
    for (let r = 0; r + 2 < SIZE; r++)
      if ((vw(r, c) || vw(r+1, c)) &&
          solution[r][c] === solution[r+1][c] && solution[r+1][c] === solution[r+2][c]) return true;
  return false;
}

// 壁を無視して解いた場合に「正しい解」へたどり着けるか
// （たどり着けるなら壁は飾り＝essentialではない）
function solvesToSameWithoutWalls(initial, solution) {
  const noWall = () => false;
  const grid = copyGrid(initial);
  let changed = true;
  while (changed && !isFilled(grid)) {
    changed = false;
    if (applyBalance(grid))                  changed = true;
    if (applyDoubleBlock(grid, noWall, noWall)) changed = true;
    if (applySandwich(grid, noWall, noWall))    changed = true;
  }
  return isFilled(grid) && grid.every((row, r) => row.every((v, c) => v === solution[r][c]));
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
  for (let attempt = 0; attempt < 500; attempt++) {
    // 壁を先に決め、壁をまたぐ3連続を許した解を生成する
    const walls = generateWalls(wallCount);
    const hw = makeHW(walls), vw = makeVW(walls);
    const solution = generateGrid(hw, vw);
    if (!solution) continue;
    // 解の中で実際に「壁をまたぐ3連続」が使われていなければ壁は無意味
    if (!wallsShapeSolution(solution, walls)) continue;
    const initial = removeToTarget(solution, walls, minGiven, maxGiven);
    if (!initial) continue;
    // 壁を無視した解法で正解にたどり着けてしまうなら壁は飾り
    if (solvesToSameWithoutWalls(initial, solution)) continue;
    return { id, difficulty: diff, size: SIZE, walls, initial, solution, constraints: [] };
  }
  return null;
}

// ─── メイン ───────────────────────────────────────────────────

// CLI: --count N（難易度ごとの生成数、既定30） --start-id X（開始ID、既定1001）
//      --json（パズル配列のJSONのみ出力。既存ファイルへの追記用）
const argv = process.argv.slice(2);
function argNum(name, def) {
  const i = argv.indexOf(name);
  return i >= 0 ? Number(argv[i + 1]) : def;
}
const DIFFS = ['初級', '中級', '上級'];
const COUNT = argNum('--count', 30);
const JSON_ONLY = argv.includes('--json');
const puzzles = [];
let id = argNum('--start-id', 1001);

for (const diff of DIFFS) {
  let generated = 0;
  let totalAttempts = 0;
  while (generated < COUNT && totalAttempts < COUNT * 60) {
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

if (JSON_ONLY) {
  process.stdout.write(JSON.stringify(puzzles, null, 2) + '\n');
} else {
  const lines = [
    "'use strict';",
    "// 壁ありパズル (自動生成)",
    `// 生成日: ${new Date().toISOString().slice(0,10)}`,
    "const WALL_PUZZLES = " + JSON.stringify(puzzles, null, 2) + ";",
    "",
    "function getWallPuzzleByDifficulty(difficulty) {",
    "  const day = getDayIndex(); // 共通ロジック（puzzles.js で定義、JST16:00リセット）",
    "  const pool = WALL_PUZZLES.filter(p => p.difficulty === difficulty);",
    "  return pool[day % pool.length];",
    "}",
  ];
  process.stdout.write(lines.join('\n') + '\n');
}
