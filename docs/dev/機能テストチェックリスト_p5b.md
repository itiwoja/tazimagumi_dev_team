# 機能テストチェックリスト v1.0（p5b）

**プロジェクト：** 田島組 卒業制作（男の身だしなみアプリ）
**ガントID：** p5b ／ フェーズ P5 ／ 担当: 全員
**参照：** [テスト仕様書 v1.0](./テスト仕様書_v1.0.md)・[アクセシビリティ要件定義書 v1.0](../guidelines/アクセシビリティ要件定義書_v1.0.md)
**ステータス：** ドラフト（エージェント起票 / 2026-07-14）

> 本チェックリストは **ブラウザで `app/index.html` を直接開いて確認する**前提です。ビルド不要。
> コンソールスニペットは `F12 → Console` タブに貼り付けて実行してください。

---

## 1. 事前準備

| # | 手順 | 確認 |
|---|---|---|
| Pre-1 | `app/index.html` をブラウザ（Chrome 推奨）で開く | [ ] |
| Pre-2 | `F12` → DevTools を起動し、Console タブを開いておく | [ ] |
| Pre-3 | 既存の localStorage を一度クリアする（設定 → 「削除を開始する」→「削除する」） | [ ] |
| Pre-4 | ページをリロード（Ctrl+R）する | [ ] |

---

## 2. 診断ロジック単体テスト（App.diagnose）

テスト仕様書 §2 のケースに対応。ブラウザのコンソールで実行する。

### ケース A：20歳・皮脂多め（期待: type1 単独）

```js
// コンソールに貼り付けて実行
var resultA = App.diagnose([
  "テカリ・ベタつき",   // Q1: 肌の状態
  "とくに問題ない",    // Q2: 髭剃り後
  "ペタッとする",      // Q3: 髪
  "〜1,500円",         // Q4: 予算
  "朝だけ"             // Q5: 続け方
]);
console.log("ケースA:", JSON.stringify(resultA, null, 2));
console.assert(resultA.primaryType === "type1", "primaryType が type1 であること");
console.assert(resultA.secondaryType === null || resultA.isComposite === false, "単独タイプであること");
```

**確認項目**

| 確認内容 | 期待値 | 結果 |
|---|---|---|
| `primaryType` | `"type1"` | [ ] |
| `secondaryType` | `null` | [ ] |
| `isComposite` | `false` | [ ] |
| `scores.oily` | 30以上 | [ ] |
| コンソールエラーなし | — | [ ] |

### ケース B：髭剃り × エイジング複合（期待: type4 または type5 複合）

```js
var resultB = App.diagnose([
  "乾燥・つっぱり",    // Q1
  "ヒリヒリ・赤くなる", // Q2: 髭剃り後
  "パサつく・広がる",   // Q3
  "〜5,000円",          // Q4
  "朝も夜もいける"      // Q5
]);
console.log("ケースB:", JSON.stringify(resultB, null, 2));
console.assert(
  resultB.primaryType === "type4" || resultB.primaryType === "type2",
  "primaryType が type4 か type2 であること"
);
```

**確認項目**

| 確認内容 | 期待値 | 結果 |
|---|---|---|
| `primaryType` | `"type4"` か `"type2"` | [ ] |
| `scores.shave` | 30以上 | [ ] |
| `scores.inflam` | 15以上 | [ ] |
| コンソールエラーなし | — | [ ] |

### ケース C：未経験・悩み未言語化（期待: type6 入門）

```js
var resultC = App.diagnose([
  "まだわからない",   // Q1
  "まだわからない",   // Q2
  "まだわからない",   // Q3
  "まだ決めてない",   // Q4
  "自信がない"        // Q5
]);
console.log("ケースC:", JSON.stringify(resultC, null, 2));
console.assert(resultC.primaryType === "type6", "primaryType が type6 であること");
```

**確認項目**

| 確認内容 | 期待値 | 結果 |
|---|---|---|
| `primaryType` | `"type6"` | [ ] |
| `scores.beginner` | 最高スコア | [ ] |
| コンソールエラーなし | — | [ ] |

### ケース D：スコア100クリップ確認

```js
// 同じ答えを100回分入れて上限確認
var manyOily = new Array(5).fill("テカリ・ベタつき");
var resultD = App.diagnose(manyOily);
var allUnder100 = Object.values(resultD.scores).every(function(s){ return s <= 100; });
console.assert(allUnder100, "全スコアが100以内であること");
console.log("ケースD スコアクリップ:", resultD.scores);
```

**確認項目**

| 確認内容 | 期待値 | 結果 |
|---|---|---|
| 全スコア ≤ 100 | `true` | [ ] |

---

## 3. ロードマップ生成ロジック単体テスト（App.buildRoadmap）

### 基本動作確認

```js
// type1（皮脂コントロール）でロードマップ生成
var diag1 = { primaryType: "type1", secondaryType: null, isComposite: false, scores: { oily: 60, dry: 0, inflam: 0, shave: 0, aging: 0, beginner: 5 } };
var steps1 = App.buildRoadmap(diag1);
console.log("ロードマップ（type1）:", JSON.stringify(steps1, null, 2));
console.assert(Array.isArray(steps1), "配列であること");
console.assert(steps1.length >= 3, "3ステップ以上あること");
console.assert(typeof steps1[0].title === "string", "titleが文字列であること");
console.assert(typeof steps1[0].body === "string", "bodyが文字列であること");
```

**確認項目**

| 確認内容 | 期待値 | 結果 |
|---|---|---|
| 返り値が配列 | `true` | [ ] |
| ステップ数 | 4（単独タイプ） | [ ] |
| `steps[0].order` | `1` | [ ] |
| `steps[0].term` | `"化粧水"` | [ ] |
| コンソールエラーなし | — | [ ] |

### 複合タイプ確認

```js
// type1 + type4 複合
var diagComp = { primaryType: "type1", secondaryType: "type4", isComposite: true, scores: { oily: 45, dry: 0, inflam: 0, shave: 40, aging: 0, beginner: 0 } };
var stepsComp = App.buildRoadmap(diagComp);
console.log("ロードマップ（複合 type1+type4）:", JSON.stringify(stepsComp, null, 2));
console.assert(stepsComp.length >= 4, "複合タイプは4ステップ以上あること");
```

**確認項目**

| 確認内容 | 期待値 | 結果 |
|---|---|---|
| ステップ数 | 4（複合追加ステップあり） | [ ] |
| ステップ4のtitle | 「もう一つの傾向も〜」 | [ ] |

### type6（入門）確認

```js
var diag6 = { primaryType: "type6", secondaryType: null, isComposite: false, scores: { oily: 0, dry: 0, inflam: 0, shave: 0, aging: 0, beginner: 50 } };
var steps6 = App.buildRoadmap(diag6);
console.log("ロードマップ（type6 入門）:", JSON.stringify(steps6, null, 2));
```

**確認項目**

| 確認内容 | 期待値 | 結果 |
|---|---|---|
| `steps[0].term` | `"オールインワン"` | [ ] |
| bodyに「オールインワン」が含まれる | `true` | [ ] |

---

## 4. 比較表生成ロジック単体テスト（App.buildCompareTable）

```js
// ダミー商品2件で比較表を生成
var dummyProducts = [
  { id: "p001", name: "さっぱり化粧水A", price: 1320, volume: 200, category: "化粧水", ingredients: ["ヒアルロン酸", "アルコールフリー"], summary_one_liner: "テカリ肌向けさっぱりタイプ" },
  { id: "p002", name: "うるおい化粧水B", price: 2200, volume: 150, category: "化粧水", ingredients: ["セラミド", "ヒアルロン酸"], summary_one_liner: "乾燥肌向けしっとりタイプ" }
];
var table = App.buildCompareTable(dummyProducts);
console.log("比較表:", JSON.stringify(table, null, 2));
console.assert(table.columns.length === 2, "列数が2であること");
console.assert(table.rows.some(function(r){ return r.label === "価格"; }), "価格行があること");
console.assert(table.rows.some(function(r){ return r.label === "成分: ヒアルロン酸"; }), "成分行があること");
var priceRow = table.rows.find(function(r){ return r.label === "価格"; });
console.assert(priceRow.differs === true, "価格差がある場合 differs=true であること");
```

**確認項目**

| 確認内容 | 期待値 | 結果 |
|---|---|---|
| `columns.length` | `2` | [ ] |
| 「価格」行あり | `true` | [ ] |
| 「容量」行あり | `true` | [ ] |
| 「成分: ヒアルロン酸」行あり | `true` | [ ] |
| 価格の `differs` | `true`（異なるため） | [ ] |
| ヒアルロン酸の `values` | `["該当", "該当"]` | [ ] |
| セラミドの `values` | `["-", "該当"]` | [ ] |
| 違いの一言行あり | `true` | [ ] |

### 最大3件クランプ確認

```js
var fourProducts = [
  { id: "p1", name: "A", price: 1000, volume: 100, category: "化粧水", ingredients: [], summary_one_liner: "" },
  { id: "p2", name: "B", price: 1200, volume: 120, category: "化粧水", ingredients: [], summary_one_liner: "" },
  { id: "p3", name: "C", price: 1400, volume: 140, category: "化粧水", ingredients: [], summary_one_liner: "" },
  { id: "p4", name: "D", price: 1600, volume: 160, category: "化粧水", ingredients: [], summary_one_liner: "" }
];
var table4 = App.buildCompareTable(fourProducts);
console.assert(table4.columns.length === 3, "4件渡しても最大3件であること");
```

**確認項目**

| 確認内容 | 期待値 | 結果 |
|---|---|---|
| 4件渡したときの `columns.length` | `3` | [ ] |

---

## 5. 画面遷移シナリオ（手動）

テスト仕様書 §4 に対応。

### シナリオ 5-1：初回起動〜診断完了〜S2表示

| # | 操作 | 期待動作 | 確認 |
|---|---|---|---|
| 5-1-1 | ページ開く（localStorage空） | S1（Q1）が表示される | [ ] |
| 5-1-2 | タブ②③④をクリック | 「初回チェック（5問）を終えると開きます」トーストが出てロックされる | [ ] |
| 5-1-3 | Q1 の選択肢を1つ選ぶ | 選んだチップが `aria-checked="true"` になる・「次へ」ボタンが活性化 | [ ] |
| 5-1-4 | 「次へ」を押す | Q2 に進む・「←」戻るボタンが表示される | [ ] |
| 5-1-5 | 「←」を押す | Q1 に戻る | [ ] |
| 5-1-6 | Q1〜Q5 全問回答後、最後の「プランを見る」を押す | S2（ロードマップ）に遷移・タブ②③④のロックが解除される | [ ] |
| 5-1-7 | プログレスバーが増加している | S1中〜S2遷移時点で数値が変化 | [ ] |

### シナリオ 5-2：S2→S3（商品候補・比較）

| # | 操作 | 期待動作 | 確認 |
|---|---|---|---|
| 5-2-1 | S2 の「具体的な商品の候補を見る」ボタンを押す | S3 に遷移・商品候補が表示される | [ ] |
| 5-2-2 | 「〜1,500円でまず1本」ボタンを押す | 件数が切り替わる・「まず1本だけ〜」トーストが出る | [ ] |
| 5-2-3 | 「〜5,000円でそろえる」ボタンを押す | 件数が切り替わる | [ ] |
| 5-2-4 | 候補リストで商品をクリック | `aria-checked` が切り替わり、比較表が更新される | [ ] |
| 5-2-5 | 4件目を選ぼうとする | 「比較できるのは最大3商品までです」トーストが出る | [ ] |

### シナリオ 5-3：S3→S4（継続記録）

| # | 操作 | 期待動作 | 確認 |
|---|---|---|---|
| 5-3-1 | 「このまま記録を始める」ボタンを押す | S4 に遷移 | [ ] |
| 5-3-2 | 「今日」ドットをタップ | `aria-pressed="true"` になる・「今日ぶん、記録できました」トースト | [ ] |
| 5-3-3 | 週評価「いい感じ」「ふつう」等を選択 | `aria-pressed="true"` に切り替わる | [ ] |
| 5-3-4 | 「もう一度はじめから見る」ボタンを押す | S1 に戻り、Q1 が表示される（ただしタブはロック解除のまま） | [ ] |

---

## 6. localStorage 保存・復元・全削除テスト

テスト仕様書 §7 デモ前チェックリストと連動。

### 6-1：保存・復元

| # | 操作 | 期待動作 | 確認 |
|---|---|---|---|
| 6-1-1 | Q1〜Q3 まで回答し、ページをリロード（Ctrl+R） | Q3 の選択状態が復元される | [ ] |
| 6-1-2 | 診断完了後にリロード | S2〜S4 のタブが解放されたまま復元される | [ ] |
| 6-1-3 | S4 で「今日」ドットをONにしてリロード | ドットのON状態が復元される | [ ] |
| 6-1-4 | コンソールで `App.debugDump()` を実行 | `{ state, prefs, saved }` が返る（エラーなし） | [ ] |

```js
// 保存内容の確認
console.log(JSON.stringify(App.debugDump(), null, 2));
```

### 6-2：診断やり直し

| # | 操作 | 期待動作 | 確認 |
|---|---|---|---|
| 6-2-1 | 診断完了後、設定（歯車）ボタンを押す | 設定シートが開く | [ ] |
| 6-2-2 | 「S1からやり直す」を押す | S1 の Q1 に戻り、チップ選択がリセットされる | [ ] |
| 6-2-3 | タブ②③④がロックされているか確認 | is-locked クラスが付いている | [ ] |

### 6-3：全削除

| # | 操作 | 期待動作 | 確認 |
|---|---|---|---|
| 6-3-1 | 設定シートで「削除を開始する」を押す | 確認ダイアログが展開される | [ ] |
| 6-3-2 | 「キャンセル」を押す | 確認ダイアログが閉じ、削除されない | [ ] |
| 6-3-3 | 再度「削除を開始する」→「削除する」を押す | 「保存データを削除しました」トースト・S1 初期状態に戻る | [ ] |
| 6-3-4 | コンソールで `localStorage.getItem("midashinami:v1")` | `null` が返る | [ ] |

```js
// 削除後の確認
console.log("保存データ:", localStorage.getItem("midashinami:v1"));
// null が出れば OK
```

### 6-4：プライベートモード確認（任意）

| # | 操作 | 期待動作 | 確認 |
|---|---|---|---|
| 6-4-1 | シークレットウィンドウでページを開く | エラーなく動作する（保存はされないが壊れない） | [ ] |
| 6-4-2 | コンソールで `App.storage.canPersist` | `false` が返る | [ ] |

---

## 7. 設定シート機能テスト

| # | 操作 | 期待動作 | 確認 |
|---|---|---|---|
| 7-1 | 設定ボタンを押す | 設定シートがスライドイン | [ ] |
| 7-2 | リマインド時刻を入力し「保存する」 | 「リマインド時刻を保存しました」トースト | [ ] |
| 7-3 | リロード後に設定を再度開く | 入力した時刻が保持されている | [ ] |
| 7-4 | ×ボタン or 背景クリックで閉じる | 設定シートが閉じる | [ ] |
| 7-5 | 設定シート内で Tab キーを押し続ける | フォーカスがシート内を循環する（外に出ない） | [ ] |
| 7-6 | 設定シート内で Esc を押す | シートが閉じる | [ ] |

---

## 8. デモ前チェックリスト（テスト仕様書 §7）

| # | 確認内容 | 状況 |
|---|---|---|
| D-1 | ローカルデータのみで起動する（外部API非依存） | [ ] |
| D-2 | 初回チェック→ロードマップが止まらず表示 | [ ] |
| D-3 | 商品候補・比較が表示される | [ ] |
| D-4 | `reduced-motion` / 文字大きめでも崩れない | [ ] 人間タスク |
| D-5 | `console.log` が残っていない | [ ] |

```js
// D-5 の確認方法: コンソールに何も出力されていないか確認
// （DevTools の Console に不要な出力がないかを目視）
```

---

## 9. 既知の制限・残課題（人間タスク）

| ID | 内容 | 担当 |
|---|---|---|
| H-1 | 実機スクリーンリーダー（TalkBack/VoiceOver）での主要導線読み上げ確認 | 全員 |
| H-2 | A1 コントラスト比の実測（DevTools / コントラストチェッカー） | 村上 |
| H-3 | A3 タップ領域44px以上の実機確認（chip・CTA・budgetボタン） | 全員 |
| H-4 | A6 文字大きめモード（OS設定）で各画面が崩れないか確認 | 全員 |
| H-5 | reduced-motion 実機確認（OS設定をONにして動きが止まるか） | 全員 |
| H-6 | 薬機法文言チェック — p5c と連動 | たかと |
| H-7 | 通しデモ主観評価（分かりやすさ・操作性） | 全員 |
| H-8 | `App.recommend` 未実装のため S3 は `filterProductsByBudget` フォールバック動作（Issue #37） | たかと・ひろと |
| H-9 | S2 ロードマップの動的描画が未結線（`buildRoadmap` → S2 HTML 未更新）| ひろと |

---

## 10. 改訂履歴

| 日付 | 版 | 変更点 |
|---|---|---|
| 2026-07-14 | v1.0 | 初版。エージェント（ikki-claude p5b）起票。コードベース精査に基づき作成 |
