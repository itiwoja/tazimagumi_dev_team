# 静的アクセシビリティ点検レポート v1.0（p5b）

**プロジェクト：** 田島組 卒業制作（男の身だしなみアプリ）
**ガントID：** p5b ／ フェーズ P5 ／ 担当: 全員
**参照：** [アクセシビリティ要件定義書 v1.0](../guidelines/アクセシビリティ要件定義書_v1.0.md)・[テスト仕様書 v1.0](./テスト仕様書_v1.0.md)
**基準：** WCAG 2.1 AA（意識）
**点検対象：** `app/index.html`・`app/css/style.css`・`app/js/*.js`（develop ブランチ 2026-07-14 時点）
**ステータス：** 静的点検完了（実機確認は人間タスク）

> 本レポートは **HTMLの静的解析・コードレビュー**によって機械的に検出した結果です。
> 実機スクリーンリーダー・コントラスト実測・タップ領域の物理確認は §3「人間タスク」に記録します。

---

## 1. 要件別点検結果サマリー

| 要件 | 内容 | 静的判定 | 詳細 |
|---|---|---|---|
| **A1** | コントラスト比 4.5:1以上（本文）| ⚠️ 要実測 | §3-H2 参照 |
| **A2** | キーボード操作可能 | ✅ 概ね対応 | §2-1 参照 |
| **A3** | タップ領域 44px以上 | ⚠️ 要実機確認 | §3-H3 参照 |
| **A4** | 状態を色だけで伝えない | ✅ 対応済み | §2-2 参照 |
| **A5** | reduced-motion 対応 | ✅ CSS実装済み | §2-3 参照 |
| **A6** | 文字大きめ対応 | ⚠️ 部分対応 | §2-4 参照 |
| **A7** | aria-label（アイコン等） | ✅ 概ね対応 / 一部△ | §2-5 参照 |

---

## 2. 静的点検詳細

### 2-1. A2 キーボード操作（フォーカス）

#### ✅ 対応済み

| 要素 | 確認内容 | 状況 |
|---|---|---|
| `button.tab` | `button` 要素を使用 | ✅ |
| `button.chip` | `button` 要素を使用 | ✅ |
| `button.cta` | `button` 要素を使用 | ✅ |
| `button.settings-btn` | `button` 要素を使用 | ✅ |
| `button#sheetClose` | `button` 要素を使用 | ✅ |
| `button#settingsClose` | `button` 要素を使用 | ✅ |
| `.cand__item`（S3候補リスト） | `role="checkbox"` + `tabindex="0"` + keydown（Space/Enter）対応 | ✅ |
| `:focus-visible` | `style.css` L40 に定義済み（橙色アウトライン3px） | ✅ |
| 設定シートのフォーカストラップ | `main.js` `handleSettingsKeydown` で Tab/Shift+Tab を制御 | ✅ |
| 設定シートの Esc 閉じ | `main.js` `handleSettingsKeydown` で実装済み | ✅ |
| 用語シートの Esc 閉じ | `main.js` で実装済み | ✅ |

#### ⚠️ 検出した問題点

**[A2-ISSUE-1] `.cta-back`（戻るボタン）の `:focus-visible` スタイル**

- `main.js` L40-42 で `style.cssText` を直接設定しているため、グローバルの `:focus-visible` が上書きされる可能性がある。
- **確認方法：** Tab キーで戻るボタンにフォーカスしたとき、橙色アウトラインが表示されるか確認する。

```js
// main.js L40-42（該当箇所）
backBtn.style.cssText =
  "flex:0 0 auto;width:52px;height:50px;border-radius:14px;border:1px solid var(--border);" +
  "background:var(--surface);color:var(--text);font-size:20px;font-weight:700;cursor:pointer;display:none;touch-action:manipulation";
// ← :focus-visible の outline 指定なし
```

- **推奨対応（軽微）：** CSS クラスで管理するか、`outline` を `style.cssText` に追加する。

**[A2-ISSUE-2] `.sheet__scrim`（スクリムボタン）のキーボードラベル**

- `index.html` L324：`<button class="sheet__scrim" id="settingsScrim" aria-label="設定を閉じる">` — ✅ 正常
- `index.html` L334：`<button class="sheet__scrim" id="sheetScrim" aria-label="とじる">` — ✅ 正常

**[A2-ISSUE-3] 用語シートのフォーカストラップ未実装**

- 設定シート（`settingsSheet`）にはフォーカストラップが実装されているが、**用語シート（`sheet`）にはフォーカストラップが実装されていない**。
- `main.js` の `handleSettingsKeydown` は `settingsSheet` のみ対象。
- **確認方法：** 用語シートが開いている状態で Tab を押し続け、シート外にフォーカスが抜けないか確認する。
- **推奨対応（中程度）：** 用語シート用のフォーカストラップ処理を追加する（別 Issue を推奨）。

---

### 2-2. A4 状態を色だけで伝えない

#### ✅ 対応済み

| 要素 | 状態の伝え方 | 状況 |
|---|---|---|
| タブ（選択中） | `aria-current="step"` + `is-active` クラス | ✅ |
| タブ（ロック） | `aria-disabled="true"` + `is-locked` クラス + `opacity:.45` | ✅ |
| タブ（完了） | `is-done` クラス + step-badge が緑 | △ 色変化のみ（下記参照） |
| チップ（選択） | `aria-checked="true/false"` | ✅ |
| 予算ボタン（選択） | `aria-pressed="true/false"` | ✅ |
| 記録ドット（今日） | `aria-pressed="true/false"` | ✅ |
| 週評価ボタン | `aria-pressed="true/false"` | ✅ |
| 候補リスト選択 | `aria-checked="true/false"` | ✅ |
| 進捗バー | `role="progressbar"` + `aria-valuenow` 更新 | ✅ |
| 週ドット（既存） | `role="img"` + `aria-label="月曜 記録済み"` 等 | ✅ |

#### ⚠️ 検出した問題点

**[A4-ISSUE-1] タブ「完了」状態の視覚のみ通知**

- `is-done` クラスは step-badge を緑色にするが、**スクリーンリーダーへの「完了」の通知がない**。
- `aria-label` や `aria-description` で「完了済み」を示すことが望ましい。
- **推奨対応（軽微）：** `App.complete()` で `s1` タブに `aria-label="初回チェック（完了済み）"` を動的に付与する。

---

### 2-3. A5 prefers-reduced-motion

#### ✅ 対応済み

`style.css` L387-390 に以下の実装を確認：

```css
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.001ms!important;transition-duration:.001ms!important;scroll-behavior:auto!important}
}
```

- `animation-duration` と `transition-duration` を `.001ms` に設定し、実質的にアニメーションを無効化 ✅
- `scroll-behavior:auto` でスムーススクロール無効化 ✅

> [!NOTE]
> `0ms` でなく `.001ms` としているのは、一部ブラウザの最適化バグ回避のため（意図的）。

---

### 2-4. A6 文字大きめ対応（`-webkit-text-size-adjust`）

#### ✅ 部分対応済み

- `style.css` L31：`-webkit-text-size-adjust:100%` で iOS でのフォントサイズ自動調整を防止 ✅
- `style.js`（screens.js）で `App.prefs` の `reminderTime` は管理されているが、**フォントサイズ（`fontSize`）プリファレンスは未実装**（アクセシビリティ要件定義書 §1 A6「文字大きめモード（prefs）」として言及あり）。

#### ⚠️ 未実装

**[A6-ISSUE-1] 文字大きめモードが未実装**

- 要件定義書に「文字大きめモード（`prefs`）」と記載があるが、`App.prefs` に `reminderTime` のみ存在し、フォントサイズ変更機能は未実装。
- **推奨対応（将来対応）：** 優先度は低め。OS のフォント拡大設定（ブラウザズーム）への追従性を実機確認で補う（H-4）。

---

### 2-5. A7 aria-label（アイコンのみのボタン・操作要素）

#### ✅ 対応済み

| 要素 | `aria-label` 値 | 状況 |
|---|---|---|
| `#settingsBtn`（「設定」ボタン） | `"設定"` | ✅ |
| `#settingsClose`（×ボタン） | `"設定を閉じる"` | ✅ |
| `#settingsScrim`（スクリム） | `"設定を閉じる"` | ✅ |
| `#sheetClose`（「とじる」ボタン） | テキスト「とじる」あり | ✅ |
| `#sheetScrim`（スクリム） | `"とじる"` | ✅ |
| `nav.tabs` | `aria-label="画面ステップ"` | ✅ |
| `div.phone` | `role="group"` + `aria-label="身だしなみアプリ"` | ✅ |
| `div.progress` | `aria-label="全体の進捗"` | ✅ |
| `div.chips` 各 Q | `aria-label="肌の状態"` 等 | ✅ |
| `div.budget` | `aria-label="予算帯"` | ✅ |
| `.dot--today`（今日ドット） | `aria-label="土曜（今日）をタップして記録"` | ✅ |
| `.dots`（週記録リスト） | `role="list"` + `aria-label="今週の記録"` | ✅ |

#### ⚠️ 検出した問題点

**[A7-ISSUE-1] `cta-back`（「←」戻るボタン）の aria-label**

- `main.js` L38：`backBtn.setAttribute("aria-label", "ひとつ前の質問にもどる")` — ✅ 対応済み

**[A7-ISSUE-2] `#todayDot` の曜日が固定テキスト**

- `index.html` L258：`aria-label="土曜（今日）をタップして記録"` — 「土曜」が HTML に固定されており、実際の曜日と異なる可能性がある。
- **推奨対応（中程度）：** JS で動的に実際の曜日を `aria-label` に設定する。

**[A7-ISSUE-3] S2 ロードマップの `step-badge` に `aria-hidden` なし**

- `index.html` L157-171：`<span class="step-badge" aria-hidden="true">1</span>` — ✅ `aria-hidden="true"` 設定済み
- S2 の `ol.road` の各 `li.road__item` には `h3.road__t` があり、見出し構造として読み上げ可能 ✅

**[A7-ISSUE-4] 比較表（S3）のセマンティクス**

- `index.html` L209：`<div class="compare" role="table" aria-label="商品の比較">` — テーブルロールあり ✅
- `columnheader`・`rowheader`・`row` の役割あり ✅
- ただし**動的描画（`screens.js`）での比較表**も同様のロール付与がされているか確認が必要（§4 動的生成の確認を参照）

---

### 2-6. セマンティック HTML と見出し構造

| 確認内容 | 状況 |
|---|---|
| `<h1>` が1ページに1つ | ✅（`stage__title`）|
| `<h2>` 各画面の主見出し | ✅（`.done-title`, `.qtitle`） |
| `<h3>` サブ見出し | ✅（`.road__t`, `.cand__name`, `.sheet__t` 等） |
| `<h4>` 設定シート内の見出し | ✅（`settings-sheet__label` の `h4`） |
| `<nav>` タブ領域 | ✅ |
| `<main>` メインコンテンツ | ✅（`id="screenWrap"`） |
| `<footer>` | ✅ |
| `<section>` 各画面 | ✅ + `aria-label` あり |

> [!NOTE]
> `<main>` に `id="screenWrap"` は付いているが `<main>` 要素は `aria-label` や `aria-labelledby` なし（必須ではないが、あると親切）。

---

### 2-7. 動的生成コンテンツの aria 付与確認（JS）

JS で動的生成される要素の aria 属性を `screens.js` で確認。

| 動的要素 | 付与状況 |
|---|---|
| `.cand__item`（候補リスト） | `role="checkbox"` + `aria-checked="true/false"` + `tabindex="0"` ✅ |
| 比較表 `.compare__row--head` | `role="row"` + `role="columnheader"` ✅ |
| 比較表データ行 | `role="row"` + `role="rowheader"` + `role`（値セルは role なし→△ 下記参照） |
| `.tags`（成分タグ） | role なし（視覚のみ、装飾として許容範囲） |

**[DYN-ISSUE-1] 比較表データセルに `role="cell"` なし**

- `screens.js` L321-325：`compare__cell` スパンに `role` 属性なし。
- `role="table"` 配下では `role="cell"` が期待されるが、`role="columnheader"` のみ行が明示されている。
- **推奨対応（軽微）：** データセルに `role="cell"` を追加する。

---

## 3. 人間タスク一覧（実機・主観確認が必要）

以下は自動点検では判断できないため、**人間が実機で確認**する必要があります。

| ID | 要件 | 確認方法 | 担当 |
|---|---|---|---|
| **H-1** | 実機スクリーンリーダー読み上げ確認 | Android TalkBack / iOS VoiceOver で S1→S2→S3→S4 を操作 | 全員 |
| **H-2** | A1 コントラスト比実測 | DevTools の色抽出 → コントラストチェッカー（`--text:#2b2622` 対 `--bg:#fff7ee` など） | 村上 |
| **H-3** | A3 タップ領域44px以上の確認 | DevTools で `.chip`・`.cta`・`.budget__btn`・`.tab` の実描画サイズを確認 | 全員 |
| **H-4** | A6 OS 文字拡大時の崩れ確認 | iOS/Android の文字サイズを「最大」にして各画面を確認 | 全員 |
| **H-5** | A5 reduced-motion 実機確認 | OSのアクセシビリティ設定「視差効果を減らす」をONにして確認 | 全員 |
| **H-6** | 薬機法文言チェック | 結果・商品・成分の文言に禁止表現がないか確認（p5c と連動） | たかと |
| **H-7** | 通しデモ主観評価 | 初心者として迷わず操作できるか主観評価 | 全員 |

---

## 4. 検出した問題点の優先度まとめ

| ID | 問題 | 優先度 | 対応方針 |
|---|---|---|---|
| A2-ISSUE-1 | `.cta-back` の focus-visible が CSS 外から定義 | 低 | 別 Issue でまとめて対応 |
| A2-ISSUE-3 | 用語シートのフォーカストラップ未実装 | 中 | 別 Issue を起票して対応 |
| A4-ISSUE-1 | タブ「完了」状態の読み上げ通知なし | 低 | `aria-label` 動的付与で対応 |
| A6-ISSUE-1 | 文字大きめモード未実装 | 低（将来対応） | OS ズームへの追従で補う |
| A7-ISSUE-2 | `#todayDot` の曜日が固定テキスト | 中 | JS で動的に実際の曜日を設定 |
| DYN-ISSUE-1 | 比較表データセルに `role="cell"` なし | 低 | `screens.js` 修正で対応 |

> [!NOTE]
> 優先度「中」以上は別途 Issue を起票することを推奨します。
> 「低」は中間発表後の改善フェーズ（P7 または次回スプリント）で対応可能です。

---

## 5. 改訂履歴

| 日付 | 版 | 変更点 |
|---|---|---|
| 2026-07-14 | v1.0 | 初版。エージェント（ikki-claude p5b）起票。`index.html`・`style.css`・`screens.js`・`main.js` を静的解析 |
