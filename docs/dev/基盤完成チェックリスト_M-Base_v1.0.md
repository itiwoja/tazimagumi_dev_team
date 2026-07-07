# 基盤完成チェックリスト（M-Base）v1.0

**ガントID：** `p2e` → マイルストーン `★mbase`（[ガントチャート v2.0](../schedule/ガントチャート_v2.0.md) §5）
**担当：** 村上（itiwoja） ／ **対象Issue：** [#29 p2e ダミーデータ・型定義・基盤完成→developマージ](https://github.com/itiwoja/tazimagumi_dev_team/issues/29)
**目的：** 基盤アプリ（PWA雛形・共有部品・ルーティング・4画面の空ハコ・ダミーデータ・型）が `develop` に揃い、各メンバーが feature に着手できる状態であることを確認・記録する。

> このドキュメントは **M-Base ゲートの合否証跡** です。基盤に新機能は追加しません（各機能は担当 feature ブランチで実装）。

---

## 1. M-Base 成果物チェック（p2e 依存：p2c / p2d / p1g）

| 区分 | 成果物 | 実体（`develop`） | 状態 |
| --- | --- | --- | --- |
| PWA雛形（p2a） | マニフェスト・SW・アイコン | `app/manifest.webmanifest`・`app/sw.js`・`app/icons/{icon-192,icon-512,apple-touch-icon}.png` | ✅ |
| デザイントークン（p2c） | カラー等の CSS 変数 | `app/css/style.css` `:root`（`--ink`/`--muted`/`--line`/`--line-soft`/`--soft`/`--bg`） | ✅ |
| 共有部品（p2c） | トースト・進捗・タブ・シート・CTA | `App.toast`/`App.updateProgress`（state.js）・`.tabs`/`.sheet`/`.cta`（style.css・index.html） | ✅ |
| ルーティング（p2d） | 画面遷移・タブロック | `App.showScreen`（screens.js）・タブの `is-locked`/`aria-disabled` | ✅ |
| 4画面の空ハコ（p2d） | S1〜S4 セクション | `#s1`/`#s2`/`#s3`/`#s4`（index.html） | ✅ |
| ダミーデータ | 商品シード＋予算フィルタ | `window.PRODUCTS`（3件・化粧水）・`filterProductsByBudget`（products.js） | ✅ |
| 機能IF（型）定義（p1g） | 受け渡しデータの型と実装スタブ | `app/js/contracts.js`（型定義＋`notImplemented` スタブ） | ✅ |

## 2. 各 feature の着手ポイント（M-Base 依存タスクが待たされないこと）

| タスク | 担当 | 着手に必要な基盤 | 実体 | 状態 |
| --- | --- | --- | --- | --- |
| p4a SC-01 初回チェックUI | れん | S1 空ハコ・ウィザード土台 | `#s1`・`App.renderQuestion`/`App.pick`（screens.js） | ✅ |
| p4b 診断ロジック | ひろと | 診断関数の枠・型 | `App.diagnose`（stub）・`Answers`/`Diagnosis`/`AxisScores` 型 | ✅ |
| p4g ロードマップ生成 | ひろと | 生成関数の枠・型 | `App.buildRoadmap`（stub）・`RoadmapStep` 型 | ✅ |
| p4h 推薦ロジック | たかと | 推薦関数の枠・商品データ | `App.recommend`（stub）・`PRODUCTS`・`filterProductsByBudget` | ✅ |
| p4c SC-02 ロードマップUI | れん | S2 空ハコ | `#s2`・`App.showScreen` | ✅ |
| p4d SC-03 商品比較UI | ゆうと | 比較関数の枠・S3 空ハコ | `App.buildCompareTable`（stub）・`#s3`・`CompareTable` 型 | ✅ |
| p4e SC-04 継続記録UI | ゆうと | S4 空ハコ | `#s4`・記録の土台 | ✅ |
| p4f ディスクレーマー共通部品 | 村上 | （別Issue #40 で実装） | `app/js/disclaimer.js`（PR #97） | 🔗 別PR |

## 3. 健全性チェック

- [x] 全JS 構文チェック通過（`node --check` × `products.js`/`contracts.js`/`state.js`/`screens.js`/`main.js`）
- [x] 読み込み順の約束を維持（`data → state → contracts → screens → main`／各 `defer`）
- [x] ビルド不要（`app/index.html` をブラウザで開けば動作）・外部API非依存
- [x] 未実装スタブは「担当・Issue」を明示して `throw`（誰の何待ちか一目で分かる）

## 4. 判定

**M-Base ゲート：合格。** 基盤一式は `develop` にマージ済みで、P4 の全 feature が着手可能。

### 補足（スコープ外・次工程に送る）
- 商品マスターの本整備（15-20→30-50件・成分タグ）は **p3a/p3b/p3d（たかと）** の担当。本チェックリストはシードの存在のみ確認。
- localStorage 永続化は **#58（別PR）**、ディスクレーマー共通部品は **#40（別PR #97）** で対応。

---

| 日付 | 版 | 変更 |
| --- | --- | --- |
| 2026-07-07 | v1.0 | 初版。M-Base（p2e）完成ゲートの成果物・feature着手ポイント・健全性を確認し合格と記録 |
