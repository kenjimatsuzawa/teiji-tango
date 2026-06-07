'use strict';

// app.js はブラウザグローバル前提のスクリプト。
// new Function で実行し、localStorage・document・Date.now をスタブに差し替えて
// 純粋ロジック関数だけを取り出してテストする。

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
function src(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

// ── インメモリ localStorage スタブ ──────────────────────────────
function makeLocalStorage() {
  const store = new Map();
  return {
    getItem:    (k)    => store.has(k) ? store.get(k) : null,
    setItem:    (k, v) => store.set(k, String(v)),
    removeItem: (k)    => store.delete(k),
    clear:      ()     => store.clear(),
    _store:     store,   // テストから直接参照できるように
  };
}

// ── 最小限の document スタブ（ロード時呼び出しを安全に受け流す） ──
function makeDocument() {
  const noop = () => {};
  const fakeEl = {
    textContent: '',
    innerHTML: '',
    style: {},
    className: '',
    dataset: {},
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    getAttribute: () => null,
    setAttribute: noop,
    addEventListener: noop,
    querySelectorAll: () => [],
    querySelector: () => null,
    appendChild: noop,
  };
  return {
    getElementById:    () => ({ ...fakeEl, classList: { add: noop, remove: noop, toggle: noop } }),
    querySelectorAll:  () => [],
    querySelector:     () => null,
    addEventListener:  noop,  // DOMContentLoaded を受け流す
    createElementNS:   () => ({ ...fakeEl, setAttribute: noop, appendChild: noop }),
    createElement:     () => ({ ...fakeEl }),
  };
}

// ── app.js をロードして純粋ロジック関数を取り出すファクトリ ──────
// nowMs: Date.now() の返り値を固定したいときに渡す
function loadApp({ nowMs = Date.now(), ls = makeLocalStorage() } = {}) {
  const document = makeDocument();

  // app.js が参照するブラウザグローバルを全てスタブ化して渡す
  // getDayIndex は puzzles.js で定義されているため同梱する
  // eslint-disable-next-line no-new-func
  return new Function(
    'localStorage', 'document', 'Date', 'window', 'setInterval', 'clearInterval', 'setTimeout',
    'requestAnimationFrame', 'navigator',
    `
${src('js/puzzles.js')}
${src('js/wall-puzzles.js')}
${src('js/region-puzzles.js')}
${src('js/x-puzzles.js')}
${src('js/killer-puzzles.js')}

// solver / game は app.js 内で使われないが、TangoGame が参照されるのでスタブを置く
function TangoSolver() {}
TangoSolver.prototype.solve = function() { return []; };

function TangoGame(puzzle) {
  this.puzzle    = puzzle || { initial: [[0]], constraints: [], walls: [], cages: [] };
  this.size      = (puzzle && puzzle.size) || 6;
  this.grid      = [[0]];
  this.fixed     = [[false]];
  this.history   = [];
  this.constraints = [];
  this.walls     = [];
  this.isFilled  = function() { return false; };
  this.isComplete= function() { return false; };
  this.canUndo   = function() { return false; };
}

// app.js 本体
${src('js/app.js')}

return {
  // フィーチャーフラグ
  LAUNCH_DATE, MODE_UNLOCK_DAYS, isModeUnlocked,
  // モードラベル
  MODE_LABELS, getModeLabel,
  // localStorage ヘルパー
  getTodayKey, markCompleted, isCompletedToday,
  getBestTime, tryUpdateBestTime,
  // タイマー
  formatTime,
  // 日付
  getDayNumber,
  // ストリーク
  saveStreak,
  // 実績
  getEarnedIds, earnAchievement, checkAndEarnAchievements,
  DIFFICULTIES,
};
`,
  )(
    ls,
    document,
    // Date をモック：Date.now だけ差し替え、コンストラクタは本物を使う
    Object.assign(
      function MockDate(...args) {
        if (args.length === 0) return new (Function.prototype.bind.apply(Date, [null, nowMs]))();
        return new (Function.prototype.bind.apply(Date, [null, ...args]))();
      },
      {
        now:   () => nowMs,
        parse: (...a) => Date.parse(...a),
        UTC:   (...a) => Date.UTC(...a),
      },
    ),
    { open: () => {} },   // window
    () => null,           // setInterval
    () => {},             // clearInterval
    (fn) => {},           // setTimeout（実行しない）
    (fn) => {},           // requestAnimationFrame
    { clipboard: { writeText: () => Promise.resolve() }, share: undefined }, // navigator
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 1. フィーチャーフラグ
// ────────────────────────────────────────────────────────────────────────────

describe('isModeUnlocked', () => {
  // LAUNCH_DATE は '2026-06-20'
  // region: +14日 = 2026-07-04, x: +28日 = 2026-07-18, killer: +42日 = 2026-08-01

  // 解禁日マップに存在しないモード（normal / wall）は常に解禁
  test('normal は常に解禁される', () => {
    const { isModeUnlocked } = loadApp({ nowMs: 0 }); // 1970年
    expect(isModeUnlocked('normal')).toBe(true);
  });

  test('wall は常に解禁される', () => {
    const { isModeUnlocked } = loadApp({ nowMs: 0 });
    expect(isModeUnlocked('wall')).toBe(true);
  });

  test('region は解禁日前はロックされている', () => {
    // 2026-06-20 + 14日 = 2026-07-04 00:00 UTC
    const unlockTime = new Date('2026-06-20').getTime() + 14 * 24 * 60 * 60 * 1000;
    const { isModeUnlocked } = loadApp({ nowMs: unlockTime - 1 }); // 1ms 前
    expect(isModeUnlocked('region')).toBe(false);
  });

  test('region は解禁日ちょうどで解禁される', () => {
    const unlockTime = new Date('2026-06-20').getTime() + 14 * 24 * 60 * 60 * 1000;
    const { isModeUnlocked } = loadApp({ nowMs: unlockTime });
    expect(isModeUnlocked('region')).toBe(true);
  });

  test('x は解禁日前はロックされている', () => {
    const unlockTime = new Date('2026-06-20').getTime() + 28 * 24 * 60 * 60 * 1000;
    const { isModeUnlocked } = loadApp({ nowMs: unlockTime - 1 });
    expect(isModeUnlocked('x')).toBe(false);
  });

  test('x は解禁日以降は解禁される', () => {
    const unlockTime = new Date('2026-06-20').getTime() + 28 * 24 * 60 * 60 * 1000;
    const { isModeUnlocked } = loadApp({ nowMs: unlockTime + 1000 });
    expect(isModeUnlocked('x')).toBe(true);
  });

  test('killer は解禁日前はロックされている', () => {
    const unlockTime = new Date('2026-06-20').getTime() + 42 * 24 * 60 * 60 * 1000;
    const { isModeUnlocked } = loadApp({ nowMs: unlockTime - 1 });
    expect(isModeUnlocked('killer')).toBe(false);
  });

  test('killer は解禁日以降は解禁される', () => {
    const unlockTime = new Date('2026-06-20').getTime() + 42 * 24 * 60 * 60 * 1000;
    const { isModeUnlocked } = loadApp({ nowMs: unlockTime });
    expect(isModeUnlocked('killer')).toBe(true);
  });

  test('MODE_UNLOCK_DAYS に存在しない任意モードは常に解禁', () => {
    const { isModeUnlocked } = loadApp({ nowMs: 0 });
    expect(isModeUnlocked('nonexistent_mode')).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. モードラベル
// ────────────────────────────────────────────────────────────────────────────

describe('getModeLabel', () => {
  let fns;
  beforeAll(() => { fns = loadApp(); });

  test('normal は「通常」を返す', () => {
    expect(fns.getModeLabel('normal')).toBe('通常');
  });

  test('wall は「🧱 壁あり」を返す', () => {
    expect(fns.getModeLabel('wall')).toBe('🧱 壁あり');
  });

  test('region は「🗂️ エリア」を返す', () => {
    expect(fns.getModeLabel('region')).toBe('🗂️ エリア');
  });

  test('x は「Xタンゴ」を返す（重複グリフなし）', () => {
    // バグ修正確認: '✕ Xタンゴ' ではなく 'Xタンゴ' であること
    const label = fns.getModeLabel('x');
    expect(label).toBe('Xタンゴ');
    expect(label).not.toContain('✕');
  });

  test('killer は「🔪 キラータンゴ」を返す', () => {
    expect(fns.getModeLabel('killer')).toBe('🔪 キラータンゴ');
  });

  test('未知のモードはモード文字列をそのまま返す', () => {
    expect(fns.getModeLabel('unknown')).toBe('unknown');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. localStorage ネームスペーシング
// ────────────────────────────────────────────────────────────────────────────

describe('getTodayKey', () => {
  let fns;
  beforeAll(() => { fns = loadApp(); });

  test('mode と diff の両方がキーに含まれる', () => {
    const key = fns.getTodayKey('normal', '初級');
    expect(key).toContain('normal');
    expect(key).toContain('初級');
  });

  test('mode が異なればキーが異なる', () => {
    expect(fns.getTodayKey('normal', '初級')).not.toBe(fns.getTodayKey('wall', '初級'));
  });

  test('diff が異なればキーが異なる', () => {
    expect(fns.getTodayKey('normal', '初級')).not.toBe(fns.getTodayKey('normal', '中級'));
  });

  test('キーのフォーマットは done_{mode}_{diff}_{日付} 形式', () => {
    const key = fns.getTodayKey('x', '上級');
    const today = new Date().toDateString();
    expect(key).toBe(`done_x_上級_${today}`);
  });
});

describe('markCompleted / isCompletedToday', () => {
  test('markCompleted 後に isCompletedToday が true を返す', () => {
    const ls = makeLocalStorage();
    const { markCompleted, isCompletedToday } = loadApp({ ls });
    markCompleted('normal', '初級');
    expect(isCompletedToday('normal', '初級')).toBe(true);
  });

  test('完了していないモード/難易度は false を返す', () => {
    const ls = makeLocalStorage();
    const { markCompleted, isCompletedToday } = loadApp({ ls });
    markCompleted('normal', '初級');
    expect(isCompletedToday('normal', '中級')).toBe(false);
    expect(isCompletedToday('wall',   '初級')).toBe(false);
  });

  test('あるモードの完了が別モードに汚染しない（クロスモード汚染なし）', () => {
    const ls = makeLocalStorage();
    const { markCompleted, isCompletedToday } = loadApp({ ls });
    markCompleted('normal', '初級');
    markCompleted('normal', '中級');
    markCompleted('normal', '上級');
    // 別モードは未完了のまま
    expect(isCompletedToday('wall',   '初級')).toBe(false);
    expect(isCompletedToday('wall',   '中級')).toBe(false);
    expect(isCompletedToday('region', '初級')).toBe(false);
    expect(isCompletedToday('x',      '初級')).toBe(false);
    expect(isCompletedToday('killer', '初級')).toBe(false);
  });

  test('あるモードの完了が別難易度に汚染しない', () => {
    const ls = makeLocalStorage();
    const { markCompleted, isCompletedToday } = loadApp({ ls });
    markCompleted('normal', '初級');
    expect(isCompletedToday('normal', '中級')).toBe(false);
    expect(isCompletedToday('normal', '上級')).toBe(false);
  });

  test('localStorage のキーに mode と diff が両方含まれている', () => {
    const ls = makeLocalStorage();
    const { markCompleted } = loadApp({ ls });
    markCompleted('wall', '上級');
    const keys = [...ls._store.keys()];
    const matchingKey = keys.find(k => k.includes('wall') && k.includes('上級'));
    expect(matchingKey).toBeDefined();
  });
});

describe('getBestTime / tryUpdateBestTime', () => {
  test('未記録時は null を返す', () => {
    const ls = makeLocalStorage();
    const { getBestTime } = loadApp({ ls });
    expect(getBestTime('normal', '初級')).toBeNull();
  });

  test('tryUpdateBestTime で初回は保存されて true を返す', () => {
    const ls = makeLocalStorage();
    const { tryUpdateBestTime, getBestTime } = loadApp({ ls });
    const updated = tryUpdateBestTime('normal', '初級', 120);
    expect(updated).toBe(true);
    expect(getBestTime('normal', '初級')).toBe(120);
  });

  test('より速いタイムで更新でき true を返す', () => {
    const ls = makeLocalStorage();
    const { tryUpdateBestTime, getBestTime } = loadApp({ ls });
    tryUpdateBestTime('normal', '初級', 120);
    const updated = tryUpdateBestTime('normal', '初級', 90);
    expect(updated).toBe(true);
    expect(getBestTime('normal', '初級')).toBe(90);
  });

  test('遅いタイムでは更新されず false を返す', () => {
    const ls = makeLocalStorage();
    const { tryUpdateBestTime, getBestTime } = loadApp({ ls });
    tryUpdateBestTime('normal', '初級', 120);
    const updated = tryUpdateBestTime('normal', '初級', 150);
    expect(updated).toBe(false);
    expect(getBestTime('normal', '初級')).toBe(120); // 変わっていない
  });

  test('mode ごとにベストタイムが独立している（クロスモード汚染なし）', () => {
    const ls = makeLocalStorage();
    const { tryUpdateBestTime, getBestTime } = loadApp({ ls });
    tryUpdateBestTime('normal', '初級', 100);
    expect(getBestTime('wall',   '初級')).toBeNull();
    expect(getBestTime('normal', '中級')).toBeNull();
    expect(getBestTime('x',      '初級')).toBeNull();
  });

  test('diff ごとにベストタイムが独立している', () => {
    const ls = makeLocalStorage();
    const { tryUpdateBestTime, getBestTime } = loadApp({ ls });
    tryUpdateBestTime('normal', '初級', 60);
    tryUpdateBestTime('normal', '中級', 180);
    expect(getBestTime('normal', '初級')).toBe(60);
    expect(getBestTime('normal', '中級')).toBe(180);
    expect(getBestTime('normal', '上級')).toBeNull();
  });

  test('localStorage キーに mode と diff が両方含まれる', () => {
    const ls = makeLocalStorage();
    const { tryUpdateBestTime } = loadApp({ ls });
    tryUpdateBestTime('killer', '上級', 300);
    const keys = [...ls._store.keys()];
    const key = keys.find(k => k.includes('killer') && k.includes('上級'));
    expect(key).toBeDefined();
    expect(key).toMatch(/^bestTime_killer_上級$/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. formatTime（タイマー表示）
// ────────────────────────────────────────────────────────────────────────────

describe('formatTime', () => {
  let fns;
  beforeAll(() => { fns = loadApp(); });

  test('0秒は「0:00」', () => {
    expect(fns.formatTime(0)).toBe('0:00');
  });

  test('59秒は「0:59」', () => {
    expect(fns.formatTime(59)).toBe('0:59');
  });

  test('60秒は「1:00」', () => {
    expect(fns.formatTime(60)).toBe('1:00');
  });

  test('125秒は「2:05」', () => {
    expect(fns.formatTime(125)).toBe('2:05');
  });

  test('3600秒は「60:00」', () => {
    expect(fns.formatTime(3600)).toBe('60:00');
  });

  test('秒部分は常に2桁ゼロパディング', () => {
    expect(fns.formatTime(61)).toBe('1:01');
    expect(fns.formatTime(609)).toBe('10:09');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 5. getDayNumber（JST 16:00 = UTC 7:00 リセット）
// ────────────────────────────────────────────────────────────────────────────

describe('getDayNumber / JST 日付ロールオーバー', () => {
  // 基準: 2026-06-07 UTC、UTC 7:00 に切り替わる

  test('2026-06-07 07:00 UTC ちょうどは Day 1', () => {
    const t = new Date('2026-06-07T07:00:00Z').getTime();
    const { getDayNumber } = loadApp({ nowMs: t });
    expect(getDayNumber()).toBe(1);
  });

  test('2026-06-07 06:59 UTC はまだ Day 0（前日扱い）', () => {
    // UTC 6:59 はまだ JST 15:59 → 前日のパズル
    const t = new Date('2026-06-07T06:59:59Z').getTime();
    const { getDayNumber } = loadApp({ nowMs: t });
    expect(getDayNumber()).toBe(0);
  });

  test('2026-06-08 07:00 UTC は Day 2', () => {
    const t = new Date('2026-06-08T07:00:00Z').getTime();
    const { getDayNumber } = loadApp({ nowMs: t });
    expect(getDayNumber()).toBe(2);
  });

  test('UTC 7:00 直前と直後で日数が1変わる', () => {
    const before = new Date('2025-06-01T06:59:59Z').getTime();
    const after  = new Date('2025-06-01T07:00:00Z').getTime();
    const { getDayNumber: dayBefore } = loadApp({ nowMs: before });
    const { getDayNumber: dayAfter  } = loadApp({ nowMs: after  });
    expect(dayAfter()).toBe(dayBefore() + 1);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 6. ストリーク保存
// ────────────────────────────────────────────────────────────────────────────

describe('saveStreak', () => {
  test('初回プレイでストリーク=1になる', () => {
    const ls = makeLocalStorage();
    const { saveStreak } = loadApp({ ls });
    saveStreak();
    expect(ls.getItem('streak')).toBe('1');
  });

  test('同日に2回呼んでもストリークは増えない', () => {
    const ls = makeLocalStorage();
    const { saveStreak } = loadApp({ ls });
    saveStreak();
    saveStreak();
    expect(ls.getItem('streak')).toBe('1');
  });

  test('前日プレイ済みなら連続+1になる', () => {
    const ls = makeLocalStorage();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    ls.setItem('lastPlayed', yesterday.toDateString());
    ls.setItem('streak', '3');
    const { saveStreak } = loadApp({ ls });
    saveStreak();
    expect(ls.getItem('streak')).toBe('4');
  });

  test('2日以上空いた場合はストリーク=1にリセット', () => {
    const ls = makeLocalStorage();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    ls.setItem('lastPlayed', twoDaysAgo.toDateString());
    ls.setItem('streak', '5');
    const { saveStreak } = loadApp({ ls });
    saveStreak();
    expect(ls.getItem('streak')).toBe('1');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 7. 実績
// ────────────────────────────────────────────────────────────────────────────

describe('earnAchievement / getEarnedIds', () => {
  test('初回は true を返して保存される', () => {
    const ls = makeLocalStorage();
    const { earnAchievement, getEarnedIds } = loadApp({ ls });
    expect(earnAchievement('first_clear')).toBe(true);
    expect(getEarnedIds().has('first_clear')).toBe(true);
  });

  test('同じ実績を2回 earn しても2回目は false', () => {
    const ls = makeLocalStorage();
    const { earnAchievement } = loadApp({ ls });
    earnAchievement('first_clear');
    expect(earnAchievement('first_clear')).toBe(false);
  });

  test('異なる実績は独立して管理される', () => {
    const ls = makeLocalStorage();
    const { earnAchievement, getEarnedIds } = loadApp({ ls });
    earnAchievement('first_clear');
    earnAchievement('no_hint');
    const ids = getEarnedIds();
    expect(ids.has('first_clear')).toBe(true);
    expect(ids.has('no_hint')).toBe(true);
    expect(ids.has('speed_easy')).toBe(false);
  });
});

describe('checkAndEarnAchievements', () => {
  test('初回クリアで first_clear 実績が解除される', () => {
    const ls = makeLocalStorage();
    const { checkAndEarnAchievements } = loadApp({ ls });
    const newAchs = checkAndEarnAchievements('初級', 90, 0);
    const ids = newAchs.map(a => a.id);
    expect(ids).toContain('first_clear');
  });

  test('ヒントなしクリアで no_hint 実績が解除される', () => {
    const ls = makeLocalStorage();
    const { checkAndEarnAchievements } = loadApp({ ls });
    const newAchs = checkAndEarnAchievements('初級', 90, 0);
    expect(newAchs.map(a => a.id)).toContain('no_hint');
  });

  test('ヒントありクリアで no_hint は解除されない', () => {
    const ls = makeLocalStorage();
    const { checkAndEarnAchievements } = loadApp({ ls });
    const newAchs = checkAndEarnAchievements('初級', 90, 1);
    expect(newAchs.map(a => a.id)).not.toContain('no_hint');
  });

  test('初級2分以内で speed_easy が解除される', () => {
    const ls = makeLocalStorage();
    const { checkAndEarnAchievements } = loadApp({ ls });
    const newAchs = checkAndEarnAchievements('初級', 119, 0);
    expect(newAchs.map(a => a.id)).toContain('speed_easy');
  });

  test('初級2分超えでは speed_easy は解除されない', () => {
    const ls = makeLocalStorage();
    const { checkAndEarnAchievements } = loadApp({ ls });
    const newAchs = checkAndEarnAchievements('初級', 121, 0);
    expect(newAchs.map(a => a.id)).not.toContain('speed_easy');
  });

  test('中級クリアで clear_mid 実績が解除される', () => {
    const ls = makeLocalStorage();
    const { checkAndEarnAchievements } = loadApp({ ls });
    const newAchs = checkAndEarnAchievements('中級', 300, 0);
    expect(newAchs.map(a => a.id)).toContain('clear_mid');
  });

  test('上級クリアで clear_hard 実績が解除される', () => {
    const ls = makeLocalStorage();
    const { checkAndEarnAchievements } = loadApp({ ls });
    const newAchs = checkAndEarnAchievements('上級', 600, 0);
    expect(newAchs.map(a => a.id)).toContain('clear_hard');
  });

  test('streak >= 3 で streak_3 実績が解除される', () => {
    const ls = makeLocalStorage();
    ls.setItem('streak', '3');
    const { checkAndEarnAchievements } = loadApp({ ls });
    const newAchs = checkAndEarnAchievements('初級', 200, 0);
    expect(newAchs.map(a => a.id)).toContain('streak_3');
  });

  test('streak >= 7 で streak_7 実績が解除される', () => {
    const ls = makeLocalStorage();
    ls.setItem('streak', '7');
    const { checkAndEarnAchievements } = loadApp({ ls });
    const newAchs = checkAndEarnAchievements('初級', 200, 0);
    expect(newAchs.map(a => a.id)).toContain('streak_7');
  });

  test('既に獲得済みの実績は再度解除されない', () => {
    const ls = makeLocalStorage();
    const { checkAndEarnAchievements } = loadApp({ ls });
    const first  = checkAndEarnAchievements('初級', 60, 0);
    const second = checkAndEarnAchievements('初級', 60, 0);
    // 2回目は新規解除がない
    expect(second.filter(a => a.id === 'first_clear')).toHaveLength(0);
  });
});
