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

  // ② ダブルブロック: 同じ記号が2連続 → 前後のセルは必ず逆（壁をまたぐ場合は不適用）
  function applyDoubleBlock(grid, size, steps, hw, vw) {
    let used = false;
    for (let r = 0; r < size; r++) {
      for (let i = 0; i < size - 1; i++) {
        if (hw(r, i)) continue; // ペア間に壁
        const v = grid[r][i];
        if (v === EMPTY || grid[r][i+1] !== v) continue;
        if (i > 0 && !hw(r, i-1) && grid[r][i-1] === EMPTY) {
          grid[r][i-1] = opp(v);
          steps.push({ r, c: i-1, value: opp(v), techId: 2, techName: '②ダブルブロック',
            reason: `行${r+1}の${i+1}・${i+2}列目に${sym(v)}が2連続 → 手前のマスは${sym(opp(v))}` });
          used = true;
        }
        if (i+2 < size && !hw(r, i+1) && grid[r][i+2] === EMPTY) {
          grid[r][i+2] = opp(v);
          steps.push({ r, c: i+2, value: opp(v), techId: 2, techName: '②ダブルブロック',
            reason: `行${r+1}の${i+1}・${i+2}列目に${sym(v)}が2連続 → 次のマスは${sym(opp(v))}` });
          used = true;
        }
      }
    }
    for (let c = 0; c < size; c++) {
      for (let i = 0; i < size - 1; i++) {
        if (vw(i, c)) continue; // ペア間に壁
        const v = grid[i][c];
        if (v === EMPTY || grid[i+1][c] !== v) continue;
        if (i > 0 && !vw(i-1, c) && grid[i-1][c] === EMPTY) {
          grid[i-1][c] = opp(v);
          steps.push({ r: i-1, c, value: opp(v), techId: 2, techName: '②ダブルブロック',
            reason: `列${c+1}の${i+1}・${i+2}行目に${sym(v)}が2連続 → 手前のマスは${sym(opp(v))}` });
          used = true;
        }
        if (i+2 < size && !vw(i+1, c) && grid[i+2][c] === EMPTY) {
          grid[i+2][c] = opp(v);
          steps.push({ r: i+2, c, value: opp(v), techId: 2, techName: '②ダブルブロック',
            reason: `列${c+1}の${i+1}・${i+2}行目に${sym(v)}が2連続 → 次のマスは${sym(opp(v))}` });
          used = true;
        }
      }
    }
    return used;
  }

  // ③ サンドイッチ: [X, _, X] → 中間は必ず逆（壁をまたぐ場合は不適用）
  function applySandwich(grid, size, steps, hw, vw) {
    let used = false;
    for (let r = 0; r < size; r++) {
      for (let i = 0; i < size - 2; i++) {
        if (hw(r, i) || hw(r, i+1)) continue; // サンドイッチ内に壁
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
        if (vw(i, c) || vw(i+1, c)) continue; // サンドイッチ内に壁
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

  // ⑤ 端点バランス（6マス専用・壁なし限定）:
  // [X, X, _, _, _, _] → 逆端は逆X（逆だと残り3マスが全て逆X → 3連続違反）
  function applyEndpointBalance(grid, size, steps, hasWalls) {
    if (size !== 6 || hasWalls) return false;
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

  // ⑥ エリアバランス: 2×3エリア内の一方が3個揃ったら残りを逆に
  function applyRegionBalance(grid, size, steps) {
    let used = false;
    for (let ri = 0; ri < size / 2; ri++) {
      for (let ci = 0; ci < size / 3; ci++) {
        for (const v of [SHIRT, BEER]) {
          let count = 0;
          const emptyCells = [];
          for (let r = ri * 2; r < ri * 2 + 2; r++) {
            for (let c = ci * 3; c < ci * 3 + 3; c++) {
              if (grid[r][c] === v) count++;
              if (grid[r][c] === EMPTY) emptyCells.push([r, c]);
            }
          }
          if (count === size / 2) {
            for (const [r, c] of emptyCells) {
              grid[r][c] = opp(v);
              steps.push({ r, c, value: opp(v), techId: 6, techName: '⑥エリアバランス',
                reason: `エリア${ri * 2 + ci + 1}に${sym(v)}が${size/2}個 → 残りは全て${sym(opp(v))}` });
              used = true;
            }
          }
        }
      }
    }
    return used;
  }

  // ⑨ 枠バランス: 枠内の🍺(or👔)が上限に達したら残りを逆に
  function applyKillerCage(grid, cages, steps) {
    let used = false;
    for (const cage of cages) {
      let beerCount = 0, shirtCount = 0;
      const emptyCells = [];
      for (const { r, c } of cage.cells) {
        if (grid[r][c] === BEER) beerCount++;
        else if (grid[r][c] === SHIRT) shirtCount++;
        else emptyCells.push([r, c]);
      }
      if (emptyCells.length === 0) continue;
      const beerNeeded  = cage.beerCount - beerCount;
      const shirtNeeded = (cage.cells.length - cage.beerCount) - shirtCount;
      if (beerNeeded < 0 || shirtNeeded < 0) continue;
      if (beerNeeded === 0) {
        for (const [r, c] of emptyCells) {
          grid[r][c] = SHIRT;
          steps.push({ r, c, value: SHIRT, techId: 9, techName: '⑨枠バランス',
            reason: `枠内の${sym(BEER)}が${cage.beerCount}個揃った → 残りは全て${sym(SHIRT)}` });
          used = true;
        }
      } else if (shirtNeeded === 0) {
        for (const [r, c] of emptyCells) {
          grid[r][c] = BEER;
          steps.push({ r, c, value: BEER, techId: 9, techName: '⑨枠バランス',
            reason: `枠内の${sym(SHIRT)}が${cage.cells.length - cage.beerCount}個揃った → 残りは全て${sym(BEER)}` });
          used = true;
        }
      }
    }
    return used;
  }

  // ⑦ 対角線バランス: 主/副対角線にsize/2個揃ったら残りを逆に
  function applyDiagBalance(grid, size, steps) {
    let used = false;
    const lines = [
      { cells: Array.from({ length: size }, (_, k) => [k, k]),           name: '主対角線' },
      { cells: Array.from({ length: size }, (_, k) => [k, size-1-k]),    name: '副対角線' },
    ];
    for (const { cells, name } of lines) {
      for (const v of [SHIRT, BEER]) {
        const cnt = cells.filter(([r,c]) => grid[r][c] === v).length;
        if (cnt === size / 2) {
          for (const [r,c] of cells) {
            if (grid[r][c] === EMPTY) {
              grid[r][c] = opp(v);
              steps.push({ r, c, value: opp(v), techId: 7, techName: '⑦対角バランス',
                reason: `${name}に${sym(v)}が${size/2}個 → このマスは${sym(opp(v))}` });
              used = true;
            }
          }
        }
      }
    }
    return used;
  }

  // ⑧ 対角線ダブルブロック/サンドイッチ
  function applyDiagBlock(grid, size, steps) {
    let used = false;
    const lines = [
      { cells: Array.from({ length: size }, (_, k) => [k, k]),           name: '主対角線' },
      { cells: Array.from({ length: size }, (_, k) => [k, size-1-k]),    name: '副対角線' },
    ];
    for (const { cells, name } of lines) {
      // ダブルブロック
      for (let i = 0; i < cells.length - 1; i++) {
        const [r1,c1] = cells[i], [r2,c2] = cells[i+1];
        const v = grid[r1][c1];
        if (v === EMPTY || grid[r2][c2] !== v) continue;
        if (i > 0) {
          const [rp,cp] = cells[i-1];
          if (grid[rp][cp] === EMPTY) {
            grid[rp][cp] = opp(v);
            steps.push({ r: rp, c: cp, value: opp(v), techId: 8, techName: '⑧対角ブロック',
              reason: `${name}に${sym(v)}が2連続 → 手前は${sym(opp(v))}` });
            used = true;
          }
        }
        if (i+2 < cells.length) {
          const [rn,cn] = cells[i+2];
          if (grid[rn][cn] === EMPTY) {
            grid[rn][cn] = opp(v);
            steps.push({ r: rn, c: cn, value: opp(v), techId: 8, techName: '⑧対角ブロック',
              reason: `${name}に${sym(v)}が2連続 → 次は${sym(opp(v))}` });
            used = true;
          }
        }
      }
      // サンドイッチ
      for (let i = 0; i < cells.length - 2; i++) {
        const [r1,c1] = cells[i], [r2,c2] = cells[i+1], [r3,c3] = cells[i+2];
        const v = grid[r1][c1];
        if (v === EMPTY || grid[r2][c2] !== EMPTY || grid[r3][c3] !== v) continue;
        grid[r2][c2] = opp(v);
        steps.push({ r: r2, c: c2, value: opp(v), techId: 8, techName: '⑧対角サンドイッチ',
          reason: `${name}に${sym(v)}□${sym(v)}の挟み → 中間は${sym(opp(v))}` });
        used = true;
      }
    }
    return used;
  }

  // 全手筋を適用してステップ列を返す
  function computeSolveSteps(initial, size, constraints, walls = [], hasRegions = false, hasX = false, cages = []) {
    // 壁ルックアップ: hw(r,c) = 行r の列c と列c+1 の間に壁あり
    //                vw(r,c) = 列c の行r と行r+1 の間に壁あり
    const hw = (r, c) => walls.some(w => w.r1 === r && w.r2 === r && Math.min(w.c1,w.c2) === c);
    const vw = (r, c) => walls.some(w => w.c1 === c && w.c2 === c && Math.min(w.r1,w.r2) === r);

    const grid = copyGrid(initial);
    const steps = [];
    let changed = true;
    while (changed && !isFilled(grid)) {
      changed = false;
      if (applyBalance(grid, size, steps))                      changed = true;
      if (applyDoubleBlock(grid, size, steps, hw, vw))          changed = true;
      if (applySandwich(grid, size, steps, hw, vw))             changed = true;
      if (applyConstraint(grid, constraints, steps))            changed = true;
      if (applyEndpointBalance(grid, size, steps, walls.length > 0)) changed = true;
      if (hasRegions && applyRegionBalance(grid, size, steps))  changed = true;
      if (hasX && applyDiagBalance(grid, size, steps))          changed = true;
      if (hasX && applyDiagBlock(grid, size, steps))            changed = true;
      if (cages.length > 0 && applyKillerCage(grid, cages, steps)) changed = true;
    }
    return steps;
  }

  global.TangoSolver = { computeSolveSteps };
})(typeof window !== 'undefined' ? window : global);
