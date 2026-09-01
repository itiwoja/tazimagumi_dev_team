# 商品情報API調査

**調査日：** 2026/09/01<br>
**対象：** 田島組 卒業制作（男の身だしなみアプリ）<br>
**目的：** 実在する化粧品・スキンケア商品の情報を取得し、商品候補・比較・推薦に活用できるAPIを比較する。

## 1. 結論

今回確認した候補の中では、次の組み合わせが最も現実的です。

1. **Open Beauty Facts**：JAN、商品名、ブランド、カテゴリ、INCI、画像などの商品データ取得
2. **INCI API**：バーコード照会と成分解析、アレルゲン・肌タイプ相性などの補助
3. **楽天プロダクト製品検索API**：日本向けの商品名、価格、販売URL、画像などの補助

ただし、7候補の中に「日本の化粧品を網羅し、価格・成分・使用感まで正確に取得できるAPI」はない。APIから取得したデータをそのまま推薦に使うのではなく、メーカー公式情報で確認し、既存の商品マスタ形式へ正規化する必要がある。

## 2. 比較一覧

| API / サービス | 主な取得・提供内容 | 日本商品の適合性 | 判定 |
| --- | --- | --- | --- |
| [Open Beauty Facts](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/scanning-cosmetics-pet-food-and-other-products/) | JANから商品名、ブランド、カテゴリ、INCI、画像などを取得 | 登録状況にばらつきがあるため要確認 | **商品データの第一候補** |
| [INCI API](https://inciapi.com/docs) | JANから商品情報・INCI・画像を取得。成分、アレルゲン、肌タイプ相性などを解析 | 日本商品の網羅性は公開情報だけでは判断できない | **成分解析の補助候補** |
| [CosmEthics API](https://cosmethics.com/api/) | バーコード・商品名・ブランドによるラベル検索、成分機能・規制・ブラックリスト判定、推薦 | 主に欧州・米国向け | **商用契約を前提とした将来候補** |
| [Makeup API](https://makeup-api.herokuapp.com/) | メイク用品のブランド、価格、カテゴリ、タグ、画像など | スキンケア中心の本アプリには範囲が合わない | **今回は不採用** |
| [Skincare API](https://skincareapi.dev/) | 成分検索、商品成分リスト解析、アレルゲン、肌タイプ相性などを予定 | 日本商品のカタログ用途は不明 | **現時点では保留** |
| [skinsense](https://skinsense.jp/) | カメラによるAI肌診断、問診、導入企業の商品レコメンド | 自社商品向けのB2Bサービス | **商品データ取得用途ではない** |
| [Perfect Corp. 肌分析API](https://yce.perfectcorp.com/ja/ai-api/products/skin-analysis-api) | 顔画像から肌状態を分析し、項目ごとのスコアやマスクを返す | 商品情報は提供しない | **将来の肌分析機能向け** |

## 3. 各APIの評価

### 3.1 Open Beauty Facts

化粧品用のオープンな商品データベース。公式ドキュメントでは、Open Beauty Facts用のベースURLを使い、次のような商品取得が案内されている。

```text
GET https://world.openbeautyfacts.org/api/v3/product/{JANコード}.json?lc=ja&product_type=beauty
```

商品が登録されていれば、商品名、ブランド、カテゴリ、成分、商品画像などを取得できる。読み取り用途は認証なしで利用できるが、アプリ名・バージョン・連絡先などを含む適切な `User-Agent` を設定する必要がある。

長所：

- 化粧品の商品情報とJAN検索に直接対応している
- 読み取りAPIを無料で試せる
- データをローカルへ取り込み、API障害時にも表示できる
- ユーザーが未登録商品を追加できる

注意点：

- 市民参加型データのため、商品によって情報量や正確性が異なる
- 日本商品の登録状況はJAN単位で実際に確認する必要がある
- 価格や使用感は本来の主データではないため、メーカー公式・小売APIで補う必要がある
- データベースはODbL、商品画像はCC BY-SAなど、データと画像でライセンスが異なる

参考：[商品取得API](https://openfoodfacts.github.io/documentation/docs/Product-Opener/v3/products/get-api-v3-product-code/)、[化粧品・ペットフード等のAPI](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/scanning-cosmetics-pet-food-and-other-products/)、[ライセンスの説明](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/license-be-on-the-legal-side/)

### 3.2 INCI API

商品情報と成分解析を一体で扱えるAPI。公式ドキュメントでは、以下のエンドポイントが公開されている。

```text
GET /v1/products/{barcode}
GET /v1/products/{barcode}/allergens
GET /v1/products/{barcode}/compatibility?skinType=sensitive
GET /v1/products/{barcode}/pregnancy
POST /v1/analyze
```

商品名、ブランド、INCI、画像に加え、アレルゲン、肌タイプ相性、成分ごとの評価などを取得できるため、商品情報の補完や成分表示の検討には使いやすい。

料金ページでは、現時点の無料枠を100リクエスト/日としている。一方、同サービスはデータベースが成長中であることを明記しており、網羅性・更新頻度・日本商品のカバレッジは、導入前に対象JANで検証する必要がある。

また、APIの安全スコアや肌相性は医療的判断ではなく、情報提供・教育目的のアルゴリズム評価とされている。本アプリでは「安全」「危険」「治る」などの断定表示には使わない。

参考：[APIドキュメント](https://inciapi.com/docs)、[料金](https://inciapi.com/pricing)

### 3.3 CosmEthics API

商品ラベルを機械可読化し、成分名の一般名・機能・CAS番号への変換、アクティブ成分検索、ブラックリスト判定、商品推薦などを提供すると説明されている。公式サイトでは、主なデータ範囲を欧州・米国のスキンケアとメイク用品としている。

一方、公開ページでは具体的なエンドポイント、料金、レート制限、日本商品の件数などを確認できない。そのため、卒業制作で即時に組み込むより、商用利用やデータ提供契約が必要になった段階で問い合わせる候補とする。

参考：[API概要](https://cosmethics.com/api/)、[サービス概要](https://cosmethics.com/)

### 3.4 Makeup API

ブランド、商品タイプ、カテゴリ、価格、評価、タグなどでメイク用品を検索できるシンプルなREST API。公式ページ上の例では、リップスティック、アイライナー、ファンデーションなどを扱っている。

本アプリで必要な洗顔、化粧水、乳液、日焼け止め、アフターシェーブなどのスキンケア商品とは対象範囲が合わない。また、JAN検索やINCI成分検索を前提としていないため、今回の商品マスタの主ソースにはしない。

参考：[Makeup APIドキュメント](https://makeup-api.herokuapp.com/)

### 3.5 Skincare API

成分検索、成分リスト解析、アレルゲン検出、肌タイプ相性、商品推薦などを提供予定としている。公式サイトでは30,000以上の成分、商品分析、REST API、料金プランなどを説明している。

ただし、サイトのトップとドキュメントには「Coming Soon」「Waitlist」「API Documentation Preview」といった表示があり、完全なドキュメントはローンチ時に提供するとされている。料金ページも公開されているが、本番利用の可否、データ更新、SLA、実際のAPI稼働状況は別途確認が必要である。

参考：[公式サイト](https://skincareapi.dev/)、[ドキュメントプレビュー](https://skincareapi.dev/docs)、[料金](https://skincareapi.dev/pricing)

### 3.6 skinsense

スマートフォンのカメラによるAI肌診断、問診、診断結果に基づく商品提案を、ECサイト・LINE・アプリへ導入するB2Bサービス。導入企業の商品やブランドに合わせて、問診・レコメンドルール・デザインを設定する仕組みである。

外部の商品カタログをJANで検索する汎用APIではないため、「実商品情報を取得する」という今回の目的とは異なる。将来、AI肌診断そのものを外部サービスへ委託したい場合に検討する。

参考：[skinsense公式サイト](https://skinsense.jp/)

### 3.7 Perfect Corp. 肌分析API

顔画像またはライブカメラ映像から、シミ、シワ、キメ、クマ、赤み、毛穴、ニキビ、皮脂、水分量、ハリなど14種類以上の肌状態を分析し、0〜100のスコアやヒートマップを返すサービス。API PlaygroundとREST APIが用意されている。

商品カタログ・JAN・INCIを返すサービスではないため、商品情報取得には使えない。画像を外部へアップロードする設計で、公式規約・プライバシーポリシー上、顔画像や顔の形状に関するデータの取り扱いと利用者の同意が必要になる。現在のMVPにある自己申告式の診断を置き換える場合にのみ検討する。

参考：[肌分析API](https://yce.perfectcorp.com/ja/ai-api/products/skin-analysis-api)、[クイックスタート](https://docs.perfectcorp.com/develop/quick_start_guide)、[ファイル保持期間](https://docs.perfectcorp.com/develop/file_retention_period)、[プライバシーポリシー](https://www.makeupar.com/perfectbeauty/youcam/privacy-policy-api)

## 4. 日本向けデータを補う候補

候補外だが、日本の販売情報を取得する補助として、[楽天プロダクト製品検索API](https://webservice.rakuten.co.jp/documentation/ichiba-product-search)が使える可能性がある。

楽天APIは、キーワード・ジャンル・楽天プロダクト製品ID・JANコード（`productCode`）で検索でき、商品名、ブランド名、商品URL、画像、価格情報などを返す。日本の販売情報を集めるにはOpen Beauty Factsより適しているが、INCI成分や肌タイプ分類を保証するAPIではない。

想定する役割分担：

| 情報 | 取得先の候補 |
| --- | --- |
| 商品名、ブランド、JAN、販売URL、価格、販売画像 | 楽天プロダクト製品検索API |
| INCI、カテゴリ、成分画像、商品画像 | Open Beauty Facts |
| 成分の補足解析・アレルゲン候補 | INCI API |
| 容量、香り、使用感、メーカー表記 | メーカー公式ページで確認 |

楽天APIはアプリIDとアクセスキーが必要なので、キーをブラウザへ埋め込まず、データ収集処理またはサーバー側プロキシから利用する。

## 5. 本プロジェクトへの導入方針

現在の[データアクセス設計書](../dev/データアクセス設計書_v1.0.md)では、MVPを外部API非依存・ローカルデータで動かし、商品データは `app/data/products.js` に置く方針である。この方針を維持したまま、APIをデータ収集・更新用に利用する。

推奨フロー：

```text
対象JAN一覧
    ↓
楽天API / Open Beauty Facts / INCI APIから取得
    ↓
メーカー公式情報で成分・容量・価格・使用感を確認
    ↓
既存の商品マスタ形式へ正規化
    ↓
app/data/products.jsへ取り込み
    ↓
既存の推薦・比較画面で利用
```

APIレスポンスを画面表示のたびに直接呼び出す方式は避ける。理由は以下のとおり。

- APIキーが必要なサービスでは、静的なGitHub PagesのJavaScriptにキーを置くと漏えいする
- API障害・レート制限・登録情報の欠落で商品画面が不安定になる
- 外部APIの項目だけでは、現在の推薦ロジックに必要な分類を埋められない

## 6. 商品マスタへの変換時に必要な項目

APIから取得できる商品名、ブランド、JAN、価格、容量、画像、INCIだけでは、現在の推薦ロジックに必要な次の項目が不足する。

- `category`
- `budget`
- `type_tags`
- `feel`
- `scent`
- `summary_one_liner`

これらはメーカー公式表記や本プロジェクトの分類ルールに基づいて、人手で確認・付与する。成分は「セラミド配合」「無香料」などの事実として記録し、「安全」「刺激ゼロ」「ニキビが治る」などの断定表現は追加しない。

取得元と更新日を追跡できるよう、将来的には商品マスタに次の管理項目を追加するとよい。

```text
barcode
source
source_url
source_updated_at
verified_at
```

商品情報に変更があった場合、APIの自動取得値だけで既存マスタを上書きせず、変更箇所を確認してから更新する。

## 7. 最終判断

- **すぐに試すAPI：** Open Beauty Facts
- **成分情報を強化するAPI：** INCI API
- **日本の価格・販売情報を補うAPI：** 楽天プロダクト製品検索API
- **商用契約を検討する段階で調査：** CosmEthics API
- **現時点では見送る：** Makeup API、Skincare API
- **商品情報ではなく肌分析用：** skinsense、Perfect Corp. 肌分析API

MVPでは、まず30〜50件の対象商品をJANで照会し、取得結果をメーカー公式情報で確認したうえでローカル商品マスタへ取り込む。外部APIは本番表示の必須依存にせず、商品マスタを更新するための補助データ源として扱う。

## 8. 参考リンク

- [Open Beauty Facts API：化粧品・ペットフード等](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/scanning-cosmetics-pet-food-and-other-products/)
- [Open Beauty Facts API：商品取得](https://openfoodfacts.github.io/documentation/docs/Product-Opener/v3/products/get-api-v3-product-code/)
- [Open Beauty Facts：ライセンス](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/license-be-on-the-legal-side/)
- [INCI API：APIドキュメント](https://inciapi.com/docs)
- [INCI API：料金](https://inciapi.com/pricing)
- [CosmEthics：API](https://cosmethics.com/api/)
- [Makeup API](https://makeup-api.herokuapp.com/)
- [Skincare API](https://skincareapi.dev/)
- [Skincare API：ドキュメント](https://skincareapi.dev/docs)
- [skinsense](https://skinsense.jp/)
- [Perfect Corp.：肌分析API](https://yce.perfectcorp.com/ja/ai-api/products/skin-analysis-api)
- [Perfect Corp.：クイックスタート](https://docs.perfectcorp.com/develop/quick_start_guide)
- [楽天プロダクト製品検索API](https://webservice.rakuten.co.jp/documentation/ichiba-product-search)
