'use strict';

const { loadSolver, loadGame, loadPuzzles } = require('../helpers/load');

const TangoSolver = loadSolver();
const TangoGame = loadGame(TangoSolver);
const { PUZZLES } = loadPuzzles();

const SHIRT = 1, BEER = 2, EMPTY = 0;

// 難易度別代表パズル
const EASY_P = PUZZLES.find(p => p.difficulty === '初級');
const MID_P  = PUZZLES.find(p => p.difficulty === '中級');

function makeGame(puzzle = EASY_P) {
  return new TangoGame(puzzle);
}

// ─── コンストラクタ ──────────────────────────────────────────

describe('TangoGame コンストラクタ', () => {
  test('size が正しく設定される', () => {
    expect(makeGame().size).toBe(6);
  });

  test('grid は initial のコピー（参照共有しない）', () => {
    const game = makeGame();
    game.grid[0][0] = 99;
    expect(EASY_P.initial[0][0]).not.toBe(99);
  });

  test('fixed は initial の非ゼロマスが true', () => {
    const game = makeGame();
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        expect(game.fixed[r][c]).toBe(EASY_P.initial[r][c] !== EMPTY);
      }
    }
  });

  test('solveSteps は配列', () => {
    expect(Array.isArray(makeGame().solveSteps)).toBe(true);
  });

  test('solveSteps は初級パズルでは 1 件以上ある', () => {
    expect(makeGame().solveSteps.length).toBeGreaterThan(0);
  });

  test('constraints が正しく設定される', () => {
    const game = makeGame();
    expect(game.constraints).toBe(EASY_P.constraints);
  });
});

// ─── toggle ─────────────────────────────────────────────────

describe('toggle', () => {
  test('空マス → SHIRT になる', () => {
    const game = makeGame();
    const [r, c] = findEmpty(game);
    game.toggle(r, c);
    expect(game.grid[r][c]).toBe(SHIRT);
  });

  test('SHIRT → BEER になる', () => {
    const game = makeGame();
    const [r, c] = findEmpty(game);
    game.toggle(r, c);
    game.toggle(r, c);
    expect(game.grid[r][c]).toBe(BEER);
  });

  test('BEER → EMPTY になる（3ステップでサイクル）', () => {
    const game = makeGame();
    const [r, c] = findEmpty(game);
    game.toggle(r, c); // → SHIRT
    game.toggle(r, c); // → BEER
    game.toggle(r, c); // → EMPTY
    expect(game.grid[r][c]).toBe(EMPTY);
  });

  test('fixed マスは変更されず false を返す', () => {
    const game = makeGame();
    const [r, c] = findFixed(game);
    const before = game.grid[r][c];
    const result = game.toggle(r, c);
    expect(result).toBe(false);
    expect(game.grid[r][c]).toBe(before);
  });

  test('空マスへの toggle は true を返す', () => {
    const game = makeGame();
    const [r, c] = findEmpty(game);
    expect(game.toggle(r, c)).toBe(true);
  });
});

// ─── reset ──────────────────────────────────────────────────

describe('reset', () => {
  test('toggle 後に reset すると initial に戻る', () => {
    const game = makeGame();
    const [r, c] = findEmpty(game);
    game.toggle(r, c);
    game.reset();
    for (let row = 0; row < 6; row++) {
      expect(game.grid[row]).toEqual(EASY_P.initial[row]);
    }
  });

  test('reset 後も fixed は変わらない', () => {
    const game = makeGame();
    const [r, c] = findEmpty(game);
    game.toggle(r, c);
    game.reset();
    expect(game.fixed[r][c]).toBe(false);
  });
});

// ─── isFilled ───────────────────────────────────────────────

describe('isFilled', () => {
  test('初期状態（空マスあり）は false', () => {
    expect(makeGame().isFilled()).toBe(false);
  });

  test('全マスを埋めると true', () => {
    const game = makeGame();
    fillWithSolution(game);
    expect(game.isFilled()).toBe(true);
  });

  test('1マスでも空があると false', () => {
    const game = makeGame();
    fillWithSolution(game);
    const [r, c] = findEmpty(makeGame()); // initial の空マス
    game.grid[r][c] = EMPTY;
    expect(game.isFilled()).toBe(false);
  });
});

// ─── checkNoTriple ──────────────────────────────────────────

describe('checkNoTriple', () => {
  test('正解グリッドでは true', () => {
    const game = makeGame();
    fillWithSolution(game);
    expect(game.checkNoTriple()).toBe(true);
  });

  test('行に3連続があると false', () => {
    const game = makeGame();
    fillWithSolution(game);
    // 行0を [1,1,1,...] にする
    game.grid[0][0] = SHIRT;
    game.grid[0][1] = SHIRT;
    game.grid[0][2] = SHIRT;
    expect(game.checkNoTriple()).toBe(false);
  });

  test('列に3連続があると false', () => {
    const game = makeGame();
    fillWithSolution(game);
    game.grid[0][0] = BEER;
    game.grid[1][0] = BEER;
    game.grid[2][0] = BEER;
    expect(game.checkNoTriple()).toBe(false);
  });

  test('2連続は許可される', () => {
    const game = makeGame();
    fillWithSolution(game);
    // 行0の先頭2マスを同じにする（元がそうでなければ）
    const v = game.grid[0][0];
    game.grid[0][1] = v;
    if (game.grid[0][2] !== v) {
      expect(game.checkNoTriple()).toBe(true);
    }
  });
});

// ─── checkBalance ────────────────────────────────────────────

describe('checkBalance', () => {
  test('正解グリッドでは true', () => {
    const game = makeGame();
    fillWithSolution(game);
    expect(game.checkBalance()).toBe(true);
  });

  test('偏りのある行は false', () => {
    const game = makeGame();
    fillWithSolution(game);
    // 行0を [1,1,1,1,2,2] にする (shirt=4, beer=2)
    game.grid[0] = [SHIRT, SHIRT, SHIRT, SHIRT, BEER, BEER];
    expect(game.checkBalance()).toBe(false);
  });

  test('偏りのある列は false', () => {
    const game = makeGame();
    fillWithSolution(game);
    // col0 を全部 SHIRT にする
    for (let r = 0; r < 6; r++) game.grid[r][0] = SHIRT;
    expect(game.checkBalance()).toBe(false);
  });
});

// ─── checkConstraints ────────────────────────────────────────

describe('checkConstraints', () => {
  // eq/neq 制約を持つパズルを動的に選ぶ
  const WITH_EQ  = PUZZLES.find(p => p.constraints.some(c => c.type === 'eq'));
  const WITH_NEQ = PUZZLES.find(p => p.constraints.some(c => c.type === 'neq'));

  test('正解グリッドでは制約が全て満たされる', () => {
    const game = new TangoGame(MID_P);
    fillWithSolution(game);
    expect(game.checkConstraints()).toBe(true);
  });

  test('eq 制約違反で false', () => {
    const game = new TangoGame(WITH_EQ);
    fillWithSolution(game);
    const con = WITH_EQ.constraints.find(c => c.type === 'eq');
    game.grid[con.r1][con.c1] = SHIRT;
    game.grid[con.r2][con.c2] = BEER;
    expect(game.checkConstraints()).toBe(false);
  });

  test('neq 制約違反で false', () => {
    const game = new TangoGame(WITH_NEQ);
    fillWithSolution(game);
    const con = WITH_NEQ.constraints.find(c => c.type === 'neq');
    game.grid[con.r1][con.c1] = SHIRT;
    game.grid[con.r2][con.c2] = SHIRT;
    expect(game.checkConstraints()).toBe(false);
  });

  test('空マスがある場合は制約をスキップする', () => {
    const game = new TangoGame(MID_P);
    expect(game.checkConstraints()).toBe(true);
  });
});

// ─── getErrors ───────────────────────────────────────────────

describe('getErrors', () => {
  test('正しい盤面はエラーなし', () => {
    const game = makeGame();
    fillWithSolution(game);
    expect(game.getErrors().size).toBe(0);
  });

  test('3連続でエラーセルが追加される', () => {
    const game = makeGame();
    fillWithSolution(game);
    game.grid[0][0] = SHIRT;
    game.grid[0][1] = SHIRT;
    game.grid[0][2] = SHIRT;
    const errors = game.getErrors();
    expect(errors.has('0,0')).toBe(true);
    expect(errors.has('0,1')).toBe(true);
    expect(errors.has('0,2')).toBe(true);
  });

  test('制約違反でエラーセルが追加される', () => {
    const p = PUZZLES.find(q => q.constraints.some(c => c.type === 'eq'));
    const game = new TangoGame(p);
    fillWithSolution(game);
    const con = p.constraints.find(c => c.type === 'eq');
    game.grid[con.r1][con.c1] = SHIRT;
    game.grid[con.r2][con.c2] = BEER;
    const errors = game.getErrors();
    expect(errors.has(`${con.r1},${con.c1}`)).toBe(true);
    expect(errors.has(`${con.r2},${con.c2}`)).toBe(true);
  });

  test('空マスは 3連続エラーに含まれない', () => {
    const game = makeGame();
    const errors = game.getErrors();
    // initial 状態で空マスが誤検知されないことを確認
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (game.grid[r][c] === EMPTY) {
          expect(errors.has(`${r},${c}`)).toBe(false);
        }
      }
    }
  });
});

// ─── isComplete ──────────────────────────────────────────────

describe('isComplete', () => {
  test('正解グリッドで true', () => {
    const game = makeGame();
    fillWithSolution(game);
    expect(game.isComplete()).toBe(true);
  });

  test('空マスありで false', () => {
    expect(makeGame().isComplete()).toBe(false);
  });

  test('3連続違反で false', () => {
    const game = makeGame();
    fillWithSolution(game);
    game.grid[0][0] = SHIRT;
    game.grid[0][1] = SHIRT;
    game.grid[0][2] = SHIRT;
    expect(game.isComplete()).toBe(false);
  });

  test('バランス違反で false', () => {
    const game = makeGame();
    fillWithSolution(game);
    game.grid[0] = [SHIRT, SHIRT, SHIRT, SHIRT, BEER, BEER];
    expect(game.isComplete()).toBe(false);
  });
});

// ─── checkRegionBalance ──────────────────────────────────────

describe('checkRegionBalance', () => {
  // エリアパズル用のダミー（hasRegions=true）
  function makeRegionPuzzle() {
    // 行・列バランス＋エリアバランスを満たす既知の解を手動で作る
    // 2×3ブロック6つに3:3で分かれる解
    const solution = [
      [1,2,1,2,1,2],
      [2,1,2,1,2,1],
      [1,2,2,1,1,2],
      [2,1,1,2,2,1],
      [2,1,2,1,1,2],
      [1,2,1,2,2,1],
    ];
    return {
      size: 6, hasRegions: true,
      initial: solution.map(r => r.map(() => EMPTY)),
      solution, constraints: [], walls: [],
    };
  }

  test('hasRegions=false のパズルでは常に true', () => {
    const game = makeGame();
    fillWithSolution(game);
    expect(game.checkRegionBalance()).toBe(true);
  });

  test('エリアバランスが取れた盤面で true', () => {
    const puzzle = makeRegionPuzzle();
    const TangoGame2 = loadGame(TangoSolver);
    const game = new TangoGame2(puzzle);
    game.grid = puzzle.solution.map(r => [...r]);
    expect(game.checkRegionBalance()).toBe(true);
  });

  test('エリアバランス違反で false', () => {
    const puzzle = makeRegionPuzzle();
    const TangoGame2 = loadGame(TangoSolver);
    const game = new TangoGame2(puzzle);
    game.grid = puzzle.solution.map(r => [...r]);
    // エリア0 (rows 0-1, cols 0-2) に SHIRT を4個詰め込む
    game.grid[0][0] = SHIRT; game.grid[0][1] = SHIRT; game.grid[0][2] = SHIRT;
    game.grid[1][0] = SHIRT; game.grid[1][1] = BEER;  game.grid[1][2] = BEER;
    expect(game.checkRegionBalance()).toBe(false);
  });

  test('エリアバランス違反でエラーセルが検出される', () => {
    const puzzle = makeRegionPuzzle();
    const TangoGame2 = loadGame(TangoSolver);
    const game = new TangoGame2(puzzle);
    game.grid = puzzle.solution.map(r => [...r]);
    // エリア0 に SHIRT 4個
    game.grid[0][0] = SHIRT; game.grid[0][1] = SHIRT; game.grid[0][2] = SHIRT;
    game.grid[1][0] = SHIRT; game.grid[1][1] = BEER;  game.grid[1][2] = BEER;
    const errors = game.getErrors();
    // 4個のSHIRTがエラーになる
    expect(errors.has('0,0')).toBe(true);
    expect(errors.has('0,1')).toBe(true);
    expect(errors.has('0,2')).toBe(true);
    expect(errors.has('1,0')).toBe(true);
  });
});

// ─── getNextHint ─────────────────────────────────────────────

describe('getNextHint', () => {
  test('未解決マスがある場合にヒントを返す', () => {
    const game = makeGame();
    expect(game.getNextHint()).not.toBeNull();
  });

  test('返されたヒントは有効な r,c,value を持つ', () => {
    const game = makeGame();
    const hint = game.getNextHint();
    expect(hint.r).toBeGreaterThanOrEqual(0);
    expect(hint.r).toBeLessThan(6);
    expect(hint.c).toBeGreaterThanOrEqual(0);
    expect(hint.c).toBeLessThan(6);
    expect([SHIRT, BEER]).toContain(hint.value);
  });

  test('ヒントの value は正解グリッドと一致する', () => {
    const game = makeGame();
    const hint = game.getNextHint();
    expect(hint.value).toBe(EASY_P.solution[hint.r][hint.c]);
  });

  test('ヒントのマスに正しい値を置くと次のヒントは別のマスを指す', () => {
    const game = makeGame();
    const h1 = game.getNextHint();
    // h1 のマスを正しい値に設定
    while (game.grid[h1.r][h1.c] !== h1.value) game.toggle(h1.r, h1.c);
    const h2 = game.getNextHint();
    // h2 は null か、h1 と異なるマス
    if (h2 !== null) {
      expect(`${h2.r},${h2.c}`).not.toBe(`${h1.r},${h1.c}`);
    }
  });

  test('全マスを正解で埋めると null を返す', () => {
    const game = makeGame();
    fillWithSolution(game);
    expect(game.getNextHint()).toBeNull();
  });
});

// ─── undo / canUndo ─────────────────────────────────────────

describe('undo / canUndo', () => {
  test('初期状態では canUndo=false', () => {
    expect(makeGame().canUndo()).toBe(false);
  });

  test('toggle 後に canUndo=true', () => {
    const game = makeGame();
    const [r, c] = findEmpty(game);
    game.toggle(r, c);
    expect(game.canUndo()).toBe(true);
  });

  test('undo で直前のマスが元の値に戻る', () => {
    const game = makeGame();
    const [r, c] = findEmpty(game);
    const before = game.grid[r][c]; // EMPTY
    game.toggle(r, c);              // → SHIRT
    game.undo();
    expect(game.grid[r][c]).toBe(before);
  });

  test('undo 後に canUndo=false（1手だけの場合）', () => {
    const game = makeGame();
    const [r, c] = findEmpty(game);
    game.toggle(r, c);
    game.undo();
    expect(game.canUndo()).toBe(false);
  });

  test('複数手の undo は1手ずつ戻る', () => {
    const game = makeGame();
    const empties = [];
    for (let row = 0; row < 6 && empties.length < 3; row++)
      for (let col = 0; col < 6 && empties.length < 3; col++)
        if (!game.fixed[row][col]) empties.push([row, col]);

    const snapshots = [];
    for (const [r, c] of empties) {
      snapshots.push(game.grid.map(row => [...row]));
      game.toggle(r, c);
    }

    // 逆順に undo して各スナップショットに戻るか確認
    for (let i = empties.length - 1; i >= 0; i--) {
      game.undo();
      expect(game.grid).toEqual(snapshots[i]);
    }
  });

  test('undo は fixed マスには影響しない', () => {
    const game = makeGame();
    const [r, c] = findFixed(game);
    const before = game.grid[r][c];
    game.toggle(r, c); // fixed なので無視される
    game.undo();       // undo しても何も起きない（履歴に積まれていない）
    expect(game.grid[r][c]).toBe(before);
  });

  test('undo の戻り値: 履歴あり→true, なし→false', () => {
    const game = makeGame();
    expect(game.undo()).toBe(false);
    const [r, c] = findEmpty(game);
    game.toggle(r, c);
    expect(game.undo()).toBe(true);
  });

  test('reset 後は canUndo=false', () => {
    const game = makeGame();
    const [r, c] = findEmpty(game);
    game.toggle(r, c);
    game.reset();
    expect(game.canUndo()).toBe(false);
  });

  test('reset 後に undo しても状態は変わらない', () => {
    const game = makeGame();
    const [r, c] = findEmpty(game);
    game.toggle(r, c);
    game.reset();
    game.undo();
    expect(game.grid).toEqual(EASY_P.initial.map(row => [...row]));
  });
});

// ─── buildShareText ──────────────────────────────────────────

describe('buildShareText', () => {
  test('必須要素が含まれる', () => {
    const game = makeGame();
    fillWithSolution(game);
    const text = game.buildShareText(42, 125, 0);
    expect(text).toContain('定時退社タンゴ');
    expect(text).toContain('Day 42');
    expect(text).toContain('2:05'); // 125秒 = 2:05
  });

  test('ヒント使用時はヒント情報を含む', () => {
    const game = makeGame();
    fillWithSolution(game);
    const text = game.buildShareText(1, 60, 3);
    expect(text).toContain('ヒント3回');
  });

  test('ヒント0回はヒント情報を含まない', () => {
    const game = makeGame();
    fillWithSolution(game);
    const text = game.buildShareText(1, 60, 0);
    expect(text).not.toContain('ヒント');
  });

  test('グリッド絵文字が含まれる', () => {
    const game = makeGame();
    fillWithSolution(game);
    const text = game.buildShareText(1, 30, 0);
    expect(text).toContain('👔');
    expect(text).toContain('🍺');
  });

  test('モード・難易度を指定するとDay表記に併記される', () => {
    const game = makeGame();
    fillWithSolution(game);
    const text = game.buildShareText(1, 30, 0, '👔', '🍺', '🧱 壁あり', '上級');
    expect(text).toContain('Day 1（🧱 壁あり・上級）');
  });

  test('モード・難易度を指定しない場合は併記されない', () => {
    const game = makeGame();
    fillWithSolution(game);
    const text = game.buildShareText(1, 30, 0);
    expect(text).toContain('Day 1\n');
    expect(text).not.toContain('（');
  });
});

// ─── ヘルパー関数 ────────────────────────────────────────────

function findEmpty(game) {
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 6; c++)
      if (!game.fixed[r][c]) return [r, c];
  throw new Error('空マスなし');
}

function findFixed(game) {
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 6; c++)
      if (game.fixed[r][c]) return [r, c];
  throw new Error('固定マスなし');
}

function fillWithSolution(game) {
  const sol = game.puzzle.solution;
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 6; c++)
      game.grid[r][c] = sol[r][c];
}
