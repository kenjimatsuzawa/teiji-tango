// ゲームロジック

const EMPTY = 0;
const SHIRT = 1; // 👔
const BEER = 2;  // 🍺
const MAX_CONSECUTIVE = 2;

class TangoGame {
  constructor(puzzle) {
    this.puzzle = puzzle;
    this.size = puzzle.size;
    this.grid = puzzle.initial.map(row => [...row]);
    this.solution = puzzle.solution;
    this.constraints = puzzle.constraints;
    this.fixed = puzzle.initial.map(row => row.map(v => v !== EMPTY));
    this.solveSteps = TangoSolver.computeSolveSteps(puzzle.initial, puzzle.size, puzzle.constraints);
  }

  // 次に打つべきヒントステップを返す（ユーザーが未達成の最初のステップ）
  getNextHint() {
    for (const step of this.solveSteps) {
      if (this.grid[step.r][step.c] !== step.value) return step;
    }
    return null;
  }

  toggle(row, col) {
    if (this.fixed[row][col]) return false;
    const cur = this.grid[row][col];
    this.grid[row][col] = cur === EMPTY ? SHIRT : cur === SHIRT ? BEER : EMPTY;
    return true;
  }

  reset() {
    this.grid = this.puzzle.initial.map(row => [...row]);
  }

  isFilled() {
    return this.grid.every(row => row.every(v => v !== EMPTY));
  }

  // 同じ値が3つ以上連続していないかチェック
  checkNoTriple() {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size - 2; c++) {
        const v = this.grid[r][c];
        if (v !== EMPTY && v === this.grid[r][c+1] && v === this.grid[r][c+2]) return false;
      }
    }
    for (let c = 0; c < this.size; c++) {
      for (let r = 0; r < this.size - 2; r++) {
        const v = this.grid[r][c];
        if (v !== EMPTY && v === this.grid[r+1][c] && v === this.grid[r+2][c]) return false;
      }
    }
    return true;
  }

  // 各行・列で👔と🍺が同数かチェック
  checkBalance() {
    const half = this.size / 2;
    for (let r = 0; r < this.size; r++) {
      const shirts = this.grid[r].filter(v => v === SHIRT).length;
      const beers  = this.grid[r].filter(v => v === BEER).length;
      if (shirts !== half || beers !== half) return false;
    }
    for (let c = 0; c < this.size; c++) {
      let shirts = 0, beers = 0;
      for (let r = 0; r < this.size; r++) {
        if (this.grid[r][c] === SHIRT) shirts++;
        if (this.grid[r][c] === BEER)  beers++;
      }
      if (shirts !== half || beers !== half) return false;
    }
    return true;
  }

  // 制約（= or ×）チェック
  checkConstraints() {
    for (const c of this.constraints) {
      const v1 = this.grid[c.r1][c.c1];
      const v2 = this.grid[c.r2][c.c2];
      if (v1 === EMPTY || v2 === EMPTY) continue;
      if (c.type === 'eq'  && v1 !== v2) return false;
      if (c.type === 'neq' && v1 === v2) return false;
    }
    return true;
  }

  // リアルタイムバリデーション（エラーセルを返す）
  getErrors() {
    const errors = new Set();

    // 3連続チェック
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size - 2; c++) {
        const v = this.grid[r][c];
        if (v !== EMPTY && v === this.grid[r][c+1] && v === this.grid[r][c+2]) {
          errors.add(`${r},${c}`); errors.add(`${r},${c+1}`); errors.add(`${r},${c+2}`);
        }
      }
    }
    for (let c = 0; c < this.size; c++) {
      for (let r = 0; r < this.size - 2; r++) {
        const v = this.grid[r][c];
        if (v !== EMPTY && v === this.grid[r+1][c] && v === this.grid[r+2][c]) {
          errors.add(`${r},${c}`); errors.add(`${r+1},${c}`); errors.add(`${r+2},${c}`);
        }
      }
    }

    // 制約チェック
    for (const con of this.constraints) {
      const v1 = this.grid[con.r1][con.c1];
      const v2 = this.grid[con.r2][con.c2];
      if (v1 !== EMPTY && v2 !== EMPTY) {
        if (con.type === 'eq'  && v1 !== v2) {
          errors.add(`${con.r1},${con.c1}`); errors.add(`${con.r2},${con.c2}`);
        }
        if (con.type === 'neq' && v1 === v2) {
          errors.add(`${con.r1},${con.c1}`); errors.add(`${con.r2},${con.c2}`);
        }
      }
    }

    return errors;
  }

  isComplete() {
    return this.isFilled() && this.checkNoTriple() && this.checkBalance() && this.checkConstraints();
  }

  // シェア用テキスト生成
  buildShareText(puzzleDay, elapsedSecs, hintsUsed) {
    const lines = this.grid.map(row =>
      row.map(v => v === SHIRT ? '👔' : v === BEER ? '🍺' : '⬜').join('')
    );
    const m = Math.floor(elapsedSecs / 60);
    const s = (elapsedSecs % 60).toString().padStart(2, '0');
    const timeStr = `⏱ ${m}:${s}`;
    const hintStr = hintsUsed > 0 ? `  💡 ヒント${hintsUsed}回 (+${hintsUsed * 5}秒)` : '';
    return `定時退社タンゴ Day ${puzzleDay}\n${timeStr}${hintStr}\n\n${lines.join('\n')}\n\n#定時退社タンゴ\nhttps://teiji-tango.com`;
  }
}
