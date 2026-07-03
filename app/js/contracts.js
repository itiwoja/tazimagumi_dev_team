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
   * 
   * 【この関数でできること】
   * ユーザーからの質問への回答（answers）を解析し、肌質・肌悩みの診断結果（Diagnosis）を出力します。
   * 主な処理フローは以下の通りです：
   * 1. 6つの肌傾向（皮脂、乾燥、炎症、髭剃り、加齢、初心者度）のスコアを0〜100の範囲で集計・クリップします。
   * 2. 例外ルールを優先評価します：
   *    - 初心者度（beginner）のスコアが60以上、または全軸の最高スコアが30未満の場合、タイプ⑥（入門）と確定します。
   * 3. 通常判定を行います：
   *    - 最高スコアを持つ軸を「第一タイプ（primaryType）」に決定します。同点時は優先度（髭剃り > 炎症 > 皮脂 > 乾燥 > 加齢 > 初心者）順に決定します。
   * 4. 複合タイプ判定を行います：
   *    - 第一タイプと第二タイプのスコア差が10pt以内である場合、複合タイプ（isComposite = true）とし、「第二タイプ（secondaryType）」も設定します。
   * 
   * @param {Answers} answers
   * @returns {Diagnosis}
   */
  App.diagnose = function(answers) {
  // --- Step 1: 6軸のスコアを初期化して集計 ---
  var scores = {
    oily: 0,
    dry: 0,
    inflam: 0,
    shave: 0,
    aging: 0,
    beginner: 0
  };

  // 💡 [補足] 設計書§4の具体的な配点表（例: 問1のAならoily+20等）が判明したら
  // answers.forEach 内に `if (index === 0 && ans === 'A') scores.oily += 20;` のように記述します。
  if (Array.isArray(answers)) {
    answers.forEach(function(ans, index) {
      if (ans === null || ans === undefined) return;
      // ここに質問ごとの配点ロジックを追記
    });
  }

  // --- Step 2: 各軸のスコアを 0〜100 にクリップ ---
  Object.keys(scores).forEach(function(key) {
    scores[key] = Math.max(0, Math.min(100, scores[key]));
  });

  // 初期値のセット
  var primaryType = "type6";
  var secondaryType = null;
  var isComposite = false;

  // 軸名から SkinType（型定義）へのマッピング
  var axisToTypeMap = {
    oily: "type1",
    dry: "type2",
    inflam: "type3",
    shave: "type4",
    aging: "type5",
    beginner: "type6"
  };

  // Step 5: 同点時の優先順位リスト
  var priorityOrder = ["shave", "inflam", "oily", "dry", "aging", "beginner"];
  
  // 全軸の中の最高スコアを算出
  var maxScore = -1;
  priorityOrder.forEach(function(axis) {
    if (scores[axis] > maxScore) {
      maxScore = scores[axis];
    }
  });

  // --- Step 3: 例外ルールの最優先評価 ---
  if (scores.beginner >= 60) {
    // 3a. S_beginner >= 60 → タイプ⑥（初心者）に確定
    primaryType = "type6";
  } else if (maxScore < 30) {
    // 3b. 全軸の最高スコアが 30 未満 → タイプ⑥（初心者）に強制振り分け
    primaryType = "type6";
  } else {
    // --- Step 4 & 5: 最高スコアの軸 = 第一タイプ（同点は優先順位順） ---
    var bestAxis = null;
    var bestScore = -1;

    priorityOrder.forEach(function(axis) {
      var score = scores[axis];
      // 「>」にすることで、同点の場合は先に評価された優先度の高い軸が残る
      if (score > bestScore) {
        bestScore = score;
        bestAxis = axis;
      }
    });

    primaryType = axisToTypeMap[bestAxis];

    // --- Step 6: 第一タイプと第二タイプのスコア差が 10pt 以内 → 複合タイプ ---
    var secondAxis = null;
    var secondBestScore = -1;

    priorityOrder.forEach(function(axis) {
      if (axis === bestAxis) return; // 第一タイプは除外
      var score = scores[axis];
      if (score > secondBestScore) {
        secondBestScore = score;
        secondAxis = axis;
      }
    });

    // 差が 10pt 以内であれば複合判定とする
    if (secondAxis && (bestScore - secondBestScore) <= 10) {
      isComposite = true;
      secondaryType = axisToTypeMap[secondAxis];
    }
  }

  // --- Step 7: 契約（型）に準拠した Diagnosis オブジェクトを返却 ---
  return {
    primaryType: primaryType,
    secondaryType: secondaryType,
    isComposite: isComposite,
    scores: scores
  };
};

  /**
   * 診断結果 → 継続のロードマップ（数ステップ）。機能定義書 F-02。
   * 断定表現は使わない（薬機法: docs/guidelines/薬機法準拠ガイドライン_v1.0.md）
   * 担当: ひろと / Issue #35 [p4g] ロードマップ生成ロジック
   * 
   * 【この関数でできること】
   * 診断結果（Diagnosis）に基づいて、ユーザー個人の肌状態に合わせた段階的なスキンケアのロードマップ（ステップ一覧）を生成します。
   * 主な処理フローは以下の通りです：
   * 1. 共通の基本ステップとして「洗顔」による肌の清浄化を提案（ステップ1）。
   * 2. ユーザーの「第一タイプ（メイン悩み）」に最適化したケア内容（ステップ2）を決定。
   *    ※初心者（type6）は「オールインワン」、それ以外は「化粧水」を推奨アイテムとします。
   * 3. 複合タイプ判定時：
   *    - 「第二タイプ（サブ悩み）」に応じたケアステップ（ステップ3）と、継続・習慣化のアドバイス（ステップ4）を生成。
   * 4. 単独タイプ判定時：
   *    - 肌のターンオーバーなどを考慮した習慣化のアドバイス（ステップ3）を生成。
   * 
   * ※「薬機法準拠ガイドライン」に則り、効果効能を保証するような断定表現（例：「ニキビが治る」「肌荒れを改善する」など）は一切用いず、
   *   「〜が選択肢となります」「〜が役立つ可能性があります」といった穏やかな表現を用いて記述されます。
   * 
   * @param {Diagnosis} diagnosis
   * @returns {RoadmapStep[]}
   */
  App.buildRoadmap = function(diagnosis) {
    var steps = [];
    var primaryType = diagnosis.primaryType;
    var isComposite = diagnosis.isComposite;
    var secondaryType = diagnosis.secondaryType;

    // タイプごとのステップ2の見出し・説明用文言マッピング
    var typeDetails = {
      type1: {
        title: "過剰な皮脂のケアを意識する",
        body: "ベタつきやテカリが気になる肌には、過剰な皮脂を吸着したり肌をひきしめたりする成分が含まれたケアを取り入れることが選択肢となります。水分と油分のバランスを整え、清潔な状態を維持することを目指します。"
      },
      type2: {
        title: "角質層への水分補給を重視する",
        body: "カサつきやつっぱり感が気になる肌には、ヒアルロン酸やセラミドなどうるおいを補給・保持する成分が含まれたケアが適している可能性があります。肌の乾燥を防ぎ、すこやかに保つことを意識します。"
      },
      type3: {
        title: "肌をすこやかに保つケアを選ぶ",
        body: "ニキビや肌荒れを防ぎたいデリケートな肌には、肌を整えるマイルドな使い心地の整肌・保湿成分が含まれたケアを取り入れることが検討されます。摩擦などの刺激を避け、丁寧になじませることが推奨されます。"
      },
      type4: {
        title: "ひげ剃り後のデリケートな肌を保護する",
        body: "ひげ剃り後のケアが必要な状態の肌は、カミソリによる摩擦で一時的にデリケートになりやすい傾向があります。剃った直後のデリケートな肌を優しく包み込み、うるおいを与えて保護するケアが役立つ可能性があります。"
      },
      type5: {
        title: "年齢に応じたうるおい補給を行う",
        body: "くすみやハリ不足などエイジングサインが気になる肌には、年齢に応じたエイジングケア成分を含む化粧品を取り入れることが選択肢となります。肌にじっくりとうるおいを与え、乾燥によるくすみを防ぐアプローチを意識します。"
      },
      type6: {
        title: "まずは手軽な1本から始めてみる",
        body: "スキンケアをこれから始める場合は、複数のステップを一度に取り入れるよりも、洗顔の後にオールインワンタイプなどの手軽な1本から継続して試すことが、習慣化へのステップとして適している可能性があります。"
      }
    };

    // --- Step 1: 共通の基本ステップ（洗顔） ---
    steps.push({
      order: 1,
      title: "やさしい洗顔で肌を清潔にする",
      body: "すべてのケアの基本として、まずは肌の汚れや余分な皮脂を優しく洗い流すことから始めるのが望ましいとされています。ゴシゴシと擦らず、泡で包み込むように洗うことで肌への負担を抑えることが期待できます。",
      term: "洗顔フォーム"
    });

    // --- Step 2: 第一タイプ（メイン悩み）に応じたステップ ---
    var mainInfo = typeDetails[primaryType] || typeDetails["type6"];
    steps.push({
      order: 2,
      title: mainInfo.title,
      body: mainInfo.body,
      term: primaryType === "type6" ? "オールインワン" : "化粧水"
    });

    // --- Step 3: 複合タイプ、または日常の継続ステップ ---
    // タイプ⑥（初心者）が第二タイプに来た場合は、設計書§7の例外ルールに基づき複合表示にしない
    if (isComposite && secondaryType && secondaryType !== "type6") {
      var subInfo = typeDetails[secondaryType];
      steps.push({
        order: 3,
        title: "あわせて「" + subInfo.title + "」も意識する",
        body: "今回の回答からは、複数の肌の傾向が同時に見られる可能性があります。まずはメインのケアに慣れつつ、こちらの要素も含まれた成分やお手入れを段階的に組み合わせていくことが一つのアプローチとして考えられます。",
        term: "乳液・クリーム"
      });
      
      // 複合時の4ステップ目（習慣化）
      steps.push({
        order: 4,
        title: "無理のない範囲で3週間継続してみる",
        body: "複数の傾向が見られた場合、無理に最初からすべての製品を揃えて1セットに絞ろうとせず、まずは1〜2品を日々のルーティンとして定着させ、心地よく続けられるペースを探していくことがおすすめされています。"
      });
    } else {
      // 単独タイプ時の3ステップ目（習慣化・アドバイス）
      var step3Body = "スキンケアの効果を実感するまでには、肌のターンオーバー（約28日）程度の期間がかかる傾向があります。まずは約3週間、毎日の習慣として継続した後に、改めて肌の状態を確認しながら再診断してみることが推奨されます。";
      
      if (primaryType === "type6") {
        step3Body = "まずは3週間続けてみることを目標にします。スキンケアの効果が馴染むまでには肌のサイクルに応じた期間が必要となる傾向があるため、焦らずに日々の洗顔と1本のケアを続けてみることが大切です。";
      }

      steps.push({
        order: 3,
        title: "日々のルーティンとして継続する",
        body: step3Body
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
