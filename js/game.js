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
    this.walls = puzzle.walls || [];
    this.fixed = puzzle.initial.map(row => row.map(v => v !== EMPTY));
    this.solveSteps = TangoSolver.computeSolveSteps(puzzle.initial, puzzle.size, puzzle.constraints, this.walls, !!puzzle.hasRegions, !!puzzle.hasX, puzzle.cages || []);
    this.history = [];
    // O(1) wall lookup: "r1,c1:r2,c2"
    this._wallSet = new Set();
    for (const w of this.walls) {
      this._wallSet.add(`${w.r1},${w.c1}:${w.r2},${w.c2}`);
      this._wallSet.add(`${w.r2},${w.c2}:${w.r1},${w.c1}`);
    }
  }

  _hasWall(r1, c1, r2, c2) {
    return this._wallSet.has(`${r1},${c1}:${r2},${c2}`);
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
    this.history.push({ row, col, prev: cur });
    this.grid[row][col] = cur === EMPTY ? SHIRT : cur === SHIRT ? BEER : EMPTY;
    return true;
  }

  undo() {
    if (this.history.length === 0) return false;
    const { row, col, prev } = this.history.pop();
    this.grid[row][col] = prev;
    return true;
  }

  canUndo() {
    return this.history.length > 0;
  }

  reset() {
    this.grid = this.puzzle.initial.map(row => [...row]);
    this.history = [];
  }

  isFilled() {
    return this.grid.every(row => row.every(v => v !== EMPTY));
  }

  // 同じ値が3つ以上連続していないかチェック（壁をまたぐ連続は無視）
  checkNoTriple() {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size - 2; c++) {
        if (this._hasWall(r,c,r,c+1) || this._hasWall(r,c+1,r,c+2)) continue;
        const v = this.grid[r][c];
        if (v !== EMPTY && v === this.grid[r][c+1] && v === this.grid[r][c+2]) return false;
      }
    }
    for (let c = 0; c < this.size; c++) {
      for (let r = 0; r < this.size - 2; r++) {
        if (this._hasWall(r,c,r+1,c) || this._hasWall(r+1,c,r+2,c)) continue;
        const v = this.grid[r][c];
        if (v !== EMPTY && v === this.grid[r+1][c] && v === this.grid[r+2][c]) return false;
      }
    }
    return true;
  }

  // 各枠内の🍺数が指定通りかチェック
  checkKillerCages() {
    if (!this.puzzle.hasKiller) return true;
    for (const cage of this.puzzle.cages) {
      const beerCount = cage.cells.filter(({ r, c }) => this.grid[r][c] === BEER).length;
      if (beerCount !== cage.beerCount) return false;
    }
    return true;
  }

  // 主対角線・副対角線も 3vs3 かつ 3連続NGかチェック
  checkDiagonals() {
    if (!this.puzzle.hasX) return true;
    const half = this.size / 2;
    const mainDiag = Array.from({ length: this.size }, (_, k) => this.grid[k][k]);
    const antiDiag = Array.from({ length: this.size }, (_, k) => this.grid[k][this.size-1-k]);
    for (const diag of [mainDiag, antiDiag]) {
      if (diag.filter(v => v === SHIRT).length !== half) return false;
      if (diag.filter(v => v === BEER).length  !== half) return false;
      for (let i = 0; i < this.size - 2; i++) {
        const v = diag[i];
        if (v !== EMPTY && v === diag[i+1] && v === diag[i+2]) return false;
      }
    }
    return true;
  }

  // 各エリア（2×3ブロック）で👔と🍺が同数かチェック
  checkRegionBalance() {
    if (!this.puzzle.hasRegions) return true;
    const half = this.size / 2;
    for (let ri = 0; ri < this.size / 2; ri++) {
      for (let ci = 0; ci < this.size / 3; ci++) {
        let shirts = 0, beers = 0;
        for (let r = ri * 2; r < ri * 2 + 2; r++) {
          for (let c = ci * 3; c < ci * 3 + 3; c++) {
            if (this.grid[r][c] === SHIRT) shirts++;
            if (this.grid[r][c] === BEER)  beers++;
          }
        }
        if (shirts !== half || beers !== half) return false;
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

    // 3連続チェック（壁をまたぐ連続は無視）
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size - 2; c++) {
        if (this._hasWall(r,c,r,c+1) || this._hasWall(r,c+1,r,c+2)) continue;
        const v = this.grid[r][c];
        if (v !== EMPTY && v === this.grid[r][c+1] && v === this.grid[r][c+2]) {
          errors.add(`${r},${c}`); errors.add(`${r},${c+1}`); errors.add(`${r},${c+2}`);
        }
      }
    }
    for (let c = 0; c < this.size; c++) {
      for (let r = 0; r < this.size - 2; r++) {
        if (this._hasWall(r,c,r+1,c) || this._hasWall(r+1,c,r+2,c)) continue;
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

    // 枠エラー（🍺 or 👔 が上限を超えた）
    if (this.puzzle.hasKiller) {
      for (const cage of this.puzzle.cages) {
        let beerCount = 0, shirtCount = 0;
        for (const { r, c } of cage.cells) {
          if (this.grid[r][c] === BEER) beerCount++;
          else if (this.grid[r][c] === SHIRT) shirtCount++;
        }
        const maxBeer  = cage.beerCount;
        const maxShirt = cage.cells.length - cage.beerCount;
        if (beerCount > maxBeer || shirtCount > maxShirt) {
          for (const { r, c } of cage.cells) {
            if (this.grid[r][c] !== EMPTY) errors.add(`${r},${c}`);
          }
        }
      }
    }

    // 対角線エラー（3連続 または バランス超過）
    if (this.puzzle.hasX) {
      const diags = [
        Array.from({ length: this.size }, (_, k) => [k, k]),
        Array.from({ length: this.size }, (_, k) => [k, this.size-1-k]),
      ];
      for (const cells of diags) {
        // 3連続
        for (let i = 0; i < cells.length - 2; i++) {
          const [r0,c0] = cells[i], [r1,c1] = cells[i+1], [r2,c2] = cells[i+2];
          const v = this.grid[r0][c0];
          if (v !== EMPTY && v === this.grid[r1][c1] && v === this.grid[r2][c2]) {
            errors.add(`${r0},${c0}`); errors.add(`${r1},${c1}`); errors.add(`${r2},${c2}`);
          }
        }
        // バランス超過（4個以上）
        for (const v of [SHIRT, BEER]) {
          const over = cells.filter(([r,c]) => this.grid[r][c] === v);
          if (over.length > this.size / 2) over.forEach(([r,c]) => errors.add(`${r},${c}`));
        }
      }
    }

    // エリアバランスエラー（4個以上は超過）
    if (this.puzzle.hasRegions) {
      for (let ri = 0; ri < this.size / 2; ri++) {
        for (let ci = 0; ci < this.size / 3; ci++) {
          for (const v of [SHIRT, BEER]) {
            const cells = [];
            for (let r = ri * 2; r < ri * 2 + 2; r++) {
              for (let c = ci * 3; c < ci * 3 + 3; c++) {
                if (this.grid[r][c] === v) cells.push(`${r},${c}`);
              }
            }
            if (cells.length > this.size / 2) cells.forEach(k => errors.add(k));
          }
        }
      }
    }

    return errors;
  }

  isComplete() {
    return this.isFilled() && this.checkNoTriple() && this.checkBalance() && this.checkConstraints() && this.checkRegionBalance() && this.checkDiagonals() && this.checkKillerCages();
  }

  // シェア用テキスト生成
  buildShareText(puzzleDay, elapsedSecs, hintsUsed, sym1 = '👔', sym2 = '🍺', modeLabel = '', difficulty = '') {
    const lines = this.grid.map(row =>
      row.map(v => v === SHIRT ? sym1 : v === BEER ? sym2 : '⬜').join('')
    );
    const m = Math.floor(elapsedSecs / 60);
    const s = (elapsedSecs % 60).toString().padStart(2, '0');
    const timeStr = `⏱ ${m}:${s}`;
    const hintStr = hintsUsed > 0 ? `  💡 ヒント${hintsUsed}回 (+${hintsUsed * 5}秒)` : '  ✨ ヒントなし';
    const modeStr = (modeLabel || difficulty) ? `（${[modeLabel, difficulty].filter(Boolean).join('・')}）` : '';
    return `定時退社！🏃💨\n定時退社タンゴ Day ${puzzleDay}${modeStr}\n${timeStr}${hintStr}\n\n${lines.join('\n')}\n\n#定時退社タンゴ https://teiji-tango.com`;
  }
}
