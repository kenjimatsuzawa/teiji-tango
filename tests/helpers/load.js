'use strict';
// ブラウザ向けスクリプトを Node.js テスト環境に読み込むヘルパー
// new Function を使い、各ファイルのグローバル宣言をスコープ内に収める

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

function src(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

// puzzles.js: PUZZLES, DIFFICULTIES, getDayIndex 等を返す
function loadPuzzles() {
  // eslint-disable-next-line no-new-func
  return new Function(`
    ${src('js/puzzles.js')}
    return { PUZZLES, DIFFICULTIES, getDayIndex, getPuzzleByDifficulty, getPuzzleForToday, getPuzzleById };
  `)();
}

// solver.js: TangoSolver を返す
function loadSolver() {
  // eslint-disable-next-line no-new-func
  return new Function(`
    const global = {};
    const window = undefined;
    ${src('js/solver.js')}
    return global.TangoSolver;
  `)();
}

// game.js: TangoGame クラスを返す（TangoSolver を注入）
function loadGame(TangoSolver) {
  // eslint-disable-next-line no-new-func
  return new Function('TangoSolver', `
    ${src('js/game.js')}
    return TangoGame;
  `)(TangoSolver);
}

module.exports = { loadPuzzles, loadSolver, loadGame };
