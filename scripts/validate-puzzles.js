#!/usr/bin/env node
// 定時退社タンゴ パズルバリデーター + 手筋ベースのソルバー
// 使い方: node scripts/validate-puzzles.js

const SHIRT = 1, BEER = 2, EMPTY = 0;

const TECHNIQUE_NAMES = {
  1: '①バランス完了',
  2: '②ダブルブロック',
  3: '③サンドイッチ',
  4: '④制約直接',
  5: '⑤端点バランス',
};

// ─────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────
const opp  = v => v === SHIRT ? BEER : SHIRT;
const filled = grid => grid.every(r => r.every(v => v !== EMPTY));
const copy   = grid => grid.map(r => [...r]);

// ─────────────────────────────────────────
// 手筋①〜⑤
// 各関数: グリッドを直接変更し、1つでも確定させたら true を返す
// ─────────────────────────────────────────

// ① バランス完了
// 行/列にすでにn/2個の同じ記号 → 残り全て逆
function tech1_Balance(grid, size) {
  let used = false;
  for (let r = 0; r < size; r++) {
    for (const v of [SHIRT, BEER]) {
      if (grid[r].filter(x => x === v).length === size / 2) {
        for (let c = 0; c < size; c++) {
          if (grid[r][c] === EMPTY) { grid[r][c] = opp(v); used = true; }
        }
      }
    }
  }
  for (let c = 0; c < size; c++) {
    for (const v of [SHIRT, BEER]) {
      if (grid.filter(r => r[c] === v).length === size / 2) {
        for (let r = 0; r < size; r++) {
          if (grid[r][c] === EMPTY) { grid[r][c] = opp(v); used = true; }
        }
      }
    }
  }
  return used;
}

// ② ダブルブロック
// 同じ記号が2連続 → 前後のセルは必ず逆
function tech2_DoubleBlock(grid, size) {
  let used = false;
  const scan = (get, set, len) => {
    for (let i = 0; i < len - 1; i++) {
      const v = get(i);
      if (v === EMPTY || get(i + 1) !== v) continue;
      if (i > 0       && get(i - 1) === EMPTY) { set(i - 1, opp(v)); used = true; }
      if (i + 2 < len && get(i + 2) === EMPTY) { set(i + 2, opp(v)); used = true; }
    }
  };
  for (let r = 0; r < size; r++) scan(c => grid[r][c], (c, v) => { grid[r][c] = v; }, size);
  for (let c = 0; c < size; c++) scan(r => grid[r][c], (r, v) => { grid[r][c] = v; }, size);
  return used;
}

// ③ サンドイッチ
// [X, _, X] → 中間セルは必ず逆（そのままだと3連続になるため）
function tech3_Sandwich(grid, size) {
  let used = false;
  const scan = (get, set, len) => {
    for (let i = 0; i < len - 2; i++) {
      const v = get(i);
      if (v === EMPTY || get(i + 1) !== EMPTY || get(i + 2) !== v) continue;
      set(i + 1, opp(v)); used = true;
    }
  };
  for (let r = 0; r < size; r++) scan(c => grid[r][c], (c, v) => { grid[r][c] = v; }, size);
  for (let c = 0; c < size; c++) scan(r => grid[r][c], (r, v) => { grid[r][c] = v; }, size);
  return used;
}

// ④ 制約直接
// = 制約: 片方確定 → 同じ値
// × 制約: 片方確定 → 逆の値
function tech4_Constraint(grid, constraints) {
  let used = false;
  for (const con of constraints) {
    const v1 = grid[con.r1][con.c1], v2 = grid[con.r2][con.c2];
    if (v1 !== EMPTY && v2 === EMPTY) {
      grid[con.r2][con.c2] = con.type === 'eq' ? v1 : opp(v1); used = true;
    }
    if (v2 !== EMPTY && v1 === EMPTY) {
      grid[con.r1][con.c1] = con.type === 'eq' ? v2 : opp(v2); used = true;
    }
  }
  return used;
}

// ⑤ 端点バランス（6マス行/列専用）
// [X, X, _, _, _, _] → 末端 = 逆X
// 根拠: 末端がXだとバランスにより残り3マスが全て逆X → 3連続違反 ❌
// 逆向き [_, _, _, _, X, X] → 先頭 = 逆X も同様
function tech5_EndpointBalance(grid, size) {
  if (size !== 6) return false; // 現在は6×6専用
  let used = false;
  const scan = (get, set, len) => {
    // 先頭2連続 → 末端確定
    if (get(0) !== EMPTY && get(0) === get(1) && get(len - 1) === EMPTY) {
      set(len - 1, opp(get(0))); used = true;
    }
    // 末尾2連続 → 先頭確定
    if (get(len - 1) !== EMPTY && get(len - 1) === get(len - 2) && get(0) === EMPTY) {
      set(0, opp(get(len - 1))); used = true;
    }
  };
  for (let r = 0; r < size; r++) scan(c => grid[r][c], (c, v) => { grid[r][c] = v; }, size);
  for (let c = 0; c < size; c++) scan(r => grid[r][c], (r, v) => { grid[r][c] = v; }, size);
  return used;
}

// ─────────────────────────────────────────
// 矛盾チェック
// ─────────────────────────────────────────
function hasConflict(grid, size, constraints) {
  for (let r = 0; r < size; r++) {
    if (grid[r].filter(v => v === SHIRT).length > size / 2) return true;
    if (grid[r].filter(v => v === BEER ).length > size / 2) return true;
    for (let c = 0; c < size - 2; c++) {
      const v = grid[r][c];
      if (v !== EMPTY && v === grid[r][c+1] && v === grid[r][c+2]) return true;
    }
  }
  for (let c = 0; c < size; c++) {
    let s = 0, b = 0;
    for (let r = 0; r < size; r++) { if (grid[r][c] === SHIRT) s++; if (grid[r][c] === BEER) b++; }
    if (s > size / 2 || b > size / 2) return true;
    for (let r = 0; r < size - 2; r++) {
      const v = grid[r][c];
      if (v !== EMPTY && v === grid[r+1][c] && v === grid[r+2][c]) return true;
    }
  }
  for (const con of constraints) {
    const v1 = grid[con.r1][con.c1], v2 = grid[con.r2][con.c2];
    if (v1 !== EMPTY && v2 !== EMPTY) {
      if (con.type === 'eq'  && v1 !== v2) return true;
      if (con.type === 'neq' && v1 === v2) return true;
    }
  }
  return false;
}

// ─────────────────────────────────────────
// 手筋ベースのソルバー
// 仮置きなしで①〜⑤のみ使って解けるか試みる
// 返り値:
//   solved         : 完全に埋まったか
//   needsHypothesis: 手筋だけでは解けなかった
//   usedTech       : 使用した手筋番号の Set
//   rounds         : 手筋を全巡した回数（連鎖の深さの目安）
// ─────────────────────────────────────────
function solveWithTechniques(initial, size, constraints) {
  const grid = copy(initial);
  const usedTech = new Set();
  let rounds = 0;

  let changed = true;
  while (changed && !filled(grid)) {
    changed = false;
    rounds++;
    if (tech1_Balance   (grid, size))        { usedTech.add(1); changed = true; }
    if (tech2_DoubleBlock(grid, size))        { usedTech.add(2); changed = true; }
    if (tech3_Sandwich  (grid, size))        { usedTech.add(3); changed = true; }
    if (tech4_Constraint(grid, constraints)) { usedTech.add(4); changed = true; }
    if (tech5_EndpointBalance(grid, size))   { usedTech.add(5); changed = true; }

    if (hasConflict(grid, size, constraints)) {
      return { solved: false, conflict: true, usedTech, rounds };
    }
  }

  return { solved: filled(grid), needsHypothesis: !filled(grid), usedTech, rounds };
}

// ─────────────────────────────────────────
// 唯一解チェック（バックトラッキング）
// 手筋ソルバーとは独立して動作
// ─────────────────────────────────────────
function canPlace(grid, r, c, val, size, constraints) {
  if (grid[r].filter(v => v === val).length >= size / 2) return false;
  let cc = 0; for (let i = 0; i < size; i++) if (grid[i][c] === val) cc++;
  if (cc >= size / 2) return false;
  const row = [...grid[r]]; row[c] = val;
  for (let i = 0; i <= size-3; i++) if (row[i] !== EMPTY && row[i] === row[i+1] && row[i] === row[i+2]) return false;
  for (let i = 0; i <= size-3; i++) {
    const v0=i===r?val:grid[i][c], v1=i+1===r?val:grid[i+1][c], v2=i+2===r?val:grid[i+2][c];
    if (v0!==EMPTY && v0===v1 && v0===v2) return false;
  }
  for (const con of constraints) {
    let v1=null, v2=null;
    if      (con.r1===r && con.c1===c) { v1=val; v2=grid[con.r2][con.c2]; }
    else if (con.r2===r && con.c2===c) { v1=grid[con.r1][con.c1]; v2=val; }
    else continue;
    if (v1===EMPTY || v2===EMPTY) continue;
    if (con.type==='eq'  && v1!==v2) return false;
    if (con.type==='neq' && v1===v2) return false;
  }
  return true;
}

function applyForcedBT(grid, size, constraints) {
  const g = copy(grid); let ch = true;
  while (ch) {
    ch = false;
    for (let r=0; r<size; r++) for (let c=0; c<size; c++) {
      if (g[r][c] !== EMPTY) continue;
      const cS = canPlace(g,r,c,SHIRT,size,constraints);
      const cB = canPlace(g,r,c,BEER, size,constraints);
      if (!cS && !cB) return null;
      if (!cS) { g[r][c]=BEER;  ch=true; }
      if (!cB) { g[r][c]=SHIRT; ch=true; }
    }
  }
  return g;
}

function countSolutions(initial, size, constraints) {
  let count = 0;
  function bt(grid) {
    if (count >= 2) return;
    const g = applyForcedBT(grid, size, constraints);
    if (!g) return;
    if (filled(g)) { count++; return; }
    let br=-1, bc=-1;
    outer: for (let r=0; r<size; r++) for (let c=0; c<size; c++) if (g[r][c]===EMPTY){br=r;bc=c;break outer;}
    for (const val of [SHIRT, BEER])
      if (canPlace(g,br,bc,val,size,constraints)) { const n=copy(g); n[br][bc]=val; bt(n); }
  }
  bt(copy(initial));
  return count;
}

// ─────────────────────────────────────────
// 難易度ラベル
// 判定軸: 使用手筋 × ラウンド数 × 初期マス数
//   初期マスが多い → 情報が多い → 易しい
//   初期マスが少ない → 情報が少ない → 難しい
// 6×6 (36マス) の目安:
//   ≥ 18マス(50%+): 初級水準  ← 各行に同じ記号3個が見えるレベル
//   9〜17マス(25〜47%): 中級水準
//   ≤ 8マス(22%以下): 上級水準
// ─────────────────────────────────────────
function difficultyLabel(tech, initialCount, size) {
  if (tech.needsHypothesis || tech.conflict) return '❌ NG（仮置き必要→パズル要修正）';
  const total = size * size;
  const maxT  = tech.usedTech.size > 0 ? Math.max(...tech.usedTech) : 0;
  const fewClues = initialCount < Math.round(total * 0.25); // < 9マス for 6×6

  if (maxT <= 4) {
    // 基本手筋のみで解ける: 初期マスが半分以上なら初級
    return initialCount >= Math.round(total * 0.5) ? '初級' : '中級';
  }
  // ⑤端点バランスが必要
  if (tech.rounds >= 5 || fewClues) return '上級';
  return '中級';
}

function techSummary(usedTech) {
  if (usedTech.size === 0) return '（手筋なし？）';
  return [...usedTech].sort((a,b)=>a-b).map(t => TECHNIQUE_NAMES[t]).join(' + ');
}

// ─────────────────────────────────────────
// パズル単体バリデーション
// ─────────────────────────────────────────
function validatePuzzle(puzzle) {
  const errors = [];
  const { solution: grid, constraints, initial, size } = puzzle;
  if (!grid) { errors.push('solution が未定義'); return { errors }; }

  for (let r=0; r<size; r++) {
    if (!grid[r]||grid[r].length!==size){errors.push(`row ${r}: 長さ異常`);continue;}
    const s=grid[r].filter(v=>v===SHIRT).length, b=grid[r].filter(v=>v===BEER).length;
    if (s!==size/2||b!==size/2) errors.push(`row ${r}: バランスNG (👔${s} 🍺${b})`);
    for (let c=0;c<size-2;c++) {
      const v=grid[r][c];
      if (v!==EMPTY&&v===grid[r][c+1]&&v===grid[r][c+2]) errors.push(`row ${r} col ${c}: 3連続NG`);
    }
  }
  for (let c=0; c<size; c++) {
    const col=grid.map(r=>r[c]);
    const s=col.filter(v=>v===SHIRT).length, b=col.filter(v=>v===BEER).length;
    if (s!==size/2||b!==size/2) errors.push(`col ${c}: バランスNG`);
    for (let r=0;r<size-2;r++) {
      const v=grid[r][c];
      if (v!==EMPTY&&v===grid[r+1][c]&&v===grid[r+2][c]) errors.push(`col ${c} row ${r}: 3連続NG`);
    }
  }
  for (const con of (constraints||[])) {
    const v1=grid[con.r1]?.[con.c1], v2=grid[con.r2]?.[con.c2];
    if (v1===undefined||v2===undefined){errors.push(`constraint: 座標範囲外`);continue;}
    if (con.type==='eq' &&v1!==v2) errors.push(`制約= NG: (${con.r1},${con.c1})=${v1} vs (${con.r2},${con.c2})=${v2}`);
    if (con.type==='neq'&&v1===v2) errors.push(`制約× NG: (${con.r1},${con.c1})=${v1}`);
  }
  for (let r=0;r<size;r++) for (let c=0;c<size;c++)
    if (initial[r][c]!==EMPTY&&initial[r][c]!==grid[r][c])
      errors.push(`initial mismatch: (${r},${c})`);

  if (errors.length > 0) return { errors };

  const initialCount = initial.flat().filter(v => v !== 0).length;
  const solCount     = countSolutions(initial, size, constraints);
  const tech         = solveWithTechniques(initial, size, constraints);
  return { errors, solCount, tech, initialCount };
}

// ─────────────────────────────────────────
// メイン
// ─────────────────────────────────────────
function run() {
  const fs=require('fs'), path=require('path');
  const puzzlesPath = path.join(__dirname, '../js/puzzles.js');
  if (!fs.existsSync(puzzlesPath)) { console.error('❌ puzzles.js が見つかりません'); process.exit(1); }
  const code  = fs.readFileSync(puzzlesPath, 'utf8');
  const match = code.match(/const PUZZLES\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) { console.error('❌ PUZZLES 配列をパースできませんでした'); process.exit(1); }
  let puzzles;
  try { puzzles = eval(match[1]); } catch(e) { console.error('❌ パースエラー:', e.message); process.exit(1); }

  console.log(`\n📋 定時退社タンゴ パズル検証 (${puzzles.length}問)\n`);

  let allOk = true;
  puzzles.forEach(p => {
    const { errors, solCount, tech, initialCount } = validatePuzzle(p);

    if (errors.length > 0) {
      console.log(`  ❌ Puzzle ${p.id}: solution エラー`);
      errors.forEach(e => console.log(`     → ${e}`));
      allOk = false; return;
    }
    if (solCount === 0) { console.log(`  ❌ Puzzle ${p.id}: 解なし`);    allOk=false; return; }
    if (solCount >= 2)  { console.log(`  ⚠️  Puzzle ${p.id}: 複数解あり`); allOk=false; return; }

    const total   = p.size * p.size;
    const diff    = difficultyLabel(tech, initialCount, p.size);
    const techStr = techSummary(tech.usedTech);
    const ok      = !tech.needsHypothesis && !tech.conflict;
    const mismatch = ok && p.difficulty && !diff.includes(p.difficulty)
      ? `  ⚠️  設定「${p.difficulty}」→ 推奨「${diff}」` : '';

    console.log(`  ${ok ? '✅' : '⚠️ '} Puzzle ${p.id} (設定:${p.difficulty||'?'}): 唯一解`);
    console.log(`     初期マス: ${initialCount}/${total} (${Math.round(initialCount/total*100)}%)`);
    console.log(`     使用手筋: ${techStr}`);
    console.log(`     ラウンド: ${tech.rounds}回  →  推奨難易度「${diff}」${mismatch}`);
    if (!ok) {
      console.log(`     ⚠️  手筋だけでは解けません → ヒントセルか制約を追加してください`);
      allOk = false;
    }
  });

  console.log('');
  console.log(allOk ? '🎉 全パズル検証クリア！' : '⚠️  修正が必要なパズルがあります');
  process.exit(allOk ? 0 : 1);
}

run();
