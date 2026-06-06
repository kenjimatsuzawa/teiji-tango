#!/usr/bin/env node
// 定時退社タンゴ パズル自動生成スクリプト
// Usage: node scripts/generate-puzzles.js
// 出力: 各難易度50問ずつ、stdout に JS 形式で出力

'use strict';

const SIZE = 6;
const SHIRT = 1;
const BEER = 2;
const EMPTY = 0;
const opp = v => (v === SHIRT ? BEER : SHIRT);

// ─── グリッド生成 ────────────────────────────────────────────

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

function canPlace(grid, r, c, val) {
  if (grid[r].filter(v => v === val).length >= 3) return false;
  if (grid.map(row => row[c]).filter(v => v === val).length >= 3) return false;
  if (c >= 2 && grid[r][c - 1] === val && grid[r][c - 2] === val) return false;
  if (r >= 2 && grid[r - 1][c] === val && grid[r - 2][c] === val) return false;
  // 残りマスでバランス維持できるか
  const rowEmpty = grid[r].filter(v => v === EMPTY).length - 1;
  const rowOpp = grid[r].filter(v => v === opp(val)).length;
  if (3 - rowOpp > rowEmpty) return false;
  const colEmpty = grid.map(row => row[c]).filter(v => v === EMPTY).length - 1;
  const colOpp = grid.map(row => row[c]).filter(v => v === opp(val)).length;
  if (3 - colOpp > colEmpty) return false;
  return true;
}

function fillGrid(grid, pos) {
  if (pos === SIZE * SIZE) return true;
  const r = Math.floor(pos / SIZE);
  const c = pos % SIZE;
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

// ─── テクニックソルバー ─────────────────────────────────────

function applyBalance(grid, techsUsed) {
  let used = false;
  for (let r = 0; r < SIZE; r++) {
    for (const v of [SHIRT, BEER]) {
      if (grid[r].filter(x => x === v).length === SIZE / 2) {
        for (let c = 0; c < SIZE; c++) {
          if (grid[r][c] === EMPTY) { grid[r][c] = opp(v); techsUsed.add(1); used = true; }
        }
      }
    }
  }
  for (let c = 0; c < SIZE; c++) {
    for (const v of [SHIRT, BEER]) {
      if (grid.filter(row => row[c] === v).length === SIZE / 2) {
        for (let r = 0; r < SIZE; r++) {
          if (grid[r][c] === EMPTY) { grid[r][c] = opp(v); techsUsed.add(1); used = true; }
        }
      }
    }
  }
  return used;
}

function applyDoubleBlock(grid, techsUsed) {
  let used = false;
  for (let r = 0; r < SIZE; r++) {
    for (let i = 0; i < SIZE - 1; i++) {
      const v = grid[r][i];
      if (v === EMPTY || grid[r][i + 1] !== v) continue;
      if (i > 0 && grid[r][i - 1] === EMPTY) { grid[r][i - 1] = opp(v); techsUsed.add(2); used = true; }
      if (i + 2 < SIZE && grid[r][i + 2] === EMPTY) { grid[r][i + 2] = opp(v); techsUsed.add(2); used = true; }
    }
  }
  for (let c = 0; c < SIZE; c++) {
    for (let i = 0; i < SIZE - 1; i++) {
      const v = grid[i][c];
      if (v === EMPTY || grid[i + 1][c] !== v) continue;
      if (i > 0 && grid[i - 1][c] === EMPTY) { grid[i - 1][c] = opp(v); techsUsed.add(2); used = true; }
      if (i + 2 < SIZE && grid[i + 2][c] === EMPTY) { grid[i + 2][c] = opp(v); techsUsed.add(2); used = true; }
    }
  }
  return used;
}

function applySandwich(grid, techsUsed) {
  let used = false;
  for (let r = 0; r < SIZE; r++) {
    for (let i = 0; i < SIZE - 2; i++) {
      const v = grid[r][i];
      if (v === EMPTY || grid[r][i + 1] !== EMPTY || grid[r][i + 2] !== v) continue;
      grid[r][i + 1] = opp(v); techsUsed.add(3); used = true;
    }
  }
  for (let c = 0; c < SIZE; c++) {
    for (let i = 0; i < SIZE - 2; i++) {
      const v = grid[i][c];
      if (v === EMPTY || grid[i + 1][c] !== EMPTY || grid[i + 2][c] !== v) continue;
      grid[i + 1][c] = opp(v); techsUsed.add(3); used = true;
    }
  }
  return used;
}

function applyConstraint(grid, constraints, techsUsed) {
  let used = false;
  for (const con of constraints) {
    const v1 = grid[con.r1][con.c1], v2 = grid[con.r2][con.c2];
    if (v1 !== EMPTY && v2 === EMPTY) {
      grid[con.r2][con.c2] = con.type === 'eq' ? v1 : opp(v1);
      techsUsed.add(4); used = true;
    }
    if (v2 !== EMPTY && v1 === EMPTY) {
      grid[con.r1][con.c1] = con.type === 'eq' ? v2 : opp(v2);
      techsUsed.add(4); used = true;
    }
  }
  return used;
}

function applyEndpointBalance(grid, techsUsed) {
  let used = false;
  for (let r = 0; r < SIZE; r++) {
    const row = grid[r];
    if (row[0] !== EMPTY && row[0] === row[1] && row[5] === EMPTY) { row[5] = opp(row[0]); techsUsed.add(5); used = true; }
    if (row[4] !== EMPTY && row[4] === row[5] && row[0] === EMPTY) { row[0] = opp(row[5]); techsUsed.add(5); used = true; }
  }
  for (let c = 0; c < SIZE; c++) {
    if (grid[0][c] !== EMPTY && grid[0][c] === grid[1][c] && grid[5][c] === EMPTY) { grid[5][c] = opp(grid[0][c]); techsUsed.add(5); used = true; }
    if (grid[4][c] !== EMPTY && grid[4][c] === grid[5][c] && grid[0][c] === EMPTY) { grid[0][c] = opp(grid[5][c]); techsUsed.add(5); used = true; }
  }
  return used;
}

// Returns { solved, techsUsed: Set, rounds }
function solve(initial, constraints, maxTech = 5) {
  const grid = copyGrid(initial);
  const techsUsed = new Set();
  let rounds = 0;
  let changed = true;
  while (changed && !isFilled(grid)) {
    changed = false;
    rounds++;
    if (maxTech >= 1 && applyBalance(grid, techsUsed)) changed = true;
    if (maxTech >= 2 && applyDoubleBlock(grid, techsUsed)) changed = true;
    if (maxTech >= 3 && applySandwich(grid, techsUsed)) changed = true;
    if (maxTech >= 4 && applyConstraint(grid, constraints, techsUsed)) changed = true;
    if (maxTech >= 5 && applyEndpointBalance(grid, techsUsed)) changed = true;
  }
  return { solved: isFilled(grid), techsUsed, rounds };
}

// ─── パズル生成 ─────────────────────────────────────────────

function getAdjacentPairs() {
  const pairs = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (c + 1 < SIZE) pairs.push({ r1: r, c1: c, r2: r, c2: c + 1 });
      if (r + 1 < SIZE) pairs.push({ r1: r, c1: c, r2: r + 1, c2: c });
    }
  }
  return pairs;
}

function tryGeneratePuzzle(solution, targetDiff) {
  // 全難易度「制約先行」アプローチ
  // 候補制約を先に配置 → セルを削除 → 本当に必要な制約だけ残す
  const PARAMS = {
    '初級': { minCells: 14, maxTech: 4, minCon: 2, maxCon: 5 },
    '中級': { minCells: 10, maxTech: 5, minCon: 2, maxCon: 6 },
    '上級': { minCells:  7, maxTech: 5, minCon: 1, maxCon: 4 },
  };
  const { minCells, maxTech, minCon, maxCon } = PARAMS[targetDiff];

  // Step1: 候補制約を15個生成
  const candidates = shuffle(getAdjacentPairs()).slice(0, 15).map(pair => ({
    r1: pair.r1, c1: pair.c1, r2: pair.r2, c2: pair.c2,
    type: solution[pair.r1][pair.c1] === solution[pair.r2][pair.c2] ? 'eq' : 'neq',
  }));

  // Step2: 候補制約を使いながらセルを削除
  const initial = copyGrid(solution);
  for (const pos of shuffle(Array.from({ length: SIZE * SIZE }, (_, i) => i))) {
    const r = Math.floor(pos / SIZE), c = pos % SIZE;
    if (initial[r][c] === EMPTY) continue;
    const saved = initial[r][c];
    initial[r][c] = EMPTY;
    const cellCount = initial.flat().filter(v => v !== EMPTY).length;
    if (cellCount < minCells || !solve(initial, candidates, maxTech).solved) initial[r][c] = saved;
  }

  // Step3: 反復削除で最小必須制約セットを求める
  // 一度に全体から個別削除する方法は相互依存を見落とすため反復削除を使用
  let essential = [...candidates];
  if (!solve(initial, essential, maxTech).solved) return null;
  let reduced = true;
  while (reduced) {
    reduced = false;
    for (let i = essential.length - 1; i >= 0; i--) {
      const without = essential.filter((_, j) => j !== i);
      if (solve(initial, without, maxTech).solved) {
        essential = without;
        reduced = true;
        break;
      }
    }
  }
  if (essential.length < minCon || essential.length > maxCon) return null;

  // Step4: 難易度を確認（tech5の必要性でクラス分け）
  const r4 = solve(initial, essential, 4);
  const r5 = solve(initial, essential, 5);
  if (!r5.solved) return null;

  const cellCount = initial.flat().filter(v => v !== EMPTY).length;
  const needsTech5 = !r4.solved;

  let actualDiff;
  if (!needsTech5 && cellCount >= 14) {
    actualDiff = '初級';
  } else if (needsTech5 && cellCount >= 10) {
    actualDiff = '中級';
  } else if (needsTech5 && cellCount < 10) {
    actualDiff = '上級';
  } else {
    return null;
  }

  if (actualDiff !== targetDiff) return null;

  return { initial, constraints: essential, solution };
}

function generatePuzzles(difficulty, count) {
  const puzzles = [];
  let attempts = 0;
  const maxAttempts = count * 200;

  while (puzzles.length < count && attempts < maxAttempts) {
    attempts++;
    const solution = generateGrid();
    if (!solution) continue;
    const puzzle = tryGeneratePuzzle(solution, difficulty);
    if (puzzle) {
      puzzles.push(puzzle);
      process.stderr.write(`\r  ${difficulty}: ${puzzles.length}/${count}  (試行 ${attempts}回)`);
    }
  }
  process.stderr.write('\n');
  if (puzzles.length < count) {
    process.stderr.write(`  ⚠ ${difficulty}: ${count}問中 ${puzzles.length}問のみ生成完了\n`);
  }
  return puzzles;
}

// ─── 出力 ───────────────────────────────────────────────────

function fmtRow(row) { return `[${row.join(',')}]`; }
function fmtCon(c) { return `{ r1:${c.r1}, c1:${c.c1}, r2:${c.r2}, c2:${c.c2}, type:'${c.type}' }`; }

function main() {
  const TARGET = 50;
  let allPuzzles = [];
  let id = 100;

  for (const diff of ['初級', '中級', '上級']) {
    process.stderr.write(`\n[${diff}] 生成中...\n`);
    const puzzles = generatePuzzles(diff, TARGET);
    for (const p of puzzles) {
      allPuzzles.push({ id: id++, size: SIZE, difficulty: diff, ...p });
    }
  }

  // puzzles.js 形式で出力
  console.log('// パズルデータ (自動生成分 + 手作り分)');
  console.log('// symbol: 0=空, 1=👔(出社), 2=🍺(退社)');
  console.log('');
  console.log('const PUZZLES = [');

  for (const p of allPuzzles) {
    const cellCount = p.initial.flat().filter(v => v !== EMPTY).length;
    const r5 = solve(p.initial, p.constraints, 5);
    console.log(`  {`);
    console.log(`    id: ${p.id},`);
    console.log(`    size: ${p.size},`);
    console.log(`    difficulty: '${p.difficulty}', // 初期マス:${cellCount}/36, rounds:${r5.rounds}, techs:[${[...r5.techsUsed].sort().join(',')}]`);
    console.log(`    initial: [`);
    for (const row of p.initial) console.log(`      ${fmtRow(row)},`);
    console.log(`    ],`);
    console.log(`    constraints: [`);
    for (const c of p.constraints) console.log(`      ${fmtCon(c)},`);
    console.log(`    ],`);
    console.log(`    solution: [`);
    for (const row of p.solution) console.log(`      ${fmtRow(row)},`);
    console.log(`    ],`);
    console.log(`  },`);
    console.log('');
  }

  console.log('];');
  console.log('');
  console.log(`const DIFFICULTIES = ['初級', '中級', '上級'];`);
  console.log('');
  console.log(`function getDayIndex() {`);
  console.log(`  const start = new Date('2025-01-01');`);
  console.log(`  return Math.floor((new Date() - start) / (1000 * 60 * 60 * 24));`);
  console.log(`}`);
  console.log('');
  console.log(`function getPuzzleByDifficulty(difficulty) {`);
  console.log(`  const pool = PUZZLES.filter(p => p.difficulty === difficulty);`);
  console.log(`  if (pool.length === 0) return null;`);
  console.log(`  return pool[getDayIndex() % pool.length];`);
  console.log(`}`);
  console.log('');
  console.log(`function getPuzzleForToday() {`);
  console.log(`  return PUZZLES[getDayIndex() % PUZZLES.length];`);
  console.log(`}`);
  console.log('');
  console.log(`function getPuzzleById(id) {`);
  console.log(`  return PUZZLES.find(p => p.id === id) || PUZZLES[0];`);
  console.log(`}`);

  process.stderr.write(`\n✅ 合計 ${allPuzzles.length} 問生成完了\n`);
}

main();
