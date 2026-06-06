# 定時退社タンゴ 機能仕様書

> 作成日: 2026-05-05  
> バージョン: v1.0（公開前）

---

## 機能一覧

| # | 機能名 | 区分 | 状態 | 主なファイル |
|---|--------|------|------|-------------|
| 1 | コアゲームロジック | ゲーム基盤 | ✅ 完了 | `js/game.js` |
| 2 | ソルバー / ヒント | ゲーム基盤 | ✅ 完了 | `js/solver.js` |
| 3 | 通常モード | ゲームモード | ✅ 完了 | `js/puzzles.js` |
| 4 | 壁ありモード | ゲームモード | ✅ 完了 | `js/wall-puzzles.js` |
| 5 | エリアモード | ゲームモード | ✅ 完了 | `js/region-puzzles.js` |
| 6 | Xタンゴモード | ゲームモード | ✅ 完了 | `js/x-puzzles.js` |
| 7 | キラータンゴモード | ゲームモード | ✅ 完了 | `js/killer-puzzles.js` |
| 8 | 難易度（初級/中級/上級） | ゲーム基盤 | ✅ 完了 | 全パズルファイル |
| 9 | タイマー / ベストタイム | UI | ✅ 完了 | `js/app.js` |
| 10 | 仮置きモード | UI | ✅ 完了 | `js/app.js` |
| 11 | テーマ切替（3種） | UI | ✅ 完了 | `js/app.js` |
| 12 | 実績システム（8種） | エンゲージメント | ✅ 完了 | `js/app.js` |
| 13 | 連続プレイストリーク | エンゲージメント | ✅ 完了 | `js/app.js` |
| 14 | シェア機能（X / Facebook / コピー） | SNS | ✅ 完了 | `js/app.js` |
| 15 | OGP画像 | SNS | ✅ 完了 | `icons/ogp.png` |
| 16 | PWA対応 | 配布 | ✅ 完了 | `manifest.json`, `sw.js` |
| 17 | Android TWA 準備 | 配布 | 🔧 準備中 | `../teiji-tango-android/` |

---

## 1. コアゲームロジック

**ファイル**: `js/game.js`  
**クラス**: `TangoGame`

### グリッド
- サイズ: 6×6 固定
- セル値: `0`=空, `1`=SHIRT(👔), `2`=BEER(🍺)
- `fixed[][]`: 初期配置セル（タップ不可）
- `history[]`: 操作履歴（undo用）

### バリデーション

| メソッド | 内容 |
|----------|------|
| `checkNoTriple()` | 行・列で同じ記号が3つ以上連続していないか（壁をまたぐ場合は無視） |
| `checkBalance()` | 各行・各列に SHIRT と BEER がちょうど `size/2` 個ずつか |
| `checkConstraints()` | `=`（同じ）・`×`（違う）制約マーカーを満たすか |
| `checkRegionBalance()` | エリアモード時: 各2×3エリアに3個ずつか |
| `checkDiagonals()` | Xタンゴ時: 主対角線・副対角線が3:3 かつ3連続NGか |
| `isComplete()` | 上記すべてを満たし全マス埋まっているか |
| `getErrors()` | エラーセル座標セットを返す（リアルタイム赤色表示用） |

### 操作
- `toggle(r, c)`: 空→SHIRT→BEER→空 のサイクル、fixed は無視
- `undo()` / `canUndo()`: 直前の操作を1手戻す
- `reset()`: 初期配置に戻す、履歴クリア

### その他
- `getNextHint()`: ソルバーの解法ステップと現在盤面を照合し、次に置くべきマスを返す
- `buildShareText(day, secs, hints, sym1, sym2)`: SNSシェア用絵文字グリッドテキストを生成
- `_wallSet`: 壁のO(1)ルックアップ用Set（"r1,c1:r2,c2" 形式）

---

## 2. ソルバー / ヒント機能

**ファイル**: `js/solver.js`  
**API**: `TangoSolver.computeSolveSteps(initial, size, constraints, walls, hasRegions, hasX, cages)`

クリア前の盤面を解いてステップ列を返す。ヒントボタンで「次に置くべきマスとその理由」を提示。

### 実装済み手筋

| ID | 手筋名 | 内容 |
|----|--------|------|
| ① | バランス完了 | 行/列に一方が `size/2` 個揃った → 残りは全て逆 |
| ② | ダブルブロック | 同じ記号が2連続 → 前後のセルは逆（壁をまたぐ場合は不適用） |
| ③ | サンドイッチ | `[X, _, X]` パターン → 中間は逆（壁をまたぐ場合は不適用） |
| ④ | 制約直接 | `=`/`×` の片側が確定 → もう片方を決定 |
| ⑤ | 端点バランス | 6マス専用・壁なし限定: 両端2マスが同じ → 逆端は逆 |
| ⑥ | エリアバランス | エリアモード時: エリア内に3個揃った → 残りは逆 |
| ⑦ | 対角バランス | Xタンゴ時: 対角線に3個揃った → 残りは逆 |
| ⑧ | 対角ブロック/サンドイッチ | Xタンゴ時: 対角線上でのダブルブロック・サンドイッチ |
| ⑨ | 枠バランス | キラー時: 枠内の必要🍺/👔数が残り空マス数と一致 → 全て逆を確定 |

### ヒントペナルティ
- 1回使うごとに **+5秒**
- ヒント使用回数はクリア結果・シェアテキストに表示

---

## 3. ゲームモード

### 3-1. 通常モード
**パズルファイル**: `js/puzzles.js`  
**パズル数**: 手動作成 + 自動生成（各難易度複数）  
**ルール**: 行列バランス（3:3）＋ 3連続NG ＋ 制約マーカー

### 3-2. 壁ありモード（🧱）
**パズルファイル**: `js/wall-puzzles.js`（90問）  
**生成スクリプト**: `scripts/generate-wall-puzzles.js`

**追加ルール**: セル間に壁（`|` または `—`）が置かれ、壁をまたぐと3連続ルールが分断される

| 難易度 | 壁の数 | 初期配置 |
|--------|--------|----------|
| 初級 | 3本 | 16〜22マス |
| 中級 | 4本 | 12〜16マス |
| 上級 | 5本 | 8〜12マス |

**壁の制約**: 1マスしかない孤立セグメントを作らない（最小セグメント2マス）  
**表示**: グリッド内に絶対位置指定の `.wall-marker` div（縦横それぞれ`.wall-v`/`.wall-h`）

### 3-3. エリアモード（🗂️）
**パズルファイル**: `js/region-puzzles.js`（90問）  
**生成スクリプト**: `scripts/generate-region-puzzles.js`

**エリア構成**: 6×6グリッドを2行×3列の6エリアに分割

```
[ エリア① ][ エリア② ]
[ エリア③ ][ エリア④ ]
[ エリア⑤ ][ エリア⑥ ]
```

**追加ルール**: 各エリア内に SHIRT と BEER が3個ずつ

**難易度分類ロジック**:
- 初級: エリアバランス手筋（⑥）を使わなくても解ける
- 中級・上級: エリアバランス手筋がないと解けないことを生成時に検証

| 難易度 | 初期配置 |
|--------|----------|
| 初級 | 14マス（エリア手筋不要） |
| 中級 | 10マス（エリア手筋必要） |
| 上級 | 6〜11マス（エリア手筋必要） |

**表示**: エリア境界に太線（`.region-border-h`/`.region-border-v`）を requestAnimationFrame で描画

### 3-4. Xタンゴモード（✕）
**パズルファイル**: `js/x-puzzles.js`（90問）  
**生成スクリプト**: `scripts/generate-x-puzzles.js`

**対角線定義**:
- 主対角線: `(0,0)→(1,1)→...→(5,5)`
- 副対角線: `(0,5)→(1,4)→...→(5,0)`

**追加ルール**:
1. 両対角線でも SHIRT と BEER が3個ずつ
2. 両対角線でも3連続NG

| 難易度 | 初期配置 |
|--------|----------|
| 初級 | 14マス |
| 中級 | 10マス |
| 上級 | 6〜9マス |

**表示**: 対角線セルに紫のインナーボーダー（`.diag-cell`、`box-shadow: inset 0 0 0 2px rgba(180,100,255,0.5)`）

### 3-5. キラータンゴモード（🔪）
**パズルファイル**: `js/killer-puzzles.js`（90問）  
**生成スクリプト**: `scripts/generate-killer-puzzles.js`

**枠（ケージ）の定義**: 任意の形状で隣接するセルをグループ化。各枠に含まれる🍺の数をラベルで表示。

**追加ルール**: 各枠内の🍺マーク数が枠ラベルと一致すること

**枠生成アルゴリズム**: BFSでN個のシード点から `maxCageSize` セルまで拡張、余りセルは最近傍枠に吸収

| 難易度 | 枠数 | 最大枠サイズ | 平均セル数/枠 |
|--------|------|------------|-------------|
| 初級 | 12個 | 4セル | 約3.0 |
| 中級 | 9個 | 5セル | 約4.0 |
| 上級 | 7個 | 6セル | 約5.1 |

**特徴**: 初期配置（fixed cell）なし。全マスが空白から始まる。  
**表示**: SVGオーバーレイ（`.cage-svg-overlay`）で枠境界を紫の破線描画。枠の左上セルに🍺数ラベル（`.cage-label`）を絶対配置。

---

## 4. 難易度システム

全4モード共通で**初級・中級・上級**の3段階。  
その日のパズルは `(日付offset) mod 30` でプールから選択（毎日変わる）。  
1日でクリアしたかどうかを `localStorage` の `done_{diff}_{dateString}` に記録。

---

## 5. タイマー / ベストタイム

- ゲーム開始と同時にカウントアップ開始
- クリア時または難易度切替時に停止
- すでにその日クリア済みの場合は「−:−−」表示（タイマーなし）
- ヒント使用で +5秒加算
- ベストタイムは `localStorage` の `bestTime_{diff}` に保存
- クリア時に新記録なら「🏆 新記録！」表示

---

## 6. 仮置きモード

**目的**: 論理的に確定できないマスを仮定して試し置きし、後でまとめて確定または破棄する

| 操作 | 動作 |
|------|------|
| 🔍 仮置きボタン（または再タップ） | 仮置きモード開始。現在の盤面スナップショットを保存 |
| セルをタップ | 仮置きマス（破線ボーダー）として配置。エラー表示は無効化 |
| ✅ 確定 | 仮置き内容を確定。完了チェックを実行 |
| ❌ 破棄 | スナップショットに戻す |
| ↩ 戻す（undo） | 仮置き内を1手ずつ戻す。全て戻すと自動で確定扱いになりモード終了 |

**仮置き中の特殊動作**:
- エラー表示（赤）は非表示
- Undo は仮置き開始時点より前に戻れない

---

## 7. テーマ切替

3種類のテーマを選択可能。選択は `localStorage` の `theme` に保存。

| テーマID | 記号1 | 記号2 | ラベル1 | ラベル2 |
|----------|-------|-------|---------|---------|
| work | 👔 | 🍺 | 出社 | 退社 |
| sushi | 🍣 | 🍵 | 寿司 | お茶 |
| fox | 🦊 | ⛩️ | 狐 | 鳥居 |

シェアテキストにも選択テーマの絵文字が反映される。

---

## 8. 実績システム

`localStorage` の `achievements` に解除済みIDをJSON配列で保存。  
クリア直後に `checkAndEarnAchievements()` で条件チェック。新規解除分はクリアモーダルに表示。

| ID | アイコン | 名前 | 解除条件 |
|----|----------|------|----------|
| first_clear | 🎯 | はじめての定時退社 | 初めてクリア |
| no_hint | 🎖️ | ノーヒント退社 | ヒントなしでクリア |
| speed_easy | ⚡ | スピード退社 | 初級を2分以内でクリア |
| clear_mid | 🧠 | 中堅社員 | 中級をクリア |
| clear_hard | 👑 | エース社員 | 上級をクリア |
| streak_3 | 🔥 | 3日連続 | 3日連続でプレイ |
| streak_7 | 💫 | 7日連続 | 7日連続でプレイ |
| all_diff | ⭐ | 三冠達成 | 1日で3難易度全てクリア |

---

## 9. 連続プレイストリーク

- 毎日クリアすると🔥連続日数がヘッダーに表示
- `localStorage` の `streak`・`lastPlayed` で管理
- 昨日プレイしていれば +1、それより前なら 1 にリセット

---

## 10. シェア機能

クリアモーダルに3ボタン表示。

| ボタン | 動作 |
|--------|------|
| ✕ Xでシェア | `twitter.com/intent/tweet?text=...` を新しいタブで開く。テキスト自動入力済み |
| f Facebookでシェア | `facebook.com/sharer/sharer.php?u=https://teiji-tango.com` を開く。OGPカード表示 |
| 📋 コピー | モバイル: `navigator.share()` でネイティブシート表示 / PC: クリップボードにコピー |

**シェアテキスト形式**:
```
定時退社タンゴ Day {n}
⏱ {m}:{ss}  💡 ヒント{n}回 (+{n*5}秒)   ← ヒントなしの場合は省略

👔🍺👔🍺👔🍺
🍺👔🍺👔🍺👔
...

#定時退社タンゴ
https://teiji-tango.com
```

---

## 11. OGP画像

**ファイル**: `icons/ogp.png`（1200×630px）  
**生成スクリプト**: `scripts/generate-ogp.js`（sharp + SVG → PNG）

X・Facebook・LINE でURL共有時のリンクカード画像として使用。  
`index.html` の `og:image`・`twitter:image` メタタグで参照。

---

## 12. PWA対応

| ファイル | 内容 |
|----------|------|
| `manifest.json` | アプリ名・アイコン・テーマカラー・表示モード設定 |
| `sw.js` | Service Worker（オフラインキャッシュ） |
| `icons/icon.svg` | アプリアイコン（SVG） |

ホーム画面に追加でネイティブアプリ風に起動可能。

---

## 13. Android TWA 準備

**フォルダ**: `../teiji-tango-android/`

| ファイル | 内容 |
|----------|------|
| `twa-manifest.json` | パッケージID: `com.teijitango.app`、ホスト: `teiji-tango.com` |
| `README.md` | Bubblewrap CLIでのビルド手順 |
| `../.well-known/assetlinks.json` | Digital Asset Links（SHA-256フィンガープリント未入力） |

**残作業**: Java 17 + Android Studio インストール → `bubblewrap init` → Play Store 公開

---

## データ永続化まとめ（localStorage）

| キー | 内容 |
|------|------|
| `theme` | 選択中のテーマID |
| `achievements` | 解除済み実績IDのJSON配列 |
| `streak` | 連続プレイ日数 |
| `lastPlayed` | 最後にプレイした日（dateString） |
| `bestTime_{diff}` | 難易度別ベストタイム（秒） |
| `done_{diff}_{dateString}` | その日の難易度クリアフラグ |

---

## ファイル構成

```
teiji-tango/
├── index.html               # エントリーポイント
├── style.css                # 全スタイル
├── manifest.json            # PWAマニフェスト
├── sw.js                    # Service Worker
├── js/
│   ├── puzzles.js           # 通常モードパズル + getPuzzleByDifficulty()
│   ├── wall-puzzles.js      # 壁ありパズル90問 + getWallPuzzleByDifficulty()
│   ├── region-puzzles.js    # エリアパズル90問 + getRegionPuzzleByDifficulty()
│   ├── x-puzzles.js         # Xタンゴパズル90問 + getXPuzzleByDifficulty()
│   ├── killer-puzzles.js    # キラータンゴパズル90問 + getKillerPuzzleByDifficulty()
│   ├── solver.js            # 手筋ソルバー（ヒント用）TangoSolver
│   ├── game.js              # ゲームロジック TangoGame
│   └── app.js               # UI・イベント・状態管理
├── icons/
│   ├── icon.svg             # アプリアイコン
│   └── ogp.png              # OGP画像（1200×630px）
├── scripts/
│   ├── generate-wall-puzzles.js    # 壁ありパズル生成
│   ├── generate-region-puzzles.js  # エリアパズル生成
│   ├── generate-x-puzzles.js       # Xタンゴパズル生成
│   ├── generate-killer-puzzles.js  # キラータンゴパズル生成
│   └── generate-ogp.js             # OGP画像生成
├── docs/
│   ├── feature-spec.md      # 本仕様書
│   ├── marketing-guide.md   # マーケティング戦略
│   ├── publish-guide.html   # 公開手順書
│   └── solver-logic.md      # ソルバー解説
└── tests/
    ├── unit/
    │   ├── game.test.js     # TangoGame ユニットテスト
    │   ├── solver.test.js   # TangoSolver ユニットテスト
    │   └── puzzles.test.js  # パズルデータ整合性テスト
    ├── integration/
    │   └── puzzle-flow.test.js  # 実績・ゲームフロー統合テスト
    └── helpers/
        └── load.js          # ブラウザ向けスクリプトのNode.js読み込みヘルパー
```

---

## 14. フィーチャーフラグ

`js/app.js` 冒頭に、用途の異なる2種類のフィーチャーフラグがある。どちらも「コードは残したまま、UI上は隠す／解禁日まで隠す」ための仕組みで、実装を消さずに公開タイミングだけをコントロールする。

### 14-1. モードの段階公開（`LAUNCH_DATE` / `MODE_UNLOCK_DAYS` / `isModeUnlocked()`）

**目的**: エリア・Xタンゴ・キラータンゴモードを公開日からの経過日数で順番に解禁する（一度に全部出すと初見ユーザーが迷うため）。

```js
const LAUNCH_DATE = '2026-06-20';
const MODE_UNLOCK_DAYS = {
  region: 14, // 公開2週間後
  x:      28, // 公開4週間後
  killer: 42, // 公開6週間後
};
```

| 設定 | 内容 |
|------|------|
| `LAUNCH_DATE` | 正式公開日（`YYYY-MM-DD`）。**公開日が確定したらここだけ更新すれば、解禁日が連動してずれる** |
| `MODE_UNLOCK_DAYS` | キーに載っているモードだけ「公開日から N 日後」に解禁。載っていないモード（通常・壁あり）は常時解禁 |
| `isModeUnlocked(mode)` | 解禁判定。モードボタンの非活性表示（`mode-locked`）とクリック無効化の両方に使われる |

**運用メモ**: `LAUNCH_DATE` は現状プレースホルダー（`2026-06-20`）。実際の公開日が決まり次第、この値を更新すること。

### 14-2. 機能の一時オフ（`FEATURE_FLAGS`）

**目的**: 「実装・テスト済みだが、初回リリースではシンプルさを優先して隠したい」機能を on/off するための単純な真偽値フラグ。`false` の機能は対象要素に `flag-hidden`（`display: none !important`）クラスが付与され、UIから完全に隠れる。コード自体は削除しないため、`true` に戻すだけで再有効化できる。

```js
const FEATURE_FLAGS = {
  themeSwitcher: false, // 寿司・狐テーマはグローバル展開時用に用意したもの。初回はシンプルにするため非表示
  tentativeMode: false, // 仮置き機能。ソルバー改善でロジックだけで解けるパズルが作れるようになり出番が減ったため一旦オフ
};
```

| フラグ | 現在値 | 隠す対象 | OFFの理由（背景） |
|--------|--------|----------|-------------------|
| `themeSwitcher` | `false` | `.theme-switcher`（[§7 テーマ切替](#7-テーマ切替)のUI） | 寿司・狐テーマは将来のグローバル展開（多言語対応）を見据えて用意したもの。日本市場向けの初回リリースでは選択肢を増やしてユーザーを迷わせないよう、`work`（👔🍺）テーマのみのシンプルな状態で出す |
| `tentativeMode` | `false` | `#btn-tentative`（[§6 仮置きモード](#6-仮置きモード)の起動ボタン） | もともと「ソルバーのロジックだけでは解けないパズル」が生成されてしまう場合の救済策として実装した機能。その後ソルバー側の改善により、ロジックだけで解けるパズルを安定して生成できるようになり、現状ほぼ出番がない。将来また必要になる可能性があるため削除はせず、フラグでオフにして温存する |

**再有効化する場合の手順**:
1. `js/app.js` の `FEATURE_FLAGS` 内、対象キーの値を `false` → `true` に変更
2. `sw.js` の `CACHE` バージョンを上げる（例: `teiji-tango-v10` → `v11`）— PWAキャッシュに古いJSが残るのを防ぐため
3. 該当機能のUI・動作を一通り再確認（特に `tentativeMode` は `enterTentativeMode()` 内の早期リターンで完全にブロックされているため、フラグを戻すだけで動作が復活する設計になっている）

**実装箇所**:
- フラグ定義: `js/app.js` 内 `FEATURE_FLAGS` オブジェクト
- UIの非表示化: `DOMContentLoaded` ハンドラ内（`init()` 直後）で `flag-hidden` クラスを付与
- 機能のブロック: `enterTentativeMode()` 冒頭の `if (!FEATURE_FLAGS.tentativeMode) return;`
- CSSユーティリティ: `style.css` の `.flag-hidden { display: none !important; }`

---

## 今後の候補（未実装）

| 機能 | メモ |
|------|------|
| 8×8 / 10×10 拡張 | グリッドサイズ可変化が必要 |
| Android TWA 本公開 | Java 17 + Android Studio が必要 |
| Google Search Console | サイト公開後に登録 |
| X (@teiji_tango) 運用 | プロフィール・ヘッダー画像の設定 |
