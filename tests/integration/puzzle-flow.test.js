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

// ゲームをヒント駆動で自動クリアする
function solveByHints(game) {
  let hint, count = 0;
  while ((hint = game.getNextHint()) !== null) {
    // toggle で hint.value になるまで押す
    while (game.grid[hint.r][hint.c] !== hint.value) {
      game.toggle(hint.r, hint.c);
    }
    count++;
    if (count > 50) throw new Error('無限ループ疑い');
  }
  return count;
}

// ─── 正常系: 初級パズル完全クリア ───────────────────────────

describe('初級パズル (id=4) 完全クリアフロー', () => {
  test('初期状態は isFilled=false', () => {
    const game = makeGame(EASY_P);
    expect(game.isFilled()).toBe(false);
  });

  test('isComplete は最初 false', () => {
    const game = makeGame(EASY_P);
    expect(game.isComplete()).toBe(false);
  });

  test('ヒント駆動で全マスが埋まる', () => {
    const game = makeGame(EASY_P);
    solveByHints(game);
    expect(game.isFilled()).toBe(true);
  });

  test('ヒント駆動クリア後 isComplete=true', () => {
    const game = makeGame(EASY_P);
    solveByHints(game);
    expect(game.isComplete()).toBe(true);
  });

  test('クリア後 getErrors が空', () => {
    const game = makeGame(EASY_P);
    solveByHints(game);
    expect(game.getErrors().size).toBe(0);
  });
});

// ─── 正常系: 中級・上級パズルもヒント完走 ──────────────────

describe('全難易度: ヒント駆動クリア', () => {
  // 各難易度から 5 問サンプリング
  const samples = ['初級', '中級', '上級'].flatMap(diff =>
    PUZZLES.filter(p => p.difficulty === diff).slice(0, 5)
  );

  test.each(samples.map(p => [p.id, p.difficulty, p]))(
    'id=%i (%s): ヒント駆動で isComplete=true',
    (id, diff, p) => {
      const game = new TangoGame(p);
      solveByHints(game);
      expect(game.isComplete()).toBe(true);
    }
  );
});

// ─── エラー検知フロー ────────────────────────────────────────

describe('エラー検知フロー', () => {
  test('3連続を入力するとエラーセルが出る', () => {
    const game = makeGame(EASY_P);
    // 空マスに連続して同じ記号を入れてみる
    const empties = [];
    for (let r = 0; r < 6 && empties.length < 3; r++)
      for (let c = 0; c < 6 && empties.length < 3; c++)
        if (!game.fixed[r][c]) empties.push([r, c]);

    // 同一行の最初の3空マスが存在すれば3連続を作る（あれば）
    // 代わりに解グリッドを読み込んで3連続を強制する
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) game.grid[r][c] = game.puzzle.solution[r][c];
    game.grid[0][0] = SHIRT;
    game.grid[0][1] = SHIRT;
    game.grid[0][2] = SHIRT;
    const errors = game.getErrors();
    expect(errors.size).toBeGreaterThan(0);
    expect(errors.has('0,0')).toBe(true);
  });

  test('制約違反を入力するとエラーセルが出る', () => {
    const p1 = PUZZLES.find(p => p.constraints.some(c => c.type === 'eq'));
    const game = new TangoGame(p1);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) game.grid[r][c] = p1.solution[r][c];
    // eq 制約のセルを意図的に違反させる
    const eqCon = p1.constraints.find(c => c.type === 'eq');
    game.grid[eqCon.r1][eqCon.c1] = SHIRT;
    game.grid[eqCon.r2][eqCon.c2] = BEER;
    const errors = game.getErrors();
    expect(errors.has(`${eqCon.r1},${eqCon.c1}`)).toBe(true);
    expect(errors.has(`${eqCon.r2},${eqCon.c2}`)).toBe(true);
  });

  test('間違いを入力 → reset → エラーなし', () => {
    const game = makeGame(EASY_P);
    const [r, c] = findEmpty(game);
    // 解とは逆の値を入れる
    const wrongVal = game.puzzle.solution[r][c] === SHIRT ? BEER : SHIRT;
    while (game.grid[r][c] !== wrongVal) game.toggle(r, c);
    game.reset();
    expect(game.getErrors().size).toBe(0);
  });
});

// ─── ヒントの正確性 ──────────────────────────────────────────

describe('ヒントの正確性', () => {
  test('ヒントの値は必ず正解グリッドと一致する', () => {
    for (const p of PUZZLES.slice(0, 15)) {
      const game = new TangoGame(p);
      let hint;
      let steps = 0;
      while ((hint = game.getNextHint()) !== null && steps < 40) {
        expect(hint.value).toBe(p.solution[hint.r][hint.c]);
        while (game.grid[hint.r][hint.c] !== hint.value) game.toggle(hint.r, hint.c);
        steps++;
      }
    }
  });

  test('ヒントを適用していくと常に getErrors が空', () => {
    const game = makeGame(EASY_P);
    let hint;
    while ((hint = game.getNextHint()) !== null) {
      while (game.grid[hint.r][hint.c] !== hint.value) game.toggle(hint.r, hint.c);
      expect(game.getErrors().size).toBe(0);
    }
  });

  test('techName・reason が日本語文字列', () => {
    const game = makeGame(EASY_P);
    const hint = game.getNextHint();
    expect(typeof hint.techName).toBe('string');
    expect(typeof hint.reason).toBe('string');
    expect(hint.reason.length).toBeGreaterThan(5);
  });
});

// ─── リセットフロー ──────────────────────────────────────────

describe('リセットフロー', () => {
  test('半分解いてリセット → initial に戻る', () => {
    const game = makeGame(EASY_P);
    const p = game.puzzle;
    // 半分のヒントだけ適用
    let hint, count = 0;
    while ((hint = game.getNextHint()) !== null && count < 5) {
      while (game.grid[hint.r][hint.c] !== hint.value) game.toggle(hint.r, hint.c);
      count++;
    }
    game.reset();
    for (let r = 0; r < 6; r++) {
      expect(game.grid[r]).toEqual(p.initial[r]);
    }
  });

  test('リセット後 getNextHint が最初のステップを返す', () => {
    const game = makeGame(EASY_P);
    const firstHint = game.getNextHint();
    solveByHints(game);
    game.reset();
    const afterReset = game.getNextHint();
    expect(afterReset).not.toBeNull();
    expect(afterReset.r).toBe(firstHint.r);
    expect(afterReset.c).toBe(firstHint.c);
  });
});

// ─── シェアテキスト統合 ──────────────────────────────────────

describe('シェアテキスト統合', () => {
  test('クリア後のシェアテキストに正解グリッドが含まれる', () => {
    const game = makeGame(EASY_P);
    solveByHints(game);
    const text = game.buildShareText(488, 93, 2);
    // 6行分の絵文字グリッドが含まれる
    const lines = text.split('\n').filter(l => l.includes('👔') || l.includes('🍺'));
    expect(lines).toHaveLength(6);
  });

  test('タイムフォーマット: 61秒 → 1:01', () => {
    const game = makeGame(EASY_P);
    solveByHints(game);
    const text = game.buildShareText(1, 61, 0);
    expect(text).toContain('1:01');
  });

  test('ヒント 0 回と 2 回でテキストが異なる', () => {
    const game1 = makeGame(EASY_P);
    solveByHints(game1);
    const game2 = makeGame(EASY_P);
    solveByHints(game2);
    const t0 = game1.buildShareText(1, 60, 0);
    const t2 = game2.buildShareText(1, 60, 2);
    expect(t0).not.toBe(t2);
  });
});

// ─── 150問の完全クリア検証 (全問ヒント駆動) ─────────────────

describe('全 150 問: ヒント駆動クリア検証', () => {
  test.each(PUZZLES.map(p => [p.id, p.difficulty, p]))(
    'id=%i (%s): ヒント駆動で isComplete=true になる',
    (id, diff, p) => {
      const game = new TangoGame(p);
      solveByHints(game);
      expect(game.isComplete()).toBe(true);
    }
  );
});

// ─── ベストタイム (純粋関数として抽出して検証) ───────────────

describe('ベストタイム ロジック', () => {
  // localStorage を簡易 mock
  let store;
  beforeEach(() => {
    store = {};
    global.localStorage = {
      getItem:    k      => store[k] ?? null,
      setItem:    (k, v) => { store[k] = String(v); },
      removeItem: k      => { delete store[k]; },
    };
  });

  // app.js の getBestTime / tryUpdateBestTime と同等のロジックを直接テスト
  function getBestTime(diff) {
    const v = localStorage.getItem(`bestTime_${diff}`);
    return v !== null ? parseInt(v, 10) : null;
  }
  function tryUpdateBestTime(diff, secs) {
    const cur = getBestTime(diff);
    if (cur === null || secs < cur) {
      localStorage.setItem(`bestTime_${diff}`, secs);
      return true;
    }
    return false;
  }

  test('初回はベストタイムが null', () => {
    expect(getBestTime('初級')).toBeNull();
  });

  test('初回クリアで保存され true を返す', () => {
    expect(tryUpdateBestTime('初級', 120)).toBe(true);
    expect(getBestTime('初級')).toBe(120);
  });

  test('より速いタイムで更新される', () => {
    tryUpdateBestTime('初級', 120);
    expect(tryUpdateBestTime('初級', 90)).toBe(true);
    expect(getBestTime('初級')).toBe(90);
  });

  test('遅いタイムでは更新されず false を返す', () => {
    tryUpdateBestTime('初級', 90);
    expect(tryUpdateBestTime('初級', 120)).toBe(false);
    expect(getBestTime('初級')).toBe(90);
  });

  test('同タイムでは更新されず false を返す', () => {
    tryUpdateBestTime('初級', 90);
    expect(tryUpdateBestTime('初級', 90)).toBe(false);
  });

  test('難易度ごとに独立して記録される', () => {
    tryUpdateBestTime('初級', 60);
    tryUpdateBestTime('中級', 180);
    tryUpdateBestTime('上級', 300);
    expect(getBestTime('初級')).toBe(60);
    expect(getBestTime('中級')).toBe(180);
    expect(getBestTime('上級')).toBe(300);
  });
});

// ─── ヘルパー ────────────────────────────────────────────────

function findEmpty(game) {
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 6; c++)
      if (!game.fixed[r][c]) return [r, c];
  throw new Error('空マスなし');
}
