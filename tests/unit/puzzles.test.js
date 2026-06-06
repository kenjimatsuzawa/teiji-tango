'use strict';

const { loadPuzzles, loadSolver } = require('../helpers/load');

const { PUZZLES, DIFFICULTIES, getDayIndex, getPuzzleByDifficulty } = loadPuzzles();
const TangoSolver = loadSolver();

const SHIRT = 1, BEER = 2, EMPTY = 0;
const SIZE = 6;

// ─── PUZZLES 配列の構造 ──────────────────────────────────────

describe('PUZZLES 配列の基本構造', () => {
  test('150 問存在する', () => {
    expect(PUZZLES).toHaveLength(150);
  });

  test('id が全問ユニーク', () => {
    const ids = PUZZLES.map(p => p.id);
    expect(new Set(ids).size).toBe(150);
  });

  test('各難易度がちょうど 50 問', () => {
    for (const diff of DIFFICULTIES) {
      const count = PUZZLES.filter(p => p.difficulty === diff).length;
      expect(count).toBe(50);
    }
  });

  test('DIFFICULTIES は [初級, 中級, 上級]', () => {
    expect(DIFFICULTIES).toEqual(['初級', '中級', '上級']);
  });

  test('difficulty フィールドが DIFFICULTIES 内にある', () => {
    for (const p of PUZZLES) {
      expect(DIFFICULTIES).toContain(p.difficulty);
    }
  });
});

// ─── 各パズルのフィールド検証 ────────────────────────────────

describe.each(PUZZLES.map(p => [p.id, p.difficulty, p]))(
  'パズル id=%i (%s)',
  (id, diff, p) => {
    test('size === 6', () => {
      expect(p.size).toBe(SIZE);
    });

    test('initial は 6×6 の配列', () => {
      expect(p.initial).toHaveLength(SIZE);
      for (const row of p.initial) {
        expect(row).toHaveLength(SIZE);
      }
    });

    test('solution は 6×6 の配列', () => {
      expect(p.solution).toHaveLength(SIZE);
      for (const row of p.solution) {
        expect(row).toHaveLength(SIZE);
      }
    });

    test('initial の値は 0, 1, 2 のみ', () => {
      for (const row of p.initial) {
        for (const v of row) {
          expect([EMPTY, SHIRT, BEER]).toContain(v);
        }
      }
    });

    test('solution の値は 1 か 2 のみ（空マスなし）', () => {
      for (const row of p.solution) {
        for (const v of row) {
          expect([SHIRT, BEER]).toContain(v);
        }
      }
    });

    test('initial の非ゼロ値が solution と一致', () => {
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (p.initial[r][c] !== EMPTY) {
            expect(p.initial[r][c]).toBe(p.solution[r][c]);
          }
        }
      }
    });

    test('constraints は配列', () => {
      expect(Array.isArray(p.constraints)).toBe(true);
    });

    test('constraints の各要素が有効なフィールドを持つ', () => {
      for (const con of p.constraints) {
        expect(con.r1).toBeGreaterThanOrEqual(0);
        expect(con.r1).toBeLessThan(SIZE);
        expect(con.c1).toBeGreaterThanOrEqual(0);
        expect(con.c1).toBeLessThan(SIZE);
        expect(con.r2).toBeGreaterThanOrEqual(0);
        expect(con.r2).toBeLessThan(SIZE);
        expect(con.c2).toBeGreaterThanOrEqual(0);
        expect(con.c2).toBeLessThan(SIZE);
        expect(['eq', 'neq']).toContain(con.type);
      }
    });

    test('constraints は隣接セル間のみ', () => {
      for (const con of p.constraints) {
        const dr = Math.abs(con.r1 - con.r2);
        const dc = Math.abs(con.c1 - con.c2);
        // 水平 or 垂直 の隣接 (ドット積 dr+dc===1)
        expect(dr + dc).toBe(1);
      }
    });
  }
);

// ─── 解グリッドのルール検証 ──────────────────────────────────

describe('解グリッドのルール検証', () => {
  test.each(PUZZLES.map(p => [p.id, p.difficulty, p]))(
    'id=%i (%s): 各行は👔3・🍺3',
    (id, diff, p) => {
      for (let r = 0; r < SIZE; r++) {
        const shirts = p.solution[r].filter(v => v === SHIRT).length;
        const beers = p.solution[r].filter(v => v === BEER).length;
        expect(shirts).toBe(3);
        expect(beers).toBe(3);
      }
    }
  );

  test.each(PUZZLES.map(p => [p.id, p.difficulty, p]))(
    'id=%i (%s): 各列は👔3・🍺3',
    (id, diff, p) => {
      for (let c = 0; c < SIZE; c++) {
        const col = p.solution.map(row => row[c]);
        expect(col.filter(v => v === SHIRT).length).toBe(3);
        expect(col.filter(v => v === BEER).length).toBe(3);
      }
    }
  );

  test.each(PUZZLES.map(p => [p.id, p.difficulty, p]))(
    'id=%i (%s): 行に3連続なし',
    (id, diff, p) => {
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE - 2; c++) {
          const v = p.solution[r][c];
          expect(!(v === p.solution[r][c + 1] && v === p.solution[r][c + 2])).toBe(true);
        }
      }
    }
  );

  test.each(PUZZLES.map(p => [p.id, p.difficulty, p]))(
    'id=%i (%s): 列に3連続なし',
    (id, diff, p) => {
      for (let c = 0; c < SIZE; c++) {
        for (let r = 0; r < SIZE - 2; r++) {
          const v = p.solution[r][c];
          expect(!(v === p.solution[r + 1][c] && v === p.solution[r + 2][c])).toBe(true);
        }
      }
    }
  );

  test.each(PUZZLES.map(p => [p.id, p.difficulty, p]))(
    'id=%i (%s): constraints が解で満たされる',
    (id, diff, p) => {
      for (const con of p.constraints) {
        const v1 = p.solution[con.r1][con.c1];
        const v2 = p.solution[con.r2][con.c2];
        if (con.type === 'eq') expect(v1).toBe(v2);
        if (con.type === 'neq') expect(v1).not.toBe(v2);
      }
    }
  );
});

// ─── 難易度別 初期マス数 ─────────────────────────────────────

describe('難易度別 初期マス数', () => {
  test('初級: 初期マスが 14 個以上', () => {
    const easy = PUZZLES.filter(p => p.difficulty === '初級');
    for (const p of easy) {
      const count = p.initial.flat().filter(v => v !== EMPTY).length;
      expect(count).toBeGreaterThanOrEqual(14);
    }
  });

  test('中級: 初期マスが 9〜17 個', () => {
    const mid = PUZZLES.filter(p => p.difficulty === '中級');
    for (const p of mid) {
      const count = p.initial.flat().filter(v => v !== EMPTY).length;
      expect(count).toBeGreaterThanOrEqual(9);
      expect(count).toBeLessThanOrEqual(17);
    }
  });

  test('上級: 初期マスが 14 個以下', () => {
    const hard = PUZZLES.filter(p => p.difficulty === '上級');
    for (const p of hard) {
      const count = p.initial.flat().filter(v => v !== EMPTY).length;
      expect(count).toBeLessThanOrEqual(14);
    }
  });
});

// ─── テクニック難易度分類 ────────────────────────────────────

describe('テクニック難易度分類', () => {
  function solve(initial, constraints, maxTech) {
    // テクニックソルバーを段階別に実行
    const SHIRT = 1, BEER = 2, EMPTY = 0;
    const opp = v => (v === SHIRT ? BEER : SHIRT);
    const grid = initial.map(r => [...r]);
    const techsUsed = new Set();
    let rounds = 0, changed = true;

    function applyBalance() {
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
    function applyDoubleBlock() {
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
    function applySandwich() {
      let used = false;
      for (let r = 0; r < SIZE; r++)
        for (let i = 0; i < SIZE - 2; i++) {
          const v = grid[r][i];
          if (v === EMPTY || grid[r][i + 1] !== EMPTY || grid[r][i + 2] !== v) continue;
          grid[r][i + 1] = opp(v); techsUsed.add(3); used = true;
        }
      for (let c = 0; c < SIZE; c++)
        for (let i = 0; i < SIZE - 2; i++) {
          const v = grid[i][c];
          if (v === EMPTY || grid[i + 1][c] !== EMPTY || grid[i + 2][c] !== v) continue;
          grid[i + 1][c] = opp(v); techsUsed.add(3); used = true;
        }
      return used;
    }
    function applyConstraint() {
      let used = false;
      for (const con of constraints) {
        const v1 = grid[con.r1][con.c1], v2 = grid[con.r2][con.c2];
        if (v1 !== EMPTY && v2 === EMPTY) { grid[con.r2][con.c2] = con.type === 'eq' ? v1 : opp(v1); techsUsed.add(4); used = true; }
        if (v2 !== EMPTY && v1 === EMPTY) { grid[con.r1][con.c1] = con.type === 'eq' ? v2 : opp(v2); techsUsed.add(4); used = true; }
      }
      return used;
    }
    function applyEndpoint() {
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

    while (changed && grid.some(r => r.some(v => v === EMPTY))) {
      changed = false; rounds++;
      if (maxTech >= 1 && applyBalance()) changed = true;
      if (maxTech >= 2 && applyDoubleBlock()) changed = true;
      if (maxTech >= 3 && applySandwich()) changed = true;
      if (maxTech >= 4 && applyConstraint()) changed = true;
      if (maxTech >= 5 && applyEndpoint()) changed = true;
    }
    return { solved: grid.every(r => r.every(v => v !== EMPTY)), techsUsed, rounds };
  }

  test('初級パズルは tech1〜4 のみで完全解ける', () => {
    for (const p of PUZZLES.filter(p => p.difficulty === '初級')) {
      const { solved } = solve(p.initial, p.constraints, 4);
      expect(solved).toBe(true);
    }
  });

  test('中級パズルは tech5 が必要（tech1〜4 だけでは解けない）', () => {
    for (const p of PUZZLES.filter(p => p.difficulty === '中級')) {
      const { solved } = solve(p.initial, p.constraints, 4);
      expect(solved).toBe(false);
    }
  });

  test('上級パズルは tech5 が必要', () => {
    for (const p of PUZZLES.filter(p => p.difficulty === '上級')) {
      const { solved } = solve(p.initial, p.constraints, 4);
      expect(solved).toBe(false);
    }
  });
});

// ─── getPuzzleByDifficulty ───────────────────────────────────

describe('getPuzzleByDifficulty', () => {
  test('存在する難易度では非 null を返す', () => {
    expect(getPuzzleByDifficulty('初級')).not.toBeNull();
    expect(getPuzzleByDifficulty('中級')).not.toBeNull();
    expect(getPuzzleByDifficulty('上級')).not.toBeNull();
  });

  test('存在しない難易度では null を返す', () => {
    expect(getPuzzleByDifficulty('超上級')).toBeNull();
  });

  test('返したパズルの difficulty が一致する', () => {
    for (const diff of DIFFICULTIES) {
      expect(getPuzzleByDifficulty(diff).difficulty).toBe(diff);
    }
  });
});

// ─── getDayIndex ─────────────────────────────────────────────

describe('getDayIndex', () => {
  test('非負の整数を返す', () => {
    const idx = getDayIndex();
    expect(Number.isInteger(idx)).toBe(true);
    expect(idx).toBeGreaterThanOrEqual(0);
  });

  test('2025-01-01 より後の値 (今日は 2026-05-04)', () => {
    // 2025-01-01 から今日 (2026-05-04) まで 488 日以上経過
    expect(getDayIndex()).toBeGreaterThanOrEqual(488);
  });
});
