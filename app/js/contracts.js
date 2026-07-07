/* =====================================================================
   機能IF（型）定義 — ロジック担当の作業場所（Issue #23 [p1g]）
   ---------------------------------------------------------------------
   ここは「各機能が受け渡しするデータの形（型）」と「実装すべき関数の枠」
   をまとめた“契約”ファイルです。各担当はこれを見れば、相手の実装を待たずに
   自分の関数を書き始められます。

   ■ ルール
   - 上半分の【型定義】は共有の約束。原則 変更しない（変えたい時は村上に相談）。
   - 下半分の【実装スタブ】は、自分の担当関数の中身だけ書き換える。
     未実装のまま呼ぶと throw して「誰の・どのIssueか」が分かるようにしてある。
   - 読み込み順（index.html）: products → state → contracts → screens → main

   ■ 根拠ドキュメント
   - 診断:  docs/specs/診断ロジック設計書_v1.1.md
   - 推薦:  docs/design/推薦ロジック仕様書_v1.0.md
   - 商品:  docs/design/商品マスタ設計書_v1.0.md
   ===================================================================== */
(function (global) {
  "use strict";

  var App = global.App || (global.App = {});

  /* =====================================================================
     【型定義】 共有の約束（変更しない）
     ===================================================================== */

  /**
   * 初回チェック(S1)の回答。各要素は選んだ選択肢ラベル（未回答は null）。
   * 何問にするか・各問がどの軸に加点するかは diagnose 側の実装詳細。
   * @typedef {Array<string|null>} Answers
   */

  /** 6軸スコア（各 0〜100 の整数）。診断ロジック設計書 §2。
   * @typedef {Object} AxisScores
   * @property {number} oily     皮脂(S_oily)
   * @property {number} dry      乾燥(S_dry)
   * @property {number} inflam   炎症(S_inflam)
   * @property {number} shave    髭剃り(S_shave)
   * @property {number} aging    加齢(S_aging)
   * @property {number} beginner 初心者度(S_beginner)
   */

  /** 6タイプID。商品の typeTags と一致させる。
   * @typedef {("type1"|"type2"|"type3"|"type4"|"type5"|"type6")} SkinType
   */

  /** 診断結果。診断ロジック設計書 §10 の結果オブジェクトに準拠。
   * @typedef {Object} Diagnosis
   * @property {SkinType}      primaryType    第一タイプ
   * @property {SkinType|null} secondaryType  第二タイプ（複合でなければ null）
   * @property {boolean}       isComposite    複合タイプか（第1・第2の差が10pt以内）
   * @property {AxisScores}    scores         軸別スコア（判定根拠）
   * @property {string[]}     [topContributors] 上位軸に効いた質問など（任意）
   */

  /** 推薦の1グループ（概念=categoryごと）。
   * @typedef {Object} CategoryGroup
   * @property {string}    category  概念（例: "化粧水"）
   * @property {Product[]} products  その概念の候補（MVPは各最大3件）
   */

  /** 推薦結果。推薦ロジック仕様書 §1。
   * @typedef {Object} Recommendation
   * @property {CategoryGroup[]}      main        メイン推薦（第一タイプ）
   * @property {CategoryGroup[]|null} sub         サブ推薦（複合時の第二タイプ。無ければ null）
   * @property {boolean}              isComposite 複合表示か
   */

  /** 比較表の1行。推薦ロジック仕様書 §4。
   * @typedef {Object} CompareRow
   * @property {string}   label   行ラベル（例: "価格", "容量", "成分: ヒアルロン酸"）
   * @property {string[]} values  各商品の値（columns と同じ並び）
   * @property {boolean}  differs 値が分かれる行か（UIで強調する用）
   */

  /** 比較表。最大3商品を横並び。
   * @typedef {Object} CompareTable
   * @property {Product[]}    columns 比較対象の商品（最大3）
   * @property {CompareRow[]} rows    比較軸の行
   */

  /** ロードマップの1ステップ。機能定義書 F-02。
   * @typedef {Object} RoadmapStep
   * @property {number}  order  並び順（1始まり）
   * @property {string}  title  見出し（例: "まず1本：化粧水"）
   * @property {string}  body   やさしい説明文（断定表現は使わない）
   * @property {string} [term] 用語シートのキー（あれば「○○ってなに？」を出す）
   */

  /**
   * 6タイプのメタ情報（タイプ名・対応軸・推薦セット名）。
   * 診断ロジック設計書 §2 の表。表示や推薦の見出しに使う共有定数。
   * @type {Record<SkinType, {name: string, axis: keyof AxisScores, set: string}>}
   */
  App.TYPE_META = {
    type1: { name: "テカリ・皮脂が気になる",        axis: "oily",     set: "皮脂コントロールセット" },
    type2: { name: "乾燥・カサつきをなんとかしたい", axis: "dry",      set: "高保湿セット" },
    type3: { name: "ニキビ・肌荒れを防ぎたい",       axis: "inflam",   set: "低刺激・鎮静ケアセット" },
    type4: { name: "ひげ剃り後の荒れを防ぎたい",     axis: "shave",    set: "アフターシェーブセット" },
    type5: { name: "くすみ・エイジングが気になる",   axis: "aging",    set: "年齢肌ケアセット" },
    type6: { name: "とにかく始めたい（入門）",       axis: "beginner", set: "入門オールインワン1本" }
  };

  /* =====================================================================
     【実装スタブ】 自分の担当関数の中身だけ書き換える
     （未実装のまま呼ばれたら、誰が・どのIssueかを示して throw する）
     ===================================================================== */

  function notImplemented(fn, owner, issue, doc) {
    return function () {
      throw new Error(
        "[未実装] " + fn + " — 担当: " + owner + " / Issue " + issue +
        "（参照: " + doc + "）"
      );
    };
  }

  /**
   * 初回チェックの回答 → 診断結果。診断ロジック設計書 §4 の判定アルゴリズム。
   * 担当: ひろと / Issue #33 [p4b] 診断ロジック（純粋関数）
   * @param {Answers} answers
   * @returns {Diagnosis}
   */
  App.diagnose = notImplemented(
    "App.diagnose", "ひろと", "#33", "docs/specs/診断ロジック設計書_v1.1.md §4"
  );

  /**
   * 診断結果 → 継続のロードマップ（数ステップ）。機能定義書 F-02。
   * 担当: ひろと / Issue #35 [p4g] ロードマップ生成ロジック
   * @param {Diagnosis} diagnosis
   * @returns {RoadmapStep[]}
   */
  App.buildRoadmap = function(diagnosis) {
    var primaryType = diagnosis && App.TYPE_META[diagnosis.primaryType]
      ? diagnosis.primaryType
      : "type6";
    var secondaryType = diagnosis && diagnosis.secondaryType && App.TYPE_META[diagnosis.secondaryType]
      ? diagnosis.secondaryType
      : null;
    var isComposite = Boolean(
      diagnosis && diagnosis.isComposite && secondaryType && secondaryType !== "type6"
    );

    var plans = {
      type1: {
        concept: "汚れ落とし・化粧水・軽めの保湿",
        tonightTitle: "今夜はやさしく洗って水分を補う",
        tonightBody: "ベタつきやテカリが気になる場合も、強くこすらず汚れを落とし、化粧水でうるおいを与える流れが選択肢になります。",
        morningTitle: "明日の朝は軽い保湿で整える",
        morningBody: "朝は洗いすぎを避け、化粧水と軽めの保湿で肌を整える流れを試せます。日中のテカリ具合を見ながら量を調整します。",
        term: "化粧水"
      },
      type2: {
        concept: "汚れ落とし・化粧水・乳液",
        tonightTitle: "今夜はうるおいを重ねる",
        tonightBody: "カサつきやつっぱりが気になる場合は、洗顔後に化粧水でうるおいを与え、乳液やクリームで保つ流れが選択肢になります。",
        morningTitle: "明日の朝も乾きやすい部分を確認する",
        morningBody: "朝は頬や口周りなど乾きやすい部分を確認し、必要に応じて少量の保湿を足す流れを試せます。",
        term: "乳液"
      },
      type3: {
        concept: "汚れ落とし・化粧水・低刺激寄りの保湿",
        tonightTitle: "今夜は摩擦を少なくして整える",
        tonightBody: "ニキビや赤みが気になる場合は、こすらず洗い、肌を整える化粧水と保湿を少量ずつ使う流れが選択肢になります。",
        morningTitle: "明日の朝は触りすぎを避ける",
        morningBody: "朝は気になる部分を何度も触らず、洗顔と保湿を短い手順にまとめると続けやすくなります。",
        term: "低刺激"
      },
      type4: {
        concept: "汚れ落とし・化粧水・アフターシェーブ保湿",
        tonightTitle: "今夜は剃った後の肌をやさしく保つ",
        tonightBody: "ひげ剃り後のケアが必要な傾向がある場合は、洗顔後にうるおいを与え、剃った部分を保湿する流れが選択肢になります。",
        morningTitle: "明日の朝は剃る前後の摩擦を減らす",
        morningBody: "朝にひげを剃る場合は、肌をぬらしてから剃り、剃った後に化粧水や保湿を重ねる流れを試せます。",
        term: "アフターシェーブ"
      },
      type5: {
        concept: "汚れ落とし・化粧水・うるおい重視の保湿",
        tonightTitle: "今夜は年齢に応じたうるおいを意識する",
        tonightBody: "くすみやハリ不足が気になる場合は、洗顔後にうるおいを与え、保湿で肌を整える流れが選択肢になります。",
        morningTitle: "明日の朝は乾燥による印象変化を確認する",
        morningBody: "朝は乾きやすい部分を見て、化粧水と保湿を薄く重ねる流れを試せます。日中の肌の見え方も記録の材料になります。",
        term: "エイジングケア"
      },
      type6: {
        concept: "汚れ落とし・オールインワン",
        tonightTitle: "今夜は少ない手順で始める",
        tonightBody: "スキンケアに慣れていない場合は、洗顔の後にオールインワンなど1本で済む手順から始めると続けやすくなります。",
        morningTitle: "明日の朝も同じ流れを短く行う",
        morningBody: "朝も洗顔と1本のケアに絞ると、習慣として試しやすくなります。一般的な目安として、3週間ほど続けてから見直します。",
        term: "オールインワン"
      }
    };

    var main = plans[primaryType] || plans.type6;
    var steps = [
      {
        order: 1,
        title: "今日そろえる概念を決める",
        body: "まずは商品名ではなく、「" + main.concept + "」のような概念で必要な手順を整理します。具体的な候補は次の画面で確認します。",
        term: main.term
      },
      {
        order: 2,
        title: main.tonightTitle,
        body: main.tonightBody,
        term: main.term
      },
      {
        order: 3,
        title: main.morningTitle,
        body: main.morningBody,
        term: main.term
      }
    ];

    if (isComposite) {
      var subMeta = App.TYPE_META[secondaryType];
      var sub = plans[secondaryType] || plans.type6;
      steps.push({
        order: 4,
        title: "もう一つの傾向も少しだけ意識する",
        body: "第二タイプとして「" + subMeta.name + "」の傾向も見られます。最初から手順を増やしすぎず、メインの流れに慣れてから「" + sub.concept + "」の要素を1つずつ足す形が選択肢になります。",
        term: sub.term
      });
    } else {
      steps.push({
        order: 4,
        title: "3週間を目安に続けて見直す",
        body: "一般的な目安として、肌の変化は日ごとの体調や生活習慣にも左右されます。まずは無理のない手順で続け、記録画面で状態を振り返ります。"
      });
    }

    return steps;
  };

  /**
   * 診断結果 ＋ 予算帯 → 商品候補（概念ごと／複合時はメイン＋サブ）。
   * data/products.js（window.PRODUCTS, filterProductsByBudget）を使う。
   * 担当: たかと・ひろと / Issue #37 [p4h] 推薦ロジック（純粋関数）
   * @param {Diagnosis} diagnosis
   * @param {("core"|"sub")} budget
   * @returns {Recommendation}
   */
  App.recommend = notImplemented(
    "App.recommend", "たかと・ひろと", "#37", "docs/design/推薦ロジック仕様書_v1.0.md §2-3"
  );

  /**
   * 選んだ商品（最大3）→ 横並び比較表。値が分かれる行は differs=true。
   * 成分は「有無」のみ。効能・安全性の断定は載せない（薬機法）。
   * 担当: ゆうと / Issue #38 [p4d] SC-03 商品比較UI
   * @param {Product[]} products
   * @returns {CompareTable}
   */
  App.buildCompareTable = notImplemented(
    "App.buildCompareTable", "ゆうと", "#38", "docs/design/推薦ロジック仕様書_v1.0.md §4"
  );
})(window);
