# CLAUDE.md — 定時退社シリーズ

「残業が当たり前の日本で、なんとか定時に退社する」をテーマにしたブラウザゲーム3部作。
バニラ JS / HTML / CSS のみ（フレームワーク・ビルドなし）。バックエンドなし、永続化はすべて `localStorage`。

## シリーズ構成

| ゲーム | URL | デプロイ先 | 開発ソース | 仕様書 |
|--------|-----|-----------|-----------|--------|
| 🎵 定時退社タンゴ（メイン） | teiji-tango.com/ | このリポジトリのルート | 同じ（このリポジトリで直接開発） | `docs/feature-spec.md` |
| 🕹️ 定時退社エスケープ | teiji-tango.com/escape/ | `escape/` | `../teiji-escape/` | `docs/escape-spec.md` |
| 🔒 定時退社ロック | teiji-tango.com/lock/ | `lock/` | `../teiji-key/` | `docs/lock-spec.md` |

- **タンゴ**: 6×6 の論理パズル（LinkedIn Tango 系）。👔と🍺を各行・列3:3、3連続NG、=/×制約。毎日1問。
- **エスケープ**: Canvas ドッジゲーム。👔を操作し上司・炎上・メール・書類を避け、🍺で加点。
- **ロック**: 数字野球（3桁・各桁重複なし）。S=位置も正解、B=含まれるが位置違い。リロードごとにランダムなコード。

## デプロイと同期の鉄則

- **デプロイ = `main` に push するだけ**（GitHub Pages + Cloudflare DNS。反映まで数分）。公開リポジトリなのでコミット内容はすべて誰でも閲覧可能。
- **エスケープ / ロックを変更するときは、必ず開発ソース（`../teiji-escape/` / `../teiji-key/`）を編集してから `escape/` / `lock/` に cp する**。デプロイ側を直接編集するとソースと食い違い、次回の cp で上書き消失する。
  ```bash
  cp ../teiji-key/{game.js,index.html,style.css} lock/
  cp ../teiji-escape/{game.js,index.html,style.css} escape/
  ```
- **タンゴの JS/CSS を変更したら `sw.js` の `CACHE` バージョンを必ずバンプする**（例: `teiji-tango-v44` → `v45`）。忘れると PWA キャッシュに古いアセットが残る。厳密には `sw.js` の `ASSETS` に載っているファイルだけが対象（モード別パズルJS `{wall,region,x,killer}-puzzles.js` と escape/lock はキャッシュ対象外なのでバンプ不要）。

## 開発コマンド

```bash
npm test              # Jest 全テスト（2603件、カバレッジ付き）
npm run generate      # 通常パズル生成
npm run validate      # 全パズルの整合性検証
npm run daily-post    # X投稿用の今日のパズル画像生成 → scripts/daily-post.png（gitignore済み）
```

ローカル確認はルートで `python3 -m http.server` 等の静的サーバーを立てるか、escape/lock は `index.html` 直接開きでも動く（タンゴは SW 登録があるためサーバー推奨）。

## リポジトリ構成

```
teiji-tango/
├── index.html / style.css / sw.js   # タンゴ本体（PWA）
├── js/
│   ├── app.js          # UI・状態管理。LANG / I18N / FEATURE_FLAGS / LAUNCH_DATE / MODE_UNLOCK_DAYS はここ
│   ├── game.js         # TangoGame クラス（盤面・検証・シェアテキスト）
│   ├── solver.js       # TangoSolver。9手筋ソルバー（ヒント兼難易度検証）→ docs/solver-logic.md
│   ├── tutorial.js     # インタラクティブチュートリアル（パズル101で手筋①〜⑤を体験）
│   ├── puzzles.js      # 通常パズル + getDayIndex()（Day番号の共通起点）
│   └── {wall,region,x,killer}-puzzles.js  # モード別パズル（生成スクリプト製。壁あり192問、他は各90問）
├── escape/ , lock/     # 姉妹ゲームのデプロイコピー（直接編集禁止）
├── scripts/            # パズル生成・検証・OGP/投稿画像生成（Node、sharp使用）
├── tests/              # Jest（unit + integration）。ブラウザ用JSは tests/helpers/load.js で読み込む
├── docs/               # 仕様書・引き継ぎ・マーケ資料（コミット済み分）
└── docs/local/         # ★gitignore済み。未公開マーケ素材・動画・下書き置き場
```

## タンゴのコア知識

- **セル値**: `0`=空, `1`=SHIRT(👔), `2`=BEER(🍺)。
- **Day番号**: `getDayIndex()`（js/puzzles.js）が起点 `2026-06-07`・**JST 16:00 リセット**（LinkedIn Tango に合わせた）で算出。その日のパズルは難易度別プールから `dayIndex % pool.length` で決まる。サーバー不要の決定論的日替わり。
- **モード段階公開**: `LAUNCH_DATE`（現在 `2026-06-20`）起点で region +14日 / x +28日 / killer +42日に解禁（`isModeUnlocked()`）。通常・壁ありは常時公開。
- **FEATURE_FLAGS**: `themeSwitcher`（寿司🍣🍵・狐🦊⛩️テーマ。海外展開用に実装済みだが非表示）と `tentativeMode`(仮置き) は現在 `false`。詳細と再有効化手順は feature-spec.md §14。
- **ヒント**: ソルバーの解法ステップと盤面を照合して次の一手を提示。1回 +5秒ペナルティ。
- **i18n**: `LANG` はブラウザ言語で自動判定（ja / en）。HTML は日本語がデフォルトで、英語時のみ `applyI18n()` が DOM を書き換える方式。
- **localStorage キー**: `theme`, `achievements`, `streak`, `lastPlayed`, `howto_seen`, `bestTime_{mode}_{diff}`, `done_{mode}_{diff}_{dateString}`。エスケープは `teiji-escape-*` プレフィックス。
- **アナリティクス**: GA4（G-KYWDGLXEXR）+ Cloudflare Web Analytics。タンゴとエスケープには設置済み、**ロックは未設置**（既知の課題）。

## パズルを追加・変更するとき

1. `scripts/generate-*.js` で生成（ソルバーで「ロジックだけで解けること」を検証しながら生成する設計）
2. `npm run validate` で整合性確認
3. `npm test` で全テスト確認（パズルデータの検証テストが含まれる）

## ドキュメント索引

| ファイル | 内容 |
|----------|------|
| `docs/feature-spec.md` | タンゴ機能仕様書（モード・実績・フラグ等の詳細） |
| `docs/escape-spec.md` | エスケープ仕様書 |
| `docs/lock-spec.md` | ロック仕様書 |
| `docs/solver-logic.md` | 9手筋ソルバーの解説 |
| `docs/handover-*.md` | 時点スナップショットの引き継ぎ資料（履歴として保持） |
| `docs/marketing-guide.md` ほか | マーケ戦略・投稿キット（公開済み分） |
| `docs/local/` | 未公開マーケ素材（gitignore。CM動画 mp4、各種リスティング原稿、`lock-tutorial-draft.js` = 将来のロック用チュートリアル素材） |

## 運用メモ

- コミットメッセージは日本語（例: `定時退社ロック: ポップアップに×閉じるボタンを追加`）。
- オーナー（ユーザー）が経営判断・X運用を担当、Claude が開発・マーケ準備を担当する体制（詳細は handover 参照）。
- LinkedIn 等の実名 SNS への投稿は会社バレ防止のため禁止。
