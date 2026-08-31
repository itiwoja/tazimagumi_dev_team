# 自動点検・監査レポート（p5a／develop統合・通しデモ）

監査・観測日は **2026-08-25** です。監査対象は `origin/develop` のコミット `2576761d93a1945990debb9ae5b98c05121b11b5`（コミット日時: 2026-08-22）で、作業用worktreeのHEADも同一コミットであることを確認しました。本レポートは、実行した静的検証・Nodeテスト・コード参照結果と、Solから提供されたIssue／PR状態を分けて記録します。

ブラウザ／ヘッドレスブラウザ、iOS Safari、Android Chrome、GitHub Pages上の実機確認は実施していません。GitHubへの再照会などのネットワーク操作、アプリ本体・Git履歴・Issue／PRへの変更も実施していません。

---

## 1. 検証契約の実行結果

### 1.1 CI相当の検証

| コマンド | 結果 |
| --- | --- |
| `node --test scripts/test-sync-gantt-issues.mjs` | **PASS**。19 tests、pass 19、fail 0、cancelled 0、skipped 0、todo 0。 |
| `node --check app/js/*.js`、`node --check app/sw.js`、`node --check app/data/*.js` | **PASS**。以下の10ファイルすべてで構文エラーなし。 |
| `node scripts/validate-products.mjs` | **PASS**。`OK: 15 件の商品を検証、問題なし。` |
| PR CheckのSW cache-bump guard | **PASS（不適用）**。今回の差分は `docs/dev/自動点検レポート_p5a.md` だけで、`pr-check.yml` の「`app/`配下を変更した場合に `app/sw.js` のCACHE_NAME更新を要求する」条件に該当しないため、SW更新は不要。 |

構文チェックの対象は次のとおりです。

- `app/js/contracts.js`
- `app/js/debug.js`
- `app/js/disclaimer.js`
- `app/js/main.js`
- `app/js/screens.js`
- `app/js/state.js`
- `app/js/storage.js`
- `app/js/sw-register.js`
- `app/sw.js`
- `app/data/products.js`

### 1.2 既存の関連Nodeテスト

`scripts/test-*.mjs` のうち、現行の実装・商品データ・設定UIに関係する既存テストを実行しました。

| コマンド | 結果 |
| --- | --- |
| `node --test scripts/test-product-master.mjs` | **PASS**。6 tests、pass 6、fail 0。 |
| `node --test scripts/test-recommend.mjs` | **PASS**。7 tests、pass 7、fail 0。 |
| `node --test scripts/test-settings-sheets.mjs` | **PASS**。4 tests、pass 4、fail 0。 |

診断・ロードマップ・比較表の専用Nodeテストファイルは `scripts/` には存在しません。`docs/dev/機能テストチェックリスト_p5b.md` の該当項目は手動確認用であり、この監査ではブラウザ実行をしていないため、実行済みとは扱いません。

### 1.3 差分・範囲確認

- `git diff --check`: **PASS**。空白エラーなし。
- 最終 `git status --short`: **変更は本レポートだけ**（`docs/dev/自動点検レポート_p5a.md`）。
- allowed path外の変更、アプリ本体の変更、`.git`・`.workspace`・Solハブ状態の変更はありません。

---

## 2. コア関数の実装・UI結線状況

現行developのコードを、関数定義、呼出し箇所、S1〜S4の画面遷移の順に確認しました。

| 関数 | develop上の実装 | UI結線 | 根拠と評価 |
| --- | --- | --- | --- |
| `App.diagnose` | **実装済み** | **結線済み** | `app/js/contracts.js:137` でスコア計算・タイプ判定を実装。`app/js/screens.js:82`（S2ロードマップ描画）、`:144`（S1完了時）、`:373`（S4ルーティン）および `app/js/main.js:321`（保存データの再生成）から呼ばれる。 |
| `App.buildRoadmap` | **実装済み** | **結線済み** | `app/js/contracts.js:456` で実装。`screens.js:83` の `renderRoadmap` と `:145` の完了処理から呼ばれる。`showScreen("s2")` の `:174` から `renderRoadmap` が実行され、S2のDOMへステップを動的描画する。 |
| `App.recommend` | **実装済み** | **developのUIには未結線** | `app/js/contracts.js:641` で実装。`typeTags`を使い、予算帯・主タイプ・複合時の副タイプでカテゴリ別候補を返す。現行 `screens.js` に `App.renderS3` はなく、`main.js` の予算切替も `App.updateBudgetCount`（件数更新）のみ。呼出しは既存の `scripts/test-recommend.mjs` から確認できるが、画面からは呼ばれない。 |
| `App.buildCompareTable` | **未実装スタブ** | **developのUIには未結線** | `app/js/contracts.js:669` で `notImplemented(...)` を割り当てており、直接呼ぶと `[未実装] App.buildCompareTable ...` を投げる。`screens.js`に比較表生成の呼出しはなく、`app/index.html:182`以降のS3比較表は固定HTML。 |

### 2.1 現行developのデータフロー

```text
S1回答
  -> App.complete()
     -> App.diagnose()
     -> App.buildRoadmap()
     -> state.diagnosis / state.roadmap に保存
     -> App.showScreen("s2")
        -> App.renderRoadmap()
           -> S2 DOMへ動的描画

S3遷移
  -> App.showScreen("s3")
     -> 現行developでは App.renderS3 が存在しないため動的描画なし
     -> 予算ボタンは App.updateBudgetCount() で件数だけ更新
     -> 候補・比較表は index.html の固定モックを表示
```

`main.js` は `complete` と `showScreen` を自動保存ラッパーで包み、`state.diagnosis` と `state.roadmap` を `App.storage`へ保存・復元します。旧レポートの「`state.result`へ保存する明示的な結線がない」という記述は、現行の状態名（`state.diagnosis`）と一致せず、現行コードのS1完了・自動保存処理を反映していないため訂正しました。

### 2.2 診断設問数の境界

`app/js/state.js` では `App.S1_TOTAL = 5` です。一方、`contracts.js`の `pointTable` は23問分のインデックスを含みます。現行developは5問UIから診断を呼ぶ構成であり、23問分の定義が存在することだけをもって23問UIが結線済みとは判定しません。これは設問セット統合の残存する設計境界として記録します。

---

## 3. 失敗条件・検証できたこと／できないこと

- `App.diagnose` と `App.buildRoadmap` は、現行のS1完了→S2表示経路に結線されている。静的検証は通過したが、DOMを使った通し操作は未実施。
- `App.recommend` は純粋関数として実装され、商品マスターの `typeTags` と整合する。商品マスター検証15件、推薦テスト7件は通過した。ただし、developの画面から呼ばれないため、S3での候補表示成功までは証明しない。
- `App.buildCompareTable` はスタブのため、現行developで直接呼ぶと例外になる。比較表の静的HTMLが存在することは、この関数の結線・実装済みを意味しない。
- S3の固定HTMLには候補1件・比較2列が残っており、診断結果・予算・商品マスターとは連動しない。
- `app/data/products.js` はcamelCaseの `typeTags`を使用し、15件が検証済み。旧レポートにあった `typeTags`と`type_tags`の競合は、現行developの実ファイル間では再現しない。未統合ブランチをマージする場合の互換性確認は別途必要。
- ブラウザ／ヘッドレス、アクセシビリティの実操作、PWAキャッシュ、iOS／Android実機、GitHub Pages公開URL、主観的な画面品質は未検証。

---

## 4. 依存Issue・未統合PRの扱い

以下のIssue／PR状態は、2026-08-25付のSol発行dispatchに含まれた証拠を転記したものです。ネットワーク再照会はしていません。

### 4.1 closed（状態の転記）

- #105: closed
- #33: closed
- #35: closed
- #37: closed
- #46: closed

Issueがclosedであることと、この監査がブラウザ通しデモや公開判定を承認することは別です。上記関数の現行developでの実装・結線判定は本レポート2章のコード根拠を優先します。

### 4.2 open／agent-blocked

- #108: **open / agent-blocked**。iOS Safari・Android Chromeを含む実機PWA確認が必要な人間／実機ゲートです。この監査では実施していません。

### 4.3 open PR

- PR #197: **open / mergeable / checks success**（Sol提供証拠）。ローカルで対応する `origin/fix/wire-recommend-s3` refを読み取り確認したところ、developとの差分には `App.renderS3`、`App.buildCompareTable`実装、S3 DOMの動的候補・比較描画、予算切替・比較選択の結線、`app/sw.js`のCACHE_NAME更新が含まれます。これは現行developへ取り込まれたことを意味しません。
- PR #187、#188: **open / conflicting**（Sol提供証拠）。競合解決・マージ順の決定は人間の統合判断です。この監査では操作・判断していません。

PR #197の内容がS3課題を解消し得ることは差分上確認できますが、mergeableやCIがgreenであることを根拠に自動マージ・リリース承認は行いません。

---

## 5. 旧記述との照合結果

旧版の本レポートには、現行コードと逆の記述がありました。

| 旧記述 | 現行コードでの訂正 |
| --- | --- |
| `App.buildRoadmap`はUI未結線 | `screens.js:82-83`および`showScreen("s2")`から呼ばれ、S2 DOMへ動的描画するため結線済み。 |
| `App.recommend`はdevelopで未実装スタブ | `contracts.js:641`で実装済み。UI未結線だが、`test-recommend.mjs` 7件は通過。 |
| `App.buildCompareTable`は実装済み・S3から呼出し済み | `contracts.js:669`は`notImplemented`スタブで、developのS3から呼ばれていない。 |
| `typeTags`／`type_tags`の競合がdevelop内にある | 現行developの商品マスターと推薦実装は`typeTags`で一致。未統合PRの取り込み時は差分ごとに確認する。 |
| S1完了結果を`state.result`へ保存していない | 現行コードは`state.diagnosis`と`state.roadmap`を完了処理で生成し、mainの自動保存・restore経路へ渡す。 |

`docs/dev/機能テストチェックリスト_p5b.md` に残るH-8（推薦未実装）・H-9（ロードマップ未結線）も、上記の現行コード確認に照らすと旧時点の注意書きです。ただし、S3の画面結線と比較表実装が未完了という別の事実は残っています。

---

## 6. 人間専用ゲート

自動点検の結果に含めず、Sol／担当者が別途判断する項目です。

- PR #197、#187、#188の採否、競合解決、統合順、developへのマージ判断。
- S3の候補・比較表を統合後に、S1→S2→S3→S4を画面で一度通す主観的なデモ承認。
- 画面文言、商品表示、薬機法に関する表現、アクセシビリティ、デザイン品質の承認。
- #108のiOS Safari／Android Chrome実機PWA確認、GitHub Pages公開URLでの確認。
- Issue #46がclosedであることを、公開準備完了・リリース承認と読み替えないこと。

---

## 7. 監査結論

1. 指定コミットのdevelopは、構文・商品データ・Gantt同期・既存Nodeテストの範囲では **PASS**。
2. S1の診断からS2のロードマップ生成・描画までは、実装とUI結線を確認できる。
3. `App.recommend`は実装済みだがdevelopのS3画面には未結線で、`App.buildCompareTable`は未実装スタブである。したがって、現行developだけでS3の動的候補・比較を完了したとは判定できない。
4. PR #197はSol提供証拠上open／mergeable／checks successで、ローカル差分にもS3結線を含むが、マージ・通しデモ・実機確認は未完了の別ゲートである。

---

## 8. Solへの引き継ぎ

- S3統合を進める場合は、PR #197の採否と、PR #187／#188との競合解決・統合順を人間判断として確定する。
- 統合後に `App.renderS3` と `App.buildCompareTable` の実DOM動作をブラウザで確認し、S1→S4の通しデモを実施する。
- #108の実機PWA確認を別工程で実施する。
- 本レポートの更新対象は `docs/dev/自動点検レポート_p5a.md` だけであり、アプリ本体・Hub状態・Issue／PRは変更していない。
