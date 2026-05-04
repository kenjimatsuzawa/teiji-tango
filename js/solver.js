// 定時退社タンゴ 手筋ソルバー (ブラウザ用)
// computeSolveSteps() で解法の各ステップを記録し、ヒント機能に利用する

(function(global) {
  const SHIRT = 1, BEER = 2, EMPTY = 0;
  const opp = v => v === SHIRT ? BEER : SHIRT;
  const sym = v => v === SHIRT ? '👔' : '🍺';
  const copyGrid = g => g.map(r => [...r]);
  const isFilled = g => g.every(r => r.every(v => v !== EMPTY));

  // ① バランス完了: 行/列にすでに size/2 個の同じ記号 → 残り全て逆
  function applyBalance(grid, size, steps) {
    let used = false;
    for (let r = 0; r < size; r++) {
      for (const v of [SHIRT, BEER]) {
        if (grid[r].filter(x => x === v).length === size / 2) {
          for (let c = 0; c < size; c++) {
            if (grid[r][c] === EMPTY) {
              grid[r][c] = opp(v);
              steps.push({ r, c, value: opp(v), techId: 1, techName: '①バランス完了',
                reason: `行${r+1}にすでに${sym(v)}が${size/2}個 → 残りは全て${sym(opp(v))}` });
              used = true;
            }
          }
        }
      }
    }
    for (let c = 0; c < size; c++) {
      for (const v of [SHIRT, BEER]) {
        if (grid.filter(r => r[c] === v).length === size / 2) {
          for (let r = 0; r < size; r++) {
            if (grid[r][c] === EMPTY) {
              grid[r][c] = opp(v);
              steps.push({ r, c, value: opp(v), techId: 1, techName: '①バランス完了',
                reason: `列${c+1}にすでに${sym(v)}が${size/2}個 → 残りは全て${sym(opp(v))}` });
              used = true;
            }
          }
        }
      }
    }
    return used;
  }

  // ② ダブルブロック: 同じ記号が2連続 → 前後のセルは必ず逆
  function applyDoubleBlock(grid, size, steps) {
    let used = false;
    for (let r = 0; r < size; r++) {
      for (let i = 0; i < size - 1; i++) {
        const v = grid[r][i];
        if (v === EMPTY || grid[r][i+1] !== v) continue;
        if (i > 0 && grid[r][i-1] === EMPTY) {
          grid[r][i-1] = opp(v);
          steps.push({ r, c: i-1, value: opp(v), techId: 2, techName: '②ダブルブロック',
            reason: `行${r+1}の${i+1}・${i+2}列目に${sym(v)}が2連続 → 手前のマスは${sym(opp(v))}` });
          used = true;
        }
        if (i+2 < size && grid[r][i+2] === EMPTY) {
          grid[r][i+2] = opp(v);
          steps.push({ r, c: i+2, value: opp(v), techId: 2, techName: '②ダブルブロック',
            reason: `行${r+1}の${i+1}・${i+2}列目に${sym(v)}が2連続 → 次のマスは${sym(opp(v))}` });
          used = true;
        }
      }
    }
    for (let c = 0; c < size; c++) {
      for (let i = 0; i < size - 1; i++) {
        const v = grid[i][c];
        if (v === EMPTY || grid[i+1][c] !== v) continue;
        if (i > 0 && grid[i-1][c] === EMPTY) {
          grid[i-1][c] = opp(v);
          steps.push({ r: i-1, c, value: opp(v), techId: 2, techName: '②ダブルブロック',
            reason: `列${c+1}の${i+1}・${i+2}行目に${sym(v)}が2連続 → 手前のマスは${sym(opp(v))}` });
          used = true;
        }
        if (i+2 < size && grid[i+2][c] === EMPTY) {
          grid[i+2][c] = opp(v);
          steps.push({ r: i+2, c, value: opp(v), techId: 2, techName: '②ダブルブロック',
            reason: `列${c+1}の${i+1}・${i+2}行目に${sym(v)}が2連続 → 次のマスは${sym(opp(v))}` });
          used = true;
        }
      }
    }
    return used;
  }

  // ③ サンドイッチ: [X, _, X] → 中間は必ず逆（そのままだと3連続になるため）
  function applySandwich(grid, size, steps) {
    let used = false;
    for (let r = 0; r < size; r++) {
      for (let i = 0; i < size - 2; i++) {
        const v = grid[r][i];
        if (v === EMPTY || grid[r][i+1] !== EMPTY || grid[r][i+2] !== v) continue;
        grid[r][i+1] = opp(v);
        steps.push({ r, c: i+1, value: opp(v), techId: 3, techName: '③サンドイッチ',
          reason: `行${r+1}に${sym(v)}□${sym(v)}の挟み → 中間に${sym(v)}を入れると3連続違反` });
        used = true;
      }
    }
    for (let c = 0; c < size; c++) {
      for (let i = 0; i < size - 2; i++) {
        const v = grid[i][c];
        if (v === EMPTY || grid[i+1][c] !== EMPTY || grid[i+2][c] !== v) continue;
        grid[i+1][c] = opp(v);
        steps.push({ r: i+1, c, value: opp(v), techId: 3, techName: '③サンドイッチ',
          reason: `列${c+1}に${sym(v)}□${sym(v)}の挟み → 中間に${sym(v)}を入れると3連続違反` });
        used = true;
      }
    }
    return used;
  }

  // ④ 制約直接: = か × の片側が確定 → もう片方を強制
  function applyConstraint(grid, constraints, steps) {
    let used = false;
    for (const con of constraints) {
      const v1 = grid[con.r1][con.c1], v2 = grid[con.r2][con.c2];
      if (v1 !== EMPTY && v2 === EMPTY) {
        const nv = con.type === 'eq' ? v1 : opp(v1);
        grid[con.r2][con.c2] = nv;
        steps.push({ r: con.r2, c: con.c2, value: nv, techId: 4, techName: '④制約直接',
          reason: `(${con.r1+1}行${con.c1+1}列)が${sym(v1)} ${con.type==='eq'?'＝':'×'}制約 → このマスは${sym(nv)}` });
        used = true;
      }
      if (v2 !== EMPTY && v1 === EMPTY) {
        const nv = con.type === 'eq' ? v2 : opp(v2);
        grid[con.r1][con.c1] = nv;
        steps.push({ r: con.r1, c: con.c1, value: nv, techId: 4, techName: '④制約直接',
          reason: `(${con.r2+1}行${con.c2+1}列)が${sym(v2)} ${con.type==='eq'?'＝':'×'}制約 → このマスは${sym(nv)}` });
        used = true;
      }
    }
    return used;
  }

  // ⑤ 端点バランス（6マス専用）:
  // [X, X, _, _, _, _] → 逆端は逆X（逆だと残り3マスが全て逆X → 3連続違反）
  function applyEndpointBalance(grid, size, steps) {
    if (size !== 6) return false;
    let used = false;
    for (let r = 0; r < size; r++) {
      const row = grid[r];
      if (row[0] !== EMPTY && row[0] === row[1] && row[5] === EMPTY) {
        const v = row[0];
        row[5] = opp(v);
        steps.push({ r, c: 5, value: opp(v), techId: 5, techName: '⑤端点バランス',
          reason: `行${r+1}の先頭2マスが${sym(v)}${sym(v)} → 末端が${sym(v)}だと中間3マスが${sym(opp(v))}で3連続違反` });
        used = true;
      }
      if (row[4] !== EMPTY && row[4] === row[5] && row[0] === EMPTY) {
        const v = row[5];
        row[0] = opp(v);
        steps.push({ r, c: 0, value: opp(v), techId: 5, techName: '⑤端点バランス',
          reason: `行${r+1}の末尾2マスが${sym(v)}${sym(v)} → 先頭が${sym(v)}だと中間3マスが${sym(opp(v))}で3連続違反` });
        used = true;
      }
    }
    for (let c = 0; c < size; c++) {
      if (grid[0][c] !== EMPTY && grid[0][c] === grid[1][c] && grid[5][c] === EMPTY) {
        const v = grid[0][c];
        grid[5][c] = opp(v);
        steps.push({ r: 5, c, value: opp(v), techId: 5, techName: '⑤端点バランス',
          reason: `列${c+1}の先頭2マスが${sym(v)}${sym(v)} → 末端が${sym(v)}だと中間3マスが${sym(opp(v))}で3連続違反` });
        used = true;
      }
      if (grid[4][c] !== EMPTY && grid[4][c] === grid[5][c] && grid[0][c] === EMPTY) {
        const v = grid[5][c];
        grid[0][c] = opp(v);
        steps.push({ r: 0, c, value: opp(v), techId: 5, techName: '⑤端点バランス',
          reason: `列${c+1}の末尾2マスが${sym(v)}${sym(v)} → 先頭が${sym(v)}だと中間3マスが${sym(opp(v))}で3連続違反` });
        used = true;
      }
    }
    return used;
  }

  // 全手筋を適用してステップ列を返す
  function computeSolveSteps(initial, size, constraints) {
    const grid = copyGrid(initial);
    const steps = [];
    let changed = true;
    while (changed && !isFilled(grid)) {
      changed = false;
      if (applyBalance(grid, size, steps))          changed = true;
      if (applyDoubleBlock(grid, size, steps))       changed = true;
      if (applySandwich(grid, size, steps))          changed = true;
      if (applyConstraint(grid, constraints, steps)) changed = true;
      if (applyEndpointBalance(grid, size, steps))   changed = true;
    }
    return steps;
  }

  global.TangoSolver = { computeSolveSteps };
})(typeof window !== 'undefined' ? window : global);
